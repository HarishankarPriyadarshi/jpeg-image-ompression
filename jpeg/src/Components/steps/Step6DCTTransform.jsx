import { useEffect, useMemo, useRef, useState } from "react";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createFallback8x8Block(value = 0) {
  return Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => value)
  );
}

function normalize8x8Block(block, fallbackValue = 0) {
  if (!Array.isArray(block) || block.length === 0) {
    return createFallback8x8Block(fallbackValue);
  }

  return Array.from({ length: 8 }, (_, row) =>
    Array.from({ length: 8 }, (_, col) => {
      const value = block[row]?.[col];
      return typeof value === "number" ? value : fallbackValue;
    })
  );
}

function levelShiftBlock(block) {
  return block.map((row) => row.map((value) => value - 128));
}

function roundToTwo(value) {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function formatNumber(value) {
  if (Math.abs(value) < 0.005) return "0";

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2);
}

function alpha(index) {
  return index === 0 ? 1 / Math.sqrt(2) : 1;
}

function calculateDctCoefficient(block, u, v, shouldRound = true) {
  let sum = 0;

  for (let x = 0; x < 8; x += 1) {
    for (let y = 0; y < 8; y += 1) {
      const spatialValue = block[x][y];

      const cosX = Math.cos(((2 * x + 1) * u * Math.PI) / 16);
      const cosY = Math.cos(((2 * y + 1) * v * Math.PI) / 16);

      sum += spatialValue * cosX * cosY;
    }
  }

  const exact = 0.25 * alpha(u) * alpha(v) * sum;

  if (shouldRound) return roundToTwo(exact);

  // Clean tiny floating-point noise (e.g. -47.49999999999999 -> -47.5) so exact
  // ties like x.5 are rounded the same way a real JPEG encoder rounds them.
  const clean = Math.round(exact * 1e9) / 1e9;

  return Object.is(clean, -0) ? 0 : clean;
}

// shouldRound=true  -> values shown on screen (2 decimals)
// shouldRound=false -> exact values used by Step 7 (real JPEG never rounds the DCT before quantizing)
function calculateDctMatrix(block, shouldRound = true) {
  return Array.from({ length: 8 }, (_, u) =>
    Array.from({ length: 8 }, (_, v) =>
      calculateDctCoefficient(block, u, v, shouldRound)
    )
  );
}

function getRowCol(index) {
  return {
    row: Math.floor(index / 8),
    col: index % 8,
  };
}

function InputShiftedBlockGrid({ values }) {
  return (
    <div className="step6MatrixGrid">
      {values.flat().map((value, index) => (
        <span
          key={`step6-input-${index}`}
          className="step6InputCell"
          title={`Level shifted value = ${value}`}
        >
          {formatNumber(value)}
        </span>
      ))}
    </div>
  );
}

function DctOutputGrid({
  values,
  selectedCoefficientIndex,
  revealedIndexes,
  onCoefficientSelect,
}) {
  return (
    <div className="step6MatrixGrid">
      {values.flat().map((value, index) => {
        const isSelected = selectedCoefficientIndex === index;
        const isRevealed = revealedIndexes.includes(index);

        return (
          <button
            key={`step6-output-${index}`}
            type="button"
            className={`step6OutputCell ${
              isSelected ? "step6SelectedOutputCell" : ""
            } ${isRevealed ? "step6VisibleOutputCell" : "step6HiddenOutputCell"}`}
            onClick={() => onCoefficientSelect(index)}
            title={`DCT coefficient = ${formatNumber(value)}`}
          >
            {isRevealed ? formatNumber(value) : "—"}
          </button>
        );
      })}
    </div>
  );
}

