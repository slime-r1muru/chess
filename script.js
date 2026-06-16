let game = new Chess();
let boardEl = document.getElementById('chess-board');
let selectedSquare = null;
let aiDifficulty = 'normal';
let isPlayerTurn = true;

const pieceSymbols = { 'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟' };

const pieceValues = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 900 };

function createBoardHTML() {
    boardEl.innerHTML = '';
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (let rank = 8; rank >= 1; rank--) {
        for (let i = 0; i < 8; i++) {
            let squareSan = files[i] + rank;
            
            let square = document.createElement('div');
            square.classList.add('square');
            square.classList.add((rank + i) % 2 === 0 ? 'dark' : 'light');
            square.dataset.square = squareSan;
            square.onclick = () => onSquareClick(squareSan);

            let pieceDiv = document.createElement('div');
            pieceDiv.id = 'piece-' + squareSan;
            
            square.appendChild(pieceDiv);
            boardEl.appendChild(square);
        }
    }
}

function drawPieces() {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (let rank = 1; rank <= 8; rank++) {
        for (let i = 0; i < 8; i++) {
            let squareSan = files[i] + rank;
            let piece = game.get(squareSan);
            let pieceDiv = document.getElementById('piece-' + squareSan);
            
            pieceDiv.className = 'piece';
            pieceDiv.innerHTML = '';

            if (piece) {
                pieceDiv.classList.add(piece.color === 'w' ? 'white' : 'black');
                pieceDiv.innerHTML = pieceSymbols[piece.type];
            }
        }
    }
}

function startGame(difficulty) {
    aiDifficulty = difficulty;
    game.reset(); 
    selectedSquare = null;
    isPlayerTurn = true;
    createBoardHTML(); 
    drawPieces(); 
    updateStatus();
    document.getElementById('screen-menu').style.display = 'none';
    document.getElementById('screen-game').style.display = 'flex';
}

function onSquareClick(square) {
    if (game.game_over() || !isPlayerTurn) return;

    if (selectedSquare && document.querySelector(`[data-square="${square}"].possible-move`)) {
        makeMove(selectedSquare, square);
        return;
    }

    clearHighlights();
    let piece = game.get(square);

    if (piece && piece.color === 'w') {
        selectedSquare = square;
        document.querySelector(`[data-square="${square}"]`).classList.add('selected');
        showPossibleMoves(square); 
    } else {
        selectedSquare = null; 
    }
}

function clearHighlights() {
    document.querySelectorAll('.square').forEach(el => {
        el.classList.remove('selected', 'possible-move', 'has-piece');
    });
}

function showPossibleMoves(square) {
    let moves = game.moves({ square: square, verbose: true });
    
    moves.forEach(move => {
        let targetSquareEl = document.querySelector(`[data-square="${move.to}"]`);
        if (targetSquareEl) {
            targetSquareEl.classList.add('possible-move');
            if (game.get(move.to)) {
                targetSquareEl.classList.add('has-piece');
            }
        }
    });
}

function makeMove(from, to) {
    game.move({ from: from, to: to, promotion: 'q' }); 
    clearHighlights();
    selectedSquare = null;
    drawPieces(); 
    updateStatus();

    if (!game.game_over()) {
        isPlayerTurn = false;
        document.getElementById('status-bar').innerText = 'AI 思考中...';
        window.setTimeout(makeAIMove, 400); 
    }
}

function updateStatus() {
    let status = '';
    if (game.in_checkmate()) {
        status = (game.turn() === 'w') ? '遊戲結束，您被將死了！' : '遊戲結束，您贏了！';
    } else if (game.in_draw()) {
        status = '遊戲結束，雙方平局。';
    } else {
        status = (game.turn() === 'w') ? '您的回合 (白方)' : 'AI 回合 (黑方)';
        if (game.in_check()) status += ' ⚠️被將軍！';
    }
    document.getElementById('status-bar').innerText = status;
}

function makeAIMove() {
    if (game.game_over()) return;

    let moves = game.moves();
    let bestMove = null;

    if (aiDifficulty === 'easy') {
        bestMove = moves[Math.floor(Math.random() * moves.length)];
    } else if (aiDifficulty === 'normal') {
        bestMove = findBestMoveGreedy(moves);
    } else {
        bestMove = findBestMoveMinimax(2); 
    }

    game.move(bestMove);
    drawPieces();
    updateStatus();
    isPlayerTurn = true; 
}

function findBestMoveGreedy(moves) {
    let bestMove = null;
    let maxVal = -Infinity;
    let verboseMoves = game.moves({ verbose: true });

    for (let move of verboseMoves) {
        let score = move.captured ? pieceValues[move.captured] : 0;
        score += Math.random() * 0.1; 
        
        if (score > maxVal) {
            maxVal = score;
            bestMove = move;
        }
    }
    return bestMove || moves[Math.floor(Math.random() * moves.length)];
}

function findBestMoveMinimax(depth) {
    let verboseMoves = game.moves({ verbose: true });
    let bestVal = Infinity; 
    let bestMove = null;

    for (let move of verboseMoves) {
        game.move(move); 
        let value = minimax(depth - 1, -Infinity, Infinity, true); 
        game.undo();     

        if (value < bestVal) {
            bestVal = value;
            bestMove = move;
        }
    }
    return bestMove || verboseMoves[0];
}

function minimax(depth, alpha, beta, isMaximizingPlayer) {
    if (depth === 0 || game.game_over()) return evaluateBoard();

    let moves = game.moves({ verbose: true });

    if (isMaximizingPlayer) {
        let maxEval = -Infinity;
        for (let move of moves) {
            game.move(move);
            let ev = minimax(depth - 1, alpha, beta, false);
            game.undo();
            maxEval = Math.max(maxEval, ev);
            alpha = Math.max(alpha, ev);
            if (beta <= alpha) break; 
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let move of moves) {
            game.move(move);
            let ev = minimax(depth - 1, alpha, beta, true);
            game.undo();
            minEval = Math.min(minEval, ev);
            beta = Math.min(beta, ev);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function evaluateBoard() {
    let totalEvaluation = 0;
    const board = game.board();
    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            let piece = board[rank][file];
            if (piece) {
                let val = pieceValues[piece.type];
                totalEvaluation += (piece.color === 'w' ? val : -val);
            }
        }
    }
    return totalEvaluation;
}
