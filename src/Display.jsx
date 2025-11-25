import React, { useEffect, useState, useRef } from "react";
import "./App.css";

function Display() {
  // Game config & states
  const [nums, setNums] = useState([]); // labels like "3 + 4"
  const [values, setValues] = useState([]); // numeric results
  const [pickedValues, setPickedValues] = useState([]); // selection history (values)
  const [btnState, setBtnState] = useState([]); // "idle" | "correct" | "wrong" | "disabled"
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState(""); // "Win" | "Lost" | ""
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState("Medium"); // Easy | Medium | Hard

  // Timer
  const [timeLeft, setTimeLeft] = useState(20);
  const timerRef = useRef(null);

  // Derived from difficulty
  const difficultyConfig = {
    Easy: { buttons: 5, range: 20, time: 20 },
    Medium: { buttons: 5, range: 30, time: 30 },
    Hard: { buttons: 5, range: 40, time: 45 },
  };

  // Utilities
  function getRandomNumber(max) {
    return Math.floor(Math.random() * max) + 1;
  }

  function isPrime(n) {
    if (n < 2) return false;
    for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
    return true;
  }

  function computeValue(sym, a, b) {
    if (sym === "+") return a + b;
    if (sym === "-") return a - b;
    return a * b;
  }

  const questions = [
    "select numbers in descending order",
    "select numbers in ascending order",
    "select bubbles that yield multiples of 5",
    "select bubbles that yield 3 multiples",
    "select bubbles that yield prime numbers",
    "select bubbles that yeild 2 multiples",
  ];

  // Choose only questions that are valid for the generated numeric set
  function getValidQuestions(allVals) {
    return questions.filter((q) => {
      if (q.includes("descending") || q.includes("ascending")) return true;
      if (q.includes("multiples of 5")) return allVals.some((v) => v % 5 === 0);
      if (q.includes("3 multiples")) return allVals.some((v) => v % 3 === 0);
      if (q.includes("prime")) return allVals.some((v) => isPrime(v));
      if (q.includes("2 multiples")) return allVals.some((v) => v % 2 === 0);
      return false;
    });
  }

  // Reset & Start a new round
  function startNewRound(keepScore = true) {
    clearInterval(timerRef.current);
    setStatus("");
    setPickedValues([]);
    const cfg = difficultyConfig[difficulty];
    const numbersCount = cfg.buttons * 2;

    const base = [];
    for (let i = 0; i < numbersCount; i++) base.push(getRandomNumber(cfg.range));
    
    const syms = ["+", "-", "x"];
    const labels = [];
    const vals = [];
    for (let i = 0; i < numbersCount; i += 2) {
      const s = syms[Math.floor(Math.random() * syms.length)];
      labels.push(`${base[i]} ${s} ${base[i + 1]}`);
      vals.push(computeValue(s, base[i], base[i + 1]));
    }
    
    const valid = getValidQuestions(vals);
    const chosen = valid.length ? valid[Math.floor(Math.random() * valid.length)] : "select numbers in ascending order";
    setNums(labels);
    setValues(vals);
    setBtnState(Array(cfg.buttons).fill("idle"));
    setQuestion(chosen);
    setTimeLeft(cfg.time);

    
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          // timeout => lost
          setStatus("Lost");
          // penalty for timeout
          setScore((s) => s - 5);
          // show Lost briefly then restart
          setTimeout(() => startNewRound(true), 1200);
        }
        return t - 1;
      });
    }, 1000);
  }

  
  function hasRemainingCorrect(disabledArr, currentPickedVals, q, valsArr) {
    
    for (let i = 0; i < valsArr.length; i++) {
      if (disabledArr[i]) continue;
      const v = valsArr[i];
      let ok = false;
      if (q.includes("descending")) {
        ok = currentPickedVals.length === 0 || currentPickedVals[currentPickedVals.length - 1] >= v;
      } else if (q.includes("ascending")) {
        ok = currentPickedVals.length === 0 || currentPickedVals[currentPickedVals.length - 1] <= v;
      } else if (q.includes("multiples of 5")) ok = v % 5 === 0;
      else if (q.includes("3 multiples")) ok = v % 3 === 0;
      else if (q.includes("prime")) ok = isPrime(v);
      else ok = v % 2 === 0; // 2 multiples
      if (ok) return true; // there exists at least one valid remaining button
    }
    return false;
  }

  // Button click handler
  function handleClick(index) {
    if (status) return; // don't accept clicks after round end
    if (btnState[index] !== "idle") return;
    const v = values[index];

    
    let valid = false;
    if (question.includes("descending")) {
      valid = pickedValues.length === 0 || pickedValues[pickedValues.length - 1] >= v;
    } else if (question.includes("ascending")) {
      valid = pickedValues.length === 0 || pickedValues[pickedValues.length - 1] <= v;
    } else if (question.includes("multiples of 5")) valid = v % 5 === 0;
    else if (question.includes("3 multiples")) valid = v % 3 === 0;
    else if (question.includes("prime")) valid = isPrime(v);
    else valid = v % 2 === 0;

    const newBtnState = [...btnState];
    const newPicked = [...pickedValues];

    if (!valid) {
      // wrong move
      newBtnState[index] = "wrong";
      setBtnState(newBtnState);
      setStatus("Lost");
      setScore((s) => s - 5);
      clearInterval(timerRef.current);
      setTimeout(() => startNewRound(true), 1200);
      return;
    }

    // correct move
    newBtnState[index] = "correct";
    newPicked.push(v);
    setBtnState(newBtnState);
    setPickedValues(newPicked);
    setScore((s) => s + 10);

    // disable clicked button
    // check if any remaining correct moves exist
    const disabledArr = newBtnState.map((b) => b !== "idle");
    const remaining = hasRemainingCorrect(disabledArr, newPicked, question, values);

    if (!remaining) {
      // win condition
      setStatus("Win");
      clearInterval(timerRef.current);
      // completion bonus
      setScore((s) => s + 20);
      setTimeout(() => startNewRound(true), 1200);
    }
  }

  // Difficulty change -> restart round and preserve score
  useEffect(() => {
    startNewRound(true);
    // cleanup on unmount
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  // initial mount
  useEffect(() => {
    startNewRound(true);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // play again button
  function handlePlayAgain() {
    startNewRound(true);
  }

  const cfg = difficultyConfig[difficulty];

  return (
    <div className="game-wrap">
      <header className="game-header">
        <div className="left">
          <h1>Bubble Math</h1>
          <p className="muted">Question: <strong>{question}</strong></p>
        </div>

        <div className="right">
          <div className="stat">Score: <span className="badge">{score}</span></div>
          <div className="stat">Time: <span className="badge">{timeLeft}s</span></div>
          <div className="stat">Difficulty:
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </div>
        </div>
      </header>

      <main>
        <div className={`bubbles-grid cols-${cfg.buttons}`}>
          {nums.map((label, i) => (
            <button
              key={i}
              className={`bubble ${btnState[i]}`}
              onClick={() => handleClick(i)}
              disabled={btnState[i] !== "idle" || !!status}
              title={`value: ${values[i]}`}
            >
              <span className="label">{label}</span>
              {/* <span className="value">{values[i]}</span> */}
            </button>
          ))}
        </div>

        <div className="footer">
          {status && <div className={`status ${status.toLowerCase()}`}>{status}</div>}
          <div className="controls">
            <button onClick={handlePlayAgain} className="primary">Play Again</button>
            <button onClick={() => startNewRound(false)} className="secondary">Restart (keep score)</button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Display;
