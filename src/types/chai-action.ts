export type ChaiUserAccess = {
  role: string;
  permissions: string[] | null;
};

/**
 * Action Context
 * Contains information and repositories needed by actions
 */
export interface ChaiActionContext {
  appId: string;
  userId?: string;
  /**
   * Effective access for this request, set by `dispatchChaiAction` on authenticated actions:
   * host-supplied context permissions or the resolved `app_users` membership, already clamped
   * by {@link delegatedPermissions}. Actions that resolve access themselves should return this
   * when present rather than looking it up again.
   */
  userAccess?: ChaiUserAccess;
  /**
   * Delegation ceiling for the credential making this request (OAuth app, MCP token).
   * Already applied to {@link userAccess}; exposed for actions that need to reason about it.
   * Absent/null on normal browser requests (full user permissions apply).
   */
  delegatedPermissions?: string[] | null;
  /** @deprecated Renamed to {@link delegatedPermissions}; kept populated with the same value. */
  delegatedScopes?: string[] | null;
  /** Registry action key, when set by the dispatcher. */
  action?: string;
}

/**
 * Resolves the permission required to run an action.
 * Either a static permission key (`entity:operation`) or a function that derives
 * it from the action data/context (e.g. page-type-level permissions).
 * Return `null`/`undefined` to require no specific permission (authenticated-only).
 */
export type ChaiRequiredPermission<T = any> =
  | string
  | ((data: T, context: ChaiActionContext) => string | null | undefined);

/**
 * ChaiAction Interface
 * Defines the contract for all action handlers
 */
export interface ChaiAction<T = any, K = any> {
  /**
   * Permission required to run this action. Enforced by `dispatchChaiAction`.
   * Undeclared (undefined) = authenticated-only (no specific permission).
   */
  requiredPermission?: ChaiRequiredPermission<T>;
  validate(data: T): boolean;
  setContext(context: ChaiActionContext): void;
  execute(data: T): Promise<K>;
  run(data: T): Promise<K>;
}
