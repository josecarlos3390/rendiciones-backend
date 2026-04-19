import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { SapSlService } from "./sap-sl.service";
import { RendM } from "../rend-m/interfaces/rend-m.interface";
import { RendD } from "../rend-d/interfaces/rend-d.interface";
import { RendPrctj } from "../prctj/interfaces/prctj.interface";
import { SapFieldMapping } from "../rend-cmp/repositories/rend-cmp.repository.interface";

describe("SapSlService", () => {
  let service: SapSlService;

  const mockConfig = {
    get: jest.fn((key: string, fallback?: any) => fallback),
  };

  const mockRendM = (overrides?: Partial<RendM>): RendM => ({
    U_IdRendicion: 1,
    U_IdUsuario: "USER1",
    U_IdPerfil: 1,
    U_NomUsuario: "Juan Perez",
    U_NombrePerfil: "Administrador",
    U_Preliminar: "",
    U_Estado: 1,
    U_Cuenta: "1.1.1.01",
    U_NombreCuenta: "Caja General",
    U_Empleado: "",
    U_NombreEmpleado: "",
    U_FechaIni: "2024-01-01T00:00:00.000Z",
    U_FechaFinal: "2024-01-31T00:00:00.000Z",
    U_Monto: 1000,
    U_Objetivo: "Viaje a Santa Cruz",
    U_FechaCreacion: "2024-01-01T00:00:00.000Z",
    U_FechaMod: "2024-01-01T00:00:00.000Z",
    U_AUXILIAR1: "",
    U_AUXILIAR2: "",
    U_AUXILIAR3: "",
    ...overrides,
  });

  const mockRendD = (overrides?: Partial<RendD>): RendD => ({
    U_RD_IdRD: 1,
    U_RD_RM_IdRendicion: 1,
    U_RD_IdUsuario: 1,
    U_RD_Cuenta: "6.1.1.01",
    U_RD_NombreCuenta: "Combustible",
    U_RD_Concepto: "Carga de combustible",
    U_RD_Importe: 800,
    U_RD_Descuento: 0,
    U_RD_TasaCero: 0,
    U_RD_N1: null,
    U_RD_N2: null,
    U_RD_N3: null,
    U_RD_N4: null,
    U_RD_N5: null,
    U_RD_Proyecto: null,
    U_RD_Fecha: "2024-01-15",
    U_RD_IdTipoDoc: 1,
    U_RD_IdDoc: null,
    U_RD_TipoDoc: 1,
    U_RD_Partida: null,
    U_RD_Exento: 0,
    U_RD_Estado: 1,
    U_RD_ImpRet: 0,
    U_RD_Total: 800,
    U_RD_NumDocumento: "001-001-0001",
    U_RD_NroAutor: null,
    U_RD_Ctrl: null,
    U_RD_NIT: "123456789",
    U_RD_CodProv: null,
    U_RD_Prov: "Shell",
    U_MontoIVA: 119.54,
    U_MontoIT: 0,
    U_MontoIUE: 0,
    U_MontoRCIVA: 0,
    U_CuentaIVA: "2.1.1.01",
    U_CuentaIT: null,
    U_CuentaIUE: null,
    U_CuentaRCIVA: null,
    U_ImporteBs: null,
    U_EXENTOBS: null,
    U_DESCTOBS: null,
    U_CTAEXENTO: "",
    U_RD_AUXILIAR1: "",
    U_RD_AUXILIAR2: "",
    U_RD_AUXILIAR3: "",
    U_RD_AUXILIAR4: "",
    U_TASA: null,
    U_CUF: null,
    U_GIFTCARD: null,
    U_ICE: 0,
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SapSlService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<SapSlService>(SapSlService);
    jest.clearAllMocks();
  });

  describe("buildJournalPayload", () => {
    it("should generate debit + credit lines for a single detail without taxes", () => {
      const rend = mockRendM();
      const det = mockRendD({
        U_RD_Importe: 500,
        U_RD_Total: 500,
        U_MontoIVA: 0,
        U_CuentaIVA: null,
      });

      const payload = service.buildJournalPayload(rend, [det]) as any;
      const lines: any[] =
        payload.JournalVoucher.JournalEntry.JournalEntryLines;

      expect(lines).toHaveLength(2); // 1 débito + 1 contrapartida
      expect(lines[0].Debit).toBe(500);
      expect(lines[0].Credit).toBe(0);
      expect(lines[1].Debit).toBe(0);
      expect(lines[1].Credit).toBe(500);
    });

    it("should include IVA debit line when montoIVA > 0", () => {
      const rend = mockRendM();
      const det = mockRendD({ U_MontoIVA: 119.54 });

      const payload = service.buildJournalPayload(rend, [det]) as any;
      const lines: any[] =
        payload.JournalVoucher.JournalEntry.JournalEntryLines;

      // débito gasto + débito IVA + contrapartida
      expect(lines).toHaveLength(3);
      expect(lines[1].AccountCode).toBe("2.1.1.01");
      expect(lines[1].Debit).toBe(119.54);
      expect(lines[1].Credit).toBe(0);
    });

    it("should subtract IT, RCIVA and IUE as credit lines", () => {
      const rend = mockRendM();
      const det = mockRendD({
        U_MontoIT: 10,
        U_CuentaIT: "2.1.1.02",
        U_MontoRCIVA: 20,
        U_CuentaRCIVA: "2.1.1.03",
        U_MontoIUE: 30,
        U_CuentaIUE: "2.1.1.04",
        U_MontoIVA: 0,
        U_CuentaIVA: null,
      });

      const payload = service.buildJournalPayload(rend, [det]) as any;
      const lines: any[] =
        payload.JournalVoucher.JournalEntry.JournalEntryLines;

      // débito gasto + IT + RCIVA + IUE + contrapartida
      expect(lines).toHaveLength(5);
      expect(lines[1].AccountCode).toBe("2.1.1.02");
      expect(lines[1].Credit).toBe(10);
      expect(lines[2].AccountCode).toBe("2.1.1.03");
      expect(lines[2].Credit).toBe(20);
      expect(lines[3].AccountCode).toBe("2.1.1.04");
      expect(lines[3].Credit).toBe(30);

      // Cuadratura: débito 800 = créditos 60 + contrapartida 740
      expect(lines[4].Credit).toBe(740);
    });

    it("should apply Grossing Up when receipt type and total > importe", () => {
      const rend = mockRendM();
      const det = mockRendD({
        U_RD_IdTipoDoc: 4, // recibo
        U_RD_Importe: 800,
        U_RD_Total: 1000,
        U_RD_ImpRet: 50,
        U_MontoIVA: 0,
        U_CuentaIVA: null,
      });

      const payload = service.buildJournalPayload(rend, [det]) as any;
      const lines: any[] =
        payload.JournalVoucher.JournalEntry.JournalEntryLines;

      // bruto = 1000 (total) porque es GU
      expect(lines[0].Debit).toBe(1000);
      expect(lines[1].Credit).toBe(1000);
    });

    it("should generate distribution lines when PRCTJ entries exist", () => {
      const rend = mockRendM();
      const det = mockRendD({
        U_MontoIVA: 0,
        U_CuentaIVA: null,
      });
      const dists: RendPrctj[] = [
        {
          PRCT_RD_IDRD: 1,
          PRCT_RD_RM_IDREND: 1,
          PRCT_RD_IDUSER: 1,
          PRCT_IDLINEA: 1,
          PRCT_PORCENTAJE: 60,
          PRCT_MONTO: 480,
          PRCT_RD_CUENTA: "6.1.1.02",
          PRCT_RD_NOMCUENTA: "Alimentación",
          PRCT_RD_N1: "",
          PRCT_RD_N2: "",
          PRCT_RD_N3: "",
          PRCT_RD_N4: "",
          PRCT_RD_N5: "",
          PRCT_RD_PROYECTO: "",
          PRCT_RD_AUXILIAR1: "",
          PRCT_RD_AUXILIAR2: "",
          PRCT_RD_AUXILIAR3: "",
          PRCT_RD_AUXILIAR4: "",
        },
        {
          PRCT_RD_IDRD: 1,
          PRCT_RD_RM_IDREND: 1,
          PRCT_RD_IDUSER: 1,
          PRCT_IDLINEA: 2,
          PRCT_PORCENTAJE: 40,
          PRCT_MONTO: 320,
          PRCT_RD_CUENTA: "6.1.1.03",
          PRCT_RD_NOMCUENTA: "Hospedaje",
          PRCT_RD_N1: "",
          PRCT_RD_N2: "",
          PRCT_RD_N3: "",
          PRCT_RD_N4: "",
          PRCT_RD_N5: "",
          PRCT_RD_PROYECTO: "",
          PRCT_RD_AUXILIAR1: "",
          PRCT_RD_AUXILIAR2: "",
          PRCT_RD_AUXILIAR3: "",
          PRCT_RD_AUXILIAR4: "",
        },
      ];
      const distribucionesMap = new Map<number, RendPrctj[]>([[1, dists]]);

      const payload = service.buildJournalPayload(
        rend,
        [det],
        distribucionesMap,
      ) as any;
      const lines: any[] =
        payload.JournalVoucher.JournalEntry.JournalEntryLines;

      // 2 líneas distribución + 1 contrapartida
      expect(lines).toHaveLength(3);
      expect(lines[0].AccountCode).toBe("6.1.1.02");
      expect(lines[1].AccountCode).toBe("6.1.1.03");
    });

    it("should convert amounts when tasaCambio is provided", () => {
      const rend = mockRendM();
      const det = mockRendD({
        U_RD_Importe: 800,
        U_RD_Total: 800,
        U_MontoIVA: 0,
        U_CuentaIVA: null,
      });

      const payload = service.buildJournalPayload(
        rend,
        [det],
        new Map(),
        6.96,
      ) as any;
      const lines: any[] =
        payload.JournalVoucher.JournalEntry.JournalEntryLines;

      // 800 / 6.96 ≈ 114.94 (redondeado a 2 decimales)
      expect(lines[0].Debit).toBe(114.94);
      expect(lines[1].Credit).toBe(114.94);
    });

    it("should use ShortName for final line when empleado is set", () => {
      const rend = mockRendM({ U_Empleado: "EMP001" });
      const det = mockRendD({
        U_RD_Importe: 500,
        U_RD_Total: 500,
        U_MontoIVA: 0,
        U_CuentaIVA: null,
      });

      const payload = service.buildJournalPayload(rend, [det]) as any;
      const lines: any[] =
        payload.JournalVoucher.JournalEntry.JournalEntryLines;

      expect(lines[1].ShortName).toBe("EMP001");
      expect(lines[1].AccountCode).toBeUndefined();
    });

    it("should use AccountCode for final line when empleado is empty", () => {
      const rend = mockRendM({ U_Empleado: "" });
      const det = mockRendD({
        U_RD_Importe: 500,
        U_RD_Total: 500,
        U_MontoIVA: 0,
        U_CuentaIVA: null,
      });

      const payload = service.buildJournalPayload(rend, [det]) as any;
      const lines: any[] =
        payload.JournalVoucher.JournalEntry.JournalEntryLines;

      expect(lines[1].AccountCode).toBe("1.1.1.01");
      expect(lines[1].ShortName).toBeUndefined();
    });

    it("should throw when a detail lacks cuenta contable", () => {
      const rend = mockRendM();
      const det = mockRendD({ U_RD_Cuenta: null });

      expect(() => service.buildJournalPayload(rend, [det])).toThrow(
        /sin cuenta contable asignada/,
      );
    });

    it("should apply field mapping UDFs to final line when mapping provided", () => {
      const rend = mockRendM();
      const det = mockRendD({
        U_RD_Importe: 500,
        U_RD_Total: 500,
        U_MontoIVA: 0,
        U_CuentaIVA: null,
      });
      const mapping: SapFieldMapping = { 7: "U_CARDNAME", 8: "U_IMPORTE" };

      const payload = service.buildJournalPayload(
        rend,
        [det],
        new Map(),
        undefined,
        mapping,
      ) as any;
      const lines: any[] =
        payload.JournalVoucher.JournalEntry.JournalEntryLines;
      const finalLine = lines[lines.length - 1];

      expect(finalLine.U_CARDNAME).toBe("Juan Perez");
      expect(finalLine.U_IMPORTE).toBe(500);
    });

    it("should ensure debit/credit balance", () => {
      const rend = mockRendM();
      const det = mockRendD({
        U_RD_Importe: 1000,
        U_RD_Total: 1000,
        U_MontoIVA: 119.54,
        U_MontoIT: 20,
        U_CuentaIT: "2.1.1.02",
        U_MontoRCIVA: 30,
        U_CuentaRCIVA: "2.1.1.03",
        U_MontoIUE: 40,
        U_CuentaIUE: "2.1.1.04",
      });

      const payload = service.buildJournalPayload(rend, [det]) as any;
      const lines: any[] =
        payload.JournalVoucher.JournalEntry.JournalEntryLines;

      const totalDebits = lines.reduce(
        (sum: number, l: any) => sum + (l.Debit ?? 0),
        0,
      );
      const totalCredits = lines.reduce(
        (sum: number, l: any) => sum + (l.Credit ?? 0),
        0,
      );

      expect(totalDebits).toBeCloseTo(totalCredits, 2);
    });
  });

  describe("makeConv", () => {
    it("should return identity when no tasaCambio", () => {
      const conv = (service as any).makeConv();
      expect(conv(100)).toBe(100);
    });

    it("should return identity when tasaCambio is 0", () => {
      const conv = (service as any).makeConv(0);
      expect(conv(100)).toBe(100);
    });

    it("should divide and round to 2 decimals", () => {
      const conv = (service as any).makeConv(6.96);
      expect(conv(100)).toBe(14.37); // 100/6.96 = 14.3678... → 14.37
    });
  });

  describe("makeUdf", () => {
    it("should return empty object when no mapping", () => {
      const udf = (service as any).makeUdf();
      expect(udf({ 1: "x" })).toEqual({});
    });

    it("should map values by field name", () => {
      const mapping: SapFieldMapping = { 1: "U_CAMPO1", 2: "U_CAMPO2" };
      const udf = (service as any).makeUdf(mapping);
      expect(udf({ 1: "valor1", 2: 42 })).toEqual({
        U_CAMPO1: "valor1",
        U_CAMPO2: 42,
      });
    });

    it("should skip unmapped field ids", () => {
      const mapping: SapFieldMapping = { 1: "U_CAMPO1" };
      const udf = (service as any).makeUdf(mapping);
      expect(udf({ 1: "a", 3: "b" })).toEqual({ U_CAMPO1: "a" });
    });
  });

  describe("validateDetallesCuenta", () => {
    it("should not throw when all details have cuenta", () => {
      const detalles = [mockRendD(), mockRendD({ U_RD_IdRD: 2 })];
      expect(() =>
        (service as any).validateDetallesCuenta(detalles),
      ).not.toThrow();
    });

    it("should throw when any detail lacks cuenta", () => {
      const detalles = [
        mockRendD(),
        mockRendD({ U_RD_IdRD: 2, U_RD_Cuenta: null }),
      ];
      expect(() => (service as any).validateDetallesCuenta(detalles)).toThrow(
        /sin cuenta contable asignada/,
      );
    });
  });

  describe("extractMontos", () => {
    it("should extract all monetary fields with defaults", () => {
      const det = mockRendD({
        U_RD_Importe: 100,
        U_RD_Total: 120,
        U_RD_ImpRet: 5,
        U_MontoIVA: 13,
        U_MontoIT: 2,
        U_MontoRCIVA: 3,
        U_MontoIUE: 4,
        U_RD_Exento: 10,
      });
      const result = (service as any).extractMontos(det);
      expect(result).toEqual({
        importe: 100,
        total: 120,
        impRet: 5,
        montoIVA: 13,
        montoIT: 2,
        montoRCIVA: 3,
        montoIUE: 4,
        exento: 10,
      });
    });

    it("should default null values to 0", () => {
      const det = mockRendD({
        U_RD_Importe: null as any,
        U_RD_Total: null as any,
        U_MontoIVA: null as any,
      });
      const result = (service as any).extractMontos(det);
      expect(result.importe).toBe(0);
      expect(result.total).toBe(0);
      expect(result.montoIVA).toBe(0);
    });
  });

  describe("calcFlags", () => {
    it("should detect GU for receipt type 4 with total > importe and impRet > 0", () => {
      const det = mockRendD({
        U_RD_IdTipoDoc: 4,
        U_RD_Total: 100,
        U_RD_Importe: 80,
        U_RD_ImpRet: 5,
      });
      const flags = (service as any).calcFlags(det, {
        total: 100,
        importe: 80,
        impRet: 5,
      });
      expect(flags.esRecibo).toBe(true);
      expect(flags.esGU).toBe(true);
      expect(flags.bruto).toBe(100);
    });

    it("should not detect GU when importe equals total", () => {
      const det = mockRendD({
        U_RD_IdTipoDoc: 4,
        U_RD_Total: 80,
        U_RD_Importe: 80,
        U_RD_ImpRet: 5,
      });
      const flags = (service as any).calcFlags(det, {
        total: 80,
        importe: 80,
        impRet: 5,
      });
      expect(flags.esGU).toBe(false);
      expect(flags.bruto).toBe(80);
    });

    it("should not detect GU for non-receipt document type", () => {
      const det = mockRendD({
        U_RD_IdTipoDoc: 1,
        U_RD_Total: 100,
        U_RD_Importe: 80,
        U_RD_ImpRet: 5,
      });
      const flags = (service as any).calcFlags(det, {
        total: 100,
        importe: 80,
        impRet: 5,
      });
      expect(flags.esRecibo).toBe(false);
      expect(flags.esGU).toBe(false);
      expect(flags.bruto).toBe(80);
    });
  });

  describe("buildDimensionesPrimeraLinea", () => {
    it("should include all dimensions when present", () => {
      const det = mockRendD({
        U_RD_N1: "CC01",
        U_RD_N2: "N2",
        U_RD_N3: "N3",
        U_RD_N4: "N4",
        U_RD_N5: "N5",
        U_RD_Proyecto: "PROY1",
      });
      const dims = (service as any).buildDimensionesPrimeraLinea(det);
      expect(dims).toEqual({
        CostingCode: "CC01",
        CostingCode2: "N2",
        CostingCode3: "N3",
        CostingCode4: "N4",
        CostingCode5: "N5",
        ProjectCode: "PROY1",
      });
    });

    it("should return empty object when no dimensions", () => {
      const dims = (service as any).buildDimensionesPrimeraLinea(mockRendD());
      expect(dims).toEqual({});
    });
  });
});
