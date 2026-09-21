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
  const [status, setStatus] = useState(zigzagArray && zigzagArray.length===64 ? "Completed ✓" : "Waiting");
  const intervalRef = useRef(null);
  const prevKey = useRef(JSON.stringify(quantizedMatrix)+selectedBlock+transform);

  const hasQuantized = quantizedMatrix.length === 8;

  useEffect(() => {
    const key = JSON.stringify(quantizedMatrix)+selectedBlock+transform;
    if (prevKey.current === key) return;
    prevKey.current = key;
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

  const pointsArr = ORDER.map(([r, c]) => `${c * CELL + CELL / 2},${r * CELL + CELL / 2}`);
  const drawUpTo = cursor >= 0 ? cursor + 1 : (zigzagArray.length === 64 ? 64 : 0);
  const points = pointsArr.slice(0, drawUpTo).join(" ");
  const currentPoint = cursor >= 0 ? ORDER[cursor] : null;
  const scannedSoFar = cursor >= 0 ? cursor + 1 : zigzagArray.length;

  return (
    <div className="zzContainer">
      <div className="zzHeading">
        <h2>Zig-Zag Scan</h2>
        <p>
          The quantized 8×8 matrix is reordered into a 1-D sequence by scanning
          diagonally from the DC term, grouping trailing zeros for compression.
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
              <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
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
          <button className="zzButton" onClick={runScan} disabled={!hasQuantized || zigzagArray.length>0}>
            Start Zig-Zag Scan
          </button>
        </div>

        <div className="zz1dCard">
          <h3>Generated 1-D Output Array</h3>
          <div className="zz1dString">
            [{zigzagArray.map((val, i) => (
              <span key={i} className={val === 0 ? "zzTokZero" : "zzTok"}>
                {val}{i < zigzagArray.length - 1 ? ", " : ""}
              </span>
            ))}
            {zigzagArray.length < 64 && <span className="zzTokPending"> …</span>}]
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

    </div>
  );
}

export default ZigZagScan;
