import Link from "next/link";
import { notFound } from "next/navigation";

import { updateVehicleImportAction } from "@/app/actions/imports";
import { CustomerCombobox, ImportDatePicker, ImportFinanceFields, ImportVehicleSelector, StyledSelect } from "@/components";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { importStatusSteps } from "@/lib/import-status";

export const dynamic = "force-dynamic";
const errors: Record<string, string> = { invalid: "Revisa los datos obligatorios.", payment: "El monto cancelado no puede superar el total de la importación.", customer: "Selecciona un cliente válido.", duplicate: "Ya existe otra importación con ese VIN." };
const hazmatOptions = [{ value: "no", label: "No es HAZMAT" }, { value: "yes", label: "Sí es HAZMAT" }] as const;
const baseFuelOptions = [{ value: "Gasolina", label: "Gasolina" }, { value: "Diésel", label: "Diésel" }, { value: "Híbrido", label: "Híbrido" }, { value: "Eléctrico", label: "Eléctrico" }, { value: "GLP", label: "GLP" }, { value: "GNC", label: "GNC" }, { value: "Otro", label: "Otro" }, { value: "Desconocido", label: "Desconocido" }] as const;
const keyOptions = [{ value: "NO_KEY", label: "Sin llave" }, { value: "UNKNOWN", label: "Desconocido" }, { value: "KEY_PRESENT", label: "Llave disponible" }] as const;
const titleOptions = [{ value: "NO_TITLE", label: "Sin título" }, { value: "PENDING", label: "Pendiente" }, { value: "RECEIVED", label: "Título recibido" }] as const;

