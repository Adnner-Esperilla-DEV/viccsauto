import "server-only";

import { db } from "@/lib/db";
import { DEFAULT_CUSTOMS_TAX_RATE_BPS } from "@/lib/pricing";

const CUSTOMS_TAX_RATE_KEY = "customs_tax_rate_bps";

export async function getCustomsTaxRateBps() {
  try {
    const rows = await db.$queryRaw<Array<{ value: string }>>`
      SELECT "value" FROM "AppSetting" WHERE "key" = ${CUSTOMS_TAX_RATE_KEY} LIMIT 1
    `;
    const rate = Number.parseInt(rows[0]?.value ?? "", 10);
    return Number.isInteger(rate) && rate >= 0 && rate <= 10_000 ? rate : DEFAULT_CUSTOMS_TAX_RATE_BPS;
  } catch {
    // Permite desplegar el código antes de ejecutar la migración; se usa el valor seguro inicial.
    return DEFAULT_CUSTOMS_TAX_RATE_BPS;
  }
}

export async function saveCustomsTaxRateBps(rateBps: number) {
  await db.$executeRaw`
    INSERT INTO "AppSetting" ("key", "value", "updatedAt")
    VALUES (${CUSTOMS_TAX_RATE_KEY}, ${String(rateBps)}, NOW())
    ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW()
  `;
}
