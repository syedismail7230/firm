import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Users, Bell, Package, Settings, ChevronDown, ChevronUp, Search, Filter, Download, Trash2, Edit, CheckCircle, XCircle, Moon, Sun } from 'lucide-react';
import toast from 'react-hot-toast';

interface AdminPortalProps {
  user: User;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  is_approved: boolean;
  created_at: string;
  subscription?: {
    status: string;
    plan: string;
  };
}

export function AdminPortal({ user }: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'subscriptions' | 'notifications'>('users');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    loadProfiles();
    loadDarkModePreference();
  }, []);

  const loadDarkModePreference = async () => {
    try {
      const { data } = await supabase
        .from('admin_users')
        .select('dark_mode')
        .eq('username', user.email)
        .single();
      
      setDarkMode(data?.dark_mode || false);
      if (data?.dark_mode) {
        document.documentElement.classList.add('dark');
      }
    } catch (error) {
      console.error('Error loading dark mode preference:', error);
    }
  };

  const toggleDarkMode = async () => {
    try {
      const newMode = !darkMode;
      await supabase
        .from('admin_users')
        .update({ dark_mode: newMode })
        .eq('username', user.email);

      setDarkMode(newMode);
      if (newMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      toast.success(`${newMode ? 'Dark' : 'Light'} mode enabled`);
    } catch (error) {
      console.error('Error updating dark mode:', error);
      toast.error('Failed to update theme');
    }
  };

  const checkAdminAccess = async () => {
    try {
      const { data } = await supabase
        .from('admin_users')
        .select('username')
        .eq('username', user.email)
        .single();
      
      setIsAdmin(!!data);
    } catch (error) {
      console.error('Error checking admin access:', error);
      setIsAdmin(false);
    }
  };

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          subscriptions (
            status,
            plan
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
      toast.error('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: true })
        .eq('id', profileId);

      if (error) throw error;
      toast.success('User approved successfully');
      loadProfiles();
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to approve user');
    }
  };

  const handleDeleteUser = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);

      if (error) throw error;
      toast.success('User deleted successfully');
      loadProfiles();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleDisableSubscription = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'inactive' })
        .eq('user_id', profileId);

      if (error) throw error;
      toast.success('Subscription disabled');
      loadProfiles();
    } catch (error) {
      console.error('Error disabling subscription:', error);
      toast.error('Failed to disable subscription');
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to access the admin portal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="bg-gray-50 dark:bg-gray-900 py-12">
        <div className="container mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Portal</h1>
                <div className="flex items-center gap-4">
                  <button
                    onClick={toggleDarkMode}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab('users')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                        activeTab === 'users'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Users className="w-5 h-5" />
                      Users
                    </button>
                    <button
                      onClick={() => setActiveTab('subscriptions')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                        activeTab === 'subscriptions'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Package className="w-5 h-5" />
                      Subscriptions
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending Approval</option>
                    <option value="active">Active Subscription</option>
                    <option value="inactive">Inactive Subscription</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                        <th className="pb-3 font-semibold text-gray-600 dark:text-gray-300">User</th>
                        <th className="pb-3 font-semibold text-gray-600 dark:text-gray-300">Status</th>
                        <th className="pb-3 font-semibold text-gray-600 dark:text-gray-300">Subscription</th>
                        <th className="pb-3 font-semibold text-gray-600 dark:text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiles.map((profile) => (
                        <tr key={profile.id} className="border-b border-gray-100 dark:border-gray-700">
                          <td className="py-4">
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{profile.full_name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</div>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              profile.is_approved
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                              {profile.is_approved ? 'Approved' : 'Pending Approval'}
                            </span>
                          </td>
                          <td className="py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              profile.subscription?.status === 'active'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {profile.subscription?.status || 'No Subscription'}
                            </span>
                          </td>
                          <td className="py-4">
                            <div className="flex gap-2">
                              {!profile.is_approved && (
                                <button
                                  onClick={() => handleApproveUser(profile.id)}
                                  className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded-lg"
                                  title="Approve User"
                                >
                                  <CheckCircle className="w-5 h-5" />
                                </button>
                              )}
                              {profile.subscription?.status === 'active' && (
                                <button
                                  onClick={() => handleDisableSubscription(profile.id)}
                                  className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900 rounded-lg"
                                  title="Disable Subscription"
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteUser(profile.id)}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg"
                                title="Delete User"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}