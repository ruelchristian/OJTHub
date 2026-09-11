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
  Coffee
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const geo = useGeolocation();
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [hours, setHours] = useState<HoursSummary | null>(null);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

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
    <div className="space-y-6 pb-16">
      
      {/* Top Welcome & Geofence Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs uppercase tracking-wider">
              <MapPin className="w-4 h-4" />
              {status?.settings?.companyName || 'Host Training Establishment'}
            </div>
            <h1 className="text-2xl font-extrabold text-white mt-1">
              Geofenced Attendance Console
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Verify physical proximity to your workplace boundary to log daily shifts.
            </p>
          </div>

          {/* Real-time Location Indicator Badge */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-semibold border ${
              geo.loading
                ? 'bg-slate-800/80 text-slate-300 border-slate-700'
                : isWithinGeofence
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full ${
                geo.loading
                  ? 'bg-slate-400 animate-pulse'
                  : isWithinGeofence
                  ? 'bg-emerald-400 animate-ping'
                  : 'bg-amber-400'
              }`} />
              <div>
                <div>
                  {geo.loading
                    ? 'Detecting Location...'
                    : isWithinGeofence
                    ? 'Within Perimeter'
                    : 'Outside Workplace Boundary'}
                </div>
                {currentDistance !== null && (
                  <div className="text-[10px] opacity-80">
                    {currentDistance}m away (Radius: {allowedRadius}m)
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={geo.refreshLocation}
              disabled={geo.loading}
              title="Refresh GPS"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${geo.loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

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
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center flex flex-col items-center justify-center relative overflow-hidden">
        
        {/* Subtle Background Glow */}
        <div className={`absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors ${
          status?.hasActiveShift ? 'bg-amber-500' : 'bg-emerald-500'
        }`} />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 mb-4">
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          Shift Status:{' '}
          <span className={status?.hasActiveShift ? 'text-amber-400 font-bold' : 'text-slate-300 font-medium'}>
            {status?.hasActiveShift ? 'Shift in Progress' : 'No Active Shift'}
          </span>
        </div>

        {/* Stopwatch Display */}
        <div className="text-5xl sm:text-6xl font-black tracking-tight font-mono text-white mb-2">
          {status?.hasActiveShift ? formatElapsed(elapsedSeconds) : '00:00:00'}
        </div>
        <p className="text-xs text-slate-400 mb-8">
          {status?.hasActiveShift
            ? `Shift started at ${new Date(status.todayRecord!.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'Tap Time-In to start your OJT shift tracking for today'}
        </p>

        {/* Big Interactive Action Button */}
        {status?.hasActiveShift ? (
          <button
            onClick={handleTimeOut}
            disabled={loadingAction || geo.loading}
            className="w-full sm:w-80 py-4 px-8 rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 shadow-xl shadow-amber-900/30 transition-all transform active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loadingAction ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Clock className="w-5 h-5" />
            )}
            TIME OUT
          </button>
        ) : (
          <button
            onClick={handleTimeIn}
            disabled={loadingAction || geo.loading}
            className="w-full sm:w-80 py-4 px-8 rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-xl shadow-emerald-900/30 transition-all transform active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loadingAction ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Clock className="w-5 h-5" />
            )}
            TIME IN
          </button>
        )}

        <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Coffee className="w-3.5 h-3.5 text-slate-500" /> Auto {status?.settings?.defaultLunchMinutes ?? 60}m lunch deduction (&gt;4h)
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> UTC Server Timestamp
          </span>
        </div>
      </div>

      {/* Progress & Hours Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Rendered Hours */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Rendered Hours</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">
            {hours?.renderedHours.toFixed(1) ?? '0.0'}
            <span className="text-xs text-slate-400 font-normal ml-1">hrs</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Target: {hours?.targetHours ?? 486} hrs
          </div>
        </div>

        {/* Remaining Hours */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Remaining Hours</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">
            {hours?.remainingHours.toFixed(1) ?? '486.0'}
            <span className="text-xs text-slate-400 font-normal ml-1">hrs</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Required completion
          </div>
        </div>

        {/* Completion Progress % */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Progress</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-400">
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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Days Rendered</span>
            <CalendarDays className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">
            {hours?.totalDaysRendered ?? 0}
            <span className="text-xs text-slate-400 font-normal ml-1">days</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Logged shifts
          </div>
        </div>
      </div>
    </div>
  );
};
