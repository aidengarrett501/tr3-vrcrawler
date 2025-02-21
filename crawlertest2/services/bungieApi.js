import axios from "axios";
import { BUNGIE_BASE_URL, BUNGIE_API_KEY } from "../config/config.js";

// ? Get PGCR (Post Game Carnage Report)
export async function getPGCR(activityId) {
  try {
    const response = await axios.get(
      `${BUNGIE_BASE_URL}/Stats/PostGameCarnageReport/${activityId}/`,
      { headers: { "X-API-Key": BUNGIE_API_KEY } }
    );
    return response.data.Response;
  } catch (error) {
    console.error(`? Error fetching PGCR for activity ${activityId}:`, error.message);
    return null;
  }
}

// ? Get Activity Details
export async function getActivityDetails(activityRefId) {
  try {
    const response = await axios.get(
      `${BUNGIE_BASE_URL}/Manifest/DestinyActivityDefinition/${activityRefId}/`,
      { headers: { "X-API-Key": BUNGIE_API_KEY } }
    );

    return {
      type: response.data.Response?.activityTypeHash,
      name: response.data.Response?.displayProperties?.name || "Unknown Activity",
    };
  } catch (error) {
    console.error(`? Error fetching activity details for ref ID ${activityRefId}:`, error.message);
    return null;
  }
}
