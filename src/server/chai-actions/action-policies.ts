export type ChaiActionAuthPolicy = "public" | "authenticated";

/** Explicit public registry actions. All other actions default to authenticated. */
const PUBLIC_ACTIONS = new Set<string>([]);

export function getActionAuthPolicy(name: string): ChaiActionAuthPolicy {
  return PUBLIC_ACTIONS.has(name) ? "public" : "authenticated";
}
