import React, { useState, useEffect } from 'react';
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
  Map as MapIcon
} from 'lucide-react';
import { WorkplaceMapPicker } from './WorkplaceMapPicker';

interface DashboardProps {
  onNavigateToSettings?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToSettings }) => {
  const geo = useGeolocation();
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [hours, setHours] = useState<HoursSummary | null>(null);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [calibrating, setCalibrating] = useState<boolean>(false);
  const [calibrationSuccess, setCalibrationSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [showRadarMap, setShowRadarMap] = useState<boolean>(false);

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

  useEffect(() => {
    loadData();
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
  const accuracyLimit = status?.settings?.gpsAccuracyThreshold ?? 50;

  const currentDistance = (geo.latitude !== null && geo.longitude !== null)
    ? calculateDistanceMeters(geo.latitude, geo.longitude, workplaceLat, workplaceLng)
    : null;

  const isWithinGeofence = currentDistance !== null && currentDistance <= allowedRadius;
  const isGpsAccurate = geo.accuracy !== null && geo.accuracy <= accuracyLimit;

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

        {/* GPS Warning if accuracy is low */}
        {geo.accuracy !== null && !isGpsAccurate && (
          <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              GPS reading accuracy ({geo.accuracy}m) is weaker than required threshold ({accuracyLimit}m).
              Please step near a window or move outdoors for accurate verification.
            </div>
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
          <span className={status?.hasActiveShift ? 'text-amber-400 font-bold' : 'text-slate-300 font-medium'}>
            {status?.hasActiveShift ? 'Shift in Progress' : 'No Active Shift'}
          </span>
        </div>

        {/* Stopwatch Display */}
        <div className="text-4xl xs:text-5xl sm:text-6xl font-black tracking-tight font-mono text-white mb-2 select-none">
          {status?.hasActiveShift ? formatElapsed(elapsedSeconds) : '00:00:00'}
        </div>
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
