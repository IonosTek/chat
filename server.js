const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);

// ตั้งค่า Socket.io ให้รองรับรูปภาพขนาดใหญ่ (5MB)
const io = new Server(server, {
    cors: { origin: "*" }, 
    maxHttpBufferSize: 5e6 
});

// ตัวแปรเก็บข้อมูล
let users = {};
let messageHistory = []; 
const HISTORY_LIMIT = 24 * 60 * 60 * 1000; // 24 ชม.

// เสิร์ฟไฟล์ index.html
app.get('/', (req, res) => {
  // ใช้ path นี้เพื่อความชัวร์
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log('New connection: ' + socket.id);

  socket.on('join', (callsign) => {
    // ถ้าไม่มีชื่อ หรือชื่อว่าง ให้หยุดทำงาน
    if (!callsign) return;
    
    users[socket.id] = callsign;
    
    // --- ระบบส่งประวัติเก่า (ใส่ระบบกัน Server ล่มไว้) ---
    try {
        const now = Date.now();
        // กรองเอาเฉพาะข้อความที่ไม่หมดอายุ
        messageHistory = messageHistory.filter(item => (now - item.timestamp) < HISTORY_LIMIT);
        
        // ส่งย้อนหลังให้คนใหม่
        messageHistory.forEach(item => {
            if(item.type && item.data) {
                socket.emit(item.type, item.data);
            }
        });
    } catch (e) {
        console.error("History Error (Server ไม่พัง):", e);
    }
    // ------------------------------------------------

    io.emit('user list', Object.values(users));
    
    // แจ้งเตือน System
    const time = new Date().toISOString().slice(11, 16);
    io.emit('chat message', { 
        time: time, 
        user: 'SYSTEM', 
        msg: `${callsign} has joined the frequency.` 
    });
  });

  // รับข้อความ
  socket.on('chat message', (msg) => {
    if (!msg) return;
    processMessage('chat message', msg, socket);
  });

  // รับรูปภาพ
  socket.on('chat image', (imgData) => {
    if (!imgData) return;
    processMessage('chat image', imgData, socket);
  });

  // ฟังก์ชั่นกลางสำหรับจัดการข้อความและบันทึกประวัติ
  function processMessage(type, content, socket) {
      try {
          const now = Date.now();
          const time = new Date().toISOString().slice(11, 16);
          const callsign = users[socket.id] || 'Guest';
          
          let dataPackage;
          if (type === 'chat message') {
              dataPackage = { time: time, user: callsign, msg: content };
          } else {
              dataPackage = { time: time, user: callsign, image: content };
          }

          // บันทึกลงประวัติ
          messageHistory.push({ type: type, data: dataPackage, timestamp: now });
          
          // ลบของเก่าทิ้ง (กัน Server หน่วง) ถ้าเยอะเกิน 500 ข้อความ
          if (messageHistory.length > 500) { 
              messageHistory.shift(); 
          }

          // ส่งให้ทุกคน
          io.emit(type, dataPackage);
      } catch (err) {
          console.error("Processing Error:", err);
      }
  }

  socket.on('disconnect', () => {
    if (users[socket.id]) {
        io.emit('user list', Object.values(users));
        delete users[socket.id];
    }
  });
});

// รัน Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
