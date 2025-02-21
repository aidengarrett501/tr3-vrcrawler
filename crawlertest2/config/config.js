import dotenv from "dotenv";

dotenv.config();

// ? Extract and split rotating API keys
const BUNGIE_API_KEYS = process.env.BUNGIE_API_KEYS.split(",").map((key) => key.trim());

export const BUNGIE_API_KEY = BUNGIE_API_KEYS[0]; // Default to the first key
export const BUNGIE_API_KEYS_ROTATING = BUNGIE_API_KEYS; // For rotation

export const BUNGIE_BASE_URL = "https://www.bungie.net/Platform/Destiny2";
export const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
export const MONGODB_URI = process.env.MONGODB_URI;
export const MEMBERSHIP_TYPE = process.env.MEMBERSHIP_TYPE || 3; // Default to Steam
export const ALLOWED_ACTIVITY_TYPES = ["Raid", "Dungeon", "PvP"]; // Filtered activity types
