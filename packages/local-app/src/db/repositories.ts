import { DatabaseSync } from 'node:sqlite';
import {
  InterlocutorProfile,
  MemoryRecord,
  DialogMessage,
  AuditLogEntity,
} from '@alphadate/contracts';

export class ProfileRepository {
  constructor(private readonly db: DatabaseSync) {}

  public getById(id: string): InterlocutorProfile | null {
    const stmt = this.db.prepare('SELECT * FROM profiles WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return null;

    return {
      id: row['id'] as string,
      platform: row['platform'] as string,
      displayName: row['display_name'] as string,
      age: (row['age'] as number) ?? undefined,
      location: (row['location'] as string) ?? undefined,
      bio: (row['bio'] as string) ?? undefined,
      notes: (row['notes'] as string) ?? undefined,
      lastActiveTimestamp: row['updated_at'] as number,
    };
  }

  public upsert(profile: InterlocutorProfile): void {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO profiles (id, platform, display_name, age, location, bio, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        display_name = excluded.display_name,
        age = COALESCE(excluded.age, profiles.age),
        location = COALESCE(excluded.location, profiles.location),
        bio = COALESCE(excluded.bio, profiles.bio),
        notes = COALESCE(excluded.notes, profiles.notes),
        updated_at = excluded.updated_at
    `);

    stmt.run(
      profile.id,
      profile.platform,
      profile.displayName,
      profile.age ?? null,
      profile.location ?? null,
      profile.bio ?? null,
      profile.notes ?? null,
      now,
      now
    );
  }

  public listRecent(limit = 10): InterlocutorProfile[] {
    const stmt = this.db.prepare('SELECT * FROM profiles ORDER BY updated_at DESC LIMIT ?');
    const rows = stmt.all(limit) as Record<string, unknown>[];

    return rows.map((row) => ({
      id: row['id'] as string,
      platform: row['platform'] as string,
      displayName: row['display_name'] as string,
      age: (row['age'] as number) ?? undefined,
      location: (row['location'] as string) ?? undefined,
      bio: (row['bio'] as string) ?? undefined,
      notes: (row['notes'] as string) ?? undefined,
      lastActiveTimestamp: row['updated_at'] as number,
    }));
  }
}

export class MemoryRepository {
  constructor(private readonly db: DatabaseSync) {}

  public getByProfile(profileId: string): MemoryRecord[] {
    const stmt = this.db.prepare('SELECT * FROM memory_facts WHERE profile_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(profileId) as Record<string, unknown>[];

    return rows.map((r) => ({
      id: r['id'] as string,
      profileId: r['profile_id'] as string,
      category: r['category'] as MemoryRecord['category'],
      key: r['fact_key'] as string,
      value: r['fact_value'] as string,
      confidenceScore: (r['confidence'] as number) ?? 1.0,
      createdAt: r['created_at'] as number,
      updatedAt: r['updated_at'] as number,
    }));
  }

  public store(record: Omit<MemoryRecord, 'id' | 'createdAt' | 'updatedAt'>): MemoryRecord {
    const now = Date.now();
    const id = `mem_${now}_${Math.random().toString(36).substring(2, 8)}`;
    const stmt = this.db.prepare(`
      INSERT INTO memory_facts (id, profile_id, category, fact_key, fact_value, confidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(profile_id, fact_key) DO UPDATE SET
        fact_value = excluded.fact_value,
        category = excluded.category,
        confidence = excluded.confidence,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      id,
      record.profileId,
      record.category,
      record.key,
      record.value,
      record.confidenceScore,
      now,
      now
    );

    return {
      id,
      ...record,
      createdAt: now,
      updatedAt: now,
    };
  }

  public delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM memory_facts WHERE id = ?');
    stmt.run(id);
    return true;
  }
}

export class MessageRepository {
  constructor(private readonly db: DatabaseSync) {}

  public saveMessage(profileId: string, message: DialogMessage, platform = 'general'): void {
    // Ensure session exists
    const sessionStmt = this.db.prepare(`
      INSERT INTO dialog_sessions (id, profile_id, platform, status, started_at, message_count)
      VALUES (?, ?, ?, 'active', ?, 1)
      ON CONFLICT(id) DO UPDATE SET
        message_count = dialog_sessions.message_count + 1
    `);
    const sessionId = `sess_${profileId}`;
    sessionStmt.run(sessionId, profileId, platform, message.timestamp);

    const msgStmt = this.db.prepare(`
      INSERT INTO messages (id, session_id, profile_id, sender_role, content, sentiment, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `);
    msgStmt.run(
      message.id,
      sessionId,
      profileId,
      message.sender,
      message.text,
      message.metadata?.sentiment ?? null,
      message.timestamp
    );
  }

  public getRecent(profileId: string, limit = 20): DialogMessage[] {
    const stmt = this.db.prepare(`
      SELECT * FROM messages WHERE profile_id = ? ORDER BY timestamp DESC LIMIT ?
    `);
    const rows = stmt.all(profileId, limit) as Record<string, unknown>[];
    return rows.reverse().map((r) => ({
      id: r['id'] as string,
      sender: r['sender_role'] as DialogMessage['sender'],
      text: r['content'] as string,
      timestamp: r['timestamp'] as number,
      metadata: r['sentiment'] ? { sentiment: r['sentiment'] as any } : undefined,
    }));
  }
}

export class AuditRepository {
  constructor(private readonly db: DatabaseSync) {}

  public log(entry: Omit<AuditLogEntity, 'id' | 'timestamp'>): void {
    const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (id, action_type, profile_id, model_used, latency_ms, success, error_message, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      entry.action_type,
      entry.profile_id,
      entry.model_used,
      entry.latency_ms,
      entry.success,
      entry.error_message,
      now
    );
  }
}
