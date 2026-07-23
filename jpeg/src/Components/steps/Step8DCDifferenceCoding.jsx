import { useEffect, useMemo, useRef, useState } from "react";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createFallback8x8Block() {
  return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => 0));
}

function normalize8x8Block(block) {
  if (!Array.isArray(block) || block.length === 0) {
    return createFallback8x8Block();
  }

  return Array.from({ length: 8 }, (_, row) =>
    Array.from({ length: 8 }, (_, col) => {
      const value = block[row]?.[col];
      return typeof value === "number" ? value : 0;
    })
  );
}

function getCategory(value) {
  const absValue = Math.abs(value);

  if (absValue === 0) {
    return 0;
  }

  return Math.floor(Math.log2(absValue)) + 1;
}

function getMagnitudeBits(value) {
  const category = getCategory(value);

  if (category === 0) {
    return "—";
  }

  const absBinary = Math.abs(value).toString(2).padStart(category, "0");

  if (value > 0) {
    return absBinary;
  }

  return absBinary
    .split("")
    .map((bit) => (bit === "0" ? "1" : "0"))
    .join("");
}

function QuantizedMatrixGrid({ values, isDcRevealed }) {
  return (
    <div className="step8MatrixGrid">
      {values.flat().map((value, index) => {
        const isDcCell = index === 0;

        return (
          <span
            key={`step8-quantized-${index}`}
            className={`step8MatrixCell ${
              isDcCell ? "step8DcMatrixCell" : ""
            } ${isDcCell && isDcRevealed ? "step8ActiveDcCell" : ""}`}
            title={
              isDcCell
                ? `DC coefficient = ${value}`
                : `AC coefficient = ${value}`
            }
          >
            {value}
          </span>
        );
      })}
    </div>
  );
}

