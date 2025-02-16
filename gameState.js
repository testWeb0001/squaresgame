// gameState.js
// This file defines the game state for the Squares Game.
// - numberedSquares: an array of 7 values (each will be a random number or a dot after shuffle)
// - numberedDisabled: an array of 7 booleans indicating whether each numbered square is revealed
// - emptySquares: an array of 5 empty strings that will be filled when a player reveals a square
// - empIndex: tracks the next available index in emptySquares to update
// - hide: a flag to toggle the visibility of numbered squares

let gameState = {
    numberedSquares: ["0", "0", "0", "0", "0", "0", "0"],      // 7 colored squares
    numberedDisabled: [false, false, false, false, false, false, false], // 7 flags
    emptySquares: ["", "", "", "", ""],                         // 5 empty squares
    empIndex: 0,
    hide: false,
  };
  
  // resetGameState resets the game state to its default configuration.
  function resetGameState() {
    gameState = {
      numberedSquares: ["0", "0", "0", "0", "0", "0", "0"],
      numberedDisabled: [false, false, false, false, false, false, false],
      emptySquares: ["", "", "", "", ""],
      empIndex: 0,
      hide: false,
    };
  }
  
  module.exports = { gameState, resetGameState };
  