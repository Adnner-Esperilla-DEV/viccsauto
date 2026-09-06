"use client";

import { useEffect, useMemo, useState } from "react";

import { formatUsd, getImportFinanceSummary } from "@/lib/import-finances";
import { ImportFinanceFields } from "./ImportFinanceFields";
import { ImportVehicleSelector } from "./ImportVehicleSelector";
import { StyledSelect } from "./StyledSelect";

type Option = { id: string; name: string };
export type ImportedPartDraft = {
  id: string;
  description: string;
  partNumber: string;
  partBrand: string;
  quantity: number;
  unitValueUsd: string;
  weightKg: string;
  makeId: string;
  makeName: string;
  modelId: string;
  modelName: string;
  yearFrom: number;
  yearTo: number;
  engine: string;
};

type VehicleValues = {
  vin?: string;
  year?: number;
  color?: string;
  weightKg?: number | null;
  fuel?: string | null;
  keyStatus?: string;
  titleStatus?: string;
  titleNumber?: string | null;
  titleState?: string | null;
  scheduleB?: string | null;
  make?: Option | null;
  model?: Option | null;
};

type FinanceValues = {
  valueUsd?: string;
  towingCostUsd?: string;
  oceanFreightUsd?: string;
  shippingCostUsd?: string;
  logisticsServiceUsd?: string;
  paidAmountUsd?: string;
};

const fuelOptions = ["Gasolina", "Diésel", "Híbrido", "Eléctrico", "GLP", "GNC", "Otro", "Desconocido"].map((value) => ({ value, label: value }));
const keyOptions = [{ value: "NO_KEY", label: "Sin llave" }, { value: "UNKNOWN", label: "Desconocido" }, { value: "KEY_PRESENT", label: "Llave disponible" }];
const titleOptions = [{ value: "NO_TITLE", label: "Sin título" }, { value: "PENDING", label: "Pendiente" }, { value: "RECEIVED", label: "Título recibido" }];
const field = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";
const label = "text-sm font-bold text-slate-700";

function newPart(id?: string): ImportedPartDraft {
  const year = new Date().getFullYear();
  return { id: id ?? globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, description: "", partNumber: "", partBrand: "", quantity: 1, unitValueUsd: "", weightKg: "", makeId: "", makeName: "", modelId: "", modelName: "", yearFrom: year, yearTo: year, engine: "" };
}