function Step8DCDifferenceCoding({ quantizationData, onDcCodingChange }) {
  const runRef = useRef(0);

  const [previousDc, setPreviousDc] = useState(0);
  const [isEncoded, setIsEncoded] = useState(false);
  const [isAutoEncoding, setIsAutoEncoding] = useState(false);
  const [activeStage, setActiveStage] = useState(0);

  const quantizedMatrix = useMemo(
    () => normalize8x8Block(quantizationData?.values),
    [quantizationData]
  );

  const currentDc = quantizedMatrix[0][0];
  const dcDifference = currentDc - previousDc;
  const dcCategory = getCategory(dcDifference);
  const magnitudeBits = getMagnitudeBits(dcDifference);

  const componentName = quantizationData?.component || "Y";

  const blockIndex =
    typeof quantizationData?.blockIndex === "number"
      ? quantizationData.blockIndex
      : 0;

  const blockNumber = blockIndex + 1;

  const startRow =
    typeof quantizationData?.startRow === "number"
      ? quantizationData.startRow
      : 0;

  const startCol =
    typeof quantizationData?.startCol === "number"
      ? quantizationData.startCol
      : 0;

  useEffect(() => {
    runRef.current += 1;
    setIsEncoded(false);
    setIsAutoEncoding(false);
    setActiveStage(0);

    if (typeof onDcCodingChange === "function") {
      onDcCodingChange({
        component: componentName,
        blockIndex,
        quantizedMatrix,
        previousDc,
        currentDc,
        dcDifference,
        dcCategory,
        magnitudeBits,
        startRow,
        startCol,
      });
    }
  }, [quantizationData, previousDc]);

  function encodeDcDifference() {
    runRef.current += 1;
    setIsAutoEncoding(false);
    setIsEncoded(true);
    setActiveStage(4);

    if (typeof onDcCodingChange === "function") {
      onDcCodingChange({
        component: componentName,
        blockIndex,
        quantizedMatrix,
        previousDc,
        currentDc,
        dcDifference,
        dcCategory,
        magnitudeBits,
        startRow,
        startCol,
      });
    }
  }

  async function autoEncodeDcDifference() {
    if (isAutoEncoding) return;

    const runId = runRef.current + 1;
    runRef.current = runId;

    setIsAutoEncoding(true);
    setIsEncoded(false);
    setActiveStage(0);

    for (let stage = 1; stage <= 4; stage += 1) {
      if (runRef.current !== runId) return;

      setActiveStage(stage);
      await wait(550);
    }

    setIsEncoded(true);
    setIsAutoEncoding(false);

    if (typeof onDcCodingChange === "function") {
      onDcCodingChange({
        component: componentName,
        blockIndex,
        quantizedMatrix,
        previousDc,
        currentDc,
        dcDifference,
        dcCategory,
        magnitudeBits,
        startRow,
        startCol,
      });
    }
  }

  function resetDcCoding() {
    runRef.current += 1;
    setIsEncoded(false);
    setIsAutoEncoding(false);
    setActiveStage(0);
  }

  return (
    <div className="step8SimplePage">
      <div className="step8ConceptBox">
        <div>
          <strong>Step 8 Concept:</strong> JPEG handles the DC coefficient
          separately. The DC coefficient is the top-left value at position{" "}
          <b>(0,0)</b> of the quantized 8×8 matrix.
        </div>

        <div>
          <strong>Why?</strong> Nearby image blocks usually have similar average
          brightness. So JPEG stores the difference between the current block DC
          and the previous block DC instead of storing the full DC value.
        </div>

        <div>
          <strong>Formula:</strong> DC Difference = Current DC - Previous DC
        </div>
      </div>

      <div className="step8SummaryGrid">
        <div>
          <span>Input From Step 7</span>
          <strong>
            {componentName} Block B{blockNumber}
          </strong>
          <small>Quantized 8×8 coefficient matrix</small>
        </div>

        <div>
          <span>Operation</span>
          <strong>Current DC - Previous DC</strong>
          <small>Differential DC coding</small>
        </div>

        <div>
          <span>Output To Next Step</span>
          <strong>DC Difference</strong>
          <small>DC is stored separately; AC values continue to Step 9</small>
        </div>
      </div>

      <div className="step8ControlBar">
        <button
          type="button"
          onClick={encodeDcDifference}
          disabled={isAutoEncoding}
        >
          Encode DC Difference
        </button>

        <button
          type="button"
          onClick={autoEncodeDcDifference}
          disabled={isAutoEncoding}
        >
          {isAutoEncoding ? "Encoding..." : "Auto Explain DC Coding"}
        </button>

        <button type="button" onClick={resetDcCoding}>
          Reset
        </button>
      </div>

      <div className="step8FlowBox">
        <span>Step 7 Output</span>
        <b>Quantized Matrix</b>
        <span>↓</span>
        <b>Pick DC coefficient at (0,0)</b>
        <span>↓</span>
        <b>Current DC - Previous DC</b>
      </div>

      <div className="step8MainGrid">
        <div className="step8Card">
          <h3>Input: Quantized 8×8 Coefficient Matrix</h3>

          <QuantizedMatrixGrid
            values={quantizedMatrix}
            isDcRevealed={activeStage >= 1 || isEncoded}
          />

          <p className="step8SmallNote">
            The highlighted top-left value is the DC coefficient. All other
            values are AC coefficients.
          </p>
        </div>

        <div className="step8CalculationCard">
          <h3>DC Difference Calculation</h3>

          <div
            className={`step8InfoRow ${
              activeStage >= 1 || isEncoded ? "step8ActiveInfoRow" : ""
            }`}
          >
            <span>Current DC</span>
            <strong>{currentDc}</strong>
          </div>

          <div className="step8InputRow">
            <label htmlFor="previous-dc-input">Previous DC</label>

            <input
              id="previous-dc-input"
              type="number"
              value={previousDc}
              onChange={(event) => {
                const value = Number(event.target.value);
                setPreviousDc(Number.isNaN(value) ? 0 : value);
                setIsEncoded(false);
                setActiveStage(0);
              }}
              disabled={isAutoEncoding}
            />
          </div>

          <p className="step8PreviousNote">
            For the first block, previous DC is normally taken as 0. For later
            blocks, it is the previous block&apos;s quantized DC coefficient.
          </p>

          <div className="step8MiniFormula">
            DC Difference = Current DC - Previous DC
          </div>

          <div
            className={`step8FormulaResult ${
              activeStage >= 3 || isEncoded ? "step8ShowFormulaResult" : ""
            }`}
          >
            {currentDc} - {previousDc} = <b>{dcDifference}</b>
          </div>

          {(activeStage >= 4 || isEncoded) && (
            <div className="step8EncodedPacket">
              <div>
                <span>DC Difference</span>
                <strong>{dcDifference}</strong>
              </div>

              <div>
                <span>Category / Size</span>
                <strong>{dcCategory}</strong>
              </div>

              <div>
                <span>Magnitude Bits</span>
                <strong>{magnitudeBits}</strong>
              </div>
            </div>
          )}

          {!isEncoded && activeStage === 0 && (
            <div className="step8PendingBox">
              Click Encode DC Difference to reveal the differential DC value.
            </div>
          )}
        </div>

        <div className="step8OutputCard">
          <h3>Output: Differential DC Value</h3>

          <div className="step8OutputFlow">
            <div className={activeStage >= 1 || isEncoded ? "active" : ""}>
              <span>1</span>
              <strong>Read DC</strong>
              <small>{activeStage >= 1 || isEncoded ? currentDc : "—"}</small>
            </div>

            <div className={activeStage >= 2 || isEncoded ? "active" : ""}>
              <span>2</span>
              <strong>Previous DC</strong>
              <small>{activeStage >= 2 || isEncoded ? previousDc : "—"}</small>
            </div>

            <div className={activeStage >= 3 || isEncoded ? "active" : ""}>
              <span>3</span>
              <strong>Difference</strong>
              <small>
                {activeStage >= 3 || isEncoded ? dcDifference : "—"}
              </small>
            </div>

            <div className={activeStage >= 4 || isEncoded ? "active" : ""}>
              <span>4</span>
              <strong>DC Symbol Data</strong>
              <small>
                {activeStage >= 4 || isEncoded
                  ? `Size ${dcCategory}, Bits ${magnitudeBits}`
                  : "—"}
              </small>
            </div>
          </div>

          <p className="step8SmallNote">
            Huffman encoding later uses the DC category/size and magnitude bits
            to create the final compressed bitstream.
          </p>
        </div>
      </div>

     <div className="rgbInfoBox">
  Step 8 Output = Differential DC value. The remaining AC coefficients continue
  to Zig-Zag Scanning in Step 9.
</div>
</div>
  );
}

export default Step8DCDifferenceCoding;