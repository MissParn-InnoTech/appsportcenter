# ACT Sport Center — Resource Intelligence

ระบบจัดการครุภัณฑ์ศูนย์กีฬา โรงเรียนอัสสัมชัญธนบุรี
Backend: Google Sheets ผ่าน Apps Script Web App (ดู `Code.gs` แยกต่างหาก)

## รันทดสอบในเครื่อง

```bash
npm install
npm run dev
```

เปิด http://localhost:5173

## Build สำหรับ production

```bash
npm run build
```

ไฟล์ที่ build แล้วจะอยู่ในโฟลเดอร์ `dist/`

## Deploy ขึ้น Vercel

**วิธีที่ 1 — ผ่านเว็บ Vercel (ง่ายที่สุด)**
1. อัปโหลดโฟลเดอร์นี้ทั้งหมดขึ้น GitHub (สร้าง repo ใหม่แล้ว push เข้าไป)
2. เข้า https://vercel.com/new เลือก **Import Git Repository** แล้วเลือก repo นี้
3. Vercel จะตรวจพบว่าเป็นโปรเจกต์ **Vite** เอง — ใช้ค่าเริ่มต้นได้เลย (Build Command: `npm run build`, Output Directory: `dist`)
4. กด **Deploy**

**วิธีที่ 2 — ผ่าน Vercel CLI (ไม่ต้องใช้ GitHub)**
```bash
npm i -g vercel
vercel          # deploy แบบ preview ครั้งแรก จะถามตั้งค่าโปรเจกต์
vercel --prod   # deploy ขึ้น production จริง
```

## แก้ไข URL เชื่อมต่อ Google Sheets

ถ้าต้อง deploy Apps Script (`Code.gs`) ใหม่แล้วได้ URL ใหม่ ให้แก้ที่ตัวแปร
`API_URL` บนบรรทัดต้น ๆ ของไฟล์ `src/App.jsx` แล้ว build/deploy ใหม่อีกครั้ง
