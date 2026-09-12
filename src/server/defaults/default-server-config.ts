import * as coreSchema from "~/drizzle/schema.sqlite";
import type { ChaiDbSetup } from "~/db/core";
import { BUILTIN_CHAI_ACTIONS } from "./builtin-chai-actions";
import { BUILTIN_PAGE_TYPES } from "./builtin-page-types";
import { DEFAULT_AI_CONFIG } from "./default-ai-config";
import { defaultGlobalDataProvider } from "./default-global-data";
import type { ResolvedChaiBuilderServerConfig } from "./types";

const DEFAULT_SDK_DB_PLACEHOLDER: ChaiDbSetup = {
  drizzle: null as unknown as ChaiDbSetup["drizzle"],
  schema: coreSchema,
};

export const DEFAULT_CHAI_BUILDER_SERVER_CONFIG: ResolvedChaiBuilderServerConfig = {
  debugLevel: 0,
  globalDataProvider: defaultGlobalDataProvider,
  onPageNotFound: null,
  resolveDynamicTemplateTie: null,
  pageTypes: BUILTIN_PAGE_TYPES,
  collections: [],
  chaiCollections: [],
  /** @deprecated mirror of `chaiCollections`. */
  repeaterData: [],
  blockDataProviders: {},
  trash: [],
  features: {
    trash: true,
    ai: true,
    copyPaste: true,
    darkMode: false,
    dataBinding: true,
    importHtml: true,
    importTheme: true,
    gotoSettings: false,
    dragAndDrop: true,
    validateStructure: true,
    designTokens: true,
    resetSeoToDefault: false,
    pagesManager: true,
  },
  actions: BUILTIN_CHAI_ACTIONS,
  builderActions: BUILTIN_CHAI_ACTIONS,
  defaultRoleGrants: {},
  roles: undefined,
  ai: DEFAULT_AI_CONFIG,
  // Empty by design: every tab in the media manager is contributed by a plugin,
  // which seeds its own key when registered.
  mediaManager: {},
  db: DEFAULT_SDK_DB_PLACEHOLDER,
  schemaFragments: [],
  requestMiddlewares: [],
  setupHooks: [],
  contextResolver: undefined,
  transformSiteSettings: undefined,
};
