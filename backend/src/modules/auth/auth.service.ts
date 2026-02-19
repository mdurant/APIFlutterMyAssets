import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '../../config';
import { sendMail } from '../../common/mailer';
import { hashToken, generateRandomToken, generateOtp } from '../../common/utils/hash';
import { createChildLogger } from '../../common/logger';
import type {
  RegisterDto,
  LoginDto,
  VerifyOtpDto,
  RefreshDto,
  PasswordResetDto,
} from './auth.dto';

const prisma = new PrismaClient();
const log = createChildLogger({ module: 'auth' });

const ACCESS_EXPIRES = config.jwt.accessExpiresIn;
const REFRESH_EXPIRES = config.jwt.refreshExpiresIn;
const EMAIL_VERIFY_EXPIRES_MS = 24 * 60 * 60 * 1000; // 24h
const PASSWORD_RESET_EXPIRES_MS = 60 * 60 * 1000; // 1h
const OTP_EXPIRES_MS = 10 * 60 * 1000; // 10 min
const OTP_MAX_ATTEMPTS = 5;

function signAccessToken(userId: string, email: string, role: string): string {
  return jwt.sign(
    { sub: userId, email, role, type: 'access' },
    config.jwt.accessSecret,
    { expiresIn: ACCESS_EXPIRES } as jwt.SignOptions
  );
}

function signRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: REFRESH_EXPIRES } as jwt.SignOptions
  );
}

export async function register(dto: RegisterDto) {
  log.info({ email: dto.email.toLowerCase(), operation: 'register' }, 'Registro: inicio');
  const existing = await prisma.user.findFirst({
    where: { email: dto.email.toLowerCase(), deletedAt: null },
  });
  if (existing) {
    log.warn({ email: dto.email.toLowerCase(), error: 'EMAIL_IN_USE' }, 'Registro: correo ya registrado');
    return { error: 'EMAIL_IN_USE', message: 'El correo ya está registrado.' };
  }
  if (!dto.acceptTerms) {
    log.warn({ email: dto.email.toLowerCase(), error: 'TERMS_REQUIRED' }, 'Registro: términos no aceptados');
    return { error: 'TERMS_REQUIRED', message: 'Debe aceptar los términos y condiciones.' };
  }

  const passwordHash = await argon2.hash(dto.password);
  const domicilio = dto.domicilio?.trim();
  const regionId = dto.regionId?.trim();
  const comunaId = dto.comunaId?.trim();
  const user = await prisma.user.create({
    data: {
      email: dto.email.toLowerCase(),
      passwordHash,
      nombres: dto.nombres.trim(),
      apellidos: dto.apellidos.trim(),
      sexo: dto.sexo,
      fechaNacimiento: new Date(dto.fechaNacimiento),
      domicilio: domicilio || null,
      regionId: regionId || null,
      comunaId: comunaId || null,
      termsAcceptedAt: new Date(),
      emailVerifiedAt: null,
    },
  });

  const rawToken = generateRandomToken(32);
  const tokenHash = hashToken(rawToken);
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + EMAIL_VERIFY_EXPIRES_MS),
    },
  });

  const verifyUrl = `${process.env.APP_URL ?? 'http://localhost:3000'}/api/v1/auth/verify-email?token=${rawToken}`;
  await sendMail({
    to: user.email,
    subject: 'Verifica tu correo - Flutter My Assets',
    html: `<p>Hola ${user.nombres},</p><p>Haz clic en el siguiente enlace para verificar tu correo:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>El enlace expira en 24 horas.</p>`,
    text: `Verifica tu correo: ${verifyUrl}`,
  });

  log.info({ userId: user.id, email: user.email, operation: 'register' }, 'Registro: éxito, correo de verificación enviado');
  return {
    data: {
      userId: user.id,
      email: user.email,
      message: 'Registro exitoso. Revisa tu correo para verificar tu cuenta.',
    },
  };
}