export function ImportTypeFields({ makes, initialType = "VEHICLE", initialVehicle = {}, initialParts = [], initialFinance = {}, lockType = false }: {
  makes: Option[];
  initialType?: "VEHICLE" | "PARTS";
  initialVehicle?: VehicleValues;
  initialParts?: ImportedPartDraft[];
  initialFinance?: FinanceValues;
  lockType?: boolean;
}) {
  const [importType, setImportType] = useState<"VEHICLE" | "PARTS">(initialType);
  const [parts, setParts] = useState<ImportedPartDraft[]>(initialParts.length ? initialParts : [newPart("part-1")]);
  const [shippingCostUsd, setShippingCostUsd] = useState(initialFinance.shippingCostUsd ?? "");
  const [logisticsServiceUsd, setLogisticsServiceUsd] = useState(initialFinance.logisticsServiceUsd ?? "");
  const [paidAmountUsd, setPaidAmountUsd] = useState(initialFinance.paidAmountUsd ?? "");
  const goodsValueUsd = useMemo(() => parts.reduce((totalCents, part) => totalCents + Math.round(Math.max(0, Number(part.unitValueUsd) || 0) * 100) * Math.max(0, Number(part.quantity) || 0), 0) / 100, [parts]);
  const finance = getImportFinanceSummary({ importType: "PARTS", valueUsd: goodsValueUsd, towingCostUsd: 0, oceanFreightUsd: 0, shippingCostUsd: Number(shippingCostUsd) || 0, logisticsServiceUsd: Number(logisticsServiceUsd) || 0, paidAmountUsd: Number(paidAmountUsd) || 0 });

  function updatePart(id: string, changes: Partial<ImportedPartDraft>) {
    setParts((current) => current.map((part) => part.id === id ? { ...part, ...changes } : part));
  }

  return <>
    <section className="rounded-3xl border-2 border-blue-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Tipo de importación</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {([{"value":"VEHICLE","label":"Vehículo","description":"VIN, datos técnicos, título y llaves."},{"value":"PARTS","label":"Repuestos o autopartes","description":"Una o varias piezas con compatibilidad vehicular."}] as const).map((option) => <label key={option.value} className={`rounded-2xl border-2 p-4 ${importType === option.value ? "border-blue-600 bg-blue-50" : "border-slate-200"}`}><input type="radio" name="importType" value={option.value} checked={importType === option.value} disabled={lockType} onChange={() => setImportType(option.value)} className="mr-3"/><strong>{option.label}</strong><span className="mt-1 block text-sm text-slate-500">{option.description}</span></label>)}
      </div>
      {lockType && <input type="hidden" name="importType" value={importType}/>} 
    </section>

    {importType === "VEHICLE" ? <>
      <section className="grid gap-4 rounded-3xl bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
        <h2 className="text-xl font-black sm:col-span-2 lg:col-span-3">Datos del vehículo</h2>
        <label className={label}>VIN<input required name="vin" minLength={11} maxLength={25} defaultValue={initialVehicle.vin} className={field}/></label>
        <label className={label}>Año<input required type="number" name="year" min="1900" max="2100" defaultValue={initialVehicle.year ?? new Date().getFullYear()} className={field}/></label>
        <ImportVehicleSelector makes={makes} initialMake={initialVehicle.make} initialModel={initialVehicle.model}/>
        <label className={label}>Color<input required name="color" defaultValue={initialVehicle.color} className={field}/></label>
        <label className={label}>Peso (kg) <span className="font-normal text-slate-400">(opcional)</span><input type="number" min="0.01" step="0.01" name="weightKg" defaultValue={initialVehicle.weightKg ?? ""} className={field}/></label>
        <StyledSelect name="fuel" label="Combustible" defaultValue={initialVehicle.fuel ?? "Desconocido"} options={fuelOptions}/>
      </section>
      <ImportFinanceFields initialValueUsd={initialFinance.valueUsd} initialTowingCostUsd={initialFinance.towingCostUsd} initialOceanFreightUsd={initialFinance.oceanFreightUsd} initialPaidAmountUsd={initialFinance.paidAmountUsd}/>
      <input type="hidden" name="shippingCostUsd" value="0"/><input type="hidden" name="logisticsServiceUsd" value="0"/><input type="hidden" name="partsJson" value="[]"/>
      <section className="grid gap-4 rounded-3xl bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
        <h2 className="text-xl font-black sm:col-span-2 lg:col-span-3">Título y llaves</h2>
        <StyledSelect name="keyStatus" label="Llaves" defaultValue={initialVehicle.keyStatus ?? "UNKNOWN"} options={keyOptions}/>
        <StyledSelect name="titleStatus" label="Título" defaultValue={initialVehicle.titleStatus ?? "PENDING"} options={titleOptions}/>
        <label className={label}>Número de título <span className="font-normal text-slate-400">(opcional)</span><input name="titleNumber" defaultValue={initialVehicle.titleNumber ?? ""} className={field}/></label>
        <label className={label}>Estado / jurisdicción <span className="font-normal text-slate-400">(opcional)</span><input name="titleState" defaultValue={initialVehicle.titleState ?? ""} className={field}/></label>
        <label className={label}>Schedule B / HTS <span className="font-normal text-slate-400">(opcional)</span><input name="scheduleB" defaultValue={initialVehicle.scheduleB ?? ""} className={field}/></label>
      </section>
    </> : <>
      <input type="hidden" name="partsJson" value={JSON.stringify(parts)}/><input type="hidden" name="valueUsd" value={goodsValueUsd.toFixed(2)}/><input type="hidden" name="towingCostUsd" value="0"/><input type="hidden" name="oceanFreightUsd" value="0"/>
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black">Repuestos o autopartes</h2><p className="mt-1 text-sm text-slate-500">Registra cada pieza y el vehículo con el que es compatible.</p></div><button type="button" onClick={() => setParts((current) => [...current, newPart()])} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white">Añadir repuesto</button></div>
        <div className="mt-5 grid gap-5">{parts.map((part, index) => <PartFields key={part.id} part={part} index={index} makes={makes} update={(changes) => updatePart(part.id, changes)} remove={parts.length > 1 ? () => setParts((current) => current.filter((item) => item.id !== part.id)) : undefined}/>)}</div>
      </section>
      <section className="overflow-hidden rounded-3xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-white to-emerald-50 shadow-sm">
        <div className="border-b border-blue-100 px-6 py-5"><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Costos y pagos</p><h2 className="mt-1 text-2xl font-black">Resumen financiero de la importación</h2><p className="mt-2 text-sm text-slate-600">El total incluye el valor de las piezas, el envío y el servicio logístico. Todo se registra en USD.</p></div>
        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <label className={label}>Valor de los repuestos<input readOnly value={goodsValueUsd.toFixed(2)} className={`${field} bg-slate-100`}/></label>
          <label className={label}>Costo de envío (USD)<input required type="number" min="0" step="0.01" name="shippingCostUsd" value={shippingCostUsd} onChange={(event) => setShippingCostUsd(event.target.value)} className={field}/></label>
          <label className={label}>Servicio logístico (USD)<input required type="number" min="0" step="0.01" name="logisticsServiceUsd" value={logisticsServiceUsd} onChange={(event) => setLogisticsServiceUsd(event.target.value)} className={field}/></label>
          <label className={label}>Monto cancelado (USD)<input required type="number" min="0" max={finance.totalUsd} step="0.01" name="paidAmountUsd" value={paidAmountUsd} onChange={(event) => setPaidAmountUsd(event.target.value)} className={field}/></label>
        </div>
        <div className="grid gap-3 border-t border-blue-100 bg-white/70 p-6 sm:grid-cols-3"><FinanceCard label="Total de importación" value={finance.totalUsd}/><FinanceCard label="Cancelado" value={finance.paidAmountUsd}/><FinanceCard label="Saldo pendiente" value={finance.balanceUsd}/></div>
      </section>
    </>}
  </>;
}

