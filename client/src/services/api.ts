import type {
  AuthResponse,
  User,
  OjtSetting,
  AttendanceRecord,
  AttendanceStatus,
  HoursSummary,
  ActivityLog,
  GeneratedReport,
  TraineeSummary
} from '../types';
import { guestStore } from './guestStore';
import { offlineQueue } from './offlineQueue';

const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('ojthub_token');
}

function isGuestUser(): boolean {
  return !getToken() || localStorage.getItem('ojthub_guest') === 'true';
}

function getAuthHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = res.statusText || 'An error occurred';
    try {
      const text = await res.text();
      try {
        const errJson = JSON.parse(text);
        errorMsg = errJson.message || errJson.title || text;
      } catch {
        if (text) errorMsg = text;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  if (res.status === 204) {
    return {} as T;
  }
  return res.json();
}

export const api = {
  auth: {
    async register(data: { email: string; password: string; fullName: string; studentId?: string; role: string }): Promise<AuthResponse> {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const auth = await handleResponse<AuthResponse>(res);
      // Auto-sync guest records if any exist
      await api.cloudSync.syncGuestToCloud(auth.token).catch(e => console.warn('Cloud sync error after register:', e));
      return auth;
    },

    async login(data: { email: string; password: string }): Promise<AuthResponse> {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const auth = await handleResponse<AuthResponse>(res);
      // Auto-sync guest records if any exist
      await api.cloudSync.syncGuestToCloud(auth.token).catch(e => console.warn('Cloud sync error after login:', e));
      return auth;
    },

    async me(): Promise<User> {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse<User>(res);
    }
  },

  settings: {
    async get(): Promise<OjtSetting> {
      if (isGuestUser()) {
        return guestStore.getSettings();
      }
      try {
        const res = await fetch(`${API_BASE}/settings`, {
          headers: { ...getAuthHeader() }
        });
        return await handleResponse<OjtSetting>(res);
      } catch (err) {
        console.warn('Backend settings fetch failed, falling back to local store', err);
        return guestStore.getSettings();
      }
    },

    async update(data: Partial<OjtSetting>): Promise<OjtSetting> {
      if (isGuestUser()) {
        return guestStore.updateSettings(data);
      }
      try {
        const res = await fetch(`${API_BASE}/settings`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          },
          body: JSON.stringify(data)
        });
        return await handleResponse<OjtSetting>(res);
      } catch (err) {
        console.warn('Backend settings update failed, saving locally', err);
        return guestStore.updateSettings(data);
      }
    }
  },

  attendance: {
    async timeIn(latitude: number, longitude: number, accuracy: number, clientTimestamp?: string): Promise<AttendanceRecord> {
      if (isGuestUser()) {
        return guestStore.timeIn(latitude, longitude, accuracy);
      }
      const punchTime = clientTimestamp || new Date().toISOString();
      try {
        const res = await fetch(`${API_BASE}/attendance/time-in`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          },
          body: JSON.stringify({ latitude, longitude, accuracy, clientTimestamp: punchTime })
        });
        return await handleResponse<AttendanceRecord>(res);
      } catch (err: any) {
        if (!navigator.onLine || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.message?.includes('network')) {
          offlineQueue.enqueue({
            type: 'timeIn',
            latitude,
            longitude,
            accuracy,
            timestamp: punchTime
          });
          return guestStore.timeIn(latitude, longitude, accuracy);
        }
        throw err;
      }
    },

    async timeOut(latitude: number, longitude: number, accuracy: number, customLunchMinutes?: number, clientTimestamp?: string): Promise<AttendanceRecord> {
      if (isGuestUser()) {
        return guestStore.timeOut(latitude, longitude, accuracy, customLunchMinutes);
      }
      const punchTime = clientTimestamp || new Date().toISOString();
      try {
        const res = await fetch(`${API_BASE}/attendance/time-out`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          },
          body: JSON.stringify({ latitude, longitude, accuracy, customLunchMinutes, clientTimestamp: punchTime })
        });
        return await handleResponse<AttendanceRecord>(res);
      } catch (err: any) {
        if (!navigator.onLine || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.message?.includes('network')) {
          offlineQueue.enqueue({
            type: 'timeOut',
            latitude,
            longitude,
            accuracy,
            customLunchMinutes,
            timestamp: punchTime
          });
          return guestStore.timeOut(latitude, longitude, accuracy, customLunchMinutes);
        }
        throw err;
      }
    },

    async syncOfflineQueue(): Promise<{ synced: number; remaining: number }> {
      if (isGuestUser() || !navigator.onLine) {
        return { synced: 0, remaining: offlineQueue.getPending().length };
      }
      return await offlineQueue.flush(async (punch) => {
        try {
          if (punch.type === 'timeIn') {
            const res = await fetch(`${API_BASE}/attendance/time-in`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
              },
              body: JSON.stringify({
                latitude: punch.latitude,
                longitude: punch.longitude,
                accuracy: punch.accuracy,
                clientTimestamp: punch.timestamp
              })
            });
            return res.ok;
          } else if (punch.type === 'timeOut') {
            const res = await fetch(`${API_BASE}/attendance/time-out`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
              },
              body: JSON.stringify({
                latitude: punch.latitude,
                longitude: punch.longitude,
                accuracy: punch.accuracy,
                customLunchMinutes: punch.customLunchMinutes,
                clientTimestamp: punch.timestamp
              })
            });
            return res.ok;
          }
          return false;
        } catch {
          return false;
        }
      });
    },

    async getStatus(): Promise<AttendanceStatus> {
      if (isGuestUser()) {
        return guestStore.getStatus();
      }
      try {
        const res = await fetch(`${API_BASE}/attendance/status`, {
          headers: { ...getAuthHeader() }
        });
        return await handleResponse<AttendanceStatus>(res);
      } catch (err) {
        console.warn('Backend status fetch failed, using local status', err);
        return guestStore.getStatus();
      }
    },

    async getHistory(month?: number, year?: number): Promise<AttendanceRecord[]> {
      if (isGuestUser()) {
        return guestStore.getHistory(month, year);
      }
      try {
        const params = new URLSearchParams();
        if (month) params.append('month', month.toString());
        if (year) params.append('year', year.toString());
        const res = await fetch(`${API_BASE}/attendance/history?${params.toString()}`, {
          headers: { ...getAuthHeader() }
        });
        return await handleResponse<AttendanceRecord[]>(res);
      } catch (err) {
        console.warn('Backend history fetch failed, using local records', err);
        return guestStore.getHistory(month, year);
      }
    },

    async getHoursSummary(): Promise<HoursSummary> {
      if (isGuestUser()) {
        return guestStore.getHoursSummary();
      }
      try {
        const res = await fetch(`${API_BASE}/attendance/hours/summary`, {
          headers: { ...getAuthHeader() }
        });
        return await handleResponse<HoursSummary>(res);
      } catch (err) {
        console.warn('Backend summary fetch failed, using local calculation', err);
        return guestStore.getHoursSummary();
      }
    },

    async logPerimeterEvent(data: {
      attendanceRecordId?: string;
      eventType: 'Departed' | 'Returned';
      latitude: number;
      longitude: number;
      distanceMeters: number;
      gpsAccuracy: number;
      note?: string;
    }): Promise<{ message: string; logId?: string; breachCount?: number }> {
      if (isGuestUser()) {
        return { message: 'Perimeter event noted locally', breachCount: 1 };
      }
      try {
        const res = await fetch(`${API_BASE}/attendance/perimeter-event`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          },
          body: JSON.stringify(data)
        });
        return await handleResponse<{ message: string; logId?: string; breachCount?: number }>(res);
      } catch (err) {
        console.warn('Failed to log perimeter event to server', err);
        return { message: 'Perimeter event cached offline', breachCount: 1 };
      }
    }
  },

  activities: {
    async list(startDate?: string, endDate?: string): Promise<ActivityLog[]> {
      if (isGuestUser()) {
        return guestStore.getActivities(startDate, endDate);
      }
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const res = await fetch(`${API_BASE}/activities?${params.toString()}`, {
          headers: { ...getAuthHeader() }
        });
        return await handleResponse<ActivityLog[]>(res);
      } catch (err) {
        console.warn('Backend activity fetch failed, using local activities', err);
        return guestStore.getActivities(startDate, endDate);
      }
    },

    async create(data: { date: string; taskTitle: string; details: string; hoursSpent?: number; category?: string }): Promise<ActivityLog> {
      if (isGuestUser()) {
        return guestStore.createActivity(data);
      }
      const res = await fetch(`${API_BASE}/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(data)
      });
      return handleResponse<ActivityLog>(res);
    },

    async update(id: string, data: { taskTitle: string; details: string; hoursSpent?: number; category?: string }): Promise<ActivityLog> {
      if (isGuestUser()) {
        return guestStore.updateActivity(id, data);
      }
      const res = await fetch(`${API_BASE}/activities/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(data)
      });
      return handleResponse<ActivityLog>(res);
    },

    async delete(id: string): Promise<void> {
      if (isGuestUser()) {
        guestStore.deleteActivity(id);
        return;
      }
      const res = await fetch(`${API_BASE}/activities/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
      return handleResponse<void>(res);
    },

    async polish(data: { taskTitle: string; details?: string; category?: string }): Promise<{ polishedDetails: string }> {
      try {
        const res = await fetch(`${API_BASE}/activities/polish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          },
          body: JSON.stringify(data)
        });
        if (res.ok) {
          return await handleResponse<{ polishedDetails: string }>(res);
        }
      } catch (e) {
        console.warn('Backend polish failed, using client-side fallback polish', e);
      }
      // Graceful offline/guest fallback
      const title = data.taskTitle.trim() || 'assigned task';
      const raw = (data.details || '').trim().replace(/\.$/, '');
      const category = data.category || 'General';
      if (raw) {
        return {
          polishedDetails: `Spearheaded ${title.toLowerCase()}: ${raw}. Ensured thorough validation and adherence to institutional ${category.toLowerCase()} standards.`
        };
      }
      return {
        polishedDetails: `Successfully completed operational deliverables for ${title.toLowerCase()} within ${category.toLowerCase()} scope, documenting key findings and verifying functional requirements.`
      };
    }
  },

  reports: {
    async generateAi(data: { reportType: string; startDate: string; endDate: string; customNotes?: string }): Promise<{
      reportType: string;
      startDate: string;
      endDate: string;
      draftContent: string;
      referencedActivitiesCount: number;
    }> {
      const guestActivities = isGuestUser()
        ? guestStore.getActivities(data.startDate, data.endDate).map(a => ({
            date: a.date,
            taskTitle: a.taskTitle,
            details: a.details,
            hoursSpent: a.hoursSpent || 0,
            category: a.category
          }))
        : undefined;

      const res = await fetch(`${API_BASE}/reports/ai-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          ...data,
          guestActivities
        })
      });
      return handleResponse<{
        reportType: string;
        startDate: string;
        endDate: string;
        draftContent: string;
        referencedActivitiesCount: number;
      }>(res);
    },

    async save(data: { reportType: string; startDate: string; endDate: string; finalContent: string }): Promise<GeneratedReport> {
      if (isGuestUser()) {
        return guestStore.saveReport(data);
      }
      const res = await fetch(`${API_BASE}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(data)
      });
      return handleResponse<GeneratedReport>(res);
    },

    async list(reportType?: string): Promise<GeneratedReport[]> {
      if (isGuestUser()) {
        const reps = guestStore.getReports();
        return reportType ? reps.filter(r => r.reportType === reportType) : reps;
      }
      const params = new URLSearchParams();
      if (reportType) params.append('reportType', reportType);
      const res = await fetch(`${API_BASE}/reports?${params.toString()}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse<GeneratedReport[]>(res);
    }
  },

  supervisor: {
    async getMyCode(): Promise<{ code: string; fullName: string }> {
      const res = await fetch(`${API_BASE}/supervisor/my-code`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse<{ code: string; fullName: string }>(res);
    },

    async linkCode(code: string): Promise<{ message: string; supervisorId: string; supervisorName: string; companyName: string }> {
      const res = await fetch(`${API_BASE}/supervisor/link-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ code })
      });
      return handleResponse<{ message: string; supervisorId: string; supervisorName: string; companyName: string }>(res);
    },

    async unlink(): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/supervisor/unlink`, {
        method: 'POST',
        headers: { ...getAuthHeader() }
      });
      return handleResponse<{ message: string }>(res);
    },

    async getTrainees(): Promise<TraineeSummary[]> {
      const res = await fetch(`${API_BASE}/supervisor/trainees`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse<TraineeSummary[]>(res);
    },

    async getTraineeAttendance(traineeId: string, month?: number, year?: number): Promise<AttendanceRecord[]> {
      const params = new URLSearchParams();
      if (month) params.append('month', month.toString());
      if (year) params.append('year', year.toString());
      const res = await fetch(`${API_BASE}/supervisor/trainees/${traineeId}/attendance?${params.toString()}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse<AttendanceRecord[]>(res);
    },

    async updateTraineeSettings(traineeId: string, data: Partial<OjtSetting>): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/supervisor/trainees/${traineeId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(data)
      });
      return handleResponse<{ message: string }>(res);
    },

    async broadcastSettings(data: Partial<OjtSetting>): Promise<{ message: string; count: number }> {
      const res = await fetch(`${API_BASE}/supervisor/broadcast-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(data)
      });
      return handleResponse<{ message: string; count: number }>(res);
    },

    async verify(attendanceRecordId: string, remark?: string): Promise<{ message: string; recordId: string }> {
      const res = await fetch(`${API_BASE}/supervisor/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ attendanceRecordId, remark })
      });
      return handleResponse<{ message: string; recordId: string }>(res);
    },

    async batchVerify(traineeId: string, onlyWithinGeofence: boolean = true, defaultRemark: string = 'Verified by Supervisor'): Promise<{ message: string; count: number }> {
      const res = await fetch(`${API_BASE}/supervisor/verify-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ traineeId, onlyWithinGeofence, defaultRemark })
      });
      return handleResponse<{ message: string; count: number }>(res);
    }
  },

  cloudSync: {
    async syncGuestToCloud(token: string): Promise<void> {
      if (!guestStore.hasGuestData()) return;

      const settings = guestStore.getSettings();
      const authHeader = { Authorization: `Bearer ${token}` };

      // 1. Sync Settings
      try {
        await fetch(`${API_BASE}/settings`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader
          },
          body: JSON.stringify(settings)
        });
      } catch (e) {
        console.warn('Sync settings error', e);
      }

      // 2. Sync Activities
      const activities = guestStore.getActivities();
      for (const act of activities) {
        try {
          await fetch(`${API_BASE}/activities`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...authHeader
            },
            body: JSON.stringify({
              date: act.date,
              taskTitle: act.taskTitle,
              details: act.details,
              hoursSpent: act.hoursSpent,
              category: act.category
            })
          });
        } catch (e) {
          console.warn('Sync activity error', e);
        }
      }

      // Clear local guest cache once synced
      guestStore.clearGuestData();
    }
  }
};

// Automatically sync queued punches when connectivity is restored
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    api.attendance.syncOfflineQueue().catch(e => console.warn('Auto-sync error on reconnect:', e));
  });
}