export async function verifyEmail(token: string) {
  log.info({ operation: 'verifyEmail' }, 'Verificación de correo: inicio');
  const tokenHash = hashToken(token);
  const record = await prisma.emailVerificationToken.findFirst({
    where: { tokenHash },
    include: { user: true },
  });
  if (!record) {
    log.warn({ operation: 'verifyEmail', error: 'INVALID_TOKEN' }, 'Verificación de correo: token inválido');
    return { error: 'INVALID_TOKEN', message: 'Token de verificación inválido.' };
  }
  if (record.usedAt) {
    log.warn({ userId: record.userId, operation: 'verifyEmail', error: 'TOKEN_ALREADY_USED' }, 'Verificación de correo: enlace ya usado');
    return { error: 'TOKEN_ALREADY_USED', message: 'Este enlace ya fue utilizado.' };
  }
  if (new Date() > record.expiresAt) {
    log.warn({ userId: record.userId, operation: 'verifyEmail', error: 'TOKEN_EXPIRED' }, 'Verificación de correo: token expirado');
    return { error: 'TOKEN_EXPIRED', message: 'El enlace de verificación ha expirado.' };
  }

  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
  ]);

  log.info({ userId: record.userId, email: record.user.email, operation: 'verifyEmail' }, 'Verificación de correo: éxito');
  return {
    data: { message: 'Correo verificado correctamente.' },
  };
}

export async function login(dto: LoginDto, ip?: string, userAgent?: string) {
  const email = dto.email.toLowerCase();
  log.info({ email, operation: 'login', hasPassword: !!dto.password }, 'Login: inicio');
  if (!dto.password) {
    const result = await sendLoginOtp(email);
    if (result.error) {
      log.warn({ email, error: result.error, operation: 'login' }, 'Login (OTP): usuario no encontrado');
    } else {
      log.info({ email, operation: 'login', flow: 'otp_sent' }, 'Login: OTP enviado al correo');
    }
    return result;
  }
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
  });
  if (!user) {
    log.warn({ email, error: 'INVALID_CREDENTIALS', operation: 'login' }, 'Login: usuario no encontrado');
    return { error: 'INVALID_CREDENTIALS', message: 'Correo o contraseña incorrectos.' };
  }
  const valid = await argon2.verify(user.passwordHash, dto.password);
  if (!valid) {
    log.warn({ email, userId: user.id, error: 'INVALID_CREDENTIALS', operation: 'login' }, 'Login: contraseña incorrecta');
    return { error: 'INVALID_CREDENTIALS', message: 'Correo o contraseña incorrectos.' };
  }

  const refreshToken = signRefreshToken(user.id);
  const refreshHash = hashToken(refreshToken);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshHash,
      expiresAt: refreshExpires,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      userId: user.id,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    },
  });

  log.info({ userId: user.id, email: user.email, role: user.role, operation: 'login' }, 'Login: éxito');
  return {
    data: {
      accessToken: signAccessToken(user.id, user.email, user.role),
      refreshToken,
      expiresIn: ACCESS_EXPIRES,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        nombres: user.nombres,
        apellidos: user.apellidos,
      },
    },
  };
}

