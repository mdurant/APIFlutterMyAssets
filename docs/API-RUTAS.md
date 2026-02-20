# Flutter My Assets API — Listado de rutas

Base URL por defecto: `http://localhost:3000`  
Prefijo de API: `/api/v1`

---

## General (sin prefijo)

| Método | Ruta | Descripción |
|--------|------|-------------|
| **GET** | `/health` | Health check. Respuesta: `{ "success": true, "data": { "status": "ok", "timestamp": "..." } }` |

---

## Información y estado

| Método | Ruta | Descripción |
|--------|------|-------------|
| **GET** | `/api/v1/` | Info de la API (nombre, versión). |
| **GET** | `/api/v1/ready` | Comprueba conexión a la base de datos. `200` → BD OK, `503` → BD no disponible. |

---

## Auth (`/api/v1/auth`)

| Método | Ruta | Descripción | Body / Query |
|--------|------|-------------|--------------|
| **POST** | `/api/v1/auth/register` | Registro de usuario. Envía correo de verificación. | Body: `email`, `password`, `nombres`, `apellidos`, `sexo` (HOMBRE\|MUJER\|OTRO), `fechaNacimiento` (ISO), `acceptTerms` (boolean). Opcionales (pueden ser `""` o `null`): `domicilio`, `regionId` (UUID), `comunaId` (UUID). **Registro mínimo (Flutter):** solo nombres, apellidos, email, password, acceptTerms; sexo/fecha por defecto (`"OTRO"`, `"2000-01-01"`); domicilio/regionId/comunaId vacíos. |
| **GET** | `/api/v1/auth/verify-email` | Verificación de correo desde el enlace del email. | Query: `token` |
| **POST** | `/api/v1/auth/verify-email` | Verificación de correo desde cliente (Postman, app). | Body: `{ "token": "..." }` |
| **POST** | `/api/v1/auth/login` | Login con email y contraseña. Si solo se envía `email` (o `password` vacío), envía OTP al correo. Respuestas: 200, 401, 404, 503. **Respuesta 200:** `data`: `accessToken`, `refreshToken`, `expiresIn`, **`user`**: `{ id, email, role, nombres, apellidos }` (para mostrar en perfil sin llamar a GET /auth/me). | Body: `email`, `password?` (omitir o `""` para pedir OTP) |
| **POST** | `/api/v1/auth/send-login-otp` | **Enviar código OTP por correo** (recomendado para Flutter). Solo email en body. | Body: `{ "email": "..." }` |
| **POST** | `/api/v1/auth/verify-otp` | Validar código OTP. Con `purpose: "LOGIN"` devuelve accessToken, refreshToken y **`user`**: `{ id, email, role, nombres, apellidos }` (mismo formato que login). | Body: `email`, `code` (6 dígitos), `purpose?` (LOGIN\|EMAIL_VERIFY\|PASSWORD_RESET) |
| **POST** | `/api/v1/auth/refresh` | Renovar access token. Rota el refresh token. | Body: `{ "refreshToken": "..." }` |
| **POST** | `/api/v1/auth/logout` | Cerrar sesión (revocar refresh token). | Body: `{ "refreshToken": "..." }` |
| **POST** | `/api/v1/auth/password-recovery` | Solicitar restablecimiento de contraseña. Envía correo con enlace. | Body: `{ "email": "..." }` |
| **POST** | `/api/v1/auth/password-reset` | Restablecer contraseña con el token del correo. | Body: `token`, `newPassword` |
| **GET** | `/api/v1/auth/me` | **Perfil del usuario logueado** (pantalla Cuenta / Configuración). Requiere `Authorization: Bearer <accessToken>`. Respuesta: `data` con id, email, role, nombres, apellidos, sexo, fechaNacimiento, domicilio, regionId, comunaId, avatarUrl, regionName, comunaName, etc. **El perfil está disponible en el servidor**; Flutter no debe mostrar "perfil no disponible". | Header: `Authorization` |
| **PATCH** | `/api/v1/auth/me` | Actualizar datos personales (nombres, apellidos, domicilio, regionId, comunaId, avatarUrl). No incluye cambio de email (ver siguiente fila). | Body: `nombres?`, `apellidos?`, `domicilio?`, `regionId?`, `comunaId?`, `avatarUrl?` |
| **POST** | `/api/v1/auth/me/avatar` | Subir foto de perfil. `multipart/form-data`, campo **`file`**. Máx 3 MB. | Header: `Authorization` |
| **POST** | `/api/v1/auth/me/request-email-change` | Solicitar cambio de correo. Envía token al **nuevo** email. Tras verificar (verify-new-email), el usuario debe cerrar sesión y loguearse con el nuevo correo. | Body: `{ "newEmail": "..." }`. Requiere auth. Errores: SAME_EMAIL, EMAIL_IN_USE, EMAIL_SEND_FAILED. |
| **GET** | `/api/v1/auth/verify-new-email` | Verificar cambio de correo (enlace del email). | Query: `token` |
| **POST** | `/api/v1/auth/verify-new-email` | Verificar cambio de correo desde la app. Tras éxito, el backend revoca todos los refresh tokens; Flutter debe cerrar sesión y pedir login con el nuevo correo. | Body: `{ "token": "..." }`. Respuesta: `data.newEmail`, `data.message`. |

---

## Catálogo (regiones y comunas)

| Método | Ruta | Descripción | Query / Respuesta |
|--------|------|-------------|-------------------|
| **GET** | `/api/v1/regions` | Lista de regiones (Chile). Para selects en registro. | Respuesta: `{ "success": true, "data": [ { "id": "uuid", "nombre": "Región de Valparaíso" }, ... ] }` |
| **GET** | `/api/v1/comunas` | Lista de comunas de una región. | Query: `regionId` (UUID, obligatorio). Respuesta: `{ "success": true, "data": [ { "id": "uuid", "nombre": "Viña del Mar" }, ... ] }` |

---

## Resumen por módulo

| Módulo | Rutas |
|--------|--------|
| **General** | `GET /health`, `GET /api/v1/`, `GET /api/v1/ready` |
| **Auth** | `POST /api/v1/auth/register`, `GET|POST /api/v1/auth/verify-email`, `POST /api/v1/auth/login`, `POST /api/v1/auth/send-login-otp`, `POST /api/v1/auth/verify-otp`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `POST /api/v1/auth/password-recovery`, `POST /api/v1/auth/password-reset` |
| **Catálogo** | `GET /api/v1/regions`, `GET /api/v1/comunas?regionId=uuid` |

---

## Formato de respuestas

- **Éxito:** `{ "success": true, "data": { ... } }` o `{ "success": true, "data": [ ... ] }`
- **Error:** `{ "success": false, "error": "CODIGO", "message": "Mensaje legible" }`
- **Validación:** `{ "success": false, "error": "VALIDATION_ERROR", "message": "...", "details": [ ... ] }`

## Códigos HTTP habituales

- `200` — OK  
- `201` — Creado (ej. register)  
- `400` — Bad request (validación, token inválido, etc.)  
- `401` — No autorizado (credenciales, token expirado)  
- `404` — Recurso no encontrado  
- `409` — Conflicto (ej. email ya registrado)  
- `503` — Servicio no disponible (ej. BD caída)
