'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { mapVip5Item } from '@/lib/vip5';

const EMPTY_STATS = [
  { label: 'VIP5 records', value: '0', note: 'records from Supabase VIP5' },
  { label: 'Series records', value: '0', note: 'latest VIP5 page' },
  { label: 'Poster / player', value: '0 / 0', note: 'waiting for VIP5 sync' },
];

function Brand({ footer = false }) {
  return (
    <span className={footer ? 'footer-brand' : 'brand'}>
      <span className="brand-mark"><span></span><span></span><span></span></span>
      <span>
        <strong>{footer ? 'AVDB' : 'AVDB'}</strong>
        {!footer && <small>MOVIE LIBRARY</small>}
      </span>
    </span>
  );
}

function ThemeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v2M12 19v2M3 12h2m14 0h2M5.64 5.64l1.42 1.42m9.9 9.9 1.4 1.4m0-12.72-1.4 1.42m-9.9 9.9-1.42 1.4" /><circle cx="12" cy="12" r="3.5" /></svg>;
}

function StatCard({ stat, index }) {
  const icons = ['✦', '◌', '↗'];
  const colors = ['icon-violet', 'icon-blue', 'icon-mint'];
  return (
    <article className={`stat-card bento-panel ${index === 0 ? 'accent-card' : ''}`}>
      <div className={`stat-icon ${colors[index]}`}>{icons[index]}</div>
      <div><span>{stat.label}</span><strong>{stat.value}</strong></div>
      <small>{stat.note}</small>
    </article>
  );
}

function MovieCard({ movie, index }) {
  const poster = movie.posterUrl || movie.thumbUrl;
  return (
    <article className="movie-card" data-type={movie.type}>
      <div className={`poster-placeholder ${poster ? 'has-poster' : ''}`}>
        {poster && (
          <Image
            className="poster-image"
            src={poster}
            alt={`โปสเตอร์ ${movie.title}`}
            fill
            sizes="(max-width: 700px) 50vw, (max-width: 1000px) 33vw, 220px"
            unoptimized
            onError={(event) => { event.currentTarget.style.display = 'none'; }}
          />
        )}
        <span className="card-index">{String(index + 1).padStart(2, '0')}</span>
        <span className="card-status"><i></i> {movie.status}</span>
        <div className={`poster-wordmark ${poster ? 'poster-fallback' : ''}`}>{movie.code}<small>{movie.label.toUpperCase()}</small></div>
      </div>
      <div className="card-info">
        <h3>{movie.title}</h3>
        <div className="card-meta"><span>{movie.meta}</span><span>{movie.genre || movie.label}</span></div>
        <div className="card-skeleton" aria-hidden="true"></div>
        <div className="card-player-row">
          {movie.playerUrl
            ? <Link className="card-player-link" href={`/watch/${movie.id}`}>▶ ดู Player</Link>
            : <span className="card-player-link pending">Player pending</span>}
        </div>
      </div>
    </article>
  );
}

