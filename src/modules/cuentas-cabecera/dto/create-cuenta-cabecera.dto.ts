import { IsInt, IsString, IsNotEmpty, IsOptional, MaxLength, Min, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCuentaCabeceraDto {
  @ApiProperty({ description: 'ID del perfil' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  idPerfil: number;

  @ApiProperty({ description: 'Código SYS de la cuenta', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  cuentaSys: string;

  @ApiPropertyOptional({ description: 'Código formato de la cuenta', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  cuentaFormatCode?: string;

  @ApiProperty({ description: 'Nombre de la cuenta', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  cuentaNombre: string;

  @ApiPropertyOptional({ description: 'Cuenta asociada: Y/N', default: 'N' })
  @IsOptional()
  @IsString()
  @IsIn(['Y', 'N'])
  cuentaAsociada?: string;
}