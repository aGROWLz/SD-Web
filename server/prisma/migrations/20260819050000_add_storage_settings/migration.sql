CREATE TABLE "storage_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "worker_url" TEXT,
    "key_encrypted" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_settings_pkey" PRIMARY KEY ("id")
);
