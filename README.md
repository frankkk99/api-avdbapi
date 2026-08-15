# AVDB Movie Library

หน้าเว็บสำหรับ `frankkk99/api-avdbapi` ออกแบบเป็น Bento Glass interface โดยข้อมูลสาธารณะทั้งหมดอ่านจาก Supabase ตาราง VIP5 เท่านั้น

## เปิดใช้งาน

เปิด `index.html` ได้โดยตรง หรือเสิร์ฟโฟลเดอร์นี้ด้วย static server เช่น:

```bash
python3 -m http.server 4173
```

## VIP5 data flow

- `/admin/vip5.html` สร้าง Run และดู progress ของการนำเข้า
- `/api/vip5` เป็น serverless API สำหรับอ่านรายการ VIP5 และ action ของ Admin
- `supabase/migrations/20260815103000_create_avdb_vip5.sql` สร้าง `avdb_vip5_items` และ `avdb_vip5_runs`
- หน้าแรกและ `/watch.html` ไม่ใช้ `movie-data.js` หรือรายการใน localStorage เป็น fallback
- `player_page_url` เก็บ URL หน้า Upload18 แบบถาวรเท่านั้น ไม่เก็บ m3u8 หรือ session URL ที่หมดอายุ

### Local runner

การดึงหน้า AVDB จำนวนมากควรรันจาก VPS/aaPanel ที่มี Chromium ไม่ใช่ serverless function:

```bash
cd runner
npm install
cp .env.example .env
# ใส่ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY และ CHROME_EXECUTABLE_PATH ใน environment ของเครื่อง runner
npm start
```

ค่าเริ่มต้นคือ `START_PAGE=1` ถึง `END_PAGE=10262` และ runner จะบันทึก progress หลังทุกหน้า สามารถ resume ด้วย `RUN_ID=<run-id>` เดิมได้

Service role key ต้องอยู่เฉพาะใน runner/Vercel environment ห้ามใส่ใน browser, HTML หรือ GitHub

## Admin control center

เปิด `/admin.html` เพื่อจัดการ:

- Hero, brand, CTA, API status และข้อความ footer
- การ์ดหนัง: เพิ่ม แก้ไข ซ่อน/แสดง ลบ เปลี่ยนประเภท ปี genre metadata และสถานะ
- เปิด/ปิด Hero, stats, library, blueprint และ footer
- Dashboard KPI, กราฟ pipeline และสัดส่วน Movie/Series/Special
- Export/Import configuration เป็น JSON และ reset กลับค่าเริ่มต้น

หมายเหตุ: ส่วนตั้งค่าหน้าตาเดิมยังเก็บใน `localStorage` ของ browser แต่ข้อมูลหนังที่หน้าบ้านแสดงต้องมาจาก Supabase VIP5 เท่านั้น

## Player Control Room

- `/admin/player.html` คือ Admin ย่อยสำหรับเลือกการ์ดและตั้งค่า Manifest, Origin, Referer และ User-Agent
- ใช้ `hlstest-dev2u.vercel.app/embed` เป็น Player engine ซึ่งเชื่อมต่อ server-side proxy ของ repo `frankkk99/hlstest`
- `/watch.html?id=<card-id>` คือหน้าเล่นของการ์ดที่บันทึก Player แล้ว
- ถ้ายังไม่บันทึก Manifest การ์ดจะขึ้น `Player pending` และจะยังไม่พยายามโหลด URL ใด ๆ
- ค่า `HLSTEST_BASE_URL` อยู่ใน `admin/player.js` และ `watch.js` หากย้าย deployment ให้แก้สองจุดนี้
