import {
  Controller, Get, Post, Put, Delete,
  Body, Param, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RendicionesService } from './rendiciones.service';
import { CreateRendicionDto } from './dto/create-rendicion.dto';
import { UpdateRendicionDto } from './dto/update-rendicion.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Rendiciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rendiciones')
export class RendicionesController {
  constructor(private readonly rendicionesService: RendicionesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las rendiciones' })
  @ApiResponse({ status: 200, description: 'Lista de rendiciones' })
  findAll() {
    return this.rendicionesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una rendicion por ID' })
  @ApiResponse({ status: 200, description: 'Rendicion encontrada' })
  @ApiResponse({ status: 404, description: 'No encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rendicionesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nueva rendicion' })
  @ApiResponse({ status: 201, description: 'Rendicion creada' })
  create(
    @Body() dto: CreateRendicionDto,
    @CurrentUser('sub') userId: number,
  ) {
    return this.rendicionesService.create(dto, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar rendicion' })
  @ApiResponse({ status: 200, description: 'Rendicion actualizada' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRendicionDto,
  ) {
    return this.rendicionesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar rendicion' })
  @ApiResponse({ status: 200, description: 'Rendicion eliminada' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rendicionesService.remove(id);
  }
}
