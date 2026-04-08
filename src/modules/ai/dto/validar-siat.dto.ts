import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

/**
 * DTO para validar una factura contra el SIAT
 */
export class ValidarSiatDto {
  @ApiProperty({
    description: 'CUF (Código Único de Factura) de la factura',
    example: 'A1B2C3D4E5F6789012345678901234567890',
  })
  @IsString()
  cuf: string;

  @ApiPropertyOptional({
    description: 'Datos extraídos del PDF para comparar',
    example: {
      nit: '123456789',
      numeroFactura: '001-001-0001234',
      fecha: '2026-04-05',
      monto: 1250.5,
    },
  })
  @IsObject()
  @IsOptional()
  datosPdf?: {
    nit?: string;
    numeroFactura?: string;
    fecha?: string;
    monto?: number;
  };

  @ApiPropertyOptional({
    description: 'URL del QR de la factura (alternativa al CUF)',
    example: 'https://siat.impuestos.gob.bo/consulta/QR?nit=123456789&cuf=A1B2...',
  })
  @IsString()
  @IsOptional()
  urlQr?: string;
}
