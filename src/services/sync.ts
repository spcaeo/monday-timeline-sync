import type { MondayEvent, BoardSyncConfig, StorageAdapter, TimelineValue } from "../types.js";
import type { MondayApiClient } from "./monday.js";
import { logger } from "../utils/logger.js";

interface SyncResult {
  synced: boolean;
  action?: string;
  error?: string;
}

export class TimelineSyncService {
  constructor(
    private monday: MondayApiClient,
    private storage: StorageAdapter
  ) {}

  async handleColumnChange(event: MondayEvent, config: BoardSyncConfig): Promise<SyncResult> {
    const { columnId } = event;
    const { startDateColumnId, endDateColumnId, timelineColumnId, syncMode } = config;

    // Check if the changed column is one we care about
    if (
      columnId !== startDateColumnId &&
      columnId !== endDateColumnId &&
      columnId !== timelineColumnId
    ) {
      return { synced: false, action: "ignored" };
    }

    // Debounce check
    if (await this.isDebounced(event.boardId, event.pulseId)) {
      return { synced: false, action: "debounced" };
    }

    // Set debounce
    await this.setDebounce(event.boardId, event.pulseId);

    try {
      // Date columns changed -> sync to timeline
      if (
        (columnId === startDateColumnId || columnId === endDateColumnId) &&
        (syncMode === "dates_to_timeline" || syncMode === "bidirectional")
      ) {
        return await this.syncDatesToTimeline(event.boardId, event.pulseId, config);
      }

      // Timeline column changed -> sync to dates
      if (
        columnId === timelineColumnId &&
        (syncMode === "timeline_to_dates" || syncMode === "bidirectional")
      ) {
        return await this.syncTimelineToDates(event.boardId, event.pulseId, config);
      }

      return { synced: false, action: "ignored" };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Sync error:", message);
      return { synced: false, error: message };
    }
  }

  private async syncDatesToTimeline(
    boardId: number,
    itemId: number,
    config: BoardSyncConfig
  ): Promise<SyncResult> {
    const columns = await this.monday.getItemColumnValues(itemId, [
      config.startDateColumnId,
      config.endDateColumnId,
    ]);

    const startCol = columns.find((c) => c.id === config.startDateColumnId);
    const endCol = columns.find((c) => c.id === config.endDateColumnId);

    const startDate = this.parseDateValue(startCol?.value ?? null);
    const endDate = this.parseDateValue(endCol?.value ?? null);

    if (!startDate || !endDate) {
      return { synced: false, action: "missing_dates" };
    }

    // Check existing timeline to prevent update loops
    const timelineCols = await this.monday.getItemColumnValues(itemId, [config.timelineColumnId]);
    const existingTimeline = this.parseTimelineValue(
      timelineCols.find((c) => c.id === config.timelineColumnId)?.value ?? null
    );
    if (existingTimeline && existingTimeline.from === startDate && existingTimeline.to === endDate) {
      return { synced: false, action: "already_in_sync" };
    }

    const timelineJson = JSON.stringify({ from: startDate, to: endDate });
    await this.monday.updateColumnValue(boardId, itemId, config.timelineColumnId, timelineJson);

    logger.info(`Synced dates -> timeline for item ${itemId}: ${startDate} to ${endDate}`);
    return { synced: true, action: "dates_to_timeline" };
  }

  private async syncTimelineToDates(
    boardId: number,
    itemId: number,
    config: BoardSyncConfig
  ): Promise<SyncResult> {
    const columns = await this.monday.getItemColumnValues(itemId, [config.timelineColumnId]);

    const timelineCol = columns.find((c) => c.id === config.timelineColumnId);
    const timeline = this.parseTimelineValue(timelineCol?.value ?? null);

    if (!timeline) {
      return { synced: false, action: "missing_timeline" };
    }

    // Check existing dates to prevent update loops
    const dateCols = await this.monday.getItemColumnValues(itemId, [
      config.startDateColumnId,
      config.endDateColumnId,
    ]);
    const existingStart = this.parseDateValue(
      dateCols.find((c) => c.id === config.startDateColumnId)?.value ?? null
    );
    const existingEnd = this.parseDateValue(
      dateCols.find((c) => c.id === config.endDateColumnId)?.value ?? null
    );
    if (existingStart === timeline.from && existingEnd === timeline.to) {
      return { synced: false, action: "already_in_sync" };
    }

    await this.monday.updateMultipleColumns(boardId, itemId, {
      [config.startDateColumnId]: { date: timeline.from },
      [config.endDateColumnId]: { date: timeline.to },
    });

    logger.info(
      `Synced timeline -> dates for item ${itemId}: ${timeline.from} to ${timeline.to}`
    );
    return { synced: true, action: "timeline_to_dates" };
  }

  private async isDebounced(boardId: number, itemId: number): Promise<boolean> {
    const debounceKey = `debounce:${boardId}:${itemId}`;
    return (await this.storage.get(debounceKey)) !== null;
  }

  private async setDebounce(boardId: number, itemId: number): Promise<void> {
    const debounceKey = `debounce:${boardId}:${itemId}`;
    await this.storage.put(debounceKey, "1", { expirationTtl: 5 });
  }

  private parseDateValue(value: string | null): string | null {
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      return parsed.date ?? null;
    } catch {
      return null;
    }
  }

  private parseTimelineValue(value: string | null): TimelineValue | null {
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      if (parsed.from && parsed.to) {
        return { from: parsed.from, to: parsed.to };
      }
      return null;
    } catch {
      return null;
    }
  }
}
