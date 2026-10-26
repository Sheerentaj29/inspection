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
// FALLBACK: if the cookie isn't being sent (which happens on the preview URL
// in some browsers due to cross-origin cookie restrictions), the client
// also sends the same user id via an `Authorization: Bearer <userId>` header.
// getSession() checks the cookie first, then the Authorization header, so
// authentication works even when cookies are completely broken.

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

function isValidUserIdShape(raw: string): boolean {
  // CUIDs are 20-30 chars, alphanumeric. Reject anything that doesn't
  // look like a valid cuid to avoid hitting the DB with junk.
  return /^[a-z0-9]{20,30}$/i.test(raw);
}

async function lookupUser(userId: string): Promise<SessionUser | null> {
  if (!isValidUserIdShape(userId)) return null;
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
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

/**
 * Read the session. Checks the cookie first, then falls back to the
 * Authorization: Bearer <userId> header (used when cookies are broken
 * in the user's browser, e.g. cross-origin on the preview URL).
 */
export async function getSession(req?: NextRequest): Promise<SessionUser | null> {
  // 1. Try the cookie first (preferred path).
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(SESSION_COOKIE)?.value;
  if (rawCookie && rawCookie.length > 0) {
    // Reject obviously-stale cookies from older builds (URL-encoded JSON).
    if (!rawCookie.startsWith("%7B") && !rawCookie.startsWith("{")) {
      const user = await lookupUser(rawCookie);
      if (user) return user;
    }
  }

  // 2. Fall back to Authorization: Bearer <userId> header. This is the
  //    backup path for browsers that aren't accepting/sending the cookie
  //    (e.g. cross-origin on the preview URL, strict privacy mode, etc.).
  if (req) {
    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      const token = authHeader.slice(7).trim();
      const user = await lookupUser(token);
      if (user) return user;
    }
  }

  return null;
}

export async function getCurrentUser(req?: NextRequest): Promise<User | null> {
  const session = await getSession(req);
  if (!session) return null;
  return db.user.findUnique({ where: { id: session.id } });
}

export async function requireSession(req?: NextRequest): Promise<SessionUser> {
  const s = await getSession(req);
  if (!s) {
    throw new Error("Unauthorized");
  }
  return s;
}

export async function requireAdmin(req?: NextRequest): Promise<SessionUser> {
  const s = await requireSession(req);
  if (s.role !== "ADMIN") {
    throw new Error("Forbidden — administrator role required");
  }
  return s;
}

type CookieStore = Awaited<ReturnType<typeof cookies>>;

export function setSessionCookie(cookieStore: CookieStore, userId: string) {
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  // Also clear any stale legacy cookie so it stops being sent.
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
