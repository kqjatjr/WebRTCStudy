import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import "./App.css";
import Home from "./pages/Home";
import View from "./pages/View";

function App({ socket }: { socket: Socket }) {
  const [joinRoom, setJoinRoom] = useState(false);

  return (
    <div className="App">
      {joinRoom ? (
        <View socket={socket} leaveRoom={setJoinRoom} />
      ) : (
        <Home socket={socket} joinRoom={setJoinRoom} />
      )}
    </div>
  );
}

export default App;
