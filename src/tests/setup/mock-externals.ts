import { vi } from "vitest";

export function setupExternalMocks(): void {
  // Nothing external is stubbed by default. Add vi.mock calls here (top level,
  // not inside the function — vitest hoists them) when a suite needs one.
}

export function resetExternalMocks(): void {
  vi.clearAllMocks();
}
