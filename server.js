// server.js
const express = require("express");
const https = require("https");
const fs = require("fs");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

console.log("Starting secure server...");

const app = express();

// Load SSL certificate and key (update the paths to your certificate files)
const options = {
  key: fs.readFileSync(path.join(__dirname, "cert", "privkey.pem")),
  cert: fs.readFileSync(path.join(__dirname, "cert", "fullchain.pem"))
};

app.use(cors());
app.use(express.static(__dirname)); // Serve static files from the root

// Serve index.html from the root on GET "/"
app.get("/", (req, res) => {
  console.log("GET / requested");
  res.sendFile(path.join(__dirname, "index.html"));
});

// Global shared game state.
let gameState = {
  numberedSquares: ["0", "0", "0", "0", "0", "0"], // 6 numbered squares
  numberedDisabled: [false, false, false, false, false, false],
  emptySquares: ["", "", "", "", ""],              // 5 empty squares
  empIndex: 0,                                      // Next empty square index to update
  hide: false                                       // Hide state flag
};

const server = https.createServer(options, app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);

  socket.on("joinGame", (role) => {
    console.log(`Client ${socket.id} joined as ${role}`);
    socket.emit("gameState", gameState);
  });

  socket.on("shuffle", (data) => {
    console.log("Received 'shuffle' event:", data);
    // Generate random values for numbered squares:
    const values = [".", ...Array.from({ length: 5 }, () => Math.floor(Math.random() * 10))];
    values.sort(() => Math.random() - 0.5);
    gameState.numberedSquares = values;
    gameState.numberedDisabled = [false, false, false, false, false, false];
    gameState.emptySquares = ["", "", "", "", ""];
    gameState.empIndex = 0;
    gameState.hide = false;
    io.emit("gameState", gameState);
    console.log("Broadcasted new gameState after shuffle:", gameState);
  });

  socket.on("revealSquare", (data) => {
    console.log("Received 'revealSquare' event:", data);
    const squareId = data.square; // e.g., "square1"
    const index = parseInt(squareId.replace("square", "")) - 1;
    if (!isNaN(index) && index >= 0 && index < gameState.numberedSquares.length) {
      if (!gameState.numberedDisabled[index]) {
        gameState.numberedDisabled[index] = true;
        if (gameState.empIndex < gameState.emptySquares.length) {
          gameState.emptySquares[gameState.empIndex] = gameState.numberedSquares[index];
          console.log(`Revealed ${squareId}: value ${gameState.numberedSquares[index]} copied to empty square at index ${gameState.empIndex}`);
          gameState.empIndex++;
        } else {
          console.log("All empty squares are filled.");
        }
        io.emit("gameState", gameState);
      } else {
        console.log(`Square ${squareId} was already revealed.`);
      }
    } else {
      console.log("Invalid square id received:", squareId);
    }
  });

  socket.on("hide", (data) => {
    console.log("Received 'hide' event:", data);
    gameState.hide = !gameState.hide; // Toggle hide state
    io.emit("gameState", gameState);
    console.log("Broadcasted gameState after hide:", gameState);
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Secure server running on https://0.0.0.0:${PORT}`);
});
