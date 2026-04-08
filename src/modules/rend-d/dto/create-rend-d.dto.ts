import {
  IsString, IsNotEmpty, IsNumber, IsOptional,
  IsDateString, MaxLength, Min, IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateRendDDto {

  // ── Campos de cuenta ─────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Código de cuenta contable', maxLength: 25 })
  @IsString() @IsOptional() @MaxLength(25)
  cuenta?: string;

  @ApiPropertyOptional({ description: 'Nombre de la cuenta contable', maxLength: 250 })
  @IsString() @IsOptional() @MaxLength(250)
  nombreCuenta?: string;

  // ── Documento ────────────────────────────────────────────────

  @ApiProperty({ description: 'Concepto / descripción del documento', maxLength: 200 })
  @IsString() @IsNotEmpty() @MaxLength(200)
  concepto: string;

  @ApiProperty({ description: 'Fecha del documento', example: '2024-09-07' })
  @IsDateString()
  fecha: string;

  @ApiProperty({ description: 'ID del tipo de documento', example: 1 })
  @IsInt() @Type(() => Number)
  idTipoDoc: number;

  @ApiProperty({ description: 'ID del documento (REND_CTA)', example: 1 })
  @IsInt() @Type(() => Number)
  tipoDoc: number;

  @ApiPropertyOptional({ description: 'Nombre del tipo de documento', example: 'FACTURA', maxLength: 50 })
  @IsString() @IsOptional() @MaxLength(50)
  tipoDocName?: string;

  @ApiPropertyOptional({ description: 'ID del documento (referencia externa)', example: null })
  @IsInt() @IsOptional() @Type(() => Number)
  idDoc?: number;

  @ApiPropertyOptional({ description: 'Número de documento', maxLength: 20 })
  @IsString() @IsOptional() @MaxLength(20)
  numDocumento?: string;

  @ApiPropertyOptional({ description: 'Número de autorización', maxLength: 250 })
  @IsString() @IsOptional() @MaxLength(250)
  nroAutor?: string;

  @ApiPropertyOptional({ description: 'Código de control', maxLength: 25 })
  @IsString() @IsOptional() @MaxLength(25)
  ctrl?: string;

  @ApiPropertyOptional({ description: 'CUF de factura electrónica', maxLength: 250 })
  @IsString() @IsOptional() @MaxLength(250)
  cuf?: string;

  // ── Montos ───────────────────────────────────────────────────

  @ApiProperty({ description: 'Importe del documento', example: 800.00 })
  @IsNumber() @Min(0) @Type(() => Number)
  importe: number;

  @ApiProperty({ description: 'Descuento aplicado', example: 0 })
  @IsNumber() @Min(0) @Type(() => Number)
  descuento: number;

  @ApiPropertyOptional({ description: 'Tasa cero', example: 0 })
  @IsNumber() @IsOptional() @Type(() => Number)
  tasaCero?: number;

  @ApiPropertyOptional({ description: 'Monto exento de impuesto', example: 0 })
  @IsNumber() @IsOptional() @Type(() => Number)
  exento?: number;

  @ApiPropertyOptional({ description: 'Importe retenido', example: 0 })
  @IsNumber() @IsOptional() @Type(() => Number)
  impRet?: number;

  @ApiPropertyOptional({ description: 'Total calculado', example: 919.54 })
  @IsNumber() @IsOptional() @Type(() => Number)
  total?: number;

  @ApiPropertyOptional({ description: 'Importe en bolivianos', example: 0 })
  @IsNumber() @IsOptional() @Type(() => Number)
  importeBs?: number;

  @ApiPropertyOptional({ description: 'Exento en bolivianos', example: 0 })
  @IsNumber() @IsOptional() @Type(() => Number)
  exentoBs?: number;

  @ApiPropertyOptional({ description: 'Descuento en bolivianos', example: 0 })
  @IsNumber() @IsOptional() @Type(() => Number)
  desctoBs?: number;

  @ApiPropertyOptional({ description: 'Tasa de cambio', example: 1 })
  @IsNumber() @IsOptional() @Type(() => Number)
  tasa?: number;

  @ApiPropertyOptional({ description: 'Gift card', example: 0 })
  @IsNumber() @IsOptional() @Type(() => Number)
  giftCard?: number;

  // ── Impuestos ────────────────────────────────────────────────

  @ApiProperty({ description: 'Monto IVA', example: 119.54 })
  @IsNumber() @Min(0) @Type(() => Number)
  montoIVA: number;

  @ApiProperty({ description: 'Monto IT', example: 0 })
  @IsNumber() @Min(0) @Type(() => Number)
  montoIT: number;

  @ApiProperty({ description: 'Monto IUE', example: 0 })
  @IsNumber() @Min(0) @Type(() => Number)
  montoIUE: number;

  @ApiProperty({ description: 'Monto RC-IVA', example: 0 })
  @IsNumber() @Min(0) @Type(() => Number)
  montoRCIVA: number;

  @ApiProperty({ description: 'ICE', example: 0 })
  @IsNumber() @Min(0) @Type(() => Number)
  ice: number;

  // ── Cuentas de impuesto ──────────────────────────────────────

  @ApiPropertyOptional({ maxLength: 50 })
  @IsString() @IsOptional() @MaxLength(50)
  cuentaIVA?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsString() @IsOptional() @MaxLength(50)
  cuentaIT?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsString() @IsOptional() @MaxLength(50)
  cuentaIUE?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsString() @IsOptional() @MaxLength(50)
  cuentaRCIVA?: string;

  @ApiPropertyOptional({ description: 'Cuenta de exento', maxLength: 25 })
  @IsString() @IsOptional() @MaxLength(25)
  ctaExento?: string;

  // ── Proveedor ────────────────────────────────────────────────

  @ApiProperty({ description: 'NIT del proveedor', maxLength: 50 })
  @IsString() @IsNotEmpty() @MaxLength(50)
  nit: string;

  @ApiPropertyOptional({ description: 'Código de proveedor', maxLength: 25 })
  @IsString() @IsOptional() @MaxLength(25)
  codProv?: string;

  @ApiPropertyOptional({ description: 'Nombre del proveedor', maxLength: 200 })
  @IsString() @IsOptional() @MaxLength(200)
  prov?: string;

  // ── Normas de reparto ────────────────────────────────────────

  @ApiPropertyOptional({ maxLength: 100 })
  @IsString() @IsOptional() @MaxLength(100)
  n1?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsString() @IsOptional() @MaxLength(100)
  n2?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsString() @IsOptional() @MaxLength(100)
  n3?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsString() @IsOptional() @MaxLength(100)
  n4?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsString() @IsOptional() @MaxLength(100)
  n5?: string;

  // ── Otros ────────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Proyecto', maxLength: 100 })
  @IsString() @IsOptional() @MaxLength(100)
  proyecto?: string;

  @ApiPropertyOptional({ description: 'Partida', maxLength: 50 })
  @IsString() @IsOptional() @MaxLength(50)
  partida?: string;

  @ApiPropertyOptional({ description: 'Número de OT', maxLength: 250 })
  @IsString() @IsOptional() @MaxLength(250)
  nroOT?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsString() @IsOptional() @MaxLength(50)
  auxiliar1?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsString() @IsOptional() @MaxLength(50)
  auxiliar2?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsString() @IsOptional() @MaxLength(50)
  auxiliar3?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsString() @IsOptional() @MaxLength(50)
  auxiliar4?: string;
}