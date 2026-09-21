import { useEffect, useMemo, useRef, useState } from "react";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createFallback16x16Matrix() {
  return Array.from({ length: 16 }, () =>
    Array.from({ length: 16 }, () => 0)
  );
}

function normalize16x16Matrix(matrix) {
  if (!Array.isArray(matrix) || matrix.length === 0) {
    return createFallback16x16Matrix();
  }

  return Array.from({ length: 16 }, (_, row) =>
    Array.from({ length: 16 }, (_, col) => {
      const value = matrix[row]?.[col];
      return typeof value === "number" ? value : 0;
    })
  );
}

function getBlockStart(blockIndex) {
  const blockRow = Math.floor(blockIndex / 2);
  const blockCol = blockIndex % 2;

  return {
    startRow: blockRow * 8,
    startCol: blockCol * 8,
  };
}

function extract8x8Block(matrix, blockIndex) {
  const { startRow, startCol } = getBlockStart(blockIndex);

  return Array.from({ length: 8 }, (_, row) =>
    Array.from({ length: 8 }, (_, col) => matrix[startRow + row][startCol + col])
  );
}

function getBlockIndexFromCell(row, col) {
  const blockRow = row < 8 ? 0 : 1;
  const blockCol = col < 8 ? 0 : 1;

  return blockRow * 2 + blockCol;
}

function getBlockLabel(blockIndex) {
  return `B${blockIndex + 1}`;
}

