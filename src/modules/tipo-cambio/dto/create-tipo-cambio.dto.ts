import { IsString, IsNumber, IsOptional, Length, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para crear un tipo de cambio (API - sin prefijo U_)
 */
export class CreateTipoCambioDto {
  @ApiProperty({ description: 'Fecha del tipo de cambio (YYYY-MM-DD)', example: '2026-01-01' })
  @IsString()
  @Length(10, 10)
  fecha: string;

  @ApiProperty({ description: 'Código de moneda', example: 'USD' })
  @IsString()
  @Length(3, 10)
  moneda: string;

  @ApiProperty({ description: 'Tasa de cambio (BOB por 1 unidad de moneda)', example: 6.96 })
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  tasa: number;

  @ApiPropertyOptional({ description: 'Activo (Y/N)', default: 'Y' })
  @IsOptional()
  @IsString()
  @Length(1, 1)
  activo?: string;
}

/**
 * DTO para actualizar un tipo de cambio (API - sin prefijo U_)
 */
export class UpdateTipoCambioDto {
  @ApiPropertyOptional({ description: 'Fecha del tipo de cambio (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  @Length(10, 10)
  fecha?: string;

  @ApiPropertyOptional({ description: 'Código de moneda' })
  @IsOptional()
  @IsString()
  @Length(3, 10)
  moneda?: string;

  @ApiPropertyOptional({ description: 'Tasa de cambio' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  tasa?: number;

  @ApiPropertyOptional({ description: 'Activo (Y/N)' })
  @IsOptional()
  @IsString()
  @Length(1, 1)
  activo?: string;
}
