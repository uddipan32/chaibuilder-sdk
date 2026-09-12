// Import the function directly from the input.tsx file
import { getInputTypeAndAutocomplete } from "./input";

describe("getInputTypeAndAutocomplete", () => {
  // Test default behavior
  it("should return defaults when no input type is provided", () => {
    expect(getInputTypeAndAutocomplete("")).toEqual({ type: "text", autoComplete: "on" });
    expect(getInputTypeAndAutocomplete(undefined as unknown as string)).toEqual({ type: "text", autoComplete: "on" });
    expect(getInputTypeAndAutocomplete(null as unknown as string)).toEqual({ type: "text", autoComplete: "on" });
  });

  // Test basic HTML input types
  it("should handle basic HTML input types with autocomplete on", () => {
    expect(getInputTypeAndAutocomplete("text")).toEqual({ type: "text", autoComplete: "on" });
    expect(getInputTypeAndAutocomplete("password")).toEqual({ type: "password", autoComplete: "on" });
    expect(getInputTypeAndAutocomplete("number")).toEqual({ type: "number", autoComplete: "on" });
    expect(getInputTypeAndAutocomplete("hidden")).toEqual({ type: "hidden", autoComplete: "on" });
    expect(getInputTypeAndAutocomplete("range")).toEqual({ type: "range", autoComplete: "on" });
    expect(getInputTypeAndAutocomplete("color")).toEqual({ type: "color", autoComplete: "on" });
    expect(getInputTypeAndAutocomplete("date")).toEqual({ type: "date", autoComplete: "on" });
    expect(getInputTypeAndAutocomplete("time")).toEqual({ type: "time", autoComplete: "on" });
  });

  // Test input types with matching autocomplete values
  it("should handle input types with matching autocomplete values", () => {
    expect(getInputTypeAndAutocomplete("email")).toEqual({ type: "email", autoComplete: "email" });
    expect(getInputTypeAndAutocomplete("tel")).toEqual({ type: "tel", autoComplete: "tel" });
    expect(getInputTypeAndAutocomplete("url")).toEqual({ type: "url", autoComplete: "url" });
  });

  // Test special cases
  it("should handle special autocomplete values", () => {
    expect(getInputTypeAndAutocomplete("off")).toEqual({ type: "text", autoComplete: "off" });
    expect(getInputTypeAndAutocomplete("on")).toEqual({ type: "text", autoComplete: "on" });
  });

  // Test name-related fields
  it("should handle name-related fields", () => {
    expect(getInputTypeAndAutocomplete("name")).toEqual({ type: "text", autoComplete: "name" });
    expect(getInputTypeAndAutocomplete("honorific-prefix")).toEqual({ type: "text", autoComplete: "honorific-prefix" });
    expect(getInputTypeAndAutocomplete("given-name")).toEqual({ type: "text", autoComplete: "given-name" });
    expect(getInputTypeAndAutocomplete("additional-name")).toEqual({ type: "text", autoComplete: "additional-name" });
    expect(getInputTypeAndAutocomplete("family-name")).toEqual({ type: "text", autoComplete: "family-name" });
    expect(getInputTypeAndAutocomplete("honorific-suffix")).toEqual({ type: "text", autoComplete: "honorific-suffix" });
    expect(getInputTypeAndAutocomplete("nickname")).toEqual({ type: "text", autoComplete: "nickname" });
    expect(getInputTypeAndAutocomplete("firstName")).toEqual({ type: "text", autoComplete: "given-name" });
    expect(getInputTypeAndAutocomplete("lastName")).toEqual({ type: "text", autoComplete: "family-name" });
  });

  // Test contact-related fields
  it("should handle contact-related fields", () => {
    expect(getInputTypeAndAutocomplete("email")).toEqual({ type: "email", autoComplete: "email" });
    expect(getInputTypeAndAutocomplete("tel")).toEqual({ type: "tel", autoComplete: "tel" });
    expect(getInputTypeAndAutocomplete("tel-country-code")).toEqual({ type: "tel", autoComplete: "tel-country-code" });
    expect(getInputTypeAndAutocomplete("tel-national")).toEqual({ type: "tel", autoComplete: "tel-national" });
    expect(getInputTypeAndAutocomplete("tel-area-code")).toEqual({ type: "tel", autoComplete: "tel-area-code" });
    expect(getInputTypeAndAutocomplete("tel-local")).toEqual({ type: "tel", autoComplete: "tel-local" });
    expect(getInputTypeAndAutocomplete("tel-extension")).toEqual({ type: "tel", autoComplete: "tel-extension" });
  });

  // Test address-related fields
  it("should handle address-related fields", () => {
    expect(getInputTypeAndAutocomplete("street-address")).toEqual({ type: "text", autoComplete: "street-address" });
    expect(getInputTypeAndAutocomplete("address-line1")).toEqual({ type: "text", autoComplete: "address-line1" });
    expect(getInputTypeAndAutocomplete("address-line2")).toEqual({ type: "text", autoComplete: "address-line2" });
    expect(getInputTypeAndAutocomplete("address-line3")).toEqual({ type: "text", autoComplete: "address-line3" });
    expect(getInputTypeAndAutocomplete("address-level1")).toEqual({ type: "text", autoComplete: "address-level1" });
    expect(getInputTypeAndAutocomplete("address-level2")).toEqual({ type: "text", autoComplete: "address-level2" });
    expect(getInputTypeAndAutocomplete("address-level3")).toEqual({ type: "text", autoComplete: "address-level3" });
    expect(getInputTypeAndAutocomplete("address-level4")).toEqual({ type: "text", autoComplete: "address-level4" });
    expect(getInputTypeAndAutocomplete("country")).toEqual({ type: "text", autoComplete: "country" });
    expect(getInputTypeAndAutocomplete("country-name")).toEqual({ type: "text", autoComplete: "country-name" });
    expect(getInputTypeAndAutocomplete("postal-code")).toEqual({ type: "text", autoComplete: "postal-code" });
  });

  // Test credit card-related fields
  it("should handle credit card-related fields", () => {
    expect(getInputTypeAndAutocomplete("cc-name")).toEqual({ type: "text", autoComplete: "cc-name" });
    expect(getInputTypeAndAutocomplete("cc-given-name")).toEqual({ type: "text", autoComplete: "cc-given-name" });
    expect(getInputTypeAndAutocomplete("cc-additional-name")).toEqual({
      type: "text",
      autoComplete: "cc-additional-name",
    });
    expect(getInputTypeAndAutocomplete("cc-family-name")).toEqual({ type: "text", autoComplete: "cc-family-name" });
    expect(getInputTypeAndAutocomplete("cc-number")).toEqual({ type: "text", autoComplete: "cc-number" });
    expect(getInputTypeAndAutocomplete("cc-exp")).toEqual({ type: "text", autoComplete: "cc-exp" });
    expect(getInputTypeAndAutocomplete("cc-exp-month")).toEqual({ type: "number", autoComplete: "cc-exp-month" });
    expect(getInputTypeAndAutocomplete("cc-exp-year")).toEqual({ type: "number", autoComplete: "cc-exp-year" });
    expect(getInputTypeAndAutocomplete("cc-csc")).toEqual({ type: "text", autoComplete: "cc-csc" });
    expect(getInputTypeAndAutocomplete("cc-type")).toEqual({ type: "text", autoComplete: "cc-type" });
  });

  // Test date-related fields
  it("should handle date-related fields", () => {
    expect(getInputTypeAndAutocomplete("bday")).toEqual({ type: "date", autoComplete: "bday" });
    expect(getInputTypeAndAutocomplete("bday-day")).toEqual({ type: "number", autoComplete: "bday-day" });
    expect(getInputTypeAndAutocomplete("bday-month")).toEqual({ type: "number", autoComplete: "bday-month" });
    expect(getInputTypeAndAutocomplete("bday-year")).toEqual({ type: "number", autoComplete: "bday-year" });
  });

  // Test login-related fields
  it("should handle login-related fields", () => {
    expect(getInputTypeAndAutocomplete("username")).toEqual({ type: "text", autoComplete: "username" });
    expect(getInputTypeAndAutocomplete("new-password")).toEqual({ type: "password", autoComplete: "new-password" });
    expect(getInputTypeAndAutocomplete("current-password")).toEqual({
      type: "password",
      autoComplete: "current-password",
    });
    expect(getInputTypeAndAutocomplete("one-time-code")).toEqual({ type: "text", autoComplete: "one-time-code" });
  });

  // Test transaction-related fields
  it("should handle transaction-related fields", () => {
    expect(getInputTypeAndAutocomplete("transaction-currency")).toEqual({
      type: "text",
      autoComplete: "transaction-currency",
    });
    expect(getInputTypeAndAutocomplete("transaction-amount")).toEqual({
      type: "number",
      autoComplete: "transaction-amount",
    });
  });

  // Test other fields
  it("should handle other fields", () => {
    expect(getInputTypeAndAutocomplete("url")).toEqual({ type: "url", autoComplete: "url" });
    expect(getInputTypeAndAutocomplete("photo")).toEqual({ type: "url", autoComplete: "photo" });
    expect(getInputTypeAndAutocomplete("sex")).toEqual({ type: "text", autoComplete: "sex" });
    expect(getInputTypeAndAutocomplete("organization-title")).toEqual({
      type: "text",
      autoComplete: "organization-title",
    });
    expect(getInputTypeAndAutocomplete("organization")).toEqual({ type: "text", autoComplete: "organization" });
    expect(getInputTypeAndAutocomplete("language")).toEqual({ type: "text", autoComplete: "language" });
  });

  // Test unknown values
  it("should handle unknown values by returning defaults", () => {
    expect(getInputTypeAndAutocomplete("unknown-value")).toEqual({ type: "text", autoComplete: "on" });
    expect(getInputTypeAndAutocomplete("custom-field")).toEqual({ type: "text", autoComplete: "on" });
  });
});
