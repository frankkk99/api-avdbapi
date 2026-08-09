const HLSTEST_BASE_URL = 'https://hlstest-dev2u.vercel.app';
let playerConfig = window.avdbLoadConfig();
let selectedCardId = new URLSearchParams(window.location.search).get('id') || playerConfig.cards[0]?.id || '';

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));
}

function showToast(message) {
  const toast = $('[data-toast]');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2300);
}

function currentCard() {
  return playerConfig.cards.find((card) => card.id === selectedCardId) || playerConfig.cards[0];
}

function buildEmbedUrl(card) {
  if (!card?.playerUrl) return '';
  const url = new URL(`${HLSTEST_BASE_URL}/embed`);
  url.searchParams.set('url', card.playerUrl);
  if (card.playerOrigin) url.searchParams.set('origin', card.playerOrigin);
  if (card.playerReferer) url.searchParams.set('referer', card.playerReferer);
  if (card.playerUserAgent) url.searchParams.set('ua', card.playerUserAgent);
  return url.toString();
}

function populateCards() {
  const select = $('[data-card-select]');
  select.innerHTML = playerConfig.cards.map((card) => `<option value="${escapeHtml(card.id)}">${escapeHtml(card.title)} · ${escapeHtml(card.label)}</option>`).join('');
  select.value = selectedCardId;
  if (!select.value && playerConfig.cards[0]) {
    selectedCardId = playerConfig.cards[0].id;
    select.value = selectedCardId;
  }
}

function loadCardIntoForm() {
  const card = currentCard();
  if (!card) return;
  $('[data-card-select]').value = card.id;
  $('[data-selected-record]').innerHTML = `<span class="record-icon">${escapeHtml(card.code)}</span><span class="record-copy"><strong>${escapeHtml(card.title)}</strong><small>${escapeHtml(card.year || '—')} · ${escapeHtml(card.genre || 'Uncategorized')} · ${escapeHtml(card.status || 'draft')}</small></span>`;
  $('[name="playerUrl"]').value = card.playerUrl || '';
  $('[name="playerOrigin"]').value = card.playerOrigin || 'https://upload18.org';
  $('[name="playerReferer"]').value = card.playerReferer || 'https://upload18.org/';
  $('[name="playerUserAgent"]').value = card.playerUserAgent || '';
  updatePreviewState(false);
}

function updatePreviewState(renderFrame) {
  const card = currentCard();
  const embedUrl = buildEmbedUrl(card);
  const state = $('[data-player-state]');
  const openEmbed = $('[data-open-embed]');
  const urlBox = $('[data-embed-url]');
  const embedCode = $('[data-embed-code]');
  state.textContent = embedUrl ? 'READY TO PLAY' : 'ยังไม่มี URL';
  state.classList.toggle('ready', Boolean(embedUrl));
  openEmbed.href = embedUrl || '#';
  urlBox.textContent = embedUrl || 'ยังไม่มี Player URL';
  embedCode.textContent = embedUrl
    ? `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`
    : 'เมื่อบันทึก Manifest แล้ว ระบบจะแสดง iframe code สำหรับใช้กับหน้า watch';
  if (renderFrame && embedUrl) {
    $('[data-video-frame]').innerHTML = `<iframe src="${embedUrl}" title="HLSTest player preview" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    $('[data-player-message]').textContent = 'กำลังโหลด HLSTest embed player…';
  }
}

function saveCard() {
  const card = currentCard();
  if (!card) return;
  card.playerUrl = $('[name="playerUrl"]').value.trim();
  card.playerOrigin = $('[name="playerOrigin"]').value.trim();
  card.playerReferer = $('[name="playerReferer"]').value.trim();
  card.playerUserAgent = $('[name="playerUserAgent"]').value.trim();
  window.avdbSaveConfig(playerConfig);
  $('[data-save-state]').innerHTML = '<i></i> saved';
  updatePreviewState(false);
  showToast(`บันทึก Player ให้ ${card.title} แล้ว`);
}

$('[data-card-select]').addEventListener('change', (event) => {
  selectedCardId = event.target.value;
  loadCardIntoForm();
  history.replaceState(null, '', `./player.html?id=${encodeURIComponent(selectedCardId)}`);
});
$('[data-save-player]').addEventListener('click', saveCard);
$('[data-preview]').addEventListener('click', () => {
  const card = currentCard();
  if (!card?.playerUrl) {
    showToast('กรุณาใส่ Manifest URL ก่อน Preview');
    return;
  }
  updatePreviewState(true);
});
$('[data-clear-player]').addEventListener('click', () => {
  $('[name="playerUrl"]').value = '';
  saveCard();
  $('[data-video-frame]').innerHTML = '<div class="video-placeholder"><span>▶</span><strong>เลือกการ์ดแล้วกด Preview</strong><small>HLSTest embed player will appear here</small></div>';
});
$('[data-copy-embed]').addEventListener('click', async () => {
  const url = buildEmbedUrl(currentCard());
  if (!url) { showToast('ยังไม่มี Embed URL'); return; }
  await navigator.clipboard.writeText(url);
  showToast('คัดลอก Embed URL แล้ว');
});

populateCards();
loadCardIntoForm();
