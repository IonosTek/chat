const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);

// เพิ่ม maxHttpBufferSize เพื่อให้ส่งไฟล์ขนาดใหญ่ขึ้นได้ (ตั้งไว้ 10MB)
const io = new Server(server, {
    maxHttpBufferSize: 1e7 
});

const port = process.env.PORT || 3000;

let onlineUsers = {};
let messageHistory = [];

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
    // 1. Join
    socket.on('join', (username) => {
        socket.username = username;
        onlineUsers[socket.id] = username;

        socket.emit('load history', messageHistory);
        io.emit('system message', `${username} has joined the frequency.`);
        io.emit('update user list', Object.values(onlineUsers));
    });

    // 2. Chat Message (Text)
    socket.on('chat message', (msg) => {
        const time = new Date().toISOString().substring(11, 16) + " UTC";
        const msgData = { type: 'text', user: socket.username, content: msg, time: time };
        
        saveAndBroadcast(msgData);
    });

    // 3. File Upload (Image/File)
    socket.on('upload', (fileData) => {
        const time = new Date().toISOString().substring(11, 16) + " UTC";
        // fileData { name, type, data }
        const msgData = { 
            type: 'file', 
            user: socket.username, 
            content: fileData.data, // Base64 string
            fileName: fileData.name,
            fileType: fileData.type,
            time: time 
        };
        
        saveAndBroadcast(msgData);
    });

    // ฟังก์ชันช่วยบันทึกและส่งข้อมูล
    function saveAndBroadcast(data) {
        messageHistory.push(data);
        if (messageHistory.length > 30) messageHistory.shift(); // เก็บแค่ 30 ข้อความล่าสุด (เพื่อประหยัด RAM)
        io.emit('chat message', data);
    }

    // 4. Disconnect
    socket.on('disconnect', () => {
        if (socket.username) {
            delete onlineUsers[socket.id];
            io.emit('system message', `${socket.username} lost connection.`);
            io.emit('update user list', Object.values(onlineUsers));
        }
    });
});

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
