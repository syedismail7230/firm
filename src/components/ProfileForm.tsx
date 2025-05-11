import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, testConnection } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ProfileFormProps {
  user: User;
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  contact_info: {
    email: string;
    phone: string;
    preferred_contact_method: 'email' | 'phone';
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>({
    id: user.id,
    full_name: '',
    avatar_url: '',
    contact_info: {
      email: user.email || '',
      phone: '',
      preferred_contact_method: 'email'
    }
  });

  useEffect(() => {
    loadProfile();
  }, [user.id]);

  async function loadProfile() {
    try {
      setLoading(true);
      
      // Test connection before attempting to load profile
      const isConnected = await testConnection();
      if (!isConnected) {
        toast.error('Unable to connect to the server. Please check your internet connection.');
        return;
      }
      
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
        if (fetchError.message === 'Failed to fetch') {
          toast.error('Network connection lost. Please check your internet connection and try again.');
        } else {
          toast.error('Error loading profile. Please try again.');
        }
        throw fetchError;
      }

      if (!existingProfile) {
        // Profile doesn't exist, create it
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            full_name: user.email?.split('@')[0] || '',
            avatar_url: '',
            contact_info: {
              email: user.email || '',
              phone: '',
              preferred_contact_method: 'email'
            },
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          if (insertError.message === 'Failed to fetch') {
            toast.error('Network connection lost. Please check your internet connection and try again.');
          } else {
            toast.error('Error creating profile. Please try again.');
          }
          throw insertError;
        }
        
        if (newProfile) setProfile(newProfile);
      } else {
        setProfile(existingProfile);
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const isConnected = await testConnection();
      if (!isConnected) {
        toast.error('Unable to connect to the server. Please check your internet connection.');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          contact_info: profile.contact_info,
          updated_at: new Date().toISOString()
        });

      if (error) {
        if (error.message === 'Failed to fetch') {
          toast.error('Network connection lost. Please check your internet connection and try again.');
        } else {
          toast.error('Failed to update profile. Please try again.');
        }
        throw error;
      }

      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Full Name
        </label>
        <input
          type="text"
          value={profile.full_name || ''}
          onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Avatar URL
        </label>
        <input
          type="url"
          value={profile.avatar_url || ''}
          onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="https://example.com/avatar.jpg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          type="email"
          value={profile.contact_info.email}
          onChange={(e) => setProfile({
            ...profile,
            contact_info: { ...profile.contact_info, email: e.target.value }
          })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Phone
        </label>
        <input
          type="tel"
          value={profile.contact_info.phone}
          onChange={(e) => setProfile({
            ...profile,
            contact_info: { ...profile.contact_info, phone: e.target.value }
          })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Preferred Contact Method
        </label>
        <select
          value={profile.contact_info.preferred_contact_method}
          onChange={(e) => setProfile({
            ...profile,
            contact_info: {
              ...profile.contact_info,
              preferred_contact_method: e.target.value as 'email' | 'phone'
            }
          })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="email">Email</option>
          <option value="phone">Phone</option>
        </select>
      </div>

      <button
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Update Profile
      </button>
    </form>
  );
}