import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Test from "./pages/Test";
import VideoCall from "./pages/VideoCall";

const App = () => {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat/:roomName" element={<Test />} />
      </Routes>
    </div>
  );
};

export default App;
