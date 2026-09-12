export type ChaiActionErrorPayload = {
  code: string;
  message: string;
  status: number;
  metadata?: Record<string, unknown>;
};

export type ChaiHttpActionSuccess<T> = { ok: true; data: T };
export type ChaiHttpActionFailure = { ok: false; error: ChaiActionErrorPayload };
export type ChaiHttpActionResponse<T> = ChaiHttpActionSuccess<T> | ChaiHttpActionFailure;

export class ChaiHttpActionRequestError extends Error {
  code: string;
  status: number;
  metadata?: Record<string, unknown>;

  constructor(message: string, code: string, status: number, metadata?: Record<string, unknown>) {
    super(message);
    this.name = "ChaiHttpActionRequestError";
    this.code = code;
    this.status = status;
    this.metadata = metadata;
  }
}

export function isChaiHttpActionFailure(body: unknown): body is ChaiHttpActionFailure {
  return Boolean(body && typeof body === "object" && "ok" in body && (body as ChaiHttpActionFailure).ok === false);
}

export function parseChaiHttpActionResponse<T>(body: unknown, httpStatus: number): T {
  if (body && typeof body === "object" && "ok" in body) {
    const envelope = body as ChaiHttpActionResponse<T>;
    if (!envelope.ok) {
      throw new ChaiHttpActionRequestError(
        envelope.error.message,
        envelope.error.code,
        envelope.error.status,
        envelope.error.metadata,
      );
    }
    return envelope.data;
  }

  throw new ChaiHttpActionRequestError("Invalid action response", "INVALID_RESPONSE", httpStatus);
}
