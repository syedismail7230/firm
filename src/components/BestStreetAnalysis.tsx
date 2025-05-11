import React, { useState, useEffect } from 'react';
import { Map, MapPin, TrendingUp, Users, Store, Brain, Navigation, Car, ShoppingBag, Coffee, Building2, Activity, Ruler } from 'lucide-react';
import type { LocationData } from '../types';
import { generateTrafficData } from '../utils/trafficAnalyzer';
import { fetchLocationAnalytics } from '../utils/locationAnalytics';
import { reverseGeocode } from '../utils/locationSearch';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import toast from 'react-hot-toast';

interface BestStreetAnalysisProps {
  location: LocationData;
}

interface StreetData {
  name: string;
  score: number;
  traffic: number;
  businesses: number;
  footfall: number;
  amenities: string[];
  type: 'Commercial' | 'Mixed' | 'Residential';
  highlights: string[];
  opportunities: string[];
  businessDensity: number;
  averageRent: number;
  peakHours: string[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#ff0000'];

export function BestStreetAnalysis({ location }: BestStreetAnalysisProps) {
  const [loading, setLoading] = useState(true);
  const [selectedStreet, setSelectedStreet] = useState<StreetData | null>(null);
  const [trafficData, setTrafficData] = useState<any[]>([]);
  const [streets, setStreets] = useState<StreetData[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [realStreets, setRealStreets] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Fetch real street names from Nominatim
        const streetNames = await reverseGeocode(location.lat, location.lng);
        setRealStreets(streetNames);

        // Fetch traffic data
        const traffic = await generateTrafficData(location, 'daily');
        setTrafficData(traffic);

        // Fetch location analytics
        const analyticsData = await fetchLocationAnalytics(location.lat, location.lng, location.radius || 1);
        setAnalytics(analyticsData);

        // Generate streets based on analytics and real street names
        const generatedStreets = generateStreets(analyticsData, streetNames);
        setStreets(generatedStreets);

      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load street analysis');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [location]);

  const generateStreets = (analytics: any, streetNames: string[]): StreetData[] => {
    if (!analytics || !analytics.nearbyBusinesses) return [];

    // Group businesses by street/area using real street names
    const streetGroups = analytics.nearbyBusinesses.reduce((acc: any, business: any) => {
      // Use real street names or generate if not enough
      const availableStreets = streetNames.length >= 5 ? streetNames : [
        ...streetNames,
        ...['Main Street', 'Market Road', 'Commercial Avenue', 'Business Park', 'Shopping District'].slice(streetNames.length)
      ];
      
      const streetName = business.street || availableStreets[Math.floor(Math.random() * availableStreets.length)];
      
      if (!acc[streetName]) {
        acc[streetName] = {
          businesses: [],
          totalTraffic: 0,
          amenities: new Set()
        };
      }
      acc[streetName].businesses.push(business);
      acc[streetName].totalTraffic += business.footTraffic || 0;
      if (business.amenities) {
        business.amenities.forEach((amenity: string) => acc[streetName].amenities.add(amenity));
      }
      return acc;
    }, {});

    // Convert groups to street data
    return Object.entries(streetGroups)
      .map(([name, data]: [string, any]) => {
        const businessCount = data.businesses.length;
        const businessDensity = businessCount / (location.radius || 1);
        const score = calculateStreetScore(businessDensity, data.totalTraffic, analytics.businessDensity);

        return {
          name,
          score,
          traffic: data.totalTraffic,
          businesses: businessCount,
          footfall: Math.round(data.totalTraffic * 0.7),
          amenities: Array.from(data.amenities),
          type: determineStreetType(data.businesses),
          businessDensity,
          averageRent: calculateAverageRent(businessDensity, location.avgIncome),
          peakHours: calculatePeakHours(data.businesses),
          highlights: generateHighlights(data.businesses, businessDensity),
          opportunities: generateOpportunities(data.businesses, analytics)
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  };

  const calculateStreetScore = (density: number, traffic: number, avgDensity: number): number => {
    const densityScore = Math.min(100, (density / avgDensity) * 50);
    const trafficScore = Math.min(50, (traffic / 10000) * 50);
    return Math.round(densityScore + trafficScore);
  };

  const determineStreetType = (businesses: any[]): 'Commercial' | 'Mixed' | 'Residential' => {
    const types = businesses.map(b => b.type);
    const commercial = types.filter(t => t === 'shop' || t === 'retail' || t === 'restaurant').length;
    const residential = types.filter(t => t === 'residential' || t === 'apartment').length;
    
    if (commercial > residential * 2) return 'Commercial';
    if (residential > commercial * 2) return 'Residential';
    return 'Mixed';
  };

  const calculateAverageRent = (density: number, avgIncome: number): number => {
    return Math.round((density * 1000) + (avgIncome * 0.1));
  };

  const calculatePeakHours = (businesses: any[]): string[] => {
    return ['09:00 - 11:00', '13:00 - 14:00', '17:00 - 19:00'];
  };

  const generateHighlights = (businesses: any[], density: number): string[] => {
    const highlights = [];
    if (density > 10) highlights.push('High business density area');
    if (businesses.length > 20) highlights.push('Diverse business mix');
    if (businesses.some(b => b.rating > 4.5)) highlights.push('Premium business location');
    if (businesses.some(b => b.footTraffic > 1000)) highlights.push('High foot traffic zone');
    return highlights;
  };

  const generateOpportunities = (businesses: any[], analytics: any): string[] => {
    const opportunities = [];
    const types = businesses.map(b => b.type);
    
    if (!types.includes('cafe')) opportunities.push('Café opportunity identified');
    if (!types.includes('restaurant')) opportunities.push('Restaurant space available');
    if (analytics.avgIncome > 50000 && !types.includes('luxury')) {
      opportunities.push('Luxury retail potential');
    }
    if (businesses.length < 10) opportunities.push('Growing business district');
    
    return opportunities;
  };

  const getStreetTypeIcon = (type: string) => {
    switch (type) {
      case 'Commercial':
        return <ShoppingBag className="w-5 h-5 text-blue-600" />;
      case 'Mixed':
        return <Building2 className="w-5 h-5 text-purple-600" />;
      case 'Residential':
        return <Building2 className="w-5 h-5 text-green-600" />;
      default:
        return <MapPin className="w-5 h-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <Navigation className="w-8 h-8 text-indigo-600" />
        <h2 className="text-2xl font-bold">Top 5 Business Streets</h2>
      </div>

      {/* Business Density Overview */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-6 h-6 text-indigo-600" />
          <h3 className="text-xl font-semibold">Business Density Analysis</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-indigo-50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Overall Density</h4>
            <div className="text-2xl font-bold text-indigo-600">
              {analytics?.businessDensity.toFixed(1)}/km²
            </div>
            <p className="text-sm text-gray-600">Average business density</p>
          </div>

          <div className="bg-indigo-50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Total Businesses</h4>
            <div className="text-2xl font-bold text-indigo-600">
              {analytics?.nearbyBusinesses?.length || 0}
            </div>
            <p className="text-sm text-gray-600">In selected area</p>
          </div>

          <div className="bg-indigo-50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Prime Locations</h4>
            <div className="text-2xl font-bold text-indigo-600">
              {streets.length}
            </div>
            <p className="text-sm text-gray-600">High potential streets</p>
          </div>
        </div>
      </div>

      {/* Street Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {streets.map((street, index) => (
          <div
            key={street.name}
            className={`${
              index === 0 ? 'md:col-span-2 lg:col-span-3' : ''
            } bg-white rounded-xl shadow-lg p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
              selectedStreet?.name === street.name ? 'ring-2 ring-indigo-600' : ''
            }`}
            onClick={() => setSelectedStreet(street)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {getStreetTypeIcon(street.type)}
                <div>
                  <h3 className="text-lg font-semibold">{street.name}</h3>
                  {index === 0 && (
                    <span className="text-sm text-indigo-600 font-medium">Top Recommended Location</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-indigo-600">{street.score}</span>
                <p className="text-sm text-gray-600">Street Score</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  Business Density
                </p>
                <p className="font-semibold">{street.businessDensity.toFixed(1)}/km²</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Store className="w-4 h-4" />
                  Businesses
                </p>
                <p className="font-semibold">{street.businesses}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Car className="w-4 h-4" />
                  Daily Traffic
                </p>
                <p className="font-semibold">{street.traffic.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  Footfall
                </p>
                <p className="font-semibold">{street.footfall.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">Type:</span>
                <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs">
                  {street.type}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {street.amenities.slice(0, 3).map((amenity, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                  >
                    {amenity}
                  </span>
                ))}
                {street.amenities.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                    +{street.amenities.length - 3} more
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Analysis */}
      {selectedStreet && (
        <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              {getStreetTypeIcon(selectedStreet.type)}
              <h3 className="text-xl font-semibold">{selectedStreet.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Street Score</span>
              <span className="text-2xl font-bold text-indigo-600">{selectedStreet.score}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-medium mb-4">Traffic Analysis</h4>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trafficData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="pedestrian"
                      name="Foot Traffic"
                      stackId="1"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="vehicle"
                      name="Vehicle Traffic"
                      stackId="1"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium mb-4">Street Highlights</h4>
                <ul className="space-y-2">
                  {selectedStreet.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="text-gray-700">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-medium mb-4">Business Opportunities</h4>
                <ul className="space-y-2">
                  {selectedStreet.opportunities.map((opportunity, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span className="text-gray-700">{opportunity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="text-lg font-medium mb-4">Street Amenities</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {selectedStreet.amenities.map((amenity, index) => (
                <div
                  key={index}
                  className="bg-indigo-50 rounded-lg p-4 text-center"
                >
                  <span className="text-sm font-medium text-indigo-700">{amenity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}