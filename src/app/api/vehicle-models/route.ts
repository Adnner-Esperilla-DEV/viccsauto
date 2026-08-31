import { db } from "@/lib/db";

export async function GET(request: Request) {
  const makeId = new URL(request.url).searchParams.get("makeId")?.trim();
  if (!makeId) return Response.json([], { headers: { "Cache-Control": "no-store" } });

  const models = await db.vehicleModel.findMany({
    where: { makeId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 1_000,
  });

  return Response.json(models, { headers: { "Cache-Control": "no-store" } });
}
