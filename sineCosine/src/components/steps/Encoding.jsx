import "./Encoding.css";
import { useEffect, useRef, useState } from "react";
import { useMatrix } from "../../context/MatrixContext";
import { runLengthEncode } from "../../utils/transformUtils";

function toBinary8(value) {
  const v = ((value % 256) + 256) % 256;
  return v.toString(2).padStart(8, "0");
}

function Encoding() {
  const { zigzagArray, encodedRuns, setEncodedRuns, selectedBlock, transform } = useMatrix();

  const [scanIndex, setScanIndex] = useState(-1);
  const [status, setStatus] = useState("Waiting");
  const intervalRef = useRef(null);

  const hasZigzag = zigzagArray.length === 64;
  const fullResult = hasZigzag ? runLengthEncode(zigzagArray) : { pairs: [], hasEOB: false, lastNonZero: -1 };

  useEffect(() => {
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
    setEncodedRuns({ pairs: [], hasEOB: fullResult.hasEOB, lastNonZero: fullResult.lastNonZero });

    let i = 0;
    const built = [];

    intervalRef.current = setInterval(() => {
      setScanIndex(i);
      if (i <= fullResult.lastNonZero) {
        const matching = fullResult.pairs.find((p) => p.index === i);
        if (matching) {
          built.push(matching);
          setEncodedRuns({ pairs: [...built], hasEOB: fullResult.hasEOB, lastNonZero: fullResult.lastNonZero });
        }
      }
      i++;
      if (i >= 64) {
        clearInterval(intervalRef.current);
        setStatus("Completed \u2713");
        setScanIndex(-1);
      }
    }, 45);
  };

  const pairs = encodedRuns?.pairs ?? [];
  const symbolsAfter = pairs.length + (fullResult.hasEOB ? 1 : 0);
  const symbolsBefore = 64;
  const ratio = symbolsAfter ? (symbolsBefore / symbolsAfter).toFixed(2) : "1.00";

  return (
    <div className="encContainer">
      <div className="encHeading">
        <h2>Step 8 : Encoding (Run-Length Encoding)</h2>
        <p>
          The zig-zag ordered sequence typically contains long runs of zero coefficients
          following a handful of significant low-frequency values. Instead of storing
          every zero individually, Run-Length Encoding (RLE) stores each non-zero value
          together with a count of how many zeros preceded it: the pair (run, value).
          Once only zeros remain, a single End-Of-Block (EOB) symbol replaces the entire
          remaining tail — this is the core entropy-preparation idea used across
          transform-coding systems, independent of any specific file format.
        </p>
      </div>

      {!hasZigzag && (
        <div className="encWarning">
          Please complete Step 7 (Zig-Zag Scan) for this block first, then return here.
        </div>
      )}

      <div className="encSequenceCard">
        <h3>Source Sequence (Zig-Zag Output)</h3>
        <div className="encSequence">
          {Array.from({ length: 64 }).map((_, i) => (
            <span
              key={i}
              className={
                "encChip" +
                (hasZigzag && zigzagArray[i] === 0 ? " encChipZero" : "") +
                (i === scanIndex ? " encChipCurrent" : "") +
                (i > fullResult.lastNonZero && hasZigzag ? " encChipEOBRegion" : "")
              }
            >
              {hasZigzag ? zigzagArray[i] : 0}
            </span>
          ))}
        </div>
        <button className="encButton" onClick={runEncode} disabled={!hasZigzag}>
          {pairs.length ? "Re-run Encoding" : "Start Run-Length Encoding"}
        </button>
        <p className="encStatus">{status}</p>
      </div>

      <div className="encStreamCard">
        <h3>Encoded Stream</h3>
        <div className="encStream">
          {pairs.length === 0 && <span className="encEmpty">Run encoding to generate the stream…</span>}
          {pairs.map((p, i) => (
            <div key={i} className="encPair">
              <span className="encPairRun">({p.run},</span>
              <span className="encPairVal">{p.value})</span>
            </div>
          ))}
          {pairs.length > 0 && fullResult.hasEOB && <div className="encEOB">EOB</div>}
        </div>
      </div>

      <div className="encBinaryCard">
        <h3>Binary Representation (Illustrative)</h3>
        <p className="encBinaryNote">Each (run, value) pair shown as an 8-bit run count followed by an 8-bit two's-complement-style value:</p>
        <div className="encBinaryStream">
          {pairs.length === 0 && <span className="encEmpty">—</span>}
          {pairs.map((p, i) => (
            <span key={i} className="encBinaryChip">
              {toBinary8(p.run)}<b> {toBinary8(p.value)}</b>
            </span>
          ))}
          {pairs.length > 0 && fullResult.hasEOB && <span className="encBinaryChip encBinaryEOB">1111 1111</span>}
        </div>
      </div>

      <div className="compressionSection">
        <h3>Compression Statistics</h3>
        <div className="compressionGrid">
          <div className="compressionCard">
            <span className="statLabel">Symbols Before RLE</span>
            <span className="statValue">{symbolsBefore}</span>
          </div>
          <div className="compressionCard">
            <span className="statLabel">Symbols After RLE</span>
            <span className="statValue">{symbolsAfter || "\u2014"}</span>
          </div>
          <div className="compressionCard">
            <span className="statLabel">Symbol Compression Ratio</span>
            <span className="statValue">{pairs.length ? `${ratio} : 1` : "\u2014"}</span>
          </div>
        </div>
      </div>

      <div className="observationCard">
        <h3>Educational Explanation</h3>
        <ul>
          <li>Each pair (run, value) means: "skip <b>run</b> zeros, then place <b>value</b>".</li>
          <li>The EOB symbol is a research-standard convention for terminating a block once no further non-zero coefficients remain, avoiding the need to transmit trailing zeros at all.</li>
          <li>In production entropy coders (Huffman or arithmetic coding), these (run, value) symbols are further compressed using variable-length codes based on their statistical frequency — RLE only removes structural redundancy, entropy coding removes statistical redundancy.</li>
          <li>Reference: this staged design (transform → quantize → zig-zag → RLE → entropy code) is the canonical transform-coding pipeline described in Rao & Yip, "Discrete Cosine Transform: Algorithms, Advantages, Applications" (1990), and Gonzalez & Woods, "Digital Image Processing".</li>
        </ul>
      </div>

      <div className="pipelineCard">
        <h2>Next Step Preview</h2>
        <p>To evaluate reconstruction quality, the encoded stream is conceptually reversed: dequantized and passed through the inverse transform to recover the spatial-domain block.</p>
        <div className="pipelineFlow">
          <div className="pipelineBox">Zig-Zag Output</div>
          <div className="pipelineOperator">→</div>
          <div className="pipelineBox">RLE Stream</div>
          <div className="pipelineOperator">→</div>
          <div className="pipelineResult">Inverse Transform</div>
        </div>
      </div>
    </div>
  );
}

export default Encoding;
