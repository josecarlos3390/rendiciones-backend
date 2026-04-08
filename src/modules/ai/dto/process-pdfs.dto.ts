import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsString, IsUUID } from 'class-validator';

export class ProcessPdfsDto {
  @ApiProperty({ description: 'IDs de archivos a procesar', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  fileIds: string[];

  @ApiProperty({ description: 'ID de la rendición' })
  @IsNumber()
  idRendicion: number;

  @ApiProperty({ description: 'ID del usuario' })
  @IsString()
  idUsuario: string;
}

export class ConfirmBatchDto {
  @ApiProperty({ description: 'IDs de resultados a confirmar', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  resultIds: string[];

  @ApiProperty({ description: 'ID de la rendición' })
  @IsNumber()
  idRendicion: number;

  @ApiProperty({ description: 'ID del usuario' })
  @IsString()
  idUsuario: string;
}
