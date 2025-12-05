const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = process.env.PORT || 3000;

// 1. Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. Real-time Connection Logic
io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle user joining
    socket.on('join', (username) => {
        socket.username = username;
        io.emit('system message', `${username} has joined the frequency.`);
    });

    // Handle chat messages
    socket.on('chat message', (msg) => {
        // Send message to everyone including sender
        io.emit('chat message', { user: socket.username, text: msg });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        if (socket.username) {
            io.emit('system message', `${socket.username} lost connection.`);
        }
    });
});

// 3. Start Server (Must use server.listen, not app.listen)
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
