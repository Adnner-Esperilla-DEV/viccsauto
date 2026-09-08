import Link from "next/link";

import { createVehicleImportAction } from "@/app/actions/imports";
import { CustomerCombobox, ImportDatePicker, ImportTypeFields, StyledSelect } from "@/components";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { importStatusSteps } from "@/lib/import-status";

export const dynamic = "force-dynamic";
const errors: Record<string, string> = {
  invalid: "Revisa los datos obligatorios y la compatibilidad de cada repuesto.",
  payment: "El monto cancelado no puede superar el total de la importación.",
  customer: "Selecciona un cliente válido.",
  zip: "El ZIP debe contener imágenes JPG, PNG o WebP válidas y pesar como máximo 30 MB.",
  attachments: "Adjunta hasta 5 archivos PDF o imágenes de máximo 5 MB cada uno.",
  duplicate: "Ya existe una importación con ese VIN.",
  storage: "No se pudieron almacenar los archivos en el bucket. Revisa su configuración e inténtalo otra vez.",
};
const hazmatOptions = [
  { value: "no", label: "No es HAZMAT" },
  { value: "yes", label: "Sí es HAZMAT" },
] as const;
const field =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";
const label = "text-sm font-bold text-slate-700";
const optional = <span className="font-normal text-slate-400">(opcional)</span>;

export default async function NewImportPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireStaff();
  const [{ error }, customers, makes] = await Promise.all([
    searchParams,
    db.user.findMany({
      where: { role: "CUSTOMER", status: { in: ["ACTIVE", "POS_ONLY"] } },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    }),
    db.vehicleMake.findMany({
      where: { isActive: true, models: { some: { isActive: true } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/admin/imports" className="text-sm font-bold text-blue-700">
        ← Volver a importaciones
      </Link>
      <h1 className="mt-5 text-4xl font-black">Registrar importación</h1>
      <p className="mt-2 text-slate-600">Registra un vehículo o varios repuestos para el seguimiento del cliente.</p>
      {error && (
        <p role="alert" className="mt-5 rounded-2xl bg-red-50 p-4 font-semibold text-red-700">
          {errors[error] ?? errors.invalid}
        </p>
      )}
      <form action={createVehicleImportAction} className="mt-8 grid gap-6">
        <section className="grid gap-4 rounded-3xl bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
          <h2 className="text-xl font-black sm:col-span-2 lg:col-span-3">Cliente y carga</h2>
          <CustomerCombobox customers={customers} />
          <label className={label}>
            N.º de lote {optional}
            <input name="lotNumber" placeholder="Referencia externa" className={field} />
          </label>
          <label className={label}>
            Tipo de carga {optional}
            <input name="loadType" placeholder="Ej. contenedor, pallet o caja" className={field} />
          </label>
          <label className={`${label} sm:col-span-2`}>
            Puerto o destino {optional}
            <input name="destinationPort" placeholder="CLIQQ - IQUIQUE, CHILE" className={field} />
          </label>
          <ImportDatePicker />
          <StyledSelect name="hazmat" label="Carga peligrosa (HAZMAT)" defaultValue="no" options={hazmatOptions} />
          <StyledSelect
            name="status"
            label="Estado de seguimiento"
            defaultValue="INCOMING"
            options={importStatusSteps}
          />
        </section>
        <ImportTypeFields makes={makes} />
        <section className="grid gap-4 rounded-3xl bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <h2 className="text-xl font-black">Datos del embarque</h2>
            <p className="mt-1 text-sm text-slate-500">Puedes completar estos campos cuando recibas la información.</p>
          </div>
          <label className={label}>
            Número de contenedor {optional}
            <input name="containerNumber" placeholder="Ej. MSKU1234567" className={field} />
          </label>
          <label className={label}>
            Naviera o transportista {optional}
            <input name="shippingLine" placeholder="Ej. Maersk, DHL" className={field} />
          </label>
          <label className={label}>
            Lugar de llegada {optional}
            <input name="arrivalPlace" defaultValue="Iquique, Chile" className={field} />
          </label>
          <ImportDatePicker name="departureDate" label="Fecha de embarque" />
          <ImportDatePicker name="arrivalDate" label="Fecha de llegada" />
        </section>
        <section className="grid gap-5 rounded-3xl bg-white p-6 shadow-sm sm:grid-cols-2">
          <div>
            <h2 className="text-xl font-black">Imágenes en ZIP</h2>
            <p className="mt-1 text-sm text-slate-500">JPG, PNG o WebP; ZIP máximo 30 MB.</p>
            <input
              required
              type="file"
              name="imageZip"
              accept=".zip,application/zip"
              className={`${field} file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-bold file:text-blue-700`}
            />
          </div>
          <div>
            <h2 className="text-xl font-black">Adjuntos</h2>
            <p className="mt-1 text-sm text-slate-500">PDF o imágenes, máximo 5 archivos de 5 MB.</p>
            <input
              multiple
              type="file"
              name="attachments"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className={`${field} file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-bold file:text-blue-700`}
            />
          </div>
        </section>
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Nota para el cliente</h2>
          <p className="mt-1 text-sm text-slate-500">Se mostrará en su ficha de seguimiento.</p>
          <textarea
            name="initialNote"
            maxLength={2000}
            rows={4}
            placeholder="Escribe una actualización visible para el cliente…"
            className={`${field} resize-y`}
          />
        </section>
        <button className="rounded-2xl bg-blue-700 px-6 py-4 text-lg font-black text-white shadow-lg hover:bg-blue-800">
          Registrar importación
        </button>
      </form>
    </main>
  );
}
