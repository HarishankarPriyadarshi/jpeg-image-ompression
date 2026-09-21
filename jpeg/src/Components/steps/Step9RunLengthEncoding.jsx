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

function rsByteHex(run, size) {
  const byte = ((run & 0x0f) << 4) | (size & 0x0f);
  return `0x${byte.toString(16).toUpperCase().padStart(2, "0")}`;
}


function encodeRLE(acSequence) {
  const symbols = [];
  let zeroRun = 0;

  for (let i = 0; i < acSequence.length; i += 1) {
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

  symbols.push({ type: "EOB", run: 0, size: 0 });

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

function findSymbolIndexUpTo(rleSymbols, acIndex) {
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

function acPositionAtSymbol(rleSymbols, acSequence, symbolIndex) {
  let counted = 0;
  for (let s = 0; s <= symbolIndex; s += 1) {
    const symbol = rleSymbols[s];
    if (!symbol || symbol.type === "EOB") continue;
    counted += (symbol.run || 0) + 1;
  }
  return Math.min(counted, acSequence.length) - 1;
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

  const acSymbolCount = rleSymbols.length; // includes the final EOB

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

  // Which symbol (in rleSymbols) does the currently revealed AC index belong to?
  const activeSymbolIndex = findSymbolIndexUpTo(rleSymbols, selectedIndex);

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

    for (let i = 0; i < rleSymbols.length; i += 1) {
      if (runRef.current !== runId) return;
      setEncodedUpTo(i);

      const pos = acPositionAtSymbol(rleSymbols, acSequence, i);
      if (pos >= 0) setSelectedIndex(pos);

      await wait(280);
    }

    setSelectedIndex(acSequence.length - 1);
    setIsAutoEncoding(false);
    if (typeof setComplete === "function") setComplete(true);
    emitRleData(rleSymbols);
  }

  function resetRLE() {
    runRef.current += 1;
    setSelectedIndex(0);
    setEncodedUpTo(-1);
    setIsAutoEncoding(false);
  }
  void resetRLE;

  return (
    <div className="step9SimplePage">
      <div className="step9ControlBar">
        <button type="button" onClick={autoRLE} disabled={isAutoEncoding}>
          {isAutoEncoding ? "Encoding..." : "Run AC Run-Length Coding"}
        </button>
        <span className="step9ProgressTop">
          Position {selectedIndex + 1} / {acSequence.length}
        </span>
      </div>

      <div className="step9MainGrid">
        <div className="step9Card">
          <h3>AC Values From Step 9</h3>

          <div className="step9SequenceStrip">
            {acSequence.map((value, index) => (
              <button
                key={`step9-ac-${index}`}
                type="button"
                className={`step9SeqCell ${
                  index === selectedIndex ? "step9ActiveSeqCell" : ""
                } ${value === 0 ? "step9ZeroSeqCell" : "step9NonZeroSeqCell"}`}
                onClick={() => setSelectedIndex(index)}
                title={`Position ${index + 1}: value = ${value}`}
              >
                <b>{value}</b>
                <small>#{index + 1}</small>
              </button>
            ))}
          </div>

          <p className="step9SmallNote">
            Grey = zero (just gets counted). Blue = non-zero (this is what
            actually gets coded).
          </p>
        </div>

        <div className="step9CalculationCard">
          <h3>Selected Value</h3>

          <div className="step9InfoRow">
            <span>Value at position #{selectedIndex + 1}</span>
            <strong>{selectedValue}</strong>
          </div>

          <div className="step9InfoRow">
            <span>Zeros before it (Run)</span>
            <strong>{runningZeroCount}</strong>
          </div>

          <div className="step9MiniFormula">
            {isSelectedZero
              ? "This is 0 — it just adds to the zero count, no pair yet"
              : `This becomes the pair: (${runningZeroCount}, ${selectedValue})`}
          </div>
        </div>

        <div className="step9OutputCard">
          <h3>Final Codes (sent to Step 11)</h3>

          <div className="step9CompressedRow">
            {rleSymbols.map((symbol, index) => {
              const isRevealed = index <= encodedUpTo;
              const isActive = index === activeSymbolIndex;

              return (
                <span
                  key={`step9-chip-${index}`}
                  className={`step9CompressChip ${
                    symbol.type === "EOB"
                      ? "step9EobChip"
                      : symbol.type === "ZRL"
                      ? "step9ZrlChip"
                      : "step9ValueChip"
                  } ${isRevealed ? "" : "step9ChipHidden"} ${
                    isActive ? "step9ChipActive" : ""
                  }`}
                  title={
                    symbol.type === "EOB"
                      ? "EOB: everything left is zero"
                      : symbol.type === "ZRL"
                      ? "ZRL: 16 zeros in a row, more values still ahead"
                      : `${symbol.run} zeros, then value ${symbol.value} (stored as RS byte ${rsByteHex(
                          symbol.run,
                          symbol.size
                        )})`
                  }
                >
                  {!isRevealed
                    ? "?"
                    : symbol.type === "EOB"
                    ? "EOB"
                    : symbol.type === "ZRL"
                    ? "ZRL"
                    : `(${symbol.run}, ${symbol.value})`}
                </span>
              );
            })}
          </div>

          <p className="step9SmallNote">
            EOB = everything after this is zero, stop here. ZRL = 16 zeros in
            a row, but more non-zero values are still coming.
          </p>

          <div className="step9CompareRow">
            <div>
              <span>Before</span>
              <strong>{acSequence.length} values</strong>
            </div>
            <div className="step9CompareArrow">→</div>
            <div>
              <span>After</span>
              <strong>{acSymbolCount} codes</strong>
            </div>
            <div className="step9CompareResult">
              goes to Huffman coding next
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Step9RunLengthEncoding;
