ALTER TABLE "relay_stations"
ADD COLUMN "asset_library_config" JSONB;

CREATE TYPE "PublicAssetProviderStatus" AS ENUM ('PENDING', 'ACTIVE', 'FAILED');

CREATE TABLE "public_assets" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "content_hash" TEXT NOT NULL,
    "local_path" TEXT NOT NULL,
    "provider_asset_id" TEXT,
    "provider_status" "PublicAssetProviderStatus" NOT NULL DEFAULT 'PENDING',
    "provider_url" TEXT,
    "provider_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "public_assets_content_hash_key" ON "public_assets"("content_hash");
CREATE INDEX "public_assets_owner_id_idx" ON "public_assets"("owner_id");
CREATE INDEX "public_assets_created_at_idx" ON "public_assets"("created_at");
CREATE INDEX "public_assets_provider_status_idx" ON "public_assets"("provider_status");

ALTER TABLE "public_assets"
ADD CONSTRAINT "public_assets_owner_id_fkey"
FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
