import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { AttendanceRecord, OjtSetting } from '../types';
import { FileText, Download, Printer } from 'lucide-react';

export const DtrGenerator: React.FC = () => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [setting, setSetting] = useState<OjtSetting | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [historyData, settingsData] = await Promise.all([
          api.attendance.getHistory(selectedMonth, selectedYear),
          api.settings.get()
        ]);
        setRecords(historyData);
        setSetting(settingsData);
      } catch (err) {
        console.error('Failed to load DTR data', err);
      } finally {
        setLoading(false);
      }
    }
    load();
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

  const totalMonthHours = records.reduce((acc, r) => acc + (r.netRenderedHours ?? 0), 0);

  const generatePdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const monthName = months.find(m => m.value === selectedMonth)?.label ?? 'Month';

    // Header formatting
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('DAILY TIME RECORD (DTR)', 105, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('On-the-Job Training Management System — OJTHub', 105, 23, { align: 'center' });

    // Trainee Details Box
    doc.setLineWidth(0.2);
    doc.rect(14, 28, 182, 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TRAINEE NAME:', 18, 34);
    doc.setFont('helvetica', 'normal');
    doc.text(user?.fullName?.toUpperCase() ?? 'TRAINEE NAME', 50, 34);

    doc.setFont('helvetica', 'bold');
    doc.text('STUDENT ID:', 130, 34);
    doc.setFont('helvetica', 'normal');
    doc.text(user?.studentId ?? 'N/A', 156, 34);

    doc.setFont('helvetica', 'bold');
    doc.text('ESTABLISHMENT:', 18, 40);
    doc.setFont('helvetica', 'normal');
    doc.text(setting?.companyName ?? 'Host Training Establishment', 50, 40);

    doc.setFont('helvetica', 'bold');
    doc.text('MONTH / YEAR:', 18, 46);
    doc.setFont('helvetica', 'normal');
    doc.text(`${monthName} ${selectedYear}`, 50, 46);

    doc.setFont('helvetica', 'bold');
    doc.text('TARGET HOURS:', 130, 46);
    doc.setFont('helvetica', 'normal');
    doc.text(`${setting?.targetTotalHours ?? 486} Hours`, 160, 46);

    // Prepare table rows for days of the month
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const tableBody = [];

    let runningTotal = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const rec = records.find(r => r.date === dateStr);

      const dObj = new Date(selectedYear, selectedMonth - 1, day);
      const dayName = dObj.toLocaleDateString('en-US', { weekday: 'short' });

      let timeInStr = '—';
      let timeOutStr = '—';
      let hoursStr = '—';
      let verifiedStr = '—';

      if (rec) {
        timeInStr = new Date(rec.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (rec.timeOut) {
          timeOutStr = new Date(rec.timeOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        if (rec.netRenderedHours !== null && rec.netRenderedHours !== undefined) {
          hoursStr = rec.netRenderedHours.toFixed(2);
          runningTotal += rec.netRenderedHours;
        }
        verifiedStr = rec.isVerified ? 'VERIFIED' : 'PENDING';
      }

      tableBody.push([
        day.toString(),
        dayName,
        timeInStr,
        rec ? `${rec.lunchBreakMinutes}m` : '—',
        timeOutStr,
        hoursStr,
        runningTotal > 0 && rec ? runningTotal.toFixed(2) : '—',
        verifiedStr
      ]);
    }

    autoTable(doc, {
      startY: 54,
      head: [['Day', 'Day', 'Time-In', 'Break', 'Time-Out', 'Hours', 'Cumulative', 'Status']],
      body: tableBody,
      styles: {
        fontSize: 7.5,
        cellPadding: 1.5,
        halign: 'center',
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 14, right: 14 }
    });

    // Summary & Signatures at bottom
    const finalY = (doc as any).lastAutoTable.finalY + 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Total Rendered Hours for ${monthName}: ${totalMonthHours.toFixed(2)} Hours`, 14, finalY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(
      'I certify on my honor that the above is a true and correct report of the hours of work performed by me during the specified period.',
      14,
      finalY + 6,
      { maxWidth: 182 }
    );

    // Signatures
    const sigY = finalY + 22;
    doc.line(20, sigY, 80, sigY);
    doc.text(user?.fullName?.toUpperCase() ?? 'TRAINEE SIGNATURE', 50, sigY + 4, { align: 'center' });
    doc.text('Student / OJT Trainee', 50, sigY + 8, { align: 'center' });

    doc.line(130, sigY, 190, sigY);
    doc.text('AUTHORIZED SUPERVISOR', 160, sigY + 4, { align: 'center' });
    doc.text('OJT Supervisor / Instructor', 160, sigY + 8, { align: 'center' });

    doc.save(`DTR_${user?.fullName?.replace(/\s+/g, '_')}_${monthName}_${selectedYear}.pdf`);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-lg">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 tracking-tight">
            <FileText className="w-5 h-5 text-sky-400 shrink-0" />
            <span>Printable DTR Document Generator</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Generate and export official Daily Time Records (DTR) formatted with institutional standards.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
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

          <button
            onClick={generatePdf}
            disabled={loading}
            className="w-full xs:w-auto min-h-[42px] px-4 py-2 rounded-xl font-bold text-xs bg-sky-600 hover:bg-sky-500 active:scale-95 text-white shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* DTR Preview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xl space-y-4 sm:space-y-6">
        <div className="text-center border-b border-slate-800 pb-4 sm:pb-6">
          <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
            Daily Time Record Preview
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {setting?.companyName ?? 'Host Training Establishment'} • {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
          </p>
        </div>

        {/* Trainee Meta Summary Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 text-xs">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-[10px]">Trainee Name</div>
            <div className="font-bold text-white mt-0.5 truncate">{user?.fullName}</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-[10px]">Student / Trainee ID</div>
            <div className="font-bold text-white mt-0.5 truncate">{user?.studentId || 'N/A'}</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-[10px]">Month Rendered Hours</div>
            <div className="font-bold text-emerald-400 mt-0.5">{totalMonthHours.toFixed(2)} hrs</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-[10px]">Target Requirement</div>
            <div className="font-bold text-white mt-0.5">{setting?.targetTotalHours ?? 486} hrs</div>
          </div>
        </div>

        {/* Shifts Table with Smooth Overflow */}
        <div className="border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 sm:px-4 whitespace-nowrap">Date</th>
                <th className="py-2.5 px-3 sm:px-4 whitespace-nowrap">Time-In</th>
                <th className="py-2.5 px-3 sm:px-4 whitespace-nowrap">Time-Out</th>
                <th className="py-2.5 px-3 sm:px-4 whitespace-nowrap">Lunch</th>
                <th className="py-2.5 px-3 sm:px-4 whitespace-nowrap">Net Hours</th>
                <th className="py-2.5 px-3 sm:px-4 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No shifts recorded for this month.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-2.5 px-3 sm:px-4 font-medium text-white whitespace-nowrap">{r.date}</td>
                    <td className="py-2.5 px-3 sm:px-4 whitespace-nowrap">{new Date(r.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="py-2.5 px-3 sm:px-4 whitespace-nowrap">{r.timeOut ? new Date(r.timeOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="py-2.5 px-3 sm:px-4 text-slate-400 whitespace-nowrap">{r.lunchBreakMinutes}m</td>
                    <td className="py-2.5 px-3 sm:px-4 font-bold text-white whitespace-nowrap">{r.netRenderedHours ? `${r.netRenderedHours.toFixed(2)}h` : '—'}</td>
                    <td className="py-2.5 px-3 sm:px-4 whitespace-nowrap">
                      {r.isVerified ? (
                        <span className="text-sky-400 font-semibold text-[10px]">Verified</span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Pending</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row justify-end pt-2">
          <button
            onClick={generatePdf}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl font-bold text-xs bg-sky-600 hover:bg-sky-500 active:scale-95 text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Generate & Download Official DTR</span>
          </button>
        </div>
      </div>
    </div>
  );
};
