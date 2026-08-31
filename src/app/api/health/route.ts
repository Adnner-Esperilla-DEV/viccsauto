import { db } from "@/lib/db";
export async function GET() { try { await db.$queryRaw`SELECT 1`; return Response.json({ status: "ok", database: "reachable", timestamp: new Date().toISOString() }); } catch { return Response.json({ status: "error", database: "unreachable" }, { status: 503 }); } }
