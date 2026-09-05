export const importStatusSteps = [
  { value: "INCOMING", label: "Por recibir" },
  { value: "RECEIVED", label: "Recibido" },
  { value: "ASSIGNED", label: "Asignado" },
  { value: "LOADED", label: "Cargado" },
  { value: "SHIPPED", label: "Embarcado" },
  { value: "FINALIZED", label: "Finalizado" },
] as const;

export type ImportStatus = (typeof importStatusSteps)[number]["value"];

export function importStatusLabel(status: string) {
  return importStatusSteps.find((step) => step.value === status)?.label ?? status;
}

export function formatImportDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(parsed).replaceAll("/", "-");
}

export const keyStatusLabels: Record<string, string> = {
  NO_KEY: "Sin llave",
  UNKNOWN: "Desconocido",
  KEY_PRESENT: "Llave disponible",
};

export const titleStatusLabels: Record<string, string> = {
  NO_TITLE: "Sin título",
  PENDING: "Pendiente",
  RECEIVED: "Título recibido",
};
