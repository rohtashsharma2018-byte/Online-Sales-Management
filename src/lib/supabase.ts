import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured = supabaseUrl && supabaseUrl.startsWith('http') && supabaseAnonKey && supabaseAnonKey !== 'your-anon-key';

if (!isConfigured) {
  console.warn("Supabase credentials missing or invalid. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.");
}

// Ensure URL is valid or fallback to a placeholder that doesn't crash createClient
const validUrl = isConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co';
const validKey = isConfigured ? supabaseAnonKey : 'placeholder-key';

export const supabase = createClient(validUrl, validKey);

// Mark if we are in mock mode to allow components to handle it
export const isSupabaseConfigured = isConfigured;
