// server.js
// This file sets up an Express server with Socket.IO and maintains our game state.
// The game state includes 7 numbered squares and 5 empty squares.
// The reset event has been modified so that any client can trigger a game reset.

require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

console.log("Starting HTTP server...");

const app = express();

// Connect to MongoDB using the connection string from .env.
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Enable CORS using FRONTEND_URL from .env.
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
  })
);
app.use(express.static(__dirname));

// Serve index.html from the root.
app.get("/", (req, res) => {
  console.log("GET / requested");
  res.sendFile(path.join(__dirname, "index.html"));
});

/* ----- Game State Setup ----- */
// Our game state contains 7 numbered squares and 5 empty squares.
let gameState = {
  numberedSquares: ["0", "0", "0", "0", "0", "0", "0"], // 7 elements
  numberedDisabled: [false, false, false, false, false, false, false], // 7 flags
  emptySquares: ["", "", "", "", ""], // 5 empty squares
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

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // joinGame: Save the client's role and send the current game state.
  socket.on("joinGame", (role) => {
    console.log(`Socket ${socket.id} joined as ${role}`);
    socket.role = role;
    socket.emit("gameState", gameState);
  });
  
  // shuffle: (admin-only) Generate 7 new values for numbered squares.
  socket.on("shuffle", () => {
    if (socket.role !== "admin") {
      console.log(`Unauthorized shuffle attempt by ${socket.id}`);
      return;
    }
    console.log("Shuffling squares...");
    // Generate 5 random numbers (0-9)
    const numbers = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10));
    // Generate 2 dots
    const dots = Array.from({ length: 2 }, () => ".");
    const values = numbers.concat(dots); // 7 elements
    values.sort(() => Math.random() - 0.5);
    console.log("Shuffle generated array:", values, "Length:", values.length);
    
    gameState.numberedSquares = values;
    gameState.numberedDisabled = [false, false, false, false, false, false, false];
    gameState.emptySquares = ["", "", "", "", ""];
    gameState.empIndex = 0;
    gameState.hide = false;
    
    io.emit("gameState", gameState);
    console.log("Game state after shuffle:", gameState);
  });
  
  // revealSquare: When a player clicks a numbered square,
  // mark that square as revealed and copy its value to the next empty square.
  socket.on("revealSquare", (data) => {
    if (!socket.role || (socket.role !== "admin" && !socket.role.startsWith("player"))) {
      console.log(`Unauthorized reveal attempt by ${socket.id}`);
      return;
    }
    console.log("Received 'revealSquare' event:", data);
    const squareId = data.square; // Expected format "squareX" where X is 1–7.
    const index = parseInt(squareId.replace("square", "")) - 1;
    if (isNaN(index) || index < 0 || index >= gameState.numberedSquares.length) {
      console.log("Invalid square id:", squareId);
      return;
    }
    if (!gameState.numberedDisabled[index]) {
      gameState.numberedDisabled[index] = true;
      console.log(`Square ${squareId} revealed with value ${gameState.numberedSquares[index]}`);
      if (gameState.empIndex < gameState.emptySquares.length) {
        gameState.emptySquares[gameState.empIndex] = gameState.numberedSquares[index];
        console.log(`Value ${gameState.numberedSquares[index]} copied to empty square at index ${gameState.empIndex}`);
        gameState.empIndex++;
      } else {
        console.log("All empty squares are filled.");
      }
      io.emit("gameState", gameState);
      
      if (gameState.numberedDisabled.every(flag => flag === true)) {
        console.log("All squares revealed, resetting game in 3 seconds...");
        setTimeout(() => {
          resetGameState();
          io.emit("gameState", gameState);
        }, 3000);
      }
    } else {
      console.log(`Square ${squareId} was already revealed.`);
    }
  });
  
  // hide: (admin-only) Toggle the visibility of numbered squares.
  socket.on("hide", () => {
    if (socket.role !== "admin") {
      console.log(`Unauthorized hide attempt by ${socket.id}`);
      return;
    }
    console.log("Received 'hide' event");
    gameState.hide = !gameState.hide;
    io.emit("gameState", gameState);
    console.log("Game state after hide toggle:", gameState);
  });
  
  // resetGame: Allow any client (or only admin if you prefer) to reset the game.
  socket.on("resetGame", () => {
    console.log("Reset game event received from", socket.id);
    resetGameState();
    io.emit("gameState", gameState);
    console.log("Game state after reset:", gameState);
  });
  
  socket.on("disconnect", () => {
    console.log(`Socket ${socket.id} disconnected.`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
