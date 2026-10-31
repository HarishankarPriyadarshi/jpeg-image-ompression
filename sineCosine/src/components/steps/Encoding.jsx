import "./Encoding.css";
import { useEffect, useRef, useState } from "react";
import { useMatrix } from "../../context/MatrixContext";
import { runLengthEncode } from "../../utils/transformUtils";

function Encoding() {
  const { zigzagArray, encodedRuns, setEncodedRuns, selectedBlock, transform } = useMatrix();

  const [scanIndex, setScanIndex] = useState(-1);
  const [status, setStatus] = useState(encodedRuns?.done ? "Completed ✓" : "Waiting");
  const intervalRef = useRef(null);
  const prevKey = useRef(JSON.stringify(zigzagArray) + selectedBlock + transform);

  const hasZigzag = zigzagArray.length === 64;
  const fullPairs = hasZigzag ? runLengthEncode(zigzagArray) : [];

  useEffect(() => {
    const key = JSON.stringify(zigzagArray) + selectedBlock + transform;
    if (prevKey.current === key) return;
    prevKey.current = key;
    setEncodedRuns(null);
    setScanIndex(-1);
    setStatus("Waiting");
    if (intervalRef.current) clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zigzagArray, selectedBlock, transform]);

  useEffect(() => () => intervalRef.current && clearInterval(intervalRef.current), []);

  const runEncode = () => {
    if (!hasZigzag) return;
    if (intervalRef.current) clearInterval(intervalRef.current);

    setStatus("Encoding...");
    setEncodedRuns({ pairs: [], done: false });

    let i = 0;
    const built = [];

    intervalRef.current = setInterval(() => {
      setScanIndex(i);
      const matching = fullPairs.find((p) => p.endIndex === i);
      if (matching) {
        built.push(matching);
        setEncodedRuns({ pairs: [...built], done: false });
      }
      i++;
      if (i >= 64) {
        clearInterval(intervalRef.current);
        setStatus("Completed ✓");
        setScanIndex(-1);
        setEncodedRuns({ pairs: [...built], done: true });
      }
    }, 45);
  };

  const pairs = encodedRuns?.pairs ?? [];
  const runsAfter = pairs.length;
  const numbersAfter = runsAfter * 2; // each pair stores 2 numbers: value + count
  const ratio = numbersAfter ? (64 / numbersAfter).toFixed(2) : "1.00";

  // Which run is currently highlighted in the source sequence, based on scan position
  const activeRunStart = scanIndex >= 0 ? fullPairs.find((p) => scanIndex >= p.startIndex && scanIndex <= p.endIndex)?.startIndex : -1;

  return (
    <div className="encContainer">
      <div className="encHeading">
        <h2>Encoding (Run-Length Encoding)</h2>
        <p>
          Run-Length Encoding scans a sequence and counts how many times each value repeats
          <b> consecutively</b>. Every run of the same value — whatever that value is — is stored as a
          single <b>(value, count)</b> pair instead of writing the value out every time.
        </p>
      </div>

      {!hasZigzag && (
        <div className="encWarning">
          Please complete the Zig-Zag Scan for this block first, then return here.
        </div>
      )}

      <div className="encSequenceCard">
        <h3>Now Apply It: Source Sequence (Zig-Zag Output)</h3>
        <div className="encSequence">
          {Array.from({ length: 64 }).map((_, i) => (
            <span
              key={i}
              className={
                "encChip" +
                (hasZigzag && zigzagArray[i] === 0 ? " encChipZero" : "") +
                (i === scanIndex ? " encChipCurrent" : "") +
                (activeRunStart >= 0 && i >= activeRunStart && i <= scanIndex ? " encChipInRun" : "")
              }
            >
              {hasZigzag ? zigzagArray[i] : 0}
            </span>
          ))}
        </div>
        <button className="encButton" onClick={runEncode} disabled={!hasZigzag || encodedRuns?.done}>
          Start Run-Length Encoding
        </button>
        <p className="encStatus">Status: {status}</p>
      </div>

      <div className="encStreamCard">
        <h3>Encoded Stream</h3>
        <div className="encStream">
          {pairs.length === 0 && <span className="encEmpty">Run encoding to generate the stream…</span>}
          {pairs.map((p, i) => (
            <div key={i} className="encPair" title={`value ${p.value} repeats ${p.count} time(s)`}>
              <span className="encPairRun">({p.value},</span>
              <span className="encPairVal">{p.count})</span>
            </div>
          ))}
        </div>
        {pairs.length > 0 && (
          <p className="encStreamLegend">
            Each pair means <b>(value, count)</b> — "this value repeated this many times in a row".
          </p>
        )}
      </div>

      <div className="compressionSection">
        <h3>Compression Statistics</h3>
        <div className="compressionGrid">
          <div className="compressionCard">
            <span className="statLabel">Values Before RLE</span>
            <span className="statValue">64</span>
          </div>
          <div className="compressionCard">
            <span className="statLabel">Runs After RLE</span>
            <span className="statValue">{runsAfter || "—"}</span>
          </div>
          <div className="compressionCard">
            <span className="statLabel">Compression Ratio</span>
            <span className="statValue">{runsAfter ? `${ratio} : 1` : "—"}</span>
          </div>
        </div>
        <p className="compressionNote">
          {runsAfter
            ? `64 values were grouped into ${runsAfter} run(s), stored as ${numbersAfter} numbers (value + count for each run) instead of 64 — a ${ratio}:1 reduction.`
            : "Run the encoding above to see the statistics."}
        </p>
      </div>

      <div className="observationCard">
        <h3>Educational Explanation</h3>
        <ul>
          <li>RLE looks at consecutive values and, whenever the same value repeats, replaces the whole run with one <b>(value, count)</b> pair.</li>
          <li>It works for ANY value, not only zero — a run of five 3's becomes (3, 5) exactly the same way a run of five 0's becomes (0, 5).</li>
          <li>A value that does not repeat still gets its own pair with count = 1, so RLE never loses information — the original sequence can always be rebuilt exactly from the pairs.</li>
          <li>RLE compresses well when data has long repeated runs (like the trailing zeros after quantization here); it barely helps — or can even grow the data — when values rarely repeat.</li>
          <li>In real image codecs like JPEG, this same idea is applied to the quantized coefficients, where zeros are by far the most common repeated value after quantization.</li>
        </ul>
      </div>

    </div>
  );
}

export default Encoding;
