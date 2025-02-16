// socketHandlers.js
// This module contains functions to handle Socket.IO events for the game.

const { gameState, resetGameState } = require("./gameState");

// handleJoinGame: registers a new client and sends the current game state.
function handleJoinGame(socket, role) {
  console.log(`Client ${socket.id} joined as ${role}`);
  socket.role = role; // Save the role on the socket for later validation.
  socket.emit("gameState", gameState);
}

// handleShuffle: (admin-only) generates a new array for numberedSquares.
// It creates 5 random numbers (0–9) and 2 dots (".") and shuffles them randomly.
function handleShuffle(socket, io) {
  if (socket.role !== "admin") {
    console.log(`Unauthorized shuffle attempt by ${socket.id}`);
    return;
  }
  console.log("Shuffling squares...");
  
  // Generate 5 random numbers.
  const numbers = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10));
  // Generate 2 dots.
  const dots = Array.from({ length: 2 }, () => ".");
  // Concatenate to form an array of 7 values.
  const values = numbers.concat(dots);
  // Shuffle the array randomly.
  values.sort(() => Math.random() - 0.5);
  console.log("Shuffle generated array:", values, "Length:", values.length);
  
  // Update game state.
  gameState.numberedSquares = values;
  gameState.numberedDisabled = [false, false, false, false, false, false, false];
  gameState.empIndex = 0;  // Reset the pointer for emptySquares.
  gameState.hide = false;
  
  io.emit("gameState", gameState);
  console.log("New gameState after shuffle:", gameState);
}

// handleRevealSquare: when a player clicks a numbered square,
// it marks the square as revealed and copies its value to the next available empty square.
function handleRevealSquare(socket, io, data) {
  // Only allow if role is admin or starts with "player".
  if (!socket.role || (socket.role !== "admin" && !socket.role.startsWith("player"))) {
    console.log(`Unauthorized reveal attempt by ${socket.id}`);
    return;
  }
  console.log("Received 'revealSquare' event:", data);
  
  // Extract index from square id (e.g., "square1" -> index 0).
  const squareId = data.square;
  const index = parseInt(squareId.replace("square", "")) - 1;
  if (isNaN(index) || index < 0 || index >= gameState.numberedSquares.length) {
    console.log("Invalid square id received:", squareId);
    return;
  }
  // If the square is not yet revealed, mark it as revealed.
  if (!gameState.numberedDisabled[index]) {
    gameState.numberedDisabled[index] = true;
    console.log(`Square ${squareId} revealed with value ${gameState.numberedSquares[index]}`);
    // Copy the value to the next available empty square, if any.
    if (gameState.empIndex < gameState.emptySquares.length) {
      gameState.emptySquares[gameState.empIndex] = gameState.numberedSquares[index];
      console.log(`Value ${gameState.numberedSquares[index]} copied to empty square at index ${gameState.empIndex}`);
      gameState.empIndex++;
    } else {
      console.log("All empty squares are filled.");
    }
    io.emit("gameState", gameState);
    
    // If all numbered squares have been revealed, auto-reset after 3 seconds.
    if (gameState.numberedDisabled.every(state => state === true)) {
      console.log("All squares revealed, resetting game in 3 seconds...");
      setTimeout(() => {
        resetGameState();
        io.emit("gameState", gameState);
      }, 3000);
    }
  } else {
    console.log(`Square ${squareId} was already revealed.`);
  }
}

// handleHide: (admin-only) toggles the visibility of the numbered squares.
function handleHide(socket, io, data) {
  if (socket.role !== "admin") {
    console.log(`Unauthorized hide attempt by ${socket.id}`);
    return;
  }
  console.log("Received 'hide' event:", data);
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
