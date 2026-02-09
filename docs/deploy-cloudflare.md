# Deploy to Cloudflare Workers

This guide walks you through deploying Monday Timeline Sync to [Cloudflare Workers](https://workers.cloudflare.com/) with KV storage.

Cloudflare Workers runs your code at the edge -- close to your users with zero cold starts. The free tier covers **100,000 requests per day**, which is more than enough for most Monday.com boards.

---

## Prerequisites

- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- [Node.js 18+](https://nodejs.org/) installed locally
- Your Monday.com app credentials ([setup guide](MONDAY_APP_SETUP.md))

## Step 1: Clone and Install

```bash
git clone https://github.com/spcaeo/monday-timeline-sync.git
cd monday-timeline-sync
npm install
```

## Step 2: Install and Authenticate Wrangler

Wrangler is the Cloudflare Workers CLI. It's included as a dev dependency, but you can also install it globally:

```bash
npm install -g wrangler
```

Authenticate with your Cloudflare account:

```bash
wrangler login
```

This opens a browser window for you to authorize Wrangler.

## Step 3: Create KV Namespace

The app uses Cloudflare KV to store board configurations and webhook state.

```bash
# Create production namespace
npx wrangler kv namespace create "KV"

# Create preview namespace (for local dev)
npx wrangler kv namespace create "KV" --preview
```

Each command outputs a namespace ID. You'll see output like:

```
Add the following to your configuration file in your kv_namespaces array:
{ binding = "KV", id = "abc123def456..." }
```

Copy both IDs (production and preview).

## Step 4: Configure wrangler.toml

Open `wrangler.toml` and replace the placeholder IDs with your actual KV namespace IDs:

```toml
[[kv_namespaces]]
binding = "KV"
id = "your_production_kv_id_here"
preview_id = "your_preview_kv_id_here"
```

Update the `APP_URL` to your Workers domain:

```toml
[vars]
APP_URL = "https://monday-timeline-sync.your-subdomain.workers.dev"
SYNC_MODE = "bidirectional"
```

Your subdomain is your Cloudflare Workers subdomain. You can find it in the Cloudflare dashboard under **Workers & Pages > Overview**.

## Step 5: Set Secrets

Store sensitive credentials as Cloudflare secrets. These are encrypted and never exposed in your code or logs.

```bash
npx wrangler secret put MONDAY_CLIENT_ID
npx wrangler secret put MONDAY_CLIENT_SECRET
npx wrangler secret put MONDAY_SIGNING_SECRET
npx wrangler secret put MONDAY_API_TOKEN
```

Each command prompts you to paste the value interactively. Get these values from your Monday.com app ([setup guide](MONDAY_APP_SETUP.md)).

## Step 6: Deploy

```bash
npm run deploy:cf
```

Wrangler outputs your live URL:

```
Published monday-timeline-sync (1.2s)
  https://monday-timeline-sync.your-subdomain.workers.dev
```

## Step 7: Verify

Check the health endpoint:

```bash
curl https://monday-timeline-sync.your-subdomain.workers.dev/
```

You should receive a JSON response confirming the app is running.

## Step 8: Configure a Board

Now configure your Monday.com board to use the sync:

```bash
# Find your column IDs
curl https://monday-timeline-sync.your-subdomain.workers.dev/configure/YOUR_BOARD_ID/columns

# Configure sync
curl -X POST https://monday-timeline-sync.your-subdomain.workers.dev/configure \
  -H "Content-Type: application/json" \
  -d '{
    "boardId": 1234567890,
    "startDateColumnId": "date0",
    "endDateColumnId": "date1",
    "timelineColumnId": "timeline",
    "apiToken": "your-monday-api-token"
  }'

# Activate webhook
curl -X POST https://monday-timeline-sync.your-subdomain.workers.dev/webhook/subscribe \
  -H "Content-Type: application/json" \
  -d '{"boardId": 1234567890}'
```

---

## Custom Domain (Optional)

To use a custom domain instead of `*.workers.dev`:

1. In the Cloudflare dashboard, go to **Workers & Pages > your worker > Settings > Domains & Routes**
2. Click **Add** and enter your custom domain (e.g., `sync.yourdomain.com`)
3. The domain must be on Cloudflare (either registered there or using Cloudflare DNS)
4. Cloudflare automatically provisions an SSL certificate
5. Update `APP_URL` in `wrangler.toml` and redeploy:

```bash
npm run deploy:cf
```

## Local Development

For local testing with the Cloudflare Workers runtime:

```bash
npm run dev:cf
```

This runs Wrangler's local mode at `http://localhost:8787` with a local KV emulation. Webhooks from Monday.com won't reach localhost -- use `npm run tunnel` if you need to test webhooks locally.

## Monitoring and Logs

View real-time logs from your deployed Worker:

```bash
npx wrangler tail
```

This streams live log output, including `console.log` statements, errors, and request metadata. Press `Ctrl+C` to stop.

For historical logs, check the Cloudflare dashboard under **Workers & Pages > your worker > Logs**.

## Updating

To deploy a new version:

```bash
git pull origin main
npm run deploy:cf
```

Cloudflare Workers deployments are atomic -- the new version replaces the old one instantly with zero downtime.

## Cost

Cloudflare Workers free tier includes:

- **100,000 requests/day** -- More than enough for webhook processing
- **10ms CPU time per request** -- Timeline sync operations are well under this
- **1 MB script size** -- This app is well under the limit
- **KV reads**: 100,000/day free; KV writes: 1,000/day free

For most Monday.com workspaces, the free tier is all you need. If you exceed limits, the paid plan starts at $5/month for 10 million requests.

## Troubleshooting

### "KV namespace not found"

Ensure the KV namespace IDs in `wrangler.toml` match the ones from:

```bash
npx wrangler kv namespace list
```

### "Script too large"

Cloudflare Workers has a 1 MB script size limit on the free plan. This app is well under that limit, but if you add large dependencies, check the bundle size.

### Webhook verification failures

Confirm that `MONDAY_SIGNING_SECRET` is set correctly:

```bash
npx wrangler secret list
```

This shows which secrets are set (but not their values). Re-set a secret if needed:

```bash
npx wrangler secret put MONDAY_SIGNING_SECRET
```

### "No such module" or import errors

Make sure you're using Node.js 18+ and have run `npm install`. The app uses ES modules (`"type": "module"` in package.json).

---

[Back to README](../README.md)
