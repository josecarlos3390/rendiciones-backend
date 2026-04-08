import { IsString, IsNotEmpty, IsOptional, MaxLength, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProvDto {
  @ApiPropertyOptional({
    description: 'Tipo de entidad',
    enum: ['PL', 'PE', 'CL', 'EL'],
    example: 'PL',
  })
  @IsString() @IsOptional() @IsIn(['PL', 'PE', 'CL', 'EL'])
  tipo?: 'PL' | 'PE' | 'CL' | 'EL';

  @ApiProperty({
    description: 'NIT fiscal del proveedor/cliente/empleado',
    maxLength: 255,
    example: '12345678',
  })
  @IsString() @IsNotEmpty() @MaxLength(255)
  nit: string;

  @ApiProperty({
    description: 'Nombre o razón social',
    maxLength: 255,
    example: 'Ferretería El Tornillo S.R.L.',
  })
  @IsString() @IsNotEmpty() @MaxLength(255)
  razonSocial: string;
}