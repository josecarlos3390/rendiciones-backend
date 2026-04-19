import {
  Controller,
  Get,
  Post,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiQuery,
} from "@nestjs/swagger";
import { SAP_SERVICE } from "./sap.tokens";
import { SapService } from "./sap.service";
import { Roles } from "../../auth/decorators/roles.decorator";

@ApiTags("SAP")
@ApiBearerAuth()
@Controller("sap")
export class SapController {
  constructor(
    @Inject(SAP_SERVICE)
    private readonly sapService: SapService,
  ) {}

  @Get("dimensions")
  @Roles("ADMIN", "USER")
  @ApiOperation({
    summary:
      "Dimensiones activas con normas de reparto (SAP o Postgres según APP_MODE)",
  })
  getDimensions() {
    return this.sapService.getActiveDimensionsWithRules();
  }

  @Post("dimensions/refresh")
  @Roles("ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Limpia caché de dimensiones (solo modo ONLINE)" })
  refreshDimensions() {
    this.sapService.clearCache();
    return this.sapService.getActiveDimensionsWithRules();
  }

  @Get("chart-of-accounts")
  @Roles("ADMIN", "USER")
  @ApiOperation({ summary: "Plan de cuentas (SAP o Postgres según APP_MODE)" })
  getChartOfAccounts() {
    return this.sapService.getChartOfAccounts();
  }

  @Get("empleados")
  @ApiOperation({
    summary: "Empleados filtrados según perfil (SAP o Postgres según APP_MODE)",
  })
  getEmpleados(@Query("car") car: string, @Query("filtro") filtro: string) {
    return this.sapService.getEmpleados(car ?? "EMPIEZA", filtro ?? "");
  }

  @Get("empleados-all")
  @ApiOperation({
    summary: "Todos los empleados del perfil paginados desde SAP SL",
  })
  getEmpleadosAll(@Query("car") car: string, @Query("filtro") filtro: string) {
    return this.sapService.getEmpleadosPaginado(car ?? "EMPIEZA", filtro ?? "");
  }

  @Get("proveedores")
  @ApiOperation({
    summary:
      "Proveedores filtrados según perfil (SAP o Postgres según APP_MODE)",
  })
  getProveedores(
    @Query("car") car: string,
    @Query("filtro") filtro: string,
    @Query("busqueda") busqueda: string,
  ) {
    return this.sapService.getProveedores(
      car ?? "TODOS",
      filtro ?? "",
      busqueda ?? "",
    );
  }

  @Get("proveedores-all")
  @ApiOperation({
    summary: "Todos los proveedores del perfil paginados desde SAP SL",
  })
  getProveedoresAll(
    @Query("car") car: string,
    @Query("filtro") filtro: string,
  ) {
    return this.sapService.getProveedoresPaginado(car ?? "TODOS", filtro ?? "");
  }

  @Get("cuentas")
  @ApiOperation({
    summary:
      "Cuentas del plan contable filtradas por perfil (SAP o Postgres según APP_MODE)",
  })
  @ApiQuery({ name: "cueCar", required: true, example: "EMPIEZA" })
  @ApiQuery({ name: "cueTexto", required: false, example: "/1/2/5/6/8" })
  @ApiQuery({ name: "busqueda", required: false, example: "caja" })
  @ApiQuery({
    name: "lista",
    required: false,
    description: "JSON de CuentaDto[] para cueCar=LISTA",
  })
  async getCuentas(
    @Query("cueCar") cueCar: string,
    @Query("cueTexto") cueTexto: string,
    @Query("busqueda") busqueda: string,
    @Query("lista") lista: string,
  ) {
    let listaCuentas = [];
    if (lista) {
      try {
        listaCuentas = JSON.parse(lista);
      } catch {
        listaCuentas = [];
      }
    }
    return this.sapService.getCuentasByPerfil(
      { cueCar: cueCar ?? "TODOS", cueTexto: cueTexto ?? null },
      busqueda ?? "",
      listaCuentas,
    );
  }

  @Get("projects")
  @ApiOperation({ summary: "Proyectos activos desde SAP SL" })
  getProjects() {
    return this.sapService.getProjects();
  }

  @Get("cuentas-all")
  @ApiOperation({
    summary:
      "Todas las cuentas del plan contable filtradas por perfil, paginadas desde SAP SL",
  })
  @ApiQuery({ name: "cueCar", required: true, example: "EMPIEZA" })
  @ApiQuery({ name: "cueTexto", required: false, example: "/1/2/5/6/8" })
  @ApiQuery({
    name: "lista",
    required: false,
    description: "JSON de CuentaDto[] para cueCar=LISTA",
  })
  async getCuentasAll(
    @Query("cueCar") cueCar: string,
    @Query("cueTexto") cueTexto: string,
    @Query("lista") lista: string,
  ) {
    let listaCuentas = [];
    if (lista) {
      try {
        listaCuentas = JSON.parse(lista);
      } catch {
        listaCuentas = [];
      }
    }
    return this.sapService.getCuentasPaginado(
      { cueCar: cueCar ?? "TODOS", cueTexto: cueTexto ?? null },
      listaCuentas,
    );
  }
}
