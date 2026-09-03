"use client";

import { useId, useState } from "react";
import { IoCheckmarkOutline, IoChevronDownOutline } from "react-icons/io5";

type SelectOption = { value: string; label: string };

export function StyledSelect({ name, label, options, defaultValue }: { name: string; label: string; options: readonly SelectOption[]; defaultValue: string }) {
  const listId = useId();
  const initialIndex = Math.max(0, options.findIndex((option) => option.value === defaultValue));
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [open, setOpen] = useState(false);
  const selected = options[selectedIndex] ?? options[0];

  function choose(index: number) {
    if (!options[index]) return;
    setSelectedIndex(index);
    setActiveIndex(index);
    setOpen(false);
  }

  return <div className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
    <span className="text-sm font-bold text-slate-700">{label}</span>
    <input type="hidden" name={name} value={selected?.value ?? ""}/>
    <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} className={`mt-2 flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-left font-normal outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 ${open ? "border-blue-600 ring-4 ring-blue-100" : "border-slate-300"}`} onClick={() => setOpen((value) => !value)} onKeyDown={(event) => {
      if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex((index) => Math.min(index + 1, options.length - 1)); }
      if (event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActiveIndex((index) => Math.max(index - 1, 0)); }
      if (event.key === "Enter" && open) { event.preventDefault(); choose(activeIndex); }
      if (event.key === "Escape") setOpen(false);
    }}><span>{selected?.label}</span><IoChevronDownOutline aria-hidden="true" className={`h-5 w-5 text-slate-500 transition ${open ? "rotate-180" : ""}`}/></button>
    {open && <div id={listId} role="listbox" className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">{options.map((option, index) => <button key={option.value} type="button" role="option" aria-selected={index === selectedIndex} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(index)} className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${index === activeIndex ? "bg-blue-50 text-blue-800" : "text-slate-700 hover:bg-slate-50"}`}><span>{option.label}</span>{index === selectedIndex && <IoCheckmarkOutline aria-hidden="true" className="h-5 w-5 text-blue-700"/>}</button>)}</div>}
  </div>;
}
