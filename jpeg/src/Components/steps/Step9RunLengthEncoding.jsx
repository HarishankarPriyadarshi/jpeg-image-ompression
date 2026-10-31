import { useEffect, useMemo, useRef } from "react";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSSSS(value) {
  const absValue = Math.abs(value);
  if (absValue === 0) return 0;
  return Math.floor(Math.log2(absValue)) + 1;
}

function getAmplitudeBits(value) {
  const size = getSSSS(value);
  if (size === 0) return "—";

  const absBinary = Math.abs(value).toString(2).padStart(size, "0");

  if (value > 0) return absBinary;

  return absBinary
    .split("")
    .map((bit) => (bit === "0" ? "1" : "0"))
    .join("");
}

// JPEG AC RLE (ITU-T T.81, F.1.2.2): trailing zeros are covered by a single
// EOB (never split into ZRLs); EOB is omitted if the last coefficient is non-zero.
function encodeRLE(acSequence) {
  const symbols = [];
  let zeroRun = 0;

  let lastNonZeroIndex = -1;
  for (let i = 0; i < acSequence.length; i += 1) {
    if (acSequence[i] !== 0) lastNonZeroIndex = i;
  }

  for (let i = 0; i <= lastNonZeroIndex; i += 1) {
    const value = acSequence[i];

    if (value === 0) {
      zeroRun += 1;

      if (zeroRun === 16) {
        symbols.push({ type: "ZRL", run: 15, size: 0, value: 0, bits: "—" });
        zeroRun = 0;
      }

      continue;
    }

    symbols.push({
      type: "AC",
      run: zeroRun,
      size: getSSSS(value),
      value,
      bits: getAmplitudeBits(value),
    });

    zeroRun = 0;
  }

  if (lastNonZeroIndex < acSequence.length - 1) {
    symbols.push({ type: "EOB", run: 0, size: 0 });
  }

  return symbols;
}

function normalizeAcSequence(sequence) {
  if (!Array.isArray(sequence) || sequence.length === 0) {
    return Array.from({ length: 63 }, () => 0);
  }

  return Array.from({ length: 63 }, (_, index) =>
    typeof sequence[index] === "number" ? sequence[index] : 0
  );
}

