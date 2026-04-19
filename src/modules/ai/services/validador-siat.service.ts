import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { AiConfigService } from "./ai-config.service";
import { ClaudeService } from "./claude.service";
import {
  ValidacionSiatResponse,
  DatosSiat,
  Discrepancia,
  SiatConsultaResult,
} from "../interfaces/validacion-siat.interface";

/**
 * Servicio para validar facturas contra el SIAT
 * Funciona tanto en modo ONLINE como OFFLINE (usa API pública del SIAT)
 */
@Injectable()
export class ValidadorSiatService {
  private readonly logger = new Logger(ValidadorSiatService.name);

  constructor(
    private readonly aiConfig: AiConfigService,
    private readonly claudeService: ClaudeService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Valida una factura contra el SIAT
   * @param cuf Código Único de Factura
   * @param datosPdf Datos extraídos del PDF para comparar
   * @returns Resultado de la validación
   */
  async validarFactura(
    cuf: string,
    datosPdf?: {
      nit?: string;
      numeroFactura?: string;
      fecha?: string;
      monto?: number;
    },
  ): Promise<ValidacionSiatResponse> {
    this.logger.log(`Validando factura CUF: ${cuf.substring(0, 20)}...`);

    try {
      // 1. Consultar SIAT
      const resultadoSiat = await this.consultarSiat(cuf);

      if (!resultadoSiat.success || !resultadoSiat.data) {
        return {
          valido: false,
          estadoSIAT: "NO_ENCONTRADA",
          datosSIAT: null,
          datosPDF: datosPdf || {},
          discrepancias: [],
          recomendacion:
            "La factura no fue encontrada en el SIAT. Verifique el CUF o el número de factura.",
          riesgo: "alto",
          timestamp: new Date().toISOString(),
        };
      }

      const datosSIAT = resultadoSiat.data;

      // 2. Si no hay datos PDF para comparar, solo retornar datos del SIAT
      if (!datosPdf) {
        return {
          valido: true,
          estadoSIAT: datosSIAT.estado,
          datosSIAT,
          datosPDF: {},
          discrepancias: [],
          recomendacion: "Factura verificada en SIAT.",
          riesgo: "bajo",
          timestamp: new Date().toISOString(),
        };
      }

      // 3. Comparar campos
      const discrepancias = this.compararDatos(datosPdf, datosSIAT);

      // 4. Si hay discrepancias y IA está habilitada, analizar con Claude
      let recomendacion = "Factura verificada correctamente.";
      let riesgo: "bajo" | "medio" | "alto" = "bajo";

      if (discrepancias.length > 0 && this.aiConfig.enabled) {
        const analisis = await this.analizarDiscrepanciasConIA(
          discrepancias,
          datosPdf,
          datosSIAT,
        );
        recomendacion = analisis.recomendacion;
        riesgo = analisis.riesgo;
      } else if (discrepancias.length > 0) {
        // Sin IA, usar reglas simples
        recomendacion = this.generarRecomendacionSimple(discrepancias);
        riesgo = this.calcularRiesgo(discrepancias);
      }

      return {
        valido: discrepancias.length === 0,
        estadoSIAT: datosSIAT.estado,
        datosSIAT,
        datosPDF: datosPdf,
        discrepancias,
        recomendacion,
        riesgo,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      this.logger.error(
        `Error validando factura: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Consulta el SIAT para obtener datos de una factura
   * Usa la API pública del SIAT de Bolivia
   */
  private async consultarSiat(cuf: string): Promise<SiatConsultaResult> {
    try {
      // Endpoint de consulta del SIAT (Bolivia)
      // Nota: Este es un endpoint de ejemplo, el real puede variar
      const url = `https://siat.impuestos.gob.bo/consulta/QR`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: { cuf },
          timeout: 10000,
        }),
      );

      // Parsear respuesta del SIAT
      // La estructura real dependerá de la API del SIAT
      const data = response.data as Record<string, unknown>;

      return {
        success: true,
        data: {
          nit: String(data.nit || ""),
          numero: String(data.numeroFactura || ""),
          cuf: String(data.cuf || cuf),
          fecha: String(data.fecha || ""),
          monto: parseFloat(String(data.montoTotal || "0")) || 0,
          estado: String(data.estado || "VIGENTE"),
          razonSocial: String(data.razonSocialEmisor || ""),
          codigoControl: String(data.codigoControl || ""),
        },
      };
    } catch (error: unknown) {
      this.logger.warn(
        `Error consultando SIAT: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Por ahora, simulamos datos para desarrollo
      // En producción, esto debería manejar el error real
      if (process.env.NODE_ENV === "development") {
        return {
          success: true,
          data: {
            nit: "123456789",
            numero: "001-001-0001234",
            cuf: cuf,
            fecha: "2026-04-05",
            monto: 1150.5,
            estado: "VIGENTE",
            razonSocial: "EMPRESA DEMO SRL",
            codigoControl: "AB-12-CD-34",
          },
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Compara los datos del PDF con los del SIAT
   */
  private compararDatos(
    datosPdf: {
      nit?: string;
      numeroFactura?: string;
      fecha?: string;
      monto?: number;
    },
    datosSiat: DatosSiat,
  ): Discrepancia[] {
    const discrepancias: Discrepancia[] = [];

    // Comparar NIT
    if (datosPdf.nit && datosPdf.nit !== datosSiat.nit) {
      discrepancias.push({
        campo: "nit",
        pdf: datosPdf.nit,
        siat: datosSiat.nit,
        explicacion: "", // Se llena con IA o reglas simples
      });
    }

    // Comparar número de factura
    if (datosPdf.numeroFactura && datosPdf.numeroFactura !== datosSiat.numero) {
      discrepancias.push({
        campo: "numero",
        pdf: datosPdf.numeroFactura,
        siat: datosSiat.numero,
        explicacion: "",
      });
    }

    // Comparar fecha
    if (datosPdf.fecha && datosPdf.fecha !== datosSiat.fecha) {
      discrepancias.push({
        campo: "fecha",
        pdf: datosPdf.fecha,
        siat: datosSiat.fecha,
        explicacion: "",
      });
    }

    // Comparar monto (con tolerancia de 1%)
    if (datosPdf.monto) {
      const diferencia = Math.abs(datosPdf.monto - datosSiat.monto);
      const porcentajeDiferencia = (diferencia / datosSiat.monto) * 100;

      if (porcentajeDiferencia > 1) {
        discrepancias.push({
          campo: "monto",
          pdf: datosPdf.monto,
          siat: datosSiat.monto,
          explicacion: "",
        });
      }
    }

    return discrepancias;
  }

  /**
   * Analiza discrepancias usando Claude
   */
  private async analizarDiscrepanciasConIA(
    discrepancias: Discrepancia[],
    datosPdf: {
      nit?: string;
      numeroFactura?: string;
      fecha?: string;
      monto?: number;
    },
    datosSiat: DatosSiat,
  ): Promise<{ recomendacion: string; riesgo: "bajo" | "medio" | "alto" }> {
    try {
      // Preparar prompt para Claude
      const prompt = this.buildAnalisisPrompt(
        discrepancias,
        datosPdf,
        datosSiat,
      );

      // Llamar a Claude
      const respuesta = await this.claudeService.analizarDiscrepancias(prompt);

      // Parsear respuesta
      return this.parsearAnalisisIA(respuesta);
    } catch (error: unknown) {
      this.logger.warn(
        `Error analizando con IA: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Fallback a reglas simples
      return {
        recomendacion: this.generarRecomendacionSimple(discrepancias),
        riesgo: this.calcularRiesgo(discrepancias),
      };
    }
  }

  /**
   * Construye el prompt para Claude
   */
  private buildAnalisisPrompt(
    discrepancias: Discrepancia[],
    datosPdf: {
      nit?: string;
      numeroFactura?: string;
      fecha?: string;
      monto?: number;
    },
    datosSiat: DatosSiat,
  ): string {
    return `Analiza las siguientes discrepancias entre una factura PDF y los datos oficiales del SIAT:

DATOS DEL PDF:
- NIT: ${datosPdf.nit || "No proporcionado"}
- Número: ${datosPdf.numeroFactura || "No proporcionado"}
- Fecha: ${datosPdf.fecha || "No proporcionada"}
- Monto: ${datosPdf.monto || "No proporcionado"}

DATOS DEL SIAT:
- NIT: ${datosSiat.nit}
- Número: ${datosSiat.numero}
- Fecha: ${datosSiat.fecha}
- Monto: ${datosSiat.monto}
- Estado: ${datosSiat.estado}

DISCREPANCIAS ENCONTRADAS:
${discrepancias.map((d) => `- ${d.campo}: PDF=${d.pdf}, SIAT=${d.siat}`).join("\n")}

Responde con un JSON:
{
  "explicaciones": [
    { "campo": "...", "explicacion": "..." }
  ],
  "recomendacion": "texto recomendando acción",
  "riesgo": "bajo|medio|alto"
}`;
  }

  /**
   * Parsea la respuesta de Claude
   */
  private parsearAnalisisIA(respuesta: string): {
    recomendacion: string;
    riesgo: "bajo" | "medio" | "alto";
  } {
    try {
      const cleanJson = respuesta
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      const parsed = JSON.parse(cleanJson);

      return {
        recomendacion:
          parsed.recomendacion || "Verificar discrepancias encontradas.",
        riesgo: ["bajo", "medio", "alto"].includes(parsed.riesgo)
          ? parsed.riesgo
          : "medio",
      };
    } catch {
      return {
        recomendacion: "Verificar discrepancias encontradas.",
        riesgo: "medio",
      };
    }
  }

  /**
   * Genera recomendación simple sin IA
   */
  private generarRecomendacionSimple(discrepancias: Discrepancia[]): string {
    const campos = discrepancias.map((d) => d.campo).join(", ");
    return `Se encontraron diferencias en: ${campos}. Verifique los datos ingresados.`;
  }

  /**
   * Calcula nivel de riesgo basado en discrepancias
   */
  private calcularRiesgo(
    discrepancias: Discrepancia[],
  ): "bajo" | "medio" | "alto" {
    const camposCriticos = ["nit", "monto"];
    const tieneCritico = discrepancias.some((d) =>
      camposCriticos.includes(d.campo),
    );

    if (tieneCritico) return "alto";
    if (discrepancias.length > 1) return "medio";
    return "bajo";
  }
}
