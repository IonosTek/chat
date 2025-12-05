const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);

// รองรับไฟล์ภาพขนาดใหญ่สุด 5MB
const io = new Server(server, {
    maxHttpBufferSize: 5 * 1024 * 1024 
});

let users = {};

// [1] สร้างกล่องเก็บความจำ (Array)
let messageHistory = []; 
const HISTORY_LIMIT = 24 * 60 * 60 * 1000; // 24 ชั่วโมง (หน่วยมิลลิวินาที)

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log('New connection established');

  socket.on('join', (callsign) => {
    // Prevent empty callsigns
    if (!callsign) return;
    
    users[socket.id] = callsign;
    
    // [2] คนใหม่เข้ามา -> ส่งประวัติเก่าให้ดูทันที (Replay History)
    // กรองเอาเฉพาะข้อความที่ไม่หมดอายุ
    const now = Date.now();
    messageHistory = messageHistory.filter(item => (now - item.timestamp) < HISTORY_LIMIT);
    
    messageHistory.forEach(item => {
        // ส่ง Event ให้ตรงกับประเภท (ข้อความ หรือ รูปภาพ)
        socket.emit(item.type, item.data);
    });

    // อัปเดตรายชื่อคนออนไลน์
    io.emit('user list', Object.values(users));
    
    // แจ้งเตือน System (อันนี้ไม่เก็บลง History)
    const time = new Date().toISOString().slice(11, 16);
    io.emit('chat message', { 
        time: time, 
        user: 'SYSTEM', 
        msg: `${callsign} has joined the frequency.` 
    });
  });

  // --- ส่วนจัดการข้อความ (Text) ---
  socket.on('chat message', (msg) => {
    if (!msg) return;
    
    const now = Date.now();
    const time = new Date().toISOString().slice(11, 16);
    const callsign = users[socket.id] || 'Guest';
    
    const msgData = { time: time, user: callsign, msg: msg };
    
    // [3] บันทึกลงกล่องความจำ
    messageHistory.push({ 
        type: 'chat message', 
        data: msgData, 
        timestamp: now 
    });
    
    // ล้างของเก่าทิ้ง
    cleanOldHistory();

    // ส่งให้ทุกคนตามปกติ
    io.emit('chat message', msgData);
  });

  // --- ส่วนจัดการรูปภาพ (Image) ---
  socket.on('chat image', (data) => {
      const now = Date.now();
      const time = new Date().toISOString().slice(11, 16);
      const callsign = users[socket.id] || 'Guest';
      
      const imgData = { time: time, user: callsign, image: data };

      // [3] บันทึกลงกล่องความจำ
      messageHistory.push({ 
          type: 'chat image', 
          data: imgData, 
          timestamp: now 
      });
      
      // ล้างของเก่าทิ้ง
      cleanOldHistory();

      io.emit('chat image', imgData);
  });

  socket.on('disconnect', () => {
    if (users[socket.id]) {
        io.emit('user list', Object.values(users));
        delete users[socket.id];
    }
  });
});

// ฟังก์ชั่นช่วยล้างความจำที่เก่าเกิน 24 ชม.
function cleanOldHistory() {
    const now = Date.now();
    messageHistory = messageHistory.filter(item => (now - item.timestamp) < HISTORY_LIMIT);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
