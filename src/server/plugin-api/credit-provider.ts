import type { CreditDeductionResult, CreditStatus } from "~/types/credits";

/**
 * Seam between core AI execution and credit accounting. Core checks and deducts
 * through whichever provider is registered; with none registered, AI runs
 * uncapped and nothing is deducted. A billing plugin registers the provider.
 *
 * globalThis-keyed for the same per-route-module-graph reason as the context
 * resolver.
 */
export type ChaiCreditProvider = {
  checkCreditsAvailable(appId: string): Promise<{ available: boolean; status: CreditStatus | null }>;
  determineCreditSourceFromStatus(status: CreditStatus, tokensUsed: number): CreditDeductionResult;
  deductAddonCredits(addonId: string, tokensUsed: number): Promise<{ success: boolean; error?: string }>;
};

const _g = globalThis as typeof globalThis & { __chaiCreditProvider?: ChaiCreditProvider };

export function registerChaiCreditProvider(provider: ChaiCreditProvider): void {
  _g.__chaiCreditProvider = provider;
}

export function getChaiCreditProvider(): ChaiCreditProvider | null {
  return _g.__chaiCreditProvider ?? null;
}

/** @internal Clears the provider between unit tests. */
export function resetChaiCreditProviderForTests(): void {
  _g.__chaiCreditProvider = undefined;
}
