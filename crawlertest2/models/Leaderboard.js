import mongoose from "mongoose";

const leaderboardSchema = new mongoose.Schema({
  playerId: String,
  displayName: String,
  totalRaids: { type: Number, default: 0 },
  totalDungeons: { type: Number, default: 0 },
  flawlessRuns: { type: Number, default: 0 },
  bestKD: { type: Number, default: 0 },
  totalKills: { type: Number, default: 0 },
  totalDeaths: { type: Number, default: 0 },
});

// ? Named export for Leaderboard
export const Leaderboard = mongoose.model("Leaderboard", leaderboardSchema);
