const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
let cors = require("cors");
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
});

const PORT = 8080;

let users = {};
let socketToRoom = {};

const maximum = 2;
app.use(cors());

io.on("connection", (socket) => {
  console.log(socket.id, "connection");
  socket.on("join_room", (data) => {
    if (users[data.room]) {
      const length = users[data.room].length;
      if (length === maximum) {
        socket.to(socket.id).emit("room_full");
        return;
      }
    } else {
      users[data.room] = [{ id: socket.id }];
    }
    socketToRoom[socket.id] = data.room;

    socket.join(data.room);
    console.log(`[${socketToRoom[socket.id]}]: ${socket.id} enter`);

    const usersInThisRoom = users[data.room].filter(
      (user) => user.id !== socket.id,
    );

    console.log(usersInThisRoom);
    console.log(users, "####");
    console.log(socketToRoom);

    io.sockets.to(socket.id).emit("all_users", usersInThisRoom);
  });

  socket.on("offer", (sdp) => {
    console.log("offer: " + socket.id);
    socket.broadcast.emit("getOffer", sdp);
  });

  socket.on("answer", (sdp) => {
    console.log("answer: " + socket.id);
    socket.broadcast.emit("getAnswer", sdp);
  });

  socket.on("candidate", (candidate) => {
    console.log("candidate: " + socket.id);
    socket.broadcast.emit("getCandidate", candidate);
  });

  socket.on("disconnect", () => {
    console.log(`[${socketToRoom[socket.id]}]: ${socket.id} exit`);
    const roomID = socketToRoom[socket.id];
    let room = users[roomID];
    if (room) {
      room = room.filter((user) => user.id !== socket.id);
      users[roomID] = room;
      if (room.length === 0) {
        delete users[roomID];
        return;
      }
    }
    socket.broadcast.to(room).emit("user_exit", { id: socket.id });
    console.log(users);
  });
});

server.listen(PORT, () => {
  console.log(`server running on ${PORT}`);
});
