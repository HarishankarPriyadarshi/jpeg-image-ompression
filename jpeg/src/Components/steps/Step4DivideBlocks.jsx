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

function YSourceMatrixGrid({ values, selectedBlockIndex, onBlockSelect }) {
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
            }`}
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

function Step4DivideBlocks({ yMatrix, onSelectedBlockChange }) {
  const runRef = useRef(0);

  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);
  const [revealedIndexes, setRevealedIndexes] = useState([]);
  const [isAutoCreating, setIsAutoCreating] = useState(false);

  const normalizedYMatrix = useMemo(() => normalize16x16Matrix(yMatrix), [yMatrix]);

  const selectedBlock = useMemo(
    () => extract8x8Block(normalizedYMatrix, selectedBlockIndex),
    [normalizedYMatrix, selectedBlockIndex]
  );

  const { startRow, startCol } = getBlockStart(selectedBlockIndex);

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
  sendSelectedBlockToParent(selectedBlockIndex);
}, [selectedBlockIndex]);

  function handleBlockSelect(blockIndex) {
    runRef.current += 1;
    setSelectedBlockIndex(blockIndex);
    setRevealedIndexes([]);
    setIsAutoCreating(false);
    sendSelectedBlockToParent(blockIndex);
  }

  function createSelectedBlock() {
    runRef.current += 1;
    setIsAutoCreating(false);
    setRevealedIndexes(Array.from({ length: 64 }, (_, index) => index));
    sendSelectedBlockToParent(selectedBlockIndex);
  }

  async function autoCreateSelectedBlock() {
    if (isAutoCreating) return;

    const runId = runRef.current + 1;
    runRef.current = runId;

    setIsAutoCreating(true);
    setRevealedIndexes([]);
    sendSelectedBlockToParent(selectedBlockIndex);

    for (let index = 0; index < 64; index += 1) {
      if (runRef.current !== runId) return;

      setRevealedIndexes((prev) =>
        prev.includes(index) ? prev : [...prev, index]
      );

      await wait(40);
    }

    setIsAutoCreating(false);
  }

  function resetBlockCreation() {
    runRef.current += 1;
    setIsAutoCreating(false);
    setRevealedIndexes([]);
    sendSelectedBlockToParent(selectedBlockIndex);
  }

  return (
    <div className="step4SimplePage">
      <div className="step4ConceptBox">
        <div>
          <strong>Step 4 Concept:</strong> JPEG processes image components in{" "}
          <b>8×8 blocks</b>. In this simulation, the <b>16×16 Y matrix</b> from
          Step 3 is divided into four non-overlapping 8×8 blocks.
        </div>

        <div>
          <strong>Why Y matrix?</strong> Y stores luminance or brightness
          information. The selected 8×8 Y block is passed to Level Shifting and
          then DCT.
        </div>

        <div>
          <strong>Output:</strong> One selected 8×8 Y processing block.
        </div>
      </div>

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
            onClick={() => handleBlockSelect(block.blockIndex)}
          >
            <strong>{block.title}</strong>
            <span>{block.position}</span>
            <small>{block.start}</small>
          </button>
        ))}
      </div>

      <div className="step4ControlBar">
        <button type="button" onClick={createSelectedBlock} disabled={isAutoCreating}>
          Create Selected 8×8 Block
        </button>

        <button
          type="button"
          onClick={autoCreateSelectedBlock}
          disabled={isAutoCreating}
        >
          {isAutoCreating ? "Creating Block..." : "Auto Create Selected Block"}
        </button>

        <button type="button" onClick={resetBlockCreation}>
          Reset
        </button>
      </div>

      <div className="step4FlowBox">
        <span>Step 3 Output</span>
        <b>Y Matrix 16×16</b>
        <span>↓</span>
        <b>Divide into four 8×8 blocks</b>
        <span>↓</span>
        <b>
          Selected Block {getBlockLabel(selectedBlockIndex)} → Level Shifting
        </b>
      </div>

      <div className="step4MainGrid">
        <div className="step4Card">
          <h3>Input: 16×16 Y Matrix from Step 3</h3>

          <YSourceMatrixGrid
            values={normalizedYMatrix}
            selectedBlockIndex={selectedBlockIndex}
            onBlockSelect={handleBlockSelect}
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
            <strong>{getBlockLabel(selectedBlockIndex)}</strong>
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
            Output: Selected Processing Block {getBlockLabel(selectedBlockIndex)}
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

      <div className="rgbInfoBox">
        Step 4 Output = Selected 8×8 Y Block for Level Shifting
      </div>
    </div>
  );
}

export default Step4DivideBlocks;