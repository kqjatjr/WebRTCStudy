import "./App.css";
import { Route, Routes } from "react-router-dom";
import io from "socket.io-client";
import Home from "./pages/Home";
import View from "./pages/View";
import ViewChat from "./pages/ViewChat";
import ChatView from "./pages/aa";

const socket = io("http://localhost:8080");

const App = () => {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Home socket={socket} />} />
        <Route path="/chat/:roomName" element={<ChatView socket={socket} />} />
      </Routes>
    </div>
  );
};

export default App;
