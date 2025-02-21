import axios from "axios";
import NodeCache from "node-cache";
import { BUNGIE_API_KEY, BUNGIE_BASE_URL } from "../config/config.js";

// Cache for activity definitions (6-hour TTL)
const activityCache = new NodeCache({ stdTTL: 21600 });

// Fetch Destiny Manifest and store activity definitions
async function fetchActivityDefinitions() {
  if (activityCache.get("activities")) {
    return activityCache.get("activities");
  }
  try {
    const manifestRes = await axios.get(`${BUNGIE_API_BASE_URL}/Destiny2/Manifest/`, {
      headers: { "X-API-Key": BUNGIE_API_KEY },
    });
    const manifestPaths = manifestRes.data.Response.jsonWorldComponentContentPaths.en;
    const activityDefPath = manifestPaths?.DestinyActivityDefinition;
    if (!activityDefPath) {
      console.error("?? Activity Definition path not found in Manifest.");
      return {};
    }
    const activityDefUrl = `${BUNGIE_API_BASE_URL}${activityDefPath}`;
    console.log(`?? Fetching activity definitions from: ${activityDefUrl}`);
    const activityDefRes = await axios.get(activityDefUrl, {
      headers: { "X-API-Key": BUNGIE_API_KEY },
    });
    const activities = activityDefRes.data;
    if (!activities || Object.keys(activities).length === 0) {
      console.error("?? No activities found in the fetched data.");
      return {};
    }
    activityCache.set("activities", activities);
    console.log("? Successfully fetched and cached activity definitions.");
    return activities;
  } catch (error) {
    console.error("? Failed to fetch activity definitions:", error.response?.status || error.message);
    return {};
  }
}

// Fallback: Direct API Call to Fetch Single Activity Definition
async function fetchActivityByHash(activityHash) {
  try {
    const activityRes = await axios.get(
      `${BUNGIE_API_BASE_URL}/Destiny2/Manifest/DestinyActivityDefinition/${activityHash}/`,
      { headers: { "X-API-Key": BUNGIE_API_KEY } }
    );
    const activity = activityRes.data.Response;
    if (activity) {
      console.log(`? Fetched activity directly for hash: ${activityHash}`);
      return activity;
    } else {
      console.warn(`?? No direct activity found for hash: ${activityHash}`);
      return null;
    }
  } catch (error) {
    console.error(`? Failed direct fetch for activity hash ${activityHash}:`, error.response?.status || error.message);
    return null;
  }
}

// Map activity hash to name with fallback
export async function mapActivity(activityHash) {
  const activities = await fetchActivityDefinitions();
  let activity = activities[activityHash];
  if (!activity) {
    console.warn(`?? No definition found for activity hash: ${activityHash}, trying direct fetch...`);
    activity = await fetchActivityByHash(activityHash);
    if (!activity) {
      return "Unknown Activity";
    }
  }
  return activity?.displayProperties?.name || "Unknown Activity";
}

// Check if activity is a Raid or Dungeon
export async function isRaidOrDungeon(activityHash) {
  const activities = await fetchActivityDefinitions();
  const activity = activities[activityHash] || (await fetchActivityByHash(activityHash));
  if (!activity) {
    console.warn(`?? No definition found for activity hash: ${activityHash}`);
    return false;
  }
  const isRaid = activity.isRaid === true;
  const dungeonTypes = [103, 105]; // Example dungeon hashes
  const isDungeon = dungeonTypes.includes(activity.activityTypeHash);
  return isRaid || isDungeon;
}

// Get Activity Type: "raid", "dungeon", or "other"
export async function getActivityType(activityHash) {
  const activities = await fetchActivityDefinitions();
  const activity = activities[activityHash] || (await fetchActivityByHash(activityHash));
  if (!activity) {
    console.warn(`?? No definition found for activity hash: ${activityHash}`);
    return "other";
  }
  if (activity.isRaid) return "raid";
  const dungeonTypes = [103, 105];
  if (dungeonTypes.includes(activity.activityTypeHash)) return "dungeon";
  return "other";
}

// Note: Ensure that BUNGIE_API_BASE_URL is defined in your config.js as needed.
// For example:
// export const BUNGIE_API_BASE_URL = "https://www.bungie.net";
