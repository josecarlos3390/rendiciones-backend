import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { TipoDocSapService } from './tipo-doc-sap.service';
import { CreateTipoDocSapDto, UpdateTipoDocSapDto } from './repositories/tipo-doc-sap.hana.repository';
import { Roles } from '../../auth/decorators/roles.decorator';
import { IsInt, IsString, IsNotEmpty, IsBoolean, IsIn, IsOptional, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RequiereConf } from '../../auth/decorators/require-conf.decorator';

class CreateTipoDocSapBodyDto implements CreateTipoDocSapDto {
  @ApiProperty({ description: 'Código SAP del tipo de documento', example: 1 })
  @IsInt() @Min(0) @Type(() => Number)
  idTipo: number;

  @ApiProperty({ example: 'Factura de Compra' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  nombre: string;

  @ApiProperty({ enum: ['F', 'R'], description: 'F=Factura, R=Recibo' })
  @IsString() @IsIn(['F', 'R'])
  esTipoF: 'F' | 'R';

  @ApiProperty({ description: 'Permite Grossing Up' })
  @IsBoolean() @Type(() => Boolean)
  permiteGU: boolean;

  @ApiProperty({ description: 'Permite Grossing Down' })
  @IsBoolean() @Type(() => Boolean)
  permiteGD: boolean;

  @ApiProperty({ description: 'Orden de visualización', example: 1 })
  @IsInt() @Min(0) @Type(() => Number)
  orden: number;

  @ApiProperty({ description: 'Activo en el sistema' })
  @IsBoolean() @Type(() => Boolean)
  activo: boolean;
}

class UpdateTipoDocSapBodyDto implements UpdateTipoDocSapDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100)
  nombre?: string;

  @ApiPropertyOptional({ enum: ['F', 'R'] }) @IsOptional() @IsString() @IsIn(['F', 'R'])
  esTipoF?: 'F' | 'R';

  @ApiPropertyOptional() @IsOptional() @IsBoolean() @Type(() => Boolean)
  permiteGU?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() @Type(() => Boolean)
  permiteGD?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Type(() => Number)
  orden?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() @Type(() => Boolean)
  activo?: boolean;
}

@ApiTags('Tipo Documento SAP')
@ApiBearerAuth()
@Controller('tipo-doc-sap')
export class TipoDocSapController {
  constructor(private readonly svc: TipoDocSapService) {}

  @Get()
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Lista todos los tipos de documento SAP' })
  findAll() { return this.svc.findAll(); }

  @Get('activos')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Lista solo los tipos activos (para selectores)' })
  findActivos() { return this.svc.findActivos(); }

  @Get(':id')
  @Roles('ADMIN', 'USER')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findOne(id); }

  @RequiereConf()
  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Crea un nuevo tipo de documento SAP' })
  create(@Body() dto: CreateTipoDocSapBodyDto) { return this.svc.create(dto); }

  @RequiereConf()
  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Actualiza un tipo de documento SAP' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTipoDocSapBodyDto,
  ) { return this.svc.update(id, dto); }

  @RequiereConf()
  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Elimina un tipo de documento SAP' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }
}