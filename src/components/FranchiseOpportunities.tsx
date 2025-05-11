import React, { useState, useEffect } from 'react';
import { Building2, DollarSign, TrendingUp, MapPin, Mail, Phone, Globe, Shield, Users, Target } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, EffectCards } from 'swiper/modules';
import type { FranchiseRecommendation } from '../types';
import { generateFranchiseRecommendations } from '../utils/dataGenerator';
import toast from 'react-hot-toast';

interface FranchiseOpportunitiesProps {
  location: LocationData;
}

export function FranchiseOpportunities({ location }: FranchiseOpportunitiesProps) {
  const [franchises, setFranchises] = useState<FranchiseRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFranchises();
  }, [location]);

  const loadFranchises = async () => {
    try {
      setLoading(true);
      const recommendations = generateFranchiseRecommendations(location);
      setFranchises(recommendations);
    } catch (error) {
      console.error('Error loading franchises:', error);
      toast.error('Failed to load franchise opportunities');
    } finally {
      setLoading(false);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-semibold">Franchise Opportunities</h2>
        </div>
        <div className="text-sm text-gray-600">
          Based on location analysis
        </div>
      </div>

      <div className="franchise-swiper-container">
        <Swiper
          modules={[Navigation, Pagination, EffectCards]}
          effect="cards"
          grabCursor={true}
          navigation
          pagination={{ clickable: true }}
          className="franchise-swiper py-8"
          centeredSlides={true}
        >
          {franchises.map((franchise, index) => (
            <SwiperSlide key={index} className="!w-full max-w-2xl">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">{franchise.name}</h3>
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                    {franchise.category}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Investment Required</p>
                        <p className="font-semibold">₹{franchise.investment.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Expected ROI</p>
                        <p className="font-semibold">{franchise.roi}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Market Match</p>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${franchise.marketMatch}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Brand Strength</p>
                        <p className="font-semibold">{franchise.brandStrength}/100</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-semibold mb-2">Key Requirements</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {franchise.requirements.map((req, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg"
                      >
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                        {req}
                      </div>
                    ))}
                  </div>
                </div>

                {franchise.contact && (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-semibold mb-2">Contact Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <a
                        href={`tel:${franchise.contact.phone}`}
                        className="flex items-center gap-2 text-gray-600 hover:text-indigo-600"
                      >
                        <Phone className="w-4 h-4" />
                        <span className="text-sm">{franchise.contact.phone}</span>
                      </a>
                      <a
                        href={`mailto:${franchise.contact.email}`}
                        className="flex items-center gap-2 text-gray-600 hover:text-indigo-600"
                      >
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{franchise.contact.email}</span>
                      </a>
                      <a
                        href={franchise.contact.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-gray-600 hover:text-indigo-600"
                      >
                        <Globe className="w-4 h-4" />
                        <span className="text-sm">Visit Website</span>
                      </a>
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm truncate">{franchise.contact.address}</span>
                      </div>
                    </div>
                  </div>
                )}

                {franchise.advantages && (
                  <div className="border-t border-gray-200 mt-4 pt-4">
                    <h4 className="font-semibold mb-2">Key Advantages</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {franchise.advantages.map((advantage, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-sm text-gray-600 bg-green-50 p-2 rounded-lg"
                        >
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          {advantage}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
}