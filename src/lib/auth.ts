// Mock session helper for demo. In production, replace with NextAuth.
//
// The session is stored in an HTTP-only cookie containing just the user's id.
// On every request, getSession() looks up the user in the database to verify
// they still exist and are active — this means a stale/tampered cookie is
// useless and deleted/disabled users are immediately signed out.
//
// Storing just the id keeps the cookie value tiny (a single cuid string,
// ~25 chars) and avoids any browser/proxy issues with JSON special chars.

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

const SESSION_COOKIE = "ems_session";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw || raw.length === 0) return null;
  // Reject obviously-stale cookies from older builds (URL-encoded JSON).
  // Those values start with "%7B" (URL-encoded "{") or "{" — never accept
  // them as a user id, otherwise the DB lookup fails and we return null.
  if (raw.startsWith("%7B") || raw.startsWith("{")) return null;
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

/**
 * Detect whether the incoming request is HTTPS (either direct TLS or via
 * a proxy that set X-Forwarded-Proto). The Secure cookie flag must be set
 * for browsers to accept the cookie on HTTPS preview URLs; without it,
 * Chrome/Safari silently reject the cookie and the session never persists.
 */
function isHttpsRequest(req?: NextRequest): boolean {
  if (!req) return false;
  // Next.js URL protocol (works for direct HTTPS or HTTPS-prefixed proxy)
  if (req.nextUrl?.protocol === "https:") return true;
  // Caddy / Nginx / load balancer forward the original protocol here
  const fwdProto = req.headers.get("x-forwarded-proto");
  if (fwdProto === "https") return true;
  return false;
}

export function setSessionCookie(
  cookieStore: CookieStore,
  userId: string,
  req?: NextRequest,
) {
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    // Set Secure when the request is HTTPS so browsers accept the cookie
    // on HTTPS preview URLs. On http://localhost, leave it unset so the
    // browser accepts it on plain HTTP too.
    secure: isHttpsRequest(req),
  });
}

export function clearSessionCookie(cookieStore: CookieStore) {
  cookieStore.delete(SESSION_COOKIE);
}
