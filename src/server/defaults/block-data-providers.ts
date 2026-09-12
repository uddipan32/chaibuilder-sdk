import { isFunction } from "lodash-es";
import { applyBlockDataProviderToRegistry, getRegisteredChaiBlock } from "~/registry/v2/runtime/core";
import { getConfigBlockDataProvider, getConfigBlockDataProviders } from "~/server/defaults/config-registry";
import type { ChaiBlockDataProvider } from "~/types/chaibuilder-config";

export function applyBlockDataProvider(type: string, dataProvider: ChaiBlockDataProvider): void {
  applyBlockDataProviderToRegistry(type, dataProvider);
}

/** Sync config block data providers into REGISTERED_CHAI_BLOCKS. */
export function syncBlockDataProvidersToRegistry(
  blockDataProviders: Record<string, ChaiBlockDataProvider> = getConfigBlockDataProviders(),
): void {
  for (const [type, provider] of Object.entries(blockDataProviders)) {
    applyBlockDataProvider(type, provider);
  }
}

export function resolveBlockDataProvider(type: string): ChaiBlockDataProvider | undefined {
  const registeredBlock = getRegisteredChaiBlock(type);
  if (registeredBlock?.dataProvider && isFunction(registeredBlock.dataProvider)) {
    return registeredBlock.dataProvider as unknown as ChaiBlockDataProvider;
  }

  const configProvider = getConfigBlockDataProvider(type);
  if (!configProvider || !isFunction(configProvider)) {
    return undefined;
  }

  applyBlockDataProvider(type, configProvider as unknown as ChaiBlockDataProvider);
  return getRegisteredChaiBlock(type)?.dataProvider as unknown as ChaiBlockDataProvider | undefined;
}
