"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveCustomsTaxRateBps } from "@/lib/store-settings";

const settingsSchema = z.object({ customsTaxRate: z.coerce.number().min(0).max(100) });

export async function updateCommerceSettingsAction(formData: FormData) {
  const user = await requireStaff();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/settings?error=invalid");

  const rateBps = Math.round(parsed.data.customsTaxRate * 100);
  await saveCustomsTaxRateBps(rateBps);
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "UPDATE_COMMERCE_SETTINGS",
      entity: "AppSetting",
      entityId: "customs_tax_rate_bps",
      details: JSON.stringify({ customsTaxRateBps: rateBps }),
    },
  });
  revalidatePath("/checkout");
  revalidatePath("/admin/settings");
  redirect("/admin/settings?ok=updated");
}
