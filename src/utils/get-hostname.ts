export function getCleanHostname(hostname: string) {
  return hostname
    .replace("%3A", ":")
    .replace("%2E", ".")
    .replace(/^www\./, "");
}

//TODO: Add tests for this function
