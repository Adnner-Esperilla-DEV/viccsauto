"use client";

import { useId, useMemo, useRef, useState } from "react";
import { IoCheckmarkOutline, IoSearchOutline } from "react-icons/io5";

type CustomerOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function customerName(customer: CustomerOption) {
  return `${customer.firstName} ${customer.lastName}`.trim();
}

export function CustomerCombobox({ customers, initialCustomerId = "" }: { customers: CustomerOption[]; initialCustomerId?: string }) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const initialCustomer = customers.find((customer) => customer.id === initialCustomerId);
  const [query, setQuery] = useState(initialCustomer ? customerName(initialCustomer) : "");
  const [selectedId, setSelectedId] = useState(initialCustomer?.id ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = customers.find((customer) => customer.id === selectedId);
  const matches = useMemo(() => {
    const term = normalize(query);
    const filtered = term
      ? customers.filter((customer) => normalize(`${customerName(customer)} ${customer.email} ${customer.phone ?? ""}`).includes(term))
      : customers;
    return filtered.slice(0, 12);
  }, [customers, query]);

  function choose(customer: CustomerOption) {
    setSelectedId(customer.id);
    setQuery(customerName(customer));
    inputRef.current?.setCustomValidity("");
    setOpen(false);
    setActiveIndex(0);
  }

  return <div className="sm:col-span-2 lg:col-span-3">
    <div className="flex items-end justify-between gap-3"><label htmlFor={`${listId}-input`} className="text-sm font-bold text-slate-700">Cliente asignado</label><span className="text-xs text-slate-500">{customers.length} clientes disponibles</span></div>
    <input type="hidden" name="customerId" value={selectedId}/>
    <div className="relative mt-2" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
      <IoSearchOutline aria-hidden="true" className="pointer-events-none absolute left-4 top-4 z-10 h-5 w-5 text-slate-400"/>
      <input
        ref={inputRef}
        id={`${listId}-input`}
        type="search"
        required
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        aria-activedescendant={open && matches[activeIndex] ? `${listId}-${matches[activeIndex].id}` : undefined}
        autoComplete="off"
        value={query}
        placeholder="Buscar por nombre, correo o teléfono…"
        className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 font-normal outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
        onFocus={() => setOpen(true)}
        onChange={(event) => { event.currentTarget.setCustomValidity("Selecciona un cliente de la lista."); setQuery(event.target.value); setSelectedId(""); setOpen(true); setActiveIndex(0); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex((index) => Math.min(index + 1, Math.max(0, matches.length - 1))); }
          if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
          if (event.key === "Enter" && open && matches[activeIndex]) { event.preventDefault(); choose(matches[activeIndex]); }
          if (event.key === "Escape") setOpen(false);
        }}
      />
      {open && <div id={listId} role="listbox" className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
        {matches.map((customer, index) => <button
          id={`${listId}-${customer.id}`}
          key={customer.id}
          type="button"
          role="option"
          aria-selected={customer.id === selectedId}
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => choose(customer)}
          className={`flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-left ${index === activeIndex ? "bg-blue-50" : "hover:bg-slate-50"}`}
        ><span className="min-w-0"><strong className="block truncate text-slate-900">{customerName(customer)}</strong><span className="block truncate text-sm text-slate-500">{customer.email}{customer.phone ? ` · ${customer.phone}` : ""}</span></span>{customer.id === selectedId && <IoCheckmarkOutline aria-hidden="true" className="h-5 w-5 shrink-0 text-blue-700"/>}</button>)}
        {!matches.length && <div className="px-4 py-8 text-center"><p className="font-bold text-slate-700">No encontramos clientes</p><p className="mt-1 text-sm text-slate-500">Prueba con otro nombre, correo o teléfono.</p></div>}
        {matches.length > 0 && customers.length > matches.length && !query && <p className="border-t px-4 py-2 text-xs text-slate-500">Escribe para buscar entre todos los clientes.</p>}
      </div>}
    </div>
    {selected ? <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-emerald-700"><IoCheckmarkOutline aria-hidden="true"/> Seleccionado: {customerName(selected)}</p> : <p className="mt-2 text-xs text-slate-500">Debes seleccionar una coincidencia de la lista.</p>}
  </div>;
}
