const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let players = [];
let gameState = {
  word: '',
  revealedLetters: [],
  wrongGuesses: [],
  maxTries: 5,
  gameOver: false
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Přidání hráče pokud není plno
  if (players.length < 2) {
    players.push(socket.id);
    const role = players.length === 1 ? 'setter' : 'guesser';
    socket.emit('role', role);

    if (players.length === 2) {
      // Po připojení obou hráčů pošli start zprávy
      io.to(players[0]).emit('startGame', 'Napiš tajné slovo.');
      io.to(players[1]).emit('startGame', 'Čekej na slovo a hádej.');
    }
  } else {
    // Hra je plná
    socket.emit('full', 'Hra je plná, zkus to později.');
    return;
  }

  socket.on('setWord', (word) => {
    if (socket.id !== players[0]) return; // Jen setter může zadat slovo
    word = word.toLowerCase();
    gameState.word = word;
    gameState.revealedLetters = Array(word.length).fill('_');
    gameState.wrongGuesses = [];
    gameState.gameOver = false;

    // Pošli guesserovi info o délce slova
    io.to(players[1]).emit('wordSet', { length: word.length });
    // Aktualizuj i setterovi UI
    io.to(players[0]).emit('updateGame', {
      revealedLetters: gameState.revealedLetters,
      wrongGuesses: gameState.wrongGuesses
    });
  });

  socket.on('guessLetter', (letter) => {
    if (socket.id !== players[1]) return; // Jen guesser hádá
    if (gameState.gameOver) return;

    letter = letter.toLowerCase();
    if (gameState.word.includes(letter)) {
      gameState.word.split('').forEach((char, idx) => {
        if (char === letter) {
          gameState.revealedLetters[idx] = letter;
        }
      });
    } else {
      if (!gameState.wrongGuesses.includes(letter)) {
        gameState.wrongGuesses.push(letter);
      }
    }

    // Zkontroluj konec hry
    if (gameState.wrongGuesses.length >= gameState.maxTries) {
      gameState.gameOver = true;
      io.to(players[0]).emit('gameOver', { won: false, word: gameState.word });
      io.to(players[1]).emit('gameOver', { won: false, word: gameState.word });
    } else if (!gameState.revealedLetters.includes('_')) {
      gameState.gameOver = true;
      io.to(players[0]).emit('gameOver', { won: true, word: gameState.word });
      io.to(players[1]).emit('gameOver', { won: true, word: gameState.word });
    } else {
      io.to(players[0]).emit('updateGame', {
        revealedLetters: gameState.revealedLetters,
        wrongGuesses: gameState.wrongGuesses
      });
      io.to(players[1]).emit('updateGame', {
        revealedLetters: gameState.revealedLetters,
        wrongGuesses: gameState.wrongGuesses
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    players = players.filter(id => id !== socket.id);

    // Pokud hráč odešel, ukonči hru a informuj druhého
    gameState.gameOver = true;
    players.forEach(id => {
      io.to(id).emit('full', 'Druhý hráč odešel, hra skončila.');
    });
    gameState.word = '';
  });
});

server.listen(3000, () => {
  console.log('Server běží na http://localhost:3000');
});
