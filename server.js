const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);

// ตั้งค่า Socket.io
const io = new Server(server, {
    cors: { origin: "*" },
    maxHttpBufferSize: 5e6 // 5MB
});

// --- ส่วนเก็บข้อมูล (Memory) ---
let users = {};
let messageHistory = [];
const HISTORY_LIMIT = 24 * 60 * 60 * 1000; // 24 ชั่วโมง

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log('User connected: ' + socket.id);

  // 1. เมื่อมีคน Join
  socket.on('join', (callsign) => {
    if (!callsign) return;
    
    users[socket.id] = callsign;
    
    // ส่งประวัติย้อนหลัง (History)
    const now = Date.now();
    // กรองเอาเฉพาะข้อความที่ไม่หมดอายุ
    messageHistory = messageHistory.filter(item => (now - item.timestamp) < HISTORY_LIMIT);
    
    // วนลูปส่งข้อมูลเก่า
    messageHistory.forEach(item => {
        socket.emit(item.type, item.data);
    });

    // แจ้งเตือนคนเข้าห้อง
    io.emit('user list', Object.values(users));
    const time = new Date().toISOString().slice(11, 16);
    io.emit('chat message', { 
        time: time, 
        user: 'SYSTEM', 
        msg: `${callsign} has joined the frequency.` 
    });
  });

  // 2. เมื่อมีข้อความเข้า (Text)
  socket.on('chat message', (msg) => {
    if (!msg) return;
    handleMessage(socket, 'chat message', msg);
  });

  // 3. เมื่อมีรูปภาพเข้า (Image)
  socket.on('chat image', (imgData) => {
    if (!imgData) return;
    handleMessage(socket, 'chat image', imgData);
  });

  // 4. เมื่อมีคนออก
  socket.on('disconnect', () => {
    if (users[socket.id]) {
        io.emit('user list', Object.values(users));
        delete users[socket.id];
    }
  });
});

// --- ฟังก์ชันแยก (อยู่นอก Socket เพื่อป้องกันวงเล็บงง) ---
function handleMessage(socket, type, content) {
    try {
        const now = Date.now();
        const time = new Date().toISOString().slice(11, 16);
        const callsign = users[socket.id] || 'Guest';
        
        // สร้างแพ็คเกจข้อมูล
        let dataPackage = { time: time, user: callsign };
        if (type === 'chat message') {
            dataPackage.msg = content;
        } else {
            dataPackage.image = content;
        }

        // บันทึกลงความจำ (History)
        messageHistory.push({ type: type, data: dataPackage, timestamp: now });
        
        // ถ้าเก็บเยอะเกิน 500 ข้อความ ให้ลบอันเก่าสุดทิ้ง (กันเมมเต็ม)
        if (messageHistory.length > 500) {
            messageHistory.shift();
        }

        // ส่งให้ทุกคน
        io.emit(type, dataPackage);
        
    } catch (err) {
        console.error("Error processing message:", err);
    }
}

// เริ่มต้น Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
