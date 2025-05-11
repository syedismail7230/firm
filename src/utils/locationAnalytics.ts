import * as turf from '@turf/turf';

// Cache with memory limit
class AnalyticsCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private maxEntries = 100;
  private maxAge = 60000; // Increase to 1 minute

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

const analyticsCache = new AnalyticsCache();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;
const RATE_LIMIT_DELAY = 2000;

let lastRequestTime = 0;

// Rate limiter
class RateLimiter {
  private requests: number[] = [];
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.checkLimit();
    }
    
    this.requests.push(now);
    return true;
  }
}

const rateLimiter = new RateLimiter(RATE_LIMIT_WINDOW, MAX_REQUESTS_PER_WINDOW);

interface AnalyticsResult {
  population: number;
  avgIncome: number;
  businessDensity: number;
  footTraffic: number;
  risk: 'Low' | 'Medium' | 'High';
  nearbyBusinesses: BusinessInfo[];
  competitorCount: number;
  educationLevel: number;
  businessCategories: CategoryAnalysis[];
}

interface BusinessInfo {
  id: string;
  name: string;
  type: string;
  category: string;
  distance: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
  businessHours?: string;
  amenities: string[];
  rating?: number;
  priceRange?: string;
  yearEstablished?: string;
  size?: string;
}

interface CategoryAnalysis {
  category: string;
  count: number;
  averageDistance: number;
  densityScore: number;
  competitionLevel: 'Low' | 'Medium' | 'High';
  topBusinesses: BusinessInfo[];
}

const BUSINESS_CATEGORIES = {
  'shop': [
    'supermarket',
    'convenience',
    'clothes',
    'electronics',
    'bakery',
    'jewelry',
    'books',
    'furniture',
    'hardware',
    'department_store'
  ],
  'food': [
    'restaurant',
    'cafe',
    'fast_food',
    'bar',
    'pub',
    'food_court'
  ],
  'services': [
    'bank',
    'pharmacy',
    'post_office',
    'salon',
    'gym',
    'laundry'
  ],
  'healthcare': [
    'hospital',
    'clinic',
    'dentist',
    'doctors',
    'pharmacy'
  ],
  'education': [
    'school',
    'university',
    'college',
    'library',
    'training'
  ],
  'entertainment': [
    'cinema',
    'theatre',
    'nightclub',
    'arts_centre',
    'gallery'
  ]
};

function categorizeBusinessType(tags: Record<string, string>): string {
  if (!tags) return 'other';
  
  if (tags.shop) {
    for (const [category, types] of Object.entries(BUSINESS_CATEGORIES)) {
      if (types.includes(tags.shop)) {
        return category;
      }
    }
    return 'retail';
  }

  if (tags.amenity) {
    for (const [category, types] of Object.entries(BUSINESS_CATEGORIES)) {
      if (types.includes(tags.amenity)) {
        return category;
      }
    }
  }

  if (tags.office) return 'services';
  if (tags.leisure) return 'entertainment';
  if (tags.healthcare) return 'healthcare';
  if (tags.education) return 'education';

  return 'other';
}

function parseBusinessHours(tags: Record<string, string>): string {
  if (!tags) return 'Hours not available';
  return tags.opening_hours || 'Hours not available';
}

function extractAmenities(tags: Record<string, string>): string[] {
  if (!tags) return [];
  
  const amenities: string[] = [];

  if (tags.wifi === 'yes') amenities.push('WiFi');
  if (tags.wheelchair === 'yes') amenities.push('Wheelchair Accessible');
  if (tags.parking) amenities.push('Parking Available');
  if (tags.outdoor_seating === 'yes') amenities.push('Outdoor Seating');
  if (tags.delivery === 'yes') amenities.push('Delivery');
  if (tags.takeaway === 'yes') amenities.push('Takeaway');
  if (tags.drive_through === 'yes') amenities.push('Drive Through');
  if (tags.air_conditioning === 'yes') amenities.push('Air Conditioning');

  return amenities;
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function enforceRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    await delay(RATE_LIMIT_DELAY - timeSinceLastRequest);
  }
  
  lastRequestTime = Date.now();
}

