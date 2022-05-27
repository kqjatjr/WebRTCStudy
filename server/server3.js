const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

const PORT = process.env.PORT || 8080;

let users = {};
let socketToRoom = {};

const maximum = 4;

io.on("connection", (socket) => {
  console.log(socket.id, "connection");
  socket.on("join_room", (data) => {
    if (users[data.room]) {
      const length = users[data.room].length;
      if (length === maximum) {
        socket.to(socket.id).emit("room_full");
        return;
      }
      users[data.room] = [...users[data.room], { id: socket.id }];
    } else {
      users[data.room] = [{ id: socket.id }];
    }
    socketToRoom[socket.id] = data.room;

    socket.join(data.room);
    console.log(`[${socketToRoom[socket.id]}]: ${socket.id} enter`);

    const usersInThisRoom = users[data.room].filter(
      (user) => user.id !== socket.id,
    );
    console.log(socketToRoom, "Join!!!!@!@!@!");
    console.log(users, "connecting users");
    // console.log(usersInThisRoom);

    if (usersInThisRoom.length) {
      io.sockets.to(socket.id).emit("all_users", usersInThisRoom);
    }
  });

  socket.on("offer", (sdp, roomName) => {
    console.log("offer: " + socket.id);
    socket.to(roomName).emit("getOffer", sdp);
  });

  socket.on("answer", (sdp, roomName) => {
    console.log("answer: " + socket.id);
    socket.to(roomName).emit("getAnswer", sdp);
  });

  socket.on("candidate", (candidate, roomName) => {
    console.log("candidate: " + socket.id);
    socket.to(roomName).emit("getCandidate", candidate);
  });

  socket.on("disconnect", () => {
    console.log(`[${socketToRoom[socket.id]}]: ${socket.id} exit`);
    const roomID = socketToRoom[socket.id];

    if (users[roomID]) {
      console.log(users, "Before");
      users[roomID] = users[roomID].filter((user) => user.id !== socket.id);
      if (users[roomID].length === 0) {
        delete users[roomID];
        console.log(users, "After");
        return;
      }
    }
    console.log(socketToRoom, "Before");
    delete socketToRoom[socket.id];
    console.log(socketToRoom, "After");
    socket.broadcast.to(users[roomID]).emit("user_exit", { id: socket.id });
  });
});

server.listen(PORT, () => {
  console.log(`server running on ${PORT}`);
});
