import dotenv from "dotenv";
import mongoose from "mongoose";
import { processPlayer } from "./services/pgcrProcessor.js";
import { Player } from "./models/Player.js"; // ? Corrected import
import { Activity } from "./models/Activity.js"; // ? Corrected import
import { getTopPlayersByKD } from "./services/leaderboardManager.js";
import { sendLeaderboardToDiscord } from "./services/discordWebhook.js";
import Fastify from "fastify";

dotenv.config();

const fastify = Fastify({ logger: true });
const MONGODB_URI = process.env.MONGODB_URI;

// ? Connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("? Connected to MongoDB");
  })
  .catch((err) => console.error("? MongoDB connection error:", err));

// ?? Start the Crawler
async function startCrawler() {
  try {
    // ? Fetch all players from MongoDB to resume processing
    const players = await Player.find({});
    console.log(`?? Found ${players.length} players in DB`);

    // ? Process players who haven't been fully processed
    for (const player of players) {
      console.log(`?? Processing player: ${player.displayName || player._id}`);
      await processPlayer(player._id);
    }

    // ?? Generate and send the leaderboard to Discord
    const leaderboard = await getTopPlayersByKD();
    await sendLeaderboardToDiscord(leaderboard);

    console.log("?? Crawler finished processing");
  } catch (error) {
    console.error("? Crawler error:", error.message);
  }
}

// Start Fastify API (if needed)
fastify.listen({ port: 4000, host: "0.0.0.0" }, (err) => {
  startCrawler(); // ? Start the crawler when the API is ready
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
