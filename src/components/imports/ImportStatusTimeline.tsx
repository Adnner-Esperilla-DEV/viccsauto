import { IoCheckmarkOutline } from "react-icons/io5";

import { importStatusSteps } from "@/lib/import-status";

export function ImportStatusTimeline({ status }: { status: string }) {
  const currentIndex = Math.max(0, importStatusSteps.findIndex((step) => step.value === status));
  return (
    <ol className="grid gap-3 sm:grid-cols-5" aria-label="Seguimiento de la importación">
      {importStatusSteps.map((step, index) => {
        const completed = index <= currentIndex;
        const current = index === currentIndex;
        return (
          <li key={step.value} aria-current={current ? "step" : undefined} className="relative">
            <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${current ? "border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-100" : completed ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-400"}`}>
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${completed ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                {completed ? <IoCheckmarkOutline aria-hidden="true" /> : index + 1}
              </span>
              <span className="text-sm font-bold">{step.label}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
