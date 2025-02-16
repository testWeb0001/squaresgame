// socketHandlers.js
// This module contains functions to handle Socket.IO events for the game.

const { gameState, resetGameState } = require("./gameState");

// handleJoinGame: registers a new client and sends the current game state.
function handleJoinGame(socket, role) {
  console.log(`Client ${socket.id} joined as ${role}`);
  socket.role = role;
  socket.emit("gameState", gameState);
}

// handleShuffle: (admin-only) generates a new array for numberedSquares,
// resets numberedDisabled and emptySquares (but does not change the hide state).
function handleShuffle(socket, io) {
  if (socket.role !== "admin") {
    console.log(`Unauthorized shuffle attempt by ${socket.id}`);
    return;
  }
  console.log("Shuffling squares...");
  
  // Generate 5 random numbers and 2 dots.
  const numbers = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10));
  const dots = Array.from({ length: 2 }, () => ".");
  const values = numbers.concat(dots).sort(() => Math.random() - 0.5);
  console.log("Shuffle generated array:", values);
  
  // Update game state without modifying the hide state.
  gameState.numberedSquares = values;
  gameState.numberedDisabled = Array(7).fill(false);
  gameState.emptySquares = Array(5).fill("");
  gameState.empIndex = 0;
  
  io.emit("gameState", gameState);
}

// handleRevealSquare: allows admin and players (roles starting with 'player')
// to reveal a numbered square. The revealed value (even if 0) is copied to the next available empty square.
function handleRevealSquare(socket, io, data) {
  // Allow if role is admin or role starts with "player"
  if (!socket.role || (socket.role !== "admin" && !socket.role.startsWith("player"))) {
    console.log(`Unauthorized reveal attempt by ${socket.id}`);
    return;
  }
  
  console.log("Received 'revealSquare' event:", data);
  
  // Extract index from square id (e.g., "square1" -> index 0).
  const index = parseInt(data.square.replace("square", "")) - 1;
  if (isNaN(index) || index < 0 || index >= gameState.numberedSquares.length) {
    console.log("Invalid square id received:", data.square);
    return;
  }
  
  // Process only if the square hasn't been revealed yet.
  if (!gameState.numberedDisabled[index]) {
    gameState.numberedDisabled[index] = true;
    console.log(`Square ${data.square} revealed with value ${gameState.numberedSquares[index]}`);
    
    // Copy the value (even if it's 0) to the next available empty square.
    if (gameState.empIndex < gameState.emptySquares.length) {
      gameState.emptySquares[gameState.empIndex] = gameState.numberedSquares[index];
      console.log(`Value ${gameState.numberedSquares[index]} copied to empty square at index ${gameState.empIndex}`);
      gameState.empIndex++;
    } else {
      console.log("All empty squares are filled.");
    }
    
    io.emit("gameState", gameState);
    
    // Auto-reset if all numbered squares have been revealed.
    if (gameState.numberedDisabled.every(flag => flag === true)) {
      console.log("All squares revealed, resetting game in 3 seconds...");
      setTimeout(() => {
        resetGameState();
        io.emit("gameState", gameState);
      }, 3000);
    }
  } else {
    console.log(`Square ${data.square} was already revealed.`);
  }
}

// handleHide: (admin-only) toggles the visibility of the numbered squares.
function handleHide(socket, io) {
  if (socket.role !== "admin") {
    console.log(`Unauthorized hide attempt by ${socket.id}`);
    return;
  }
  console.log("Received 'hide' event");
  gameState.hide = !gameState.hide;
  io.emit("gameState", gameState);
  console.log("Broadcasted gameState after hide:", gameState);
}

module.exports = {
  handleJoinGame,
  handleShuffle,
  handleRevealSquare,
  handleHide,
};
