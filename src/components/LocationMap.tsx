import React, { useState, useEffect, useCallback, useRef } from 'react';
import Map, { Marker, Popup, Source, Layer, CircleLayer } from 'react-map-gl';
import type { LocationData, NearbyBusiness } from '../types';
import { Store, Users, TrendingUp, AlertTriangle, Coffee, School, Guitar as Hospital, Building2, MapPin, Star, Clock, DollarSign, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Ruler } from 'lucide-react';
import { AnalyticsUpdater } from './map/AnalyticsUpdater';
import { fetchLocationAnalytics } from '../utils/locationAnalytics';
import toast from 'react-hot-toast';

interface LocationMapProps {
  location: LocationData;
  radius: number;
  nearbyBusinesses: NearbyBusiness[];
  onAnalyticsUpdate: (analytics: any) => void;
}

const circleLayer: CircleLayer = {
  id: 'search-radius',
  type: 'circle',
  paint: {
    'circle-radius': ['*', ['get', 'radius'], 100],
    'circle-color': '#4f46e5',
    'circle-opacity': 0.1,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#4f46e5'
  }
};

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

if (!MAPBOX_TOKEN) {
  throw new Error('Mapbox access token is required');
}

export function LocationMap({ location, radius, nearbyBusinesses, onAnalyticsUpdate }: LocationMapProps) {
  const [showBusinesses, setShowBusinesses] = useState(true);
  const [popupInfo, setPopupInfo] = useState<NearbyBusiness | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewport, setViewport] = useState({
    latitude: location.lat,
    longitude: location.lng,
    zoom: 13
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentRadius, setCurrentRadius] = useState(radius);

  useEffect(() => {
    if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
      setLoading(false);
    }

    setViewport({
      latitude: location.lat,
      longitude: location.lng,
      zoom: 13
    });
  }, [location.lat, location.lng]);

  useEffect(() => {
    setCurrentRadius(radius);
  }, [radius]);

  const handleRadiusChange = async (newRadius: number) => {
    setCurrentRadius(newRadius);
    location.radius = newRadius;
    try {
      const analytics = await fetchLocationAnalytics(location.lat, location.lng, newRadius);
      onAnalyticsUpdate(analytics);
    } catch (error) {
      console.error('Error updating analytics:', error);
      toast.error('Failed to update location data');
    }
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollAmount = container.clientWidth;
      
      if (direction === 'left') {
        const newPosition = Math.max(0, scrollPosition - scrollAmount);
        setScrollPosition(newPosition);
        container.scrollTo({
          left: newPosition,
          behavior: 'smooth'
        });
      } else {
        const maxScroll = container.scrollWidth - container.clientWidth;
        const newPosition = Math.min(maxScroll, scrollPosition + scrollAmount);
        setScrollPosition(newPosition);
        container.scrollTo({
          left: newPosition,
          behavior: 'smooth'
        });
      }
    }
  };

  const getMarkerIcon = useCallback((type: string) => {
    switch (type?.toLowerCase()) {
      case 'restaurant':
      case 'cafe':
      case 'bar':
      case 'fast_food':
        return <Coffee className="w-4 h-4 text-blue-600" />;
      case 'school':
      case 'university':
      case 'college':
        return <School className="w-4 h-4 text-yellow-600" />;
      case 'hospital':
      case 'clinic':
      case 'pharmacy':
        return <Hospital className="w-4 h-4 text-red-600" />;
      case 'shop':
      case 'supermarket':
      case 'convenience':
        return <Store className="w-4 h-4 text-green-600" />;
      default:
        return <Building2 className="w-4 h-4 text-gray-600" />;
    }
  }, []);

  const searchRadiusGeoJSON = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          radius: currentRadius * 1000 // Convert km to meters
        },
        geometry: {
          type: 'Point',
          coordinates: [location.lng, location.lat]
        }
      }
    ]
  };

  // Group businesses by category
  const businessesByCategory = nearbyBusinesses.reduce((acc, business) => {
    const category = business.type || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(business);
    return acc;
  }, {} as Record<string, NearbyBusiness[]>);

  const categories = Object.keys(businessesByCategory);
  const filteredBusinesses = selectedCategory
    ? businessesByCategory[selectedCategory] || []
    : nearbyBusinesses;

  const renderBusinessCard = (business: NearbyBusiness) => (
    <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow min-w-[300px] flex-shrink-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getMarkerIcon(business.type)}
          <h3 className="font-medium truncate">{business.name || 'Unnamed Business'}</h3>
        </div>
        {business.rating && (
          <div className="flex items-center gap-1 text-yellow-500">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-sm">{business.rating}</span>
          </div>
        )}
      </div>
      
      <div className="space-y-1 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <MapPin className="w-4 h-4" />
          <span>{business.distance.toFixed(2)} km away</span>
        </div>
        
        {business.businessHours && business.businessHours !== 'Hours not available' && (
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{business.businessHours}</span>
          </div>
        )}
        
        {business.priceRange && (
          <div className="flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            <span>{business.priceRange}</span>
          </div>
        )}
      </div>

      {business.amenities?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {business.amenities.map((amenity: string, index: number) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-50 text-indigo-700"
            >
              {amenity}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="h-[400px] w-full rounded-lg overflow-hidden shadow-md flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="text-gray-600">Loading location data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[400px] w-full rounded-lg overflow-hidden shadow-md flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
          <p className="text-gray-900 font-medium">{error}</p>
          <p className="text-gray-600">Please try again later or contact support if the problem persists.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="h-[400px] w-full rounded-lg overflow-hidden shadow-md relative">
        <Map
          {...viewport}
          onMove={evt => setViewport(evt.viewState)}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={MAPBOX_TOKEN}
          attributionControl={false}
          reuseMaps
          maxZoom={20}
          minZoom={3}
          cooperativeGestures={true}
        >
          <Source type="geojson" data={searchRadiusGeoJSON}>
            <Layer {...circleLayer} />
          </Source>

          <Marker
            longitude={location.lng}
            latitude={location.lat}
            anchor="bottom"
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg transform -translate-y-1/2">
              <MapPin className="w-5 h-5" />
            </div>
          </Marker>

          {nearbyBusinesses.map((business, index) => (
            <Marker
              key={`${business.id}-${index}`}
              longitude={business.lon}
              latitude={business.lat}
              anchor="bottom"
            >
              <div 
                className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md border-2 border-indigo-600 cursor-pointer hover:bg-indigo-50 transition-colors"
                onClick={() => setPopupInfo(business)}
              >
                {getMarkerIcon(business.type)}
              </div>
            </Marker>
          ))}

          {popupInfo && (
            <Popup
              anchor="bottom"
              longitude={popupInfo.lon}
              latitude={popupInfo.lat}
              onClose={() => setPopupInfo(null)}
              closeButton={true}
              closeOnClick={false}
              className="rounded-lg shadow-lg"
              maxWidth="300px"
            >
              {renderBusinessCard(popupInfo)}
            </Popup>
          )}

          <AnalyticsUpdater 
            location={{ ...location, radius: currentRadius }} 
            onAnalyticsUpdate={onAnalyticsUpdate} 
          />
        </Map>

        {/* Radius Control */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10">
          <div className="flex items-center gap-2 mb-2">
            <Ruler className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium">Search Radius</span>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.5"
              value={currentRadius}
              onChange={(e) => handleRadiusChange(parseFloat(e.target.value))}
              className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-gray-600 min-w-[4rem]">{currentRadius} km</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Store className="w-5 h-5 text-indigo-600" />
              Nearby Businesses
            </h3>
            <button
              onClick={() => setShowBusinesses(!showBusinesses)}
              className="ml-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              {showBusinesses ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
          {showBusinesses && categories.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1 rounded-full text-sm ${
                  !selectedCategory
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All ({nearbyBusinesses.length})
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedCategory === category
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category} ({businessesByCategory[category].length})
                </button>
              ))}
            </div>
          )}
        </div>

        {showBusinesses && (
          <div className="relative">
            {scrollPosition > 0 && (
              <button
                onClick={() => handleScroll('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-2 rounded-full shadow-lg hover:bg-white transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              </button>
            )}
            {scrollPosition < (scrollContainerRef.current?.scrollWidth || 0) - (scrollContainerRef.current?.clientWidth || 0) && (
              <button
                onClick={() => handleScroll('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-2 rounded-full shadow-lg hover:bg-white transition-colors"
              >
                <ChevronRight className="w-6 h-6 text-gray-600" />
              </button>
            )}
            <div
              ref={scrollContainerRef}
              className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar"
              style={{
                scrollBehavior: 'smooth',
                scrollSnapType: 'x mandatory'
              }}
            >
              {filteredBusinesses.map((business, index) => (
                <div
                  key={`${business.id}-${index}`}
                  onClick={() => {
                    setPopupInfo(business);
                    setViewport({
                      ...viewport,
                      latitude: business.lat,
                      longitude: business.lon,
                      zoom: 15
                    });
                  }}
                  className="cursor-pointer scroll-snap-align-start"
                >
                  {renderBusinessCard(business)}
                </div>
              ))}
            </div>
          </div>
        )}

        {showBusinesses && filteredBusinesses.length === 0 && (
          <div className="text-center py-8 bg-white rounded-lg shadow-sm">
            <Store className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No businesses found in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}