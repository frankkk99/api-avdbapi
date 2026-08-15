import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-api';
import { getCatalogDb, isCatalogConfigured } from '@/lib/hlshub-catalog';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function idsOf(value) { return [...new Set(Array.isArray(value) ? value.map(String).filter((id) => /^[0-9a-f-]{36}$/i.test(id)) : [])].slice(0, 500); }
async function setVisibility(db, ids, isActive) {
  if (!ids.length) return 0;
  const response = await db.from('avdb_vip5_items').update({ is_active: isActive, updated_at: new Date().toISOString() }).in('id', ids).eq('vip_bucket', 'VIP5').select('id');
  if (response.error) throw new Error(response.error.message);
  return response.data?.length || ids.length;
}
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ ok: false, error: 'ต้องเข้าสู่ระบบแอดมิน' }, { status: 401 });
  if (!isCatalogConfigured()) return NextResponse.json({ ok: false, error: 'ยังไม่ได้ตั้งค่า Supabase Secret Key' }, { status: 503 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, error: 'ข้อมูลคำสั่งไม่ถูกต้อง' }, { status: 400 }); }
  if (body.action !== 'show-only-passed' && body.action !== 'repair-failed') return NextResponse.json({ ok: false, error: 'ไม่รู้จักคำสั่งหลังเทส' }, { status: 400 });
  const ids = idsOf(body.ids), passedIds = idsOf(body.passedIds).filter((id) => ids.includes(id)), failedIds = idsOf(body.failedIds).filter((id) => ids.includes(id));
  if (!ids.length) return NextResponse.json({ ok: false, error: 'ไม่พบรายการสำหรับทำรายการ' }, { status: 400 });
  const db = getCatalogDb();
  try {
    const shown = body.action === 'show-only-passed' ? await setVisibility(db, passedIds, true) : 0;
    const movedToRepair = body.action === 'show-only-passed' ? await setVisibility(db, ids.filter((id) => !passedIds.includes(id)), false) : await setVisibility(db, failedIds, false);
    return NextResponse.json({ ok: true, updated: { shown, movedToRepair } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'ทำรายการหลังเทสไม่สำเร็จ' }, { status: 500 }); }
}
