import { Injectable, Logger, BadRequestException, NotFoundException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RendDService } from '../../rend-d/rend-d.service';
import { CreateRendDDto } from '../../rend-d/dto/create-rend-d.dto';
import { PdfProcessingResult, InvoiceData, ConfirmBatchResponse } from '../interfaces/pdf-result.interface';

interface StoredResult extends PdfProcessingResult {
  storedAt: Date;
}

@Injectable()
export class BatchProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BatchProcessorService.name);
  
  // Almacenamiento temporal de resultados procesados (en producción usar Redis/DB)
  private processedResults: Map<string, StoredResult> = new Map();
  
  // Límites de seguridad
  private readonly MAX_STORED_RESULTS = 1000;
  private readonly RESULT_TTL_MS = 30 * 60 * 1000; // 30 minutos
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
  
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private readonly rendDService: RendDService) {}

  onModuleInit(): void {
    // Iniciar cleanup periódico
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldResults();
    }, this.CLEANUP_INTERVAL_MS);
    
    this.logger.log(`BatchProcessor iniciado. Max results: ${this.MAX_STORED_RESULTS}, TTL: ${this.RESULT_TTL_MS}ms`);
  }

  onModuleDestroy(): void {
    // Limpiar intervalo al destruir el módulo
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Limpiar todos los resultados pendientes
    const count = this.processedResults.size;
    this.processedResults.clear();
    this.logger.log(`BatchProcessor destruido. ${count} resultados limpiados.`);
  }

  /**
   * Almacena resultados procesados temporalmente para confirmación posterior
   */
  storeResults(results: PdfProcessingResult[]): void {
    // Verificar límite máximo
    if (this.processedResults.size + results.length > this.MAX_STORED_RESULTS) {
      // Limpiar resultados antiguos primero
      this.cleanupOldResults();
      
      // Si aún excede el límite, rechazar nuevos resultados
      if (this.processedResults.size + results.length > this.MAX_STORED_RESULTS) {
        throw new BadRequestException(
          `Límite de resultados almacenados excedido (${this.MAX_STORED_RESULTS}). ` +
          `Por favor confirme o elimine los resultados pendientes.`
        );
      }
    }
    
    const now = new Date();
    for (const result of results) {
      const storedResult: StoredResult = {
        ...result,
        storedAt: now,
      };
      this.processedResults.set(result.id, storedResult);
    }
    
    this.logger.log(`${results.length} resultados almacenados para confirmación. Total: ${this.processedResults.size}`);
  }

  /**
   * Procesa el batch confirmado y crea líneas en REND_D
   */
  async confirmBatch(
    resultIds: string[],
    idRendicion: number,
    idUsuario: string,
    role: string,
    loginUsername: string,
    esAprobador: boolean,
  ): Promise<ConfirmBatchResponse> {
    this.logger.log(`Confirmando batch: ${resultIds.length} items para rendición ${idRendicion}`);

    const createdIds: number[] = [];
    const errors: { id: string; error: string }[] = [];

    for (const resultId of resultIds) {
      try {
        // Obtener resultado procesado
        const result = this.processedResults.get(resultId);
        if (!result) {
          throw new NotFoundException(`Resultado ${resultId} no encontrado o expirado`);
        }

        // Solo procesar resultados completados exitosamente
        if (result.status !== 'completed') {
          throw new BadRequestException(`Resultado ${resultId} no está completado (status: ${result.status})`);
        }

        // Crear DTO para REND_D
        const createDto = this.mapInvoiceToCreateDto(result.data, result.filename);

        // Crear línea en REND_D
        const created = await this.rendDService.create(
          idRendicion,
          Number(idUsuario),
          role,
          idUsuario,
          loginUsername,
          esAprobador,
          createDto,
        );

        if (created?.U_RD_IdRD) {
          createdIds.push(created.U_RD_IdRD);
          // Eliminar de resultados temporales después de confirmar
          this.processedResults.delete(resultId);
          this.logger.log(`Línea REND_D creada: ID ${created.U_RD_IdRD} desde resultado ${resultId}`);
        }
      } catch (error: unknown) {
        const err = error as Error;
        this.logger.error(`Error confirmando resultado ${resultId}: ${err.message}`);
        errors.push({ id: resultId, error: err.message });
      }
    }

    if (errors.length > 0 && createdIds.length === 0) {
      throw new BadRequestException({
        message: 'No se pudo crear ninguna línea',
        errors,
      });
    }

    if (errors.length > 0) {
      this.logger.warn(`Batch parcialmente completado: ${createdIds.length} éxitos, ${errors.length} errores`);
    }

    return {
      createdIds,
      totalCreated: createdIds.length,
    };
  }

  /**
   * Mapea datos de factura extraídos por IA a CreateRendDDto
   */
  private mapInvoiceToCreateDto(data: InvoiceData, filename: string): CreateRendDDto {
    const dto = new CreateRendDDto();
    
    // Datos básicos del documento
    dto.concepto = data.concepto || `Factura procesada: ${filename}`;
    dto.fecha = data.fecha || new Date().toISOString().split('T')[0];
    
    // Tipo de documento por defecto (1 = Factura)
    dto.idTipoDoc = 1;
    dto.tipoDoc = 1;
    dto.tipoDocName = 'FACTURA';
    
    // Montos
    dto.importe = data.monto || 0;
    dto.descuento = 0;
    dto.tasaCero = 0;
    dto.exento = 0;
    dto.impRet = 0;
    dto.total = data.monto || 0;
    
    // Impuestos (valores por defecto, deberían calcularse según normativa boliviana)
    dto.montoIVA = 0;
    dto.montoIT = 0;
    dto.montoIUE = 0;
    dto.montoRCIVA = 0;
    dto.ice = 0;
    
    // Documento
    dto.numDocumento = data.numeroFactura || '';
    dto.ctrl = data.codigoControl || '';
    dto.cuf = data.cuf || '';
    
    // Proveedor
    dto.nit = data.nit || '';
    dto.prov = data.razonSocial || '';
    
    // Valores por defecto para campos requeridos
    dto.importeBs = dto.importe;
    dto.exentoBs = 0;
    dto.desctoBs = 0;
    dto.giftCard = 0;
    dto.tasa = 1;
    
    // Campos auxiliares vacíos
    dto.auxiliar1 = '';
    dto.auxiliar2 = '';
    dto.auxiliar3 = '';
    dto.auxiliar4 = '';
    dto.nroOT = '';
    
    return dto;
  }

  /**
   * Obtiene un resultado procesado por ID
   */
  getResult(resultId: string): PdfProcessingResult | undefined {
    return this.processedResults.get(resultId);
  }

  /**
   * Obtiene estadísticas de resultados almacenados
   */
  getStats(): { total: number; max: number; ttlMinutes: number } {
    return {
      total: this.processedResults.size,
      max: this.MAX_STORED_RESULTS,
      ttlMinutes: this.RESULT_TTL_MS / 60000,
    };
  }

  /**
   * Limpia resultados antiguos (más de 30 minutos)
   */
  cleanupOldResults(): void {
    const now = Date.now();
    const cutoffTime = now - this.RESULT_TTL_MS;
    let count = 0;
    
    for (const [id, result] of this.processedResults.entries()) {
      const storedTime = result.storedAt?.getTime() || result.completedAt?.getTime() || 0;
      if (storedTime < cutoffTime) {
        this.processedResults.delete(id);
        count++;
      }
    }
    
    if (count > 0) {
      this.logger.log(`${count} resultados antiguos eliminados. Restantes: ${this.processedResults.size}`);
    }
  }
}
