// Tiny API client wrapper used by client-side components.
// All fetches are relative to /api/... and use cookies for auth.
//
// On a 401 (Unauthorized) response from any API endpoint, we automatically
// trigger a session-expired callback that the global app store registers.
// This causes the page to drop the user back to the login screen with a
// clear "your session has expired" message instead of showing "Failed to
// load: Unauthorized" on every individual view the user happens to be on.
//
// COOKIE FALLBACK: some browsers (especially when accessing the dev server
// via the cross-origin HTTPS preview URL) silently refuse to send the
// session cookie on API requests. As a robust fallback, we also send the
// user id via the `Authorization: Bearer <userId>` header. The server's
// getSession() checks the cookie first, then falls back to the header, so
// authentication works even when cookies are completely broken.

export interface FetchError {
  status: number;
  message: string;
  body?: unknown;
}

const SESSION_TOKEN_KEY = "ira_session_token";

/** Store the user id in localStorage after a successful login. */
export function setSessionToken(userId: string) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SESSION_TOKEN_KEY, userId);
    }
  } catch {
    // localStorage may be disabled — silently ignore. The cookie path
    // should still work as the primary auth mechanism.
  }
}

/** Read the stored user id (or null if not set / unavailable). */
export function getSessionToken(): string | null {
  try {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // ignore
  }
  return null;
}

/** Clear the stored user id (called on sign-out). */
export function clearSessionToken() {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // ignore
  }
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
  // Build the headers. If we have a session token in localStorage, send
  // it as an Authorization: Bearer header — this is the fallback for
  // browsers that aren't sending the session cookie.
  const token = getSessionToken();
  const headers: Record<string, string> = {
    ...(init?.body ? { "Content-Type": "application/json" } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    ...init,
    headers,
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
