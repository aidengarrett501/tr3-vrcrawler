import mongoose from "mongoose";

const playerSchema = new mongoose.Schema({
  _id: String, // Membership ID
  displayName: String,
  membershipType: Number,
  lastUpdated: Date,
  lastProcessedActivityId: String, // For resume logic
  guardians: [
    {
      characterId: String,
      class: Number,
      lightLevel: Number,
    },
  ],
});

export const Player = mongoose.model("Player", playerSchema);
