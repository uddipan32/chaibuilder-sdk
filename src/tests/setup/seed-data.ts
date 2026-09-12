import { randomUUID } from "crypto";
import { nanoid } from "nanoid";
import { schema, type TestDb } from "./test-db";

export interface TestApp {
  id: string;
  name: string;
}

export interface TestPage {
  id: string;
  app: string;
  name: string;
  slug: string;
  lang: string;
  pageType: string;
}

export interface TestAsset {
  id: string;
  app: string;
  name: string;
  url: string;
  type: string;
}

export async function createTestApp(db: TestDb, data?: Partial<TestApp>): Promise<TestApp> {
  const appData = {
    id: data?.id || randomUUID(),
    name: data?.name || "Test App",
    createdAt: new Date().toISOString(),
  };

  await db.insert(schema.apps).values(appData);

  return {
    id: appData.id,
    name: appData.name,
  };
}

export async function createTestPage(db: TestDb, appId: string, data?: Partial<TestPage>): Promise<TestPage> {
  const pageData = {
    id: data?.id || randomUUID(),
    app: appId,
    name: data?.name || "Test Page",
    slug: data?.slug || `test-page-${nanoid()}`,
    lang: data?.lang || "en",
    pageType: data?.pageType || "default",
    blocks: [],
    seo: {},
    jsonld: {},
    createdAt: new Date().toISOString(),
  };

  await db.insert(schema.appPages).values(pageData);

  return {
    id: pageData.id,
    app: pageData.app,
    name: pageData.name,
    slug: pageData.slug,
    lang: pageData.lang,
    pageType: pageData.pageType,
  };
}

export async function createTestAsset(db: TestDb, appId: string, data?: Partial<TestAsset>): Promise<TestAsset> {
  const assetData = {
    id: data?.id || randomUUID(),
    app: appId,
    name: data?.name || "Test Asset",
    url: data?.url || `https://example.com/asset-${nanoid()}.jpg`,
    type: data?.type || "image",
    createdAt: new Date().toISOString(),
  };

  await db.insert(schema.appAssets).values(assetData);

  return {
    id: assetData.id,
    app: assetData.app,
    name: assetData.name,
    url: assetData.url,
    type: assetData.type,
  };
}
