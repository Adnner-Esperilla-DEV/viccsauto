import Link from "next/link";
import type { Prisma as PrismaTypes } from "@prisma/client";
import { redirect } from "next/navigation";

import { deleteVehicleImportAction } from "@/app/actions/imports";
import { CustomerCombobox } from "@/components";
import { DeleteEntityForm } from "@/components/admin/DeleteProductForm";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatUsd, getImportFinanceSummary } from "@/lib/import-finances";
import { importStatusLabel } from "@/lib/import-status";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

function importsHref({ page, type, customerId }: { page?: number; type?: string; customerId?: string }) {
  const params = new URLSearchParams();
  if (page && page > 1) params.set("page", String(page));
  if (type) params.set("type", type);
  if (customerId) params.set("customer", customerId);
  const query = params.toString();
  return `/admin/imports${query ? `?${query}` : ""}`;
}

export default async function ImportsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; error?: string; ok?: string; page?: string; type?: string }>;
}) {
  await requireStaff();
  const query = await searchParams;
  const requestedPage = Number(query.page ?? "1");
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const type = query.type === "VEHICLE" || query.type === "PARTS" ? query.type : undefined;
  const customers = await db.user.findMany({
    where: { role: "CUSTOMER", vehicleImports: { some: {} } },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
  });
  const selectedCustomer = customers.find((customer) => customer.id === query.customer);
  const customerId = selectedCustomer?.id;
  const where: PrismaTypes.VehicleImportWhereInput = {
    ...(type ? { importType: type } : {}),
    ...(customerId ? { customerId } : {}),
  };
  const [total, customerImports] = await Promise.all([
    db.vehicleImport.count({ where }),
    customerId
      ? db.vehicleImport.findMany({
          where: { customerId },
        })
      : Promise.resolve([]),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages) redirect(importsHref({ page: totalPages, type, customerId }));

  const imports = await db.vehicleImport.findMany({
    include: {
      customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
      parts: { take: 1, orderBy: { position: "asc" }, select: { description: true } },
      _count: { select: { images: true, attachments: true, parts: true } },
    },
    where,
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const firstItem = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastItem = Math.min(page * PAGE_SIZE, total);
  const customerTotals = customerImports.reduce(
    (totals, item) => {
      const finance = getImportFinanceSummary({
        importType: item.importType,
        valueUsd: Number(item.valueUsd ?? 0),
        towingCostUsd: Number(item.towingCostUsd),
        oceanFreightUsd: Number(item.oceanFreightUsd),
        shippingCostUsd: Number(item.shippingCostUsd),
        logisticsServiceUsd: Number(item.logisticsServiceUsd),
        otherChargesUsd: Number(
          (item as unknown as { otherChargesUsd?: PrismaTypes.Decimal }).otherChargesUsd ?? 0,
        ),
        paidAmountUsd: Number(item.paidAmountUsd),
      });
      totals.totalCents += Math.round(finance.totalUsd * 100);
      totals.paidCents += Math.round(finance.paidAmountUsd * 100);
      totals.balanceCents += Math.round(finance.balanceUsd * 100);
      return totals;
    },
    { totalCents: 0, paidCents: 0, balanceCents: 0 },
  );

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-bold uppercase tracking-widest text-blue-700">Logística</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Importaciones</h1>
          <p className="mt-2 text-slate-600">Seguimiento de vehículos, repuestos y autopartes por cliente.</p>
        </div>
        <Link
          href="/admin/imports/new"
          className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800"
        >
          Nueva importación
        </Link>
      </div>

      <form
        action="/admin/imports"
        method="get"
        className="mt-6 grid items-end gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 md:grid-cols-[minmax(0,1fr)_auto_auto]"
      >
        {type && <input type="hidden" name="type" value={type} />}
        <CustomerCombobox
          key={customerId ?? "all"}
          customers={customers}
          initialCustomerId={customerId}
          name="customer"
          label="Buscar importaciones por cliente"
          required={false}
          className="min-w-0"
        />
        <button className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800">Filtrar</button>
        <Link
          href={importsHref({ type })}
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center font-bold text-slate-700 hover:bg-slate-50"
        >
          Ver todos
        </Link>
      </form>

      {selectedCustomer && (
        <section className="mt-5 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-blue-700">Resumen del cliente</p>
              <h2 className="mt-1 text-xl font-black">
                {selectedCustomer.firstName} {selectedCustomer.lastName}
              </h2>
              <p className="text-sm text-slate-500">{selectedCustomer.email}</p>
            </div>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-800">
              {customerImports.length} {customerImports.length === 1 ? "importación" : "importaciones"}
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <CustomerTotal label="Total acumulado" value={customerTotals.totalCents / 100} />
            <CustomerTotal label="Total pagado" value={customerTotals.paidCents / 100} tone="paid" />
            <CustomerTotal label="Deuda total" value={customerTotals.balanceCents / 100} tone="debt" />
          </div>
        </section>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {[
          [undefined, "Todas"],
          ["VEHICLE", "Vehículos"],
          ["PARTS", "Repuestos"],
        ].map(([value, label]) => (
          <Link
            key={label}
            href={importsHref({ type: value, customerId })}
            className={`rounded-full px-4 py-2 text-sm font-bold ${type === value || (!type && !value) ? "bg-blue-700 text-white" : "border bg-white text-slate-700"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {query.ok === "deleted" && (
        <p className="mt-5 rounded-xl bg-emerald-50 p-3 font-semibold text-emerald-800">
          Importación eliminada correctamente.
        </p>
      )}
      {query.error?.startsWith("delete-") && (
        <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 font-semibold text-red-700">
          {query.error === "delete-not-found"
            ? "La importación ya no existe o fue eliminada."
            : query.error === "delete-invalid"
              ? "La importación seleccionada no es válida."
              : "No se pudo eliminar la importación. Intenta nuevamente."}
        </p>
      )}

      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1240px] border-collapse text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <Header>Importación</Header>
                <Header>Cliente</Header>
                <Header>Celular</Header>
                <Header align="right">Envío / grúa</Header>
                <Header align="right">Servicio / flete</Header>
                <Header align="right">Saldo</Header>
                <Header>Seguimiento</Header>
                <Header>Actualizado</Header>
                <Header align="right">
                  <span className="sr-only">Acciones</span>
                </Header>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {imports.map((item) => {
                const finance = getImportFinanceSummary({
                  importType: item.importType,
                  valueUsd: item.valueUsd ? Number(item.valueUsd) : 0,
                  towingCostUsd: Number(item.towingCostUsd),
                  oceanFreightUsd: Number(item.oceanFreightUsd),
                  shippingCostUsd: Number(item.shippingCostUsd),
                  logisticsServiceUsd: Number(item.logisticsServiceUsd),
                  otherChargesUsd: Number(item.otherChargesUsd),
                  paidAmountUsd: Number(item.paidAmountUsd),
                });
                const importName =
                  item.importType === "PARTS"
                    ? (item.parts[0]?.description ?? "Importación de repuestos")
                    : `${item.year} ${item.make} ${item.model}`;

                return (
                  <tr key={item.id} className="group transition hover:bg-blue-50/50">
                    <Cell>
                      <Link
                        href={`/admin/imports/${item.id}`}
                        className="font-black text-slate-950 hover:text-blue-700 hover:underline"
                      >
                        {importName}
                      </Link>
                      <span className="mt-1 block text-xs text-slate-500">
                        {item.importType === "PARTS"
                          ? `${item.referenceCode} · ${item._count.parts} ${item._count.parts === 1 ? "repuesto" : "repuestos"}`
                          : item.lotNumber
                            ? `Lote ${item.lotNumber} · VIN ${item.vin}`
                            : `VIN ${item.vin}`}
                      </span>
                      <span className="mt-1 block text-[11px] text-slate-400">
                        {item._count.images} imágenes · {item._count.attachments} adjuntos
                      </span>
                    </Cell>
                    <Cell>
                      <span className="block font-bold text-slate-800">
                        {item.customer.firstName} {item.customer.lastName}
                      </span>
                      <span className="mt-1 block max-w-52 truncate text-xs text-slate-500" title={item.customer.email}>
                        {item.customer.email}
                      </span>
                    </Cell>
                    <Cell>
                      <span className={item.customer.phone ? "font-semibold text-slate-800" : "text-slate-400"}>
                        {item.customer.phone || "No registrado"}
                      </span>
                    </Cell>
                    <Cell align="right">
                      <Money
                        value={item.importType === "PARTS" ? Number(item.shippingCostUsd) : Number(item.towingCostUsd)}
                      />
                    </Cell>
                    <Cell align="right">
                      <Money
                        value={
                          item.importType === "PARTS" ? Number(item.logisticsServiceUsd) : Number(item.oceanFreightUsd)
                        }
                      />
                    </Cell>
                    <Cell align="right">
                      <span
                        className={`inline-flex rounded-lg px-2.5 py-1.5 font-black ${finance.balanceUsd > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}
                      >
                        {formatUsd(finance.balanceUsd)}
                      </span>
                    </Cell>
                    <Cell>
                      <span className="inline-flex whitespace-nowrap rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                        {importStatusLabel(item.status)}
                      </span>
                    </Cell>
                    <Cell>
                      <span className="whitespace-nowrap text-xs font-semibold text-slate-600">
                        {item.updatedAt.toLocaleDateString("es-CL")}
                      </span>
                      <span className="mt-1 block text-xs text-slate-400">
                        {item.updatedAt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </Cell>
                    <Cell align="right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/imports/${item.id}`}
                          className="inline-flex rounded-lg border border-blue-200 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-700 hover:text-white"
                        >
                          Ver detalle
                        </Link>
                        <DeleteEntityForm
                          compact
                          action={deleteVehicleImportAction}
                          entityId={item.id}
                          entityName={`${importName} (${item.referenceCode})`}
                          title="¿Eliminar importación?"
                          description="Se borrarán su seguimiento, notas, imágenes, adjuntos y repuestos asociados."
                        />
                      </div>
                    </Cell>
                  </tr>
                );
              })}
              {!imports.length && (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-slate-500">
                    {selectedCustomer
                      ? "Este cliente no tiene importaciones con los filtros seleccionados."
                      : "Todavía no hay importaciones registradas."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {total > 0 && (
        <nav
          aria-label="Paginación de importaciones"
          className="mt-5 flex flex-col items-center justify-between gap-4 rounded-2xl border bg-white p-4 sm:flex-row"
        >
          <p className="text-sm text-slate-500">
            Mostrando{" "}
            <strong className="text-slate-800">
              {firstItem}–{lastItem}
            </strong>{" "}
            de <strong className="text-slate-800">{total}</strong> importaciones
          </p>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                href={importsHref({ page: page - 1, type, customerId })}
                className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-700 hover:border-blue-300 hover:bg-blue-50"
              >
                ← Anterior
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="cursor-not-allowed rounded-xl border px-4 py-2 text-sm font-bold text-slate-300"
              >
                ← Anterior
              </span>
            )}
            <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
              Página {page} de {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={importsHref({ page: page + 1, type, customerId })}
                className="rounded-xl border px-4 py-2 text-sm font-bold text-slate-700 hover:border-blue-300 hover:bg-blue-50"
              >
                Siguiente →
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="cursor-not-allowed rounded-xl border px-4 py-2 text-sm font-bold text-slate-300"
              >
                Siguiente →
              </span>
            )}
          </div>
        </nav>
      )}
    </main>
  );
}

function Header({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap px-4 py-3 font-black ${align === "right" ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}

function Cell({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <td className={`px-4 py-3 align-middle ${align === "right" ? "text-right" : "text-left"}`}>{children}</td>;
}

function Money({ value }: { value: number }) {
  return <span className="whitespace-nowrap font-bold tabular-nums text-slate-800">{formatUsd(value)}</span>;
}

function CustomerTotal({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "paid" | "debt";
}) {
  const colors = {
    default: "border-blue-100 bg-blue-50 text-blue-900",
    paid: "border-emerald-100 bg-emerald-50 text-emerald-800",
    debt:
      value > 0
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-emerald-100 bg-emerald-50 text-emerald-800",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[tone]}`}>
      <span className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</span>
      <strong className="mt-1 block text-xl font-black tabular-nums">{formatUsd(value)}</strong>
    </div>
  );
}
