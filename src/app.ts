import { Hono } from "hono";
import { cors } from "hono/cors";
import type { StorageAdapter, AppContext } from "./types.js";
import { webhookRoutes } from "./routes/webhook.js";
import { configureRoutes } from "./routes/configure.js";
import { logger } from "./utils/logger.js";

type Variables = { storage: StorageAdapter; appEnv: AppContext["env"] };

export function createApp(storage: StorageAdapter, appEnv: AppContext["env"]) {
  const app = new Hono<{ Variables: Variables }>();

  // CORS - allow Monday.com
  app.use("*", cors({ origin: "*" }));

  // Inject storage and env into all routes
  app.use("*", async (c, next) => {
    c.set("storage", storage);
    c.set("appEnv", appEnv);
    await next();
  });

  // Health check
  app.get("/health", (c) =>
    c.json({ status: "ok", timestamp: new Date().toISOString(), version: "1.0.0" })
  );

  // Landing page
  app.get("/", (c) => {
    return c.html(`<!DOCTYPE html>
<html><head><title>Monday Timeline Sync</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:680px;margin:60px auto;padding:0 20px;color:#333;line-height:1.6}
h1{color:#0073ea}code{background:#f4f4f4;padding:2px 6px;border-radius:3px;font-size:14px}
pre{background:#f4f4f4;padding:16px;border-radius:8px;overflow-x:auto}
a{color:#0073ea}.footer{margin-top:40px;padding-top:20px;border-top:1px solid #eee;font-size:14px;color:#666}</style></head>
<body>
<h1>Monday Timeline Sync</h1>
<p>Free, open-source app that syncs Start Date + End Date columns with Timeline columns on Monday.com.</p>

<h2>Quick Setup</h2>
<ol>
<li>Configure your board: <code>POST /configure</code></li>
<li>Subscribe to changes: <code>POST /webhook/subscribe</code></li>
<li>Done! Column changes will sync automatically.</li>
</ol>

<h2>API Endpoints</h2>
<ul>
<li><code>GET /health</code> &mdash; Health check</li>
<li><code>POST /configure</code> &mdash; Configure board sync</li>
<li><code>GET /configure/:boardId</code> &mdash; View board config</li>
<li><code>GET /configure/:boardId/columns</code> &mdash; List board columns</li>
<li><code>DELETE /configure/:boardId</code> &mdash; Remove board config</li>
<li><code>POST /webhook</code> &mdash; Monday.com webhook receiver</li>
<li><code>POST /webhook/subscribe</code> &mdash; Create webhook subscription</li>
<li><code>POST /webhook/unsubscribe</code> &mdash; Remove webhook</li>
</ul>

<div class="footer">
Built by <a href="https://www.growsherpa.ca">GrowSherpa</a> |
<a href="https://github.com/AiGrowSherpa/monday-timeline-sync">GitHub</a>
</div>
</body></html>`);
  });

  // Mount routes
  app.route("/webhook", webhookRoutes());
  app.route("/configure", configureRoutes());

  // Error handler
  app.onError((err, c) => {
    logger.error("Unhandled error:", err.message);
    return c.json({ error: "Internal server error" }, 500);
  });

  // 404 handler
  app.notFound((c) => c.json({ error: "Not found" }, 404));

  return app;
}
