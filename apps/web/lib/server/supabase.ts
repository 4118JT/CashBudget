import { createClient, type User } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return { url, anonKey };
}

export function getSupabaseAdmin() {
  const { url } = getSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getSupabaseAuth() {
  const { url, anonKey } = getSupabaseConfig();
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const [kind, token] = header.split(' ');
  if (kind?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

export async function requireUser(request: NextRequest): Promise<User> {
  const token = getBearerToken(request);
  if (!token) throw new Error('Missing Authorization bearer token');
  const { data, error } = await getSupabaseAuth().auth.getUser(token);
  if (error || !data.user) throw new Error('Unauthorized');
  return data.user;
}
