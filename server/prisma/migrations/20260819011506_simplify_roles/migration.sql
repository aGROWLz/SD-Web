-- Fresh-install baseline and upgrade path for the legacy ADMIN/PREMIUM/FREE schema.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'UserRole' AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');
  ELSIF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'UserRole' AND n.nspname = current_schema()
      AND e.enumlabel IN ('PREMIUM', 'FREE')
  ) THEN
    ALTER TABLE IF EXISTS "users" ALTER COLUMN "role" DROP DEFAULT;
    ALTER TYPE "UserRole" RENAME TO "UserRole_legacy";
    CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');
    IF to_regclass('"users"') IS NOT NULL THEN
      ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole"
      USING (CASE WHEN "role"::text = 'ADMIN' THEN 'ADMIN' ELSE 'USER' END)::"UserRole";
      ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'USER';
    END IF;
    DROP TYPE "UserRole_legacy";
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'KeyType' AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE "KeyType" AS ENUM ('PLATFORM', 'USER_OWNED');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'TaskStatus' AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "api_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_value" TEXT NOT NULL,
    "type" "KeyType" NOT NULL,
    "owner_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "rate_limit" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "tasks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "api_key_id" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "prompt" TEXT NOT NULL,
    "params" JSONB,
    "result_url" TEXT,
    "local_path" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "usage_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "api_key_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "cost" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE INDEX IF NOT EXISTS "api_keys_owner_id_idx" ON "api_keys"("owner_id");
CREATE INDEX IF NOT EXISTS "api_keys_type_is_active_idx" ON "api_keys"("type", "is_active");
CREATE INDEX IF NOT EXISTS "tasks_user_id_status_idx" ON "tasks"("user_id", "status");
CREATE INDEX IF NOT EXISTS "tasks_api_key_id_idx" ON "tasks"("api_key_id");
CREATE INDEX IF NOT EXISTS "tasks_created_at_idx" ON "tasks"("created_at");
CREATE INDEX IF NOT EXISTS "usage_logs_user_id_created_at_idx" ON "usage_logs"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "usage_logs_api_key_id_idx" ON "usage_logs"("api_key_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_owner_id_fkey') THEN
    ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_user_id_fkey') THEN
    ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_api_key_id_fkey') THEN
    ALTER TABLE "tasks" ADD CONSTRAINT "tasks_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usage_logs_user_id_fkey') THEN
    ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usage_logs_api_key_id_fkey') THEN
    ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usage_logs_task_id_fkey') THEN
    ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
