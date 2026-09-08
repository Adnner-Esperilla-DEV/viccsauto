"use client";

import { useState } from "react";

export function ProductImageGallery({
  images,
  name,
  type = "producto",
}: {
  images: string[];
  name: string;
  type?: "producto" | "vehículo";
}) {
  const [selected, setSelected] = useState(0);
  const activeImage = images[selected] ?? images[0];

  return (
    <div>
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[3rem] border border-slate-100 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={activeImage} alt={`${name} - imagen ${selected + 1}`} className="h-full w-full object-contain" />
      </div>
      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-5 gap-3" aria-label={`Imágenes del ${type}`}>
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => setSelected(index)}
              aria-label={`Ver imagen ${index + 1} de ${name}`}
              aria-pressed={selected === index}
              className={`aspect-[4/3] overflow-hidden rounded-xl border-2 bg-white transition ${selected === index ? "border-blue-700 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-400"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
      {/* <p className="mt-3 text-center text-xs font-normal text-slate-400">La primera imagen corresponde a la portada.</p> */}
    </div>
  );
}
