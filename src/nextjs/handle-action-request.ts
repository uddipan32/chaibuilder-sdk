import { ActionError } from "~/server/chai-actions/action-error";
import { toActionErrorPayload } from "~/server/chai-actions/action-result";
import type { HttpChaiActionBody } from "~/server/chai-builder/handle-http-action";
import { isMultipartActionRequest, parseMultipartActionBody } from "~/server/chai-builder/parse-multipart-action";

type ChaiHttpActionHandler = (body: HttpChaiActionBody) => Response | Promise<Response>;

/**
 * Parse a Next.js action request and dispatch it through the request-scoped
 * ChaiBuilder instance. File actions use multipart; ordinary actions use JSON.
 */
export async function handleChaiActionRequest(
  request: Request,
  handleHttpAction: ChaiHttpActionHandler,
): Promise<Response> {
  try {
    let body: HttpChaiActionBody;
    if (isMultipartActionRequest(request)) {
      body = await parseMultipartActionBody(request);
    } else {
      try {
        body = (await request.json()) as HttpChaiActionBody;
      } catch {
        throw new ActionError("Malformed JSON request body", "BAD_REQUEST", 400);
      }
    }

    return await handleHttpAction(body);
  } catch (error) {
    const payload = toActionErrorPayload(error);
    return Response.json({ ok: false, error: payload }, { status: payload.status });
  }
}
