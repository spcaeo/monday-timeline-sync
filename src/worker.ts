import { createApp } from "./app.js";
import { CloudflareKVStorage } from "./storage/cloudflare-kv.js";
import type { Env } from "./types.js";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const storage = new CloudflareKVStorage(env.KV);
    const appEnv = {
      MONDAY_CLIENT_ID: env.MONDAY_CLIENT_ID,
      MONDAY_CLIENT_SECRET: env.MONDAY_CLIENT_SECRET,
      MONDAY_SIGNING_SECRET: env.MONDAY_SIGNING_SECRET,
      MONDAY_API_TOKEN: env.MONDAY_API_TOKEN,
      APP_URL: env.APP_URL,
      SYNC_MODE: env.SYNC_MODE || "bidirectional",
    };
    const app = createApp(storage, appEnv);
    return app.fetch(request, env, ctx);
  },
};
