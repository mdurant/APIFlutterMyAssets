# Flutter My Assets — Estado actual del proyecto (README-2)

Documento que detalla **todo lo que el proyecto tiene actualmente**: tecnologías, módulos, funcionalidad desarrollada y en funcionamiento.

---

## 1. Descripción del proyecto

**Flutter My Assets** es una API REST que da soporte a una aplicación móvil (Flutter) de búsqueda y publicación de propiedades. El backend expone autenticación (registro, login, OTP, JWT, recuperación de contraseña), catálogo de regiones y comunas de Chile, y está preparado para módulos de propiedades, términos y auditoría.

- **Repositorio:** Backend en `backend/`, documentación en `docs/`.
- **Autor / CTO:** Mauricio Durán — IntegralTech Services SpA (Chile).  
  Contacto: mauriciodurant@gmail.com | https://integraltech.cl

---

## 2. Tecnologías utilizadas

| Tecnología | Uso |
|------------|-----|
| **Node.js** (≥ 18) | Entorno de ejecución del servidor |
| **TypeScript** | Lenguaje del backend, tipado estricto |
| **Express** | Framework HTTP, rutas y middleware |
| **MySQL 8+** | Base de datos relacional |
| **Prisma** | ORM: modelos, migraciones, cliente TypeScript |
| **Pino** | Logging estructurado (desarrollo: pino-pretty) |
| **Nodemailer** | Envío de correos (Mailtrap en desarrollo) |

### Dependencias principales (producción)

- **Autenticación y seguridad:** `argon2`, `jsonwebtoken`, `helmet`, `cors`, `express-rate-limit`
- **Validación y transformación:** `class-validator`, `class-transformer`, `reflect-metadata`
- **Utilidades:** `dotenv`, `compression`, `uuid`
- **Correo:** `nodemailer`
- **Logs:** `pino`, `pino-pretty`

### Desarrollo y pruebas

- **Prisma CLI**, **ts-node**, **ts-node-dev**, **TypeScript**, **Jest**, **Supertest**, **ESLint**, **@typescript-eslint**

---

## 3. Estructura del backend (`backend/`)

```
backend/
├── prisma/
│   ├── schema.prisma      # Modelos y migraciones
│   ├── seed.ts            # Seed: regiones, comunas, usuarios Admin/Demo
│   └── migrations/        # Migraciones aplicadas
├── src/
│   ├── index.ts           # Entrada: Express, CORS, rate limit, rutas, error handler
│   ├── config/
│   │   └── index.ts       # Carga .env y exporta config (BD, JWT, SMTP, puerto)
│   ├── database/
│   │   └── prisma.ts      # Cliente Prisma singleton
│   ├── common/
│   │   ├── logger/        # Pino: logger base y createChildLogger
│   │   ├── middleware/
│   │   │   └── request-logger.ts   # Log de cada petición HTTP (method, url, status, duration, ip)
│   │   ├── validate.ts    # validateBody(Dto), asyncHandler, validación con class-validator
│   │   ├── mailer.ts      # sendMail() con Nodemailer (config SMTP)
│   │   └── utils/
│   │       └── hash.ts    # hashToken, generateRandomToken, generateOtp
│   ├── modules/
│   │   └── auth/
│   │       ├── auth.dto.ts      # DTOs: Register, Login, VerifyEmail, VerifyOtp, Refresh, Logout, etc.
│   │       ├── auth.service.ts # Lógica: register, verifyEmail, login, sendLoginOtp, verifyOtp, refresh, logout, passwordRecovery, passwordReset
│   │       ├── auth.controller.ts # Handlers HTTP y logs de flujo [FLUJO]
│   │       └── auth.routes.ts   # Rutas POST/GET bajo /api/v1/auth
│   ├── routes/
│   │   └── regions.routes.ts   # GET /regions, GET /comunas?regionId=
│   └── scripts/
│       └── send-test-email.ts  # Prueba de envío de correo (npm run mail:test)
├── postman/
│   └── Flutter-My-Assets-Auth.postman_collection.json   # Colección Postman para Auth
├── package.json
├── tsconfig.json
├── .env / .env.example
└── ...
```

