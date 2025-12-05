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
let messageHistory = []; // [1] สร้างตัวแปรเก็บประวัติแชท
const HISTORY_LIMIT = 24 * 60 * 60 * 1000; // 24 ชั่วโมง (หน่วยมิลลิวินาที)

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log('New connection established');

  socket.on('join', (callsign) => {
    if (!callsign) return;
    
    users[socket.id] = callsign;
    
    // [2] ส่งประวัติเก่าให้คนที่เพิ่งเข้ามา (เฉพาะคนนี้)
    messageHistory.forEach(item => {
        // เช็คว่าเป็นข้อความหรือรูปภาพ แล้วส่งให้ถูกประเภท
        if (item.type === 'text') {
            socket.emit('chat message', item.data);
        } else if (item.type === 'image') {
            socket.emit('chat image', item.data);
        }
    });

    io.emit('user list', Object.values(users));
    
    // แจ้งเตือนคนเข้าห้อง (อันนี้ไม่ต้องเก็บลงประวัติ)
    const time = new Date().toISOString().slice(11, 16);
    io.emit('chat message', { 
        time: time, 
        user: 'SYSTEM', 
        msg: `${callsign} has joined the frequency.` 
    });
  });

  socket.on('chat message', (msg) => {
    if (!msg) return;
    const now = Date.now();
    const time = new Date().toISOString().slice(11, 16);
    const callsign = users[socket.id] || 'Guest';
    
    const msgData = { time: time, user: callsign, msg: msg };
    
    // [3] บันทึกลงความจำ
    messageHistory.push({ type: 'text', data: msgData, timestamp: now });
    
    // [4] ลบข้อความที่เก่าเกิน 24 ชม. ทิ้ง
    cleanOldHistory();

    io.emit('chat message', msgData);
  });

  socket.on('chat image', (data) => {
      const now = Date.now();
      const time = new Date().toISOString().slice(11, 16);
      const callsign = users[socket.id] || 'Guest';
      
      const imgData = { time: time, user: callsign, image: data };

      // [3] บันทึกรูปภาพลงความจำ
      messageHistory.push({ type: 'image', data: imgData, timestamp: now });
      
      // [4] ลบของเก่าทิ้ง
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

// ฟังก์ชั่นล้างความจำ
function cleanOldHistory() {
    const now = Date.now();
    // กรองเอาเฉพาะอันที่เวลายังไม่เกินกำหนด
    messageHistory = messageHistory.filter(item => (now - item.timestamp) < HISTORY_LIMIT);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
