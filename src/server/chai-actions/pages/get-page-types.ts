import { z } from "zod";
import { getConfigPageTypes, serializePageTypesForClient, type SerializedPageType } from "~/server/defaults";
import { ChaiBaseAction } from "../base-action";

type GetPageTypesActionData = Record<string, never>;

type GetPageTypesActionResponse = SerializedPageType[];

/**
 * Get Page Types Action
 * Returns all registered page types with their configuration
 */
export class GetPageTypesAction extends ChaiBaseAction<GetPageTypesActionData, GetPageTypesActionResponse> {
  protected getValidationSchema() {
    return z.object({});
  }

  async execute(): Promise<GetPageTypesActionResponse> {
    try {
      return serializePageTypesForClient(getConfigPageTypes());
    } catch (error) {
      return this.handleError(error);
    }
  }
}
