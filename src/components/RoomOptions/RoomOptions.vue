<template>
    <link href="room-options.css" rel="stylesheet">
    <section class="mainSection">
        <div class="playersList">
            <h3 id="joueurs">Joueurs</h3>
            <div class="playersContainer" v-for="room in rooms" :key="room.id">
                <div class="playerContainer" v-if="room.id === player.roomId">
                    <h3>{{ room.roomName }}</h3>
                    <div v-for="rplayer in room.players" :key="rplayer.socketId"
                        :class="{ currentPlayer: rplayer.socketId === player.socketId }">

                        <span class="pseudoPlayer">
                            <span v-if="rplayer.host">👑</span><span>{{ rplayer.username }}</span>

                            <button v-if="player.host && rplayer.socketId !== player.socketId"
                                @click="displayHostMenu(rplayer.socketId)"
                                class="hostMenuButton no-background no-hover">
                                <svg width="10px" height="15px" xmlns="http://www.w3.org/2000/svg" fill="black"
                                    class="bi bi-three-dots-vertical">
                                    <path
                                        d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
                                </svg>
                            </button>
                        </span>

                        <div v-bind:id="rplayer.socketId" class="hostMenu no-background no-hover">
                            <button class="no-background no-hover" @click="setHost(rplayer)">Nouvel hôte</button>
                            <button class="no-background no-hover" style="color: red;"
                                @click="kickPlayer(rplayer.socketId)">Éjecter le joueur</button>
                        </div>
                    </div>
                </div>
            </div>
            <p>Code de la salle : {{ currentRoom }}</p>
            <button id="shareLink" :class="{ 'shareLink': copied }" @click="copyLink">
                <!-- (`localhost:8080?room=${player.roomId}`) -->
                {{ copied ? "Copié !" : "Copier l'url de la salle" }}
            </button>
            <button @click="exitRoom" class="submitBtn">Quitter la salle</button>

        </div>

        <section class="roomOptions" v-if="game == false">
            <h3 id="parametres">Paramètres du salon</h3>
            <div v-if="player.host" class="personalization-section">
                <label for="importJson">Importer un fichier json contenant les tâches à évaluer</label>
                <input type="file" @change="importJson" accept=".json" id="importJson">

                <h4 id="mode">Mode de jeu : {{ gameMode }}</h4>
                <div>
                    <button v-for="(mode, index) in gameModes" :key="index" @click="setGameMode(index)">{{ mode
                        }}</button>
                </div>

                <div>
                    <h4 id="partie">Paramètres de la partie</h4>

                    <!-- <label for="roundTimer">Durée des tours : {{ maxRroundTimer === 0 ? "∞" : maxRoundTimer }} secondes</label>
                    <input name="roundTimer" type="range" value="1" min="0" max="120" v-model="maxRoundTimer"
                        @change="sendRoomOptions"> -->


                    <label for="roundTimer">Durée des débats : {{ maxDebateTimer === 0 ? "∞" : maxDebateTimer }}
                        secondes</label>
                    <input name="debateTimer" type="range" value="1" min="0" max="240" v-model="maxDebateTimer"
                        @change="sendRoomOptions">
                </div>

                <button @click="startGame">Lancer la partie</button>
            </div>

            <div v-if="!player.host" class="personalization-section">
                <p v-if="jsonImported">Fichier json importé</p>
                <p v-else>Aucun fichier json importé</p>

                <h4>Mode de jeu : {{ gameMode }}</h4>

                <div>
                    <h4>Paramètres de la partie</h4>

                    <!-- <p>Durée des tours : {{ maxRoundTimer === 0 ? "∞" : maxRoundTimer }} secondes</p> -->

                    <p>Durée des débats : {{ maxDebateTimer === 0 ? "∞" : maxDebateTimer }} secondes</p>
                </div>

            </div>
        </section>

        <PokerGame v-else :socket="socket" :currentRoom="currentRoom" :tasks="tasks" :gameMode="gameMode"
            :maxDebateTimer="maxDebateTimer"></PokerGame>
    </section>

