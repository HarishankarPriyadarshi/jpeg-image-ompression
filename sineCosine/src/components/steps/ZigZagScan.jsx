import "./ZigZagScan.css";
import { useEffect, useRef, useState } from "react";
import { useMatrix } from "../../context/MatrixContext";
import { zigZagOrder, matrixToZigZagArray } from "../../utils/transformUtils";

const ORDER = zigZagOrder(8);
const CELL = 40;
const GRID = CELL * 8;

function ZigZagScan() {
  const { quantizedMatrix, zigzagArray, setZigzagArray, selectedBlock, transform } = useMatrix();

  const [cursor, setCursor] = useState(-1);
  const [status, setStatus] = useState("Waiting");
  const intervalRef = useRef(null);

  const hasQuantized = quantizedMatrix.length === 8;

  useEffect(() => {
    setZigzagArray([]);
    setCursor(-1);
    setStatus("Waiting");
    if (intervalRef.current) clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantizedMatrix, selectedBlock, transform]);

  useEffect(() => () => intervalRef.current && clearInterval(intervalRef.current), []);

  const runScan = () => {
    if (!hasQuantized) return;
    if (intervalRef.current) clearInterval(intervalRef.current);

    setStatus("Scanning...");
    setZigzagArray([]);
    let i = 0;
    const output = [];

    intervalRef.current = setInterval(() => {
      const [r, c] = ORDER[i];
      output.push(quantizedMatrix[r][c]);
      setZigzagArray([...output]);
      setCursor(i);
      i++;
      if (i >= ORDER.length) {
        clearInterval(intervalRef.current);
        setStatus("Completed \u2713");
        setCursor(-1);
      }
    }, 45);
  };

  const points = ORDER.map(([r, c]) => `${c * CELL + CELL / 2},${r * CELL + CELL / 2}`).join(" ");
  const currentPoint = cursor >= 0 ? ORDER[cursor] : null;
  const scannedSoFar = cursor >= 0 ? cursor + 1 : zigzagArray.length;

  return (
    <div className="zzContainer">
      <div className="zzHeading">
        <h2>Step 7 : Zig-Zag Scan</h2>
        <p>
          The 8×8 quantized coefficient matrix is inherently two-dimensional, but
          entropy coders operate on 1-D sequences. The zig-zag scan reorders coefficients
          by increasing spatial frequency, starting at the DC term (0,0) and sweeping
          diagonally toward the highest-frequency term (7,7). Because quantization drives
          most high-frequency terms to zero (Step 6), this reordering clusters the zero
          coefficients together at the tail of the sequence — which is exactly what
          run-length encoding (Step 8) needs to compress efficiently.
        </p>
      </div>

      {!hasQuantized && (
        <div className="zzWarning">
          Please complete Step 6 (Quantization) for this block first, then return here.
        </div>
      )}

      <div className="zzLayout">
        <div className="zzGridCard">
          <h3>Quantized Matrix — Traversal Order</h3>
          <div className="zzGridWrap">
            <svg viewBox={`0 0 ${GRID} ${GRID}`} className="zzSvg">
              <polyline points={points} fill="none" stroke="#93c5fd" strokeWidth="2" strokeDasharray="4 3" />
              {currentPoint && (
                <circle
                  cx={currentPoint[1] * CELL + CELL / 2}
                  cy={currentPoint[0] * CELL + CELL / 2}
                  r="9"
                  fill="#f59e0b"
                />
              )}
            </svg>
            <div className="zzGrid">
              {Array.from({ length: 8 }).map((_, r) =>
                Array.from({ length: 8 }).map((__, c) => {
                  const orderIndex = ORDER.findIndex(([or, oc]) => or === r && oc === c);
                  const visited = orderIndex <= cursor && orderIndex !== -1 && cursor !== -1;
                  const done = zigzagArray.length === 64 && status.includes("Completed");
                  return (
                    <div
                      key={`${r}-${c}`}
                      className={
                        "zzCell" +
                        (r === currentPoint?.[0] && c === currentPoint?.[1] ? " zzActive" : "") +
                        (visited || done ? " zzVisited" : "")
                      }
                      style={{ gridRow: r + 1, gridColumn: c + 1 }}
                    >
                      <span className="zzValue">{hasQuantized ? quantizedMatrix[r][c] : 0}</span>
                      <span className="zzOrder">{orderIndex}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <button className="zzButton" onClick={runScan} disabled={!hasQuantized}>
            {zigzagArray.length ? "Re-run Zig-Zag Scan" : "Start Zig-Zag Scan"}
          </button>
          <p className="zzStatus">{status}   ({scannedSoFar}/64 coefficients read)</p>
        </div>

        <div className="zz1dCard">
          <h3>Generated 1-D Output Array</h3>
          <div className="zz1dTrack">
            {Array.from({ length: 64 }).map((_, i) => (
              <span
                key={i}
                className={
                  "zzChip" +
                  (i < zigzagArray.length ? (zigzagArray[i] === 0 ? " zzChipZero" : " zzChipFilled") : "") +
                  (i === cursor ? " zzChipCurrent" : "")
                }
              >
                {i < zigzagArray.length ? zigzagArray[i] : ""}
              </span>
            ))}
          </div>
          <p className="zz1dCaption">
            Index 0 is the DC coefficient; trailing zeros form the run that Step 8 will compress.
          </p>
        </div>
      </div>

      <div className="formulaSection zzFormula">
        <h3>Traversal Rule</h3>
        <div className="formulaCard">
          <p>
            Starting at (u,v) = (0,0), the scan alternates between moving up-right along
            anti-diagonals and down-left along the next anti-diagonal, reflecting off the
            matrix boundaries. Coefficient (u,v) is visited at 1-D position:
          </p>
          <h2>index = zigZagOrder(u, v)</h2>
          <p>
            where <b>zigZagOrder</b> is the fixed diagonal traversal sequence shown by the
            small index numbers inside each cell above.
          </p>
        </div>
      </div>

      <div className="observationCard">
        <h3>Research Observations</h3>
        <ul>
          <li>Low spatial frequencies dominate the early part of the sequence, since they carry most of the block's signal energy.</li>
          <li>Long trailing zero-runs are the direct result of the diagonal ordering combined with Step 6's quantization.</li>
          <li>Alternative scan orders (e.g. horizontal, vertical, or Hilbert-curve scans) exist, but the zig-zag order is preferred because it best matches the energy distribution of DCT/DST coefficients for natural images.</li>
        </ul>
      </div>

      <div className="pipelineCard">
        <h2>Next Step Preview</h2>
        <p>The 1-D sequence generated here is passed to the Run-Length Encoder, which compresses the zero-runs into compact (run, value) symbol pairs.</p>
        <div className="pipelineFlow">
          <div className="pipelineBox">Quantized Matrix</div>
          <div className="pipelineOperator">→</div>
          <div className="pipelineBox">Zig-Zag Scan</div>
          <div className="pipelineOperator">→</div>
          <div className="pipelineResult">Run-Length Encoding</div>
        </div>
      </div>
    </div>
  );
}

export default ZigZagScan;
