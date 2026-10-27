import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { ActivityLog } from '../types';
import { BookOpen, Plus, Trash2, Calendar, Clock, Tag, Sparkles, Check } from 'lucide-react';

export const JournalView: React.FC = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form State
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [hoursSpent, setHoursSpent] = useState<string>('2.0');
  const [category, setCategory] = useState<string>('Development');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [polishing, setPolishing] = useState<boolean>(false);
  const [polishedJustNow, setPolishedJustNow] = useState<boolean>(false);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const data = await api.activities.list();
      setActivities(data);
    } catch (err) {
      console.error('Failed to load journal activities', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      setFormError('Please enter a task title.');
      return;
    }

    setFormError(null);
    setSubmitting(true);
    try {
      await api.activities.create({
        date,
        taskTitle: taskTitle.trim(),
        details: details.trim(),
        hoursSpent: hoursSpent ? parseFloat(hoursSpent) : undefined,
        category
      });
      setTaskTitle('');
      setDetails('');
      await loadActivities();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save journal entry.');
    } finally {
      setSubmitting(false);
    }
  };

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
    } catch (err) {
      console.error('Failed to delete journal entry', err);
    }
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
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0 mt-0.5">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 tracking-tight">
              <span>Daily Journal</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 max-w-xl leading-relaxed">
              Record your daily tasks and accomplishments. Click <span className="text-purple-300 font-semibold">AI Polish</span> to turn rough notes into clear, natural English for your journal and DTR logbook.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Entry Form */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-lg h-fit">
          <h3 className="text-sm font-bold text-slate-200 mb-3.5 flex items-center gap-2">
            <Plus className="w-4 h-4 text-sky-400" />
            <span>New Journal Entry</span>
          </h3>

          <form onSubmit={handleCreate} className="space-y-3 sm:space-y-3.5 text-xs">
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
              <label className="block text-slate-400 font-medium mb-1">Hours Spent</label>
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-slate-400 font-medium">Accomplishments & Learnings</label>
                <button
                  type="button"
                  onClick={handlePolishWithAi}
                  disabled={polishing || (!taskTitle.trim() && !details.trim())}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-95 ${
                    polishedJustNow
                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                      : 'bg-gradient-to-r from-purple-600/30 via-indigo-600/30 to-sky-600/30 hover:from-purple-600/45 hover:to-sky-600/45 border border-purple-500/40 text-purple-200 hover:text-white'
                  }`}
                  title="Make rough notes sound natural, clear, and human for your journal"
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

              <textarea
                rows={3}
                placeholder="Describe what you worked on, tools used, or what you learned (type rough notes and click 'AI Polish')..."
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
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-sm bg-sky-600 hover:bg-sky-500 active:scale-95 text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Journal Entry'}
            </button>
          </form>
        </div>

        {/* Journal Entries Feed */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
            <span>Recorded Journal Entries ({activities.length})</span>
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
            activities.map((act) => (
              <div
                key={act.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-colors flex flex-col justify-between gap-3"
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

                    <button
                      onClick={() => handleDelete(act.id)}
                      className="min-h-[36px] min-w-[36px] p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-xl transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                      title="Delete journal entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                    <span>{act.hoursSpent} hours devoted</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
