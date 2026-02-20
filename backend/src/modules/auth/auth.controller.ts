import { Request, Response } from 'express';
import * as authService from './auth.service';
import { createChildLogger } from '../../common/logger';
import { userAvatarUrl } from '../../common/upload';
import type {
  RegisterDto,
  VerifyEmailDto,
  LoginDto,
  SendLoginOtpDto,
  VerifyOtpDto,
  RefreshDto,
  LogoutDto,
  PasswordRecoveryDto,
  PasswordResetDto,
  UpdateProfileDto,
  RequestEmailChangeDto,
  VerifyNewEmailDto,
} from './auth.dto';

const log = createChildLogger({ module: 'auth', layer: 'controller' });

type ReqWithDto = Request & { dto: object };

function getDto<T>(req: Request): T {
  return (req as ReqWithDto).dto as T;
}

function getClientMeta(req: Request): { ip?: string; userAgent?: string } {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress;
  const userAgent = req.headers['user-agent'];
  return { ip, userAgent };
}

export async function register(req: Request, res: Response) {
  const dto = getDto<RegisterDto>(req);
  log.info(
    {
      flow: 'register',
      email: dto.email?.toLowerCase(),
      nombres: dto.nombres,
      apellidos: dto.apellidos,
      acceptTerms: dto.acceptTerms,
      hasRegionId: !!dto.regionId?.trim(),
      hasComunaId: !!dto.comunaId?.trim(),
    },
    '[FLUJO] register: petición recibida'
  );
  const result = await authService.register(dto);
  if (result.error) {
    const status = result.error === 'EMAIL_IN_USE' ? 409 : 400;
    log.warn({ flow: 'register', error: result.error, status }, '[FLUJO] register: respuesta error');
    return res.status(status).json({ success: false, error: result.error, message: result.message });
  }
  log.info({ flow: 'register', userId: result.data?.userId, status: 201 }, '[FLUJO] register: éxito');
  return res.status(201).json({ success: true, ...result });
}

export async function verifyEmail(req: Request, res: Response) {
  const { token } = getDto<VerifyEmailDto>(req);
  log.info({ flow: 'verify-email', tokenLength: token?.length }, '[FLUJO] verify-email (POST): petición recibida');
  const result = await authService.verifyEmail(token);
  if (result.error) {
    log.warn({ flow: 'verify-email', error: result.error }, '[FLUJO] verify-email: error');
  } else {
    log.info({ flow: 'verify-email' }, '[FLUJO] verify-email: éxito');
  }
  return handleVerifyEmailResult(res, result);
}

/** Para el enlace del correo: GET /verify-email?token=... */
export async function verifyEmailGet(req: Request, res: Response) {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  log.info({ flow: 'verify-email-get', hasToken: !!token, tokenLength: token?.length }, '[FLUJO] verify-email (GET): petición recibida');
  if (!token) {
    log.warn({ flow: 'verify-email-get' }, '[FLUJO] verify-email (GET): falta token');
    return res.status(400).json({ success: false, error: 'MISSING_TOKEN', message: 'Falta el token en la URL.' });
  }
  const result = await authService.verifyEmail(token);
  if (result.error) log.warn({ flow: 'verify-email-get', error: result.error }, '[FLUJO] verify-email (GET): error');
  else log.info({ flow: 'verify-email-get' }, '[FLUJO] verify-email (GET): éxito');
  return handleVerifyEmailResult(res, result);
}

function handleVerifyEmailResult(
  res: Response,
  result: { error?: string; message?: string; data?: { message: string } }
) {
  if (result.error) {
    const status = result.error === 'INVALID_TOKEN' || result.error === 'TOKEN_EXPIRED' ? 400 : 400;
    return res.status(status).json({ success: false, error: result.error, message: result.message });
  }
  return res.json({ success: true, ...result });
}

