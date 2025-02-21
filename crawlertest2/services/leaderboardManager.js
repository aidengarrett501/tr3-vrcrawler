import { Leaderboard } from "../models/Leaderboard.js"; // ? Use named import

// ? Update leaderboard after each PGCR
export async function updateLeaderboard(playerId, displayName, playerEntry, isFlawless, activityType) {
  const kd = playerEntry.values.killsDeathsRatio.basic.value;
  const kills = playerEntry.values.kills.basic.value;
  const deaths = playerEntry.values.deaths.basic.value;

  const update = {
    $inc: {
      totalKills: kills,
      totalDeaths: deaths,
      flawlessRuns: isFlawless ? 1 : 0,
      totalRaids: activityType === "Raid" ? 1 : 0,
      totalDungeons: activityType === "Dungeon" ? 1 : 0,
    },
    $max: {
      bestKD: kd,
    },
  };

  await Leaderboard.findOneAndUpdate(
    { playerId },
    { $set: { displayName }, ...update },
    { upsert: true, new: true }
  );
}

// ?? Fetch Top 10 Players by KD
export async function getTopPlayersByKD() {
  const topPlayers = await Leaderboard.find({})
    .sort({ bestKD: -1 })
    .limit(10);

  return topPlayers.map((player, index) => ({
    rank: index + 1,
    displayName: player.displayName,
    bestKD: player.bestKD.toFixed(2),
  }));
}
