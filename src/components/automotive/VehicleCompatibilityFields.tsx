"use client";

import { useEffect, useMemo, useState } from "react";

type MakeOption = { id: string; name: string };
type ModelOption = { id: string; name: string };

function sameText(left: string, right: string) {
  return left.trim().localeCompare(right.trim(), "es", { sensitivity: "base" }) === 0;
}

function searchText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function matchingOptions<T extends { name: string }>(options: T[], query: string) {
  const term = searchText(query);
  if (!term) return [];
  return options
    .filter((option) => searchText(option.name).includes(term))
    .sort((left, right) => {
      const leftStarts = searchText(left.name).startsWith(term);
      const rightStarts = searchText(right.name).startsWith(term);
      return Number(rightStarts) - Number(leftStarts) || left.name.localeCompare(right.name, "es");
    })
    .slice(0, 8);
}

export function VehicleCompatibilityFields({ makes }: { makes: MakeOption[] }) {
  const [makeName, setMakeName] = useState("");
  const [modelName, setModelName] = useState("");
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [makeOpen, setMakeOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);

  const selectedMake = useMemo(
    () => makes.find((make) => sameText(make.name, makeName)),
    [makeName, makes],
  );
  const selectedModel = useMemo(
    () => models.find((model) => sameText(model.name, modelName)),
    [modelName, models],
  );
  const matchingMakes = useMemo(() => matchingOptions(makes, makeName), [makeName, makes]);
  const matchingModels = useMemo(() => matchingOptions(models, modelName), [modelName, models]);

  function changeMake(nextName: string) {
    const nextMake = makes.find((make) => sameText(make.name, nextName));
    setMakeName(nextName);
    setModelName("");
    setModels([]);
    setLoadError(false);
    setLoading(Boolean(nextMake));
    setModelOpen(false);
  }

  useEffect(() => {
    if (!selectedMake) return;

    const controller = new AbortController();
    let active = true;
    const timeoutId = window.setTimeout(() => {
      if (!active) return;
      setLoadError(true);
      setLoading(false);
      controller.abort();
    }, 8_000);

    fetch(`/api/vehicle-models?makeId=${encodeURIComponent(selectedMake.id)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) throw new Error("No se pudieron cargar los modelos");
        return response.json() as Promise<ModelOption[]>;
      })
      .then((loadedModels) => {
        if (active) setModels(loadedModels);
      })
      .catch((error: unknown) => {
        if (active && !(error instanceof DOMException && error.name === "AbortError")) setLoadError(true);
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [selectedMake]);

  return (
    <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
      <div className="grid content-start gap-1 text-sm font-bold">
        <label htmlFor="vehicle-make">Marca</label>
        <div className="relative">
          <input
            id="vehicle-make"
            required
            value={makeName}
            onChange={(event) => { changeMake(event.target.value); setMakeOpen(true); }}
            onFocus={() => setMakeOpen(true)}
            onBlur={() => setMakeOpen(false)}
            placeholder="Escribe, ej. Ford"
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={makeOpen && Boolean(makeName.trim())}
            aria-controls="vehicle-make-options"
            className="w-full rounded-xl border p-3 font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
          {makeOpen && makeName.trim() && (
            <div id="vehicle-make-options" role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
              {matchingMakes.length ? matchingMakes.map((make) => (
                <button
                  key={make.id}
                  type="button"
                  role="option"
                  aria-selected={selectedMake?.id === make.id}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => { changeMake(make.name); setMakeOpen(false); }}
                  className="block w-full px-4 py-2.5 text-left font-normal hover:bg-blue-50 hover:text-blue-800"
                >
                  {make.name}
                </button>
              )) : <p className="px-4 py-3 font-normal text-slate-500">No hay marcas coincidentes.</p>}
            </div>
          )}
        </div>
        {makeName && !selectedMake && <small className="font-normal text-amber-700">Selecciona una marca de las sugerencias.</small>}
      </div>

      <div className="grid content-start gap-1 text-sm font-bold">
        <label htmlFor="vehicle-model">Modelo</label>
        <div className="relative">
          <input
            id="vehicle-model"
            required
            value={modelName}
            onChange={(event) => { setModelName(event.target.value); setModelOpen(true); }}
            onFocus={() => setModelOpen(true)}
            onBlur={() => setModelOpen(false)}
            placeholder={selectedMake ? "Escribe, ej. Escape" : "Primero selecciona una marca"}
            autoComplete="off"
            disabled={!selectedMake || loading || loadError}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={modelOpen && Boolean(modelName.trim())}
            aria-controls="vehicle-model-options"
            className="w-full rounded-xl border p-3 font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          />
          {modelOpen && modelName.trim() && selectedMake && !loading && (
            <div id="vehicle-model-options" role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
              {matchingModels.length ? matchingModels.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  role="option"
                  aria-selected={selectedModel?.id === model.id}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => { setModelName(model.name); setModelOpen(false); }}
                  className="block w-full px-4 py-2.5 text-left font-normal hover:bg-blue-50 hover:text-blue-800"
                >
                  {model.name}
                </button>
              )) : <p className="px-4 py-3 font-normal text-slate-500">No hay modelos coincidentes.</p>}
            </div>
          )}
        </div>
        {loading && <small className="font-normal text-blue-700">Cargando modelos…</small>}
        {loadError && <small className="font-normal text-red-700">No se pudieron cargar los modelos. Vuelve a elegir la marca.</small>}
        {!loading && selectedMake && modelName && !selectedModel && <small className="font-normal text-amber-700">Selecciona un modelo de las sugerencias.</small>}
      </div>

      <input type="hidden" name="vehicleModelId" value={selectedModel?.id ?? ""}/>
    </div>
  );
}
