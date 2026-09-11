import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';
import { Settings, MapPin, Target, Check, Save } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const geo = useGeolocation();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const [companyName, setCompanyName] = useState<string>('Host Training Establishment');
  const [lat, setLat] = useState<string>('14.599512');
  const [lng, setLng] = useState<string>('120.984222');
  const [radius, setRadius] = useState<number>(100);
  const [accuracyLimit, setAccuracyLimit] = useState<number>(50);
  const [targetHours, setTargetHours] = useState<string>('486.0');
  const [dailyHours, setDailyHours] = useState<string>('8.0');
  const [lunchMins, setLunchMins] = useState<number>(60);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const s = await api.settings.get();
        setCompanyName(s.companyName);
        setLat(s.workplaceLatitude.toString());
        setLng(s.workplaceLongitude.toString());
        setRadius(s.geofenceRadiusMeters);
        setAccuracyLimit(s.gpsAccuracyThreshold);
        setTargetHours(s.targetTotalHours.toString());
        setDailyHours(s.dailyScheduleHours.toString());
        setLunchMins(s.defaultLunchMinutes);
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleUseCurrentLocation = () => {
    if (geo.latitude !== null && geo.longitude !== null) {
      setLat(geo.latitude.toFixed(6));
      setLng(geo.longitude.toFixed(6));
    } else {
      alert('Current location not yet acquired. Please verify location permissions.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await api.settings.update({
        companyName,
        workplaceLatitude: parseFloat(lat),
        workplaceLongitude: parseFloat(lng),
        geofenceRadiusMeters: radius,
        gpsAccuracyThreshold: accuracyLimit,
        targetTotalHours: parseFloat(targetHours),
        dailyScheduleHours: parseFloat(dailyHours),
        defaultLunchMinutes: lunchMins
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-sky-400" />
          OJT & Geofence Configuration
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure your physical workplace coordinates, perimeter radius, and internship hourly goals.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Establishment & Geofence Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <MapPin className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-slate-200">Workplace Geofence Settings</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block text-slate-400 font-medium mb-1">Company / Establishment Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Workplace Latitude</label>
              <input
                type="number"
                step="0.000001"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Workplace Longitude</label>
              <input
                type="number"
                step="0.000001"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={geo.loading}
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-400 text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                {geo.loading ? 'Detecting device coordinates...' : 'Use My Current Device Location'}
              </button>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Geofence Radius: <span className="text-sky-400 font-bold">{radius} meters</span>
              </label>
              <input
                type="range"
                min={30}
                max={500}
                step={10}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full accent-sky-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Trainees within this radius are verified as inside the training perimeter.
              </p>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Max Allowed GPS Accuracy: <span className="text-sky-400 font-bold">{accuracyLimit} meters</span>
              </label>
              <input
                type="range"
                min={20}
                max={150}
                step={5}
                value={accuracyLimit}
                onChange={(e) => setAccuracyLimit(Number(e.target.value))}
                className="w-full accent-sky-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Rejects readings if satellite precision error is greater than this threshold.
              </p>
            </div>
          </div>
        </div>

        {/* Training Hours & Schedule Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Target className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-200">Training Hours & Schedule</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Total Target OJT Hours</label>
              <input
                type="number"
                step="1"
                value={targetHours}
                onChange={(e) => setTargetHours(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500 font-bold"
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
                onChange={(e) => setDailyHours(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
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
                onChange={(e) => setLunchMins(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                required
              />
              <span className="text-[10px] text-slate-400 mt-0.5">Deducted for shifts &gt; 4 hours</span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          {savedSuccess && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
              <Check className="w-4 h-4" /> Settings updated successfully!
            </span>
          )}
          <button
            type="submit"
            disabled={saving || loading}
            className="px-6 py-2.5 rounded-xl font-bold text-xs bg-sky-600 hover:bg-sky-500 text-white shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};
