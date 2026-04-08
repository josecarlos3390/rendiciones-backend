import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  Length,
} from 'class-validator';

/**
 * DTO para crear una cuenta contable
 */
export class CrearCuentaDto {
  @ApiProperty({
    description: 'Código de la cuenta contable (ej: 110101, 42010001)',
    example: '110101',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'El código es obligatorio' })
  @Length(1, 50, { message: 'El código debe tener entre 1 y 50 caracteres' })
  code!: string;

  @ApiProperty({
    description: 'Nombre/descripción de la cuenta',
    example: 'Caja General',
    maxLength: 250,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @Length(1, 250, { message: 'El nombre debe tener entre 1 y 250 caracteres' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Código de formato para impresión',
    example: '110101',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  formatCode?: string;

  @ApiPropertyOptional({
    description: 'Indica si es cuenta asociada/título (no permite movimientos)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  asociada?: boolean;

  @ApiPropertyOptional({
    description: 'Indica si la cuenta está activa',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}

/**
 * DTO para actualizar una cuenta contable
 */
export class ActualizarCuentaDto {
  @ApiPropertyOptional({
    description: 'Nombre/descripción de la cuenta',
    example: 'Caja General Actualizada',
    maxLength: 250,
  })
  @IsOptional()
  @IsString()
  @Length(1, 250, { message: 'El nombre debe tener entre 1 y 250 caracteres' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Código de formato para impresión',
    example: '110101',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  formatCode?: string;

  @ApiPropertyOptional({
    description: 'Indica si es cuenta asociada/título',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  asociada?: boolean;

  @ApiPropertyOptional({
    description: 'Indica si la cuenta está activa',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}

/**
 * DTO de respuesta para una cuenta
 */
export class CuentaResponseDto {
  @ApiProperty({ description: 'Código de la cuenta', example: '110101' })
  code!: string;

  @ApiProperty({ description: 'Nombre de la cuenta', example: 'Caja General' })
  name!: string;

  @ApiProperty({ description: 'Código de formato', example: '110101' })
  formatCode!: string;

  @ApiProperty({ description: 'Es cuenta asociada/título', example: false })
  asociada!: boolean;

  @ApiProperty({ description: 'Cuenta activa', example: true })
  activa!: boolean;
}
