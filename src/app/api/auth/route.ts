// POST /api/auth/login  - login with email + password
// POST /api/auth/logout - clear session
// GET  /api/auth/me     - get current session

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { setSessionCookie, clearSessionCookie, getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import type { UserRole } from "@/lib/auth";

function hashPassword(pw: string) {
  return createHash("sha256").update(pw).digest("hex");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !body.email || !body.password) {
    return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
  }
  const user = await db.user.findUnique({ where: { email: String(body.email).toLowerCase() } });
  if (!user || user.passwordHash !== hashPassword(String(body.password))) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  if (!user.active) {
    return NextResponse.json({ error: "Account disabled" }, { status: 403 });
  }

  // Set the session cookie BEFORE recording the audit log and BEFORE
  // constructing the response. The cookie must be queued on the outgoing
  // response before NextResponse.json() is returned.
  // Pass `req` so the helper can detect HTTPS (X-Forwarded-Proto) and
  // set the Secure flag — without it, browsers reject the cookie on the
  // HTTPS preview URL and the session never persists.
  const cookieStore = await cookies();
  setSessionCookie(cookieStore, user.id, req);

  await recordAudit({
    userId: user.id,
    userName: user.name,
    action: "LOGIN",
    entity: "User",
    entityId: user.id,
    details: `User ${user.email} logged in`,
  });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
  });
}

export async function DELETE() {
  const session = await getSession();
  const cookieStore = await cookies();
  if (session) {
    await recordAudit({
      userId: session.id,
      userName: session.name,
      action: "LOGOUT",
      entity: "User",
      entityId: session.id,
    });
  }
  clearSessionCookie(cookieStore);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null });
  return NextResponse.json({ user: session });
}
