const HLSTEST_BASE_URL = 'https://hlstest-dev2u.vercel.app';
const config = window.avdbLoadConfig();
const id = new URLSearchParams(window.location.search).get('id');
const card = config.cards.find((item) => item.id === id);

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));
}

function buildEmbedUrl(item) {
  if (!item?.playerUrl) return '';
  const url = new URL(`${HLSTEST_BASE_URL}/embed`);
  url.searchParams.set('url', item.playerUrl);
  if (item.playerOrigin) url.searchParams.set('origin', item.playerOrigin);
  if (item.playerReferer) url.searchParams.set('referer', item.playerReferer);
  if (item.playerUserAgent) url.searchParams.set('ua', item.playerUserAgent);
  return url.toString();
}

if (card) {
  document.title = `${card.title} · AVDB Player`;
  document.querySelector('[data-watch-title]').textContent = card.title;
  document.querySelector('[data-watch-meta]').textContent = `${card.label} · ${card.meta} · ${card.genre || 'Uncategorized'}`;
  const embedUrl = buildEmbedUrl(card);
  if (embedUrl) {
    document.querySelector('[data-watch-stage]').innerHTML = `<iframe src="${embedUrl}" title="${escapeHtml(card.title)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    document.querySelector('[data-watch-status]').textContent = 'READY';
  } else {
    document.querySelector('[data-watch-status]').textContent = 'PLAYER PENDING';
  }
} else {
  document.querySelector('[data-watch-title]').textContent = 'ไม่พบรายการ';
  document.querySelector('[data-watch-meta]').textContent = 'กรุณากลับไปเลือกการ์ดจากหน้าคลัง';
}
