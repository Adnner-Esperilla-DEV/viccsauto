import { getSessionUser, isStaff } from "@/lib/auth";
import { createZip } from "@/lib/create-zip";
import { db } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ importId: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("No encontrado", { status: 404 });
  const vehicleImport = await db.vehicleImport.findUnique({ where: { id: (await params).importId }, select: { customerId: true, vin: true, year: true, make: true, model: true, images: { orderBy: { position: "asc" }, select: { filename: true, data: true } } } });
  if (!vehicleImport || (!isStaff(user) && vehicleImport.customerId !== user.id) || !vehicleImport.images.length) return new Response("No encontrado", { status: 404 });
  const zip = createZip(vehicleImport.images);
  const filename = `${vehicleImport.year}-${vehicleImport.make}-${vehicleImport.model}-${vehicleImport.vin}-imagenes.zip`.replace(/[^a-zA-Z0-9._-]/g, "_");
  return new Response(new Uint8Array(zip), { headers: { "Content-Type": "application/zip", "Content-Length": String(zip.length), "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
