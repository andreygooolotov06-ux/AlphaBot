import {
  SuggestionItem,
  SuggestionRequestPayload,
  SuggestionResponsePayload,
  SuggestionTone,
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
    const profile = request.context.profile;

    // 1. Fetch memory summary
    const memorySummary = await this.memory.summarizeContext(profile.id);

    // 2. Synthesize System Prompt & Task Prompt
    const systemPrompt = `You are AlphaDate AI, a high-EQ operator assistant for online dialogue.
Your objective is to help the human operator compose engaging, natural, and charming responses.

Interlocutor Profile:
- Name: ${profile.displayName}
- Age: ${profile.age ?? 'Not specified'}
- Bio: ${profile.bio ?? 'None'}
- Notes: ${profile.notes ?? 'None'}

Known Personal Facts & Memory:
${memorySummary}

Guidelines:
- Match the conversational pace and language of the interlocutor.
- Output exactly 3 distinct reply suggestions with different tones: casual, witty, and inquisitive/empathetic.
- Return ONLY valid JSON in the following format:
{
  "suggestions": [
    { "text": "...", "tone": "witty", "confidence": 0.95, "reasoningBrief": "..." },
    { "text": "...", "tone": "casual", "confidence": 0.90, "reasoningBrief": "..." },
    { "text": "...", "tone": "inquisitive", "confidence": 0.88, "reasoningBrief": "..." }
  ],
  "analysis": {
    "sentiment": "positive",
    "detectedIntent": "sharing_detail",
    "recommendedAction": "ask_followup"
  }
}`;

    const recentChat = request.context.recentMessages
      .map((m) => `${m.sender.toUpperCase()}: ${m.text}`)
      .join('\n');

    const userPrompt = `Recent dialogue history:\n${recentChat}\n\nOperator instructions / draft: ${request.customInstruction ?? 'None'}\nDesired primary tone: ${request.desiredTone ?? 'natural'}`;

    // 3. Delegate to Model Router
    const { text, providerUsed } = await this.router.routeAndGenerate({
      systemPrompt,
      userPrompt,
    });

    // 4. Parse output safely
    let parsedData: any = null;
    try {
      // Find JSON block if wrapped in markdown
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        parsedData = JSON.parse(text);
      }
    } catch {
      // Fallback parser if LLM didn't return strict JSON
      parsedData = {
        suggestions: [
          {
            id: `sug_${Date.now()}_1`,
            text: text.slice(0, 150).trim(),
            tone: request.desiredTone ?? 'casual',
            confidence: 0.85,
            reasoningBrief: 'Прямой ответ модели',
          },
        ],
      };
    }

    const suggestions: SuggestionItem[] = (parsedData.suggestions ?? []).map(
      (s: any, idx: number) => ({
        id: `sug_${Date.now()}_${idx + 1}`,
        text: s.text,
        tone: (s.tone as SuggestionTone) ?? 'casual',
        confidence: typeof s.confidence === 'number' ? s.confidence : 0.9,
        reasoningBrief: s.reasoningBrief,
      })
    );

    return {
      suggestions,
      analysis: parsedData.analysis,
      modelUsed: providerUsed === 'gemini' ? 'gemini-1.5-flash' : providerUsed === 'openai' ? 'gpt-4o-mini' : 'local-offline',
      provider: providerUsed,
      latencyMs: Date.now() - startTime,
      cached: false,
    };
  }
}
