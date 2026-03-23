import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SyncRendicionDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nroDocERP?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  mensaje?: string;
}