export async function sendLoginOtp(email: string) {
  const emailNorm = email.toLowerCase();
  log.info({ flow: 'sendLoginOtp', email: emailNorm }, '[FLUJO] sendLoginOtp: buscando usuario');
  const user = await prisma.user.findFirst({
    where: { email: emailNorm, deletedAt: null },
  });
  if (!user) {
    log.warn({ flow: 'sendLoginOtp', email: emailNorm, error: 'USER_NOT_FOUND' }, '[FLUJO] sendLoginOtp: usuario no existe');
    return { error: 'USER_NOT_FOUND', message: 'No existe una cuenta con ese correo.' };
  }
  log.info({ flow: 'sendLoginOtp', userId: user.id, email: user.email, nombres: user.nombres }, '[FLUJO] sendLoginOtp: usuario encontrado, generando OTP');

  const code = generateOtp(6);
  const codeHash = hashToken(code);
  await prisma.otpCode.deleteMany({ where: { email: user.email, purpose: 'LOGIN' } });
  await prisma.otpCode.create({
    data: {
      email: user.email,
      codeHash,
      purpose: 'LOGIN',
      expiresAt: new Date(Date.now() + OTP_EXPIRES_MS),
    },
  });

  try {
    log.info({ flow: 'sendLoginOtp', email: user.email, userId: user.id, to: user.email }, '[FLUJO] sendLoginOtp: enviando correo a Mailtrap/usuario');
    await sendMail({
      to: user.email,
      subject: 'Código de acceso - Flutter My Assets',
      html: `<p>Hola ${user.nombres},</p><p>Tu código de acceso es: <strong>${code}</strong></p><p>Válido por 10 minutos. No lo compartas.</p>`,
      text: `Tu código de acceso es: ${code}. Válido por 10 minutos.`,
    });
    log.info({ flow: 'sendLoginOtp', email: user.email, userId: user.id }, '[FLUJO] sendLoginOtp: correo enviado OK');
  } catch (err) {
    log.error({ flow: 'sendLoginOtp', err: err instanceof Error ? err.message : err, email: user.email, userId: user.id }, '[FLUJO] sendLoginOtp: ERROR al enviar correo');
    return {
      error: 'EMAIL_SEND_FAILED',
      message: 'No se pudo enviar el correo con el código. Revisa la configuración del servidor o intenta más tarde.',
    };
  }

  return { data: { message: 'Código enviado al correo.' } };
}

export async function verifyOtp(dto: VerifyOtpDto, ip?: string, userAgent?: string) {
  const purpose = dto.purpose ?? 'LOGIN';
  const email = dto.email.toLowerCase();
  log.info({ flow: 'verifyOtp', email, purpose, codeLength: dto.code?.length }, '[FLUJO] verifyOtp: validando código');
  const record = await prisma.otpCode.findFirst({
    where: { email, purpose },
    orderBy: { createdAt: 'desc' },
  });
  if (!record) {
    log.warn({ email, purpose, error: 'INVALID_OTP', operation: 'verifyOtp' }, 'Verificación OTP: código no encontrado o expirado');
    return { error: 'INVALID_OTP', message: 'Código incorrecto o expirado.' };
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    log.warn({ email, purpose, error: 'OTP_MAX_ATTEMPTS', operation: 'verifyOtp' }, 'Verificación OTP: demasiados intentos');
    return { error: 'OTP_MAX_ATTEMPTS', message: 'Demasiados intentos. Solicita un nuevo código.' };
  }
  if (new Date() > record.expiresAt) {
    log.warn({ email, purpose, error: 'OTP_EXPIRED', operation: 'verifyOtp' }, 'Verificación OTP: código expirado');
    return { error: 'OTP_EXPIRED', message: 'El código ha expirado.' };
  }

  const codeHash = hashToken(dto.code);
  if (codeHash !== record.codeHash) {
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { attempts: record.attempts + 1 },
    });
    log.warn({ email, purpose, attempts: record.attempts + 1, operation: 'verifyOtp', error: 'INVALID_OTP' }, 'Verificación OTP: código incorrecto');
    return { error: 'INVALID_OTP', message: 'Código incorrecto.' };
  }

  await prisma.otpCode.delete({ where: { id: record.id } });

  if (purpose === 'LOGIN') {
    const user = await prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });
    if (!user) {
      return { error: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' };
    }
    const refreshToken = signRefreshToken(user.id);
    const refreshHash = hashToken(refreshToken);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.auditLog.create({
      data: {
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        userId: user.id,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      },
    });
    log.info({ flow: 'verifyOtp', userId: user.id, email: user.email, role: user.role, purpose: 'LOGIN' }, '[FLUJO] verifyOtp: código válido, generando tokens');
    return {
      data: {
        accessToken: signAccessToken(user.id, user.email, user.role),
        refreshToken,
        expiresIn: ACCESS_EXPIRES,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          nombres: user.nombres,
          apellidos: user.apellidos,
        },
      },
    };
  }

  if (purpose === 'EMAIL_VERIFY') {
    const user = await prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });
    }
    log.info({ flow: 'verifyOtp', userId: user?.id, email: user?.email, purpose: 'EMAIL_VERIFY' }, '[FLUJO] verifyOtp: email verificado');
    return { data: { message: 'Correo verificado correctamente.' } };
  }

  log.info({ email, purpose, operation: 'verifyOtp' }, 'Verificación OTP: éxito');
  return { data: { message: 'Código verificado correctamente.' } };
}

