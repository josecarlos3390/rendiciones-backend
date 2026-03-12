import {
  IsString, IsOptional, IsInt, IsIn, MinLength, IsDateString, MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  name?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  supervisorName?: string;

  @ApiPropertyOptional({ example: 0 }) @IsOptional() @IsInt()
  superUser?: number;

  @ApiPropertyOptional({ example: 'A' }) @IsOptional() @IsIn(['A', 'I'])
  estado?: string;

  @ApiPropertyOptional() @IsOptional() @IsIn(['Y', 'N'])
  appRend?: string;

  @ApiPropertyOptional() @IsOptional() @IsIn(['Y', 'N'])
  appConf?: string;

  @ApiPropertyOptional() @IsOptional() @IsIn(['Y', 'N'])
  appExtB?: string;

  @ApiPropertyOptional() @IsOptional() @IsIn(['Y', 'N'])
  appUpLA?: string;

  @ApiPropertyOptional() @IsOptional() @IsIn(['Y', 'N'])
  genDocPre?: string;

  @ApiPropertyOptional() @IsOptional() @IsIn(['Y', 'N'])
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

  @ApiPropertyOptional() @IsOptional() @IsIn(['Y', 'N'])
  fijarSaldo?: string;

  @ApiPropertyOptional({ example: '2027-12-31' }) @IsOptional() @IsDateString()
  fechaExpiracion?: string;

  @ApiPropertyOptional({ minLength: 6 }) @IsOptional() @IsString() @MinLength(6)
  password?: string;
}