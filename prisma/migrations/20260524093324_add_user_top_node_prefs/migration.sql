-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "defaultNodeView" TEXT NOT NULL DEFAULT 'top',
ADD COLUMN     "favoriteNodeCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];
