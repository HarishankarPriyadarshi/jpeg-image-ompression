import "./BasisMatrix.css";
import React, { useState, useEffect, useRef } from "react";
import { useMatrix } from "../../context/MatrixContext";
import useNarrow from "../../utils/useNarrow";
import { generateBasisMatrix, extractBlock, N } from "../../utils/transformUtils";

// "numerator over denominator" shown as a proper stacked fraction.
function Frac({ num, den }) {
  return (
    <span className="inlineFrac">
      <span className="inlineFracNum">{num}</span>
      <span className="inlineFracLine"></span>
      <span className="inlineFracDen">{den}</span>
    </span>
  );
}

// Tall brackets that wrap a fraction, e.g.  cos ( a / b )
function Paren({ children }) {
  return (
    <span className="fxParen">
      <span className="fxBr">(</span>
      {children}
      <span className="fxBr">)</span>
    </span>
  );
}

// The basis formula, written the way a textbook does (argument inside the brackets).
function BasisFormula({ transform }) {
  if (transform === "DCT") {
    return (
      <span className="fx">
        C(u,x) = α(u) · cos
        <Paren><Frac num="(2x + 1) · u · π" den="2N" /></Paren>
      </span>
    );
  }
  return (
    <span className="fx">
      S(u,x) = √<Paren><Frac num="2" den="N + 1" /></Paren> · sin
      <Paren><Frac num="(u + 1)(x + 1) · π" den="N + 1" /></Paren>
    </span>
  );
}

// Full-precision value of one basis entry (used for the step-by-step maths and the graph).
function basisValue(transform, u, x) {
  if (transform === "DCT") {
    const alpha = u === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N);
    return alpha * Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N));
  }
  return Math.sqrt(2 / (N + 1)) * Math.sin(((u + 1) * (x + 1) * Math.PI) / (N + 1));
}

// Same function, but with a continuous position t so the wave can be drawn smoothly.
function basisCurve(transform, u, t) {
  return basisValue(transform, u, t);
}

function bandText(transform, u) {
  const waves = transform === "DCT" ? u : u + 1;
  const base =
    u <= 2 ? "Low frequency — slow brightness change across the block."
    : u <= 5 ? "Medium frequency — captures texture."
    : "High frequency — captures edges and fine detail.";
  if (transform === "DCT" && u === 0) {
    return "Flat line — the DC vector. It measures the block's average brightness.";
  }
  if (transform === "DST" && u === 0) {
    return "Lowest DST frequency: a single half-sine hump that is zero at both ends. (DST has no flat DC vector.)";
  }
  return `${base} This row completes ${waves} half-wave${waves > 1 ? "s" : ""} over the 8 pixels.`;
}

// Plot geometry for the basis-function graph
const GX0 = 60;
const GX1 = 500;
const GY0 = 118;
const GSCALE = 180;
const gx = (x) => GX0 + (x * (GX1 - GX0)) / (N - 1);
const gy = (v) => GY0 - v * GSCALE;

