<template>
    <h1>{{ player }}</h1>
    <section>
        <h1>Mode de jeu : {{ gameMode }}</h1>
        <h1 v-if="maxRoundTimer && cardsOn">Temps restant : {{ roundTimer }}</h1>
        <h1 v-if="!maxRoundTimer && cardsOn">Temps restant : illimité</h1>
        <h1 v-if="maxDebateTimer && debateOn">Temps restant : {{ debateTimer }}</h1>
        <h1 v-if="!maxDebateTimer && debateOn">Temps restant : illimité</h1>
        {{ cards }}
        <div v-for="(task, index) in tasks" :key="index">
            <div v-if="index == taskIndex">
                <h2>Tâche {{ index + 1 }} : {{ task.nom }}</h2>
                <p>{{ task.description }}</p>

                <div v-if="cardsOn">
                    <button @click="cardClick('@/assets/images/svg/cartes/cartes_0.svg')">
                        <img alt="Carte" src="@/assets/images/svg/cartes/cartes_0.svg">
                    </button>
                    <button @click="cardClick('@/assets/images/svg/cartes/cartes_1.svg')">
                        <img alt="Carte" src="@/assets/images/svg/cartes/cartes_1.svg">
                    </button>
                    <button @click="cardClick('@/assets/images/svg/cartes/cartes_2.svg')">
                        <img alt="Carte" src="@/assets/images/svg/cartes/cartes_2.svg">
                    </button>
                    <button @click="cardClick('@/assets/images/svg/cartes/cartes_3.svg')">
                        <img alt="Carte" src="@/assets/images/svg/cartes/cartes_3.svg">
                    </button>
                    <button @click="cardClick('@/assets/images/svg/cartes/cartes_5.svg')">
                        <img alt="Carte" src="@/assets/images/svg/cartes/cartes_5.svg">
                    </button>
                    <button @click="cardClick('@/assets/images/svg/cartes/cartes_8.svg')">
                        <img alt="Carte" src="@/assets/images/svg/cartes/cartes_8.svg">
                    </button>
                    <button @click="cardClick('@/assets/images/svg/cartes/cartes_13.svg')">
                        <img alt="Carte" src="@/assets/images/svg/cartes/cartes_13.svg">
                    </button>
                    <button @click="cardClick('@/assets/images/svg/cartes/cartes_20.svg')">
                        <img alt="Carte" src="@/assets/images/svg/cartes/cartes_20.svg">
                    </button>
                    <button @click="cardClick('@/assets/images/svg/cartes/cartes_40.svg')">
                        <img alt="Carte" src="@/assets/images/svg/cartes/cartes_40.svg">
                    </button>
                    <button @click="cardClick('@/assets/images/svg/cartes/cartes_100.svg')">
                        <img alt="Carte" src="@/assets/images/svg/cartes/cartes_100.svg">
                    </button>
                    <button @click="cardClick('@/assets/images/svg/cartes/cartes_cafe.svg')">
                        <img alt="Carte" src="@/assets/images/svg/cartes/cartes_cafe.svg">
                    </button>
                    <button @click="cardClick('@/assets/images/svg/cartes/cartes_interro.svg')">
                        <img alt="Carte" src="@/assets/images/svg/cartes/cartes_interro.svg">
                    </button>
                </div>

                <div v-if="debateOn">
                    <h2>Débat</h2>
                    <p>Les cartes ne sont pas les mêmes, débattez pour trouver un consensus</p>

                    
                    <div v-for="(card,index) in cards" :key="index">
                        <h3>Joueur {{ card[index].player }}</h3>
                        <img alt="Carte" :src="card[index].card">
                    </div>
                </div>
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
        maxRoundTimer: {
            type: Number,
            required: true
        },
        maxDebateTimer: {
            type: Number,
            required: true
        },
        currentRoom: {
            type: String,
            required: true
        },
    },

    data() {
        return {
            isKicked: false,
            taskIndex: 0,
            roundTimer : 0,
            debateTimer: 0,
            cardsOn: true,
            debateOn : false,
            cards : [],
            player: {},
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

        this.socket.on('allCardsSent', (cards) => {
            if (this.gameMode === 'Unanimité') {
                //Si toutes les cartes sont les mêmes
                if (cards.every((val, i, arr) => val === arr[0])) {
                    this.cardsOn = false;
                    this.taskIndex++;
                    this.roundTimerStart();
                }
                else {
                    //Si une carte est différente
                    this.cardsOn = false;
                    this.debateOn = true;
                    this.cards = cards;
                    this.debateTimerStart();

                }
            }
        });

        this.roundTimerStart();
    },

    methods: {
        roundTimerStart() {
            this.roundTimer = this.maxRoundTimer;
            let timer = setInterval(() => {
                this.roundTimer--;
                if (this.roundTimer <= 0) {
                    clearInterval(timer);
                }
            }, 1000);
        },

        debateTimerStart() {
            this.debateTimer = this.maxDebateTimer;
            let timer2 = setInterval(() => {
                this.debateTimer--;
                if (this.debateTimer <= 0) {
                    clearInterval(timer2);
                }
            }, 1000);
        },

        cardClick(card) {
            this.socket.emit('sendCard', this.currentRoom, card, this.player);
        }
    }
})
</script>