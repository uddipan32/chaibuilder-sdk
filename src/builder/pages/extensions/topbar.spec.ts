/**
 * @vitest-environment happy-dom
 */

import { getVisibleSlug } from "./getVisibleSlug";

function setHost(host: string) {
  // happy-dom's location property is normally read-only. We redefine it to make it configurable for tests.
  Object.defineProperty(window, "location", {
    value: {
      host,
    },
    writable: true,
    configurable: true,
  });
}

describe("getVisibleSlug", () => {
  describe("when slug is undefined or empty", () => {
    it("returns only the domain", () => {
      const host = "example.com";
      setHost(host);
      const result = getVisibleSlug(undefined);
      expect(result).toBe(host);
    });
  });

  describe("when slug is short and total length \u2264 60", () => {
    it("returns domain concatenated with the slug (trailing slash trimmed)", () => {
      const host = "example.com";
      setHost(host);
      const slug = "/short/"; // trailing slash should be removed
      // Expected output: full domain followed by trimmed slug (no trailing slash)
      const expected = `${host}/short`; // "example.com/short"
      const result = getVisibleSlug(slug);
      expect(result).toBe(expected);
    });
  });

  describe("when slug itself exceeds the 60 character limit", () => {
    it("returns an ellipsis followed by the last 60 characters of the slug", () => {
      const host = "irrelevant.com";
      setHost(host);
      const baseSlug = "/" + "a".repeat(65);
      // Expected output: ellipsis plus the last 60 characters of the slug
      const expected = "..." + baseSlug.slice(-60); // "..." followed by last 60 chars of slug
      const result = getVisibleSlug(baseSlug);
      expect(result).toBe(expected);
    });
  });

  describe("when domain + slug exceeds 60 characters but slug alone does not", () => {
    it("truncates the domain so that the full slug is visible", () => {
      const longDomain = "averyveryverylongdomainnamethatiswaytoolongtobeinfull.com"; // length > 50
      setHost(longDomain);
      const slug = "/short";
      const displaySlug = slug; // slug doesn't end with '/'
      const maxDomainLength = 60 - displaySlug.length - 3; // 3 for '...'
      const truncatedDomain = "..." + longDomain.slice(longDomain.length - maxDomainLength);
      // Expected output: truncated domain (with ellipsis) concatenated with the full slug
      const expected = truncatedDomain + displaySlug; // e.g. "...infull.com/short"

      const result = getVisibleSlug(slug);
      expect(result).toBe(expected);
    });
  });
});
