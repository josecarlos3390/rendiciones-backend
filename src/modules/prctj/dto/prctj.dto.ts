import { Type } from 'class-transformer';
import {
  IsInt, IsNumber, IsString, IsOptional,
  Min, Max, MaxLength, ArrayMinSize, ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PrctjLineaDto {
  @ApiProperty({ description: 'Número de línea (1, 2, 3...)' })
  @IsInt() @Min(1) @Type(() => Number)
  linea: number;

  @ApiProperty({ description: 'Porcentaje asignado a esta línea (0-100)' })
  @IsNumber() @Min(0) @Max(100) @Type(() => Number)
  porcentaje: number;

  @ApiProperty({ description: 'Cuenta contable para esta porción' })
  @IsString() @MaxLength(25)
  cuenta: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(250)
  nomCuenta?: string;

  @ApiPropertyOptional({ description: 'Dimensión 1 (centro de costo)' })
  @IsOptional() @IsString() @MaxLength(100)
  n1?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100)
  n2?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100)
  n3?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100)
  n4?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100)
  n5?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(100)
  proyecto?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(50)
  auxiliar1?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(50)
  auxiliar2?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(50)
  auxiliar3?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(50)
  auxiliar4?: string;
}

/**
 * Guarda la distribución completa de una línea REND_D.
 * Se reemplaza todo — se borran las anteriores y se insertan las nuevas.
 * Los porcentajes deben sumar exactamente 100.
 */
export class SavePrctjDto {
  @ApiProperty({ type: [PrctjLineaDto] })
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => PrctjLineaDto)
  lineas: PrctjLineaDto[];
}