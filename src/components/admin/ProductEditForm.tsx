"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { IoCloudUploadOutline, IoImageOutline } from "react-icons/io5";

import { updateProductAction } from "@/app/actions/admin";
import { ProductCurrencyFields } from "@/components/admin/ProductCurrencyFields";
import { MAX_PRODUCT_IMAGES, optimizeProductImage } from "@/components/admin/product-image-utils";

export type ProductEditOption = { id: string; name: string };
type ExistingImage = { kind: "existing"; id: string; url: string; name: string };
type NewImage = { kind: "new"; data: string; url: string; name: string };
type EditableImage = ExistingImage | NewImage;

export type EditableProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  priceUsd: number | null;
  usdToClpRate: number | null;
  lowStockAt: number;
  condition: string;
  categoryId: string;
  brandId: string | null;
  oemCodes: string;
  featured: boolean;
  isActive: boolean;
  images: Array<{ id: string; url: string }>;
};

function SaveButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="rounded-xl bg-blue-700 px-6 py-3 font-bold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60">{pending ? "Guardando cambios..." : "Guardar cambios"}</button>;
}

type ProductEditFormProps = {
  product: EditableProduct;
  categories: ProductEditOption[];
  brands: ProductEditOption[];
  returnTo?: "detail" | "list";
  serverError?: string;
  onCancel?: () => void;
};

