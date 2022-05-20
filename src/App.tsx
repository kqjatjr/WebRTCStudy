import "./App.css";
import { Route, Routes } from "react-router-dom";
import io from "socket.io-client";
import Home from "./pages/Home";
import View from "./pages/View";

const socket = io("http://localhost:8080");

console.log(socket);

const App = () => {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Home socket={socket} />} />
        <Route path="/chat" element={<View socket={socket} />} />
      </Routes>
    </div>
  );
};

export default App;
