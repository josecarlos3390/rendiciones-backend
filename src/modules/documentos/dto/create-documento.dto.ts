import {
  IsInt, IsString, IsNotEmpty, IsOptional,
  IsIn, MaxLength, Min, IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateDocumentoDto {
  @ApiProperty()
  @IsInt() @Min(1) @Type(() => Number)
  codPerfil: number;

  @ApiProperty({ description: 'Nombre del tipo documento (Factura, Rec. Alquiler…)', maxLength: 25 })
  @IsString() @IsNotEmpty() @MaxLength(25)
  tipDoc: string;

  @ApiProperty({ description: 'ID Tipo Doc SAP (ej: 1=COMPRA, 4=…)' })
  @IsInt() @Type(() => Number)
  idTipoDoc: number;

  @ApiProperty({ description: 'Tipo de Cálculo: 1=Grossing Up, 0=Grossing Down' })
  @IsString() @IsIn(['1', '0'])
  tipoCalc: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional() @IsNumber() @Type(() => Number)
  ivaPercent?: number;

  @ApiPropertyOptional({ maxLength: 25 })
  @IsOptional() @IsString() @MaxLength(25)
  ivaCuenta?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional() @IsNumber() @Type(() => Number)
  itPercent?: number;

  @ApiPropertyOptional({ maxLength: 25 })
  @IsOptional() @IsString() @MaxLength(25)
  itCuenta?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional() @IsNumber() @Type(() => Number)
  iuePercent?: number;

  @ApiPropertyOptional({ maxLength: 25 })
  @IsOptional() @IsString() @MaxLength(25)
  iueCuenta?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional() @IsNumber() @Type(() => Number)
  rcivaPercent?: number;

  @ApiPropertyOptional({ maxLength: 25 })
  @IsOptional() @IsString() @MaxLength(25)
  rcivaCuenta?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional() @IsNumber() @Type(() => Number)
  exentoPercent?: number;

  @ApiPropertyOptional({ maxLength: 25 })
  @IsOptional() @IsString() @MaxLength(25)
  ctaExento?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional() @IsNumber() @Type(() => Number)
  tasa?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional() @IsNumber() @Type(() => Number)
  ice?: number;
}