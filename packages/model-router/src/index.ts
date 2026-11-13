import {
  IModelProvider,
  ModelProviderId,
  ModelProviderStatus,
  ModelRouteOptions,
  PromptPayload,
} from '@alphadate/contracts';

export class ModelRouter {
  private providers: Map<ModelProviderId, IModelProvider> = new Map();

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
        activeModelName: 'default',
      });
    }
    return statuses;
  }

  public async routeAndGenerate(
    prompt: PromptPayload,
    options?: ModelRouteOptions
  ): Promise<{ text: string; providerUsed: ModelProviderId }> {
    // Modular routing strategy stub:
    // 1. Check preferredProvider
    // 2. Fallback cascade if provider fails
    const targetProviderId: ModelProviderId = options?.preferredProvider ?? 'gemini';
    const provider = this.providers.get(targetProviderId);

    if (!provider || !(await provider.isReady())) {
      throw new Error(`Model provider [${targetProviderId}] is not available.`);
    }

    const text = await provider.generate(prompt, options);
    return { text, providerUsed: targetProviderId };
  }
}