function BasisMatrix() {
  const {
    selectedMatrix,
    selectedBlock,
    transform,
    setTransform,
    basisMatrix,
    setBasisMatrix,
    basisGenerated,
    setBasisGenerated,
  } = useMatrix();

  // selected = { row, col } -- col is null when only a row (basis function) is chosen
  const [selected, setSelected] = useState(null);
  const [genCell, setGenCell] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [showPick, setShowPick] = useState(false);
  const narrow = useNarrow(480); // phones show 3-digit values so the matrix fits the screen
  const [calcStep, setCalcStep] = useState(0);

  const genTimer = useRef(null);
  const genFinish = useRef(null);
  const playTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (playTimer.current) clearInterval(playTimer.current);
      // Leaving mid-generation: finish the matrix instantly instead of leaving it half-built.
      if (genTimer.current) {
        clearInterval(genTimer.current);
        genTimer.current = null;
        if (genFinish.current) genFinish.current();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!selectedMatrix) return null;

  const block = extractBlock(selectedMatrix.data, selectedBlock || 1);

  const hasMatrix = basisMatrix.length === N;
  const cells = hasMatrix ? basisMatrix : Array.from({ length: N }, () => Array(N).fill(null));

  const selRow = selected ? selected.row : null;
  const selCol = selected ? selected.col : null;
  const hasCell = selCol !== null && selCol !== undefined;

  // ---------- actions ----------
  const chooseTransform = (t) => {
    if (generating || t === transform) return;
    setTransform(t); // resets any matrix generated for the other transform
    setSelected(null);
    setCalcStep(0);
  };

  const generate = () => {
    if (basisGenerated || generating) return;
    if (!transform) {
      setShowPick(true);
      return;
    }
    const full = generateBasisMatrix(transform);
    const partial = Array.from({ length: N }, () => Array(N).fill(null));
    setBasisMatrix(partial.map((r) => [...r]));
    setSelected(null);
    setGenerating(true);
    genFinish.current = () => {
      setBasisMatrix(full);
      setBasisGenerated(true);
    };
    let i = 0;
    genTimer.current = setInterval(() => {
      const u = Math.floor(i / N);
      const x = i % N;
      partial[u][x] = full[u][x];
      setBasisMatrix(partial.map((r) => [...r]));
      setGenCell({ row: u, col: x });
      i++;
      if (i >= N * N) {
        clearInterval(genTimer.current);
        genTimer.current = null;
        setGenCell(null);
        setGenerating(false);
        setBasisGenerated(true);
      }
    }, 40);
  };

  const selectCell = (u, x) => {
    if (!basisGenerated) return;
    if (playTimer.current) clearInterval(playTimer.current);
    setSelected({ row: u, col: x });
    setCalcStep(99); // show every step right away; Play can replay them
  };

  const selectRow = (u) => {
    if (!basisGenerated) return;
    if (playTimer.current) clearInterval(playTimer.current);
    setSelected({ row: u, col: null });
  };

  // ---------- step-by-step calculation of one cell ----------
  const cellSteps = (u, x) => {
    if (transform === "DCT") {
      const num = (2 * x + 1) * u;
      const angle = (num * Math.PI) / (2 * N);
      const cosVal = Math.cos(angle);
      const alpha = u === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N);
      return [
        { label: "Formula", node: <BasisFormula transform="DCT" /> },
        { label: "Substitute u & x", node: <>u = <b>{u}</b>, x = <b>{x}</b> &nbsp;→&nbsp; (2×{x}+1)×{u} = <b>{num}</b></> },
        { label: "Compute the angle", node: <>angle = <Frac num={`${num}π`} den={2 * N} /> = <b>{angle.toFixed(4)}</b> rad</> },
        { label: "Apply cosine", node: <>cos({angle.toFixed(4)}) = <b>{cosVal.toFixed(4)}</b></> },
        { label: "Scaling factor", node: <>α({u}) = {u === 0 ? "√(1/8)" : "√(2/8)"} = <b>{alpha.toFixed(4)}</b></> },
        { label: "Final value", node: <>{alpha.toFixed(4)} × {cosVal.toFixed(4)} = <b>{(alpha * cosVal).toFixed(4)}</b></>, isResult: true },
      ];
    }
    const prod = (u + 1) * (x + 1);
    const angle = (prod * Math.PI) / (N + 1);
    const sinVal = Math.sin(angle);
    const coeff = Math.sqrt(2 / (N + 1));
    return [
      { label: "Formula", node: <BasisFormula transform="DST" /> },
      { label: "Substitute u & x", node: <>u = <b>{u}</b>, x = <b>{x}</b> &nbsp;→&nbsp; ({u}+1)×({x}+1) = <b>{prod}</b></> },
      { label: "Compute the angle", node: <>angle = <Frac num={`${prod}π`} den={N + 1} /> = <b>{angle.toFixed(4)}</b> rad</> },
      { label: "Apply sine", node: <>sin({angle.toFixed(4)}) = <b>{sinVal.toFixed(4)}</b></> },
      { label: "Scale factor", node: <>√(2/9) = <b>{coeff.toFixed(4)}</b></> },
      { label: "Final value", node: <>{coeff.toFixed(4)} × {sinVal.toFixed(4)} = <b>{(coeff * sinVal).toFixed(4)}</b></>, isResult: true },
    ];
  };

  const steps = hasCell && transform ? cellSteps(selRow, selCol) : [];

  const playCalc = () => {
    if (!hasCell) return;
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

  // ---------- orthogonality check: C x C^T should be the identity ----------
  let orthoErr = null;
  if (basisGenerated && hasMatrix && cells.every((r) => r.every((v) => v !== null))) {
    orthoErr = 0;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        let dot = 0;
        for (let k = 0; k < N; k++) dot += cells[i][k] * cells[j][k];
        orthoErr = Math.max(orthoErr, Math.abs(dot - (i === j ? 1 : 0)));
      }
    }
  }

  // ---------- basis-function graph ----------
  const showWave = basisGenerated && selRow !== null && transform;
  let curvePath = "";
  if (showWave) {
    for (let t = 0; t <= N - 1 + 1e-9; t += 0.1) {
      curvePath += `${curvePath ? "L" : "M"}${gx(t).toFixed(1)},${gy(basisCurve(transform, selRow, t)).toFixed(1)} `;
    }
  }

  const transformName =
    transform === "DCT" ? "Discrete Cosine Transform (DCT-II)"
    : transform === "DST" ? "Discrete Sine Transform (DST-I)"
    : "Pick one to continue";

  return (
    <div className="basisContainer bmContainer">

      <div className="basisHeading bmHeading">
        <h2>Generate Basis Matrix</h2>
        <p>Build the orthogonal basis matrix C for the selected transform — it depends only on the block size, so it is reused for every block.</p>
      </div>

      <div className="bmTop">
        <div className="bmCard bmTransformCard">
          <h3>Select Transform</h3>
          <div className="toggleButtons">
            <button className={transform === "DCT" ? "activeBtn" : ""} disabled={generating} onClick={() => chooseTransform("DCT")}>DCT</button>
            <button className={transform === "DST" ? "activeBtn" : ""} disabled={generating} onClick={() => chooseTransform("DST")}>DST</button>
          </div>
          <div className="bmTransformName">{transformName}</div>
        </div>

        <div className="bmCard bmFormulaCard">
          <h3>Basis Formula (N = 8)</h3>
          <div className="miniFormulaText">
            {!transform ? (
              <span className="bmHint">Select DCT or DST to see its formula</span>
            ) : (
              <>
                <BasisFormula transform={transform} />
                <div className="bmFormulaNote">
                  {transform === "DCT"
                    ? "α(0) = √(1/N), α(u) = √(2/N) for u > 0.  u = frequency index (0–7), x = pixel position (0–7)."
                    : "u = frequency index (0–7), x = pixel position (0–7). The √(2/(N+1)) factor makes every row length 1."}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="basisLayout bmMain">

        <div className="basisCard blockCard bmBlockCard">
          <h3>Block A ({selectedBlock ? `B${selectedBlock}` : "—"})</h3>
          <div className="basisBlockPreview">
            {block.flat().map((value, i) => (
              <div
                key={i}
                className="basisBlockPixel"
                style={{ background: `rgb(${value},${value},${value})`, color: value < 128 ? "#fff" : "#0f172a" }}
                title={`pixel value ${value}`}
              >
                {value}
              </div>
            ))}
          </div>
          <p className="bmBlockNote">Used in Step 4: F = C × A × Cᵀ</p>
        </div>

        <div className="basisCard orthoMatrixCard bmMatrixCard">
          <div className="bmCardHead">
            <h3>Orthogonal Basis Matrix ( C )</h3>
            <button
              className="actionBtn bmGenBtn"
              disabled={basisGenerated || generating}
              onClick={generate}
            >
              {generating ? "Generating…" : basisGenerated ? "Generated" : "Generate Basis Matrix"}
            </button>
          </div>

          <div className="basisGrid">
            <div className="matrixCorner">u \ x</div>
            {Array.from({ length: N }).map((_, i) => (
              <div key={"head" + i} className="matrixHeader">x={i}</div>
            ))}

            {cells.map((row, u) => (
              <React.Fragment key={u}>
                <div
                  className={"matrixHeader" + (selRow === u ? " hdrSel" : "") + (basisGenerated ? " hdrClick" : "")}
                  onClick={() => selectRow(u)}
                  title={basisGenerated ? "Click to plot this basis function" : undefined}
                >
                  u={u}
                </div>
                {row.map((value, x) => {
                  const isGen = genCell && genCell.row === u && genCell.col === x;
                  const isSel = hasCell && selRow === u && selCol === x;
                  const cls =
                    value === null ? "emptyBasisCell"
                    : isSel || isGen ? "activeVector"
                    : selRow === u ? "rowSel"
                    : "";
                  return (
                    <span key={u + "-" + x} className={cls} onClick={() => value !== null && selectCell(u, x)}>
                      {value === null ? "" : value.toFixed(narrow ? 3 : 4)}
                    </span>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {orthoErr !== null ? (
            <div className="bmOrtho">
              Orthonormal: C × Cᵀ = I — every row has length 1 and rows are mutually perpendicular, so the transform is exactly reversible.
              <span> (rounding error ≤ {orthoErr.toFixed(4)})</span>
            </div>
          ) : (
            <div className="bmOrtho bmOrthoWait">
              {transform ? "Press “Generate Basis Matrix” to fill in all 64 values." : "Choose DCT or DST first."}
            </div>
          )}
        </div>
      </div>

      <div className="bmBottom">

        <div className="currentCalculation bmCalc">
          <div className="calcHeaderRow">
            <h3>Current Basis Calculation</h3>
            {hasCell && <span className="calcCellBadge">u = {selRow}, x = {selCol}</span>}
          </div>

          {!hasCell ? (
            <div className="bmEmpty">
              {basisGenerated
                ? "Click any cell of the matrix to see how its value is calculated, step by step."
                : "Generate the basis matrix first, then click a cell to see its calculation."}
            </div>
          ) : (
            <>
              <div className="playControls">
                <button className="calcPlayBtn" onClick={playCalc}>▶ Play</button>
                <button className="calcPlayBtn calcFastForward" onClick={() => setCalcStep(99)}>⏩ Show All</button>
              </div>
              <div className="calcTimeline">
                {steps.slice(0, calcStep).map((step, i) => (
                  <div key={i} className={step.isResult ? "calcTimelineItem calcResultItem" : "calcTimelineItem"}>
                    <div className="calcStepBadge">{step.isResult ? "✓" : i + 1}</div>
                    <div className="calcStepBody">
                      <div className="calcStepLabel">{step.label}</div>
                      <div className="calcStepExpr">{step.node}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="waveCard bmWave">
          <div className="calcHeaderRow">
            <h3>Basis Function</h3>
            {showWave && <span className="calcCellBadge">u = {selRow}</span>}
          </div>

          {!showWave ? (
            <div className="bmEmpty">
              {basisGenerated
                ? "Click a cell, or a row label (u = 0 … 7), to plot that row as a wave."
                : "The wave of each row appears here once the matrix is generated."}
            </div>
          ) : (
            <>
              <svg className="waveSvg" viewBox="0 0 520 268">
                {[0.5, 0, -0.5].map((v) => (
                  <g key={v}>
                    <line x1={GX0 - 10} y1={gy(v)} x2={GX1 + 20} y2={gy(v)} className={v === 0 ? "axisLine" : "gridLine"} />
                    <text x={GX0 - 16} y={gy(v) + 4} textAnchor="end" className="waveTick">{v > 0 ? "+" : ""}{v.toFixed(1)}</text>
                  </g>
                ))}

                <path d={curvePath} fill="none" className="waveCurve" />

                {Array.from({ length: N }).map((_, x) => {
                  const v = basisValue(transform, selRow, x);
                  const on = hasCell && selCol === x;
                  return (
                    <g key={x}>
                      <line x1={gx(x)} y1={gy(0)} x2={gx(x)} y2={gy(v)} className={on ? "waveStem waveStemOn" : "waveStem"} />
                      <circle cx={gx(x)} cy={gy(v)} r={on ? 9 : 6} className={on ? "wavePoint wavePointOn" : "wavePoint"} />
                      {on && (
                        <text
                          x={v >= 0 ? gx(x) : x >= 5 ? gx(x) - 14 : gx(x) + 14}
                          y={v >= 0 ? gy(v) - 15 : gy(v) + 5}
                          textAnchor={v >= 0 ? "middle" : x >= 5 ? "end" : "start"}
                          className="waveValue"
                        >{v.toFixed(4)}</text>
                      )}
                      <text x={gx(x)} y={248} textAnchor="middle" className="waveLabel">{x}</text>
                    </g>
                  );
                })}
                <text x={(GX0 + GX1) / 2} y={264} textAnchor="middle" className="waveAxisTitle">pixel position x</text>
              </svg>
              <div className="waveDescription">{bandText(transform, selRow)}</div>
            </>
          )}
        </div>

      </div>

      {showPick && (
        <div className="bmPopupBack" onClick={() => setShowPick(false)}>
          <div className="bmPopup" onClick={(e) => e.stopPropagation()}>
            <h3>Select a transform</h3>
            <p>Please select DCT or DST first, then generate the basis matrix.</p>
            <button onClick={() => setShowPick(false)}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BasisMatrix;
