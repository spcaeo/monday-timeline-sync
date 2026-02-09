export interface Env {
  KV: KVNamespace;
  MONDAY_CLIENT_ID: string;
  MONDAY_CLIENT_SECRET: string;
  MONDAY_SIGNING_SECRET: string;
  MONDAY_API_TOKEN: string;
  APP_URL: string;
  SYNC_MODE: "dates_to_timeline" | "timeline_to_dates" | "bidirectional";
}

export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface AppContext {
  storage: StorageAdapter;
  env: {
    MONDAY_CLIENT_ID: string;
    MONDAY_CLIENT_SECRET: string;
    MONDAY_SIGNING_SECRET: string;
    MONDAY_API_TOKEN: string;
    APP_URL: string;
    SYNC_MODE: string;
  };
}

export interface MondayWebhookPayload {
  challenge?: string;
  event?: MondayEvent;
  payload?: MondayIntegrationPayload;
}

export interface MondayIntegrationPayload {
  inputFields: {
    boardId: number;
    startDateColumnId: string;
    endDateColumnId: string;
    timelineColumnId: string;
  };
  webhookUrl: string;
  subscriptionId: number;
}

export interface OAuthToken {
  accessToken: string;
  accountId: number;
  userId: number;
  scope: string;
  installedAt: string;
}

export interface MondayColumnValue {
  id: string;
  type: string;
  value: string | null;
  text: string;
}

export interface MondayItemResponse {
  items: Array<{
    column_values: MondayColumnValue[];
  }>;
}

export interface MondayBoardColumnsResponse {
  boards: Array<{
    columns: Array<{
      id: string;
      title: string;
      type: string;
    }>;
  }>;
}

export interface MondayEvent {
  userId: number;
  boardId: number;
  pulseId: number;
  pulseName: string;
  columnId: string;
  columnType: string;
  value: string;
  previousValue: string;
  changedAt: number;
  triggerUuid: string;
}

export interface BoardSyncConfig {
  boardId: number;
  startDateColumnId: string;
  endDateColumnId: string;
  timelineColumnId: string;
  syncMode: string;
  apiToken: string;
  installedAt: string;
}

export interface TimelineValue {
  from: string;
  to: string;
}

export interface DateValue {
  date: string;
  time?: string;
}
