'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { mapVip5Item } from '@/lib/vip5';

const tabs = [['overview', '◈', 'Overview'], ['content', '▦', 'Content library'], ['data', '↥', 'Data & backup']];

function Brand() {
  return <span className="admin-brand"><span className="brand-mark"><span></span><span></span><span></span></span><span><strong>AVDB</strong><small>CONTROL CENTER</small></span></span>;
}

function Metric({ icon, color, label, value, note }) {
  return <article className="metric-card glass"><span className={`metric-icon ${color}`}>{icon}</span><span className="metric-label">{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

export default function AdminPage() {
  const [activePanel, setActivePanel] = useState('overview');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('กำลังอ่าน VIP5');
  const [toast, setToast] = useState('');

  async function loadItems() {
    try {
      const response = await fetch('/api/vip5?limit=100', { headers: { Accept: 'application/json' } });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      setItems(payload.items.map(mapVip5Item));
      setTotal(payload.total || 0);
      setStatus(`VIP5 updated ${new Date().toLocaleTimeString('th-TH')}`);
    } catch (error) {
      setStatus(error.message || 'VIP5 unavailable');
    }
  }

  useEffect(() => { loadItems(); }, []);

  const visible = items.filter((item) => item.visible !== false).length;
  const ready = items.filter((item) => item.status === 'ready').length;
  const series = items.filter((item) => item.type === 'series').length;
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => !normalized || `${item.title} ${item.code} ${item.genre}`.toLowerCase().includes(normalized));
  }, [items, query]);

  function adminKey() {
    return window.sessionStorage.getItem('avdb-vip5-admin-key') || '';
  }

  async function toggleItem(item) {
    const key = window.prompt('ใส่ AVDB_ADMIN_KEY เพื่อเปลี่ยนสถานะรายการ');
    if (!key) return;
    window.sessionStorage.setItem('avdb-vip5-admin-key', key);
    const response = await fetch('/api/vip5', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-AVDB-Admin-Key': adminKey() }, body: JSON.stringify({ action: 'toggle_item', itemId: item.id, isActive: !item.visible }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) { setToast(payload.error || 'บันทึกไม่สำเร็จ'); return; }
    setToast('อัปเดตสถานะรายการแล้ว');
    loadItems();
  }

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <Link className="admin-brand" href="/"><Brand /></Link>
        <div className="sidebar-status"><i></i> NEXT.JS ADMIN MODE</div>
        <nav className="admin-nav" aria-label="Admin navigation">
          {tabs.map(([key, icon, label]) => <button key={key} className={activePanel === key ? 'active' : ''} type="button" onClick={() => setActivePanel(key)}><span>{icon}</span> {label}</button>)}
        </nav>
        <Link className="admin-player-link" href="/admin/vip5"><span>↻</span> VIP5 AVDB sync <b>↗</b></Link>
        <div className="sidebar-bottom"><Link href="/" target="_blank">เปิดหน้าบ้าน <span>↗</span></Link><small>Next.js · VIP5 source</small></div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar"><div><div className="eyebrow"><span className="eyebrow-dot"></span> AVDB / content operations</div><h1>หน้าควบคุมเว็บไซต์</h1><p>จัดการข้อมูล VIP5 และตรวจสถานะคลังจาก Supabase ใน Next.js</p></div><div className="topbar-actions"><span className="save-status"><i></i> {status}</span><Link className="preview-button" href="/" target="_blank">Preview <span>↗</span></Link></div></header>

        {activePanel === 'overview' && <section className="admin-panel active"><div className="panel-heading"><div><span className="panel-kicker">Command overview</span><h2>ภาพรวมระบบ</h2></div><span className="updated-at">VIP5 / Supabase</span></div><div className="metric-grid"><Metric icon="▦" color="purple" label="การ์ดทั้งหมด" value={total} note="active VIP5 records" /><Metric icon="◉" color="mint" label="แสดงหน้าบ้าน" value={visible} note={`${total ? Math.round(visible / total * 100) : 0}% visibility`} /><Metric icon="✦" color="blue" label="Movie / Series" value={`${items.length - series} / ${series}`} note="latest page loaded" /><Metric icon="↗" color="pink" label="Player readiness" value={`${items.length ? Math.round(ready / items.length * 100) : 0}%`} note={`${ready} records ready`} /></div><div className="quick-actions glass"><div><span className="panel-kicker">Quick actions</span><h3>จัดการด่วน</h3></div><div className="quick-buttons"><Link href="/admin/vip5">เริ่ม Run VIP5</Link><button type="button" onClick={loadItems}>รีเฟรชข้อมูล</button><button type="button" onClick={() => setActivePanel('content')}>เปิดคลังข้อมูล</button></div></div></section>}

        {activePanel === 'content' && <section className="admin-panel active"><div className="panel-heading"><div><span className="panel-kicker">Content operations</span><h2>คลังข้อมูล VIP5</h2></div><Link className="primary-button" href="/admin/vip5">จัดการ Run ↗</Link></div><div className="content-toolbar glass"><label className="admin-search">⌕ <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อเรื่อง, code หรือ genre..." /></label><span className="updated-at">{filtered.length} loaded / {total} total</span></div><div className="table-wrap glass"><table><thead><tr><th>รายการ</th><th>ประเภท</th><th>ปี / Meta</th><th>สถานะ</th><th>หน้าบ้าน</th><th></th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><div className="record-title"><span className="record-thumb">{item.code}</span><div><strong>{item.title}</strong><div className="card-code">{item.id}</div></div></div></td><td><span className="card-type">{item.label}</span></td><td><span className="card-meta">{item.year || '—'}</span><br /><span className="card-meta">{item.meta}</span></td><td><span className={`status-badge ${item.status}`}><i></i>{item.status}</span></td><td><span className={`visibility-dot ${item.visible ? '' : 'off'}`}></span></td><td><button className="secondary-button" type="button" onClick={() => toggleItem(item)}>{item.visible ? 'ซ่อน' : 'แสดง'}</button></td></tr>)}</tbody></table>{!filtered.length && <div className="table-empty">ยังไม่มีรายการ VIP5 หรือไม่พบคำค้นหา</div>}</div></section>}

        {activePanel === 'data' && <section className="admin-panel active"><div className="panel-heading"><div><span className="panel-kicker">Data safety</span><h2>ข้อมูลและการสำรอง</h2></div><span className="updated-at">Supabase source of truth</span></div><div className="backup-grid"><article className="backup-card glass"><span className="backup-icon mint">↻</span><h3>VIP5 ingestion</h3><p>ดึงข้อมูล AVDB ผ่าน Local Runner ที่รองรับ resume จาก Run ID และบันทึกลง Supabase</p><Link className="secondary-button" href="/admin/vip5">เปิดหน้า Sync</Link></article><article className="backup-card glass"><span className="backup-icon blue">▦</span><h3>Public API</h3><p>เว็บสาธารณะอ่านเฉพาะ `avdb_vip5_items` ที่เป็น VIP5 และ active เท่านั้น</p><Link className="secondary-button" href="/api/vip5" target="_blank">ตรวจ API ↗</Link></article><article className="backup-card glass"><span className="backup-icon pink">!</span><h3>Secret boundary</h3><p>Service role และ Admin key ไม่ถูกส่งไป browser และไม่ควร commit ลง GitHub</p><span className="status-badge ready">protected</span></article></div></section>}
      </main>
      {toast && <button className="toast show" type="button" onClick={() => setToast('')}>{toast}</button>}
    </div>
  );
}
