import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { calculateTotals } from "@/lib/pricing";

export const CART_COOKIE = "viccs_cart";
const CART_MAX_AGE = 60 * 60 * 24 * 30;

export async function readCart() {
  const token = (await cookies()).get(CART_COOKIE)?.value;
  if (!token) return null;
  return db.cart.findFirst({
    where: { token, status: "ACTIVE", expiresAt: { gt: new Date() } },
    include: { items: { include: { product: { include: { brand: true } } }, orderBy: { product: { name: "asc" } } } },
  });
}

export async function getOrCreateCart(userId?: string) {
  const jar = await cookies();
  const existingToken = jar.get(CART_COOKIE)?.value;
  if (existingToken) {
    const existing = await db.cart.findFirst({ where: { token: existingToken, status: "ACTIVE", expiresAt: { gt: new Date() } } });
    if (existing) {
      if (userId && !existing.userId) await db.cart.update({ where: { id: existing.id }, data: { userId } });
      return existing;
    }
  }
  const token = randomBytes(32).toString("base64url");
  const cart = await db.cart.create({ data: { token, userId, expiresAt: new Date(Date.now() + CART_MAX_AGE * 1000) } });
  jar.set(CART_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: CART_MAX_AGE });
  return cart;
}

export async function getCartSummary() {
  const cart = await readCart();
  const items = cart?.items ?? [];
  return { cart, items, ...calculateTotals(items, "ARICA"), count: items.reduce((sum, item) => sum + item.quantity, 0) };
}