export default async function EditImportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireStaff();
  const { id } = await params;
  const [item, customers, makes, query] = await Promise.all([
    db.vehicleImport.findUnique({ where: { id }, include: { makeRecord: { select: { id: true, name: true } }, modelRecord: { select: { id: true, name: true } } } }),
    db.user.findMany({ where: { role: "CUSTOMER", status: { in: ["ACTIVE", "POS_ONLY"] } }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }], select: { id: true, firstName: true, lastName: true, email: true, phone: true } }),
    db.vehicleMake.findMany({ where: { isActive: true, models: { some: { isActive: true } } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    searchParams,
  ]);
  if (!item) notFound();
  const initialMake = item.makeRecord ?? makes.find((make) => make.name.localeCompare(item.make, "es", { sensitivity: "base" }) === 0) ?? null;
  const initialModel = item.modelRecord ?? (initialMake ? await db.vehicleModel.findFirst({ where: { makeId: initialMake.id, name: { equals: item.model, mode: "insensitive" } }, select: { id: true, name: true } }) : null);
  const fuelOptions = item.fuel && !baseFuelOptions.some((option) => option.value === item.fuel) ? [{ value: item.fuel, label: item.fuel }, ...baseFuelOptions] : baseFuelOptions;
  const field = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";
  const label = "text-sm font-bold text-slate-700";
  const optional = <span className="font-normal text-slate-400">(opcional)</span>;
  return <main className="mx-auto max-w-6xl px-6 py-10"><Link href={`/admin/imports/${item.id}`} className="text-sm font-bold text-blue-700">← Cancelar y volver</Link><h1 className="mt-5 text-4xl font-black">Editar importación</h1><p className="mt-2 text-slate-600">{item.year} {item.make} {item.model} · VIN {item.vin}</p>
    {query.error && <p role="alert" className="mt-5 rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{errors[query.error] ?? errors.invalid}</p>}
    <form action={updateVehicleImportAction} className="mt-8 grid gap-6"><input type="hidden" name="id" value={item.id}/>
      <section className="grid gap-4 rounded-3xl bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-3"><h2 className="text-xl font-black sm:col-span-2 lg:col-span-3">Identidad y asignación</h2><CustomerCombobox customers={customers} initialCustomerId={item.customerId}/><label className={label}>VIN<input required name="vin" minLength={11} maxLength={25} defaultValue={item.vin} className={field}/></label><label className={label}>Año<input required type="number" name="year" min="1900" max="2100" defaultValue={item.year} className={field}/></label><ImportVehicleSelector makes={makes} initialMake={initialMake} initialModel={initialModel}/><label className={label}>Color<input required name="color" defaultValue={item.color} className={field}/></label><label className={label}>N.º de lote {optional}<input name="lotNumber" defaultValue={item.lotNumber ?? ""} className={field}/></label><label className={label}>Peso (kg) {optional}<input type="number" min="1" name="weightKg" defaultValue={item.weightKg ?? ""} className={field}/></label><label className={label}>Tipo de carga {optional}<input name="loadType" defaultValue={item.loadType ?? ""} className={field}/></label><label className={`${label} sm:col-span-2`}>Puerto de destino {optional}<input name="destinationPort" defaultValue={item.destinationPort ?? ""} className={field}/></label><ImportDatePicker initialValue={item.receivedDate?.toISOString().slice(0, 10) ?? ""}/><StyledSelect name="fuel" label="Combustible" defaultValue={item.fuel ?? "Desconocido"} options={fuelOptions}/><StyledSelect name="hazmat" label="Carga peligrosa (HAZMAT)" defaultValue={item.hazmat ? "yes" : "no"} options={hazmatOptions}/><StyledSelect name="status" label="Estado de seguimiento" defaultValue={item.status} options={importStatusSteps}/></section>
      <ImportFinanceFields initialValueUsd={item.valueUsd?.toString() ?? ""} initialTowingCostUsd={item.towingCostUsd.toString()} initialOceanFreightUsd={item.oceanFreightUsd.toString()} initialPaidAmountUsd={item.paidAmountUsd.toString()} />
      <section className="grid gap-4 rounded-3xl bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-3"><h2 className="text-xl font-black sm:col-span-2 lg:col-span-3">Título y llaves</h2><StyledSelect name="keyStatus" label="Llaves" defaultValue={item.keyStatus} options={keyOptions}/><StyledSelect name="titleStatus" label="Título" defaultValue={item.titleStatus} options={titleOptions}/><label className={label}>Número de título {optional}<input name="titleNumber" defaultValue={item.titleNumber ?? ""} className={field}/></label><label className={label}>Estado / jurisdicción {optional}<input name="titleState" defaultValue={item.titleState ?? ""} className={field}/></label><label className={label}>Schedule B / HTS {optional}<input name="scheduleB" defaultValue={item.scheduleB ?? ""} className={field}/></label></section>
      <section className="grid gap-4 rounded-3xl bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-3"><div className="sm:col-span-2 lg:col-span-3"><div className="flex flex-wrap items-center gap-3"><h2 className="text-xl font-black">Partes de la importación</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">Todos opcionales</span></div><p className="mt-1 text-sm text-slate-500">Completa únicamente la información que ya tengas disponible.</p></div><label className={label}>Número de contenedor {optional}<input name="containerNumber" defaultValue={item.containerNumber ?? ""} placeholder="Ej. MSKU1234567" className={field}/></label><label className={label}>Naviera {optional}<input name="shippingLine" defaultValue={item.shippingLine ?? ""} placeholder="Ej. Maersk" className={field}/></label><label className={label}>Lugar de llegada {optional}<input name="arrivalPlace" defaultValue={item.arrivalPlace ?? "Iquique, Chile"} className={field}/></label><ImportDatePicker name="departureDate" label="Fecha de embarque" initialValue={item.departureDate?.toISOString().slice(0, 10) ?? ""}/><ImportDatePicker name="arrivalDate" label="Fecha de llegada" initialValue={item.arrivalDate?.toISOString().slice(0, 10) ?? ""}/></section>
      <div className="flex flex-wrap justify-end gap-3"><Link href={`/admin/imports/${item.id}`} className="rounded-2xl border bg-white px-6 py-4 font-bold text-slate-700">Cancelar</Link><button className="rounded-2xl bg-blue-700 px-6 py-4 text-lg font-black text-white shadow-lg hover:bg-blue-800">Guardar cambios</button></div>
    </form>
  </main>;
}
