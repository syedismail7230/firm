import { createClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  toast.error('Configuration error. Please contact support.');
  throw new Error('Missing Supabase environment variables');
}

// Validate Supabase URL format
try {
  new URL(supabaseUrl);
} catch (e) {
  console.error(`Invalid Supabase URL format: ${supabaseUrl}`);
  toast.error('Invalid configuration. Please contact support.');
  throw new Error(`Invalid Supabase URL format: ${supabaseUrl}`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    }
  }
});

// Improved retry mechanism with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      if (error.message === 'Failed to fetch') {
        toast.error('Network connection issue. Please check your internet connection.');
        throw error;
      }
      
      console.error('Operation failed:', {
        attempt: attempt + 1,
        maxRetries,
        error: {
          message: error.message,
          name: error.name,
          code: error.code,
          status: error?.status,
          details: error?.details
        }
      });

      if (attempt === maxRetries - 1) break;
      
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Test database connection with timeout
export async function testConnection(timeoutMs: number = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .single()
      .abortSignal(controller.signal);
    
    clearTimeout(timeoutId);

    if (error) {
      console.error('Connection test failed:', error);
      return false;
    }

    return true;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('Connection timeout');
      toast.error('Connection timeout. Please try again.');
    } else if (error.message === 'Failed to fetch') {
      console.error('Network connection failed');
      toast.error('Unable to connect. Please check your internet connection.');
    } else {
      console.error('Connection test error:', error);
      toast.error('Connection error. Please try again later.');
    }
    return false;
  }
}

// Enhanced helper function for Supabase queries
export async function supabaseQuery<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  errorMessage: string = 'Database operation failed'
): Promise<T> {
  const isConnected = await testConnection();
  if (!isConnected) {
    throw new Error('Database connection is not available');
  }

  try {
    const { data, error } = await retryWithBackoff(() => operation());
    
    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }
    
    if (!data) {
      throw new Error('No data received');
    }
    
    return data;
  } catch (error: any) {
    if (error.message === 'Failed to fetch') {
      toast.error('Network connection lost. Please check your internet connection.');
    } else {
      toast.error(errorMessage);
    }
    throw error;
  }
}

// Realtime channels store
let channels: Record<string, RealtimeChannel> = {};

export const subscribeToChannel = (
  channelName: string,
  table: string,
  callback: (payload: any) => void,
  filter?: string
) => {
  if (channels[channelName]) {
    channels[channelName].unsubscribe();
  }

  let channel = supabase.channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table,
        filter: filter
      },
      (payload) => {
        console.log('Received real-time update:', payload);
        callback(payload);
        
        const event = payload.eventType;
        const resourceName = table.charAt(0).toUpperCase() + table.slice(1);
        
        if (event === 'INSERT') {
          toast.success(`New ${resourceName} added`);
        } else if (event === 'UPDATE') {
          toast.success(`${resourceName} updated`);
        } else if (event === 'DELETE') {
          toast.success(`${resourceName} removed`);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Subscribed to ${channelName}`);
      }
    });

  channels[channelName] = channel;
  return () => {
    channel.unsubscribe();
    delete channels[channelName];
  };
};

export const unsubscribeFromAllChannels = () => {
  Object.values(channels).forEach(channel => channel.unsubscribe());
  channels = {};
};

export const initializePresence = async (userId: string) => {
  const presenceChannel = supabase.channel('online-users');

  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      console.log('Online users:', state);
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('User joined:', newPresences);
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('User left:', leftPresences);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({ user_id: userId, online_at: new Date().toISOString() });
      }
    });

  return presenceChannel;
};