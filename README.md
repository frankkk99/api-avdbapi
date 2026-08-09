# AVDB Movie Library

หน้าเว็บ static สำหรับ `frankkk99/api-avdbapi` ออกแบบเป็น Bento Glass interface พร้อมการ์ดหนังแนวตั้งแบบ placeholder เพื่อรอเชื่อมข้อมูลจริงจาก API

## เปิดใช้งาน

เปิด `index.html` ได้โดยตรง หรือเสิร์ฟโฟลเดอร์นี้ด้วย static server เช่น:

```bash
python3 -m http.server 4173
```

## จุดที่เตรียมไว้สำหรับต่อ API

- `placeholderMovies` ใน `app.js` คือจุดแทนที่ด้วยข้อมูลจาก API
- การ์ดรองรับ `movie`, `series` และ `special`
- `data-type`, `data-title` ใช้ต่อยอดกับระบบ filter/search ได้
- โครงสร้าง metadata แยก poster, title, year, duration/episode และ player status
- ไม่มีภาพภายนอกหรือ asset ที่ต้องโหลดเพิ่ม การ์ดใช้ CSS placeholder ทั้งหมด

## Admin control center

เปิด `/admin.html` เพื่อจัดการ:

- Hero, brand, CTA, API status และข้อความ footer
- การ์ดหนัง: เพิ่ม แก้ไข ซ่อน/แสดง ลบ เปลี่ยนประเภท ปี genre metadata และสถานะ
- เปิด/ปิด Hero, stats, library, blueprint และ footer
- Dashboard KPI, กราฟ pipeline และสัดส่วน Movie/Series/Special
- Export/Import configuration เป็น JSON และ reset กลับค่าเริ่มต้น

หมายเหตุ: เวอร์ชันนี้เป็น static admin ที่เก็บค่าใน `localStorage` ของ browser เดียวกัน จึงเหมาะสำหรับทำโครงและทดสอบหน้าเว็บก่อน หากต้องการให้แอดมินหลายเครื่องเห็นข้อมูลร่วมกัน ต้องต่อฐานข้อมูลและระบบ Auth จริงในขั้นถัดไป

## Player Control Room

- `/admin/player.html` คือ Admin ย่อยสำหรับเลือกการ์ดและตั้งค่า Manifest, Origin, Referer และ User-Agent
- ใช้ `hlstest-dev2u.vercel.app/embed` เป็น Player engine ซึ่งเชื่อมต่อ server-side proxy ของ repo `frankkk99/hlstest`
- `/watch.html?id=<card-id>` คือหน้าเล่นของการ์ดที่บันทึก Player แล้ว
- ถ้ายังไม่บันทึก Manifest การ์ดจะขึ้น `Player pending` และจะยังไม่พยายามโหลด URL ใด ๆ
- ค่า `HLSTEST_BASE_URL` อยู่ใน `admin/player.js` และ `watch.js` หากย้าย deployment ให้แก้สองจุดนี้
