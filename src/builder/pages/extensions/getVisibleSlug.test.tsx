/**
 * @vitest-environment happy-dom
 */
import { getVisibleSlug } from "./getVisibleSlug";

describe("getVisibleSlug", () => {
  const mockWindowLocation = (host: string) => {
    Object.defineProperty(window, "location", {
      value: { host },
      writable: true,
      configurable: true,
    });
  };

  describe("basic functionality", () => {
    it("should return domain + slug when combined length is under 60", () => {
      mockWindowLocation("example.com");
      expect(getVisibleSlug("/about")).toBe("example.com/about");
    });

    it("should handle empty slug", () => {
      mockWindowLocation("example.com");
      expect(getVisibleSlug("")).toBe("example.com");
    });

    it("should handle null slug", () => {
      mockWindowLocation("example.com");
      expect(getVisibleSlug(null)).toBe("example.com");
    });

    it("should handle undefined slug", () => {
      mockWindowLocation("example.com");
      expect(getVisibleSlug(undefined)).toBe("example.com");
    });

    it("should remove trailing slash from slug", () => {
      mockWindowLocation("example.com");
      expect(getVisibleSlug("/about/")).toBe("example.com/about");
    });

    it("should handle slug without leading slash", () => {
      mockWindowLocation("example.com");
      expect(getVisibleSlug("about")).toBe("example.comabout");
    });
  });

  describe("slug truncation (slug >= 60 chars)", () => {
    it("should truncate very long slug and show ellipsis at start", () => {
      mockWindowLocation("example.com");
      const longSlug = "/this-is-a-very-long-slug-that-exceeds-sixty-characters-in-total-length";
      const result = getVisibleSlug(longSlug);
      expect(result).toHaveLength(63); // "..." + 60 chars
      expect(result.startsWith("...")).toBe(true);
      expect(result.endsWith("total-length")).toBe(true);
    });

    it("should handle exactly 60 character slug", () => {
      mockWindowLocation("example.com");
      const slug = "/123456789012345678901234567890123456789012345678901234567";
      const result = getVisibleSlug(slug);
      expect(result).toHaveLength(61);
      expect(result.startsWith("...")).toBe(true);
    });

    it("should handle 61 character slug", () => {
      mockWindowLocation("example.com");
      const slug = "/1234567890123456789012345678901234567890123456789012345678";
      const result = getVisibleSlug(slug);
      expect(result).toHaveLength(62);
      expect(result.startsWith("...")).toBe(true);
    });

    it("should show last 60 characters of very long slug", () => {
      mockWindowLocation("short.com");
      const longSlug = "/" + "a".repeat(100);
      const result = getVisibleSlug(longSlug);
      expect(result).toBe("..." + "a".repeat(60));
    });
  });

  describe("domain truncation (domain + slug > 60)", () => {
    it("should truncate domain when combined length exceeds 60", () => {
      mockWindowLocation("very-long-domain-name-that-is-quite-lengthy.com");
      const slug = "/products/category";
      const result = getVisibleSlug(slug);
      expect(result).toHaveLength(60);
      expect(result.startsWith("...")).toBe(true);
      expect(result.endsWith("/products/category")).toBe(true);
    });

    it("should preserve full slug when truncating domain", () => {
      mockWindowLocation("extremely-long-domain-name.example.com");
      const slug = "/short";
      const result = getVisibleSlug(slug);
      expect(result.endsWith("/short")).toBe(true);
      expect(result).toBe("extremely-long-domain-name.example.com/short");
    });

    it("should handle domain + slug exactly 61 characters", () => {
      mockWindowLocation("a".repeat(50));
      const slug = "/1234567890"; // 11 chars, total = 61
      const result = getVisibleSlug(slug);
      expect(result).toHaveLength(60);
      expect(result.startsWith("...")).toBe(true);
    });

    it("should handle very long domain with short slug", () => {
      mockWindowLocation("a".repeat(100));
      const slug = "/x";
      const result = getVisibleSlug(slug);
      expect(result).toHaveLength(60);
      expect(result.endsWith("/x")).toBe(true);
    });

    it("should handle edge case where maxDomainLength is 0", () => {
      mockWindowLocation("verylongdomain.com");
      const slug = "/" + "b".repeat(57); // 58 chars total
      const result = getVisibleSlug(slug);
      expect(result.startsWith("...")).toBe(true);
    });

    it("should handle edge case where maxDomainLength is negative", () => {
      mockWindowLocation("domain.com");
      const slug = "/" + "c".repeat(58); // 59 chars, leaves -2 for domain
      const result = getVisibleSlug(slug);
      expect(result.startsWith("...")).toBe(true);
    });
  });

  describe("exact length boundaries", () => {
    it("should not truncate when domain + slug is exactly 60", () => {
      mockWindowLocation("a".repeat(50));
      const slug = "/123456789"; // 10 chars, total = 60
      const result = getVisibleSlug(slug);
      expect(result).toBe("a".repeat(50) + "/123456789");
      expect(result).toHaveLength(60);
    });

    it("should not truncate when domain + slug is less than 60", () => {
      mockWindowLocation("example.com");
      const slug = "/test";
      const result = getVisibleSlug(slug);
      expect(result).toBe("example.com/test");
      expect(result.length).toBeLessThan(60);
    });

    it("should handle single character domain and slug", () => {
      mockWindowLocation("a");
      expect(getVisibleSlug("/b")).toBe("a/b");
    });
  });

  describe("special characters and edge cases", () => {
    it("should handle slug with special characters", () => {
      mockWindowLocation("example.com");
      expect(getVisibleSlug("/about-us?query=test")).toBe("example.com/about-us?query=test");
    });

    it("should handle slug with hash", () => {
      mockWindowLocation("example.com");
      expect(getVisibleSlug("/page#section")).toBe("example.com/page#section");
    });

    it("should handle slug with encoded characters", () => {
      mockWindowLocation("example.com");
      expect(getVisibleSlug("/path%20with%20spaces")).toBe("example.com/path%20with%20spaces");
    });

    it("should handle slug with unicode characters", () => {
      mockWindowLocation("example.com");
      expect(getVisibleSlug("/café")).toBe("example.com/café");
    });

    it("should handle multiple trailing slashes", () => {
      mockWindowLocation("example.com");
      expect(getVisibleSlug("/about///")).toBe("example.com/about//");
    });

    it("should handle slug that is just a slash", () => {
      mockWindowLocation("example.com");
      expect(getVisibleSlug("/")).toBe("example.com");
    });

    it("should handle empty string domain", () => {
      mockWindowLocation("");
      expect(getVisibleSlug("/test")).toBe("/test");
    });
  });

  describe("subdomain handling", () => {
    it("should handle subdomain in host", () => {
      mockWindowLocation("blog.example.com");
      expect(getVisibleSlug("/post")).toBe("blog.example.com/post");
    });

    it("should handle multiple subdomains", () => {
      mockWindowLocation("api.v2.example.com");
      expect(getVisibleSlug("/endpoint")).toBe("api.v2.example.com/endpoint");
    });

    it("should truncate subdomain when necessary", () => {
      mockWindowLocation("very-long-subdomain.example.com");
      const slug = "/" + "x".repeat(40);
      const result = getVisibleSlug(slug);
      expect(result).toHaveLength(60);
      expect(result.startsWith("...")).toBe(true);
    });
  });

  describe("port number handling", () => {
    it("should handle domain with port number", () => {
      mockWindowLocation("localhost:3000");
      expect(getVisibleSlug("/dev")).toBe("localhost:3000/dev");
    });

    it("should handle domain with port in truncation", () => {
      mockWindowLocation("very-long-domain-name.com:8080");
      const slug = "/" + "y".repeat(30);
      const result = getVisibleSlug(slug);
      expect(result.startsWith("...")).toBe(true);
      expect(result.endsWith("y".repeat(30))).toBe(true);
    });
  });

  describe("real-world scenarios", () => {
    it("should handle typical blog post URL", () => {
      mockWindowLocation("myblog.com");
      expect(getVisibleSlug("/2024/03/my-awesome-post")).toBe("myblog.com/2024/03/my-awesome-post");
    });

    it("should handle e-commerce product URL", () => {
      mockWindowLocation("shop.example.com");
      const result = getVisibleSlug("/products/electronics/laptops/gaming-laptop-xyz");
      expect(result).toHaveLength(60);
      expect(result.endsWith("/products/electronics/laptops/gaming-laptop-xyz")).toBe(true);
    });

    it("should handle very long product URL with truncation", () => {
      mockWindowLocation("mystore.com");
      const slug =
        "/products/category/subcategory/sub-subcategory/item-with-very-long-descriptive-name-that-exceeds-limits";
      const result = getVisibleSlug(slug);
      expect(result.startsWith("...")).toBe(true);
      expect(result).toHaveLength(63);
    });

    it("should handle documentation URL", () => {
      mockWindowLocation("docs.framework.io");
      expect(getVisibleSlug("/api/v2/authentication/oauth")).toBe("docs.framework.io/api/v2/authentication/oauth");
    });

    it("should handle localhost development", () => {
      mockWindowLocation("localhost:3000");
      expect(getVisibleSlug("/admin/dashboard")).toBe("localhost:3000/admin/dashboard");
    });
  });

  describe("edge cases with trailing slash removal", () => {
    it("should handle slug with only trailing slash", () => {
      mockWindowLocation("example.com");
      expect(getVisibleSlug("/")).toBe("example.com");
    });

    it("should preserve internal slashes", () => {
      mockWindowLocation("example.com");
      expect(getVisibleSlug("/path/to/page/")).toBe("example.com/path/to/page");
    });

    it("should handle long slug with trailing slash", () => {
      mockWindowLocation("example.com");
      const longSlug = "/" + "z".repeat(70) + "/";
      const result = getVisibleSlug(longSlug);
      expect(result.startsWith("...")).toBe(true);
      expect(result.endsWith("z")).toBe(true);
    });
  });

  describe("boundary testing for truncation logic", () => {
    it("should handle slug length of 59 characters", () => {
      mockWindowLocation("x.com");
      const slug = "/" + "a".repeat(58); // 59 total
      const result = getVisibleSlug(slug);
      expect(result).toHaveLength(62); // "..." + 59 chars (after removing trailing slash)
    });

    it("should handle combined length of 59 characters", () => {
      mockWindowLocation("a".repeat(49));
      const slug = "/123456789"; // 10 chars, total = 59
      const result = getVisibleSlug(slug);
      expect(result).toBe("a".repeat(49) + "/123456789");
    });

    it("should handle maxDomainLength calculation edge case", () => {
      mockWindowLocation("domain.com");
      const slug = "/" + "b".repeat(56); // 57 chars, maxDomainLength = 0
      const result = getVisibleSlug(slug);
      expect(result.startsWith("...")).toBe(true);
      expect(result.endsWith("b".repeat(56))).toBe(true);
    });
  });
});
