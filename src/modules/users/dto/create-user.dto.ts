import {
  IsString, IsNotEmpty, IsOptional, IsInt, IsIn, MinLength, MaxLength, IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'jperez', description: 'Login (max 10 chars) — U_Login' })
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

  @ApiPropertyOptional({ example: 0, description: '0=Normal, 1=Admin — U_SuperUser' })
  @IsOptional() @IsInt()
  superUser?: number;

  @ApiPropertyOptional({ example: 'Y' }) @IsOptional() @IsIn(['Y', 'N'])
  appRend?: string;

  @ApiPropertyOptional({ example: 'N' }) @IsOptional() @IsIn(['Y', 'N'])
  appConf?: string;

  @ApiPropertyOptional({ example: 'N' }) @IsOptional() @IsIn(['Y', 'N'])
  appExtB?: string;

  @ApiPropertyOptional({ example: 'N' }) @IsOptional() @IsIn(['Y', 'N'])
  appUpLA?: string;

  @ApiPropertyOptional({ example: 'N' }) @IsOptional() @IsIn(['Y', 'N'])
  genDocPre?: string;

  @ApiPropertyOptional({ example: 'N' }) @IsOptional() @IsIn(['Y', 'N'])
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

  @ApiPropertyOptional({ example: 'N' }) @IsOptional() @IsIn(['Y', 'N'])
  fijarSaldo?: string;

  @ApiPropertyOptional({ example: '2027-12-31' }) @IsOptional() @IsDateString()
  fechaExpiracion?: string;
}