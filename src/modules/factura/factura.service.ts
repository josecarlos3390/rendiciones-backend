import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { URL } from 'url';

export interface FacturaSiatDto {
  cuf:          string;
  nit:          string;
  invoiceNumber: string;
  companyName:  string;
  clientName:   string;
  clientDoc:    string;
  status:       string;
  datetime:     string | null;
  total:        number;
}

@Injectable()
export class FacturaService {
  private readonly logger = new Logger(FacturaService.name);
  private readonly apiUrl = 'https://siatrest.impuestos.gob.bo/sre-sfe-shared-v2-rest/consulta/factura';

  async getFromSiat(rawUrl: string): Promise<FacturaSiatDto> {
    const { cuf, nit, numero } = this.parseQrUrl(rawUrl);

    const payload = JSON.stringify({
      nitEmisor:     parseInt(nit, 10),
      cuf,
      numeroFactura: parseInt(numero, 10),
    });

    this.logger.log(`Consultando SIAT: NIT=${nit}, CUF=${cuf.substring(0, 12)}..., N°=${numero}`);

    const response = await fetch(this.apiUrl, {
      method:  'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept':       'application/json, text/plain, */*',
        'User-Agent':   'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0',
        'Origin':       'https://siat.impuestos.gob.bo',
        'Referer':      'https://siat.impuestos.gob.bo/',
      },
      body: payload,
    });

    if (!response.ok) {
      throw new BadRequestException(`La API del SIAT respondió con HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data?.transaccion !== true) {
      throw new BadRequestException('El SIAT indicó transacción fallida — verificá los datos del QR');
    }

    return this.normalize(data.objeto ?? {});
  }

  private parseQrUrl(rawUrl: string): { cuf: string; nit: string; numero: string } {
    try {
      // El QR puede contener la URL directa o la versión "middle page" con t=2
      const urlObj = new URL(rawUrl);
      const params = urlObj.searchParams;

      const cuf    = params.get('cuf')    ?? '';
      const nit    = params.get('nit')    ?? '';
      const numero = params.get('numero') ?? '';

      if (!cuf || !nit || !numero) {
        throw new Error('Faltan parámetros');
      }
      return { cuf, nit, numero };
    } catch {
      throw new BadRequestException(
        'La URL del QR no es válida o no corresponde a una factura del SIAT boliviano'
      );
    }
  }

  private normalize(obj: Record<string, any>): FacturaSiatDto {
    return {
      cuf:           obj.cuf              ?? '',
      nit:           String(obj.nitEmisor ?? ''),
      invoiceNumber: String(obj.numeroFactura ?? ''),
      companyName:   obj.razonSocialEmisor ?? '',
      clientName:    obj.nombreRazonSocial ?? '',
      clientDoc:     String(obj.numeroDocumento ?? ''),
      status:        obj.estadoFactura    ?? '',
      datetime:      obj.fechaEmision     ?? null,
      total:         obj.montoTotal       ?? 0,
    };
  }
}