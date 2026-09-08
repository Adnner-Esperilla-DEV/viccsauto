import type { Prisma } from "@prisma/client";
import Link from "next/link";
import {
  IoCarSportOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline,
  IoEyeOffOutline,
  IoEyeOutline,
  IoImageOutline,
  IoSearchOutline,
} from "react-icons/io5";

import { toggleProductAction } from "@/app/actions/admin";
import { ProductCompatibilityModal } from "@/components/admin/ProductCompatibilityModal";
import { ProductCreateModal } from "@/components/admin/ProductCreateModal";
import { DeleteProductForm } from "@/components/admin/DeleteProductForm";
import { ProductEditModal } from "@/components/admin/ProductEditModal";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type ProductsAdminPageProps = {
  searchParams: Promise<{ compat?: string; edit?: string; error?: string; ok?: string; page?: string; q?: string }>;
};

const errorMessages: Record<string, string> = {
  duplicate: "Ya existe un producto con ese SKU o slug.",
  "featured-image": "Un producto destacado necesita una imagen.",
  image: "La imagen no es válida o supera el tamaño permitido.",
  invalid: "Revisa los datos del nuevo producto.",
  location: "Primero debes crear una ubicación de inventario activa.",
  compatibility: "No se pudo guardar la compatibilidad. Revisa el modelo y el rango de años.",
  "product-duplicate": "Ya existe otro producto con ese SKU o slug.",
  "product-featured-image": "Un producto destacado necesita al menos una imagen.",
  "product-image": "No se pudieron guardar las imágenes del producto.",
  "product-invalid": "Revisa los datos del producto antes de guardar.",
  "delete-failed": "No se pudo eliminar el producto. Intenta nuevamente.",
  "delete-invalid": "El producto que intentas eliminar no es válido.",
  "delete-not-found": "El producto ya no existe o fue eliminado.",
};

function oemText(value: string) {
  try {
    const items: unknown = JSON.parse(value);
    return Array.isArray(items) ? items.filter((item): item is string => typeof item === "string").join(", ") : "";
  } catch {
    return "";
  }
}

