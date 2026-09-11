import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: true
  });

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState(s => ({
        ...s,
        error: 'Geolocation is not supported by your device or browser.',
        loading: false
      }));
      return;
    }

    setState(s => ({ ...s, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
          error: null,
          loading: false
        });
      },
      (err) => {
        let message = 'Unable to retrieve location coordinates.';
        if (err.code === err.PERMISSION_DENIED) {
          message = 'Location access was denied. Please allow location permissions in your browser settings to verify attendance.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          message = 'Location signal is unavailable. Please verify GPS is enabled.';
        } else if (err.code === err.TIMEOUT) {
          message = 'Location request timed out. Please retry.';
        }
        setState(s => ({
          ...s,
          error: message,
          loading: false
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000
      }
    );
  }, []);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  return { ...state, refreshLocation: getLocation };
}
