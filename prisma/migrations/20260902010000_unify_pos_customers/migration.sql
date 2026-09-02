ALTER TABLE "User" ADD COLUMN "phoneNormalized" TEXT;

WITH normalized_phones AS (
  SELECT
    "id",
    CASE
      WHEN length(regexp_replace("phone", '[^0-9]', '', 'g')) = 9
        THEN '56' || regexp_replace("phone", '[^0-9]', '', 'g')
      WHEN regexp_replace("phone", '[^0-9]', '', 'g') LIKE '0056%'
        THEN substring(regexp_replace("phone", '[^0-9]', '', 'g') FROM 3)
      ELSE regexp_replace("phone", '[^0-9]', '', 'g')
    END AS normalized,
    row_number() OVER (
      PARTITION BY CASE
        WHEN length(regexp_replace("phone", '[^0-9]', '', 'g')) = 9
          THEN '56' || regexp_replace("phone", '[^0-9]', '', 'g')
        WHEN regexp_replace("phone", '[^0-9]', '', 'g') LIKE '0056%'
          THEN substring(regexp_replace("phone", '[^0-9]', '', 'g') FROM 3)
        ELSE regexp_replace("phone", '[^0-9]', '', 'g')
      END
      ORDER BY "createdAt", "id"
    ) AS duplicate_position
  FROM "User"
  WHERE "phone" IS NOT NULL AND regexp_replace("phone", '[^0-9]', '', 'g') <> ''
)
UPDATE "User" AS users
SET "phoneNormalized" = normalized_phones.normalized
FROM normalized_phones
WHERE users."id" = normalized_phones."id" AND normalized_phones.duplicate_position = 1;

CREATE UNIQUE INDEX "User_phoneNormalized_key" ON "User"("phoneNormalized");