function YSourceMatrixGrid({
  values,
  selectedBlockIndex,
  onBlockSelect,
  isLocked,
}) {
  return (
    <div className="step4SourceGrid">
      {values.flat().map((value, index) => {
        const row = Math.floor(index / 16);
        const col = index % 16;
        const cellBlockIndex = getBlockIndexFromCell(row, col);

        const isSelectedBlock = cellBlockIndex === selectedBlockIndex;

        return (
          <button
            key={`step4-source-${index}`}
            type="button"
            className={`step4SourceCell ${
              isSelectedBlock ? "step4SelectedSourceBlockCell" : ""
            } ${isLocked && !isSelectedBlock ? "step4LockedSourceCell" : ""}`}
            disabled={isLocked && !isSelectedBlock}
            onClick={() => onBlockSelect(cellBlockIndex)}
            title={`Y(${row}, ${col}) = ${value}, ${getBlockLabel(
              cellBlockIndex
            )}`}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}

function SelectedBlockGrid({ values, revealedIndexes }) {
  return (
    <div className="step4BlockGrid">
      {values.flat().map((value, index) => {
        const isRevealed = revealedIndexes.includes(index);

        return (
          <span
            key={`step4-block-${index}`}
            className={`step4BlockCell ${
              isRevealed ? "step4VisibleBlockCell" : "step4HiddenBlockCell"
            }`}
          >
            {isRevealed ? value : "—"}
          </span>
        );
      })}
    </div>
  );
}

function Step4DivideBlocks({
  yMatrix,
  onSelectedBlockChange,
  selectedBlockIndex,
  setSelectedBlockIndex,
  revealedIndexes,
  setRevealedIndexes,
}) {
  const normalizedYMatrix = useMemo(() => normalize16x16Matrix(yMatrix), [yMatrix]);

  const hasSelection = selectedBlockIndex !== null;
  const effectiveBlockIndex = selectedBlockIndex ?? 0;

  const selectedBlock = useMemo(
    () => extract8x8Block(normalizedYMatrix, effectiveBlockIndex),
    [normalizedYMatrix, effectiveBlockIndex]
  );

  const { startRow, startCol } = getBlockStart(effectiveBlockIndex);

  const blockCards = [
    {
      blockIndex: 0,
      title: "B1",
      position: "Top-left",
      start: "Rows 0–7, Cols 0–7",
    },
    {
      blockIndex: 1,
      title: "B2",
      position: "Top-right",
      start: "Rows 0–7, Cols 8–15",
    },
    {
      blockIndex: 2,
      title: "B3",
      position: "Bottom-left",
      start: "Rows 8–15, Cols 0–7",
    },
    {
      blockIndex: 3,
      title: "B4",
      position: "Bottom-right",
      start: "Rows 8–15, Cols 8–15",
    },
  ];

  function sendSelectedBlockToParent(blockIndex = selectedBlockIndex) {
    if (typeof onSelectedBlockChange !== "function") return;

    const blockValues = extract8x8Block(normalizedYMatrix, blockIndex);
    const blockStart = getBlockStart(blockIndex);

    onSelectedBlockChange({
      component: "Y",
      blockIndex,
      values: blockValues,
      startRow: blockStart.startRow,
      startCol: blockStart.startCol,
    });
  }

useEffect(() => {
  if (selectedBlockIndex !== null) sendSelectedBlockToParent(selectedBlockIndex);
}, [selectedBlockIndex]);

  const isExtracted = revealedIndexes.length > 0;

  function handleBlockSelect(blockIndex) {
    if (isExtracted) return;
    setSelectedBlockIndex(blockIndex);
    setRevealedIndexes([]);
    sendSelectedBlockToParent(blockIndex);
  }

  function createSelectedBlock() {
    setRevealedIndexes(Array.from({ length: 64 }, (_, index) => index));
    sendSelectedBlockToParent(effectiveBlockIndex);
  }

  return (
    <div className="step4SimplePage">

      <div className="step4BlockSelectorGrid">
        {blockCards.map((block) => (
          <button
            key={block.blockIndex}
            type="button"
            className={`step4BlockSelectCard ${
              selectedBlockIndex === block.blockIndex
                ? "step4ActiveBlockSelectCard"
                : ""
            }`}
            disabled={isExtracted}
            onClick={() => handleBlockSelect(block.blockIndex)}
          >
            <strong>{block.title}</strong>
            <span>{block.position}</span>
            <small>{block.start}</small>
          </button>
        ))}
      </div>

      <div className="step4ControlBar">
        <button type="button" onClick={createSelectedBlock} disabled={!hasSelection || isExtracted}>
          {isExtracted ? "Block Extracted" : "Extract Selected 8×8 Block"}
        </button>
      </div>

      <div className="step4MainGrid">
        <div className="step4Card">
          <h3>Input: 16×16 Y Matrix from Step 3</h3>

          <YSourceMatrixGrid
            values={normalizedYMatrix}
            selectedBlockIndex={selectedBlockIndex}
            onBlockSelect={handleBlockSelect}
            isLocked={isExtracted}
          />

          <p className="step4SmallNote">
            Click any area of the Y matrix to select its 8×8 block. The selected
            block is highlighted.
          </p>
        </div>

        <div className="step4SelectedInfoCard">
          <h3>Selected Block Details</h3>

          <div className="step4InfoRow">
            <span>Component</span>
            <strong>Y</strong>
          </div>

          <div className="step4InfoRow">
            <span>Selected Block</span>
            <strong>{hasSelection ? getBlockLabel(effectiveBlockIndex) : "Not selected"}</strong>
          </div>

          <div className="step4InfoRow">
            <span>Start Position</span>
            <strong>
              Row {startRow}, Col {startCol}
            </strong>
          </div>

          <div className="step4InfoRow">
            <span>Block Size</span>
            <strong>8×8</strong>
          </div>

          <div className="step4InfoRow">
            <span>Total Values</span>
            <strong>64</strong>
          </div>

          <div className="step4InfoRow">
            <span>Next Step</span>
            <strong>Level Shifting</strong>
          </div>

          <div className="step4MiniFormula">
            16×16 matrix = 4 blocks of 8×8
          </div>
        </div>

        <div className="step4Card">
          <h3>
            Output: Selected Processing Block {hasSelection ? getBlockLabel(effectiveBlockIndex) : "—"}
          </h3>

          <SelectedBlockGrid
            values={selectedBlock}
            revealedIndexes={revealedIndexes}
          />

          <p className="step4SmallNote">
            Output values appear after creating the selected block. This 8×8
            block is sent to Step 5.
          </p>
        </div>
      </div>

    </div>
  );
}

export default Step4DivideBlocks;