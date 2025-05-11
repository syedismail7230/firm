import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { LocationMap } from './LocationMap';
import { LocationSearch } from './LocationSearch';
import { LocationAnalysis } from './LocationAnalysis';
import { BestStreetAnalysis } from './BestStreetAnalysis';
import { BusinessRecommendationsSwiper } from './BusinessRecommendationsSwiper';
import { FranchiseOpportunities } from './FranchiseOpportunities';
import { BusinessIdeaAnalysis } from './BusinessIdeaAnalysis';
import { InvestorsList } from './InvestorsList';
import { Download, AlertTriangle } from 'lucide-react';
import { generateDailyData, generateWeeklyData, generateMonthlyData, generateBusinessRecommendations, generateFranchiseRecommendations } from '../utils/dataGenerator';
import { downloadReport } from '../utils/reportGenerator';
import { fetchLocationAnalytics } from '../utils/locationAnalytics';
import type { LocationData, NearbyBusiness } from '../types';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface UserDashboardProps {
  user: User;
}

interface Profile {
  id: string;
  is_approved: boolean;
  is_blurred: boolean;
  subscription?: {
    status: string;
    plan: string;
  };
}

export function UserDashboard({ user }: UserDashboardProps) {
  const [location, setLocation] = useState<LocationData>({
    lat: 28.6139,
    lng: 77.2090,
    name: 'New Delhi, India',
    population: 500000,
    avgIncome: 50000,
    businessDensity: 5,
    competitorCount: 3,
    educationLevel: 75,
    radius: 1
  });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [nearbyBusinesses, setNearbyBusinesses] = useState<NearbyBusiness[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    loadProfile();
  }, [user.id]);

  useEffect(() => {
    loadLocationData();
  }, [location.lat, location.lng, location.radius]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          subscriptions (
            status,
            plan
          )
        `)
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadLocationData = async () => {
    try {
      const data = await fetchLocationAnalytics(location.lat, location.lng, location.radius || 1);
      setAnalytics(data);
      setNearbyBusinesses(data.nearbyBusinesses || []);
      
      // Generate recommendations based on analytics
      const businessRecs = generateBusinessRecommendations(location);
      setRecommendations(businessRecs);
    } catch (error) {
      console.error('Error loading location data:', error);
      toast.error('Failed to load location data');
    }
  };

  const handleLocationSelect = async (lat: number, lng: number, name: string) => {
    const newLocation = {
      ...location,
      lat,
      lng,
      name
    };
    setLocation(newLocation);
  };

  const handleAnalyticsUpdate = (data: any) => {
    setAnalytics(data);
    setNearbyBusinesses(data.nearbyBusinesses || []);
    
    // Update location data based on analytics
    setLocation(prev => ({
      ...prev,
      population: data.population || prev.population,
      avgIncome: data.avgIncome || prev.avgIncome,
      businessDensity: data.businessDensity || prev.businessDensity,
      competitorCount: data.competitorCount || prev.competitorCount,
      educationLevel: data.educationLevel || prev.educationLevel
    }));
  };

  const handleDownloadReport = async () => {
    try {
      toast.promise(
        downloadReport(
          location,
          analytics,
          recommendations,
          nearbyBusinesses,
          [],
          user
        ),
        {
          loading: 'Generating report...',
          success: 'Report downloaded successfully',
          error: 'Failed to generate report'
        }
      );
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to generate report');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!profile?.is_approved) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 rounded-lg p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">Account Pending Approval</h2>
          <p className="text-yellow-600">Your account is currently pending administrator approval. Please check back later.</p>
        </div>
      </div>
    );
  }

  if (profile?.is_blurred) {
    return (
      <div className="container mx-auto px-4 py-8 relative">
        <div className="absolute inset-0 backdrop-blur-md z-10"></div>
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-red-50 rounded-lg p-6 text-center max-w-md">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-800 mb-2">Subscription Inactive</h2>
            <p className="text-red-600">Your subscription has been disabled. Please contact support for assistance.</p>
          </div>
        </div>
        <div className="opacity-50">
          <div className="space-y-8">
            <LocationMap 
              location={location}
              radius={location.radius || 1}
              nearbyBusinesses={nearbyBusinesses}
              onAnalyticsUpdate={handleAnalyticsUpdate}
            />
            <LocationAnalysis location={location} />
            <BestStreetAnalysis location={location} />
            <BusinessIdeaAnalysis location={location} />
            <InvestorsList />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Business Location Analysis</h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <LocationSearch onLocationSelect={handleLocationSelect} />
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <LocationMap 
            location={location}
            radius={location.radius || 1}
            nearbyBusinesses={nearbyBusinesses}
            onAnalyticsUpdate={handleAnalyticsUpdate}
          />
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <LocationAnalysis location={location} />
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <BestStreetAnalysis location={location} />
        </div>

        {recommendations.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <BusinessRecommendationsSwiper recommendations={recommendations} />
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <FranchiseOpportunities location={location} />
        </div>

        <div>
          <BusinessIdeaAnalysis location={location} />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Potential Investors</h2>
          <InvestorsList />
        </div>
      </div>
    </div>
  );
}