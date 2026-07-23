import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const plaidClientId = process.env.PLAID_CLIENT_ID!;
const plaidSecret = process.env.PLAID_SECRET!;
const plaidEnvironment = process.env.PLAID_ENV ?? 'sandbox';
const encryptionKey = process.env.PLAID_TOKEN_ENCRYPTION_KEY!;

function requireEnvironment() {
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !plaidClientId || !plaidSecret || !encryptionKey) {
    throw new Error('Plaid integration is not configured.');
  }
}

export async function authenticatedUser(request: Request) {
  requireEnvironment();
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Unauthorized');
  const client = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error('Unauthorized');
  return data.user;
}

export function adminSupabase() {
  requireEnvironment();
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function plaid(path: string, body: Record<string, unknown>) {
  requireEnvironment();
  const base = plaidEnvironment === 'production' ? 'https://production.plaid.com' : plaidEnvironment === 'development' ? 'https://development.plaid.com' : 'https://sandbox.plaid.com';
  const response = await fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: plaidClientId, secret: plaidSecret, ...body }) });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error_message ?? 'Plaid request failed');
  return json;
}

export function encryptToken(token: string) {
  const key = Buffer.from(encryptionKey, 'base64');
  if (key.length !== 32) throw new Error('PLAID_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${encrypted.toString('base64')}`;
}

export function decryptToken(payload: string) {
  const key = Buffer.from(encryptionKey, 'base64');
  const [ivText, tagText, dataText] = payload.split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivText, 'base64'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataText, 'base64')), decipher.final()]).toString('utf8');
}