function Step9RunLengthEncoding({
  zigZagData,
  dcCodingData,
  onRleChange,
  selectedIndex,
  setSelectedIndex,
  encodedUpTo,
  setEncodedUpTo,
  isAutoEncoding,
  setIsAutoEncoding,
  setComplete,
}) {
  const runRef = useRef(0);

  const acSequence = useMemo(
    () => normalizeAcSequence(zigZagData?.acSequence),
    [zigZagData]
  );

  const rleSymbols = useMemo(() => encodeRLE(acSequence), [acSequence]);

  const componentName = zigZagData?.component || "Y";

  const blockIndex =
    typeof zigZagData?.blockIndex === "number" ? zigZagData.blockIndex : 0;

  // ---- Run-Length Encoding: count consecutive repeated values ----
  // Example: 1111000011111100 → (1,4) (0,4) (1,6) (0,2)
  const runs = useMemo(() => {
    const result = [];
    acSequence.forEach((value, index) => {
      const last = result[result.length - 1];
      if (last && last.value === value) {
        last.count += 1;
        last.end = index;
      } else {
        result.push({ value, count: 1, start: index, end: index });
      }
    });
    return result;
  }, [acSequence]);

  const selectedRunIndex = runs.findIndex(
    (run) => selectedIndex >= run.start && selectedIndex <= run.end
  );
  const selectedRun = runs[selectedRunIndex] || runs[0];
  const isComplete = encodedUpTo >= runs.length - 1;

  function emitRleData(symbols) {
    if (typeof onRleChange !== "function") return;

    onRleChange({
      component: componentName,
      blockIndex,
      acSequence,
      rleSymbols: symbols,
      runs,
      dcValue: zigZagData?.dcValue,
      dcDifferenceData: dcCodingData,
    });
  }

  useEffect(() => {
    emitRleData(rleSymbols);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zigZagData]);

  async function autoRLE() {
    if (isAutoEncoding) return;

    const runId = runRef.current + 1;
    runRef.current = runId;

    setIsAutoEncoding(true);
    setEncodedUpTo(-1);
    setSelectedIndex(0);

    for (let i = 0; i < runs.length; i += 1) {
      if (runRef.current !== runId) return;
      setSelectedIndex(runs[i].end);
      setEncodedUpTo(i);
      await wait(450);
    }

    setIsAutoEncoding(false);
    if (typeof setComplete === "function") setComplete(true);
    emitRleData(rleSymbols);
  }

  return (
    <div className="step9SimplePage">
      <div
        className="step9MainGrid"
        style={{ gridTemplateColumns: "minmax(0, 1fr)", justifyContent: "stretch" }}
      >
        <div className="step9Card">
          <h3>AC Values From Step 8</h3>

          <div className="step9SequenceStrip">
            {acSequence.map((value, index) => {
              const inSelectedRun =
                selectedRun && index >= selectedRun.start && index <= selectedRun.end;

              return (
                <button
                  key={`step9-ac-${index}`}
                  type="button"
                  className={`step9SeqCell ${
                    value === 0 ? "step9ZeroSeqCell" : "step9NonZeroSeqCell"
                  }`}
                  style={
                    inSelectedRun
                      ? {
                          background: "#fef9c3",
                          borderColor: index === selectedIndex ? "#eab308" : "#fde68a",
                          color: "#713f12",
                        }
                      : undefined
                  }
                  onClick={() => setSelectedIndex(index)}
                  title={`Position ${index + 1}: value = ${value}`}
                >
                  <b>{value}</b>
                  <small>#{index + 1}</small>
                </button>
              );
            })}
          </div>

          <p className="step9SmallNote">
            Same values next to each other form one run. Click any value to
            highlight its run.
          </p>
        </div>

        <div className="step9ControlBar">
          <button type="button" onClick={autoRLE} disabled={isAutoEncoding}>
            {isAutoEncoding ? "Counting..." : "Run Run-Length Encoding"}
          </button>
          <span className="step9ProgressTop">
            Position {selectedIndex + 1} / {acSequence.length}
          </span>
        </div>

        <div className="step9OutputCard">
          <h3>Encoded Stream</h3>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 10,
              margin: "8px 0 4px",
            }}
          >
            {runs.map((run, index) => {
              const isRevealed = index <= encodedUpTo;
              const isActive = index === selectedRunIndex;

              return (
                <button
                  key={`step9-run-${index}`}
                  type="button"
                  onClick={() => setSelectedIndex(run.start)}
                  title={`Value ${run.value} repeats ${run.count} time(s) in a row (#${
                    run.start + 1
                  }${run.count > 1 ? `–#${run.end + 1}` : ""})`}
                  style={{
                    fontFamily: "Consolas, 'Courier New', monospace",
                    fontSize: 15,
                    fontWeight: 700,
                    padding: "8px 16px",
                    borderRadius: 12,
                    cursor: "pointer",
                    background: isActive && isRevealed ? "#fef9c3" : "#eef4ff",
                    border: `1px solid ${
                      isActive && isRevealed ? "#eab308" : "#c7d7fe"
                    }`,
                    color: isRevealed ? "#1d4ed8" : "#94a3b8",
                  }}
                >
                  {isRevealed ? `(${run.value},${run.count})` : "( ? )"}
                </button>
              );
            })}
          </div>

          <p className="step9SmallNote">
            Each pair means <b>(value, count)</b> — &quot;this value repeated this
            many times in a row&quot;.
          </p>

          <div className="step9CompareRow">
            <div>
              <span>Before</span>
              <strong>{acSequence.length} values</strong>
            </div>
            <div className="step9CompareArrow">→</div>
            <div>
              <span>After</span>
              <strong>{runs.length} pairs</strong>
            </div>
            <div className="step9CompareResult">goes to Huffman coding next</div>
          </div>

          {isComplete && (
            <p className="step9SmallNote">
              For Huffman (Step 10), JPEG writes these same runs as{" "}
              <b>
                {rleSymbols
                  .map((symbol) =>
                    symbol.type === "AC"
                      ? `(${symbol.run},${symbol.value})`
                      : symbol.type
                  )
                  .join(" ")}
              </b>{" "}
              — zeros before each value, and EOB for the last run of zeros.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Step9RunLengthEncoding;