export async function refresh(dto: RefreshDto) {
  log.info({ operation: 'refresh' }, 'Refresh token: inicio');
  const tokenHash = hashToken(dto.refreshToken);
  const record = await prisma.refreshToken.findFirst({
    where: { tokenHash },
    include: { user: true },
  });
  if (!record) {
    log.warn({ operation: 'refresh', error: 'INVALID_REFRESH_TOKEN' }, 'Refresh: token inválido o expirado');
    return { error: 'INVALID_REFRESH_TOKEN', message: 'Token inválido o expirado.' };
  }
  if (record.revoked) {
    log.warn({ userId: record.userId, operation: 'refresh', error: 'TOKEN_REVOKED' }, 'Refresh: token revocado');
    return { error: 'TOKEN_REVOKED', message: 'Sesión cerrada.' };
  }
  if (new Date() > record.expiresAt) {
    log.warn({ userId: record.userId, operation: 'refresh', error: 'TOKEN_EXPIRED' }, 'Refresh: token expirado');
    return { error: 'TOKEN_EXPIRED', message: 'Token de refresco expirado.' };
  }

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revoked: true },
  });

  const newRefresh = signRefreshToken(record.userId);
  const newRefreshHash = hashToken(newRefresh);
  await prisma.refreshToken.create({
    data: {
      userId: record.userId,
      tokenHash: newRefreshHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  log.info({ userId: record.userId, email: record.user.email, operation: 'refresh' }, 'Refresh token: éxito');
  return {
    data: {
      accessToken: signAccessToken(record.user.id, record.user.email, record.user.role),
      refreshToken: newRefresh,
      expiresIn: ACCESS_EXPIRES,
    },
  };
}

export async function logout(dto: RefreshDto) {
  log.info({ operation: 'logout' }, 'Logout: inicio');
  const tokenHash = hashToken(dto.refreshToken);
  const record = await prisma.refreshToken.findFirst({ where: { tokenHash } });
  if (record) {
    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { revoked: true },
    });
    log.info({ userId: record.userId, operation: 'logout' }, 'Logout: sesión revocada');
  } else {
    log.debug({ operation: 'logout' }, 'Logout: token no encontrado (ya revocado o inválido)');
  }
  return { data: { message: 'Sesión cerrada correctamente.' } };
}

export async function passwordRecovery(email: string) {
  const emailNorm = email.toLowerCase();
  log.info({ email: emailNorm, operation: 'passwordRecovery' }, 'Recuperación de contraseña: inicio');
  const user = await prisma.user.findFirst({
    where: { email: emailNorm, deletedAt: null },
  });
  if (!user) {
    log.info({ email: emailNorm, operation: 'passwordRecovery' }, 'Recuperación: correo no encontrado (respuesta genérica)');
    return { data: { message: 'Si el correo existe, recibirás un enlace para restablecer la contraseña.' } };
  }

  const rawToken = generateRandomToken(32);
  const tokenHash = hashToken(rawToken);
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRES_MS),
    },
  });

  const resetUrl = `${process.env.APP_URL ?? 'http://localhost:3000'}/api/v1/auth/password-reset?token=${rawToken}`;
  await sendMail({
    to: user.email,
    subject: 'Restablecer contraseña - Flutter My Assets',
    html: `<p>Hola ${user.nombres},</p><p>Haz clic para restablecer tu contraseña:</p><p><a href="${resetUrl}">Restablecer contraseña</a></p><p>El enlace expira en 1 hora. Si no solicitaste esto, ignora el correo.</p>`,
    text: `Restablecer contraseña: ${resetUrl}`,
  });

  log.info({ userId: user.id, email: user.email, operation: 'passwordRecovery' }, 'Recuperación de contraseña: correo enviado');
  return { data: { message: 'Si el correo existe, recibirás un enlace para restablecer la contraseña.' } };
}

