"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { IoAddOutline, IoCloseOutline, IoCreateOutline } from "react-icons/io5";

import { createVehicleAction, updateVehicleAction } from "@/app/actions/admin";
import { AdminImageManager } from "@/components/admin/AdminImageManager";
import { AdminSelect, type AdminSelectOption } from "@/components/admin/AdminSelect";

export type EditableVehicle = {
  id: string;
  slug: string;
  stockNumber: string;
  vin: string | null;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  transmission: string;
  fuel: string;
  condition: string;
  location: string;
  description: string;
  color: string | null;
  engine: string | null;
  features: string;
  status: string;
  featured: boolean;
  images: Array<{ id: string; url: string }>;
};

type VehicleModalProps = {
  vehicle?: EditableVehicle;
  initialOpen?: boolean;
  serverError?: string;
  returnPage?: number;
};

const transmissionOptions: readonly AdminSelectOption[] = [
  { value: "Automática", label: "Automática" },
  { value: "Mecánica", label: "Mecánica" },
];

const fuelOptions: readonly AdminSelectOption[] = [
  { value: "Gasolina", label: "Gasolina" },
  { value: "Diésel", label: "Diésel" },
  { value: "Híbrido", label: "Híbrido" },
  { value: "Eléctrico", label: "Eléctrico" },
];

const conditionOptions: readonly AdminSelectOption[] = [
  { value: "Nuevo", label: "Nuevo" },
  { value: "Seminuevo", label: "Seminuevo" },
  { value: "Usado", label: "Usado" },
];

const statusOptions: readonly AdminSelectOption[] = [
  { value: "AVAILABLE", label: "Disponible" },
  { value: "RESERVED", label: "Reservado" },
  { value: "SOLD", label: "Vendido" },
  { value: "INACTIVE", label: "Inactivo" },
];

