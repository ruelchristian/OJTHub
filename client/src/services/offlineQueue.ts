// Offline Attendance & Perimeter Audit Sync Queue Service
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

export interface QueuedPerimeterEvent {
  id: string;
  attendanceRecordId?: string;
  eventType: 'Departed' | 'Returned' | 'LocationDisabled' | 'LocationRestored';
  latitude: number;
  longitude: number;
  distanceMeters: number;
  gpsAccuracy: number;
  note?: string;
  timestamp: string; // ISO timestamp captured when event occurred
  createdAt: number;
}

const STORAGE_KEY_PUNCHES = 'ojthub_offline_punches_v1';
const STORAGE_KEY_PERIMETER = 'ojthub_offline_perimeter_events_v1';

type QueueListener = (pendingCount: number) => void;
const listeners: Set<QueueListener> = new Set();

function notifyListeners() {
  const count = offlineQueue.getTotalPendingCount();
  listeners.forEach(fn => fn(count));
}

export const offlineQueue = {
  getPending(): QueuedPunch[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PUNCHES);
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
    localStorage.setItem(STORAGE_KEY_PUNCHES, JSON.stringify(pending));
    notifyListeners();
    return item;
  },

  remove(id: string): void {
    const pending = this.getPending().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY_PUNCHES, JSON.stringify(pending));
    notifyListeners();
  },

  clear(): void {
    localStorage.removeItem(STORAGE_KEY_PUNCHES);
    notifyListeners();
  },

  // Perimeter & Location Tamper Events Queue
  getPendingPerimeterEvents(): QueuedPerimeterEvent[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PERIMETER);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to read offline perimeter events queue', e);
      return [];
    }
  },

  enqueuePerimeterEvent(evt: Omit<QueuedPerimeterEvent, 'id' | 'createdAt'>): QueuedPerimeterEvent {
    const pending = this.getPendingPerimeterEvents();
    const item: QueuedPerimeterEvent = {
      ...evt,
      id: `peri_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: Date.now()
    };
    pending.push(item);
    localStorage.setItem(STORAGE_KEY_PERIMETER, JSON.stringify(pending));
    notifyListeners();
    return item;
  },

  removePerimeterEvent(id: string): void {
    const pending = this.getPendingPerimeterEvents().filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEY_PERIMETER, JSON.stringify(pending));
    notifyListeners();
  },

  clearPerimeterEvents(): void {
    localStorage.removeItem(STORAGE_KEY_PERIMETER);
    notifyListeners();
  },

  getTotalPendingCount(): number {
    return this.getPending().length + this.getPendingPerimeterEvents().length;
  },

  subscribe(listener: QueueListener): () => void {
    listeners.add(listener);
    listener(this.getTotalPendingCount());
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

    localStorage.setItem(STORAGE_KEY_PUNCHES, JSON.stringify(remainingPunches));
    notifyListeners();
    return { synced: syncedCount, remaining: remainingPunches.length };
  },

  async flushPerimeterEvents(syncHandler: (evt: QueuedPerimeterEvent) => Promise<boolean>): Promise<{ synced: number; remaining: number }> {
    const pending = this.getPendingPerimeterEvents();
    if (pending.length === 0) return { synced: 0, remaining: 0 };

    let syncedCount = 0;
    const remainingEvents: QueuedPerimeterEvent[] = [];

    for (const evt of pending) {
      try {
        const success = await syncHandler(evt);
        if (success) {
          syncedCount++;
        } else {
          remainingEvents.push(evt);
        }
      } catch (err) {
        console.warn('Failed to sync perimeter event', evt.id, err);
        remainingEvents.push(evt);
      }
    }

    localStorage.setItem(STORAGE_KEY_PERIMETER, JSON.stringify(remainingEvents));
    notifyListeners();
    return { synced: syncedCount, remaining: remainingEvents.length };
  }
};
