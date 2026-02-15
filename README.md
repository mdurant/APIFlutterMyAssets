# Flutter My Assets — API Backend

API REST para la aplicación **Flutter My Assets**: búsqueda y publicación de propiedades. Incluye autenticación JWT, gestión de usuarios, propiedades, términos legales y auditoría.

---

## Tecnologías utilizadas

| Tecnología | Uso en el proyecto |
|------------|--------------------|
| **Node.js** (LTS ≥18) | Entorno de ejecución del servidor |
| **TypeScript** | Lenguaje tipado para el código del backend |
| **Express** | Framework web para rutas, middleware y API REST |
| **MySQL 8+** | Base de datos relacional (acceso vía Prisma) |
| **Prisma** | ORM para modelos, migraciones y consultas a MySQL |

---

## Dependencias (packages) y uso en el proyecto

### Producción

| Package | Versión | Función en el proyecto |
|---------|---------|------------------------|
| **express** | ^4.21 | Servidor HTTP y definición de rutas REST |
| **@prisma/client** | ^5.22 | Cliente Prisma para consultas y transacciones a MySQL |
| **typescript** | ^5.6 | Compilación y tipado del código |
| **argon2** | ^0.41 | Hash seguro de contraseñas (alternativa a bcrypt) |
| **jsonwebtoken** | ^9.0 | Emisión y verificación de JWT (access y refresh tokens) |
| **class-validator** | ^0.14 | Validación de DTOs e inputs en los endpoints |
| **class-transformer** | ^0.5 | Transformación de objetos (serialización/plain to class) |
| **helmet** | ^7.1 | Cabeceras HTTP de seguridad (XSS, clickjacking, etc.) |
| **cors** | ^2.8 | Configuración de CORS para el cliente Flutter |
| **express-rate-limit** | ^7.4 | Límite de peticiones y protección contra brute force |
| **nodemailer** | ^6.9 | Envío de emails (verificación, OTP, notificaciones) |
| **pino** / **pino-pretty** | ^9.5 / ^11.3 | Logging estructurado (producción y desarrollo) |
| **compression** | ^1.7 | Compresión gzip de las respuestas |
| **dotenv** | ^16.4 | Carga de variables de entorno desde `.env` |
| **uuid** | ^10.0 | Generación de identificadores únicos |
| **reflect-metadata** | ^0.2 | Soporte para decoradores y class-validator |

### Desarrollo y testing

| Package | Versión | Función en el proyecto |
|---------|---------|------------------------|
| **prisma** | ^5.22 | CLI: migraciones, `prisma generate`, Prisma Studio |
| **ts-node** / **ts-node-dev** | ^10.9 / ^2.0 | Ejecución de TypeScript en desarrollo y hot-reload |
| **jest** | ^29.7 | Framework de pruebas unitarias e integración |
| **supertest** | ^7.0 | Pruebas HTTP contra la API (endpoints) |
| **ts-jest** | ^29.2 | Integración de Jest con TypeScript |
| **eslint** + **@typescript-eslint/\*** | ^9.14 / ^8.14 | Linting y reglas para TypeScript |
| **@types/express**, **@types/node**, etc. | Varias | Tipos TypeScript para dependencias JS |

---

## Estructura del proyecto

```
APIFlutterMyAssets/
├── backend/                 # API REST (Node + Express + Prisma)
│   ├── src/
│   │   ├── config/          # Configuración (env, app)
│   │   ├── modules/         # Módulos: auth, users, properties, terms, audit
│   │   ├── common/          # DTOs, guards, interceptors, filters
│   │   └── database/        # Prisma y conexión BD
│   ├── prisma/              # Schema y migraciones MySQL
│   └── package.json
├── .gitignore
└── README.md
```

---

## Requisitos

- **Node.js** ≥ 18
- **MySQL** 8+
- **npm** (o yarn/pnpm)

---

## Instalación y uso

```bash
cd backend
npm install
cp .env.example .env   # Configurar variables (DATABASE_URL, JWT_SECRET, etc.)
npm run prisma:generate
npm run prisma:migrate
npm run dev            # Desarrollo con recarga
```

### Scripts principales

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor en desarrollo con hot-reload |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Ejecuta la API compilada (`node dist/index.js`) |
| `npm run prisma:generate` | Genera el cliente Prisma |
| `npm run prisma:migrate` | Aplica migraciones a la BD |
| `npm run prisma:studio` | Abre Prisma Studio (UI de la BD) |
| `npm test` | Ejecuta tests con Jest |
| `npm run test:cov` | Tests con reporte de cobertura |
| `npm run lint` | Ejecuta ESLint sobre `src/` |

---

## Seguridad y buenas prácticas

- Variables sensibles en `.env` (no versionado).
- Contraseñas y OTP con hash (argon2); JWT con rotación/revocación.
- Rate limiting y Helmet/CORS configurados.
- Validación de entradas con DTOs (class-validator).
- Auditoría de operaciones críticas (login, términos, CRUD relevante).

---

## Autor y liderazgo técnico

**Mauricio Durán**  
**CTO — IntegralTech Services SpA (Chile)**

Responsable del diseño técnico, la arquitectura del backend y las decisiones de seguridad y escalabilidad de la API Flutter My Assets.

- **Nombre:** Mauricio Durán Torres.
- **Rol:** CTO (Chief Technology Officer)  
- **Empresa:** IntegralTech Services SpA — Chile  
- **Contacto:** mauriciodurant@gmail.com  
- **Web:** [integraltech.cl](https://integraltech.cl)

---

## Licencia

Uso privado / UNLICENSED. Todos los derechos reservados.
