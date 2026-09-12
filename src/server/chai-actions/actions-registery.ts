import { get } from "lodash-es";
import { getConfigAction } from "~/server/defaults/config-registry";
import type { ChaiAction } from "./chai-action-interface";

/**
 * Legacy runtime overrides for Chai actions.
 * Prefer `buildChaiBuilderConfig({ db, actions: { ... } })` (with required `db`) for overrides.
 */
class ChaiActionsRegistry {
  private static instance: ChaiActionsRegistry;
  private actions: Record<string, ChaiAction<any, any>> = {};

  private constructor() {}

  public static getInstance(): ChaiActionsRegistry {
    if (!ChaiActionsRegistry.instance) {
      ChaiActionsRegistry.instance = new ChaiActionsRegistry();
    }
    return ChaiActionsRegistry.instance;
  }

  public register(actionName: string, handler: ChaiAction<any, any>): void {
    this.actions[actionName] = handler;
  }

  public registerActions(actions: Record<string, ChaiAction<any, any>>): void {
    for (const [actionName, handler] of Object.entries(actions)) {
      this.register(actionName, handler);
    }
  }

  public getAction(actionName: string): ChaiAction<any, any> | undefined {
    return get(this.actions, actionName);
  }

  public getAllActions(): Record<string, ChaiAction<any, any>> {
    return this.actions;
  }
}

export { ChaiActionsRegistry };

const chaiActionsRegistry = ChaiActionsRegistry.getInstance();

/** @deprecated Use the default export / `ChaiActionsRegistry.getInstance()` instead */
export const BuilderActionsRegistry = chaiActionsRegistry;

export const getChaiAction = (action: string): ChaiAction<any, any> | undefined => {
  const legacyOverride = chaiActionsRegistry.getAction(action);
  if (legacyOverride) {
    return legacyOverride;
  }

  const fromConfig = getConfigAction(action);
  if (!fromConfig) {
    return undefined;
  }

  return fromConfig;
};

export default chaiActionsRegistry;
