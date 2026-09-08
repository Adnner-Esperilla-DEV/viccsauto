import { getSessionUser, isStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getObject } from "@/lib/object-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("No encontrado", { status: 404 });
  const file = await db.vehicleImportAttachment.findUnique({
    where: { id: (await params).id },
    include: { vehicleImport: { select: { customerId: true } } },
  });
  if (!file || (!isStaff(user) && file.vehicleImport.customerId !== user.id))
    return new Response("No encontrado", { status: 404 });
  const fallback = file.filename.replace(/[^a-zA-Z0-9._-]/g, "_") || "adjunto";
  try {
    const object = file.storageKey
      ? await getObject(file.storageKey)
      : file.data
        ? { body: new Uint8Array(file.data), contentLength: file.data.length, contentType: file.mimeType }
        : null;
    if (!object) return new Response("No encontrado", { status: 404 });
    return new Response(Buffer.from(object.body), {
      headers: {
        "Content-Type": object.contentType,
        "Content-Length": String(object.contentLength),
        "Content-Disposition": `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
