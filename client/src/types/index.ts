export type UserRole = 'Trainee' | 'Supervisor';

export interface User {
  id: string;
  email: string;
  fullName: string;
  studentId?: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface OjtSetting {
  id: string;
  companyName: string;
  workplaceLatitude: number;
  workplaceLongitude: number;
  geofenceRadiusMeters: number;
  gpsAccuracyThreshold: number;
  targetTotalHours: number;
  dailyScheduleHours: number;
  defaultLunchMinutes: number;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  date: string;
  timeIn: string;
  timeInLatitude: number;
  timeInLongitude: number;
  timeInDistance: number;
  timeInGpsAccuracy: number;
  timeInWithinGeofence: boolean;
  timeOut?: string;
  timeOutLatitude?: number;
  timeOutLongitude?: number;
  timeOutDistance?: number;
  timeOutGpsAccuracy?: number;
  timeOutWithinGeofence?: boolean;
  lunchBreakMinutes: number;
  netRenderedHours?: number;
  isVerified: boolean;
  verifiedAt?: string;
  supervisorRemark?: string;
}

export interface AttendanceStatus {
  hasActiveShift: boolean;
  todayRecord?: AttendanceRecord | null;
  settings?: OjtSetting | null;
}

export interface HoursSummary {
  targetHours: number;
  renderedHours: number;
  remainingHours: number;
  completionPercentage: number;
  totalDaysRendered: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  date: string;
  taskTitle: string;
  details: string;
  hoursSpent?: number;
  category: string;
  createdAt: string;
}

export interface GeneratedReport {
  id: string;
  userId: string;
  reportType: string;
  startDate: string;
  endDate: string;
  aiGeneratedContent: string;
  editedContent?: string;
  createdAt: string;
}

export interface TraineeSummary {
  traineeId: string;
  fullName: string;
  email: string;
  studentId?: string;
  companyName: string;
  targetTotalHours: number;
  renderedHours: number;
  completionPercentage: number;
  pendingVerificationCount: number;
}
