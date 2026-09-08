import { getSessionUser, isStaff } from "@/lib/auth";
import { db } from "@/lib/db";
function csv(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}
export async function GET() {
  const user = await getSessionUser();
  if (!isStaff(user)) return new Response("No autorizado", { status: 403 });
  const orders = await db.order.findMany({ orderBy: { createdAt: "desc" } });
  const body = [
    "numero,fecha,canal,cliente,email,estado,pago,entrega,total",
    ...orders.map((row) =>
      [
        row.number,
        row.createdAt.toISOString(),
        row.channel,
        row.customerName,
        row.customerEmail,
        row.status,
        row.paymentStatus,
        row.fulfillmentStatus,
        row.total,
      ]
        .map(csv)
        .join(","),
    ),
  ].join("\n");
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=pedidos-viccsauto.csv",
    },
  });
}
