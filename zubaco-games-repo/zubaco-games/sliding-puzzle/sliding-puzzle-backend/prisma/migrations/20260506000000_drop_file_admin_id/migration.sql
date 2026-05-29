DROP INDEX IF EXISTS "files_admin_id_idx";
ALTER TABLE "files" DROP COLUMN IF EXISTS "admin_id";
