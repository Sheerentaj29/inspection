// Tiny API client wrapper used by client-side components.
// All fetches are relative to /api/... and use cookies for auth.
//
// On a 401 (Unauthorized) response from any API endpoint, we automatically
// trigger a session-expired callback that the global app store registers.
// This causes the page to drop the user back to the login screen with a
// clear "your session has expired" message instead of showing "Failed to
// load: Unauthorized" on every individual view the user happens to be on.

export interface FetchError {
  status: number;
  message: string;
  body?: unknown;
}

// Global hook called whenever any API request returns 401.
// Registered by src/app/page.tsx via registerUnauthorizedHandler.
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(fn: UnauthorizedHandler) {
  unauthorizedHandler = fn;
  return () => {
    if (unauthorizedHandler === fn) unauthorizedHandler = null;
  };
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

    // On 401 from any non-/api/auth route (so we don't loop on the login
    // POST itself), fire the unauthorized handler so the global store
    // clears the user state and shows the login screen.
    if (res.status === 401 && !path.startsWith("/api/auth")) {
      try {
        unauthorizedHandler?.();
      } catch {
        // Ignore handler errors — don't mask the original 401.
      }
    }
    throw err;
  }
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}
