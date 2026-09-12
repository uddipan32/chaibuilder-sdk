import { getInitializedState, getInitializedStateWithUser } from "~/server/chai-builder/state";
import { getPermissionCatalog } from "~/server/rbac/permission-catalog";
import { hasPermission, intersectPermissions } from "~/server/rbac/permissions";
import { ActionError } from "./action-error";
import { getActionAuthPolicy } from "./action-policies";
import { type ChaiActionResult, toActionError, toActionErrorPayload } from "./action-result";
import { getChaiAction } from "./actions-registery";
import type { ChaiAction, ChaiActionContext, ChaiUserAccess } from "./chai-action-interface";

/** Concrete (non-wildcard) permission keys — the only ones an intersection can match on. */
function concreteKeys(list: string[]): string[] {
  return list.filter((key) => key !== "*" && !key.endsWith(":*"));
}

/**
 * `intersectPermissions` expands wildcards against a catalog, so anything outside that catalog
 * (host-defined keys) would silently vanish from `["*"] ∩ [...]`. Base is the runtime catalog
 * (built-ins + plugin-registered keys), widened further with the concrete keys named by
 * either side so host keys never registered anywhere stay intersectable.
 */
function delegationCatalog(granted: string[], delegated: string[]): string[] {
  return [...new Set([...getPermissionCatalog(), ...concreteKeys(granted), ...concreteKeys(delegated)])];
}

/**
 * Applies the delegation ceiling: a credential can never exceed the permissions delegated to it,
 * however permissive the user behind it is. No ceiling set (`null`) means no clamp.
 */
function clampToDelegated(userAccess: ChaiUserAccess, delegated: string[] | null): ChaiUserAccess {
  if (delegated === null) return userAccess;
  const granted = userAccess.permissions ?? [];
  return {
    ...userAccess,
    permissions: intersectPermissions(granted, delegated, delegationCatalog(granted, delegated)),
  };
}

/** Resolves the static or function-form `requiredPermission` for an action. */
function resolveRequiredPermission(
  action: ChaiAction<any, any>,
  data: unknown,
  context: ChaiActionContext,
): string | null {
  const required = action.requiredPermission;
  if (!required) return null;
  if (typeof required === "function") {
    return required(data, context) ?? null;
  }
  return required;
}

/** Throws 403 when the action declares a permission the user (effectively) lacks. */
function enforcePermission(action: ChaiAction<any, any>, data: unknown, context: ChaiActionContext): void {
  const required = resolveRequiredPermission(action, data, context);
  if (!required) return;
  const granted = context.userAccess?.permissions ?? null;
  if (!hasPermission(granted, required)) {
    throw new ActionError(`Missing permission: ${required}`, "FORBIDDEN", 403);
  }
}

export async function dispatchChaiAction(name: string, data: unknown): Promise<unknown> {
  try {
    const action = getChaiAction(name);
    if (!action) {
      throw new ActionError(`Action ${name} not found`, "ACTION_NOT_FOUND", 404);
    }

    const policy = getActionAuthPolicy(name);
    let context: ChaiActionContext;

    if (policy === "authenticated") {
      const state = getInitializedStateWithUser();
      const delegatedPermissions = state.delegatedPermissions ?? null;

      // The context resolver is the single authority on what a user may do. No permissions on
      // it means it did not recognise this user as a member of this app — there is nobody left
      // to ask, so the request is unauthorized.
      if (state.permissions === null) {
        throw new ActionError("User does not have access to this app", "UNAUTHORIZED", 401);
      }

      const userAccess = clampToDelegated(
        { role: state.role ?? "custom", permissions: state.permissions },
        delegatedPermissions,
      );
      context = {
        appId: state.appId,
        userId: state.userId,
        action: name,
        delegatedPermissions,
        delegatedScopes: delegatedPermissions,
        userAccess,
      };
    } else {
      const state = getInitializedState();
      context = {
        appId: state.appId as string,
        action: name,
      };
    }

    action.setContext(context);
    enforcePermission(action, data, context);
    return await action.run(data);
  } catch (error) {
    console.error(`[dispatchChaiAction] Error executing action "${name}":`, error);
    throw toActionError(error);
  }
}

export async function tryChaiAction<T>(name: string, data: unknown): Promise<ChaiActionResult<T>> {
  try {
    const result = await dispatchChaiAction(name, data);
    return { ok: true, data: result as T };
  } catch (error) {
    return { ok: false, error: toActionErrorPayload(error) };
  }
}
