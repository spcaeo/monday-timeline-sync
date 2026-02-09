# How to Sync Start Date and End Date with Timeline in Monday.com (Free, Open-Source Solution)

> A complete guide to automatically syncing date columns with timeline columns in Monday.com — without paying for marketplace apps.

## Table of Contents

- [The Problem](#the-problem)
- [Why Existing Solutions Fall Short](#why-existing-solutions-fall-short)
- [The Free Open-Source Alternative](#the-free-open-source-alternative)
- [How Monday.com Timeline Sync Works](#how-mondaycom-timeline-sync-works)
- [Step-by-Step Setup Guide](#step-by-step-setup-guide)
- [Deployment Options](#deployment-options)
- [Sync Modes Explained](#sync-modes-explained)
- [Troubleshooting Common Issues](#troubleshooting-common-issues)
- [FAQ](#faq)

---

## The Problem

If you use Monday.com for project management, you've likely hit this wall: **you have separate Start Date and End Date columns, but the Timeline column doesn't sync with them automatically.**

This means:
- Your Gantt chart views show nothing (because they rely on the Timeline column)
- Every time someone updates a date, they have to manually update the timeline too
- When the timeline is adjusted, the individual date columns get out of sync
- Data entry is doubled, and errors creep in

This is one of the **most requested features** in the Monday.com community. Posts about this topic have thousands of views:
- "Timeline update based on start date and end date" (Monday.com Community)
- "Sync date column to timeline" (Monday.com Community)
- "How to auto-populate timeline from two date columns" (Monday.com Community)

## Why Existing Solutions Fall Short

### Native Monday.com Automations
Monday.com's built-in automations **cannot write to Timeline columns**. You can set automations to read from a timeline, but there's no native recipe to populate a timeline from two date columns. This is a known platform limitation.

### Marketplace Apps
The primary marketplace solution is **"Start + End = Timeline"** by Excellent Team (monday.com/marketplace/18). While functional, it:
- Costs money per seat per month
- Requires a paid Monday.com plan that supports marketplace apps
- Adds another vendor dependency
- No source code access (proprietary)

### Make.com / Zapier / n8n
Integration platforms can technically solve this with multi-step workflows, but:
- They add latency (not real-time)
- They cost money at scale (per operation pricing)
- They require maintaining yet another tool
- Complex setup for what should be a simple sync

## The Free Open-Source Alternative

**Monday Timeline Sync** is an open-source app that solves this problem completely:

- **Free forever** — MIT licensed, self-host on free tiers
- **Real-time** — uses Monday.com webhooks for instant sync
- **Bi-directional** — dates to timeline AND timeline to dates
- **Multi-board** — configure any number of boards
- **Two deployment options** — Cloudflare Workers (edge) or Render.com (Node.js)
- **TypeScript** — clean, typed, maintainable codebase

GitHub: [github.com/spcaeo/monday-timeline-sync](https://github.com/spcaeo/monday-timeline-sync)

## How Monday.com Timeline Sync Works

The app uses Monday.com's webhook system and GraphQL API:

1. **You configure which columns to sync** — tell the app which board, which Start Date column, which End Date column, and which Timeline column to keep in sync.

2. **A webhook monitors column changes** — Monday.com sends an HTTP POST to your app whenever any column value changes on the configured board.

3. **The app syncs automatically** — when a date column changes, the app reads both dates and writes the timeline. When the timeline changes, it reads the timeline and writes both dates.

4. **Loop prevention** — a debounce mechanism prevents infinite loops (date change triggers timeline change triggers date change...).

### Architecture

```
Monday.com Board
  | User changes a date or timeline
  v
Monday.com Webhook System
  | Sends HTTP POST with column change event
  v
Monday Timeline Sync App (your server)
  | 1. Receives webhook event
  | 2. Checks debounce (5-second window)
  | 3. Reads current column values via GraphQL API
  | 4. Computes the sync direction
  | 5. Writes updated column via GraphQL mutation
  v
Monday.com Board
  | Column updated automatically
  Done!
```

### The GraphQL Mutations

For dates to timeline:
```graphql
mutation {
  change_column_value(
    board_id: 1234567890,
    item_id: 9876543210,
    column_id: "timeline",
    value: "{\"from\": \"2026-03-01\", \"to\": \"2026-03-15\"}"
  ) { id }
}
```

For timeline to dates:
```graphql
mutation {
  change_multiple_column_values(
    item_id: 9876543210,
    board_id: 1234567890,
    column_values: "{\"start_date\": {\"date\": \"2026-03-01\"}, \"end_date\": {\"date\": \"2026-03-15\"}}"
  ) { id }
}
```

## Step-by-Step Setup Guide

### Prerequisites

- A Monday.com account (any plan)
- A Monday.com API token ([how to get one](https://support.monday.com/hc/en-us/articles/360005144659-Does-monday-com-have-an-API))
- A board with Start Date, End Date, and Timeline columns

### Step 1: Deploy the App

**Easiest option — Render.com (free):**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/spcaeo/monday-timeline-sync)

Click the button, fill in your Monday.com API token and app URL, and you'll have a running instance in under 2 minutes.

**Alternative — Cloudflare Workers (free, edge-deployed):**

```bash
git clone https://github.com/spcaeo/monday-timeline-sync.git
cd monday-timeline-sync
npm install
npx wrangler kv namespace create KV
# Set secrets
npx wrangler secret put MONDAY_API_TOKEN
npm run deploy:cf
```

### Step 2: Find Your Column IDs

```bash
curl https://your-app-url.com/configure/YOUR_BOARD_ID/columns
```

This returns all columns on your board, highlighting the date and timeline columns:

```json
{
  "dateColumns": [
    {"id": "date0", "title": "Start Date", "type": "date"},
    {"id": "date1", "title": "End Date", "type": "date"}
  ],
  "timelineColumns": [
    {"id": "timeline", "title": "Project Timeline", "type": "timeline"}
  ]
}
```

### Step 3: Configure the Sync

```bash
curl -X POST https://your-app-url.com/configure \
  -H "Content-Type: application/json" \
  -d '{
    "boardId": 1234567890,
    "startDateColumnId": "date0",
    "endDateColumnId": "date1",
    "timelineColumnId": "timeline",
    "apiToken": "your-monday-api-token"
  }'
```

The app validates that all column IDs exist on the board before saving.

### Step 4: Activate the Webhook

```bash
curl -X POST https://your-app-url.com/webhook/subscribe \
  -H "Content-Type: application/json" \
  -d '{"boardId": 1234567890}'
```

This creates a webhook on Monday.com that sends column change events to your app. From this point on, **the sync is fully automatic**.

### Step 5: Test It

Go to your Monday.com board, change a date, and watch the timeline update within seconds. Change the timeline, and the dates update. Magic!

## Deployment Options

### Render.com (Recommended for Simplicity)

- **Cost**: Free (free tier includes 750 hours/month)
- **Cold starts**: Yes (free tier spins down after 15 minutes of inactivity, ~30 second cold start)
- **Setup time**: 2 minutes with one-click deploy
- **Best for**: Small to medium teams, testing, straightforward setup

### Cloudflare Workers (Recommended for Performance)

- **Cost**: Free (100,000 requests/day on free tier)
- **Cold starts**: None (Workers run on the edge, always warm)
- **Setup time**: 5 minutes with CLI
- **Best for**: Teams that need instant response times, high-volume boards

### Self-Hosted (Any Node.js Environment)

The app uses Hono, which runs on any Node.js 18+ environment:
- Railway, Fly.io, DigitalOcean, AWS Lambda, Google Cloud Run
- Docker (`npm run build && node dist/server.js`)
- Any VPS or dedicated server

## Sync Modes Explained

### Bidirectional (Default)

Both directions sync:
- Change Start Date or End Date → Timeline updates
- Change Timeline → Start Date and End Date update

Best for teams where some people prefer editing dates directly and others prefer dragging the timeline.

### Dates to Timeline

One-way: Date columns are the source of truth.
- Change Start Date or End Date → Timeline updates
- Change Timeline → Nothing happens

Best for teams that manage dates in date columns and use the timeline purely for visualization.

### Timeline to Dates

One-way: Timeline column is the source of truth.
- Change Timeline → Start Date and End Date update
- Change Start Date or End Date → Nothing happens

Best for teams that primarily use the Gantt/timeline view and want the individual date columns to reflect timeline changes.

## Troubleshooting Common Issues

### Timeline doesn't update after changing dates

1. **Check the webhook is active**: `GET /configure/YOUR_BOARD_ID` should show your config
2. **Verify both dates are set**: The timeline can only sync when BOTH start and end dates have values
3. **Check the webhook URL**: Make sure your app's public URL is accessible
4. **Wait for debounce**: After a sync, there's a 5-second debounce window where additional changes are ignored

### Getting "Board not configured" errors

Your app may have restarted, clearing the in-memory storage. Re-run the configure command. For persistent storage, deploy on Cloudflare Workers (uses KV storage) or add a database to your Node.js deployment.

### Infinite loop / rapid updates

The built-in debounce prevents this, but if you're seeing issues:
1. Check that you're only configuring each board once
2. Ensure no other automation is also modifying the same columns
3. The 5-second debounce window should prevent loops

### Webhook not receiving events

1. Verify your app is publicly accessible (not just localhost)
2. Check that the Monday.com webhook was created: look in your board's integrations
3. Ensure your API token has `boards:read` and `boards:write` permissions

## FAQ

### Is this app free to use?

Yes, completely free. It's MIT licensed open-source software. You can deploy it on Cloudflare Workers or Render.com free tiers at no cost.

### Do I need a paid Monday.com plan?

No. The app works with any Monday.com plan that supports API access and webhooks, including free and individual plans.

### Can I sync multiple boards?

Yes. Run the configure and subscribe commands for each board you want to sync. Each board can have different column mappings.

### Is my API token secure?

Your API token is stored in your own infrastructure (Cloudflare KV or your server's memory). It never leaves your deployment. The source code is open for you to audit.

### What happens if my server goes down?

Monday.com will retry failed webhook deliveries. When your server comes back up, it will process the queued events. If using in-memory storage (Render), you'll need to re-run the configure command after a restart.

### Can I use this for subitems?

Currently, the app syncs columns on main items. Subitem support could be added by subscribing to subitem column change events. PRs welcome!

### How is this different from "Start + End = Timeline" on the marketplace?

Both solve the same problem. The marketplace app is a managed service (you pay, they host). This is self-hosted (you deploy, it's free). The core sync logic is essentially the same.

---

## About TaskRhino

This project is built and maintained by [TaskRhino](https://www.taskrhino.ca) — we help businesses automate their Monday.com workflows, build custom integrations, and streamline operations.

**Services we offer:**
- Custom Monday.com app development
- Monday.com workflow automation
- Integration with third-party tools (CRM, ERP, accounting)
- Monday.com consulting and training
- Data migration to Monday.com

**[Get in touch](https://www.taskrhino.ca)** | **[sales@taskrhino.ca](mailto:sales@taskrhino.ca)**
