import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import { readFileSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { fake } from "./fakers";
import { schema, type TestDb } from "./test-db";

const GLOBAL_APP_ID_FILE = join(process.cwd(), ".global-app-id");

export async function insertGlobalApp(db: TestDb): Promise<{ id: string }> {
  const appId = faker.string.uuid();
  const appData = fake.apps({ id: appId, name: "Global Test App" });

  await db.insert(schema.apps).values(appData);
  await db.insert(schema.appsOnline).values({
    id: appId,
    name: appData.name,
    createdAt: appData.createdAt,
    settings: appData.settings,
    theme: appData.theme,
    fallbackLang: appData.fallbackLang,
    languages: appData.languages,
    designTokens: appData.designTokens,
  });

  writeFileSync(GLOBAL_APP_ID_FILE, appId);
  return { id: appId };
}

export async function deleteGlobalApp(db: TestDb, appId: string): Promise<void> {
  await db.delete(schema.appsOnline).where(eq(schema.appsOnline.id, appId));
  await db.delete(schema.apps).where(eq(schema.apps.id, appId));
  try {
    unlinkSync(GLOBAL_APP_ID_FILE);
  } catch (_error) {
    // Ignore if file doesn't exist
  }
}

export function getGlobalAppId(): string {
  try {
    return readFileSync(GLOBAL_APP_ID_FILE, "utf-8");
  } catch (_error) {
    throw new Error("Global test app not initialized. Ensure globalSetup has run.");
  }
}
