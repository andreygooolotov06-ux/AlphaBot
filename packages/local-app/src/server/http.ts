import * as http from 'node:http';
import {
  ALPHADATE_PROTOCOL_VERSION,
  ErrorCode,
  HandshakeRequest,
  HandshakeResponse,
  IPCResponse,
  SuggestionRequestPayload,
} from '@alphadate/contracts';
import { AICore } from '@alphadate/ai-core';
import { ModelRouter } from '@alphadate/model-router';
import {
  ProfileRepository,
  MemoryRepository,
  MessageRepository,
  AuditRepository,
} from '../db/repositories.js';

export interface HttpServerDeps {
  port: number;
  host: string;
  secretToken: string;
  aiCore: AICore;
  modelRouter: ModelRouter;
  profileRepo: ProfileRepository;
  memoryRepo: MemoryRepository;
  messageRepo: MessageRepository;
  auditRepo: AuditRepository;
}

export function createHttpServer(deps: HttpServerDeps): http.Server {
  const server = http.createServer(async (req, res) => {
    // 1. CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-AlphaDate-Token');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`);
    const pathname = url.pathname;

    // 2. Health check (no auth required)
    if (req.method === 'GET' && pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'healthy',
          version: ALPHADATE_PROTOCOL_VERSION,
          uptimeSeconds: Math.floor(process.uptime()),
          database: 'connected',
        })
      );
      return;
    }

    // 3. Security Token Check
    const tokenHeader = req.headers['x-alphadate-token'];
    if (deps.secretToken && deps.secretToken.length > 0 && tokenHeader !== deps.secretToken) {
      // Allow bypass if token is default placeholder for easy local dev
      if (deps.secretToken !== 'generate-a-secure-random-token-here' && tokenHeader !== deps.secretToken) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            error: { code: ErrorCode.ERR_UNAUTHORIZED, message: 'Invalid or missing X-AlphaDate-Token' },
          })
        );
        return;
      }
    }

    // Helper to read JSON body
    const readBody = async <T>(): Promise<T> => {
      return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => (data += chunk));
        req.on('end', () => {
          try {
            resolve(data ? JSON.parse(data) : {});
          } catch (e) {
            reject(e);
          }
        });
        req.on('error', reject);
      });
    };

    try {
      // 4. Handshake
      if (req.method === 'POST' && pathname === '/v1/handshake') {
        const body = await readBody<HandshakeRequest>();
        console.log(`[HttpServer] Handshake from client v${body.clientVersion} (ext: ${body.extensionId})`);
        const providers = await deps.modelRouter.getAvailableProviders();
        const activeProviders = providers.filter((p) => p.isAvailable).map((p) => p.id);

        const response: HandshakeResponse = {
          success: true,
          serverVersion: '0.1.0',
          protocolVersion: ALPHADATE_PROTOCOL_VERSION,
          activeProviders,
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
        return;
      }

      // 5. System Status
      if (req.method === 'GET' && pathname === '/v1/system/status') {
        const providers = await deps.modelRouter.getAvailableProviders();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, providers }));
        return;
      }

      // 6. AI Suggestions
      if (req.method === 'POST' && pathname === '/v1/ai/suggestions') {
        const body = await readBody<{ payload: SuggestionRequestPayload; id?: string }>();
        const payload = body.payload ?? (body as unknown as SuggestionRequestPayload);

        // Auto-save messages to repository for persistent context
        if (payload.context?.recentMessages && payload.context?.profile?.id) {
          deps.profileRepo.upsert(payload.context.profile);
          for (const msg of payload.context.recentMessages) {
            deps.messageRepo.saveMessage(payload.context.profile.id, msg, payload.context.platform);
          }
        }

        const result = await deps.aiCore.processSuggestionRequest(payload);

        deps.auditRepo.log({
          action_type: 'suggestion_generated',
          profile_id: payload.context?.profile?.id ?? null,
          model_used: result.modelUsed,
          latency_ms: result.latencyMs,
          success: 1,
          error_message: null,
        });

        const response: IPCResponse = {
          id: `resp_${Date.now()}`,
          correlationId: body.id ?? `req_${Date.now()}`,
          success: true,
          data: result,
          timestamp: Date.now(),
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
        return;
      }

      // 7. Memory Operations
      if (pathname === '/v1/memory') {
        if (req.method === 'GET') {
          const profileId = url.searchParams.get('profileId');
          if (!profileId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Missing profileId' }));
            return;
          }
          const facts = deps.memoryRepo.getByProfile(profileId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, data: facts }));
          return;
        }

        if (req.method === 'POST') {
          const body = await readBody<any>();
          const saved = deps.memoryRepo.store(body);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, data: saved }));
          return;
        }
      }

      // 8. Profiles
      if (req.method === 'GET' && pathname === '/v1/profiles') {
        const recent = deps.profileRepo.listRecent(20);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: recent }));
        return;
      }

      // 404 Route Not Found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Endpoint not found' }));
    } catch (err: any) {
      console.error('[HttpServer] Error processing request:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          error: { code: ErrorCode.ERR_INTERNAL, message: err.message },
        })
      );
    }
  });

  return server;
}
