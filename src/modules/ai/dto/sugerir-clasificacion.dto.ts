import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, MinLength, IsInt } from 'class-validator';

/**
 * DTO para solicitar sugerencias de clasificación de gastos
 */
export class SugerirClasificacionDto {
  @ApiProperty({
    description: 'Concepto o descripción del gasto',
    example: 'Carga de combustible para vehículo de visita a cliente',
  })
  @IsString()
  @MinLength(3, { message: 'El concepto debe tener al menos 3 caracteres' })
  concepto: string;

  @ApiProperty({
    description: 'Monto del gasto en moneda local',
    example: 350.0,
  })
  @IsNumber()
  monto: number;

  @ApiPropertyOptional({
    description: 'Nombre del proveedor o emisor',
    example: 'Shell Bolivia',
  })
  @IsString()
  @IsOptional()
  proveedor?: string;

  @ApiPropertyOptional({
    description: 'ID del usuario que solicita la clasificación',
    example: '123',
  })
  @IsString()
  @IsOptional()
  usuarioId?: string;

  @ApiPropertyOptional({
    description: 'ID de la rendición actual (opcional)',
    example: 456,
  })
  @IsInt()
  @IsOptional()
  idRendicion?: number;

  @ApiPropertyOptional({
    description: 'ID del perfil activo (para determinar catálogos disponibles)',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  idPerfil?: number;
}
