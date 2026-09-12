import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildChaiBuilderConfig } from "~/server/build-config";
import { stubChaiDbConfig } from "~/tests/setup/stub-chai-db";
import { resetActiveChaiBuilderConfigForTests } from "~/server/defaults/config-registry";
import { defineChaiServerPlugin, setPluginFeatures } from "~/server/plugin-api";
import { getAiLogger, getAiLoggingClientId, isAiCreditsEnabled } from "./lib";

// `aiCredits` is a plugin-owned key: it only enters ChaiPluginFeatures when a billing plugin
// augments the interface. Declared here so this file can exercise the flag without depending
// on any particular plugin being present.
declare module "~/types/server-config" {
  interface ChaiPluginFeatures {
    aiCredits?: boolean;
  }
}

// Stand-in for a plugin that meters AI credits; the real plugin sets the same flag.
const creditsFlagPlugin = (enabled: boolean) =>
  defineChaiServerPlugin((config) => setPluginFeatures(config, { aiCredits: enabled }));

describe("AI credits config helpers", () => {
  beforeEach(() => {
    resetActiveChaiBuilderConfigForTests();
  });

  it("is off without the credits-flag plugin", () => {
    buildChaiBuilderConfig({ db: stubChaiDbConfig() });

    expect(isAiCreditsEnabled()).toBe(false);
  });

  it("turns on when a plugin sets the aiCredits flag", () => {
    buildChaiBuilderConfig({
      db: stubChaiDbConfig(),
      plugins: [creditsFlagPlugin(true)],
    });

    expect(isAiCreditsEnabled()).toBe(true);
  });

  it("stays off when the plugin is registered disabled", () => {
    buildChaiBuilderConfig({
      db: stubChaiDbConfig(),
      plugins: [creditsFlagPlugin(false)],
    });

    expect(isAiCreditsEnabled()).toBe(false);
  });

  it("reads logging.logger from the active config registry", () => {
    const logger = vi.fn();

    buildChaiBuilderConfig({
      db: stubChaiDbConfig(),
      ai: {
        logging: {
          logger,
          clientId: "test-client",
        },
      },
    });

    expect(getAiLogger()).toBe(logger);
    expect(getAiLoggingClientId()).toBe("test-client");
  });
});
