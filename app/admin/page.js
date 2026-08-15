'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AdminShell from './admin-shell';
import styles from './admin.module.css';

const emptyOverview = {
  configured: false, activeTitles: 0, hiddenTitles: 0, readyTitles: 0, noPlayerTitles: 0,
  brokenTitles: 0, unknownTitles: 0, movieTitles: 0, seriesTitles: 0, sourceCount: 0,
  sourceStatus: {}, lastCheckedAt: '',
};

export default function AdminPage() {
  const [overview, setOverview] = useState(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function load() {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/overview', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.overview) throw new Error(data.error || 'อ่านข้อมูลภาพรวมไม่สำเร็จ');
      setOverview(data.overview);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'อ่านข้อมูลภาพรวมไม่สำเร็จ');
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const readyPercent = useMemo(() => overview.activeTitles ? Math.round((overview.readyTitles / overview.activeTitles) * 100) : 0, [overview]);
  const sourceTotal = Math.max(1, overview.sourceCount);
  return <AdminShell title="ระบบหลังบ้าน" description="HLS Test Control Room สำหรับจัดการและตรวจสอบข้อมูล AVDB VIP5">
    {loading ? <div className={styles.loading}>กำลังอ่านสถานะจากฐานข้อมูล...</div> : error ? <div className={styles.error}>{error} <button className={styles.button} type="button" onClick={() => void load()}>ลองใหม่</button></div> : <>
      <section className={styles.metricGrid}>
        <article className={styles.metric}><span>รายการเปิดใช้งาน</span><strong>{overview.activeTitles.toLocaleString()}</strong><small>VIP5 ที่อยู่ในระบบ</small></article>
        <article className={styles.metric}><span>พร้อมรับชม</span><strong className={styles.good}>{overview.readyTitles.toLocaleString()}</strong><small>{readyPercent}% ของรายการเปิดใช้งาน</small></article>
        <article className={styles.metric}><span>ไม่มี Player</span><strong className={styles.warn}>{overview.noPlayerTitles.toLocaleString()}</strong><small>ยังไม่มีหน้า Player</small></article>
        <article className={styles.metric}><span>Player มีปัญหา</span><strong className={styles.bad}>{overview.brokenTitles.toLocaleString()}</strong><small>broken / expired</small></article>
        <article className={styles.metric}><span>ถูกซ่อน</span><strong className={styles.blue}>{overview.hiddenTitles.toLocaleString()}</strong><small>ไม่แสดงใน catalog</small></article>
        <article className={styles.metric}><span>รายการทั้งหมด</span><strong>{overview.sourceCount.toLocaleString()}</strong><small>source ที่ตรวจพบ</small></article>
      </section>
      <section className={styles.sectionGrid}>
        <div className={styles.panel}><div className={styles.panelHeader}><div><h2>ทางลัดจัดการ</h2><p>ใช้เครื่องมือแบบเดียวกับ HLS Test</p></div><button className={styles.button} type="button" onClick={() => void load()}>รีเฟรช</button></div>
          <div className={styles.linkGrid}>
            <Link className={styles.actionCard} href="/admin/catalog"><strong>จัดการรายการ VIP5</strong><span>ค้นหา กรอง ซ่อน/แสดงรายการ</span></Link>
            <Link className={styles.actionCard} href="/admin/test-all"><strong>ทดสอบหนังทั้งหมด</strong><span>ตรวจ manifest, segment และการเริ่มเล่น</span></Link>
            <Link className={styles.actionCard} href="/admin/health"><strong>ตรวจ Player Health</strong><span>ดู PASS, blocked, error, expired และ unknown</span></Link>
            <Link className={styles.actionCard} href="/admin/tools"><strong>เครื่องมือเดิม</strong><span>AVDB Import, Bulk Test, Extractor และ Embed Test</span></Link>
            <Link className={styles.actionCard} href="/admin/vip5"><strong>นำเข้า AVDB VIP5</strong><span>กรอกเลขหน้าแล้วรันทีละหน้า</span></Link>
            <Link className={styles.actionCard} href="/admin/system"><strong>ตรวจระบบ</strong><span>ดูสถานะฐานข้อมูลและเส้นทางหลัก</span></Link>
          </div>
        </div>
        <div className={styles.panel}><div className={styles.panelHeader}><div><h2>สถานะ Player</h2><p>นับจาก player_status ใน VIP5</p></div></div>
          <div className={styles.barList}>{[['pass','PASS'],['blocked','BLOCKED'],['error','ERROR'],['expired','EXPIRED'],['unknown','UNKNOWN']].map(([key,label]) => <div className={styles.barRow} key={key}><span>{label}</span><div className={styles.barTrack}><span style={{ width: Math.min(100, ((overview.sourceStatus[key] || 0) / sourceTotal) * 100) + '%' }} /></div><strong>{overview.sourceStatus[key] || 0}</strong></div>)}</div>
        </div>
      </section>
    </>}
  </AdminShell>;
}
