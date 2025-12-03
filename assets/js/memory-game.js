document.addEventListener("DOMContentLoaded", () => {
    const board = document.getElementById("mgBoard");
    const difficultySelector = document.getElementById("mgDifficulty");
    const startBtn = document.getElementById("mgStartBtn");
    const restartBtn = document.getElementById("mgRestartBtn");
    const movesDisplay = document.getElementById("mgMoves");
    const matchesDisplay = document.getElementById("mgMatches");
    const timeDisplay = document.getElementById("mgTime");
    const bestScoreDisplay = document.getElementById("mgBest");
    const winMessage = document.getElementById("mgWin");

    if (!board || !difficultySelector || !startBtn || !restartBtn) return;

    const GAME_DATA = [
        { name: "Python", icon: '<i class="bi bi-filetype-py"></i>' },
        { name: "SQL", icon: '<i class="bi bi-database"></i>' },
        { name: "ML", icon: '<i class="bi bi-robot"></i>' },
        { name: "Tableau", icon: '<i class="bi bi-bar-chart-fill"></i>' },
        { name: "Docker", icon: '<i class="bi bi-box"></i>' },
        { name: "Git", icon: '<i class="bi bi-git"></i>' },
        { name: "Cloud", icon: '<i class="bi bi-cloud-fill"></i>' },
        { name: "Excel", icon: '<i class="bi bi-file-earmark-excel"></i>' }
    ];

    const DIFFICULTIES = {
        easy: { cards: 6, cols: 4, rows: 3, totalPairs: 6 },
        hard: { cards: 12, cols: 6, rows: 4, totalPairs: 12 },
    };

    let state = {
        difficulty: "easy",
        deck: [],
        moves: 0,
        matches: 0,
        timerInterval: null,
        startTime: 0,
        timeElapsed: 0,
        firstCard: null,
        secondCard: null,
        lockBoard: false,
        gameStarted: false,
        bestScores: { easy: null, hard: null },
    };

    const loadBestScores = () => {
        const easyScore = localStorage.getItem("mgBestEasyMoves");
        const hardScore = localStorage.getItem("mgBestHardMoves");
        state.bestScores.easy = easyScore ? parseInt(easyScore) : null;
        state.bestScores.hard = hardScore ? parseInt(hardScore) : null;
        updateBestScoreDisplay();
    };

    const updateBestScoreDisplay = () => {
        const easyText = state.bestScores.easy ?? "—";
        const hardText = state.bestScores.hard ?? "—";
        bestScoreDisplay.innerHTML = `Best Easy: <strong>${easyText} moves</strong> | Best Hard: <strong>${hardText} moves</strong>`;
    };

    const checkAndUpdateBestScore = () => {
        const mode = state.difficulty;
        const best = state.bestScores[mode];

        if (best === null || state.moves < best) {
            state.bestScores[mode] = state.moves;
            localStorage.setItem(
                `mgBest${mode === "easy" ? "Easy" : "Hard"}Moves`,
                state.moves
            );
            updateBestScoreDisplay();
        }
    };

    const formatTime = (s) =>
        `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

    const startTimer = () => {
        state.startTime = Date.now();
        state.timerInterval = setInterval(() => {
            state.timeElapsed = Math.floor((Date.now() - state.startTime) / 1000);
            timeDisplay.textContent = formatTime(state.timeElapsed);
        }, 1000);
    };

    const stopTimer = () => {
        if (state.timerInterval) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
        }
    };

    const resetGame = () => {
        stopTimer();
        state.timeElapsed = 0;
        timeDisplay.textContent = "00:00";
        state.moves = 0;
        state.matches = 0;
        state.firstCard = null;
        state.secondCard = null;
        state.lockBoard = false;
        state.gameStarted = false;
        movesDisplay.textContent = 0;
        matchesDisplay.textContent = 0;
        winMessage.style.display = "none";
        board.innerHTML = "";
        board.classList.add("is-disabled");
        startBtn.disabled = false;
        restartBtn.disabled = true;
    };

    const shuffle = (arr) => {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    };

    const generateDeck = () => {
        const count = DIFFICULTIES[state.difficulty].totalPairs;
        const chosen = GAME_DATA.slice(0, count);
        const doubled = [...chosen, ...chosen];
        shuffle(doubled);
        return doubled;
    };

    const renderBoard = () => {
        const { cols, rows } = DIFFICULTIES[state.difficulty];
        board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        board.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

        board.innerHTML = "";
        state.deck.forEach((item, idx) => {
            const card = document.createElement("div");
            card.className = "mg-card";
            card.dataset.index = idx;

            card.innerHTML = `
                <div class="mg-card-inner">
                    <div class="mg-card-front"></div>
                    <div class="mg-card-back">${item.icon}</div>
                </div>
            `;

            card.addEventListener("click", () => flipCard(card));
            board.appendChild(card);
        });
    };

    const flipCard = (card) => {
        if (state.lockBoard) return;
        if (!state.gameStarted) return;

        if (card === state.firstCard) return;

        card.classList.add("is-flipped");

        if (!state.firstCard) {
            state.firstCard = card;
            return;
        }

        state.secondCard = card;
        state.moves++;
        movesDisplay.textContent = state.moves;

        checkMatch();
    };

    const checkMatch = () => {
        const i1 = state.firstCard.dataset.index;
        const i2 = state.secondCard.dataset.index;

        if (state.deck[i1].name === state.deck[i2].name) {
            state.matches++;
            matchesDisplay.textContent = state.matches;

            state.firstCard.removeEventListener("click", flipCard);
            state.secondCard.removeEventListener("click", flipCard);

            resetFlipState();

            if (state.matches === DIFFICULTIES[state.difficulty].totalPairs) {
                endGame();
            }
        } else {
            state.lockBoard = true;
            setTimeout(() => {
                state.firstCard.classList.remove("is-flipped");
                state.secondCard.classList.remove("is-flipped");
                resetFlipState();
            }, 800);
        }
    };

    const resetFlipState = () => {
        state.firstCard = null;
        state.secondCard = null;
        state.lockBoard = false;
    };

    const endGame = () => {
        stopTimer();
        winMessage.style.display = "block";
        checkAndUpdateBestScore();
    };

    const startGame = () => {
        resetGame();
        state.deck = generateDeck();
        renderBoard();
        board.classList.remove("is-disabled");
        state.gameStarted = true;
        startTimer();
        startBtn.disabled = true;
        restartBtn.disabled = false;
    };

    startBtn.addEventListener("click", startGame);

    restartBtn.addEventListener("click", startGame);

    difficultySelector.addEventListener("change", (e) => {
        state.difficulty = e.target.value;
        resetGame();
    });

    loadBestScores();
});
