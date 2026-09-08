"use client";

import { useId, useMemo, useState } from "react";
import { IoCheckmarkOutline, IoChevronDownOutline, IoLocationOutline, IoStorefrontOutline } from "react-icons/io5";

import { checkoutAction } from "@/app/actions/checkout";
import { formatPrice } from "@/lib/format";
import { calculateTotals, type DeliveryZone } from "@/lib/pricing";

type CheckoutItem = { id: string; name: string; quantity: number; unitPrice: number };
type CheckoutUser = { firstName: string; lastName: string; email: string } | null;

const regions = [
  "Arica y Parinacota",
  "Tarapacá",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaíso",
  "Metropolitana de Santiago",
  "O’Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "La Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Aysén",
  "Magallanes y de la Antártica Chilena",
] as const;

const inputClass =
  "mt-2 w-full rounded-2xl border border-slate-300 bg-white p-3 font-normal outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

function SelectField({
  name,
  label,
  value,
  onChange,
  options,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <div
      className="relative text-sm font-bold"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <span>{label}</span>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className={`mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 text-left font-normal text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 ${open ? "border-blue-600 ring-4 ring-blue-100" : "border-slate-300 hover:border-blue-400"}`}
      >
        <span className={selected ? "" : "text-slate-400"}>{selected?.label ?? "Selecciona una opción"}</span>
        <IoChevronDownOutline
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 text-blue-700 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-blue-100 bg-white p-2 shadow-2xl shadow-slate-900/15"
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${active ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-blue-50 hover:text-blue-800"}`}
              >
                <span>{option.label}</span>
                {active && <IoCheckmarkOutline aria-hidden="true" className="h-5 w-5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CheckoutForm({
  checkoutToken,
  items,
  user,
  customsTaxRateBps,
}: {
  checkoutToken: string;
  items: CheckoutItem[];
  user: CheckoutUser;
  customsTaxRateBps: number;
}) {
  const [delivery, setDelivery] = useState<"pickup" | "shipping">("shipping");
  const [destinationZone, setDestinationZone] = useState<Exclude<DeliveryZone, "PICKUP_ARICA">>("ARICA");
  const [region, setRegion] = useState("");
  const zone: DeliveryZone = delivery === "pickup" ? "PICKUP_ARICA" : destinationZone;
  const totals = useMemo(() => calculateTotals(items, zone, customsTaxRateBps), [items, zone, customsTaxRateBps]);
  const fixedLocation =
    destinationZone === "ARICA"
      ? { commune: "Arica", city: "Arica", region: "Arica y Parinacota" }
      : { commune: "Iquique", city: "Iquique", region: "Tarapacá" };
  const freightCollect = delivery === "shipping" && destinationZone !== "ARICA";
  const destinationIncomplete = delivery === "shipping" && destinationZone === "REST_OF_CHILE" && !region;

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
      <form action={checkoutAction} className="grid gap-5 rounded-3xl border bg-white p-7 sm:grid-cols-2">
        <input type="hidden" name="checkoutToken" value={checkoutToken} />
        <input type="hidden" name="destinationZone" value={zone} />
        <h2 className="text-2xl font-black sm:col-span-2">Datos de contacto</h2>

        <label className="text-sm font-bold sm:col-span-2">
          Nombre completo
          <input
            required
            name="customerName"
            autoComplete="name"
            defaultValue={user ? `${user.firstName} ${user.lastName}` : ""}
            className={inputClass}
          />
        </label>
        <label className="text-sm font-bold">
          Correo
          <input
            required
            type="email"
            name="customerEmail"
            autoComplete="email"
            defaultValue={user?.email ?? ""}
            className={inputClass}
          />
        </label>
        <label className="text-sm font-bold">
          Teléfono
          <input required name="customerPhone" autoComplete="tel" minLength={8} className={inputClass} />
        </label>

        <h2 className="mt-3 text-2xl font-black sm:col-span-2">Entrega</h2>
        <div className="sm:col-span-2">
          <SelectField
            name="delivery"
            label="Modalidad"
            value={delivery}
            onChange={(value) => setDelivery(value as "pickup" | "shipping")}
            options={[
              { value: "shipping", label: "Despacho" },
              { value: "pickup", label: "Retiro en tienda de Arica" },
            ]}
          />
        </div>

        {delivery === "shipping" ? (
          <>
            <div className="sm:col-span-2">
              <SelectField
                name="destinationSelection"
                label="Destino"
                value={destinationZone}
                onChange={(value) => setDestinationZone(value as Exclude<DeliveryZone, "PICKUP_ARICA">)}
                options={[
                  { value: "ARICA", label: "Arica — despacho gratuito" },
                  { value: "IQUIQUE", label: "Iquique — envío por pagar" },
                  { value: "REST_OF_CHILE", label: "Otra ciudad de Chile — tributos + envío por pagar" },
                ]}
              />
            </div>
            <label className="text-sm font-bold sm:col-span-2">
              Dirección
              <input
                required
                name="line1"
                autoComplete="street-address"
                placeholder="Calle y número"
                className={inputClass}
              />
            </label>
            {destinationZone === "REST_OF_CHILE" ? (
              <>
                <label className="text-sm font-bold">
                  Comuna
                  <input required name="commune" autoComplete="address-level2" className={inputClass} />
                </label>
                <label className="text-sm font-bold">
                  Ciudad
                  <input required name="city" autoComplete="address-level2" className={inputClass} />
                </label>
                <div className="sm:col-span-2">
                  <SelectField
                    name="region"
                    label="Región"
                    value={region}
                    onChange={setRegion}
                    options={regions.map((item) => ({ value: item, label: item }))}
                  />
                </div>
              </>
            ) : (
              <>
                <input type="hidden" name="commune" value={fixedLocation.commune} />
                <input type="hidden" name="city" value={fixedLocation.city} />
                <input type="hidden" name="region" value={fixedLocation.region} />
                <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-900 sm:col-span-2">
                  <b>Destino seleccionado:</b> {fixedLocation.city}, {fixedLocation.region}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900 sm:col-span-2">
            <IoStorefrontOutline className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p>
              <b>Retiro presencial en Arica.</b>
              <br />
              No se cobra envío ni IVA/tributos adicionales.
            </p>
            <input type="hidden" name="line1" value="Retiro en tienda" />
            <input type="hidden" name="commune" value="Arica" />
            <input type="hidden" name="city" value="Arica" />
            <input type="hidden" name="region" value="Arica y Parinacota" />
          </div>
        )}

        <label className="text-sm font-bold sm:col-span-2">
          Notas
          <textarea name="notes" rows={3} maxLength={500} className={inputClass} />
        </label>
        <button
          disabled={destinationIncomplete}
          className="rounded-full bg-blue-700 px-7 py-4 font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
        >
          Crear pedido con pago manual
        </button>
        <p className="text-xs text-slate-500 sm:col-span-2">
          No se realizará ningún cobro automático. Recibirás instrucciones para confirmar el pago.
        </p>
      </form>

      <aside className="h-fit rounded-3xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-7 text-slate-900 shadow-lg lg:sticky lg:top-6">
        <p className="text-sm font-bold uppercase tracking-widest text-blue-700">Resumen</p>
        <h2 className="mt-1 text-2xl font-black">Tu pedido</h2>
        <ul className="mt-5 space-y-3 text-sm text-slate-600">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4">
              <span>
                {item.quantity} × {item.name}
              </span>
              <b className="text-slate-900">{formatPrice(item.quantity * item.unitPrice)}</b>
            </li>
          ))}
        </ul>
        <dl className="mt-5 space-y-3 border-t border-blue-100 pt-5 text-sm text-slate-600">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd className="font-bold text-slate-900">{formatPrice(totals.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Tributos de internación</dt>
            <dd className="font-bold text-slate-900">{totals.taxTotal ? formatPrice(totals.taxTotal) : "$0"}</dd>
          </div>
          {totals.taxTotal > 0 && (
            <div className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">
              Estimación aplicada: {(customsTaxRateBps / 100).toLocaleString("es-CL", { minimumFractionDigits: 2 })}%.
            </div>
          )}
          <div className="flex justify-between">
            <dt>Despacho</dt>
            <dd className="text-right font-bold text-slate-900">
              {delivery === "pickup" ? "Sin envío" : destinationZone === "ARICA" ? "Gratis" : "Por pagar en destino"}
            </dd>
          </div>
          <div className="flex items-end justify-between border-t border-blue-100 pt-5">
            <dt className="font-bold text-slate-900">Total a pagar</dt>
            <dd className="text-3xl font-black text-blue-700">{formatPrice(totals.total)}</dd>
          </div>
        </dl>
        {freightCollect && (
          <div className="mt-5 flex gap-3 rounded-2xl border border-blue-100 bg-white/80 p-4 text-sm text-blue-900">
            <IoLocationOutline className="h-5 w-5 shrink-0 text-blue-700" aria-hidden="true" />
            <p>El transporte no está incluido en este total. Se paga directamente al transportista al recibir.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
