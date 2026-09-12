import { eq } from "drizzle-orm";
import { kebabCase } from "lodash-es";
import { nanoid } from "nanoid";
import type { ChaiBuilderInstance } from "~/types/chaibuilder-config";

const URL_SCHEME_RE = /^[a-z][a-z0-9+.-]*:\/\//i;
const LEADING_WWW_RE = /^www\./i;
const TRAILING_DOT_RE = /\.+$/;
const TRAILING_INLINE_SPLIT_RE = /[,\s]/;

const decodeDomainInput = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const normalizeDomain = (input: string): string => {
  const decodedInput = decodeDomainInput(input).trim().toLowerCase();
  if (!decodedInput) {
    return "";
  }

  const withoutInlineTrailingInfo = (decodedInput.split(TRAILING_INLINE_SPLIT_RE)[0] ?? "").replace(
    TRAILING_DOT_RE,
    "",
  );
  if (!withoutInlineTrailingInfo) {
    return "";
  }

  const candidate = URL_SCHEME_RE.test(withoutInlineTrailingInfo)
    ? withoutInlineTrailingInfo
    : `http://${withoutInlineTrailingInfo}`;

  try {
    return new URL(candidate).host.replace(LEADING_WWW_RE, "").replace(TRAILING_DOT_RE, "");
  } catch {
    const withoutScheme = withoutInlineTrailingInfo.replace(URL_SCHEME_RE, "");
    const withoutPath = withoutScheme.split(/[/?#]/)[0] ?? "";
    const withoutWww = withoutPath.replace(LEADING_WWW_RE, "");
    return withoutWww.replace(TRAILING_DOT_RE, "");
  }
};

function slugFromAppName(name: string): string {
  const slug = kebabCase(name.trim()).replace(/^-+|-+$/g, "");
  return slug.slice(0, 48) || "app";
}

export async function buildUniqueSubdomain(cb: ChaiBuilderInstance, appName: string): Promise<string> {
  const { db, schema } = cb;
  const baseDomain = normalizeDomain(process.env.NEXT_PUBLIC_SUBDOMAIN || "localhost");
  if (!baseDomain) {
    throw new Error("NEXT_PUBLIC_SUBDOMAIN is not set (.env.local)");
  }

  const baseSlug = slugFromAppName(appName);
  let slug = baseSlug;

  for (let attempt = 0; attempt < 20; attempt++) {
    const subdomain = `${slug}.${baseDomain}`;
    const existing = await db
      .select({ id: schema.appDomains.id })
      .from(schema.appDomains)
      .where(eq(schema.appDomains.subdomain, subdomain))
      .limit(1);

    if (existing.length === 0) {
      return subdomain;
    }

    slug = `${baseSlug}-${nanoid(6).toLowerCase()}`;
  }

  throw new Error(`buildUniqueSubdomain: could not allocate subdomain for "${appName}"`);
}
