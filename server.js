// server.js
// Main server file that initializes Express, connects to MongoDB, and sets up Socket.IO.

require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

// Import Socket.IO event handlers.
const {
  handleJoinGame,
  handleShuffle,
  handleRevealSquare,
  handleHide,
} = require("./socketHandlers");

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

// Enable CORS with FRONTEND_URL from .env (e.g., your GitHub Pages URL).
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
  })
);

// Serve static files from the root.
app.use(express.static(__dirname));

// Serve index.html on GET "/".
app.get("/", (req, res) => {
  try {
    console.log("GET / requested");
    res.sendFile(path.join(__dirname, "index.html"));
  } catch (err) {
    console.error("Error serving index.html:", err);
    res.status(500).send("Internal Server Error");
  }
});

const server = http.createServer(app);

// Create a new Socket.IO server with appropriate CORS settings.
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

// Set up Socket.IO connection and event handlers.
io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);
  
  socket.on("joinGame", (role) => {
    handleJoinGame(socket, role);
  });
  
  socket.on("shuffle", (data) => {
    handleShuffle(socket, io);
  });
  
  socket.on("revealSquare", (data) => {
    handleRevealSquare(socket, io, data);
  });
  
  socket.on("hide", (data) => {
    handleHide(socket, io, data);
  });
  
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`HTTP server running on port ${PORT}`);
});
