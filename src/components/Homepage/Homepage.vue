<!-- La "vue" de notre composant, partie visible par l'utilisateur (HTML) -->
<template>
    <form v-if="homepage == true" class="homepage-form">
        <div class="inputs-container">
            <input type="text" class="textInput" placeholder="Entrer votre pseudo" v-model="pseudo" maxlength="15">

            <button v-if="homepage === true && !roomId" class="submitBtn" @click="handleSubmit()">Créer un salon</button>
            <div v-else v-for="room in rooms" :key="room.id">
                <button v-if="room.id === roomId" @click="joinRoom(room)" class="submitBtn">Rejoindre le salon</button>
            </div>
        </div>
    </form>

    <roomOptions v-if="!homepage" :socket="socket"></roomOptions>
</template>

<script>
import io from 'socket.io-client';
import roomOptions from '../RoomOptions/RoomOptions.vue';
import { defineComponent } from 'vue';

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
            pseudo: "",
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

        //Gestion de l'entrée dans une room et stockage des informations du joueur dans son objet "player"
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

        //Gestion de la validation du formulaire du création de room
        handleSubmit() {
            if (this.pseudo) {
                this.player.host = true;
                this.player.username = this.pseudo;
                this.player.socketId = this.socket.id ?? "";

                this.socket.emit('playerData', this.player);

                this.homepage = false;
            } else {
                alert("Vous devez entrer un pseudonyme !")
            }
        },

        //Gestion du rechargement de la page pour supprimer le roomId de l'url
        reload() {
            window.location.search = '?room=';
        },

        //Gestion du bouton de retour en arrière
        back(){
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