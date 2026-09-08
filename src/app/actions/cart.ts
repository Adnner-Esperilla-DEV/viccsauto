"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getOrCreateCart, readCart } from "@/lib/cart";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const itemSchema = z.object({ productId: z.string().min(1), quantity: z.coerce.number().int().min(1).max(25) });

export async function addToCartAction(formData: FormData) {
  const parsed = itemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/products?error=invalid-item");
  const product = await db.product.findFirst({ where: { id: parsed.data.productId, isActive: true } });
  if (!product || product.stock < parsed.data.quantity) redirect(`/products?error=stock`);
  const user = await getSessionUser();
  const cart = await getOrCreateCart(user?.id);
  const current = await db.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId: product.id } },
  });
  const quantity = (current?.quantity ?? 0) + parsed.data.quantity;
  if (quantity > product.stock || quantity > 25) redirect(`/product/${product.slug}?error=stock`);
  await db.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId: product.id } },
    update: { quantity, unitPrice: product.price },
    create: { cartId: cart.id, productId: product.id, quantity, unitPrice: product.price },
  });
  revalidatePath("/cart");
  redirect("/cart?added=1");
}

export async function updateCartItemAction(formData: FormData) {
  const parsed = z
    .object({ itemId: z.string(), quantity: z.coerce.number().int().min(0).max(25) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/cart?error=quantity");
  const cart = await readCart();
  const item = cart?.items.find((candidate) => candidate.id === parsed.data.itemId);
  if (!cart || !item) redirect("/cart?error=item");
  if (parsed.data.quantity === 0) await db.cartItem.delete({ where: { id: item.id } });
  else {
    const product = await db.product.findUnique({ where: { id: item.productId } });
    if (!product || product.stock < parsed.data.quantity) redirect("/cart?error=stock");
    await db.cartItem.update({
      where: { id: item.id },
      data: { quantity: parsed.data.quantity, unitPrice: product.price },
    });
  }
  revalidatePath("/cart");
  redirect("/cart");
}

export async function removeCartItemAction(formData: FormData) {
  const id = z.string().safeParse(formData.get("itemId"));
  const cart = await readCart();
  if (id.success && cart?.items.some((item) => item.id === id.data))
    await db.cartItem.delete({ where: { id: id.data } });
  revalidatePath("/cart");
  redirect("/cart");
}
