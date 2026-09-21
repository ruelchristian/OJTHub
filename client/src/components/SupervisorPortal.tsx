import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { TraineeSummary, AttendanceRecord } from '../types';
import { Users, ShieldCheck, CheckCircle2, Clock, AlertCircle, MessageSquare, X } from 'lucide-react';

export const SupervisorPortal: React.FC = () => {
  const [trainees, setTrainees] = useState<TraineeSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Selected Trainee Detail Modal
  const [selectedTrainee, setSelectedTrainee] = useState<TraineeSummary | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState<boolean>(false);
  const [remarkInput, setRemarkInput] = useState<{ [recordId: string]: string }>({});
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const loadTrainees = async () => {
    setLoading(true);
    try {
      const data = await api.supervisor.getTrainees();
      setTrainees(data);
    } catch (err) {
      console.error('Failed to load trainees', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrainees();
  }, []);

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
      await loadTrainees();
    } catch (err: any) {
      alert(err.message || 'Failed to verify attendance');
    } finally {
      setVerifyingId(null);
    }
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

      {/* Trainee Roster Grid */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-slate-400 px-1">
          Registered Trainees Roster ({trainees.length})
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {trainees.map((t) => (
              <div
                key={t.traineeId}
                className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm hover:border-slate-700 transition-colors flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{t.fullName}</h4>
                      <div className="text-[11px] text-slate-400 truncate">
                        {t.email} {t.studentId ? `• ID: ${t.studentId}` : ''}
                      </div>
                    </div>
                    {t.pendingVerificationCount > 0 ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0">
                        {t.pendingVerificationCount} Pending
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                        Up to Date
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-300 font-medium mb-3 truncate">
                    {t.companyName}
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
                        className="bg-sky-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, t.completionPercentage)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => openTraineeDetails(t)}
                  className="w-full min-h-[42px] py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-sky-400 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Inspect & Verify Shifts</span>
                </button>
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
              <button
                onClick={() => setSelectedTrainee(null)}
                className="min-h-[38px] min-w-[38px] p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
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
                        </div>

                        <div className="text-xs text-slate-300">
                          In: <span className="font-medium text-white">{new Date(r.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {' • '}
                          Out: <span className="font-medium text-white">{r.timeOut ? new Date(r.timeOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In Progress'}</span>
                          {' • '}
                          Net: <span className="font-bold text-sky-400">{r.netRenderedHours ? `${r.netRenderedHours.toFixed(2)}h` : '—'}</span>
                        </div>

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
    </div>
  );
};
