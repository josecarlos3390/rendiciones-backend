import {
  IsString, IsNotEmpty, IsOptional, IsInt, IsIn, MinLength, MaxLength, IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({ example: 'jperez', description: 'Login (max 10 chars) — U_Login NVARCHAR(10)' })
  @IsString() @IsNotEmpty() @MaxLength(10)
  login: string;

  @ApiProperty({ example: 'Juan Perez', description: 'Nombre completo — U_NomUser' })
  @IsString() @IsNotEmpty()
  name: string;

  @ApiProperty({ minLength: 6 })
  @IsString() @MinLength(6)
  password: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  supervisorName?: string;

  @ApiPropertyOptional({ example: 0, description: '0=Normal, 1=Admin — U_SuperUser INTEGER' })
  @IsOptional() @IsInt() @Type(() => Number)
  superUser?: number;

  @ApiPropertyOptional({ example: '1', description: "CHAR(1) '1'=Sí '0'=No" }) @IsOptional() @IsString() @IsIn(['0', '1'])
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

  @ApiPropertyOptional({ example: '14600 SOPO' }) @IsOptional() @IsString() @MaxLength(50)
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

  @ApiPropertyOptional({ example: '1', description: "CHAR(1) '1'=Activo '0'=Inactivo '2'=Bloqueado — U_Estado" })
  @IsOptional() @IsString() @IsIn(['0', '1', '2'])
  estado?: string;

  @ApiPropertyOptional({ example: '2027-12-31' }) @IsOptional() @IsDateString()
  fechaExpiracion?: string;
}