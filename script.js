let game = new Chess();
let boardEl = document.getElementById('chess-board');
let selectedSquare = null;
let aiDifficulty = 'normal';
let isPlayerTurn = true;

let pendingMove = null; 

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
    document.querySelectorAll('.in-check').forEach(el => el.classList.remove('in-check'));

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

                if (piece.type === 'k' && piece.color === game.turn() && game.in_check()) {
                    document.querySelector(`[data-square="${squareSan}"]`).classList.add('in-check');
                }
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
    if (game.game_over() || !isPlayerTurn || pendingMove) return;

    if (selectedSquare && document.querySelector(`[data-square="${square}"].possible-move`)) {
        attemptMove(selectedSquare, square);
        return;
    }

    clearHighlights(['selected', 'possible-move', 'has-piece']);
    let piece = game.get(square);

    if (piece && piece.color === 'w') {
        selectedSquare = square;
        document.querySelector(`[data-square="${square}"]`).classList.add('selected');
        showPossibleMoves(square); 
    } else {
        selectedSquare = null; 
    }
}

function clearHighlights(classesToRemove) {
    document.querySelectorAll('.square').forEach(el => {
        classesToRemove.forEach(cls => el.classList.remove(cls));
    });
}

function showPossibleMoves(square) {
    let moves = game.moves({ square: square, verbose: true });
    moves.forEach(move => {
        let targetSquareEl = document.querySelector(`[data-square="${move.to}"]`);
        if (targetSquareEl) {
            targetSquareEl.classList.add('possible-move');
            if (game.get(move.to)) targetSquareEl.classList.add('has-piece');
        }
    });
}

function attemptMove(from, to) {
    let piece = game.get(from);
    let isPromotion = (piece.type === 'p' && (to.includes('8') || to.includes('1')));

    if (isPromotion) {
        pendingMove = { from: from, to: to };
        document.getElementById('promotion-modal').style.display = 'block';
    } else {
        executeMove({ from: from, to: to });
    }
}

function submitPromotion(promotedPiece) {
    document.getElementById('promotion-modal').style.display = 'none';
    let moveObj = pendingMove;
    moveObj.promotion = promotedPiece;
    pendingMove = null;
    executeMove(moveObj);
}

function executeMove(moveObj) {
    let move = game.move(moveObj);
    if (!move) return;
    
    clearHighlights(['selected', 'possible-move', 'has-piece', 'last-move']);
    selectedSquare = null;
    
    document.querySelector(`[data-square="${move.from}"]`).classList.add('last-move');
    document.querySelector(`[data-square="${move.to}"]`).classList.add('last-move');

    drawPieces(); 
    updateStatus();

    if (!game.game_over()) {
        if (game.turn() === 'b') {
            isPlayerTurn = false;
            document.getElementById('status-bar').innerText = 'AI 思考中...';
            window.setTimeout(makeAIMove, 300); 
        } else {
            isPlayerTurn = true;
        }
    }
}

function updateStatus() {
    let status = '';
    
    if (game.in_checkmate()) {
        status = (game.turn() === 'w') ? '遊戲結束，您被將死了！' : '遊戲結束，您將死了AI！贏了！';
    } 
    else if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) {
        if (game.in_stalemate()) status = '平手 (逼和/欠行：無合法步可走)';
        else if (game.in_threefold_repetition()) status = '平手 (三次重複局面)';
        else if (game.insufficient_material()) status = '平手 (雙方兵力不足以將死)';
        else status = '平手 (50步規則或協議和局)';
    } 
    else {
        status = (game.turn() === 'w') ? '您的回合 (白方)' : 'AI 回合 (黑方)';
        if (game.in_check()) status += ' ⚠️被將軍！';
    }
    
    let statusBar = document.getElementById('status-bar');
    statusBar.innerText = status;
    if (game.game_over() || game.in_check()) {
        statusBar.style.background = 'rgba(231, 76, 60, 0.8)';
    } else {
        statusBar.style.background = 'rgba(0,0,0,0.3)';
    }
}

function makeAIMove() {
    if (game.game_over()) return;

    let moves = game.moves({ verbose: true });
    if (moves.length === 0) return;
    
    let bestMove = null;

    if (aiDifficulty === 'easy') {
        bestMove = moves[Math.floor(Math.random() * moves.length)];
    } else if (aiDifficulty === 'normal') {
        bestMove = findBestMoveGreedy(moves);
    } else {
        bestMove = findBestMoveMinimax(3);
    }

    if (bestMove.promotion) bestMove.promotion = 'q';

    executeMove(bestMove);
}

function findBestMoveGreedy(moves) {
    let bestMove = null;
    let maxVal = -Infinity;

    for (let move of moves) {
        let score = move.captured ? pieceValues[move.captured] : 0;
        score += Math.random() * 0.1; 
        
        if (score > maxVal) { maxVal = score; bestMove = move; }
    }
    return bestMove || moves[Math.floor(Math.random() * moves.length)];
}

function findBestMoveMinimax(depth) {
    let verboseMoves = game.moves({ verbose: true });
    let bestVal = Infinity; 
    let bestMove = null;

    verboseMoves.sort(() => Math.random() - 0.5);

    for (let move of verboseMoves) {
        if (move.promotion) move.promotion = 'q';
        game.move(move); 
        let value = minimax(depth - 1, -Infinity, Infinity, true); 
        game.undo();     

        if (value < bestVal) { bestVal = value; bestMove = move; }
    }
    return bestMove || verboseMoves[0];
}

function minimax(depth, alpha, beta, isMaximizingPlayer) {
    if (depth === 0 || game.game_over()) return evaluateBoard();

    let moves = game.moves({ verbose: true });

    if (isMaximizingPlayer) {
        let maxEval = -Infinity;
        for (let move of moves) {
            if (move.promotion) move.promotion = 'q';
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
            if (move.promotion) move.promotion = 'q';
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
    if (game.in_checkmate()) {
        return game.turn() === 'w' ? -9999 : 9999;
    }
    if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) {
        return 0; 
    }

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
