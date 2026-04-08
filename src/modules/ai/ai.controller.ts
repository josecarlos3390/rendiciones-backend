import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AiConfigService } from './services/ai-config.service';
import { AppModeService } from './services/app-mode.service';
import { ClasificadorService } from './services/clasificador.service';
import { ValidadorSiatService } from './services/validador-siat.service';
import { AnalisisRendicionService } from './services/analisis-rendicion.service';
import { ChatbotService } from './services/chatbot.service';
import { InvoiceExtractorService } from './services/invoice-extractor.service';
import { BatchProcessorService } from './services/batch-processor.service';
import { ConfirmBatchDto } from './dto/process-pdfs.dto';
import { SugerirClasificacionDto } from './dto/sugerir-clasificacion.dto';
import { ValidarSiatDto } from './dto/validar-siat.dto';

import { ChatConsultaDto } from './dto/chat.dto';
import {
  AiStatusResponse,
  ProcessPdfsResponse,
  ConfirmBatchResponse,
} from './interfaces/pdf-result.interface';

@ApiTags('Inteligencia Artificial (IA)')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(
    private readonly configService: AiConfigService,
    private readonly appModeService: AppModeService,
    private readonly clasificadorService: ClasificadorService,
    private readonly validadorSiatService: ValidadorSiatService,
    private readonly analisisRendicionService: AnalisisRendicionService,
    private readonly chatbotService: ChatbotService,
    private readonly extractorService: InvoiceExtractorService,
    private readonly batchProcessor: BatchProcessorService,
  ) {}

  /**
   * Verifica el estado de la configuración de IA y modo de operación
   */
  /**
   * Sugiere clasificación contable para un gasto
   */
  @Post('sugerir-clasificacion')
  @ApiOperation({
    summary: 'Sugerir clasificación de gasto',
    description: 'La IA analiza el concepto y sugiere cuenta contable, dimensión/norma y proyecto. Funciona en modo ONLINE y OFFLINE.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sugerencia de clasificación generada',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o IA no habilitada',
  })
  async sugerirClasificacion(@Body() dto: SugerirClasificacionDto) {
    // Verificar IA habilitada
    if (!this.configService.enabled) {
      throw new BadRequestException('Las funcionalidades de IA no están habilitadas');
    }
    return this.clasificadorService.sugerirClasificacion(dto);
  }

  /**
   * Valida una factura contra el SIAT
   */
  @Post('validar-siat')
  @ApiOperation({
    summary: 'Validar factura contra SIAT',
    description: 'Cruza los datos de una factura con los registros oficiales del SIAT. Detecta discrepancias y explica diferencias usando IA si está disponible.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado de la validación',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'CUF no proporcionado',
  })
  async validarSiat(@Body() dto: ValidarSiatDto) {
    if (!dto.cuf && !dto.urlQr) {
      throw new BadRequestException('Debe proporcionar el CUF o la URL del QR');
    }

    const cuf = dto.cuf || this.extraerCufDeUrl(dto.urlQr!);

    return this.validadorSiatService.validarFactura(cuf, dto.datosPdf);
  }

  /**
   * Extrae el CUF de una URL del SIAT
   */
  private extraerCufDeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const cuf = urlObj.searchParams.get('cuf');
      if (!cuf) {
        throw new BadRequestException('URL no contiene CUF válido');
      }
      return cuf;
    } catch {
      throw new BadRequestException('URL inválida');
    }
  }

  /**
   * Analiza una rendición para asistir al aprobador
   */
  /**
   * Chatbot de rendiciones
   */
  @Post('chat')
  @ApiOperation({
    summary: 'Chatbot de rendiciones',
    description: 'Asistente conversacional que responde preguntas sobre rendiciones, gastos, normas y políticas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Respuesta del chatbot',
    type: Object,
  })
  async chat(@Body() dto: ChatConsultaDto) {
    return this.chatbotService.procesarConsulta(dto);
  }

  @Get('analisis-rendicion/:id')
  @ApiOperation({
    summary: 'Analizar rendición para aprobación',
    description: 'La IA analiza la rendición y proporciona recomendaciones al aprobador: score de riesgo, factores positivos/negativos, y sugerencia de acción. Funciona en modo ONLINE y OFFLINE.',
  })
  @ApiResponse({
    status: 200,
    description: 'Análisis de la rendición',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'IA no habilitada',
  })
  async analizarRendicion(
    @Param('id', ParseIntPipe) id: number,
    @Query('usuarioId') usuarioId?: string,
  ) {
    // Verificar IA habilitada
    if (!this.configService.enabled) {
      throw new BadRequestException('Las funcionalidades de IA no están habilitadas');
    }
    return this.analisisRendicionService.analizarRendicion(id, usuarioId);
  }

  @Get('status')
  @ApiOperation({
    summary: 'Estado de la IA y modo de operación',
    description: 'Verifica si las funcionalidades de IA están habilitadas y el modo ONLINE/OFFLINE',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de la IA y modo de operación',
    type: Object,
  })
  getStatus(): AiStatusResponse {
    const aiStatus = this.configService.getStatus();
    const appMode = this.appModeService.getStatus();
    
    return {
      ia: {
        enabled: aiStatus.enabled,
        provider: aiStatus.provider,
        model: aiStatus.model,
        configured: aiStatus.configured,
        version: '1.0.0',
      },
      modo: appMode,
    };
  }

  /**
   * Procesa múltiples PDFs de facturas
   */
  @Post('process-pdfs')
  @ApiOperation({
    summary: 'Procesar PDFs con IA',
    description: 'Procesa múltiples PDFs de facturas usando Claude para extraer datos automáticamente',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Archivos PDF de facturas',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'PDFs procesados',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'Error en el procesamiento',
  })
  @ApiResponse({
    status: 503,
    description: 'IA no está habilitada o configurada',
  })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB por archivo
      },
      fileFilter: (req, file, callback) => {
        if (file.mimetype !== 'application/pdf') {
          return callback(
            new BadRequestException('Solo se permiten archivos PDF'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async processPdfs(
    @UploadedFiles() files: any[],
  ): Promise<ProcessPdfsResponse> {
    // Verificar que IA esté habilitada
    if (!this.configService.enabled) {
      throw new BadRequestException(
        'Las funcionalidades de IA no están habilitadas',
      );
    }

    if (!this.configService.isAnthropicConfigured) {
      throw new BadRequestException(
        'Claude no está configurado. Verifica ANTHROPIC_API_KEY',
      );
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('No se proporcionaron archivos PDF');
    }

    // Preparar archivos para procesamiento
    const fileData = files.map((file) => ({
      buffer: file.buffer,
      filename: file.originalname,
    }));

    // Procesar PDFs
    const results = await this.extractorService.processMultiplePdfs(fileData);

    // Almacenar resultados para confirmación posterior
    this.batchProcessor.storeResults(results);

    const completed = results.filter((r) => r.status === 'completed').length;
    const errors = results.filter((r) => r.status === 'error').length;

    return {
      results,
      total: results.length,
      completed,
      errors,
    };
  }

  /**
   * Confirma y crea las líneas de rendición desde los resultados procesados
   */
  @Post('confirm-batch')
  @ApiOperation({
    summary: 'Confirmar batch de facturas',
    description: 'Crea las líneas en REND_D a partir de los resultados procesados por IA',
  })
  @ApiResponse({
    status: 200,
    description: 'Líneas creadas exitosamente',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o resultados no encontrados',
  })
  async confirmBatch(
    @Body() dto: ConfirmBatchDto,
    // Estos parámetros vendrían de guards/decodificadores JWT en una implementación real
    // Por ahora usamos valores del DTO
  ): Promise<ConfirmBatchResponse> {
    // Verificar IA habilitada
    if (!this.configService.enabled) {
      throw new BadRequestException(
        'Las funcionalidades de IA no están habilitadas',
      );
    }

    return this.batchProcessor.confirmBatch(
      dto.resultIds,
      dto.idRendicion,
      dto.idUsuario,
      'USER', // TODO: Obtener del token JWT
      dto.idUsuario, // TODO: Obtener del token JWT
      false, // TODO: Obtener del servicio de permisos
    );
  }
}
