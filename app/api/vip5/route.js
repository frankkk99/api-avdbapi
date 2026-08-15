import { NextResponse } from 'next/server';
import { PUBLIC_FIELDS } from '@/lib/vip5';
import { adminAuthorized, corsHeaders, supabaseRequest } from '@/lib/supabase-rest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(request, payload, status = 200) {
  return NextResponse.json(payload, { status, headers: corsHeaders(request) });
}

function safeSearch(value) {
  return String(value || '').replace(/[^\p{L}\p{N} _.-]/gu, '').slice(0, 80);
}

export async function OPTIONS(request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
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
    return json(request, { ok: true, vip: 'VIP5', page, limit, total, items: result.data || [] });
  } catch (error) {
    console.error('VIP5 GET error', error);
    return json(request, { ok: false, error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
}

export async function POST(request) {
  if (!adminAuthorized(request)) return json(request, { ok: false, error: 'Admin key is required' }, 401);
  try {
    const body = await request.json();
    const action = String(body.action || '');

    if (action === 'create_run') {
      const startPage = Math.max(Number(body.startPage || 1), 1);
      const endPage = Math.max(Number(body.endPage || 1), startPage);
      const result = await supabaseRequest('avdb_vip5_runs', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ start_page: startPage, end_page: endPage, current_page: startPage, status: 'queued' }),
      }, true);
      return json(request, { ok: true, run: result.data?.[0] || null }, 201);
    }

    if (action === 'run_status') {
      const runId = String(body.runId || '');
      if (!/^[0-9a-f-]{36}$/i.test(runId)) return json(request, { ok: false, error: 'Invalid runId' }, 400);
      const result = await supabaseRequest(`avdb_vip5_runs?id=eq.${runId}&select=*`, {}, true);
      return json(request, { ok: true, run: result.data?.[0] || null });
    }

    if (action === 'toggle_item') {
      const itemId = String(body.itemId || '');
      if (!/^[0-9a-f-]{36}$/i.test(itemId)) return json(request, { ok: false, error: 'Invalid itemId' }, 400);
      const result = await supabaseRequest(`avdb_vip5_items?id=eq.${itemId}&vip_bucket=eq.VIP5`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ is_active: Boolean(body.isActive), updated_at: new Date().toISOString() }),
      }, true);
      return json(request, { ok: true, item: result.data?.[0] || null });
    }

    return json(request, { ok: false, error: 'Unknown admin action' }, 400);
  } catch (error) {
    console.error('VIP5 POST error', error);
    return json(request, { ok: false, error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
}
