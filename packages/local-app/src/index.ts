import {
  ALPHADATE_PROTOCOL_VERSION,
  IPCRequest,
  IPCResponse,
  SuggestionRequestPayload,
} from '@alphadate/contracts';
import { ModelRouter } from '@alphadate/model-router';
import { MemoryManager } from '@alphadate/memory-manager';
import { AICore } from '@alphadate/ai-core';

export class LocalAppDaemon {
  public readonly aiCore: AICore;
  public readonly memoryManager: MemoryManager;
  public readonly modelRouter: ModelRouter;

  constructor() {
    this.modelRouter = new ModelRouter();
    this.memoryManager = new MemoryManager();
    this.aiCore = new AICore(this.modelRouter, this.memoryManager);
  }

  public async handleRequest(req: IPCRequest): Promise<IPCResponse> {
    console.log(`[LocalApp] Received ${req.type} (v${req.version})`);

    if (req.type === 'GENERATE_SUGGESTIONS') {
      const payload = req.payload as SuggestionRequestPayload;
      const result = await this.aiCore.processSuggestionRequest(payload);
      return {
        id: `resp_${Date.now()}`,
        correlationId: req.id,
        success: true,
        data: result,
        timestamp: Date.now(),
      };
    }

    return {
      id: `resp_${Date.now()}`,
      correlationId: req.id,
      success: true,
      data: { status: 'acknowledged', protocol: ALPHADATE_PROTOCOL_VERSION },
      timestamp: Date.now(),
    };
  }

  public start(): void {
    console.log('[LocalApp] Daemon started. Ready for Chrome Extension connection.');
  }
}

if (process.argv[1]?.endsWith('index.js')) {
  const daemon = new LocalAppDaemon();
  daemon.start();
}
