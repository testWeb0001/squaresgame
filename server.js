// server.js
// This file sets up an Express server with Socket.IO and (optionally) MongoDB.
// It maintains a game state with 7 numbered squares and 5 empty squares.

require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

console.log("Starting HTTP server...");

const app = express();

// Connect to MongoDB using the connection string from .env (optional)
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Enable CORS using FRONTEND_URL from .env
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
  })
);
app.use(express.static(__dirname));

// Serve index.html when the root URL is requested
app.get("/", (req, res) => {
  console.log("GET / requested");
  res.sendFile(path.join(__dirname, "index.html"));
});

/* ----- Game State ----- */
// We use 7 numbered squares and 5 empty squares.
let gameState = {
  // 7 numbered squares (initial values are "0")
  numberedSquares: ["0", "0", "0", "0", "0", "0", "0"],
  // 7 flags indicating whether each numbered square has been revealed
  numberedDisabled: [false, false, false, false, false, false, false],
  // 5 empty squares for revealed values
  emptySquares: ["", "", "", "", ""],
  // Pointer for the next available empty square
  empIndex: 0,
  // Flag to toggle visibility (false = visible)
  hide: false,
};

// Reset game state to default values.
function resetGameState() {
  gameState = {
    numberedSquares: ["0", "0", "0", "0", "0", "0", "0"],
    numberedDisabled: [false, false, false, false, false, false, false],
    emptySquares: ["", "", "", "", ""],
    empIndex: 0,
    hide: false,
  };
}

/* ----- Socket.IO Setup ----- */
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // joinGame: store client's role and send current game state
  socket.on("joinGame", (role) => {
    console.log(`Socket ${socket.id} joined as ${role}`);
    socket.role = role;
    socket.emit("gameState", gameState);
  });
  
  // shuffle: generate 7 new values (5 random numbers and 2 dots), then update game state.
  socket.on("shuffle", () => {
    console.log("Shuffling numbered squares...");
    // Generate 5 random numbers (0–9)
    const numbers = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10));
    // Generate 2 dots
    const dots = Array.from({ length: 2 }, () => ".");
    // Combine to form a 7-element array
    const values = numbers.concat(dots);
    // Shuffle the array randomly
    values.sort(() => Math.random() - 0.5);
    console.log("Shuffle generated array:", values, "Length:", values.length);
    
    // Update game state arrays with 7 elements.
    gameState.numberedSquares = values;
    gameState.numberedDisabled = [false, false, false, false, false, false, false];
    gameState.emptySquares = ["", "", "", "", ""];
    gameState.empIndex = 0;
    gameState.hide = false;
    
    io.emit("gameState", gameState);
    console.log("Game state after shuffle:", gameState);
  });
  
  // revealSquare: when a player clicks a numbered square,
  // mark that square as revealed and copy its value to the next empty square.
  socket.on("revealSquare", (data) => {
    if (!socket.role || (socket.role !== "admin" && !socket.role.startsWith("player"))) {
      console.log(`Unauthorized reveal attempt by ${socket.id}`);
      return;
    }
    console.log("Received 'revealSquare' event:", data);
    // Expect data.square in the format "squareX" where X is 1–7.
    const squareId = data.square;
    const index = parseInt(squareId.replace("square", "")) - 1;
    if (isNaN(index) || index < 0 || index >= gameState.numberedSquares.length) {
      console.log("Invalid square id:", squareId);
      return;
    }
    if (!gameState.numberedDisabled[index]) {
      gameState.numberedDisabled[index] = true;
      console.log(`Square ${squareId} revealed with value ${gameState.numberedSquares[index]}`);
      // Copy its value to the next available empty square if any.
      if (gameState.empIndex < gameState.emptySquares.length) {
        gameState.emptySquares[gameState.empIndex] = gameState.numberedSquares[index];
        console.log(`Value ${gameState.numberedSquares[index]} copied to empty square at index ${gameState.empIndex}`);
        gameState.empIndex++;
      } else {
        console.log("All empty squares are filled.");
      }
      io.emit("gameState", gameState);
      
      // If all numbered squares have been revealed, auto-reset after 3 seconds.
      if (gameState.numberedDisabled.every(flag => flag === true)) {
        console.log("All squares revealed. Resetting game in 3 seconds...");
        setTimeout(() => {
          resetGameState();
          io.emit("gameState", gameState);
        }, 3000);
      }
    } else {
      console.log(`Square ${squareId} was already revealed.`);
    }
  });
  
  // hide: toggle the visibility of the numbered squares' values.
  socket.on("hide", () => {
    console.log("Received 'hide' event");
    gameState.hide = !gameState.hide;
    io.emit("gameState", gameState);
    console.log("Game state after hide toggle:", gameState);
  });
  
  socket.on("disconnect", () => {
    console.log(`Socket ${socket.id} disconnected.`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
