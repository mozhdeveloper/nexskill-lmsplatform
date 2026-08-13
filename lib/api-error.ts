import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  ForbiddenError,
  NotFoundError,
  InvalidStateTransitionError,
  ValidationError,
} from "@/lib/domains/identity/permissions";

/**
 * Converts a thrown error into the API's stable response shape (§65):
 * { error: { code, message } }. Unexpected errors are logged server-side with a
 * request ID and never leak stack traces / raw DB errors to the client.
 */
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: 403 });
  }
  if (err instanceof NotFoundError) {
    return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: 404 });
  }
  if (err instanceof InvalidStateTransitionError) {
    return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: 409 });
  }
  if (err instanceof ValidationError) {
    return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: 422 });
  }

  const requestId = randomUUID();
  // eslint-disable-next-line no-console
  console.error(`[${requestId}] Unhandled API error:`, err);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again.", requestId } },
    { status: 500 }
  );
}

export function requireAuthResponse(): NextResponse {
  return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });
}
