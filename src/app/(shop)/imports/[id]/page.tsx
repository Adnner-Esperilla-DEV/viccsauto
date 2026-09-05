import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ImportFinanceSummary, ImportImageGallery, ImportStatusTimeline } from "@/components";
import { getSessionUser, isStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatImportDate, keyStatusLabels, titleStatusLabels } from "@/lib/import-status";

export const dynamic = "force-dynamic";
const show = (input: string | number | null | undefined) => input == null || input === "" ? "—" : String(input);

export default async function CustomerImportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");
  const { id } = await params;
  if (isStaff(user)) redirect(`/admin/imports/${id}`);
  const item = await db.vehicleImport.findFirst({
    where: { id, customerId: user.id },
    include: {
      images: { orderBy: { position: "asc" }, select: { id: true, filename: true } },
      attachments: { orderBy: { createdAt: "asc" }, select: { id: true, filename: true, size: true } },
      notes: { where: { visibleToCustomer: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!item) notFound();
  const vehicleName = `${item.year} ${item.make} ${item.model}`;
  return <main className="mx-auto max-w-7xl px-6 py-10">
    <Link href="/imports" className="text-sm font-bold text-blue-700">← Volver a mis importaciones</Link><h1 className="mt-3 text-4xl font-black">{vehicleName}</h1><p className="mt-1 text-slate-500">VIN {item.vin}{item.lotNumber ? ` · Lote ${item.lotNumber}` : ""}</p>
    <Box title="Seguimiento de mi vehículo"><p className="mb-4 text-sm text-slate-500">Aquí puedes ver en qué etapa se encuentra tu importación.</p><ImportStatusTimeline status={item.status}/></Box>
    <div className="mt-6"><ImportFinanceSummary valueUsd={item.valueUsd ? Number(item.valueUsd) : 0} towingCostUsd={Number(item.towingCostUsd)} oceanFreightUsd={Number(item.oceanFreightUsd)} paidAmountUsd={Number(item.paidAmountUsd)} /></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_.9fr]"><div className="space-y-6"><Box title="Imágenes"><ImportImageGallery images={item.images} vehicleName={vehicleName} importId={item.id}/></Box><Box title="Notas para ti">{item.notes.map((note) => <article key={note.id} className="rounded-2xl bg-slate-50 p-4"><p className="whitespace-pre-wrap">{note.body}</p><p className="mt-2 text-xs text-slate-500">{note.createdAt.toLocaleString("es-CL")}</p></article>)}{!item.notes.length && <p className="text-slate-500">No hay notas compartidas todavía.</p>}</Box></div>
      <div className="space-y-6"><Box title="Datos del vehículo"><Row label="VIN" text={item.vin}/><Row label="Año" text={item.year}/><Row label="Marca" text={item.make}/><Row label="Modelo" text={item.model}/><Row label="Color" text={item.color}/><Row label="N.º de lote" text={show(item.lotNumber)}/><Row label="Peso" text={item.weightKg ? `${item.weightKg} kg` : "—"}/><Row label="Tipo de carga" text={show(item.loadType)}/><Row label="Puerto de destino" text={show(item.destinationPort)}/><Row label="Fecha de recepción" text={formatImportDate(item.receivedDate)}/><Row label="Carga peligrosa" text={item.hazmat ? "Sí (HAZMAT)" : "No"}/><Row label="Combustible" text={show(item.fuel)}/></Box>
      <Box title="Título y llaves"><Row label="Llaves" text={keyStatusLabels[item.keyStatus] ?? item.keyStatus}/><Row label="Título" text={titleStatusLabels[item.titleStatus] ?? item.titleStatus}/><Row label="Número de título" text={show(item.titleNumber)}/><Row label="Estado" text={show(item.titleState)}/><Row label="Schedule B / HTS" text={show(item.scheduleB)}/></Box>
      <Box title="Partes de la importación"><Row label="Remitente" text={show(item.shipper)}/><Row label="Consignatario" text={show(item.consignee)}/><Row label="Parte a notificar" text={show(item.notifyParty)}/><Row label="Referencia de exportación" text={show(item.exportReference)}/></Box>
      <Box title="Adjuntos">{item.attachments.map((file) => <a key={file.id} href={`/api/import-attachments/${file.id}`} className="block rounded-xl border p-3 font-semibold text-blue-700 hover:bg-blue-50">{file.filename} <span className="text-xs font-normal text-slate-500">({Math.ceil(file.size / 1024)} KB)</span></a>)}{!item.attachments.length && <p className="text-slate-500">No hay documentos adjuntos.</p>}</Box></div></div>
  </main>;
}

function Box({ title, children }: { title: string; children: React.ReactNode }) { return <section className="mt-6 rounded-3xl border bg-white p-6"><h2 className="mb-4 text-xl font-black">{title}</h2><div className="space-y-2">{children}</div></section>; }
function Row({ label, text }: { label: string; text: string | number }) { return <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 border-b border-slate-100 py-2 last:border-0"><dt className="text-sm text-slate-500">{label}</dt><dd className="break-words text-right font-semibold">{text}</dd></div>; }
