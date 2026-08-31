import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

const COOKIE_NAME = "viccs_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (value && value.length >= 32) return new TextEncoder().encode(value);
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET debe tener al menos 32 caracteres");
  return new TextEncoder().encode("viccsauto-development-secret-change-me");
}

export type SessionUser = { id: string; email: string; firstName: string; lastName: string; role: string };

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(secret());
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    const user = await db.user.findFirst({ where: { id: payload.sub, status: "ACTIVE" }, select: { id: true, email: true, firstName: true, lastName: true, role: true } });
    return user;
  } catch {
    return null;
  }
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isStaff(user: SessionUser | null) {
  return user?.role === "ADMIN" || user?.role === "STAFF";
}

export async function requireStaff() {
  const user = await getSessionUser();
  if (!isStaff(user)) redirect("/auth/login");
  return user!;
}
