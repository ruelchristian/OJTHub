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
  Sliders,
  Crosshair,
  Map as MapIcon,
  WifiOff,
  CloudUpload
} from 'lucide-react';
import { WorkplaceMapPicker } from './WorkplaceMapPicker';
import { offlineQueue } from '../services/offlineQueue';

interface DashboardProps {
  onNavigateToSettings?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToSettings }) => {
  const geo = useGeolocation({ watch: true });
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [hours, setHours] = useState<HoursSummary | null>(null);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [calibrating, setCalibrating] = useState<boolean>(false);
  const [calibrationSuccess, setCalibrationSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [showRadarMap, setShowRadarMap] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => offlineQueue.getTotalPendingCount());
  const [syncingOffline, setSyncingOffline] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isGpsDisabled, setIsGpsDisabled] = useState<boolean>(false);
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

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

  const workplaceLat = status?.settings?.workplaceLatitude ?? 14.599512;
  const workplaceLng = status?.settings?.workplaceLongitude ?? 120.984222;
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

  const handleCalibrateWorkplace = async () => {
    if (geo.latitude === null || geo.longitude === null) {
      setActionError('GPS coordinates not acquired yet. Please verify device location permissions.');
      return;
    }

    setCalibrating(true);
    setActionError(null);
    try {
      const updated = await api.settings.update({
        workplaceLatitude: geo.latitude,
        workplaceLongitude: geo.longitude
      });
      setStatus(prev => ({
        hasActiveShift: prev?.hasActiveShift ?? false,
        todayRecord: prev?.todayRecord,
        settings: updated
      }));
      setCalibrationSuccess(`Workplace location calibrated to your coordinates (${geo.latitude.toFixed(5)}, ${geo.longitude.toFixed(5)})!`);
      setTimeout(() => setCalibrationSuccess(null), 5000);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to calibrate workplace location');
    } finally {
      setCalibrating(false);
    }
  };

  const handleTimeIn = async () => {
    if (geo.latitude === null || geo.longitude === null || geo.accuracy === null) {
      setActionError('Location coordinates not acquired yet. Please allow location permissions.');
      return;
    }

    setActionError(null);
    setLoadingAction(true);
    try {
      await api.attendance.timeIn(geo.latitude, geo.longitude, geo.accuracy);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to record Time-In');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleTimeOut = async () => {
    if (geo.latitude === null || geo.longitude === null || geo.accuracy === null) {
      setActionError('Location coordinates not acquired yet. Please allow location permissions.');
      return;
    }

    setActionError(null);
    setLoadingAction(true);
    try {
      await api.attendance.timeOut(geo.latitude, geo.longitude, geo.accuracy);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to record Time-Out');
    } finally {
      setLoadingAction(false);
    }
  };

  const scheduledHours = status?.settings?.dailyScheduleHours ?? 8.0;
  const lunchMinutes = status?.settings?.defaultLunchMinutes ?? 60;
  const grossElapsedHours = elapsedSeconds / 3600;
  const targetElapsedSeconds = (scheduledHours * 3600) + (lunchMinutes * 60);
  const isTargetReached = !!(status?.hasActiveShift && elapsedSeconds >= targetElapsedSeconds);
  const isLongShift = !!(status?.hasActiveShift && grossElapsedHours >= 12);

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      
      {/* Top Welcome & Geofence Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-sky-400 font-semibold text-[11px] sm:text-xs uppercase tracking-wider truncate">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{status?.settings?.companyName || 'Host Training Establishment'}</span>
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
              onClick={geo.refreshLocation}
              disabled={geo.loading}
              title="Refresh GPS location"
              className="min-h-[40px] min-w-[40px] p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-slate-300 transition-all flex items-center justify-center shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${geo.loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Workplace Location Quick Calibration Bar */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-300 flex items-center gap-2 min-w-0">
            <Crosshair className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="truncate">
              Workplace Center: <strong className="text-white font-mono">{workplaceLat.toFixed(5)}, {workplaceLng.toFixed(5)}</strong>
              {geo.latitude !== null && (
                <span className="text-slate-400 ml-1.5 hidden lg:inline font-mono">
                  (Device: {geo.latitude.toFixed(5)}, {geo.longitude?.toFixed(5)})
                </span>
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowRadarMap(!showRadarMap)}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                showRadarMap
                  ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 active:scale-95 border-slate-700 text-slate-300'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>{showRadarMap ? 'Hide Radar' : '🗺️ Radar Map'}</span>
            </button>

            <button
              onClick={handleCalibrateWorkplace}
              disabled={calibrating || geo.loading || geo.latitude === null}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/35 border border-sky-500/40 text-sky-300 font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <MapPin className={`w-3.5 h-3.5 ${calibrating ? 'animate-spin' : ''}`} />
              <span>{calibrating ? 'Calibrating...' : '📍 Calibrate GPS'}</span>
            </button>

            {onNavigateToSettings && (
              <button
                onClick={onNavigateToSettings}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Radar Map Display */}
        {showRadarMap && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 animate-fade-in">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-200">Workplace Geofence & Device Radar</span>
              <span>Radius: <strong className="text-sky-400">{allowedRadius}m</strong></span>
            </div>
            <WorkplaceMapPicker
              latitude={workplaceLat}
              longitude={workplaceLng}
              radiusMeters={allowedRadius}
              deviceLatitude={geo.latitude}
              deviceLongitude={geo.longitude}
              onChange={(newLat, newLng) => {
                api.settings.update({ workplaceLatitude: newLat, workplaceLongitude: newLng }).then(updated => {
                  setStatus(prev => prev ? { ...prev, settings: updated } : null);
                });
              }}
              onUseCurrentLocation={handleCalibrateWorkplace}
              height="260px"
              readOnly={false}
            />
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

        {/* GPS Warning if accuracy is low */}
        {geo.accuracy !== null && !isGpsAccurate && (
          <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-300 animate-fade-in">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-semibold text-amber-200">
                  GPS signal accuracy ({geo.accuracy}m) exceeds required gate (&le; {accuracyLimit}m)
                </p>
                <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                  Desktop browsers & indoor Wi-Fi usually report ~100m because PCs lack satellite GPS hardware.
                </p>
              </div>
            </div>

            {!status?.settings?.isLocked ? (
              <button
                type="button"
                onClick={async () => {
                  const relaxedLimit = Math.max(geo.accuracy! + 20, 150);
                  try {
                    const updated = await api.settings.update({ gpsAccuracyThreshold: relaxedLimit });
                    setStatus(prev => prev ? { ...prev, settings: updated } : null);
                    setCalibrationSuccess(`GPS accuracy gate adjusted to ${relaxedLimit}m for this device!`);
                    setTimeout(() => setCalibrationSuccess(null), 4000);
                  } catch (e: any) {
                    setActionError(e.message || 'Failed to adjust accuracy threshold');
                  }
                }}
                className="shrink-0 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 text-amber-200 border border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Allow {Math.max(geo.accuracy + 20, 150)}m Gate</span>
              </button>
            ) : (
              <div className="text-[11px] text-slate-400 italic shrink-0">
                Gate locked by {status?.settings?.managedBySupervisorName || 'supervisor'}.
              </div>
            )}
          </div>
        )}

        {geo.error && (
          <div className="mt-3 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>{geo.error}</div>
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
            isLongShift ? 'text-rose-400 font-bold' :
            isTargetReached ? 'text-amber-400 font-bold' :
            status?.hasActiveShift ? 'text-emerald-400 font-bold' : 'text-slate-300 font-medium'
          }>
            {isLongShift ? 'Extended Shift (>12h)' :
             isTargetReached ? `Target Reached (${scheduledHours}h Overtime)` :
             status?.hasActiveShift ? 'Shift in Progress' : 'No Active Shift'}
          </span>
        </div>

        {/* Stopwatch Display */}
        <div className={`text-4xl xs:text-5xl sm:text-6xl font-black tracking-tight font-mono mb-2 select-none ${
          isLongShift ? 'text-rose-400' :
          isTargetReached ? 'text-amber-300' :
          'text-white'
        }`}>
          {status?.hasActiveShift ? formatElapsed(elapsedSeconds) : '00:00:00'}
        </div>

        {/* Overtime / Long Shift Notifications */}
        {status?.hasActiveShift && isLongShift && (
          <div className="w-full max-w-md mb-4 bg-rose-500/15 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-200 flex items-start gap-2.5 text-left animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-rose-100">Long Shift Alert (&gt;12 Hours):</strong> If you forgot to clock out at the end of your shift, tap <strong>TIME OUT</strong> now so your rendered hours are capped and flagged for supervisor verification.
            </div>
          </div>
        )}

        {status?.hasActiveShift && isTargetReached && !isLongShift && (
          <div className="w-full max-w-md mb-4 bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200 flex items-start gap-2.5 text-left animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-100">Daily Target Reached ({scheduledHours} hrs):</strong> You have completed your scheduled daily hours for today. Remember to punch <strong>TIME OUT</strong> before leaving!
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
                    onClick={geo.refreshLocation}
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
            : 'Tap Time-In to start your OJT shift tracking for today'}
        </p>

        {/* Big Interactive Action Button (Touch-first: thumb reach optimized) */}
        {status?.hasActiveShift ? (
          <button
            onClick={handleTimeOut}
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
    </div>
  );
};
