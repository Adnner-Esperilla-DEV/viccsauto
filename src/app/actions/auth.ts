"use server";

import { randomBytes } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, hashToken } from "@/lib/auth";
import { normalizeCustomerPhone } from "@/lib/customer-identity";
import { db } from "@/lib/db";
import { memoryRateLimit } from "@/lib/rate-limit";

const credentials = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(8).max(128) });
const registration = credentials.extend({
  confirmPassword: z.string().min(8).max(128),
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((value) => !value || (normalizeCustomerPhone(value)?.length ?? 0) >= 8)
    .optional(),
});

async function clientKey(scope: string) {
  const h = await headers();
  return `${scope}:${h.get("x-forwarded-for")?.split(",")[0] ?? "local"}`;
}

export async function loginAction(formData: FormData) {
  const allowed = await memoryRateLimit.consume(await clientKey("login"), 8, 15 * 60_000);
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!allowed || !parsed.success) redirect("/auth/login?error=credentials");
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || user.status !== "ACTIVE") redirect("/auth/login?error=credentials");
  const valid = await compare(parsed.data.password, user.passwordHash);
  if (!valid) redirect("/auth/login?error=credentials");
  await createSession(user);
  redirect(user.role === "ADMIN" || user.role === "STAFF" ? "/admin" : "/account");
}

export async function registerAction(formData: FormData) {
  const allowed = await memoryRateLimit.consume(await clientKey("register"), 5, 60 * 60_000);
  const parsed = registration.safeParse(Object.fromEntries(formData));
  if (!allowed || !parsed.success) redirect("/auth/new-account?error=invalid");
  if (parsed.data.password !== parsed.data.confirmPassword) redirect("/auth/new-account?error=password-match");
  const { password, confirmPassword, ...profile } = parsed.data;
  void confirmPassword;
  const phoneNormalized = normalizeCustomerPhone(profile.phone);
  const [byEmail, byPhone] = await Promise.all([
    db.user.findUnique({ where: { email: profile.email } }),
    phoneNormalized ? db.user.findUnique({ where: { phoneNormalized } }) : null,
  ]);
  if (byEmail && byPhone && byEmail.id !== byPhone.id) redirect("/auth/new-account?error=unavailable");
  const existing = byEmail ?? byPhone;
  if (existing && (existing.role !== "CUSTOMER" || existing.status !== "POS_ONLY"))
    redirect("/auth/new-account?error=unavailable");

  const passwordHash = await hash(password, 12);
  const user = existing
    ? await db.user.update({
        where: { id: existing.id },
        data: { ...profile, phone: profile.phone || null, phoneNormalized, passwordHash, status: "ACTIVE" },
      })
    : await db.user.create({
        data: { ...profile, phone: profile.phone || null, phoneNormalized, passwordHash },
      });
  await createSession(user);
  redirect("/products?welcome=1");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function requestPasswordResetAction(formData: FormData) {
  const parsed = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (parsed.success && (await memoryRateLimit.consume(await clientKey("reset"), 4, 60 * 60_000))) {
    const user = await db.user.findUnique({ where: { email: parsed.data } });
    if (user) {
      const token = randomBytes(32).toString("base64url");
      await db.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 30 * 60_000) },
      });
      if (process.env.NODE_ENV === "development")
        console.info(`[password reset sandbox] token generated for ${user.id}`);
    }
  }
  redirect("/auth/forgot-password?sent=1");
}