export async function login(req: Request, res: Response) {
  const dto = getDto<LoginDto>(req);
  const meta = getClientMeta(req);
  log.info(
    { flow: 'login', email: dto.email?.toLowerCase(), hasPassword: !!dto.password, ip: meta.ip },
    '[FLUJO] login: petición recibida'
  );
  const result = await authService.login(dto, meta.ip, meta.userAgent);
  if ('error' in result && result.error) {
    const status =
      result.error === 'EMAIL_SEND_FAILED' ? 503 : result.error === 'USER_NOT_FOUND' ? 404 : 401;
    log.warn({ flow: 'login', error: result.error, status }, '[FLUJO] login: respuesta error');
    return res.status(status).json({ success: false, error: result.error, message: result.message });
  }
  const hasTokens = !!(result.data && 'accessToken' in result.data);
  log.info(
    { flow: 'login', email: dto.email?.toLowerCase(), hasTokens, userId: result.data && 'user' in result.data ? (result.data as { user?: { id: string } }).user?.id : undefined },
    '[FLUJO] login: éxito'
  );
  return res.json({ success: true, ...result });
}

/** Solicitar envío de código OTP por correo (recomendado para Flutter en lugar de POST /login sin password). */
export async function sendLoginOtp(req: Request, res: Response) {
  const { email } = getDto<SendLoginOtpDto>(req);
  log.info({ flow: 'send-login-otp', email: email?.toLowerCase() }, '[FLUJO] send-login-otp: petición recibida');
  const result = await authService.sendLoginOtp(email);
  if (result.error) {
    const status = result.error === 'EMAIL_SEND_FAILED' ? 503 : result.error === 'USER_NOT_FOUND' ? 404 : 400;
    log.warn({ flow: 'send-login-otp', error: result.error, status }, '[FLUJO] send-login-otp: respuesta error');
    return res.status(status).json({ success: false, error: result.error, message: result.message });
  }
  log.info({ flow: 'send-login-otp', email: email?.toLowerCase(), status: 200 }, '[FLUJO] send-login-otp: correo enviado OK');
  return res.json({ success: true, ...result });
}

export async function verifyOtp(req: Request, res: Response) {
  const dto = getDto<VerifyOtpDto>(req);
  const meta = getClientMeta(req);
  log.info(
    { flow: 'verify-otp', email: dto.email?.toLowerCase(), purpose: dto.purpose ?? 'LOGIN', codeLength: dto.code?.length, ip: meta.ip },
    '[FLUJO] verify-otp: petición recibida'
  );
  const result = await authService.verifyOtp(dto, meta.ip, meta.userAgent);
  if (result.error) {
    log.warn({ flow: 'verify-otp', error: result.error }, '[FLUJO] verify-otp: código inválido o expirado');
    return res.status(400).json({ success: false, error: result.error, message: result.message });
  }
  const hasTokens = !!(result.data && 'accessToken' in result.data);
  log.info(
    { flow: 'verify-otp', email: dto.email?.toLowerCase(), hasTokens, status: 200 },
    '[FLUJO] verify-otp: éxito, tokens entregados'
  );
  return res.json({ success: true, ...result });
}

export async function refresh(req: Request, res: Response) {
  log.info({ flow: 'refresh', hasRefreshToken: !!getDto<RefreshDto>(req).refreshToken?.length }, '[FLUJO] refresh: petición recibida');
  const result = await authService.refresh(getDto<RefreshDto>(req));
  if (result.error) {
    log.warn({ flow: 'refresh', error: result.error }, '[FLUJO] refresh: error');
    return res.status(401).json({ success: false, error: result.error, message: result.message });
  }
  log.info({ flow: 'refresh', status: 200 }, '[FLUJO] refresh: nuevos tokens entregados');
  return res.json({ success: true, ...result });
}

export async function logout(req: Request, res: Response) {
  log.info({ flow: 'logout' }, '[FLUJO] logout: petición recibida');
  const result = await authService.logout(getDto<LogoutDto>(req));
  log.info({ flow: 'logout', status: 200 }, '[FLUJO] logout: sesión cerrada');
  return res.json({ success: true, ...result });
}

