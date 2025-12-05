const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);

// ตั้งค่า Socket.io (รองรับรูปภาพ 5MB)
const io = new Server(server, {
    cors: { origin: "*" }, // แก้ปัญหา Cross-Origin เผื่อไว้
    maxHttpBufferSize: 5e6 
});

// ตัวแปรเก็บข้อมูล
let users = {};
let messageHistory = []; 
const HISTORY_LIMIT = 24 * 60 * 60 * 1000; // 24 ชม.

// เสิร์ฟไฟล์ index.html
app.get('/', (req, res) => {
  // ใช้ path.join เพื่อความชัวร์เรื่อง Path ของไฟล์
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log('New connection: ' + socket.id);

  socket.on('join', (callsign) => {
    if (!callsign) return;
    
    users[socket.id] = callsign;
    
    // --- ส่งประวัติเก่า (History) ---
    try {
        const now = Date.now();
        // กรองเอาเฉพาะข้อความที่ไม่หมดอายุ
        messageHistory = messageHistory.filter(item => (now - item.timestamp) < HISTORY_LIMIT);
        
        // ส่งย้อนหลังให้คนใหม่
        messageHistory.forEach(item => {
            socket.emit(item.type, item.data);
        });
    } catch (e) {
        console.error("History Error:", e);
    }
    // ----------------------------

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
      
      // ลบของเก่าทิ้ง (กัน Server หน่วง)
      if (messageHistory.length > 500) { // เก็บแค่ 500 ข้อความล่าสุดพอ (กัน Memory เต็ม)
          messageHistory.shift(); 
      }

      // ส่งให้ทุกคน
      io.emit(type, dataPackage);
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
