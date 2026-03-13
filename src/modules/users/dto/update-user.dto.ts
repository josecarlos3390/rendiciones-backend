import {
  IsString, IsOptional, IsInt, IsIn, MinLength, IsDateString, MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  name?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  supervisorName?: string;

  @ApiPropertyOptional({ example: 0, description: 'INTEGER — 0=Normal, 1=Admin' })
  @IsOptional() @IsInt() @Type(() => Number)
  superUser?: number;

  @ApiPropertyOptional({ example: '1', description: "CHAR(1) '1'=Activo '0'=Inactivo '2'=Bloqueado" })
  @IsOptional() @IsString() @IsIn(['0', '1', '2'])
  estado?: string;

  @ApiPropertyOptional({ example: '1' }) @IsOptional() @IsString() @IsIn(['0', '1'])
  appRend?: string;

  @ApiPropertyOptional({ example: '0' }) @IsOptional() @IsString() @IsIn(['0', '1'])
  appConf?: string;

  @ApiPropertyOptional({ example: '0' }) @IsOptional() @IsString() @IsIn(['0', '1'])
  appExtB?: string;

  @ApiPropertyOptional({ example: '0' }) @IsOptional() @IsString() @IsIn(['0', '1'])
  appUpLA?: string;

  @ApiPropertyOptional({ example: '0' }) @IsOptional() @IsString() @IsIn(['0', '1'])
  genDocPre?: string;

  @ApiPropertyOptional({ example: '0' }) @IsOptional() @IsString() @IsIn(['0', '1'])
  fijarNr?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50)
  nr1?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50)
  nr2?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50)
  nr3?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50)
  nr4?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50)
  nr5?: string;

  @ApiPropertyOptional({ example: '0' }) @IsOptional() @IsString() @IsIn(['0', '1'])
  fijarSaldo?: string;

  @ApiPropertyOptional({ example: '2027-12-31' }) @IsOptional() @IsDateString()
  fechaExpiracion?: string;

  @ApiPropertyOptional({ minLength: 6 }) @IsOptional() @IsString() @MinLength(6)
  password?: string;
}