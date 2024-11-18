<template>
    <h1>Jeu</h1>

    <section>
        <div v-for="(task, index) in tasks" :key="index">
            <h2>{{ task.nom }}</h2>
            <p>{{ task.description }}</p>
        </div>
    </section>
</template>

<script>
import { defineComponent } from 'vue';
import 'socket.io-client';

export default defineComponent({
    name: 'PokerGame',
    homepage: '',

    props: {
        socket: {
            type: Object,
            required: true
        },
        tasks: {
            type: Array,
            required: true
        },
    },

    data() {
        return {
            maxRounds: 5,
            currentRound: 0,
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
        this.socket.on('receivePlayer', (player) => {
            this.player = player;
        });
        
    },

    methods: {
        
    }
})
</script>