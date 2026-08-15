const DEFAULT_SUPABASE_URL = 'https://qlunnckudeynhruxzpnb.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_R2p_bYC1at8xYOdHS1ktGw_Ef6TLPMh';

function env(name) {
  return process.env[name] || '';
}

function getConfig(requireServiceRole = false) {
  const baseUrl = env('SUPABASE_URL') || env('NEXT_PUBLIC_SUPABASE_URL') || DEFAULT_SUPABASE_URL;
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SECRET_KEY');
  const publicKey = env('SUPABASE_PUBLISHABLE_KEY') || env('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  const key = requireServiceRole ? serviceKey : (serviceKey || publicKey);
  if (!key) throw new Error(requireServiceRole ? 'SUPABASE_SERVICE_ROLE_KEY is required' : 'Supabase public configuration is required');
  return { baseUrl: baseUrl.replace(//$/, ''), key };
}

export async function supabaseRequest(path, options = {}, requireServiceRole = false) {
  const { baseUrl, key } = getConfig(requireServiceRole);
  const headers = {
    apikey: key,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  // New sb_publishable_/sb_secret_ keys are opaque and must not be sent
  // as a Bearer token. Legacy anon/service_role JWT keys still need it.
  if (!key.startsWith('sb_')) headers.Authorization = `Bearer ${key}`;

  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...options,
    headers,
    cache: 'no-store',
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!response.ok) {
    const detail = data?.message || data?.hint || data?.details || text || `HTTP ${response.status}`;
    throw new Error(`Supabase ${response.status}: ${detail}`);
  }
  return { data, response };
}

export function adminAuthorized(request) {
  const expected = env('AVDB_ADMIN_KEY');
  const provided = request.headers.get('x-avdb-admin-key');
  return Boolean(expected && provided && provided === expected);
}

export function corsHeaders(request) {
  const allowed = env('PUBLIC_ORIGIN');
  const origin = request.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': allowed || origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-AVDB-Admin-Key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin',
  };
}
