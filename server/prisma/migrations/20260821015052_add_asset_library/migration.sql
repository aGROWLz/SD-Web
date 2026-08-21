-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_api_key_id_fkey";

-- DropForeignKey
ALTER TABLE "usage_logs" DROP CONSTRAINT "usage_logs_api_key_id_fkey";

-- AlterTable
ALTER TABLE "public_assets" ADD COLUMN     "provider_library" TEXT;

-- AlterTable
ALTER TABLE "relay_stations" ADD COLUMN     "asset_library_id" TEXT;

-- AlterTable
ALTER TABLE "tasks" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "asset_libraries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "api_key_encrypted" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_libraries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relay_stations" ADD CONSTRAINT "relay_stations_asset_library_id_fkey" FOREIGN KEY ("asset_library_id") REFERENCES "asset_libraries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
