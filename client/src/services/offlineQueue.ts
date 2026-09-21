// Offline Attendance Sync Queue Service
export interface QueuedPunch {
  id: string;
  type: 'timeIn' | 'timeOut';
  latitude: number;
  longitude: number;
  accuracy: number;
  customLunchMinutes?: number;
  timestamp: string; // ISO timestamp captured when user tapped button
  createdAt: number;
}

const STORAGE_KEY = 'ojthub_offline_punches_v1';

type QueueListener = (pendingCount: number) => void;
const listeners: Set<QueueListener> = new Set();

function notifyListeners() {
  const count = offlineQueue.getPending().length;
  listeners.forEach(fn => fn(count));
}

export const offlineQueue = {
  getPending(): QueuedPunch[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to read offline attendance queue', e);
      return [];
    }
  },

  enqueue(punch: Omit<QueuedPunch, 'id' | 'createdAt'>): QueuedPunch {
    const pending = this.getPending();
    const item: QueuedPunch = {
      ...punch,
      id: `punch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: Date.now()
    };
    pending.push(item);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
    notifyListeners();
    return item;
  },

  remove(id: string): void {
    const pending = this.getPending().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
    notifyListeners();
  },

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    notifyListeners();
  },

  subscribe(listener: QueueListener): () => void {
    listeners.add(listener);
    listener(this.getPending().length);
    return () => listeners.delete(listener);
  },

  async flush(syncHandler: (punch: QueuedPunch) => Promise<boolean>): Promise<{ synced: number; remaining: number }> {
    const pending = this.getPending();
    if (pending.length === 0) return { synced: 0, remaining: 0 };

    let syncedCount = 0;
    const remainingPunches: QueuedPunch[] = [];

    for (const punch of pending) {
      try {
        const success = await syncHandler(punch);
        if (success) {
          syncedCount++;
        } else {
          remainingPunches.push(punch);
        }
      } catch (err) {
        console.warn('Failed to sync punch', punch.id, err);
        remainingPunches.push(punch);
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingPunches));
    notifyListeners();
    return { synced: syncedCount, remaining: remainingPunches.length };
  }
};
