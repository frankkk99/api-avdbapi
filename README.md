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
