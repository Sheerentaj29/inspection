// Mock session helper for demo. In production, replace with NextAuth.
//
// The session is stored in an HTTP-only cookie containing just the user's id.
// On every request, getSession() looks up the user in the database to verify
// they still exist and are active — this means a stale/tampered cookie is
// useless and deleted/disabled users are immediately signed out.
//
// Storing just the id keeps the cookie value tiny (a single cuid string,
// ~25 chars) and avoids any browser/proxy issues with JSON special chars.
//
// IMPORTANT: cookie name is `ira_session_v2`. The previous build used
// `ems_session` with a URL-encoded JSON value — some browsers retain that
// stale cookie and it interferes with the new clean user-id value. Renaming
// the cookie sidesteps the conflict: the old `ems_session` cookie is simply
// ignored by the new code (and gets cleared on the next successful login).

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { User } from "@prisma/client";
import type { NextRequest } from "next/server";

export type UserRole = "ADMIN" | "INSPECTOR" | "APPROVER";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// Cookie name bumped to v2 so it never collides with stale cookies from
// older builds of this app (which used a different name + value format).
const SESSION_COOKIE = "ira_session_v2";
// Legacy cookie name from previous build — cleared on next login so it
// doesn't keep being sent and confusing the server.
const LEGACY_COOKIE = "ems_session";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw || raw.length === 0) return null;
  // Reject obviously-stale cookies from older builds (URL-encoded JSON).
  // Those values start with "%7B" (URL-encoded "{") or "{" — never accept
  // them as a user id, otherwise the DB lookup fails and we return null.
  if (raw.startsWith("%7B") || raw.startsWith("{")) return null;
  // CUIDs are 24+ chars, alphanumeric. Reject anything that doesn't look
  // like a valid cuid to avoid hitting the DB with junk.
  if (!/^[a-z0-9]{20,30}$/i.test(raw)) return null;
  try {
    const user = await db.user.findUnique({
      where: { id: raw },
      select: { id: true, email: true, name: true, role: true, active: true },
    });
    if (!user || !user.active) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  return db.user.findUnique({ where: { id: session.id } });
}

export async function requireSession(): Promise<SessionUser> {
  const s = await getSession();
  if (!s) {
    throw new Error("Unauthorized");
  }
  return s;
}

export async function requireAdmin(): Promise<SessionUser> {
  const s = await requireSession();
  if (s.role !== "ADMIN") {
    throw new Error("Forbidden — administrator role required");
  }
  return s;
}

type CookieStore = Awaited<ReturnType<typeof cookies>>;

export function setSessionCookie(cookieStore: CookieStore, userId: string) {
  // Set the new clean cookie with just the user id. No Secure flag —
  // SameSite=Lax is accepted by browsers on both HTTP (localhost) and
  // HTTPS (preview URL) without needing Secure. Adding Secure would
  // cause the cookie to be rejected on HTTP.
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  // Also clear any stale legacy cookie so it stops being sent. This is
  // important: if the user's browser has both `ira_session_v2` (new) and
  // `ems_session` (old URL-encoded JSON) cookies, both are sent on each
  // request but the server only reads `ira_session_v2` — so the legacy
  // cookie just adds request bloat. Clearing it keeps things clean.
  try {
    cookieStore.delete(LEGACY_COOKIE);
  } catch {
    // ignore — best-effort cleanup
  }
}

export function clearSessionCookie(cookieStore: CookieStore) {
  cookieStore.delete(SESSION_COOKIE);
  try {
    cookieStore.delete(LEGACY_COOKIE);
  } catch {
    // ignore
  }
}
