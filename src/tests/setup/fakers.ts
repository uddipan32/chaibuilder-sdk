import { faker } from "@faker-js/faker";
import { readFileSync } from "fs";
import { nanoid } from "nanoid";
import { join } from "path";

const GLOBAL_APP_ID_FILE = join(process.cwd(), ".global-app-id");

function getGlobalAppId(): string {
  try {
    return readFileSync(GLOBAL_APP_ID_FILE, "utf-8");
  } catch (_error) {
    throw new Error("Global test app not initialized. Ensure globalSetup has run.");
  }
}

export const fake = {
  apps: (overrides = {}) => ({
    id: faker.string.uuid(),
    name: faker.company.name(),
    createdAt: new Date().toISOString(),
    settings: {},
    theme: {},
    fallbackLang: "en",
    languages: [],
    designTokens: {},
    ai: {},
    configData: {},
    consentConfig: {},
    ...overrides,
  }),

  appsOnline: (overrides = {}) => ({
    id: faker.string.uuid(),
    name: faker.company.name(),
    createdAt: new Date().toISOString(),
    settings: {},
    theme: {},
    fallbackLang: "en",
    languages: [],
    designTokens: {},
    ai: {},
    configData: {},
    consentConfig: {},
    ...overrides,
  }),

  appPages: (overrides = {}) => ({
    id: faker.string.uuid(),
    app: getGlobalAppId(),
    name: faker.lorem.words(3),
    slug: `/slug-${nanoid(8)}`,
    lang: "",
    pageType: "page",
    blocks: [],
    seo: {},
    jsonld: {},
    createdAt: new Date().toISOString(),
    dynamic: false,
    online: true,
    ...overrides,
  }),

  appRedirects: (overrides = {}) => ({
    id: faker.string.uuid(),
    app: getGlobalAppId(),
    fromPath: `/from-${nanoid(8)}`,
    toPath: `/to-${nanoid(8)}`,
    permanent: true,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  appPagesOnline: (overrides = {}) => ({
    id: faker.string.uuid(),
    app: getGlobalAppId(),
    name: faker.lorem.words(3),
    slug: `/slug-${nanoid(8)}`,
    lang: "",
    pageType: "page",
    blocks: [],
    seo: {},
    jsonld: {},
    createdAt: new Date().toISOString(),
    dynamic: false,
    online: true,
    ...overrides,
  }),

  appAssets: (overrides = {}) => ({
    id: faker.string.uuid(),
    name: faker.system.fileName(),
    url: faker.image.url(),
    type: "image",
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  appDomains: (overrides = {}) => ({
    id: faker.string.uuid(),
    subdomain: `${faker.word.noun()}-${nanoid(6)}`,
    createdAt: new Date().toISOString(),
    hosting: "vercel",
    hostingProjectId: "env",
    domainConfigured: false,
    ...overrides,
  }),

  appTrash: (overrides = {}) => ({
    id: faker.string.uuid(),
    entityType: "page",
    deletedAt: new Date().toISOString(),
    deletedBy: faker.string.uuid(),
    ...overrides,
  }),

  clients: (overrides = {}) => ({
    id: faker.string.uuid(),
    name: faker.company.name(),
    createdAt: new Date().toISOString(),
    status: "active",
    settings: {},
    features: {},
    paymentConfig: {},
    ai: { models: [] },
    plansAndAddOns: { plans: [], addOns: [], provider: "DODO", paymentEnv: "sandbox" },
    rolesAndPermissions: {
      admin: { permissions: { "*": true } },
      editor: { permissions: { "*": false } },
      designer: { permissions: { "*": false } },
    },
    coreFeatures: {
      ai: true,
      email: false,
      api_access: false,
      multi_user: false,
      export_code: true,
      import_html: true,
      multilingual: false,
      revision_and_restore: false,
    },
    envs: { payment: { live: { client: "", server: "" }, sandbox: { client: "", server: "" } } },
    ...overrides,
  }),

  appApiKeys: (overrides = {}) => ({
    id: faker.string.uuid(),
    apiKey: faker.string.uuid(),
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  libraries: (overrides = {}) => ({
    id: faker.string.uuid(),
    name: faker.lorem.words(2),
    type: "global",
    status: "active",
    createdAt: new Date().toISOString(),
    ...overrides,
  }),
} as const;
