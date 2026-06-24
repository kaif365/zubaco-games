CREATE TABLE "admin_access_tokens" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_access_tokens_pkey" PRIMARY KEY ("id")
);

INSERT INTO "admin_access_tokens" (
    "id",
    "admin_id",
    "access_token",
    "session_id",
    "expires_at"
)
SELECT
    gen_random_uuid()::text,
    "id",
    "access_token",
    gen_random_uuid()::text,
    CURRENT_TIMESTAMP + INTERVAL '7 days'
FROM "admins"
WHERE "access_token" IS NOT NULL;

CREATE UNIQUE INDEX "admin_access_tokens_access_token_key" ON "admin_access_tokens"("access_token");
CREATE UNIQUE INDEX "admin_access_tokens_session_id_key" ON "admin_access_tokens"("session_id");
CREATE INDEX "admin_access_tokens_admin_id_idx" ON "admin_access_tokens"("admin_id");

ALTER TABLE "admin_access_tokens" ADD CONSTRAINT "admin_access_tokens_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "admins" DROP COLUMN "access_token";
