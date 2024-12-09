<template>
    <section class="gameBoard" v-if="!endScreen">
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
                    <button v-if="!maxDebateTimer && player.host == true" @click="endDebate">Terminer le débat</button>
                </div>
            </div>
        </div>
    </section>

    <section v-else class="endScreen">
        <h2>Fin de la partie</h2>
        <h3>La partie est terminée, merci d'avoir utilisé notre outil !</h3>

        <button @click="exportResult">Exporter le résultat</button>
        <button @click="restartBtn" v-if="player.host">Retourner au salon</button>
        
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
            endScreen : false,
            cardsOn: true,
            cardsImgList: ['0', '1', '2', '3', '5', '8', '13', '20', '40', '100', 'cafe', 'interro'],
            cards: [],
            msgList: [],
            resultJson : {}
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

                this.cards = cards;
                this.debatePermission = false;

                // Si toutes les cartes sont les mêmes
                if (cards.every((val, i, arr) => val[0] === arr[0][0])) {
                    this.resultJson[this.tasks[this.taskIndex].nom] = cards[0][0];
                    this.taskIndex++;
                    this.roundTimerStart();
                } else {

                    //On retire les cartes interro et café
                    const sortedCards = cards
                            .filter(card => card[0] !== 'interro' && card[0] !== 'cafe')
                            .sort((a, b) => Number(a[0]) - Number(b[0]));

                    // Si une carte est différente
                    if (this.gameMode === 'Unanimité') {
                        this.cardsOn = false;
                        this.debateOn = true;

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

                    if (this.gameMode === 'Majorité absolue') {

                        //Compter le nombre d'occurences de chaque carte dans le tableau
                        const count = sortedCards.reduce((acc, card) => {
                            acc[card[0]] = (acc[card[0]] || 0) + 1;
                            return acc;
                        }, {});

                        //Si une carte est égale à plus de 50% des votes, passer à la tâche suivante, sinon débat entre la plus petite carte et la plus grande
                        const maxCard = Object.keys(count).reduce((a, b) => count[a] > count[b] ? a : b);
                        const maxCardCount = count[maxCard];
                        console.log("MAX CARD COUNT", maxCardCount);

                        if (maxCardCount > cards.length / 2) {
                            this.resultJson[this.tasks[this.taskIndex].nom] = maxCard;
                            this.taskIndex++;
                            this.roundTimerStart();
                        } else {
                            this.cardsOn = false;
                            this.debateOn = true;

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
            this.chatList = [];
            this.roundTimerStart();
        });

        this.roundTimerStart();
    },

    methods: {
        roundTimerStart() {
            if (this.taskIndex >= this.tasks.length) {
                this.endScreen = true;
            }
            else {
                this.roundTimer = this.maxRoundTimer;
                let timer = setInterval(() => {
                    this.roundTimer--;
                    if (this.roundTimer <= 0) {
                        clearInterval(timer);
                    }
                }, 1000);
            }
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

        endDebate() {
            this.socket.emit('endDebate', this.currentRoom);
        },

        cardClick(card) {
            // document.getElementById(card).firstChild.classList.toggle('flipped');
            document.getElementById(card).classList.toggle('selected');

            const selectedCard = document.getElementById(card);
            const cards = document.querySelectorAll('.cardBtn');

            cards.forEach(card2 => {
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
        },

        restartBtn() {
            this.socket.emit('endGame', this.currentRoom);
        },
    }
})
</script>

<style lang="css" scoped>
@import url('./test_pokergame.css');
@import url('./pokergame.css');
</style>