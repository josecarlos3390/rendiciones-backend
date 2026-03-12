import {
  IsString, IsNotEmpty, IsNumber, IsOptional,
  MaxLength, IsIn, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePerfilDto {
  @ApiProperty({ description: 'Nombre del perfil', maxLength: 300 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  nombrePerfil: string;

  @ApiPropertyOptional({ description: 'Moneda: 0=BS, 1=USD', example: '0' })
  @IsOptional()
  @IsString()
  @MaxLength(1)
  trabaja?: string;

  @ApiPropertyOptional({ description: 'Permitir cuenta vacía: 0=NO, 1=SI', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  perCtaBl?: number;

  @ApiPropertyOptional({ description: 'Característica proveedores: TODOS, EMPIEZA, CONTIENE, IGUAL' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  proCar?: string;

  @ApiPropertyOptional({ description: 'Texto filtro proveedores', maxLength: 25 })
  @IsOptional()
  @IsString()
  @MaxLength(25)
  proTexto?: string;

  @ApiPropertyOptional({ description: 'Característica cuentas: TODOS, EMPIEZA, CONTIENE, IGUAL' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  cueCar?: string;

  @ApiPropertyOptional({ description: 'Texto filtro cuentas', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  cueTexto?: string;

  @ApiPropertyOptional({ description: 'Característica empleados: TODOS, EMPIEZA, CONTIENE, IGUAL' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  empCar?: string;

  @ApiPropertyOptional({ description: 'Texto filtro empleados', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  empTexto?: string;

  @ApiPropertyOptional({ description: 'Control partida', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  controlPartida?: number;

  @ApiPropertyOptional({ description: 'Líneas por página', example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  cntLineas?: number;

  @ApiPropertyOptional({ description: 'Bolivianos', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  bolivianos?: number;

  @ApiPropertyOptional({ description: 'Sucursal', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sucursal?: number;

  @ApiPropertyOptional({ description: 'Reporte 1', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  rep1?: string;

  @ApiPropertyOptional({ description: 'Reporte 2', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  rep2?: string;
}
