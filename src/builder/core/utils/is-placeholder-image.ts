import { startsWith } from "lodash-es";

/**
 * Checks if a given image URL should be treated as a placeholder image.
 * This includes missing URLs (null, undefined, or empty strings), base64 SVG placeholders,
 * and common placeholder services like placehold.co.
 * @param url The image URL to check
 * @returns true if the image is a placeholder or no URL was provided, false otherwise
 */
export const isPlaceholderImage = (url: string | undefined | null): boolean => {
  if (!url) return true;

  // Check for base64 SVG placeholders
  if (startsWith(url, "data:image/svg+xml;base64")) return true;

  // Check for known placeholder services
  if (url.includes("placehold.co")) return true;

  return false;
};
