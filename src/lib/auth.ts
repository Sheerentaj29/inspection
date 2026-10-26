// Mock session helper for demo. In production, replace with NextAuth.
// The session is stored in an HTTP-only cookie containing the user's id and role.
// We expose a tiny set of helpers used by API routes and server components.

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { User } from "@prisma/client";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "INSPECTOR";
}

const SESSION_COOKIE = "ems_session";

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed?.id || !parsed?.role) return null;
    return parsed;
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

export async function setSessionCookie(
  cookieStore: ReturnType<typeof cookies> extends Promise<infer T> ? T : ReturnType<typeof cookies>,
  user: SessionUser,
) {
  cookieStore.set(SESSION_COOKIE, JSON.stringify(user), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearSessionCookie(
  cookieStore: ReturnType<typeof cookies> extends Promise<infer T> ? T : ReturnType<typeof cookies>,
) {
  cookieStore.delete(SESSION_COOKIE);
}
