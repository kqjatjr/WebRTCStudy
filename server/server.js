const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);

const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    transports: ["websocket"],
    upgrade: false,
  },
});

const port = 8080;

const publicRooms = () => {
  const {
    sockets: {
      adepter: { rooms, sids },
    },
  } = io;

  const publicRooms = [];
  rooms.forEach((_, key) => {
    if (!sids.get(key)) {
      publicRooms.push(key);
    }
  });

  return publicRooms;
};

io.on("connection", (socket) => {
  socket["nickname"] = "Anon";
  console.log("UserConnected", socket.id);
  socket.on("enter_room", ({ roomName, nickname }) => {
    socket["nickname"] = nickname;
    socket.join(roomName);
    socket.emit("roomInfo", roomName);
    socket.to(roomName).emit("welcome", socket.nickname);
  });
  socket.on("disconnecting", () => {
    socket.rooms.forEach((room) => {
      socket.to(room).emit("bye", socket.nickname);
    });
  });
  socket.on("new_message", ({ msg, roomName }, done) => {
    socket.to(roomName).emit("new_message", `${socket.nickname} : ${msg}`);
    done();
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));
