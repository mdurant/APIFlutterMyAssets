# Flutter ↔ Backend: flujo de login por OTP

Para que el código OTP llegue por correo y Flutter pueda mostrar los mensajes correctos, sigue este contrato.

---

## 1. Solicitar el código OTP (enviar correo)

Hay **dos formas** de pedir el OTP. La opción A es la recomendada para Flutter (evita ambigüedades).

### Opción A (recomendada): endpoint explícito

- **Método:** `POST`
- **URL:** `{{baseUrl}}/auth/send-login-otp`
- **Body (JSON):**

```json
{
  "email": "usuario@ejemplo.com"
}
```

Solo se envía `email`. El backend envía el correo con el código de 6 dígitos.

### Opción B: usar login sin contraseña

- **Método:** `POST`
- **URL:** `{{baseUrl}}/auth/login`
- **Body (JSON):** solo el email. Puedes omitir `password` o enviar `password: ""` (string vacío).

```json
{
  "email": "usuario@ejemplo.com"
}
```

Si envías `password` con un valor no vacío, el backend hará login clásico y no enviará OTP.

**Respuestas**

| Código | Body | Qué hacer en Flutter |
|--------|------|----------------------|
| **200** | `{ "success": true, "data": { "message": "Código enviado al correo." } }` | El backend envió el correo. Mostrar algo como “Revisa tu correo, te enviamos un código de 6 dígitos”. |
| **404** | `{ "success": false, "error": "USER_NOT_FOUND", "message": "No existe una cuenta con ese correo." }` | Mostrar ese mensaje; el email no está registrado. |
| **503** | `{ "success": false, "error": "EMAIL_SEND_FAILED", "message": "No se pudo enviar el correo con el código. ..." }` | El servidor no pudo enviar el correo (ej. SMTP mal configurado). Mostrar mensaje tipo “No se pudo enviar el correo. Intenta más tarde o contacta soporte.” |
| **401** | Otros errores de auth | Tratar como error de autenticación genérico. |

Importante: si recibes **200**, el backend **sí intentó** enviar el correo. En **desarrollo con Mailtrap** el correo no llega al buzón real; hay que revisar la **bandeja de Mailtrap** (sandbox) para ver el mensaje y el código.

---

## 2. Verificar el código OTP (obtener tokens)

**Petición**

- **Método:** `POST`
- **URL:** `{{baseUrl}}/auth/verify-otp`
- **Body (JSON):**

```json
{
  "email": "usuario@ejemplo.com",
  "code": "123456",
  "purpose": "LOGIN"
}
```

- `code`: los 6 dígitos que el usuario ingresó (el que llegó por correo, o en desarrollo el que ves en Mailtrap).
- `purpose`: debe ser `"LOGIN"` para que la respuesta incluya `accessToken` y `refreshToken`.

**Respuestas**

| Código | Body | Qué hacer en Flutter |
|--------|------|----------------------|
| **200** | `{ "success": true, "data": { "accessToken": "...", "refreshToken": "...", "expiresIn": "15m", "user": { ... } } }` | Guardar tokens y datos de usuario; navegar a la pantalla principal. |
| **400** | `{ "success": false, "error": "INVALID_OTP", "message": "Código incorrecto o expirado." }` | Mostrar “Código incorrecto o expirado”. |
| **400** | `error: "OTP_EXPIRED"` | Mostrar “El código ha expirado. Solicita uno nuevo.” |
| **400** | `error: "OTP_MAX_ATTEMPTS"` | Mostrar “Demasiados intentos. Solicita un nuevo código.” |

---

## 3. Resumen para Flutter

1. **Pedir OTP (recomendado):** `POST /auth/send-login-otp` con body `{ "email": "..." }`.  
   Alternativa: `POST /auth/login` con body `{ "email": "..." }` sin `password`, o con `"password": ""`.
2. Si la respuesta es **200**, mostrar “Revisa tu correo” y en desarrollo recordar que el correo está en **Mailtrap**, no en el buzón real.
3. Si la respuesta es **503** y `error: "EMAIL_SEND_FAILED"`, mostrar que no se pudo enviar el correo e informar al usuario (y al desarrollador revisar SMTP en el backend).
4. **Verificar OTP:** `POST /auth/verify-otp` con `email`, `code` (6 dígitos) y `purpose: "LOGIN"`; con 200 guardar tokens y usuario.

---

## 4. Backend: revisar si el correo no llega

- **Variables de entorno:** en el `.env` del backend deben estar `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (en desarrollo, las de Mailtrap). Si faltan, al arrancar el servidor verás un aviso en consola y los envíos fallarán.
- **Logs:** si el envío falla, el backend responde **503** con `EMAIL_SEND_FAILED` y escribe el error en logs (operación `sendLoginOtp`). Revisar logs del servidor para el detalle.
- **Mailtrap:** en https://mailtrap.io revisar la bandeja del Sandbox; ahí aparecen todos los correos enviados en desarrollo.
