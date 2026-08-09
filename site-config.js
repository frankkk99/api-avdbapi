(function () {
  const cards = [
    { id: 'movie-01', type: 'movie', label: 'Movie', title: 'Untitled Feature 01', code: 'M / 01', meta: '2026 · 2h 08m', year: 2026, genre: 'Drama', status: 'waiting', visible: true },
    { id: 'movie-02', type: 'movie', label: 'Movie', title: 'Untitled Feature 02', code: 'M / 02', meta: '2026 · 1h 54m', year: 2026, genre: 'Action', status: 'waiting', visible: true },
    { id: 'series-01', type: 'series', label: 'Series', title: 'Untitled Series 01', code: 'S / 01', meta: 'S01 · 08 EP', year: 2026, genre: 'Mystery', status: 'waiting', visible: true },
    { id: 'special-01', type: 'special', label: 'Special', title: 'Untitled Special 01', code: 'X / 01', meta: 'Special · 4K', year: 2026, genre: 'Special', status: 'waiting', visible: true },
    { id: 'series-02', type: 'series', label: 'Series', title: 'Untitled Series 02', code: 'S / 02', meta: 'S01 · 10 EP', year: 2025, genre: 'Sci-Fi', status: 'waiting', visible: true },
    { id: 'movie-03', type: 'movie', label: 'Movie', title: 'Untitled Feature 03', code: 'M / 03', meta: '2026 · 2h 21m', year: 2026, genre: 'Thriller', status: 'waiting', visible: true },
    { id: 'special-02', type: 'special', label: 'Special', title: 'Untitled Special 02', code: 'X / 02', meta: 'Special · 16:9', year: 2025, genre: 'Documentary', status: 'waiting', visible: true },
    { id: 'movie-04', type: 'movie', label: 'Movie', title: 'Untitled Feature 04', code: 'M / 04', meta: '2025 · 1h 48m', year: 2025, genre: 'Romance', status: 'waiting', visible: true },
    { id: 'series-03', type: 'series', label: 'Series', title: 'Untitled Series 03', code: 'S / 03', meta: 'S02 · 06 EP', year: 2025, genre: 'Drama', status: 'waiting', visible: true },
    { id: 'movie-05', type: 'movie', label: 'Movie', title: 'Untitled Feature 05', code: 'M / 05', meta: '2025 · 2h 02m', year: 2025, genre: 'Comedy', status: 'waiting', visible: true },
    { id: 'series-04', type: 'series', label: 'Series', title: 'Untitled Series 04', code: 'S / 04', meta: 'S01 · 12 EP', year: 2026, genre: 'Drama', status: 'waiting', visible: true },
    { id: 'movie-06', type: 'movie', label: 'Movie', title: 'Untitled Feature 06', code: 'M / 06', meta: '2026 · 1h 39m', year: 2026, genre: 'Action', status: 'waiting', visible: true },
  ].map((card) => ({
    ...card,
    playerUrl: '',
    playerOrigin: 'https://upload18.org',
    playerReferer: 'https://upload18.org/',
    playerUserAgent: '',
  }));

  const importedCards = Array.isArray(window.AVDB_IMPORTED_MOVIES) && window.AVDB_IMPORTED_MOVIES.length
    ? window.AVDB_IMPORTED_MOVIES
    : cards;
  const importedSeries = importedCards.filter((card) => card.type === 'series').length;
  const importedPlayers = importedCards.filter((card) => Boolean(card.playerUrl)).length;
  const importedPosters = importedCards.filter((card) => Boolean(card.posterUrl || card.thumbUrl)).length;

  window.AVDB_STORAGE_KEY = 'avdb-site-config-v1';
  window.AVDB_DEFAULT_CONFIG = {
    version: 2,
    site: { name: 'AVDB', eyebrow: 'MOVIE LIBRARY', footerNote: 'Imported movie records from the AVDB API.' },
    hero: {
      eyebrow: 'AVDB API / imported records',
      lead: 'คลังหนังจริง',
      accent: 'พร้อมดูจากข้อมูล API',
      description: 'การ์ดแนวตั้งจากข้อมูล AVDB API พร้อมโปสเตอร์ หมวดหมู่ รหัสเรื่อง และ Player ที่เชื่อมต่อผ่าน HLSTest',
      cta: 'เปิดคลังหนัง',
      status: 'DATA SYNCED',
    },
    stats: [
      { label: 'Imported records', value: String(importedCards.length), note: 'records from attached JSON' },
      { label: 'Series records', value: String(importedSeries), note: 'episode records detected' },
      { label: 'Poster / player', value: `${importedPosters} / ${importedPlayers}`, note: 'ready for the front end' },
    ],
    sections: { hero: true, stats: true, library: true, blueprint: true, footer: true },
    cards: importedCards,
  };

  window.avdbClone = function (value) {
    return JSON.parse(JSON.stringify(value));
  };

  window.avdbLoadConfig = function () {
    try {
      const saved = JSON.parse(localStorage.getItem(window.AVDB_STORAGE_KEY));
      if (saved && Array.isArray(saved.cards)) {
        const savedById = new Map(saved.cards.map((card) => [card.id, card]));
        const importedIds = new Set(window.AVDB_DEFAULT_CONFIG.cards.map((card) => card.id));
        const mergedCards = window.AVDB_DEFAULT_CONFIG.cards.map((card) => ({
          ...card,
          ...(savedById.get(card.id) || {}),
        }));
        const customCards = saved.version >= window.AVDB_DEFAULT_CONFIG.version
          ? saved.cards.filter((card) => !importedIds.has(card.id))
          : [];
        return {
          ...window.avdbClone(window.AVDB_DEFAULT_CONFIG),
          ...saved,
          version: window.AVDB_DEFAULT_CONFIG.version,
          site: { ...window.AVDB_DEFAULT_CONFIG.site, ...(saved.site || {}) },
          hero: { ...window.AVDB_DEFAULT_CONFIG.hero, ...(saved.hero || {}) },
          sections: { ...window.AVDB_DEFAULT_CONFIG.sections, ...(saved.sections || {}) },
          stats: Array.isArray(saved.stats) ? saved.stats : window.avdbClone(window.AVDB_DEFAULT_CONFIG.stats),
          cards: [...mergedCards, ...customCards],
        };
      }
    } catch (error) {
      console.warn('AVDB config could not be loaded.', error);
    }
    return window.avdbClone(window.AVDB_DEFAULT_CONFIG);
  };

  window.avdbSaveConfig = function (config) {
    localStorage.setItem(window.AVDB_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('avdb-config-updated', { detail: config }));
  };
})();
