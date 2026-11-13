import {
  IModelProvider,
  ModelProviderId,
  ModelProviderStatus,
  ModelRouteOptions,
  PromptPayload,
} from '@alphadate/contracts';
import { GeminiProvider, OpenAIProvider, MockOfflineProvider } from './providers.js';

export * from './providers.js';

export class ModelRouter {
  private providers: Map<ModelProviderId, IModelProvider> = new Map();

  constructor() {
    // Register available providers by default
    this.registerProvider(new GeminiProvider());
    this.registerProvider(new OpenAIProvider());
    this.registerProvider(new MockOfflineProvider());
  }

  public registerProvider(provider: IModelProvider): void {
    this.providers.set(provider.id, provider);
  }

  public async getAvailableProviders(): Promise<ModelProviderStatus[]> {
    const statuses: ModelProviderStatus[] = [];
    for (const [id, provider] of this.providers.entries()) {
      const ready = await provider.isReady().catch(() => false);
      statuses.push({
        id,
        name: id.toUpperCase(),
        isAvailable: ready,
        activeModelName: id === 'gemini' ? 'gemini-1.5-flash' : id === 'openai' ? 'gpt-4o-mini' : 'local-heuristic',
      });
    }
    return statuses;
  }

  /**
   * Route and generate with automatic fallback cascade:
   * 1. Preferred provider (or Gemini if available)
   * 2. OpenAI
   * 3. Local/Mock offline fallback
   */
  public async routeAndGenerate(
    prompt: PromptPayload,
    options?: ModelRouteOptions
  ): Promise<{ text: string; providerUsed: ModelProviderId }> {
    const preferred = options?.preferredProvider;
    const candidates: ModelProviderId[] = preferred
      ? [preferred, 'gemini', 'openai', 'local']
      : ['gemini', 'openai', 'local'];

    // De-duplicate candidates
    const uniqueCandidates = Array.from(new Set(candidates));

    let lastError: Error | null = null;
    for (const providerId of uniqueCandidates) {
      const provider = this.providers.get(providerId);
      if (!provider) continue;

      const isReady = await provider.isReady().catch(() => false);
      if (!isReady) continue;

      try {
        console.log(`[ModelRouter] Attempting generation with provider: [${providerId}]`);
        const text = await provider.generate(prompt, options);
        return { text, providerUsed: providerId };
      } catch (err: any) {
        console.warn(`[ModelRouter] Provider [${providerId}] failed: ${err.message}. Trying next in cascade...`);
        lastError = err;
      }
    }

    throw new Error(`All model providers in cascade failed. Last error: ${lastError?.message}`);
  }
}
