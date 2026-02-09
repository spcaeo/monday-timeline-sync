import type {
  MondayColumnValue,
  MondayItemResponse,
  MondayBoardColumnsResponse,
} from "../types.js";
import { logger } from "../utils/logger.js";

interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export class MondayApiClient {
  private readonly apiUrl = "https://api.monday.com/v2";

  constructor(private apiToken: string) {}

  private async graphql<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const body: Record<string, unknown> = { query };
    if (variables) body.variables = variables;

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.apiToken,
        "API-Version": "2024-10",
      },
      body: JSON.stringify(body),
    });

    const result = (await response.json()) as GraphQLResponse<T>;

    if (result.errors && result.errors.length > 0) {
      const message = result.errors.map((e) => e.message).join(", ");
      logger.error("Monday API error:", message);
      throw new Error(`Monday API error: ${message}`);
    }

    return result.data as T;
  }

  async getItemColumnValues(itemId: number, columnIds: string[]): Promise<MondayColumnValue[]> {
    const idsString = columnIds.map((id) => `"${id}"`).join(",");
    const query = `{ items(ids: [${itemId}]) { column_values(ids: [${idsString}]) { id type value text } } }`;

    const data = await this.graphql<MondayItemResponse>(query);
    return data.items?.[0]?.column_values ?? [];
  }

  async updateColumnValue(
    boardId: number,
    itemId: number,
    columnId: string,
    value: string
  ): Promise<void> {
    const query = `mutation { change_column_value(board_id: ${boardId}, item_id: ${itemId}, column_id: "${columnId}", value: ${JSON.stringify(value)}) { id } }`;
    await this.graphql(query);
  }

  async updateMultipleColumns(
    boardId: number,
    itemId: number,
    columnValues: Record<string, unknown>
  ): Promise<void> {
    const query = `mutation { change_multiple_column_values(item_id: ${itemId}, board_id: ${boardId}, column_values: ${JSON.stringify(JSON.stringify(columnValues))}) { id } }`;
    await this.graphql(query);
  }

  async getBoardColumns(boardId: number) {
    const query = `{ boards(ids: [${boardId}]) { columns { id title type } } }`;
    const data = await this.graphql<MondayBoardColumnsResponse>(query);
    return data.boards?.[0]?.columns ?? [];
  }

  async createWebhook(
    boardId: number,
    url: string,
    event: string,
    config?: Record<string, string>,
    columnId?: string
  ): Promise<number> {
    const configStr = JSON.stringify(JSON.stringify(config || {}));
    const columnArg = columnId ? `, column_id: "${columnId}"` : "";
    const query = `mutation { create_webhook(board_id: ${boardId}, url: "${url}", event: ${event}, config: ${configStr}${columnArg}) { id } }`;
    const data = await this.graphql<{ create_webhook: { id: number } }>(query);
    return data.create_webhook.id;
  }

  async deleteWebhook(webhookId: number): Promise<void> {
    const query = `mutation { delete_webhook(id: ${webhookId}) { id } }`;
    await this.graphql(query);
  }
}
