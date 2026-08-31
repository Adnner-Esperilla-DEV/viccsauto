<<<<<<< HEAD
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";
export default async function OrdersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");
  const orders = await db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return <main className="mx-auto max-w-5xl px-6 py-14"><p className="font-bold uppercase tracking-widest text-blue-700">Mi cuenta</p><h1 className="mt-2 text-5xl font-black">Mis pedidos</h1>{orders.length ? <div className="mt-10 space-y-4">{orders.map((order) => <Link key={order.id} href={`/orders/${order.id}`} className="grid gap-3 rounded-3xl border bg-white p-6 transition hover:border-blue-300 sm:grid-cols-4"><div><span className="text-xs text-slate-500">Pedido</span><strong className="block">{order.number}</strong></div><div><span className="text-xs text-slate-500">Fecha</span><strong className="block">{order.createdAt.toLocaleDateString("es-CL")}</strong></div><div><span className="text-xs text-slate-500">Estado</span><strong className="block">{order.status}</strong></div><div className="sm:text-right"><span className="text-xs text-slate-500">Total</span><strong className="block">{formatPrice(order.total)}</strong></div></Link>)}</div> : <div className="mt-10 rounded-3xl bg-white p-10 text-center"><h2 className="text-2xl font-black">Aún no tienes pedidos</h2><Link href="/products" className="mt-5 inline-flex font-bold text-blue-700">Explorar catálogo →</Link></div>}</main>;
=======
export default function OrdersPage() {
  return (
    <div>
      <h1>OrdersPage</h1>
    </div>
  );
>>>>>>> 833a45fadf50e643868084efb4a23165db1b06fb
}
