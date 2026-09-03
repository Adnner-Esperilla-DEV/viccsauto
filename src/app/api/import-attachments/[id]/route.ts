import { getSessionUser, isStaff } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("No encontrado", { status: 404 });
  const file = await db.vehicleImportAttachment.findUnique({ where: { id: (await params).id }, include: { vehicleImport: { select: { customerId: true } } } });
  if (!file || (!isStaff(user) && file.vehicleImport.customerId !== user.id)) return new Response("No encontrado", { status: 404 });
  const fallback = file.filename.replace(/[^a-zA-Z0-9._-]/g, "_") || "adjunto";
  return new Response(new Uint8Array(file.data), { headers: { "Content-Type": file.mimeType, "Content-Length": String(file.size), "Content-Disposition": `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
