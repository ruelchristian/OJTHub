import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { AttendanceRecord } from '../types';
import { Calendar, ShieldCheck, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export const AttendanceHistory: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await api.attendance.getHistory(selectedMonth, selectedYear);
      setRecords(data);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [selectedMonth, selectedYear]);

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-lg">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 tracking-tight">
            <Calendar className="w-5 h-5 text-sky-400 shrink-0" />
            <span>Attendance History</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Review your daily recorded shifts, geofence compliance, and supervisor sign-offs.
          </p>
        </div>

        {/* Month & Year Selectors (Touch Ergonomics) */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="flex-1 sm:flex-initial min-h-[42px] bg-slate-800 border border-slate-700 text-slate-100 text-xs sm:text-sm rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="min-h-[42px] bg-slate-800 border border-slate-700 text-slate-100 text-xs sm:text-sm rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </div>
      </div>

      {/* Attendance Content: Mobile Card View (< md) + Desktop Table View (>= md) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <Clock className="w-6 h-6 animate-spin mx-auto text-sky-400 mb-2" />
            Loading attendance records...
          </div>
        ) : records.length === 0 ? (
          <div className="p-10 sm:p-14 text-center text-slate-400 text-sm">
            <Calendar className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            No attendance records found for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}.
          </div>
        ) : (
          <>
            {/* 1. Mobile Cards Layout (< md) */}
            <div className="md:hidden divide-y divide-slate-800/80 p-2 sm:p-3 space-y-2.5">
              {records.map((r) => {
                const dateObj = new Date(r.date);
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

                return (
                  <div 
                    key={r.id} 
                    className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm"
                  >
                    {/* Header: Date + Verification Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-sm text-white flex items-center gap-1.5">
                        <span>{r.date}</span>
                        <span className="text-xs text-sky-400 font-medium px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20">
                          {dayName}
                        </span>
                      </div>

                      {r.isVerified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          Pending
                        </span>
                      )}
                    </div>

                    {/* Shift Punch Times */}
                    <div className="grid grid-cols-3 gap-2 text-xs bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/60">
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">Time In</div>
                        <div className="font-semibold text-slate-200 mt-0.5">
                          {new Date(r.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">Time Out</div>
                        <div className="font-semibold text-slate-200 mt-0.5">
                          {r.timeOut ? (
                            new Date(r.timeOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          ) : (
                            <span className="text-amber-400">In Shift</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">Lunch</div>
                        <div className="font-semibold text-slate-300 mt-0.5">
                          {r.lunchBreakMinutes}m
                        </div>
                      </div>
                    </div>

                    {/* Footer: Net Hours + Geofence Status */}
                    <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[11px]">Net:</span>
                        <span className="font-black text-emerald-400 text-sm">
                          {r.netRenderedHours != null ? `${r.netRenderedHours.toFixed(2)} hrs` : '—'}
                        </span>
                      </div>

                      <div>
                        {r.timeInWithinGeofence ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <ShieldCheck className="w-3 h-3" />
                            Inside ({r.timeInDistance}m)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <AlertCircle className="w-3 h-3" />
                            Outside ({r.timeInDistance}m)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. Desktop High-Density Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Time In</th>
                    <th className="py-3.5 px-4">Time Out</th>
                    <th className="py-3.5 px-4">Lunch</th>
                    <th className="py-3.5 px-4">Net Hours</th>
                    <th className="py-3.5 px-4">Geofence Proximity</th>
                    <th className="py-3.5 px-4">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {records.map((r) => {
                    const dateObj = new Date(r.date);
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

                    return (
                      <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap">
                          {r.date} <span className="text-[10px] text-slate-400 font-normal">({dayName})</span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {new Date(r.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {r.timeOut ? (
                            new Date(r.timeOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          ) : (
                            <span className="text-amber-400 font-medium">In Progress</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {r.lunchBreakMinutes}m
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                          {r.netRenderedHours != null ? `${r.netRenderedHours.toFixed(2)}h` : '—'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {r.timeInWithinGeofence ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <ShieldCheck className="w-3 h-3" />
                              Inside ({r.timeInDistance}m)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <AlertCircle className="w-3 h-3" />
                              Outside ({r.timeInDistance}m)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {r.isVerified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
