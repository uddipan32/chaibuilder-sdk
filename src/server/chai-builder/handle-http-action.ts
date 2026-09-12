import { has } from "lodash-es";
import { getFrameworkAdapter } from "~/server/framework-adapter";
import {
  isStreamingChaiAction,
  toActionErrorPayload,
  type ChaiActionFailure,
  type ChaiActionSuccess,
} from "~/server/chai-actions/action-result";
import { dispatchChaiAction } from "~/server/chai-actions/dispatch-action";
import {
  createStreamingErrorResponse,
  formatStreamingError,
  isMissingTextStream,
} from "~/server/chai-actions/streaming-error-handlers";
import { warmPublishedPagesCache } from "~/server/chai-builder/public/warm-published-pages-cache";
import { getInitializedStateWithUser } from "~/server/chai-builder/state";
import { runChaiResponseDecorators } from "~/server/plugin-api/response-decorator";

export type HttpChaiActionBody = {
  action: string;
  data?: unknown;
};

export type HandleHttpChaiActionOptions = {
  catchAllRoute?: string[];
};

function collectRevalidationTags(response: unknown): string[] {
  if (!response) return [];

  if (Array.isArray(response)) {
    return response.flatMap((item) =>
      item && typeof item === "object" && "tags" in item && Array.isArray(item.tags) ? item.tags : [],
    );
  }

  if (has(response, "tags")) {
    const { tags } = response as { tags?: string[] };
    return tags ?? [];
  }

  return [];
}

function collectRevalidationPaths(response: unknown): string[] {
  if (!response || typeof response !== "object" || !("paths" in response)) {
    return [];
  }

  const { paths } = response as { paths?: string[] };
  return paths ?? [];
}

async function handleCacheRevalidation(response: unknown, catchAllRoute?: string[]): Promise<void> {
  const { invalidatePath, invalidateTag } = getFrameworkAdapter();
  const tags = collectRevalidationTags(response);
  const paths = collectRevalidationPaths(response);

  if (tags.length === 0 && !paths?.length) {
    return;
  }

  const revalidateTagFn = (tag: string) => (invalidateTag.length >= 2 ? invalidateTag(tag, "max") : invalidateTag(tag));

  const invalidations: Array<void | Promise<void>> = [];

  if (tags.some((tag) => tag.startsWith("website-settings-"))) {
    invalidations.push(
      ...(catchAllRoute?.map((route) => invalidatePath(route, "layout")) ?? []),
      revalidateTagFn("website-settings"),
    );
  }

  if (tags.length) {
    invalidations.push(...tags.map(revalidateTagFn));
  }

  if (paths?.length) {
    invalidations.push(...paths.map((path) => invalidatePath(path)));
  }

  if (invalidations.length) {
    await Promise.all(invalidations);
  }
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function withExtras<T extends object>(body: T, extras: Record<string, unknown>): T {
  return Object.keys(extras).length > 0 ? { ...extras, ...body } : body;
}

function httpActionErrorResponse(action: string, error: unknown, extras: Record<string, unknown>): Response {
  const payload = toActionErrorPayload(error);

  if (isStreamingChaiAction(action)) {
    const errorMessage = formatStreamingError({
      code: payload.code,
      message: payload.message,
      statusCode: payload.status,
    });
    return createStreamingErrorResponse(payload.code, errorMessage);
  }

  const body: ChaiActionFailure = { ok: false, error: payload };
  return jsonResponse(withExtras(body, extras), payload.status);
}

function httpActionSuccessResponse(data: unknown, extras: Record<string, unknown>): Response {
  const body: ChaiActionSuccess<unknown> = { ok: true, data };
  return jsonResponse(withExtras(body, extras), 200);
}

export async function handleHttpAction(
  body: HttpChaiActionBody,
  options: HandleHttpChaiActionOptions = {},
): Promise<Response> {
  const { catchAllRoute = ["/(public)/[[...slug]]"] } = options;
  const { action, data } = body;

  // Plugin response decorators. Resolved concurrently with the action so their occasional inline work
  // overlaps with the action instead of adding to it. Never gates the action.
  const extrasPromise = runChaiResponseDecorators().catch(() => ({}) as Record<string, unknown>);
  try {
    const result = await dispatchChaiAction(action, data);

    if (result && typeof result === "object" && "_streamingResponse" in result && "_streamResult" in result) {
      const streamingResult = result as {
        _streamResult?: {
          textStream?: ReadableStream;
          dataStream?: Response;
          isDataStream?: boolean;
        };
      };

      if (streamingResult._streamResult?.isDataStream) {
        if (!streamingResult._streamResult.dataStream) {
          return httpActionErrorResponse(
            action,
            {
              code: "NO_STREAM",
              message: "No streaming response available. Please try again.",
              status: 500,
            },
            await extrasPromise,
          );
        }
        return streamingResult._streamResult.dataStream;
      }

      if (isMissingTextStream(streamingResult)) {
        return httpActionErrorResponse(
          action,
          {
            code: "NO_STREAM",
            message: "No streaming response available. Please try again.",
            status: 500,
          },
          await extrasPromise,
        );
      }

      return new Response(streamingResult._streamResult!.textStream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      });
    }

    await handleCacheRevalidation(result, catchAllRoute);

    const revalidationTags = collectRevalidationTags(result);
    const revalidationPaths = collectRevalidationPaths(result);
    if (action === "PUBLISH_CHANGES" && (revalidationTags.length > 0 || revalidationPaths.length > 0)) {
      const { appId, siteUrl } = getInitializedStateWithUser();
      getFrameworkAdapter().runAfterResponse(() =>
        warmPublishedPagesCache({
          appId,
          siteUrl,
          tags: revalidationTags,
          paths: revalidationPaths,
        }),
      );
    }

    return httpActionSuccessResponse(result, await extrasPromise);
  } catch (error) {
    return httpActionErrorResponse(action, error, await extrasPromise);
  }
}
