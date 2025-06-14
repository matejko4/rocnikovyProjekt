// Import základních modulů
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// Vytvoření aplikace a serveru
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Statické soubory z adresáře "public" (HTML, CSS, JS)
app.use(express.static('public'));

// Seznam připojených hráčů (socket.id) a výchozí stav hry
let players = [];
let gameState = {
  word: '',                // Tajné slovo
  revealedLetters: [],     // Odhalená písmena (např. ['_', 'a', '_'])
  wrongGuesses: [],        // Seznam špatných pokusů
  maxTries: 5,             // Maximální počet chyb
  gameOver: false          // Je hra u konce?
};

// Po připojení hráče
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Přijmeme maximálně 2 hráče
  if (players.length < 2) {
    players.push(socket.id);

    // První hráč je zadavatel, druhý hádač
    const role = players.length === 1 ? 'setter' : 'guesser';
    socket.emit('role', role);

    // Pokud jsou připojeni oba hráči, začíná hra
    if (players.length === 2) {
      io.to(players[0]).emit('startGame');
      io.to(players[1]).emit('startGame');
    }

  } else {
    // Více než dva hráči nejsou povoleni
    socket.emit('full', 'Hra je plná, zkus to později.');
    return;
  }

  // Nastavení slova od zadavatele
  socket.on('setWord', (word) => {
    if (socket.id !== players[0]) return; // Zkontroluj, že to posílá správný hráč

    word = word.toLowerCase();
    gameState.word = word;
    gameState.revealedLetters = Array(word.length).fill('_');
    gameState.wrongGuesses = [];
    gameState.gameOver = false;

    // Informuj hádače, kolik písmen má slovo
    io.to(players[1]).emit('wordSet', { length: word.length });

    // Informuj zadavatele o stavu (aby viděl odhalená písmena)
    io.to(players[0]).emit('updateGame', {
      revealedLetters: gameState.revealedLetters,
      wrongGuesses: gameState.wrongGuesses
    });
  });

  // Zpracování hádání písmena
  socket.on('guessLetter', (letter) => {
    if (socket.id !== players[1]) return;       // Jen hádač může hádat
    if (gameState.gameOver) return;             // Hra už skončila?

    letter = letter.toLowerCase();  // Převedení na male písmeno

    // Pokud písmeno je ve slově, odhalí se
    if (gameState.word.includes(letter)) {
      gameState.word.split('').forEach((char, idx) => {
        if (char === letter) {
          gameState.revealedLetters[idx] = letter;
        }
      });
    } else {
      // Pokud je špatné, přidá se do seznamu pokusů (bez duplicit)
      if (!gameState.wrongGuesses.includes(letter)) {
        gameState.wrongGuesses.push(letter);
      }
    }

    // Zkontroluj, jestli hra skončila (vyhrál nebo prohrál)
    if (gameState.wrongGuesses.length >= gameState.maxTries) {
      gameState.gameOver = true;
      // Prohra – překročen max. počet pokusů
      io.to(players[0]).emit('gameOver', { won: false, word: gameState.word });
      io.to(players[1]).emit('gameOver', { won: false, word: gameState.word });
    } else if (!gameState.revealedLetters.includes('_')) {
      gameState.gameOver = true;
      // Výhra – všechna písmena odhalena
      io.to(players[0]).emit('gameOver', { won: true, word: gameState.word });
      io.to(players[1]).emit('gameOver', { won: true, word: gameState.word });
    } else {
      // Průběžná aktualizace hry pro oba hráče
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

  // Restart hry – prohození rolí
  socket.on('restartGame', () => {
    console.log('Restart hry požadován hráčem:', socket.id);

    if (players.length === 2) {
      players.reverse(); // Prohození rolí (hádač ↔ zadavatel)

      // Reset stavu hry
      gameState = {
        word: '',
        revealedLetters: [],
        wrongGuesses: [],
        maxTries: 5,
        gameOver: false
      };

      // Nastavení nových rolí
      io.to(players[0]).emit('role', 'setter');
      io.to(players[1]).emit('role', 'guesser');

      // Oznámení o restartu a spuštění nové hry
      io.to(players[0]).emit('restartGame');
      io.to(players[1]).emit('restartGame');

      io.to(players[0]).emit('startGame', 'Napiš nové tajné slovo.');
      io.to(players[1]).emit('startGame', 'Čekej na nové slovo a hádej.');
    }
  });

  // Odpojení hráče
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Odebrání hráče ze seznamu
    players = players.filter(id => id !== socket.id);

    // Ukončení hry
    gameState.gameOver = true;
    players.forEach(id => {
      io.to(id).emit('full', 'Druhý hráč odešel, hra skončila.');
    });

    gameState.word = ''; // Vyčištění slova
  });
});

// Spuštění serveru
server.listen(3000, () => {
  console.log('Server běží na http://localhost:3000');
});
