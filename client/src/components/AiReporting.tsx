import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { GeneratedReport } from '../types';
import { Sparkles, Copy, Check, Save, FileText, Send } from 'lucide-react';

export const AiReporting: React.FC = () => {
  const [reportType, setReportType] = useState<string>('EOD_Standup');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customNotes, setCustomNotes] = useState<string>('');
  
  const [generating, setGenerating] = useState<boolean>(false);
  const [draftContent, setDraftContent] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const [savedReports, setSavedReports] = useState<GeneratedReport[]>([]);

  const loadSavedReports = async () => {
    try {
      const data = await api.reports.list();
      setSavedReports(data);
    } catch (err) {
      console.error('Failed to load saved reports', err);
    }
  };

  useEffect(() => {
    loadSavedReports();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setSavedSuccess(false);
    try {
      const res = await api.reports.generateAi({
        reportType,
        startDate,
        endDate,
        customNotes
      });
      setDraftContent(res.draftContent);
    } catch (err: any) {
      alert(err.message || 'Failed to generate AI report.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyMarkdown = async () => {
    if (!draftContent) return;
    await navigator.clipboard.writeText(draftContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopySlack = async () => {
    if (!draftContent) return;
    // Format headers into bold bullet points for team chat
    const slackFormatted = draftContent
      .replace(/^# (.*$)/gim, '*$1*')
      .replace(/^## (.*$)/gim, '*$1*')
      .replace(/^### (.*$)/gim, '*$1*');
    await navigator.clipboard.writeText(slackFormatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveReport = async () => {
    if (!draftContent) return;
    setSaving(true);
    try {
      await api.reports.save({
        reportType,
        startDate,
        endDate,
        finalContent: draftContent
      });
      setSavedSuccess(true);
      await loadSavedReports();
    } catch (err: any) {
      alert(err.message || 'Failed to save report.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          AI-Assisted Reporting (Google Gemini)
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Transform your raw daily activity logs into structured End-of-Day (EOD) standup reports or reflective journal narratives.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Controls Card */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg h-fit space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-200">Report Parameters</h3>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Report Format</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReportType('EOD_Standup')}
                className={`py-2 px-3 rounded-xl font-medium border text-center transition-all ${
                  reportType === 'EOD_Standup'
                    ? 'bg-sky-600/20 text-sky-300 border-sky-500/50'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                Daily Standup (EOD)
              </button>
              <button
                type="button"
                onClick={() => setReportType('Journal_Narrative')}
                className={`py-2 px-3 rounded-xl font-medium border text-center transition-all ${
                  reportType === 'Journal_Narrative'
                    ? 'bg-sky-600/20 text-sky-300 border-sky-500/50'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                Journal Narrative
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">
              Additional Context / Blockers (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Encountered network issue during deployment, resolved with supervisor..."
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-3 px-4 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Drafting with Gemini...' : 'Generate Draft with AI'}
          </button>
        </div>

        {/* Review & Edit Workspace */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-200">
                  Human Review & Editing Workspace
                </h3>
                <p className="text-[11px] text-slate-400">
                  Review and customize the AI-generated draft before exporting or submitting.
                </p>
              </div>

              {/* Action Buttons */}
              {draftContent && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyMarkdown}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                    title="Copy Markdown"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Markdown'}
                  </button>

                  <button
                    onClick={handleCopySlack}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                    title="Copy formatted for Slack/Discord"
                  >
                    <Send className="w-3.5 h-3.5 text-sky-400" />
                    Slack/Discord
                  </button>

                  <button
                    onClick={handleSaveReport}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Saving...' : savedSuccess ? 'Saved!' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            {/* Editable Draft Area */}
            <textarea
              rows={14}
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder="Click 'Generate Draft with AI' to aggregate your recorded activities into an editable draft report..."
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-slate-200 text-xs font-mono leading-relaxed focus:outline-none focus:border-sky-500 whitespace-pre-wrap resize-y"
            />
          </div>

          {/* Saved Reports Mini-History */}
          {savedReports.length > 0 && (
            <div className="border-t border-slate-800 pt-4">
              <h4 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Previously Saved Reports ({savedReports.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {savedReports.slice(0, 4).map((sr) => (
                  <div
                    key={sr.id}
                    onClick={() => setDraftContent(sr.editedContent || sr.aiGeneratedContent)}
                    className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-200">
                      <span>{sr.reportType === 'Journal_Narrative' ? 'Journal Narrative' : 'Daily Standup'}</span>
                      <span className="text-[10px] text-slate-400">{new Date(sr.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">
                      Range: {sr.startDate} to {sr.endDate}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
