let siteConfig = window.avdbLoadConfig();
let activeFilter = 'all';

const grid = document.querySelector('[data-movie-grid]');
const emptyState = document.querySelector('[data-empty-state]');
const searchInput = document.querySelector('[data-search]');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));
}

function hydrateHome() {
  const { site, hero, stats, sections } = siteConfig;
  document.querySelector('[data-site-name]').textContent = site.name;
  document.querySelector('[data-site-eyebrow]').textContent = site.eyebrow;
  document.querySelector('[data-footer-name]').textContent = site.name;
  document.querySelector('[data-footer-note]').textContent = site.footerNote;
  document.querySelector('[data-hero-eyebrow]').textContent = hero.eyebrow;
  document.querySelector('[data-hero-lead]').textContent = hero.lead;
  document.querySelector('[data-hero-accent]').textContent = hero.accent;
  document.querySelector('[data-hero-description]').textContent = hero.description;
  document.querySelector('[data-hero-cta]').textContent = hero.cta;
  document.querySelector('[data-hero-status]').textContent = hero.status;

  stats.forEach((stat, index) => {
    const label = document.querySelector(`[data-stat-label="${index}"]`);
    const value = document.querySelector(`[data-stat-value="${index}"]`);
    const note = document.querySelector(`[data-stat-note="${index}"]`);
    if (label) label.textContent = stat.label;
    if (value) value.textContent = stat.value;
    if (note) note.textContent = stat.note;
  });

  document.querySelectorAll('[data-section]').forEach((section) => {
    section.hidden = sections[section.dataset.section] === false;
  });
  updateFilterCounts();
  renderMovies();
}

function updateFilterCounts() {
  const visibleCards = siteConfig.cards.filter((card) => card.visible !== false);
  const counts = visibleCards.reduce((result, card) => {
    result[card.type] = (result[card.type] || 0) + 1;
    return result;
  }, {});
  document.querySelector('[data-filter="all"] b').textContent = String(visibleCards.length).padStart(2, '0');
  ['movie', 'series', 'special'].forEach((type) => {
    const count = document.querySelector(`[data-filter="${type}"] b`);
    if (count) count.textContent = String(counts[type] || 0).padStart(2, '0');
  });
}

function cardTemplate(movie, index) {
  const safeStatus = escapeHtml(movie.status || 'waiting');
  const playerReady = Boolean(movie.playerUrl);
  const playerAction = playerReady
    ? `<a class="card-player-link" href="./watch.html?id=${encodeURIComponent(movie.id)}">▶ ดู Player</a>`
    : '<span class="card-player-link pending">Player pending</span>';
  return `
    <article class="movie-card" data-type="${escapeHtml(movie.type)}" data-title="${escapeHtml(movie.title.toLowerCase())}">
      <div class="poster-placeholder">
        <span class="card-index">${String(index + 1).padStart(2, '0')}</span>
        <span class="card-status"><i></i> ${safeStatus}</span>
        <div class="poster-wordmark">${escapeHtml(movie.code)}<small>${escapeHtml(movie.label).toUpperCase()} / PLACEHOLDER</small></div>
      </div>
      <div class="card-info">
        <h3>${escapeHtml(movie.title)}</h3>
        <div class="card-meta"><span>${escapeHtml(movie.meta)}</span><span>•••</span></div>
        <div class="card-skeleton" aria-hidden="true"></div>
        <div class="card-player-row">${playerAction}</div>
      </div>
    </article>
  `;
}

function renderMovies() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = siteConfig.cards.filter((movie) => {
    if (movie.visible === false) return false;
    const matchesFilter = activeFilter === 'all' || movie.type === activeFilter;
    const matchesSearch = !query || movie.title.toLowerCase().includes(query) || movie.code.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  grid.innerHTML = filtered.map((movie) => cardTemplate(movie, siteConfig.cards.indexOf(movie))).join('');
  emptyState.hidden = filtered.length !== 0;
}

document.querySelectorAll('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle('selected', item === button));
    renderMovies();
  });
});

searchInput.addEventListener('input', renderMovies);

document.querySelectorAll('[data-view]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach((item) => item.classList.toggle('selected', item === button));
    grid.classList.toggle('compact', button.dataset.view === 'compact');
  });
});

document.querySelector('[data-theme-toggle]').addEventListener('click', () => {
  document.body.classList.toggle('warm-mode');
});

window.addEventListener('storage', (event) => {
  if (event.key === window.AVDB_STORAGE_KEY) {
    siteConfig = window.avdbLoadConfig();
    hydrateHome();
  }
});

window.addEventListener('avdb-config-updated', (event) => {
  siteConfig = event.detail;
  hydrateHome();
});

hydrateHome();
