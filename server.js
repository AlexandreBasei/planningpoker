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

    socket.on("playerData", (player, roomName) => {
        console.log(`[playerData] ${player.username}`);

        let room = null;

        if (player.roomId === "") {
            room = createRoom(player, roomName);
            console.log(`[create room ] - ${room.id}- ${roomName} - ${player.username}`);
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
        log(`[sendPlayer] - ${player.username}`);
    });

    socket.on("send room options", (roomId, roomOptions) => {
        io.to(roomId).emit('receive room options', roomOptions);
    });

    socket.on('sendCard', (roomId, card, player, playerID) => {
        rooms.forEach(r => {
            if (r.id === roomId) {
                r.cards.push([card, player, playerID]);

                if (r.cards.length === r.players.length) {
                    io.to(roomId).emit('allCardsSent', r.cards);
                    log(`[allCardsSent] - ${r.cards}`);
                    r.cards = [];
                }
            }
        });
    });

    socket.on("sendMsg", (roomId, msg, username) => {
        io.to(roomId).emit('receiveMsg', msg, username);
        log(`[sendMsg] - ${msg}`);
    });

    socket.on("endDebate", (roomId) => {
        io.to(roomId).emit('endDebate');
    });

    socket.on("endGame", (roomId) => {
        io.to(roomId).emit('endGame');
    });

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

/**
 * Room creation
 * @constructor
 * @param {object} player - The player object
 * @return The generated room array
 */
function createRoom(player, roomName) {
    const room = { id: roomId(), roomName: roomName, players: [], cards: [] };

    player.roomId = room.id;

    room.players.push(player);
    rooms.push(room);

    return room;
}

/**
 * Room creation
 * @constructor
 * @return The generated random room id
 */
function roomId() {
    return Math.random().toString(36).substr(2, 4);
}

/**
 * Room creation
 * @constructor
 * @param {string} socketId - The leaving player's socket id
 */
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

function findRoomById(roomId) {
    return rooms.find(room => room.id === roomId) || null;
}

// // Route to redirect to index.html
app.get('/', (req, res) => {
    res.redirect('index.html');
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});