import { useEffect, useMemo, useRef, useState } from "react";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createFallback8x8Block() {
  return Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => 128)
  );
}

function normalize8x8Block(block) {
  if (!Array.isArray(block) || block.length === 0) {
    return createFallback8x8Block();
  }

  return Array.from({ length: 8 }, (_, row) =>
    Array.from({ length: 8 }, (_, col) => {
      const value = block[row]?.[col];
      return typeof value === "number" ? value : 128;
    })
  );
}

function levelShiftBlock(block) {
  return block.map((row) => row.map((value) => value - 128));
}

function getRowCol(index) {
  return {
    row: Math.floor(index / 8),
    col: index % 8,
  };
}

function InputBlockGrid({
  values,
  selectedCellIndex,
  revealedIndexes,
  onCellSelect,
}) {
  return (
    <div className="step5MatrixGrid">
      {values.flat().map((value, index) => {
        const isSelected = selectedCellIndex === index;
        const isProcessed = revealedIndexes.includes(index);

        return (
          <button
            key={`step5-input-${index}`}
            type="button"
            className={`step5InputCell ${
              isSelected ? "step5SelectedInputCell" : ""
            } ${isProcessed ? "step5ProcessedInputCell" : ""}`}
            onClick={() => onCellSelect(index)}
            title={`Original value = ${value}`}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}

function OutputBlockGrid({ values, selectedCellIndex, revealedIndexes }) {
  return (
    <div className="step5MatrixGrid">
      {values.flat().map((value, index) => {
        const isSelected = selectedCellIndex === index;
        const isRevealed = revealedIndexes.includes(index);

        return (
          <span
            key={`step5-output-${index}`}
            className={`step5OutputCell ${
              isSelected ? "step5SelectedOutputCell" : ""
            } ${isRevealed ? "step5VisibleOutputCell" : "step5HiddenOutputCell"}`}
            title={`Shifted value = ${value}`}
          >
            {isRevealed ? value : "—"}
          </span>
        );
      })}
    </div>
  );
}

function Step5LevelShifting({
  selectedBlockData,
  onLevelShiftChange,
  selectedCellIndex,
  setSelectedCellIndex,
  revealedIndexes,
  setRevealedIndexes,
  isAutoShifting,
  setIsAutoShifting,
}) {
  const runRef = useRef(0);
  const [showCalculation, setShowCalculation] = useState(false);

  const inputBlock = useMemo(
    () => normalize8x8Block(selectedBlockData?.values),
    [selectedBlockData]
  );

  const shiftedBlock = useMemo(() => levelShiftBlock(inputBlock), [inputBlock]);

  const { row, col } = getRowCol(selectedCellIndex);

  const selectedOriginalValue = inputBlock[row][col];
  const selectedShiftedValue = shiftedBlock[row][col];

  const componentName = selectedBlockData?.component || "Y";

  const blockIndex =
    typeof selectedBlockData?.blockIndex === "number"
      ? selectedBlockData.blockIndex
      : 0;

  const blockNumber = blockIndex + 1;

  const startRow =
    typeof selectedBlockData?.startRow === "number"
      ? selectedBlockData.startRow
      : 0;

  const startCol =
    typeof selectedBlockData?.startCol === "number"
      ? selectedBlockData.startCol
      : 0;

  const absoluteRow = startRow + row;
  const absoluteCol = startCol + col;

  const shiftedCount = revealedIndexes.length;
  const progressPercent = Math.round((shiftedCount / 64) * 100);

  useEffect(() => {
    if (typeof onLevelShiftChange === "function") {
      onLevelShiftChange({
        component: componentName,
        blockIndex,
        values: shiftedBlock,
        originalValues: inputBlock,
        startRow,
        startCol,
      });
    }
  }, [selectedBlockData]);

  function shiftSelectedCell() {
    runRef.current += 1;
    setIsAutoShifting(false);
    setShowCalculation(true);

    setRevealedIndexes((prev) => {
      if (prev.includes(selectedCellIndex)) {
        return prev;
      }

      return [...prev, selectedCellIndex].sort((a, b) => a - b);
    });
  }

  async function autoShiftFullBlock() {
    if (isAutoShifting) return;

    const runId = runRef.current + 1;
    runRef.current = runId;

    setIsAutoShifting(true);
    setShowCalculation(true);
    setRevealedIndexes([]);

    for (let index = 0; index < 64; index += 1) {
      if (runRef.current !== runId) return;

      setSelectedCellIndex(index);

      setRevealedIndexes((prev) => {
        if (prev.includes(index)) {
          return prev;
        }

        return [...prev, index].sort((a, b) => a - b);
      });

      await wait(70);
    }

    setIsAutoShifting(false);
  }

  function resetLevelShifting() {
    runRef.current += 1;
    setSelectedCellIndex(0);
    setRevealedIndexes([]);
    setIsAutoShifting(false);
    setShowCalculation(false);
  }
  void resetLevelShifting;
  void shiftSelectedCell;

  return (
    <div className="step5SimplePage">

      <div className="step5SummaryGrid">
        <div>
          <span>Input From Step 4</span>
          <strong>
            {componentName} Block B{blockNumber}
          </strong>
          <small>Selected 8×8 processing block</small>
        </div>

        <div>
          <span>Operation</span>
          <strong>Value - 128</strong>
          <small>Level shifting formula</small>
        </div>

        <div>
          <span>Output To Step 6</span>
          <strong>Shifted 8×8 Block</strong>
          <small>Input for 2D DCT / FDCT</small>
        </div>
      </div>

      <div className="step5ControlBar">
        <button
          type="button"
          onClick={autoShiftFullBlock}
          disabled={isAutoShifting}
        >
          {isAutoShifting ? "Shifting..." : "Run Level Shift (Subtract 128)"}
        </button>
      </div>

      <div className="step5ProgressBox">
        <div className="step5ProgressTop">
          <span>
            Shifted Cells: {shiftedCount} / 64
          </span>

          <strong>{progressPercent}%</strong>
        </div>

        <div className="step5ProgressTrack">
          <div
            className="step5ProgressFill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="step5MainGrid">
        <div className="step5Card">
          <h3>
            Input: Selected 8×8 {componentName} Block B{blockNumber}
          </h3>

          <InputBlockGrid
            values={inputBlock}
            selectedCellIndex={selectedCellIndex}
            revealedIndexes={revealedIndexes}
            onCellSelect={(index) => {
              setSelectedCellIndex(index);
              setShowCalculation(revealedIndexes.includes(index));
            }}
          />

          <p className="step5SmallNote">
            These 64 values come from the selected block in Step 4. Click any
            cell (after running the shift) to inspect its calculation.
          </p>
        </div>

        <div className="step5CalculationCard">
          <h3>Selected Cell Calculation</h3>

          <div className="step5InfoRow">
            <span>Block</span>
            <strong>
              {componentName} B{blockNumber}
            </strong>
          </div>

          <div className="step5InfoRow">
            <span>Cell Position</span>
            <strong>
              Row {row}, Col {col}
            </strong>
          </div>

          <div className="step5InfoRow">
            <span>Original Matrix Position</span>
            <strong>
              Row {absoluteRow}, Col {absoluteCol}
            </strong>
          </div>

          <div className="step5FormulaBox">
            Shifted Value = Original Value - 128
          </div>

          {showCalculation ? (
            <div className="step5CalculationResult">
              <div>
                Original Value = <b>{selectedOriginalValue}</b>
              </div>

              <div>
                {selectedOriginalValue} - 128 ={" "}
                <b>{selectedShiftedValue}</b>
              </div>

              <div>
                Shifted Value = <b>{selectedShiftedValue}</b>
              </div>
            </div>
          ) : (
            <div className="step5PendingBox">
              Select a cell and run the level shift to reveal the
              calculation.
            </div>
          )}
        </div>

        <div className="step5Card">
          <h3>Output: Level Shifted 8×8 Block</h3>

          <OutputBlockGrid
            values={shiftedBlock}
            selectedCellIndex={selectedCellIndex}
            revealedIndexes={revealedIndexes}
          />

          <p className="step5SmallNote">
            Output values appear after subtracting 128. This block is passed to
            Step 6 for 2D DCT.
          </p>
        </div>
      </div>

    </div>
  );
}

export default Step5LevelShifting;
