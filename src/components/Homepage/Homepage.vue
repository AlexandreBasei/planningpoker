<!-- La "vue" de notre composant, partie visible par l'utilisateur (HTML) -->
<template>
    <h1 id="titre">Planning Poker</h1>
    <form v-if="homepage == true" class="homepage-form">
        
        <div id="pseudoDiv">
            <input type="text" class="textInput" id="pseudo" placeholder="Entrer votre pseudo" v-model="pseudo" maxlength="15">
        </div>
        
        <div class="inputs-container">

            <h2 v-if="!roomId" class="inputsTitle">Créer un salon</h2>
            <h2 v-else class="inputsTitle">Rejoindre un salon</h2>
            
            <input v-if="!roomId" type="text" class="textInput" id="nomSalle" v-bind:placeholder="'Salle de ' + pseudo" v-model="roomName" maxlength="15">

            <button id="submitCreer" v-if="homepage === true && !roomId" class="submitBtn" @click="handleSubmit()">Créer</button>
            <div v-else v-for="room in rooms" :key="room.id" class="joinRoomDiv">
                <button v-if="room.id === roomId" @click="joinRoom(room)" class="submitBtn">Rejoindre</button>
            </div>
        </div>
        <div class="inputs-container">
            <h2 class="inputsTitle">Rejoindre un salon</h2>
            <input type="text" class="textInput" id="codeSalle" placeholder="Entrer le code de la salle" v-model="roomCode"
                maxlength="4">
            <button id="submitJoin" v-if="homepage === true" class="submitBtn" @click="joinRoomWithCode()">Rejoindre</button>
        </div>
    </form>

    <roomOptions v-if="!homepage" :socket="socket"></roomOptions>
</template>

<script>
import io from 'socket.io-client';
import { defineComponent } from 'vue';
import roomOptions from '../RoomOptions/RoomOptions.vue';

// Définition du composant
export default defineComponent({
    /**
     * @namespace HomePage
     */
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
        // Changement du titre de la page
        document.title = "Planning Poker - Accueil";
        
        // Récupération des rooms depuis le serveur en temps réel
        if (this.homepage) {
            setInterval(() => {
                this.updRooms();
            }, 500);
        }

        // Recherche d'une roomId dans l'url de la page, si aucun n'est trouvé il est défini comme nul par défaut
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const roomId = urlParams.get('room');
        this.roomId = roomId ?? "";
    },

    //Définition des méthodes de notre composant
    methods: {

        /**
         * Get all rooms from the server
         * @constructor
         * @memberof HomePage
         */
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
         * @memberof HomePage
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
         * @memberof HomePage
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
         * Room creation form validation management, sends player information to the server
         * @constructor
         * @memberof HomePage
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
         * @memberof HomePage
         */
        reload() {
            window.location.search = '?room=';
        },

        /**
         * Deletes the roomId in the url
         * @constructor
         * @memberof HomePage
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