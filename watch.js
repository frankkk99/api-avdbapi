const HLSTEST_BASE_URL = 'https://hlstest-dev2u.vercel.app';
const id = new URLSearchParams(window.location.search).get('id');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));
}

function buildEmbedUrl(item) {
  if (!item?.player_page_url) return '';
  const url = new URL(`${HLSTEST_BASE_URL}/embed`);
  url.searchParams.set('url', item.player_page_url);
  if (item.player_origin) url.searchParams.set('origin', item.player_origin);
  if (item.player_referer) url.searchParams.set('referer', item.player_referer);
  return url.toString();
}

async function loadItem() {
  if (!id) return null;
  const response = await fetch(`./api/vip5?id=${encodeURIComponent(id)}`, { headers: { Accept: 'application/json' } });
  const payload = await response.json();
  if (!response.ok || !payload.ok || !payload.items?.[0]) throw new Error(payload.error || 'ไม่พบรายการ VIP5');
  return payload.items[0];
}

async function init() {
  try {
    const item = await loadItem();
    document.title = `${item.name || item.movie_code} · AVDB Player`;
    document.querySelector('[data-watch-title]').textContent = item.name || item.movie_code || item.external_id;
    document.querySelector('[data-watch-meta]').textContent = [item.type_name, item.year, item.duration, item.quality].filter(Boolean).join(' · ');
    const embedUrl = buildEmbedUrl(item);
    if (!embedUrl) throw new Error('รายการนี้ยังไม่มี Upload18 player page');
    document.querySelector('[data-watch-stage]').innerHTML = `<iframe src="${escapeHtml(embedUrl)}" title="${escapeHtml(item.name)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    document.querySelector('[data-watch-status]').textContent = 'VIP5 READY';
  } catch (error) {
    document.querySelector('[data-watch-title]').textContent = 'ไม่พบรายการ VIP5';
    document.querySelector('[data-watch-meta]').textContent = error.message;
    document.querySelector('[data-watch-status]').textContent = 'PLAYER PENDING';
  }
}

init();
