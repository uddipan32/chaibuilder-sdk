import { resolveAppIdByHostname } from "../public/resolve-app-id-by-hostname";
import { initState, loadSiteSettings, setDraftMode } from "./init";

export const initByHostname = async (hostname: string, draftMode: boolean): Promise<{ id: string }> => {
  setDraftMode(draftMode);
  const appId = await resolveAppIdByHostname(hostname, { draft: draftMode });
  initState(appId, draftMode);
  await loadSiteSettings(draftMode);

  return { id: appId };
};
