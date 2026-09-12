import { faker } from "@faker-js/faker";
import { randomUUID } from "node:crypto";
import type { ChaiBuilderInstance } from "~/types/chaibuilder-config";
import { DEFAULT_APP_THEME, DEFAULT_HOME_BLOCKS, getDefaultHomeSeo } from "./defaults";
import { buildUniqueSubdomain } from "./subdomain";

export type CreateAppOptions = {
  userId?: string;
  appName?: string;
};

export async function createApp(
  cb: ChaiBuilderInstance,
  { userId = "TBD-USER-ID", appName = faker.internet.domainWord() }: CreateAppOptions = {},
): Promise<{ appId: string; appName: string; subdomain: string }> {
  const { db, schema } = cb;
  const fallbackLang = "en";
  const appId = randomUUID();
  const subdomain = await buildUniqueSubdomain(cb, appName);
  const homeSeo = getDefaultHomeSeo(appName);

  await db.insert(schema.apps).values({
    id: appId,
    name: appName,
    user: userId,
    theme: DEFAULT_APP_THEME,
    fallbackLang,
  });

  await db.insert(schema.appsOnline).values({
    id: appId,
    name: appName,
    user: userId,
    theme: DEFAULT_APP_THEME,
    fallbackLang,
    apiKey: appId,
  });

  await db.insert(schema.appDomains).values({
    app: appId,
    subdomain,
    hosting: "vercel",
    hostingProjectId: "env",
    domainConfigured: false,
  });

  await db.insert(schema.libraries).values({
    name: appName,
    app: appId,
    type: "default",
  });

  await db.insert(schema.appUsers).values({
    user: userId,
    app: appId,
    role: "admin",
  });

  const [page] = await db
    .insert(schema.appPages)
    .values({
      app: appId,
      slug: "/",
      name: "Home",
      pageType: "page",
      seo: homeSeo,
      blocks: [...DEFAULT_HOME_BLOCKS],
    })
    .returning({ id: schema.appPages.id });

  if (!page) {
    throw new Error("createApp: failed to create home page");
  }

  await db.insert(schema.appPagesOnline).values({
    id: page.id,
    app: appId,
    slug: "/",
    name: "Home",
    pageType: "page",
    seo: homeSeo,
    blocks: [...DEFAULT_HOME_BLOCKS],
  });

  return { appId, appName, subdomain };
}
