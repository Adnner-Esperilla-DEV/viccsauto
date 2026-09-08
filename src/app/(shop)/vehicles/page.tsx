import type { Metadata } from "next";
import { VehicleCard } from "@/components";
import { listVehicles } from "@/lib/catalog-repository";

export const metadata: Metadata = {
  title: "Vehículos en venta",
  description: "Vehículos seleccionados en Arica con información transparente y atención personalizada.",
};
export const dynamic = "force-dynamic";
export default async function VehiclesPage() {
  const vehicles = await listVehicles();
  return (
    <main className="mx-auto max-w-7xl px-6 py-14">
      <p className="font-bold uppercase tracking-widest text-blue-700">Selección ViccsAuto</p>
      <h1 className="mt-2 text-5xl font-black">Vehículos en venta</h1>
      <p className="mt-4 max-w-2xl text-slate-600">
        Agenda una visita, solicita antecedentes y recibe una cotización personalizada.
      </p>
      {vehicles.length ? (
        <div className="mt-10 grid gap-7 lg:grid-cols-2">
          {vehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      ) : (
        <p className="mt-10 rounded-3xl bg-white p-10">No hay vehículos disponibles por el momento.</p>
      )}
    </main>
  );
}
