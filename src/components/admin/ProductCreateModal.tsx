"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { IoAddOutline, IoCloseOutline, IoCloudUploadOutline, IoImageOutline } from "react-icons/io5";

import { createProductAction } from "@/app/actions/admin";
import { ProductCurrencyFields } from "@/components/admin/ProductCurrencyFields";
import { MAX_PRODUCT_IMAGES, optimizeProductImage } from "@/components/admin/product-image-utils";

type Option = { id: string; name: string };
type PreparedImage = { data: string; name: string };

type ProductCreateModalProps = {
  brands: Option[];
  categories: Option[];
  initialOpen?: boolean;
  serverError?: string;
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-blue-700 px-6 py-3 font-bold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Guardando producto..." : "Crear producto"}
    </button>
  );
}

export function ProductCreateModal({ brands, categories, initialOpen = false, serverError }: ProductCreateModalProps) {
  const [open, setOpen] = useState(initialOpen);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [images, setImages] = useState<PreparedImage[]>([]);
  const [imageError, setImageError] = useState("");
  const [featured, setFeatured] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [priceClp, setPriceClp] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const titleId = "new-product-title";

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleImages(fileList?: FileList | null) {
    setImageError("");
    const files = Array.from(fileList ?? []);
    if (!files.length) return;
    if (images.length + files.length > MAX_PRODUCT_IMAGES) {
      setImageError(`Puedes agregar un máximo de ${MAX_PRODUCT_IMAGES} imágenes.`);
      if (fileInput.current) fileInput.current.value = "";
      return;
    }

    setProcessingImage(true);
    try {
      const prepared: PreparedImage[] = [];
      for (const file of files) prepared.push({ data: await optimizeProductImage(file), name: file.name });
      setImages((current) => [...current, ...prepared]);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "No se pudo preparar la imagen.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
      setProcessingImage(false);
    }
  }

  function removeImage(index: number) {
    setImages((current) => current.filter((_, imageIndex) => imageIndex !== index));
    setImageError("");
  }

  function makeCover(index: number) {
    setImages((current) => {
      const selected = current[index];
      return selected ? [selected, ...current.filter((_, imageIndex) => imageIndex !== index)] : current;
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
      >
        <IoAddOutline className="h-5 w-5" aria-hidden="true" />
        Nuevo producto
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm sm:p-8"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="my-auto w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-6 border-b border-slate-200 px-6 py-5 sm:px-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Catálogo</p>
                <h2 id={titleId} className="mt-1 text-2xl font-black text-slate-950">
                  Nuevo producto
                </h2>
                <p className="mt-1 text-sm font-normal text-slate-500">
                  Podrás gestionar la compatibilidad después de crearlo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Cerrar modal"
              >
                <IoCloseOutline className="h-6 w-6" />
              </button>
            </header>

            <form
              action={createProductAction}
              className="grid max-h-[calc(100vh-10rem)] gap-5 overflow-y-auto px-6 py-6 sm:grid-cols-2 sm:px-8"
              onSubmit={(event) => {
                if (featured && !images.length) {
                  event.preventDefault();
                  setImageError("Agrega una imagen para mostrar el producto en la página principal.");
                }
              }}
            >
              <input type="hidden" name="imagesData" value={JSON.stringify(images.map((image) => image.data))} />
              {serverError && (
                <p
                  role="alert"
                  className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700 sm:col-span-2"
                >
                  {serverError}
                </p>
              )}

              <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
                Nombre del producto
                <input
                  required
                  name="name"
                  minLength={3}
                  maxLength={160}
                  value={name}
                  onChange={(event) => {
                    const nextName = event.target.value;
                    setName(nextName);
                    if (!slugEdited) setSlug(slugify(nextName));
                  }}
                  placeholder="Ej. Pastillas de freno delanteras"
                  className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-slate-700">
                SKU
                <input
                  required
                  name="sku"
                  minLength={3}
                  maxLength={60}
                  placeholder="FRE-001"
                  className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Slug
                <input
                  required
                  name="slug"
                  minLength={2}
                  maxLength={80}
                  value={slug}
                  onChange={(event) => {
                    setSlugEdited(true);
                    setSlug(slugify(event.target.value));
                  }}
                  placeholder="pastillas-freno-delanteras"
                  className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Categoría
                <select
                  required
                  name="categoryId"
                  defaultValue=""
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-blue-600"
                >
                  <option value="" disabled>
                    Seleccionar categoría
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Marca <span className="font-normal text-slate-400">(opcional)</span>
                <select
                  name="brandId"
                  defaultValue=""
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-blue-600"
                >
                  <option value="">Sin marca / genérico</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Precio CLP
                <input
                  required
                  type="number"
                  name="price"
                  min={1}
                  step={1}
                  value={priceClp}
                  onChange={(event) => setPriceClp(event.target.value)}
                  placeholder="29990"
                  className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
                <span className="text-xs font-normal text-slate-500">
                  Se completa con la conversión, pero puedes modificarlo.
                </span>
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Stock inicial
                <input
                  required
                  type="number"
                  name="stock"
                  min={0}
                  step={1}
                  defaultValue={0}
                  className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <ProductCurrencyFields onConversionChange={(convertedPrice) => setPriceClp(String(convertedPrice))} />

              <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
                Códigos OEM <span className="font-normal text-slate-400">(opcionales, separados por coma)</span>
                <input
                  name="oemCodes"
                  maxLength={500}
                  placeholder="04465-0D150, 04465-YZZE1"
                  className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
                Descripción corta
                <input
                  required
                  name="shortDescription"
                  minLength={5}
                  maxLength={220}
                  placeholder="Resumen visible en el catálogo"
                  className="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
                Descripción completa
                <textarea
                  required
                  name="description"
                  minLength={10}
                  maxLength={2000}
                  rows={4}
                  placeholder="Características, aplicación y recomendaciones..."
                  className="resize-y rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <div className="sm:col-span-2">
                <div className="flex items-end justify-between gap-4">
                  <span className="text-sm font-bold text-slate-700">
                    Imágenes del producto <span className="font-normal text-slate-400">(opcional)</span>
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {images.length}/{MAX_PRODUCT_IMAGES}
                  </span>
                </div>
                {images.length > 0 && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {images.map((image, index) => (
                      <article
                        key={`${image.name}-${index}`}
                        className={`relative overflow-hidden rounded-2xl border bg-white ${index === 0 ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.data}
                          alt={`Vista previa ${index + 1}`}
                          className="aspect-[4/3] w-full object-contain"
                        />
                        <div className="border-t border-slate-100 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`rounded-full px-2 py-1 text-[11px] font-bold ${index === 0 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}
                            >
                              {index === 0 ? "Portada" : `Imagen ${index + 1}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="text-xs font-bold text-red-700"
                            >
                              Quitar
                            </button>
                          </div>
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => makeCover(index)}
                              className="mt-2 text-xs font-bold text-blue-700 hover:underline"
                            >
                              Usar como portada
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                {images.length < MAX_PRODUCT_IMAGES && (
                  <label className="mt-2 flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 px-5 py-7 text-center transition hover:border-blue-500 hover:bg-blue-50">
                    {processingImage ? (
                      <span className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" />
                    ) : (
                      <IoCloudUploadOutline className="h-7 w-7 text-blue-700" />
                    )}
                    <span>
                      <b className="block text-sm text-slate-800">
                        {processingImage
                          ? "Optimizando imágenes..."
                          : images.length
                            ? "Agregar más imágenes"
                            : "Seleccionar de 1 a 5 imágenes"}
                      </b>
                      <small className="text-slate-500">Se ajustan a 4:3 y se convierten automáticamente a WEBP</small>
                    </span>
                    <input
                      ref={fileInput}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      disabled={processingImage}
                      onChange={(event) => void handleImages(event.target.files)}
                      className="sr-only"
                    />
                  </label>
                )}
                {imageError && (
                  <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
                    {imageError}
                  </p>
                )}
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:col-span-2">
                <input
                  type="checkbox"
                  name="featured"
                  checked={featured}
                  onChange={(event) => setFeatured(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700"
                />
                <span>
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <IoImageOutline className="text-blue-700" /> Mostrar en la página principal
                  </span>
                  <span className="mt-1 block text-xs font-normal text-slate-600">
                    Para activar esta opción es obligatorio agregar una imagen.
                  </span>
                </span>
              </label>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-slate-300 px-6 py-3 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <SubmitButton />
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
