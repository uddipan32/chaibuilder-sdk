export const removeBraces = (str: string) => {
  const trimmed = str.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed.slice(1, -1).trim();
  }
  return str;
};
