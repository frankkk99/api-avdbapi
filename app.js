const placeholderMovies = [
  { type: 'movie', label: 'Movie', title: 'Untitled Feature 01', code: 'M / 01', meta: '2026 · 2h 08m' },
  { type: 'movie', label: 'Movie', title: 'Untitled Feature 02', code: 'M / 02', meta: '2026 · 1h 54m' },
  { type: 'series', label: 'Series', title: 'Untitled Series 01', code: 'S / 01', meta: 'S01 · 08 EP' },
  { type: 'special', label: 'Special', title: 'Untitled Special 01', code: 'X / 01', meta: 'Special · 4K' },
  { type: 'series', label: 'Series', title: 'Untitled Series 02', code: 'S / 02', meta: 'S01 · 10 EP' },
  { type: 'movie', label: 'Movie', title: 'Untitled Feature 03', code: 'M / 03', meta: '2026 · 2h 21m' },
  { type: 'special', label: 'Special', title: 'Untitled Special 02', code: 'X / 02', meta: 'Special · 16:9' },
  { type: 'movie', label: 'Movie', title: 'Untitled Feature 04', code: 'M / 04', meta: '2025 · 1h 48m' },
  { type: 'series', label: 'Series', title: 'Untitled Series 03', code: 'S / 03', meta: 'S02 · 06 EP' },
  { type: 'movie', label: 'Movie', title: 'Untitled Feature 05', code: 'M / 05', meta: '2025 · 2h 02m' },
  { type: 'series', label: 'Series', title: 'Untitled Series 04', code: 'S / 04', meta: 'S01 · 12 EP' },
  { type: 'movie', label: 'Movie', title: 'Untitled Feature 06', code: 'M / 06', meta: '2026 · 1h 39m' },
];

const grid = document.querySelector('[data-movie-grid]');
const emptyState = document.querySelector('[data-empty-state]');
const searchInput = document.querySelector('[data-search]');
let activeFilter = 'all';

function cardTemplate(movie, index) {
  return `
    <article class="movie-card" data-type="${movie.type}" data-title="${movie.title.toLowerCase()}">
      <div class="poster-placeholder">
        <span class="card-index">${String(index + 1).padStart(2, '0')}</span>
        <span class="card-status"><i></i> waiting</span>
        <div class="poster-wordmark">${movie.code}<small>${movie.label.toUpperCase()} / PLACEHOLDER</small></div>
      </div>
      <div class="card-info">
        <h3>${movie.title}</h3>
        <div class="card-meta"><span>${movie.meta}</span><span>•••</span></div>
        <div class="card-skeleton" aria-hidden="true"></div>
      </div>
    </article>
  `;
}

function renderMovies() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = placeholderMovies.filter((movie) => {
    const matchesFilter = activeFilter === 'all' || movie.type === activeFilter;
    const matchesSearch = !query || movie.title.toLowerCase().includes(query) || movie.code.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  grid.innerHTML = filtered.map((movie) => cardTemplate(movie, placeholderMovies.indexOf(movie))).join('');
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

renderMovies();
