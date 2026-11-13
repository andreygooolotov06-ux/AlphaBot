import {
  IMemoryManager,
  MemoryQuery,
  MemoryRecord,
} from '@alphadate/contracts';

export interface IMemoryStorageBackend {
  getByProfile(profileId: string): MemoryRecord[];
  store(record: Omit<MemoryRecord, 'id' | 'createdAt' | 'updatedAt'>): MemoryRecord;
  delete(id: string): boolean;
}

export class MemoryManager implements IMemoryManager {
  private inMemoryCache: Map<string, MemoryRecord[]> = new Map();
  private backend: IMemoryStorageBackend | null = null;

  constructor(backend?: IMemoryStorageBackend) {
    this.backend = backend ?? null;
  }

  public setBackend(backend: IMemoryStorageBackend): void {
    this.backend = backend;
  }

  public async search(query: MemoryQuery): Promise<MemoryRecord[]> {
    let records: MemoryRecord[] = [];

    if (this.backend) {
      records = this.backend.getByProfile(query.profileId);
    } else {
      records = this.inMemoryCache.get(query.profileId) ?? [];
    }

    if (!query.categories || query.categories.length === 0) {
      return records.slice(0, query.limit ?? 20);
    }

    return records
      .filter((r) => query.categories!.includes(r.category))
      .slice(0, query.limit ?? 20);
  }

  public async store(
    recordData: Omit<MemoryRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MemoryRecord> {
    if (this.backend) {
      return this.backend.store(recordData);
    }

    const now = Date.now();
    const newRecord: MemoryRecord = {
      ...recordData,
      id: `mem_${now}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    const existing = this.inMemoryCache.get(recordData.profileId) ?? [];
    existing.push(newRecord);
    this.inMemoryCache.set(recordData.profileId, existing);

    return newRecord;
  }

  public async summarizeContext(profileId: string): Promise<string> {
    const records = await this.search({ profileId });
    if (records.length === 0) return 'No prior profile memory recorded.';
    return records.map((r) => `• [${r.category}] ${r.key}: ${r.value}`).join('\n');
  }

  public async deleteRecord(id: string): Promise<boolean> {
    if (this.backend) {
      return this.backend.delete(id);
    }

    for (const [profileId, records] of this.inMemoryCache.entries()) {
      const idx = records.findIndex((r) => r.id === id);
      if (idx !== -1) {
        records.splice(idx, 1);
        this.inMemoryCache.set(profileId, records);
        return true;
      }
    }
    return false;
  }
}
