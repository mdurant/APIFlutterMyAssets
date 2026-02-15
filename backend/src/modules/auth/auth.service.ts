import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '../../config';
import { sendMail } from '../../common/mailer';
import { hashToken, generateRandomToken, generateOtp } from '../../common/utils/hash';
import type {
  RegisterDto,
  LoginDto,
  VerifyOtpDto,
  RefreshDto,
  PasswordResetDto,
} from './auth.dto';

const prisma = new PrismaClient();

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
  const existing = await prisma.user.findFirst({
    where: { email: dto.email.toLowerCase(), deletedAt: null },
  });
  if (existing) {
    return { error: 'EMAIL_IN_USE', message: 'El correo ya está registrado.' };
  }
  if (!dto.acceptTerms) {
    return { error: 'TERMS_REQUIRED', message: 'Debe aceptar los términos y condiciones.' };
  }

  const passwordHash = await argon2.hash(dto.password);
  const user = await prisma.user.create({
    data: {
      email: dto.email.toLowerCase(),
      passwordHash,
      nombres: dto.nombres,
      apellidos: dto.apellidos,
      sexo: dto.sexo,
      fechaNacimiento: new Date(dto.fechaNacimiento),
      domicilio: dto.domicilio ?? null,
      regionId: dto.regionId ?? null,
      comunaId: dto.comunaId ?? null,
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

  return {
    data: {
      userId: user.id,
      email: user.email,
      message: 'Registro exitoso. Revisa tu correo para verificar tu cuenta.',
    },
  };
}

export async function verifyEmail(token: string) {
  const tokenHash = hashToken(token);
  const record = await prisma.emailVerificationToken.findFirst({
    where: { tokenHash },
    include: { user: true },
  });
  if (!record) {
    return { error: 'INVALID_TOKEN', message: 'Token de verificación inválido.' };
  }
  if (record.usedAt) {
    return { error: 'TOKEN_ALREADY_USED', message: 'Este enlace ya fue utilizado.' };
  }
  if (new Date() > record.expiresAt) {
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

  return {
    data: { message: 'Correo verificado correctamente.' },
  };
}

export async function login(dto: LoginDto, ip?: string, userAgent?: string) {
  if (!dto.password) {
    return sendLoginOtp(dto.email);
  }
  const user = await prisma.user.findFirst({
    where: { email: dto.email.toLowerCase(), deletedAt: null },
  });
  if (!user) {
    return { error: 'INVALID_CREDENTIALS', message: 'Correo o contraseña incorrectos.' };
  }
  const valid = await argon2.verify(user.passwordHash, dto.password);
  if (!valid) {
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
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null },
  });
  if (!user) {
    return { error: 'USER_NOT_FOUND', message: 'No existe una cuenta con ese correo.' };
  }

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

  await sendMail({
    to: user.email,
    subject: 'Código de acceso - Flutter My Assets',
    html: `<p>Hola ${user.nombres},</p><p>Tu código de acceso es: <strong>${code}</strong></p><p>Válido por 10 minutos. No lo compartas.</p>`,
    text: `Tu código de acceso es: ${code}. Válido por 10 minutos.`,
  });

  return { data: { message: 'Código enviado al correo.' } };
}

export async function verifyOtp(dto: VerifyOtpDto, ip?: string, userAgent?: string) {
  const purpose = dto.purpose ?? 'LOGIN';
  const record = await prisma.otpCode.findFirst({
    where: { email: dto.email.toLowerCase(), purpose },
    orderBy: { createdAt: 'desc' },
  });
  if (!record) {
    return { error: 'INVALID_OTP', message: 'Código incorrecto o expirado.' };
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    return { error: 'OTP_MAX_ATTEMPTS', message: 'Demasiados intentos. Solicita un nuevo código.' };
  }
  if (new Date() > record.expiresAt) {
    return { error: 'OTP_EXPIRED', message: 'El código ha expirado.' };
  }

  const codeHash = hashToken(dto.code);
  if (codeHash !== record.codeHash) {
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { attempts: record.attempts + 1 },
    });
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
    return { data: { message: 'Correo verificado correctamente.' } };
  }

  return { data: { message: 'Código verificado correctamente.' } };
}

export async function refresh(dto: RefreshDto) {
  const tokenHash = hashToken(dto.refreshToken);
  const record = await prisma.refreshToken.findFirst({
    where: { tokenHash },
    include: { user: true },
  });
  if (!record) {
    return { error: 'INVALID_REFRESH_TOKEN', message: 'Token inválido o expirado.' };
  }
  if (record.revoked) {
    return { error: 'TOKEN_REVOKED', message: 'Sesión cerrada.' };
  }
  if (new Date() > record.expiresAt) {
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

  return {
    data: {
      accessToken: signAccessToken(record.user.id, record.user.email, record.user.role),
      refreshToken: newRefresh,
      expiresIn: ACCESS_EXPIRES,
    },
  };
}

export async function logout(dto: RefreshDto) {
  const tokenHash = hashToken(dto.refreshToken);
  const record = await prisma.refreshToken.findFirst({ where: { tokenHash } });
  if (record) {
    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { revoked: true },
    });
  }
  return { data: { message: 'Sesión cerrada correctamente.' } };
}

export async function passwordRecovery(email: string) {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null },
  });
  if (!user) {
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

  return { data: { message: 'Si el correo existe, recibirás un enlace para restablecer la contraseña.' } };
}

export async function passwordReset(dto: PasswordResetDto) {
  const tokenHash = hashToken(dto.token);
  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash },
    include: { user: true },
  });
  if (!record) {
    return { error: 'INVALID_TOKEN', message: 'Enlace inválido o expirado.' };
  }
  if (record.usedAt) {
    return { error: 'TOKEN_ALREADY_USED', message: 'Este enlace ya fue utilizado.' };
  }
  if (new Date() > record.expiresAt) {
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

  return { data: { message: 'Contraseña actualizada correctamente.' } };
}
