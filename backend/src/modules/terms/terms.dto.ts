import { IsUUID, IsOptional, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class AcceptTermsDto {
  @IsOptional()
  @IsUUID()
  @Transform(({ value }) => (value === '' ? undefined : value))
  termId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'version debe tener al menos 1 carácter' })
  @Transform(({ value }) => (value === '' ? undefined : value))
  version?: string;
}
