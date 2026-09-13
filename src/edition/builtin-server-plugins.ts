import type { ChaiServerPlugin } from "~/types/plugin";
import type { ChaiEditionServerPlugins } from "~/types/edition";

// Edition-owned (never synced). The open-source edition has no always-on server plugins;
// hosts name every plugin they want in buildChaiBuilderConfig({ plugins }).
export const editionServerPlugins = (): ChaiServerPlugin[] => [];

({ editionServerPlugins }) satisfies ChaiEditionServerPlugins;