</template>

<script>

import 'socket.io-client';
import { defineComponent } from 'vue';
import PokerGame from '../PokerGame/PokerGame.vue';

export default defineComponent({
    /**
     * @namespace RoomOptions
     */
    name: 'roomOptions',
    homepage: '',
    components: {
        PokerGame
    },

    props: {
        socket: {
            type: Object,
            required: true
        }
    },

    data() {
        return {
            rooms: [],
            currentRoom: '',
            player: {},
            copied: false,
            tasks: [],
            game: false,
            gameModes: ["Unanimité", "Majorité absolue"],
            gameMode: "",
            // maxRoundTimer: 0,
            maxDebateTimer: 0,
            isKicked: false,
            jsonImported: false,
        }
    },

    mounted() {

        this.updRooms();

        /**
         * Get the rooms list from the server
         * @event RoomOptions#listRooms
         * @param {object} rooms - The rooms list object sended by the server
         */
        this.socket.on('list rooms', (rooms) => {
            this.rooms = rooms;
        });

        setTimeout(() => {
            this.rooms.forEach(room => {
                if (room.id === this.currentRoom) {
                    console.log(room);

                    document.title = room.roomName;
                }
            });
        }, 1000);

        this.gameMode = this.gameModes[0];

        /**
         * Handles the client-side joining of a room
         * @event RoomOptions#joinRoom
         * @param {object} player - The player object sended by the server
         */
        this.socket.on('join room', (player) => {
            this.player = player;
            this.currentRoom = player.roomId;
        });

        /**
         * Get the room options from the server
         * @event RoomOptions#receiveRoomOptions
         * @param {object} roomOptions - The room options object sended by the server
         */
        this.socket.on('receive room options', (roomOptions) => {
            if (!this.player.host) {
                this.gameMode = roomOptions.gameMode;
                // this.maxRoundTimer = roomOptions.roundTimer;
                this.maxDebateTimer = roomOptions.debateTimer;
                this.jsonImported = roomOptions.jsonImported;
                console.log("RECUUU : ", roomOptions);
            }
        });

        /**
         * Handles the client-side starting of a game by getting the tasks from the server
         * @event RoomOptions#startGame
         * @param {object} tasks - The tasks object sended by the server
         */
        this.socket.on('start game', (tasks) => {
            if (!this.player.host) {
                this.tasks = tasks;
            }

            this.game = true;
            this.socket.emit('sendPlayer', this.player);
        });

        /**
         * Handles the client-side ending of a game
         * @event RoomOptions#endGame
         */
        this.socket.on('endGame', () => {
            this.game = false;
        });

        /**
         * Handles the definition of a new host
         * @event RoomOptions#newHost
         * @param {string} newHostId - The socket id of the new host
         */
        this.socket.on('new host', (newHostId) => {
            console.log('This.player.socketId', this.player.socketId);

            if (this.player.socketId === newHostId) {
                this.player.host = true;
            }
        });

        /**
         * Handles the exclusion of a player from the game
         * @event RoomOptions#kicked
         * @param {string} kickedId - The socket id of the kicked player
         */
        this.socket.on('kicked', (kickedId) => {
            if (this.player.socketId === kickedId) {
                this.isKicked = true;
                this.exitRoom();
                console.log('kicked');
            }
        });

        window.addEventListener("beforeunload", this.beforeUnloadHandler);
    },

    methods: {
        /**
         * Game start button management (start game if a json was imported)
         * @constructor
         * @memberof RoomOptions
         */
        startGame() {
            if (this.tasks.length === 0) {
                alert("Veuillez importer un fichier json contenant les tâches à évaluer");
                return;
            }
            else {
                this.socket.emit('start game', this.currentRoom, this.tasks);
            }
        },

        /**
         * Import a json file containing the tasks to evaluate
         * @constructor
         * @memberof RoomOptions
         * @param {object} event - The event object containing the imported json tasks file
         */
        importJson(event) { //Get the tasks from the json file
            const file = event.target.files[0];
            const reader = new FileReader();

            reader.onload = (e) => {
                this.tasks = JSON.parse(e.target.result).tasks;
                this.jsonImported = true;
                this.sendRoomOptions();
            };

            reader.readAsText(file);

        },

        /**
         * Send the room options to the server
         * @constructor
         * @memberof RoomOptions
         */
        sendRoomOptions() {
            this.socket.emit('send room options', this.currentRoom, { gameMode: this.gameMode, debateTimer: this.maxDebateTimer, jsonImported: this.jsonImported });
        },

        /**
         * Sets the game mode
         * @constructor
         * @memberof RoomOptions
         * @param {integer} modeIndex - The index of the game mode in the gameModes array
         */
        setGameMode(modeIndex) {
            this.gameMode = this.gameModes[modeIndex];
            this.sendRoomOptions();
        },

        /**
         * Update the rooms list
         * @constructor
         * @memberof RoomOptions
         */
        updRooms() {
            this.socket.emit('get rooms');
        },

        /**
         * Room exit management
         * @constructor
         * @memberof RoomOptions
         */
        exitRoom() {
            this.rooms.forEach(room => {
                if (room.id === this.currentRoom) {
                    this.resetPlayer();
                    this.socket.emit("exit room");

                    window.location.search = '';
                }
            });
        },

        /**
         * Sets a new host of the room and sends the information to the server
         * @constructor
         * @memberof RoomOptions
         * @param {object} player - The player object
         */
        setHost(player) {
            this.player.host = false;
            this.socket.emit("set host", player);

            const menuToDisplay = document.getElementById(player.socketId);

            if (menuToDisplay) {
                menuToDisplay.style.display = "none";
            }
        },

        /**
         * Kicks a player from the room by sending the information to the server
         * @constructor
         * @memberof RoomOptions
         * @param {string} socketId - The socket id of the player to kick
         */
        kickPlayer(socketId) {
            this.rooms.forEach(room => {
                if (room.id === this.currentRoom) {
                    console.log("kick");
                    this.socket.emit("kick player", socketId);
                }
            });
        },

        /**
         * Copy the room link to the clipboard
         * @constructor
         * @memberof RoomOptions
         */
        copyLink() {
            const link = `${window.location.origin}?room=${this.player.roomId}`;
            navigator.clipboard.writeText(link).then(() => {
                this.copied = true;
                setTimeout(() => {
                    this.copied = false;
                }, 1500);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        },

        /**
         * Display the kicking or promote menu to the host when clicking on a player
         * @constructor
         * @memberof RoomOptions
         * @param {string} socketId - The socket id of the player to kick or promote
         */
        displayHostMenu(socketId) {
            const menuToDisplay = document.getElementById(socketId);

            if (menuToDisplay) {
                /*eslint no-undef: 0*/
                const modals = document.querySelectorAll('.hostMenu');

                modals.forEach((modal) => {
                    if (modal) {
                        modal.style.display = 'none';
                    }
                });

                menuToDisplay.style.display = "flex";
            }
        },

        /**
         * Handles the host menu hiding when clicking outside of it
         * @constructor
         * @memberof RoomOptions
         * @param {object} event - The event object
         */
        isButtonClicked(buttons, target) {

            for (const button of buttons) {
                if (button.contains(target)) {
                    return true;
                }
            }
            return false;
        },

        /**
         * Resets the player object
         * @constructor
         * @memberof RoomOptions
         */
        resetPlayer() {
            this.player = {
                host: false,
                roomId: "",
                username: "",
                socketId: ""
            };
            this.currentRoom = "";
            this.isKicked = false;
        }
    }

})

</script>

<style lang="css" scoped>
@import url('./room-options.css');
</style>
// @import url('./room-options-mobile.css');