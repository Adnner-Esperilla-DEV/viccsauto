import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const VPIC_URL = "https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeId/0?format=json";

type VpicModel = {
  Make_ID: number;
  Make_Name: string;
  Model_ID: number;
  Model_Name: string;
};

type VpicResponse = { Results?: VpicModel[] };

const resetCatalog = process.argv.includes("--reset");

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "sin-nombre";
}

function normalizedName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

async function mergeDuplicateMakes() {
  const makes = await prisma.vehicleMake.findMany({
    include: { models: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: "asc" },
  });
  const groups = new Map<string, typeof makes>();
  for (const make of makes) {
    const key = normalizedName(make.name);
    groups.set(key, [...(groups.get(key) ?? []), make]);
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const target = group.find((make) => make.sourceId != null) ?? group[0];
    const displayName = group.find((make) => make.name !== make.name.toUpperCase())?.name ?? target.name;

    await prisma.$transaction(async (tx) => {
      for (const duplicate of group) {
        if (duplicate.id === target.id) continue;

        for (const model of duplicate.models) {
          const existing = await tx.vehicleModel.findFirst({
            where: { makeId: target.id, name: { equals: model.name, mode: "insensitive" } },
            select: { id: true },
          });
          if (existing) {
            await tx.productCompatibility.updateMany({ where: { vehicleModelId: model.id }, data: { vehicleModelId: existing.id, make: displayName } });
            await tx.vehicleImport.updateMany({ where: { modelId: model.id }, data: { modelId: existing.id, makeId: target.id, make: displayName } });
            await tx.vehicleModel.delete({ where: { id: model.id } });
          } else {
            const slugConflict = await tx.vehicleModel.findFirst({ where: { makeId: target.id, slug: model.slug }, select: { id: true } });
            await tx.vehicleModel.update({
              where: { id: model.id },
              data: { makeId: target.id, slug: slugConflict ? `${model.slug}-${model.id.slice(-6)}` : model.slug },
            });
          }
        }

        await tx.vehicleImport.updateMany({ where: { makeId: duplicate.id }, data: { makeId: target.id, make: displayName } });
        await tx.vehicleMake.delete({ where: { id: duplicate.id } });
      }

      if (target.name !== displayName) {
        await tx.vehicleMake.update({ where: { id: target.id }, data: { name: displayName } });
        await tx.productCompatibility.updateMany({ where: { vehicleModel: { makeId: target.id } }, data: { make: displayName } });
        await tx.vehicleImport.updateMany({ where: { makeId: target.id }, data: { make: displayName } });
      }
    });
  }
}

async function replaceVehicleCatalog(makesBySource: Map<number, string>, modelsBySource: Map<number, VpicModel>) {
  const currentYear = new Date().getFullYear();
  await prisma.$transaction(async (tx) => {
    await tx.productCompatibility.deleteMany();
    await tx.vehicleImport.updateMany({ data: { makeId: null, modelId: null } });
    await tx.vehicleModel.deleteMany();
    await tx.vehicleMake.deleteMany();
    await tx.vehicleYear.deleteMany();

    await tx.vehicleMake.createMany({
      data: [...makesBySource].map(([sourceId, name]) => ({ sourceId, name, slug: `${slugify(name)}-${sourceId}` })),
      skipDuplicates: true,
    });
    const storedMakes = await tx.vehicleMake.findMany({ select: { id: true, sourceId: true } });
    const makeIdBySource = new Map(storedMakes.flatMap((row) => row.sourceId == null ? [] : [[row.sourceId, row.id] as const]));
    const modelRows = [...modelsBySource].flatMap(([sourceId, row]) => {
      const makeId = makeIdBySource.get(row.Make_ID);
      return makeId ? [{ sourceId, makeId, name: row.Model_Name, slug: `${slugify(row.Model_Name)}-${sourceId}` }] : [];
    });
    for (let index = 0; index < modelRows.length; index += 1_000) {
      await tx.vehicleModel.createMany({ data: modelRows.slice(index, index + 1_000), skipDuplicates: true });
    }
    await tx.vehicleYear.createMany({ data: Array.from({ length: currentYear + 2 - 1950 + 1 }, (_, index) => ({ year: 1950 + index })) });
  }, { maxWait: 30_000, timeout: 120_000 });
}

async function main() {
  const response = await fetch(VPIC_URL, { headers: { Accept: "application/json", "User-Agent": "ViccsAuto vehicle catalog importer" } });
  if (!response.ok) throw new Error(`vPIC respondió ${response.status}`);
  const payload = await response.json() as VpicResponse;
  const sourceRows = payload.Results ?? [];
  if (sourceRows.length < 1_000) throw new Error("vPIC devolvió un catálogo incompleto");

  const makesBySource = new Map<number, string>();
  const modelsBySource = new Map<number, VpicModel>();
  for (const row of sourceRows) {
    if (row.Make_ID && row.Make_Name?.trim()) makesBySource.set(row.Make_ID, row.Make_Name.trim());
    if (row.Model_ID && row.Model_Name?.trim() && row.Make_ID) modelsBySource.set(row.Model_ID, { ...row, Make_Name: row.Make_Name.trim(), Model_Name: row.Model_Name.trim() });
  }

  if (resetCatalog) {
    await replaceVehicleCatalog(makesBySource, modelsBySource);
    const [makeCount, modelCount, yearCount] = await Promise.all([prisma.vehicleMake.count(), prisma.vehicleModel.count(), prisma.vehicleYear.count()]);
    console.log(`Catálogo vehicular reemplazado: ${makeCount} marcas, ${modelCount} modelos y ${yearCount} años.`);
    return;
  }

  await prisma.vehicleMake.createMany({
    data: [...makesBySource].map(([sourceId, name]) => ({ sourceId, name, slug: `${slugify(name)}-${sourceId}` })),
    skipDuplicates: true,
  });
  const storedMakes = await prisma.vehicleMake.findMany({ where: { sourceId: { in: [...makesBySource.keys()] } }, select: { id: true, sourceId: true } });
  const makeIdBySource = new Map(storedMakes.flatMap((row) => row.sourceId == null ? [] : [[row.sourceId, row.id] as const]));
  const modelRows = [...modelsBySource].flatMap(([sourceId, row]) => {
    const makeId = makeIdBySource.get(row.Make_ID);
    return makeId ? [{ sourceId, makeId, name: row.Model_Name, slug: `${slugify(row.Model_Name)}-${sourceId}` }] : [];
  });
  for (let index = 0; index < modelRows.length; index += 1_000) {
    await prisma.vehicleModel.createMany({ data: modelRows.slice(index, index + 1_000), skipDuplicates: true });
  }

  await mergeDuplicateMakes();

  const currentYear = new Date().getFullYear();
  await prisma.vehicleYear.createMany({ data: Array.from({ length: currentYear + 2 - 1950 + 1 }, (_, index) => ({ year: 1950 + index })), skipDuplicates: true });

  const [makeCount, modelCount, yearCount] = await Promise.all([prisma.vehicleMake.count(), prisma.vehicleModel.count(), prisma.vehicleYear.count()]);
  console.log(`Catálogo vehicular importado: ${makeCount} marcas, ${modelCount} modelos y ${yearCount} años.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
