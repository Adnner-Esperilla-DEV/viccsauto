<<<<<<< HEAD
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default async function AdminPage() { await requireStaff(); const [sales, orders, customers, vehicles, lowStock, recent] = await Promise.all([db.order.aggregate({ where: { paymentStatus: "PAID" }, _sum: { total: true } }), db.order.count(), db.user.count({ where: { role: "CUSTOMER" } }), db.vehicle.count({ where: { status: "AVAILABLE" } }), db.product.count({ where: { isActive: true, stock: { lte: 3 } } }), db.auditLog.findMany({ take: 8, orderBy: { createdAt: "desc" }, include: { user: true } })]); const cards = [["Ventas pagadas", formatPrice(sales._sum.total ?? 0)], ["Pedidos", orders], ["Clientes", customers], ["Vehículos disponibles", vehicles], ["Stock bajo", lowStock]]; return <main className="mx-auto max-w-7xl px-6 py-10"><h1 className="text-4xl font-black">Resumen operativo</h1><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{cards.map(([label, value]) => <div key={label} className="rounded-3xl bg-white p-6 shadow-sm"><span className="text-sm text-slate-500">{label}</span><strong className="mt-2 block text-2xl">{value}</strong></div>)}</div><section className="mt-8 rounded-3xl bg-white p-7"><h2 className="text-2xl font-black">Actividad administrativa</h2>{recent.length ? <ul className="mt-4 divide-y">{recent.map((log) => <li key={log.id} className="py-3 text-sm"><b>{log.action}</b> en {log.entity} · {log.user?.email ?? "sistema"}<span className="float-right text-slate-500">{log.createdAt.toLocaleString("es-CL")}</span></li>)}</ul> : <p className="mt-4 text-slate-500">Aún no hay actividad registrada.</p>}</section></main>; }
=======
export default function AdminPage() {
  return (
    <div>
      <h1>AdminPage</h1>
    </div>
  );
}
>>>>>>> 833a45fadf50e643868084efb4a23165db1b06fb
