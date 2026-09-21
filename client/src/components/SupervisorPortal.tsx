import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { TraineeSummary, AttendanceRecord } from '../types';
import { WorkplaceMapPicker } from './WorkplaceMapPicker';
import { 
  Users, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MessageSquare, 
  X, 
  Copy, 
  Check, 
  Sliders, 
  CheckCheck, 
  MapPin, 
  Layers, 
  ChevronDown, 
  ChevronUp,
  Activity,
  UserCheck,
  UserX,
  FileSpreadsheet,
  AlertTriangle,
  WifiOff
} from 'lucide-react';
import { downloadDtrCsv } from '../utils/dtrExport';

export const SupervisorPortal: React.FC = () => {
  const [trainees, setTrainees] = useState<TraineeSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [myCode, setMyCode] = useState<string>('');
  const [codeCopied, setCodeCopied] = useState<boolean>(false);
  const [dutyFilter, setDutyFilter] = useState<'all' | 'onDuty' | 'completed' | 'notStarted' | 'pending'>('all');

  // Selected Trainee Detail Modal
  const [selectedTrainee, setSelectedTrainee] = useState<TraineeSummary | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState<boolean>(false);
  const [remarkInput, setRemarkInput] = useState<{ [recordId: string]: string }>({});
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [batchVerifying, setBatchVerifying] = useState<boolean>(false);

  // Trainee Settings Configuration Modal
  const [configuringTrainee, setConfiguringTrainee] = useState<TraineeSummary | null>(null);
  const [cfgCompany, setCfgCompany] = useState<string>('Host Training Establishment');
  const [cfgLat, setCfgLat] = useState<number>(14.599512);
  const [cfgLng, setCfgLng] = useState<number>(120.984222);
  const [cfgRadius, setCfgRadius] = useState<number>(100);
  const [cfgAccuracy, setCfgAccuracy] = useState<number>(150);
  const [cfgTargetHours, setCfgTargetHours] = useState<string>('486.0');
  const [cfgDailyHours, setCfgDailyHours] = useState<string>('8.0');
  const [cfgLunchMins, setCfgLunchMins] = useState<number>(60);
  const [cfgApplyToAll, setCfgApplyToAll] = useState<boolean>(false);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [showAdvancedCoords, setShowAdvancedCoords] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tData, codeData] = await Promise.all([
        api.supervisor.getTrainees(),
        api.supervisor.getMyCode().catch(() => ({ code: '', fullName: '' }))
      ]);
      setTrainees(tData);
      setMyCode(codeData.code);
    } catch (err) {
      console.error('Failed to load supervisor portal data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyCode = () => {
    if (!myCode) return;
    navigator.clipboard.writeText(myCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 3000);
  };

  const openConfigureSettings = (t: TraineeSummary) => {
    setConfiguringTrainee(t);
    const s = t.settings;
    setCfgCompany(s?.companyName || t.companyName || 'Host Training Establishment');
    setCfgLat(s?.workplaceLatitude || 14.599512);
    setCfgLng(s?.workplaceLongitude || 120.984222);
    setCfgRadius(s?.geofenceRadiusMeters || 100);
    setCfgAccuracy(s?.gpsAccuracyThreshold || 150);
    setCfgTargetHours((s?.targetTotalHours || t.targetTotalHours || 486.0).toString());
    setCfgDailyHours((s?.dailyScheduleHours || 8.0).toString());
    setCfgLunchMins(s?.defaultLunchMinutes || 60);
    setCfgApplyToAll(false);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configuringTrainee) return;
    setSavingSettings(true);
    try {
      const payload = {
        companyName: cfgCompany,
        workplaceLatitude: cfgLat,
        workplaceLongitude: cfgLng,
        geofenceRadiusMeters: cfgRadius,
        gpsAccuracyThreshold: cfgAccuracy,
        targetTotalHours: parseFloat(cfgTargetHours) || 486.0,
        dailyScheduleHours: parseFloat(cfgDailyHours) || 8.0,
        defaultLunchMinutes: cfgLunchMins
      };

      if (cfgApplyToAll) {
        const res = await api.supervisor.broadcastSettings(payload);
        alert(res.message);
      } else {
        const res = await api.supervisor.updateTraineeSettings(configuringTrainee.traineeId, payload);
        alert(res.message);
      }

      setConfiguringTrainee(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const openTraineeDetails = async (t: TraineeSummary) => {
    setSelectedTrainee(t);
    setRecordsLoading(true);
    try {
      const data = await api.supervisor.getTraineeAttendance(t.traineeId);
      setRecords(data);
    } catch (err) {
      console.error('Failed to load trainee records', err);
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleVerify = async (recordId: string) => {
    setVerifyingId(recordId);
    try {
      const remark = remarkInput[recordId];
      await api.supervisor.verify(recordId, remark);
      // Update local state
      setRecords(records.map(r => r.id === recordId ? { ...r, isVerified: true, supervisorRemark: remark } : r));
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to verify attendance');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleBatchVerify = async (traineeId: string) => {
    if (!confirm('Are you sure you want to verify all completed shifts within the geofence perimeter for this trainee?')) {
      return;
    }
    setBatchVerifying(true);
    try {
      const res = await api.supervisor.batchVerify(traineeId, true, 'Verified by Supervisor');
      alert(res.message);
      if (selectedTrainee && selectedTrainee.traineeId === traineeId) {
        const refreshed = await api.supervisor.getTraineeAttendance(traineeId);
        setRecords(refreshed);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to batch verify records.');
    } finally {
      setBatchVerifying(false);
    }
  };

  const handleExportTraineeCsv = () => {
    if (!selectedTrainee) return;
    const now = new Date();
    downloadDtrCsv({
      traineeName: selectedTrainee.fullName,
      studentId: selectedTrainee.studentId,
      companyName: selectedTrainee.companyName,
      targetTotalHours: selectedTrainee.targetTotalHours,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      records
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-lg">
        <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 tracking-tight">
          <Users className="w-5 h-5 text-sky-400 shrink-0" />
          <span>Supervisor / Instructor Verification Portal</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Monitor assigned trainee attendance, verify geofenced proximity compliance, and approve official hours.
        </p>
      </div>

      {/* Supervisor Invite Code Card */}
      <div className="bg-gradient-to-r from-sky-950/70 via-slate-900 to-indigo-950/70 border border-sky-800/40 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-sky-500/20 text-sky-400 border border-sky-500/30">
                Supervisor Link Code
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Connect Trainees to Your Organization
            </h3>
            <p className="text-xs text-slate-400 max-w-xl">
              Give your unique invite code to your trainees. When they link with your code in their Settings tab, you gain administrative control over their geofence, target hours, and shift verifications.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-950/80 border border-sky-500/40 rounded-2xl px-4 py-2 text-center min-w-[120px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Your Code</span>
              <span className="text-lg sm:text-xl font-mono font-black text-sky-300 tracking-wider">
                {myCode || '...'}
              </span>
            </div>
            <button
              onClick={handleCopyCode}
              disabled={!myCode}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {codeCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Live Headcount & Duty Tracker Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* On Duty Card */}
        <button
          onClick={() => setDutyFilter(dutyFilter === 'onDuty' ? 'all' : 'onDuty')}
          className={`p-3 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
            dutyFilter === 'onDuty'
              ? 'bg-emerald-950/60 border-emerald-500 shadow-md shadow-emerald-950/50 ring-1 ring-emerald-500'
              : 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              On Duty Now
            </span>
            <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {trainees.filter(t => t.isOnDuty).length}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
            Active in workplace
          </p>
        </button>

        {/* Completed Today Card */}
        <button
          onClick={() => setDutyFilter(dutyFilter === 'completed' ? 'all' : 'completed')}
          className={`p-3 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            dutyFilter === 'completed'
              ? 'bg-sky-950/60 border-sky-500 shadow-md shadow-sky-950/50 ring-1 ring-sky-500'
              : 'bg-slate-900/90 border-slate-800 hover:border-sky-500/40 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
              Shift Done
            </span>
            <UserCheck className="w-4 h-4 text-sky-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {trainees.filter(t => !t.isOnDuty && t.todayStatus === 'Completed').length}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
            Completed today
          </p>
        </button>

        {/* Off Duty Card */}
        <button
          onClick={() => setDutyFilter(dutyFilter === 'notStarted' ? 'all' : 'notStarted')}
          className={`p-3 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            dutyFilter === 'notStarted'
              ? 'bg-slate-800 border-slate-600 shadow-md ring-1 ring-slate-500'
              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Off Duty
            </span>
            <UserX className="w-4 h-4 text-slate-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {trainees.filter(t => !t.isOnDuty && t.todayStatus === 'NotStarted').length}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
            Not timed in today
          </p>
        </button>

        {/* Pending Approval Card */}
        <button
          onClick={() => setDutyFilter(dutyFilter === 'pending' ? 'all' : 'pending')}
          className={`p-3 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            dutyFilter === 'pending'
              ? 'bg-amber-950/60 border-amber-500 shadow-md shadow-amber-950/50 ring-1 ring-amber-500'
              : 'bg-slate-900/90 border-slate-800 hover:border-amber-500/40 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Needs Approval
            </span>
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {trainees.reduce((acc, t) => acc + t.pendingVerificationCount, 0)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
            Across {trainees.filter(t => t.pendingVerificationCount > 0).length} trainee{trainees.filter(t => t.pendingVerificationCount > 0).length === 1 ? '' : 's'}
          </p>
        </button>
      </div>

      {/* Trainee Roster Grid */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div className="text-xs font-semibold text-slate-400">
            Registered Trainees Roster ({trainees.length})
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-[11px]">
            <button
              onClick={() => setDutyFilter('all')}
              className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer shrink-0 ${
                dutyFilter === 'all'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({trainees.length})
            </button>
            <button
              onClick={() => setDutyFilter('onDuty')}
              className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                dutyFilter === 'onDuty'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-emerald-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              On Duty ({trainees.filter(t => t.isOnDuty).length})
            </button>
            <button
              onClick={() => setDutyFilter('completed')}
              className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer shrink-0 ${
                dutyFilter === 'completed'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-sky-300'
              }`}
            >
              Done Today ({trainees.filter(t => !t.isOnDuty && t.todayStatus === 'Completed').length})
            </button>
            <button
              onClick={() => setDutyFilter('notStarted')}
              className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer shrink-0 ${
                dutyFilter === 'notStarted'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-300'
              }`}
            >
              Off Duty ({trainees.filter(t => !t.isOnDuty && t.todayStatus === 'NotStarted').length})
            </button>
            <button
              onClick={() => setDutyFilter('pending')}
              className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer shrink-0 ${
                dutyFilter === 'pending'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-amber-300'
              }`}
            >
              Pending ({trainees.filter(t => t.pendingVerificationCount > 0).length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl">
            <Clock className="w-6 h-6 animate-spin mx-auto text-sky-400 mb-2" />
            Loading trainee roster...
          </div>
        ) : trainees.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl">
            <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            No registered trainees found in the system yet.
          </div>
        ) : trainees.filter(t => {
            if (dutyFilter === 'onDuty') return t.isOnDuty;
            if (dutyFilter === 'completed') return !t.isOnDuty && t.todayStatus === 'Completed';
            if (dutyFilter === 'notStarted') return !t.isOnDuty && t.todayStatus === 'NotStarted';
            if (dutyFilter === 'pending') return t.pendingVerificationCount > 0;
            return true;
          }).length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl space-y-3">
            <Users className="w-8 h-8 mx-auto text-slate-600 mb-1" />
            <p>No trainees match the selected "{dutyFilter}" filter.</p>
            <button
              onClick={() => setDutyFilter('all')}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              Clear Filter & Show All
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {trainees
              .filter(t => {
                if (dutyFilter === 'onDuty') return t.isOnDuty;
                if (dutyFilter === 'completed') return !t.isOnDuty && t.todayStatus === 'Completed';
                if (dutyFilter === 'notStarted') return !t.isOnDuty && t.todayStatus === 'NotStarted';
                if (dutyFilter === 'pending') return t.pendingVerificationCount > 0;
                return true;
              })
              .map((t) => (
              <div
                key={t.traineeId}
                className={`bg-slate-900 border rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm transition-all flex flex-col justify-between gap-4 ${
                  t.isOnDuty
                    ? 'border-emerald-500/40 hover:border-emerald-500/60 ring-1 ring-emerald-500/20'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                        {t.fullName}
                      </h4>
                      <div className="text-[11px] text-slate-400 truncate">
                        {t.email} {t.studentId ? `• ID: ${t.studentId}` : ''}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {/* Live Duty Status Badge */}
                      {t.isOnDuty ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span>On Duty</span>
                        </span>
                      ) : t.todayStatus === 'Completed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-500/10 text-sky-300 border border-sky-500/20">
                          <CheckCircle2 className="w-3 h-3 text-sky-400" />
                          <span>Shift Done</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700/50">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>Off Duty</span>
                        </span>
                      )}

                      {/* Pending Verification Pill */}
                      {t.pendingVerificationCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {t.pendingVerificationCount} Pending
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800/60 text-emerald-400/80 border border-slate-800">
                          Up to Date
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 font-medium mb-3 truncate flex items-center justify-between">
                    <span className="truncate">{t.companyName}</span>
                    {t.isOnDuty && t.activeShiftStartedAt && (
                      <span className="text-[10px] text-emerald-400/90 font-mono shrink-0 ml-2">
                        In: {new Date(t.activeShiftStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-medium">
                      <span className="text-slate-400">Rendered Progress</span>
                      <span className="text-white font-bold">
                        {t.renderedHours.toFixed(1)} / {t.targetTotalHours} hrs ({t.completionPercentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          t.isOnDuty ? 'bg-gradient-to-r from-sky-500 to-emerald-400' : 'bg-sky-500'
                        }`}
                        style={{ width: `${Math.min(100, t.completionPercentage)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => openConfigureSettings(t)}
                    className="min-h-[40px] py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-850 active:scale-95 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Configure Rules</span>
                  </button>
                  <button
                    onClick={() => openTraineeDetails(t)}
                    className="min-h-[40px] py-2 px-3 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 active:scale-95 border border-sky-500/40 text-sky-300 hover:text-sky-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Inspect & Verify</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trainee Detail Modal (Responsive Bottom-sheet on mobile, Modal on desktop) */}
      {selectedTrainee && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-4xl max-h-[90dvh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom,0px)] sm:pb-0">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">{selectedTrainee.fullName}</h3>
                <p className="text-xs text-slate-400 truncate">
                  {selectedTrainee.companyName} • {selectedTrainee.renderedHours.toFixed(1)} of {selectedTrainee.targetTotalHours} hrs rendered
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {records.some(r => !r.isVerified && r.timeOut && r.timeInWithinGeofence && (r.timeOutWithinGeofence ?? true)) && (
                  <button
                    onClick={() => handleBatchVerify(selectedTrainee.traineeId)}
                    disabled={batchVerifying}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 active:scale-95 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Verify all completed shifts within geofence"
                  >
                    <CheckCheck className="w-4 h-4 text-emerald-400" />
                    <span className="hidden sm:inline">{batchVerifying ? 'Verifying...' : 'Batch Verify Valid'}</span>
                    <span className="sm:hidden">{batchVerifying ? '...' : 'Batch Verify'}</span>
                  </button>
                )}

                <button
                  onClick={handleExportTraineeCsv}
                  disabled={records.length === 0}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 active:scale-95 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  title="Export official trainee DTR spreadsheet for Excel or Google Sheets"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">Export DTR (CSV)</span>
                  <span className="sm:hidden">CSV</span>
                </button>

                <button
                  onClick={() => setSelectedTrainee(null)}
                  className="min-h-[38px] min-w-[38px] p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Attendance Shifts */}
            <div className="p-3 sm:p-5 overflow-y-auto space-y-3">
              {recordsLoading ? (
                <div className="p-12 text-center text-slate-400 text-sm">
                  <Clock className="w-6 h-6 animate-spin mx-auto text-sky-400 mb-2" />
                  Loading trainee shifts...
                </div>
              ) : records.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No attendance records recorded for this trainee yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {records.map((r) => (
                    <div
                      key={r.id}
                      className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-white text-xs">{r.date}</span>
                          {r.timeInWithinGeofence ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <ShieldCheck className="w-3 h-3 shrink-0" />
                              Inside Geofence ({r.timeInDistance}m)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              Outside Perimeter ({r.timeInDistance}m)
                            </span>
                          )}

                          {/* Perimeter Breach & Out-of-Range Badge */}
                          {r.perimeterLogs?.some(p => p.eventType === 'LocationDisabled') && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <WifiOff className="w-3 h-3 shrink-0 text-amber-400" />
                              GPS Signal Disabled
                            </span>
                          )}

                          {r.perimeterBreachCount && r.perimeterBreachCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              <AlertTriangle className="w-3 h-3 shrink-0 text-rose-400" />
                              {r.perimeterBreachCount} Perimeter / GPS Incident{r.perimeterBreachCount > 1 ? 's' : ''}
                            </span>
                          ) : r.timeOut ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-300/90 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-400" />
                              100% Verified in Perimeter
                            </span>
                          ) : null}
                        </div>

                        <div className="text-xs text-slate-300">
                          In: <span className="font-medium text-white">{new Date(r.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {' • '}
                          Out: <span className="font-medium text-white">{r.timeOut ? new Date(r.timeOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In Progress'}</span>
                          {' • '}
                          Net: <span className="font-bold text-sky-400">{r.netRenderedHours ? `${r.netRenderedHours.toFixed(2)}h` : '—'}</span>
                        </div>

                        {/* Perimeter & GPS Event Logs Timeline */}
                        {r.perimeterLogs && r.perimeterLogs.length > 0 && (
                          <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 space-y-1">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                                <span>Perimeter & Location Audit Trail ({r.perimeterLogs.length} events):</span>
                              </div>
                              {r.perimeterLogs.some(l => l.eventType === 'LocationDisabled') && (
                                <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Unverified Location Gap
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                              {r.perimeterLogs.map((log) => {
                                const isTamper = log.eventType === 'LocationDisabled';
                                const isRestored = log.eventType === 'LocationRestored';
                                const isDeparture = log.eventType === 'Departed';

                                const badgeClass = isTamper
                                  ? 'bg-amber-950/50 border-amber-500/40 text-amber-300'
                                  : isRestored
                                  ? 'bg-sky-950/40 border-sky-500/30 text-sky-300'
                                  : isDeparture
                                  ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                                  : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300';

                                const label = isTamper
                                  ? '⚠️ GPS Disabled'
                                  : isRestored
                                  ? '🛰️ GPS Restored'
                                  : isDeparture
                                  ? '⚠️ Left Perimeter'
                                  : '🟢 Returned';

                                return (
                                  <div
                                    key={log.id}
                                    className={`px-2.5 py-1 rounded-lg border flex items-center justify-between gap-2 ${badgeClass}`}
                                    title={log.note || undefined}
                                  >
                                    <span className="font-semibold flex items-center gap-1 truncate">
                                      <span>{label}</span>
                                      <span className="font-mono text-[10px] opacity-80">
                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </span>
                                    <span className="text-[10px] font-mono opacity-90 truncate max-w-[120px] text-right shrink-0">
                                      {isTamper ? 'Offline / Off' : `${Math.round(log.distanceMeters)}m away`}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {r.supervisorRemark && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 italic break-words">
                            <MessageSquare className="w-3 h-3 text-slate-500 shrink-0" />
                            "{r.supervisorRemark}"
                          </div>
                        )}
                      </div>

                      {/* Verification Actions */}
                      <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/60">
                        {!r.isVerified ? (
                          <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 w-full md:w-auto">
                            <input
                              type="text"
                              placeholder="Optional remark..."
                              value={remarkInput[r.id] || ''}
                              onChange={(e) => setRemarkInput({ ...remarkInput, [r.id]: e.target.value })}
                              className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 w-full xs:w-44"
                            />
                            <button
                              onClick={() => handleVerify(r.id)}
                              disabled={verifyingId === r.id || !r.timeOut}
                              className="min-h-[38px] py-1.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{verifyingId === r.id ? 'Verifying...' : 'Verify Shift'}</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Verified by Supervisor</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
              <button
                onClick={() => setSelectedTrainee(null)}
                className="w-full sm:w-auto min-h-[42px] px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
              >
                Close Roster Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trainee Settings Configuration Modal */}
      {configuringTrainee && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[90dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom,0px)] sm:pb-0">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400 shrink-0" />
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">
                    Configure Rules: {configuringTrainee.fullName}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 truncate">
                  Set workplace coordinates, geofence radius, and target hours for this trainee.
                </p>
              </div>
              <button
                onClick={() => setConfiguringTrainee(null)}
                className="min-h-[38px] min-w-[38px] p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Form */}
            <form onSubmit={handleSaveSettings} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Company / Establishment Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Host Training Establishment (Company)</label>
                <input
                  type="text"
                  value={cfgCompany}
                  onChange={(e) => setCfgCompany(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              {/* Hours Config */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Target Total Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={cfgTargetHours}
                    onChange={(e) => setCfgTargetHours(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Daily Schedule Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="24"
                    value={cfgDailyHours}
                    onChange={(e) => setCfgDailyHours(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Lunch Break (Mins)</label>
                  <input
                    type="number"
                    step="5"
                    min="0"
                    max="180"
                    value={cfgLunchMins}
                    onChange={(e) => setCfgLunchMins(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
              </div>

              {/* Geofence Map */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                    Workplace Geofence Pin & Perimeter
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Radius: {cfgRadius}m
                  </span>
                </div>

                <div className="border border-slate-800 rounded-2xl overflow-hidden shadow-inner">
                  <WorkplaceMapPicker
                    latitude={cfgLat}
                    longitude={cfgLng}
                    radiusMeters={cfgRadius}
                    onChange={(nLat, nLng) => {
                      setCfgLat(nLat);
                      setCfgLng(nLng);
                    }}
                    height="240px"
                  />
                </div>

                {/* Geofence Radius slider */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Geofence Radius: <strong className="text-white">{cfgRadius} meters</strong></span>
                    <span>Range: 20m - 500m</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="500"
                    step="10"
                    value={cfgRadius}
                    onChange={(e) => setCfgRadius(parseInt(e.target.value) || 100)}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Advanced Coords Accordion */}
              <div className="border border-slate-800/80 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvancedCoords(!showAdvancedCoords)}
                  className="w-full p-2.5 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Precise Coordinates & GPS Threshold
                  </span>
                  {showAdvancedCoords ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showAdvancedCoords && (
                  <div className="p-3 bg-slate-950/90 grid grid-cols-1 sm:grid-cols-3 gap-2.5 border-t border-slate-800">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={cfgLat}
                        onChange={(e) => setCfgLat(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={cfgLng}
                        onChange={(e) => setCfgLng(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">GPS Accuracy Threshold (m)</label>
                      <input
                        type="number"
                        min="10"
                        max="300"
                        value={cfgAccuracy}
                        onChange={(e) => setCfgAccuracy(parseInt(e.target.value) || 150)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Broadcast to All Trainees Checkbox */}
              <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cfgApplyToAll}
                    onChange={(e) => setCfgApplyToAll(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-indigo-200 block">Apply to ALL my linked trainees</span>
                    <span className="text-slate-400">
                      Standardize this company name, target hours, and workplace location across all {trainees.length} assigned trainees simultaneously.
                    </span>
                  </div>
                </label>
              </div>

              {/* Modal Footer / Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfiguringTrainee(null)}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="min-h-[40px] px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Sliders className="w-4 h-4" />
                  <span>{savingSettings ? 'Saving...' : cfgApplyToAll ? 'Broadcast to All Trainees' : 'Save Trainee Rules'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
