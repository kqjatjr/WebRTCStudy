const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
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
  socket.on("room_meta", (data) => {
    const roomMeta = users[data.room];
    socket.emit("room_meta", { roomMeta });
  });

  socket.on("join_room", (data) => {
    if (users[data.room]) {
      const length = users[data.room].length;
      if (length === maximum) {
        socket.to(socket.id).emit("room_full");
        return;
      }

      if (users[data.room].some((user) => user.id === socket.id)) {
        return;
      }

      users[data.room].push({ id: socket.id, email: data.email });
    } else {
      users[data.room] = [{ id: socket.id, email: data.email }];
    }
    socketToRoom[socket.id] = data.room;

    socket.join(data.room);
    console.log(`[${socketToRoom[socket.id]}]: ${socket.id} enter`);

    console.log(users);

    const usersInThisRoom = users[data.room].filter(
      (user) => user.id !== socket.id,
    );

    console.log(usersInThisRoom);

    if (usersInThisRoom.length) {
      // 본인에게 기존 방안에 있던 유저들의 정보를 전달
      io.sockets.to(socket.id).emit("existing_users", usersInThisRoom);
    }
  });

  socket.on("offer", (data) => {
    //console.log(data.sdp);
    socket.to(data.offerReceiveID).emit("getOffer", {
      sdp: data.sdp,
      offerSendID: data.offerSendID,
      offerSendEmail: data.offerSendEmail,
    });
  });

  socket.on("answer", (data) => {
    //console.log(data.sdp);
    socket
      .to(data.answerReceiveID)
      .emit("getAnswer", { sdp: data.sdp, answerSendID: data.answerSendID });
  });

  socket.on("candidate", (data) => {
    //console.log(data.candidate);
    socket.to(data.candidateReceiveID).emit("getCandidate", {
      candidate: data.candidate,
      candidateSendID: data.candidateSendID,
    });
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
    socket.to(roomID).emit("user_exit", { id: socket.id });
  });
});

server.listen(PORT, () => {
  console.log(`server running on ${PORT}`);
});
