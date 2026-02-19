import { IsUUID, IsString, IsOptional, IsIn } from 'class-validator';

export class CreateConversationDto {
  @IsUUID()
  propertyId!: string;
}

export class SendMessageDto {
  @IsString()
  body!: string;

  @IsOptional()
  @IsIn(['text', 'image'])
  type?: string;
}
