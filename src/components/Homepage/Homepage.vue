<!-- La "vue" de notre composant, partie visible par l'utilisateur (HTML) -->
<template>
    <link href="homepage.css" rel="stylesheet">
    <form v-if="homepage == true" class="homepage-form">
        
        <div class="inputs-container">
            <h2 id="creer">Créer un salon</h2>
            <input type="text" class="textInput" id="pseudo" placeholder="Entrer votre pseudo" v-model="pseudo" maxlength="15">
            <input v-if="!roomId" type="text" class="textInput" id="nomSalle" v-bind:placeholder="'Salle de ' + pseudo" v-model="roomName" maxlength="15">

            <button id="submitCreer" v-if="homepage === true && !roomId" class="submitBtn" @click="handleSubmit()">Créer un
                salon</button>
            <div v-else v-for="room in rooms" :key="room.id">
                <button v-if="room.id === roomId" @click="joinRoom(room)" class="submitBtn">Rejoindre le salon</button>
            </div>
        </div>
        <div class="inputs-container">
            <h2 id="join">Rejoindre un salon</h2>
            <input type="text" class="textInput" id="codeSalle" placeholder="Entrer le code de la salle" v-model="roomCode"
                maxlength="4">
            <button id="submitJoin" v-if="homepage === true && !roomId" class="submitBtn" @click="joinRoomWithCode()">Rejoindre</button>
        </div>
    </form>

    <roomOptions v-if="!homepage" :socket="socket"></roomOptions>
</template>

<script>
import io from 'socket.io-client';
import { defineComponent } from 'vue';
import roomOptions from '../RoomOptions/RoomOptions.vue';


// interface Room {
//     id: string;
//     players: {
//         host: boolean,
//         roomId: string,
//         socketId: string,
//         username: string,
//     }[];
// }

// Définition du composant
export default defineComponent({
    name: 'home_page',
    components: {
        roomOptions,
    },

    // Définition des variables
    data() {
        return {
            homepage: true,
            rooms: [],
            roomName: "",
            pseudo: "",
            roomCode: "",
            socket: io("http://localhost:4000"),
            player: {
                host: false,
                roomId: "",
                username: "",
                socketId: ""
            },
            roomId: "",
        }
    },

    // Code à exécuter au chargement de la page
    mounted() {
        // Récupération des rooms depuis le serveur en temps réel
        if (this.homepage) {
            setInterval(() => {
                this.updRooms();
            }, 20);
        }

        // Recherche d'une roomId dans l'url de la page, si aucun n'est trouvé il est défini comme nul par défaut
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const roomId = urlParams.get('room');
        this.roomId = roomId ?? "";
    },

    //Définition des méthodes de notre composant
    methods: {
        //Appel au serveur via un événement socket.io pour récupérer le tableau des rooms
        updRooms() {
            this.socket.emit('get rooms');

            this.socket.on('list rooms', (rooms) => {
                this.rooms = rooms;
            });
        },

        /**
         * Room entry management and storage of player information in the player object
         * @constructor
         * @param {array} room the room array
         */
        joinRoom(room) {
            if (this.pseudo) {
                this.player.roomId = room.id;
                this.player.username = this.pseudo;
                this.player.socketId = this.socket.id ?? "";
                
                this.socket.emit('playerData', this.player);
                this.homepage = false;
                this.roomId = "";
            }
        },

        /**
         * Room entry management with a room code and storage of player information in the player object
         * @constructor
         */
        joinRoomWithCode() {
            if (this.pseudo && this.roomCode) {
                this.rooms.forEach(room => {
                    if (room.id == this.roomCode) {
                        this.player.roomId = room.id;
                        this.player.username = this.pseudo;
                        this.player.socketId = this.socket.id ?? "";

                        this.socket.emit('playerData', this.player);
                        this.homepage = false;
                        this.roomId = "";
                    }
                });
            }
        },

        /**
         * Room creation form validation management 
         * @constructor
         */
        handleSubmit() {
            if (this.pseudo) {
                this.player.host = true;
                this.player.username = this.pseudo;
                this.player.socketId = this.socket.id ?? "";

                if (this.roomName == "") {
                    this.roomName = "Salle de " + this.pseudo;    
                }
                
                this.socket.emit('playerData', this.player, this.roomName);

                this.homepage = false;
            } else {
                alert("Vous devez entrer un pseudonyme !")
            }
        },

        /**
         * Page reload management to delete the roomId in the url
         * @constructor
         */
        reload() {
            window.location.search = '?room=';
        },

        /**
         * Delete the roomId in the url
         * @constructor
         */
        back() {
            window.location.search = '?room=';
        },

    }
})
</script>

// Importation du CSS, ici "scoped" signifie que le css sera spécifique à ce composant
<style scoped>
@import url("./homepage.css");
@import url("./homepage-mobile.css");
</style>