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
        playerData(socket, player, roomName);
    })

    //Send all the rooms to the client
    socket.on('get rooms', () => {
        io.to(socket.id).emit('list rooms', rooms);
    });

    socket.on('start game', (roomId, tasks) => {
        startGame(roomId, tasks);
    });

    socket.on('sendPlayer', (player) => {
        sendPlayer(player);
    });

    socket.on("send room options", (roomId, roomOptions) => {
        sendRoomOptions(roomId, roomOptions);
    });

    socket.on('sendCard', (roomId, card, player, playerID) => {
        sendCard(roomId, card, player, playerID);
    });

    socket.on("sendMsg", (roomId, msg, username) => {
        sendMsg(roomId, msg, username);
    });

    //Sends the endDebate event to players in the spcecified roomId
    socket.on("endDebate", (roomId) => {
        io.to(roomId).emit('endDebate');
    });

    //Sends the endGame event to players in the spcecified roomId
    socket.on("endGame", (roomId) => {
        io.to(roomId).emit('endGame');
    });

    socket.on('set host', (player) => {
        setHost(player);
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
 * @namespace Server
 */

/**
 * Handles room creation
 * @memberof Server
 * @constructor
 * @param {object} player - The player object
 * @param {string} roomName - The created room's name, defined by the host of the room
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
 * The room id generator
 * @memberof Server
 * @constructor
 * @return The generated random room id
 */
function roomId() {
    return Math.random().toString(36).substr(2, 4);
}

/**
 * Handles the leaving of a player from a room
 * @memberof Server
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

/**
 * Search a specific room with it's id
 * @memberof Server
 * @constructor
 * @param {string} roomId - The room id
 */
function findRoomById(roomId) {
    return rooms.find(room => room.id === roomId) || null;
}

/**
 * Handles players joining or creating a room
 * @memberof Server
 * @constructor
 * @param {object} player - The player object
 * @param {string} roomName - The room's name defined by the host of the room
 * @return The generated room array
 */
function playerData(socket, player, roomName) {
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
}

/**
 * Sends the start game event to the clients in the associated room
 * @memberof Server
 * @constructor
 * @param {string} roomId - The player object
 * @param {object} tasks - Tasks imported with the json file by the host of the room
 */
function startGame(roomId, tasks) {
    io.to(roomId).emit('start game', tasks);
}

/**
 * Sends the player object to the client
 * @memberof Server
 * @constructor
 * @param {object} player - Tasks imported with the json file by the host of the room
 */
function sendPlayer(player) {
    io.to(player.socketId).emit('receivePlayer', player);
    log(`[sendPlayer] - ${player.username}`);
}

/**
 * Sends the room options to all players of the designated room
 * @memberof Server
 * @constructor
 * @param {string} roomId - The room id
 * @param {object} roomOptions - The room options selected by the host of the room
 */
function sendRoomOptions(roomId, roomOptions) {
    io.to(roomId).emit('receive room options', roomOptions);
}

/**
 * Sends all selected cards to the room when all players have made their choice 
 * @memberof Server
 * @constructor
 * @param {string} roomId - The room's id
 * @param {string} card - The selected card's name
 * @param {object} player - The player object
 * @param {string} playerId - The sender's socketId
 */
function sendCard(roomId, card, player, playerID) {
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
}

/**
 * Sends the sender's message to all players in the specified room
 * @memberof Server
 * @constructor
 * @param {string} roomId - The room's id
 * @param {string} msg - The message sended
 * @param {string} username - The sender's username
 */
function sendMsg(roomId, msg, username) {
    io.to(roomId).emit('receiveMsg', msg, username);
    log(`[sendMsg] - ${msg}`);
}

/**
 * Sets the new host of the room and removes this status from the last host
 * @memberof Server
 * @constructor
 * @param {object} player - The player object
 */
function setHost(player) {
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
}

// // Route to redirect to index.html
app.get('/', (req, res) => {
    res.redirect('index.html');
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});