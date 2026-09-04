import { getSessionUser, isStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getObject } from "@/lib/object-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("No encontrado", { status: 404 });
  const image = await db.vehicleImportImage.findUnique({ where: { id: (await params).id }, include: { vehicleImport: { select: { customerId: true } } } });
  if (!image || (!isStaff(user) && image.vehicleImport.customerId !== user.id)) return new Response("No encontrado", { status: 404 });
  try {
    const object = image.storageKey
      ? await getObject(image.storageKey)
      : image.data
        ? { body: new Uint8Array(image.data), contentLength: image.data.length, contentType: image.mimeType }
        : null;
    if (!object) return new Response("No encontrado", { status: 404 });
    return new Response(Buffer.from(object.body), { headers: { "Content-Type": object.contentType, "Content-Length": String(object.contentLength), "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
