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
    async timeIn(latitude: number, longitude: number, accuracy: number): Promise<AttendanceRecord> {
      if (isGuestUser()) {
        return guestStore.timeIn(latitude, longitude, accuracy);
      }
      const res = await fetch(`${API_BASE}/attendance/time-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ latitude, longitude, accuracy })
      });
      return handleResponse<AttendanceRecord>(res);
    },

    async timeOut(latitude: number, longitude: number, accuracy: number, customLunchMinutes?: number): Promise<AttendanceRecord> {
      if (isGuestUser()) {
        return guestStore.timeOut(latitude, longitude, accuracy, customLunchMinutes);
      }
      const res = await fetch(`${API_BASE}/attendance/time-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ latitude, longitude, accuracy, customLunchMinutes })
      });
      return handleResponse<AttendanceRecord>(res);
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