export default function HomePage() {
  const [movies, setMovies] = useState([]);
  const [total, setTotal] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [warmMode, setWarmMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.classList.toggle('warm-mode', warmMode);
  }, [warmMode]);

  useEffect(() => {
    let active = true;
    fetch('/api/vip5?limit=100', { headers: { Accept: 'application/json' } })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        setMovies(payload.items.map(mapVip5Item));
        setTotal(payload.total || 0);
      })
      .catch((requestError) => {
        if (!active) return;
        setMovies([]);
        setTotal(0);
        setError(requestError.message || 'VIP5 unavailable');
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const stats = useMemo(() => {
    if (!movies.length) return EMPTY_STATS.map((stat, index) => index === 0 ? { ...stat, value: String(total) } : stat);
    const series = movies.filter((movie) => movie.type === 'series').length;
    const posters = movies.filter((movie) => movie.posterUrl || movie.thumbUrl).length;
    const players = movies.filter((movie) => movie.playerUrl).length;
    return [
      { label: 'VIP5 records', value: String(total), note: 'records from Supabase VIP5' },
      { label: 'Series records', value: String(series), note: 'visible records in latest page' },
      { label: 'Poster / player', value: `${posters} / ${players}`, note: 'latest VIP5 records loaded' },
    ];
  }, [movies, total]);

  const counts = useMemo(() => ({
    all: movies.length,
    movie: movies.filter((movie) => movie.type === 'movie').length,
    series: movies.filter((movie) => movie.type === 'series').length,
    special: movies.filter((movie) => movie.type === 'special').length,
  }), [movies]);

  const filteredMovies = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return movies.filter((movie) => {
      const matchesType = activeFilter === 'all' || movie.type === activeFilter;
      const matchesQuery = !normalized || `${movie.title} ${movie.code} ${movie.genre}`.toLowerCase().includes(normalized);
      return matchesType && matchesQuery && movie.visible !== false;
    });
  }, [movies, activeFilter, query]);

  return (
    <>
      <header className="site-header shell">
        <Link href="#top" aria-label="AVDB Movie Library home"><Brand /></Link>
        <nav className="main-nav" aria-label="เมนูหลัก">
          <Link className="active" href="#library">Library</Link>
          <Link href="#blueprint">Data blueprint</Link>
          <Link href="#about">About</Link>
        </nav>
        <div className="header-actions">
          <span className="live-pill"><i></i> <span>{loading ? 'VIP5 SYNCING' : 'VIP5 LIVE'}</span></span>
          <button className="icon-button" type="button" onClick={() => setWarmMode((value) => !value)} aria-label="สลับบรรยากาศสี"><ThemeIcon /></button>
        </div>
      </header>

      <main id="top" className="shell">
        <section className="hero bento-panel" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot"></span> AVDB API / VIP5 records</div>
            <h1 id="hero-title">คลังหนังจริง<br /><em>พร้อมดูจากข้อมูล VIP5</em></h1>
            <p className="hero-description">การ์ดแนวตั้งจากข้อมูล AVDB API ที่บันทึกใน Supabase VIP5 พร้อมโปสเตอร์ หมวดหมู่ รหัสเรื่อง และ Player source</p>
            <div className="hero-cta-row"><Link className="primary-button" href="#library">เปิดคลังหนัง <span>→</span></Link><Link className="text-button" href="#blueprint">ดู data blueprint <span>↗</span></Link></div>
          </div>
          <div className="hero-orbit" aria-label="ตัวอย่างตำแหน่งข้อมูล"><div className="orbit-ring ring-one"></div><div className="orbit-ring ring-two"></div><div className="orbit-core"><span className="core-kicker">SYNC STATUS</span><strong>{loading ? 'SYNCING' : 'VIP5'}</strong><span className="core-line"></span><small>Supabase data layer</small></div><span className="orbit-label label-top">POSTER</span><span className="orbit-label label-right">METADATA</span><span className="orbit-label label-bottom">PLAYER</span></div>
          <div className="hero-signal"><span className="signal-title">Source of truth</span><strong>{error ? 'Check API settings' : 'Supabase VIP5 catalog'}</strong><div className="signal-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
        </section>

        <section className="stats-grid" aria-label="สถิติพื้นที่ข้อมูล">{stats.map((stat, index) => <StatCard key={stat.label} stat={stat} index={index} />)}</section>

        <section id="library" className="library-section">
          <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-dot"></span> VIP5 collection</div><h2>ชั้นวางหนัง <span>/ จาก Supabase</span></h2></div><div className="library-tools"><label className="search-box"><span>⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อเรื่อง..." aria-label="ค้นหาชื่อเรื่อง" /></label></div></div>
          <div className="filter-row" role="tablist" aria-label="ตัวกรองประเภทหนัง">
            {[['all', 'ทั้งหมด'], ['movie', 'Movies'], ['series', 'Series'], ['special', 'Specials']].map(([key, label]) => <button key={key} className={`filter-chip ${activeFilter === key ? 'selected' : ''}`} type="button" onClick={() => setActiveFilter(key)} role="tab">{label} <b>{String(counts[key]).padStart(2, '0')}</b></button>)}
            <span className="filter-note"><i></i> VIP5 only</span>
          </div>
          <div className="movie-grid" aria-live="polite">{filteredMovies.map((movie, index) => <MovieCard key={movie.id} movie={movie} index={index} />)}</div>
          {!loading && filteredMovies.length === 0 && <div className="empty-state"><span>⌁</span><strong>{error ? 'ยังโหลดข้อมูล VIP5 ไม่สำเร็จ' : 'ยังไม่มีรายการในพื้นที่นี้'}</strong><small>{error || 'ลองค้นหาด้วยคำอื่น หรือกลับไปดูทั้งหมด'}</small></div>}
        </section>

        <section id="blueprint" className="blueprint-section"><div className="section-heading compact-heading"><div><div className="eyebrow"><span className="eyebrow-dot"></span> One clean source</div><h2>โครงสร้างพร้อมต่อ API</h2></div><span className="section-count">VIP5 / Supabase / Runner</span></div><div className="blueprint-grid"><article className="blueprint-card bento-panel"><span className="module-number">01</span><div className="module-icon purple">▧</div><h3>Visual identity</h3><p>Poster, title และ metadata ถูกอ่านจาก record เดียวกัน</p><div className="module-progress"><span style={{ width: '100%' }}></span></div><small>connected</small></article><article className="blueprint-card bento-panel"><span className="module-number">02</span><div className="module-icon blue">⌘</div><h3>VIP5 metadata</h3><p>ชื่อเรื่อง ปี ประเภท หมวดหมู่ และ source page อยู่ใน Supabase</p><div className="module-progress"><span style={{ width: '100%' }}></span></div><small>connected</small></article><article className="blueprint-card bento-panel"><span className="module-number">03</span><div className="module-icon mint">▶</div><h3>Player layer</h3><p>เก็บ permanent Upload18 player page ไม่เก็บ session m3u8 ที่หมดอายุ</p><div className="module-progress"><span style={{ width: '76%' }}></span></div><small>resolver ready</small></article><article className="blueprint-card bento-panel blueprint-callout"><span className="callout-orb"></span><span className="module-number">04</span><h3>Run it locally.</h3><p>งาน 10,262 หน้าให้ Local Runner ทำต่อได้จาก progress เดิม</p><Link href="/admin/vip5">เปิด VIP5 Admin <span>→</span></Link></article></div></section>
      </main>

      <footer id="about" className="site-footer shell"><Link href="/" aria-label="AVDB home"><Brand footer /></Link><p>Imported movie records from Supabase VIP5.</p><span className="footer-status"><i></i> System standing by</span><Link className="admin-link" href="/admin">Admin console ↗</Link></footer>
    </>
  );
}