---

## 4. Módulos y funcionalidad en funcionamiento

### 4.1 Módulo Auth (autenticación)

Funcionalidad implementada y operativa:

| Funcionalidad | Estado | Descripción breve |
|---------------|--------|-------------------|
| **Registro** | ✅ | POST `/auth/register`. Acepta registro mínimo (nombres, apellidos, email, password, acceptTerms; sexo/fecha por defecto; domicilio/regionId/comunaId opcionales o vacíos). Envía correo de verificación. |
| **Verificación de correo** | ✅ | GET `/auth/verify-email?token=...` (enlace del correo) y POST con body `{ token }`. Token con hash, expiración 24 h. |
| **Login con contraseña** | ✅ | POST `/auth/login` con `email` y `password`. Devuelve accessToken, refreshToken y user. |
| **Login por OTP** | ✅ | POST `/auth/send-login-otp` con `{ email }` → envía código 6 dígitos por correo. POST `/auth/verify-otp` con `email`, `code`, `purpose: "LOGIN"` → devuelve tokens. También soportado vía POST `/auth/login` sin password (o `password: ""`). |
| **Refresh de tokens** | ✅ | POST `/auth/refresh` con `refreshToken`. Rotación de refresh token. |
| **Logout** | ✅ | POST `/auth/logout` con `refreshToken`. Revoca el token. |
| **Recuperación de contraseña** | ✅ | POST `/auth/password-recovery` con `email` → envía correo con enlace. |
| **Restablecer contraseña** | ✅ | POST `/auth/password-reset` con `token` (del correo) y `newPassword`. |

Seguridad aplicada:

- Contraseñas con **argon2**.
- Tokens sensibles (verificación email, OTP, refresh, reset) con **hash SHA-256** antes de guardar.
- **JWT** access (corto) y refresh (rotación/revocación).
- **Rate limiting** global (200 req/15 min).
- **Helmet** y **CORS** configurados.
- Validación de entrada con **class-validator** y DTOs.

### 4.2 Catálogo (regiones y comunas)

- **GET** `/api/v1/regions`: lista de regiones de Chile (id UUID, nombre). Para selects en registro/perfil.
- **GET** `/api/v1/comunas?regionId=uuid`: comunas de una región (id UUID, nombre).

Datos: 16 regiones y 91 comunas en BD, cargados por **seed** (Prisma).

### 4.3 General y estado

- **GET** `/health`: health check (status, timestamp).
- **GET** `/api/v1/`: información de la API (nombre, versión).
- **GET** `/api/v1/ready`: comprobación de conexión a MySQL.

### 4.4 Logging

- **Request logger:** cada petición registra método, URL, statusCode, durationMs, ip (nivel según 2xx/4xx/5xx).
- **Flujo Auth:** logs con prefijo `[FLUJO]` en controller y service (register, login, send-login-otp, verify-otp, refresh, logout, etc.) con datos seguros (email, userId, hasTokens; sin contraseñas ni códigos OTP).
- **Logger central:** Pino (desarrollo: pino-pretty; producción: JSON). Nivel configurable con `LOG_LEVEL`.

### 4.5 Correo

- **Mailer** en `common/mailer.ts` usando Nodemailer y variables de entorno (SMTP).
- En desarrollo: **Mailtrap Sandbox** (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS en `.env`).
- Uso: verificación de email al registrarse, OTP de login, recuperación de contraseña.
- Script de prueba: `npm run mail:test` (envío “Hola Mundo” para validar SMTP).

---

## 5. Base de datos (Prisma + MySQL)

### Modelos en uso

