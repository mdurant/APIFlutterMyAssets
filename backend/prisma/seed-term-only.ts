/**
 * Crea solo el término y condiciones versión 1.0 (activo).
 * Útil cuando la BD ya tiene regiones/usuarios y solo falta el término.
 * Ejecutar: npx ts-node prisma/seed-term-only.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.term.upsert({
    where: { version: '1.0' },
    create: {
      version: '1.0',
      title: 'Términos y Condiciones de Uso',
      content: `Términos y condiciones de uso de la aplicación Flutter My Assets.

Al utilizar este servicio usted acepta estos términos. El uso de la plataforma implica la aceptación de la versión vigente publicada en la aplicación.

Para consultas: contacto@integraltech.cl`,
      active: true,
    },
    update: { active: true, title: 'Términos y Condiciones de Uso' },
  });
  console.log('✅ Término 1.0 creado/actualizado (activo). GET /api/v1/terms/active y POST /api/v1/terms/accept deberían funcionar.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
