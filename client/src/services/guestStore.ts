import type {
  OjtSetting,
  AttendanceRecord,
  AttendanceStatus,
  HoursSummary,
  ActivityLog,
  GeneratedReport
} from '../types';
import { calculateDistanceMeters } from '../utils/geo';

const SETTINGS_KEY = 'ojthub_guest_settings';
const ATTENDANCE_KEY = 'ojthub_guest_attendance';
const ACTIVITIES_KEY = 'ojthub_guest_activities';
const REPORTS_KEY = 'ojthub_guest_reports';

const DEFAULT_SETTINGS: OjtSetting = {
  id: 'guest-settings',
  companyName: 'Host Training Establishment',
  workplaceLatitude: 14.599512,
  workplaceLongitude: 120.984222,
  geofenceRadiusMeters: 100,
  gpsAccuracyThreshold: 50,
  targetTotalHours: 486.0,
  dailyScheduleHours: 8.0,
  defaultLunchMinutes: 60
};

export const guestStore = {
  // --- Settings ---
  getSettings(): OjtSetting {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.error('Error reading guest settings', e);
    }
    return { ...DEFAULT_SETTINGS };
  },

  updateSettings(partial: Partial<OjtSetting>): OjtSetting {
    const current = this.getSettings();
    const updated: OjtSetting = {
      ...current,
      ...partial
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  },

  // --- Attendance ---
  getAttendanceRecords(): AttendanceRecord[] {
    try {
      const raw = localStorage.getItem(ATTENDANCE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error reading guest attendance', e);
    }
    return [];
  },

  getStatus(): AttendanceStatus {
    const settings = this.getSettings();
    const records = this.getAttendanceRecords();
    const todayStr = new Date().toISOString().split('T')[0];

    // Find if there is an active shift (timeIn exists and timeOut is null)
    const activeShift = records.find(r => r.date === todayStr && !r.timeOut);
    const todayRecord = activeShift || records.find(r => r.date === todayStr) || null;

    return {
      hasActiveShift: !!activeShift,
      todayRecord,
      settings
    };
  },

  timeIn(latitude: number, longitude: number, accuracy: number): AttendanceRecord {
    const settings = this.getSettings();

    // 1. GPS Accuracy Validation (Proposal Section 5.8)
    if (accuracy > settings.gpsAccuracyThreshold) {
      throw new Error(
        `GPS signal accuracy (${Math.round(accuracy)}m) does not meet the minimum requirement of ${settings.gpsAccuracyThreshold}m. Please move to an open area.`
      );
    }

    // 2. Geofence Distance Validation (Proposal Section 5.7)
    const distance = calculateDistanceMeters(
      latitude,
      longitude,
      settings.workplaceLatitude,
      settings.workplaceLongitude
    );

    if (distance > settings.geofenceRadiusMeters) {
      throw new Error(
        `Outside workplace perimeter (${distance.toFixed(1)}m away). Maximum allowed radius is ${settings.geofenceRadiusMeters}m.`
      );
    }

    // 3. Attendance State Validation (Proposal Section 5.9)
    const records = this.getAttendanceRecords();
    const todayStr = new Date().toISOString().split('T')[0];
    const existingActive = records.find(r => r.date === todayStr && !r.timeOut);
    if (existingActive) {
      throw new Error('An active shift is already in progress for today. Please Time-Out before starting a new shift.');
    }

    const newRecord: AttendanceRecord = {
      id: 'guest_att_' + Date.now(),
      userId: 'guest',
      userName: 'Guest Trainee',
      date: todayStr,
      timeIn: new Date().toISOString(),
      timeInLatitude: latitude,
      timeInLongitude: longitude,
      timeInDistance: distance,
      timeInGpsAccuracy: accuracy,
      timeInWithinGeofence: true,
      lunchBreakMinutes: settings.defaultLunchMinutes,
      isVerified: false
    };

    records.push(newRecord);
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records));
    return newRecord;
  },

  timeOut(latitude: number, longitude: number, accuracy: number, customLunchMinutes?: number): AttendanceRecord {
    const settings = this.getSettings();

    // 1. GPS Accuracy Validation
    if (accuracy > settings.gpsAccuracyThreshold) {
      throw new Error(
        `GPS signal accuracy (${Math.round(accuracy)}m) does not meet the minimum requirement of ${settings.gpsAccuracyThreshold}m.`
      );
    }

    // 2. Geofence Distance Validation
    const distance = calculateDistanceMeters(
      latitude,
      longitude,
      settings.workplaceLatitude,
      settings.workplaceLongitude
    );

    if (distance > settings.geofenceRadiusMeters) {
      throw new Error(
        `Outside workplace perimeter (${distance.toFixed(1)}m away). Maximum allowed radius is ${settings.geofenceRadiusMeters}m.`
      );
    }

    // 3. State validation
    const records = this.getAttendanceRecords();
    const todayStr = new Date().toISOString().split('T')[0];
    const activeIndex = records.findIndex(r => r.date === todayStr && !r.timeOut);
    if (activeIndex === -1) {
      throw new Error('No active Time-In shift found for today to complete Time-Out.');
    }

    const targetRecord = records[activeIndex];
    const timeOutDate = new Date();
    const timeInDate = new Date(targetRecord.timeIn);
    const durationHours = (timeOutDate.getTime() - timeInDate.getTime()) / (1000 * 60 * 60);

    const lunchMinutes = customLunchMinutes ?? settings.defaultLunchMinutes;
    const lunchHours = lunchMinutes / 60;
    const netHours = Math.max(0, Math.round((durationHours - lunchHours) * 100) / 100);

    const updatedRecord: AttendanceRecord = {
      ...targetRecord,
      timeOut: timeOutDate.toISOString(),
      timeOutLatitude: latitude,
      timeOutLongitude: longitude,
      timeOutDistance: distance,
      timeOutGpsAccuracy: accuracy,
      timeOutWithinGeofence: true,
      lunchBreakMinutes: lunchMinutes,
      netRenderedHours: netHours
    };

    records[activeIndex] = updatedRecord;
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records));
    return updatedRecord;
  },

  getHistory(month?: number, year?: number): AttendanceRecord[] {
    const records = this.getAttendanceRecords();
    return records
      .filter(r => {
        if (!month && !year) return true;
        const d = new Date(r.date);
        const matchMonth = month ? d.getMonth() + 1 === month : true;
        const matchYear = year ? d.getFullYear() === year : true;
        return matchMonth && matchYear;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  getHoursSummary(): HoursSummary {
    const settings = this.getSettings();
    const records = this.getAttendanceRecords();

    const targetHours = settings.targetTotalHours;
    const renderedHours = records.reduce((sum, r) => sum + (r.netRenderedHours || 0), 0);
    const remainingHours = Math.max(0, targetHours - renderedHours);
    const completionPercentage = targetHours > 0
      ? Math.min(100, Math.round((renderedHours / targetHours) * 1000) / 10)
      : 0;

    const completedDays = records.filter(r => !!r.timeOut).length;

    return {
      targetHours: Math.round(targetHours * 10) / 10,
      renderedHours: Math.round(renderedHours * 100) / 100,
      remainingHours: Math.round(remainingHours * 100) / 100,
      completionPercentage,
      totalDaysRendered: completedDays
    };
  },

  // --- Activities ---
  getActivities(startDate?: string, endDate?: string): ActivityLog[] {
    try {
      const raw = localStorage.getItem(ACTIVITIES_KEY);
      const list: ActivityLog[] = raw ? JSON.parse(raw) : [];
      return list
        .filter(a => {
          if (startDate && a.date < startDate) return false;
          if (endDate && a.date > endDate) return false;
          return true;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (e) {
      console.error('Error reading guest activities', e);
      return [];
    }
  },

  createActivity(data: { date: string; taskTitle: string; details: string; hoursSpent?: number; category?: string }): ActivityLog {
    const list = this.getActivities();
    const newAct: ActivityLog = {
      id: 'guest_act_' + Date.now(),
      userId: 'guest',
      date: data.date,
      taskTitle: data.taskTitle,
      details: data.details,
      hoursSpent: data.hoursSpent || 0,
      category: data.category || 'General',
      createdAt: new Date().toISOString()
    };
    list.unshift(newAct);
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(list));
    return newAct;
  },

  updateActivity(id: string, data: { taskTitle: string; details: string; hoursSpent?: number; category?: string }): ActivityLog {
    const list = this.getActivities();
    const idx = list.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Activity not found');
    list[idx] = {
      ...list[idx],
      taskTitle: data.taskTitle,
      details: data.details,
      hoursSpent: data.hoursSpent ?? list[idx].hoursSpent,
      category: data.category || list[idx].category
    };
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(list));
    return list[idx];
  },

  deleteActivity(id: string): void {
    const list = this.getActivities().filter(a => a.id !== id);
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(list));
  },

  // --- Reports ---
  getReports(): GeneratedReport[] {
    try {
      const raw = localStorage.getItem(REPORTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Error reading guest reports', e);
      return [];
    }
  },

  saveReport(data: { reportType: string; startDate: string; endDate: string; finalContent: string }): GeneratedReport {
    const reports = this.getReports();
    const newReport: GeneratedReport = {
      id: 'guest_rep_' + Date.now(),
      userId: 'guest',
      reportType: data.reportType,
      startDate: data.startDate,
      endDate: data.endDate,
      aiGeneratedContent: data.finalContent,
      editedContent: data.finalContent,
      createdAt: new Date().toISOString()
    };
    reports.unshift(newReport);
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
    return newReport;
  },

  hasGuestData(): boolean {
    return !!(
      localStorage.getItem(ATTENDANCE_KEY) ||
      localStorage.getItem(ACTIVITIES_KEY) ||
      localStorage.getItem(SETTINGS_KEY)
    );
  },

  clearGuestData(): void {
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(ATTENDANCE_KEY);
    localStorage.removeItem(ACTIVITIES_KEY);
    localStorage.removeItem(REPORTS_KEY);
  }
};
