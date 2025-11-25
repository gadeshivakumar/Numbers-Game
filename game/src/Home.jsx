import { useNavigate } from "react-router-dom";
import "./App.css";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <h1 className="title">Choose a Game</h1>

      <div className="cards">
        <div className="card" onClick={() => navigate("/display")}>
          <h2>Bubble pops</h2>
          <p>Open Number game</p>
        </div>

        <div className="card" onClick={() => navigate("/grid")}>
          <h2>Key unLocker</h2>
          <p>open Lock game</p>
        </div>
      </div>
    </div>
  );
}

export default Home;
