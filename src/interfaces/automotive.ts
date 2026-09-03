export type ProductCondition = "new" | "remanufactured" | "used";

export interface Compatibility {
  make: string;
  model: string;
  years: string;
  engine?: string;
}

export interface AutomotiveProduct {
  id: string;
  slug: string;
  sku: string;
  name: string;
  shortDescription: string;
  description: string;
  category: string;
  categorySlug: string;
  brand?: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  condition: ProductCondition;
  oemCodes: string[];
  compatibility: Compatibility[];
  featured?: boolean;
  image?: string;
  images?: string[];
  icon: "brake" | "engine" | "light" | "battery" | "body";
}

export interface VehicleListing {
  id: string;
  slug: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  transmission: "Automática" | "Mecánica";
  fuel: "Gasolina" | "Diésel" | "Híbrido" | "Eléctrico";
  condition: "Nuevo" | "Seminuevo" | "Usado";
  location: string;
  description: string;
  featured?: boolean;
  image?: string;
  images?: string[];
}

export interface CategorySummary {
  slug: string;
  name: string;
  description: string;
  icon: AutomotiveProduct["icon"];
}