function PartFields({ part, index, makes, update, remove }: { part: ImportedPartDraft; index: number; makes: Option[]; update: (changes: Partial<ImportedPartDraft>) => void; remove?: () => void }) {
  const [models, setModels] = useState<Option[]>(part.modelId ? [{ id: part.modelId, name: part.modelName }] : []);
  useEffect(() => {
    if (!part.makeId) return;
    const controller = new AbortController();
    fetch(`/api/vehicle-models?makeId=${encodeURIComponent(part.makeId)}`, { cache: "no-store", signal: controller.signal }).then((response) => response.ok ? response.json() as Promise<Option[]> : Promise.reject()).then(setModels).catch(() => { if (!controller.signal.aborted) setModels([]); });
    return () => controller.abort();
  }, [part.makeId]);
  return <fieldset className="rounded-2xl border border-slate-200 p-5"><div className="flex items-center justify-between"><legend className="font-black text-blue-800">Repuesto {index + 1}</legend>{remove && <button type="button" onClick={remove} className="text-sm font-bold text-red-700">Eliminar</button>}</div><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <label className={label}>Descripción<input required maxLength={160} value={part.description} onChange={(event) => update({ description: event.target.value })} placeholder="Ej. Bomba de agua" className={field}/></label>
    <label className={label}>Número de parte / OEM<input required maxLength={80} value={part.partNumber} onChange={(event) => update({ partNumber: event.target.value.toUpperCase() })} className={field}/></label>
    <label className={label}>Marca del repuesto <span className="font-normal text-slate-400">(opcional)</span><input maxLength={80} value={part.partBrand} onChange={(event) => update({ partBrand: event.target.value })} className={field}/></label>
    <label className={label}>Cantidad<input required type="number" min="1" max="10000" value={part.quantity} onChange={(event) => update({ quantity: Number(event.target.value) })} className={field}/></label>
    <label className={label}>Valor unitario (USD)<input required type="number" min="0" step="0.01" value={part.unitValueUsd} onChange={(event) => update({ unitValueUsd: event.target.value })} className={field}/></label>
    <label className={label}>Peso unitario (kg) <span className="font-normal text-slate-400">(opcional)</span><input type="number" min="0.01" step="0.01" value={part.weightKg} onChange={(event) => update({ weightKg: event.target.value })} className={field}/></label>
    <label className={label}>Marca compatible<select required value={part.makeId} onChange={(event) => { const option = makes.find((item) => item.id === event.target.value); setModels([]); update({ makeId: event.target.value, makeName: option?.name ?? "", modelId: "", modelName: "" }); }} className={field}><option value="">Selecciona una marca</option>{makes.map((make) => <option key={make.id} value={make.id}>{make.name}</option>)}</select></label>
    <label className={label}>Modelo compatible<select required disabled={!part.makeId} value={part.modelId} onChange={(event) => { const option = models.find((item) => item.id === event.target.value); update({ modelId: event.target.value, modelName: option?.name ?? "" }); }} className={field}><option value="">Selecciona un modelo</option>{models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
    <label className={label}>Motor / versión <span className="font-normal text-slate-400">(opcional)</span><input maxLength={80} value={part.engine} onChange={(event) => update({ engine: event.target.value })} placeholder="Ej. 1.8L" className={field}/></label>
    <label className={label}>Año desde<input required type="number" min="1900" max="2100" value={part.yearFrom} onChange={(event) => update({ yearFrom: Number(event.target.value) })} className={field}/></label>
    <label className={label}>Año hasta<input required type="number" min={part.yearFrom || 1900} max="2100" value={part.yearTo} onChange={(event) => update({ yearTo: Number(event.target.value) })} className={field}/></label>
    <div className="rounded-xl bg-slate-50 p-4"><span className="text-xs font-bold uppercase text-slate-500">Subtotal</span><strong className="mt-1 block text-lg text-blue-800">{formatUsd((Number(part.unitValueUsd) || 0) * (Number(part.quantity) || 0))}</strong></div>
  </div></fieldset>;
}

function FinanceCard({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-800"><span className="text-xs font-bold uppercase tracking-wider">{label}</span><strong className="mt-1 block text-xl font-black">{formatUsd(value)}</strong></div>; }
