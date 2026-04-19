import { Injectable, Logger } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import { AiConfigService } from "./ai-config.service";
import { InvoiceData } from "../interfaces/pdf-result.interface";

export type CuentaIA = {
  id?: number;
  code?: string;
  cuenta?: string;
  name?: string;
  descripcion?: string;
  formatCode?: string;
  type?: string;
};
export type ProyectoIA = {
  idProyecto?: number | string;
  code?: string;
  name?: string;
  descripcion?: string;
};
export type NormaIA = { idNorma?: number; id?: number; descripcion?: string };
export type HistorialIA = { concepto: string; cuenta: string; norma?: string };

interface ChatContexto {
  usuario?: { nombre?: string; departamento?: string };
  statsMes?: {
    mes?: string;
    totalGastado?: number;
    cantidadRendiciones?: number;
  };
  modo?: string;
  [key: string]: unknown;
}

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private client: Anthropic | null = null;

  constructor(private readonly config: AiConfigService) {
    if (this.config.isAnthropicConfigured) {
      this.client = new Anthropic({
        apiKey: this.config.anthropicApiKey,
      });
    }
  }

  /**
   * Extrae datos de factura desde texto usando Claude
   */
  async extractInvoiceData(
    textContent: string,
    filename: string,
  ): Promise<{ data: InvoiceData; confidence: number }> {
    if (!this.client) {
      throw new Error("Claude no está configurado");
    }

    try {
      this.logger.log(`Procesando factura con Claude: ${filename}`);

      const response = await this.client.messages.create({
        model: this.config.anthropicModel,
        max_tokens: 1000,
        temperature: 0.1, // Baja temperatura para respuestas más consistentes
        system: this.getSystemPrompt(),
        messages: [
          {
            role: "user",
            content: this.getUserPrompt(textContent),
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Respuesta inesperada de Claude");
      }

      const result = this.parseResponse(content.text);
      this.logger.log(`Factura procesada exitosamente: ${filename}`);

      return result;
    } catch (error: unknown) {
      this.logger.error(
        `Error procesando con Claude: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Extrae datos de factura desde imagen (base64)
   */
  async extractInvoiceFromImage(
    base64Image: string,
    filename: string,
  ): Promise<{ data: InvoiceData; confidence: number }> {
    if (!this.client) {
      throw new Error("Claude no está configurado");
    }

    try {
      this.logger.log(`Procesando imagen con Claude: ${filename}`);

      const response = await this.client.messages.create({
        model: this.config.anthropicModel,
        max_tokens: 1000,
        temperature: 0.1,
        system: this.getSystemPrompt(),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: base64Image,
                },
              },
              {
                type: "text",
                text: this.getImagePrompt(),
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Respuesta inesperada de Claude");
      }

      const result = this.parseResponse(content.text);
      this.logger.log(`Imagen procesada exitosamente: ${filename}`);

      return result;
    } catch (error: unknown) {
      this.logger.error(
        `Error procesando imagen con Claude: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Prompt del sistema para Claude
   */
  private getSystemPrompt(): string {
    return `Eres un asistente especializado en extraer información de facturas comerciales de Bolivia y otros países latinoamericanos.

Tu tarea es analizar facturas y extraer los siguientes campos:
- nit: NIT o RUC del emisor/proveedor (solo números, sin guiones)
- razonSocial: Razón social o nombre del emisor
- numeroFactura: Número de factura
- fecha: Fecha de emisión en formato YYYY-MM-DD
- monto: Monto total (solo número, sin símbolos de moneda)
- concepto: Descripción del servicio o producto
- codigoControl: Código de control (Bolivia) o null si no existe
- cuf: CUF (Código Único de Factura) de Bolivia - ES MUY IMPORTANTE extraer esto si está visible en la factura

REGLAS IMPORTANTES:
1. Responde ÚNICAMENTE con un objeto JSON válido
2. NO incluyas explicaciones, comentarios ni markdown
3. Usa null para campos que no puedas identificar
4. El monto debe ser número decimal (ej: 1234.56)
5. La fecha debe estar en formato ISO 8601 (YYYY-MM-DD)
6. El CUF es un código de ~32-64 caracteres alfanuméricos, generalmente está junto al QR o en la parte superior de la factura
7. Incluye un campo "confianza" con valor entre 0 y 1 indicando tu certeza total

Ejemplo de respuesta válida:
{"nit":"123456789","razonSocial":"EMPRESA SRL","numeroFactura":"001-001-0001234","fecha":"2024-03-15","monto":1250.50,"concepto":"Servicios de consultoría","codigoControl":"AB-12-CD-34","cuf":"A1B2C3D4E5F6...","confianza":0.95}`;
  }

  /**
   * Prompt para extracción de texto
   */
  private getUserPrompt(textContent: string): string {
    return `Analiza el siguiente texto extraído de una factura y extrae la información requerida:

TEXTO DE LA FACTURA:
---
${textContent}
---

Responde con el objeto JSON siguiendo las reglas del sistema.`;
  }

  /**
   * Prompt para extracción de imagen
   */
  private getImagePrompt(): string {
    return `Analiza esta imagen de factura y extrae la información requerida según las reglas del sistema. Responde con el objeto JSON.`;
  }

  /**
   * Parsea la respuesta de Claude
   */
  private parseResponse(responseText: string): {
    data: InvoiceData;
    confidence: number;
  } {
    try {
      // Limpiar respuesta (quitar markdown si existe)
      const cleanJson = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const parsed = JSON.parse(cleanJson);

      // Extraer confianza y eliminarla del objeto data
      const confidence = parsed.confianza || parsed.confidence || 0.8;
      delete parsed.confianza;
      delete parsed.confidence;

      // Validar y limpiar datos
      const data: InvoiceData = {
        nit: parsed.nit || undefined,
        razonSocial: parsed.razonSocial || undefined,
        numeroFactura: parsed.numeroFactura || undefined,
        fecha: parsed.fecha || undefined,
        monto: typeof parsed.monto === "number" ? parsed.monto : undefined,
        concepto: parsed.concepto || undefined,
        codigoControl: parsed.codigoControl || null,
        cuf: parsed.cuf || null,
      };

      return { data, confidence };
    } catch (error: unknown) {
      this.logger.error(
        `Error parseando respuesta de Claude: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.logger.debug(`Respuesta recibida: ${responseText}`);
      throw new Error(
        `No se pudo parsear la respuesta de Claude: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Sugiere clasificación contable basada en el concepto del gasto
   */
  async sugerirClasificacion(context: {
    concepto: string;
    monto: number;
    proveedor?: string;
    esOnline: boolean;
    cuentasDisponibles: CuentaIA[];
    proyectosDisponibles?: ProyectoIA[];
    normasDisponibles?: NormaIA[];
    historialUsuario: HistorialIA[];
  }): Promise<{
    cuentaContable: {
      id: string;
      codigo: string;
      nombre: string;
      confianza: number;
    };
    norma?: { idNorma: number; descripcion: string; confianza: number };
    proyecto?: {
      id: string;
      codigo: string;
      nombre: string;
      confianza: number;
    } | null;
    razon: string;
  }> {
    if (!this.client) {
      throw new Error("Claude no está configurado");
    }

    try {
      this.logger.log(`Sugiriendo clasificación para: ${context.concepto}`);

      const response = await this.client.messages.create({
        model: this.config.anthropicModel,
        max_tokens: 1500,
        temperature: 0.2,
        system: this.getClasificadorSystemPrompt(context.esOnline),
        messages: [
          {
            role: "user",
            content: this.getClasificadorUserPrompt(context),
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Respuesta inesperada de Claude");
      }

      const result = this.parseClasificacionResponse(content.text);
      this.logger.log(
        `Clasificación sugerida: ${result.cuentaContable.codigo} (${result.cuentaContable.confianza})`,
      );

      return result;
    } catch (error: unknown) {
      this.logger.error(
        `Error sugiriendo clasificación: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Prompt del sistema para el clasificador
   */
  private getClasificadorSystemPrompt(esOnline: boolean): string {
    const modoDesc = esOnline
      ? "modo ONLINE con SAP Business One (usas ChartOfAccounts, Dimensions, Projects)"
      : "modo OFFLINE con base de datos local (usas COA, Normas, Proyectos)";

    return `Eres un asistente contable experto especializado en clasificación de gastos para empresas bolivianas.

Estás operando en ${modoDesc}.

Tu tarea es analizar un gasto y sugerir la cuenta contable más adecuada basándote en:
1. El concepto/descripción del gasto
2. El monto
3. El proveedor (si se proporciona)
4. El historial de clasificaciones del usuario
5. Las cuentas contables disponibles en el catálogo

REGLAS IMPORTANTES:
1. Responde ÚNICAMENTE con un objeto JSON válido
2. NO incluyas explicaciones, comentarios ni markdown
3. Usa null para campos opcionales que no puedas sugerir
4. La confianza debe ser un número entre 0.0 y 1.0
5. Si no estás seguro, usa confianza baja (< 0.6)
6. Justifica tu sugerencia en el campo "razon"

Estructura de respuesta requerida:
{
  "cuentaContable": { "id": "...", "codigo": "...", "nombre": "...", "confianza": 0.0-1.0 },
  "norma": { "idNorma": number, "descripcion": "...", "confianza": 0.0-1.0 } | null,
  "proyecto": { "id": "...", "codigo": "...", "nombre": "...", "confianza": 0.0-1.0 } | null,
  "razon": "Explicación breve de por qué sugieres esta cuenta"
}

Notas:
- La norma solo aplica en modo OFFLINE; en modo ONLINE usa null
- El proyecto es opcional; si no aplica, devuelve null
- Usa patrones del historial del usuario cuando estén disponibles`;
  }

  /**
   * Prompt de usuario para el clasificador
   */
  private getClasificadorUserPrompt(context: {
    concepto: string;
    monto: number;
    proveedor?: string;
    esOnline: boolean;
    cuentasDisponibles: CuentaIA[];
    proyectosDisponibles?: ProyectoIA[];
    normasDisponibles?: NormaIA[];
    historialUsuario: HistorialIA[];
  }): string {
    const cuentasStr = context.cuentasDisponibles
      .map((c) => `- ${c.code || c.cuenta}: ${c.name || c.descripcion}`)
      .join("\n");

    const normasStr =
      !context.esOnline && context.normasDisponibles
        ? "\n\nNORMAS DISPONIBLES:\n" +
          context.normasDisponibles
            .map((n) => `- ${n.idNorma}: ${n.descripcion}`)
            .join("\n")
        : "";

    const proyectosStr = context.proyectosDisponibles?.length
      ? "\n\nPROYECTOS DISPONIBLES:\n" +
        context.proyectosDisponibles
          .map((p) => `- ${p.code || p.idProyecto}: ${p.name || p.descripcion}`)
          .join("\n")
      : "";

    const historialStr = context.historialUsuario.length
      ? "\n\nHISTORIAL DE CLASIFICACIONES DEL USUARIO (últimas " +
        context.historialUsuario.length +
        "):\n" +
        context.historialUsuario
          .map(
            (h) =>
              `- "${h.concepto}" → Cuenta: ${h.cuenta}${context.esOnline ? "" : ", Norma: " + h.norma}`,
          )
          .join("\n")
      : "";

    return `GASTO A CLASIFICAR:
- Concepto: "${context.concepto}"
- Monto: ${context.monto} Bs.
- Proveedor: ${context.proveedor || "No especificado"}
- Modo: ${context.esOnline ? "ONLINE (SAP)" : "OFFLINE (local)"}

CUENTAS CONTABLES DISPONIBLES:
${cuentasStr}${normasStr}${proyectosStr}${historialStr}

Responde con el JSON de clasificación sugerida.`;
  }

  /**
   * Analiza una rendición para asistir al aprobador
   */
  async analizarRendicion(contexto: {
    idRendicion: number;
    rendicion: {
      monto: number;
      fecha: string;
      estado: string;
      descripcion?: string;
    };
    solicitante: {
      id: string;
      nombre: string;
      departamento?: string;
      fechaRegistro: string;
    };
    historial: Array<{
      idRendicion: number;
      monto: number;
      estado: string;
      fecha: string;
    }>;
    facturas: Array<{
      nit: string;
      proveedor: string;
      monto: number;
      cuf?: string;
      validadoSiat?: boolean;
    }>;
    statsDepartamento?: { montoPromedio: number; cantidadRendiciones: number };
    esOnline: boolean;
  }): Promise<{
    scoreRiesgo: number;
    nivel: "bajo" | "medio" | "alto";
    recomendacion: "aprobar" | "rechazar" | "revisar";
    justificacion: string;
    factoresPositivos: string[];
    factoresRiesgo: string[];
    alertas: string[];
  }> {
    if (!this.client) {
      throw new Error("Claude no está configurado");
    }

    try {
      this.logger.log(
        `Analizando rendición ${contexto.idRendicion} con Claude`,
      );

      const prompt = this.buildAnalisisRendicionPrompt(contexto);

      const response = await this.client.messages.create({
        model: this.config.anthropicModel,
        max_tokens: 2000,
        temperature: 0.2,
        system: `Eres un asistente experto en auditoría y aprobación de rendiciones de gastos.

Tu tarea es analizar rendiciones y proporcionar recomendaciones objetivas a los aprobadores.

REGLAS IMPORTANTES:
1. Sé objetivo y basa tus análisis en datos
2. Detecta anomalías pero no seas excesivamente restrictivo
3. Considera el contexto histórico del solicitante
4. Una rendición no debe rechazarse solo por ser mayor al promedio si tiene justificación
5. Responde ÚNICAMENTE con el JSON solicitado

Criterios de riesgo:
- BAJO: Solicitante con buen historial, montos razonables, facturas válidas
- MEDIO: Algunas variaciones o facturas sin validar, pero nada crítico
- ALTO: Montos muy superiores al historial, facturas sin CUF, patrones sospechosos`,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Respuesta inesperada de Claude");
      }

      const resultado = this.parseAnalisisRendicionResponse(content.text);
      this.logger.log(
        `Análisis completado: Score ${resultado.scoreRiesgo}, Nivel ${resultado.nivel}`,
      );

      return resultado;
    } catch (error: unknown) {
      this.logger.error(
        `Error analizando rendición: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Construye el prompt para análisis de rendición
   */
  private buildAnalisisRendicionPrompt(contexto: {
    idRendicion: number;
    rendicion: {
      monto: number;
      fecha: string;
      estado: string;
      descripcion?: string;
    };
    solicitante: {
      id: string;
      nombre: string;
      departamento?: string;
      fechaRegistro: string;
    };
    historial: Array<{
      idRendicion: number;
      monto: number;
      estado: string;
      fecha: string;
    }>;
    facturas: Array<{
      nit: string;
      proveedor: string;
      monto: number;
      cuf?: string;
      validadoSiat?: boolean;
    }>;
    statsDepartamento?: { montoPromedio: number; cantidadRendiciones: number };
    esOnline: boolean;
  }): string {
    const promedioHistorial =
      contexto.historial.length > 0
        ? contexto.historial.reduce((sum, h) => sum + h.monto, 0) /
          contexto.historial.length
        : 0;

    const tasaAprobacion =
      contexto.historial.length > 0
        ? (contexto.historial.filter((h) => h.estado === "APROBADA").length /
            contexto.historial.length) *
          100
        : 0;

    return `Analiza la siguiente rendición y proporciona una recomendación:

RENDICIÓN A ANALIZAR:
- ID: ${contexto.idRendicion}
- Monto: ${contexto.rendicion.monto} Bs.
- Descripción: ${contexto.rendicion.descripcion || "No proporcionada"}
- Fecha: ${contexto.rendicion.fecha}

SOLICITANTE:
- Nombre: ${contexto.solicitante.nombre}
- Departamento: ${contexto.solicitante.departamento || "No especificado"}
- Antigüedad: ${this.calcularMeses(contexto.solicitante.fechaRegistro)} meses

HISTORIAL DEL SOLICITANTE (${contexto.historial.length} rendiciones):
${contexto.historial.map((h) => `- Rendición ${h.idRendicion}: ${h.monto} Bs. (${h.estado}) - ${h.fecha}`).join("\n")}

ESTADÍSTICAS:
- Monto promedio historial: ${promedioHistorial.toFixed(2)} Bs.
- Tasa de aprobación: ${tasaAprobacion.toFixed(0)}%
- Monto promedio departamento: ${contexto.statsDepartamento?.montoPromedio || 0} Bs.
- Variación vs promedio: ${promedioHistorial > 0 ? (((contexto.rendicion.monto - promedioHistorial) / promedioHistorial) * 100).toFixed(0) : 0}%

FACTURAS (${contexto.facturas.length}):
${contexto.facturas.map((f) => `- ${f.proveedor}: ${f.monto} Bs. (NIT: ${f.nit}) ${f.validadoSiat ? "✓ Validada SIAT" : "✗ Sin validar"} ${f.cuf ? "" : "- SIN CUF"}`).join("\n")}

MODO: ${contexto.esOnline ? "ONLINE (con SAP)" : "OFFLINE (local)"}

Responde con este JSON exacto:
{
  "scoreRiesgo": número entre 0-100 (menor es mejor),
  "nivel": "bajo" | "medio" | "alto",
  "recomendacion": "aprobar" | "rechazar" | "revisar",
  "justificacion": "explicación detallada de la recomendación",
  "factoresPositivos": ["factor 1", "factor 2", ...],
  "factoresRiesgo": ["riesgo 1", "riesgo 2", ...],
  "alertas": ["alerta 1", "alerta 2", ...]
}`;
  }

  /**
   * Calcula meses desde una fecha
   */
  private calcularMeses(fecha: string): number {
    const date = new Date(fecha);
    const now = new Date();
    return Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 30),
    );
  }

  /**
   * Procesa consulta de chat
   */
  async procesarChat(contexto: {
    mensaje: string;
    historial: Array<{ rol: string; contenido: string }>;
    contexto: ChatContexto;
  }): Promise<{
    mensaje: string;
    tipo: string;
    datos?: unknown;
    sugerencias?: string[];
  }> {
    if (!this.client) {
      throw new Error("Claude no está configurado");
    }

    try {
      this.logger.log(
        `Procesando chat: "${contexto.mensaje.substring(0, 50)}..."`,
      );

      const prompt = this.buildChatPrompt(contexto);

      const response = await this.client.messages.create({
        model: this.config.anthropicModel,
        max_tokens: 1500,
        temperature: 0.7,
        system: `Eres un asistente virtual amigable y profesional para el sistema de rendiciones.

REGLAS DE FORMATO:
1. Responde en español de forma clara y concisa
2. Usa formato Markdown para estructurar tus respuestas:
   - **Negrita** para títulos o énfasis importantes
   - Listas con guiones (-) para items
   - Saltos de línea para separar párrafos
   - Emojis ocasionales para hacerlo amigable
3. Ejemplo de buen formato:
   "**Resumen de tu rendición:**
   
   📊 Este mes has gastado **Bs. 5,000**.
   
   **Detalles:**
   - 3 rendiciones creadas
   - 2 aprobadas
   - 1 pendiente
   
   ¿Necesitas algo más?"
4. Si no sabes algo, di que no tienes esa información
5. No inventes datos que no estén en el contexto

CONTEXTO DISPONIBLE:
- Datos del usuario (nombre, departamento)
- Estadísticas de gastos del mes
- Rendiciones recientes
- Presupuesto (solo modo ONLINE)`,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Respuesta inesperada");
      }

      return this.parseChatResponse(content.text);
    } catch (error: unknown) {
      this.logger.error(
        `Error en chat: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Construye prompt para chat
   */
  private buildChatPrompt(contexto: {
    mensaje: string;
    historial: Array<{ rol: string; contenido: string }>;
    contexto: ChatContexto;
  }): string {
    const historialStr = contexto.historial
      .map(
        (h) =>
          `${h.rol === "usuario" ? "Usuario" : "Asistente"}: ${h.contenido}`,
      )
      .join("\n");

    return `CONTEXTO DEL USUARIO:
- Nombre: ${contexto.contexto.usuario?.nombre || "Usuario"}
- Departamento: ${contexto.contexto.usuario?.departamento || "No especificado"}
- Mes actual: ${contexto.contexto.statsMes?.mes || "Abril 2026"}
- Total gastado este mes: ${contexto.contexto.statsMes?.totalGastado || 6500} Bs.
- Rendiciones este mes: ${contexto.contexto.statsMes?.cantidadRendiciones || 3}
- Modo: ${contexto.contexto.modo || "ONLINE"}

HISTORIAL DE CONVERSACIÓN:
${historialStr || "Nueva conversación"}

CONSULTA ACTUAL:
Usuario: ${contexto.mensaje}

INSTRUCCIONES DE FORMATO:
- Usa **negrita** para títulos y énfasis
- Usa listas con - para items
- Separa párrafos con saltos de línea
- Usa emojis ocasionales

Responde como el asistente con formato. JSON requerido:
{
  "mensaje": "tu respatea formateada con **negritas**, listas, etc.",
  "tipo": "texto",
  "sugerencias": ["pregunta sugerida 1", "pregunta sugerida 2"]
}`;
  }

  /**
   * Parsea respuesta de chat
   */
  private parseChatResponse(responseText: string): {
    mensaje: string;
    tipo: string;
    datos?: unknown;
    sugerencias?: string[];
  } {
    try {
      const cleanJson = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const parsed = JSON.parse(cleanJson);

      return {
        mensaje: parsed.mensaje || parsed.message || responseText,
        tipo: parsed.tipo || "texto",
        datos: parsed.datos,
        sugerencias: parsed.sugerencias || [],
      };
    } catch {
      // Si no es JSON válido, devolver el texto como mensaje
      return {
        mensaje: responseText,
        tipo: "texto",
        sugerencias: [],
      };
    }
  }

  /**
   * Parsea la respuesta de análisis de rendición
   */
  private parseAnalisisRendicionResponse(responseText: string): {
    scoreRiesgo: number;
    nivel: "bajo" | "medio" | "alto";
    recomendacion: "aprobar" | "rechazar" | "revisar";
    justificacion: string;
    factoresPositivos: string[];
    factoresRiesgo: string[];
    alertas: string[];
  } {
    try {
      const cleanJson = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const parsed = JSON.parse(cleanJson);

      return {
        scoreRiesgo: parsed.scoreRiesgo || 50,
        nivel: ["bajo", "medio", "alto"].includes(parsed.nivel)
          ? parsed.nivel
          : "medio",
        recomendacion: ["aprobar", "rechazar", "revisar"].includes(
          parsed.recomendacion,
        )
          ? parsed.recomendacion
          : "revisar",
        justificacion: parsed.justificacion || "Sin justificación",
        factoresPositivos: parsed.factoresPositivos || [],
        factoresRiesgo: parsed.factoresRiesgo || [],
        alertas: parsed.alertas || [],
      };
    } catch (error: unknown) {
      this.logger.error(
        `Error parseando análisis: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        scoreRiesgo: 50,
        nivel: "medio",
        recomendacion: "revisar",
        justificacion: "Error al analizar, revisar manualmente",
        factoresPositivos: [],
        factoresRiesgo: ["Error en análisis automático"],
        alertas: ["Revisar manualmente"],
      };
    }
  }

  /**
   * Analiza discrepancias entre PDF y SIAT
   */
  async analizarDiscrepancias(prompt: string): Promise<string> {
    if (!this.client) {
      throw new Error("Claude no está configurado");
    }

    try {
      this.logger.log("Analizando discrepancias con Claude");

      const response = await this.client.messages.create({
        model: this.config.anthropicModel,
        max_tokens: 1000,
        temperature: 0.2,
        system:
          "Eres un experto en validación de facturas fiscales de Bolivia. Analiza discrepancias y sugiere acciones.",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Respuesta inesperada de Claude");
      }

      this.logger.log("Análisis de discrepancias completado");
      return content.text;
    } catch (error: unknown) {
      this.logger.error(
        `Error analizando discrepancias: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Detecta si una consulta es sobre normas contables bolivianas
   */
  esConsultaContable(mensaje: string): boolean {
    const palabrasClave = [
      // Términos contables bolivianos
      "norma contable",
      "nic",
      "niif",
      "ifrs",
      "gaap",
      "cvu",
      "comprobante de venta",
      "factura",
      "nota fiscal",
      "libro de compras",
      "libro de ventas",
      "declaración",
      "ddjj",
      "it",
      "iva",
      "rciva",
      "transacciones",
      "retención",
      "depreciación",
      "amortización",
      "ajuste por inflación",
      "unidad de fomento",
      "ufv",
      // Términos de estados financieros
      "balance general",
      "estado de resultados",
      "estado de situación financiera",
      "flujo de efectivo",
      "patrimonio",
      // Términos específicos Bolivia
      "impuesto a las transacciones",
      "iue",
      "itp",
      "beneficio del deporte",
      "patentes",
      "regalías",
      // Cuentas específicas
      "cuenta contable",
      "asiento",
      "comprobante",
      "mayor",
    ];

    const mensajeLower = mensaje.toLowerCase();
    return palabrasClave.some((palabra) => mensajeLower.includes(palabra));
  }

  /**
   * Procesa consulta específica sobre normas contables bolivianas
   */
  async consultarNormaContable(mensaje: string): Promise<{
    respuesta: string;
    fuentes?: string[];
  }> {
    if (!this.client) {
      throw new Error("Claude no está configurado");
    }

    try {
      this.logger.log(
        `Consultando norma contable: "${mensaje.substring(0, 50)}..."`,
      );

      const response = await this.client.messages.create({
        model: this.config.anthropicModel,
        max_tokens: 2000,
        temperature: 0.3, // Más determinístico para temas legales/contables
        system: this.getContabilidadSystemPrompt(),
        messages: [
          {
            role: "user",
            content: mensaje,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Respuesta inesperada de Claude");
      }

      // Extraer fuentes si están citadas
      const fuentes = this.extraerFuentes(content.text);

      return {
        respuesta: content.text,
        fuentes: fuentes.length > 0 ? fuentes : undefined,
      };
    } catch (error: unknown) {
      this.logger.error(
        `Error consultando norma contable: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * System prompt especializado para consultas contables bolivianas
   */
  private getContabilidadSystemPrompt(): string {
    return `Eres un experto contable especializado en normativa boliviana con profundo conocimiento de:

1. NORMAS TÉCNICAS DE CONTABILIDAD Y AUDITORÍA (NTCB):
   - NTCB 1 a 11 (normas contables bolivianas vigentes)
   - Marco Conceptual del Consejo de Normas Internacionales (IFRS)

2. NORMAS INTERNACIONES DE INFORMACIÓN FINANCIERA (NIIF/IFRS):
   - NIIF aplicables en Bolivia desde 2018
   - NIIF para PYMES (versión 2015 revisada)

3. TRIBUTARIA BOLIVIANA:
   - Código Tributario Boliviano (Ley 2492)
   - Impuesto a las Utilidades de las Empresas (IUE) - 25%
   - Impuesto a las Transacciones (IT) - 3.0%
   - Impuesto al Valor Agregado (RC-IVA) - 13%
   - Complemento al Régimen Tributario (RC-IT) - proporcional al IUE
   - IT por Pagar (ITP) - depende del tipo de actividad
   - Retenciones y percepciones
   - Depreciación acelerada para activos productivos

4. COMERCIO Y FACTURACIÓN:
   - Código de Comercio boliviano
   - Sistema de Facturación en línea (SFIL) y CUF
   - Libros de Compras y Ventas
   - Comprobantes de Venta en línea (CVL)

5. CONTABILIDAD BOLIVIANA ESPECÍFICA:
   - Ajuste por inflación basado en UFV
   - Estados financieros en moneda nacional (Bolivianos)
   - Presentación en moneda extranjera según NTCB 10
   - Memorándums y notas a los estados financieros

DIRECTRICES PARA RESPONDER:
1. Sé preciso y cita la norma específica cuando sea posible (ej: "Según la NTCB 8...", "Art. 45 del Código Tributario...")
2. Si la pregunta involucra fechas específicas, aclara la normativa vigente a esa fecha
3. Distingue claramente entre normativa contable y tributaria
4. Para temas de IUE, IT, RC-IVA, indica las tasas vigentes y excepciones
5. Si hay múltiples interpretaciones posibles, presenta las alternativas
6. Incluye ejemplos numéricos cuando ayude a clarificar el concepto
7. Si no estás seguro de una normativa específica, indícalo claramente
8. Usa formato Markdown para estructurar la respuesta
9. NO inventes normas o tasas que no existan

Ejemplo de buena respuesta:
"Según el Art. 12 de la Ley 843 (Código Tributario), el IT se aplica a toda transacción en efectivo o con instrumentos de pago equivalentes...

**Tasa vigente:** 3.0% sobre el valor de la transacción

**Excepciones aplicables:**
- Transferencias entre cuentas del mismo titular
- Operaciones con tarjetas de crédito/débito
- ..."`;
  }

  /**
   * Extrae fuentes citadas de la respuesta
   */
  private extraerFuentes(texto: string): string[] {
    const fuentes: string[] = [];

    // Buscar patrones como "Según la NTCB X", "Art. XX del Código...", etc.
    const patrones = [
      /NTCB\s+\d+/gi,
      /NIIF\s+\d+/gi,
      /IFRS\s+\d+/gi,
      /Art\.?\s*\d+[\d\-.]*\s+del\s+[\w\s]+/gi,
      /Ley\s+\d{4,}/gi,
      /Decreto\s+(?:Supremo\s+)?(?:N°?\s*)?\d+[\d\-.]*/gi,
      /Resolución\s+Normativa\s+\d+/gi,
    ];

    for (const patron of patrones) {
      const matches = texto.match(patron);
      if (matches) {
        fuentes.push(...matches);
      }
    }

    // Eliminar duplicados
    return [...new Set(fuentes)];
  }

  /**
   * Parsea la respuesta de clasificación de Claude
   */
  private parseClasificacionResponse(responseText: string): {
    cuentaContable: {
      id: string;
      codigo: string;
      nombre: string;
      confianza: number;
    };
    norma?: { idNorma: number; descripcion: string; confianza: number };
    proyecto?: {
      id: string;
      codigo: string;
      nombre: string;
      confianza: number;
    } | null;
    razon: string;
  } {
    try {
      const cleanJson = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const parsed = JSON.parse(cleanJson);

      return {
        cuentaContable: {
          id: parsed.cuentaContable?.id || "",
          codigo:
            parsed.cuentaContable?.codigo || parsed.cuentaContable?.code || "",
          nombre:
            parsed.cuentaContable?.nombre || parsed.cuentaContable?.name || "",
          confianza:
            parsed.cuentaContable?.confianza ||
            parsed.cuentaContable?.confidence ||
            0.5,
        },
        norma: parsed.norma
          ? {
              idNorma: parsed.norma.idNorma || parsed.norma.id || 0,
              descripcion:
                parsed.norma.descripcion || parsed.norma.descripcion || "",
              confianza:
                parsed.norma.confianza || parsed.norma.confidence || 0.5,
            }
          : undefined,
        proyecto:
          parsed.proyecto === null
            ? null
            : parsed.proyecto
              ? {
                  id: parsed.proyecto.id || "",
                  codigo: parsed.proyecto.codigo || parsed.proyecto.code || "",
                  nombre: parsed.proyecto.nombre || parsed.proyecto.name || "",
                  confianza:
                    parsed.proyecto.confianza ||
                    parsed.proyecto.confidence ||
                    0.5,
                }
              : undefined,
        razon: parsed.razon || parsed.reason || "Sin justificación",
      };
    } catch (error: unknown) {
      this.logger.error(
        `Error parseando clasificación: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.logger.debug(`Respuesta recibida: ${responseText}`);
      throw new Error(
        `No se pudo parsear la clasificación: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
