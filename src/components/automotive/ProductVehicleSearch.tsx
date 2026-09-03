"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IoSearchOutline } from "react-icons/io5";

import type { ProductVehicleFilterOption } from "@/interfaces";

type ProductVehicleSearchProps = {
  category?: string;
  initialMakeId?: string;
  initialModelId?: string;
  initialQuery?: string;
  options: ProductVehicleFilterOption[];
};

export function ProductVehicleSearch({ category, initialMakeId = "", initialModelId = "", initialQuery = "", options }: ProductVehicleSearchProps) {
  const validInitialMake = options.some((make) => make.id === initialMakeId) ? initialMakeId : "";
  const [makeId, setMakeId] = useState(validInitialMake);
  const models = useMemo(() => options.find((make) => make.id === makeId)?.models ?? [], [makeId, options]);
  const validInitialModel = models.some((model) => model.id === initialModelId) ? initialModelId : "";
  const [modelId, setModelId] = useState(validInitialModel);

  return (
    <form className="my-10 rounded-3xl border border-blue-100 bg-blue-50/70 p-5 shadow-sm sm:p-7">
      {category && <input type="hidden" name="category" value={category} />}
      <div className="mb-5">
        <h2 className="text-xl font-black text-slate-950">Encuentra repuestos para tu vehículo</h2>
        <p className="mt-1 text-sm text-slate-600">Solo mostramos marcas y modelos que tienen productos disponibles.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr_auto] lg:items-end">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Marca
          <select
            name="make"
            value={makeId}
            onChange={(event) => {
              setMakeId(event.target.value);
              setModelId("");
            }}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">Todas las marcas</option>
            {options.map((make) => <option key={make.id} value={make.id}>{make.name}</option>)}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Modelo
          <select
            name="model"
            value={modelId}
            disabled={!makeId}
            onChange={(event) => setModelId(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">{makeId ? "Todos los modelos" : "Primero elige una marca"}</option>
            {models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Repuesto, SKU o código OEM
          <input
            name="q"
            defaultValue={initialQuery}
            placeholder="Ej. pastillas de freno"
            className="min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          />
        </label>

        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 font-bold text-white hover:bg-blue-800">
          <IoSearchOutline aria-hidden="true" /> Buscar
        </button>
      </div>

      {(initialQuery || initialMakeId || initialModelId) && (
        <Link href={category ? `/products?category=${encodeURIComponent(category)}` : "/products"} className="mt-4 inline-block text-sm font-bold text-blue-700 hover:underline">
          Limpiar filtros
        </Link>
      )}
    </form>
  );
}
