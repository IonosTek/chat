const express = require('express');
const path = require('path');
const app = express();

// --- ส่วนสำคัญสำหรับการแก้ Error 500 บน Render ---
// Render จะส่ง Port มาให้ผ่าน process.env.PORT
// ถ้าไม่มี (เช่นรันในคอมตัวเอง) ให้ใช้ 3000
const port = process.env.PORT || 3000;

// 1. ตั้งค่าให้ Server เรียกใช้ไฟล์ Static (HTML, CSS, JS ฝั่งหน้าเว็บ)
// ถ้าไฟล์ index.html ของคุณอยู่นอกโฟลเดอร์ public ให้เปลี่ยนเป็น: app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// 2. Route หลัก (เมื่อเข้าเว็บมา ให้ส่งไฟล์ index.html ไปแสดง)
app.get('/', (req, res) => {
    // ตรวจสอบ path ให้ตรงกับที่เก็บไฟล์ index.html ของคุณ
    res.sendFile(path.join(__dirname, 'public', 'index.html')); 
});

// 3. เริ่มต้น Server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