export async function passwordReset(dto: PasswordResetDto) {
  log.info({ operation: 'passwordReset' }, 'Restablecer contraseña: inicio');
  const tokenHash = hashToken(dto.token);
  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash },
    include: { user: true },
  });
  if (!record) {
    log.warn({ operation: 'passwordReset', error: 'INVALID_TOKEN' }, 'Restablecer contraseña: token inválido o expirado');
    return { error: 'INVALID_TOKEN', message: 'Enlace inválido o expirado.' };
  }
  if (record.usedAt) {
    log.warn({ userId: record.userId, operation: 'passwordReset', error: 'TOKEN_ALREADY_USED' }, 'Restablecer contraseña: enlace ya usado');
    return { error: 'TOKEN_ALREADY_USED', message: 'Este enlace ya fue utilizado.' };
  }
  if (new Date() > record.expiresAt) {
    log.warn({ userId: record.userId, operation: 'passwordReset', error: 'TOKEN_EXPIRED' }, 'Restablecer contraseña: enlace expirado');
    return { error: 'TOKEN_EXPIRED', message: 'El enlace ha expirado.' };
  }

  const passwordHash = await argon2.hash(dto.newPassword);
  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
  ]);

  log.info({ userId: record.userId, email: record.user.email, operation: 'passwordReset' }, 'Restablecer contraseña: éxito');
  return { data: { message: 'Contraseña actualizada correctamente.' } };
}

/** Perfil del usuario actual (para pantalla Cuenta). Incluye región/comuna por nombre; sin password. */
export async function getMe(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      email: true,
      role: true,
      nombres: true,
      apellidos: true,
      sexo: true,
      fechaNacimiento: true,
      domicilio: true,
      regionId: true,
      comunaId: true,
      avatarUrl: true,
      emailVerifiedAt: true,
      termsAcceptedAt: true,
      createdAt: true,
      region: { select: { id: true, nombre: true } },
      comuna: { select: { id: true, nombre: true } },
    },
  });
  if (!user) return { error: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' };
  const { region, comuna, ...rest } = user;
  return {
    data: {
      ...rest,
      fechaNacimiento: rest.fechaNacimiento.toISOString().slice(0, 10),
      regionName: region?.nombre ?? null,
      comunaName: comuna?.nombre ?? null,
    },
  };
}

/** Actualizar perfil (nombres, apellidos, domicilio, regionId, comunaId, avatarUrl). */
export async function updateProfile(
  userId: string,
  data: {
    nombres?: string;
    apellidos?: string;
    domicilio?: string;
    regionId?: string;
    comunaId?: string;
    avatarUrl?: string;
  }
) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true },
  });
  if (!user) return { error: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' };
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.nombres !== undefined && { nombres: data.nombres.trim() }),
      ...(data.apellidos !== undefined && { apellidos: data.apellidos.trim() }),
      ...(data.domicilio !== undefined && { domicilio: data.domicilio?.trim() || null }),
      ...(data.regionId !== undefined && { regionId: data.regionId?.trim() || null }),
      ...(data.comunaId !== undefined && { comunaId: data.comunaId?.trim() || null }),
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl?.trim() || null }),
    },
  });
  return getMe(userId);
}
