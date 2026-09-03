import { PosSaleForm, type PosProduct } from "@/components/commercial/PosSaleForm";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PosPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requireStaff();
  const { ok } = await searchParams;
  const [inventory, recentSales] = await Promise.all([
    db.inventoryItem.findMany({
      where: { quantity: { gt: 0 }, product: { isActive: true }, location: { isActive: true } },
      include: {
        product: {
          include: {
            brand: true,
            images: { orderBy: { position: "asc" }, take: 1, select: { id: true } },
          },
        },
        location: true,
      },
      orderBy: { product: { name: "asc" } },
    }),
    db.order.findMany({ where: { channel: "POS" }, include: { payments: true }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const products: PosProduct[] = inventory.flatMap((item) => {
    const available = item.quantity - item.reserved;
    return available > 0 ? [{
      inventoryItemId: item.id,
      productId: item.productId,
      sku: item.product.sku,
      name: item.product.name,
      brand: item.product.brand?.name,
      imageId: item.product.images[0]?.id,
      price: item.product.price,
      available,
      location: item.location.name,
    }] : [];
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <p className="font-bold uppercase tracking-widest text-blue-700">Punto de venta</p>
      <h1 className="mt-2 text-4xl font-black">Venta presencial</h1>
      <p className="mt-3 text-slate-600">Registra ventas de mostrador y descuenta el inventario automáticamente.</p>
      {ok && <p className="mt-6 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">Venta {ok} registrada correctamente. El stock ya fue actualizado.</p>}

      <div className="mt-8"><PosSaleForm products={products}/></div>

      <section className="mt-10 rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black">Ventas presenciales recientes</h2>
        {recentSales.length ? <div className="mt-5 divide-y">{recentSales.map((sale) => (
          <article key={sale.id} className="flex flex-wrap items-center gap-4 py-4">
            <div className="mr-auto"><b>{sale.number}</b><small className="block text-slate-500">{sale.customerName} · {sale.createdAt.toLocaleString("es-CL")}</small></div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">{sale.payments[0]?.provider.replace("POS_", "") ?? "PAGADO"}</span>
            <strong>{formatPrice(sale.total)}</strong>
          </article>
        ))}</div> : <p className="mt-4 text-slate-500">Aún no hay ventas presenciales registradas.</p>}
      </section>
    </main>
  );
}
