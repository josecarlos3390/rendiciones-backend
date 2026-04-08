import { Injectable, Logger } from '@nestjs/common';
import { fromBuffer } from 'pdf2pic';
import * as sharp from 'sharp';

@Injectable()
export class PdfProcessorService {
  private readonly logger = new Logger(PdfProcessorService.name);

  /**
   * Extrae texto de un PDF usando pdf-parse v2
   */
  async extractText(buffer: Buffer): Promise<string> {
    try {
      const { PDFParse } = await import('pdf-parse');
      
      // pdf-parse v2 API: constructor acepta { data: buffer }
      // getText() llama a load() internamente
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      
      return result.text || '';
    } catch (error: any) {
      this.logger.error(`Error extrayendo texto de PDF: ${error.message}`);
      throw new Error('No se pudo extraer texto del PDF');
    }
  }

  /**
   * Convierte el PDF a imagen (primera página)
   * Útil cuando el PDF no tiene texto seleccionable
   */
  async convertToImage(buffer: Buffer): Promise<string> {
    try {
      this.logger.log('Convirtiendo PDF a imagen...');

      const convert = fromBuffer(buffer, {
        density: 150, // DPI
        format: 'png',
        width: 1200,
        height: 1600,
        quality: 90,
        preserveAspectRatio: true,
        saveFilename: 'page',
        savePath: './temp',
      });

      // Convertir primera página
      const result = await convert(1) as any;

      if (!result?.buffer) {
        throw new Error('No se pudo convertir el PDF a imagen');
      }

      this.logger.log('PDF convertido a imagen exitosamente');
      return result.buffer.toString('base64');
    } catch (error: any) {
      this.logger.error(`Error convirtiendo PDF: ${error.message}`);
      throw new Error('Error al convertir PDF a imagen');
    }
  }

  /**
   * Comprime y optimiza una imagen para enviar a IA
   */
  async optimizeImage(base64Image: string): Promise<string> {
    try {
      const buffer = Buffer.from(base64Image, 'base64');

      // Comprimir imagen
      const optimized = await sharp(buffer)
        .resize(1000, null, { withoutEnlargement: true }) // Max 1000px de ancho
        .png({ quality: 80, compressionLevel: 9 })
        .toBuffer();

      return optimized.toString('base64');
    } catch (error: any) {
      this.logger.warn(`Error optimizando imagen: ${error.message}`);
      // Retornar original si falla
      return base64Image;
    }
  }

  /**
   * Verifica si el PDF tiene texto seleccionable
   */
  async hasSelectableText(buffer: Buffer): Promise<boolean> {
    try {
      const text = await this.extractText(buffer);
      // Si tiene más de 50 caracteres, consideramos que tiene texto seleccionable
      return text.trim().length > 50;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene información básica del PDF
   */
  async getPdfInfo(buffer: Buffer): Promise<{
    pageCount: number;
    hasText: boolean;
    size: number;
  }> {
    try {
      const { PDFParse } = await import('pdf-parse');
      
      const parser = new PDFParse({ data: buffer });
      
      // getInfo() también carga el documento internamente
      const info = await parser.getInfo();
      const numPages = info?.total || 1;
      
      // Intentar obtener texto para ver si tiene texto seleccionable
      const textResult = await parser.getText();
      const hasText = (textResult.text || '').trim().length > 50;

      return {
        pageCount: numPages,
        hasText,
        size: buffer.length,
      };
    } catch (error: any) {
      this.logger.error(`Error obteniendo info de PDF: ${error.message}`);
      throw error;
    }
  }
}