export async function passwordRecovery(req: Request, res: Response) {
  const { email } = getDto<PasswordRecoveryDto>(req);
  log.info({ flow: 'password-recovery', email: email?.toLowerCase() }, '[FLUJO] password-recovery: petición recibida');
  const result = await authService.passwordRecovery(email);
  log.info({ flow: 'password-recovery', status: 200 }, '[FLUJO] password-recovery: respuesta enviada');
  return res.json({ success: true, ...result });
}

export async function passwordReset(req: Request, res: Response) {
  const dto = getDto<PasswordResetDto>(req);
  log.info({ flow: 'password-reset', tokenLength: dto.token?.length }, '[FLUJO] password-reset: petición recibida');
  const result = await authService.passwordReset(dto);
  if (result.error) {
    log.warn({ flow: 'password-reset', error: result.error }, '[FLUJO] password-reset: error');
    return res.status(400).json({ success: false, error: result.error, message: result.message });
  }
  log.info({ flow: 'password-reset', status: 200 }, '[FLUJO] password-reset: contraseña actualizada');
  return res.json({ success: true, ...result });
}

/** GET /auth/me — perfil del usuario logueado (para pantalla Cuenta). */
export async function getMe(req: Request, res: Response) {
  const userId = req.user!.userId;
  const result = await authService.getMe(userId);
  if (result.error) {
    return res.status(404).json({ success: false, error: result.error, message: result.message });
  }
  return res.json({ success: true, ...result });
}

/** PATCH /auth/me — actualizar perfil (nombres, apellidos, domicilio, regionId, comunaId, avatarUrl). */
export async function updateMe(req: Request, res: Response) {
  const userId = req.user!.userId;
  const dto = getDto<UpdateProfileDto>(req);
  const result = await authService.updateProfile(userId, dto);
  if (result.error) {
    return res.status(404).json({ success: false, error: result.error, message: result.message });
  }
  return res.json({ success: true, ...result });
}

/** POST /auth/me/avatar — subir imagen de perfil (multipart/form-data, campo "file"). Requiere requireAuth antes del multer. */
export async function uploadAvatar(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'NO_FILE',
      message: 'Debe enviar una imagen en el campo "file" (multipart/form-data).',
    });
  }
  const userId = req.user!.userId;
  const avatarUrl = userAvatarUrl(req.file.filename);
  const result = await authService.updateProfile(userId, { avatarUrl });
  if (result.error) {
    return res.status(404).json({ success: false, error: result.error, message: result.message });
  }
  return res.json({ success: true, ...result });
}

/** POST /auth/me/request-email-change — solicitar cambio de correo (envía token al nuevo email). */
export async function requestEmailChange(req: Request, res: Response) {
  const userId = req.user!.userId;
  const { newEmail } = getDto<RequestEmailChangeDto>(req);
  const result = await authService.requestEmailChange(userId, newEmail);
  if (result.error) {
    const status =
      result.error === 'EMAIL_IN_USE' || result.error === 'SAME_EMAIL' ? 400 : result.error === 'EMAIL_SEND_FAILED' ? 503 : 404;
    return res.status(status).json({ success: false, error: result.error, message: result.message });
  }
  return res.json({ success: true, ...result });
}

/** POST /auth/verify-new-email — verificar token de cambio de correo (desde body). */
export async function verifyNewEmail(req: Request, res: Response) {
  const { token } = getDto<VerifyNewEmailDto>(req);
  const result = await authService.verifyNewEmail(token);
  if (result.error) {
    const status = result.error === 'EMAIL_IN_USE' ? 400 : 400;
    return res.status(status).json({ success: false, error: result.error, message: result.message });
  }
  return res.json({ success: true, ...result });
}

/** GET /auth/verify-new-email?token=... — verificar desde enlace del correo. */
export async function verifyNewEmailGet(req: Request, res: Response) {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) {
    return res.status(400).json({ success: false, error: 'MISSING_TOKEN', message: 'Falta el token en la URL.' });
  }
  const result = await authService.verifyNewEmail(token);
  if (result.error) {
    return res.status(400).json({ success: false, error: result.error, message: result.message });
  }
  return res.json({ success: true, ...result });
}
