import "./TransformComputation.css";
import React, { useState, useEffect, useRef } from "react";
import { useMatrix } from "../../context/MatrixContext";
import useNarrow from "../../utils/useNarrow";
import { generateBasisMatrix, transpose, multiply, extractBlock, N } from "../../utils/transformUtils";

// toFixed that never prints "-0.00" / "-0.0"
const fx = (x, d) => {
  const t = Number(x).toFixed(d);
  return /^-0\.?0*$/.test(t) ? t.slice(1) : t;
};

const isComplete = (m) => m && m.length === N && m.every((row) => row.every((v) => v !== null));

// Colour for a frequency coefficient: darker = larger magnitude
// (square-root scaling so the small coefficients are still visible next to a big DC term)
function heat(value, maxAbs) {
  const r = maxAbs > 0 ? Math.sqrt(Math.abs(value) / maxAbs) : 0;
  if (r >= 0.8) return "tcHeat4";
  if (r >= 0.55) return "tcHeat3";
  if (r >= 0.35) return "tcHeat2";
  if (r >= 0.15) return "tcHeat1";
  return "tcHeat0";
}

function bandOf(u, v) {
  const s = u + v;
  return s <= 3 ? "low" : s <= 7 ? "medium" : "high";
}

// What kind of coefficient is F(u,v)?  (DC / AC only makes sense for the DCT)
function coefficientInfo(transform, u, v) {
  const band = bandOf(u, v);
  const meaning =
    band === "low" ? "Describes smooth, slow brightness changes."
    : band === "medium" ? "Describes texture and moderate detail."
    : "Describes sharp edges and fine detail.";
  if (transform === "DCT") {
    if (u === 0 && v === 0) {
      return {
        tag: "DC coefficient",
        text: "The zero-frequency term: F(0,0) = (sum of all 64 pixels) ÷ 8, i.e. 8 × the block's average brightness.",
      };
    }
    return { tag: `AC coefficient · ${band} frequency`, text: meaning };
  }
  if (u === 0 && v === 0) {
    return {
      tag: "Lowest-frequency coefficient",
      text: "The DST has no flat (DC) basis vector, so F(0,0) is simply the slowest-varying sine pattern — not the average brightness.",
    };
  }
  return { tag: `${band[0].toUpperCase() + band.slice(1)} frequency coefficient`, text: meaning };
}

