const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] },
});

const port = 8080;

io.on("connection", (socket) => {
  console.log("UserConnected", socket.id);

  socket.on("enter_room", ({ roomName }) => {
    console.log(roomName);
    socket.join(roomName);
    socket.to(roomName).emit("welcome");
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));
