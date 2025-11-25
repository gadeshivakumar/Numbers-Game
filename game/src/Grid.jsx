import React, { useState, useRef, useEffect } from "react";
import "./App.css";

// --- Helper utilities ---
function emptyBoard(size, fill = 0) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => fill));
}

function generate_ends(size) {
  const temp = [];
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) temp.push([i, j]);
  }

  for (let i = temp.length - 1; i >= 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [temp[i], temp[j]] = [temp[j], temp[i]];
  }

  return [temp[0], temp[1]];
}

function valid(i, j, size) {
  return i >= 0 && j >= 0 && i < size && j < size;
}

function dfs(i, j, t1, t2, size, vis, cur, paths) {
  if (!valid(i, j, size)) return;
  const key = `${i},${j}`;
  if (vis.has(key)) return;

  cur.push([i, j]);
  if (i === t1 && j === t2) {
    // push a copy of current path
    paths.push(cur.slice());
    cur.pop();
    return;
  }

  vis.add(key);

  dfs(i + 1, j, t1, t2, size, vis, cur, paths);
  dfs(i - 1, j, t1, t2, size, vis, cur, paths);
  dfs(i, j + 1, t1, t2, size, vis, cur, paths);
  dfs(i, j - 1, t1, t2, size, vis, cur, paths);

  vis.delete(key);
  cur.pop();
}

function generate_valid_paths(p1, p2, size) {
  const vis = new Set();
  const paths = [];
  dfs(p1[0], p1[1], p2[0], p2[1], size, vis, [], paths);
  return paths;
}

function pickTwoPaths(paths) {
  if (!paths || paths.length === 0) return [];
  if (paths.length === 1) return [paths[0]];
  const idx1 = Math.floor(Math.random() * paths.length);
  let idx2 = Math.floor(Math.random() * paths.length);
  while (idx2 === idx1) idx2 = Math.floor(Math.random() * paths.length);
  return [paths[idx1], paths[idx2]];
}

function markValidCells(size, paths) {
  const board = emptyBoard(size, 0);
  (paths || []).forEach((p) => {
    p.forEach(([i, j]) => (board[i][j] = 1));
  });
  return board;
}

function pathToKeyArr(path) {
  return path.map(([i, j]) => `${i},${j}`);
}

