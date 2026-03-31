import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { RendCmpService }     from './rend-cmp.service';
import { CreateRendCmpDto }   from './dto/create-rend-cmp.dto';
import { UpdateRendCmpDto }   from './dto/update-rend-cmp.dto';
import { Roles }              from '../../auth/decorators/roles.decorator';
import { Throttle }           from '@nestjs/throttler';
import { RequiereConf } from '../../auth/decorators/require-conf.decorator';

@ApiTags('Rend-CMP')
@ApiBearerAuth()
@Controller('rend-cmp')
export class RendCmpController {
  constructor(private readonly svc: RendCmpService) {}

  @Get()
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Listar mapeo de campos SAP' })
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Obtener campo por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id);
  }

  @RequiereConf()
  @Post()
  @Roles('ADMIN')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiOperation({ summary: 'Crear campo de mapeo SAP' })
  create(@Body() dto: CreateRendCmpDto) {
    return this.svc.create(dto);
  }

  @RequiereConf()
  @Patch(':id')
  @Roles('ADMIN')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiOperation({ summary: 'Actualizar campo de mapeo SAP' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRendCmpDto) {
    return this.svc.update(id, dto);
  }

  @RequiereConf()
  @Delete(':id')
  @Roles('ADMIN')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Eliminar campo de mapeo SAP' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}