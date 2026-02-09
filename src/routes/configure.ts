import { Hono } from "hono";
import type { StorageAdapter, BoardSyncConfig, AppContext } from "../types.js";
import { MondayApiClient } from "../services/monday.js";

type Variables = { storage: StorageAdapter; appEnv: AppContext["env"] };

export function configureRoutes() {
  const app = new Hono<{ Variables: Variables }>();

  // POST /configure - save board sync configuration
  app.post("/", async (c) => {
    const body = await c.req.json();
    const { boardId, startDateColumnId, endDateColumnId, timelineColumnId, apiToken } = body;

    // Validate required fields
    if (!boardId || !startDateColumnId || !endDateColumnId || !timelineColumnId || !apiToken) {
      return c.json(
        { error: "Missing required fields: boardId, startDateColumnId, endDateColumnId, timelineColumnId, apiToken" },
        400
      );
    }

    // Verify API token works by fetching board columns
    const monday = new MondayApiClient(apiToken);
    try {
      const columns = await monday.getBoardColumns(boardId);
      // Verify all column IDs exist
      const columnIds = columns.map((col) => col.id);
      const missing = [startDateColumnId, endDateColumnId, timelineColumnId].filter(
        (id) => !columnIds.includes(id)
      );
      if (missing.length > 0) {
        return c.json(
          { error: `Column IDs not found on board: ${missing.join(", ")}`, availableColumns: columns },
          400
        );
      }
    } catch {
      return c.json({ error: "Invalid API token or board ID" }, 400);
    }

    const storage = c.get("storage");
    const appEnv = c.get("appEnv");

    const config: BoardSyncConfig = {
      boardId,
      startDateColumnId,
      endDateColumnId,
      timelineColumnId,
      syncMode: appEnv.SYNC_MODE || "bidirectional",
      apiToken,
      installedAt: new Date().toISOString(),
    };

    await storage.put(`config:${boardId}`, JSON.stringify(config));

    return c.json({
      success: true,
      config: { ...config, apiToken: "***hidden***" },
      nextStep: `POST ${appEnv.APP_URL}/webhook/subscribe with {"boardId": ${boardId}} to activate the webhook`,
    });
  });

  // GET /configure/:boardId - check current config
  app.get("/:boardId", async (c) => {
    const boardId = c.req.param("boardId");
    const storage = c.get("storage");

    const configStr = await storage.get(`config:${boardId}`);
    if (!configStr) return c.json({ error: "Board not configured" }, 404);

    const config = JSON.parse(configStr);
    return c.json({ ...config, apiToken: "***hidden***" });
  });

  // DELETE /configure/:boardId - remove board config
  app.delete("/:boardId", async (c) => {
    const boardId = c.req.param("boardId");
    const storage = c.get("storage");

    await storage.delete(`config:${boardId}`);
    await storage.delete(`webhook:${boardId}`);

    return c.json({ success: true, message: `Config for board ${boardId} removed` });
  });

  // GET /configure/:boardId/columns - list available columns on the board
  app.get("/:boardId/columns", async (c) => {
    const boardId = c.req.param("boardId");
    const appEnv = c.get("appEnv");

    const apiToken = appEnv.MONDAY_API_TOKEN;
    if (!apiToken) return c.json({ error: "MONDAY_API_TOKEN not set" }, 500);

    const monday = new MondayApiClient(apiToken);
    const columns = await monday.getBoardColumns(Number(boardId));

    // Filter to show only date and timeline columns (most relevant)
    const dateColumns = columns.filter((col) => col.type === "date");
    const timelineColumns = columns.filter((col) => col.type === "timeline");

    return c.json({ boardId, allColumns: columns, dateColumns, timelineColumns });
  });

  return app;
}
