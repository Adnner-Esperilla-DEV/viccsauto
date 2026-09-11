export const siteConfig = {
  name: "ViccsAuto",
  legalName: "ViccsAuto Repuestos y Vehículos",
  description: "Autopartes, repuestos y vehículos seleccionados con asesoría de compatibilidad en Arica, Chile.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://viccsauto.cl",
  currency: "CLP",
  locale: "es-CL",
  country: "CL",
  phone: "+56 9 5381 9066",
  whatsapp: "56953819066",
  email: "ventas@viccsauto.cl",
  address: "Bilbao 1266, al lado de Abastible (entre Azolas y Bilbao), Arica, Chile",
} as const;
