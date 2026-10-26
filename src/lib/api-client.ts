// Tiny API client wrapper used by client-side components.
// All fetches are relative to /api/... and use cookies for auth.

export interface FetchError {
  status: number;
  message: string;
  body?: unknown;
}

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
    const message =
      (body && typeof body === "object" && "error" in body && String((body as Record<string, unknown>).error)) ||
      res.statusText ||
      `Request failed (${res.status})`;
    const err: FetchError = { status: res.status, message, body };
    throw err;
  }
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}
