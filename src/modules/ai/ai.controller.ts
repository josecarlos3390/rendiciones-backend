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
  Req,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { AiConfigService } from "./services/ai-config.service";
import { AppModeService } from "./services/app-mode.service";
import { ClasificadorService } from "./services/clasificador.service";
import { ValidadorSiatService } from "./services/validador-siat.service";
import { AnalisisRendicionService } from "./services/analisis-rendicion.service";
import { ChatbotService } from "./services/chatbot.service";
import { InvoiceExtractorService } from "./services/invoice-extractor.service";
import { BatchProcessorService } from "./services/batch-processor.service";
import { ConfirmBatchDto } from "./dto/process-pdfs.dto";
import { SugerirClasificacionDto } from "./dto/sugerir-clasificacion.dto";
import { ValidarSiatDto } from "./dto/validar-siat.dto";

import { ChatConsultaDto } from "./dto/chat.dto";
import type { RequestWithUser } from "@common/types";
import {
  AiStatusResponse,
  ProcessPdfsResponse,
  ConfirmBatchResponse,
} from "./interfaces/pdf-result.interface";

@ApiTags("Inteligencia Artificial (IA)")
@ApiBearerAuth()
@Controller("ai")
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

  private _assertAiEnabled(): void {
    if (!this.configService.enabled) {
      throw new BadRequestException(
        "Las funcionalidades de IA no estÃ¡n habilitadas",
      );
    }
  }

  private _assertAnthropicConfigured(): void {
    if (!this.configService.isAnthropicConfigured) {
      throw new BadRequestException(
        "Claude no estÃ¡ configurado. Verifica ANTHROPIC_API_KEY",
      );
    }
  }

  /**
   * Verifica el estado de la configuraciÃ³n de IA y modo de operaciÃ³n
   */
  /**
   * Sugiere clasificaciÃ³n contable para un gasto
   */
  @Post("sugerir-clasificacion")
  @ApiOperation({
    summary: "Sugerir clasificaciÃ³n de gasto",
    description:
      "La IA analiza el concepto y sugiere cuenta contable, dimensiÃ³n/norma y proyecto. Funciona en modo ONLINE y OFFLINE.",
  })
  @ApiResponse({
    status: 200,
    description: "Sugerencia de clasificaciÃ³n generada",
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: "Datos invÃ¡lidos o IA no habilitada",
  })
  async sugerirClasificacion(@Body() dto: SugerirClasificacionDto) {
    this._assertAiEnabled();
    return this.clasificadorService.sugerirClasificacion(dto);
  }

  /**
   * Valida una factura contra el SIAT
   */
  @Post("validar-siat")
  @ApiOperation({
    summary: "Validar factura contra SIAT",
    description:
      "Cruza los datos de una factura con los registros oficiales del SIAT. Detecta discrepancias y explica diferencias usando IA si estÃ¡ disponible.",
  })
  @ApiResponse({
    status: 200,
    description: "Resultado de la validaciÃ³n",
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: "CUF no proporcionado",
  })
  async validarSiat(@Body() dto: ValidarSiatDto) {
    if (!dto.cuf && !dto.urlQr) {
      throw new BadRequestException("Debe proporcionar el CUF o la URL del QR");
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
      const cuf = urlObj.searchParams.get("cuf");
      if (!cuf) {
        throw new BadRequestException("URL no contiene CUF vÃ¡lido");
      }
      return cuf;
    } catch {
      throw new BadRequestException("URL invÃ¡lida");
    }
  }

  /**
   * Analiza una rendiciÃ³n para asistir al aprobador
   */
  /**
   * Chatbot de rendiciones
   */
  @Post("chat")
  @ApiOperation({
    summary: "Chatbot de rendiciones",
    description:
      "Asistente conversacional que responde preguntas sobre rendiciones, gastos, normas y polÃ­ticas.",
  })
  @ApiResponse({
    status: 200,
    description: "Respuesta del chatbot",
    type: Object,
  })
  async chat(@Body() dto: ChatConsultaDto) {
    return this.chatbotService.procesarConsulta(dto);
  }

  @Get("analisis-rendicion/:id")
  @ApiOperation({
    summary: "Analizar rendiciÃ³n para aprobaciÃ³n",
    description:
      "La IA analiza la rendiciÃ³n y proporciona recomendaciones al aprobador: score de riesgo, factores positivos/negativos, y sugerencia de acciÃ³n. Funciona en modo ONLINE y OFFLINE.",
  })
  @ApiResponse({
    status: 200,
    description: "AnÃ¡lisis de la rendiciÃ³n",
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: "IA no habilitada",
  })
  async analizarRendicion(
    @Param("id", ParseIntPipe) id: number,
    @Query("usuarioId") usuarioId?: string,
  ) {
    this._assertAiEnabled();
    return this.analisisRendicionService.analizarRendicion(id, usuarioId);
  }

  @Get("status")
  @ApiOperation({
    summary: "Estado de la IA y modo de operaciÃ³n",
    description:
      "Verifica si las funcionalidades de IA estÃ¡n habilitadas y el modo ONLINE/OFFLINE",
  })
  @ApiResponse({
    status: 200,
    description: "Estado de la IA y modo de operaciÃ³n",
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
        version: "1.0.0",
      },
      modo: appMode,
    };
  }

  /**
   * Procesa mÃºltiples PDFs de facturas
   */
  @Post("process-pdfs")
  @ApiOperation({
    summary: "Procesar PDFs con IA",
    description:
      "Procesa mÃºltiples PDFs de facturas usando Claude para extraer datos automÃ¡ticamente",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: {
            type: "string",
            format: "binary",
          },
          description: "Archivos PDF de facturas",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "PDFs procesados",
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: "Error en el procesamiento",
  })
  @ApiResponse({
    status: 503,
    description: "IA no estÃ¡ habilitada o configurada",
  })
  @UseInterceptors(
    FilesInterceptor("files", 10, {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB por archivo
      },
      fileFilter: (req, file, callback) => {
        if (file.mimetype !== "application/pdf") {
          return callback(
            new BadRequestException("Solo se permiten archivos PDF"),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async processPdfs(
    @UploadedFiles()
    files: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    }[],
  ): Promise<ProcessPdfsResponse> {
    this._assertAiEnabled();
    this._assertAnthropicConfigured();

    if (!files || files.length === 0) {
      throw new BadRequestException("No se proporcionaron archivos PDF");
    }

    // Preparar archivos para procesamiento
    const fileData = files.map((file) => ({
      buffer: file.buffer,
      filename: file.originalname,
    }));

    // Procesar PDFs
    const results = await this.extractorService.processMultiplePdfs(fileData);

    // Almacenar resultados para confirmaciÃ³n posterior
    this.batchProcessor.storeResults(results);

    const completed = results.filter((r) => r.status === "completed").length;
    const errors = results.filter((r) => r.status === "error").length;

    return {
      results,
      total: results.length,
      completed,
      errors,
    };
  }

  /**
   * Confirma y crea las lÃ­neas de rendiciÃ³n desde los resultados procesados
   */
  @Post("confirm-batch")
  @ApiOperation({
    summary: "Confirmar batch de facturas",
    description:
      "Crea las lÃ­neas en REND_D a partir de los resultados procesados por IA",
  })
  @ApiResponse({
    status: 200,
    description: "LÃ­neas creadas exitosamente",
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: "Datos invÃ¡lidos o resultados no encontrados",
  })
  async confirmBatch(
    @Body() dto: ConfirmBatchDto,
    @Req() req: RequestWithUser,
  ): Promise<ConfirmBatchResponse> {
    this._assertAiEnabled();

    return this.batchProcessor.confirmBatch(
      dto.resultIds,
      dto.idRendicion,
      String(req.user.sub),
      req.user.role,
      req.user.username,
      req.user.esAprobador,
    );
  }
}
