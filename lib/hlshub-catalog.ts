import { createClient } from '@supabase/supabase-js';

export type CatalogItem = {
  id: string;
  canonicalUrl: string;
  code: string | null;
  slug: string | null;
  title: string | null;
  originalTitle: string | null;
  synopsis: string | null;
  releaseDate: string | null;
  durationSeconds: number | null;
  language: string | null;
  isSeries: boolean;
  lastSeenAt: string | null;
  coverUrl: string | null;
  playerStatus: 'pass' | 'blocked' | 'error' | 'expired' | 'unknown' | null;
  playerType: 'hls' | 'mp4' | 'embed' | 'unknown' | null;
  playerPageUrl: string | null;
  mediaUrl: string | null;
  origin: string | null;
  referer: string | null;
  provider: string | null;
  isActive: boolean;
  hasPlayer: boolean;
  sourceCount: number;
};

export type CatalogDetail = CatalogItem & {
  images: Array<{ kind: string; url: string; sortOrder: number }>;
  localizations: Array<{ locale: string; title: string | null; originalTitle: string | null; synopsis: string | null }>;
  people: Array<{ name: string; role: string; profileUrl: string | null }>;
  terms: Array<{ name: string; type: string; url: string | null }>;
};

export type AdminCatalogFilter = 'all' | 'ready' | 'no-player' | 'broken' | 'unknown';
export type AdminCatalogOverview = {
  configured: boolean;
  activeTitles: number;
  hiddenTitles: number;
  readyTitles: number;
  noPlayerTitles: number;
  brokenTitles: number;
  unknownTitles: number;
  movieTitles: number;
  seriesTitles: number;
  sourceCount: number;
  sourceStatus: Record<'pass' | 'blocked' | 'error' | 'expired' | 'unknown', number>;
  lastCheckedAt: string;
};

