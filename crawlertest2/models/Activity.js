import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
  _id: String, // Activity ID (PGCR ID)
  name: String, // Activity Name (Raid, Dungeon, etc.)
  kills: Number,
  deaths: Number,
  kd_ratio: Number,
  timestamp: Date, // When the activity occurred
  activityHash: String, // Hash to identify the activity
  userId: String, // Player's Membership ID
  completed: Boolean, // Was the activity completed?
  isFlawless: Boolean, // Did the fireteam complete it flawlessly?
  durationSeconds: Number, // Total duration of the activity
  fireteamSize: Number, // How many players participated
  startTime: Date, // Exact start time of the activity
  endTime: Date, // Calculated end time based on duration
  activityType: String, // "raid", "dungeon", or "other"
  fireteam: [
    {
      membershipId: String, // Fireteam member ID
      displayName: String,  // Bungie name
      platform: String,     // Xbox, PS, or PC
      kills: Number,
      deaths: Number,
      kd_ratio: Number,
      profileLink: String,  // Raid/Dungeon report link
    },
  ],
});

export const Activity = mongoose.model("Activity", activitySchema);
