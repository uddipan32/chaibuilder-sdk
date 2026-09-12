import type { ResolvedChaiBuilderServerConfig } from "~/types";
import { seedInitialApp } from "./initial-app";

export async function runSeed(config: ResolvedChaiBuilderServerConfig): Promise<void> {
  const { getChaiBuilder } = await import("~/nextjs/server");
  const { resetDbForTests } = await import("~/db/core");

  const cb = await getChaiBuilder(config);

  try {
    await seedInitialApp(cb);
  } finally {
    resetDbForTests();
  }
}
