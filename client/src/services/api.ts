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

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('ojthub_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errJson = await res.json();
      errorMsg = errJson.message || errJson.title || JSON.stringify(errJson);
    } catch {
      errorMsg = await res.text() || res.statusText;
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
      return handleResponse<AuthResponse>(res);
    },
    async login(data: { email: string; password: string }): Promise<AuthResponse> {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse<AuthResponse>(res);
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
      const res = await fetch(`${API_BASE}/settings`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse<OjtSetting>(res);
    },
    async update(data: Partial<OjtSetting>): Promise<OjtSetting> {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(data)
      });
      return handleResponse<OjtSetting>(res);
    }
  },

  attendance: {
    async timeIn(latitude: number, longitude: number, accuracy: number): Promise<AttendanceRecord> {
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
      const res = await fetch(`${API_BASE}/attendance/status`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse<AttendanceStatus>(res);
    },
    async getHistory(month?: number, year?: number): Promise<AttendanceRecord[]> {
      const params = new URLSearchParams();
      if (month) params.append('month', month.toString());
      if (year) params.append('year', year.toString());
      const res = await fetch(`${API_BASE}/attendance/history?${params.toString()}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse<AttendanceRecord[]>(res);
    },
    async getHoursSummary(): Promise<HoursSummary> {
      const res = await fetch(`${API_BASE}/attendance/hours/summary`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse<HoursSummary>(res);
    }
  },

  activities: {
    async list(startDate?: string, endDate?: string): Promise<ActivityLog[]> {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await fetch(`${API_BASE}/activities?${params.toString()}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse<ActivityLog[]>(res);
    },
    async create(data: { date: string; taskTitle: string; details: string; hoursSpent?: number; category?: string }): Promise<ActivityLog> {
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
      const res = await fetch(`${API_BASE}/reports/ai-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(data)
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
  }
};
