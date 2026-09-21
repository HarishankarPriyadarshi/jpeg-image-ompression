import "./Encoding.css";
import { useEffect, useRef, useState } from "react";
import { useMatrix } from "../../context/MatrixContext";
import { runLengthEncode } from "../../utils/transformUtils";

function Encoding() {
  const { zigzagArray, encodedRuns, setEncodedRuns, selectedBlock, transform } = useMatrix();

  const [scanIndex, setScanIndex] = useState(-1);
  const [status, setStatus] = useState(encodedRuns?.pairs?.length ? "Completed \u2713" : "Waiting");
  const intervalRef = useRef(null);
  const prevKey = useRef(JSON.stringify(zigzagArray)+selectedBlock+transform);

  const hasZigzag = zigzagArray.length === 64;
  const fullResult = hasZigzag ? runLengthEncode(zigzagArray) : { pairs: [], hasEOB: false, lastNonZero: -1 };

  useEffect(() => {
    const key = JSON.stringify(zigzagArray)+selectedBlock+transform;
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
        <h2>Encoding (Run-Length Encoding)</h2>
        <p>
          Long runs of zero coefficients in the zig-zag sequence are compressed into
          compact (run, value) pairs, with a single EOB symbol replacing trailing zeros.
        </p>
      </div>

      {!hasZigzag && (
        <div className="encWarning">
          Please complete the Zig-Zag Scan for this block first, then return here.
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
        <button className="encButton" onClick={runEncode} disabled={!hasZigzag || pairs.length>0}>
          Start Run-Length Encoding
        </button>
      </div>

      {hasZigzag && (
        <div className="eobExplainCard">
          <h3>What is EOB? (End Of Block)</h3>
          {fullResult.hasEOB ? (
            <>
              <p>
                After Quantization, most of the <b>high-frequency values at the end</b> of the
                sequence become <b>0</b> (highlighted pink above). Once we cross the
                <b> last non-zero value</b> (position {fullResult.lastNonZero}), everything after
                it is guaranteed to be zero — all the way to position 63.
              </p>
              <p>
                Instead of writing out all <b>{63 - fullResult.lastNonZero}</b> of those trailing
                zeros one-by-one, we simply write <b>one symbol: EOB</b>. It means:
                <i> "Stop here — every remaining coefficient in this block is zero."</i>
              </p>
              <div className="eobExample">
                <span className="eobBefore">... , 1, -1&nbsp;</span>
                <span className="eobArrow">→ instead of writing {63 - fullResult.lastNonZero} zeros →</span>
                <span className="eobAfter">EOB</span>
              </div>
              <p className="eobNote">
                This is the biggest source of compression in RLE: dozens of zero symbols
                collapse into a single tag.
              </p>
            </>
          ) : (
            <p>
              This particular block has a <b>non-zero value at the very last position (63)</b>,
              so there are no trailing zeros left to compress — no EOB is needed here.
              EOB only appears when the block ends with one or more zeros.
            </p>
          )}
        </div>
      )}

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

    </div>
  );
}

export default Encoding;
