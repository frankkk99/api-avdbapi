export function categoryNames(value) {
  if (!Array.isArray(value)) return value ? String(value) : '';
  return value
    .map((item) => typeof item === 'string' ? item : item?.name || item?.title || '')
    .filter(Boolean)
    .join(' · ');
}

export function mapVip5Item(item) {
  const typeName = String(item.type_name || 'AVDB');
  const type = /series|tv|ซีรีส์|电视剧/i.test(typeName)
    ? 'series'
    : /special|พิเศษ/i.test(typeName)
      ? 'special'
      : 'movie';
  const playerUrl = item.player_page_url || '';
  return {
    id: item.id,
    type,
    label: typeName,
    title: item.name || item.original_name || item.movie_code || item.external_id,
    code: item.movie_code || item.external_id,
    meta: [item.year, item.duration, item.quality].filter(Boolean).join(' · ') || 'VIP5 metadata',
    year: item.year || '',
    genre: categoryNames(item.category) || typeName,
    status: playerUrl && item.player_status !== 'broken' ? 'ready' : 'waiting',
    visible: item.is_active !== false,
    posterUrl: item.poster_url || '',
    thumbUrl: item.thumb_url || '',
    playerUrl,
    playerOrigin: item.player_origin || 'https://upload18.org',
    playerReferer: item.player_referer || 'https://upload18.org/',
    sourcePageUrl: item.source_page_url || '',
    playerStatus: item.player_status || 'missing',
  };
}

export const PUBLIC_FIELDS = [
  'id', 'vip_bucket', 'source', 'source_page_url', 'source_page_number',
  'external_id', 'movie_code', 'name', 'original_name', 'slug', 'type_name',
  'category', 'year', 'quality', 'duration', 'description', 'poster_url',
  'thumb_url', 'player_page_url', 'player_provider', 'player_origin',
  'player_referer', 'player_status', 'is_active', 'updated_at',
].join(',');
