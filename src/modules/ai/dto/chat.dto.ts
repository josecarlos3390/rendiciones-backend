import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsArray, MaxLength } from 'class-validator';

/**
 * Mensaje individual en la conversación
 */
export interface ChatMensaje {
  /** Rol del emisor */
  rol: 'usuario' | 'asistente';
  /** Contenido del mensaje */
  contenido: string;
  /** Timestamp del mensaje */
  timestamp?: string;
}

/**
 * DTO para una consulta al chatbot
 */
export class ChatConsultaDto {
  @ApiProperty({
    description: 'Mensaje del usuario',
    example: '¿Cuánto he gastado este mes?',
    maxLength: 2000,
  })
  @IsString()
  @MaxLength(2000)
  mensaje: string;

  @ApiPropertyOptional({
    description: 'ID del usuario',
    example: '123',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  usuarioId?: string;

  @ApiPropertyOptional({
    description: 'ID del perfil activo',
    example: 1,
  })
  @IsOptional()
  idPerfil?: number;

  @ApiPropertyOptional({
    description: 'Página actual donde está el usuario',
    example: 'dashboard',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  paginaActual?: string;

  @ApiPropertyOptional({
    description: 'Historial de conversación previa',
    type: 'array',
    example: [
      { rol: 'usuario', contenido: 'Hola' },
      { rol: 'asistente', contenido: '¡Hola! ¿En qué puedo ayudarte?' },
    ],
  })
  @IsArray()
  @IsOptional()
  historial?: ChatMensaje[];

  @ApiPropertyOptional({
    description: 'Contexto adicional',
    example: {
      rendicionActual: 123,
      tema: 'consulta_montos',
    },
  })
  @IsObject()
  @IsOptional()
  contexto?: Record<string, any>;
}

/**
 * Respuesta del chatbot
 */
export interface ChatRespuesta {
  /** Mensaje de respuesta */
  mensaje: string;
  /** Tipo de respuesta */
  tipo: 'texto' | 'tabla' | 'grafico' | 'accion' | 'contabilidad';
  /** Datos estructurados si aplica */
  datos?: any;
  /** Sugerencias de siguientes preguntas */
  sugerencias?: string[];
  /** Timestamp de la respuesta */
  timestamp: string;
}
