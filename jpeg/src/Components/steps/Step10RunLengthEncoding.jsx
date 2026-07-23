import { useEffect, useMemo, useRef, useState } from "react";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCategory(value) {
  const absValue = Math.abs(value);
  if (absValue === 0) return 0;
  return Math.floor(Math.log2(absValue)) + 1;
}

function getMagnitudeBits(value) {
  const category = getCategory(value);
  if (category === 0) return "—";

  const absBinary = Math.abs(value).toString(2).padStart(category, "0");

  if (value > 0) return absBinary;

  return absBinary
    .split("")
    .map((bit) => (bit === "0" ? "1" : "0"))
    .join("");
}

function encodeRLE(acSequence) {
  const symbols = [];
  let zeroRun = 0;

  for (let i = 0; i < acSequence.length; i += 1) {
    const value = acSequence[i];

    if (value === 0) {
      zeroRun += 1;

      if (zeroRun === 16) {
        symbols.push({ type: "ZRL", run: 15, value: 0, size: 0, bits: "—" });
        zeroRun = 0;
      }

      continue;
    }

    symbols.push({
      type: "AC",
      run: zeroRun,
      value,
      size: getCategory(value),
      bits: getMagnitudeBits(value),
    });

    zeroRun = 0;
  }

  symbols.push({ type: "EOB" });

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

function Step10RunLengthEncoding({ zigZagData, dcCodingData, onRleChange }) {
  const runRef = useRef(0);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [encodedUpTo, setEncodedUpTo] = useState(-1);
  const [isAutoEncoding, setIsAutoEncoding] = useState(false);

  const acSequence = useMemo(
    () => normalizeAcSequence(zigZagData?.acSequence),
    [zigZagData]
  );

  const rleSymbols = useMemo(() => encodeRLE(acSequence), [acSequence]);

  const componentName = zigZagData?.component || "Y";

  const blockIndex =
    typeof zigZagData?.blockIndex === "number" ? zigZagData.blockIndex : 0;

  const blockNumber = blockIndex + 1;

  let runningZeroCount = 0;

  for (let i = 0; i < selectedIndex; i += 1) {
    if (acSequence[i] === 0) {
      runningZeroCount += 1;
    } else {
      runningZeroCount = 0;
    }
  }

  const selectedValue = acSequence[selectedIndex];
  const isSelectedZero = selectedValue === 0;

  function emitRleData(symbols) {
    if (typeof onRleChange !== "function") return;

    onRleChange({
      component: componentName,
      blockIndex,
      acSequence,
      rleSymbols: symbols,
      dcValue: zigZagData?.dcValue,
      dcDifferenceData: dcCodingData,
    });
  }

  useEffect(() => {
    runRef.current += 1;
    setSelectedIndex(0);
    setEncodedUpTo(-1);
    setIsAutoEncoding(false);

    emitRleData(rleSymbols);
  }, [zigZagData]);

  function encodeSelected() {
    runRef.current += 1;
    setIsAutoEncoding(false);

    if (selectedIndex < acSequence.length - 1) {
      setSelectedIndex((prev) => prev + 1);
    }

    setEncodedUpTo((prev) => Math.max(prev, findSymbolIndexUpTo(selectedIndex)));
  }

  function findSymbolIndexUpTo(acIndex) {
    let counted = 0;
    for (let s = 0; s < rleSymbols.length; s += 1) {
      const symbol = rleSymbols[s];
      if (symbol.type === "EOB") continue;
      counted += (symbol.run || 0) + 1;
      if (counted > acIndex) {
        return s;
      }
    }
    return rleSymbols.length - 1;
  }

  async function autoRLE() {
    if (isAutoEncoding) return;

    const runId = runRef.current + 1;
    runRef.current = runId;

    setIsAutoEncoding(true);
    setEncodedUpTo(-1);

    for (let i = 0; i < rleSymbols.length; i += 1) {
      if (runRef.current !== runId) return;
      setEncodedUpTo(i);
      await wait(220);
    }

    setIsAutoEncoding(false);
    emitRleData(rleSymbols);
  }

  function resetRLE() {
    runRef.current += 1;
    setSelectedIndex(0);
    setEncodedUpTo(-1);
    setIsAutoEncoding(false);
  }

  return (
    <div className="step10SimplePage">
      <div className="step10ConceptBox">
        <div>
          <strong>Step 10 Concept:</strong> After zig-zag scanning, many
          high-frequency AC coefficients become zero. Run-Length Encoding
          stores the count of zeros before a non-zero value instead of storing
          every zero separately.
        </div>

        <div>
          <strong>Symbol format:</strong> (RUNLENGTH, SIZE) + AMPLITUDE. If 16
          or more zeros occur in a row, a ZRL (Zero Run Length) symbol is used
          for 15 zeros and the count continues.
        </div>

        <div>
          <strong>EOB:</strong> When all remaining AC coefficients are zero, an
          End-Of-Block symbol closes the block instead of coding trailing
          zeros.
        </div>
      </div>

      <div className="step10SummaryGrid">
        <div>
          <span>Input From Step 9</span>
          <strong>
            {componentName} Block B{blockNumber}
          </strong>
          <small>63 AC coefficients (zig-zag order)</small>
        </div>

        <div>
          <span>Operation</span>
          <strong>Run + Size + Amplitude</strong>
          <small>Zero-run compaction of AC values</small>
        </div>

        <div>
          <span>Output To Step 11</span>
          <strong>RLE Symbol List</strong>
          <small>Sent to Huffman Encoding</small>
        </div>
      </div>

      <div className="step10ControlBar">
        <button
          type="button"
          onClick={encodeSelected}
          disabled={isAutoEncoding}
        >
          Encode Selected
        </button>

        <button type="button" onClick={autoRLE} disabled={isAutoEncoding}>
          {isAutoEncoding ? "Encoding..." : "Auto RLE"}
        </button>

        <button type="button" onClick={resetRLE}>
          Reset
        </button>
      </div>

      <div className="step10ProgressBox">
        <div className="step10ProgressTop">
          <span>
            AC Position: {selectedIndex} / {acSequence.length}
          </span>

          <strong>
            {Math.round((selectedIndex / acSequence.length) * 100)}%
          </strong>
        </div>

        <div className="step10ProgressTrack">
          <div
            className="step10ProgressFill"
            style={{
              width: `${Math.round(
                (selectedIndex / acSequence.length) * 100
              )}%`,
            }}
          />
        </div>
      </div>

      <div className="step10MainGrid">
        <div className="step10Card">
          <h3>Input: AC Sequence From Step 9</h3>

          <div className="step10AcGrid">
            {acSequence.map((value, index) => (
              <button
                key={`step10-ac-${index}`}
                type="button"
                className={`step10AcCell ${
                  index === selectedIndex ? "step10ActiveAcCell" : ""
                } ${value === 0 ? "step10ZeroAcCell" : "step10NonZeroAcCell"}`}
                onClick={() => setSelectedIndex(index)}
                title={`AC[${index}] = ${value}`}
              >
                {value}
              </button>
            ))}
          </div>

          <p className="step10SmallNote">
            Click a cell to select an AC position, then Encode Selected to
            step forward through the run counter.
          </p>
        </div>

        <div className="step10CalculationCard">
          <h3>Zero Run Counter</h3>

          <div className="step10InfoRow">
            <span>Selected AC Index</span>
            <strong>{selectedIndex}</strong>
          </div>

          <div className="step10InfoRow">
            <span>Selected Value</span>
            <strong>{selectedValue}</strong>
          </div>

          <div className="step10InfoRow">
            <span>Zeros Counted Before This</span>
            <strong>{runningZeroCount}</strong>
          </div>

          <div className="step10MiniFormula">
            {isSelectedZero
              ? "Value is 0 → keep counting the zero run"
              : `Non-zero found → emit (run=${runningZeroCount}, size=${getCategory(
                  selectedValue
                )}) + amplitude ${selectedValue}`}
          </div>

          <p className="step10PreviousNote">
            Category (size) and magnitude bits use the same scheme as DC
            coding in Step 8.
          </p>
        </div>

        <div className="step10OutputCard">
          <h3>Generated RLE Symbols</h3>

          <div className="step10SymbolList">
            {rleSymbols.map((symbol, index) => {
              const isRevealed = index <= encodedUpTo;

              return (
                <div
                  key={`step10-symbol-${index}`}
                  className={`step10SymbolCard ${
                    isRevealed ? "step10SymbolRevealed" : "step10SymbolHidden"
                  } ${symbol.type === "EOB" ? "step10EobCard" : ""} ${
                    symbol.type === "ZRL" ? "step10ZrlCard" : ""
                  }`}
                >
                  {!isRevealed ? (
                    <span>—</span>
                  ) : symbol.type === "EOB" ? (
                    <span>EOB (End of Block)</span>
                  ) : symbol.type === "ZRL" ? (
                    <span>ZRL → (15, 0)</span>
                  ) : (
                    <>
                      <span>
                        (run={symbol.run}, size={symbol.size})
                      </span>
                      <span>value = {symbol.value}</span>
                      <span>bits = {symbol.bits}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <p className="step10SmallNote">
            {encodedUpTo + 1} / {rleSymbols.length} symbols revealed so far.
          </p>
        </div>
      </div>

      <div className="rgbInfoBox">
        Step 10 Output = Run-length encoded AC symbol list, ending in EOB. This
        list moves forward to Huffman Encoding in Step 11.
      </div>
    </div>
  );
}

export default Step10RunLengthEncoding;
