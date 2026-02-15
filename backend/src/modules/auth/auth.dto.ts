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

  @IsOptional()
  @IsString()
  @MaxLength(300)
  domicilio?: string;

  @IsOptional()
  @IsUUID()
  regionId?: string;

  @IsOptional()
  @IsUUID()
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

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Contraseña requerida' })
  password?: string;
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
