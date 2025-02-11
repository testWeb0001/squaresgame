const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

console.log("Starting server...");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));

app.get("/", (req, res) => {
  console.log("GET / requested");
  res.sendFile(path.join(publicPath, "index.html"));
});

// Global shared game state
let gameState = {
  numberedSquares: ["0", "0", "0", "0", "0", "0"],     // 6 numbered squares
  numberedDisabled: [false, false, false, false, false, false], // Whether a square has been revealed (disabled)
  emptySquares: ["", "", "", "", ""],                    // 5 empty squares
  empIndex: 0,                                          // Next empty square index to update
  hide: false                                           // Flag to indicate if numbers are hidden
};

io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // When a client joins, send the current game state
  socket.on("joinGame", (role) => {
    console.log(`Client ${socket.id} joined as ${role}`);
    socket.emit("gameState", gameState);
  });

  // When a client triggers the shuffle event, update gameState and broadcast
  socket.on("shuffle", (data) => {
    console.log("Received 'shuffle' event:", data);
    // Generate random values for numbered squares:
    const values = [".", ...Array.from({ length: 5 }, () => Math.floor(Math.random() * 10))];
    values.sort(() => Math.random() - 0.5);
    gameState.numberedSquares = values;
    gameState.numberedDisabled = [false, false, false, false, false, false];
    gameState.emptySquares = ["", "", "", "", ""];
    gameState.empIndex = 0;
    gameState.hide = false; // reset hide state
    io.emit("gameState", gameState);
    console.log("Broadcasted new gameState after shuffle:", gameState);
  });

  // When a client reveals a numbered square
  socket.on("revealSquare", (data) => {
    console.log("Received 'revealSquare' event:", data);
    // data should have a property 'square' (e.g., "square1")
    const squareId = data.square;
    const index = parseInt(squareId.replace("square", "")) - 1;
    if (!isNaN(index) && index >= 0 && index < gameState.numberedSquares.length) {
      if (!gameState.numberedDisabled[index]) {
        // Mark this square as revealed
        gameState.numberedDisabled[index] = true;
        // Update the next empty square if available
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

  // When a client triggers the hide event
  socket.on("hide", (data) => {
    console.log("Received 'hide' event:", data);
    // Toggle hide state
    gameState.hide = !gameState.hide;
    io.emit("gameState", gameState);
    console.log("Broadcasted gameState after hide:", gameState);
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
