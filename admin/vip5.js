const API_URL = '../api/vip5';
const RUN_KEY = 'avdb-vip5-run-id';
const ADMIN_KEY = 'avdb-vip5-admin-key';
let pollTimer = null;

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function showToast(message) {
  const toast = $('[data-toast]');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function getAdminKey() {
  const input = $('[data-admin-key]');
  const value = input.value.trim() || sessionStorage.getItem(ADMIN_KEY) || '';
  if (value) {
    input.value = value;
    sessionStorage.setItem(ADMIN_KEY, value);
  }
  return value;
}

async function post(payload) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-AVDB-Admin-Key': getAdminKey() },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

function renderRun(run) {
  if (!run) return;
  const total = Math.max(Number(run.end_page) - Number(run.start_page) + 1, 0);
  const scanned = Number(run.pages_scanned || 0);
  const percent = total ? Math.min(100, Math.round(scanned / total * 100)) : 0;
  $('[data-run-id]').textContent = `Run ID: ${run.id}`;
  $('[data-run-state]').textContent = String(run.status || 'unknown').toUpperCase();
  $('[data-run-state]').dataset.state = run.status || '';
  $('[data-progress-bar]').style.width = `${percent}%`;
  $('[data-progress-label]').textContent = `${scanned} / ${total} pages · current ${run.current_page || run.start_page}`;
  $('[data-progress-percent]').textContent = `${percent}%`;
  $('[data-run-pages]').textContent = scanned;
  $('[data-run-found]').textContent = Number(run.items_found || 0);
  $('[data-run-upserted]').textContent = Number(run.items_upserted || 0);
  $('[data-run-failed]').textContent = Number(run.failed_pages || 0);
  const error = $('[data-run-error]');
  error.hidden = !run.last_error;
  error.textContent = run.last_error || '';
  if (['completed', 'failed', 'cancelled'].includes(run.status)) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function refreshRun() {
  const runId = sessionStorage.getItem(RUN_KEY);
  if (!runId) return;
  try {
    const data = await post({ action: 'run_status', runId });
    renderRun(data.run);
    $('[data-admin-status]').textContent = `อัปเดต ${new Date().toLocaleTimeString('th-TH')}`;
  } catch (error) {
    $('[data-admin-status]').textContent = error.message;
  }
}

async function createRun() {
  const startPage = Math.max(Number($('[data-start-page]').value || 1), 1);
  const endPage = Math.max(Number($('[data-end-page]').value || 10262), startPage);
  try {
    $('[data-create-run]').disabled = true;
    const data = await post({ action: 'create_run', startPage, endPage });
    sessionStorage.setItem(RUN_KEY, data.run.id);
    renderRun(data.run);
    clearInterval(pollTimer);
    pollTimer = setInterval(refreshRun, 5000);
    showToast(`สร้าง Run ${data.run.id} แล้ว`);
    await refreshRun();
  } catch (error) {
    showToast(`สร้าง Run ไม่สำเร็จ: ${error.message}`);
  } finally {
    $('[data-create-run]').disabled = false;
  }
}

async function loadItems() {
  const list = $('[data-item-list]');
  list.innerHTML = '<div class="empty-list">กำลังโหลด…</div>';
  try {
    const response = await fetch(`${API_URL}?limit=24`);
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
    list.innerHTML = data.items.length ? data.items.map((item) => `
      <article class="item">
        <div class="item-code">${escapeHtml(item.movie_code || item.external_id)}</div>
        <div><div class="item-name">${escapeHtml(item.name || item.original_name || 'Untitled')}</div><div class="item-meta">${escapeHtml(item.type_name || 'AVDB')} · page ${escapeHtml(item.source_page_number)} · ${escapeHtml(item.player_status || 'missing')}</div></div>
        ${item.player_page_url ? `<a href="${escapeHtml(item.player_page_url)}" target="_blank" rel="noreferrer">เปิด source ↗</a>` : '<span class="muted">ไม่มี player</span>'}
      </article>
    `).join('') : '<div class="empty-list">ยังไม่มีข้อมูล VIP5 ใน Supabase</div>';
    showToast(`โหลด ${data.items.length} รายการจาก VIP5 แล้ว`);
  } catch (error) {
    list.innerHTML = `<div class="empty-list">โหลดไม่สำเร็จ: ${escapeHtml(error.message)}</div>`;
  }
}

$('[data-admin-key]').value = sessionStorage.getItem(ADMIN_KEY) || '';
$('[data-create-run]').addEventListener('click', createRun);
$('[data-load-items]').addEventListener('click', loadItems);
refreshRun();
loadItems();
