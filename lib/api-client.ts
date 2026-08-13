"use client";

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/** Thin fetch wrapper that unwraps the API's { error: { code, message } } shape into a thrown ApiError. */
export async function apiFetch<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(body?.error?.code ?? "UNKNOWN", body?.error?.message ?? "Something went wrong.");
  }
  return body as T;
}
