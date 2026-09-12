import { runInContext } from "~/server/chai-builder/state";
import { dispatchChaiAction } from "./dispatch-action";

export const initChaiActionHandler = (params: { apiKey: string; userId: string }) => {
  return async (actionData: { action: string; data?: unknown }) => {
    const { apiKey, userId } = params;
    const { action, data } = actionData;

    return runInContext({ appId: apiKey, userId }, () => dispatchChaiAction(action, data));
  };
};

/** @deprecated Use `initChaiActionHandler` instead */
export const initChaiBuilderActionHandler = initChaiActionHandler;
