import "./Quantization.css";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMatrix } from "../../context/MatrixContext";
import {
  generateBasisMatrix,
  forwardTransform,
  extractBlock,
  buildQuantTable,
  baseQuantizationTable,
} from "../../utils/transformUtils";

const N = 8;
const isComplete = (m) => m && m.length === N && m.every((row) => row.every((v) => v !== null));

// toFixed that never prints "-0.0"
const fx = (x, d) => {
  const t = Number(x).toFixed(d);
  return /^-0\.?0*$/.test(t) ? t.slice(1) : t;
};

function Quantization() {
  const {
    selectedMatrix,
    frequencyMatrix,
    setFrequencyMatrix,
    transform,
    selectedBlock,
    qualityFactor,
    setQualityFactor,
    setQuantTable,
    quantizedMatrix,
    setQuantizedMatrix,
    setZigzagArray,
    setEncodedRuns,
    setDequantizedMatrix,
    setReconstructedBlock,
  } = useMatrix();

  const done = isComplete(quantizedMatrix);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState({ row: -1, col: -1 });
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const [calcStep, setCalcStep] = useState(99);

  const intervalRef = useRef(null);
  const playRef = useRef(null);
  const finishRef = useRef(null);
  const prevKey = useRef(selectedBlock + "_" + transform);
  const prevQF = useRef(qualityFactor);

  // ---- the frequency matrix from Step 4 (computed here only if it is missing) ----
  const computedF = useMemo(() => {
    if (!selectedMatrix) return null;
    const T = generateBasisMatrix(transform);
    const block = extractBlock(selectedMatrix.data, selectedBlock);
    return forwardTransform(block, T).map((row) => row.map((v) => Number(v.toFixed(2))));
  }, [selectedMatrix, selectedBlock, transform]);

  const F = isComplete(frequencyMatrix) ? frequencyMatrix : computedF || Array.from({ length: N }, () => Array(N).fill(0));
  const T = useMemo(() => buildQuantTable(qualityFactor), [qualityFactor]);

  const stopTimers = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    if (playRef.current) clearInterval(playRef.current);
    playRef.current = null;
  };

  const clearResults = () => {
    stopTimers();
    finishRef.current = null;
    setQuantizedMatrix([]);
    setZigzagArray([]);
    setEncodedRuns(null);
    setDequantizedMatrix([]);
    setReconstructedBlock([]);
    setRunning(false);
    setCurrent({ row: -1, col: -1 });
  };

  // keep the context in sync when Step 4's result is missing
  useEffect(() => {
    if (computedF && !isComplete(frequencyMatrix)) setFrequencyMatrix(computedF);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedF]);

  // a different block or transform makes the old result invalid
  useEffect(() => {
    const key = selectedBlock + "_" + transform;
    if (prevKey.current === key) return;
    prevKey.current = key;
    clearResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBlock, transform]);

  // the scaled table is shared with later steps; a new quality invalidates the old result
  useEffect(() => {
    setQuantTable(T);
    if (prevQF.current === qualityFactor) return;
    prevQF.current = qualityFactor;
    clearResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qualityFactor]);

  // leaving mid-animation: finish the result instantly so nothing is left half-built
  useEffect(() => {
    return () => {
      const wasRunning = !!intervalRef.current;
      stopTimers();
      if (wasRunning && finishRef.current) finishRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fullQ = F.map((row, u) => row.map((v, c) => Math.round(v / T[u][c])));

  const perform = () => {
    if (running || done) return;
    stopTimers();
    setRunning(true);
    setQuantizedMatrix([]);
    finishRef.current = () => setQuantizedMatrix(fullQ);

    const matrix = Array.from({ length: N }, () => Array(N).fill(null));
    let i = 0;
    intervalRef.current = setInterval(() => {
      const r = Math.floor(i / N);
      const c = i % N;
      setCurrent({ row: r, col: c });
      matrix[r][c] = fullQ[r][c];
      setQuantizedMatrix(matrix.map((row) => [...row]));
      i++;
      if (i >= N * N) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        finishRef.current = null;
        setCurrent({ row: -1, col: -1 });
        setRunning(false);
      }
    }, 45);
  };

  // ---------- numbers about the result ----------
  const flat = done ? quantizedMatrix.flat() : [];
  const zeroCount = flat.filter((v) => v === 0).length;
  const nonZeroCount = flat.length - zeroCount;
  const zeroPercent = flat.length ? ((zeroCount / 64) * 100).toFixed(1) : "0.0";
  const infoRemovedPercent = flat.length ? Number(zeroPercent) : 0;
  const compressionRatio = flat.length ? (64 / Math.max(nonZeroCount, 1)).toFixed(2) : "1.00";

  // ---------- selected coefficient ----------
  const { row: sr, col: sc } = selectedCell;
  const selF = F[sr][sc];
  const selT = T[sr][sc];
  const selDiv = selF / selT;
  const selRound = Math.round(selDiv);

  const calcRows = [
    { label: "Formula", node: <>Q(u,v) = Round( F(u,v) ÷ T(u,v) )</> },
    {
      label: "Divide",
      node: <>F({sr},{sc}) ÷ T({sr},{sc}) = {fx(selF, 2)} ÷ {selT} = <b>{fx(selDiv, 3)}</b></>,
    },
    { label: "Round", node: <>Round({fx(selDiv, 3)}) = <b>{selRound}</b> &nbsp;→&nbsp; Q({sr},{sc}) = <b>{selRound}</b></>, isResult: true },
  ];

  useEffect(() => {
    setCalcStep(99);
  }, [selectedCell, qualityFactor]);

  const playCalc = () => {
    if (playRef.current) clearInterval(playRef.current);
    setCalcStep(0);
    let s = 0;
    playRef.current = setInterval(() => {
      s++;
      setCalcStep(s);
      if (s >= calcRows.length) {
        clearInterval(playRef.current);
        playRef.current = null;
      }
    }, 700);
  };

  const pick = (r, c) => {
    if (!done) return;
    if (playRef.current) clearInterval(playRef.current);
    setSelectedCell({ row: r, col: c });
  };

  if (!selectedMatrix) return null;

  const isBase = JSON.stringify(T) === JSON.stringify(baseQuantizationTable);
  const qLabel =
    qualityFactor <= 30
      ? "High compression — large step sizes, many coefficients become zero."
      : qualityFactor <= 70
      ? "Balanced — moderate step sizes."
      : "High quality — fine step sizes, few coefficients removed.";

  const cellCls = (r, c, extra = "") =>
    "qzCell " + (done ? "qzClick " : "") + extra + (current.row === r && current.col === c ? " qzActive" : "") + (done && sr === r && sc === c ? " qzChosen" : "");

  return (
    <div className="quantContainer qzRoot">

      <div className="qzHeading">
        <h2>Quantization</h2>
        <p>Each coefficient F(u,v) is divided by a step size T(u,v) and rounded — small, less important detail becomes zero.</p>
      </div>

      <div className="qzQuality qualityCard">
        <div className="qzQualityTop">
          <h3>Quality Factor</h3>
          <span className="qzQValue">Q = {qualityFactor}</span>
          <span className="qzQText">
            {qLabel} {isBase ? "(base table)" : ""}
          </span>
        </div>
        <input
          type="range"
          min="10"
          max="100"
          step="10"
          value={qualityFactor}
          onChange={(e) => setQualityFactor(Number(e.target.value))}
          disabled={running}
        />
        <div className="qzMarks">
          {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((q) => (
            <span key={q} className={qualityFactor === q ? "qzMarkOn" : ""}>Q{q}</span>
          ))}
        </div>
      </div>

      <div className="qzMatrices">
        <div className="qzCard">
          <h3>Frequency Matrix F(u,v)</h3>
          <div className="qzGrid">
            {F.map((row, r) =>
              row.map((v, c) => (
                <span key={r + "-" + c} className={cellCls(r, c)} onClick={() => pick(r, c)}>{fx(v, 1)}</span>
              ))
            )}
          </div>
        </div>

        <div className="qzOp">÷</div>

        <div className="qzCard">
          <h3>Quantization Table T(u,v)</h3>
          <div className="qzGrid">
            {T.map((row, r) =>
              row.map((v, c) => (
                <span key={r + "-" + c} className={cellCls(r, c)} onClick={() => pick(r, c)}>{v}</span>
              ))
            )}
          </div>
        </div>

        <div className="qzOp">=</div>

        <div className="qzCard">
          <h3>Quantized Matrix Q(u,v)</h3>
          <div className="qzGrid">
            {Array.from({ length: 64 }).map((_, i) => {
              const r = Math.floor(i / N);
              const c = i % N;
              const val = quantizedMatrix.length === N ? quantizedMatrix[r][c] : null;
              if (val === null || val === undefined) {
                return <span key={i} className={cellCls(r, c, "qzPending")} onClick={() => pick(r, c)}>·</span>;
              }
              return (
                <span key={i} className={cellCls(r, c, val === 0 ? "qzZero" : "qzNonZero")} onClick={() => pick(r, c)}>{val}</span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="qzBar">
        <button className="actionBtn qzRunBtn" onClick={perform} disabled={running || done}>
          {running ? "Quantizing…" : done ? "Quantization Done" : "Perform Quantization"}
        </button>
        {done ? (
          <div className="qzStats">
            <div><b>{zeroCount}</b><span>zero</span></div>
            <div><b>{nonZeroCount}</b><span>non-zero</span></div>
            <div><b>{zeroPercent}%</b><span>of the 64 are zero</span></div>
          </div>
        ) : (
          <span className="qzHint">{running ? "Dividing each coefficient and rounding…" : "Press “Perform Quantization” to compute Q."}</span>
        )}
      </div>

      <div className="qzCalc currentCalculation">
        <div className="qzCalcHead">
          <h3>Selected Coefficient</h3>
          {done && <span className="qzBadge">u = {sr}, v = {sc}</span>}
          {done && (
            <div className="qzPlay">
              <button onClick={playCalc}>▶ Play</button>
              <button onClick={() => setCalcStep(99)}>Show all</button>
            </div>
          )}
        </div>
        {done ? (
          <div className="qzRows">
            {calcRows.slice(0, calcStep).map((s, i) => (
              <div key={i} className={"qzRow" + (s.isResult ? " qzRowResult" : "")}>
                <div className="qzRowLabel">{s.label}</div>
                <div className="qzRowExpr">{s.node}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="qzEmpty">After quantization, click any cell to see how its value is calculated.</div>
        )}
      </div>

      <div className="qzExtra">

        <div className="formulaSection">
          <h3>Quantization Formula</h3>
          <div className="formulaCard">
            <h2>Q(u,v) = Round( F(u,v) / T(u,v) )</h2>
            <p><b>F(u,v)</b> → Frequency coefficient from the transform stage</p>
            <p><b>T(u,v)</b> → Quality-scaled quantization step size</p>
            <p><b>Q(u,v)</b> → Quantized (compressed) coefficient</p>
            <hr />
            <p>
              Each transform coefficient is divided by its corresponding quantization step
              and rounded to the nearest integer, discarding the fractional remainder.
              This rounding is the source of the information loss in transform coding.
            </p>
          </div>
        </div>

        {done && (
          <>
        <div className="zeroStatsSection">
          <h3>Zero Coefficient Visualization</h3>
          <div className="zeroStatsGrid">
            <div className="zeroStatCard zeroCard">
              <span className="statLabel">Zero Coefficients</span>
              <span className="statValue">{zeroCount}</span>
            </div>
            <div className="zeroStatCard nonZeroCard">
              <span className="statLabel">Non-Zero Coefficients</span>
              <span className="statValue">{nonZeroCount}</span>
            </div>
            <div className="zeroStatCard percentCard">
              <span className="statLabel">Zero Percentage</span>
              <span className="statValue">{zeroPercent}%</span>
            </div>
          </div>
          <div className="zeroBarTrack">
            <div className="zeroBarFill" style={{ width: `${zeroPercent}%` }} />
          </div>
          <p className="zeroBarCaption">Proportion of the 64 coefficients rounded to zero (grey cells above).</p>
        </div>

        <div className="compressionSection">
          <h3>Compression Analysis</h3>
          <div className="compressionGrid">
            <div className="compressionCard">
              <span className="statLabel">Estimated Compression Ratio</span>
              <span className="statValue">{compressionRatio} : 1</span>
            </div>
            <div className="compressionCard">
              <span className="statLabel">Coefficients Removed</span>
              <span className="statValue">{infoRemovedPercent}%</span>
            </div>
            <div className="compressionCard">
              <span className="statLabel">Coefficients Kept</span>
              <span className="statValue">{(100 - infoRemovedPercent).toFixed(1)}%</span>
            </div>
          </div>
          <div className="compressionChart">
            <div className="chartBarGroup">
              <div className="chartBar" style={{ height: "100%" }}><span>64</span></div>
              <label>Before Quantization</label>
            </div>
            <div className="chartBarGroup">
              <div
                className="chartBar chartBarAfter"
                style={{ height: `${Math.max(4, (nonZeroCount / 64) * 100)}%` }}
              >
                <span>{nonZeroCount || "\u2014"}</span>
              </div>
              <label>Non-Zero After Quantization</label>
            </div>
          </div>
        </div>
          </>
        )}

        <div className="observationCard">
          <h3>Research Insights & Educational Observations</h3>
          <ul>
            <li><b>Why high frequencies vanish:</b> the quantization table assigns large step sizes to high (u,v) indices, so small high-frequency coefficients divide down toward zero and round away.</li>
            <li><b>How compression is achieved:</b> long runs of zero coefficients (visible above) compress extremely well under run-length and entropy coding in the next stages.</li>
            <li><b>Why visual quality remains acceptable:</b> most of a natural image&apos;s energy is concentrated in the low-frequency (top-left) coefficients, which this table preserves with fine step sizes.</li>
            <li><b>Transform-coding generality:</b> this quantize-then-entropy-code strategy applies to any orthogonal transform (DCT, DST, Walsh-Hadamard, wavelets); it is a general transform-coding principle, not tied to one file format.</li>
            <li><b>Trade-off:</b> lowering the quality factor increases the compression ratio but also increases reconstruction error, quantified later using PSNR in Step 8.</li>
          </ul>
        </div>

      </div>

    </div>
  );
}

export default Quantization;
