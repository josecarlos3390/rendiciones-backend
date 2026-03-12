import { IsInt, IsString, IsNotEmpty, IsOptional, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCuentaListaDto {
  @ApiProperty({ description: 'ID del perfil al que pertenece la cuenta' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  idPerfil: number;

  @ApiProperty({ description: 'Código SYS de la cuenta', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  cuentaSys: string;

  @ApiProperty({ description: 'Código de la cuenta', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  cuenta: string;

  @ApiProperty({ description: 'Nombre de la cuenta', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombreCuenta: string;

  @ApiPropertyOptional({ description: 'Relevante: Y/N', default: 'N' })
  @IsOptional()
  @IsString()
  @MaxLength(1)
  relevante?: string;
}
