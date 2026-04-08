import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsIn, IsInt } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * DTO para filtrar dimensiones en consultas
 */
export class DimensionFiltroDto {
  @ApiPropertyOptional({
    description: 'Filtrar por código exacto',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  code?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por nombre (búsqueda parcial)',
    example: 'Departamento',
  })
  @IsOptional()
  @IsString()
  name?: string;

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
    example: 'code',
    enum: ['code', 'name', 'activa'],
    default: 'code',
  })
  @IsOptional()
  @IsIn(['code', 'name', 'activa'])
  sortBy?: string = 'code';

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
