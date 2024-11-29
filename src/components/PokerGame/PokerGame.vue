<template>
    <section class="gameBoard">
        <h1>Mode de jeu : {{ gameMode }}</h1>
        <h1 v-if="maxRoundTimer && cardsOn">Temps restant : {{ roundTimer }}</h1>
        <h1 v-if="!maxRoundTimer && cardsOn">Temps restant : illimité</h1>
        <h1 v-if="maxDebateTimer && debateOn">Temps restant : {{ debateTimer }}</h1>
        <h1 v-if="!maxDebateTimer && debateOn">Temps restant : illimité</h1>
        <div v-for="(task, index) in tasks" :key="index">
            <div v-if="index == taskIndex">
                <h2>Tâche {{ index + 1 }} : {{ task.nom }}</h2>
                <p>{{ task.description }}</p>

                <div v-if="cardsOn" class="cardList">
                    <button @click="cardClick(card)" v-for="(card, index) in cardsImgList" :key="index" :id="card"
                        class="cardBtn">
                        <div :class="{ flipped: cardsOn }">
                            <img class="card-front" alt="Carte"
                                :src="require('@/assets/images/svg/cartes/cartes_' + card + '.svg')">
                            <img class="card-back" :src="require('@/assets/images/svg/cartes/cartes_dos.svg')"
                                alt="Dos carte">
                        </div>
                    </button>
                </div>

                <div v-if="debateOn">
                    <h2>Débat</h2>
                    <form class="chatdiv" @submit.prevent="sendMsg">
                        <div class="chatbox">
                            <div v-for="(msg, index) in msgList" :key="index">
                                <p v-if="msg[1] == this.player.username" class="myMsg">{{ msg[1] }} : {{ msg[0] }}</p>
                                <p v-else class="otherMsg">{{ msg[1] }} : {{ msg[0] }}</p>
                            </div>
                        </div>
                        <input v-if="debatePermission" type="text" v-model="chatMsg"><button v-if="debatePermission"
                            type="submit" @click="sendMsg">Envoyer</button>
                    </form>
                    <p>Les cartes ne sont pas les mêmes, débattez pour trouver un consensus.</p>

                    <div v-for="(card, index) in cards" :key="index">
                        <h3>Joueur {{ card[1] }}</h3>
                        <img alt="Carte" :src="require('@/assets/images/svg/cartes/cartes_' + card[0] + '.svg')">
                    </div>
                    <button v-if="!maxDebateTimer" @click="skipDebate">Terminer le débat</button>
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
            player: {},
            taskIndex: 0,
            roundTimer: 0,
            debateTimer: 0,
            debateOn: false,
            debatePermission: false,
            cardsOn: true,
            cardsImgList: ['0', '1', '2', '3', '5', '8', '13', '20', '40', '100', 'cafe', 'interro'],
            cards: [],
            msgList: [],
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
            console.log("Player : ", this.player);

        });

        this.socket.on('allCardsSent', (cards) => {
            setTimeout(() => {

                // Si toutes les cartes sont les mêmes
                if (cards.every((val, i, arr) => val[0] === arr[0][0])) {
                    this.cards = cards;
                    this.taskIndex++;
                    this.roundTimerStart();
                } else {
                    
                    // Si une carte est différente
                    if (this.gameMode === 'Unanimité') {
                        this.cardsOn = false;
                        this.debateOn = true;
                        this.cards = cards;

                        const sortedCards = cards
                            .filter(card => card[0] !== 'interro' && card[0] !== 'cafe')
                            .sort((a, b) => Number(a[0]) - Number(b[0]));


                        const firstCard = sortedCards[0][0];
                        const lastCard = sortedCards[sortedCards.length - 1][0];
                        
                        sortedCards.forEach(card => {
                            console.log(card[0], firstCard, lastCard);
                            
                            if (sortedCards[0][2] == this.player.socketId || sortedCards[sortedCards.length - 1][2] == this.player.socketId || (card[0] == firstCard && card[2] == this.player.socketId) || (card[0] == lastCard && card[2] == this.player.socketId)) {
                                this.debatePermission = true;
                            }
                        });

                        this.debateTimerStart();
                    }

                    if (this.gameMode === 'Majorité') {
                        this.cardsOn = false;
                        this.debateOn = true;
                        this.cards = cards;

                        const sortedCards = cards
                            .filter(card => card[0] !== 'interro' && card[0] !== 'cafe')
                            .sort((a, b) => Number(a[0]) - Number(b[0]));

                        const middleCard = sortedCards[Math.floor(sortedCards.length / 2)];
                        console.log(middleCard);


                        if (middleCard[1] == this.player.username) {
                            this.debatePermission = true;
                        }
                    }
                }

            }, 2000);
        });

        this.socket.on('receiveMsg', (msg, username) => {
            this.msgList.push([msg, username]);
        });

        this.socket.on('endDebate', () => {
            this.debateOn = false;
            this.cardsOn = true;
            this.taskIndex++;
            this.chatList = [];
            this.roundTimerStart();
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

        skipDebate() {
            this.socket.emit('endDebate', this.currentRoom);
        },

        cardClick(card) {
            // document.getElementById(card).firstChild.classList.toggle('flipped');
            document.getElementById(card).classList.toggle('selected');

            const selectedCard = document.getElementById(card);
            const cards = document.querySelectorAll('.cardBtn');

            cards.forEach(card2 => {
                console.log(card2.id, selectedCard.id);

                if (card2.id !== selectedCard.id) {
                    card2.firstChild.classList.toggle('flipped');
                }

                document.querySelector(".cardList").style.pointerEvents = "none";
            });
            this.socket.emit('sendCard', this.currentRoom, card, this.player.username, this.player.socketId);
        },

        sendMsg() {
            if (this.chatMsg) {
                this.socket.emit('sendMsg', this.currentRoom, this.chatMsg, this.player.username);
                this.chatMsg = '';
            }
        }
    }
})
</script>

<style lang="css" scoped>
@import url('./test_pokergame.css');
@import url('./pokergame.css');
</style>