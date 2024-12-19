<template>
    <link href="pokergame.css" rel="stylesheet">
    <section class="gameBoard" v-if="!endScreen">
        <!-- <h1 v-if="maxRoundTimer != 0 && cardsOn">Temps restant : {{ roundTimer }}</h1>
        <h1 v-if="maxRoundTimer == 0 && cardsOn">Temps restant : illimité</h1> -->
        <h1 class="temps" v-if="maxDebateTimer != 0 && debateOn">Temps restant : {{ debateTimer }}</h1>
        <h1 class="temps" v-if="maxDebateTimer == 0 && debateOn">Temps restant : illimité</h1>
        <div class="tache" v-for="(task, index) in tasks" :key="index">
            <div v-if="index == taskIndex">
                <h2>Tâche {{ index + 1 }} : {{ task.nom }}</h2>

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

                <div class="card-container">
                <div v-if="interRound">
                    <p class="resultat">Difficulté attribuée :</p>
                    <img alt="Carte"
                        :src="require('@/assets/images/svg/cartes/cartes_' + resultJson.tasks[taskIndex - 1].note + '.svg')">
                </div>
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
                        <div class="input-container">
                        <input class="message" v-if="debatePermission" type="text" v-model="chatMsg"><button class="envoyer" v-if="debatePermission"
                            type="submit" @click="sendMsg">Envoyer</button>
                        </div>
                    </form>
                    <p class="consensus">Tout le monde n'est pas en accord avec la difficulté de la tâche : les deux extrêmes, débattez
                        pour trouver un consensus.</p>

                    <div v-for="(card, index) in cards" :key="index">
                        <h3>Joueur {{ card[1] }}</h3>
                        <img alt="Carte" :src="require('@/assets/images/svg/cartes/cartes_' + card[0] + '.svg')">
                    </div>
                    <button class="terminer" v-if="player.host == true" @click="endDebate">Terminer le débat</button>
                </div>
            </div>
        </div>
    </section>

    <section v-else class="endScreen">
        <h2 class="fin">Fin de la partie</h2>
        <h3 class="partieFinie">La partie est terminée, merci d'avoir utilisé notre outil !</h3>

        <h3 class="recap">Récapitulatif de la partie :</h3>
        <div v-for="(task, index) in resultJson.tasks" :key="index">
            <p class="nomTache">{{ task.nom }} :</p>
            <img class="image" alt="Carte" v-if="task.note != ''"
                :src="require('@/assets/images/svg/cartes/cartes_' + task.note + '.svg')">
        </div>

        <button class="export" @click="exportResult">Exporter le résultat</button>
        <button class="retour" @click="restartBtn" v-if="player.host">Retourner au salon</button>
        <p v-if="!player.host">En attente de l'hôte de la partie...</p>

    </section>
</template>

<script>
import { defineComponent } from 'vue';
import 'socket.io-client';

