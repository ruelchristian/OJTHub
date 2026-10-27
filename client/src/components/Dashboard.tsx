import React, { useState, useEffect, useRef } from 'react';

import { useGeolocation } from '../hooks/useGeolocation';

import { calculateDistanceMeters } from '../utils/geo';

import { api } from '../services/api';

import type { AttendanceStatus, HoursSummary } from '../types';

import { 

  Clock, 

  MapPin, 

  ShieldCheck, 

  AlertTriangle, 

  RefreshCw, 

  TrendingUp, 

  CalendarDays, 

  Award,

  Coffee,

  CheckCircle2,

  Map as MapIcon,

  WifiOff,

  CloudUpload,

  School,

  Info,

  X,

  Send,

  MapPinOff,

  Navigation,

  HelpCircle,

  Smartphone,

  Lock,

  RotateCcw,

  Building2

} from 'lucide-react';

import { WorkplaceMapPicker } from './WorkplaceMapPicker';

import { useAuth } from '../context/AuthContext';

import { offlineQueue } from '../services/offlineQueue';

export const Dashboard: React.FC = () => {

  const { user } = useAuth();

  const geo = useGeolocation({ watch: true });

  const [status, setStatus] = useState<AttendanceStatus | null>(null);

  const [hours, setHours] = useState<HoursSummary | null>(null);

  const [loadingAction, setLoadingAction] = useState<boolean>(false);

  const [calibrationSuccess, setCalibrationSuccess] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const [showRadarMap, setShowRadarMap] = useState<boolean>(false);
  const [showCoordinates, setShowCoordinates] = useState<boolean>(false);
  const [resolvedAddress, setResolvedAddress] = useState<string>('');

  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => offlineQueue.getTotalPendingCount());

  const [syncingOffline, setSyncingOffline] = useState<boolean>(false);

  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const [isGpsDisabled, setIsGpsDisabled] = useState<boolean>(false);

  const [outsideReasonModalOpen, setOutsideReasonModalOpen] = useState<boolean>(false);

  const [outsidePunchType, setOutsidePunchType] = useState<'in' | 'out' | null>(null);

  const [outsideReasonText, setOutsideReasonText] = useState<string>('');

  const [showPermissionGuideModal, setShowPermissionGuideModal] = useState<boolean>(false);

  const [showEarlyConfirmModal, setShowEarlyConfirmModal] = useState<boolean>(false);

  const [earlyReasonCategory, setEarlyReasonCategory] = useState<string>('accidental');

  const [earlyCustomNote, setEarlyCustomNote] = useState<string>('');

  const [showResumeConfirmModal, setShowResumeConfirmModal] = useState<boolean>(false);

  const [promptBlockedAlert, setPromptBlockedAlert] = useState<boolean>(false);

  const [requestingLocation, setRequestingLocation] = useState<boolean>(false);

  const [selectedGuideTab, setSelectedGuideTab] = useState<'android' | 'ios' | 'desktop'>(() => {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent;
      if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
      if (/Android/i.test(ua)) return 'android';
    }
    return 'desktop';
  });

  const locationActiveRef = useRef<boolean>(true);

  const lastKnownCoordsRef = useRef<{ lat: number; lng: number; dist: number } | null>(null);

  const loadData = async () => {

    try {

      const [statusRes, hoursRes] = await Promise.all([

        api.attendance.getStatus(),

        api.attendance.getHoursSummary()

      ]);

      setStatus(statusRes);

      setHours(hoursRes);

    } catch (err: any) {

      console.error('Failed to load dashboard data', err);

    }

  };

  const handleManualSync = async () => {

    if (offlineQueue.getTotalPendingCount() === 0) return;

    setSyncingOffline(true);

    try {

      const res = await api.attendance.syncOfflineQueue();

      await loadData();

      if (res.synced > 0) {

        setCalibrationSuccess(`Synchronized ${res.synced} offline record${res.synced > 1 ? 's' : ''}!`);

        setTimeout(() => setCalibrationSuccess(null), 4000);

      }

    } catch (err: any) {

      console.warn('Manual sync failed:', err);

    } finally {

      setSyncingOffline(false);

    }

  };

  useEffect(() => {
    loadData();

    const unsub = offlineQueue.subscribe((count) => {
      setPendingSyncCount(count);
    });

    const handleOnline = () => {
      setIsOnline(true);
      handleManualSync();
    };

    const handleOffline = () => setIsOnline(false);

    // Live re-fetching when window gains focus or tab becomes visible
    const handleFocus = () => {
      loadData();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cross-tab real-time sync via BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('ojthub_rules_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'RULES_UPDATED') {
          loadData();
        }
      };
    } catch {
      // Ignore if unsupported
    }

    // Periodic live polling (every 15 seconds) so supervisor updates propagate dynamically
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    }, 15000);

    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (bc) bc.close();
      clearInterval(pollInterval);
    };
  }, [user?.id]);

  // Timer for active shift

  useEffect(() => {

    if (!status?.hasActiveShift || !status.todayRecord?.timeIn) {

      setElapsedSeconds(0);

      return;

    }

    const startTime = new Date(status.todayRecord.timeIn).getTime();

    const interval = setInterval(() => {

      const now = new Date().getTime();

      const diff = Math.max(0, Math.floor((now - startTime) / 1000));

      setElapsedSeconds(diff);

    }, 1000);

    return () => clearInterval(interval);

  }, [status?.hasActiveShift, status?.todayRecord?.timeIn]);

  const workplaceLat = status?.settings?.workplaceLatitude ?? 14.583916;

  const workplaceLng = status?.settings?.workplaceLongitude ?? 121.063291;

  const companyName = status?.settings?.companyName || 'Host Training Establishment';

  const companyAddress = status?.settings?.companyAddress || '';

  useEffect(() => {
    if (companyAddress) {
      setResolvedAddress(companyAddress);
      return;
    }

    const cacheKey = `ojt_addr_${workplaceLat.toFixed(4)}_${workplaceLng.toFixed(4)}`;
    const cached = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(cacheKey) : null;
    if (cached) {
      setResolvedAddress(cached);
      return;
    }

    let isMounted = true;
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${workplaceLat}&lon=${workplaceLng}&zoom=18&addressdetails=1`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!isMounted || !data) return;
        const addr = data.display_name || '';
        if (addr) {
          setResolvedAddress(addr);
          try {
            sessionStorage.setItem(cacheKey, addr);
          } catch {}
        }
      })
      .catch(() => {});

    return () => { isMounted = false; };
  }, [companyAddress, workplaceLat, workplaceLng]);

  const allowedRadius = status?.settings?.geofenceRadiusMeters ?? 100;

  const accuracyLimit = status?.settings?.gpsAccuracyThreshold ?? 150;

  const currentDistance = (geo.latitude !== null && geo.longitude !== null)

    ? calculateDistanceMeters(geo.latitude, geo.longitude, workplaceLat, workplaceLng)

    : null;

  const isWithinGeofence = currentDistance !== null && currentDistance <= allowedRadius;

  const isGpsAccurate = geo.accuracy !== null && geo.accuracy <= accuracyLimit;

  // Active shift perimeter status & incident logger

  const [perimeterStatus, setPerimeterStatus] = useState<'Inside' | 'Outside' | null>(null);

  const lastPerimeterStateRef = useRef<'Inside' | 'Outside' | null>(null);

  useEffect(() => {

    if (!status?.hasActiveShift || !status.todayRecord?.id || currentDistance === null || !isGpsAccurate) {

      return;

    }

    const isInside = currentDistance <= allowedRadius;

    const currentState = isInside ? 'Inside' : 'Outside';

    if (lastPerimeterStateRef.current === null) {

      lastPerimeterStateRef.current = currentState;

      setPerimeterStatus(currentState);

      return;

    }

    if (lastPerimeterStateRef.current !== currentState) {

      const eventType = currentState === 'Outside' ? 'Departed' : 'Returned';

      lastPerimeterStateRef.current = currentState;

      setPerimeterStatus(currentState);

      api.attendance.logPerimeterEvent({

        attendanceRecordId: status.todayRecord.id,

        eventType,

        latitude: geo.latitude!,

        longitude: geo.longitude!,

        distanceMeters: Math.round(currentDistance),

        gpsAccuracy: geo.accuracy || 15,

        note: eventType === 'Departed'

          ? `Stepped outside geofence perimeter (${Math.round(currentDistance)}m from workplace)`

          : `Re-entered workplace perimeter (${Math.round(currentDistance)}m from workplace)`

      }).then(() => {

        if (eventType === 'Departed') {

          setStatus(prev => {

            if (!prev?.todayRecord) return prev;

            return {

              ...prev,

              todayRecord: {

                ...prev.todayRecord,

                perimeterBreachCount: (prev.todayRecord.perimeterBreachCount || 0) + 1

              }

            };

          });

        }

      }).catch(err => console.warn('Could not log perimeter event:', err));

    }

  }, [status?.hasActiveShift, status?.todayRecord?.id, currentDistance, allowedRadius, isGpsAccurate]);

  // Keep track of latest known coordinates

  useEffect(() => {

    if (geo.latitude !== null && geo.longitude !== null && currentDistance !== null) {

      lastKnownCoordsRef.current = {

        lat: geo.latitude,

        lng: geo.longitude,

        dist: currentDistance

      };

    }

  }, [geo.latitude, geo.longitude, currentDistance]);

  // Monitor GPS loss or location disable during an active shift

  useEffect(() => {

    if (!status?.hasActiveShift || !status.todayRecord?.id) {

      return;

    }

    // If geolocation encountered an error (e.g. permission revoked, GPS turned off)

    if (geo.error && locationActiveRef.current) {

      locationActiveRef.current = false;

      setIsGpsDisabled(true);

      const lat = lastKnownCoordsRef.current?.lat ?? workplaceLat;

      const lng = lastKnownCoordsRef.current?.lng ?? workplaceLng;

      const dist = lastKnownCoordsRef.current?.dist ?? 0;

      api.attendance.logPerimeterEvent({

        attendanceRecordId: status.todayRecord.id,

        eventType: 'LocationDisabled',

        latitude: lat,

        longitude: lng,

        distanceMeters: Math.round(dist),

        gpsAccuracy: 0,

        note: `GPS signal lost or location permission revoked during active shift (${geo.error})`

      }).then(() => {

        setStatus(prev => {

          if (!prev?.todayRecord) return prev;

          return {

            ...prev,

            todayRecord: {

              ...prev.todayRecord,

              perimeterBreachCount: (prev.todayRecord.perimeterBreachCount || 0) + 1

            }

          };

        });

      }).catch(err => console.warn('Could not log location disabled event:', err));

    }

    // If geolocation recovered after being disabled

    if (geo.latitude !== null && geo.longitude !== null && !locationActiveRef.current) {

      locationActiveRef.current = true;

      setIsGpsDisabled(false);

      api.attendance.logPerimeterEvent({

        attendanceRecordId: status.todayRecord.id,

        eventType: 'LocationRestored',

        latitude: geo.latitude,

        longitude: geo.longitude,

        distanceMeters: Math.round(currentDistance ?? 0),

        gpsAccuracy: geo.accuracy || 15,

        note: 'Device location signal restored'

      }).catch(err => console.warn('Could not log location restored event:', err));

    }

  }, [status?.hasActiveShift, status?.todayRecord?.id, geo.error, geo.latitude, geo.longitude, currentDistance, workplaceLat, workplaceLng]);

  const formatElapsed = (sec: number) => {

    const h = Math.floor(sec / 3600);

    const m = Math.floor((sec % 3600) / 60);

    const s = sec % 60;

    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  };

  const handleTurnOnLocation = async () => {
    setRequestingLocation(true);
    setActionError(null);
    setPromptBlockedAlert(false);
    try {
      const granted = await geo.requestPermission();
      if (!granted) {
        setShowPermissionGuideModal(true);
      }
    } finally {
      setRequestingLocation(false);
    }
  };

  const executePunch = async (punchType: 'in' | 'out', studentRemark?: string) => {
    const hasCoords = geo.latitude !== null && geo.longitude !== null && geo.accuracy !== null;
    if (!hasCoords && !studentRemark) {
      setOutsidePunchType(punchType);
      setOutsideReasonText('');
      setOutsideReasonModalOpen(true);
      return;
    }

    setActionError(null);
    setLoadingAction(true);

    const lat = geo.latitude ?? 0;
    const lng = geo.longitude ?? 0;
    const acc = geo.accuracy ?? 0;
    const effectiveRemark = !hasCoords
      ? (studentRemark ? `[No GPS Fix] ${studentRemark}` : '[No GPS Fix - Location Disabled]')
      : studentRemark;

    try {
      if (punchType === 'in') {
        await api.attendance.timeIn(lat, lng, acc, undefined, effectiveRemark);
      } else {
        await api.attendance.timeOut(lat, lng, acc, undefined, undefined, effectiveRemark);
      }

      setOutsideReasonModalOpen(false);
      setOutsideReasonText('');
      setOutsidePunchType(null);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || `Failed to record ${punchType === 'in' ? 'Time-In' : 'Time-Out'}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleTimeIn = async () => {
    if (geo.latitude === null || geo.longitude === null) {
      setOutsidePunchType('in');
      setOutsideReasonText('');
      setOutsideReasonModalOpen(true);
      return;
    }
    if (!isWithinGeofence) {
      setOutsidePunchType('in');
      setOutsideReasonText('');
      setOutsideReasonModalOpen(true);
      return;
    }
    await executePunch('in');
  };

  const handleTimeOut = async () => {
    if (geo.latitude === null || geo.longitude === null) {
      setOutsidePunchType('out');
      setOutsideReasonText('');
      setOutsideReasonModalOpen(true);
      return;
    }
    if (!isWithinGeofence) {
      setOutsidePunchType('out');
      setOutsideReasonText('');
      setOutsideReasonModalOpen(true);
      return;
    }
    await executePunch('out');
  };

  const scheduledHours = status?.settings?.dailyScheduleHours ?? 8.0;

  const maxDailyHours = status?.settings?.maxDailyHours ?? 10.0;

  const lunchMinutes = status?.settings?.defaultLunchMinutes ?? 60;

  const grossElapsedHours = elapsedSeconds / 3600;

  const targetElapsedSeconds = (scheduledHours * 3600) + (lunchMinutes * 60);

  const maxElapsedSeconds = (maxDailyHours * 3600) + (lunchMinutes * 60);

  const isTargetReached = !!(status?.hasActiveShift && elapsedSeconds >= targetElapsedSeconds);

  const isMaxCapReached = !!(status?.hasActiveShift && (elapsedSeconds >= maxElapsedSeconds || grossElapsedHours >= maxDailyHours));

  const isEarlyTimeOut = !!(status?.hasActiveShift && elapsedSeconds < targetElapsedSeconds);

  const isShiftCompletedToday = !status?.hasActiveShift && !!status?.todayRecord?.timeOut;

  const completedDurationSeconds = isShiftCompletedToday && status?.todayRecord?.timeIn && status?.todayRecord?.timeOut
    ? Math.max(0, Math.floor((new Date(status.todayRecord.timeOut).getTime() - new Date(status.todayRecord.timeIn).getTime()) / 1000))
    : 0;

  const timeSinceTimeOutSeconds = isShiftCompletedToday && status?.todayRecord?.timeOut
    ? Math.max(0, Math.floor((Date.now() - new Date(status.todayRecord.timeOut).getTime()) / 1000))
    : 999999;

  const canResumeShift = isShiftCompletedToday && timeSinceTimeOutSeconds <= 1800;

  const calcEstimatedNetHours = (seconds: number) => {
    const hours = seconds / 3600;
    if (hours <= 4.0) {
      return Math.max(0, Math.round(hours * 10) / 10);
    }
    const lunchHours = lunchMinutes / 60;
    return Math.max(0, Math.round((hours - lunchHours) * 10) / 10);
  };

  const shortfallSec = Math.max(0, targetElapsedSeconds - elapsedSeconds);
  const shortfallH = Math.floor(shortfallSec / 3600);
  const shortfallM = Math.floor((shortfallSec % 3600) / 60);

  const handleTimeOutClick = () => {
    if (isEarlyTimeOut) {
      setEarlyReasonCategory('accidental');
      setEarlyCustomNote('');
      setShowEarlyConfirmModal(true);
      return;
    }
    handleTimeOut();
  };

  const handleConfirmEarlyTimeOut = async () => {
    const categoryLabels: Record<string, string> = {
      accidental: 'Accidental Punch / Testing',
      medical: 'Medical / Feeling Sick',
      permission: 'Company Permission / Sent Home Early',
      school: 'School / Academic Activity',
      emergency: 'Personal / Family Emergency',
      other: 'Early Departure'
    };
    const categoryName = categoryLabels[earlyReasonCategory] || 'Early Time-Out';
    const note = earlyCustomNote.trim();
    const fullRemark = note ? `[Early Time-Out: ${categoryName}] ${note}` : `[Early Time-Out: ${categoryName}]`;

    setShowEarlyConfirmModal(false);

    if (geo.latitude === null || geo.longitude === null || !isWithinGeofence) {
      setOutsidePunchType('out');
      setOutsideReasonText(fullRemark);
      setOutsideReasonModalOpen(true);
      return;
    }

    await executePunch('out', fullRemark);
  };

  const handleResumeShift = async () => {
    setLoadingAction(true);
    setActionError(null);
    try {
      await api.attendance.resumeShift();
      setShowResumeConfirmModal(false);
      await loadData();
      setCalibrationSuccess('Active shift successfully resumed! Your timer is running.');
      setTimeout(() => setCalibrationSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to resume shift.');
    } finally {
      setLoadingAction(false);
    }
  };

  return (

    <div className="space-y-4 sm:space-y-6 pb-6">

      {/* Institutional Class & Supervisor Indicator Banner */}

      <div className="bg-gradient-to-r from-sky-950/70 via-slate-900 to-indigo-950/70 border border-sky-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">

        <div className="flex items-start sm:items-center gap-3.5">

          <div className="w-11 h-11 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">

            <School className="w-6 h-6" />

          </div>

          <div>

            <div className="flex items-center gap-2 flex-wrap">

              <span className="text-sm sm:text-base font-extrabold text-white tracking-tight">

                {user?.schoolName || 'ICCT Colleges'}

              </span>

              {user?.department && (

                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono">

                  Section: {user.department}

                </span>

              )}

            </div>

            <div className="text-xs text-slate-300 mt-1 flex items-center gap-2 flex-wrap">

              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">

                <ShieldCheck className="w-3.5 h-3.5" />

                <span>Coordinator: <strong className="text-emerald-300">{user?.supervisorName || 'Prof. Noel Montecillo'}</strong></span>

              </span>

              <span className="text-slate-600 hidden sm:inline">&bull;</span>

              <span className="text-slate-400 text-[11px]">

                Workplace coordinates & target hours are governed by your instructor

              </span>

            </div>

          </div>

        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">

            <CheckCircle2 className="w-4 h-4 text-emerald-400" />

            <span>Officially Enrolled</span>

          </div>

        </div>

      </div>

      {/* Top Welcome & Geofence Banner */}

      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg relative overflow-hidden">

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          <div>

            <div className="flex flex-wrap items-center gap-2 text-sky-400 font-semibold text-[11px] sm:text-xs uppercase tracking-wider">

              <div className="flex items-center gap-1.5 truncate">

                <MapPin className="w-3.5 h-3.5 shrink-0" />

                <span className="truncate">{status?.settings?.companyName || 'Host Training Establishment'}</span>

              </div>

              {status?.settings?.managedBySupervisorName && (

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-[11px] font-medium tracking-normal normal-case">

                  <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />

                  Instructor: <strong className="text-white font-semibold">{status.settings.managedBySupervisorName}</strong>

                </span>

              )}

            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white mt-1 tracking-tight">

              Geofenced Attendance Console

            </h1>

            <p className="text-slate-400 text-xs sm:text-sm mt-0.5 max-w-xl">

              Verify physical proximity to your workplace boundary to log daily shifts.

            </p>

          </div>

          {/* Real-time Location Indicator Badge & Refresh */}

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">

            <div className={`flex-1 sm:flex-initial flex items-center gap-2.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold border ${

              geo.loading

                ? 'bg-slate-800/80 text-slate-300 border-slate-700'

                : isWithinGeofence

                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'

                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'

            }`}>

              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${

                geo.loading

                  ? 'bg-slate-400 animate-pulse'

                  : isWithinGeofence

                  ? 'bg-emerald-400 animate-ping'

                  : 'bg-amber-400'

              }`} />

              <div className="min-w-0">

                <div className="truncate">

                  {geo.loading

                    ? 'Detecting Location...'

                    : isWithinGeofence

                    ? 'Within Perimeter'

                    : 'Outside Workplace Boundary'}

                </div>

                {currentDistance !== null && (

                  <div className="text-[10px] opacity-80 truncate">

                    {currentDistance}m away (Radius: {allowedRadius}m)

                  </div>

                )}

              </div>

            </div>

            <button

              onClick={() => {

                geo.refreshLocation();

                loadData();

              }}

              disabled={geo.loading}

              title="Refresh GPS location & Workplace Rules"

              className="min-h-[40px] min-w-[40px] p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-slate-300 transition-all flex items-center justify-center shrink-0 cursor-pointer"

            >

              <RefreshCw className={`w-4 h-4 ${geo.loading ? 'animate-spin' : ''}`} />

            </button>

          </div>

        </div>

        {/* Workplace Location Information Bar */}

        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">

          <div className="text-slate-300 flex items-center gap-2.5 min-w-0 flex-1">

            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center shrink-0">

              <Building2 className="w-4 h-4 text-sky-400" />

            </div>

            <div className="min-w-0 flex-1">

              <div className="flex flex-wrap items-center gap-1.5 leading-tight">

                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">Host Workplace:</span>

                <strong className="text-white font-bold text-xs sm:text-sm truncate">{companyName}</strong>

                <button

                  type="button"

                  onClick={() => setShowCoordinates(!showCoordinates)}

                  className="text-[10px] text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 px-2 py-0.5 rounded-full transition-colors cursor-pointer shrink-0 font-mono"

                  title="Toggle GPS coordinates"

                >

                  {showCoordinates ? `${workplaceLat.toFixed(5)}, ${workplaceLng.toFixed(5)}` : '📍 GPS Coords'}

                </button>

              </div>

              <div className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1">

                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />

                <span className="truncate" title={resolvedAddress || 'Resolving workplace address...'}>

                  {resolvedAddress || 'Julia Vargas Ave, Ortigas Center, Pasig City'}

                </span>

                {geo.latitude !== null && showCoordinates && (

                  <span className="text-slate-400 font-mono text-[10px] ml-1 shrink-0">

                    (Your Device: {geo.latitude.toFixed(5)}, {geo.longitude?.toFixed(5)})

                  </span>

                )}

              </div>

            </div>

          </div>

          <div className="flex items-center gap-2">

            <button

              onClick={() => setShowRadarMap(!showRadarMap)}

              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${

                showRadarMap

                  ? 'bg-sky-600 text-white border-sky-500 shadow-sm'

                  : 'bg-slate-800 hover:bg-slate-700 active:scale-95 border-slate-700 text-slate-300'

              }`}

            >

              <MapIcon className="w-3.5 h-3.5" />

              <span>{showRadarMap ? 'Hide Radar' : '🗺️ Radar Map'}</span>

            </button>

          </div>

        </div>

        {/* Live Radar Map Display */}

        {showRadarMap && (

          <div className="mt-4 pt-3 border-t border-slate-800/80 animate-fade-in">

            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">

              <span className="font-semibold text-slate-200">Workplace Geofence (Configured by Instructor)</span>

              <span>Radius: <strong className="text-sky-400">{allowedRadius}m</strong></span>

            </div>

            {status?.settings ? (

              <WorkplaceMapPicker

                key={`${workplaceLat}-${workplaceLng}-${allowedRadius}`}

                latitude={workplaceLat}

                longitude={workplaceLng}

                radiusMeters={allowedRadius}

                deviceLatitude={geo.latitude}

                deviceLongitude={geo.longitude}

                height="260px"

                readOnly={true}

              />

            ) : (

              <div className="h-[260px] bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 text-xs">

                <RefreshCw className="w-4 h-4 animate-spin mr-2 text-sky-400" /> Loading workplace geofence...

              </div>

            )}

          </div>

        )}

        {/* Calibration Success Banner */}

        {calibrationSuccess && (

          <div className="mt-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-300 animate-fade-in">

            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />

            <div>{calibrationSuccess}</div>

          </div>

        )}

        {/* Offline State / Queue Banner */}

        {(!isOnline || pendingSyncCount > 0) && (

          <div className="mt-3 bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200 animate-fade-in">

            <div className="flex items-start gap-2.5 min-w-0">

              <WifiOff className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />

              <div>

                <p className="font-semibold text-amber-100">

                  {!isOnline ? 'You are currently offline' : `${pendingSyncCount} offline record${pendingSyncCount > 1 ? 's' : ''} queued`}

                </p>

                <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">

                  {pendingSyncCount > 0

                    ? 'Your exact punch timestamps and location event logs are safely preserved offline and will auto-sync once internet reconnects.'

                    : 'Attendance punches and location events will be safely stored offline and synced when you reconnect.'}

                </p>

              </div>

            </div>

            {pendingSyncCount > 0 && (

              <button

                type="button"

                onClick={handleManualSync}

                disabled={syncingOffline || !isOnline}

                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95 disabled:opacity-50"

              >

                <CloudUpload className={`w-3.5 h-3.5 ${syncingOffline ? 'animate-bounce' : ''}`} />

                <span>{syncingOffline ? 'Syncing...' : 'Sync Now'}</span>

              </button>

            )}

          </div>

        )}

        {/* GPS Telemetry & Audit Banner when accuracy exceeds strict threshold */}
        {geo.accuracy !== null && !isGpsAccurate && (
          <div className="mt-3 bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-sky-300 animate-fade-in">
            <div className="flex items-start gap-2.5 min-w-0">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
              <div>
                <p className="font-semibold text-sky-200">
                  Wi-Fi / Desktop Signal Detected (±{geo.accuracy}m precision)
                </p>
                <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                  You are within the workplace perimeter. Your signal precision is safely recorded in the audit log for supervisor verification.
                </p>
              </div>
            </div>
            <div className="text-[11px] text-sky-300/90 font-medium shrink-0 flex items-center gap-1.5 bg-sky-950/40 px-3 py-1.5 rounded-xl border border-sky-800/40">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Audit Logged (&le;{accuracyLimit}m target)</span>
            </div>
          </div>
        )}

        {(geo.error || geo.isPermissionDenied || (geo.latitude === null && !geo.loading)) && (

          <div className="mt-3 bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-rose-500/15 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200 animate-fade-in shadow-md">

            <div className="flex items-start gap-3">

              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">

                <MapPinOff className="w-5 h-5" />

              </div>

              <div>

                <div className="font-bold text-white text-sm flex items-center gap-2">

                  <span>Location Access Disabled</span>

                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold uppercase tracking-wider">Turn On GPS</span>

                </div>

                <div className="text-slate-300 mt-1 max-w-xl">

                  {geo.error || 'Your GPS coordinates are needed to verify you are at your assigned workplace before clocking in.'}

                </div>

              </div>

            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">

              <button

                type="button"

                onClick={handleTurnOnLocation}

                disabled={requestingLocation}

                className="flex-1 sm:flex-initial min-h-[40px] px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-sky-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"

              >

                {requestingLocation ? (

                  <RefreshCw className="w-4 h-4 animate-spin" />

                ) : (

                  <Navigation className="w-4 h-4" />

                )}

                <span>Turn On Location</span>

              </button>

              <button

                type="button"

                onClick={() => {
                  setOutsidePunchType(status?.hasActiveShift ? 'out' : 'in');
                  setOutsideReasonText('');
                  setOutsideReasonModalOpen(true);
                }}

                className="flex-1 sm:flex-initial min-h-[40px] px-3.5 py-2 rounded-xl border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-300 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"

                title="Clock in or out by submitting an explanation to your supervisor"

              >

                <Clock className="w-3.5 h-3.5 text-amber-400" />

                <span>{status?.hasActiveShift ? 'Clock Out (No GPS)' : 'Clock In (No GPS)'}</span>

              </button>

              <button

                type="button"

                onClick={() => setShowPermissionGuideModal(true)}

                className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"

                title="Step-by-step guide for your phone"

              >

                <HelpCircle className="w-4 h-4 text-sky-400" />

                <span className="hidden xs:inline">Need Help?</span>

              </button>

            </div>

          </div>

        )}

        {actionError && (

          <div className="mt-3 bg-rose-500/15 border border-rose-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-300">

            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />

            <div>{actionError}</div>

          </div>

        )}

      </div>

      {/* Main Punch Clock Card */}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-xl text-center flex flex-col items-center justify-center relative overflow-hidden">

        {/* Subtle Background Glow */}

        <div className={`absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors ${

          status?.hasActiveShift ? 'bg-amber-500' : 'bg-emerald-500'

        }`} />

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 mb-3 sm:mb-4">

          <Clock className="w-3.5 h-3.5 text-sky-400" />

          <span>Shift Status:</span>{' '}

          <span className={

            isShiftCompletedToday ? 'text-emerald-400 font-bold' :

            isMaxCapReached ? 'text-rose-400 font-bold' :

            isTargetReached ? 'text-amber-400 font-bold' :

            status?.hasActiveShift ? 'text-emerald-400 font-bold' : 'text-slate-300 font-medium'

          }>

            {isShiftCompletedToday ? 'Shift Completed Today' :

             isMaxCapReached ? `Daily Cap Reached (${maxDailyHours}h Max)` :

             isTargetReached ? `Target Reached (${scheduledHours}h + Overtime)` :

             status?.hasActiveShift ? 'Shift in Progress' : 'No Active Shift'}

          </span>

        </div>

        {/* Stopwatch Display */}

        <div className={`text-4xl xs:text-5xl sm:text-6xl font-black tracking-tight font-mono mb-2 select-none ${

          isShiftCompletedToday ? 'text-emerald-400' :

          isMaxCapReached ? 'text-rose-400' :

          isTargetReached ? 'text-amber-300' :

          'text-white'

        }`}>

          {status?.hasActiveShift
            ? formatElapsed(elapsedSeconds)
            : isShiftCompletedToday
            ? formatElapsed(completedDurationSeconds)
            : '00:00:00'}

        </div>

        {/* Overtime / Long Shift Notifications */}

        {status?.hasActiveShift && isMaxCapReached && (

          <div className="w-full max-w-md mb-4 bg-rose-500/15 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-200 flex items-start gap-2.5 text-left animate-fade-in">

            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />

            <div>

              <strong className="text-rose-100">Max Daily Shift Cap Reached ({maxDailyHours} hrs):</strong> You have reached your instructor's configured daily maximum limit ({scheduledHours}h normal + {(maxDailyHours - scheduledHours).toFixed(1)}h overtime). Additional hours will be capped at {maxDailyHours} hours. Please punch <strong>TIME OUT</strong> now!

            </div>

          </div>

        )}

        {status?.hasActiveShift && isTargetReached && !isMaxCapReached && (

          <div className="w-full max-w-md mb-4 bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200 flex items-start gap-2.5 text-left animate-fade-in">

            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />

            <div>

              <strong className="text-amber-100">Daily Target Reached ({scheduledHours} hrs):</strong> Standard shift completed! You are now logging overtime up to the {maxDailyHours}h daily limit. Remember to punch <strong>TIME OUT</strong>!

            </div>

          </div>

        )}

        {/* Active Shift Perimeter & Location Tamper Live Status */}

        {status?.hasActiveShift && (

          <>

            {isGpsDisabled ? (

              <div className="w-full max-w-md mb-4 bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200 flex items-start gap-2.5 text-left animate-fade-in">

                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />

                <div className="space-y-1 w-full">

                  <div className="font-bold text-amber-100 flex items-center justify-between">

                    <span>GPS / Location Turned Off</span>

                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">

                      Unverified Gap Logged

                    </span>

                  </div>

                  <p className="text-[11px] text-amber-200/90 leading-relaxed">

                    Your shift timer is still counting, but location loss is logged as an unverified gap for supervisor review. Please turn location back on or allow browser GPS permission.

                  </p>

                  <button

                    type="button"

                    onClick={() => {

                      geo.refreshLocation();

                      loadData();

                    }}

                    className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-amber-200 font-medium text-[11px] transition-all cursor-pointer"

                  >

                    <RefreshCw className={`w-3 h-3 ${geo.loading ? 'animate-spin' : ''}`} />

                    <span>Retry Location Signal</span>

                  </button>

                </div>

              </div>

            ) : perimeterStatus === 'Outside' ? (

              <div className="w-full max-w-md mb-4 bg-rose-500/15 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-200 flex items-start gap-2.5 text-left animate-fade-in">

                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />

                <div className="space-y-0.5">

                  <div className="font-bold text-rose-100 flex items-center justify-between">

                    <span>Outside Workplace Perimeter ({Math.round(currentDistance ?? 0)}m away)</span>

                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">

                      Logged

                    </span>

                  </div>

                  <p className="text-[11px] text-rose-200/80 leading-relaxed">

                    Your shift timer is still counting, but this departure is recorded for supervisor review. Return to your workplace when your break or errand is complete.

                  </p>

                </div>

              </div>

            ) : status.todayRecord?.perimeterBreachCount && status.todayRecord.perimeterBreachCount > 0 ? (

              <div className="w-full max-w-md mb-4 bg-slate-800/80 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-300 flex items-center justify-between gap-2 text-left animate-fade-in">

                <span className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px] truncate">

                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />

                  <span className="truncate">Currently Inside Workplace Perimeter</span>

                </span>

                <span className="text-[10px] text-amber-400 font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 shrink-0">

                  {status.todayRecord.perimeterBreachCount} Incident{status.todayRecord.perimeterBreachCount > 1 ? 's' : ''} Logged

                </span>

              </div>

            ) : null}

          </>

        )}

        <p className="text-xs text-slate-400 mb-6 sm:mb-8 px-2 max-w-sm sm:max-w-md">

          {status?.hasActiveShift
            ? `Shift started at ${new Date(status.todayRecord!.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : isShiftCompletedToday
            ? `Shift completed at ${new Date(status.todayRecord!.timeOut!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${status.todayRecord!.netRenderedHours?.toFixed(1) ?? '0.0'} hrs credited)`
            : 'Tap Time-In to start your OJT shift tracking for today'}

        </p>

        {/* Big Interactive Action Button (Touch-first: thumb reach optimized) */}

        {status?.hasActiveShift ? (

          <button

            onClick={handleTimeOutClick}

            disabled={loadingAction || geo.loading}

            className="w-full sm:w-80 min-h-[54px] sm:min-h-[60px] py-3.5 px-6 sm:px-8 rounded-2xl font-black text-base sm:text-lg text-white bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 shadow-xl shadow-amber-900/30 transition-all transform active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"

          >

            {loadingAction ? (

              <RefreshCw className="w-5 h-5 animate-spin" />

            ) : (

              <Clock className="w-5 h-5" />

            )}

            <span>TIME OUT</span>

          </button>

        ) : isShiftCompletedToday ? (

          <div className="flex flex-col items-center gap-3 w-full">

            <div className="w-full sm:w-80 min-h-[54px] sm:min-h-[60px] py-3.5 px-6 sm:px-8 rounded-2xl font-bold text-base sm:text-lg text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 shadow-xl shadow-emerald-950/40 flex items-center justify-center gap-2.5 select-none">

              <CheckCircle2 className="w-5 h-5 text-emerald-400" />

              <span>SHIFT COMPLETED TODAY</span>

            </div>

            {canResumeShift && (

              <button

                type="button"

                onClick={() => setShowResumeConfirmModal(true)}

                disabled={loadingAction}

                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold cursor-pointer transition-colors active:scale-95"

              >

                <RotateCcw className="w-3.5 h-3.5" />

                <span>Accidental punch? Resume Shift ({Math.max(1, Math.ceil((1800 - timeSinceTimeOutSeconds) / 60))}m left)</span>

              </button>

            )}

          </div>

        ) : (

          <button

            onClick={handleTimeIn}

            disabled={loadingAction || geo.loading}

            className="w-full sm:w-80 min-h-[54px] sm:min-h-[60px] py-3.5 px-6 sm:px-8 rounded-2xl font-black text-base sm:text-lg text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-xl shadow-emerald-900/30 transition-all transform active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"

          >

            {loadingAction ? (

              <RefreshCw className="w-5 h-5 animate-spin" />

            ) : (

              <Clock className="w-5 h-5" />

            )}

            <span>TIME IN</span>

          </button>

        )}

        {geo.latitude === null && !geo.loading && (
          <button
            type="button"
            onClick={handleTurnOnLocation}
            className="mt-3 text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1.5 underline underline-offset-4 cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Turn on location access to enable attendance punch</span>
          </button>
        )}

        <div className="mt-4 flex flex-col xs:flex-row items-center justify-center gap-1.5 xs:gap-4 text-[11px] sm:text-xs text-slate-400">

          <span className="flex items-center gap-1">

            <Coffee className="w-3.5 h-3.5 text-slate-500 shrink-0" /> Auto {status?.settings?.defaultLunchMinutes ?? 60}m lunch deduction (&gt;4h)

          </span>

          <span className="hidden xs:inline text-slate-600">•</span>

          <span className="flex items-center gap-1">

            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Haversine GPS Verified

          </span>

        </div>

      </div>

      {/* Progress & Hours Summary Metrics */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">

        {/* Rendered Hours */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between">

          <div className="flex items-center justify-between text-slate-400 text-xs font-medium gap-1">

            <span className="truncate">Rendered</span>

            <Clock className="w-4 h-4 text-sky-400 shrink-0" />

          </div>

          <div className="mt-2 text-xl sm:text-2xl font-extrabold text-white truncate">

            {hours?.renderedHours.toFixed(1) ?? '0.0'}

            <span className="text-xs text-slate-400 font-normal ml-1">hrs</span>

          </div>

          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">

            Target: {hours?.targetHours ?? 486} hrs

          </div>

        </div>

        {/* Remaining Hours */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between">

          <div className="flex items-center justify-between text-slate-400 text-xs font-medium gap-1">

            <span className="truncate">Remaining</span>

            <TrendingUp className="w-4 h-4 text-indigo-400 shrink-0" />

          </div>

          <div className="mt-2 text-xl sm:text-2xl font-extrabold text-white truncate">

            {hours?.remainingHours.toFixed(1) ?? '486.0'}

            <span className="text-xs text-slate-400 font-normal ml-1">hrs</span>

          </div>

          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">

            To graduation target

          </div>

        </div>

        {/* Completion Progress % */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between">

          <div className="flex items-center justify-between text-slate-400 text-xs font-medium gap-1">

            <span className="truncate">Progress</span>

            <Award className="w-4 h-4 text-emerald-400 shrink-0" />

          </div>

          <div className="mt-2 text-xl sm:text-2xl font-extrabold text-emerald-400 truncate">

            {hours?.completionPercentage.toFixed(1) ?? '0.0'}%

          </div>

          {/* Progress Bar */}

          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">

            <div

              className="bg-emerald-500 h-full rounded-full transition-all duration-500"

              style={{ width: `${Math.min(100, hours?.completionPercentage ?? 0)}%` }}

            />

          </div>

        </div>

        {/* Days Rendered */}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between">

          <div className="flex items-center justify-between text-slate-400 text-xs font-medium gap-1">

            <span className="truncate">Days Logged</span>

            <CalendarDays className="w-4 h-4 text-amber-400 shrink-0" />

          </div>

          <div className="mt-2 text-xl sm:text-2xl font-extrabold text-white truncate">

            {hours?.totalDaysRendered ?? 0}

            <span className="text-xs text-slate-400 font-normal ml-1">days</span>

          </div>

          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">

            Verified shifts

          </div>

        </div>

      </div>

      {/* Early Shift Time-Out Confirmation Modal */}
      {showEarlyConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative max-h-[95dvh] flex flex-col">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Early Shift Time-Out Warning</span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  Confirm Early Time-Out
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  You are clocking out before completing your required daily schedule ({scheduledHours.toFixed(1)} hrs).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEarlyConfirmModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics Breakdown */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400 font-medium">Time On-Duty</div>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">
                    {formatElapsed(elapsedSeconds)}
                  </div>
                </div>
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400 font-medium">Daily Schedule</div>
                  <div className="text-lg font-bold font-mono text-sky-400 mt-0.5">
                    {scheduledHours.toFixed(1)} hrs
                  </div>
                </div>
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400 font-medium">Remaining Shortfall</div>
                  <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
                    {shortfallH > 0 ? `${shortfallH}h ` : ''}{shortfallM}m
                  </div>
                </div>
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400 font-medium">Est. Net Credited</div>
                  <div className="text-lg font-bold font-mono text-amber-300 mt-0.5">
                    ~{calcEstimatedNetHours(elapsedSeconds).toFixed(1)} hrs
                  </div>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200/90 leading-relaxed">
                <strong>Notice:</strong> Once you time out, your attendance record for today will be closed and submitted to your supervisor. Daily attendance is limited to one shift per day.
              </div>

              {/* Reason Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Select Reason for Early Departure:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'accidental', label: '🧪 Accidental Punch / Testing' },
                    { id: 'medical', label: '🏥 Medical / Feeling Sick' },
                    { id: 'permission', label: '🏢 Sent Home / Company Permission' },
                    { id: 'school', label: '🎓 School / Academic Activity' },
                    { id: 'emergency', label: '🚨 Personal / Family Emergency' },
                    { id: 'other', label: '✏️ Other Reason' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setEarlyReasonCategory(opt.id)}
                      className={`text-left text-xs p-2.5 rounded-xl border transition-all cursor-pointer ${
                        earlyReasonCategory === opt.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-200 font-semibold'
                          : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom note */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Additional Details / Note for Coordinator (Optional)
                </label>
                <textarea
                  value={earlyCustomNote}
                  onChange={(e) => setEarlyCustomNote(e.target.value)}
                  placeholder="e.g. Sent home early due to company half-day; approved by supervisor"
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/50 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowEarlyConfirmModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
              >
                Keep Shift Active (Cancel)
              </button>
              <button
                type="button"
                onClick={handleConfirmEarlyTimeOut}
                disabled={loadingAction}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-amber-950/40 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loadingAction ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                <span>Confirm Early Time-Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resume Shift Confirmation Modal */}
      {showResumeConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative flex flex-col">
            <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>Shift Recovery</span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  Resume Today's Shift?
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Reactivate your shift to continue logging OJT hours for today.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowResumeConfirmModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-3 text-xs text-slate-300">
              <p>
                Did you accidentally click <strong>TIME OUT</strong>?
              </p>
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-1 text-slate-400">
                <div>Started: <strong className="text-white">{status?.todayRecord?.timeIn ? new Date(status.todayRecord.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</strong></div>
                <div>Timed Out: <strong className="text-white">{status?.todayRecord?.timeOut ? new Date(status.todayRecord.timeOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</strong></div>
              </div>
              <p className="text-[11px] text-slate-400">
                Resuming will re-open your active shift and restore your live attendance stopwatch.
              </p>
            </div>

            <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/50 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowResumeConfirmModal(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResumeShift}
                disabled={loadingAction}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-950/40 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loadingAction ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                <span>Yes, Resume Shift</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outside Perimeter Explanation Modal */}
      {outsideReasonModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative max-h-[95dvh] flex flex-col">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-start justify-between gap-3">
              <div>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 ${
                  geo.latitude === null
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}>
                  {geo.latitude === null ? (
                    <MapPinOff className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>
                    {geo.latitude === null
                      ? 'Device Location Disabled / No GPS'
                      : `Outside Workplace Perimeter (${currentDistance !== null ? `${currentDistance}m away` : 'Off-site'})`}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  {outsidePunchType === 'in' ? 'Time-In' : 'Time-Out'} {geo.latitude === null ? 'Without GPS' : 'Explanation Required'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {geo.latitude === null
                    ? 'Your device does not have GPS location active. Provide an explanation so your instructor/supervisor has context to review and verify your shift.'
                    : `You are currently outside your assigned workplace boundary (${allowedRadius}m radius). Provide an explanation so your instructor/supervisor has context to verify your shift.`}
                </p>
              </div>
              <button
                onClick={() => setOutsideReasonModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Quick Select Reason
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(geo.latitude === null
                    ? [
                        '📱 Location blocked in browser / device settings',
                        '🏢 Inside building / weak satellite reception',
                        '🔋 Device battery saver disabled GPS services',
                        '🚗 Official fieldwork / off-site duty'
                      ]
                    : [
                        '🏢 Company errand / client site visit',
                        '🚗 Fieldwork / off-site assignment',
                        '🛰️ Weak GPS reception inside building',
                        '📦 Official pickup / delivery duty'
                      ]
                  ).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setOutsideReasonText(preset)}
                      className={`text-left text-xs p-2.5 rounded-xl border transition-all cursor-pointer ${
                        outsideReasonText === preset
                          ? 'bg-sky-500/15 border-sky-500 text-sky-300 font-semibold shadow-sm'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Detailed Explanation / Notes <span className="text-amber-400">*</span>
                </label>
                <textarea
                  value={outsideReasonText}
                  onChange={(e) => setOutsideReasonText(e.target.value)}
                  placeholder={geo.latitude === null ? "Explain why location is off (e.g. browser permission blocked, device issue)..." : "Specify who dispatched you, task description, or reason for clocking outside..."}
                  rows={3}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-start gap-2.5 text-[11px] text-slate-400">
                <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>
                  {geo.latitude !== null
                    ? `This note will be recorded permanently with your GPS coordinates (${geo.latitude?.toFixed(5)}, ${geo.longitude?.toFixed(5)}) and displayed directly in your supervisor's verification console.`
                    : "This note will be recorded permanently with a 'No GPS Fix' tag and forwarded directly to your supervisor's verification console for review."}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setOutsideReasonModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!outsideReasonText.trim() || loadingAction}
                onClick={() => executePunch(outsidePunchType!, outsideReasonText.trim())}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-xs font-bold text-white shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loadingAction ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Confirm {outsidePunchType === 'in' ? 'Time-In' : 'Time-Out'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Permission Guide Modal */}
      {showPermissionGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative max-h-[95dvh] flex flex-col">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/30 shrink-0">
                  <Navigation className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                    How to Turn On Location
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Your browser has location permission disabled. Follow these 3 simple steps:
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPermissionGuideModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Device Selector Tabs */}
            <div className="px-5 sm:px-6 pt-4 pb-1 border-b border-slate-800/60 flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedGuideTab('android')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  selectedGuideTab === 'android'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android / Chrome</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedGuideTab('ios')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  selectedGuideTab === 'ios'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>iPhone / Safari</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedGuideTab('desktop')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  selectedGuideTab === 'desktop'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>PC / Laptop</span>
              </button>
            </div>

            {/* Body Steps */}
            <div className="p-5 sm:p-6 space-y-3.5 overflow-y-auto">
              {selectedGuideTab === 'android' && (
                <>
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                    <div className="w-7 h-7 rounded-xl bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center shrink-0">1</div>
                    <div className="text-xs">
                      <div className="font-semibold text-white">Tap the icon in the address bar</div>
                      <div className="text-slate-400 mt-0.5">At the top of Chrome next to the website URL, tap the <strong>Lock (🔒)</strong> or <strong>Tune (🎚️)</strong> icon.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                    <div className="w-7 h-7 rounded-xl bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center shrink-0">2</div>
                    <div className="text-xs">
                      <div className="font-semibold text-white">Tap Permissions &rarr; Location</div>
                      <div className="text-slate-400 mt-0.5">Select <strong>Permissions</strong> and switch <strong>Location</strong> to <strong>Allow</strong>.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                    <div className="w-7 h-7 rounded-xl bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center shrink-0">3</div>
                    <div className="text-xs">
                      <div className="font-semibold text-white">Tap "Reload & Re-Check"</div>
                      <div className="text-slate-400 mt-0.5">Tap the blue button below to reload the app with GPS enabled.</div>
                    </div>
                  </div>
                </>
              )}

              {selectedGuideTab === 'ios' && (
                <>
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                    <div className="w-7 h-7 rounded-xl bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center shrink-0">1</div>
                    <div className="text-xs">
                      <div className="font-semibold text-white">Tap the "aA" icon in Safari</div>
                      <div className="text-slate-400 mt-0.5">In Safari's address bar (at the bottom or top), tap the <strong>aA</strong> or <strong>Lock (🔒)</strong> icon.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                    <div className="w-7 h-7 rounded-xl bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center shrink-0">2</div>
                    <div className="text-xs">
                      <div className="font-semibold text-white">Website Settings &rarr; Location &rarr; Allow</div>
                      <div className="text-slate-400 mt-0.5">Tap <strong>Website Settings</strong>, tap <strong>Location</strong>, and choose <strong>Allow</strong>.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                    <div className="w-7 h-7 rounded-xl bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center shrink-0">3</div>
                    <div className="text-xs">
                      <div className="font-semibold text-white">Tap "Reload & Re-Check"</div>
                      <div className="text-slate-400 mt-0.5">Tap the blue button below to refresh Safari and verify your attendance.</div>
                    </div>
                  </div>
                </>
              )}

              {selectedGuideTab === 'desktop' && (
                <>
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                    <div className="w-7 h-7 rounded-xl bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center shrink-0">1</div>
                    <div className="text-xs">
                      <div className="font-semibold text-white">Click the icon left of the URL</div>
                      <div className="text-slate-400 mt-0.5">Click the <strong>Padlock (🔒)</strong> or <strong>Tune sliders</strong> icon at the start of your browser address bar.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                    <div className="w-7 h-7 rounded-xl bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center shrink-0">2</div>
                    <div className="text-xs">
                      <div className="font-semibold text-white">Switch Location to "Allow"</div>
                      <div className="text-slate-400 mt-0.5">Toggle the <strong>Location</strong> switch to ON or select <strong>Allow</strong> from the dropdown.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                    <div className="w-7 h-7 rounded-xl bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center shrink-0">3</div>
                    <div className="text-xs">
                      <div className="font-semibold text-white">Click "Reload & Re-Check"</div>
                      <div className="text-slate-400 mt-0.5">Click the button below to reload the console.</div>
                    </div>
                  </div>
                </>
              )}

              {promptBlockedAlert && (
                <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5 animate-fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-rose-100 flex items-center gap-1.5">
                      <span>Browser Blocked the Prompt</span>
                    </div>
                    <p className="mt-1 text-[11px] text-rose-200/90 leading-relaxed">
                      Your browser previously set this site to "Block". The browser engine will not show the prompt again until you tap the Lock (🔒) or Tune (🎚️) icon in your browser address bar above and toggle Location to "Allow".
                    </p>
                    <p className="mt-1.5 text-[11px] text-amber-300 font-medium">
                      Tip: You can also tap "Proceed Without GPS" below to submit your attendance with an explanation for your teacher!
                    </p>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 text-[11px] text-slate-400 flex items-center gap-2">
                <Info className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Tip: Tap "Try Prompt Again" to re-check if your browser allows the prompt, or toggle the address bar lock icon.</span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-900/60 flex flex-col xs:flex-row items-stretch xs:items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowPermissionGuideModal(false);
                  setOutsidePunchType(status?.hasActiveShift ? 'out' : 'in');
                  setOutsideReasonText('');
                  setOutsideReasonModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-xs font-bold text-amber-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Proceed Without GPS</span>
              </button>

              <button
                type="button"
                disabled={requestingLocation}
                onClick={async () => {
                  setRequestingLocation(true);
                  setPromptBlockedAlert(false);
                  const granted = await geo.requestPermission();
                  setRequestingLocation(false);
                  if (granted) {
                    setShowPermissionGuideModal(false);
                  } else {
                    setPromptBlockedAlert(true);
                  }
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {requestingLocation ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                ) : (
                  <Navigation className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span>Try Prompt Again</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.reload();
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-95 text-xs font-bold text-white shadow-lg shadow-sky-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>I've Allowed It - Reload Page</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>

  );

};

