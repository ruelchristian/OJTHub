import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';
import { WorkplaceMapPicker } from './WorkplaceMapPicker';
import { Settings, MapPin, Target, Check, Save, ChevronDown, ChevronUp, Layers } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const geo = useGeolocation();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [showAdvancedCoords, setShowAdvancedCoords] = useState<boolean>(false);

  const [companyName, setCompanyName] = useState<string>('Host Training Establishment');
  const [lat, setLat] = useState<number>(14.599512);
  const [lng, setLng] = useState<number>(120.984222);
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
        setLat(s.workplaceLatitude);
        setLng(s.workplaceLongitude);
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
      setLat(geo.latitude);
      setLng(geo.longitude);
    } else {
      alert('Current location not yet acquired. Please verify location permissions.');
    }
  };

  const handleMapLocationChange = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
        
        {/* Establishment & Interactive Visual Map Picker */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-400" />
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
                placeholder="e.g. Acme Corp Philippines / IT Department"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-medium"
                required
              />
            </div>

            {/* Interactive Visual Map */}
            <div>
              <label className="block text-slate-400 font-medium text-xs mb-1.5 flex items-center justify-between">
                <span>Pinpoint Workplace on Map</span>
                <span className="text-[11px] text-slate-400">Search address, click map, or drag the blue pin</span>
              </label>
              <WorkplaceMapPicker
                latitude={lat}
                longitude={lng}
                radiusMeters={radius}
                deviceLatitude={geo.latitude}
                deviceLongitude={geo.longitude}
                onChange={handleMapLocationChange}
                onUseCurrentLocation={handleUseCurrentLocation}
                height="380px"
              />
            </div>

            {/* Radius and Accuracy Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-2">
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
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">
                  Trainees within this circular boundary are verified as present at the host establishment.
                </p>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 font-medium">
                    GPS Accuracy Gate: <span className="text-emerald-400 font-bold">&le; {accuracyLimit}m</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Max GPS error</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={accuracyLimit}
                  onChange={(e) => setAccuracyLimit(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">
                  Weak device signals with accuracy worse than {accuracyLimit}m will be prompted to calibrate before punch in.
                </p>
              </div>
            </div>

            {/* Expandable Advanced Coordinates */}
            <div className="pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setShowAdvancedCoords(!showAdvancedCoords)}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Advanced Coordinates & Raw Values</span>
                {showAdvancedCoords ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showAdvancedCoords && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-800/60 text-xs animate-fade-in">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Workplace Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={lat}
                      onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Workplace Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={lng}
                      onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                </div>
              )}
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
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold animate-fade-in">
              <Check className="w-4 h-4" /> Configuration saved successfully!
            </span>
          )}
          <button
            type="submit"
            disabled={saving || loading}
            className="px-6 py-2.5 rounded-xl font-bold text-xs bg-sky-600 hover:bg-sky-500 text-white shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};
