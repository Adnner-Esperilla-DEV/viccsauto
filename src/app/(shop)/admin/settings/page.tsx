import { updateCommerceSettingsAction } from "@/app/actions/settings";
import { requireStaff } from "@/lib/auth";
import { getCustomsTaxRateBps } from "@/lib/store-settings";

export const dynamic = "force-dynamic";

export default async function CommerceSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireStaff();
  const [rateBps, query] = await Promise.all([getCustomsTaxRateBps(), searchParams]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <p className="font-bold uppercase tracking-widest text-blue-700">Administración</p>
      <h1 className="mt-2 text-4xl font-black">Configuración de ventas</h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        Configura el porcentaje estimado que se agrega a compras enviadas fuera de Arica e Iquique.
      </p>
      {query.ok && (
        <p className="mt-6 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">
          Configuración actualizada correctamente.
        </p>
      )}
      {query.error && (
        <p role="alert" className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-700">
          Ingresa un porcentaje válido entre 0 y 100.
        </p>
      )}

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <h2 className="text-2xl font-black">Tributos de internación</h2>
        <p className="mt-2 text-sm text-slate-500">
          Se usa como estimación sobre el subtotal. Los pedidos ya creados conservan el monto aplicado.
        </p>
        <form
          action={updateCommerceSettingsAction}
          className="mt-6 grid gap-5 sm:grid-cols-[minmax(0,260px)_auto] sm:items-end"
        >
          <label className="text-sm font-bold">
            Porcentaje estimado
            <span className="relative mt-2 block">
              <input
                required
                name="customsTaxRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                defaultValue={(rateBps / 100).toFixed(2)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 pr-12 text-lg outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">
                %
              </span>
            </span>
          </label>
          <button className="rounded-full bg-blue-700 px-7 py-3 font-bold text-white transition hover:bg-blue-800">
            Guardar configuración
          </button>
        </form>
        <div className="mt-7 grid gap-3 border-t pt-6 text-sm sm:grid-cols-3">
          <div className="rounded-2xl bg-emerald-50 p-4">
            <b className="block text-emerald-800">Arica</b>
            <span>Venta presencial sin envío ni IVA/tributos adicionales; despacho online gratuito.</span>
          </div>
          <div className="rounded-2xl bg-blue-50 p-4">
            <b className="block text-blue-800">Iquique</b>
            <span>Sin tributos adicionales; transporte por pagar en destino.</span>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4">
            <b className="block text-amber-800">Resto de Chile</b>
            <span>Aplica el porcentaje configurado; transporte por pagar en destino.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
