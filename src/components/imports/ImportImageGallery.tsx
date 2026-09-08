"use client";

import Link from "next/link";
import { useState } from "react";
import { IoDownloadOutline, IoOpenOutline, IoTrashOutline } from "react-icons/io5";

import { deleteVehicleImportImageAction } from "@/app/actions/imports";

export function ImportImageGallery({
  images,
  vehicleName,
  importId,
  editable = false,
}: {
  images: Array<{ id: string; filename: string }>;
  vehicleName: string;
  importId: string;
  editable?: boolean;
}) {
  const [selected, setSelected] = useState(0);
  if (!images.length)
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        No hay imágenes registradas.
      </p>
    );
  const active = images[selected] ?? images[0];
  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/import-images/${active.id}`}
        alt={`${vehicleName} - ${active.filename}`}
        className="aspect-[4/3] w-full rounded-3xl border bg-slate-50 object-contain"
      />
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <a
          href={`/api/import-images/download/${importId}`}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
        >
          <IoDownloadOutline aria-hidden="true" /> Descargar todas en ZIP
        </a>
        <Link
          href={`/api/import-images/${active.id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
        >
          <IoOpenOutline aria-hidden="true" /> Abrir archivo original
        </Link>
      </div>
      {(images.length > 1 || editable) && (
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {images.map((image, index) => (
            <div key={image.id} className="group relative">
              <button
                type="button"
                onClick={() => setSelected(index)}
                aria-label={`Ver imagen ${index + 1}`}
                className={`block w-full overflow-hidden rounded-xl border-2 ${selected === index ? "border-blue-600 ring-2 ring-blue-100" : "border-slate-200"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/import-images/${image.id}`} alt="" className="aspect-[4/3] w-full object-cover" />
              </button>
              {editable && (
                <form action={deleteVehicleImportImageAction} className="absolute bottom-1.5 right-1.5 z-10">
                  <input type="hidden" name="importId" value={importId} />
                  <input type="hidden" name="imageId" value={image.id} />
                  <button
                    type="submit"
                    aria-label={`Eliminar ${image.filename}`}
                    title="Eliminar imagen"
                    onClick={(event) => {
                      if (
                        !window.confirm(
                          `¿Seguro que deseas eliminar ${image.filename}? Esta acción no se puede deshacer.`,
                        )
                      )
                        event.preventDefault();
                    }}
                    className="grid h-7 w-7 place-items-center rounded-lg border border-blue-700 bg-blue-700/80 text-white opacity-80 shadow-md backdrop-blur-sm transition duration-150 group-hover:opacity-100 hover:scale-105 hover:border-blue-800 hover:bg-blue-800 focus:border-blue-800 focus:bg-blue-800 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <IoTrashOutline aria-hidden="true" className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
