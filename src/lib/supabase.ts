import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables (VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY)');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types for Application
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  subscription_plan: 'free' | 'pro';
  note_limit: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string; 
  tenant_id: string;
  email: string;
  role: 'admin' | 'member';
  created_at: string;
  updated_at: string;
  tenant?: Tenant; 
}

export interface Note {
  id: string;
  title: string;
  content: string;
  user_id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  profile?: UserProfile;
  tenant?: Tenant;
}
