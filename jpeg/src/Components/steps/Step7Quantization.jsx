import { useEffect, useMemo, useRef, useState } from "react";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const luminanceQuantizationTable = [
  [16, 11, 10, 16, 24, 40, 51, 61],
  [12, 12, 14, 19, 26, 58, 60, 55],
  [14, 13, 16, 24, 40, 57, 69, 56],
  [14, 17, 22, 29, 51, 87, 80, 62],
  [18, 22, 37, 56, 68, 109, 103, 77],
  [24, 35, 55, 64, 81, 104, 113, 92],
  [49, 64, 78, 87, 103, 121, 120, 101],
  [72, 92, 95, 98, 112, 100, 103, 99],
];

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

function roundNearest(value) {
  const rounded =
    value >= 0 ? Math.round(value) : -Math.round(Math.abs(value));

  return Object.is(rounded, -0) ? 0 : rounded;
}

// Standard IJG quality scaling formula used by real JPEG encoders (libjpeg).
function scaleQuantizationTable(baseTable, quality) {
  const q = Math.min(100, Math.max(1, quality));
  const scaleFactor = q < 50 ? Math.floor(5000 / q) : 200 - q * 2;

  return baseTable.map((row) =>
    row.map((value) => {
      const scaled = Math.floor((value * scaleFactor + 50) / 100);
      return Math.min(255, Math.max(1, scaled));
    })
  );
}

function quantizeDctMatrix(dctMatrix, quantizationTable) {
  return dctMatrix.map((row, rowIndex) =>
    row.map((coefficient, colIndex) =>
      roundNearest(coefficient / quantizationTable[rowIndex][colIndex])
    )
  );
}

function getRowCol(index) {
  return {
    row: Math.floor(index / 8),
    col: index % 8,
  };
}

function formatDctValue(value) {
  if (Math.abs(value) < 0.005) return "0";

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2);
}

function MatrixGrid({
  values,
  selectedIndex,
  revealedIndexes,
  onCellSelect,
  type,
}) {
  return (
    <div className="step7MatrixGrid">
      {values.flat().map((value, index) => {
        const isSelected = selectedIndex === index;
        const isRevealed =
          type === "input" || type === "table" || revealedIndexes.includes(index);

        return (
          <button
            key={`step7-${type}-${index}`}
            type="button"
            className={`step7Cell step7${type}Cell ${
              isSelected ? "step7SelectedCell" : ""
            } ${isRevealed ? "step7VisibleCell" : "step7HiddenCell"}`}
            onClick={() => onCellSelect(index)}
            title={`${type}: ${value}`}
          >
            {isRevealed
              ? type === "input"
                ? formatDctValue(value)
                : value
              : "—"}
          </button>
        );
      })}
    </div>
  );
}

