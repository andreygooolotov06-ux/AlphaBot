import { DatabaseSync } from 'node:sqlite';

export function runMigrations(db: DatabaseSync): void {
  console.log('[Database] Running schema migrations...');

  db.exec(`
    -- 1. Profiles Table
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      display_name TEXT NOT NULL,
      age INTEGER,
      location TEXT,
      bio TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_profiles_platform ON profiles(platform);
    CREATE INDEX IF NOT EXISTS idx_profiles_updated ON profiles(updated_at DESC);

    -- 2. Dialog Sessions Table
    CREATE TABLE IF NOT EXISTS dialog_sessions (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      status TEXT CHECK(status IN ('active', 'archived')) NOT NULL DEFAULT 'active',
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      message_count INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_profile ON dialog_sessions(profile_id);

    -- 3. Messages Table
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      profile_id TEXT NOT NULL,
      sender_role TEXT CHECK(sender_role IN ('operator', 'interlocutor', 'system', 'ai_assistant')) NOT NULL,
      content TEXT NOT NULL,
      sentiment TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY(session_id) REFERENCES dialog_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_profile_time ON messages(profile_id, timestamp ASC);

    -- 4. Memory Facts Table
    CREATE TABLE IF NOT EXISTS memory_facts (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      category TEXT CHECK(category IN ('preference', 'personal_fact', 'boundary', 'topic_interest', 'timeline_event')) NOT NULL,
      fact_key TEXT NOT NULL,
      fact_value TEXT NOT NULL,
      confidence REAL NOT NULL DEFAULT 1.0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_memory_profile_cat ON memory_facts(profile_id, category);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_memory_profile_key ON memory_facts(profile_id, fact_key);

    -- 5. Operator Templates Table
    CREATE TABLE IF NOT EXISTS operator_templates (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      content_template TEXT NOT NULL,
      tags TEXT,
      usage_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    -- 6. Audit Logs Table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action_type TEXT NOT NULL,
      profile_id TEXT,
      model_used TEXT,
      latency_ms INTEGER NOT NULL,
      success INTEGER NOT NULL,
      error_message TEXT,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(timestamp DESC);
  `);

  console.log('[Database] Migrations applied successfully.');
}
