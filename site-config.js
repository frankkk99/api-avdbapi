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
  ];

  window.AVDB_STORAGE_KEY = 'avdb-site-config-v1';
  window.AVDB_DEFAULT_CONFIG = {
    version: 1,
    site: { name: 'AVDB', eyebrow: 'MOVIE LIBRARY', footerNote: 'Placeholder interface for the next movie data layer.' },
    hero: {
      eyebrow: 'Content system / v.01',
      lead: 'เรื่องราวดี ๆ',
      accent: 'กำลังเดินทางมา',
      description: 'พื้นที่สำหรับคลังหนังที่ออกแบบไว้รอข้อมูลจริงจาก API — ค้นหา จัดหมวดหมู่ และต่อยอดได้ในโครงสร้างเดียวกัน',
      cta: 'สำรวจคลังตัวอย่าง',
      status: 'API READY',
    },
    stats: [
      { label: 'Movie slots', value: '12', note: 'reserved placeholders' },
      { label: 'Series slots', value: '08', note: 'episodes ready to map' },
      { label: 'Data points', value: '40+', note: 'metadata fields planned' },
    ],
    sections: { hero: true, stats: true, library: true, blueprint: true, footer: true },
    cards,
  };

  window.avdbClone = function (value) {
    return JSON.parse(JSON.stringify(value));
  };

  window.avdbLoadConfig = function () {
    try {
      const saved = JSON.parse(localStorage.getItem(window.AVDB_STORAGE_KEY));
      if (saved && Array.isArray(saved.cards)) return saved;
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
