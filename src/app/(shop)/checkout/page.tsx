import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";

import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getSessionUser } from "@/lib/auth";
import { getCartSummary } from "@/lib/cart";
import { getCustomsTaxRateBps } from "@/lib/store-settings";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [summary, user, query, customsTaxRateBps] = await Promise.all([
    getCartSummary(),
    getSessionUser(),
    searchParams,
    getCustomsTaxRateBps(),
  ]);
  if (!summary.items.length) redirect("/cart?error=empty");

  const items = summary.items.map((item) => ({
    id: item.id,
    name: item.product.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <p className="font-bold uppercase tracking-widest text-blue-700">Compra segura</p>
      <h1 className="mt-2 text-5xl font-black">Checkout</h1>
      {query.error && (
        <p role="alert" className="mt-6 rounded-2xl bg-red-50 p-4 text-red-700">
          No pudimos crear el pedido. Revisa los datos, el destino y la disponibilidad.
        </p>
      )}
      <CheckoutForm checkoutToken={randomUUID()} items={items} user={user} customsTaxRateBps={customsTaxRateBps} />
    </main>
  );
}
