import axios from "axios";
import { Player } from "../models/Player.js";
import { Activity } from "../models/Activity.js";
import { getPGCR, getActivityDetails } from "./bungieApi.js";
import { sendToDiscord } from "./discordWebhook.js";
import { BUNGIE_BASE_URL, BUNGIE_API_KEY } from "../config/config.js";
import { mapActivity, isRaidOrDungeon, getActivityType } from "../utils/activityMap.js";

// ? Dynamic import for p-limit (ESM module)
const pLimit = (await import("p-limit")).default;

const processedPlayers = new Set(); // Tracks processed players
const CONCURRENCY_LIMIT = 2; // ?? Reduced concurrency for memory optimization
const limit = pLimit(CONCURRENCY_LIMIT);
const BATCH_SIZE = 50; // ? Process 50 activities at a time

// ? Fetch All Activities with Concurrent Pagination
async function getFullActivities(membershipId, membershipType) {
  try {
    const profileRes = await axios.get(
      `${BUNGIE_BASE_URL}/${membershipType}/Profile/${membershipId}/?components=Profiles,Characters`,
      { headers: { "X-API-Key": BUNGIE_API_KEY } }
    );

    const characters = profileRes.data.Response.characters.data || {};
    const activities = [];

    for (const characterId of Object.keys(characters)) {
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const activitiesRes = await axios.get(
          `${BUNGIE_BASE_URL}/${membershipType}/Account/${membershipId}/Character/${characterId}/Stats/Activities/?count=250&page=${page}`,
          { headers: { "X-API-Key": BUNGIE_API_KEY } }
        );

        const charActivities = activitiesRes.data.Response.activities || [];

        if (charActivities.length === 0) {
          hasMore = false; // End pagination if no more activities
        } else {
          activities.push(...charActivities);
          page++;
        }
      }
    }

    console.log(`?? Total activities fetched: ${activities.length}`);
    return activities;
  } catch (error) {
    console.error("?? Activities error:", error.message);
    return [];
  }
}

// ? Process Player and Fireteam with Batching, Resume Logic, and Auto-Adding Players
export async function processPlayer(membershipId) {
  if (processedPlayers.has(membershipId)) return; // Skip already processed players

  try {
    let player = await Player.findById(membershipId);

    if (!player) {
      console.log(`?? Player ${membershipId} not found in DB. Adding...`);

      // ? Add player with basic info
      player = await new Player({
        _id: membershipId,
        displayName: `Unknown#${membershipId}`, // Placeholder if display name isn't available yet
        membershipType: 3, // Default to Steam (or set dynamically if needed)
        lastUpdated: new Date(),
      }).save();

      console.log(`? Added player ${membershipId} to DB`);
    }

    processedPlayers.add(membershipId); // Mark player as processed

    // ? Fetch last processed activity to resume from
    const lastProcessedActivityId = player.lastProcessedActivityId || null;

    const activities = await getFullActivities(player._id, player.membershipType);

    let foundLastProcessed = !lastProcessedActivityId; // Start fresh if no last activity

    // ? Process activities in batches
    for (let i = 0; i < activities.length; i += BATCH_SIZE) {
      const activityBatch = activities.slice(i, i + BATCH_SIZE);

      await Promise.all(
        activityBatch.map((activity) =>
          limit(async () => {
            if (!foundLastProcessed) {
              if (activity.activityDetails.instanceId === lastProcessedActivityId) {
                foundLastProcessed = true;
              }
              return; // Skip until we reach the last processed activity
            }

            const pgcr = await getPGCR(activity.activityDetails.instanceId);
            if (!pgcr) return;

            const playerEntry = pgcr.entries.find(
              (e) => e.player.destinyUserInfo.membershipId === player._id
            );

            if (playerEntry) {
              await handlePGCR(pgcr, playerEntry, activity);

              // ? Update last processed activity after each success
              await Player.findByIdAndUpdate(player._id, {
                lastProcessedActivityId: activity.activityDetails.instanceId,
                lastUpdated: new Date(),
              });
            }

            // ? Add Fireteam Members to Queue
            await addFireteamMembers(pgcr);
          })
        )
      );

      console.log(`? Processed batch ${i / BATCH_SIZE + 1}`);
    }

    console.log(`? Finished processing player ${player.displayName}`);
  } catch (error) {
    console.error(`? Error processing player ${membershipId}:`, error.message);
  }
}

// ? Handle PGCR (Store in DB + Send to Discord) with Completion Check and Discord Enhancements
async function handlePGCR(pgcr, playerEntry, activity) {
  const activityDetails = await getActivityDetails(activity.activityDetails.referenceId);
  const activityName = activityDetails?.displayProperties?.name || "Unknown Activity";

  // ? Check if the activity was completed
  const isCompleted = playerEntry.values?.completed?.basic?.value === 1;

  if (!isCompleted) {
    console.log(`?? Skipping incomplete activity: ${activityName} (${activity.activityDetails.instanceId})`);
    return; // Skip this PGCR
  }

  // ? Check if activity is a Raid or Dungeon
  const isRelevantActivity = await isRaidOrDungeon(activity.activityDetails.referenceId);
  if (!isRelevantActivity) {
    console.log(`?? Skipping non-raid/dungeon activity: ${activityName}`);
    return; // Skip irrelevant activities
  }

  const mappedActivity = await mapActivity(activity.activityDetails.referenceId);
  const activityType = await getActivityType(activity.activityDetails.referenceId); // "raid" or "dungeon"

  // ? Check if activity already exists to prevent duplicates
  const existingActivity = await Activity.findById(activity.activityDetails.instanceId);

  if (existingActivity) {
    console.log(`?? Activity ${activity.activityDetails.instanceId} already exists. Skipping.`);
    return; // Skip to avoid duplicate key error
  }

  // ? Detect Flawless (no deaths for fireteam)
  const isFlawless = pgcr.entries.every(
    (entry) => entry.values.deaths.basic.value === 0
  );

  // ? Save new activity
  await new Activity({
    _id: activity.activityDetails.instanceId,
    name: mappedActivity,
    kills: playerEntry.values.kills.basic.value,
    deaths: playerEntry.values.deaths.basic.value,
    kd_ratio: playerEntry.values.killsDeathsRatio.basic.value,
    timestamp: new Date(pgcr.period),
    activityHash: activity.activityDetails.referenceId,
    userId: playerEntry.player.destinyUserInfo.membershipId,
    completed: isCompleted, // ? Store completion status in DB
    isFlawless, // ? Store flawless status
  }).save();

  console.log(`? Saved activity ${activity.activityDetails.instanceId}`);

  // ? Send Enhanced PGCR to Discord
  await sendToDiscord(
    mappedActivity,
    activity.activityDetails.instanceId,
    pgcr,
    isFlawless,
    pgcr.period, // Start time
    pgcr.activityDurationSeconds, // Total duration
    activityType // "raid" or "dungeon"
  );
}
