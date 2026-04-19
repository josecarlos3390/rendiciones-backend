import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseIntPipe,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { Response } from "express";
import type { RequestWithUser } from "@common/types";
import { AdjuntosService } from "./adjuntos.service";

import { CreateAdjuntoDto, AdjuntoResponseDto } from "./dto/create-adjunto.dto";
import { UploadedFileData } from "./interfaces/adjunto.interface";

@ApiTags("Adjuntos")
@ApiBearerAuth()
@Controller()
export class AdjuntosController {
  constructor(private readonly adjuntosService: AdjuntosService) {}

  /**
   * Lista todos los adjuntos de una lÃ­nea de rendiciÃ³n
   */
  @Get("rend-m/:idRendicion/detalle/:idRD/adjuntos")
  @ApiOperation({ summary: "Listar adjuntos de una lÃ­nea de rendiciÃ³n" })
  @ApiParam({ name: "idRendicion", description: "ID de la rendiciÃ³n" })
  @ApiParam({ name: "idRD", description: "ID de la lÃ­nea de detalle" })
  @ApiResponse({
    status: 200,
    description: "Lista de adjuntos",
    type: [AdjuntoResponseDto],
  })
  async findByRendicionDetalle(
    @Param("idRendicion", ParseIntPipe) idRendicion: number,
    @Param("idRD", ParseIntPipe) idRD: number,
  ) {
    return this.adjuntosService.findByRendicionDetalle(idRendicion, idRD);
  }

  /**
   * Sube un archivo adjunto
   */
  @Post("rend-m/:idRendicion/detalle/:idRD/adjuntos")
  @ApiOperation({ summary: "Subir archivo adjunto" })
  @ApiParam({ name: "idRendicion", description: "ID de la rendiciÃ³n" })
  @ApiParam({ name: "idRD", description: "ID de la lÃ­nea de detalle" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "Archivo a subir",
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description:
            "Archivo (PDF, JPG, PNG, DOC, DOCX, XLS, XLSX) - Max 10MB",
        },
        descripcion: {
          type: "string",
          description: "DescripciÃ³n opcional del archivo",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Archivo subido exitosamente",
    type: AdjuntoResponseDto,
  })
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @UploadedFile() file: UploadedFileData,
    @Param("idRendicion", ParseIntPipe) idRendicion: number,
    @Param("idRD", ParseIntPipe) idRD: number,
    @Req() req: RequestWithUser,
    @Body() dto: CreateAdjuntoDto,
  ) {
    const username = req.user?.username || String(req.user?.sub);
    const adjunto = await this.adjuntosService.upload(
      file,
      idRendicion,
      idRD,
      username,
      dto,
    );
    return adjunto;
  }

  /**
   * Descarga un archivo adjunto
   */
  @Get("adjuntos/:idAdjunto/download")
  @ApiOperation({ summary: "Descargar archivo adjunto" })
  @ApiParam({ name: "idAdjunto", description: "ID del adjunto" })
  @ApiResponse({ status: 200, description: "Archivo descargado" })
  @ApiResponse({ status: 404, description: "Adjunto no encontrado" })
  async download(
    @Param("idAdjunto", ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { adjunto, buffer } = await this.adjuntosService.download(id);

    res.setHeader("Content-Type", adjunto.tipo);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(adjunto.nombre)}"`,
    );
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  }

  /**
   * Visualiza un archivo adjunto (inline)
   */
  @Get("adjuntos/:idAdjunto/view")
  @ApiOperation({ summary: "Ver archivo adjunto (preview)" })
  @ApiParam({ name: "idAdjunto", description: "ID del adjunto" })
  @ApiResponse({ status: 200, description: "Archivo para visualizar" })
  @ApiResponse({ status: 404, description: "Adjunto no encontrado" })
  async view(
    @Param("idAdjunto", ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { adjunto, buffer } = await this.adjuntosService.download(id);

    res.setHeader("Content-Type", adjunto.tipo);
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  }

  /**
   * Elimina un archivo adjunto
   */
  @Delete("adjuntos/:idAdjunto")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Eliminar archivo adjunto" })
  @ApiParam({ name: "idAdjunto", description: "ID del adjunto" })
  @ApiResponse({ status: 200, description: "Archivo eliminado" })
  @ApiResponse({ status: 403, description: "Sin permisos" })
  @ApiResponse({ status: 404, description: "Adjunto no encontrado" })
  async remove(
    @Param("idAdjunto", ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    const result = await this.adjuntosService.remove(
      id,
      String(req.user?.sub),
      req.user?.role === "ADMIN",
    );
    return result;
  }
}