async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  let attempt = 0;
  
  while (attempt < MAX_RETRIES) {
    try {
      await enforceRateLimit();
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'User-Agent': 'LocationAnalyzer/1.0',
          'Accept': 'application/json',
          'Origin': window.location.origin,
        },
        mode: 'cors',
        credentials: 'omit'
      });

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        await delay(retryAfter * 1000);
        throw new Error('Rate limited');
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      return response;
    } catch (error) {
      attempt++;
      console.warn(`Attempt ${attempt} failed:`, error);
      
      if (attempt === MAX_RETRIES) {
        // Return cached data if available
        const cacheKey = new URL(url).toString();
        const cachedData = analyticsCache.get(cacheKey);
        if (cachedData) {
          console.log('Returning cached data due to fetch failure');
          return new Response(JSON.stringify(cachedData.data), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        throw error;
      }

      const delayTime = BASE_DELAY * Math.pow(2, attempt);
      await delay(delayTime);
    }
  }

  throw new Error('Failed to fetch after maximum retries');
}

async function fetchOverpassData(bbox: number[]): Promise<any[]> {
  if (!bbox || bbox.length !== 4) {
    throw new Error('Invalid bounding box');
  }

  if (bbox.some(coord => !Number.isFinite(coord))) {
    throw new Error('Invalid coordinates in bounding box');
  }

  if (bbox[1] < -90 || bbox[1] > 90 || bbox[3] < -90 || bbox[3] > 90 ||
      bbox[0] < -180 || bbox[0] > 180 || bbox[2] < -180 || bbox[2] > 180) {
    throw new Error('Coordinates out of valid range');
  }

  // Generate cache key
  const cacheKey = bbox.join(',');
  const cachedData = analyticsCache.get(cacheKey);
  
  if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
    return cachedData.data;
  }

  const query = `
    [out:json][timeout:60];
    (
      node["shop"~"supermarket|convenience|restaurant"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
      way["shop"~"supermarket|convenience|restaurant"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
      node["amenity"~"restaurant|cafe|bank|pharmacy"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
      way["amenity"~"restaurant|cafe|bank|pharmacy"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
    );
    out body;
    >;
    out skel qt;
  `;

  try {
    const response = await fetchWithRetry('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    const data = await response.json();
    
    if (!data || !Array.isArray(data.elements)) {
      throw new Error('Invalid response format from Overpass API');
    }

    // Cache the results
    analyticsCache.set(cacheKey, {
      data: data.elements,
      timestamp: Date.now()
    });

    return data.elements;
  } catch (error) {
    console.error('Error fetching from Overpass API:', error);
    
    // Return cached data if available, even if expired
    if (cachedData) {
      console.log('Returning stale cached data due to API error');
      return cachedData.data;
    }
    
    // If no cached data available, return empty array instead of throwing
    return [];
  }
}