function TransformComputation() {
  const { selectedMatrix, selectedBlock, transform, frequencyMatrix, setFrequencyMatrix } = useMatrix();

  const [stage, setStage] = useState(isComplete(frequencyMatrix) ? 4 : 0); // 0 idle · 1 C×A · 2 ×Cᵀ · 3 revealing · 4 done
  const [running, setRunning] = useState(false);
  const [showEq, setShowEq] = useState(!isComplete(frequencyMatrix)); // matrices fold away once F is ready
  const [sel, setSel] = useState({ u: 0, v: 0 });
  const [calcStep, setCalcStep] = useState(99);
  const narrow = useNarrow(480); // phones show 3-digit basis values so each matrix fits the screen

  const timers = useRef([]);
  const revealTimer = useRef(null);
  const finishRef = useRef(null);
  const playTimer = useRef(null);
  const prevKey = useRef(selectedBlock + "_" + transform);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (revealTimer.current) clearInterval(revealTimer.current);
    revealTimer.current = null;
    if (playTimer.current) clearInterval(playTimer.current);
    playTimer.current = null;
  };

  // A different block or transform makes the old result invalid.
  useEffect(() => {
    const key = selectedBlock + "_" + transform;
    if (prevKey.current === key) return;
    prevKey.current = key;
    clearTimers();
    setFrequencyMatrix([]);
    setStage(0);
    setRunning(false);
    setShowEq(true);
    setSel({ u: 0, v: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBlock, transform]);

  // Leaving mid-animation: finish the result instantly so nothing is left half-built.
  useEffect(() => {
    return () => {
      const wasRunning = timers.current.length > 0 || revealTimer.current;
      clearTimers();
      if (wasRunning && finishRef.current) finishRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!selectedMatrix) return null;

  if (!transform) {
    return (
      <div className="transformContainer tcRoot">
        <div className="tcHeading"><h2>Transform Computation</h2></div>
        <div className="tcEmpty">Please choose DCT or DST and generate the basis matrix in Step 3 first.</div>
      </div>
    );
  }

  const sym = transform === "DCT" ? "C" : "S";
  const T = generateBasisMatrix(transform);
  const TT = transpose(T);
  const A = extractBlock(selectedMatrix.data, selectedBlock || 1);
  const CA = multiply(T, A);
  const Ffull = multiply(CA, TT).map((row) => row.map((v) => Number(v.toFixed(2))));

  const done = isComplete(frequencyMatrix);
  const F = frequencyMatrix.length === N ? frequencyMatrix : Array.from({ length: N }, () => Array(N).fill(null));

  const perform = () => {
    if (running || done) return;
    clearTimers();
    setRunning(true);
    setStage(1);
    setFrequencyMatrix([]);
    finishRef.current = () => setFrequencyMatrix(Ffull);

    timers.current.push(setTimeout(() => setStage(2), 700));
    timers.current.push(setTimeout(() => setStage(3), 1400));
    timers.current.push(
      setTimeout(() => {
        timers.current = [];
        const reveal = Array.from({ length: N }, () => Array(N).fill(null));
        setFrequencyMatrix(reveal.map((r) => [...r]));
        let i = 0;
        revealTimer.current = setInterval(() => {
          reveal[Math.floor(i / N)][i % N] = Ffull[Math.floor(i / N)][i % N];
          setFrequencyMatrix(reveal.map((r) => [...r]));
          i++;
          if (i >= N * N) {
            clearInterval(revealTimer.current);
            revealTimer.current = null;
            finishRef.current = null;
            setStage(4);
            setRunning(false);
            setShowEq(false);
          }
        }, 28);
      }, 2100)
    );
  };

  // ---------- numbers about the finished matrix ----------
  const flat = done ? frequencyMatrix.flat() : [];
  const maxAbs = flat.length ? Math.max(...flat.map((v) => Math.abs(v))) : 0;
  const nearZero = flat.filter((v) => Math.abs(v) < 1).length;

  // ---------- energy (share of the sum of squares) ----------
  let eDc = 0, eLow = 0, eMed = 0, eHigh = 0, eTotal = 0;
  if (done) {
    frequencyMatrix.forEach((row, ru) =>
      row.forEach((val, cv) => {
        const e = val * val;
        eTotal += e;
        if (ru === 0 && cv === 0) eDc += e;
        else if (ru + cv <= 3) eLow += e;
        else if (ru + cv <= 7) eMed += e;
        else eHigh += e;
      })
    );
  }
  const pct = (x) => (eTotal > 0 ? ((x / eTotal) * 100).toFixed(1) : "0.0");
  const energy = { dc: pct(eDc), low: pct(eLow), medium: pct(eMed), high: pct(eHigh) };
  const energyLevel = (val) => {
    const r = maxAbs > 0 ? Math.abs(val) / maxAbs : 0;
    if (r >= 0.75) return "energyVeryHigh";
    if (r >= 0.5) return "energyHigh";
    if (r >= 0.25) return "energyMedium";
    if (r >= 0.1) return "energyLow";
    return "energyVeryLow";
  };
  const firstLabel = transform === "DCT" ? "DC" : "F(0,0)";

  // ---------- selected coefficient ----------
  const { u, v } = sel;
  const info = coefficientInfo(transform, u, v);
  const terms = CA[u].map((a, k) => ({ a, b: T[v][k], p: a * T[v][k] }));
  const total = terms.reduce((s, t) => s + t.p, 0);

  const steps = [
    { label: "Formula", node: <>F({u},{v}) = Σ<sub>k</sub> ({sym}×A)[{u},k] × {sym}[{v},k]</> },
    {
      label: "Multiply terms",
      node: (
        <span className="tcTerms">
          {terms.map((t, i) => (
            <span key={i} className="tcTerm">{i > 0 && <i>+</i>}({t.a.toFixed(2)} × {fx(t.b, narrow ? 3 : 4)})</span>
          ))}
        </span>
      ),
    },
    { label: "Add them up", node: <>F({u},{v}) = <b>{total.toFixed(2)}</b></>, isResult: true },
  ];

  const playCalc = () => {
    if (playTimer.current) clearInterval(playTimer.current);
    setCalcStep(0);
    let s = 0;
    playTimer.current = setInterval(() => {
      s++;
      setCalcStep(s);
      if (s >= steps.length) {
        clearInterval(playTimer.current);
        playTimer.current = null;
      }
    }, 700);
  };

  const pickCell = (r, c) => {
    if (!done) return;
    if (playTimer.current) clearInterval(playTimer.current);
    setSel({ u: r, v: c });
    setCalcStep(99);
  };

  const signClass = (x) => (x < 0 ? "tcNeg" : "tcPos");
  const flow = [
    { t: sym, on: stage >= 1 },
    { op: "×" },
    { t: "A", on: stage >= 1 },
    { op: "=" },
    { t: sym + "A", on: stage >= 2 },
    { op: "×" },
    { t: sym + "ᵀ", on: stage >= 3 },
    { op: "=" },
    { t: "F", on: stage >= 4, result: true },
  ];

  return (
    <div className="transformContainer tcRoot">

      <div className="tcHeading">
        <h2>Transform Computation</h2>
        <p>
          Multiply the basis matrix with the block to get the frequency coefficients:
          <span className="tcFormulaPill">F = {sym} × A × {sym}ᵀ</span>
        </p>
      </div>

      {showEq && (
      <div className="tcEq">
        <div className="tcMat">
          <h3>Basis Matrix ({sym})</h3>
          <div className="tcGrid">
            {T.flat().map((x, i) => (
              <span key={i} className={signClass(x)} title={x.toFixed(6)}>{fx(x, narrow ? 3 : 4)}</span>
            ))}
          </div>
        </div>

        <div className="tcOp">×</div>

        <div className="tcMat">
          <h3>Block A ({selectedBlock ? `B${selectedBlock}` : "—"})</h3>
          <div className="tcGrid">
            {A.flat().map((x, i) => (
              <span key={i} className="tcPix" style={{ background: `rgb(${x},${x},${x})`, color: x < 128 ? "#fff" : "#0f172a" }}>{x}</span>
            ))}
          </div>
        </div>

        <div className="tcOp">×</div>

        <div className="tcMat">
          <h3>Transpose ({sym}ᵀ)</h3>
          <div className="tcGrid">
            {TT.flat().map((x, i) => (
              <span key={i} className={signClass(x)} title={x.toFixed(6)}>{fx(x, narrow ? 3 : 4)}</span>
            ))}
          </div>
        </div>
      </div>
      )}

      <div className="tcFlow">
        <div className="tcFlowChips">
          {flow.map((f, i) =>
            f.op ? (
              <span key={i} className="tcFlowOp">{f.op}</span>
            ) : (
              <span key={i} className={"tcChip" + (f.on ? " tcChipOn" : "") + (f.result && f.on ? " tcChipResult" : "")}>{f.t}</span>
            )
          )}
        </div>
        <div className="tcFlowBtns">
          {done && (
            <button className="tcToggle" onClick={() => setShowEq((x) => !x)}>
              {showEq ? "Hide matrices ▲" : "Show matrices ▼"}
            </button>
          )}
          <button className="actionBtn tcRunBtn" disabled={running || done} onClick={perform}>
            {running ? "Computing…" : done ? "Transform Done" : "Perform Transform"}
          </button>
        </div>
      </div>

      <div className="tcResult">

        <div className="tcFreq">
          <div className="tcFreqHead">
            <h3>Frequency Coefficients F</h3>
            {done && (
              <div className="tcLegend">
                <span>small</span>
                <i className="tcHeat0" /><i className="tcHeat1" /><i className="tcHeat2" /><i className="tcHeat3" /><i className="tcHeat4" />
                <span>large</span>
              </div>
            )}
          </div>

          <div className="tcFreqGrid">
            <div className="tcCorner">u \ v</div>
            {Array.from({ length: N }).map((_, i) => (
              <div key={"h" + i} className="tcHead">v={i}</div>
            ))}
            {F.map((row, r) => (
              <React.Fragment key={r}>
                <div className="tcHead">u={r}</div>
                {row.map((val, c) => {
                  const on = done && sel.u === r && sel.v === c;
                  return (
                    <span
                      key={r + "-" + c}
                      className={val === null ? "tcBlank" : "tcCoef " + heat(val, maxAbs) + (on ? " tcCoefOn" : "")}
                      onClick={() => val !== null && pickCell(r, c)}
                    >
                      {val === null ? "" : fx(val, 1)}
                    </span>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {done ? (
            <div className="tcStats">
              <div><b>{frequencyMatrix[0][0].toFixed(1)}</b><span>F(0,0)</span></div>
              <div><b>{maxAbs.toFixed(1)}</b><span>largest |F|</span></div>
              <div><b>{nearZero} / 64</b><span>nearly zero (|F| &lt; 1)</span></div>
            </div>
          ) : (
            <div className="tcHint">{running ? "Computing the frequency coefficients…" : "Press “Perform Transform” to compute F."}</div>
          )}
        </div>

        <div className="tcDetail">
          {!done ? (
            <>
              <h3>Selected Coefficient</h3>
              <div className="tcEmpty">After the transform, click any coefficient to see what it means and how it is calculated.</div>
            </>
          ) : (
            <>
              <div className="tcSelTop">
                <div className="tcSelName">F({u},{v})</div>
                <div className="tcSelValue">{frequencyMatrix[u][v].toFixed(2)}</div>
              </div>
              <div className="tcSelTag">{info.tag}</div>
              <p className="tcSelText">{info.text}</p>

              <div className="tcCalcHead">
                <h4>How it is calculated</h4>
                <div className="tcPlay">
                  <button onClick={playCalc}>▶ Play</button>
                  <button onClick={() => setCalcStep(99)}>Show all</button>
                </div>
              </div>

              <div className="tcCalc">
                {steps.slice(0, calcStep).map((s, i) => (
                  <div key={i} className={"tcCalcRow" + (s.isResult ? " tcCalcResult" : "")}>
                    <div className="tcCalcLabel">{s.label}</div>
                    <div className="tcCalcExpr">{s.node}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {done && (
        <div className="tcExtra">

          <div className="largestCoeffCard">
            <h3>Largest Frequency Coefficient</h3>
            <h1>{maxAbs.toFixed(2)}</h1>
            <p>
              {transform === "DCT"
                ? "Usually the DC term (or one next to it) — it holds most of the block's energy."
                : "Usually one of the lowest-frequency coefficients — it holds most of the block's energy."}
            </p>
          </div>

          <div className="dcAcCard">
            <h3>{transform === "DCT" ? "DC vs AC Components" : "First vs Remaining Coefficients"}</h3>
            <div className="dcAcGrid">
              <div>
                <h4>{transform === "DCT" ? "DC Coefficient" : "F(0,0)"}</h4>
                <h2>{Number(frequencyMatrix[0][0]).toFixed(2)}</h2>
                <p className="dcAcNote">
                  {transform === "DCT" ? "8 × average intensity of the block" : "Lowest-frequency sine pattern (the DST has no DC term)"}
                </p>
              </div>
              <div>
                <h4>{transform === "DCT" ? "AC Coefficients" : "Other Coefficients"}</h4>
                <h2>63</h2>
                <p className="dcAcNote">Remaining frequency values</p>
              </div>
            </div>
          </div>

          <div className="compressionInsight">
            <h3>Compression Insight</h3>
            <ul>
              <li>Low-frequency coefficients preserve image quality.</li>
              <li>High-frequency coefficients carry edge details.</li>
              <li>JPEG mainly removes high-frequency coefficients.</li>
              <li>Compression occurs after quantization.</li>
            </ul>
          </div>

          <div className="energyLegend">
            <div><span className="legend veryHigh"></span>Very High</div>
            <div><span className="legend high"></span>High</div>
            <div><span className="legend medium"></span>Medium</div>
            <div><span className="legend low"></span>Low</div>
            <div><span className="legend veryLow"></span>Very Low</div>
          </div>

          <div className="energyCard">
            <h3>Frequency Energy Distribution</h3>
            <div className="energyGrid">
              {frequencyMatrix.flat().map((value, index) => (
                <div key={index} className={energyLevel(value)}></div>
              ))}
            </div>
            <p>Brighter cells indicate coefficients carrying higher image energy.</p>
          </div>

          <div className="energyDistribution">
            <h3>Energy Compaction</h3>
            <div className="energyBar">
              <div className="dcBar" style={{ width: `${energy.dc}%` }}></div>
              <div className="lowBar" style={{ width: `${energy.low}%` }}></div>
              <div className="mediumBar" style={{ width: `${energy.medium}%` }}></div>
              <div className="highBar" style={{ width: `${energy.high}%` }}></div>
            </div>
            <div className="energyLabels">
              <span>{firstLabel}<br /><b>{energy.dc}%</b></span>
              <span>Low<br /><b>{energy.low}%</b></span>
              <span>Medium<br /><b>{energy.medium}%</b></span>
              <span>High<br /><b>{energy.high}%</b></span>
            </div>
            <p>Most image energy remains concentrated in the first and low-frequency coefficients after the transform.</p>
          </div>

          <div className="jpegObservation">
            <h3>JPEG Observation</h3>
            <ul>
              <li>{transform === "DCT" ? "The DC coefficient usually contains the most image energy." : "The lowest-frequency coefficients usually contain the most image energy."}</li>
              <li>Most image information is concentrated in low frequencies.</li>
              <li>High-frequency coefficients are usually close to zero.</li>
              <li>JPEG removes many high-frequency values during quantization.</li>
            </ul>
          </div>

          <div className="researchNote">
            <h3>Research Interpretation</h3>
            <p>
              Each frequency coefficient is calculated by multiplying one row of the <b>{transform} Basis Matrix</b> with the selected <b>8 × 8 Image Block</b> and one column of the <b>Transpose Basis Matrix</b>, using double summation.
            </p>
            <p>
              The selected coefficient <b>F({u}, {v})</b> represents the contribution of one particular spatial frequency inside the image block.
            </p>
          </div>

          <div className="frequencyTypeCard">
            <h3>Frequency Band</h3>
            <p>{bandOf(u, v)[0].toUpperCase() + bandOf(u, v).slice(1)} Frequency</p>
          </div>

          <div className="coefficientExplanation">{info.text}</div>

        </div>
      )}

    </div>
  );
}

export default TransformComputation;
