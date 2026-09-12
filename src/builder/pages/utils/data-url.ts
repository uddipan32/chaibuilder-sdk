/**
 * Convert a `data:` URL to a Blob so it can ride the multipart upload transport
 * instead of being re-sent as base64 inside JSON. Canvas-based flows (the image
 * editor) hand us data URLs, and an edited PNG is easily several megabytes.
 */
export const dataUrlToBlob = (dataUrl: string): Blob => {
  const [header, payload] = dataUrl.split(",");
  const mimeType = header.match(/^data:([^;]+)/)?.[1] ?? "application/octet-stream";
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
};

/** True for strings that are `data:` URLs rather than http(s) links. */
export const isDataUrl = (value: string): boolean => value.startsWith("data:");
