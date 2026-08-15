# AVDB Movie Library

หน้าเว็บสำหรับ `frankkk99/api-avdbapi` ออกแบบเป็น Bento Glass interface โดยข้อมูลสาธารณะทั้งหมดอ่านจาก Supabase ตาราง VIP5 เท่านั้น

## เปิดใช้งาน

โปรเจกต์ใช้ Next.js App Router และต้องใช้ Node.js 20.9 ขึ้นไป:

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm start
```

## VIP5 data flow

- `/admin/vip5` สร้าง Run และดู progress ของการนำเข้า
- `/api/vip5` เป็น Next.js Route Handler สำหรับอ่านรายการ VIP5 และ action ของ Admin
- `supabase/migrations/20260815103000_create_avdb_vip5.sql` สร้าง `avdb_vip5_items` และ `avdb_vip5_runs`
- หน้าแรกและ `/watch/[id]` ไม่ใช้ไฟล์ JSON/localStorage เป็น fallback
- `player_page_url` เก็บ URL หน้า Upload18 แบบถาวรเท่านั้น ไม่เก็บ m3u8 หรือ session URL ที่หมดอายุ

### Routes

- `/` — Public VIP5 catalog
- `/admin` — Next.js Admin Control Center
- `/admin/vip5` — VIP5 import run control room
- `/watch/<supabase-item-id>` — Player page
- `/api/vip5` — Public read API + admin-only actions

### Local runner

การดึงหน้า AVDB จำนวนมากควรรันจาก VPS/aaPanel ที่มี Chromium ไม่ใช่ serverless function:

```bash
cd runner
npm install
cp .env.example .env
# ใส่ SUPABASE_URL, SUPABASE_SECRET_KEY และ CHROME_EXECUTABLE_PATH ใน environment ของเครื่อง runner
npm start
```

โหมดแนะนำคือดึงทีละหน้าโดยตั้ง `PAGE=3` แล้วเปลี่ยนเป็น `PAGE=4` เมื่อพร้อม Runner จะบันทึก progress และรายการลง Supabase ทุกครั้ง หากต้องการ resume งานเดิม ให้ใช้ `RUN_ID=<run-id>` เดิม

Service role key ต้องอยู่เฉพาะใน runner/Vercel environment ห้ามใส่ใน browser, HTML หรือ GitHub

## Admin control center

หน้า `/admin` อ่านรายการจาก VIP5 โดยตรง แสดง KPI, ค้นหา, ซ่อน/แสดงรายการ และลิงก์ไปหน้า Sync โดยไม่สร้างฐานข้อมูลรายการชุดที่สอง

หน้า `/admin/player` จะ redirect ไป `/admin/vip5` เพื่อรักษาลิงก์เดิมจากระบบก่อนหน้า

## Player

- ใช้ `hlstest-dev2u.vercel.app/embed` เป็น Player engine ซึ่งเชื่อมต่อ server-side proxy ของ repo `frankkk99/hlstest`
- `/watch/<supabase-item-id>` อ่าน `player_page_url` จาก VIP5 แล้วส่งต่อเข้า Player
- ถ้ายังไม่มี Upload18 player page จะไม่พยายามโหลด URL ใด ๆ
