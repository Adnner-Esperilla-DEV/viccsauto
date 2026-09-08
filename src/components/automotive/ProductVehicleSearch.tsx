"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { IoCheckmarkOutline, IoChevronDownOutline, IoSearchOutline } from "react-icons/io5";

import type { ProductVehicleFilterOption } from "@/interfaces";

type ProductVehicleSearchProps = {
  category?: string;
  initialMakeId?: string;
  initialModelId?: string;
  initialQuery?: string;
  options: ProductVehicleFilterOption[];
};

export function ProductVehicleSearch({
  category,
  initialMakeId = "",
  initialModelId = "",
  initialQuery = "",
  options,
}: ProductVehicleSearchProps) {
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
        <VehicleFilterSelect
          name="make"
          label="Marca"
          value={makeId}
          placeholder="Todas las marcas"
          options={options.map((make) => ({ value: make.id, label: make.name }))}
          onChange={(value) => {
            setMakeId(value);
            setModelId("");
          }}
        />

        <VehicleFilterSelect
          name="model"
          label="Modelo"
          value={modelId}
          placeholder={makeId ? "Todos los modelos" : "Primero elige una marca"}
          options={models.map((model) => ({ value: model.id, label: model.name }))}
          disabled={!makeId}
          onChange={setModelId}
        />

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
        <Link
          href={category ? `/products?category=${encodeURIComponent(category)}` : "/products"}
          className="mt-4 inline-block text-sm font-bold text-blue-700 hover:underline"
        >
          Limpiar filtros
        </Link>
      )}
    </form>
  );
}

type FilterOption = { value: string; label: string };

function VehicleFilterSelect({
  name,
  label,
  value,
  placeholder,
  options,
  disabled = false,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  placeholder: string;
  options: FilterOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const choices = [{ value: "", label: placeholder }, ...options];
  const selected = choices.find((option) => option.value === value) ?? choices[0];

  function choose(index: number) {
    const option = choices[index];
    if (!option) return;
    onChange(option.value);
    setActiveIndex(index);
    setOpen(false);
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <span className="block text-sm font-bold text-slate-700">{label}</span>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.min(index + 1, choices.length - 1));
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.max(index - 1, 0));
          }
          if (event.key === "Enter" && open) {
            event.preventDefault();
            choose(activeIndex);
          }
          if (event.key === "Escape") setOpen(false);
        }}
        className={`mt-2 flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left font-normal outline-none transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 ${open ? "border-blue-600 bg-white ring-4 ring-blue-100" : "border-slate-300 bg-white"}`}
      >
        <span className="truncate">{selected.label}</span>
        <IoChevronDownOutline
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 transition ${open ? "rotate-180 text-blue-700" : "text-slate-500"}`}
        />
      </button>
      {open && !disabled && (
        <div
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-40 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
        >
          {choices.map((option, index) => (
            <button
              key={`${option.value}-${index}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(index)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${index === activeIndex ? "bg-blue-50 text-blue-800" : "text-slate-700 hover:bg-slate-50"}`}
            >
              <span className="truncate">{option.label}</span>
              {option.value === value && (
                <IoCheckmarkOutline aria-hidden="true" className="h-5 w-5 shrink-0 text-blue-700" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
