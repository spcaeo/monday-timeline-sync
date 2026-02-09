import type { StorageAdapter } from "../types.js";

interface MemoryEntry {
  value: string;
  expiresAt?: number;
}

export class MemoryStorage implements StorageAdapter {
  private store = new Map<string, MemoryEntry>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
    const entry: MemoryEntry = { value };
    if (options?.expirationTtl) {
      entry.expiresAt = Date.now() + options.expirationTtl * 1000;
    }
    this.store.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}
