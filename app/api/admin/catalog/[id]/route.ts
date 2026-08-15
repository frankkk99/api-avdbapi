import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-api';
import { getCatalogDb, isCatalogConfigured } from '@/lib/hlshub-catalog';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function validId(value) { return /^[0-9a-f-]{36}$/i.test(value); }
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ ok: false, error: 'ต้องเข้าสู่ระบบแอดมิน' }, { status: 401 });
  if (!isCatalogConfigured()) return NextResponse.json({ ok: false, error: 'ยังไม่ได้ตั้งค่า Supabase Secret Key' }, { status: 503 });
  const id = String((await context.params).id || '');
  if (!validId(id)) return NextResponse.json({ ok: false, error: 'รหัสเรื่องไม่ถูกต้อง' }, { status: 400 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 }); }
  if (typeof body.isActive !== 'boolean') return NextResponse.json({ ok: false, error: 'ต้องระบุ isActive เป็น boolean' }, { status: 400 });
  const db = getCatalogDb();
  const response = await db.from('avdb_vip5_items').update({ is_active: body.isActive, updated_at: new Date().toISOString() }).eq('id', id).eq('vip_bucket', 'VIP5').select('id,is_active').maybeSingle();
  if (response.error) return NextResponse.json({ ok: false, error: response.error.message }, { status: 500 });
  if (!response.data) return NextResponse.json({ ok: false, error: 'ไม่พบรายการนี้' }, { status: 404 });
  return NextResponse.json({ ok: true, item: response.data }, { headers: { 'Cache-Control': 'no-store' } });
}
