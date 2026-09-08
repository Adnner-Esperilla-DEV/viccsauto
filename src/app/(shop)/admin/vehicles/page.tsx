import Link from "next/link";
import {
  IoChevronBackOutline,
  IoChevronForwardOutline,
  IoEyeOffOutline,
  IoEyeOutline,
  IoImageOutline,
} from "react-icons/io5";

import { deleteVehicleAction, updateVehicleStatusAction } from "@/app/actions/admin";
import { DeleteEntityForm } from "@/components/admin/DeleteProductForm";
import { VehicleModal } from "@/components/admin/VehicleModal";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 15;

type VehiclesAdminPageProps = {
  searchParams: Promise<{ edit?: string; error?: string; ok?: string; page?: string }>;
};

const errorMessages: Record<string, string> = {
  "vehicle-invalid": "Revisa los datos del vehículo antes de guardar.",
  "vehicle-duplicate": "Ya existe otro vehículo con ese slug, número de stock o VIN.",
  "vehicle-missing": "No encontramos el vehículo que intentas editar.",
  "vehicle-image": "Revisa las imágenes. Puedes guardar un máximo de 10 archivos WebP optimizados.",
  status: "No se pudo actualizar la visibilidad del vehículo.",
  "vehicle-delete-failed": "No se pudo eliminar el vehículo. Intenta nuevamente.",
  "vehicle-delete-invalid": "El vehículo que intentas eliminar no es válido.",
  "vehicle-delete-not-found": "El vehículo ya no existe o fue eliminado.",
};

const statusLabels: Record<string, string> = {
  AVAILABLE: "Disponible",
  RESERVED: "Reservado",
  SOLD: "Vendido",
  INACTIVE: "Inactivo",
};

function pageHref(page: number) {
  return page > 1 ? `/admin/vehicles?page=${page}` : "/admin/vehicles";
}

function featuresText(value: string) {
  try {
    const features: unknown = JSON.parse(value);
    return Array.isArray(features)
      ? features.filter((feature): feature is string => typeof feature === "string").join(", ")
      : "";
  } catch {
    return "";
  }
}

