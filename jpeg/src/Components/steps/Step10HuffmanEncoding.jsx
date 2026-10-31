import { useEffect, useMemo, useRef } from "react";

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

// Standard JPEG AC luminance Huffman table (ITU-T T.81, Annex K, Table K.5),
// defined by BITS (number of codes of each length 1..16) and HUFFVAL
// (RS symbols = RRRR<<4 | SSSS). Codes are generated canonically (Annex C).
// Same table that libjpeg uses by default.
const AC_LUMINANCE_BITS = [0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 125];
const AC_LUMINANCE_HUFFVAL = [
  0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
  0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08,
  0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72,
  0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28,
  0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45,
  0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
  0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75,
  0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
  0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3,
  0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6,
  0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9,
  0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
  0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4,
  0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa,
];

function buildHuffmanTable(bits, huffval) {
  const table = {};
  let code = 0;
  let k = 0;

  for (let length = 1; length <= 16; length += 1) {
    for (let n = 0; n < bits[length - 1]; n += 1) {
      table[huffval[k]] = code.toString(2).padStart(length, "0");
      code += 1;
      k += 1;
    }
    code <<= 1;
  }

  return table;
}

const AC_LUMINANCE_HUFFMAN = buildHuffmanTable(
  AC_LUMINANCE_BITS,
  AC_LUMINANCE_HUFFVAL
);

const EOB_CODE = AC_LUMINANCE_HUFFMAN[0x00]; // 1010
const ZRL_CODE = AC_LUMINANCE_HUFFMAN[0xf0]; // 11111111001

function getAcHuffmanCode(run, size) {
  return AC_LUMINANCE_HUFFMAN[((run & 0x0f) << 4) | (size & 0x0f)] || "";
}

function encodeDc(dcCategory) {
  return DC_LUMINANCE_HUFFMAN[dcCategory] ?? "";
}

// Small grey hint shown before a value, e.g. "(53 in binary)"
const hintStyle = {
  color: "#64748b",
  fontWeight: 600,
  fontSize: "0.88em",
  marginRight: 8,
};

// How the value becomes its bits: positive = plain binary,
// negative = binary of |value| with every bit flipped (JPEG rule).
function describeValueBits(value, bits) {
  if (value >= 0) return `${value} in binary = ${bits}`;
  const absBinary = Math.abs(value).toString(2);
  return `${value}: ${absBinary} flipped = ${bits}`;
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
  const dcDifference = dcCodingData?.dcDifference ?? 0;
  const dcAbsBinary =
    dcDifference === 0 ? "0" : Math.abs(dcDifference).toString(2);
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
          return { ...symbol, huffmanCode: EOB_CODE, fullCode: EOB_CODE };
        }

        if (symbol.type === "ZRL") {
          return {
            ...symbol,
            huffmanCode: ZRL_CODE,
            fullCode: ZRL_CODE,
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
      <div className="step10MainGrid">
        <div className="step10DcColumn">
          <div className="step10Card">
            <h3>DC Encoding</h3>

            <div className="step10InfoRow">
              <span>DC Category / Size</span>
              <strong>
                <span style={hintStyle}>
                  (DC {dcDifference} = {dcAbsBinary} → {dcCategory} bits)
                </span>
                {dcCategory}
              </strong>
            </div>

            <div className="step10InfoRow">
              <span>Huffman Code</span>
              <strong>
                {isDcEncoded && (
                  <span style={hintStyle}>(JPEG DC table: size {dcCategory} →)</span>
                )}
                {isDcEncoded ? dcHuffmanCode : "—"}
              </strong>
            </div>

            <div className="step10InfoRow">
              <span>Magnitude Bits</span>
              <strong>
                {isDcEncoded && dcMagnitudeBits && (
                  <span style={hintStyle}>
                    ({describeValueBits(dcDifference, dcMagnitudeBits)})
                  </span>
                )}
                {isDcEncoded ? dcMagnitudeBits || "—" : "—"}
              </strong>
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

          <div className="step10ControlBar">
            <button
              type="button"
              onClick={autoHuffmanEncode}
              disabled={isAutoEncoding}
            >
              {isAutoEncoding ? "Encoding..." : "Run Huffman Encoding"}
            </button>
          </div>
        </div>

        <div className="step10Card step10WideCard">
          <h3>AC RLE Symbols → Huffman Codes</h3>

          <p className="step10SmallNote">
            <b>(zeros before, bits) = value</b>. Code = JPEG table code for
            (zeros, bits) + the value in binary. Example: 3 = 11 (2 bits) →
            table code for (0,2) is 01 → 01 + 11 = <b>0111</b>.
          </p>

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
                    {!isRevealed ? (
                      "—"
                    ) : symbol.type === "AC" ? (
                      <>
                        <span style={hintStyle}>
                          ({describeValueBits(symbol.value, symbol.bits)})
                        </span>
                        {symbol.huffmanCode} + {symbol.bits} ={" "}
                        <b>{symbol.fullCode}</b>
                      </>
                    ) : (
                      <>
                        <span style={hintStyle}>(fixed code)</span>
                        {symbol.fullCode}
                      </>
                    )}
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
