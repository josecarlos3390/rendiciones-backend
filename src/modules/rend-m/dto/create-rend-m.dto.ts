import {
  IsString, IsNotEmpty, IsNumber, IsOptional,
  IsDateString, MaxLength, Min, IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateRendMDto {
  @ApiProperty({ description: 'Código del perfil de rendición', example: 1 })
  @IsNumber()
  @Type(() => Number)
  idPerfil: number;

  @ApiProperty({ description: 'Código de cuenta contable', example: 'CA-11105003', maxLength: 25 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(25)
  cuenta: string;

  @ApiProperty({ description: 'Nombre de la cuenta contable', maxLength: 250 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  nombreCuenta: string;

  @ApiProperty({ description: 'Indica si la cuenta está asociada a empleado: Y = asociada, N = no asociada', example: 'Y' })
  @IsString()
  @IsIn(['Y', 'N'])
  cuentaAsociada: string;

  @ApiPropertyOptional({ description: 'Código del empleado — requerido si cuentaAsociada = Y', example: 'EL00005', maxLength: 25 })
  @IsString()
  @IsOptional()
  @MaxLength(25)
  empleado?: string;

  @ApiPropertyOptional({ description: 'Nombre del empleado — requerido si cuentaAsociada = Y', maxLength: 250 })
  @IsString()
  @IsOptional()
  @MaxLength(250)
  nombreEmpleado?: string;

  @ApiProperty({ description: 'Objetivo / descripción de la rendición', maxLength: 250 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  objetivo: string;

  @ApiProperty({ description: 'Fecha de inicio del período', example: '2024-09-07' })
  @IsDateString()
  fechaIni: string;

  @ApiProperty({ description: 'Fecha final del período', example: '2024-09-21' })
  @IsDateString()
  fechaFinal: string;

  @ApiProperty({ description: 'Monto recepcionado', example: 1500.00 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monto: number;

  @ApiPropertyOptional({ description: 'Documento preliminar asociado', maxLength: 25 })
  @IsString()
  @IsOptional()
  @MaxLength(25)
  preliminar?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  auxiliar1?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  auxiliar2?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  auxiliar3?: string;
}