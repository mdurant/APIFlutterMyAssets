import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// Regiones de Chile (16)
const REGIONES_CHILE = [
  'Región de Arica y Parinacota',
  'Región de Tarapacá',
  'Región de Antofagasta',
  'Región de Atacama',
  'Región de Coquimbo',
  'Región de Valparaíso',
  'Región Metropolitana de Santiago',
  "Región del Libertador General Bernardo O'Higgins",
  'Región del Maule',
  'Región de Ñuble',
  'Región del Biobío',
  'Región de La Araucanía',
  'Región de Los Ríos',
  'Región de Los Lagos',
  "Región Aysén del General Carlos Ibáñez del Campo",
  'Región de Magallanes y de la Antártica Chilena',
];

// Comunas por región (nombre región -> comunas). Subconjunto representativo.
const COMUNAS_POR_REGION: Record<string, string[]> = {
  'Región de Arica y Parinacota': ['Arica', 'Putre', 'Camarones', 'General Lagos'],
  'Región de Tarapacá': ['Iquique', 'Alto Hospicio', 'Pozo Almonte', 'Pica', 'Colchane'],
  'Región de Antofagasta': ['Antofagasta', 'Calama', 'San Pedro de Atacama', 'Mejillones', 'Tocopilla'],
  'Región de Atacama': ['Copiapó', 'Vallenar', 'Caldera', 'Chañaral', 'Diego de Almagro'],
  'Región de Coquimbo': ['La Serena', 'Coquimbo', 'Ovalle', 'Illapel', 'Vicuña', 'Salamanca'],
  'Región de Valparaíso': ['Valparaíso', 'Viña del Mar', 'Quilpué', 'Villa Alemana', 'San Antonio', 'Quillota', 'Los Andes', 'San Felipe'],
  'Región Metropolitana de Santiago': ['Santiago', 'Providencia', 'Las Condes', 'Ñuñoa', 'Maipú', 'Puente Alto', 'La Florida', 'Vitacura', 'Lo Barnechea', 'Colina', 'Melipilla'],
  "Región del Libertador General Bernardo O'Higgins": ['Rancagua', 'Rengo', 'San Fernando', 'Machalí', 'Graneros', 'Pichilemu'],
  'Región del Maule': ['Talca', 'Curicó', 'Linares', 'Constitución', 'Cauquenes'],
  'Región de Ñuble': ['Chillán', 'San Carlos', 'Bulnes', 'Yungay', 'Chillán Viejo'],
  'Región del Biobío': ['Concepción', 'Talcahuano', 'Los Ángeles', 'Chiguayante', 'Coronel', 'Penco'],
  'Región de La Araucanía': ['Temuco', 'Villarrica', 'Pucón', 'Angol', 'Victoria', 'Padre Las Casas'],
  'Región de Los Ríos': ['Valdivia', 'La Unión', 'Panguipulli', 'Río Bueno', 'Los Lagos'],
  'Región de Los Lagos': ['Puerto Montt', 'Puerto Varas', 'Osorno', 'Castro', 'Ancud', 'Frutillar'],
  "Región Aysén del General Carlos Ibáñez del Campo": ['Coyhaique', 'Puerto Aysén', 'Chile Chico', 'Cisnes'],
  'Región de Magallanes y de la Antártica Chilena': ['Punta Arenas', 'Puerto Natales', 'Porvenir', 'Cabo de Hornos'],
};

async function main() {
  console.log('🌱 Iniciando seed...');

  // 1. Regiones
  const regionIds = new Map<string, string>();
  for (const nombre of REGIONES_CHILE) {
    const r = await prisma.region.upsert({
      where: { nombre },
      create: { nombre },
      update: {},
    });
    regionIds.set(r.nombre, r.id);
  }
  console.log('  ✓ Regiones:', REGIONES_CHILE.length);

  // 2. Comunas
  let totalComunas = 0;
  for (const [nombreRegion, comunas] of Object.entries(COMUNAS_POR_REGION)) {
    const regionId = regionIds.get(nombreRegion);
    if (!regionId) continue;
    for (const nombreComuna of comunas) {
      await prisma.comuna.upsert({
        where: {
          nombre_regionId: { nombre: nombreComuna, regionId },
        },
        create: { nombre: nombreComuna, regionId },
        update: {},
      });
      totalComunas++;
    }
  }
  console.log('  ✓ Comunas:', totalComunas);

  // 3. Usuarios Admin y Demo (datos ficticios, semántica Chile)
  const passwordAdmin = await argon2.hash('Admin123!');
  const passwordDemo = await argon2.hash('Demo123!');

  const regionRM = await prisma.region.findFirst({ where: { nombre: 'Región Metropolitana de Santiago' } });
  const regionValpo = await prisma.region.findFirst({ where: { nombre: 'Región de Valparaíso' } });
  const comunaLasCondes = await prisma.comuna.findFirst({
    where: { nombre: 'Las Condes', regionId: regionRM!.id },
  });
  const comunaVina = await prisma.comuna.findFirst({
    where: { nombre: 'Viña del Mar', regionId: regionValpo!.id },
  });

  // Admin: perfil administrativo, Santiago
  await prisma.user.upsert({
    where: { email: 'admin@integraltech.cl' },
    create: {
      email: 'admin@integraltech.cl',
      passwordHash: passwordAdmin,
      role: 'ADMIN',
      nombres: 'Mauricio Andrés',
      apellidos: 'Durán Soto',
      sexo: 'HOMBRE',
      fechaNacimiento: new Date('1985-03-12'),
      domicilio: 'Av. Apoquindo 4800, Of. 1201',
      regionId: regionRM!.id,
      comunaId: comunaLasCondes!.id,
      emailVerifiedAt: new Date(),
      termsAcceptedAt: new Date(),
    },
    update: {
      passwordHash: passwordAdmin,
      nombres: 'Mauricio Andrés',
      apellidos: 'Durán Soto',
      sexo: 'HOMBRE',
      fechaNacimiento: new Date('1985-03-12'),
      domicilio: 'Av. Apoquindo 4800, Of. 1201',
      regionId: regionRM!.id,
      comunaId: comunaLasCondes!.id,
    },
  });
  console.log('  ✓ Usuario Admin: admin@integraltech.cl (password: Admin123!)');

  // Demo: perfil usuario demo, Viña del Mar
  await prisma.user.upsert({
    where: { email: 'demo@integraltech.cl' },
    create: {
      email: 'demo@integraltech.cl',
      passwordHash: passwordDemo,
      role: 'USER',
      nombres: 'Camila Ignacia',
      apellidos: 'González Rojas',
      sexo: 'MUJER',
      fechaNacimiento: new Date('1992-07-28'),
      domicilio: 'Av. Libertad 1234, Depto 42',
      regionId: regionValpo!.id,
      comunaId: comunaVina!.id,
      emailVerifiedAt: new Date(),
      termsAcceptedAt: new Date(),
    },
    update: {
      passwordHash: passwordDemo,
      nombres: 'Camila Ignacia',
      apellidos: 'González Rojas',
      sexo: 'MUJER',
      fechaNacimiento: new Date('1992-07-28'),
      domicilio: 'Av. Libertad 1234, Depto 42',
      regionId: regionValpo!.id,
      comunaId: comunaVina!.id,
    },
  });
  console.log('  ✓ Usuario Demo: demo@integraltech.cl (password: Demo123!)');

  console.log('✅ Seed completado.');
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
