import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
            className={`step4SourceCell step4Q${cellBlockIndex} ${
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

function SplitLabels() {
  return (
    <div className="step4SplitLabels" aria-hidden="true">
      {[0, 1, 2, 3].map((blockIndex) => (
        <span
          key={blockIndex}
          className={`step4SplitLabel step4SplitLabel${blockIndex}`}
        >
          {getBlockLabel(blockIndex)}
        </span>
      ))}
    </div>
  );
}

function SelectBlockPopup({ onPick, onClose }) {
  const firstButtonRef = useRef(null);

  useEffect(() => {
    firstButtonRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const options = [
    { blockIndex: 0, position: "Top-left" },
    { blockIndex: 1, position: "Top-right" },
    { blockIndex: 2, position: "Bottom-left" },
    { blockIndex: 3, position: "Bottom-right" },
  ];

  return createPortal(
    <div className="step4PopupOverlay" onClick={onClose}>
      <div
        className="step4Popup"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="step4PopupTitle"
        aria-describedby="step4PopupText"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="step4PopupIcon" aria-hidden="true">!</div>
        <h3 id="step4PopupTitle">Select a block first</h3>
        <p id="step4PopupText">
          Please choose one 8×8 block (B1, B2, B3 or B4) before extracting. You
          can pick it right here:
        </p>

        <div className="step4PopupChoices">
          {options.map((option, position) => (
            <button
              key={option.blockIndex}
              type="button"
              ref={position === 0 ? firstButtonRef : null}
              onClick={() => onPick(option.blockIndex)}
            >
              <strong>{getBlockLabel(option.blockIndex)}</strong>
              <span>{option.position}</span>
            </button>
          ))}
        </div>

        <button type="button" className="step4PopupClose" onClick={onClose}>
          Close
        </button>
      </div>
    </div>,
    document.body
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

  // Intro animation (16×16 matrix splitting into four 8×8 blocks).
  // Plays when Step 4 opens, unless the block was already extracted.
  const [playSplit, setPlaySplit] = useState(() => revealedIndexes.length === 0);
  const [splitKey, setSplitKey] = useState(0);
  const [showPickPopup, setShowPickPopup] = useState(false);
  const [nudgeSelector, setNudgeSelector] = useState(false);

  function replaySplit() {
    setPlaySplit(true);
    setSplitKey((key) => key + 1);
  }

  useEffect(() => {
    if (!nudgeSelector) return undefined;
    const timer = setTimeout(() => setNudgeSelector(false), 1200);
    return () => clearTimeout(timer);
  }, [nudgeSelector]);
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

  function handleExtractClick() {
    if (isExtracted) return;

    if (!hasSelection) {
      setShowPickPopup(true);
      return;
    }

    createSelectedBlock();
  }

  function closePickPopup() {
    setShowPickPopup(false);
    if (selectedBlockIndex === null) setNudgeSelector(true);
  }

  function pickFromPopup(blockIndex) {
    setShowPickPopup(false);
    handleBlockSelect(blockIndex);
  }

  return (
    <div className="step4SimplePage">

      <div
        className={`step4BlockSelectorGrid ${
          nudgeSelector ? "step4NudgeSelector" : ""
        }`}
      >
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
        <button type="button" onClick={handleExtractClick} disabled={isExtracted}>
          {isExtracted ? "Block Extracted" : "Extract Selected 8×8 Block"}
        </button>
      </div>

      <div className="step4MainGrid">
        <div className="step4Card">
          <h3>Input: 16×16 Y Matrix from Step 3</h3>

          <div
            key={splitKey}
            className={`step4SourceWrap ${playSplit ? "step4SplitAnim" : ""}`}
          >
            <YSourceMatrixGrid
              values={normalizedYMatrix}
              selectedBlockIndex={selectedBlockIndex}
              onBlockSelect={handleBlockSelect}
              isLocked={isExtracted}
            />
            {playSplit && <SplitLabels />}
          </div>

          <button
            type="button"
            className="step4ReplayBtn"
            onClick={replaySplit}
          >
            ↻ Replay block-split animation
          </button>

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

      {showPickPopup && (
        <SelectBlockPopup onPick={pickFromPopup} onClose={closePickPopup} />
      )}
    </div>
  );
}

export default Step4DivideBlocks;