/**
 * Configuración de IA (Inteligencia Artificial)
 * 
 * Variables de entorno requeridas:
 * - IA_ENABLED: 'true' para activar funcionalidades IA
 * - IA_PROVIDER: 'anthropic' | 'openai'
 * - ANTHROPIC_API_KEY: API key de Anthropic (si provider=anthropic)
 * - ANTHROPIC_MODEL: Modelo Claude a usar (default: claude-3-5-sonnet-20241022)
 */

export interface AiConfig {
  /** Si las funcionalidades de IA están habilitadas */
  enabled: boolean;
  /** Proveedor de IA: anthropic u openai */
  provider: 'anthropic' | 'openai' | string;
  /** Configuración de Anthropic */
  anthropic: {
    apiKey: string;
    model: string;
  };
  /** Configuración de OpenAI (opcional) */
  openai?: {
    apiKey: string;
    model: string;
  };
}

export default (): { ai: AiConfig } => ({
  ai: {
    enabled: (process.env.IA_ENABLED?.trim().toLowerCase() === 'true'),
    provider: process.env.IA_PROVIDER || 'anthropic',
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4o',
    },
  },
});
