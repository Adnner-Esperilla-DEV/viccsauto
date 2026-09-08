"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { IoAlertCircleOutline, IoTrashOutline } from "react-icons/io5";

import { deleteProductAction } from "@/app/actions/admin";

type DeleteEntityFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  entityId: string;
  entityName: string;
  title: string;
  description: string;
  compact?: boolean;
};

function ConfirmDeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800 disabled:cursor-wait disabled:opacity-60"
    >
      <IoTrashOutline className="h-5 w-5" aria-hidden="true" />
      {pending ? "Eliminando…" : "Sí, eliminar"}
    </button>
  );
}

export function DeleteEntityForm({
  action,
  entityId,
  entityName,
  title,
  description,
  compact = false,
}: DeleteEntityFormProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelButtonRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <form action={action}>
      <input type="hidden" name="id" value={entityId} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? "inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
            : "inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100"
        }
      >
        <IoTrashOutline className={compact ? "h-4 w-4" : "h-5 w-5"} aria-hidden="true" />
        Eliminar
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md rounded-3xl bg-white p-7 text-left shadow-2xl"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-700">
              <IoAlertCircleOutline className="h-7 w-7" aria-hidden="true" />
            </span>
            <h2 id={titleId} className="mt-5 text-2xl font-black text-slate-950">
              {title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Vas a eliminar <strong className="text-slate-900">{entityName}</strong>. {description} Esta acción no se
              puede deshacer.
            </p>
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <ConfirmDeleteButton />
            </div>
          </section>
        </div>
      )}
    </form>
  );
}

export function DeleteProductForm({
  productId,
  productName,
  compact = false,
}: {
  productId: string;
  productName: string;
  compact?: boolean;
}) {
  return (
    <DeleteEntityForm
      action={deleteProductAction}
      entityId={productId}
      entityName={productName}
      title="¿Eliminar producto?"
      description="Se quitará del catálogo y del inventario."
      compact={compact}
    />
  );
}
