-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN     "recoveryCodeHash" TEXT;
