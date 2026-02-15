/*
  Warnings:

  - Added the required column `apellidos` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fecha_nacimiento` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nombres` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sexo` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `users` ADD COLUMN `apellidos` VARCHAR(191) NOT NULL,
    ADD COLUMN `comuna_id` VARCHAR(191) NULL,
    ADD COLUMN `domicilio` VARCHAR(191) NULL,
    ADD COLUMN `fecha_nacimiento` DATE NOT NULL,
    ADD COLUMN `nombres` VARCHAR(191) NOT NULL,
    ADD COLUMN `region_id` VARCHAR(191) NULL,
    ADD COLUMN `sexo` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `regions` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `regions_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comunas` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `region_id` VARCHAR(191) NOT NULL,

    INDEX `comunas_region_id_idx`(`region_id`),
    UNIQUE INDEX `comunas_nombre_region_id_key`(`nombre`, `region_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `users_region_id_idx` ON `users`(`region_id`);

-- CreateIndex
CREATE INDEX `users_comuna_id_idx` ON `users`(`comuna_id`);

-- AddForeignKey
ALTER TABLE `comunas` ADD CONSTRAINT `comunas_region_id_fkey` FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_region_id_fkey` FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_comuna_id_fkey` FOREIGN KEY (`comuna_id`) REFERENCES `comunas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
