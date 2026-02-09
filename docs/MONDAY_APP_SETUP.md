# Monday.com App Setup Guide

Step-by-step guide to creating a Monday.com app for Timeline Sync.

This is a **private app** -- it runs on your own infrastructure and does not require marketplace review or approval.

---

## Step 1: Open the Monday.com Developer Center

Go to [monday.com/developers/apps](https://monday.com/developers/apps) and sign in with your Monday.com account.

You need to be a workspace admin to create apps.

## Step 2: Create a New App

1. Click the **"Create App"** button in the top right
2. Enter a name: **Timeline Sync** (or any name you prefer)
3. Click **Create**

You'll be taken to the app's configuration page.

## Step 3: Get Your App Credentials

On the app configuration page, under **Basic Information**, you'll find three values you need:

### Client ID

- Listed under **Basic Information > App Credentials**
- Looks like: `a1b2c3d4e5f6g7h8i9j0`
- Used for OAuth authentication

### Client Secret

- Listed under **Basic Information > App Credentials**
- Click **Show** to reveal it
- Looks like: `abc123def456ghi789jkl012mno345pqr678`
- Used for OAuth authentication

### Signing Secret

- Listed under **Basic Information > App Credentials**
- Click **Show** to reveal it
- Used to verify that incoming webhook requests are genuinely from Monday.com

Copy all three values. You'll need them when deploying.

## Step 4: Get Your Personal API Token

The API token is separate from the app credentials. It's a personal token tied to your Monday.com user account.

1. Click your **profile avatar** in the bottom left of Monday.com
2. Go to **Administration** (you need admin access)
3. Navigate to **API** in the left sidebar
4. Copy your **Personal API Token**
5. If you don't see it, click **Generate** to create one

The token looks like: `eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjEyMz...`

**Important**: This token has the permissions of your user account. Keep it secret.

## Step 5: Configure OAuth (Optional)

If you want multi-workspace support via OAuth (instead of a single API token):

1. In your app settings, go to **OAuth**
2. Under **Redirect URLs**, add your deployed URL:
   ```
   https://your-app-url.example.com/auth/callback
   ```
3. Under **Scopes**, request:
   - `boards:read` -- Read board data and column values
   - `boards:write` -- Update column values (required for sync)

For single-workspace use, the Personal API Token is sufficient and OAuth is not required.

## Step 6: Set Your Webhook URL

After deploying the app (see deployment guides), configure Monday.com to send webhooks to your server.

The webhook URL is your deployed app URL + `/webhook`:

```
https://your-app.onrender.com/webhook
```

or for Cloudflare Workers:

```
https://monday-timeline-sync.your-subdomain.workers.dev/webhook
```

You don't need to configure this manually in the Developer Center -- the app creates webhooks programmatically via the `/webhook/subscribe` endpoint.

## Step 7: Configure a Board

Once deployed, use the API to configure which board columns to sync:

```bash
# 1. Find your board's column IDs
curl https://your-app-url/configure/YOUR_BOARD_ID/columns

# This returns something like:
# {
#   "dateColumns": [
#     {"id": "date0", "title": "Start Date", "type": "date"},
#     {"id": "date4", "title": "End Date", "type": "date"}
#   ],
#   "timelineColumns": [
#     {"id": "timeline", "title": "Timeline", "type": "timeline"}
#   ]
# }

# 2. Configure the sync with those column IDs
curl -X POST https://your-app-url/configure \
  -H "Content-Type: application/json" \
  -d '{
    "boardId": 1234567890,
    "startDateColumnId": "date0",
    "endDateColumnId": "date4",
    "timelineColumnId": "timeline",
    "apiToken": "your-monday-api-token"
  }'

# 3. Activate the webhook
curl -X POST https://your-app-url/webhook/subscribe \
  -H "Content-Type: application/json" \
  -d '{"boardId": 1234567890}'
```

## Required Permissions

The app needs these Monday.com permissions:

| Permission | Why |
|------------|-----|
| `boards:read` | Read column values when a webhook fires |
| `boards:write` | Update timeline or date columns with synced values |

These are automatically granted when using a Personal API Token. For OAuth, you must request them during the authorization flow.

## Troubleshooting

### "Invalid API token or board ID"

- Double-check your API token is correct and hasn't expired
- Verify the board ID is a number (find it in the board URL: `monday.com/boards/1234567890`)
- Make sure your account has access to the board

### "Column IDs not found on board"

- Use the `/configure/:boardId/columns` endpoint to see available columns
- Column IDs are internal identifiers (e.g., `date0`, `timeline`), not display names
- Make sure you're specifying columns that exist on the correct board

### Webhooks not firing

- Verify your app URL is publicly accessible (not `localhost`)
- Check that the webhook was created successfully via `/webhook/subscribe`
- Monday.com may take a few seconds to start sending events after webhook creation

---

[Back to README](../README.md)
