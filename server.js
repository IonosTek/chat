const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);

// เพิ่ม maxHttpBufferSize เพื่อให้ส่งรูปภาพได้ (ตั้งไว้ 5MB)
const io = new Server(server, {
    maxHttpBufferSize: 5 * 1024 * 1024 
});

let users = {};

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log('New connection established');

  socket.on('join', (callsign) => {
    if (!callsign) return;
    users[socket.id] = callsign;
    io.emit('user list', Object.values(users));
    
    const time = new Date().toISOString().slice(11, 16);
    io.emit('chat message', { 
        time: time, 
        user: 'SYSTEM', 
        msg: `${callsign} has joined the frequency.` 
    });
  });

  socket.on('chat message', (msg) => {
    if (!msg) return;
    const time = new Date().toISOString().slice(11, 16);
    const callsign = users[socket.id] || 'Guest';
    io.emit('chat message', { time: time, user: callsign, msg: msg });
  });

  // --- ส่วนที่เพิ่มใหม่: รองรับการส่งรูปภาพ ---
  socket.on('chat image', (data) => {
      const time = new Date().toISOString().slice(11, 16);
      const callsign = users[socket.id] || 'Guest';
      // data คือ base64 string ของรูปภาพ
      io.emit('chat image', { time: time, user: callsign, image: data });
  });
  // ---------------------------------------

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
