import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  Req,
  ForbiddenException,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import type { RequestWithUser } from "@common/types";
import { RendMService } from "./rend-m.service";
import { CreateRendMDto } from "./dto/create-rend-m.dto";
import { UpdateRendMDto } from "./dto/update-rend-m.dto";
import { RendMQueryDto } from "@common/dto/pagination.dto";
import { Roles } from "@auth/decorators/roles.decorator";
import { PerfilesService } from "@modules/perfiles/perfiles.service";

/** Etiqueta legible para el campo U_Trabaja del perfil */
const TRABAJA_LABEL: Record<string, string> = {
  "0": "Moneda Local(BS)",
  "1": "USD",
};

@ApiTags("Rendiciones-M")
@ApiBearerAuth()
@Controller("rend-m")
export class RendMController {
  constructor(
    private readonly rendMService: RendMService,
    private readonly perfilesService: PerfilesService,
  ) {}

  @Get()
  @Roles("ADMIN", "USER")
  @ApiOperation({
    summary:
      "Listar cabeceras de rendiciÃ³n paginadas â€” filtradas por usuario logueado",
  })
  @ApiResponse({
    status: 200,
    description: "Resultado paginado de cabeceras REND_M",
  })
  findAll(@Req() req: RequestWithUser, @Query() query: RendMQueryDto) {
    const estados = query.estados
      ? query.estados
          .split(",")
          .map(Number)
          .filter((n) => !isNaN(n))
      : undefined;
    return this.rendMService.findAll(
      req.user.role,
      String(req.user.sub),
      query.idPerfil,
      query,
      estados,
    );
  }

  /**
   * GET /rend-m/subordinados
   * Rendiciones de los usuarios cuyo U_NomSup = username del autenticado.
   * Usado por aprobadores (ver+editar+aprobar) y usuarios con permiso sync.
   * Query params:
   *   estados  â€” coma separados (ej: "1,4" o "3,5,6"). Default: todos.
   *   idPerfil â€” filtro opcional de perfil
   *   idUsuario â€” filtro opcional por usuario subordinado especÃ­fico
   *   page, limit â€” paginaciÃ³n
   */
  @Get("subordinados")
  @Roles("ADMIN", "USER")
  @ApiOperation({
    summary:
      "Rendiciones de mis subordinados â€” directos (aprobador) o en cascada (sync)",
  })
  findSubordinados(
    @Req() req: RequestWithUser,
    @Query("estados") estadosStr?: string,
    @Query("idPerfil") idPerfilStr?: string,
    @Query("idUsuario") idUsuarioFiltro?: string,
    @Query("page") pageStr?: string,
    @Query("limit") limitStr?: string,
  ) {
    const estados = estadosStr
      ? estadosStr
          .split(",")
          .map(Number)
          .filter((n) => !isNaN(n))
      : [];
    const idPerfil = idPerfilStr ? Number(idPerfilStr) : undefined;
    const page = pageStr ? Number(pageStr) : 1;
    const limit = limitStr ? Number(limitStr) : 50;

    // Usuario sin aprobador (nivel sync) â†’ cascada completa
    // Aprobador con aprobador propio    â†’ solo subordinados directos
    const sinAprobador = !req.user.nomSup?.trim();
    const cascada = sinAprobador;

    return this.rendMService.findSubordinados(
      req.user.username,
      idPerfil,
      estados,
      page,
      limit,
      idUsuarioFiltro || undefined,
      cascada,
    );
  }

  @Get("stats")
  @Roles("ADMIN", "USER")
  @ApiOperation({ summary: "EstadÃ­sticas de rendiciones para el dashboard" })
  getStats(
    @Req() req: RequestWithUser,
    @Query("idPerfil") idPerfilStr?: string,
  ) {
    const isAdmin = req.user.role === "ADMIN";
    const idPerfil = idPerfilStr ? Number(idPerfilStr) : undefined;
    return this.rendMService.getStats(String(req.user.sub), isAdmin, idPerfil);
  }

  @Get(":id")
  @Roles("ADMIN", "USER")
  @ApiOperation({ summary: "Obtener cabecera de rendiciÃ³n por ID" })
  @ApiResponse({ status: 200, description: "Cabecera encontrada" })
  @ApiResponse({ status: 404, description: "No encontrada" })
  async findOne(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    const row = await this.rendMService.findOne(id);
    if (req.user.role === "ADMIN") return row;
    if (row.U_IdUsuario === String(req.user.sub)) return row;

    const esAprobador = req.user.esAprobador === true;
    const sinAprobador = !req.user.nomSup?.trim();

    if (esAprobador) {
      const esSub = await this.rendMService.isSubordinado(
        row.U_IdUsuario,
        req.user.username,
      );
      if (esSub) return row;
    }

    if (sinAprobador) {
      const esSub = await this.rendMService.isSubordinado(
        row.U_IdUsuario,
        req.user.username,
      );
      if (esSub) return row;
    }

    throw new ForbiddenException("No tenÃ©s acceso a esta rendiciÃ³n");
  }

  @Post()
  @Roles("ADMIN", "USER")
  @ApiOperation({ summary: "Crear cabecera de rendiciÃ³n" })
  @ApiResponse({ status: 201, description: "Cabecera creada" })
  async create(@Body() dto: CreateRendMDto, @Req() req: RequestWithUser) {
    const perfil = await this.perfilesService.findOne(dto.idPerfil);
    const trabajaLabel = TRABAJA_LABEL[perfil.U_Trabaja] ?? perfil.U_Trabaja;
    const nombrePerfil = `${perfil.U_NombrePerfil}-${trabajaLabel}`;
    return this.rendMService.create(
      dto,
      String(req.user.sub),
      req.user.name,
      nombrePerfil,
    );
  }

  @Patch(":id")
  @Roles("ADMIN", "USER")
  @ApiOperation({
    summary:
      "Editar cabecera â€” USER edita las suyas en ABIERTO; aprobadores pueden editar las de sus subordinados en ENVIADO",
  })
  @ApiResponse({ status: 200, description: "Cabecera actualizada" })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateRendMDto,
    @Req() req: RequestWithUser,
  ) {
    return this.rendMService.update(
      id,
      dto,
      req.user.role,
      String(req.user.sub),
      req.user.username,
      req.user.esAprobador,
    );
  }

  @Delete(":id")
  @Roles("ADMIN", "USER")
  @ApiOperation({
    summary:
      "Eliminar cabecera â€” USER solo puede eliminar las suyas en estado ABIERTO",
  })
  @ApiResponse({ status: 200, description: "Cabecera eliminada" })
  remove(@Param("id", ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    return this.rendMService.remove(id, req.user.role, String(req.user.sub));
  }
}
