(function () {
  // The public site is intentionally empty until it loads VIP5 from /api/vip5.
  // Keeping no local records here prevents placeholder or stale JSON from becoming
  // a second source of truth.
  const importedCards = [];

  window.AVDB_STORAGE_KEY = 'avdb-site-config-v1';
  window.AVDB_DEFAULT_CONFIG = {
    version: 2,
    site: { name: 'AVDB', eyebrow: 'MOVIE LIBRARY', footerNote: 'Imported movie records from the AVDB API.' },
    hero: {
      eyebrow: 'AVDB API / VIP5 records',
      lead: 'คลังหนังจริง',
      accent: 'พร้อมดูจากข้อมูล VIP5',
      description: 'การ์ดแนวตั้งจากข้อมูล AVDB API ที่บันทึกใน Supabase VIP5 พร้อมโปสเตอร์ หมวดหมู่ รหัสเรื่อง และ Player source',
      cta: 'เปิดคลังหนัง',
      status: 'VIP5 LIVE',
    },
    stats: [
      { label: 'VIP5 records', value: String(importedCards.length), note: 'records from Supabase VIP5' },
      { label: 'Series records', value: '0', note: 'waiting for VIP5 sync' },
      { label: 'Poster / player', value: '0 / 0', note: 'waiting for VIP5 sync' },
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
        const isCurrentVersion = saved.version >= window.AVDB_DEFAULT_CONFIG.version;
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
          site: isCurrentVersion
            ? { ...window.AVDB_DEFAULT_CONFIG.site, ...(saved.site || {}) }
            : window.avdbClone(window.AVDB_DEFAULT_CONFIG.site),
          hero: isCurrentVersion
            ? { ...window.AVDB_DEFAULT_CONFIG.hero, ...(saved.hero || {}) }
            : window.avdbClone(window.AVDB_DEFAULT_CONFIG.hero),
          sections: { ...window.AVDB_DEFAULT_CONFIG.sections, ...(saved.sections || {}) },
          stats: isCurrentVersion && Array.isArray(saved.stats)
            ? saved.stats
            : window.avdbClone(window.AVDB_DEFAULT_CONFIG.stats),
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