| Modelo | Uso |
|--------|-----|
| **User** | Usuarios: email, passwordHash, nombres, apellidos, sexo, fechaNacimiento, domicilio, regionId, comunaId, emailVerifiedAt, termsAcceptedAt, role, soft delete. |
| **Region** | Regiones de Chile (nombre). |
| **Comuna** | Comunas por región (nombre, regionId). |
| **RefreshToken** | Tokens de refresco (tokenHash, userId, expiresAt, revoked). |
| **EmailVerificationToken** | Tokens para verificación de correo (userId, tokenHash, expiresAt, usedAt). |
| **OtpCode** | Códigos OTP (email, codeHash, purpose, expiresAt, attempts). |
| **PasswordResetToken** | Tokens para restablecer contraseña (userId, tokenHash, expiresAt, usedAt). |
| **Property** | Propiedades/inmuebles (título, descripción, precio, status, userId, **rating_avg**; preparado para CRUD). |
| **Term** | Versiones de términos y condiciones. |
| **AuditLog** | Auditoría (action, entity, entityId, userId, beforeJson, afterJson, ip, userAgent). Todo CREATE/UPDATE/DELETE debe registrar aquí. |
| **PropertyImage** | Imágenes por propiedad (url, sort_order). |
| **Favorite** | Favoritos usuario↔propiedad; UNIQUE(user_id, property_id). |
| **UserTermsAcceptance** | Trazabilidad de aceptación de términos por versión (user_id, term_id, term_version, accepted_at, ip, user_agent). |
| **Review** | Reseñas de propiedades (rating, comment, media_url); promedio en properties.rating_avg (job/trigger). |
| **Conversation** | Conversaciones por propiedad (owner_user_id, renter_user_id). |
| **Message** | Mensajes (conversation_id, sender_user_id, body, type text\|image, read_at). |
| **Notification** | Notificaciones por usuario (type, title, body, data_json, read_at). |
| **RiskAssessment** | Valoración de riesgo por propiedad (score 0-100, level LOW\|MEDIUM\|HIGH, factors_json). |

Migraciones aplicadas y seed ejecutable con `npx prisma db seed` (regiones, comunas, usuarios Admin y Demo).

### 5.1 Tablas de la BD creadas actualmente

Detalle de cada tabla en MySQL (nombre físico según `@@map` en Prisma), columnas y tipos.

