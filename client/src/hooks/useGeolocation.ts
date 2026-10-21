import { useState, useEffect, useCallback, useRef } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
  isHighAccuracy: boolean;
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
    loading: true,
    isHighAccuracy: false
  });

  const lastCoordsRef = useRef<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const fallbackActiveRef = useRef<boolean>(false);

  const handleSuccess = useCallback((position: GeolocationPosition, highAcc: boolean) => {
    const accuracy = Math.round(position.coords.accuracy);
    lastCoordsRef.current = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy
    };

    setState({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy,
      error: null,
      loading: false,
      isHighAccuracy: highAcc
    });
  }, []);

  const handleError = useCallback((err: GeolocationPositionError, _isHighAccAttempt: boolean) => {
    let message = 'Unable to retrieve location coordinates.';

    if (err.code === err.PERMISSION_DENIED) {
      message = 'Location access was denied. Please allow location permissions in your browser address bar (lock icon) to verify attendance.';
    } else if (err.code === err.POSITION_UNAVAILABLE) {
      message = 'Location signal is currently unavailable. Please verify device location services are enabled.';
    } else if (err.code === err.TIMEOUT) {
      if (lastCoordsRef.current) {
        // We already have a recent valid location fix, so retain it rather than blocking the trainee
        setState(s => ({ ...s, loading: false }));
        return;
      }
      message = 'Location request timed out. If using a desktop computer without GPS hardware, verify browser location permission is allowed, or click Refresh to retry.';
    }

    setState(s => ({
      ...s,
      error: message,
      loading: false
    }));
  }, []);

  const getLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState(s => ({
        ...s,
        error: 'Geolocation is not supported by your device or browser.',
        loading: false
      }));
      return;
    }

    setState(s => ({ ...s, loading: true, error: null }));

    const tryLowAccuracyFallback = () => {
      fallbackActiveRef.current = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => handleSuccess(pos, false),
        (err) => handleError(err, false),
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    };

    if (enableHighAccuracy && !fallbackActiveRef.current) {
      // First attempt: High accuracy with a responsive 6s timeout
      navigator.geolocation.getCurrentPosition(
        (pos) => handleSuccess(pos, true),
        (err) => {
          // If high accuracy times out or satellite signal unavailable, gracefully fall back to network/Wi-Fi position
          if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
            console.warn('High accuracy GPS timed out or unavailable; falling back to network positioning...');
            tryLowAccuracyFallback();
          } else {
            handleError(err, true);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 6000,
          maximumAge: 10000
        }
      );
    } else {
      tryLowAccuracyFallback();
    }
  }, [enableHighAccuracy, handleSuccess, handleError]);

  useEffect(() => {
    getLocation();

    if (watch && typeof navigator !== 'undefined' && navigator.geolocation) {
      const watchHighAcc = enableHighAccuracy && !fallbackActiveRef.current;
      const watchId = navigator.geolocation.watchPosition(
        (pos) => handleSuccess(pos, watchHighAcc),
        (err) => {
          // In watch mode, transient timeouts when stationary are expected and shouldn't destroy the active fix
          if (err.code === err.TIMEOUT && lastCoordsRef.current) {
            return;
          }
          if (err.code === err.TIMEOUT && watchHighAcc) {
            fallbackActiveRef.current = true;
          }
          handleError(err, watchHighAcc);
        },
        {
          enableHighAccuracy: watchHighAcc,
          timeout: 12000,
          maximumAge: 15000
        }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [watch, enableHighAccuracy, getLocation, handleSuccess, handleError]);

  return { ...state, refreshLocation: getLocation };
}
