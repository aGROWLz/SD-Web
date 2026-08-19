ALTER TABLE "users"
ADD COLUMN "can_generate" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "relay_stations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "api_key_encrypted" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "relay_stations_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "tasks"
ALTER COLUMN "api_key_id" DROP NOT NULL,
ADD COLUMN "relay_station_id" TEXT,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "usage_logs"
ALTER COLUMN "api_key_id" DROP NOT NULL,
ADD COLUMN "relay_station_id" TEXT;

CREATE INDEX "relay_stations_is_active_is_primary_idx"
ON "relay_stations"("is_active", "is_primary");

CREATE INDEX "tasks_relay_station_id_idx" ON "tasks"("relay_station_id");
CREATE INDEX "usage_logs_relay_station_id_idx" ON "usage_logs"("relay_station_id");

ALTER TABLE "tasks"
ADD CONSTRAINT "tasks_relay_station_id_fkey"
FOREIGN KEY ("relay_station_id") REFERENCES "relay_stations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "usage_logs"
ADD CONSTRAINT "usage_logs_relay_station_id_fkey"
FOREIGN KEY ("relay_station_id") REFERENCES "relay_stations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
