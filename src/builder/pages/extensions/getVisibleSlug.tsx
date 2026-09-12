export function getVisibleSlug(slug: any) {
  const domain = window.location.host;
  const displaySlug = slug ? (slug.endsWith("/") ? slug.slice(0, -1) : slug) : "";
  let visible = "";

  if (displaySlug.length >= 60) {
    // Only show the slug, truncate it with ellipsis at the start
    visible = "..." + displaySlug.slice(-60);
  } else if (domain.length + displaySlug.length > 60) {
    // Truncate domain to leave room for full slug
    const maxDomainLength = 60 - displaySlug.length - 3; // 3 for '...'
    const truncatedDomain = maxDomainLength > 0 ? "..." + domain.slice(domain.length - maxDomainLength) : "...";
    visible = truncatedDomain + displaySlug;
  } else {
    visible = domain + displaySlug;
  }
  return visible;
}
