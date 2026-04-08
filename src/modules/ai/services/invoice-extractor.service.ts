import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ClaudeService } from './claude.service';
import { PdfProcessorService } from './pdf-processor.service';
import { AiConfigService } from './ai-config.service';
import {
  PdfProcessingResult,
  InvoiceData,
} from '../interfaces/pdf-result.interface';

@Injectable()
export class InvoiceExtractorService {
  private readonly logger = new Logger(InvoiceExtractorService.name);

  constructor(
    private readonly claudeService: ClaudeService,
    private readonly pdfProcessor: PdfProcessorService,
    private readonly config: AiConfigService,
  ) {}

  /**
   * Procesa un PDF de factura intentando múltiples estrategias:
   * 1. Extraer texto del PDF
   * 2. Si tiene texto, usar Claude para extraer datos
   * 3. Si no tiene texto, convertir a imagen y usar Claude Vision
   */
  async processPdf(
    buffer: Buffer,
    filename: string,
  ): Promise<PdfProcessingResult> {
    const id = uuidv4();
    const result: PdfProcessingResult = {
      id,
      filename,
      status: 'processing',
      source: 'ai_claude',
      confidence: 0,
      data: {},
      warnings: [],
      startedAt: new Date(),
    };

    try {
      this.logger.log(`Procesando PDF: ${filename}`);

      // Verificar si tenemos IA habilitada
      if (!this.config.enabled) {
        throw new Error('IA no está habilitada');
      }

      // Obtener info del PDF
      const pdfInfo = await this.pdfProcessor.getPdfInfo(buffer);
      this.logger.debug(`PDF info: ${JSON.stringify(pdfInfo)}`);

      let extractionResult: { data: InvoiceData; confidence: number };

      // Estrategia 1: Intentar extraer texto y procesar con Claude
      if (pdfInfo.hasText) {
        this.logger.log('PDF tiene texto seleccionable, usando Claude con texto');
        const text = await this.pdfProcessor.extractText(buffer);
        extractionResult = await this.claudeService.extractInvoiceData(
          text,
          filename,
        );
      }
      // Estrategia 2: Convertir a imagen y usar Claude Vision
      else {
        this.logger.log('PDF no tiene texto, convirtiendo a imagen...');
        const base64Image = await this.pdfProcessor.convertToImage(buffer);
        const optimizedImage = await this.pdfProcessor.optimizeImage(base64Image);
        extractionResult = await this.claudeService.extractInvoiceFromImage(
          optimizedImage,
          filename,
        );
      }

      // Validar y generar advertencias
      result.data = extractionResult.data;
      result.confidence = extractionResult.confidence;
      result.warnings = this.validateInvoiceData(extractionResult.data);
      result.status = 'completed';
      result.completedAt = new Date();

      this.logger.log(
        `PDF procesado exitosamente: ${filename} (confianza: ${result.confidence})`,
      );

      return result;
    } catch (error: any) {
      this.logger.error(`Error procesando ${filename}: ${error.message}`);
      result.status = 'error';
      result.errorMessage = error.message;
      result.completedAt = new Date();
      return result;
    }
  }

  /**
   * Procesa múltiples PDFs en batch
   */
  async processMultiplePdfs(
    files: { buffer: Buffer; filename: string }[],
  ): Promise<PdfProcessingResult[]> {
    this.logger.log(`Procesando batch de ${files.length} PDFs`);

    // Procesar secuencialmente para no saturar la API
    const results: PdfProcessingResult[] = [];
    for (const file of files) {
      const result = await this.processPdf(file.buffer, file.filename);
      results.push(result);
    }

    const completed = results.filter((r) => r.status === 'completed').length;
    const errors = results.filter((r) => r.status === 'error').length;

    this.logger.log(
      `Batch completado: ${completed} exitosos, ${errors} errores`,
    );

    return results;
  }

  /**
   * Valida los datos extraídos y genera advertencias
   */
  private validateInvoiceData(data: InvoiceData): string[] {
    const warnings: string[] = [];

    if (!data.nit) {
      warnings.push('NIT no detectado');
    }
    if (!data.razonSocial) {
      warnings.push('Razón social no detectada');
    }
    if (!data.numeroFactura) {
      warnings.push('Número de factura no detectado');
    }
    if (!data.fecha) {
      warnings.push('Fecha no detectada');
    }
    if (!data.monto || data.monto <= 0) {
      warnings.push('Monto no detectado o inválido');
    }
    if (!data.concepto) {
      warnings.push('Concepto no detectado');
    }

    return warnings;
  }

  /**
   * Calcula el nivel de confianza general del resultado
   */
  calculateConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 0.85) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }
}
