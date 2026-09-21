import type { AttendanceRecord } from '../types';

export interface DtrExportOptions {
  traineeName: string;
  studentId?: string;
  companyName: string;
  targetTotalHours: number;
  month: number;
  year: number;
  records: AttendanceRecord[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Escapes a cell value for standard CSV compatibility (RFC 4180).
 */
function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates and downloads a University-Ready CSV/Excel spreadsheet DTR.
 */
export function downloadDtrCsv(options: {
  traineeName: string;
  studentId?: string;
  companyName: string;
  targetTotalHours: number;
  month: number;
  year: number;
  records: AttendanceRecord[];
}): void {
  const { traineeName, studentId, companyName, targetTotalHours, month, year, records } = options;
  const monthName = MONTH_NAMES[month - 1] || `Month ${month}`;
  const daysInMonth = new Date(year, month, 0).getDate();

  const lines: string[] = [];

  // Title & Metadata Header Block
  lines.push('DAILY TIME RECORD (DTR) - OFFICIAL RECORD');
  lines.push('On-the-Job Training Management System — OJTHub');
  lines.push('');
  lines.push(`Trainee Name:,${escapeCsvCell(traineeName.toUpperCase())}`);
  lines.push(`Student ID:,${escapeCsvCell(studentId || 'N/A')}`);
  lines.push(`Host Training Establishment:,${escapeCsvCell(companyName)}`);
  lines.push(`Target Total Hours:,${escapeCsvCell(targetTotalHours)} hrs`);
  lines.push(`Reporting Period:,${escapeCsvCell(`${monthName} ${year}`)}`);
  lines.push(`Report Generated On:,${escapeCsvCell(new Date().toLocaleString())}`);
  lines.push('');

  // Column Headers
  const headers = [
    'Day',
    'Date',
    'Day of Week',
    'Time In',
    'Break (Mins)',
    'Time Out',
    'Net Rendered Hours',
    'Cumulative Hours',
    'Geofence Compliance',
    'Verification Status',
    'Supervisor Remarks'
  ];
  lines.push(headers.map(escapeCsvCell).join(','));

  let cumulativeHours = 0;
  let totalMonthHours = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = day.toString().padStart(2, '0');
    const monthStr = month.toString().padStart(2, '0');
    const dateStr = `${year}-${monthStr}-${dayStr}`;
    const dObj = new Date(year, month - 1, day);
    const dayOfWeek = dObj.toLocaleDateString('en-US', { weekday: 'long' });

    const rec = records.find(r => r.date === dateStr);

    let timeInStr = '—';
    let timeOutStr = '—';
    let breakMinsStr = '—';
    let netHoursStr = '—';
    let geofenceStr = '—';
    let statusStr = 'No Shift Logged';
    let remarksStr = '';

    if (rec) {
      timeInStr = new Date(rec.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      breakMinsStr = `${rec.lunchBreakMinutes} mins`;
      
      if (rec.timeOut) {
        timeOutStr = new Date(rec.timeOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        timeOutStr = 'Active / On-Duty';
      }

      if (rec.netRenderedHours !== null && rec.netRenderedHours !== undefined) {
        netHoursStr = rec.netRenderedHours.toFixed(2);
        cumulativeHours += rec.netRenderedHours;
        totalMonthHours += rec.netRenderedHours;
      }

      const inOk = rec.timeInWithinGeofence;
      const outOk = rec.timeOutWithinGeofence ?? true;
      if (inOk && outOk) {
        geofenceStr = 'Compliant (Within Geofence)';
      } else if (!inOk && !outOk) {
        geofenceStr = 'Non-Compliant (Both Punches Outside)';
      } else if (!inOk) {
        geofenceStr = 'Warning (Time-In Outside)';
      } else {
        geofenceStr = 'Warning (Time-Out Outside)';
      }

      statusStr = rec.isVerified ? 'VERIFIED' : 'PENDING APPROVAL';
      remarksStr = rec.supervisorRemark || '';
    }

    const row = [
      day.toString(),
      dateStr,
      dayOfWeek,
      timeInStr,
      breakMinsStr,
      timeOutStr,
      netHoursStr,
      rec && rec.netRenderedHours !== null ? cumulativeHours.toFixed(2) : '—',
      geofenceStr,
      statusStr,
      remarksStr
    ];

    lines.push(row.map(escapeCsvCell).join(','));
  }

  // Summary & Sign-off Footer Block
  const remainingHours = Math.max(0, targetTotalHours - cumulativeHours);
  lines.push('');
  lines.push(`Total Rendered Hours (${monthName} ${year}):,${totalMonthHours.toFixed(2)} hrs`);
  lines.push(`Overall Target Requirement:,${targetTotalHours.toFixed(2)} hrs`);
  lines.push(`Remaining Hours Balance:,${remainingHours.toFixed(2)} hrs`);
  lines.push('');
  lines.push('CERTIFICATION STATEMENT:');
  lines.push('"I certify on my honor that the above is a true and correct report of the hours of work performed by me during the specified period."');
  lines.push('');
  lines.push(`Student Trainee Signature:,_______________________________,Date:,${escapeCsvCell(new Date().toLocaleDateString())}`);
  lines.push('Authorized Supervisor Signature:,_______________________________,Date:,_______________________________');

  // Prefix with UTF-8 BOM so Microsoft Excel automatically recognizes UTF-8 encoding
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  const safeTraineeName = (traineeName || 'Trainee').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `DTR_${safeTraineeName}_${monthName}_${year}.csv`;

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
