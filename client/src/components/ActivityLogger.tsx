import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { ActivityLog } from '../types';
import { CheckSquare, Plus, Trash2, Calendar, Clock, Tag } from 'lucide-react';

export const ActivityLogger: React.FC = () => {
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

  const loadActivities = async () => {
    setLoading(true);
    try {
      const data = await api.activities.list();
      setActivities(data);
    } catch (err) {
      console.error('Failed to load activities', err);
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
        taskTitle,
        details,
        hoursSpent: hoursSpent ? parseFloat(hoursSpent) : undefined,
        category
      });
      setTaskTitle('');
      setDetails('');
      await loadActivities();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save activity.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this activity log?')) return;
    try {
      await api.activities.delete(id);
      setActivities(activities.filter(a => a.id !== id));
    } catch (err) {
      console.error('Failed to delete activity', err);
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
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-sky-400" />
          Daily Activity Logbook
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Record your daily tasks, learning notes, and accomplishments. These logs power your AI EOD reports and DTR journals.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Activity Entry Form */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg h-fit">
          <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-sky-400" />
            New Activity Entry
          </h3>

          <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
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
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
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
                placeholder="e.g. Implemented Geofenced Punch Clock API"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
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
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Task Details & Accomplishments</label>
              <textarea
                rows={4}
                placeholder="Describe key actions taken, tools used, and technical learnings..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-md transition-all flex items-center justify-center gap-2"
            >
              {submitting ? 'Saving...' : 'Save Activity Entry'}
            </button>
          </form>
        </div>

        {/* Activity Logs Feed */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
            <span>Recorded Activities ({activities.length})</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm bg-slate-900 border border-slate-800 rounded-2xl">
              Loading activities...
            </div>
          ) : activities.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm bg-slate-900 border border-slate-800 rounded-2xl">
              <CheckSquare className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              No activities logged yet. Record your first task using the form.
            </div>
          ) : (
            activities.map((act) => (
              <div
                key={act.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-colors flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        <Tag className="w-3 h-3" />
                        {act.category}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {act.date}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDelete(act.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      title="Delete activity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h4 className="text-sm font-bold text-white">{act.taskTitle}</h4>
                  {act.details && (
                    <p className="text-xs text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed">
                      {act.details}
                    </p>
                  )}
                </div>

                {act.hoursSpent && (
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 font-medium border-t border-slate-800/80 pt-2">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    {act.hoursSpent} hours devoted
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
