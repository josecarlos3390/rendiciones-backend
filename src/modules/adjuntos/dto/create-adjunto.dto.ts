import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * DTO para crear un registro de adjunto
 * El archivo se recibe por multipart/form-data
 */
export class CreateAdjuntoDto {
  @ApiPropertyOptional({
    description: 'Descripción opcional del archivo',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}

/**
 * DTO de respuesta con información del adjunto creado
 */
export class AdjuntoResponseDto {
  @ApiProperty({ description: 'ID del adjunto' })
  id!: number;

  @ApiProperty({ description: 'ID de la rendición' })
  idRendicion!: number;

  @ApiProperty({ description: 'ID de la línea de detalle' })
  idRD!: number;

  @ApiProperty({ description: 'Nombre original del archivo' })
  nombre!: string;

  @ApiProperty({ description: 'Tipo MIME del archivo' })
  tipo!: string;

  @ApiProperty({ description: 'Tamaño en bytes' })
  tamano!: number;

  @ApiProperty({ description: 'Descripción' })
  descripcion?: string;

  @ApiProperty({ description: 'Fecha de creación' })
  fecha!: Date;
}
