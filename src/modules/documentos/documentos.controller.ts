import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseIntPipe, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DocumentosService } from './documentos.service';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Documentos')
@ApiBearerAuth()
@Controller('documentos')
export class DocumentosController {
  constructor(private readonly service: DocumentosService) {}

  @Get()
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Listar documentos, opcionalmente filtrado por perfil' })
  findAll(@Query('perfil') perfil?: string) {
    if (perfil) return this.service.findByPerfil(Number(perfil));
    return this.service.findAll();
  }

  @Get('perfil/:codPerfil')
  @Roles('ADMIN', 'USER')
  findByPerfil(@Param('codPerfil', ParseIntPipe) codPerfil: number) {
    return this.service.findByPerfil(codPerfil);
  }

  @Get(':id')
  @Roles('ADMIN', 'USER')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiResponse({ status: 201, description: 'Documento creado' })
  create(@Body() dto: CreateDocumentoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDocumentoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
