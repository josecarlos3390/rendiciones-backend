import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiConfigService {
  constructor(private readonly config: ConfigService) {}

  /** Verifica si la IA está habilitada */
  get enabled(): boolean {
    return this.config.get<boolean>('ai.enabled', false);
  }

  /** Obtiene el proveedor de IA configurado */
  get provider(): string {
    return this.config.get<string>('ai.provider', 'anthropic');
  }

  /** Verifica si Anthropic está configurado correctamente */
  get isAnthropicConfigured(): boolean {
    return !!this.anthropicApiKey && this.anthropicApiKey.startsWith('sk-ant');
  }

  /** API Key de Anthropic */
  get anthropicApiKey(): string {
    return this.config.get<string>('ai.anthropic.apiKey', '');
  }

  /** Modelo de Claude a usar */
  get anthropicModel(): string {
    return this.config.get<string>(
      'ai.anthropic.model',
      'claude-3-5-sonnet-20241022',
    );
  }

  /** Verifica si OpenAI está configurado */
  get isOpenAiConfigured(): boolean {
    return !!this.openAiApiKey && this.openAiApiKey.startsWith('sk-');
  }

  /** API Key de OpenAI */
  get openAiApiKey(): string {
    return this.config.get<string>('ai.openai.apiKey', '');
  }

  /** Modelo de OpenAI a usar */
  get openAiModel(): string {
    return this.config.get<string>('ai.openai.model', 'gpt-4o');
  }

  /** Obtiene el estado completo de la configuración */
  getStatus() {
    return {
      enabled: this.enabled,
      provider: this.provider,
      model:
        this.provider === 'anthropic'
          ? this.anthropicModel
          : this.openAiModel,
      configured:
        this.provider === 'anthropic'
          ? this.isAnthropicConfigured
          : this.isOpenAiConfigured,
    };
  }
}
