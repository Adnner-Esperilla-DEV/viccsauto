import { getSessionUser, isStaff } from "@/lib/auth";
import { createZip } from "@/lib/create-zip";
import { db } from "@/lib/db";
import { getObject } from "@/lib/object-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ importId: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("No encontrado", { status: 404 });
  const vehicleImport = await db.vehicleImport.findUnique({
    where: { id: (await params).importId },
    select: {
      customerId: true,
      vin: true,
      year: true,
      make: true,
      model: true,
      images: { orderBy: { position: "asc" }, select: { filename: true, data: true, storageKey: true } },
    },
  });
  if (!vehicleImport || (!isStaff(user) && vehicleImport.customerId !== user.id) || !vehicleImport.images.length)
    return new Response("No encontrado", { status: 404 });
  let images;
  try {
    images = await Promise.all(
      vehicleImport.images.map(async (image) => ({
        filename: image.filename,
        data: image.storageKey ? Buffer.from((await getObject(image.storageKey)).body) : Buffer.from(image.data ?? []),
      })),
    );
  } catch {
    return new Response("No se pudieron recuperar las imágenes", { status: 502 });
  }
  if (images.some((image) => !image.data.length)) return new Response("No encontrado", { status: 404 });
  const zip = createZip(images);
  const filename =
    `${vehicleImport.year}-${vehicleImport.make}-${vehicleImport.model}-${vehicleImport.vin}-imagenes.zip`.replace(
      /[^a-zA-Z0-9._-]/g,
      "_",
    );
  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(zip.length),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