function Step7Quantization({ dctData, onQuantizationChange }) {
  const runRef = useRef(0);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [revealedIndexes, setRevealedIndexes] = useState([]);
  const [isAutoQuantizing, setIsAutoQuantizing] = useState(false);
  const [showCalculation, setShowCalculation] = useState(false);
  const [quality, setQuality] = useState(50);

  const dctMatrix = useMemo(
    () => normalize8x8Block(dctData?.values),
    [dctData]
  );

  const activeQuantizationTable = useMemo(
    () => scaleQuantizationTable(luminanceQuantizationTable, quality),
    [quality]
  );

  const quantizedMatrix = useMemo(
    () => quantizeDctMatrix(dctMatrix, activeQuantizationTable),
    [dctMatrix, activeQuantizationTable]
  );

  const { row, col } = getRowCol(selectedIndex);

  const selectedDctValue = dctMatrix[row][col];
  const selectedQuantValue = activeQuantizationTable[row][col];
  const selectedQuantizedValue = quantizedMatrix[row][col];

  const componentName = dctData?.component || "Y";

  const blockIndex =
    typeof dctData?.blockIndex === "number" ? dctData.blockIndex : 0;

  const blockNumber = blockIndex + 1;

  const startRow = typeof dctData?.startRow === "number" ? dctData.startRow : 0;
  const startCol = typeof dctData?.startCol === "number" ? dctData.startCol : 0;

  const revealedCount = revealedIndexes.length;
  const progressPercent = Math.round((revealedCount / 64) * 100);

  useEffect(() => {
    runRef.current += 1;
    setSelectedIndex(0);
    setRevealedIndexes([]);
    setIsAutoQuantizing(false);
    setShowCalculation(false);

    if (typeof onQuantizationChange === "function") {
      onQuantizationChange({
        component: componentName,
        blockIndex,
        values: quantizedMatrix,
        dctValues: dctMatrix,
        quantizationTable: activeQuantizationTable,
        startRow,
        startCol,
      });
    }
  }, [dctData]);

  useEffect(() => {
    runRef.current += 1;
    setRevealedIndexes([]);
    setIsAutoQuantizing(false);
    setShowCalculation(false);

    if (typeof onQuantizationChange === "function") {
      onQuantizationChange({
        component: componentName,
        blockIndex,
        values: quantizedMatrix,
        dctValues: dctMatrix,
        quantizationTable: activeQuantizationTable,
        startRow,
        startCol,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality]);

  function quantizeSelectedCoefficient() {
    runRef.current += 1;
    setIsAutoQuantizing(false);
    setShowCalculation(true);

    setRevealedIndexes((prev) => {
      if (prev.includes(selectedIndex)) {
        return prev;
      }

      return [...prev, selectedIndex].sort((a, b) => a - b);
    });
  }

  async function autoQuantizeFullMatrix() {
    if (isAutoQuantizing) return;

    const runId = runRef.current + 1;
    runRef.current = runId;

    setIsAutoQuantizing(true);
    setShowCalculation(true);
    setRevealedIndexes([]);

    for (let index = 0; index < 64; index += 1) {
      if (runRef.current !== runId) return;

      setSelectedIndex(index);

      setRevealedIndexes((prev) => {
        if (prev.includes(index)) {
          return prev;
        }

        return [...prev, index].sort((a, b) => a - b);
      });

      await wait(70);
    }

    setIsAutoQuantizing(false);
  }

  function resetQuantization() {
    runRef.current += 1;
    setSelectedIndex(0);
    setRevealedIndexes([]);
    setIsAutoQuantizing(false);
    setShowCalculation(false);
  }

  return (
    <div className="step7SimplePage">
      <div className="step7ConceptBox">
        <div>
          <strong>Step 7 Concept:</strong> Quantization reduces the precision of
          DCT coefficients. Each DCT coefficient is divided by the corresponding
          value from the JPEG luminance quantization table and then rounded.
        </div>

        <div>
          <strong>Why?</strong> Low-frequency coefficients are preserved more,
          while high-frequency coefficients are reduced more. This is the main
          lossy step in baseline JPEG compression.
        </div>

        <div>
          <strong>Formula:</strong> Quantized Value = round(DCT Coefficient ÷
          Quantization Table Value)
        </div>
      </div>

      <div className="step7SummaryGrid">
        <div>
          <span>Input From Step 6</span>
          <strong>
            {componentName} Block B{blockNumber}
          </strong>
          <small>8×8 DCT coefficient matrix</small>
        </div>

        <div>
          <span>Operation</span>
          <strong>DCT ÷ Quant Table</strong>
          <small>Then round to nearest integer</small>
        </div>

        <div>
          <span>Output To Step 8</span>
          <strong>Quantized 8×8 Matrix</strong>
          <small>Input for DC coding / scanning</small>
        </div>
      </div>

      <div className="step7FormulaBox">
        <h3>Quantization Formula</h3>

        <div className="step7FormulaText">
          Q(u,v) = round( DCT(u,v) ÷ QuantizationTable(u,v) )
        </div>

        <p>
          Smaller table values preserve low-frequency information. Larger table
          values reduce high-frequency information more strongly.
        </p>
      </div>

      <div className="step7QualityBox">
        <label htmlFor="step7-quality-slider">
          JPEG Quality: <b>{quality}</b>{" "}
          <span className="step7QualityHint">
            {quality < 40
              ? "(Low quality, high compression)"
              : quality > 80
              ? "(High quality, low compression)"
              : "(Balanced)"}
          </span>
        </label>

        <input
          id="step7-quality-slider"
          type="range"
          min="1"
          max="100"
          value={quality}
          onChange={(event) => setQuality(Number(event.target.value))}
        />

        <p className="step7QualityNote">
          Moving this slider scales the standard quantization table using the
          real IJG formula used by libjpeg: scale = quality &lt; 50 ?
          floor(5000/quality) : 200-2×quality. Lower quality → bigger table
          values → more coefficients become zero → smaller file, more loss.
        </p>
      </div>

      <div className="step7ControlBar">
        <button
          type="button"
          onClick={quantizeSelectedCoefficient}
          disabled={isAutoQuantizing}
        >
          Quantize Selected Coefficient
        </button>

        <button
          type="button"
          onClick={autoQuantizeFullMatrix}
          disabled={isAutoQuantizing}
        >
          {isAutoQuantizing ? "Quantizing..." : "Auto Quantize Full Matrix"}
        </button>

        <button type="button" onClick={resetQuantization}>
          Reset
        </button>
      </div>

      <div className="step7ProgressBox">
        <div className="step7ProgressTop">
          <span>
            Quantized Coefficients: {revealedCount} / 64
          </span>

          <strong>{progressPercent}%</strong>
        </div>

        <div className="step7ProgressTrack">
          <div
            className="step7ProgressFill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="step7FlowBox">
        <span>Step 6 Output</span>
        <b>DCT Coefficient Matrix</b>
        <span>↓</span>
        <b>Divide by Quantization Table</b>
        <span>↓</span>
        <b>Rounded Quantized Matrix</b>
      </div>

      <div className="step7MainGrid">
        <div className="step7Card">
          <h3>Input: 8×8 DCT Coefficient Matrix</h3>

          <MatrixGrid
            values={dctMatrix}
            selectedIndex={selectedIndex}
            revealedIndexes={revealedIndexes}
            onCellSelect={(index) => {
              setSelectedIndex(index);
              setShowCalculation(false);
            }}
            type="input"
          />

          <p className="step7SmallNote">
            These values come from Step 6 after applying 2D DCT.
          </p>
        </div>

        <div className="step7Card">
          <h3>JPEG Luminance Quantization Table</h3>

          <MatrixGrid
            values={activeQuantizationTable}
            selectedIndex={selectedIndex}
            revealedIndexes={revealedIndexes}
            onCellSelect={(index) => {
              setSelectedIndex(index);
              setShowCalculation(false);
            }}
            type="table"
          />

          <p className="step7SmallNote">
            This standard luminance table is used for the Y component in this
            simulation.
          </p>
        </div>

        <div className="step7CalculationCard">
          <h3>Selected Coefficient Calculation</h3>

          <div className="step7InfoRow">
            <span>Position</span>
            <strong>
              u = {row}, v = {col}
            </strong>
          </div>

          <div className="step7InfoRow">
            <span>DCT Value</span>
            <strong>{formatDctValue(selectedDctValue)}</strong>
          </div>

          <div className="step7InfoRow">
            <span>Quant Table Value</span>
            <strong>{selectedQuantValue}</strong>
          </div>

          <div className="step7MiniFormula">
            Quantized = round(DCT Value ÷ Quantization Value)
          </div>

          {showCalculation ? (
            <div className="step7CalculationResult">
              <div>
                round({formatDctValue(selectedDctValue)} ÷ {selectedQuantValue})
                = <b>{selectedQuantizedValue}</b>
              </div>

              <div>
                Output at ({row},{col}) = <b>{selectedQuantizedValue}</b>
              </div>
            </div>
          ) : (
            <div className="step7PendingBox">
              Select a coefficient and click Quantize Selected Coefficient.
            </div>
          )}
        </div>

        <div className="step7Card">
          <h3>Output: Quantized 8×8 Coefficient Matrix</h3>

          <MatrixGrid
            values={quantizedMatrix}
            selectedIndex={selectedIndex}
            revealedIndexes={revealedIndexes}
            onCellSelect={(index) => {
              setSelectedIndex(index);
              setShowCalculation(false);
            }}
            type="output"
          />

          <p className="step7SmallNote">
            Values appear after quantization. Many high-frequency coefficients
            usually become zero.
          </p>
        </div>
      </div>

      <div className="rgbInfoBox">
        Step 7 Output = Quantized 8×8 coefficient matrix
      </div>
    </div>
  );
}

export default Step7Quantization;