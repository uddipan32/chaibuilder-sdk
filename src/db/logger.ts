import type { Logger } from "drizzle-orm/logger";
import { logDbVerbose } from "~/server/debug/debug-log";

export const chaiDrizzleLogger: Logger = {
  logQuery(query: string, params: unknown[]) {
    logDbVerbose(query, params);
  },
};
