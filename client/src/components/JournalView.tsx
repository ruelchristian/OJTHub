import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { ActivityLog, OjtSetting } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PdfPreviewModal } from './PdfPreviewModal';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  Tag, 
  Sparkles, 
  Check, 
  Pencil, 
  X, 
  Mic, 
  MicOff, 
  FileText, 
  Zap, 
  Copy, 
  Award,
  ChevronRight,
  Send
} from 'lucide-react';
import { getDynamicMilestones } from '../utils/milestones';

export const JournalView: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [setting, setSetting] = useState<OjtSetting | null>(null);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [hoursSpent, setHoursSpent] = useState<string>('2.0');
  const [category, setCategory] = useState<string>('Development');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [polishing, setPolishing] = useState<boolean>(false);
  const [polishedJustNow, setPolishedJustNow] = useState<boolean>(false);

  // Feature 1: Today's Shift Sync State
  const [todayShiftHours, setTodayShiftHours] = useState<number | null>(null);
  const [todayShiftRemark, setTodayShiftRemark] = useState<string | null>(null);
  const [syncedJustNow, setSyncedJustNow] = useState<boolean>(false);

  // Feature 5: Voice-to-Text State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Feature 3: Journal PDF Preview State
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewPdfName, setPreviewPdfName] = useState<string>('');

  // Feature 6: Milestone Summary State & Teacher Submissions
  const [milestoneModalOpen, setMilestoneModalOpen] = useState<boolean>(false);
  const [selectedMilestone, setSelectedMilestone] = useState<number>(100);
  const [milestoneLoading, setMilestoneLoading] = useState<boolean>(false);
  const [milestoneSummaryText, setMilestoneSummaryText] = useState<string>('');
  const [milestoneCopied, setMilestoneCopied] = useState<boolean>(false);
  const [submittedMilestones, setSubmittedMilestones] = useState<{
    id: string;
    milestoneHours: number;
    summaryContent: string;
    submittedAt: string;
  }[]>([]);
  const [submittingMilestone, setSubmittingMilestone] = useState<boolean>(false);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const [data, settingsData, statusData, submittedList] = await Promise.all([
        api.activities.list(),
        api.settings.get().catch(() => null),
        api.attendance.getStatus().catch(() => null),
        api.activities.getSubmittedMilestones().catch(() => [])
      ]);
      setActivities(data);
      if (settingsData) setSetting(settingsData);
      if (submittedList) setSubmittedMilestones(submittedList);

      // Detect today's shift hours from attendance status
      if (statusData?.todayRecord) {
        const record = statusData.todayRecord;
        if (record.netRenderedHours && record.netRenderedHours > 0) {
          setTodayShiftHours(record.netRenderedHours);
        } else if (record.timeIn) {
          const start = new Date(record.timeIn).getTime();
          const end = record.timeOut ? new Date(record.timeOut).getTime() : Date.now();
          const rawHours = Math.max(0, (end - start) / 3600000);
          const lunchDeduction = rawHours > 4.0 ? (statusData.settings?.defaultLunchMinutes ?? 60) / 60 : 0;
          setTodayShiftHours(Math.max(0, Math.round((rawHours - lunchDeduction) * 10) / 10));
        }
        if (record.studentRemark) {
          setTodayShiftRemark(record.studentRemark);
        }
      }
    } catch (err) {
      console.error('Failed to load journal activities', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  // Auto-sync if navigated with ?autoSync=true
  useEffect(() => {
    if (searchParams.get('autoSync') === 'true' && todayShiftHours !== null) {
      handleSyncShift();
    }
  }, [searchParams, todayShiftHours]);

  // Setup Web Speech API for voice-to-text
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript) {
          setDetails((prev) => {
            const separator = prev.trim() ? ' ' : '';
            return `${prev.trim()}${separator}${currentTranscript.trim()}`;
          });
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceRecording = () => {
    if (!speechSupported || !recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Failed to start speech recognition', err);
      }
    }
  };

  // Feature 1: Sync from Today's Attendance Shift
  const handleSyncShift = () => {
    if (todayShiftHours === null || todayShiftHours <= 0) return;
    setHoursSpent(todayShiftHours.toFixed(1));
    setDate(new Date().toISOString().split('T')[0]);
    if (!details.trim() && todayShiftRemark) {
      setDetails(todayShiftRemark);
    }
    setSyncedJustNow(true);
    setTimeout(() => setSyncedJustNow(false), 3000);
  };

  // Feature 2: Inline Entry Edit
  const handleStartEdit = (entry: ActivityLog) => {
    setEditingId(entry.id);
    setDate(entry.date);
    setTaskTitle(entry.taskTitle);
    setDetails(entry.details || '');
    setHoursSpent(entry.hoursSpent ? entry.hoursSpent.toString() : '2.0');
    setCategory(entry.category || 'Development');
    setFormError(null);
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTaskTitle('');
    setDetails('');
    setHoursSpent('2.0');
    setCategory('Development');
    setFormError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      setFormError('Please enter a task title.');
      return;
    }

    setFormError(null);
    setSubmitting(true);
    try {
      const payload = {
        date,
        taskTitle: taskTitle.trim(),
        details: details.trim(),
        hoursSpent: hoursSpent ? parseFloat(hoursSpent) : undefined,
        category
      };

      if (editingId) {
        await api.activities.update(editingId, payload);
        setEditingId(null);
      } else {
        await api.activities.create(payload);
      }

      setTaskTitle('');
      setDetails('');
      await loadActivities();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save journal entry.');
    } finally {
      setSubmitting(false);
    }
  };

  // AI Polish: Rewrites rough notes into clear, authentic human English
  const handlePolishWithAi = async () => {
    if (!taskTitle.trim() && !details.trim()) return;
    setPolishing(true);
    try {
      const res = await api.activities.polish({
        taskTitle: taskTitle.trim(),
        details: details.trim(),
        category,
        purpose: 'journal'
      });
      if (res?.polishedDetails) {
        setDetails(res.polishedDetails);
        setPolishedJustNow(true);
        setTimeout(() => setPolishedJustNow(false), 3500);
      }
    } catch (err) {
      console.error('Failed to polish journal entry', err);
    } finally {
      setPolishing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this journal entry?')) return;
    try {
      await api.activities.delete(id);
      setActivities(activities.filter(a => a.id !== id));
      if (editingId === id) {
        handleCancelEdit();
      }
    } catch (err) {
      console.error('Failed to delete journal entry', err);
    }
  };

  // Feature 3: Export Journal Accomplishment Logbook PDF
  const handleExportJournalPdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Document Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('OJT PRACTICUM DAILY ACCOMPLISHMENT LOGBOOK', 105, 18, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('On-the-Job Training Daily Journal & Competency Records', 105, 23, { align: 'center' });

    // Student & Internship Details Box
    doc.setLineWidth(0.2);
    doc.rect(14, 28, 182, 24);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Trainee Name:`, 18, 35);
    doc.setFont('helvetica', 'normal');
    doc.text(user?.fullName || 'Student Trainee', 46, 35);

    doc.setFont('helvetica', 'bold');
    doc.text(`Student ID:`, 18, 41);
    doc.setFont('helvetica', 'normal');
    doc.text(user?.studentId || 'N/A', 46, 41);

    doc.setFont('helvetica', 'bold');
    doc.text(`Institution:`, 18, 47);
    doc.setFont('helvetica', 'normal');
    doc.text(user?.schoolName || 'University Practicum Program', 46, 47);

    doc.setFont('helvetica', 'bold');
    doc.text(`Host Company:`, 110, 35);
    doc.setFont('helvetica', 'normal');
    doc.text(setting?.companyName || 'Host Training Establishment', 138, 35);

    doc.setFont('helvetica', 'bold');
    doc.text(`Total Logged:`, 110, 41);
    doc.setFont('helvetica', 'normal');
    const totalHours = activities.reduce((sum, a) => sum + (a.hoursSpent || 0), 0);
    doc.text(`${totalHours.toFixed(1)} Hours (${activities.length} Entries)`, 138, 41);

    doc.setFont('helvetica', 'bold');
    doc.text(`Report Date:`, 110, 47);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), 138, 47);

    // Table Data
    const tableData = activities.map((act) => [
      act.date,
      act.category,
      `${act.taskTitle}\n${act.details || ''}`.trim(),
      act.hoursSpent ? `${act.hoursSpent.toFixed(1)}h` : '—'
    ]);

    autoTable(doc, {
      startY: 56,
      head: [['Date', 'Category', 'Task Accomplishments & Learnings', 'Hours']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center'
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        overflow: 'linebreak',
        textColor: [30, 41, 59]
      },
      columnStyles: {
        0: { cellWidth: 24, halign: 'center' },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 108 },
        3: { cellWidth: 20, halign: 'center' }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 14, right: 14 }
    });

    // Signatures
    const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 16 : 220;
    const signY = finalY > 250 ? 250 : finalY;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');

    // Trainee Signature
    doc.line(20, signY, 85, signY);
    doc.text(user?.fullName?.toUpperCase() || 'TRAINEE SIGNATURE', 52.5, signY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('Student Trainee', 52.5, signY + 9, { align: 'center' });

    // Teacher / Supervisor Signature
    doc.setFont('helvetica', 'bold');
    doc.line(125, signY, 190, signY);
    doc.text(user?.supervisorName?.toUpperCase() || 'OJT TEACHER / COORDINATOR', 157.5, signY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('Practicum Professor / Teacher In-Charge', 157.5, signY + 9, { align: 'center' });

    const safeName = (user?.fullName || 'Trainee').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `OJT_Journal_Logbook_${safeName}.pdf`;

    const blobUrl = doc.output('bloburl');
    setPreviewPdfUrl(blobUrl.toString());
    setPreviewPdfName(fileName);
  };

  // Feature 6: Milestone Summaries & Teacher Submissions
  const totalJournalHours = activities.reduce((acc, a) => acc + (a.hoursSpent || 0), 0);

  const handleOpenMilestone = async (hours: number) => {
    setSelectedMilestone(hours);
    setMilestoneModalOpen(true);
    setMilestoneLoading(true);
    setMilestoneCopied(false);
    setSubmitSuccessMessage(null);

    const existingSubmission = submittedMilestones.find((s) => s.milestoneHours === hours);
    if (existingSubmission) {
      setSubmitSuccessMessage(
        `Submitted to teacher on ${new Date(existingSubmission.submittedAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })}`
      );
      setMilestoneSummaryText(existingSubmission.summaryContent);
      setMilestoneLoading(false);
      return;
    }

    try {
      const res = await api.activities.getMilestoneSummary(hours);
      setMilestoneSummaryText(res.summaryContent);
    } catch (err: any) {
      setMilestoneSummaryText(
        `# ${hours}-Hour OJT Milestone Summary\n\n**Trainee:** ${user?.fullName || 'Student Trainee'}\n**Milestone:** ${hours} Hours Completed\n\n## 1. Executive Summary\nDuring this ${hours}-hour milestone, I completed assigned workplace duties and documented daily activities.\n\n## 2. Key Accomplishments\n- Logged and completed technical deliverables across ${activities.length} daily entries.\n\n## 3. Reflection\nDeveloped consistent work habits, learned how to solve practical challenges, and verified completed tasks step-by-step.`
      );
    } finally {
      setMilestoneLoading(false);
    }
  };

  const handleSubmitMilestone = async () => {
    if (!milestoneSummaryText) return;

    // Check if trainee has a teacher linked (non-blocking informative notification)
    const hasTeacher = Boolean(user?.supervisorId || setting?.managedBySupervisorName);
    if (!hasTeacher) {
      alert(
        "No teacher is linked yet! If your practicum professor provided a supervisor code, you can link it under Settings.\n\nYou can also copy or export your summary anytime — no teacher link is required."
      );
      return;
    }

    setSubmittingMilestone(true);
    try {
      await api.activities.submitMilestone(selectedMilestone, milestoneSummaryText);
      const updated = await api.activities.getSubmittedMilestones().catch(() => []);
      setSubmittedMilestones(updated);
      setSubmitSuccessMessage("Submitted to teacher for review!");
      setTimeout(() => setSubmitSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to submit milestone report to teacher.");
    } finally {
      setSubmittingMilestone(false);
    }
  };

  const handleCopyMilestone = async () => {
    if (!milestoneSummaryText) return;
    await navigator.clipboard.writeText(milestoneSummaryText);
    setMilestoneCopied(true);
    setTimeout(() => setMilestoneCopied(false), 2500);
  };

  const categories = [
    'Development',
    'Testing & QA',
    'Documentation',
    'Meetings & Planning',
    'Technical Support',
    'Design / UI',
    'General'
  ];

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0 mt-0.5">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 tracking-tight">
                <span>Daily Journal</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  {totalJournalHours.toFixed(1)} hrs logged
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xl leading-relaxed">
                Log daily tasks, accomplishments, and learnings. Use <span className="text-purple-300 font-semibold">AI Polish</span> to turn rough notes into natural human English for your journal & DTR logbook.
              </p>
            </div>
          </div>

          {/* Quick PDF Export Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportJournalPdf}
              disabled={activities.length === 0}
              className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Preview & Export Printable Journal Logbook PDF"
            >
              <FileText className="w-4 h-4 text-sky-400" />
              <span>Export Journal PDF</span>
            </button>
          </div>
        </div>

        {/* Feature 6: Dynamic Milestone Summaries Bar */}
        <div className="mt-4 pt-3.5 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Award className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Practicum Milestone Summaries ({setting?.targetTotalHours || 486}h Target):</span>
              <span className="text-[11px] text-slate-400 font-normal hidden md:inline">
                Synthesized from your journal entries
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {getDynamicMilestones(setting?.targetTotalHours || 486).map((m) => {
                const isReached = totalJournalHours >= m.hours;
                const isSubmitted = submittedMilestones.some((s) => s.milestoneHours === m.hours);
                return (
                  <button
                    key={m.hours}
                    type="button"
                    onClick={() => handleOpenMilestone(m.hours)}
                    className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 border ${
                      isSubmitted
                        ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : isReached
                        ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700/80'
                    }`}
                    title={
                      isSubmitted
                        ? `Submitted report for ${m.label}`
                        : `Generate ${m.label} narrative from your journal entries`
                    }
                  >
                    <span>{m.label}</span>
                    {isSubmitted ? (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-bold uppercase tracking-tight">
                        Submitted
                      </span>
                    ) : isReached ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-slate-500" />
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  const val = prompt('Enter custom milestone hours (e.g. 150):');
                  if (val) {
                    const num = parseInt(val, 10);
                    if (num > 0) {
                      handleOpenMilestone(num);
                    }
                  }
                }}
                className="min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/80 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                title="Generate narrative for any custom hour mark"
              >
                <Plus className="w-3 h-3" />
                <span>Custom Hour</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Entry Form */}
        <div ref={formRef} className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-lg h-fit">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              {editingId ? (
                <>
                  <Pencil className="w-4 h-4 text-amber-400" />
                  <span>Edit Journal Entry</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-sky-400" />
                  <span>New Journal Entry</span>
                </>
              )}
            </h3>

            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-3 sm:space-y-3.5 text-xs">
            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-slate-400 font-medium mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[42px] bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-[42px] bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Task Headline / Title</label>
              <input
                type="text"
                placeholder="e.g. Fixed customer login bug or tested API endpoints"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full min-h-[42px] bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-400 font-medium">Hours Spent</label>
                {/* Feature 1: Sync from Today's Shift */}
                {todayShiftHours !== null && todayShiftHours > 0 && (
                  <button
                    type="button"
                    onClick={handleSyncShift}
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer active:scale-95 ${
                      syncedJustNow
                        ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40'
                        : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border-sky-500/30'
                    }`}
                    title="Automatically fill today's clocked shift hours"
                  >
                    <Zap className="w-3 h-3 text-sky-400" />
                    <span>{syncedJustNow ? 'Synced!' : `Sync Shift (${todayShiftHours.toFixed(1)}h)`}</span>
                  </button>
                )}
              </div>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={hoursSpent}
                onChange={(e) => setHoursSpent(e.target.value)}
                className="w-full min-h-[42px] bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <label className="block text-slate-400 font-medium">Accomplishments & Learnings</label>

                <div className="flex items-center gap-1.5">
                  {/* Feature 5: Voice-to-Text Microphone Button */}
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={toggleVoiceRecording}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border shadow-sm active:scale-95 ${
                        isListening
                          ? 'bg-rose-600/30 text-rose-300 border-rose-500/50 animate-pulse'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                      title={isListening ? 'Click to stop voice recording' : 'Speak your tasks casually (Speak -> AI Polish)'}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-3.5 h-3.5 text-rose-400" />
                          <span>Listening...</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5 text-sky-400" />
                          <span>Voice Note</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* AI Polish Button */}
                  <button
                    type="button"
                    onClick={handlePolishWithAi}
                    disabled={polishing || (!taskTitle.trim() && !details.trim())}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-95 ${
                      polishedJustNow
                        ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                        : 'bg-gradient-to-r from-purple-600/30 via-indigo-600/30 to-sky-600/30 hover:from-purple-600/45 hover:to-sky-600/45 border border-purple-500/40 text-purple-200 hover:text-white'
                    }`}
                    title="Make rough draft notes sound natural, clear, and human for your journal"
                  >
                    {polishing ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                        <span>Polishing...</span>
                      </>
                    ) : polishedJustNow ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Polished!</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>AI Polish</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <textarea
                rows={3}
                placeholder="Describe what you worked on, tools used, or what you learned (or speak via Voice Note and click 'AI Polish')..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className={`w-full bg-slate-800 border rounded-xl p-3 text-slate-100 placeholder-slate-500 focus:outline-none leading-relaxed transition-all ${
                  polishedJustNow ? 'border-purple-500/80 ring-1 ring-purple-500/40' : 'border-slate-700 focus:border-sky-500'
                }`}
              />

              {polishedJustNow && (
                <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 animate-fade-in font-medium">
                  <Check className="w-3 h-3 text-emerald-400" />
                  Polished into natural, human English suitable for your OJT journal.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 ${
                editingId
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-sky-600 hover:bg-sky-500'
              }`}
            >
              {submitting ? 'Saving...' : editingId ? 'Update Journal Entry' : 'Save Journal Entry'}
            </button>
          </form>
        </div>

        {/* Journal Entries Feed */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
            <span>Recorded Journal Entries ({activities.length})</span>
            {editingId && (
              <span className="text-amber-400 text-[11px] font-bold flex items-center gap-1">
                <Pencil className="w-3 h-3" />
                Editing in progress
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl">
              <Clock className="w-6 h-6 animate-spin mx-auto text-sky-400 mb-2" />
              Loading journal entries...
            </div>
          ) : activities.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl">
              <BookOpen className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              No journal entries logged yet. Record your first task using the form.
            </div>
          ) : (
            activities.map((act) => {
              const isBeingEdited = editingId === act.id;
              return (
                <div
                  key={act.id}
                  className={`border rounded-2xl p-4 shadow-sm transition-all flex flex-col justify-between gap-3 ${
                    isBeingEdited
                      ? 'bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
                          <Tag className="w-3 h-3" />
                          {act.category}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
                          <Calendar className="w-3.5 h-3.5" />
                          {act.date}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Feature 2: Edit Button */}
                        <button
                          onClick={() => handleStartEdit(act)}
                          className="min-h-[34px] min-w-[34px] p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                          title="Edit journal entry"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(act.id)}
                          className="min-h-[34px] min-w-[34px] p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                          title="Delete journal entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-white break-words">{act.taskTitle}</h4>
                    {act.details && (
                      <p className="text-xs text-slate-300 mt-1.5 whitespace-pre-wrap leading-relaxed break-words">
                        {act.details}
                      </p>
                    )}
                  </div>

                  {act.hoursSpent && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 font-medium border-t border-slate-800/80 pt-2">
                      <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{act.hoursSpent.toFixed(1)} hours rendered</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Feature 6: Milestone Summary Modal */}
      {milestoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[85vh] space-y-4">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedMilestone}-Hour OJT Milestone Summary
                  </h3>
                  <p className="text-xs text-slate-400">
                    Synthesized from your daily journal entries for teacher review
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMilestoneModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto pr-1">
              {submitSuccessMessage && (
                <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-3.5 py-2 text-xs text-emerald-300 flex items-center gap-2 mb-3">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">{submitSuccessMessage}</span>
                </div>
              )}
              {milestoneLoading ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Sparkles className="w-7 h-7 animate-spin mx-auto text-amber-400" />
                  <p className="text-xs font-semibold">Synthesizing {selectedMilestone}-Hour milestone narrative...</p>
                </div>
              ) : (
                <textarea
                  readOnly
                  rows={14}
                  value={milestoneSummaryText}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-xs sm:text-sm font-mono text-slate-200 leading-relaxed focus:outline-none whitespace-pre-wrap resize-none"
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-3 flex-wrap gap-2">
              <span className="text-[11px] text-slate-400">
                Total Rendered: {totalJournalHours.toFixed(1)} hrs
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopyMilestone}
                  disabled={milestoneLoading || !milestoneSummaryText}
                  className="min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer disabled:opacity-40"
                >
                  {milestoneCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{milestoneCopied ? 'Copied!' : 'Copy Summary'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSubmitMilestone}
                  disabled={milestoneLoading || !milestoneSummaryText || submittingMilestone}
                  className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border cursor-pointer disabled:opacity-40 active:scale-95 ${
                    submittedMilestones.some((s) => s.milestoneHours === selectedMilestone)
                      ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-sm'
                  }`}
                  title="Submit internship activity report to your teacher"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {submittingMilestone
                      ? 'Submitting...'
                      : submittedMilestones.some((s) => s.milestoneHours === selectedMilestone)
                      ? 'Resubmit to Teacher'
                      : 'Submit to Teacher'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMilestoneModalOpen(false)}
                  className="min-h-[36px] px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold transition-all border border-slate-700 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feature 3: Journal PDF Preview Modal */}
      <PdfPreviewModal
        isOpen={!!previewPdfUrl}
        pdfUrl={previewPdfUrl}
        fileName={previewPdfName}
        title="OJT Daily Journal & Logbook Preview"
        subtitle="Official accomplishment logbook for university & teacher submission"
        onClose={() => setPreviewPdfUrl(null)}
      />
    </div>
  );
};
