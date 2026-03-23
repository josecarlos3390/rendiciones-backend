import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FacturaService } from './factura.service';

@ApiTags('Factura SIAT')
@ApiBearerAuth()
@Controller('factura')
export class FacturaController {
  constructor(private readonly facturaService: FacturaService) {}

  @Get('siat')
  @ApiOperation({ summary: 'Consulta una factura electrónica en el SIAT a partir de su URL de QR' })
  @ApiQuery({ name: 'url', description: 'URL del QR de la factura (siat.impuestos.gob.bo/...)', required: true })
  async getFromSiat(@Query('url') url: string) {
    if (!url?.trim()) throw new BadRequestException('El parámetro url es requerido');
    return this.facturaService.getFromSiat(url.trim());
  }
}