import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRendicionDto {
  @ApiProperty({ description: 'Descripcion de la rendicion', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  descripcion: string;

  @ApiProperty({ description: 'Monto total', example: 1500.00 })
  @IsNumber()
  monto: number;

  @ApiProperty({ description: 'Fecha de la rendicion', example: '2026-03-11' })
  @IsDateString()
  fecha: string;

  @ApiPropertyOptional({ description: 'Observaciones adicionales' })
  @IsString()
  @IsOptional()
  observaciones?: string;
}
