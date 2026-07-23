import { useEffect, useMemo, useRef, useState } from "react";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const DC_LUMINANCE_HUFFMAN = {
  0: "00",
  1: "010",
  2: "011",
  3: "100",
  4: "101",
  5: "110",
  6: "1110",
  7: "11110",
  8: "111110",
  9: "1111110",
  10: "11111110",
  11: "111111110",
};

const AC_DEMO_HUFFMAN = {
  "0/0": "1010", // EOB
  "0/1": "00",
  "0/2": "01",
  "1/1": "1100",
  "0/3": "100",
  "2/1": "11011",
  "1/2": "111001",
  "3/1": "111010",
  "0/4": "1011",
};

function fallbackAcCode(run, size) {
  return (
    "111111" +
    run.toString(2).padStart(4, "0") +
    size.toString(2).padStart(4, "0")
  );
}

function getAcHuffmanCode(run, size) {
  const key = `${run}/${size}`;
  return AC_DEMO_HUFFMAN[key] || fallbackAcCode(run, size);
}

function encodeDc(dcCategory) {
  return DC_LUMINANCE_HUFFMAN[dcCategory] ?? fallbackAcCode(0, dcCategory);
}

function normalizeRleSymbols(rleSymbols) {
  if (!Array.isArray(rleSymbols) || rleSymbols.length === 0) {
    return [{ type: "EOB" }];
  }
  return rleSymbols;
}

