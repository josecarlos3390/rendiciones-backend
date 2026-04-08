import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  Length,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para crear una dimensión
 */
export class CrearDimensionDto {
  @ApiProperty({
    description: 'Código numérico de la dimensión (1-5 en SAP B1)',
    example: 1,
    minimum: 1,
    maximum: 99,
  })
  @Type(() => Number)
  @IsInt({ message: 'El código debe ser un número entero' })
  @Min(1, { message: 'El código mínimo es 1' })
  @Max(99, { message: 'El código máximo es 99' })
  code!: number;

  @ApiProperty({
    description: 'Nombre de la dimensión',
    example: 'Departamento',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @Length(1, 100, { message: 'El nombre debe tener entre 1 y 100 caracteres' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada de la dimensión',
    example: 'Dimensión para segmentar por departamentos/áreas',
    maxLength: 250,
  })
  @IsOptional()
  @IsString()
  @Length(0, 250)
  descripcion?: string;

  @ApiPropertyOptional({
    description: 'Indica si la dimensión está activa',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}

/**
 * DTO para actualizar una dimensión
 */
export class ActualizarDimensionDto {
  @ApiPropertyOptional({
    description: 'Nombre de la dimensión',
    example: 'Departamento Actualizado',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'El nombre debe tener entre 1 y 100 caracteres' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada',
    example: 'Descripción actualizada',
    maxLength: 250,
  })
  @IsOptional()
  @IsString()
  @Length(0, 250)
  descripcion?: string;

  @ApiPropertyOptional({
    description: 'Indica si la dimensión está activa',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}

/**
 * DTO de respuesta para una dimensión
 */
export class DimensionResponseDto {
  @ApiProperty({ description: 'Código de la dimensión', example: 1 })
  code!: number;

  @ApiProperty({ description: 'Nombre de la dimensión', example: 'Departamento' })
  name!: string;

  @ApiProperty({ description: 'Descripción', example: 'Dimensión para departamentos' })
  descripcion!: string;

  @ApiProperty({ description: 'Dimensión activa', example: true })
  activa!: boolean;
}
