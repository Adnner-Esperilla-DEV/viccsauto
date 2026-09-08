"use client";

import { useMemo, useState } from "react";

type ProductCurrencyFieldsProps = {
  defaultPriceUsd?: number | null;
  defaultUsdToClpRate?: number | null;
  onConversionChange?: (priceClp: number) => void;
};

const clpFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const usdFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

function positiveNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function convertedClp(priceUsd: string, usdToClpRate: string) {
  const parsedPriceUsd = positiveNumber(priceUsd);
  const parsedRate = positiveNumber(usdToClpRate);
  return parsedPriceUsd && parsedRate ? Math.round(parsedPriceUsd * parsedRate) : null;
}

export function ProductCurrencyFields({
  defaultPriceUsd,
  defaultUsdToClpRate,
  onConversionChange,
}: ProductCurrencyFieldsProps) {
  const [priceUsd, setPriceUsd] = useState(defaultPriceUsd?.toString() ?? "");
  const [usdToClpRate, setUsdToClpRate] = useState(defaultUsdToClpRate?.toString() ?? "");
  const parsedPriceUsd = positiveNumber(priceUsd);
  const parsedRate = positiveNumber(usdToClpRate);
  const estimatedClp = useMemo(
    () => (parsedPriceUsd && parsedRate ? Math.round(parsedPriceUsd * parsedRate) : null),
    [parsedPriceUsd, parsedRate],
  );
  const requiresPair = Boolean(priceUsd || usdToClpRate);
  const inputClass =
    "rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

  function changePriceUsd(nextValue: string) {
    setPriceUsd(nextValue);
    const nextClp = convertedClp(nextValue, usdToClpRate);
    if (nextClp !== null) onConversionChange?.(nextClp);
  }

  function changeRate(nextValue: string) {
    setUsdToClpRate(nextValue);
    const nextClp = convertedClp(priceUsd, nextValue);
    if (nextClp !== null) onConversionChange?.(nextClp);
  }

  return (
    <fieldset className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:col-span-2">
      <legend className="px-2 text-sm font-black text-blue-950">Referencia interna en dólares</legend>
      <p className="mb-4 text-sm font-normal text-slate-600">
        Solo la verá el administrador. La conversión rellenará el precio CLP como sugerencia y luego podrás ajustarlo.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Precio USD <span className="font-normal text-slate-400">(opcional)</span>
          <input
            type="number"
            name="priceUsd"
            min="0.01"
            max="1000000"
            step="0.01"
            inputMode="decimal"
            value={priceUsd}
            required={requiresPair}
            onChange={(event) => changePriceUsd(event.target.value)}
            placeholder="35.00"
            className={inputClass}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Tasa USD → CLP <span className="font-normal text-slate-400">(CLP por USD)</span>
          <input
            type="number"
            name="usdToClpRate"
            min="0.0001"
            max="1000000"
            step="0.0001"
            inputMode="decimal"
            value={usdToClpRate}
            required={requiresPair}
            onChange={(event) => changeRate(event.target.value)}
            placeholder="950.00"
            className={inputClass}
          />
        </label>
      </div>
      {estimatedClp !== null ? (
        <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
          {usdFormatter.format(parsedPriceUsd!)} × {parsedRate!.toLocaleString("es-CL", { maximumFractionDigits: 4 })} ={" "}
          <b className="text-blue-800">{clpFormatter.format(estimatedClp)} sugeridos</b>
        </p>
      ) : (
        <p className="mt-3 text-xs font-normal text-slate-500">
          Completa ambos campos para ver la conversión estimada.
        </p>
      )}
    </fieldset>
  );
}