function Step11HuffmanEncoding({ dcCodingData, rleData, onHuffmanChange }) {
  const runRef = useRef(0);

  const [isDcEncoded, setIsDcEncoded] = useState(false);
  const [acEncodedUpTo, setAcEncodedUpTo] = useState(-1);
  const [isAutoEncoding, setIsAutoEncoding] = useState(false);

  const rleSymbols = useMemo(
    () => normalizeRleSymbols(rleData?.rleSymbols),
    [rleData]
  );

  const dcCategory = dcCodingData?.dcCategory ?? 0;
  const dcMagnitudeBits =
    dcCodingData?.magnitudeBits && dcCodingData.magnitudeBits !== "—"
      ? dcCodingData.magnitudeBits
      : "";
  const dcHuffmanCode = encodeDc(dcCategory);
  const dcFullCode = dcHuffmanCode + dcMagnitudeBits;

  const acEncodedSymbols = useMemo(
    () =>
      rleSymbols.map((symbol) => {
        if (symbol.type === "EOB") {
          return { ...symbol, huffmanCode: "1010", fullCode: "1010" };
        }

        if (symbol.type === "ZRL") {
          return {
            ...symbol,
            huffmanCode: "11111111001",
            fullCode: "11111111001",
          };
        }

        const code = getAcHuffmanCode(symbol.run, symbol.size);
        const bits = symbol.bits === "—" ? "" : symbol.bits;

        return { ...symbol, huffmanCode: code, fullCode: code + bits };
      }),
    [rleSymbols]
  );

  const componentName = rleData?.component || dcCodingData?.component || "Y";

  const blockIndex =
    typeof rleData?.blockIndex === "number"
      ? rleData.blockIndex
      : typeof dcCodingData?.blockIndex === "number"
      ? dcCodingData.blockIndex
      : 0;

  const blockNumber = blockIndex + 1;

  const finalBitstream = useMemo(() => {
    const revealedAc = acEncodedSymbols
      .slice(0, acEncodedUpTo + 1)
      .map((symbol) => symbol.fullCode)
      .join("");

    return (isDcEncoded ? dcFullCode : "") + revealedAc;
  }, [acEncodedSymbols, acEncodedUpTo, isDcEncoded, dcFullCode]);

  function emitHuffmanData(bitstream) {
    if (typeof onHuffmanChange !== "function") return;

    onHuffmanChange({
      component: componentName,
      blockIndex,
      dcEncoded: { huffmanCode: dcHuffmanCode, magnitudeBits: dcMagnitudeBits, fullCode: dcFullCode },
      acEncoded: acEncodedSymbols,
      finalBitstream: bitstream,
    });
  }

  useEffect(() => {
    runRef.current += 1;
    setIsDcEncoded(false);
    setAcEncodedUpTo(-1);
    setIsAutoEncoding(false);
  }, [dcCodingData, rleData]);

  useEffect(() => {
    emitHuffmanData(finalBitstream);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalBitstream]);

  function encodeDcStep() {
    runRef.current += 1;
    setIsDcEncoded(true);
  }

  function encodeAcStep() {
    runRef.current += 1;

    if (acEncodedUpTo < acEncodedSymbols.length - 1) {
      const nextIndex = acEncodedUpTo + 1;
      setAcEncodedUpTo(nextIndex);
    }
  }

  async function autoHuffmanEncode() {
    if (isAutoEncoding) return;

    const runId = runRef.current + 1;
    runRef.current = runId;

    setIsAutoEncoding(true);
    setIsDcEncoded(false);
    setAcEncodedUpTo(-1);

    await wait(300);
    if (runRef.current !== runId) return;
    setIsDcEncoded(true);

    for (let i = 0; i < acEncodedSymbols.length; i += 1) {
      if (runRef.current !== runId) return;
      setAcEncodedUpTo(i);
      await wait(180);
    }

    setIsAutoEncoding(false);
  }

  function resetHuffman() {
    runRef.current += 1;
    setIsDcEncoded(false);
    setAcEncodedUpTo(-1);
    setIsAutoEncoding(false);
  }

  return (
    <div className="step11SimplePage">
      <div className="step11ConceptBox">
        <div>
          <strong>Step 11 Concept:</strong> Huffman encoding assigns shorter
          binary codes to frequently occurring symbols and longer codes to
          rare symbols, turning the DC difference and AC run-length symbols
          into a compact bitstream.
        </div>

        <div>
          <strong>Educational note:</strong> This simulation uses a simplified
          fixed demo Huffman table so the mapping stays readable. It is not
          the complete JPEG standard Huffman table.
        </div>

        <div>
          <strong>Formula:</strong> Final Code = Huffman Code + Magnitude Bits
          (for DC and non-zero AC symbols).
        </div>
      </div>

      <div className="step11SummaryGrid">
        <div>
          <span>Input</span>
          <strong>
            {componentName} Block B{blockNumber}
          </strong>
          <small>DC difference (Step 8) + RLE symbols (Step 10)</small>
        </div>

        <div>
          <span>Operation</span>
          <strong>Huffman Code + Bits</strong>
          <small>Simplified educational Huffman table</small>
        </div>

        <div>
          <span>Output To Step 12</span>
          <strong>Entropy Bitstream</strong>
          <small>Final compressed scan data</small>
        </div>
      </div>

      <div className="step11ControlBar">
        <button type="button" onClick={encodeDcStep} disabled={isAutoEncoding}>
          Encode DC
        </button>

        <button
          type="button"
          onClick={encodeAcStep}
          disabled={isAutoEncoding || !isDcEncoded}
        >
          Encode AC
        </button>

        <button
          type="button"
          onClick={autoHuffmanEncode}
          disabled={isAutoEncoding}
        >
          {isAutoEncoding ? "Encoding..." : "Auto Huffman Encode"}
        </button>

        <button type="button" onClick={resetHuffman}>
          Reset
        </button>
      </div>

      <div className="step11MainGrid">
        <div className="step11Card">
          <h3>DC Encoding</h3>

          <div className="step11InfoRow">
            <span>DC Category / Size</span>
            <strong>{dcCategory}</strong>
          </div>

          <div className="step11InfoRow">
            <span>Huffman Code</span>
            <strong>{isDcEncoded ? dcHuffmanCode : "—"}</strong>
          </div>

          <div className="step11InfoRow">
            <span>Magnitude Bits</span>
            <strong>{isDcEncoded ? dcMagnitudeBits || "—" : "—"}</strong>
          </div>

          <div className="step11MiniFormula">
            {isDcEncoded ? (
              <>
                {dcHuffmanCode} + {dcMagnitudeBits || "(none)"} ={" "}
                <b>{dcFullCode}</b>
              </>
            ) : (
              "Click Encode DC to reveal the DC Huffman code"
            )}
          </div>
        </div>

        <div className="step11Card step11WideCard">
          <h3>AC RLE Symbols → Huffman Codes</h3>

          <div className="step11AcTable">
            {acEncodedSymbols.map((symbol, index) => {
              const isRevealed = index <= acEncodedUpTo;

              return (
                <div
                  key={`step11-ac-${index}`}
                  className={`step11AcRow ${
                    isRevealed ? "step11AcRevealed" : "step11AcHidden"
                  }`}
                >
                  <span className="step11AcLabel">
                    {symbol.type === "EOB"
                      ? "EOB"
                      : symbol.type === "ZRL"
                      ? "ZRL"
                      : `(${symbol.run},${symbol.size})=${symbol.value}`}
                  </span>

                  <span className="step11AcCode">
                    {isRevealed ? symbol.fullCode : "—"}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="step11SmallNote">
            {acEncodedUpTo + 1} / {acEncodedSymbols.length} AC symbols encoded.
          </p>
        </div>
      </div>

      <div className="step11BitstreamCard">
        <h3>Final Entropy Bitstream (so far)</h3>

        <div className="step11BitstreamBox">
          {finalBitstream || "—"}
        </div>

        <p className="step11SmallNote">
          Bitstream length: {finalBitstream.length} bits. This grows as DC and
          AC symbols are encoded above.
        </p>
      </div>

      <div className="rgbInfoBox">
        Step 11 Output = Entropy encoded bitstream (simplified educational
        Huffman codes). This moves to the Final Compressed Output in Step 12.
      </div>
    </div>
  );
}

export default Step11HuffmanEncoding;
