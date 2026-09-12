import { eq } from "drizzle-orm";
import { db, safeQuery, schema } from "~/server/chai-actions/db";
import { withPersistentCache } from "./cache-utils";

// Stable function reference for caching - defined once at module level
async function fetchClientSettings(clientId: string): Promise<any> {
  const { data: clients, error } = await safeQuery(() =>
    db.select().from(schema.clients).where(eq(schema.clients.id, clientId)).limit(1),
  );
  const data = clients?.[0];
  if (error || !data) throw error || new Error("Client not found");

  const getPlansAndAddOns = () => {
    const plansAndAddOns = data?.plansAndAddOns as any;
    const paymentEnv = plansAndAddOns?.paymentEnv || "sandbox";
    const paymentData = data as any; // Cast to any to access envs
    const plans =
      paymentEnv === "sandbox"
        ? (plansAndAddOns?.plans || []).map((plan: any) => ({
            ...plan,
            items: (plan?.items || []).map((item: any) => ({ ...item, id: item?.sandboxId })),
          }))
        : plansAndAddOns?.plans;
    return {
      ...(plansAndAddOns || {}),
      plans,
      paymentEnv,
      sandboxToken: paymentData?.envs?.payment?.sandbox?.client || "",
    };
  };

  return {
    id: data.id,
    ...((data?.settings as any) || {}),
    name: (data?.settings as any)?.name || "Your Builder",
    logo: (data?.settings as any)?.logo || "https://placehold.co/52x52",
    favicon: (data?.settings as any)?.favicon || "https://placehold.co/52x52",
    feedbackSubmissions: (data?.settings as any)?.feedbackSubmissions || "",
    loginProviders: (data?.settings as any)?.loginProviders || [],
    defaultSiteLang: (data?.settings as any)?.defaultSiteLang || "en",
    theme: (data?.settings as any)?.theme || "",
    senderEmail: (data?.settings as any)?.senderEmail || "",

    coreFeatures: (data?.coreFeatures as any) || {},
    plansAndAddOns: getPlansAndAddOns(),
    rolesAndPermissions: (data?.rolesAndPermissions as any) || {},
    ai: (data?.ai as any) || { models: [] },

    loginHtml: data.loginHtml as string,
    helpHtml: (data?.helpHtml as string) || null,
    superAdmins: (data?.superAdmins as string[]) || [],
    madeWithBadge: data?.madeWithBadge || null,
  };
}

export const getClientSettings = async (clientId: string): Promise<any> => {
  return await withPersistentCache(
    fetchClientSettings,
    [`client-settings-${clientId}`],
    [`client-settings`, `settings-${clientId}`],
  )(clientId);
};