function optionsWithCurrent(options: readonly AdminSelectOption[], current: string) {
  return options.some((option) => option.value === current)
    ? options
    : [{ value: current, label: current }, ...options];
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function SubmitButton({ editing, processingImages }: { editing: boolean; processingImages: boolean }) {
  const { pending } = useFormStatus();
  const disabled = pending || processingImages;
  return (
    <button
      disabled={disabled}
      className="rounded-xl bg-blue-700 px-6 py-3 font-bold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60 sm:col-span-2"
    >
      {processingImages
        ? "Preparando imágenes..."
        : pending
          ? "Guardando vehículo..."
          : editing
            ? "Guardar cambios"
            : "Crear vehículo"}
    </button>
  );
}

export function VehicleModal({ vehicle, initialOpen = false, serverError, returnPage = 1 }: VehicleModalProps) {
  const editing = Boolean(vehicle);
  const [open, setOpen] = useState(initialOpen);
  const [make, setMake] = useState(vehicle?.make ?? "");
  const [model, setModel] = useState(vehicle?.model ?? "");
  const [year, setYear] = useState(vehicle ? String(vehicle.year) : "");
  const [slug, setSlug] = useState(vehicle?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(editing);
  const [processingImages, setProcessingImages] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function refreshSlug(nextMake: string, nextModel: string, nextYear: string) {
    if (!slugEdited) setSlug(slugify(`${nextMake} ${nextModel} ${nextYear}`));
  }

  const inputClass =
    "rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";
  const titleId = vehicle ? `edit-vehicle-${vehicle.id}` : "create-vehicle";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          editing
            ? "inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
            : "inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800"
        }
      >
        {editing ? <IoCreateOutline aria-hidden="true" /> : <IoAddOutline className="h-5 w-5" aria-hidden="true" />}
        {editing ? "Editar" : "Nuevo vehículo"}
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
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Vehículos</p>
                <h2 id={titleId} className="mt-1 text-2xl font-black text-slate-950">
                  {editing ? `Editar ${vehicle!.year} ${vehicle!.make} ${vehicle!.model}` : "Nuevo vehículo"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">Completa la información comercial y de publicación.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar modal"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <IoCloseOutline className="h-6 w-6" />
              </button>
            </header>

            <form
              action={editing ? updateVehicleAction : createVehicleAction}
              className="grid max-h-[calc(100vh-10rem)] gap-5 overflow-y-auto px-6 py-6 sm:grid-cols-2 sm:px-8"
            >
              {vehicle && <input type="hidden" name="id" value={vehicle.id} />}
              <input type="hidden" name="returnPage" value={returnPage} />
              {serverError && (
                <p
                  role="alert"
                  className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700 sm:col-span-2"
                >
                  {serverError}
                </p>
              )}

              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Marca
                <input
                  required
                  name="make"
                  minLength={2}
                  maxLength={80}
                  value={make}
                  onChange={(event) => {
                    setMake(event.target.value);
                    refreshSlug(event.target.value, model, year);
                  }}
                  placeholder="Toyota"
                  className={inputClass}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Modelo
                <input
                  required
                  name="model"
                  maxLength={100}
                  value={model}
                  onChange={(event) => {
                    setModel(event.target.value);
                    refreshSlug(make, event.target.value, year);
                  }}
                  placeholder="RAV4 Limited"
                  className={inputClass}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Año
                <input
                  required
                  type="number"
                  name="year"
                  min={1950}
                  max={2100}
                  value={year}
                  onChange={(event) => {
                    setYear(event.target.value);
                    refreshSlug(make, model, event.target.value);
                  }}
                  className={inputClass}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Número de stock
                <input
                  required
                  name="stockNumber"
                  minLength={3}
                  maxLength={60}
                  defaultValue={vehicle?.stockNumber ?? ""}
                  placeholder="VIC-AUTO-001"
                  className={inputClass}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
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
                  placeholder="toyota-rav4-2021-limited"
                  className={inputClass}
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Precio CLP
                <input
                  required
                  type="number"
                  name="price"
                  min={1}
                  step={1}
                  defaultValue={vehicle?.price ?? ""}
                  placeholder="21990000"
                  className={inputClass}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Kilometraje
                <input
                  required
                  type="number"
                  name="mileage"
                  min={0}
                  step={1}
                  defaultValue={vehicle?.mileage ?? 0}
                  className={inputClass}
                />
              </label>

              <AdminSelect
                name="transmission"
                label="Transmisión"
                defaultValue={vehicle?.transmission ?? "Automática"}
                options={optionsWithCurrent(transmissionOptions, vehicle?.transmission ?? "Automática")}
              />
              <AdminSelect
                name="fuel"
                label="Combustible"
                defaultValue={vehicle?.fuel ?? "Gasolina"}
                options={optionsWithCurrent(fuelOptions, vehicle?.fuel ?? "Gasolina")}
              />
              <AdminSelect
                name="condition"
                label="Condición"
                defaultValue={vehicle?.condition ?? "Usado"}
                options={optionsWithCurrent(conditionOptions, vehicle?.condition ?? "Usado")}
              />
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Ubicación
                <input
                  required
                  name="location"
                  minLength={2}
                  maxLength={120}
                  defaultValue={vehicle?.location ?? "Arica"}
                  className={inputClass}
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-slate-700">
                VIN <span className="font-normal text-slate-400">(opcional)</span>
                <input name="vin" maxLength={40} defaultValue={vehicle?.vin ?? ""} className={inputClass} />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Color <span className="font-normal text-slate-400">(opcional)</span>
                <input name="color" maxLength={60} defaultValue={vehicle?.color ?? ""} className={inputClass} />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Motor <span className="font-normal text-slate-400">(opcional)</span>
                <input
                  name="engine"
                  maxLength={100}
                  defaultValue={vehicle?.engine ?? ""}
                  placeholder="2.0 Turbo"
                  className={inputClass}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Características <span className="font-normal text-slate-400">(separadas por coma)</span>
                <input
                  name="features"
                  maxLength={1000}
                  defaultValue={vehicle?.features ?? ""}
                  placeholder="Cámara 360°, control crucero"
                  className={inputClass}
                />
              </label>

              {vehicle && (
                <AdminSelect
                  name="status"
                  label="Estado"
                  defaultValue={vehicle.status}
                  options={optionsWithCurrent(statusOptions, vehicle.status)}
                />
              )}
              <label
                className={`flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 ${vehicle ? "" : "sm:col-span-2"}`}
              >
                <input
                  type="checkbox"
                  name="featured"
                  defaultChecked={vehicle?.featured ?? false}
                  className="h-5 w-5 accent-blue-700"
                />
                <span>
                  <b className="block text-sm text-slate-800">Destacar vehículo</b>
                  <small className="text-slate-500">Mostrarlo con prioridad en la página principal.</small>
                </span>
              </label>

              <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
                Descripción
                <textarea
                  required
                  name="description"
                  minLength={10}
                  maxLength={2000}
                  rows={5}
                  defaultValue={vehicle?.description ?? ""}
                  className={inputClass}
                />
              </label>

              <AdminImageManager
                title="Imágenes del vehículo"
                maxImages={10}
                initialImages={vehicle?.images}
                onProcessingChange={setProcessingImages}
              />

              <SubmitButton editing={editing} processingImages={processingImages} />
            </form>
          </section>
        </div>
      )}
    </>
  );
}
