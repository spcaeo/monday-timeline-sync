import "dotenv/config";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { MemoryStorage } from "./storage/memory.js";
import { logger } from "./utils/logger.js";

const port = Number(process.env.PORT || 3000);

const storage = new MemoryStorage();
const appEnv = {
  MONDAY_CLIENT_ID: process.env.MONDAY_CLIENT_ID || "",
  MONDAY_CLIENT_SECRET: process.env.MONDAY_CLIENT_SECRET || "",
  MONDAY_SIGNING_SECRET: process.env.MONDAY_SIGNING_SECRET || "",
  MONDAY_API_TOKEN: process.env.MONDAY_API_TOKEN || "",
  APP_URL: process.env.APP_URL || `http://localhost:${port}`,
  SYNC_MODE: process.env.SYNC_MODE || "bidirectional",
};

const app = createApp(storage, appEnv);

logger.info(`Monday Timeline Sync running on port ${port}`);
logger.info(`Landing page: http://localhost:${port}`);
logger.info(`Health check: http://localhost:${port}/health`);
logger.info(`Sync mode: ${appEnv.SYNC_MODE}`);

serve({ fetch: app.fetch, port });
