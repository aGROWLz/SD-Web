WITH ranked_primary AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "updated_at" DESC, "id") AS position
  FROM "relay_stations"
  WHERE "is_primary" = true
)
UPDATE "relay_stations"
SET "is_primary" = false
WHERE "id" IN (
  SELECT "id" FROM ranked_primary WHERE position > 1
);

CREATE UNIQUE INDEX "relay_stations_single_primary_idx"
ON "relay_stations" ("is_primary")
WHERE "is_primary" = true;
