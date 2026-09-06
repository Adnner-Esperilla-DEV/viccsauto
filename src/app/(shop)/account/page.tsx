import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser, isStaff } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");
  if (isStaff(user)) redirect("/admin");
  const [orders, imports] = await Promise.all([db.order.count({ where: { userId: user.id } }), db.vehicleImport.count({ where: { customerId: user.id } })]);
  return <main className="mx-auto max-w-5xl px-6 py-12"><p className="font-bold uppercase tracking-widest text-blue-700">Mi cuenta</p><h1 className="mt-2 text-4xl font-black">Hola, {user.firstName}</h1><p className="mt-2 text-slate-600">Consulta tus compras y sigue tus importaciones.</p><div className="mt-8 grid gap-5 sm:grid-cols-2"><Link href="/imports" className="rounded-3xl border bg-white p-7 shadow-sm transition hover:border-blue-300"><p className="text-sm font-bold uppercase text-blue-700">Logística</p><h2 className="mt-2 text-2xl font-black">Mis importaciones</h2><p className="mt-2 text-slate-500">{imports} {imports === 1 ? "importación asignada" : "importaciones asignadas"}</p></Link><Link href="/orders" className="rounded-3xl border bg-white p-7 shadow-sm transition hover:border-blue-300"><p className="text-sm font-bold uppercase text-blue-700">Compras</p><h2 className="mt-2 text-2xl font-black">Mis pedidos</h2><p className="mt-2 text-slate-500">{orders} {orders === 1 ? "pedido" : "pedidos"}</p></Link></div></main>;
}
