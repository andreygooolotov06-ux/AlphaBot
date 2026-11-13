import {
  IMemoryManager,
  MemoryQuery,
  MemoryRecord,
} from '@alphadate/contracts';

export class MemoryManager implements IMemoryManager {
  // In-memory / storage adapter placeholder (SQLite backing implemented in Local App)
  private memoryCache: Map<string, MemoryRecord[]> = new Map();

  public async search(query: MemoryQuery): Promise<MemoryRecord[]> {
    const records = this.memoryCache.get(query.profileId) ?? [];
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
    const now = Date.now();
    const newRecord: MemoryRecord = {
      ...recordData,
      id: `mem_${now}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    const existing = this.memoryCache.get(recordData.profileId) ?? [];
    existing.push(newRecord);
    this.memoryCache.set(recordData.profileId, existing);

    return newRecord;
  }

  public async summarizeContext(profileId: string): Promise<string> {
    const records = await this.search({ profileId });
    if (records.length === 0) return 'No prior profile memory recorded.';
    return records.map((r) => `[${r.category}] ${r.key}: ${r.value}`).join('\n');
  }
}
