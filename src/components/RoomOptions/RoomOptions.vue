<template>
    <section>
        <div class="playersList">
            <h3>Joueurs</h3>
            <div class="playersContainer" v-for="room in rooms" :key="room.id">
                <div class="playerContainer" v-if="room.id === player.roomId">
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
            <h3>Paramètres du salon</h3>
            <div v-if="player.host" class="personalization-section">
                <label for="importJson">Importer un fichier json contenant les tâches à évaluer</label>
                <input type="file" @change="importJson" accept=".json" id="importJson">

                <h4>Mode de jeu</h4>
                <button @click="sendRoomOptions(0)">Unanimité</button>
                <button @click="sendRoomOptions(1)">Majorité absolue</button>

                <h4>Paramètres de la partie</h4>

                <label for="roundTimer">Durée des tours : {{ roundTimer ?? 0 }} secondes</label>
                <input  name="roundTimer" type="range" value="1" min="0" max="120" v-model="roundTimer" @change="sendRoomOptions">


                <label for="roundTimer">Durée des débats : {{ debateTimer ?? 0 }} secondes</label>
                <input  name="debateTimer" type="range" value="1" min="0" max="240" v-model="debateTimer" @change="sendRoomOptions">
                <button @click="startGame">Lancer la partie</button>
            </div>

            <div v-if="!player.host">
                <p></p>
            </div>
        </section>

        <PokerGame v-else :socket="socket" :tasks="tasks"></PokerGame>
    </section>

</template>

<script>

import { defineComponent } from 'vue';
import 'socket.io-client';
import PokerGame from '../PokerGame/PokerGame.vue';

export default defineComponent({
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
            gameMode : 0,
            maxRounds: 5,
            currentRound: 0,
            // games: [
            //     { id: 1, name: "Keyboard-notes", image: require("@/assets/svg/partinies/solar.svg") },
            //     { id: 2, name: "Classico", image: require("@/assets/svg/partinies/vilo.svg") },
            //     { id: 3, name: "What's the situation ?", image: require("@/assets/svg/partinies/blingbling.svg") }
            // ],
            gamesChosen: [],
            interRoundDuration: 5,
            isKicked: false,
        }
    },

    computed: {
        currentRoomPlayers() {
            return this.rooms.find(room => room.id === this.player.roomId);
        },
    },

    mounted() {

        this.updRooms();

        this.socket.on('join room', (player) => {
            this.player = player;
            this.currentRoom = player.roomId;
        });

        this.socket.on('start game', (tasks) => {
            if (!this.player.host) {
                this.tasks = tasks;
            }

            this.game = true;
            this.socket.emit('sendPlayer', this.player);
        });

        this.socket.on('new host', (newHostId) => {
            console.log('This.player.socketId', this.player.socketId);

            if (this.player.socketId === newHostId) {
                this.player.host = true;
            }
        });

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
        startGame() {
            if (this.tasks.length === 0) {
                alert("Veuillez importer un fichier json contenant les tâches à évaluer");
                return;
            }
            else {
                this.socket.emit('start game', this.currentRoom, this.tasks);
            }
        },
        importJson(event) { //Get the tasks from the json file
            const file = event.target.files[0];
            const reader = new FileReader();

            reader.onload = (e) => {
                this.tasks = JSON.parse(e.target.result).tasks;
            };

            reader.readAsText(file);

        },

        sendRoomOptions(mode = 0) {
            this.gameMode = mode;
            this.socket.emit('send room options', this.currentRoom, this.gameMode, this.roundTimer, this.debateTimer);
        },

        beforeUnloadHandler() {
            if (!this.isKicked) {
                // const confirmationMessage = "Êtes-vous sûr de vouloir quitter cette page ? Vous quitterez la partie en cours";
                // (event || window.event).returnValue = confirmationMessage;
                // return confirmationMessage;
                this.socket.emit("exit room");
            }
        },
        updRooms() {
            this.socket.emit('get rooms');

            this.socket.on('list rooms', (rooms) => {
                this.rooms = rooms;
                rooms.forEach(room => {
                    if (this.player.roomId === room.id) {
                        this.gamesChosen = room.gamesChosen;
                    }
                });
            });
        },
        exitRoom() {
            this.rooms.forEach(room => {
                if (room.id === this.currentRoom) {
                    this.resetPlayer();
                    this.socket.emit("exit room");

                    window.location.search = '';
                }
            });
        },
        setHost(player) {
            this.player.host = false;
            this.socket.emit("set host", player);

            const menuToDisplay = document.getElementById(player.socketId);

            if (menuToDisplay) {
                menuToDisplay.style.display = "none";
            }
        },
        kickPlayer(socketId) {
            this.rooms.forEach(room => {
                if (room.id === this.currentRoom) {
                    console.log("kick");
                    this.socket.emit("kick player", socketId);
                }
            });
        },
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
        isButtonClicked(buttons, target) {

            for (const button of buttons) {
                if (button.contains(target)) {
                    return true;
                }
            }
            return false;
        },
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