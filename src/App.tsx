import "./App.css";
import { Route, Routes } from "react-router-dom";
import io from "socket.io-client";
import Home from "./pages/Home";

import ChatView from "./pages/aa";

const App = () => {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat/:roomName" element={<ChatView />} />
      </Routes>
    </div>
  );
};

export default App;
