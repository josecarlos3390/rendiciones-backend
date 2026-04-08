import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  Length,
} from 'class-validator';

/**
 * DTO para crear un proyecto
 */
export class CrearProyectoDto {
  @ApiProperty({
    description: 'Código del proyecto',
    example: 'PRY001',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'El código es obligatorio' })
  @Length(1, 50, { message: 'El código debe tener entre 1 y 50 caracteres' })
  code!: string;

  @ApiProperty({
    description: 'Nombre del proyecto',
    example: 'Proyecto de Implementación SAP',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @Length(1, 100, { message: 'El nombre debe tener entre 1 y 100 caracteres' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Indica si el proyecto está activo',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

/**
 * DTO para actualizar un proyecto
 */
export class ActualizarProyectoDto {
  @ApiPropertyOptional({
    description: 'Nombre del proyecto',
    example: 'Proyecto de Implementación SAP Actualizado',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'El nombre debe tener entre 1 y 100 caracteres' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Indica si el proyecto está activo',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

/**
 * DTO de respuesta para un proyecto
 */
export class ProyectoResponseDto {
  @ApiProperty({ description: 'Código del proyecto', example: 'PRY001' })
  code!: string;

  @ApiProperty({
    description: 'Nombre del proyecto',
    example: 'Proyecto de Implementación SAP',
  })
  name!: string;

  @ApiProperty({ description: 'Indica si el proyecto está activo', example: true })
  activo!: boolean;
}
