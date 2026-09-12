
export function buildCacheKey(label: string, args: unknown[]): string {
  const serialized = args.map(serializeArg).join(":");
  return serialized ? `${label}:${serialized}` : label;
}

export function buildPersistentCacheKey(keyParts: string[]): string {
  return keyParts.join(":");
}

export function formatCacheKeyForLog(label: string, args: unknown[]): string {
  if (args.length === 0) return label;

  const parts = args.map(summarizeArg).filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : label;
}

export function formatPersistentKeyForLog(keyParts: string[]): string {
  return keyParts
    .map((part) => {
      if (part.startsWith("website-settings-")) return `app=${shortId(part.replace("website-settings-", ""))}`;
      if (part.startsWith("pages-metadata-")) return summarizePagesMetadataKey(part);
      if (part.startsWith("page-by-slug-")) return summarizePageBySlugKey(part);
      if (part.startsWith("page-slugs-batch-")) return summarizePageSlugsBatchKey(part);
      if (part.startsWith("page-slug-")) return summarizePageSlugKey(part);
      if (part.startsWith("alternate-")) return summarizeAlternateKey(part);
      if (part.startsWith("breadcrumb-")) return summarizeBreadcrumbKey(part);
      if (part.startsWith("page-details-")) return summarizePageDetailsKey(part);
      if (part.startsWith("full-page-")) return summarizeFullPageKey(part);
      if (part.startsWith("page-styles-")) return summarizePageStylesKey(part);
      if (part.includes("-") && part.length > 20) return shortId(part);
      return part;
    })
    .join(" · ");
}

function summarizePagesMetadataKey(key: string): string {
  const rest = key.slice("pages-metadata-".length);
  const mode = rest.endsWith("-draft") ? "draft" : rest.endsWith("-online") ? "online" : "unknown";
  const appId = rest.replace(/-(draft|online)$/, "");
  return `app=${shortId(appId)} · ${mode}`;
}

function summarizeRoutingKey(key: string, prefix: string, label: string): string {
  const rest = key.slice(prefix.length);
  const mode = rest.endsWith("-draft") ? "draft" : rest.endsWith("-online") ? "online" : "unknown";
  const withoutMode = rest.replace(/-(draft|online)(-.+)?$/, "");
  const appId = withoutMode;
  const suffix = rest.includes("-draft-")
    ? rest.split("-draft-")[1]
    : rest.includes("-online-")
      ? rest.split("-online-")[1]
      : undefined;
  return suffix ? `app=${shortId(appId)} · ${mode} · ${label}=${suffix.slice(0, 12)}` : `app=${shortId(appId)} · ${mode}`;
}

function summarizePageBySlugKey(key: string): string {
  return summarizeRoutingKey(key, "page-by-slug-", "slug");
}

function summarizePageSlugKey(key: string): string {
  return summarizeRoutingKey(key, "page-slug-", "page");
}

function summarizePageSlugsBatchKey(key: string): string {
  const rest = key.slice("page-slugs-batch-".length);
  const onlineIdx = rest.indexOf("-online-");
  const draftIdx = rest.indexOf("-draft-");
  if (onlineIdx > 0) {
    const appId = rest.slice(0, onlineIdx);
    const idsPart = rest.slice(onlineIdx + "-online-".length);
    const count = idsPart ? idsPart.split(",").filter(Boolean).length : 0;
    return `app=${shortId(appId)} · online · ids=${count}`;
  }
  if (draftIdx > 0) {
    const appId = rest.slice(0, draftIdx);
    const idsPart = rest.slice(draftIdx + "-draft-".length);
    const count = idsPart ? idsPart.split(",").filter(Boolean).length : 0;
    return `app=${shortId(appId)} · draft · ids=${count}`;
  }
  return shortId(rest);
}

function summarizeAlternateKey(key: string): string {
  return summarizeRoutingKey(key, "alternate-", "alt");
}

function summarizeBreadcrumbKey(key: string): string {
  return summarizeRoutingKey(key, "breadcrumb-", "crumb");
}

function summarizePageDetailsKey(key: string): string {
  const rest = key.slice("page-details-".length);
  if (rest.length <= 36) return `app=${shortId(rest)}`;
  const appId = rest.slice(0, 36);
  const pageId = rest.slice(37);
  return `app=${shortId(appId)} page=${shortId(pageId)}`;
}

function summarizeFullPageKey(key: string): string {
  const rest = key.slice("full-page-".length);
  if (rest.length <= 36) return `app=${shortId(rest)}`;
  const appId = rest.slice(0, 36);
  const pageId = rest.slice(37);
  return `app=${shortId(appId)} page=${shortId(pageId)}`;
}

function summarizePageStylesKey(key: string): string {
  const rest = key.slice("page-styles-".length);
  if (rest.length <= 36) return `app=${shortId(rest)}`;
  const appId = rest.slice(0, 36);
  const pageId = rest.slice(37);
  return `app=${shortId(appId)} page=${shortId(pageId)}`;
}

function serializeArg(arg: unknown): string {
  if (arg === null) return "null";
  if (arg === undefined) return "undefined";
  if (typeof arg === "string") return arg;
  if (typeof arg === "number" || typeof arg === "boolean") return String(arg);
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function summarizeArg(arg: unknown): string {
  if (typeof arg === "string") {
    if (arg.length > 36 && arg.includes("-")) return shortId(arg);
    return arg;
  }
  if (typeof arg === "number" || typeof arg === "boolean") return String(arg);

  if (arg && typeof arg === "object") {
    const record = arg as Record<string, unknown>;

    if (typeof record.slug === "string" || typeof record.pageType === "string") {
      const bits = [
        typeof record.slug === "string" ? `slug=${record.slug}` : null,
        typeof record.pageType === "string" ? `type=${record.pageType}` : null,
        typeof record.pageLang === "string" ? `lang=${record.pageLang}` : null,
        typeof record.pageId === "string" ? `page=${shortId(record.pageId)}` : null,
      ].filter(Boolean);
      if (bits.length > 0) return bits.join(" ");
    }

    if (typeof record.id === "string") {
      const bits = [
        `page=${shortId(record.id)}`,
        typeof record.slug === "string" ? `slug=${record.slug}` : null,
        typeof record.lang === "string" ? `lang=${record.lang}` : null,
      ].filter(Boolean);
      return bits.join(" ");
    }

    if (Array.isArray(record)) {
      return `[${record.length} items]`;
    }
  }

  const serialized = serializeArg(arg);
  return serialized.length > 60 ? `${serialized.slice(0, 57)}…` : serialized;
}

function shortId(value: string): string {
  if (value.length <= 8) return value;
  return value.slice(0, 8);
}
