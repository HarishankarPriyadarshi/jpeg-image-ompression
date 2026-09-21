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

function Step10HuffmanEncoding({
  dcCodingData,
  rleData,
  onHuffmanChange,
  isDcEncoded,
  setIsDcEncoded,
  acEncodedUpTo,
  setAcEncodedUpTo,
  isAutoEncoding,
  setIsAutoEncoding,
  setComplete,
}) {
  const runRef = useRef(0);

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
  void encodeDcStep;
  void encodeAcStep;

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
    if (typeof setComplete === "function") setComplete(true);
  }

  function resetHuffman() {
    runRef.current += 1;
    setIsDcEncoded(false);
    setAcEncodedUpTo(-1);
    setIsAutoEncoding(false);
  }
  void resetHuffman;

  return (
    <div className="step10SimplePage">
      <div className="step10SummaryGrid">
        <div>
          <span>Input</span>
          <strong>
            {componentName} Block B{blockNumber}
          </strong>
          <small>DC difference (automatic) + RLE symbols (Step 9)</small>
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

      <div className="step10ControlBar">
        <button
          type="button"
          onClick={autoHuffmanEncode}
          disabled={isAutoEncoding}
        >
          {isAutoEncoding ? "Encoding..." : "Run Huffman Encoding"}
        </button>
      </div>

      <div className="step10MainGrid">
        <div className="step10Card">
          <h3>DC Encoding</h3>

          <div className="step10InfoRow">
            <span>DC Category / Size</span>
            <strong>{dcCategory}</strong>
          </div>

          <div className="step10InfoRow">
            <span>Huffman Code</span>
            <strong>{isDcEncoded ? dcHuffmanCode : "—"}</strong>
          </div>

          <div className="step10InfoRow">
            <span>Magnitude Bits</span>
            <strong>{isDcEncoded ? dcMagnitudeBits || "—" : "—"}</strong>
          </div>

          <div className="step10MiniFormula">
            {isDcEncoded ? (
              <>
                {dcHuffmanCode} + {dcMagnitudeBits || "(none)"} ={" "}
                <b>{dcFullCode}</b>
              </>
            ) : (
              "Run Huffman Encoding to reveal the DC Huffman code"
            )}
          </div>
        </div>

        <div className="step10Card step10WideCard">
          <h3>AC RLE Symbols → Huffman Codes</h3>

          <div className="step10AcTable">
            {acEncodedSymbols.map((symbol, index) => {
              const isRevealed = index <= acEncodedUpTo;

              return (
                <div
                  key={`step10-ac-${index}`}
                  className={`step10AcRow ${
                    isRevealed ? "step10AcRevealed" : "step10AcHidden"
                  }`}
                >
                  <span className="step10AcLabel">
                    {symbol.type === "EOB"
                      ? "EOB"
                      : symbol.type === "ZRL"
                      ? "ZRL"
                      : `(${symbol.run},${symbol.size})=${symbol.value}`}
                  </span>

                  <span className="step10AcCode">
                    {isRevealed ? symbol.fullCode : "—"}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="step10SmallNote">
            {acEncodedUpTo + 1} / {acEncodedSymbols.length} AC symbols encoded.
          </p>
        </div>
      </div>

      <div className="step10BitstreamCard">
        <h3>Final Entropy Bitstream (so far)</h3>

        <div className="step10BitstreamBox">
          {finalBitstream || "—"}
        </div>

        <p className="step10SmallNote">
          Bitstream length: {finalBitstream.length} bits. This grows as DC and
          AC symbols are encoded above.
        </p>
      </div>
    </div>
  );
}

export default Step10HuffmanEncoding;
