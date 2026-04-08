import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO para filtrar proyectos en consultas
 */
export class ProyectoFiltroDto {
  @ApiPropertyOptional({
    description: 'Filtrar por código (búsqueda parcial)',
    example: 'PRY',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por nombre (búsqueda parcial)',
    example: 'Implementación',
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
  activo?: boolean;

  @ApiPropertyOptional({
    description: 'Ordenar por campo',
    example: 'code',
    enum: ['code', 'name', 'activo'],
    default: 'code',
  })
  @IsOptional()
  @IsIn(['code', 'name', 'activo'])
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
