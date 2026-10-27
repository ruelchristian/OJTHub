import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
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
  WifiOff,
  Plus,
  Trash2,
  Edit3,
  Save,
  Award,
  BookOpen
} from 'lucide-react';
import { downloadDtrCsv } from '../utils/dtrExport';
import { getDynamicMilestones, TARGET_HOUR_PRESETS } from '../utils/milestones';

export const SupervisorPortal: React.FC = () => {
  const { user } = useAuth();
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
  const [cfgCompany, setCfgCompany] = useState<string>('One Corporate Centre (OCC)');
  const [cfgAddress, setCfgAddress] = useState<string>('');
  const [cfgLat, setCfgLat] = useState<number>(14.583916);
  const [cfgLng, setCfgLng] = useState<number>(121.063291);
  const [cfgRadius, setCfgRadius] = useState<number>(100);
  const [cfgAccuracy, setCfgAccuracy] = useState<number>(150);
  const [cfgTargetHours, setCfgTargetHours] = useState<string>('486.0');
  const [cfgDailyHours, setCfgDailyHours] = useState<string>('8.0');
  const [cfgMaxDailyHours, setCfgMaxDailyHours] = useState<string>('10.0');
  const [cfgLunchMins, setCfgLunchMins] = useState<number>(60);
  const [cfgApplyToAll, setCfgApplyToAll] = useState<boolean>(false);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [supervisorDefaultSetting, setSupervisorDefaultSetting] = useState<any>(null);
  const [showAdvancedCoords, setShowAdvancedCoords] = useState<boolean>(false);
  const [cfgAllowWeekendPunches, setCfgAllowWeekendPunches] = useState<boolean>(false);
  const [cfgOverwriteLocation, setCfgOverwriteLocation] = useState<boolean>(false);

  // Manual Attendance Adjustment / Credit Modal
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [manualDate, setManualDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [manualTimeIn, setManualTimeIn] = useState<string>('08:00');
  const [manualTimeOut, setManualTimeOut] = useState<string>('17:00');
  const [manualHours, setManualHours] = useState<string>('8.0');
  const [manualReason, setManualReason] = useState<string>('');
  const [savingManual, setSavingManual] = useState<boolean>(false);

  // Record Inline Editing State
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editTimeIn, setEditTimeIn] = useState<string>('');
  const [editTimeOut, setEditTimeOut] = useState<string>('');
  const [editNetHours, setEditNetHours] = useState<string>('');
  const [editRemark, setEditRemark] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Trainee Milestone Summary Modal State (for Teacher Evaluation)
  const [traineeMilestoneModalOpen, setTraineeMilestoneModalOpen] = useState<boolean>(false);
  const [traineeMilestoneHours, setTraineeMilestoneHours] = useState<number>(100);
  const [traineeMilestoneLoading, setTraineeMilestoneLoading] = useState<boolean>(false);
  const [traineeMilestoneText, setTraineeMilestoneText] = useState<string>('');
  const [traineeMilestoneCopied, setTraineeMilestoneCopied] = useState<boolean>(false);
  const [traineeSubmittedMilestones, setTraineeSubmittedMilestones] = useState<{
    id: string;
    milestoneHours: number;
    summaryContent: string;
    submittedAt: string;
  }[]>([]);
  const [traineeSubmissionInfo, setTraineeSubmissionInfo] = useState<string | null>(null);

  useEffect(() => {
    if (selectedTrainee) {
      api.activities.getSubmittedMilestones(selectedTrainee.traineeId)
        .then(setTraineeSubmittedMilestones)
        .catch(() => setTraineeSubmittedMilestones([]));
    } else {
      setTraineeSubmittedMilestones([]);
    }
  }, [selectedTrainee?.traineeId]);

  const handleViewTraineeMilestone = async (traineeId: string, milestoneHours: number) => {
    setTraineeMilestoneHours(milestoneHours);
    setTraineeMilestoneModalOpen(true);
    setTraineeMilestoneLoading(true);
    setTraineeMilestoneCopied(false);

    // If trainee already submitted this milestone report, load it directly
    const submitted = traineeSubmittedMilestones.find((s) => s.milestoneHours === milestoneHours);
    if (submitted) {
      setTraineeSubmissionInfo(
        `Submitted by student on ${new Date(submitted.submittedAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}`
      );
      setTraineeMilestoneText(submitted.summaryContent);
      setTraineeMilestoneLoading(false);
      return;
    }

    setTraineeSubmissionInfo(null);
    try {
      const res = await api.activities.getMilestoneSummary(milestoneHours, traineeId);
      setTraineeMilestoneText(res.summaryContent);
    } catch (err: any) {
      alert(err.message || 'Failed to load trainee milestone summary.');
      setTraineeMilestoneModalOpen(false);
    } finally {
      setTraineeMilestoneLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [tData, codeData, sData] = await Promise.all([
        api.supervisor.getTrainees(),
        api.supervisor.getMyCode().catch(() => ({ code: '', fullName: '' })),
        api.settings.get().catch(() => null)
      ]);
      setTrainees(tData);
      setMyCode(codeData.code);
      if (sData) setSupervisorDefaultSetting(sData);
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
    setCfgCompany(s?.companyName || t.companyName || 'One Corporate Centre (OCC)');
    setCfgAddress(s?.companyAddress || '');
    setCfgLat(s?.workplaceLatitude || 14.583916);
    setCfgLng(s?.workplaceLongitude || 121.063291);
    setCfgRadius(s?.geofenceRadiusMeters || 100);
    setCfgAccuracy(s?.gpsAccuracyThreshold || 250);
    setCfgTargetHours((s?.targetTotalHours || t.targetTotalHours || 486.0).toString());
    setCfgDailyHours((s?.dailyScheduleHours || 8.0).toString());
    setCfgMaxDailyHours((s?.maxDailyHours || 10.0).toString());
    setCfgLunchMins(s?.defaultLunchMinutes || 60);
    setCfgAllowWeekendPunches(Boolean(s?.allowWeekendPunches));
    setCfgOverwriteLocation(false);
    setCfgApplyToAll(false);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configuringTrainee) return;
    setSavingSettings(true);
    try {
      const payload = {
        companyName: cfgCompany,
        companyAddress: cfgAddress,
        workplaceLatitude: cfgLat,
        workplaceLongitude: cfgLng,
        geofenceRadiusMeters: cfgRadius,
        gpsAccuracyThreshold: cfgAccuracy,
        targetTotalHours: parseFloat(cfgTargetHours) || 486.0,
        dailyScheduleHours: parseFloat(cfgDailyHours) || 8.0,
        maxDailyHours: parseFloat(cfgMaxDailyHours) || 10.0,
        defaultLunchMinutes: cfgLunchMins,
        allowWeekendPunches: cfgAllowWeekendPunches,
        overwriteWorkplaceLocation: cfgApplyToAll ? cfgOverwriteLocation : true
      };

      if (cfgApplyToAll) {
        const res = await api.supervisor.broadcastSettings(payload);
        alert(res.message);
      } else {
        const res = await api.supervisor.updateTraineeSettings(configuringTrainee.traineeId, payload);
        alert(res.message);
      }

      // Broadcast update across open tabs/windows so student screens update immediately without refresh
      try {
        const bc = new BroadcastChannel('ojthub_rules_channel');
        bc.postMessage({ type: 'RULES_UPDATED', timestamp: Date.now() });
        bc.close();
      } catch {}

      setConfiguringTrainee(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainee) return;
    setSavingManual(true);
    try {
      const res = await api.supervisor.manualEntry(selectedTrainee.traineeId, {
        date: manualDate,
        timeIn: `${manualDate}T${manualTimeIn}:00`,
        timeOut: `${manualDate}T${manualTimeOut}:00`,
        netHours: parseFloat(manualHours) || 0,
        reason: manualReason.trim()
      });
      alert(res.message);
      setShowManualModal(false);
      setManualReason('');
      const refreshed = await api.supervisor.getTraineeAttendance(selectedTrainee.traineeId);
      setRecords(refreshed);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to record manual attendance entry');
    } finally {
      setSavingManual(false);
    }
  };

  const handleStartEditRecord = (r: AttendanceRecord) => {
    setEditingRecordId(r.id);
    const inTime = r.timeIn ? new Date(r.timeIn).toTimeString().slice(0, 5) : '08:00';
    const outTime = r.timeOut ? new Date(r.timeOut).toTimeString().slice(0, 5) : '17:00';
    setEditTimeIn(inTime);
    setEditTimeOut(outTime);
    setEditNetHours((r.netRenderedHours || 0).toString());
    setEditRemark(r.supervisorRemark || '');
  };

  const handleSaveEditRecord = async (r: AttendanceRecord) => {
    setSavingEdit(true);
    try {
      const res = await api.supervisor.updateAttendance(r.id, {
        timeIn: `${r.date}T${editTimeIn}:00`,
        timeOut: editTimeOut ? `${r.date}T${editTimeOut}:00` : undefined,
        netRenderedHours: parseFloat(editNetHours) || 0,
        supervisorRemark: editRemark.trim(),
        isVerified: true
      });
      alert(res.message);
      setEditingRecordId(null);
      if (selectedTrainee) {
        const refreshed = await api.supervisor.getTraineeAttendance(selectedTrainee.traineeId);
        setRecords(refreshed);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update attendance record');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this attendance record? This will adjust the trainee\'s total rendered hours.')) {
      return;
    }
    try {
      const res = await api.supervisor.deleteAttendance(recordId);
      alert(res.message);
      if (selectedTrainee) {
        const refreshed = await api.supervisor.getTraineeAttendance(selectedTrainee.traineeId);
        setRecords(refreshed);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete attendance record');
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 tracking-tight">
              <Users className="w-5 h-5 text-sky-400 shrink-0" />
              <span>Teacher & Supervisor OJT Management Console</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Monitor student attendance, verify geofenced proximity compliance, and approve official hours.
            </p>
          </div>
          {user?.schoolName && (
            <div className="flex items-center gap-2 bg-slate-950/70 border border-sky-500/30 px-3 py-1.5 rounded-xl shrink-0">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <div className="text-xs font-bold text-sky-300">{user.schoolName}</div>
                {user.department && (
                  <div className="text-[10px] text-slate-400">{user.department}</div>
                )}
              </div>
            </div>
          )}
        </div>
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
                      {(t.schoolName || t.department) && (
                        <div className="text-[10px] text-sky-400/90 truncate mt-0.5">
                          {t.schoolName} {t.department ? `(${t.department})` : ''}
                        </div>
                      )}
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
                <button
                  onClick={() => setShowManualModal(!showManualModal)}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 active:scale-95 border border-indigo-500/40 text-indigo-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Credit official hours manually for offsite seminars, forgotten phones, or power outages"
                >
                  <Plus className="w-4 h-4 text-indigo-400" />
                  <span className="hidden sm:inline">Add Manual Hours</span>
                  <span className="sm:hidden">+ Hours</span>
                </button>

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
                  onClick={() => {
                    setSelectedTrainee(null);
                    setShowManualModal(false);
                    setEditingRecordId(null);
                  }}
                  className="min-h-[38px] min-w-[38px] p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Teacher Practicum Milestone Evaluation Bar */}
            <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Internship Activity Milestones ({selectedTrainee.targetTotalHours || 486}h Target):</span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {getDynamicMilestones(selectedTrainee.targetTotalHours || 486).map((m) => {
                  const isReached = (selectedTrainee.renderedHours || 0) >= m.hours;
                  const submitted = traineeSubmittedMilestones.find((s) => s.milestoneHours === m.hours);
                  return (
                    <button
                      key={m.hours}
                      type="button"
                      onClick={() => handleViewTraineeMilestone(selectedTrainee.traineeId, m.hours)}
                      className={`min-h-[28px] px-2.5 py-0.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer border ${
                        submitted
                          ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40 shadow-sm'
                          : isReached
                          ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40'
                          : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                      title={
                        submitted
                          ? `Submitted by student on ${new Date(submitted.submittedAt).toLocaleDateString()}`
                          : `Review student's ${m.label} narrative`
                      }
                    >
                      <BookOpen className={`w-3 h-3 ${submitted ? 'text-emerald-400' : 'text-amber-400'}`} />
                      <span>{m.label}</span>
                      {submitted ? (
                        <span className="text-[9px] bg-emerald-500/25 text-emerald-300 px-1 py-0.2 rounded font-bold uppercase tracking-tight">
                          Submitted
                        </span>
                      ) : isReached ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : null}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    const val = prompt(`Enter custom milestone hour for ${selectedTrainee.fullName} (e.g. 150):`);
                    if (val) {
                      const num = parseInt(val, 10);
                      if (num > 0) {
                        handleViewTraineeMilestone(selectedTrainee.traineeId, num);
                      }
                    }
                  }}
                  className="min-h-[28px] px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/80 transition-all flex items-center gap-1 cursor-pointer"
                  title="Check any arbitrary milestone hour"
                >
                  <Plus className="w-3 h-3" />
                  <span>Custom Hour</span>
                </button>
              </div>
            </div>

            {/* Manual Attendance Adjustment Sub-form */}
            {showManualModal && (
              <form onSubmit={handleCreateManualEntry} className="p-4 bg-indigo-950/40 border-b border-indigo-500/30 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Manual Attendance Adjustment / Excuse Slip</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowManualModal(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Date</label>
                    <input
                      type="date"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Time In</label>
                    <input
                      type="time"
                      value={manualTimeIn}
                      onChange={(e) => setManualTimeIn(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Time Out</label>
                    <input
                      type="time"
                      value={manualTimeOut}
                      onChange={(e) => setManualTimeOut(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Net Hours Credit</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.1"
                      max="24"
                      value={manualHours}
                      onChange={(e) => setManualHours(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold text-emerald-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Reason / Official Authorization (Excuse Slip, Seminar, Power Outage, Battery Died)</label>
                  <input
                    type="text"
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                    placeholder="e.g. Attended Department Tech Summit / Company Power Outage"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowManualModal(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingManual}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-xs text-white font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{savingManual ? 'Crediting...' : 'Credit Hours Now'}</span>
                  </button>
                </div>
              </form>
            )}

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

                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-900 text-slate-400 border border-slate-800">
                            Precision: ±{r.timeInGpsAccuracy}m
                          </span>

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

                        {r.studentRemark && (
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200">
                            <div className="flex items-center gap-1.5 font-bold text-amber-300 text-[11px] uppercase tracking-wider mb-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>Trainee Outside Explanation</span>
                            </div>
                            <p className="text-slate-200 text-xs italic break-words">"{r.studentRemark}"</p>
                          </div>
                        )}

                        {r.supervisorRemark && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 italic break-words">
                            <MessageSquare className="w-3 h-3 text-slate-500 shrink-0" />
                            "{r.supervisorRemark}"
                          </div>
                        )}
                      </div>

                      {/* Verification & Record Management Actions */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/60">
                        {editingRecordId === r.id ? (
                          <div className="p-3 bg-slate-900 border border-indigo-500/50 rounded-xl space-y-2 w-full animate-fade-in">
                            <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center justify-between">
                              <span>Adjust Shift Record</span>
                              <button onClick={() => setEditingRecordId(null)} className="text-slate-400 hover:text-white">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <label className="text-[9px] text-slate-400 block">In</label>
                                <input
                                  type="time"
                                  value={editTimeIn}
                                  onChange={(e) => setEditTimeIn(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-slate-400 block">Out</label>
                                <input
                                  type="time"
                                  value={editTimeOut}
                                  onChange={(e) => setEditTimeOut(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-slate-400 block">Net Hrs</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={editNetHours}
                                  onChange={(e) => setEditNetHours(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs text-white font-bold text-emerald-400"
                                />
                              </div>
                            </div>
                            <div>
                              <input
                                type="text"
                                placeholder="Supervisor remark/reason..."
                                value={editRemark}
                                onChange={(e) => setEditRemark(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                              />
                            </div>
                            <div className="flex justify-end gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingRecordId(null)}
                                className="px-2.5 py-1 rounded bg-slate-800 text-[11px] text-slate-300 font-semibold cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditRecord(r)}
                                disabled={savingEdit}
                                className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-[11px] text-white font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <Save className="w-3 h-3" />
                                <span>{savingEdit ? 'Saving...' : 'Save Adjustment'}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            {!r.isVerified ? (
                              <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-1.5">
                                <input
                                  type="text"
                                  placeholder="Optional remark..."
                                  value={remarkInput[r.id] || ''}
                                  onChange={(e) => setRemarkInput({ ...remarkInput, [r.id]: e.target.value })}
                                  className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 w-full xs:w-36"
                                />
                                <button
                                  onClick={() => handleVerify(r.id)}
                                  disabled={verifyingId === r.id || !r.timeOut}
                                  className="min-h-[34px] py-1 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{verifyingId === r.id ? '...' : 'Verify'}</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Verified</span>
                              </div>
                            )}

                            {/* Supervisor Record Actions: Edit & Delete */}
                            <button
                              onClick={() => handleStartEditRecord(r)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="Adjust shift times or net hours"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(r.id)}
                              className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-400 hover:text-rose-200 transition-colors cursor-pointer"
                              title="Delete invalid/erroneous attendance record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

              {/* Host Company Street Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Host Company / Workplace Street Address</label>
                <input
                  type="text"
                  value={cfgAddress}
                  onChange={(e) => setCfgAddress(e.target.value)}
                  placeholder="e.g. Julia Vargas Ave cor. Meralco Ave, Ortigas Center, Pasig City"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-400 block">Auto-fills when searching or selecting on the map below</span>
              </div>

              {/* Hours Config */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {TARGET_HOUR_PRESETS.map((p) => {
                      const isSelected = parseFloat(cfgTargetHours) === p.hours;
                      return (
                        <button
                          key={p.hours}
                          type="button"
                          onClick={() => setCfgTargetHours(p.hours.toFixed(1))}
                          className={`min-h-[22px] px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-all ${
                            isSelected
                              ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
                          }`}
                          title={`${p.label} (${p.desc})`}
                        >
                          {p.hours}h
                        </button>
                      );
                    })}
                  </div>
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
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Max Daily Hours (Cap)</span>
                    <span className="text-[10px] text-amber-400 font-mono font-normal">e.g. 10.0</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="24"
                    value={cfgMaxDailyHours}
                    onChange={(e) => setCfgMaxDailyHours(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                    title="Maximum hours credited per day (e.g. 8h regular + 2h OT)"
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
                <div className="sm:col-span-2 lg:col-span-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cfgAllowWeekendPunches}
                      onChange={(e) => setCfgAllowWeekendPunches(e.target.checked)}
                      className="rounded border-slate-700 text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                    <span className="text-xs text-slate-300 font-semibold">
                      Allow Weekend Duty Punches (Saturdays & Sundays)
                    </span>
                  </label>
                </div>
              </div>

              {/* Geofence Map */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                    Workplace Geofence Pin & Perimeter
                  </label>
                  <div className="flex items-center gap-2">
                    {supervisorDefaultSetting && (
                      <button
                        type="button"
                        onClick={() => {
                          setCfgCompany(supervisorDefaultSetting.companyName);
                          setCfgLat(supervisorDefaultSetting.workplaceLatitude);
                          setCfgLng(supervisorDefaultSetting.workplaceLongitude);
                          setCfgRadius(supervisorDefaultSetting.geofenceRadiusMeters);
                          setCfgAccuracy(supervisorDefaultSetting.gpsAccuracyThreshold);
                        }}
                        className="text-[11px] text-sky-400 hover:text-sky-300 underline font-medium cursor-pointer"
                        title="Copy coordinator default workplace"
                      >
                        Use My Default Location
                      </button>
                    )}
                    <span className="text-[11px] text-slate-400">
                      Radius: {cfgRadius}m
                    </span>
                  </div>
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
                    onAddressChange={(addr) => setCfgAddress(addr)}
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
                      <label className="text-[10px] text-slate-400 block mb-1">Latitude (Auto-set by Pin)</label>
                      <input
                        type="number"
                        step="any"
                        value={cfgLat}
                        onChange={(e) => setCfgLat(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Longitude (Auto-set by Pin)</label>
                      <input
                        type="number"
                        step="any"
                        value={cfgLng}
                        onChange={(e) => setCfgLng(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1" title="Signal quality gate: Rejects punches if phone GPS error exceeds this value">
                        GPS Accuracy Threshold (Signal Quality Limit)
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="300"
                        value={cfgAccuracy}
                        onChange={(e) => setCfgAccuracy(parseInt(e.target.value) || 250)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                      />
                      <span className="text-[9px] text-slate-500 block mt-0.5">Device accuracy gate (e.g. 250m for PC/Wi-Fi, 50m for strict GPS). Does not change when picking map locations.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Broadcast to All Trainees Checkbox */}
              <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-3 space-y-2.5">
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
                      Standardize schedule policies (target hours, daily hours cap, lunch break, weekend rules) across all {trainees.length} assigned trainees simultaneously.
                    </span>
                  </div>
                </label>

                {cfgApplyToAll && (
                  <div className="pt-2 pl-6 border-t border-indigo-500/20">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cfgOverwriteLocation}
                        onChange={(e) => setCfgOverwriteLocation(e.target.checked)}
                        className="mt-0.5 rounded border-slate-700 text-indigo-400 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-amber-300 block">Also overwrite company name & geofence pin for all trainees</span>
                        <span className="text-slate-400 text-[11px]">
                          Unchecked (recommended): Leaves each trainee's unique company coordinates (e.g. Accenture, OCC, Globe) intact, updating only hours policies. Checked: Changes everyone's workplace to "{cfgCompany}".
                        </span>
                      </div>
                    </label>
                  </div>
                )}
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

      {/* Teacher Evaluation: Trainee Milestone Summary Modal */}
      {traineeMilestoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[85vh] space-y-4">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {traineeMilestoneHours}-Hour OJT Milestone Evaluation
                  </h3>
                  <p className="text-xs text-slate-400">
                    Trainee: {selectedTrainee?.fullName} • Synthesized from student journal entries
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setTraineeMilestoneModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto pr-1">
              {traineeSubmissionInfo && (
                <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-3.5 py-2 text-xs text-emerald-300 flex items-center gap-2 mb-3">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">{traineeSubmissionInfo}</span>
                </div>
              )}
              {traineeMilestoneLoading ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Clock className="w-7 h-7 animate-spin mx-auto text-amber-400" />
                  <p className="text-xs font-semibold">Generating {traineeMilestoneHours}-Hour milestone evaluation report...</p>
                </div>
              ) : (
                <textarea
                  readOnly
                  rows={14}
                  value={traineeMilestoneText}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-xs sm:text-sm font-mono text-slate-200 leading-relaxed focus:outline-none whitespace-pre-wrap resize-none"
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-3 flex-wrap gap-2">
              <span className="text-[11px] text-slate-400">
                School Evaluation / CHED Practicum Rubric
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (traineeMilestoneText) {
                      await navigator.clipboard.writeText(traineeMilestoneText);
                      setTraineeMilestoneCopied(true);
                      setTimeout(() => setTraineeMilestoneCopied(false), 2500);
                    }
                  }}
                  disabled={traineeMilestoneLoading || !traineeMilestoneText}
                  className="min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer disabled:opacity-40"
                >
                  {traineeMilestoneCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{traineeMilestoneCopied ? 'Copied!' : 'Copy for Grading'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTraineeMilestoneModalOpen(false)}
                  className="min-h-[36px] px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