let client;
function config() {
  return {
    url: process.env.SUPABASE_URL || process.env.HLSHUB_SUPABASE_URL || 'https://qlunnckudeynhruxzpnb.supabase.co',
    key: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.HLSHUB_SUPABASE_SERVICE_ROLE_KEY || '',
  };
}
export function isCatalogConfigured() { return Boolean(config().key); }
export function getCatalogDb() {
  const value = config();
  if (!value.key) return null;
  client ||= createClient(value.url, value.key, { auth: { autoRefreshToken: false, persistSession: false } });
  return client;
}
function statusOf(value) {
  if (value === 'active') return 'pass';
  if (value === 'broken') return 'error';
  if (value === 'expired') return 'expired';
  if (value === 'missing' || value === 'unverified') return 'unknown';
  return null;
}
function mapItem(row) {
  const playerUrl = row.player_page_url || null;
  const typeName = String(row.type_name || '');
  return {
    id: String(row.id),
    canonicalUrl: row.source_page_url || row.api_url,
    code: row.movie_code || row.external_id || null,
    slug: row.slug || null,
    title: row.name || null,
    originalTitle: row.original_name || null,
    synopsis: row.description || null,
    releaseDate: row.year || null,
    durationSeconds: null,
    language: null,
    isSeries: /series|tv|ซีรีส์|电视剧/i.test(typeName),
    lastSeenAt: row.updated_at || null,
    coverUrl: row.poster_url || row.thumb_url || null,
    playerStatus: statusOf(row.player_status),
    playerType: playerUrl ? 'embed' : null,
    playerPageUrl: playerUrl,
    mediaUrl: null,
    origin: row.player_origin || null,
    referer: row.player_referer || null,
    provider: row.player_provider || null,
    isActive: row.is_active !== false,
    hasPlayer: Boolean(playerUrl),
    sourceCount: playerUrl ? 1 : 0,
  };
}
function applyFilter(query, filter) {
  if (filter === 'ready') return query.eq('player_status', 'active');
  if (filter === 'no-player') return query.is('player_page_url', null);
  if (filter === 'broken') return query.in('player_status', ['broken', 'expired']);
  if (filter === 'unknown') return query.in('player_status', ['unverified', 'missing']);
  return query;
}
function baseQuery(db) {
  return db.from('avdb_vip5_items').select('*', { count: 'exact' }).eq('vip_bucket', 'VIP5');
}
function addCommon(query, options) {
  const active = options.active || 'active';
  if (active !== 'all') query = query.eq('is_active', active === 'active');
  if (options.filter) query = applyFilter(query, options.filter);
  const search = String(options.search || '').replace(/[%,()]/g, ' ').trim();
  if (search) query = query.or('name.ilike.%' + search + '%,movie_code.ilike.%' + search + '%,original_name.ilike.%' + search + '%,external_id.ilike.%' + search + '%');
  if (options.sort === 'title') query = query.order('name', { ascending: true, nullsFirst: false });
  else if (options.sort === 'release') query = query.order('year', { ascending: false, nullsFirst: false });
  else query = query.order('updated_at', { ascending: false, nullsFirst: false });
  return query;
}
export async function fetchAdminCatalogPage(options) {
  const db = getCatalogDb();
  if (!db) throw new Error('ยังไม่ได้ตั้งค่า SUPABASE_SECRET_KEY');
  const from = Math.max(0, (options.page - 1) * options.limit);
  const to = from + options.limit - 1;
  const response = await addCommon(baseQuery(db), options).range(from, to);
  if (response.error) throw new Error(response.error.message);
  return { items: (response.data || []).map(mapItem), total: response.count || 0 };
}
export async function fetchCatalogPage(options) {
  return fetchAdminCatalogPage({ page: options.page, limit: options.limit, search: options.search, sort: options.sort, active: 'active', filter: options.readyOnly ? 'ready' : 'all' });
}
export async function fetchAdminCatalogOverview() {
  const db = getCatalogDb();
  if (!db) return { configured: false, activeTitles: 0, hiddenTitles: 0, readyTitles: 0, noPlayerTitles: 0, brokenTitles: 0, unknownTitles: 0, movieTitles: 0, seriesTitles: 0, sourceCount: 0, sourceStatus: { pass: 0, blocked: 0, error: 0, expired: 0, unknown: 0 }, lastCheckedAt: new Date().toISOString() };
  const response = await db.from('avdb_vip5_items').select('id,type_name,player_status,player_page_url,is_active').eq('vip_bucket', 'VIP5').range(0, 9999);
  if (response.error) throw new Error(response.error.message);
  const rows = response.data || [];
  const sourceStatus = { pass: 0, blocked: 0, error: 0, expired: 0, unknown: 0 };
  let readyTitles = 0, noPlayerTitles = 0, brokenTitles = 0, unknownTitles = 0, movieTitles = 0, seriesTitles = 0, activeTitles = 0, hiddenTitles = 0;
  for (const row of rows) {
    const active = row.is_active !== false;
    active ? activeTitles++ : hiddenTitles++;
    /series|tv|ซีรีส์|电视剧/i.test(String(row.type_name || '')) ? seriesTitles++ : movieTitles++;
    const status = statusOf(row.player_status);
    sourceStatus[status || 'unknown']++;
    if (status === 'pass') readyTitles++;
    else if (status === 'error' || status === 'expired') brokenTitles++;
    else if (row.player_page_url) unknownTitles++;
    else noPlayerTitles++;
  }
  return { configured: true, activeTitles, hiddenTitles, readyTitles, noPlayerTitles, brokenTitles, unknownTitles, movieTitles, seriesTitles, sourceCount: rows.filter((row) => row.player_page_url).length, sourceStatus, lastCheckedAt: new Date().toISOString() };
}
export async function fetchCatalogDetail(id) {
  const db = getCatalogDb();
  if (!db) throw new Error('ยังไม่ได้ตั้งค่า SUPABASE_SECRET_KEY');
  const response = await db.from('avdb_vip5_items').select('*').eq('vip_bucket', 'VIP5').eq('id', id).maybeSingle();
  if (response.error) throw new Error(response.error.message);
  if (!response.data) return null;
  const item = mapItem(response.data);
  return { ...item, images: [response.data.poster_url, response.data.thumb_url].filter(Boolean).map((url, index) => ({ kind: index ? 'thumb' : 'cover', url, sortOrder: index })), localizations: [], people: [], terms: [] };
}
