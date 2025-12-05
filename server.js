const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Store connected users
let users = {};

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log('New connection established');

  // Handle user joining
  socket.on('join', (callsign) => {
    // Prevent empty callsigns
    if (!callsign) return;
    
    users[socket.id] = callsign;
    io.emit('user list', Object.values(users)); // Update user list for everyone
    
    // System notification
    const time = new Date().toISOString().slice(11, 16);
    io.emit('chat message', { 
        time: time, 
        user: 'SYSTEM', 
        msg: `${callsign} has joined the frequency.` 
    });
  });

  // Handle chat messages
  socket.on('chat message', (msg) => {
    if (!msg) return;
    const time = new Date().toISOString().slice(11, 16);
    const callsign = users[socket.id] || 'Guest';
    io.emit('chat message', { time: time, user: callsign, msg: msg });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (users[socket.id]) {
        io.emit('user list', Object.values(users));
        delete users[socket.id];
    }
  });
});

// Render provides the PORT via environment variable
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
