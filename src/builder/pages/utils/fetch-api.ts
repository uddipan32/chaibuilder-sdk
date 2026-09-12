/**
 * A `data.file` holding a File/Blob is sent as multipart instead of JSON: base64
 * in JSON inflates the payload by about a third and forces the whole file
 * through a string, which is wasteful once uploads are video-sized. The server
 * route parses both shapes into the same action body.
 */
const asMultipartBody = (body: { action: string; data?: any }): FormData => {
  const { file, ...meta } = body.data as { file: Blob; [key: string]: unknown };
  const form = new FormData();
  form.append("action", body.action);
  form.append("meta", JSON.stringify(meta));
  // A bare Blob has no name; fall back to the caller's `name` field so the server
  // can still resolve an extension.
  form.append("file", file, file instanceof File ? file.name : String(meta.name ?? "upload"));
  return form;
};

export const fetchAPI = async (
  apiUrl: string,
  body: { action: string; data?: any },
  headers: Record<string, string> = {},
  options?: { signal?: AbortSignal },
) => {
  const isMultipart = typeof Blob !== "undefined" && body.data?.file instanceof Blob;

  return await fetch(apiUrl, {
    method: "POST",
    headers: {
      // Content-Type is omitted for multipart so the browser adds the boundary.
      ...(isMultipart ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    body: isMultipart ? asMultipartBody(body) : JSON.stringify(body),
    ...(options?.signal instanceof AbortSignal ? { signal: options.signal } : {}),
  });
};
