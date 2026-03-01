const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(express.static("public"));

const rooms = {};
// ✅ store reactions per room: roomsReactions[roomId][messageId] = { "👍": 2, "❤️": 1 ... }
const roomsReactions = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  let currentRoom = null;

  socket.on("join-room", (roomId, username) => {
    currentRoom = roomId;

    if (!rooms[roomId]) rooms[roomId] = [];
    if (!roomsReactions[roomId]) roomsReactions[roomId] = {};

    socket.join(roomId);

    rooms[roomId].push({
      id: socket.id,
      username: username || "Guest",
    });

    socket.to(roomId).emit("user-connected", socket.id, username);

    socket.emit(
      "room-users",
      rooms[roomId].filter((user) => user.id !== socket.id)
    );

    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // ✅ messages (now includes id)
  socket.on("send-message", (payload) => {
    if (!currentRoom) return;

    const user = rooms[currentRoom]?.find((u) => u.id === socket.id);
    const username = user ? user.username : "Guest";

    const isHost = rooms[currentRoom] && rooms[currentRoom][0]?.id === socket.id;
    const displayName = username + (isHost ? " (Host)" : "");

    // init reactions for message
    if (!roomsReactions[currentRoom][payload.id]) {
      roomsReactions[currentRoom][payload.id] = {};
    }

    socket.to(currentRoom).emit("receive-message", {
      id: payload.id,
      user: displayName,
      text: payload.text,
      senderId: socket.id,
      reactions: roomsReactions[currentRoom][payload.id],
    });
  });

  // ✅ typing
  socket.on("typing", (isTyping) => {
    if (!currentRoom) return;
    const user = rooms[currentRoom]?.find((u) => u.id === socket.id);
    const username = user ? user.username : "Guest";

    socket.to(currentRoom).emit("typing", {
      user: username,
      senderId: socket.id,
      isTyping,
    });
  });

  // ✅ reactions
  socket.on("reaction", ({ messageId, emoji }) => {
    if (!currentRoom) return;

    if (!roomsReactions[currentRoom][messageId]) {
      roomsReactions[currentRoom][messageId] = {};
    }

    const r = roomsReactions[currentRoom][messageId];
    r[emoji] = (r[emoji] || 0) + 1;

    // broadcast new count to everyone
    io.to(currentRoom).emit("reaction-update", {
      messageId,
      emoji,
      count: r[emoji],
    });
  });

  // WebRTC signals
  socket.on("offer", (offer, targetId) => socket.to(targetId).emit("offer", offer, socket.id));
  socket.on("answer", (answer, targetId) => socket.to(targetId).emit("answer", answer, socket.id));
  socket.on("ice-candidate", (candidate, targetId) =>
    socket.to(targetId).emit("ice-candidate", candidate, socket.id)
  );

  socket.on("leave-room", () => handleDisconnect());

  const handleDisconnect = () => {
    if (currentRoom && rooms[currentRoom]) {
      const user = rooms[currentRoom].find((u) => u.id === socket.id);
      const username = user ? user.username : "Guest";

      rooms[currentRoom] = rooms[currentRoom].filter((u) => u.id !== socket.id);

      if (rooms[currentRoom].length === 0) {
        delete rooms[currentRoom];
        delete roomsReactions[currentRoom];
      } else {
        socket.to(currentRoom).emit("user-disconnected", socket.id, username);
      }

      socket.leave(currentRoom);
      currentRoom = null;
    }
  };

  socket.on("disconnect", handleDisconnect);
});

const PORT = process.env.PORT || 5173;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));