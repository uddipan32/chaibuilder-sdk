import { eq } from "drizzle-orm";
import { schema, type TestDb } from "../setup/test-db";

export async function assertPageExists(db: TestDb, pageId: string): Promise<void> {
  const pages = await db.query.appPages.findMany({
    where: eq(schema.appPages.id, pageId),
  });

  if (pages.length === 0) {
    throw new Error(`Expected page with id ${pageId} to exist, but it was not found`);
  }
}

export async function assertPageNotExists(db: TestDb, pageId: string): Promise<void> {
  const pages = await db.query.appPages.findMany({
    where: eq(schema.appPages.id, pageId),
  });

  if (pages.length > 0) {
    throw new Error(`Expected page with id ${pageId} to not exist, but it was found`);
  }
}

export async function assertAssetExists(db: TestDb, assetId: string): Promise<void> {
  const assets = await db.query.appAssets.findMany({
    where: eq(schema.appAssets.id, assetId),
  });

  if (assets.length === 0) {
    throw new Error(`Expected asset with id ${assetId} to exist, but it was not found`);
  }
}

export async function assertAssetNotExists(db: TestDb, assetId: string): Promise<void> {
  const assets = await db.query.appAssets.findMany({
    where: eq(schema.appAssets.id, assetId),
  });

  if (assets.length > 0) {
    throw new Error(`Expected asset with id ${assetId} to not exist, but it was found`);
  }
}

export async function getPageById(db: TestDb, pageId: string) {
  const pages = await db.query.appPages.findMany({
    where: eq(schema.appPages.id, pageId),
  });

  return pages[0] || null;
}

export async function getAssetById(db: TestDb, assetId: string) {
  const assets = await db.query.appAssets.findMany({
    where: eq(schema.appAssets.id, assetId),
  });

  return assets[0] || null;
}
