import { useEffect, useCallback, useRef } from 'react';
import { useMap } from 'react-map-gl';
import toast from 'react-hot-toast';
import { fetchLocationAnalytics } from '../../utils/locationAnalytics';
import type { LocationData } from '../../types';

interface AnalyticsUpdaterProps {
  location: LocationData;
  onAnalyticsUpdate: (analytics: any) => void;
}

export function AnalyticsUpdater({ location, onAnalyticsUpdate }: AnalyticsUpdaterProps) {
  const map = useMap();
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const lastUpdateRef = useRef<number>(0);
  const MIN_UPDATE_INTERVAL = 60000; // Increase to 1 minute
  
  const updateAnalytics = useCallback(async (force = false) => {
    try {
      const now = Date.now();
      if (!force && now - lastUpdateRef.current < MIN_UPDATE_INTERVAL) {
        return;
      }

      if (retryCountRef.current >= maxRetries) {
        console.warn('Max retries reached for analytics update');
        return;
      }

      const analytics = await fetchLocationAnalytics(
        location.lat,
        location.lng,
        location.radius || 1
      );
      
      if (analytics && typeof analytics === 'object') {
        onAnalyticsUpdate({
          ...analytics,
          nearbyBusinesses: Array.isArray(analytics?.nearbyBusinesses) ? analytics.nearbyBusinesses : []
        });
        retryCountRef.current = 0;
        lastUpdateRef.current = now;
      }
    } catch (error) {
      console.error('Error updating analytics:', error);
      retryCountRef.current += 1;
      
      if (retryCountRef.current < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
        
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        
        updateTimeoutRef.current = setTimeout(() => updateAnalytics(true), delay);
      } else {
        toast.error('Unable to load location data. Please try again later.');
      }
    }
  }, [location, onAnalyticsUpdate, maxRetries]);

  // Handle location changes
  useEffect(() => {
    retryCountRef.current = 0;
    updateAnalytics(true); // Force update on location change

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [location.lat, location.lng, location.radius]);

  // Periodic updates
  useEffect(() => {
    let mounted = true;
    const interval = setInterval(() => {
      if (mounted) {
        updateAnalytics();
      }
    }, MIN_UPDATE_INTERVAL); // Update every minute

    return () => {
      mounted = false;
      clearInterval(interval);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [updateAnalytics]);

  // Map updates
  useEffect(() => {
    if (map && map.current) {
      map.current.flyTo({
        center: [location.lng, location.lat],
        zoom: 14,
        duration: 1000,
        essential: true
      });
    }
  }, [location.lat, location.lng, map]);

  return null;
}