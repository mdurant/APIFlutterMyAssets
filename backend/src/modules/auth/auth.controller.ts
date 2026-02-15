import { Request, Response } from 'express';
import * as authService from './auth.service';
import type {
  RegisterDto,
  VerifyEmailDto,
  LoginDto,
  VerifyOtpDto,
  RefreshDto,
  LogoutDto,
  PasswordRecoveryDto,
  PasswordResetDto,
} from './auth.dto';

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
  const result = await authService.register(getDto<RegisterDto>(req));
  if (result.error) {
    const status = result.error === 'EMAIL_IN_USE' ? 409 : 400;
    return res.status(status).json({ success: false, error: result.error, message: result.message });
  }
  return res.status(201).json({ success: true, ...result });
}

export async function verifyEmail(req: Request, res: Response) {
  const { token } = getDto<VerifyEmailDto>(req);
  return handleVerifyEmailResult(res, await authService.verifyEmail(token));
}

/** Para el enlace del correo: GET /verify-email?token=... */
export async function verifyEmailGet(req: Request, res: Response) {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) {
    return res.status(400).json({ success: false, error: 'MISSING_TOKEN', message: 'Falta el token en la URL.' });
  }
  return handleVerifyEmailResult(res, await authService.verifyEmail(token));
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
  const meta = getClientMeta(req);
  const result = await authService.login(getDto<LoginDto>(req), meta.ip, meta.userAgent);
  if ('error' in result && result.error) {
    return res.status(401).json({ success: false, error: result.error, message: result.message });
  }
  return res.json({ success: true, ...result });
}

export async function verifyOtp(req: Request, res: Response) {
  const meta = getClientMeta(req);
  const result = await authService.verifyOtp(getDto<VerifyOtpDto>(req), meta.ip, meta.userAgent);
  if (result.error) {
    return res.status(400).json({ success: false, error: result.error, message: result.message });
  }
  return res.json({ success: true, ...result });
}

export async function refresh(req: Request, res: Response) {
  const result = await authService.refresh(getDto<RefreshDto>(req));
  if (result.error) {
    return res.status(401).json({ success: false, error: result.error, message: result.message });
  }
  return res.json({ success: true, ...result });
}

export async function logout(req: Request, res: Response) {
  const result = await authService.logout(getDto<LogoutDto>(req));
  return res.json({ success: true, ...result });
}

export async function passwordRecovery(req: Request, res: Response) {
  const { email } = getDto<PasswordRecoveryDto>(req);
  const result = await authService.passwordRecovery(email);
  return res.json({ success: true, ...result });
}

export async function passwordReset(req: Request, res: Response) {
  const result = await authService.passwordReset(getDto<PasswordResetDto>(req));
  if (result.error) {
    return res.status(400).json({ success: false, error: result.error, message: result.message });
  }
  return res.json({ success: true, ...result });
}
