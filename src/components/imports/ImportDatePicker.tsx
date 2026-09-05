"use client";

import { useMemo, useState } from "react";
import { IoCalendarOutline, IoChevronBackOutline, IoChevronForwardOutline, IoCloseOutline } from "react-icons/io5";

const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const weekdays = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const pad = (value: number) => String(value).padStart(2, "0");

function isoDate(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function displayDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

export function ImportDatePicker({ initialValue = "", name = "receivedDate", label = "Fecha de recepción" }: { initialValue?: string; name?: string; label?: string }) {
  const today = new Date();
  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const initialParts = /^\d{4}-\d{2}-\d{2}$/.test(initialValue) ? initialValue.split("-").map(Number) : null;
  const [visibleYear, setVisibleYear] = useState(initialParts?.[0] ?? today.getFullYear());
  const [visibleMonth, setVisibleMonth] = useState(initialParts ? initialParts[1] - 1 : today.getMonth());
  const days = useMemo(() => {
    const leading = (new Date(Date.UTC(visibleYear, visibleMonth, 1)).getUTCDay() + 6) % 7;
    const count = new Date(Date.UTC(visibleYear, visibleMonth + 1, 0)).getUTCDate();
    return [...Array.from({ length: leading }, () => null), ...Array.from({ length: count }, (_, index) => index + 1)];
  }, [visibleMonth, visibleYear]);

  function moveMonth(change: number) {
    const next = new Date(Date.UTC(visibleYear, visibleMonth + change, 1));
    setVisibleYear(next.getUTCFullYear());
    setVisibleMonth(next.getUTCMonth());
  }

  function select(day: number) {
    setValue(isoDate(visibleYear, visibleMonth, day));
    setOpen(false);
  }

  return <div className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
    <span className="text-sm font-bold text-slate-700">{label} <span className="font-normal text-slate-400">(opcional)</span></span>
    <input type="hidden" name={name} value={value}/>
    <div className={`mt-2 flex overflow-hidden rounded-xl border bg-white transition focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100 ${open ? "border-blue-600 ring-4 ring-blue-100" : "border-slate-300"}`}>
      <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((current) => !current)} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"><IoCalendarOutline aria-hidden="true" className="h-5 w-5 shrink-0 text-blue-700"/><span className={value ? "font-semibold text-slate-900" : "text-slate-400"}>{value ? displayDate(value) : "dd-mm-yyyy"}</span></button>
      {value && <button type="button" onClick={() => setValue("")} aria-label="Borrar fecha" className="px-3 text-slate-400 hover:bg-slate-50 hover:text-red-600"><IoCloseOutline aria-hidden="true" className="h-5 w-5"/></button>}
    </div>
    {open && <div role="dialog" aria-label={`Seleccionar ${label.toLowerCase()}`} className="absolute left-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-3rem))] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl">
      <div className="flex items-center justify-between"><button type="button" onClick={() => moveMonth(-1)} aria-label="Mes anterior" className="grid h-10 w-10 place-items-center rounded-xl text-slate-600 hover:bg-blue-50 hover:text-blue-700"><IoChevronBackOutline aria-hidden="true"/></button><strong className="capitalize text-slate-900">{months[visibleMonth]} {visibleYear}</strong><button type="button" onClick={() => moveMonth(1)} aria-label="Mes siguiente" className="grid h-10 w-10 place-items-center rounded-xl text-slate-600 hover:bg-blue-50 hover:text-blue-700"><IoChevronForwardOutline aria-hidden="true"/></button></div>
      <div className="mt-3 grid grid-cols-7 text-center">{weekdays.map((day) => <span key={day} className="py-2 text-xs font-black uppercase text-slate-400">{day}</span>)}{days.map((day, index) => day ? <button key={`${visibleYear}-${visibleMonth}-${day}`} type="button" onClick={() => select(day)} className={`mx-auto grid h-10 w-10 place-items-center rounded-xl text-sm font-semibold transition ${value === isoDate(visibleYear, visibleMonth, day) ? "bg-blue-700 text-white shadow-md" : isoDate(visibleYear, visibleMonth, day) === isoDate(today.getFullYear(), today.getMonth(), today.getDate()) ? "bg-blue-50 text-blue-800 ring-1 ring-blue-200" : "text-slate-700 hover:bg-slate-100"}`}>{day}</button> : <span key={`empty-${index}`} aria-hidden="true"/>)}</div>
      <div className="mt-3 flex items-center justify-between border-t pt-3"><button type="button" onClick={() => { setVisibleYear(today.getFullYear()); setVisibleMonth(today.getMonth()); selectToday(today, setValue, setOpen); }} className="rounded-xl px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50">Hoy</button>{value && <button type="button" onClick={() => { setValue(""); setOpen(false); }} className="rounded-xl px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">Limpiar</button>}</div>
    </div>}
  </div>;
}

function selectToday(today: Date, setValue: (value: string) => void, setOpen: (value: boolean) => void) {
  setValue(isoDate(today.getFullYear(), today.getMonth(), today.getDate()));
  setOpen(false);
}
