import { IsUUID, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  propertyId!: string;

  @IsDateString()
  dateFrom!: string;

  @IsDateString()
  dateTo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
