import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsIn, IsInt } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * DTO para filtrar normas en consultas
 */
export class NormaFiltroDto {
  @ApiPropertyOptional({
    description: 'Filtrar por código de factor (búsqueda parcial)',
    example: 'ADM',
  })
  @IsOptional()
  @IsString()
  factorCode?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por descripción (búsqueda parcial)',
    example: 'Administración',
  })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por código de dimensión',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  dimension?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por estado activo',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  activa?: boolean;

  @ApiPropertyOptional({
    description: 'Ordenar por campo',
    example: 'factorCode',
    enum: ['factorCode', 'descripcion', 'dimension', 'activa'],
    default: 'factorCode',
  })
  @IsOptional()
  @IsIn(['factorCode', 'descripcion', 'dimension', 'activa'])
  sortBy?: string = 'factorCode';

  @ApiPropertyOptional({
    description: 'Dirección del ordenamiento',
    example: 'asc',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}
