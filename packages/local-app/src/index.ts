import * as http from 'node:http';
import { WebSocketServer } from 'ws';
import { ModelRouter } from '@alphadate/model-router';
import { MemoryManager } from '@alphadate/memory-manager';
import { AICore } from '@alphadate/ai-core';
import { DatabaseConnection } from './db/connection.js';
import { runMigrations } from './db/migrate.js';
import {
  ProfileRepository,
  MemoryRepository,
  MessageRepository,
  AuditRepository,
} from './db/repositories.js';
import { createHttpServer } from './server/http.js';
import { createWsServer } from './server/ws.js';

export class LocalAppDaemon {
  public readonly db;
  public readonly profileRepo: ProfileRepository;
  public readonly memoryRepo: MemoryRepository;
  public readonly messageRepo: MessageRepository;
  public readonly auditRepo: AuditRepository;
  public readonly modelRouter: ModelRouter;
  public readonly memoryManager: MemoryManager;
  public readonly aiCore: AICore;

  private httpServer: http.Server | null = null;
  private wsServer: WebSocketServer | null = null;

  constructor() {
    // 1. Initialize SQLite Database
    this.db = DatabaseConnection.getDatabase();
    runMigrations(this.db);

    // 2. Initialize Repositories
    this.profileRepo = new ProfileRepository(this.db);
    this.memoryRepo = new MemoryRepository(this.db);
    this.messageRepo = new MessageRepository(this.db);
    this.auditRepo = new AuditRepository(this.db);

    // 3. Initialize Memory Manager with SQLite backend
    this.memoryManager = new MemoryManager(this.memoryRepo);

    // 4. Initialize Model Router & AI Core
    this.modelRouter = new ModelRouter();
    this.aiCore = new AICore(this.modelRouter, this.memoryManager);
  }

  public async start(): Promise<void> {
    const host = process.env['LOCAL_APP_HOST'] ?? '127.0.0.1';
    const httpPort = Number(process.env['LOCAL_APP_PORT'] ?? 4789);
    const wsPort = Number(process.env['LOCAL_APP_WS_PORT'] ?? 4790);
    const secretToken = process.env['LOCAL_APP_SECRET_TOKEN'] ?? 'generate-a-secure-random-token-here';

    console.log('====================================================');
    console.log('   AlphaDate Personal AI - Local Application Daemon');
    console.log('====================================================');

    // Start HTTP Server
    this.httpServer = createHttpServer({
      host,
      port: httpPort,
      secretToken,
      aiCore: this.aiCore,
      modelRouter: this.modelRouter,
      profileRepo: this.profileRepo,
      memoryRepo: this.memoryRepo,
      messageRepo: this.messageRepo,
      auditRepo: this.auditRepo,
    });

    await new Promise<void>((resolve) => {
      this.httpServer?.listen(httpPort, host, () => {
        console.log(`[LocalApp] HTTP REST Gateway listening on http://${host}:${httpPort}`);
        resolve();
      });
    });

    // Start WebSocket Server
    this.wsServer = createWsServer({
      host,
      port: wsPort,
    });

    console.log('[LocalApp] Ready for Chrome Extension connection.');
  }

  public async stop(): Promise<void> {
    console.log('[LocalApp] Shutting down daemon...');
    this.wsServer?.close();
    this.httpServer?.close();
    DatabaseConnection.close();
  }
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('index.js')) {
  const daemon = new LocalAppDaemon();
  daemon.start().catch((err) => {
    console.error('[LocalApp] Fatal startup error:', err);
    process.exit(1);
  });

  process.on('SIGINT', async () => {
    await daemon.stop();
    process.exit(0);
  });
}
