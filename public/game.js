// Připojení k socket serveru
const socket = io();

// Proměnná pro uložení role hráče
let role = null;

// Načtení HTML elementů, se kterými budeme pracovat
const roleInfo = document.getElementById('role-info');
const setWordDiv = document.getElementById('set-word');
const guessArea = document.getElementById('guess-area');
const revealedSpan = document.getElementById('revealed');
const wrongGuessesP = document.getElementById('wrongGuesses');
const resultDiv = document.getElementById('result');
const restartBtn = document.getElementById('restartBtn');

const wordInput = document.getElementById('wordInput');
const btnSetWord = document.getElementById('btnSetWord');

const guessInput = document.getElementById('guessInput');
const btnGuess = document.getElementById('btnGuess');
const hangmanImg = document.getElementById('hangman-img');

// Server přidělí roli hráči a zobrazí se
socket.on('role', (r) => {
  role = r;
  roleInfo.textContent = `Jsi hráč: ${role === 'setter' ? 'Zadavatel slova' : 'Hádající'}`;
});

// Server zahájí novou hru – resetují se všechny zobrazované prvky
socket.on('startGame', () => {
  resultDiv.textContent = '';
  restartBtn.style.display = 'none';
  wordInput.value = '';
  guessInput.value = '';
  revealedSpan.textContent = '';
  wrongGuessesP.textContent = '';

  // Pokud je hráč zadavatelem slova, zobrazí se pole pro zadání
  if (role === 'setter') {
    setWordDiv.style.display = 'block';
    guessArea.style.display = 'none';

  } else {
    // Pokud hádá, zatím se mu nic nezobrazuje (čeká na slovo)
    setWordDiv.style.display = 'none';
    guessArea.style.display = 'none';
  }
});

// Zadání slova ze strany "setter" hráče
btnSetWord.onclick = () => {
  const word = wordInput.value.trim();

  // Kontrola, zda slovo obsahuje pouze písmena (bez čísel, diakritiky apod.)
  if (!word.match(/^[a-zA-Z]+$/)) {
    alert('Slovo musí obsahovat pouze písmena bez diakritiky.');
    return;
  }

  // Odeslání slova na server
  socket.emit('setWord', word);

  // Skryj zadání a zobraz hádací část (zatím jen u zadavatele pro vizuální účel)
  setWordDiv.style.display = 'none';
  guessArea.style.display = 'block';

  // Zobrazí se skryté slovo jako "_ _ _"
  revealedSpan.textContent = '_ '.repeat(word.length).trim();
  wrongGuessesP.textContent = '';
  resultDiv.textContent = '';
};

// Když server oznámí, že slovo bylo nastaveno, zobrazí se pole pro hádání u hádajícího
socket.on('wordSet', (data) => {
  if (role === 'guesser') {
    setWordDiv.style.display = 'none';
    guessArea.style.display = 'block';
    hangmanImg.src.display = 'block';
    hangmanImg.src = 'obrazky/hangman0.png';
    revealedSpan.textContent = '_ '.repeat(data.length).trim();
    wrongGuessesP.textContent = '';   
    resultDiv.textContent = '';   
  }
});

// Odeslání písmena ke kontrole
btnGuess.onclick = () => {
  const letter = guessInput.value.trim().toLowerCase();
  guessInput.value = '';

  // Kontrola vstupu – pouze jedno písmeno a-z
  if (!letter.match(/^[a-z]$/)) {
    alert('Zadej prosím jedno písmeno (a-z).');
    return;
  }

  // Odeslání písmena na server
  socket.emit('guessLetter', letter);
};

// Aktualizace hry po každém pokusu – správná písmena a chybné pokusy
socket.on('updateGame', (data) => {
  revealedSpan.textContent = data.revealedLetters.join(' ');
  wrongGuessesP.textContent = 'Špatné pokusy: ' + data.wrongGuesses.join(', ');

  // Změna obrázku šibenice podle počtu chybných pokusů
  const errors = data.wrongGuesses.length;
  hangmanImg.src = `obrazky/hangman${errors}.png`;
});

// Oznámení konce hry – výhra nebo prohra
socket.on('gameOver', (data) => {
  if (data.won) {
    // Pokud hádající vyhrál
    resultDiv.textContent = role === 'guesser'
      ? '🎉 Vyhrál jsi! Slovo bylo: ' + data.word
      : '💀 Prohrál jsi! Soupeř uhodl tvoje slovo.';
  } else {
    // Pokud hádající prohrál
    resultDiv.textContent = role === 'guesser'
      ? '💀 Prohrál jsi! Slovo bylo: ' + data.word
      : '🎉 Vyhrál jsi! Soupeř neuhodl tvoje slovo';

    // Ukáže se finální obrázek šibenice
    hangmanImg.src = 'obrazky/hangman5.png';
  }

  // Schování obou částí UI a zobrazení tlačítka na restart hry
  setWordDiv.style.display = 'none';
  guessArea.style.display = 'none';
  restartBtn.style.display = 'inline-block';
});

// Restart hry po kliknutí na tlačítko – odeslání signálu serveru
restartBtn.addEventListener('click', () => {
  socket.emit('restartGame'); 
});

// Když server oznámí restart hry – vše se nastaví do výchozího stavu
socket.on('restartGame', () => {
  setWordDiv.style.display = role === 'setter' ? 'block' : 'none';  
  guessArea.style.display = role === 'guesser' ? 'none' : 'none'; 

  revealedSpan.textContent = '';
  wrongGuessesP.textContent = '';
  resultDiv.textContent = '';
  hangmanImg.src = 'obrazky/hangman0.png';
});

// Když je místnost plná, zobrazí se hláška
socket.on('full', (msg) => {
  alert(msg);
  setWordDiv.style.display = 'none';
  guessArea.style.display = 'none';
  roleInfo.textContent = msg;
});
