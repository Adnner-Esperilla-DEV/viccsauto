"use client";

import { useEffect, useState } from "react";
import { IoCloseOutline, IoCreateOutline } from "react-icons/io5";

import { ProductEditForm, type EditableProduct, type ProductEditOption } from "@/components/admin/ProductEditForm";

type ProductEditModalProps = {
  product: EditableProduct;
  categories: ProductEditOption[];
  brands: ProductEditOption[];
  returnTo?: "detail" | "list";
  initialOpen?: boolean;
  serverError?: string;
  compact?: boolean;
};

export function ProductEditModal({ product, categories, brands, returnTo = "detail", initialOpen = false, serverError, compact = false }: ProductEditModalProps) {
  const [open, setOpen] = useState(initialOpen);

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={compact ? "inline-flex items-center gap-1 font-bold text-blue-700 hover:underline" : "inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800"}
      >
        <IoCreateOutline aria-hidden="true" /> Editar
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm sm:p-8"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setOpen(false);
          }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby={`edit-product-${product.id}`} className="my-auto w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-6 border-b border-slate-200 px-6 py-5 sm:px-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Editar producto</p>
                <h2 id={`edit-product-${product.id}`} className="mt-1 text-2xl font-black text-slate-950">{product.name}</h2>
                <p className="mt-1 text-sm font-normal text-slate-500">Actualiza información, visibilidad e imágenes. El stock se administra por separado.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar modal" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                <IoCloseOutline className="h-6 w-6" />
              </button>
            </header>
            <div className="max-h-[calc(100vh-10rem)] overflow-y-auto px-6 pb-7 sm:px-8">
              <ProductEditForm product={product} categories={categories} brands={brands} returnTo={returnTo} serverError={serverError} onCancel={() => setOpen(false)} />
            </div>
          </section>
        </div>
      )}
    </>
  );
}