| Tabla | Descripción | Columnas (nombre en BD → tipo / notas) |
|-------|-------------|----------------------------------------|
| **regions** | Regiones de Chile | `id` (UUID PK), `nombre` (VARCHAR UNIQUE). |
| **comunas** | Comunas por región | `id` (UUID PK), `nombre`, `region_id` (FK → regions). Índice en `region_id`. UNIQUE(nombre, region_id). |
| **users** | Usuarios del sistema | `id` (UUID PK), `email` (UNIQUE), `password_hash`, `role` (default USER), `nombres`, `apellidos`, `sexo`, `fecha_nacimiento` (DATE), `domicilio` (nullable), `region_id`, `comuna_id` (FK nullable), `email_verified_at`, `terms_accepted_at`, `created_at`, `updated_at`, `deleted_at` (soft delete). Índices: region_id, comuna_id. |
| **refresh_tokens** | Tokens de refresco JWT | `id` (UUID PK), `user_id` (FK → users, CASCADE), `token_hash`, `expires_at`, `revoked` (boolean), `created_at`. Índices: user_id, token_hash. |
| **email_verification_tokens** | Tokens para verificar correo | `id` (UUID PK), `user_id` (FK → users, CASCADE), `token_hash`, `expires_at`, `used_at` (nullable), `created_at`. Índices: user_id, token_hash. |
| **otp_codes** | Códigos OTP (login, etc.) | `id` (UUID PK), `email`, `code_hash`, `purpose` (LOGIN \| EMAIL_VERIFY \| PASSWORD_RESET), `expires_at`, `attempts` (default 0), `created_at`. Índices: email, (email, purpose). |
| **password_reset_tokens** | Tokens para restablecer contraseña | `id` (UUID PK), `user_id` (FK → users, CASCADE), `token_hash`, `expires_at`, `used_at` (nullable), `created_at`. Índices: user_id, token_hash. |
| **properties** | Inmuebles / publicaciones | `id` (UUID PK), `title`, `description` (TEXT nullable), `address`, `city`, `region`, `price` (DECIMAL(14,2)), `currency` (default CLP), `type` (venta \| arriendo), `status` (DRAFT \| PUBLISHED \| ARCHIVED), `user_id` (FK nullable), `rating_avg` (DECIMAL(3,2) nullable), `created_at`, `updated_at`, `deleted_at`. Índices: user_id, status, city. |
| **terms** | Versiones de términos y condiciones | `id` (UUID PK), `version` (UNIQUE, ej. "1.0"), `title`, `content` (LONGTEXT), `active` (boolean), `created_at`. |
| **audit_logs** | Registro de auditoría | `id` (UUID PK), `action` (LOGIN \| CREATE \| UPDATE \| DELETE \| ACCEPT_TERMS), `entity` (User \| Property \| Term, etc.), `entity_id`, `user_id` (FK nullable), `before_json` (JSON), `after_json` (JSON), `ip`, `user_agent` (VARCHAR 500), `created_at`. Índices: action, entity, user_id, created_at. **Todo CREATE/UPDATE/DELETE debe registrar aquí.** |
| **property_images** | Imágenes de propiedades | `id` (UUID PK), `property_id` (FK → properties, CASCADE), `url` (VARCHAR 500), `sort_order` (default 0), `created_at`. Índice: property_id. |
| **favorites** | Favoritos usuario↔propiedad | `id` (UUID PK), `user_id` (FK → users, CASCADE), `property_id` (FK → properties, CASCADE), `created_at`. UNIQUE(user_id, property_id). Índices: user_id, property_id. |
| **user_terms_acceptances** | Aceptación de términos por versión | `id` (UUID PK), `user_id` (FK → users), `term_id` (FK → terms), `term_version`, `accepted_at`, `ip`, `user_agent` (VARCHAR 500), `created_at`. Índices: user_id, term_id. |
| **reviews** | Reseñas de propiedades | `id` (UUID PK), `property_id` (FK → properties), `user_id` (FK → users), `rating`, `comment` (TEXT nullable), `media_url` (nullable), `created_at`. Índices: property_id, user_id. Promedio → properties.rating_avg (job/trigger). |
| **conversations** | Conversaciones por propiedad | `id` (UUID PK), `property_id` (FK → properties), `owner_user_id` (FK → users), `renter_user_id` (FK → users), `created_at`. Índices: property_id, owner_user_id, renter_user_id. |
| **messages** | Mensajes en conversaciones | `id` (UUID PK), `conversation_id` (FK → conversations, CASCADE), `sender_user_id` (FK → users), `body` (TEXT), `type` (text \| image), `created_at`, `read_at` (nullable). Índices: conversation_id, sender_user_id. |
| **notifications** | Notificaciones por usuario | `id` (UUID PK), `user_id` (FK → users, CASCADE), `type`, `title` (VARCHAR 255), `body` (TEXT nullable), `data_json` (JSON nullable), `read_at` (nullable), `created_at`. Índices: user_id, (user_id, read_at). |
| **risk_assessments** | Valoración de riesgo por propiedad | `id` (UUID PK), `property_id` (FK → properties, CASCADE), `score` (0-100), `level` (LOW \| MEDIUM \| HIGH), `factors_json` (JSON nullable), `updated_at`. Índice: property_id. |

En total: **18 tablas**. Relaciones principales: `users` ↔ `regions`/`comunas`; `users` → tokens, properties, favorites, reviews, conversations (owner/renter), messages, notifications, audit_logs; `properties` → property_images, favorites, reviews, conversations, risk_assessments; `comunas` → `regions`; `terms` → user_terms_acceptances.

**Nota:** Todo CREATE, UPDATE y DELETE de entidades de negocio debe registrar un registro en `audit_logs` (acción, entidad, entity_id, usuario, before/after JSON, ip, user_agent).

---

## 6. API — Resumen de rutas

- **General:** `GET /health`, `GET /api/v1/`, `GET /api/v1/ready`
- **Auth:** `POST /api/v1/auth/register`, `GET|POST /api/v1/auth/verify-email`, `POST /api/v1/auth/login`, `POST /api/v1/auth/send-login-otp`, `POST /api/v1/auth/verify-otp`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `POST /api/v1/auth/password-recovery`, `POST /api/v1/auth/password-reset`
- **Catálogo:** `GET /api/v1/regions`, `GET /api/v1/comunas?regionId=uuid`