function formatUsd(value: Prisma.Decimal) {
  return Number(value).toLocaleString("es-CL", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function formatExchangeRate(value: Prisma.Decimal) {
  return Number(value).toLocaleString("es-CL", { maximumFractionDigits: 4 });
}

export default async function ProductsAdminPage({ searchParams }: ProductsAdminPageProps) {
  await requireStaff();
  const query = await searchParams;
  const search = query.q?.trim() ?? "";
  const requestedPage = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const terms = search.split(/\s+/).filter(Boolean);
  const where: Prisma.ProductWhereInput = terms.length
    ? {
        AND: terms.map((term) => ({
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { sku: { contains: term, mode: "insensitive" } },
            { slug: { contains: term, mode: "insensitive" } },
            { oemCodes: { contains: term, mode: "insensitive" } },
            { brand: { name: { contains: term, mode: "insensitive" } } },
            { category: { name: { contains: term, mode: "insensitive" } } },
          ],
        })),
      }
    : {};

  const [total, categories, brands] = await Promise.all([
    db.product.count({ where }),
    db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const [products, compatibilityProduct, years, makes] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        category: true,
        brand: true,
        images: { orderBy: { position: "asc" }, take: 5, select: { id: true, alt: true } },
        _count: { select: { compatibility: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    query.compat
      ? db.product.findUnique({
          where: { id: query.compat },
          select: {
            id: true,
            name: true,
            sku: true,
            compatibility: {
              include: { vehicleModel: { include: { make: true } } },
              orderBy: [
                { vehicleModel: { make: { name: "asc" } } },
                { vehicleModel: { name: "asc" } },
                { yearFrom: "asc" },
              ],
            },
          },
        })
      : Promise.resolve(null),
    query.compat
      ? db.vehicleYear.findMany({ where: { isActive: true }, orderBy: { year: "desc" }, select: { year: true } })
      : Promise.resolve([]),
    query.compat
      ? db.vehicleMake.findMany({
          where: { isActive: true, models: { some: { isActive: true } } },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  function pageHref(nextPage: number) {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (nextPage > 1) params.set("page", String(nextPage));
    const suffix = params.toString();
    return suffix ? `/admin/products?${suffix}` : "/admin/products";
  }

  function compatibilityHref(productId: string) {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (page > 1) params.set("page", String(page));
    params.set("compat", productId);
    return `/admin/products?${params.toString()}`;
  }

  const firstResult = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastResult = Math.min(page * PAGE_SIZE, total);
  const errorMessage = query.error ? errorMessages[query.error] : undefined;
  const creationError = query.edit || query.compat || query.error?.startsWith("delete-") ? undefined : errorMessage;

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">Administración</p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">Productos</h1>
          <p className="mt-3 max-w-2xl font-normal text-slate-600">
            Gestiona catálogos grandes, inventario, visibilidad y compatibilidad vehicular.
          </p>
        </div>
        <ProductCreateModal
          brands={brands}
          categories={categories}
          initialOpen={Boolean(creationError)}
          serverError={creationError}
        />
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
          Producto creado correctamente.
        </p>
      )}
      {query.ok === "updated" && (
        <p className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          Producto actualizado correctamente.
        </p>
      )}
      {query.ok === "deleted" && (
        <p className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          Producto eliminado correctamente.
        </p>
      )}

      <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5 sm:p-6">
          <form className="flex w-full max-w-2xl gap-2" role="search">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Buscar productos</span>
              <IoSearchOutline
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                name="q"
                defaultValue={search}
                placeholder="Buscar por nombre, SKU, OEM, marca o categoría"
                className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <button className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
              Buscar
            </button>
            {search && (
              <Link
                href="/admin/products"
                className="grid place-items-center rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Limpiar
              </Link>
            )}
          </form>
          <p className="text-sm font-normal text-slate-500">
            <b className="text-slate-900">{total}</b> productos
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">Imagen</th>
                <th className="px-4 py-4">SKU</th>
                <th className="px-4 py-4">Producto</th>
                <th className="px-4 py-4">Precio</th>
                <th className="px-4 py-4">Stock</th>
                <th className="px-4 py-4">Portada</th>
                <th className="px-4 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => (
                <tr key={product.id} className="transition hover:bg-slate-50/80">
                  <td className="px-6 py-3">
                    {product.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/product-images/${product.images[0].id}`}
                        alt={product.images[0].alt}
                        className="h-12 w-16 rounded-xl border border-slate-200 bg-white object-contain"
                      />
                    ) : (
                      <span
                        className="grid h-12 w-16 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400"
                        title="Sin imagen"
                      >
                        <IoImageOutline className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-600">{product.sku}</td>
                  <td className="min-w-[260px] max-w-md px-4 py-3">
                    <b className="block truncate text-slate-950">{product.name}</b>
                    <span className="mt-1 block truncate text-xs text-slate-500">
                      {product.brand?.name ?? "Sin marca"} · {product.category.name}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="block font-semibold">{formatPrice(product.price)}</span>
                    {product.priceUsd !== null && product.usdToClpRate !== null && (
                      <span className="mt-1 block text-xs font-medium text-blue-700">
                        Interno: {formatUsd(product.priceUsd)} · tasa {formatExchangeRate(product.usdToClpRate)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={product.stock <= product.lowStockAt ? "font-bold text-amber-700" : "text-slate-700"}
                    >
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {product.featured && product.images.length ? (
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        Destacado
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${product.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                    >
                      {product.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <ProductEditModal
                        compact
                        returnTo="list"
                        initialOpen={query.edit === product.id}
                        serverError={query.edit === product.id ? errorMessage : undefined}
                        categories={categories}
                        brands={brands}
                        product={{
                          id: product.id,
                          name: product.name,
                          slug: product.slug,
                          sku: product.sku,
                          shortDescription: product.shortDescription,
                          description: product.description,
                          price: product.price,
                          compareAtPrice: product.compareAtPrice,
                          priceUsd: product.priceUsd === null ? null : Number(product.priceUsd),
                          usdToClpRate: product.usdToClpRate === null ? null : Number(product.usdToClpRate),
                          lowStockAt: product.lowStockAt,
                          condition: product.condition,
                          categoryId: product.categoryId,
                          brandId: product.brandId,
                          oemCodes: oemText(product.oemCodes),
                          featured: product.featured,
                          isActive: product.isActive,
                          images: product.images.map((image) => ({
                            id: image.id,
                            url: `/api/product-images/${image.id}`,
                          })),
                        }}
                      />
                      <Link
                        href={compatibilityHref(product.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-100"
                      >
                        <IoCarSportOutline className="h-4 w-4" aria-hidden="true" /> Compatibilidad (
                        {product._count.compatibility})
                      </Link>
                      <form action={toggleProductAction}>
                        <input type="hidden" name="id" value={product.id} />
                        <input type="hidden" name="active" value={String(!product.isActive)} />
                        <button
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition ${product.isActive ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                        >
                          {product.isActive ? (
                            <IoEyeOffOutline className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <IoEyeOutline className="h-4 w-4" aria-hidden="true" />
                          )}
                          {product.isActive ? "Desactivar" : "Activar"}
                        </button>
                      </form>
                      <DeleteProductForm compact productId={product.id} productName={product.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!products.length && (
            <div className="px-6 py-16 text-center">
              <IoSearchOutline className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-black text-slate-900">No encontramos productos</h2>
              <p className="mt-2 font-normal text-slate-500">Prueba otra búsqueda o crea un producto nuevo.</p>
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 px-6 py-4">
          <p className="text-sm font-normal text-slate-500">
            Mostrando {firstResult}–{lastResult} de {total}
          </p>
          <nav className="flex items-center gap-2" aria-label="Paginación de productos">
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
      </section>

      {compatibilityProduct && (
        <ProductCompatibilityModal
          product={{
            id: compatibilityProduct.id,
            name: compatibilityProduct.name,
            sku: compatibilityProduct.sku,
          }}
          makes={makes}
          years={years.map(({ year }) => year)}
          items={compatibilityProduct.compatibility.map((item) => ({
            id: item.id,
            make: item.vehicleModel.make.name,
            model: item.vehicleModel.name,
            yearFrom: item.yearFrom,
            yearTo: item.yearTo,
            engine: item.engine,
            notes: item.notes,
          }))}
          closeHref={pageHref(page)}
          listPage={page}
          listQuery={search}
          error={query.error === "compatibility" ? errorMessages.compatibility : undefined}
          success={query.ok === "compatibility" || query.ok === "removed"}
        />
      )}
    </main>
  );
}