export default async function VehiclesAdminPage({ searchParams }: VehiclesAdminPageProps) {
  await requireStaff();
  const query = await searchParams;
  const requestedPage = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const total = await db.vehicle.count();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const vehicles = await db.vehicle.findMany({
    include: { images: { orderBy: { position: "asc" }, take: 10, select: { id: true, alt: true } } },
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const firstResult = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastResult = Math.min(page * PAGE_SIZE, total);
  const errorMessage = query.error ? errorMessages[query.error] : undefined;
  const creationError = query.edit || query.error?.startsWith("vehicle-delete-") ? undefined : errorMessage;

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="font-bold uppercase tracking-widest text-blue-700">Administración</p>
          <h1 className="mt-2 text-4xl font-black">Vehículos</h1>
          <p className="mt-3 text-slate-600">
            Gestiona la información comercial, publicación y disponibilidad de los vehículos.
          </p>
          <p className="mt-2 text-sm text-slate-500">{total} vehículos · 15 por página</p>
        </div>
        <VehicleModal initialOpen={Boolean(creationError)} serverError={creationError} returnPage={page} />
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700"
        >
          {errorMessage}
        </p>
      )}
      {query.ok === "created" && (
        <p className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          Vehículo creado correctamente.
        </p>
      )}
      {query.ok === "updated" && (
        <p className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          Vehículo actualizado correctamente.
        </p>
      )}
      {query.ok === "activated" && (
        <p className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          Vehículo activado y visible en la tienda.
        </p>
      )}
      {query.ok === "deactivated" && (
        <p className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          Vehículo desactivado y oculto de la tienda.
        </p>
      )}
      {query.ok === "deleted" && (
        <p className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          Vehículo eliminado correctamente.
        </p>
      )}

      <div className="mt-8 grid gap-4">
        {vehicles.map((vehicle) => {
          const isVisible = vehicle.status === "AVAILABLE";
          return (
            <article
              key={vehicle.id}
              className="flex flex-wrap items-center gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              {vehicle.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/vehicle-images/${vehicle.images[0].id}`}
                  alt={vehicle.images[0].alt}
                  className="h-20 w-28 shrink-0 rounded-2xl border border-slate-200 bg-slate-50 object-cover"
                />
              ) : (
                <span
                  className="grid h-20 w-28 shrink-0 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-400"
                  title="Sin imagen"
                >
                  <IoImageOutline className="h-6 w-6" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-lg text-slate-950">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </b>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${vehicle.status === "AVAILABLE" ? "bg-emerald-50 text-emerald-700" : vehicle.status === "RESERVED" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}
                  >
                    {statusLabels[vehicle.status] ?? vehicle.status}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${isVisible ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}
                  >
                    {isVisible ? <IoEyeOutline aria-hidden="true" /> : <IoEyeOffOutline aria-hidden="true" />}
                    {isVisible ? "Visible en web" : "Oculto"}
                  </span>
                  {vehicle.featured && (
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                      Destacado
                    </span>
                  )}
                </div>
                <small className="mt-1 block text-slate-500">
                  {vehicle.stockNumber} · {vehicle.location} · {vehicle.mileage.toLocaleString("es-CL")} km
                </small>
              </div>
              <strong className="text-xl text-blue-700">{formatPrice(vehicle.price)}</strong>
              <div className="flex flex-wrap items-center gap-2">
                <form action={updateVehicleStatusAction}>
                  <input type="hidden" name="id" value={vehicle.id} />
                  <input type="hidden" name="status" value={isVisible ? "INACTIVE" : "AVAILABLE"} />
                  <input type="hidden" name="returnPage" value={page} />
                  <button
                    className={`inline-flex items-center gap-1 rounded-xl border px-4 py-2 text-sm font-bold ${isVisible ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                  >
                    {isVisible ? <IoEyeOffOutline aria-hidden="true" /> : <IoEyeOutline aria-hidden="true" />}
                    {isVisible ? "Desactivar" : "Activar"}
                  </button>
                </form>
                <VehicleModal
                  initialOpen={query.edit === vehicle.id}
                  serverError={query.edit === vehicle.id ? errorMessage : undefined}
                  returnPage={page}
                  vehicle={{
                    id: vehicle.id,
                    slug: vehicle.slug,
                    stockNumber: vehicle.stockNumber,
                    vin: vehicle.vin,
                    make: vehicle.make,
                    model: vehicle.model,
                    year: vehicle.year,
                    price: vehicle.price,
                    mileage: vehicle.mileage,
                    transmission: vehicle.transmission,
                    fuel: vehicle.fuel,
                    condition: vehicle.condition,
                    location: vehicle.location,
                    description: vehicle.description,
                    color: vehicle.color,
                    engine: vehicle.engine,
                    features: featuresText(vehicle.features),
                    status: vehicle.status,
                    featured: vehicle.featured,
                    images: vehicle.images.map((image) => ({ id: image.id, url: `/api/vehicle-images/${image.id}` })),
                  }}
                />
                <DeleteEntityForm
                  compact
                  action={deleteVehicleAction}
                  entityId={vehicle.id}
                  entityName={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                  title="¿Eliminar vehículo?"
                  description="Se quitará de la tienda junto con todas sus imágenes."
                />
              </div>
            </article>
          );
        })}

        {!vehicles.length && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-slate-500">
            Todavía no hay vehículos registrados.
          </div>
        )}
      </div>

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <p className="text-sm text-slate-500">
          Mostrando {firstResult}–{lastResult} de {total}
        </p>
        <nav className="flex items-center gap-2" aria-label="Paginación de vehículos">
          <Link
            href={pageHref(Math.max(1, page - 1))}
            aria-disabled={page === 1}
            className={`inline-flex items-center gap-1 rounded-xl border px-4 py-2 text-sm font-bold ${page === 1 ? "pointer-events-none border-slate-200 text-slate-300" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}
          >
            <IoChevronBackOutline aria-hidden="true" /> Anterior
          </Link>
          <span className="px-2 text-sm font-semibold text-slate-600">
            Página {page} de {totalPages}
          </span>
          <Link
            href={pageHref(Math.min(totalPages, page + 1))}
            aria-disabled={page === totalPages}
            className={`inline-flex items-center gap-1 rounded-xl border px-4 py-2 text-sm font-bold ${page === totalPages ? "pointer-events-none border-slate-200 text-slate-300" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}
          >
            Siguiente <IoChevronForwardOutline aria-hidden="true" />
          </Link>
        </nav>
      </footer>
    </main>
  );
}