// --- Grid component ---
export default function Grid() {
  const levels = {
    Easy: { size: 4, time: 60 },
    Medium: { size: 5, time: 120 },
    Hard: { size: 6, time: 180 },
  };

  const [difficulty, setDifficulty] = useState("Easy");
  const [arr, setArr] = useState([]); // 2D board filled with 0/1 (hidden)
  const [endpoints, setEndpoints] = useState([[0, 0], [0, 0]]);
  const [curPos, setCurPos] = useState([0, 0]);
  const [visitedValid, setVisitedValid] = useState(new Set()); // keep track of valid cells the player has revealed
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState(""); // "Win" | "Lost" | ""
  const [timeLeft, setTimeLeft] = useState(levels[difficulty].time);

  // store the two picked paths (each as array of key strings) that are valid for this round
  const [pickedPaths, setPickedPaths] = useState([]); // array of arrays of keys
  // current progress as array of key strings (starts with startKey)
  const [progress, setProgress] = useState([]);

  const [showPaths, setShowPaths] = useState(false); // toggle to show valid path(s)
  const [userTimer, setUserTimer] = useState(null); // if user selects a custom timer
  const [timerPreset, setTimerPreset] = useState("default"); // default or preset value
  const timerRef = useRef(null);

  useEffect(() => {
    // ensure timeLeft is updated when difficulty or userTimer changes and when a round restarts
    // but starting round handles it. Here we still set initial.
    setTimeLeft(userTimer ? Number(userTimer) : levels[difficulty].time);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, userTimer]);

  // Core: start a new round (generate endpoints, compute paths, set board and reset states)
  function startNewRound(keepScore = true) {
    const level = levels[difficulty];
    const size = level.size;

    clearInterval(timerRef.current);
    setStatus("");
    setVisitedValid(new Set());
    setProgress([]);

    // generate endpoints
    const ends = generate_ends(size);
    setEndpoints(ends);
    setCurPos(ends[0]);

    // compute paths, pick two, mark board
    const allPaths = generate_valid_paths(ends[0], ends[1], size);
    const picked = pickTwoPaths(allPaths);
    const newBoard = markValidCells(size, picked);

    setArr(newBoard);

    // store pickedPaths as key-arrays
    const pickedKeyArrays = picked.map(pathToKeyArr);
    setPickedPaths(pickedKeyArrays);

    // initialize progress with start position
    const startKey = `${ends[0][0]},${ends[0][1]}`;
    setProgress([startKey]);
    setVisitedValid(new Set([startKey]));

    // reset and start timer
    const initialTime = userTimer ? Number(userTimer) : level.time;
    setTimeLeft(initialTime);

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setStatus("Lost");
          setScore((s) => s - 5);
          // reset after short delay
          setTimeout(() => startNewRound(true), 1200);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  // initialize on mount and when difficulty changes
  useEffect(() => {
    startNewRound(true);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  // helper: check adjacency (Manhattan distance = 1)
  function isAdjacent(a, b) {
    return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
  }

  function isPrefix(pathKeyArr, prog) {
    if (prog.length > pathKeyArr.length) return false;
    for (let i = 0; i < prog.length; i++) {
      if (prog[i] !== pathKeyArr[i]) return false;
    }
    return true;
  }

  function handleInvalidMove() {
    setScore((s) => s - 2);
    // reset player to start
    setCurPos(endpoints[0]);
    // reset progress to start only
    const startKey = `${endpoints[0][0]},${endpoints[0][1]}`;
    setProgress([startKey]);
    setVisitedValid(new Set([startKey]));
  }

  function handleMove(i, j) {
    // ignore clicks outside the grid
    if (!arr || arr.length === 0) return;
    const size = levels[difficulty].size;
    if (!valid(i, j, size)) return;

    const clicked = [i, j];
    const clickedKey = `${i},${j}`;

    // only allow clicking adjacent cell (or clicking start cell when at start)
    const atStart = curPos[0] === endpoints[0][0] && curPos[1] === endpoints[0][1];
    if (!isAdjacent(curPos, clicked) && !atStart) {
      // ignore non-adjacent clicks
      return;
    }

    // If clicked is not a valid cell at all (arr value 0) => invalid move
    if (arr[i][j] !== 1) {
      handleInvalidMove();
      return;
    }

    // If clicked equals the previous cell in progress (step back): allow undo
    if (progress.length >= 2 && clickedKey === progress[progress.length - 2]) {
      const newProg = progress.slice(0, progress.length - 1);
      setProgress(newProg);
      setCurPos(clicked);
      // update visited set (we keep visited shown)
      setVisitedValid((prev) => {
        const copy = new Set(prev);
        return copy;
      });
      return;
    }

    // Otherwise, attempt to append clicked to progress and check if it matches prefix of any picked path
    const newProg = [...progress, clickedKey];
    const matchesAny = pickedPaths.some((p) => isPrefix(p, newProg));

    if (!matchesAny) {
      // invalid sequence (even if single cell is valid, it doesn't follow a picked path)
      handleInvalidMove();
      return;
    }

    // valid step along one of the allowed paths
    setProgress(newProg);
    setCurPos(clicked);
    setVisitedValid((prev) => new Set(prev).add(clickedKey));

    // check win: if any picked path exactly equals newProg
    const won = pickedPaths.some((p) => p.length === newProg.length && p.every((v, idx) => v === newProg[idx]));
    if (won) {
      setStatus("Win");
      setScore((s) => s + 10);
      clearInterval(timerRef.current);
      setTimeout(() => startNewRound(true), 900);
    }
  }

  // small renderer helpers
  function Cell({ i, j, size }) {
    const key = `${i},${j}`;
    const isStart = endpoints[0] && endpoints[0][0] === i && endpoints[0][1] === j;
    const isEnd = endpoints[1] && endpoints[1][0] === i && endpoints[1][1] === j;
    const isVisited = visitedValid.has(key);

    // If showPaths enabled, compute whether this cell is part of either picked path
    const inAnyPath = pickedPaths.length ? pickedPaths.some((p) => p.includes(key)) : false;

    // determine background and classes
    let classes = "cell";
    if (isVisited) classes += " visited";
    else if (isStart) classes += " start";
    else if (isEnd) classes += " end";
    if (curPos[0] === i && curPos[1] === j) classes += " current";
    if (showPaths && inAnyPath) classes += " reveal-path";

    // show emoji icons for start and end
    const overlayIcon = isStart ? "🚩" : isEnd ? "🏁" : "";

    return (
      <button
        className={classes}
        key={key}
        onClick={() => handleMove(i, j)}
        // style={{
        //   width: `${100 /size}%`,
        //   height: `${100 / size}%`,
        // }}
        title={"(" + i + "," + j + ")"}
      >
        <span className="icon">{overlayIcon}</span>
      </button>
    );
  }

  function Board({ board, size }) {
    return (
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, gridTemplateRows: `repeat(${size}, 1fr)` }}
      >
        {board.map((row, i) => row.map((_, j) => <Cell key={`${i},${j}`} i={i} j={j} size={size} />))}
      </div>
    );
  }

  const size = levels[difficulty].size;

  // derive a friendly timer label for UI
  function applyPreset(preset) {
    if (preset === "default") {
      setUserTimer(null);
      setTimerPreset("default");
    } else {
      setUserTimer(Number(preset));
      setTimerPreset(preset);
    }
  }

  return (
    <div className="game-wrap">
      <header className="game-header">
        <div className="left">
          <h1>Key UnLocker</h1>
        </div>

        <div className="right">
          <div className="stat">
            Score: <span className="badge">{score}</span>
          </div>
          <div className="stat">
            Time: <span className="badge">{timeLeft}s</span>
          </div>

          <div className="stat">
            Difficulty:
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={{ marginLeft: 8 }}>
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </div>

          <div className="stat timer-select">
            Timer:
            <select
              value={timerPreset}
              onChange={(e) => {
                applyPreset(e.target.value);
              }}
              style={{ marginLeft: 8 }}
            >
              <option value="default">Default</option>
              <option value="30">30s</option>
              <option value="60">60s</option>
              <option value="90">90s</option>
              <option value="120">120s</option>
              <option value="180">180s</option>
            </select>
            <input
              className="custom-timer"
              type="number"
              placeholder="Custom (s)"
              value={userTimer ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  setUserTimer(null);
                  setTimerPreset("default");
                } else {
                  const n = Number(v);
                  if (!Number.isNaN(n) && n > 0) {
                    setUserTimer(n);
                    setTimerPreset(String(n));
                  }
                }
              }}
            />
          </div>

          <div style={{ marginLeft: 8 }}>
            <button onClick={() => startNewRound(false)}>Restart</button>
          </div>
        </div>
      </header>

      <main>
        <div className="controls-row">
          <label className="toggle">
            <input type="checkbox" checked={showPaths} onChange={(e) => setShowPaths(e.target.checked)} />
            <span>Show Valid Path</span>
          </label>
        </div>

        <Board board={arr.length ? arr : emptyBoard(size)} size={size} />

        <div className="meta-row">
          {status && <strong className={`status-banner ${status === "Win" ? "win" : "lost"}`}>{status}</strong>}
          <div className="meta small">Start: {`[${endpoints[0].join(",")}]`}</div>
          <div className="meta small">End: {`[${endpoints[1].join(",")}]`}</div>
        </div>
      </main>

      {/* Celebrations overlay on Win */}
      {status === "Win" && (
        <div className="overlay">
          <div className="congrats-card">
            <div className="congrats-title">🎉 Congratulations! 🎉</div>
            <div className="congrats-sub">You completed a valid path.</div>
          </div>

          {/* simple falling confetti emojis */}
          <div className="confetti">
            <div className="c">✨</div>
            <div className="c">🎉</div>
            <div className="c">💫</div>
            <div className="c">🎈</div>
            <div className="c">⭐</div>
            <div className="c">🎊</div>
            <div className="c">🌟</div>
            <div className="c">🥳</div>
          </div>
        </div>
      )}

      {/* Lost overlay */}
      {status === "Lost" && (
        <div className="overlay lost-overlay">
          <div className="congrats-card">
            <div className="congrats-title">😞 Time's up</div>
            <div className="congrats-sub">Try again!</div>
          </div>
        </div>
      )}
    </div>
  );
}
