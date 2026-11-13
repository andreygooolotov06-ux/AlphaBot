import {
  IModelProvider,
  ModelProviderId,
  ModelRouteOptions,
  PromptPayload,
} from '@alphadate/contracts';

/**
 * Google Gemini Provider (Gemini 1.5 Flash / 2.0 Flash)
 */
export class GeminiProvider implements IModelProvider {
  public readonly id: ModelProviderId = 'gemini';
  private apiKey: string;
  private modelName: string;

  constructor(apiKey?: string, modelName = 'gemini-1.5-flash') {
    this.apiKey = apiKey ?? process.env['GEMINI_API_KEY'] ?? '';
    this.modelName = modelName;
  }

  public async isReady(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.trim().length > 10);
  }

  public async generate(prompt: PromptPayload, options?: ModelRouteOptions): Promise<string> {
    if (!await this.isReady()) {
      throw new Error('Gemini API key is not configured.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;
    const contents: any[] = [];

    if (prompt.history && prompt.history.length > 0) {
      for (const h of prompt.history) {
        contents.push({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }],
        });
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: `${prompt.systemPrompt}\n\nTask:\n${prompt.userPrompt}` }],
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 500,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error [${response.status}]: ${errorText}`);
    }

    const data = (await response.json()) as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini returned an empty completion.');
    }
    return text;
  }
}

/**
 * OpenAI Provider (GPT-4o-mini / GPT-4o)
 */
export class OpenAIProvider implements IModelProvider {
  public readonly id: ModelProviderId = 'openai';
  private apiKey: string;
  private modelName: string;

  constructor(apiKey?: string, modelName = 'gpt-4o-mini') {
    this.apiKey = apiKey ?? process.env['OPENAI_API_KEY'] ?? '';
    this.modelName = modelName;
  }

  public async isReady(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.trim().length > 10);
  }

  public async generate(prompt: PromptPayload, options?: ModelRouteOptions): Promise<string> {
    if (!await this.isReady()) {
      throw new Error('OpenAI API key is not configured.');
    }

    const messages = [
      { role: 'system', content: prompt.systemPrompt },
      ...(prompt.history?.map((h) => ({ role: h.role, content: h.content })) ?? []),
      { role: 'user', content: prompt.userPrompt },
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelName,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error [${response.status}]: ${errorText}`);
    }

    const data = (await response.json()) as any;
    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('OpenAI returned an empty completion.');
    }
    return text;
  }
}

/**
 * Local / Mock Heuristic Provider (Offline Fallback for immediate testing)
 */
export class MockOfflineProvider implements IModelProvider {
  public readonly id: ModelProviderId = 'local';

  public async isReady(): Promise<boolean> {
    return true; // Always ready as emergency fallback
  }

  public async generate(prompt: PromptPayload, _options?: ModelRouteOptions): Promise<string> {
    // Generate 3 contextual variants based on prompt text
    const text = prompt.userPrompt.toLowerCase();
    
    let v1 = 'Звучит очень интересно! Расскажи подробнее, как все прошло?';
    let v2 = 'Ого, вот это неожиданно! Не каждый день такое услышишь)';
    let v3 = 'Ахах, классика) И что в итоге решили делать дальше?';

    if (text.includes('собак') || text.includes('пес') || text.includes('кот')) {
      v1 = 'Какой красавец! А как зовут твоего любимца и сколько ему лет?';
      v2 = 'Животные дома — это море радости (и шерсти на одежде). Кто в доме главный?)';
      v3 = 'Класс! Всегда подкупает, когда человек с такой теплотой относится к питомцам.';
    } else if (text.includes('кофе') || text.includes('чай') || text.includes('кафе')) {
      v1 = 'Кофе — это святое! Ты больше за классический фильтр или что-то вроде флэт уайта?';
      v2 = 'Знаю пару отличных мест с уютной атмосферой, где варят лучший кофе в городе ;)';
      v3 = 'Без хорошего кофе день вообще трудно считать открытым, согласен?)';
    } else if (text.includes('выходн') || text.includes('отдых') || text.includes('поездк')) {
      v1 = 'Отличные планы! Самое главное в отдыхе — уметь переключиться и не думать о делах.';
      v2 = 'Здорово! Обожаю спонтанные поездки, они всегда самые запоминающиеся.';
      v3 = 'Круто! А ты больше любишь активный отдых или спокойно поваляться с книгой?';
    }

    return JSON.stringify({
      suggestions: [
        { text: v1, tone: 'inquisitive', confidence: 0.95, reasoningBrief: 'Вовлекающий открытый вопрос' },
        { text: v2, tone: 'witty', confidence: 0.91, reasoningBrief: 'Игривая реплика с легким юмором' },
        { text: v3, tone: 'empathetic', confidence: 0.88, reasoningBrief: 'Теплая поддержка темы собеседника' }
      ]
    });
  }
}