export function ProductEditForm({ product, categories, brands, returnTo = "detail", serverError, onCancel }: ProductEditFormProps) {
  const [images, setImages] = useState<EditableImage[]>(product.images.map((image, index) => ({ kind: "existing", id: image.id, url: image.url, name: `Imagen ${index + 1}` })));
  const [featured, setFeatured] = useState(product.featured);
  const [imageError, setImageError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [priceClp, setPriceClp] = useState(String(product.price));
  const inputRef = useRef<HTMLInputElement>(null);

  async function addImages(fileList?: FileList | null) {
    const files = Array.from(fileList ?? []);
    setImageError("");
    if (!files.length) return;
    if (images.length + files.length > MAX_PRODUCT_IMAGES) {
      setImageError(`Puedes conservar un máximo de ${MAX_PRODUCT_IMAGES} imágenes.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setProcessing(true);
    try {
      const prepared: NewImage[] = [];
      for (const file of files) {
        const data = await optimizeProductImage(file);
        prepared.push({ kind: "new", data, url: data, name: file.name });
      }
      setImages((current) => [...current, ...prepared]);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "No se pudieron preparar las imágenes.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
      setProcessing(false);
    }
  }

  function removeImage(index: number) {
    setImages((current) => current.filter((_, imageIndex) => imageIndex !== index));
  }

  function makeCover(index: number) {
    setImages((current) => {
      const image = current[index];
      return image ? [image, ...current.filter((_, imageIndex) => imageIndex !== index)] : current;
    });
  }

  const inputClass = "rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

  return (
    <form
      action={updateProductAction}
      className="mt-6 grid gap-5 sm:grid-cols-2"
      onSubmit={(event) => {
        if (featured && !images.length) {
          event.preventDefault();
          setImageError("Un producto destacado necesita al menos una imagen.");
        }
      }}
    >
      <input type="hidden" name="id" value={product.id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input
        type="hidden"
        name="imagesData"
        value={JSON.stringify(images.map((image) => image.kind === "existing" ? { id: image.id } : { data: image.data }))}
      />
      {serverError && <p role="alert" className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700 sm:col-span-2">{serverError}</p>}

      <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">Nombre
        <input required name="name" minLength={3} maxLength={160} defaultValue={product.name} className={inputClass} />
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">SKU
        <input required name="sku" minLength={3} maxLength={60} defaultValue={product.sku} className={inputClass} />
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">Slug
        <input required name="slug" minLength={2} maxLength={80} defaultValue={product.slug} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className={inputClass} />
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">Categoría
        <select required name="categoryId" defaultValue={product.categoryId} className={inputClass}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">Marca
        <select name="brandId" defaultValue={product.brandId ?? ""} className={inputClass}><option value="">Sin marca / genérico</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select>
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">Precio CLP
        <input required type="number" name="price" min={1} step={1} value={priceClp} onChange={(event) => setPriceClp(event.target.value)} className={inputClass} />
        <span className="text-xs font-normal text-slate-500">Se completa con la conversión, pero puedes modificarlo.</span>
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">Precio anterior <span className="font-normal text-slate-400">(opcional)</span>
        <input type="number" name="compareAtPrice" min={1} step={1} defaultValue={product.compareAtPrice ?? ""} className={inputClass} />
      </label>
      <ProductCurrencyFields
        defaultPriceUsd={product.priceUsd}
        defaultUsdToClpRate={product.usdToClpRate}
        onConversionChange={(convertedPrice) => setPriceClp(String(convertedPrice))}
      />
      <label className="grid gap-2 text-sm font-bold text-slate-700">Aviso de stock bajo
        <input required type="number" name="lowStockAt" min={0} step={1} defaultValue={product.lowStockAt} className={inputClass} />
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">Condición
        <select name="condition" defaultValue={product.condition} className={inputClass}><option value="NEW">Nuevo</option><option value="REMANUFACTURED">Remanufacturado</option><option value="USED">Usado</option></select>
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">Códigos OEM
        <input name="oemCodes" maxLength={500} defaultValue={product.oemCodes} className={inputClass} />
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">Descripción corta
        <input required name="shortDescription" minLength={5} maxLength={220} defaultValue={product.shortDescription} className={inputClass} />
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">Descripción completa
        <textarea required name="description" minLength={10} maxLength={2000} rows={5} defaultValue={product.description} className={inputClass} />
      </label>

      <div className="sm:col-span-2">
        <div className="flex items-end justify-between"><span className="text-sm font-bold text-slate-700">Imágenes</span><span className="text-xs font-semibold text-slate-500">{images.length}/{MAX_PRODUCT_IMAGES}</span></div>
        {images.length > 0 && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {images.map((image, index) => (
              <article key={image.kind === "existing" ? image.id : `${image.name}-${index}`} className={`overflow-hidden rounded-2xl border bg-white ${index === 0 ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={`Imagen ${index + 1}`} className="aspect-[4/3] w-full object-contain" />
                <div className="border-t border-slate-100 p-2">
                  <span className={`text-[11px] font-bold ${index === 0 ? "text-blue-700" : "text-slate-500"}`}>{index === 0 ? "Portada" : `Imagen ${index + 1}`}</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {index > 0 && <button type="button" onClick={() => makeCover(index)} className="text-[11px] font-bold text-blue-700">Hacer portada</button>}
                    <button type="button" onClick={() => removeImage(index)} className="text-[11px] font-bold text-red-700">Quitar</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {images.length < MAX_PRODUCT_IMAGES && (
          <label className="mt-3 flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 px-5 py-6 text-center hover:border-blue-500 hover:bg-blue-50">
            {processing ? <span className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" /> : <IoCloudUploadOutline className="h-7 w-7 text-blue-700" />}
            <span><b className="block text-sm">{processing ? "Optimizando imágenes..." : "Agregar imágenes"}</b><small className="text-slate-500">Conversión automática a WEBP 4:3</small></span>
            <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={processing} onChange={(event) => void addImages(event.target.files)} className="sr-only" />
          </label>
        )}
        {imageError && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{imageError}</p>}
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:col-span-2">
        <input type="checkbox" name="featured" checked={featured} onChange={(event) => setFeatured(event.target.checked)} className="mt-1 h-4 w-4 rounded" />
        <span><span className="flex items-center gap-2 text-sm font-bold"><IoImageOutline className="text-blue-700" /> Mostrar en la página principal</span><span className="mt-1 block text-xs font-normal text-slate-600">Requiere al menos una imagen.</span></span>
      </label>
      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 sm:col-span-2">
        <input type="checkbox" name="isActive" defaultChecked={product.isActive} className="h-4 w-4 rounded" />
        <span className="text-sm font-bold text-slate-800">Producto activo y visible en el catálogo</span>
      </label>

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 sm:col-span-2">
        {onCancel && <button type="button" onClick={onCancel} className="rounded-xl border border-slate-300 px-6 py-3 font-bold text-slate-700 hover:bg-slate-50">Cancelar</button>}
        <SaveButton />
      </div>
    </form>
  );
}
