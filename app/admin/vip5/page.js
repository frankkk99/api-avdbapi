'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const RUN_KEY = 'avdb-vip5-run-id';
const ADMIN_KEY = 'avdb-vip5-admin-key';

function escapeText(value) {
  return String(value ?? '');
}

export default function Vip5AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [pageNumber, setPageNumber] = useState('1');
  const [run, setRun] = useState(null);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('ยังไม่ได้เชื่อมต่อ');
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  useEffect(() => {
    setAdminKey(window.sessionStorage.getItem(ADMIN_KEY) || '');
    const savedRun = window.sessionStorage.getItem(RUN_KEY);
    if (savedRun) fetchRun(savedRun);
    loadItems();
    return () => clearInterval(pollRef.current);
  }, []);

  function getKey() {
    return adminKey.trim() || window.sessionStorage.getItem(ADMIN_KEY) || '';
  }

  async function post(payload) {
    const key = getKey();
    const response = await fetch('/api/vip5', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-AVDB-Admin-Key': key }, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }

  async function fetchRun(runId) {
    try {
      const data = await post({ action: 'run_status', runId });
      setRun(data.run);
      setStatus(`อัปเดต ${new Date().toLocaleTimeString('th-TH')}`);
      if (['queued', 'running'].includes(data.run?.status)) {
        clearInterval(pollRef.current);
        pollRef.current = setInterval(() => fetchRun(runId), 5000);
      } else clearInterval(pollRef.current);
    } catch (requestError) {
      setStatus(requestError.message);
    }
  }

  async function createRun() {
    try {
      const key = getKey();
      if (key) window.sessionStorage.setItem(ADMIN_KEY, key);
      const page = Math.max(Number(pageNumber) || 1, 1);
      const data = await post({ action: 'create_run', startPage: page, endPage: page });
      window.sessionStorage.setItem(RUN_KEY, data.run.id);
      setRun(data.run);
      setError('');
      clearInterval(pollRef.current);
      pollRef.current = setInterval(() => fetchRun(data.run.id), 5000);
      setStatus('สร้าง Run แล้ว รอ Local Runner');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function loadItems() {
    try {
      const response = await fetch('/api/vip5?limit=24', { headers: { Accept: 'application/json' } });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
      setItems(data.items || []);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const totalPages = run ? Math.max(Number(run.end_page) - Number(run.start_page) + 1, 0) : 0;
  const scanned = Number(run?.pages_scanned || 0);
  const percent = totalPages ? Math.min(100, Math.round(scanned / totalPages * 100)) : 0;

  return (
    <div className="vip5-shell">
      <header className="vip5-header"><Link className="back-link" href="/admin">← กลับ Admin Control Center</Link><div className="eyebrow"><span className="eyebrow-dot"></span> AVDB / VIP5 ingestion</div><h1>นำเข้าข้อมูล AVDB เข้า VIP5</h1><p>กรอกเลขหน้า AVDB ทีละหน้า แล้วให้ Local Runner ดึง API และบันทึก metadata ลง Supabase</p></header>
      <main>
        <section className="vip5-card"><div className="section-head"><div><span className="panel-kicker">Run configuration</span><h2>สร้างงานนำเข้า</h2></div><span className="source-badge">SOURCE: AVDBAPI</span></div><div className="form-grid"><label>Admin key<input type="password" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} autoComplete="off" placeholder="AVDB_ADMIN_KEY" /></label><label>หน้า AVDB ที่ต้องการดึง<input type="number" min="1" value={pageNumber} onChange={(event) => setPageNumber(event.target.value)} /></label></div><div className="action-row"><button className="primary-button" type="button" onClick={createRun}>สร้าง Run VIP5</button><button className="secondary-button" type="button" onClick={loadItems}>โหลดรายการล่าสุด</button><span className="inline-status">{status}</span></div><p className="security-note">Key นี้เก็บใน session ของแท็บนี้เท่านั้น และส่งเฉพาะไปยัง `/api/vip5`</p></section>
        <section className="vip5-card"><div className="section-head"><div><span className="panel-kicker">Runner status</span><h2>สถานะ Run</h2></div><span className="run-state" data-state={run?.status || ''}>{String(run?.status || 'idle').toUpperCase()}</span></div><div className="run-id">{run ? `Run ID: ${run.id}` : 'ยังไม่มี Run'}</div><div className="progress-track"><span style={{ width: `${percent}%` }}></span></div><div className="progress-label"><span>{scanned} / {totalPages} pages · current {run?.current_page || run?.start_page || 1}</span><span>{percent}%</span></div><div className="stats-grid"><div><small>Pages scanned</small><strong>{scanned}</strong></div><div><small>Items found</small><strong>{run?.items_found || 0}</strong></div><div><small>Items upserted</small><strong>{run?.items_upserted || 0}</strong></div><div><small>Failed pages</small><strong>{run?.failed_pages || 0}</strong></div></div>{(error || run?.last_error) && <p className="run-error">{escapeText(error || run.last_error)}</p>}</section>
        <section className="vip5-card runner-card"><div className="section-head"><div><span className="panel-kicker">Local runner</span><h2>คำสั่งสำหรับ VPS / aaPanel</h2></div><span className="source-badge">SERVICE ROLE ONLY</span></div><p>หน้าเว็บสร้าง Run ทีละหน้า ส่วนการดึงข้อมูลให้รันจากเครื่องที่มี Chromium แล้วกรอกเลขหน้าใหม่เมื่อพร้อม</p><pre><code>cd runner{`\n`}npm install{`\n`}SUPABASE_URL="https://YOUR_PROJECT.supabase.co" \{`\n`}SUPABASE_SECRET_KEY="เก็บไว้ในเครื่อง runner เท่านั้น" \{`\n`}PAGE=3 npm start</code></pre><p className="muted">เปลี่ยนเลข <code>PAGE=3</code> เป็นหน้าที่ต้องการดึง เช่น <code>PAGE=4</code> แล้วรันใหม่</p></section>
        <section className="vip5-card"><div className="section-head"><div><span className="panel-kicker">Public source</span><h2>รายการ VIP5 ล่าสุด</h2></div><span className="source-badge">VIP5 ONLY</span></div><div className="item-list">{items.length ? items.map((item) => <article className="item" key={item.id}><div className="item-code">{item.movie_code || item.external_id}</div><div><div className="item-name">{item.name || item.original_name || 'Untitled'}</div><div className="item-meta">{item.type_name || 'AVDB'} · page {item.source_page_number} · {item.player_status || 'missing'}</div></div>{item.player_page_url ? <a href={item.player_page_url} target="_blank" rel="noreferrer">เปิด source ↗</a> : <span className="muted">ไม่มี player</span>}</article>) : <div className="empty-list">ยังไม่มีข้อมูล VIP5 ใน Supabase</div>}</div></section>
      </main>
    </div>
  );
}
