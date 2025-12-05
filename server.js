const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// เก็บรายชื่อผู้ใช้งาน (Callsign)
let users = {};

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log('New connection');

  // เมื่อมีคน Join ด้วย Callsign
  socket.on('join', (callsign) => {
    users[socket.id] = callsign;
    io.emit('user list', Object.values(users)); // อัปเดตรายชื่อคนออนไลน์
    
    // ส่งข้อความเข้าระบบ
    const time = new Date().toISOString().slice(11, 16); // เวลา UTC แบบย่อ
    io.emit('chat message', { 
        time: time, 
        user: 'SYSTEM', 
        msg: `${callsign} has joined the frequency.` 
    });
  });

  // เมื่อมีคนส่งข้อความ
  socket.on('chat message', (msg) => {
    const time = new Date().toISOString().slice(11, 16); // เวลา UTC
    const callsign = users[socket.id] || 'Anonymous';
    io.emit('chat message', { time: time, user: callsign, msg: msg });
  });

  // เมื่อคนออกจากห้อง
  socket.on('disconnect', () => {
    if (users[socket.id]) {
        io.emit('user list', Object.values(users));
        delete users[socket.id];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});