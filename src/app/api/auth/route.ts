// POST /api/auth/login  - login with email + password
// POST /api/auth/logout - clear session
// GET  /api/auth/me     - get current session

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { setSessionCookie, clearSessionCookie, getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

function hashPassword(pw: string) {
  return createHash("sha256").update(pw).digest("hex");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !body.email || !body.password) {
    return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
  }
  const user = await db.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (!user || user.passwordHash !== hashPassword(body.password)) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  if (!user.active) {
    return NextResponse.json({ error: "Account disabled" }, { status: 403 });
  }
  const cookieStore = await cookies();
  await setSessionCookie(cookieStore, {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as "ADMIN" | "INSPECTOR",
  });
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
    role: user.role,
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
