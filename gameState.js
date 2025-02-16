// gameState.js
// This module defines the game state for the Squares Game.

const gameState = {
  numberedSquares: ["0", "0", "0", "0", "0", "0", "0"],
  numberedDisabled: [false, false, false, false, false, false, false],
  emptySquares: ["", "", "", "", ""],
  empIndex: 0,
  hide: false,
};

function resetGameState() {
  gameState.numberedSquares = ["0", "0", "0", "0", "0", "0", "0"];
  gameState.numberedDisabled = [false, false, false, false, false, false, false];
  gameState.emptySquares = ["", "", "", "", ""];
  gameState.empIndex = 0;
  gameState.hide = false;
}

module.exports = { gameState, resetGameState };
