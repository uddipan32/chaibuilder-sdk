/**
 * AI credit accounting shapes. Declared in core so the AI base action, the
 * request logger, and the typed config can reference them; the accounting
 * itself lives in the pro ai plugin, wired in via the credit provider seam
 * (`~/server/plugin-api/credit-provider`).
 */

export interface CreditStatus {
  monthly: {
    used: number;
    limit: number;
    remaining: number;
  };
  addon: {
    total: number;
    used: number;
    remaining: number;
    addons: Array<{ id: string; remaining: number }>;
  };
  totalAvailable: number;
  canBuyCredits: boolean;
  billingPeriod?: {
    start: Date;
    end: Date;
  };
}

export interface CreditDeductionResult {
  success: boolean;
  creditSource: "monthly" | "addon";
  addonId: string | null;
  error?: string;
}
