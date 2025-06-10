const socket = io();

let role = null;

const roleInfo = document.getElementById('role-info');
const setWordDiv = document.getElementById('set-word');
const guessArea = document.getElementById('guess-area');
const revealedSpan = document.getElementById('revealed');
const wrongGuessesP = document.getElementById('wrongGuesses');
const resultDiv = document.getElementById('result');

const wordInput = document.getElementById('wordInput');
const btnSetWord = document.getElementById('btnSetWord');

const guessInput = document.getElementById('guessInput');
const btnGuess = document.getElementById('btnGuess');

// Přiřazení rolí od serveru
socket.on('role', (r) => {
  role = r;
  roleInfo.textContent = `Jsi hráč: ${role === 'setter' ? 'Zadavatel slova' : 'Hádající'}`;
  if (role === 'setter') {
    setWordDiv.style.display = 'block';
  } else {
    guessArea.style.display = 'none'; // ještě neví délku slova
  }
});

// Start hry (server po připojení druhého hráče)
socket.on('startGame', (msg) => {
  resultDiv.textContent = '';
  if (role === 'setter') {
    setWordDiv.style.display = 'block';
    guessArea.style.display = 'none';
  } else {
    setWordDiv.style.display = 'none';
    guessArea.style.display = 'none'; 
  }
});

// Nastavení slova
btnSetWord.onclick = () => {
  const word = wordInput.value.trim();
  if (!word.match(/^[a-zA-Z]+$/)) {
    alert('Slovo musí obsahovat pouze písmena bez diakritiky.');
    return;
  }
  socket.emit('setWord', word);
  setWordDiv.style.display = 'none';
  guessArea.style.display = 'block';
  revealedSpan.textContent = '_ '.repeat(word.length).trim();
  wrongGuessesP.textContent = '';
  resultDiv.textContent = '';
};

// Server posílá info, že slovo bylo nastaveno, guesser zobrazí UI
socket.on('wordSet', (data) => {
  if (role === 'guesser') {
    setWordDiv.style.display = 'none';
    guessArea.style.display = 'block';
    revealedSpan.textContent = '_ '.repeat(data.length).trim();
    wrongGuessesP.textContent = '';
    resultDiv.textContent = '';
  }
});

// Hádání písmen
btnGuess.onclick = () => {
  const letter = guessInput.value.trim().toLowerCase();
  guessInput.value = '';
  if (!letter.match(/^[a-z]$/)) {
    alert('Zadej prosím jedno písmeno (a-z).');
    return;
  }
  socket.emit('guessLetter', letter);
};

// Aktualizace hry (obě role)
socket.on('updateGame', (data) => {
  revealedSpan.textContent = data.revealedLetters.join(' ');
  wrongGuessesP.textContent = 'Špatné pokusy: ' + data.wrongGuesses.join(', ');
});

// Výsledek hry
socket.on('gameOver', (data) => {
  if (data.won) {
    if(role === 'guesser'){
        resultDiv.textContent = ' Vyhrál jsi! Slovo bylo: ' + data.word;
    }else{
        resultDiv.textContent = ' Prohrál jsi! Soupeř uhodl tvoje slovo.';
    }
    
  } else {
    if(role === 'guesser'){
        resultDiv.textContent = ' Prohrál jsi! Slovo bylo: ' + data.word;
    }else
    resultDiv.textContent = ' Vyhrál jsi! Soupeř neuhodl tvoje slovo';
  }
  setWordDiv.style.display = 'none';
  guessArea.style.display = 'none';
});

// Pokud je hra plná nebo někdo odešel
socket.on('full', (msg) => {
  alert(msg);
  setWordDiv.style.display = 'none';
  guessArea.style.display = 'none';
  roleInfo.textContent = msg;
});
