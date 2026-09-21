import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Search, MapPin, Loader2, Compass } from 'lucide-react';

interface WorkplaceMapPickerProps {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  deviceLatitude?: number | null;
  deviceLongitude?: number | null;
  onChange: (lat: number, lng: number) => void;
  onUseCurrentLocation?: () => void;
  height?: string;
  readOnly?: boolean;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

// Custom Workplace Pin HTML Icon
const workplaceIcon = L.divIcon({
  className: 'custom-workplace-marker',
  html: `
    <div style="
      position: relative;
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
      cursor: grab;
    ">
      <div style="
        background: linear-gradient(135deg, #0284c7, #0ea5e9);
        width: 34px;
        height: 34px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg style="transform: rotate(45deg); width: 18px; height: 18px; color: white;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 36],
  popupAnchor: [0, -36]
});

// Device Location Pulsing Radar Icon
const deviceIcon = L.divIcon({
  className: 'custom-device-marker',
  html: `
    <div style="
      position: relative;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        position: absolute;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: rgba(16, 185, 129, 0.4);
        animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
      <div style="
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #10b981;
        border: 2px solid #ffffff;
        box-shadow: 0 0 8px rgba(16, 185, 129, 0.8);
      "></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

export const WorkplaceMapPicker: React.FC<WorkplaceMapPickerProps> = ({
  latitude,
  longitude,
  radiusMeters,
  deviceLatitude,
  deviceLongitude,
  onChange,
  onUseCurrentLocation,
  height = '340px',
  readOnly = false
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const deviceMarkerRef = useRef<L.Marker | null>(null);

  // Address search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);

  // Reverse geocoding to show readable address
  const fetchAddress = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      if (res.ok) {
        const data = await res.json();
        setResolvedAddress(data.display_name || null);
      }
    } catch {
      // ignore network failure
    }
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 16,
        zoomControl: false,
        attributionControl: false
      });

      // Zoom control at topright so it doesn't collide with the top-left legend
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Modern clean CartoDB Voyager tiles (crisp & high performance)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      // Attribution
      L.control.attribution({ position: 'bottomright' })
        .addAttribution('&copy; <a href="https://carto.com/">CARTO</a>, &copy; <a href="https://openstreetmap.org">OSM</a>')
        .addTo(map);

      // Geofence Circle
      const circle = L.circle([latitude, longitude], {
        radius: radiusMeters,
        color: '#0284c7',
        weight: 2,
        fillColor: '#38bdf8',
        fillOpacity: 0.22,
        dashArray: '4, 6'
      }).addTo(map);
      circleRef.current = circle;

      // Workplace Marker
      const marker = L.marker([latitude, longitude], {
        icon: workplaceIcon,
        draggable: !readOnly
      }).addTo(map);
      markerRef.current = marker;

      if (!readOnly) {
        // Drag end event
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onChange(pos.lat, pos.lng);
          circle.setLatLng(pos);
          fetchAddress(pos.lat, pos.lng);
        });

