import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { WorkplaceMapPicker } from './WorkplaceMapPicker';
import { Settings, MapPin, Target, Check, Save, ChevronDown, ChevronUp, Layers, ShieldAlert, Link as LinkIcon, Unlink, Lock } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { user, isGuest, refreshUser } = useAuth();
  const geo = useGeolocation();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [showAdvancedCoords, setShowAdvancedCoords] = useState<boolean>(false);

  const [companyName, setCompanyName] = useState<string>('Host Training Establishment');
  const [lat, setLat] = useState<number>(14.599512);
  const [lng, setLng] = useState<number>(120.984222);
  const [radius, setRadius] = useState<number>(100);
  const [accuracyLimit, setAccuracyLimit] = useState<number>(150);
  const [targetHours, setTargetHours] = useState<string>('486.0');
  const [dailyHours, setDailyHours] = useState<string>('8.0');
  const [lunchMins, setLunchMins] = useState<number>(60);

  // Supervisor Governance state
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [supervisorName, setSupervisorName] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [linking, setLinking] = useState<boolean>(false);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const s = await api.settings.get();
      setCompanyName(s.companyName);
      setLat(s.workplaceLatitude);
      setLng(s.workplaceLongitude);
      setRadius(s.geofenceRadiusMeters);
      setAccuracyLimit(s.gpsAccuracyThreshold);
      setTargetHours(s.targetTotalHours.toString());
      setDailyHours(s.dailyScheduleHours.toString());
      setLunchMins(s.defaultLunchMinutes);
      setIsLocked(Boolean(s.isLocked || (user && user.role === 'Trainee' && user.supervisorId)));
      setSupervisorName(s.managedBySupervisorName || user?.supervisorName || null);
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [user]);

  const handleUseCurrentLocation = () => {
    if (isLocked) return;
    if (geo.latitude !== null && geo.longitude !== null) {
      setLat(geo.latitude);
      setLng(geo.longitude);
    } else {
      alert('Current location not yet acquired. Please verify location permissions.');
    }
  };

  const handleMapLocationChange = (newLat: number, newLng: number) => {
    if (isLocked) return;
    setLat(newLat);
    setLng(newLng);
  };

  const handleLinkSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setLinking(true);
    setLinkMessage(null);
    try {
      const res = await api.supervisor.linkCode(inviteCode.trim());
      setLinkMessage(res.message);
      setInviteCode('');
      await refreshUser();
      await loadSettings();
    } catch (err: any) {
      alert(err.message || 'Failed to link supervisor.');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkSupervisor = async () => {
    if (!confirm('Are you sure you want to unlink from your supervisor? Your settings will become editable again.')) {
      return;
    }
    try {
      await api.supervisor.unlink();
      await refreshUser();
      await loadSettings();
      alert('Successfully unlinked from supervisor.');
    } catch (err: any) {
      alert(err.message || 'Failed to unlink from supervisor.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      alert('Settings are locked by your supervisor.');
      return;
    }
    setSaving(true);
    setSavedSuccess(false);
    try {
      await api.settings.update({
        companyName,
        workplaceLatitude: lat,
        workplaceLongitude: lng,
        geofenceRadiusMeters: radius,
        gpsAccuracyThreshold: accuracyLimit,
        targetTotalHours: parseFloat(targetHours),
        dailyScheduleHours: parseFloat(dailyHours),
        defaultLunchMinutes: lunchMins
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-lg">
        <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 tracking-tight">
          <Settings className="w-5 h-5 text-sky-400 shrink-0" />
          <span>OJT & Geofence Configuration</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure your physical workplace coordinates, perimeter radius, and internship hourly goals.
        </p>
      </div>

      {/* Supervisor Governance Lock Banner (When assigned) */}
      {isLocked && (
        <div className="bg-amber-950/40 border border-amber-800/60 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-amber-200 animate-fade-in shadow-md">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <span>Settings Locked & Governed by Supervisor</span>
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full font-bold">
                  Read Only
                </span>
              </h4>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                Your assigned company workplace coordinates, geofence radius, and required total hours are officially governed by: <strong className="text-white font-semibold">{supervisorName || 'Assigned Supervisor'}</strong>.
              </p>
              <p className="text-[11px] text-amber-300/70">
                Trainees cannot alter coordinates or hours while assigned to a supervisor. Contact your supervisor to adjust these parameters.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUnlinkSupervisor}
            className="self-start sm:self-center px-3.5 py-1.5 rounded-xl border border-amber-700/60 text-amber-300 hover:bg-amber-900/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            title="Unlink from supervisor"
          >
            <Unlink className="w-3.5 h-3.5" />
            <span>Unlink Supervisor</span>
          </button>
        </div>
      )}

      {/* Trainee Invite Code Link Section (When NOT assigned & logged in) */}
      {!isLocked && user && user.role === 'Trainee' && !isGuest && (
        <div className="bg-slate-900 border border-sky-800/50 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-slate-100">Connect to Your Supervisor / Coordinator</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Have an invite code from your company supervisor or academic coordinator? Enter their 6-character code (e.g., <code className="text-sky-300 font-mono font-bold bg-slate-800 px-1.5 py-0.5 rounded">OJT-XXXX</code>) to link your timesheet directly to their verification portal.
          </p>
          <form onSubmit={handleLinkSupervisor} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g. OJT-89AB"
              className="bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-sky-300 tracking-wider uppercase focus:outline-none focus:border-sky-500 w-full sm:w-64"
              maxLength={15}
            />
            <button
              type="submit"
              disabled={linking || !inviteCode.trim()}
              className="bg-sky-600 hover:bg-sky-500 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 min-h-[38px]"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>{linking ? 'Linking...' : 'Connect to Supervisor'}</span>
            </button>
          </form>
          {linkMessage && (
            <p className="text-xs text-emerald-400 font-medium animate-fade-in flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> {linkMessage}
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 sm:space-y-6">
        
        {/* Establishment & Interactive Visual Map Picker */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg space-y-4">
          <div className="flex flex-col xs:flex-row xs:items-center justify-between border-b border-slate-800 pb-3 gap-1">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
              <h3 className="text-sm font-bold text-slate-200">Interactive Workplace Map Picker</h3>
            </div>
            <span className="text-[11px] text-slate-400">
              Perimeter: <strong className="text-sky-400">{radius} meters</strong>
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 font-medium text-xs mb-1">Company / Establishment Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={isLocked}
                placeholder="e.g. Acme Corp Philippines / IT Department"
                className={`w-full min-h-[42px] bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-medium ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                required
              />
            </div>

            {/* Interactive Visual Map */}
            <div>
              <label className="block text-slate-400 font-medium text-xs mb-1.5 flex flex-col xs:flex-row xs:items-center justify-between gap-0.5">
                <span>Pinpoint Workplace on Map</span>
                <span className="text-[10px] sm:text-[11px] text-slate-400">
                  {isLocked ? '📍 Location locked by supervisor' : 'Search address, click map, or drag the pin'}
                </span>
              </label>
              <div className={isLocked ? 'pointer-events-none opacity-80' : ''}>
                <WorkplaceMapPicker
                  latitude={lat}
                  longitude={lng}
                  radiusMeters={radius}
                  deviceLatitude={geo.latitude}
                  deviceLongitude={geo.longitude}
                  onChange={handleMapLocationChange}
                  onUseCurrentLocation={handleUseCurrentLocation}
                  height="320px"
                />
              </div>
            </div>

            {/* Radius and Accuracy Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2 text-xs">
              <div className="bg-slate-800/60 p-3.5 sm:p-4 rounded-xl border border-slate-700/60 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 font-medium">
                    Geofence Radius: <span className="text-sky-400 font-bold">{radius}m</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Allowed range</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={500}
                  step={10}
                  value={radius}
                  disabled={isLocked}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className={`w-full h-6 accent-sky-500 ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                />
                <p className="text-[11px] text-slate-400">
                  Trainees within this circular boundary are verified as present at the host establishment.
                </p>
              </div>

              <div className="bg-slate-800/60 p-3.5 sm:p-4 rounded-xl border border-slate-700/60 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 font-medium">
                    GPS Accuracy Gate: <span className="text-emerald-400 font-bold">&le; {accuracyLimit}m</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Max GPS error</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={300}
                  step={10}
                  value={accuracyLimit}
                  disabled={isLocked}
                  onChange={(e) => setAccuracyLimit(Number(e.target.value))}
                  className={`w-full h-6 accent-emerald-500 ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                />
                <p className="text-[11px] text-slate-400">
                  Signals with accuracy worse than {accuracyLimit}m will be rejected. (Tip: Use 50m for outdoor mobile GPS, 150m for indoor Wi-Fi / desktop testing).
                </p>
              </div>
            </div>

            {/* Expandable Advanced Coordinates */}
            <div className="pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setShowAdvancedCoords(!showAdvancedCoords)}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer py-1"
              >
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Advanced Coordinates & Raw Values</span>
                {showAdvancedCoords ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showAdvancedCoords && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 pt-3 border-t border-slate-800/60 text-xs animate-fade-in">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Workplace Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={lat}
                      disabled={isLocked}
                      onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                      className={`w-full min-h-[42px] bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500 font-mono ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Workplace Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={lng}
                      disabled={isLocked}
                      onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                      className={`w-full min-h-[42px] bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500 font-mono ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Training Hours & Schedule Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Target className="w-4 h-4 text-emerald-400 shrink-0" />
            <h3 className="text-sm font-bold text-slate-200">Training Hours & Schedule</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Total Target OJT Hours</label>
              <input
                type="number"
                step="1"
                value={targetHours}
                disabled={isLocked}
                onChange={(e) => setTargetHours(e.target.value)}
                className={`w-full min-h-[42px] bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500 font-bold ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                required
              />
              <span className="text-[10px] text-slate-400 mt-0.5">e.g., 300, 486, or 600 hours</span>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Daily Schedule Hours</label>
              <input
                type="number"
                step="0.5"
                value={dailyHours}
                disabled={isLocked}
                onChange={(e) => setDailyHours(e.target.value)}
                className={`w-full min-h-[42px] bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500 ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                required
              />
              <span className="text-[10px] text-slate-400 mt-0.5">Standard shift length (e.g. 8.0 hrs)</span>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Auto Lunch Deduction (mins)</label>
              <input
                type="number"
                step="15"
                value={lunchMins}
                disabled={isLocked}
                onChange={(e) => setLunchMins(Number(e.target.value))}
                className={`w-full min-h-[42px] bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500 ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                required
              />
              <span className="text-[10px] text-slate-400 mt-0.5">Deducted for shifts &gt; 4 hours</span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-1">
          {savedSuccess && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold animate-fade-in">
              <Check className="w-4 h-4" /> Configuration saved successfully!
            </span>
          )}
          {isLocked ? (
            <div className="flex items-center gap-2 text-xs text-amber-300 font-medium px-4 py-2.5 rounded-xl bg-amber-950/40 border border-amber-800/40">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Settings Locked by Supervisor</span>
            </div>
          ) : (
            <button
              type="submit"
              disabled={saving || loading}
              className="w-full sm:w-auto min-h-[46px] px-6 py-2.5 rounded-xl font-bold text-xs bg-sky-600 hover:bg-sky-500 active:scale-95 text-white shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
