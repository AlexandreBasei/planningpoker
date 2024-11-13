const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
// const axios = require('axios');
var cors = require('cors');
const { log } = require('console');

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

let rooms = [];

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

    socket.on('start game', (roomId, tasks) => {
        io.to(roomId).emit('start game', tasks);
    });

    socket.on('sendPlayer', (player) => {
        io.to(player.socketId).emit('receivePlayer', player);
    });

    socket.on("send room options", (roomId, gameMode, roundTimer, debateTimer) => {
        io.to(roomId).emit('receive room options', gameMode, roundTimer, debateTimer);
    })

    socket.on('set host', (player) => {
        rooms.forEach(r => {
            if (r.id === player.roomId) {
                r.players.forEach(p => {
                    if (p.host === true && p.socketId !== player.socketId) {
                        p.host = false;
                    }
                    if (p.socketId === player.socketId && p.host !== true) {
                        p.host = true;
                        io.to(player.socketId).emit('new host', p.socketId);
                        console.log(`[new host] - ${r.id} - ${player.username}`);
                    }
                })
            }
        });
    });

    socket.on('exit room', () => {
        exitRoom(socket.id);
    });

    socket.on('kick player', (socketId) => {
        exitRoom(socketId);
        io.to(socketId).emit('kicked', socketId);
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
    return Math.random().toString(36).substr(2, 4);
}

function exitRoom(socketId) {
    let room = null;

    rooms.forEach(r => {
        r.players.forEach(p => {
            if (p.socketId === socketId) {
                if (r.players.length === 1) {
                    room = r;
                    rooms = rooms.filter(r => r !== room);
                }
                else {
                    r.players = r.players.filter(player => player.socketId !== socketId);
                    if (p.host) {
                        const randomIndex = Math.floor(Math.random() * r.players.length);
                        const randomPlayer = r.players[randomIndex];
                        randomPlayer.host = true;
                        io.to(randomPlayer.socketId).emit("new host", randomPlayer.socketId);
                        console.log(`[new host] - ${r.id} - ${randomPlayer.username}`);
                    }
                }
            }
        })
    })
}

// // Route to redirect to index.html
app.get('/', (req, res) => {
    res.redirect('index.html');
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});