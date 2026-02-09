# Contributing to Monday Timeline Sync

Thank you for your interest in contributing! This guide will help you get started.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/monday-timeline-sync.git
   cd monday-timeline-sync
   npm install
   ```
3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   # Fill in your Monday.com credentials
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```

## Development Workflow

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Test locally with `npm run dev`
4. Build to check for TypeScript errors: `npm run build`
5. Commit and push
6. Open a Pull Request

## Project Structure

- `src/app.ts` — Hono app factory, middleware, route mounting
- `src/worker.ts` — Cloudflare Workers entry point
- `src/server.ts` — Node.js entry point
- `src/routes/` — HTTP route handlers
- `src/services/monday.ts` — Monday.com GraphQL API client
- `src/services/sync.ts` — Core sync logic and debounce
- `src/storage/` — Storage adapters (Cloudflare KV, in-memory)
- `src/types.ts` — TypeScript interfaces

## Ideas for Contributions

- **Subitem support** — sync subitem date/timeline columns
- **Persistent storage for Node.js** — SQLite or file-based storage adapter
- **Dashboard widget** — Monday.com board view for configuring sync
- **Batch sync** — bulk-sync all items when first configuring a board
- **Status column mapping** — sync status changes based on timeline dates
- **Multiple timeline columns** — support syncing to more than one timeline per board
- **Webhook signature verification** — validate Monday.com JWT signatures

## Code Style

- TypeScript strict mode
- ESM imports with `.js` extensions
- Hono framework for HTTP routes
- No unnecessary dependencies

## Questions?

Open an issue on GitHub or reach out to [hello@growsherpa.ca](mailto:hello@growsherpa.ca).
