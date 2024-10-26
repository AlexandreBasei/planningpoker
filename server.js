const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const request = require('request');
const path = require('path');
// const axios = require('axios');
var cors = require('cors');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.static(path.join(__dirname, 'dist')));

const io = require("socket.io")(server, {
    cors: {
        origin: "http://localhost:8080",
        methods: ["GET", "POST"]
    }
});

const rooms = [];

io.on("connection", (socket) => {
    console.log(`[connection] ${socket.id}`);
    // playersConnected.push(socket.id);

    socket.on('update rooms', (newRooms) => {
        rooms = newRooms;
    })

    socket.on("playerData", (player) => {
        console.log(`[playerData] ${player.username}`);

        let room = null;

        if (player.roomId === "") {
            room = createRoom(player);
            console.log(`[create room ] - ${room.id} - ${player.username}`);
        }
        else {
            room = rooms.find(r => r.id === player.roomId);

            if (room === undefined) {
                return;
            }

            player.roomId = room.id;
            room.players.push(player);
        }

        socket.join(room.id);
        io.to(socket.id).emit('join room', player);
    })

    socket.on('get rooms', () => {
        io.to(socket.id).emit('list rooms', rooms);
    });
})

function createRoom(player) {
    const room = { id: roomId(), players: [] };

    player.roomId = room.id;

    room.players.push(player);
    rooms.push(room);

    return room;
}

function roomId() {
    return Math.random().toString(36).substr(2, 9);
}