export async function fetchLocationAnalytics(lat: number, lng: number, radius: number): Promise<AnalyticsResult> {
  try {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radius)) {
      throw new Error('Invalid coordinates or radius');
    }

    // Generate cache key
    const cacheKey = `${lat},${lng},${radius}`;
    const cached = analyticsCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }

    // Check rate limit before making request
    await rateLimiter.checkLimit();

    const center = turf.point([lng, lat]);
    const circle = turf.circle(center, radius, { units: 'kilometers' });
    const bbox = turf.bbox(circle);

    const data = await fetchOverpassData(bbox);
    // Ensure businesses is always an array
    const businesses = Array.isArray(data) ? data : [];
    const area = turf.area(circle) / 1000000; // Convert to km²
    const businessDensity = businesses.length / area;

    const nearbyBusinesses = businesses
      .filter(business => {
        const hasLocation = business.lat && business.lon || (business.center && business.center.lat && business.center.lon);
        return hasLocation && business.tags;
      })
      .map(business => {
        const businessPoint = turf.point([
          business.lon || business.center?.lon || 0,
          business.lat || business.center?.lat || 0
        ]);
        const distance = turf.distance(center, businessPoint, { units: 'kilometers' });
        const category = categorizeBusinessType(business.tags || {});

        return {
          id: business.id.toString(),
          name: business.tags?.name || 'Unnamed Business',
          type: business.tags?.shop || business.tags?.amenity || business.tags?.leisure || 'unknown',
          category,
          distance: parseFloat(distance.toFixed(2)),
          lat: business.lat || business.center?.lat,
          lon: business.lon || business.center?.lon,
          tags: business.tags || {},
          businessHours: parseBusinessHours(business.tags),
          amenities: extractAmenities(business.tags),
          rating: business.tags?.rating ? parseFloat(business.tags.rating) : undefined,
          priceRange: business.tags?.price_range,
          yearEstablished: business.tags?.start_date,
          size: business.tags?.building_size || business.tags?.floor_area
        };
      })
      .filter(b => b.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    const competitorCount = nearbyBusinesses.filter(b => 
      b.type === 'restaurant' || b.type === 'cafe' || b.type === 'shop'
    ).length;

    const basePopulation = 10000 * (1 + businessDensity / 10);
    const population = Math.round(basePopulation * (0.8 + Math.random() * 0.4));
    
    const baseIncome = 40000 * (1 + businessDensity / 15);
    const avgIncome = Math.round(baseIncome * (0.8 + Math.random() * 0.4));

    const hour = new Date().getHours();
    let trafficMultiplier = 1;
    
    if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19)) {
      trafficMultiplier = 2;
    } else if (hour >= 12 && hour <= 14) {
      trafficMultiplier = 1.5;
    } else if (hour >= 22 || hour <= 5) {
      trafficMultiplier = 0.3;
    }

    const footTraffic = Math.round(businessDensity * 100 * trafficMultiplier);

    let risk: 'Low' | 'Medium' | 'High' = 'Medium';
    const riskScore = 
      (businessDensity > 10 ? -1 : 1) +
      (competitorCount > 5 ? -1 : 1) +
      (footTraffic > 500 ? 1 : -1) +
      (avgIncome > 50000 ? 1 : -1);

    if (riskScore >= 2) risk = 'Low';
    else if (riskScore <= -2) risk = 'High';

    const educationLevel = Math.min(
      100,
      Math.round(
        (avgIncome / 100000 * 50) +
        (businessDensity * 2) +
        (Math.random() * 20)
      )
    );

    const businessCategories = Object.keys(BUSINESS_CATEGORIES).map(category => {
      const categoryBusinesses = nearbyBusinesses.filter(b => b.category === category);
      const count = categoryBusinesses.length;
      const averageDistance = count > 0
        ? categoryBusinesses.reduce((sum, b) => sum + b.distance, 0) / count
        : 0;
      const densityScore = (count / area) * 10;

      let competitionLevel: 'Low' | 'Medium' | 'High';
      if (count <= 2) competitionLevel = 'Low';
      else if (count <= 5) competitionLevel = 'Medium';
      else competitionLevel = 'High';

      return {
        category,
        count,
        averageDistance: parseFloat(averageDistance.toFixed(2)),
        densityScore: parseFloat(densityScore.toFixed(2)),
        competitionLevel,
        topBusinesses: categoryBusinesses
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 5)
      };
    });

    const result = {
      population,
      avgIncome,
      businessDensity: Math.round(businessDensity * 10) / 10,
      footTraffic,
      risk,
      nearbyBusinesses,
      competitorCount,
      educationLevel,
      businessCategories
    };

    // Cache the result
    analyticsCache.set(cacheKey, result);

    return result;
  } catch (error) {
    console.error('Error fetching location analytics:', error);
    
    // Return cached data if available, even if expired
    const cached = analyticsCache.get(`${lat},${lng},${radius}`);
    if (cached) {
      console.log('Returning stale cached data due to error');
      return cached.data;
    }
    
    // Return default data if no cache available
    return {
      population: 0,
      avgIncome: 0,
      businessDensity: 0,
      footTraffic: 0,
      risk: 'Medium',
      nearbyBusinesses: [],
      competitorCount: 0,
      educationLevel: 0,
      businessCategories: []
    };
  }
}