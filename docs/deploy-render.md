# Deploy to Render.com

This guide walks you through deploying Monday Timeline Sync to [Render.com](https://render.com) as a Node.js web service.

Render is the simplest option -- one click to deploy, free tier available, no CLI tools required.

---

## Prerequisites

- A [Render.com account](https://dashboard.render.com/register) (free)
- A [GitHub account](https://github.com) (to fork the repo)
- Your Monday.com app credentials ([setup guide](MONDAY_APP_SETUP.md))

## Option 1: One-Click Deploy (Fastest)

Click the button below to deploy directly from GitHub:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/spcaeo/monday-timeline-sync)

Render reads the `render.yaml` blueprint in the repo and creates the service automatically. You'll be prompted to fill in the environment variables:

| Variable | What to enter |
|----------|---------------|
| `MONDAY_CLIENT_ID` | Client ID from your Monday.com app |
| `MONDAY_CLIENT_SECRET` | Client secret from your Monday.com app |
| `MONDAY_SIGNING_SECRET` | Signing secret from your Monday.com app |
| `MONDAY_API_TOKEN` | Your personal API token from Monday.com |
| `APP_URL` | Leave blank for now -- fill in after deploy (see Step 3 below) |

After clicking **Apply**, Render builds and deploys the service. This takes 1-2 minutes.

### Step 3: Set APP_URL

Once deployed, Render assigns a URL like `https://monday-timeline-sync-xxxx.onrender.com`.

1. Go to your service in the Render dashboard
2. Copy the URL from the top of the page
3. Go to **Environment** in the left sidebar
4. Set `APP_URL` to your Render URL (e.g., `https://monday-timeline-sync-xxxx.onrender.com`)
5. Click **Save Changes** -- Render automatically redeploys

## Option 2: Manual Setup

If you prefer to set things up manually:

### Step 1: Fork the Repository

Fork [spcaeo/monday-timeline-sync](https://github.com/spcaeo/monday-timeline-sync) on GitHub.

### Step 2: Create a Web Service on Render

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **New > Web Service**
3. Connect your GitHub account if you haven't already
4. Select your forked `monday-timeline-sync` repository
5. Configure the service:

| Setting | Value |
|---------|-------|
| **Name** | `monday-timeline-sync` |
| **Region** | Pick the closest to you |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `node dist/server.js` |
| **Plan** | Free |

### Step 3: Set Environment Variables

In the **Environment** section, add:

| Key | Value |
|-----|-------|
| `MONDAY_CLIENT_ID` | Your Monday.com Client ID |
| `MONDAY_CLIENT_SECRET` | Your Monday.com Client Secret |
| `MONDAY_SIGNING_SECRET` | Your Monday.com Signing Secret |
| `MONDAY_API_TOKEN` | Your Monday.com API Token |
| `APP_URL` | `https://your-service-name.onrender.com` |
| `PORT` | `3000` |
| `SYNC_MODE` | `bidirectional` |

### Step 4: Deploy

Click **Create Web Service**. Render clones your repo, runs the build, and starts the server. First deploy takes 2-3 minutes.

## Step 5: Configure a Board

Once deployed, configure your Monday.com board:

```bash
# Find your column IDs
curl https://your-service.onrender.com/configure/YOUR_BOARD_ID/columns

# Configure sync
curl -X POST https://your-service.onrender.com/configure \
  -H "Content-Type: application/json" \
  -d '{
    "boardId": 1234567890,
    "startDateColumnId": "date0",
    "endDateColumnId": "date1",
    "timelineColumnId": "timeline",
    "apiToken": "your-monday-api-token"
  }'

# Activate webhook
curl -X POST https://your-service.onrender.com/webhook/subscribe \
  -H "Content-Type: application/json" \
  -d '{"boardId": 1234567890}'
```

---

## Free Tier Limitations

Render's free tier has some limitations to be aware of:

### Spin-down after inactivity

Free services **spin down after 15 minutes of no traffic**. When Monday.com sends the next webhook, the service cold-starts, which takes 10-30 seconds. Monday.com retries webhooks, so the event should still be processed -- but there may be a delay.

### In-memory storage

On Render, board configurations are stored in memory. If the service restarts (due to redeploy or spin-down), **configurations are lost** and you'll need to re-run the configure commands. For persistent storage, consider:

- Upgrading to a paid Render plan (services stay running)
- Using Cloudflare Workers with KV storage instead
- Adding a database (like Render's free PostgreSQL) -- requires code changes

### Build minutes

Free tier includes 750 build hours/month, which is more than enough for this app.

## Upgrade Options

If the free tier limitations are a problem:

| Plan | Price | Benefits |
|------|-------|----------|
| **Starter** | $7/month | No spin-down, persistent service, custom domains |
| **Standard** | $25/month | More CPU/RAM, autoscaling, SLA |

Even the $7 Starter plan eliminates the cold start issue and keeps your service running 24/7.

## Custom Domain

To use a custom domain on Render:

1. Go to your service **Settings**
2. Under **Custom Domains**, click **Add Custom Domain**
3. Enter your domain (e.g., `sync.yourdomain.com`)
4. Add the CNAME record Render provides to your DNS
5. Render automatically provisions an SSL certificate
6. Update `APP_URL` in environment variables to your custom domain

Custom domains are available on all plans, including free.

## Auto-Deploy

By default, Render auto-deploys when you push to the `main` branch of your connected GitHub repo. To disable this:

1. Go to your service **Settings**
2. Under **Build & Deploy**, toggle off **Auto-Deploy**

## Monitoring

- **Logs**: In your Render dashboard, click **Logs** in the left sidebar to see real-time output
- **Events**: The **Events** tab shows deploy history, restarts, and health check results
- **Metrics**: Available on paid plans -- CPU, memory, and request metrics

## Troubleshooting

### Service won't start

Check the **Logs** tab for error output. Common issues:

- Missing environment variables -- make sure all required vars are set
- Build failure -- verify `npm install && npm run build` succeeds locally first

### "Board not configured" after restart

On the free tier, in-memory storage is lost when the service spins down. Re-run the `/configure` and `/webhook/subscribe` commands to restore configuration.

### Webhook events delayed

On the free tier, the first request after spin-down triggers a cold start (10-30 seconds). Monday.com retries failed webhooks, so events are eventually processed. Upgrade to the Starter plan ($7/month) to eliminate cold starts.

### Health check failures

Render checks `/` by default. The app responds to `GET /` with a health check response. If health checks fail, check your logs for startup errors.

---

[Back to README](../README.md)
