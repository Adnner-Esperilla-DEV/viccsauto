import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const image = await db.productImage.findUnique({ where: { id }, select: { url: true } });
  if (!image) return new NextResponse(null, { status: 404 });

  if (!image.url.startsWith("data:")) {
    try {
      return NextResponse.redirect(new URL(image.url));
    } catch {
      return new NextResponse(null, { status: 404 });
    }
  }

  const match = /^data:(image\/(?:webp|png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(image.url);
  if (!match) return new NextResponse(null, { status: 404 });

  return new NextResponse(Buffer.from(match[2], "base64"), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": match[1],
      "X-Content-Type-Options": "nosniff",
    },
  });
}
