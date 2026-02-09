import { Hono } from "hono";
import type { StorageAdapter, MondayWebhookPayload, BoardSyncConfig, AppContext } from "../types.js";
import { MondayApiClient } from "../services/monday.js";
import { TimelineSyncService } from "../services/sync.js";
import { logger } from "../utils/logger.js";

type Variables = { storage: StorageAdapter; appEnv: AppContext["env"] };

export function webhookRoutes() {
  const app = new Hono<{ Variables: Variables }>();

  // POST /webhook - main Monday.com webhook handler
  app.post("/", async (c) => {
    const body = await c.req.json<MondayWebhookPayload>();

    // Monday.com challenge verification
    if (body.challenge) {
      return c.json({ challenge: body.challenge });
    }

    const event = body.event;
    if (!event) return c.json({ error: "No event in payload" }, 400);

    const storage = c.get("storage");

    // Look up board config
    const configStr = await storage.get(`config:${event.boardId}`);
    if (!configStr) {
      logger.warn(`No config for board ${event.boardId}`);
      return c.json({ error: "Board not configured" }, 200); // 200 so Monday doesn't retry
    }

    const config: BoardSyncConfig = JSON.parse(configStr);
    const monday = new MondayApiClient(config.apiToken);
    const sync = new TimelineSyncService(monday, storage);

    const result = await sync.handleColumnChange(event, config);
    logger.info(`Sync result for board ${event.boardId}, item ${event.pulseId}:`, result);

    return c.json(result);
  });

  // POST /webhook/subscribe - create a webhook subscription for a board
  app.post("/subscribe", async (c) => {
    const { boardId } = await c.req.json<{ boardId: number }>();
    const storage = c.get("storage");
    const appEnv = c.get("appEnv");

    const configStr = await storage.get(`config:${boardId}`);
    if (!configStr) return c.json({ error: "Configure the board first via POST /configure" }, 400);

    const config: BoardSyncConfig = JSON.parse(configStr);
    const monday = new MondayApiClient(config.apiToken);

    const webhookUrl = `${appEnv.APP_URL}/webhook`;

    // Create webhook for column changes
    const webhookId = await monday.createWebhook(boardId, webhookUrl, "change_column_value");

    // Store webhook ID for cleanup later
    await storage.put(`webhook:${boardId}`, JSON.stringify({ id: webhookId }));

    return c.json({ success: true, webhookUrl, boardId, webhookId });
  });

  // POST /webhook/unsubscribe - remove webhook for a board
  app.post("/unsubscribe", async (c) => {
    const { boardId } = await c.req.json<{ boardId: number }>();
    const storage = c.get("storage");

    const configStr = await storage.get(`config:${boardId}`);
    if (!configStr) return c.json({ error: "Board not configured" }, 400);

    const config: BoardSyncConfig = JSON.parse(configStr);
    const webhookStr = await storage.get(`webhook:${boardId}`);
    if (!webhookStr) return c.json({ error: "No webhook found for board" }, 400);

    const monday = new MondayApiClient(config.apiToken);
    const webhook = JSON.parse(webhookStr);
    await monday.deleteWebhook(webhook.id);
    await storage.delete(`webhook:${boardId}`);

    return c.json({ success: true, boardId });
  });

  return app;
}
