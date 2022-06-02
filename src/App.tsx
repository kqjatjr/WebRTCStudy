import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Test from "./pages/Test";
import VideoCall from "./pages/VideoCall";
import VideoCall2 from "./pages/VideoCall2";

const App = () => {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat/:roomName" element={<VideoCall2 />} />
      </Routes>
    </div>
  );
};

export default App;
