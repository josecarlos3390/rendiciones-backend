import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * DTO para solicitar análisis de una rendición
 */
export class AnalisisRendicionDto {
  @ApiProperty({
    description: 'ID de la rendición a analizar',
    example: 123,
  })
  @IsNumber()
  idRendicion: number;

  @ApiPropertyOptional({
    description: 'ID del usuario solicitante (para análisis de historial)',
    example: '456',
  })
  @IsString()
  @IsOptional()
  usuarioId?: string;

  @ApiPropertyOptional({
    description: 'ID del perfil activo',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  idPerfil?: number;
}
