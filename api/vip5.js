const PUBLIC_FIELDS = [
  'id',
  'vip_bucket',
  'source',
  'source_page_number',
  'external_id',
  'movie_code',
  'name',
  'original_name',
  'slug',
  'type_name',
  'category',
  'year',
  'quality',
  'duration',
  'description',
  'poster_url',
  'thumb_url',
  'player_page_url',
  'player_provider',
  'player_origin',
  'player_referer',
  'player_status',
  'is_active',
  'updated_at',
].join(',');

function env(name) {
  return process.env[name] || '';
}

function supabaseConfig() {
  const baseUrl = env('SUPABASE_URL') || env('NEXT_PUBLIC_SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SECRET_KEY');
  if (!baseUrl || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  return { baseUrl: baseUrl.replace(/\/$/, ''), key };
}

function setCors(res, request) {
  const allowed = env('PUBLIC_ORIGIN');
  const origin = request.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', allowed || origin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-AVDB-Admin-Key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Vary', 'Origin');
}

async function supabaseRequest(path, options = {}) {
  const { baseUrl, key } = supabaseConfig();
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
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

function adminAuthorized(request) {
  const expected = env('AVDB_ADMIN_KEY');
  const provided = request.headers['x-avdb-admin-key'];
  return Boolean(expected && provided && provided === expected);
}

function adminError(res) {
  return res.status(401).json({ ok: false, error: 'Admin key is required' });
}

function safeSearch(value) {
  return String(value || '').replace(/[^\p{L}\p{N} _.-]/gu, '').slice(0, 80);
}

async function listItems(request, response) {
  const url = new URL(request.url, 'http://localhost');
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 24), 1), 100);
  const page = Math.max(Number(url.searchParams.get('page') || 1), 1);
  const offset = (page - 1) * limit;
  const params = new URLSearchParams({
    select: PUBLIC_FIELDS,
    vip_bucket: 'eq.VIP5',
    is_active: 'eq.true',
    order: 'updated_at.desc',
    limit: String(limit),
    offset: String(offset),
  });
  const id = url.searchParams.get('id');
  if (id && /^[0-9a-f-]{36}$/i.test(id)) params.set('id', `eq.${id}`);
  const search = safeSearch(url.searchParams.get('q'));
  if (search) params.set('name', `ilike.*${search}*`);

  const result = await supabaseRequest(`avdb_vip5_items?${params.toString()}`, {
    headers: { Prefer: 'count=exact' },
  });
  const contentRange = result.response.headers.get('content-range') || '';
  const total = Number(contentRange.split('/')[1]) || result.data?.length || 0;
  return response.status(200).json({ ok: true, vip: 'VIP5', page, limit, total, items: result.data || [] });
}

async function adminAction(request, response) {
  if (!adminAuthorized(request)) return adminError(response);
  const body = request.body || {};
  const action = String(body.action || '');

  if (action === 'create_run') {
    const startPage = Math.max(Number(body.startPage || 1), 1);
    const endPage = Math.max(Number(body.endPage || 1), startPage);
    const result = await supabaseRequest('avdb_vip5_runs', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ start_page: startPage, end_page: endPage, current_page: startPage, status: 'queued' }),
    });
    return response.status(201).json({ ok: true, run: result.data?.[0] || null });
  }

  if (action === 'run_status') {
    const runId = String(body.runId || '');
    if (!/^[0-9a-f-]{36}$/i.test(runId)) return response.status(400).json({ ok: false, error: 'Invalid runId' });
    const result = await supabaseRequest(`avdb_vip5_runs?id=eq.${runId}&select=*`);
    return response.status(200).json({ ok: true, run: result.data?.[0] || null });
  }

  if (action === 'toggle_item') {
    const itemId = String(body.itemId || '');
    if (!/^[0-9a-f-]{36}$/i.test(itemId)) return response.status(400).json({ ok: false, error: 'Invalid itemId' });
    const result = await supabaseRequest(`avdb_vip5_items?id=eq.${itemId}&vip_bucket=eq.VIP5`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ is_active: Boolean(body.isActive), updated_at: new Date().toISOString() }),
    });
    return response.status(200).json({ ok: true, item: result.data?.[0] || null });
  }

  return response.status(400).json({ ok: false, error: 'Unknown admin action' });
}

module.exports = async function handler(request, response) {
  setCors(response, request);
  if (request.method === 'OPTIONS') return response.status(204).end();
  try {
    if (request.method === 'GET') return await listItems(request, response);
    if (request.method === 'POST') return await adminAction(request, response);
    return response.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('VIP5 API error', error);
    return response.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Unexpected error' });
  }
};
