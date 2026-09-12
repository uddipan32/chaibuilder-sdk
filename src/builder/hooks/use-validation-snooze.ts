import { useCallback } from "react";

const STORAGE_KEY = "chai_validation_snooze_until";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const SNOOZE_DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

const readSnoozeUntil = (key: string): number => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return 0;
    const timestamp = Number(raw);
    return Number.isFinite(timestamp) ? timestamp : 0;
  } catch {
    // localStorage can throw (privacy modes, sandboxed iframes) — fail open.
    return 0;
  }
};

/**
 * Lets the user silence the page validation modal for a few days. Save and publish keep
 * separate deadlines, so snoozing the save warning still warns before going live.
 * The deadline is read at call time instead of being held in state so a snooze set from
 * another tab is honoured too.
 */
export const useValidationSnooze = (scope: "save" | "publish") => {
  const key = `${STORAGE_KEY}_${scope}`;

  const isSnoozed = useCallback(() => readSnoozeUntil(key) > Date.now(), [key]);

  const snoozeForDays = useCallback(
    (days: number) => {
      if (!days || days <= 0) return;
      try {
        window.localStorage.setItem(key, String(Date.now() + days * DAY_IN_MS));
      } catch {
        // Ignore — snoozing is a convenience, not a requirement.
      }
    },
    [key],
  );

  const clearSnooze = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore.
    }
  }, [key]);

  return { isSnoozed, snoozeForDays, clearSnooze };
};
