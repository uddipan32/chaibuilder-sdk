import { describe, expect, it } from "vitest";
import { JSONLD } from "./json-ld";

describe("JSONLD", () => {
  it("renders bound seo.jsonLD (regression: previously no-op'd to null for every page)", async () => {
    const el = (await JSONLD({
      jsonLD: JSON.stringify({ "@context": "https://schema.org", "@type": "Car", name: "{{vehicle.name}}" }),
      pageData: { vehicle: { name: "RAM 1500" } },
    })) as any;

    expect(el).not.toBeNull();
    expect(el.type).toBe("script");
    expect(el.props.type).toBe("application/ld+json");
    const data = JSON.parse(el.props.children);
    expect(data["@type"]).toBe("Car");
    expect(data.name).toBe("RAM 1500");
  });

  it("decodes HTML entities the binding engine escapes into JSON-LD values", async () => {
    const el = (await JSONLD({
      jsonLD: JSON.stringify({ "@type": "AutoDealer", name: "{{dealer.name}}" }),
      pageData: { dealer: { name: "Chrysler & Dodge" } },
    })) as any;

    const data = JSON.parse(el.props.children);
    expect(data.name).toBe("Chrysler & Dodge");
  });

  it("escapes </script> in bound values so it can't break out of the script tag", async () => {
    const el = (await JSONLD({
      jsonLD: JSON.stringify({ "@type": "WebPage", name: "{{v.name}}" }),
      pageData: { v: { name: "</script><script>alert(1)</script>" } },
    })) as any;

    // no literal `<` in the rendered script text (would break out at HTML parse)
    expect(el.props.children).not.toContain("<");
    expect(el.props.children).toContain("\\u003c");
    // still valid JSON that round-trips to the original value
    expect(JSON.parse(el.props.children).name).toBe("</script><script>alert(1)</script>");
  });

  it("returns null for missing, empty, or invalid JSON-LD", async () => {
    expect(await JSONLD({ jsonLD: undefined })).toBeNull();
    expect(await JSONLD({ jsonLD: "{}" })).toBeNull();
    expect(await JSONLD({ jsonLD: "not json" })).toBeNull();
  });
});
