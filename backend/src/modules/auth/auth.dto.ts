import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsUUID,
  IsIn,
  IsBoolean,
  IsDateString,
  Length,
} from 'class-validator';

/** Convierte string vacío en undefined para que @IsOptional/@IsUUID no fallen (registro mínimo Flutter). */
function emptyStringToUndefined({ value }: { value: unknown }) {
  return value === '' ? undefined : value;
}

export class RegisterDto {
  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(100)
  password!: string;

  @IsString()
  @MinLength(2, { message: 'Nombres requeridos' })
  @MaxLength(100)
  nombres!: string;

  @IsString()
  @MinLength(2, { message: 'Apellidos requeridos' })
  @MaxLength(100)
  apellidos!: string;

  @IsIn(['HOMBRE', 'MUJER', 'OTRO'], { message: 'Sexo debe ser HOMBRE, MUJER u OTRO' })
  sexo!: string;

  @IsDateString({}, { message: 'Fecha de nacimiento inválida (ISO 8601)' })
  fechaNacimiento!: string;

  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  domicilio?: string;

  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsUUID(undefined, { message: 'regionId debe ser un UUID válido cuando se envía' })
  regionId?: string;

  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsUUID(undefined, { message: 'comunaId debe ser un UUID válido cuando se envía' })
  comunaId?: string;

  @IsBoolean()
  acceptTerms!: boolean;
}

export class VerifyEmailDto {
  @IsString()
  @MinLength(1, { message: 'Token requerido' })
  token!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Contraseña requerida cuando se envía' })
  password?: string;
}

/** Solo email: para solicitar envío de OTP por correo (Flutter puede usar este o POST /login sin password). */
export class SendLoginOtpDto {
  @IsEmail()
  email!: string;
}

export class VerifyOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6, { message: 'El código OTP debe tener 6 dígitos' })
  code!: string;

  @IsOptional()
  @IsIn(['LOGIN', 'EMAIL_VERIFY', 'PASSWORD_RESET'])
  purpose?: string;
}

export class RefreshDto {
  @IsString()
  @MinLength(1, { message: 'Refresh token requerido' })
  refreshToken!: string;
}

export class LogoutDto {
  @IsString()
  @MinLength(1, { message: 'Refresh token requerido' })
  refreshToken!: string;
}

export class PasswordRecoveryDto {
  @IsEmail()
  email!: string;
}

export class PasswordResetDto {
  @IsString()
  @MinLength(1, { message: 'Token requerido' })
  token!: string;

  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  @MaxLength(100)
  newPassword!: string;
}

/** Actualización de perfil (GET /me devuelve; PATCH /me actualiza). */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombres?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  apellidos?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  domicilio?: string;

  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsUUID()
  regionId?: string;

  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsUUID()
  comunaId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;
}

/** Solicitar cambio de correo (envía token al nuevo email). */
export class RequestEmailChangeDto {
  @IsEmail({}, { message: 'Nuevo correo inválido' })
  newEmail!: string;
}

/** Verificar nuevo correo (mismo formato que verify-email). */
export class VerifyNewEmailDto {
  @IsString()
  @MinLength(1, { message: 'Token requerido' })
  token!: string;
}
