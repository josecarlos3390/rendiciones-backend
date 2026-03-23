import { IsString, MaxLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRendCmpDto {
  @ApiProperty({ description: 'Nombre legible del campo (ej: Número de Factura)' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  descripcion: string;

  @ApiProperty({ description: 'Nombre del campo en SAP B1 (ej: DocNum, U_CUF)' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  campo: string;
}