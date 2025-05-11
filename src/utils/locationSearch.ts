import * as turf from '@turf/turf';

interface SearchResult {
  place_id: string;
  lat: number;
  lon: number;
  display_name: string;
  type: string;
  importance: number;
  amenity?: string;
  shop?: string;
  name?: string;
  address?: {
    road?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  distance?: number;
}

interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  boundingbox: string[];
}

// Cache with memory limit
class SearchCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private maxEntries = 100;
  private maxAge = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any) {
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  clear() {
    this.cache.clear();
  }
}

const searchCache = new SearchCache();

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  let lastError;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'User-Agent': 'LocationAnalyzer/1.0',
          'Accept': 'application/json',
          'Origin': window.location.origin
        },
        mode: 'cors',
        credentials: 'omit'
      });

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        await delay(retryAfter * 1000);
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      return response;
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${i + 1} failed:`, error);
      await delay(1000 * Math.pow(2, i));
    }
  }

  throw lastError;
}

export async function searchLocation(query: string): Promise<SearchResult[]> {
  try {
    const cacheKey = `search:${query}`;
    const cached = searchCache.get(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: '10',
      countrycodes: 'in',
      'accept-language': 'en'
    });

    const response = await fetchWithRetry(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      { headers: { 'Accept-Language': 'en' } }
    );

    const data = await response.json() as NominatimResult[];
    
    const results = data.map(item => ({
      place_id: item.place_id.toString(),
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      display_name: formatDisplayName(item.address),
      type: item.osm_type,
      importance: 1,
      address: item.address
    }));

    searchCache.set(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Error searching locations:', error);
    return [];
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<string[]> {
  try {
    const cacheKey = `reverse:${lat},${lon}`;
    const cached = searchCache.get(cacheKey);
    if (cached) return cached;

    // Get nearby streets within a radius
    const bbox = getBoundingBox(lat, lon, 1); // 1km radius
    const params = new URLSearchParams({
      format: 'json',
      addressdetails: '1',
      limit: '50',
      'accept-language': 'en',
      street: '1',
      highway: '*',
      bounded: '1',
      viewbox: `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`
    });

    const response = await fetchWithRetry(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      { headers: { 'Accept-Language': 'en' } }
    );

    const data = await response.json() as NominatimResult[];
    
    // Extract unique street names and filter out unnamed streets
    const streets = new Set<string>();
    data.forEach(item => {
      if (item.address?.road) {
        streets.add(item.address.road);
      }
    });

    // If no streets found, try reverse geocoding
    if (streets.size === 0) {
      const reverseParams = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        format: 'json',
        addressdetails: '1',
        zoom: '18'
      });

      const reverseResponse = await fetchWithRetry(
        `https://nominatim.openstreetmap.org/reverse?${reverseParams.toString()}`,
        { headers: { 'Accept-Language': 'en' } }
      );

      const reverseData = await reverseResponse.json() as NominatimResult;
      if (reverseData.address?.road) {
        streets.add(reverseData.address.road);
      }
    }

    const streetList = Array.from(streets);
    searchCache.set(cacheKey, streetList);
    return streetList;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return [];
  }
}

function getBoundingBox(lat: number, lon: number, radiusKm: number) {
  const R = 6371; // Earth's radius in km
  const d = radiusKm;
  
  const dLat = (d / R) * (180 / Math.PI);
  const dLon = (d / (R * Math.cos((Math.PI * lat) / 180))) * (180 / Math.PI);

  return {
    north: lat + dLat,
    south: lat - dLat,
    east: lon + dLon,
    west: lon - dLon
  };
}

function formatDisplayName(address: any): string {
  if (!address) return 'Unknown Location';
  
  const parts = [];
  
  if (address.road) parts.push(address.road);
  if (address.suburb) parts.push(address.suburb);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.postcode) parts.push(address.postcode);
  
  return parts.join(', ') || 'Unknown Location';
}