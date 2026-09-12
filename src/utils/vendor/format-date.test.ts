import { describe, expect, it } from "vitest";
import { formatDate } from "./format-date";

describe("formatDate", () => {
  // Jul 19 2026, 2:05 PM local time
  const afternoon = new Date(2026, 6, 19, 14, 5);

  it("expands the PPp shorthand to medium date + short time (date-fns parity)", () => {
    expect(formatDate(afternoon, "PPp")).toBe("Jul 19, 2026, 2:05 PM");
  });

  it("formats 'MMM d, yyyy, h:mm a'", () => {
    expect(formatDate(afternoon, "MMM d, yyyy, h:mm a")).toBe("Jul 19, 2026, 2:05 PM");
  });

  it("passes quoted literals through without token replacement", () => {
    expect(formatDate(afternoon, "MMM d, yyyy 'at' h:mm a")).toBe("Jul 19, 2026 at 2:05 PM");
  });

  it("formats 'dd MMM yyyy, h:mm a' with a zero-padded day", () => {
    expect(formatDate(new Date(2026, 0, 3, 9, 7), "dd MMM yyyy, h:mm a")).toBe("03 Jan 2026, 9:07 AM");
  });

  it("renders midnight as 12 AM and noon as 12 PM", () => {
    expect(formatDate(new Date(2026, 3, 1, 0, 0), "h:mm a")).toBe("12:00 AM");
    expect(formatDate(new Date(2026, 3, 1, 12, 0), "h:mm a")).toBe("12:00 PM");
  });

  it("accepts ISO strings and epoch numbers", () => {
    const date = new Date(2026, 6, 19, 14, 5);
    expect(formatDate(date.toISOString(), "PPp")).toBe("Jul 19, 2026, 2:05 PM");
    expect(formatDate(date.getTime(), "PPp")).toBe("Jul 19, 2026, 2:05 PM");
  });

  it("returns an empty string for unparseable input", () => {
    expect(formatDate("not a date", "PPp")).toBe("");
  });
});
