import React, { useState, useEffect, useCallback } from 'react';
import Map, { Marker, Popup, Source, Layer, CircleLayer } from 'react-map-gl';
import type { LocationData } from '../../types';
import { Store, Users, TrendingUp, AlertTriangle, Coffee, School, Guitar as Hospital, Building2, MapPin, Star, Clock, DollarSign, Info, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { AnalyticsUpdater } from './AnalyticsUpdater';
import { searchNearbyPlaces } from '../../utils/locationSearch';
import debounce from 'lodash/debounce';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapViewProps {
  location: LocationData;
  radius: number;
  nearbyBusinesses: any[];
  onAnalyticsUpdate: (analytics: any) => void;
}

const circleLayer: CircleLayer = {
  id: 'search-radius',
  type: 'circle',
  paint: {
    'circle-radius': ['/', ['*', ['get', 'radius'], 100], ['cos', ['/', ['*', Math.PI, ['get', 'lat']], 180]]],
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

export function MapView({ location, radius, nearbyBusinesses, onAnalyticsUpdate }: MapViewProps) {
  const [showBusinesses, setShowBusinesses] = useState(false);
  const [popupInfo, setPopupInfo] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewport, setViewport] = useState({
    latitude: location.lat,
    longitude: location.lng,
    zoom: 13
  });

  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const itemsPerRow = 4;
  const totalRows = 3;
  const itemsPerPage = itemsPerRow * totalRows;

  useEffect(() => {
    setViewport({
      latitude: location.lat,
      longitude: location.lng,
      zoom: 13
    });
  }, [location.lat, location.lng]);

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
          radius: radius * 1000,
          lat: location.lat
        },
        geometry: {
          type: 'Point',
          coordinates: [location.lng, location.lat]
        }
      }
    ]
  };

  const filteredBusinesses = React.useMemo(() => 
    selectedCategory
      ? nearbyBusinesses.filter(b => b.category === selectedCategory)
      : nearbyBusinesses,
    [nearbyBusinesses, selectedCategory]
  );

  const categories = React.useMemo(() => 
    Array.from(new Set(nearbyBusinesses.map(b => b.category))),
    [nearbyBusinesses]
  );

  const handleScroll = React.useCallback(
    debounce((direction: 'left' | 'right') => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const scrollAmount = container.clientWidth;
        
        if (direction === 'left') {
          setScrollPosition(Math.max(0, scrollPosition - scrollAmount));
          container.scrollTo({
            left: Math.max(0, scrollPosition - scrollAmount),
            behavior: 'smooth'
          });
        } else {
          const maxScroll = container.scrollWidth - container.clientWidth;
          setScrollPosition(Math.min(maxScroll, scrollPosition + scrollAmount));
          container.scrollTo({
            left: Math.min(maxScroll, scrollPosition + scrollAmount),
            behavior: 'smooth'
          });
        }
      }
    }, 100),
    [scrollPosition]
  );

  const groupedBusinesses = React.useMemo(() => {
    const filtered = selectedCategory
      ? nearbyBusinesses.filter(b => b.category === selectedCategory)
      : nearbyBusinesses;

    const rows: any[][] = [];
    for (let i = 0; i < filtered.length; i += itemsPerRow) {
      rows.push(filtered.slice(i, i + itemsPerRow));
    }
    return rows;
  }, [nearbyBusinesses, selectedCategory, itemsPerRow]);

  const renderBusinessCard = React.useCallback((business: any) => (
    <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
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
        
        {business.businessHours !== 'Hours not available' && (
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

      {business.amenities.length > 0 && (
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
  ), [getMarkerIcon]);

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
            onClick={e => {
              e.originalEvent.stopPropagation();
              setPopupInfo({
                longitude: location.lng,
                latitude: location.lat,
                name: location.name,
                isMainLocation: true
              });
            }}
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg transform -translate-y-1/2">
              <MapPin className="w-5 h-5" />
            </div>
          </Marker>

          {filteredBusinesses.map((business, index) => {
            if (!business.lat || !business.lon) return null;

            return (
              <Marker
                key={`${business.id}-${index}`}
                longitude={business.lon}
                latitude={business.lat}
                anchor="bottom"
                onClick={e => {
                  e.originalEvent.stopPropagation();
                  setPopupInfo(business);
                }}
              >
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md border-2 border-indigo-600 cursor-pointer hover:bg-indigo-50 transition-colors">
                  {getMarkerIcon(business.type)}
                </div>
              </Marker>
            );
          })}

          {popupInfo && (
            <Popup
              anchor="bottom"
              longitude={popupInfo.isMainLocation ? popupInfo.longitude : popupInfo.lon}
              latitude={popupInfo.isMainLocation ? popupInfo.latitude : popupInfo.lat}
              onClose={() => setPopupInfo(null)}
              closeButton={true}
              closeOnClick={false}
              className="rounded-lg shadow-lg"
              maxWidth="300px"
            >
              <div className="p-2 min-w-[200px]">
                {popupInfo.isMainLocation ? (
                  <>
                    <h3 className="font-semibold mb-2">{location.name}</h3>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-gray-600" />
                        <span className="text-sm">Population: {location.population.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-gray-600" />
                        <span className="text-sm">Avg Income: ₹{location.avgIncome.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Store className="w-4 h-4 text-gray-600" />
                        <span className="text-sm">Business Density: {location.businessDensity}/1000 people</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4 text-gray-600" />
                        <span className="text-sm">Competitors: {location.competitorCount}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  renderBusinessCard(popupInfo)
                )}
              </div>
            </Popup>
          )}

          <AnalyticsUpdater location={{ ...location, radius }} onAnalyticsUpdate={onAnalyticsUpdate} />
        </Map>

        {!nearbyBusinesses.length && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="text-gray-600">Loading location data...</p>
            </div>
          </div>
        )}
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
          {showBusinesses && (
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1 rounded-full text-sm ${
                  !selectedCategory
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
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
                  {category.charAt(0).toUpperCase() + category.slice(1)}
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
              className="overflow-x-auto hide-scrollbar"
              style={{
                scrollBehavior: 'smooth',
                scrollSnapType: 'x mandatory'
              }}
            >
              <div className="grid grid-rows-3 auto-cols-max grid-flow-col gap-4 p-2">
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
                    className="w-[300px] cursor-pointer scroll-snap-align-start"
                  >
                    {renderBusinessCard(business)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showBusinesses && filteredBusinesses.length === 0 && (
          <div className="text-center py-8">
            <Info className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No businesses found in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}