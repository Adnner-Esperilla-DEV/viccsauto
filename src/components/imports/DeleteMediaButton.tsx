"use client";

export function DeleteMediaButton({ kind }: { kind: "imagen" | "archivo" }) {
  return <button type="submit" onClick={(event) => { if (!window.confirm(`¿Seguro que deseas eliminar este ${kind}? Esta acción no se puede deshacer.`)) event.preventDefault(); }} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100">Eliminar</button>;
}
