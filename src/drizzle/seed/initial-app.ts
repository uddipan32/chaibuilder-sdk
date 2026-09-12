import type { ChaiBuilderInstance } from "~/types/chaibuilder-config";
import { createApp } from "./create-app";

export async function seedInitialApp(cb: ChaiBuilderInstance): Promise<string | null> {
  const { appId, appName, subdomain } = await createApp(cb);

  console.log(
    `seedInitialApp: created app ${appId} "${appName}" (${subdomain}, CHAIBUILDER_APP_KEY=${appId})`,
  );
  return appId;
}
