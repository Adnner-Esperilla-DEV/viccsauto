import { getSessionUser, isStaff } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("No encontrado", { status: 404 });
  const image = await db.vehicleImportImage.findUnique({ where: { id: (await params).id }, include: { vehicleImport: { select: { customerId: true } } } });
  if (!image || (!isStaff(user) && image.vehicleImport.customerId !== user.id)) return new Response("No encontrado", { status: 404 });
  return new Response(new Uint8Array(image.data), { headers: { "Content-Type": image.mimeType, "Content-Length": String(image.data.length), "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" } });
}
