import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO para filtrar cuentas en consultas
 */
export class CoaFiltroDto {
  @ApiPropertyOptional({
    description: 'Filtrar por código (búsqueda parcial)',
    example: '1101',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por nombre (búsqueda parcial)',
    example: 'Caja',
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
