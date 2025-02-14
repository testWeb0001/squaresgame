require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

console.log("Starting HTTP server...");

const app = express();

// Connect to MongoDB using Atlas URI from .env
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Enable CORS using FRONTEND_URL from .env (e.g., https://testweb0001.github.io/squaresgame/)
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
  })
);
app.use(express.static(__dirname));

// Serve index.html on GET "/"
app.get("/", (req, res) => {
  try {
    console.log("GET / requested");
    res.sendFile(path.join(__dirname, "index.html"));
  } catch (err) {
    console.error("Error serving index.html:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Global game state updated to use 7 numbered squares and 6 empty squares.
let gameState = {
  numberedSquares: ["0", "0", "0", "0", "0", "0", "0"],
  numberedDisabled: [false, false, false, false, false, false, false],
  emptySquares: ["", "", "", "", "", ""],
  empIndex: 0,
  hide: false,
};

// Function to reset the game state with the new dimensions
function resetGameState() {
  gameState = {
    numberedSquares: ["0", "0", "0", "0", "0", "0", "0"],
    numberedDisabled: [false, false, false, false, false, false, false],
    emptySquares: ["", "", "", "", "", ""],
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
  console.log(`New client connected: ${socket.id}`);

  socket.on("joinGame", (role) => {
    try {
      console.log(`Client ${socket.id} joined as ${role}`);
      socket.role = role; // Save the role for later validation
      socket.emit("gameState", gameState);
    } catch (err) {
      console.error("Error in joinGame event:", err);
    }
  });

  socket.on("shuffle", (data) => {
    try {
      if (socket.role !== "admin") {
        console.log(`Unauthorized shuffle attempt by ${socket.id}`);
        return;
      }
      console.log("Shuffling squares...");
      // Create 6 random numbers and one dot, total 7 values.
      const values = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10));
      values.push(".");
      values.sort(() => Math.random() - 0.5);
      
      gameState.numberedSquares = values;
      gameState.numberedDisabled = [false, false, false, false, false, false, false];
      gameState.emptySquares = ["", "", "", "", "", ""];
      gameState.empIndex = 0;
      gameState.hide = false;
      
      io.emit("gameState", gameState);
      console.log("New gameState after shuffle:", gameState);
    } catch (err) {
      console.error("Error in shuffle event:", err);
    }
  });

  socket.on("revealSquare", (data) => {
    try {
      // Allow both "admin" and roles starting with "player"
      if (!socket.role || (socket.role !== "admin" && !socket.role.startsWith("player"))) {
        console.log(`Unauthorized reveal attempt by ${socket.id}`);
        return;
      }
      console.log("Received 'revealSquare' event:", data);
      const squareId = data.square; // e.g., "square1"
      const index = parseInt(squareId.replace("square", "")) - 1;
      if (isNaN(index) || index < 0 || index >= gameState.numberedSquares.length) {
        console.log("Invalid square id received:", squareId);
        return;
      }
      if (!gameState.numberedDisabled[index]) {
        gameState.numberedDisabled[index] = true;
        if (gameState.empIndex < gameState.emptySquares.length) {
          gameState.emptySquares[gameState.empIndex] = gameState.numberedSquares[index];
          console.log(
            `Revealed ${squareId}: value ${gameState.numberedSquares[index]} copied to empty square at index ${gameState.empIndex}`
          );
          gameState.empIndex++;
        } else {
          console.log("All empty squares are filled.");
        }
        io.emit("gameState", gameState);
        
        // Auto-reset game when all numbered squares are revealed
        if (gameState.numberedDisabled.every((state) => state === true)) {
          console.log("All squares revealed, resetting game in 3 seconds...");
          setTimeout(() => {
            resetGameState();
            io.emit("gameState", gameState);
          }, 3000);
        }
      } else {
        console.log(`Square ${squareId} was already revealed.`);
      }
    } catch (err) {
      console.error("Error in revealSquare event:", err);
    }
  });

  socket.on("hide", (data) => {
    try {
      if (socket.role !== "admin") {
        console.log(`Unauthorized hide attempt by ${socket.id}`);
        return;
      }
      console.log("Received 'hide' event:", data);
      gameState.hide = !gameState.hide;
      io.emit("gameState", gameState);
      console.log("Broadcasted gameState after hide:", gameState);
    } catch (err) {
      console.error("Error in hide event:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`HTTP server running on port ${PORT}`);
});
