<template>
    <section>
        <div v-for="(task, index) in tasks" :key="index">
            <div v-if="index == taskIndex">
                <h2>Tâche {{ index +1 }} : {{ task.nom }}</h2>
                <p>{{ task.description }}</p>
            </div>
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
        gameMode: {
            type: String,
            required: true
        },
        roundTimer: {
            type: Number,
            required: true
        },
        debateTimer: {
            type: Number,
            required: true
        },
    },

    data() {
        return {
            isKicked: false,
            images: this.importAll(require.context('@/assets', false, /\.svg$/))
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
        importAll(r) {
            return r.keys().map(r);
        },
    }
})
</script>