import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import VideoCall from "./pages/VideoCall";

const App = () => {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat/:roomName" element={<VideoCall />} />
      </Routes>
    </div>
  );
};

export default App;
