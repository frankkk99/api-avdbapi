'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const HLSTEST_BASE_URL = 'https://hlstest-dev2u.vercel.app';

function buildEmbedUrl(item) {
  if (!item?.player_page_url) return '';
  const url = new URL(`${HLSTEST_BASE_URL}/embed`);
  url.searchParams.set('url', item.player_page_url);
  if (item.player_origin) url.searchParams.set('origin', item.player_origin);
  if (item.player_referer) url.searchParams.set('referer', item.player_referer);
  return url.toString();
}

export default function WatchClient({ id }) {
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/vip5?id=${encodeURIComponent(id)}`, { headers: { Accept: 'application/json' } })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.ok || !payload.items?.[0]) throw new Error(payload.error || 'ไม่พบรายการ VIP5');
        return payload.items[0];
      })
      .then(setItem)
      .catch((requestError) => setError(requestError.message || 'ไม่พบรายการ VIP5'));
  }, [id]);

  const embedUrl = buildEmbedUrl(item);
  return (
    <main className="watch-shell">
      <header className="watch-header"><Link href="/">← กลับหน้าคลัง</Link><span>AVDB PLAYER / VIP5</span><Link href="/admin/vip5">VIP5 Admin ↗</Link></header>
      <section className="watch-stage">{embedUrl ? <iframe src={embedUrl} title={item.name || item.movie_code} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="no-referrer" /> : <div className="watch-empty"><span>▶</span><h1>{error || 'กำลังโหลดรายการ VIP5…'}</h1><p>{error ? 'กรุณากลับไปเลือกการ์ดจากหน้าคลัง' : 'กำลังอ่านข้อมูลจาก Supabase'}</p></div>}</section>
      <section className="watch-info"><div><span className="watch-kicker">Now playing / VIP5 library</span><h2>{item?.name || (error ? 'ไม่พบรายการ VIP5' : 'กำลังโหลด…')}</h2><p>{item ? [item.type_name, item.year, item.duration, item.quality].filter(Boolean).join(' · ') : error}</p></div><span className="watch-status">{embedUrl ? 'VIP5 READY' : 'PLAYER PENDING'}</span></section>
    </main>
  );
}