function Step6DCTTransform({
  selectedBlockData,
  levelShiftData,
  onDctChange,
  selectedCoefficientIndex,
  setSelectedCoefficientIndex,
  revealedIndexes,
  setRevealedIndexes,
  isAutoApplying,
  setIsAutoApplying,
}) {
  const runRef = useRef(0);
  const [showCalculation, setShowCalculation] = useState(false);
  const [showFormula, setShowFormula] = useState(false);

  const inputBlock = useMemo(() => {
    if (levelShiftData?.values) {
      return normalize8x8Block(levelShiftData.values, 0);
    }

    if (selectedBlockData?.values) {
      const originalBlock = normalize8x8Block(selectedBlockData.values, 128);
      return levelShiftBlock(originalBlock);
    }

    return createFallback8x8Block(0);
  }, [levelShiftData, selectedBlockData]);

  const dctMatrix = useMemo(() => calculateDctMatrix(inputBlock), [inputBlock]);
  const exactDctMatrix = useMemo(
    () => calculateDctMatrix(inputBlock, false),
    [inputBlock]
  );

  const { row: u, col: v } = getRowCol(selectedCoefficientIndex);

  const selectedDctValue = dctMatrix[u][v];

  const componentName =
    levelShiftData?.component || selectedBlockData?.component || "Y";

  const blockIndex =
    typeof levelShiftData?.blockIndex === "number"
      ? levelShiftData.blockIndex
      : typeof selectedBlockData?.blockIndex === "number"
      ? selectedBlockData.blockIndex
      : 0;

  const blockNumber = blockIndex + 1;

  const startRow =
    typeof levelShiftData?.startRow === "number"
      ? levelShiftData.startRow
      : typeof selectedBlockData?.startRow === "number"
      ? selectedBlockData.startRow
      : 0;

  const startCol =
    typeof levelShiftData?.startCol === "number"
      ? levelShiftData.startCol
      : typeof selectedBlockData?.startCol === "number"
      ? selectedBlockData.startCol
      : 0;

  useEffect(() => {
    if (typeof onDctChange === "function") {
      onDctChange({
        component: componentName,
        blockIndex,
        values: dctMatrix,
        exactValues: exactDctMatrix,
        inputValues: inputBlock,
        startRow,
        startCol,
      });
    }
  }, [levelShiftData, selectedBlockData]);

  function calculateSelectedCoefficient() {
    runRef.current += 1;
    setIsAutoApplying(false);
    setShowCalculation(true);

    setRevealedIndexes((prev) => {
      if (prev.includes(selectedCoefficientIndex)) {
        return prev;
      }

      return [...prev, selectedCoefficientIndex].sort((a, b) => a - b);
    });
  }

  async function autoApplyFullDct() {
    if (isAutoApplying) return;

    const runId = runRef.current + 1;
    runRef.current = runId;

    setIsAutoApplying(true);
    setShowCalculation(true);
    setRevealedIndexes([]);

    for (let index = 0; index < 64; index += 1) {
      if (runRef.current !== runId) return;

      setSelectedCoefficientIndex(index);

      setRevealedIndexes((prev) => {
        if (prev.includes(index)) {
          return prev;
        }

        return [...prev, index].sort((a, b) => a - b);
      });

      await wait(75);
    }

    setIsAutoApplying(false);
  }

  function resetDct() {
    runRef.current += 1;
    setSelectedCoefficientIndex(0);
    setRevealedIndexes([]);
    setIsAutoApplying(false);
    setShowCalculation(false);
  }
  void resetDct;
  void calculateSelectedCoefficient;

  return (
    <div className="step6SimplePage">

      <div className="step6MainGrid">
        <div className="step6Card">
          <h3>Input: Level Shifted 8×8 Block</h3>

          <InputShiftedBlockGrid values={inputBlock} />

          <p className="step6SmallNote">
            These values come from Step 5 after subtracting 128 from the selected
            8×8 block.
          </p>
        </div>

        <div className="step6CalculationCard">
          <h3>Selected DCT Coefficient</h3>

          <div className="step6InfoRow">
            <span>Coefficient Position</span>
            <strong>
              u = {u}, v = {v}
            </strong>
          </div>

          <div className="step6InfoRow">
            <span>Coefficient Type</span>
            <strong>{u === 0 && v === 0 ? "DC" : "AC"}</strong>
          </div>

          <div className="step6InfoRow">
            <span>Block</span>
            <strong>
              {componentName} B{blockNumber}
            </strong>
          </div>

          <div className="step6MiniFormula">
            Every DCT coefficient is calculated using all 64 input values.
          </div>

          {showCalculation ? (
            <div className="step6CalculationResult">
              <div>
                Selected coefficient position = <b>F({u},{v})</b>
              </div>

              <div>
                Type = <b>{u === 0 && v === 0 ? "DC coefficient" : "AC coefficient"}</b>
              </div>

              <div>
                Calculated DCT value = <b>{formatNumber(selectedDctValue)}</b>
              </div>
            </div>
          ) : (
            <div className="step6PendingBox">
              Select a coefficient and run the 2D DCT transform to reveal
              its value.
            </div>
          )}
        </div>

        <div className="step6Card">
          <h3>Output: 8×8 DCT Coefficient Matrix</h3>

          <DctOutputGrid
            values={dctMatrix}
            selectedCoefficientIndex={selectedCoefficientIndex}
            revealedIndexes={revealedIndexes}
            onCoefficientSelect={(index) => {
              setSelectedCoefficientIndex(index);
              setShowCalculation(revealedIndexes.includes(index));
            }}
          />

          <p className="step6SmallNote">
            Click any output cell (after running DCT) to inspect its
            coefficient.
          </p>
        </div>

        <div className="step6Controls">
      <div className="step6ControlBar">
        <button
          type="button"
          onClick={autoApplyFullDct}
          disabled={isAutoApplying}
        >
          {isAutoApplying ? "Applying DCT..." : "Run 2D DCT Transform"}
        </button>
      </div>
        </div>
      </div>

      <div className="step6FormulaBox">
        <div className="step6FormulaHeader">
          <h3>2D DCT Formula</h3>

          <button
            type="button"
            className={`step6ShowFormulaBtn ${
              showFormula ? "step6ShowFormulaBtnOpen" : ""
            }`}
            onClick={() => setShowFormula((prev) => !prev)}
          >
            {showFormula ? "Hide Formula" : "Show Formula"}
          </button>
        </div>

        {showFormula && (
          <>
            <div className="step6FormulaText">
              F(u,v) = 1/4 × C(u) × C(v) × ΣΣ f(x,y) × cos[(2x+1)uπ/16] ×
              cos[(2y+1)vπ/16]
            </div>

            <p>
              C(0) = 1/√2 and C(k) = 1 for k &gt; 0. Here f(x,y) is the level
              shifted input block value.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default Step6DCTTransform;