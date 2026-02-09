export const logger = {
  info: (...args: unknown[]) => console.log("[monday-sync]", ...args),
  error: (...args: unknown[]) => console.error("[monday-sync]", ...args),
  warn: (...args: unknown[]) => console.warn("[monday-sync]", ...args),
};
