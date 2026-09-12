import type { ChaiClientPlugin } from "~/builder/register-apis/register-chai-plugin";
import type { ChaiEditionClientPlugins } from "~/types/edition";

// Edition-owned (never synced). The open-source edition has no always-on client plugins;
// hosts pass the ones they want through the builder's `plugins` prop.
export const editionClientPlugins: ChaiClientPlugin[] = [];

({ editionClientPlugins }) satisfies ChaiEditionClientPlugins;