export default defineComponent({
    /**
     * @namespace PokerGame
     */
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
        // maxRoundTimer: {
        //     type: Number,
        //     required: true
        // },
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
            interRound: false,
            debateTimer: 10,
            debateOn: false,
            debatePermission: false,
            endScreen: false,
            cardsOn: true,
            cardsImgList: ['0', '1', '2', '3', '5', '8', '13', '20', '40', '100', 'cafe', 'interro'],
            cards: [],
            msgList: [],
            resultJson: { "tasks": [] }
        }
    },

    computed: {
        currentRoomPlayers() {
            return this.rooms.find(room => room.id === this.player.roomId);
        },
    },

    mounted() {

        //Récupération des tâches et des notes si elles existent dans le json importé (reprise de la progression)
        let index = 0;
        this.tasks.forEach(task => {
            if (task.note == "") {
                this.resultJson["tasks"][index] = { "nom": task.nom, "note": "" };
                index++;
            }
            else {
                this.resultJson["tasks"][this.taskIndex] = { "nom": task.nom, "note": task.note };
                this.taskIndex++;
                index++;
            }
        });

        /**
         * Receive the player object from the server
         * @event PokerGame#receivePlayer
         * @param {object} player - The player object sended by the server
         */
        this.socket.on('receivePlayer', (player) => {
            this.player = player;
            console.log("Player : ", this.player);

        });

        /**
         * Receives all the voted cards from the server, validates the difficulty of the current task based on the gamemode or starts a debate if there is no consensus
         * @event PokerGame#allCardsSent
         * @param {object} cards - The object containing voted cards (name and difficulty)
         */
        this.socket.on('allCardsSent', (cards) => {
            setTimeout(() => {

                this.cards = cards;
                this.debatePermission = false;

                //Si toutes les cartes sont les mêmes et que c'est la carte café, télécharger le résultat
                if (cards.every((val, i, arr) => val[0] === arr[0][0]) && cards[0][0] === 'cafe') {
                    this.endScreen = true;
                }
                else {
                    // Si toutes les cartes sont les mêmes
                    if (cards.every((val, i, arr) => val[0] === arr[0][0])) {
                        this.resultJson["tasks"][this.taskIndex].note = cards[0][0];
                        this.taskIndex++;
                        this.nextStep();
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

                            if (maxCardCount > cards.length / 2 && cards.length > 0) {
                                this.resultJson["tasks"][this.taskIndex].note = maxCard;
                                this.taskIndex++;
                                this.nextStep();
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
                }

            }, 2000);
        });

        /**
         * Receives debate messages from the server
         * @event PokerGame#receiveMsg
         * @param {object} player - The player object sended by the server
         */
        this.socket.on('receiveMsg', (msg, username) => {
            this.msgList.push([msg, username]);
        });

        /**
         * Receives the endDebate event from the server, hides the debate screen, displays the card screen and starts the next task
         * @event PokerGame#endDebate
         */
        this.socket.on('endDebate', () => {
            this.debateOn = false;
            this.cardsOn = true;
            this.chatList = [];
            this.nextStep();
        });
    },

    methods: {

        /**
         * Displays a inter-round screen showing the voted card, or display the end screen if there is no more tasks to vote for
         * @memberof PokerGame
         * @constructor
         */
        nextStep() {

            this.cardsOn = false;
            this.interRound = true;

            setTimeout(() => {
                this.interRound = false;
                this.cardsOn = true;
            }, 5000);

            if (this.taskIndex >= this.tasks.length) {
                setTimeout(() => {
                    this.endScreen = true;
                }, 5000);
            }
        },

        /**
         * Hides the card screen, displays the debate screen and starts the debate timer
         * @memberof PokerGame
         * @constructor
         */
        debateTimerStart() {
            if (this.maxDebateTimer == 0) {
                return;
            }
            else {
                this.debateTimer = this.maxDebateTimer;
                let timer2 = setInterval(() => {
                    this.debateTimer--;
                    if (this.debateTimer <= 0) {
                        this.endDebate();
                        this.debateTimer = this.maxDebateTimer;
                        clearInterval(timer2);
                    }
                }, 1000);
            }
        },

        /**
         * Sends the endDebate event to the server
         * @memberof PokerGame
         * @constructor
         */
        endDebate() {
            this.socket.emit('endDebate', this.currentRoom);
        },

        /**
         * Handles cards animations and sends the selected card to the server
         * @param {string} card - The selected card's name
         * @memberof PokerGame
         * @constructor
         */
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

        /**
         * Sends the current debate message to the server
         * @memberof PokerGame
         * @constructor
         */
        sendMsg() {
            if (this.chatMsg) {
                this.socket.emit('sendMsg', this.currentRoom, this.chatMsg, this.player.username);
                this.chatMsg = '';
            }
        },

        /**
         * Exports the current state of tasks with their attributed difficulty to a json file
         * @function exportResult
         * @memberof PokerGame
         * @constructor
         */
        exportResult() {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.resultJson));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "result.json");
            document.body.appendChild(downloadAnchorNode); // required for firefox
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        },

        /**
         * Send the endGame event to the server
         * @memberof PokerGame
         * @constructor
         */
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