        // Map click event
        map.on('click', (e: L.LeafletMouseEvent) => {
          marker.setLatLng(e.latlng);
          circle.setLatLng(e.latlng);
          onChange(e.latlng.lat, e.latlng.lng);
          fetchAddress(e.latlng.lat, e.latlng.lng);
        });
      }

      mapInstanceRef.current = map;
      fetchAddress(latitude, longitude);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update marker, circle, and map when props change
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !circleRef.current) return;

    const currentMarkerPos = markerRef.current.getLatLng();
    const diff = Math.abs(currentMarkerPos.lat - latitude) + Math.abs(currentMarkerPos.lng - longitude);

    if (diff > 0.00001) {
      markerRef.current.setLatLng([latitude, longitude]);
      circleRef.current.setLatLng([latitude, longitude]);
      mapInstanceRef.current.panTo([latitude, longitude]);
      fetchAddress(latitude, longitude);
    }

    circleRef.current.setRadius(radiusMeters);
  }, [latitude, longitude, radiusMeters, fetchAddress]);

  // Update Device Location Marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (deviceLatitude && deviceLongitude) {
      if (!deviceMarkerRef.current) {
        deviceMarkerRef.current = L.marker([deviceLatitude, deviceLongitude], {
          icon: deviceIcon,
          zIndexOffset: 1000
        }).addTo(mapInstanceRef.current).bindTooltip('Your Current Position', {
          permanent: false,
          direction: 'top',
          className: 'bg-slate-900 text-white border-0 text-xs px-2 py-1 rounded shadow'
        });
      } else {
        deviceMarkerRef.current.setLatLng([deviceLatitude, deviceLongitude]);
      }
    } else if (deviceMarkerRef.current) {
      deviceMarkerRef.current.remove();
      deviceMarkerRef.current = null;
    }
  }, [deviceLatitude, deviceLongitude]);

  // Address search query handler
  const handleSearch = async (e?: React.FormEvent | React.KeyboardEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`
      );
      if (res.ok) {
        const data: SearchResult[] = await res.json();
        setSearchResults(data);
        setShowDropdown(true);
      }
    } catch (err) {
      console.error('Failed to search places', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPlace = (place: SearchResult) => {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    onChange(lat, lng);
    setResolvedAddress(place.display_name);
    setShowDropdown(false);
    setSearchQuery('');

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 17, { duration: 1.2 });
    }
  };

  return (
    <div className="space-y-2">
      {!readOnly && (
        <div className="flex flex-col sm:flex-row gap-2 relative">
          {/* Search Box */}
          <div className="flex-1 relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Search address or company (e.g. BGC, Ayala)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-20 py-2.5 min-h-[44px] text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-inner"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <button
                type="button"
                onClick={() => handleSearch()}
                disabled={isSearching || !searchQuery.trim()}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Search'}
              </button>
            </div>

            {/* Dropdown Suggestions */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-800">
                {searchResults.map((place) => (
                  <button
                    key={place.place_id}
                    type="button"
                    onClick={() => handleSelectPlace(place)}
                    className="w-full text-left px-3.5 py-2.5 min-h-[44px] text-xs hover:bg-slate-800/80 transition-colors flex items-start gap-2 text-slate-200"
                  >
                    <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{place.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Use Device Location Button */}
          {onUseCurrentLocation && (
            <button
              type="button"
              onClick={onUseCurrentLocation}
              className="w-full sm:w-auto min-h-[44px] px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-medium text-slate-200 hover:text-white transition-colors flex items-center justify-center gap-1.5 shrink-0"
              title="Pin to current GPS location"
            >
              <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Use Current GPS</span>
            </button>
          )}
        </div>
      )}

      {/* Map Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-md">
        <div ref={mapContainerRef} style={{ height, width: '100%', zIndex: 1 }} />

        {/* Map Legend Overlay */}
        <div className="absolute top-2 left-2 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg px-2 py-1 sm:px-2.5 sm:py-1.5 text-[10px] sm:text-[11px] text-slate-300 shadow flex flex-wrap items-center gap-2 sm:gap-3 max-w-[calc(100%-56px)]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-sky-500 border border-white shrink-0"></span>
            <span className="truncate">Workplace ({radiusMeters}m)</span>
          </div>
          {deviceLatitude && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span>Your Device</span>
            </div>
          )}
        </div>

        {/* Pin Position Overlay Hint */}
        {!readOnly && (
          <div className="absolute bottom-2 left-2 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] text-slate-400 shadow hidden xs:block max-w-[calc(100%-16px)]">
            💡 Drag pin or click map to reposition workplace center
          </div>
        )}
      </div>

      {/* Resolved Address Banner */}
      {resolvedAddress && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/60 border border-slate-800/80 rounded-xl px-3 py-2">
          <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="truncate">{resolvedAddress}</span>
        </div>
      )}
    </div>
  );
};
