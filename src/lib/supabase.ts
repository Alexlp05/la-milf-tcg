import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://bdcemhqedkskymbnblmb.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseAnon = anonKey ? createClient(url, anonKey) : null;
export const supabaseAdmin = serviceKey ? createClient(url, serviceKey) : supabaseAnon;
export const supabaseUrl = url;
