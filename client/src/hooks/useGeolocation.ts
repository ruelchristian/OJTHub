import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

interface GeolocationOptions {
  watch?: boolean;
  enableHighAccuracy?: boolean;
}

export function useGeolocation(options?: GeolocationOptions) {
  const watch = options?.watch ?? false;
  const enableHighAccuracy = options?.enableHighAccuracy ?? true;

  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: true
  });

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    setState({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: Math.round(position.coords.accuracy),
      error: null,
      loading: false
    });
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
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
  }, []);

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
      handleSuccess,
      handleError,
      {
        enableHighAccuracy,
        timeout: 15000,
        maximumAge: 5000
      }
    );
  }, [enableHighAccuracy, handleSuccess, handleError]);

  useEffect(() => {
    getLocation();

    if (watch && typeof navigator !== 'undefined' && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        {
          enableHighAccuracy,
          timeout: 15000,
          maximumAge: 10000
        }
      );
      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [watch, enableHighAccuracy, getLocation, handleSuccess, handleError]);

  return { ...state, refreshLocation: getLocation };
}
