import { has, isObject, set } from "lodash-es";

export const getSeoDefaults = (pageTypeDetails: any, currentLang: string) => {
  const result = {
    seo: {
      title: "",
      description: "",
      noIndex: false,
      noFollow: false,
      canonicalUrl: "",
      ogTitle: "",
      ogDescription: "",
      jsonLD: "",
      metaOther: "",
    },
    jsonLD: {},
    metaOther: {},
  };
  // Add SEO defaults with language support
  if (pageTypeDetails?.defaultSeo) {
    // If language-specific SEO exists for current language, use that
    if (has(pageTypeDetails.defaultSeo, currentLang) && isObject(pageTypeDetails.defaultSeo[currentLang])) {
      result.seo = { ...result.seo, ...pageTypeDetails.defaultSeo[currentLang] };
    } else {
      // Otherwise use the full default SEO
      result.seo = { ...result.seo, ...pageTypeDetails.defaultSeo };
    }
  }

  let JSONLD = {};
  // Add JSON LD defaults with language support
  if (pageTypeDetails?.defaultJSONLD) {
    // If language-specific JSON LD exists for current language, use that
    if (has(pageTypeDetails.defaultJSONLD, currentLang) && isObject(pageTypeDetails.defaultJSONLD[currentLang])) {
      JSONLD = pageTypeDetails.defaultJSONLD[currentLang];
      set(result, "seo.jsonLD", JSON.stringify(JSONLD));
    } else {
      // Otherwise use the full default JSON LD
      JSONLD = pageTypeDetails.defaultJSONLD;
      set(result, "seo.jsonLD", JSON.stringify(JSONLD));
    }
  }

  let META_OTHER = {};
  // Add Meta Other defaults with language support
  if (pageTypeDetails?.defaultMetaTags) {
    if (has(pageTypeDetails.defaultMetaTags, currentLang) && isObject(pageTypeDetails.defaultMetaTags[currentLang])) {
      META_OTHER = pageTypeDetails.defaultMetaTags[currentLang];
      set(result, "seo.metaOther", JSON.stringify(META_OTHER));
    } else {
      META_OTHER = pageTypeDetails.defaultMetaTags;
      set(result, "seo.metaOther", JSON.stringify(META_OTHER));
    }
  }

  return { seo: result.seo, jsonLD: result.jsonLD, metaOther: META_OTHER };
};

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;

  it("should return default values", () => {
    const result = getSeoDefaults(
      {
        defaultSeo: {
          title: "",
          description: "",
          noIndex: false,
          noFollow: false,
          canonicalUrl: "",
          ogTitle: "",
          ogDescription: "",
          jsonLD: "",
        },
        defaultJSONLD: {},
      },
      "en",
    );
    expect(result).toEqual({
      seo: {
        title: "",
        description: "",
        noIndex: false,
        noFollow: false,
        canonicalUrl: "",
        ogTitle: "",
        ogDescription: "",
        jsonLD: "{}",
        metaOther: "",
      },
      jsonLD: {},
      metaOther: {},
    });
  });
}
