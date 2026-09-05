"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IoCheckmarkOutline, IoSearchOutline } from "react-icons/io5";

type Option = { id: string; name: string };

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function matches(options: Option[], query: string) {
  const term = normalized(query);
  if (!term) return [];

  return options
    .filter((option) => normalized(option.name).includes(term))
    .sort((left, right) => (
      Number(normalized(right.name).startsWith(term)) - Number(normalized(left.name).startsWith(term))
      || left.name.localeCompare(right.name, "es")
    ))
    .slice(0, 5);
}

export function VehicleCompatibilityFields({ makes }: { makes: Option[] }) {
  const makeInput = useRef<HTMLInputElement>(null);
  const modelInput = useRef<HTMLInputElement>(null);
  const [makeQuery, setMakeQuery] = useState("");
  const [modelQuery, setModelQuery] = useState("");
  const [selectedMake, setSelectedMake] = useState<Option | null>(null);
  const [selectedModel, setSelectedModel] = useState<Option | null>(null);
  const [models, setModels] = useState<Option[]>([]);
  const [makeOpen, setMakeOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const matchingMakes = useMemo(() => matches(makes, makeQuery), [makes, makeQuery]);
  const matchingModels = useMemo(() => matches(models, modelQuery), [models, modelQuery]);

  useEffect(() => {
    if (!selectedMake) return;

    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);

    fetch(`/api/vehicle-models?makeId=${encodeURIComponent(selectedMake.id)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("No se pudieron cargar los modelos");
        return response.json() as Promise<Option[]>;
      })
      .then(setModels)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [selectedMake]);

  function chooseMake(make: Option) {
    setSelectedMake(make);
    setMakeQuery(make.name);
    setSelectedModel(null);
    setModelQuery("");
    setModels([]);
    setMakeOpen(false);
    makeInput.current?.setCustomValidity("");
  }

  function chooseModel(model: Option) {
    setSelectedModel(model);
    setModelQuery(model.name);
    setModelOpen(false);
    modelInput.current?.setCustomValidity("");
  }

  const inputClass = "w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 font-normal outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100";

  return (
    <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
      <input type="hidden" name="vehicleModelId" value={selectedModel?.id ?? ""} />

      <div className="relative">
        <label htmlFor="vehicle-make" className="text-sm font-bold text-slate-700">Marca</label>
        <div className="relative mt-2">
          <IoSearchOutline className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-slate-400" aria-hidden="true" />
          <input
            ref={makeInput}
            id="vehicle-make"
            required
            value={makeQuery}
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={makeOpen && Boolean(makeQuery.trim())}
            aria-controls="vehicle-make-list"
            placeholder="Escribe, por ejemplo: Ford"
            className={inputClass}
            onFocus={() => setMakeOpen(true)}
            onBlur={() => setMakeOpen(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && makeOpen && matchingMakes[0]) {
                event.preventDefault();
                chooseMake(matchingMakes[0]);
              }
              if (event.key === "Escape") {
                event.stopPropagation();
                setMakeOpen(false);
              }
            }}
            onChange={(event) => {
              event.currentTarget.setCustomValidity("Selecciona una marca de la lista.");
              setMakeQuery(event.target.value);
              setSelectedMake(null);
              setSelectedModel(null);
              setModelQuery("");
              setModels([]);
              setMakeOpen(true);
            }}
          />
        </div>
        {makeOpen && makeQuery.trim() && (
          <Options
            id="vehicle-make-list"
            options={matchingMakes}
            selectedId={selectedMake?.id}
            empty="No encontramos esa marca."
            choose={chooseMake}
          />
        )}
        {!selectedMake && makeQuery && (
          <p className="mt-1 text-xs font-normal text-amber-700">Selecciona una marca de las sugerencias.</p>
        )}
      </div>

      <div className="relative">
        <label htmlFor="vehicle-model" className="text-sm font-bold text-slate-700">Modelo</label>
        <div className="relative mt-2">
          <IoSearchOutline className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-slate-400" aria-hidden="true" />
          <input
            ref={modelInput}
            id="vehicle-model"
            required
            disabled={!selectedMake || loading || loadError}
            value={modelQuery}
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={modelOpen && Boolean(modelQuery.trim())}
            aria-controls="vehicle-model-list"
            placeholder={loading ? "Cargando modelos…" : selectedMake ? `Buscar modelo de ${selectedMake.name}` : "Primero selecciona la marca"}
            className={inputClass}
            onFocus={() => setModelOpen(true)}
            onBlur={() => setModelOpen(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && modelOpen && matchingModels[0]) {
                event.preventDefault();
                chooseModel(matchingModels[0]);
              }
              if (event.key === "Escape") {
                event.stopPropagation();
                setModelOpen(false);
              }
            }}
            onChange={(event) => {
              event.currentTarget.setCustomValidity("Selecciona un modelo de la lista.");
              setModelQuery(event.target.value);
              setSelectedModel(null);
              setModelOpen(true);
            }}
          />
        </div>
        {modelOpen && modelQuery.trim() && selectedMake && !loading && !loadError && (
          <Options
            id="vehicle-model-list"
            options={matchingModels}
            selectedId={selectedModel?.id}
            empty={`No encontramos ese modelo para ${selectedMake.name}.`}
            choose={chooseModel}
          />
        )}
        {loadError && (
          <p className="mt-1 text-xs font-normal text-red-700">No se pudieron cargar los modelos. Vuelve a seleccionar la marca.</p>
        )}
        {!selectedModel && modelQuery && !loading && (
          <p className="mt-1 text-xs font-normal text-amber-700">Selecciona un modelo de las sugerencias.</p>
        )}
      </div>
    </div>
  );
}

function Options({ id, options, selectedId, empty, choose }: {
  id: string;
  options: Option[];
  selectedId?: string;
  empty: string;
  choose: (option: Option) => void;
}) {
  return (
    <div id={id} role="listbox" className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="option"
          aria-selected={option.id === selectedId}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => choose(option)}
          className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left font-semibold hover:bg-blue-50 hover:text-blue-800"
        >
          <span>{option.name}</span>
          {option.id === selectedId && <IoCheckmarkOutline aria-hidden="true" />}
        </button>
      ))}
      {!options.length && <p className="px-4 py-4 text-sm text-slate-500">{empty}</p>}
    </div>
  );
}
