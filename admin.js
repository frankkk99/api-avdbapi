let adminConfig = window.avdbLoadConfig();
let editingCardId = null;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));
}

function saveConfig(message = 'บันทึกการตั้งค่าแล้ว') {
  window.avdbSaveConfig(adminConfig);
  $('[data-save-status]').innerHTML = '<i></i> บันทึกในเครื่องแล้ว';
  showToast(message);
  renderAll();
}

function showToast(message) {
  const toast = $('[data-toast]');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function getPath(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}

function setPath(object, path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  const target = parts.reduce((result, key) => result[key] ??= {}, object);
  target[last] = value;
}

function renderDashboard() {
  const cards = adminConfig.cards;
  const visible = cards.filter((card) => card.visible !== false).length;
  const movie = cards.filter((card) => card.type === 'movie').length;
  const series = cards.filter((card) => card.type === 'series').length;
  const special = cards.filter((card) => card.type === 'special').length;
  const ready = cards.filter((card) => card.status === 'ready').length;
  const readiness = cards.length ? Math.max(40, Math.round(ready / cards.length * 100)) : 0;
  $('[data-kpi="total"]').textContent = cards.length;
  $('[data-kpi="visible"]').textContent = visible;
  $('[data-kpi="mix"]').textContent = `${String(movie).padStart(2, '0')} / ${String(series).padStart(2, '0')}`;
  $('[data-kpi="readiness"]').textContent = `${readiness}%`;
  $('[data-kpi-note="visible"]').textContent = `${cards.length ? Math.round(visible / cards.length * 100) : 0}% visibility`;
  $('[data-kpi-note="mix"]').textContent = `${special} special records`;
  $('[data-kpi-note="readiness"]').textContent = ready ? `${ready} records ready` : 'API mapping planned';
  $('[data-donut-total]').textContent = cards.length;
  $('[data-updated-at]').textContent = `Last local save · ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;

  const bars = [82, 64, 48, Math.max(10, readiness)];
  $('[data-activity-bars]').innerHTML = bars.map((height) => `<div class="bar-group"><span class="bar" style="height:${height}%"></span><span class="bar" style="height:${Math.max(10, height - 14)}%"></span><span class="bar" style="height:${Math.max(10, height - 28)}%"></span></div>`).join('');
  const total = Math.max(cards.length, 1);
  const movieEnd = Math.round(movie / total * 100);
  const seriesEnd = movieEnd + Math.round(series / total * 100);
  $('[data-category-chart]').style.background = `conic-gradient(var(--violet) 0 ${movieEnd}%, var(--blue) ${movieEnd}% ${seriesEnd}%, var(--pink) ${seriesEnd}% 100%)`;
  $('[data-category-legend]').innerHTML = [['Movies', movie, 'var(--violet)'], ['Series', series, 'var(--blue)'], ['Specials', special, 'var(--pink)']].map(([label, count, color]) => `<div class="legend-item"><i style="background:${color}"></i>${label}<b>${count}</b></div>`).join('');
}

function renderTable() {
  const query = $('[data-card-search]').value.trim().toLowerCase();
  const type = $('[data-card-filter]').value;
  const status = $('[data-status-filter]').value;
  const records = adminConfig.cards.filter((card) => {
    const haystack = `${card.title} ${card.code} ${card.genre}`.toLowerCase();
    return (!query || haystack.includes(query)) && (type === 'all' || card.type === type) && (status === 'all' || card.status === status);
  });
  $('[data-card-list]').innerHTML = records.map((card) => `
    <tr>
      <td><div class="record-title"><span class="record-thumb">${escapeHtml(card.code)}</span><div><strong>${escapeHtml(card.title)}</strong><div class="card-code">${escapeHtml(card.id)}</div></div></div></td>
      <td><span class="card-type">${escapeHtml(card.label)}</span></td>
      <td><span class="card-meta">${escapeHtml(card.year || '—')}</span><br /><span class="card-meta">${escapeHtml(card.meta)}</span></td>
      <td><span class="status-badge ${escapeHtml(card.status)}"><i></i>${escapeHtml(card.status)}</span></td>
      <td><span class="visibility-dot ${card.visible === false ? 'off' : ''}" title="${card.visible === false ? 'ซ่อน' : 'แสดง'}"></span></td>
      <td><div class="row-actions"><button type="button" data-edit-card="${escapeHtml(card.id)}">แก้ไข</button><button type="button" data-toggle-card="${escapeHtml(card.id)}">${card.visible === false ? 'แสดง' : 'ซ่อน'}</button></div></td>
    </tr>
  `).join('');
  $('[data-table-empty]').hidden = records.length !== 0;
}

function renderHomepageForm() {
  $$('[data-setting]').forEach((input) => {
    input.value = getPath(adminConfig, input.dataset.setting) ?? '';
  });
  $('[data-stats-form]').innerHTML = adminConfig.stats.map((stat, index) => `
    <div class="stat-setting"><span>STAT ${String(index + 1).padStart(2, '0')}</span><input data-stat-field="${index}.label" value="${escapeHtml(stat.label)}" aria-label="Stat ${index + 1} label" /><input data-stat-field="${index}.value" value="${escapeHtml(stat.value)}" aria-label="Stat ${index + 1} value" /><input data-stat-field="${index}.note" value="${escapeHtml(stat.note)}" aria-label="Stat ${index + 1} note" /></div>
  `).join('');
}

function renderLayoutForm() {
  $$('[data-section-toggle]').forEach((input) => {
    input.checked = adminConfig.sections[input.dataset.sectionToggle] !== false;
  });
}

function renderJsonPreview() {
  const preview = { ...adminConfig, cards: adminConfig.cards.slice(0, 2), cards_note: `${adminConfig.cards.length} total cards` };
  $('[data-json-preview]').textContent = JSON.stringify(preview, null, 2);
}

function renderAll() {
  renderDashboard();
  renderTable();
  renderHomepageForm();
  renderLayoutForm();
  renderJsonPreview();
}

function openCardEditor(cardId) {
  const card = adminConfig.cards.find((item) => item.id === cardId);
  if (!card) return;
  editingCardId = cardId;
  const form = $('[data-card-form]');
  form.elements.id.value = card.id;
  form.elements.title.value = card.title;
  form.elements.code.value = card.code;
  form.elements.type.value = card.type;
  form.elements.label.value = card.label;
  form.elements.year.value = card.year || '';
  form.elements.genre.value = card.genre || '';
  form.elements.meta.value = card.meta || '';
  form.elements.status.value = card.status || 'waiting';
  form.elements.visible.checked = card.visible !== false;
  $('[data-modal-title]').textContent = `แก้ไข ${card.title}`;
  $('[data-card-modal]').hidden = false;
}

function closeCardEditor() {
  editingCardId = null;
  $('[data-card-modal]').hidden = true;
}

function addCard() {
  const number = adminConfig.cards.length + 1;
  const card = { id: `placeholder-${Date.now()}`, type: 'movie', label: 'Movie', title: `Untitled Feature ${String(number).padStart(2, '0')}`, code: `M / ${String(number).padStart(2, '0')}`, meta: '2026 · metadata pending', year: 2026, genre: 'New', status: 'draft', visible: true };
  adminConfig.cards.unshift(card);
  saveConfig('เพิ่มการ์ดใหม่แล้ว');
  openCardEditor(card.id);
}

function collectHomepageForm() {
  $$('[data-setting]').forEach((input) => setPath(adminConfig, input.dataset.setting, input.value));
  $$('[data-stat-field]').forEach((input) => {
    const [index, key] = input.dataset.statField.split('.');
    adminConfig.stats[Number(index)][key] = input.value;
  });
  saveConfig('อัปเดตข้อความหน้าบ้านแล้ว');
}

$$('[data-panel-link]').forEach((button) => {
  button.addEventListener('click', () => {
    const target = button.dataset.panelLink;
    $$('[data-panel-link]').forEach((item) => item.classList.toggle('active', item === button));
    $$('[data-admin-panel]').forEach((panel) => panel.classList.toggle('active', panel.dataset.adminPanel === target));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

['[data-card-search]', '[data-card-filter]', '[data-status-filter]'].forEach((selector) => $(selector).addEventListener('input', renderTable));
$('[data-card-list]').addEventListener('click', (event) => {
  const edit = event.target.closest('[data-edit-card]');
  const toggle = event.target.closest('[data-toggle-card]');
  if (edit) openCardEditor(edit.dataset.editCard);
  if (toggle) {
    const card = adminConfig.cards.find((item) => item.id === toggle.dataset.toggleCard);
    if (card) { card.visible = card.visible === false; saveConfig(card.visible ? 'แสดงการ์ดบนหน้าบ้านแล้ว' : 'ซ่อนการ์ดจากหน้าบ้านแล้ว'); }
  }
});

$('[data-add-card]').addEventListener('click', addCard);
$('[data-quick="add"]').addEventListener('click', addCard);
$('[data-quick="homepage"]').addEventListener('click', () => $('[data-panel-link="homepage"]').click());
$('[data-quick="backup"]').addEventListener('click', () => $('[data-export]').click());
$('[data-save-homepage]').addEventListener('click', collectHomepageForm);
$$('[data-section-toggle]').forEach((input) => input.addEventListener('change', () => {
  adminConfig.sections[input.dataset.sectionToggle] = input.checked;
  saveConfig('อัปเดตส่วนประกอบหน้าบ้านแล้ว');
}));

$$('[data-close-modal]').forEach((button) => button.addEventListener('click', closeCardEditor));
$('[data-card-modal]').addEventListener('click', (event) => { if (event.target === $('[data-card-modal]')) closeCardEditor(); });
$('[data-card-form]').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const card = adminConfig.cards.find((item) => item.id === editingCardId);
  if (!card) return;
  card.title = form.elements.title.value.trim();
  card.code = form.elements.code.value.trim();
  card.type = form.elements.type.value;
  card.label = form.elements.label.value.trim();
  card.year = Number(form.elements.year.value) || '';
  card.genre = form.elements.genre.value.trim();
  card.meta = form.elements.meta.value.trim();
  card.status = form.elements.status.value;
  card.visible = form.elements.visible.checked;
  saveConfig('บันทึกรายการแล้ว');
  closeCardEditor();
});

$('[data-delete-card]').addEventListener('click', () => {
  const card = adminConfig.cards.find((item) => item.id === editingCardId);
  if (!card) return;
  if (!window.confirm(`ลบ ${card.title} ใช่หรือไม่`)) return;
  adminConfig.cards = adminConfig.cards.filter((item) => item.id !== editingCardId);
  saveConfig('ลบรายการแล้ว');
  closeCardEditor();
});

$('[data-export]').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(adminConfig, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `avdb-config-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('ดาวน์โหลดไฟล์สำรองแล้ว');
});

$('[data-import]').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!imported || !Array.isArray(imported.cards) || !imported.hero || !imported.sections) throw new Error('invalid config');
      adminConfig = imported;
      saveConfig('นำเข้าข้อมูลสำรองแล้ว');
    } catch (error) {
      showToast('ไฟล์ JSON ไม่ตรงกับโครงสร้าง AVDB');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
});

$('[data-reset]').addEventListener('click', () => {
  if (!window.confirm('คืนค่าการ์ดจากข้อมูล AVDB API ทั้งหมดใช่หรือไม่')) return;
  adminConfig = window.avdbClone(window.AVDB_DEFAULT_CONFIG);
  saveConfig('คืนค่าเริ่มต้นแล้ว');
});

window.addEventListener('avdb-config-updated', (event) => {
  adminConfig = event.detail;
  renderAll();
});

renderAll();
