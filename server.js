const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = process.env.PORT || 3000;

// ตัวแปรเก็บข้อมูล (ในหน่วยความจำ Server)
let onlineUsers = {};   // เก็บชื่อคนออนไลน์ { socketID: "Max" }
let messageHistory = []; // เก็บข้อความย้อนหลัง

// Serve HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Real-time Logic
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // 1. เมื่อมีคน Join
    socket.on('join', (username) => {
        // บันทึกชื่อ
        socket.username = username;
        onlineUsers[socket.id] = username;

        // A. ส่งประวัติข้อความเก่าให้ "เฉพาะคนใหม่" ดู
        socket.emit('load history', messageHistory);

        // B. บอกทุกคนว่ามีคนใหม่มา
        io.emit('system message', `${username} has joined the frequency.`);

        // C. อัปเดตรายชื่อคนออนไลน์ให้ "ทุกคน" เห็น
        io.emit('update user list', Object.values(onlineUsers));
    });

    // 2. เมื่อมีข้อความใหม่
    socket.on('chat message', (msg) => {
        const time = new Date().toISOString().substring(11, 16) + " UTC";
        const msgData = { user: socket.username, text: msg, time: time };

        // เก็บลงประวัติ (จำแค่ 50 ข้อความล่าสุดพอ เดี๋ยวเมมเต็ม)
        messageHistory.push(msgData);
        if (messageHistory.length > 50) messageHistory.shift();

        // ส่งให้ทุกคน
        io.emit('chat message', msgData);
    });

    // 3. เมื่อมีคนออก
    socket.on('disconnect', () => {
        if (socket.username) {
            delete onlineUsers[socket.id]; // ลบชื่อออก
            io.emit('system message', `${socket.username} lost connection.`); // บอกคนอื่น
            io.emit('update user list', Object.values(onlineUsers)); // อัปเดตรายชื่อใหม่
        }
    });
});

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
