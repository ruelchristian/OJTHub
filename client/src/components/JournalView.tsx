import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ActivityLogger } from './ActivityLogger';
import { AiReporting } from './AiReporting';
import { BookOpen, CheckSquare, Sparkles } from 'lucide-react';

interface JournalViewProps {
  defaultTab?: 'tasks' | 'reports';
}

export const JournalView: React.FC<JournalViewProps> = ({ defaultTab = 'tasks' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'tasks' | 'reports'>(
    urlTab === 'reports' ? 'reports' : defaultTab
  );

  // Sync state if URL changes externally
  useEffect(() => {
    if (urlTab === 'reports' || urlTab === 'tasks') {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (tab: 'tasks' | 'reports') => {
    setActiveTab(tab);
    setSearchParams(tab === 'reports' ? { tab: 'reports' } : {});
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      {/* Unified Header Banner with Sub-Tab Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0 mt-0.5">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 tracking-tight">
                <span>OJT Journal & AI Reports</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xl leading-relaxed">
                Log your daily internship tasks, polish your accomplishments with human-friendly AI, and generate clear EOD standup summaries.
              </p>
            </div>
          </div>

          {/* Sub-Tab Segmented Switcher */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-2xl border border-slate-800/90 self-stretch md:self-auto shrink-0 shadow-inner">
            <button
              type="button"
              onClick={() => handleTabChange('tasks')}
              className={`flex-1 md:flex-initial min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Daily Tasks</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('reports')}
              className={`flex-1 md:flex-initial min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Reports</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-view Content */}
      {activeTab === 'tasks' ? (
        <ActivityLogger
          hideBanner
          onSwitchToReports={() => handleTabChange('reports')}
        />
      ) : (
        <AiReporting
          hideBanner
          onSwitchToTasks={() => handleTabChange('tasks')}
        />
      )}
    </div>
  );
};
