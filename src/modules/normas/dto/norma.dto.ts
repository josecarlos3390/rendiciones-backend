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
 * DTO para crear una norma de reparto
 */
export class CrearNormaDto {
  @ApiProperty({
    description: 'Código del factor de distribución (ej: ADM, VTA, PROD)',
    example: 'ADM',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'El código del factor es obligatorio' })
  @Length(1, 50, { message: 'El código debe tener entre 1 y 50 caracteres' })
  factorCode!: string;

  @ApiProperty({
    description: 'Descripción de la norma',
    example: 'Distribución Administración',
    maxLength: 250,
  })
  @IsString()
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @Length(1, 250, { message: 'La descripción debe tener entre 1 y 250 caracteres' })
  descripcion!: string;

  @ApiProperty({
    description: 'Código de la dimensión asociada (1-5 en SAP B1)',
    example: 1,
    minimum: 1,
    maximum: 99,
  })
  @Type(() => Number)
  @IsInt({ message: 'La dimensión debe ser un número entero' })
  @Min(1, { message: 'La dimensión mínima es 1' })
  @Max(99, { message: 'La dimensión máxima es 99' })
  dimension!: number;

  @ApiPropertyOptional({
    description: 'Indica si la norma está activa',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}

/**
 * DTO para actualizar una norma
 */
export class ActualizarNormaDto {
  @ApiPropertyOptional({
    description: 'Descripción de la norma',
    example: 'Distribución Administración Actualizada',
    maxLength: 250,
  })
  @IsOptional()
  @IsString()
  @Length(1, 250, { message: 'La descripción debe tener entre 1 y 250 caracteres' })
  descripcion?: string;

  @ApiPropertyOptional({
    description: 'Código de la dimensión asociada',
    example: 1,
    minimum: 1,
    maximum: 99,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  dimension?: number;

  @ApiPropertyOptional({
    description: 'Indica si la norma está activa',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}

/**
 * DTO de respuesta para una norma
 */
export class NormaResponseDto {
  @ApiProperty({ description: 'Código del factor', example: 'ADM' })
  factorCode!: string;

  @ApiProperty({ description: 'Descripción', example: 'Distribución Administración' })
  descripcion!: string;

  @ApiProperty({ description: 'Código de dimensión', example: 1 })
  dimension!: number;

  @ApiProperty({ description: 'Norma activa', example: true })
  activa!: boolean;
}

/**
 * DTO de respuesta con información de dimensión
 */
export class NormaConDimensionResponseDto extends NormaResponseDto {
  @ApiProperty({ description: 'Nombre de la dimensión', example: 'Departamento' })
  dimensionName!: string;
}