Formato de respuesta: éxito `{ success: true, data: ... }`, error `{ success: false, error: "CODIGO", message: "..." }`.  
Detalle completo en **`docs/API-RUTAS.md`**.

---

## 7. Configuración y variables de entorno

En `backend/.env` (o `.env.example` como plantilla):

- **DATABASE_URL:** conexión MySQL (ej. `mysql://user:pass@localhost:3306/backend_flutter`).
- **JWT_ACCESS_SECRET**, **JWT_REFRESH_SECRET**, **JWT_ACCESS_EXPIRES_IN**, **JWT_REFRESH_EXPIRES_IN**
- **NODE_ENV**, **PORT**, **API_PREFIX** (ej. `/api/v1`)
- **SMTP_HOST**, **SMTP_PORT**, **SMTP_USER**, **SMTP_PASS**, **MAIL_FROM** (Mailtrap en desarrollo)
- Opcional: **APP_URL** (base para enlaces en correos), **LOG_LEVEL**

El servidor escucha en **0.0.0.0** para acceso desde emulador/dispositivos en la red.

---

## 8. Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor en desarrollo (ts-node-dev, recarga automática). |
| `npm run build` | Compila TypeScript a `dist/`. |
| `npm start` | Ejecuta `dist/index.js` (producción). |
| `npm run prisma:generate` | Genera cliente Prisma. |
| `npm run prisma:migrate` | Aplica migraciones. |
| `npm run prisma:studio` | Abre Prisma Studio (UI de la BD). |
| `npx prisma db seed` | Ejecuta seed (regiones, comunas, usuarios Admin/Demo). |
| `npm run mail:test` | Envía correo de prueba (Hola Mundo). |
| `npm test` / `npm run test:cov` | Tests con Jest. |
| `npm run lint` / `npm run lint:fix` | ESLint. |

---

## 9. Documentación incluida

| Archivo | Contenido |
|---------|-----------|
| **docs/API-RUTAS.md** | Listado completo de rutas, métodos, body/query y códigos HTTP. |
| **docs/FLUTTER-flujo-OTP.md** | Flujo de login por OTP: send-login-otp, verify-otp, respuestas, error de red (URLs para emulador/dispositivo). |
| **docs/flutter_region_comuna_select.md** | Uso de regiones y comunas en Flutter: selects por nombre, UUID en body, servicio y ejemplos de código. |
| **backend/postman/Flutter-My-Assets-Auth.postman_collection.json** | Colección Postman para probar todos los endpoints de Auth (y send-login-otp). |

---

## 10. Usuarios de prueba (seed)

Tras `npx prisma db seed`:

| Rol | Email | Contraseña |
|-----|--------|------------|
| Admin | admin@integraltech.cl | Admin123! |
| Demo  | demo@integraltech.cl  | Demo123!  |

Datos ficticios con nombres y direcciones chilenas (región/comuna asociadas).

---

## 11. Resumen de lo que está funcionando

- Servidor Express con TypeScript, CORS, Helmet, rate limit, compresión.
- Conexión a MySQL vía Prisma y migraciones aplicadas.
- Registro de usuarios (completo y mínimo para Flutter), verificación de correo (GET y POST), login con contraseña y login por OTP (send-login-otp + verify-otp), refresh, logout, recuperación y restablecimiento de contraseña.
- Catálogo de regiones y comunas (Chile) para selects en app.
- Envío de correos (Mailtrap en desarrollo): verificación, OTP, recuperación de contraseña y script de prueba.
- Logging: peticiones HTTP y flujo auth con datos seguros.
- Validación de entrada (DTOs), manejo global de errores y respuestas JSON unificadas.
- Documentación de API, flujo OTP y uso de regiones/comunas en Flutter, más colección Postman.

---

*Documento generado a partir del estado actual del repositorio. Proyecto: Flutter My Assets — Backend API. Mauricio Durán, CTO — IntegralTech Services SpA, Chile.*
