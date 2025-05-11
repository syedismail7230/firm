import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  Users,
  TrendingUp,
  Map,
  Target,
  UserPlus,
  Megaphone,
  MapPin,
  Store,
  Star,
  DollarSign,
  Building2,
  Loader2,
  AlertCircle,
  TrendingDown,
  BarChart as ChartIcon,
  Zap,
  Shield
} from 'lucide-react';
import type { LocationData } from '../types';
import toast from 'react-hot-toast';

interface LocationAnalysisProps {
  location: LocationData;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#ff0000'];

export function LocationAnalysis({ location }: LocationAnalysisProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [location]);

  const competitiveData = [
    { 
      metric: 'Market Share',
      competitor: 85,
      industry: 65,
      business: 75
    },
    {
      metric: 'Customer Satisfaction',
      competitor: 90,
      industry: 70,
      business: 85
    },
    {
      metric: 'Price Point',
      competitor: 75,
      industry: 60,
      business: 70
    },
    {
      metric: 'Location Quality',
      competitor: 95,
      industry: 75,
      business: 85
    },
    {
      metric: 'Brand Recognition',
      competitor: 80,
      industry: 65,
      business: 70
    }
  ];

  const marketShareData = [
    { name: 'Market Leader', value: 35 },
    { name: 'Competitor A', value: 25 },
    { name: 'Competitor B', value: 20 },
    { name: 'Others', value: 20 }
  ];

  const competitorStrengths = [
    { name: 'Brand Recognition', value: 85 },
    { name: 'Customer Service', value: 90 },
    { name: 'Product Quality', value: 88 },
    { name: 'Location', value: 95 },
    { name: 'Price', value: 75 }
  ];

  const competitorWeaknesses = [
    { name: 'Innovation', value: 60 },
    { name: 'Digital Presence', value: 65 },
    { name: 'Delivery Service', value: 55 },
    { name: 'Operating Hours', value: 70 },
    { name: 'Parking Space', value: 50 }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Market Overview */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <ChartIcon className="w-6 h-6 text-indigo-600" />
          <h3 className="text-xl font-semibold">Competitive Landscape</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-indigo-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Store className="w-5 h-5 text-indigo-600" />
              <h4 className="font-medium">Direct Competitors</h4>
            </div>
            <p className="text-2xl font-bold text-indigo-600">{location.competitorCount}</p>
            <p className="text-sm text-gray-600">Within {location.radius || 1}km radius</p>
          </div>

          <div className="bg-indigo-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-indigo-600" />
              <h4 className="font-medium">Market Share</h4>
            </div>
            <p className="text-2xl font-bold text-indigo-600">25%</p>
            <p className="text-sm text-gray-600">Average per competitor</p>
          </div>

          <div className="bg-indigo-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-indigo-600" />
              <h4 className="font-medium">Market Growth</h4>
            </div>
            <p className="text-2xl font-bold text-green-600">+12%</p>
            <p className="text-sm text-gray-600">Year over year</p>
          </div>
        </div>

        {/* Market Share Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h4 className="text-lg font-medium mb-4">Market Share Distribution</h4>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={marketShareData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {marketShareData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-medium mb-4">Competitive Benchmarking</h4>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={competitiveData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar
                    name="Market Leader"
                    dataKey="competitor"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                  <Radar
                    name="Industry Average"
                    dataKey="industry"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    fillOpacity={0.6}
                  />
                  <Radar
                    name="Your Business"
                    dataKey="business"
                    stroke="#ffc658"
                    fill="#ffc658"
                    fillOpacity={0.6}
                  />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Competitor Analysis */}
        <div className="space-y-6">
          <h4 className="text-lg font-medium">Competitor Analysis</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h5 className="font-medium text-green-800">Competitor Strengths</h5>
              </div>
              <div className="space-y-3">
                {competitorStrengths.map((strength, index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">{strength.name}</span>
                      <span className="text-sm font-medium">{strength.value}%</span>
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${strength.value}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-5 h-5 text-red-600" />
                <h5 className="font-medium text-red-800">Competitor Weaknesses</h5>
              </div>
              <div className="space-y-3">
                {competitorWeaknesses.map((weakness, index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">{weakness.name}</span>
                      <span className="text-sm font-medium">{weakness.value}%</span>
                    </div>
                    <div className="w-full bg-red-200 rounded-full h-2">
                      <div
                        className="bg-red-600 h-2 rounded-full"
                        style={{ width: `${weakness.value}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Competitive Advantages */}
          <div className="bg-indigo-50 rounded-lg p-6 mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-indigo-600" />
              <h5 className="font-medium">Competitive Advantages</h5>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4">
                <h6 className="font-medium mb-2">Market Opportunities</h6>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Underserved customer segments
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Growing market demand
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Digital transformation potential
                  </li>
                </ul>
              </div>
              <div className="bg-white rounded-lg p-4">
                <h6 className="font-medium mb-2">Differentiation Points</h6>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                    Innovative service offerings
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                    Superior customer experience
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                    Strategic location advantages
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}