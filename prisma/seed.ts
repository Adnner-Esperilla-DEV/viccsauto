import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { categories, products, vehicles } from "../src/data/catalog";

const prisma = new PrismaClient();

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseYears(value: string) {
  const years = value.match(/\d{4}/g)?.map(Number) ?? [];
  return { yearFrom: years[0], yearTo: years[1] ?? years[0] };
}

async function ensureVehicleModel(makeName: string, modelName: string) {
  let make = await prisma.vehicleMake.findFirst({ where: { name: { equals: makeName, mode: "insensitive" } } });
  if (!make) make = await prisma.vehicleMake.create({ data: { name: makeName, slug: `${slugify(makeName)}-seed` } });
  let model = await prisma.vehicleModel.findFirst({
    where: { makeId: make.id, name: { equals: modelName, mode: "insensitive" } },
  });
  if (!model)
    model = await prisma.vehicleModel.create({
      data: { makeId: make.id, name: modelName, slug: `${slugify(modelName)}-seed` },
    });
  return { model, make };
}

async function main() {
  const currentYear = new Date().getFullYear();
  await prisma.vehicleYear.createMany({
    data: Array.from({ length: currentYear + 2 - 1950 + 1 }, (_, index) => ({ year: 1950 + index })),
    skipDuplicates: true,
  });

  const location = await prisma.inventoryLocation.upsert({
    where: { code: "ARICA-CENTRO" },
    update: {
      name: "Bodega Arica Centro",
      address: "Bilbao 1266, al lado de Abastible (entre Azolas y Bilbao), Arica",
      isActive: true,
    },
    create: {
      code: "ARICA-CENTRO",
      name: "Bodega Arica Centro",
      address: "Bilbao 1266, al lado de Abastible (entre Azolas y Bilbao), Arica",
    },
  });

  for (const [position, category] of categories.entries()) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description, icon: category.icon, position, isActive: true },
      create: {
        slug: category.slug,
        name: category.name,
        description: category.description,
        icon: category.icon,
        position,
      },
    });
  }

  for (const product of products) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: product.categorySlug } });
    const brand = product.brand
      ? await prisma.brand.upsert({
          where: { name: product.brand },
          update: { isActive: true },
          create: { name: product.brand, slug: slugify(product.brand) },
        })
      : null;
    const saved = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        sku: product.sku,
        name: product.name,
        shortDescription: product.shortDescription,
        description: product.description,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        stock: product.stock,
        condition: product.condition.toUpperCase(),
        oemCodes: JSON.stringify(product.oemCodes),
        icon: product.icon,
        featured: Boolean(product.featured),
        categoryId: category.id,
        brandId: brand?.id ?? null,
        isActive: true,
      },
      create: {
        slug: product.slug,
        sku: product.sku,
        name: product.name,
        shortDescription: product.shortDescription,
        description: product.description,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        stock: product.stock,
        condition: product.condition.toUpperCase(),
        oemCodes: JSON.stringify(product.oemCodes),
        icon: product.icon,
        featured: Boolean(product.featured),
        categoryId: category.id,
        brandId: brand?.id ?? null,
      },
    });
    await prisma.productCompatibility.deleteMany({ where: { productId: saved.id } });
    for (const item of product.compatibility) {
      const vehicle = await ensureVehicleModel(item.make, item.model);
      await prisma.productCompatibility.create({
        data: {
          productId: saved.id,
          vehicleModelId: vehicle.model.id,
          make: vehicle.make.name,
          model: vehicle.model.name,
          ...parseYears(item.years),
          engine: item.engine,
        },
      });
    }
    await prisma.inventoryItem.upsert({
      where: { productId_locationId: { productId: saved.id, locationId: location.id } },
      update: { quantity: product.stock },
      create: { productId: saved.id, locationId: location.id, quantity: product.stock },
    });
  }

  for (const [index, vehicle] of vehicles.entries()) {
    await prisma.vehicle.upsert({
      where: { slug: vehicle.slug },
      update: {
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        price: vehicle.price,
        mileage: vehicle.mileage,
        transmission: vehicle.transmission,
        fuel: vehicle.fuel,
        condition: vehicle.condition,
        location: vehicle.location,
        description: vehicle.description,
        featured: Boolean(vehicle.featured),
        status: "AVAILABLE",
      },
      create: {
        slug: vehicle.slug,
        stockNumber: `VIC-AUTO-${String(index + 1).padStart(3, "0")}`,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        price: vehicle.price,
        mileage: vehicle.mileage,
        transmission: vehicle.transmission,
        fuel: vehicle.fuel,
        condition: vehicle.condition,
        location: vehicle.location,
        description: vehicle.description,
        featured: Boolean(vehicle.featured),
      },
    });
  }

  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@viccsauto.cl";
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) throw new Error("SEED_ADMIN_PASSWORD es obligatorio para crear el administrador");
  await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", status: "ACTIVE" },
    create: {
      email,
      passwordHash: await hash(password, 12),
      firstName: "Administrador",
      lastName: "ViccsAuto",
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "presencial@viccsauto.local" },
    update: { firstName: "Cliente", lastName: "Genérico", role: "CUSTOMER", status: "SYSTEM" },
    create: {
      email: "presencial@viccsauto.local",
      passwordHash: "SYSTEM:GENERIC",
      firstName: "Cliente",
      lastName: "Genérico",
      role: "CUSTOMER",
      status: "SYSTEM",
    },
  });

  console.log(
    `Base inicializada: ${products.length} productos, ${vehicles.length} vehículos y administrador ${email}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
