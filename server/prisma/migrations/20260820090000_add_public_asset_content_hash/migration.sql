ALTER TABLE "public_assets"
ADD COLUMN "content_hash" TEXT;

-- Existing rows predate content hashing. Their deterministic placeholders are
-- unique by construction and are replaced by real SHA-256 values for new uploads.
UPDATE "public_assets"
SET "content_hash" = md5("local_path" || ':' || "id")
WHERE "content_hash" IS NULL;

ALTER TABLE "public_assets"
ALTER COLUMN "content_hash" SET NOT NULL;

CREATE UNIQUE INDEX "public_assets_content_hash_key" ON "public_assets"("content_hash");
