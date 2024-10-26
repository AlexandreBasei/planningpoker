<template>
    <section class="playersList">
        <h3>Joueurs</h3>
        <div class="playersContainer" v-for="room in rooms" :key="room.id">
            <div class="playerContainer" v-if="room.id === player.roomId">
                <div v-for="rplayer in room.players" :key="rplayer.socketId"
                    :class="{ currentPlayer: rplayer.socketId === player.socketId }">

                    <span class="pseudoPlayer">
                        <span>{{ rplayer.username }}</span>

                        <button v-if="player.host && rplayer.socketId !== player.socketId"
                            @click="displayHostMenu(rplayer.socketId)" class="hostMenuButton no-background no-hover">
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
        <button id="shareLink" :class="{ 'shareLink': copied }" @click="copyLink">
            <!-- (`localhost:8080?room=${player.roomId}`) -->
            {{ copied ? "Copié !" : "Copier l'url de la salle" }}
        </button>

    </section>
</template>

<script>

import { defineComponent } from 'vue';
import 'socket.io-client';

export default defineComponent({
    name: 'roomOptions',
    homepage: '',
    // components: {
    //     Kbnotes,
    //     ProfilePicture,
    //     WtsComponent,
    //     ClassicoComponent,
    //     InfosComponent
    // },

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
            game: 0,
            maxRounds: 5,
            currentRound: 0,
            // games: [
            //     { id: 1, name: "Keyboard-notes", image: require("@/assets/svg/partinies/solar.svg") },
            //     { id: 2, name: "Classico", image: require("@/assets/svg/partinies/vilo.svg") },
            //     { id: 3, name: "What's the situation ?", image: require("@/assets/svg/partinies/blingbling.svg") }
            // ],
            gamesChosen: [],
            draggedGameId: null,
            draggedIndex: null,
            dots: '',
            maxDots: 3,
            interval: undefined,
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
    },

    methods: {
        beforeUnloadHandler(event) {
            if (!this.isKicked) {
                const confirmationMessage = "Êtes-vous sûr de vouloir quitter cette page ? Vous quitterez la partie en cours";
                (event || window.event).returnValue = confirmationMessage; // For IE and Firefox
                return confirmationMessage; // For other browsers
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
    }

})

</script>

<style lang="css" scoped>
@import url('./room-options.css');
</style>
// @import url('./room-options-mobile.css');