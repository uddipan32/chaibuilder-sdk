import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyBlockDataProviderToRegistry, getRegisteredChaiBlock } from "~/registry/v2/runtime/core";
import { buildChaiBuilderConfig } from "~/server/build-config";
import { stubChaiDbConfig } from "~/tests/setup/stub-chai-db";
import { resetActiveChaiBuilderConfigForTests } from "~/server/defaults/config-registry";
import { applyBlockDataProvider, resolveBlockDataProvider } from "./block-data-providers";

describe("block-data-providers", () => {
  beforeEach(() => {
    resetActiveChaiBuilderConfigForTests();
  });

  it("applies block data providers to the registry", () => {
    const provider = vi.fn(async (_ctx) => ({ title: "Hello" }));

    applyBlockDataProvider("SyncHero", provider);

    expect(getRegisteredChaiBlock("SyncHero")?.dataProvider).toBe(provider);
  });

  it("resolves block data providers from config when not on the registry", () => {
    const provider = vi.fn(async (_ctx) => ({ title: "From config" }));

    resetActiveChaiBuilderConfigForTests({
      blockDataProviders: {
        ConfigHero: provider,
      },
    });

    expect(resolveBlockDataProvider("ConfigHero")).toBe(provider);
    expect(getRegisteredChaiBlock("ConfigHero")?.dataProvider).toBe(provider);
  });

  it("prefers registry data providers over config", () => {
    const registryProvider = vi.fn(async (_ctx) => ({ source: "registry" }));
    const configProvider = vi.fn(async (_ctx) => ({ source: "config" }));

    resetActiveChaiBuilderConfigForTests({
      blockDataProviders: {
        PriorityHero: configProvider,
      },
    });
    applyBlockDataProviderToRegistry("PriorityHero", registryProvider);

    expect(resolveBlockDataProvider("PriorityHero")).toBe(registryProvider);
  });

  it("syncs config block data providers into REGISTERED_CHAI_BLOCKS on buildChaiBuilderConfig", () => {
    const provider = vi.fn(async (_ctx) => ({ title: "From build config" }));

    buildChaiBuilderConfig({
      db: stubChaiDbConfig(),
      blockDataProviders: {
        BuildHero: provider,
      },
    });

    expect(getRegisteredChaiBlock("BuildHero")?.dataProvider).toBe(provider);
  });
});
