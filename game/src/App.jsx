import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Home";
import Display from "./Display";
import Grid from "./Grid";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/display" element={<Display />} />
        <Route path="/grid" element={<Grid />} />
      </Routes>
    </Router>
  );
}

export default App;
