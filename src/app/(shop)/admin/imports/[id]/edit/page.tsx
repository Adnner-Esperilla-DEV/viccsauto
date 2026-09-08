import Link from "next/link";
import { notFound } from "next/navigation";

import { updateVehicleImportAction } from "@/app/actions/imports";
import { CustomerCombobox, ImportDatePicker, ImportTypeFields, StyledSelect } from "@/components";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { importStatusSteps } from "@/lib/import-status";

export const dynamic = "force-dynamic";
const errors: Record<string, string> = { invalid: "Revisa los datos obligatorios y la compatibilidad de cada repuesto.", payment: "El monto cancelado no puede superar el total de la importación.", customer: "Selecciona un cliente válido.", duplicate: "Ya existe otra importación con ese VIN." };
const hazmatOptions = [{ value: "no", label: "No es HAZMAT" }, { value: "yes", label: "Sí es HAZMAT" }] as const;
const field = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";
const label = "text-sm font-bold text-slate-700";
const optional = <span className="font-normal text-slate-400">(opcional)</span>;

export default async function EditImportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireStaff();
  const { id } = await params;
  const [item, customers, makes, query] = await Promise.all([
    db.vehicleImport.findUnique({ where: { id }, include: { makeRecord: { select: { id: true, name: true } }, modelRecord: { select: { id: true, name: true } }, parts: { orderBy: { position: "asc" }, include: { make: { select: { name: true } }, model: { select: { name: true } } } } } }),
    db.user.findMany({ where: { role: "CUSTOMER", status: { in: ["ACTIVE", "POS_ONLY"] } }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }], select: { id: true, firstName: true, lastName: true, email: true, phone: true } }),
    db.vehicleMake.findMany({ where: { isActive: true, models: { some: { isActive: true } } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    searchParams,
  ]);
  if (!item) notFound();
  const initialMake = item.makeRecord ?? (item.make ? makes.find((make) => make.name.localeCompare(item.make!, "es", { sensitivity: "base" }) === 0) : null) ?? null;
  const initialModel = item.modelRecord ?? (initialMake && item.model ? await db.vehicleModel.findFirst({ where: { makeId: initialMake.id, name: { equals: item.model, mode: "insensitive" } }, select: { id: true, name: true } }) : null);
  const title = item.importType === "PARTS" ? `Repuestos · ${item.referenceCode}` : `${item.year} ${item.make} ${item.model} · VIN ${item.vin}`;
  return <main className="mx-auto max-w-6xl px-6 py-10">
    <Link href={`/admin/imports/${item.id}`} className="text-sm font-bold text-blue-700">← Cancelar y volver</Link><h1 className="mt-5 text-4xl font-black">Editar importación</h1><p className="mt-2 text-slate-600">{title}</p>
    {query.error && <p role="alert" className="mt-5 rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{errors[query.error] ?? errors.invalid}</p>}
    <form action={updateVehicleImportAction} className="mt-8 grid gap-6"><input type="hidden" name="id" value={item.id}/>
      <section className="grid gap-4 rounded-3xl bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-3"><h2 className="text-xl font-black sm:col-span-2 lg:col-span-3">Cliente y carga</h2><CustomerCombobox customers={customers} initialCustomerId={item.customerId}/><label className={label}>N.º de lote {optional}<input name="lotNumber" defaultValue={item.lotNumber ?? ""} className={field}/></label><label className={label}>Tipo de carga {optional}<input name="loadType" defaultValue={item.loadType ?? ""} className={field}/></label><label className={`${label} sm:col-span-2`}>Puerto o destino {optional}<input name="destinationPort" defaultValue={item.destinationPort ?? ""} className={field}/></label><ImportDatePicker initialValue={item.receivedDate?.toISOString().slice(0, 10) ?? ""}/><StyledSelect name="hazmat" label="Carga peligrosa (HAZMAT)" defaultValue={item.hazmat ? "yes" : "no"} options={hazmatOptions}/><StyledSelect name="status" label="Estado de seguimiento" defaultValue={item.status} options={importStatusSteps}/></section>
      <ImportTypeFields lockType makes={makes} initialType={item.importType as "VEHICLE" | "PARTS"} initialVehicle={{ vin: item.vin ?? "", year: item.year ?? undefined, color: item.color ?? "", weightKg: item.weightKg, fuel: item.fuel, keyStatus: item.keyStatus, titleStatus: item.titleStatus, titleNumber: item.titleNumber, titleState: item.titleState, scheduleB: item.scheduleB, make: initialMake, model: initialModel }} initialParts={item.parts.map((part) => ({ id: part.id, description: part.description, partNumber: part.partNumber, partBrand: part.partBrand ?? "", quantity: part.quantity, unitValueUsd: part.unitValueUsd.toString(), weightKg: part.weightKg?.toString() ?? "", makeId: part.makeId, makeName: part.make.name, modelId: part.modelId, modelName: part.model.name, yearFrom: part.yearFrom, yearTo: part.yearTo, engine: part.engine ?? "" }))} initialFinance={{ valueUsd: item.valueUsd?.toString() ?? "", towingCostUsd: item.towingCostUsd.toString(), oceanFreightUsd: item.oceanFreightUsd.toString(), shippingCostUsd: item.shippingCostUsd.toString(), logisticsServiceUsd: item.logisticsServiceUsd.toString(), otherChargesUsd: item.otherChargesUsd.toString(), paidAmountUsd: item.paidAmountUsd.toString() }}/>
      <section className="grid gap-4 rounded-3xl bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-3"><div className="sm:col-span-2 lg:col-span-3"><h2 className="text-xl font-black">Datos del embarque</h2></div><label className={label}>Número de contenedor {optional}<input name="containerNumber" defaultValue={item.containerNumber ?? ""} className={field}/></label><label className={label}>Naviera o transportista {optional}<input name="shippingLine" defaultValue={item.shippingLine ?? ""} className={field}/></label><label className={label}>Lugar de llegada {optional}<input name="arrivalPlace" defaultValue={item.arrivalPlace ?? "Iquique, Chile"} className={field}/></label><ImportDatePicker name="departureDate" label="Fecha de embarque" initialValue={item.departureDate?.toISOString().slice(0, 10) ?? ""}/><ImportDatePicker name="arrivalDate" label="Fecha de llegada" initialValue={item.arrivalDate?.toISOString().slice(0, 10) ?? ""}/></section>
      <div className="flex flex-wrap justify-end gap-3"><Link href={`/admin/imports/${item.id}`} className="rounded-2xl border bg-white px-6 py-4 font-bold text-slate-700">Cancelar</Link><button className="rounded-2xl bg-blue-700 px-6 py-4 text-lg font-black text-white shadow-lg hover:bg-blue-800">Guardar cambios</button></div>
    </form>
  </main>;
}
