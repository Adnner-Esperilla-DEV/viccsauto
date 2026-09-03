"use client";

import { useRef, useState } from "react";
import { IoCloudUploadOutline } from "react-icons/io5";

import { optimizeProductImage } from "@/components/admin/product-image-utils";

type ExistingImage = { kind: "existing"; id: string; url: string; name: string };
type NewImage = { kind: "new"; data: string; url: string; name: string };
type EditableImage = ExistingImage | NewImage;

type AdminImageManagerProps = {
  initialImages?: Array<{ id: string; url: string }>;
  maxImages: number;
  onProcessingChange?: (processing: boolean) => void;
  title: string;
};

export function AdminImageManager({ initialImages = [], maxImages, onProcessingChange, title }: AdminImageManagerProps) {
  const [images, setImages] = useState<EditableImage[]>(initialImages.map((image, index) => ({
    kind: "existing",
    id: image.id,
    url: image.url,
    name: `Imagen ${index + 1}`,
  })));
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function addImages(fileList?: FileList | null) {
    const files = Array.from(fileList ?? []);
    setError("");
    if (!files.length) return;
    if (images.length + files.length > maxImages) {
      setError(`Puedes agregar un máximo de ${maxImages} imágenes.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setProcessing(true);
    onProcessingChange?.(true);
    try {
      const prepared: NewImage[] = [];
      for (const file of files) {
        const data = await optimizeProductImage(file);
        prepared.push({ kind: "new", data, url: data, name: file.name });
      }
      setImages((current) => [...current, ...prepared]);
    } catch (imageError) {
      setError(imageError instanceof Error ? imageError.message : "No se pudieron preparar las imágenes.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
      setProcessing(false);
      onProcessingChange?.(false);
    }
  }

  function removeImage(index: number) {
    setImages((current) => current.filter((_, imageIndex) => imageIndex !== index));
    setError("");
  }

  function makeCover(index: number) {
    setImages((current) => {
      const selected = current[index];
      return selected ? [selected, ...current.filter((_, imageIndex) => imageIndex !== index)] : current;
    });
  }

  return (
    <div className="sm:col-span-2">
      <input
        type="hidden"
        name="imagesData"
        value={JSON.stringify(images.map((image) => image.kind === "existing" ? { id: image.id } : { data: image.data }))}
      />
      <div className="flex items-end justify-between gap-4">
        <span className="text-sm font-bold text-slate-700">{title} <span className="font-normal text-slate-400">(opcional)</span></span>
        <span className="text-xs font-semibold text-slate-500">{images.length}/{maxImages}</span>
      </div>

      {images.length > 0 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {images.map((image, index) => (
            <article key={image.kind === "existing" ? image.id : `${image.name}-${index}`} className={`overflow-hidden rounded-2xl border bg-white ${index === 0 ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt={`Vista previa ${index + 1}`} className="aspect-[4/3] w-full bg-slate-50 object-contain" />
              <div className="border-t border-slate-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${index === 0 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>{index === 0 ? "Portada" : `Imagen ${index + 1}`}</span>
                  <button type="button" onClick={() => removeImage(index)} className="text-xs font-bold text-red-700">Quitar</button>
                </div>
                {index > 0 && <button type="button" onClick={() => makeCover(index)} className="mt-2 text-xs font-bold text-blue-700 hover:underline">Usar como portada</button>}
              </div>
            </article>
          ))}
        </div>
      )}

      {images.length < maxImages && (
        <label className="mt-3 flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 px-5 py-7 text-center transition hover:border-blue-500 hover:bg-blue-50">
          {processing ? <span className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" /> : <IoCloudUploadOutline className="h-7 w-7 text-blue-700" />}
          <span>
            <b className="block text-sm text-slate-800">{processing ? "Optimizando imágenes..." : images.length ? "Agregar más imágenes" : `Seleccionar hasta ${maxImages} imágenes`}</b>
            <small className="text-slate-500">La primera será la portada. Se ajustan a 4:3 y se convierten a WebP.</small>
          </span>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            disabled={processing}
            onChange={(event) => void addImages(event.target.files)}
            className="sr-only"
          />
        </label>
      )}
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
