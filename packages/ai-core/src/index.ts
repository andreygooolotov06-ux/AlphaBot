import {
  SuggestionRequestPayload,
  SuggestionResponsePayload,
} from '@alphadate/contracts';
import { ModelRouter } from '@alphadate/model-router';
import { MemoryManager } from '@alphadate/memory-manager';

export class AICore {
  constructor(
    private readonly router: ModelRouter,
    private readonly memory: MemoryManager
  ) {}

  public async processSuggestionRequest(
    request: SuggestionRequestPayload
  ): Promise<SuggestionResponsePayload> {
    const startTime = Date.now();

    // 1. Fetch relevant memories for the interlocutor profile
    const memorySummary = await this.memory.summarizeContext(
      request.context.profile.id
    );

    // 2. Build structured prompt (Pipeline Step)
    const prompt = {
      systemPrompt: `You are an operator assistant for online dialogue. Context summary:\n${memorySummary}`,
      userPrompt: `Desired tone: ${request.desiredTone ?? 'casual'}. Last messages:\n` +
        request.context.recentMessages
          .map((m) => `${m.sender}: ${m.text}`)
          .join('\n'),
    };

    // 3. Delegate to Model Router
    const { text, providerUsed } = await this.router.routeAndGenerate(prompt);

    return {
      suggestions: [
        {
          id: `sug_${Date.now()}`,
          text,
          tone: request.desiredTone ?? 'casual',
          confidence: 0.9,
          reasoningBrief: 'Generated based on dialogue history and memory context.',
        },
      ],
      modelUsed: 'routed-model',
      provider: providerUsed,
      latencyMs: Date.now() - startTime,
      cached: false,
    };
  }
}
