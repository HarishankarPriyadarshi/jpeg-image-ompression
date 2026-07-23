import { useMemo, useState } from "react";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createFallbackMatrix(size = 16) {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 0)
  );
}

function normalizeMatrix(matrix, fallbackSize = 16) {
  if (!Array.isArray(matrix) || matrix.length === 0) {
    return createFallbackMatrix(fallbackSize);
  }

  const columnCount = Array.isArray(matrix[0]) ? matrix[0].length : fallbackSize;

  return matrix.map((row) =>
    Array.from({ length: columnCount }, (_, col) => {
      const value = row?.[col];
      return typeof value === "number" ? value : 0;
    })
  );
}

function getGroupValues(matrix, groupRow, groupCol) {
  const startRow = groupRow * 2;
  const startCol = groupCol * 2;

  const values = [];

  for (let rowOffset = 0; rowOffset < 2; rowOffset += 1) {
    for (let colOffset = 0; colOffset < 2; colOffset += 1) {
      const row = startRow + rowOffset;
      const col = startCol + colOffset;

      if (typeof matrix[row]?.[col] === "number") {
        values.push({
          row,
          col,
          value: matrix[row][col],
        });
      }
    }
  }

  return values;
}

function average2x2Group(matrix, groupRow, groupCol) {
  const groupValues = getGroupValues(matrix, groupRow, groupCol);

  if (groupValues.length === 0) {
    return 0;
  }

  const sum = groupValues.reduce((total, item) => total + item.value, 0);

  return Math.round(sum / groupValues.length);
}

function createDownsampledMatrix(matrix) {
  const sourceRows = matrix.length;
  const sourceCols = matrix[0]?.length || 0;

  const outputRows = Math.ceil(sourceRows / 2);
  const outputCols = Math.ceil(sourceCols / 2);

  return Array.from({ length: outputRows }, (_, groupRow) =>
    Array.from({ length: outputCols }, (_, groupCol) =>
      average2x2Group(matrix, groupRow, groupCol)
    )
  );
}

function getGroupIndex(groupRow, groupCol, outputCols) {
  return groupRow * outputCols + groupCol;
}

function getSourceIndexesForGroup(groupRow, groupCol, sourceCols) {
  const startRow = groupRow * 2;
  const startCol = groupCol * 2;

  return [
    startRow * sourceCols + startCol,
    startRow * sourceCols + startCol + 1,
    (startRow + 1) * sourceCols + startCol,
    (startRow + 1) * sourceCols + startCol + 1,
  ];
}

function SourceMatrixGrid({
  values,
  activeComponent,
  selectedGroupSourceIndexes,
  selectedPixelIndex,
  onCellClick,
}) {
  const matrixSize = values.length;

  return (
    <div
      className="step3SourceGrid"
      style={{
        gridTemplateColumns: `repeat(${matrixSize}, 27px)`,
      }}
    >
      {values.flat().map((value, index) => {
        const isSelectedPixel = selectedPixelIndex === index;
        const isInSelectedGroup = selectedGroupSourceIndexes.includes(index);

        return (
          <button
            key={`${activeComponent}-source-${index}`}
            type="button"
            className={`step3SourceCell ${
              isInSelectedGroup ? "step3SelectedGroupSourceCell" : ""
            } ${isSelectedPixel ? "step3SelectedSourcePixel" : ""}`}
            onClick={() => onCellClick(index)}
            title={`${activeComponent} P${index + 1}: ${value}`}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}

function DownsampledMatrixGrid({
  values,
  activeComponent,
  revealedGroupIndexes,
  selectedGroupIndex,
}) {
  const outputSize = values.length;

  return (
    <div
      className="step3OutputGrid"
      style={{
        gridTemplateColumns: `repeat(${outputSize}, 34px)`,
      }}
    >
      {values.flat().map((value, index) => {
        const isRevealed = revealedGroupIndexes.includes(index);
        const isSelectedGroup = selectedGroupIndex === index;

        return (
          <span
            key={`${activeComponent}-downsampled-${index}`}
            className={`step3OutputCell ${
              isRevealed ? "step3VisibleOutputCell" : "step3HiddenOutputCell"
            } ${isSelectedGroup ? "step3SelectedOutputCell" : ""}`}
          >
            {isRevealed ? value : "—"}
          </span>
        );
      })}
    </div>
  );
}

function Step3ChromaSubsampling({
  yMatrix,
  cbMatrix,
  crMatrix,
  selectedPixelIndex,
  setSelectedPixelIndex,
  revealedGroupIndexes,
  setRevealedGroupIndexes,
}) {
  const [activeComponent, setActiveComponent] = useState("Cb");
  const [isAutoSubsampling, setIsAutoSubsampling] = useState(false);
  const [showFormula, setShowFormula] = useState(false);

  const normalizedY = useMemo(() => normalizeMatrix(yMatrix), [yMatrix]);
  const normalizedCb = useMemo(() => normalizeMatrix(cbMatrix), [cbMatrix]);
  const normalizedCr = useMemo(() => normalizeMatrix(crMatrix), [crMatrix]);

  const sourceMatrix = activeComponent === "Cb" ? normalizedCb : normalizedCr;

  const downsampledCbMatrix = useMemo(
    () => createDownsampledMatrix(normalizedCb),
    [normalizedCb]
  );

  const downsampledCrMatrix = useMemo(
    () => createDownsampledMatrix(normalizedCr),
    [normalizedCr]
  );

  const activeDownsampledMatrix =
    activeComponent === "Cb" ? downsampledCbMatrix : downsampledCrMatrix;

  const safeRevealedGroupIndexes = Array.isArray(revealedGroupIndexes)
    ? revealedGroupIndexes
    : [];

  const sourceSize = sourceMatrix.length;
  const sourceCols = sourceMatrix[0]?.length || sourceSize;

  const outputRows = activeDownsampledMatrix.length;
  const outputCols = activeDownsampledMatrix[0]?.length || outputRows;

  const selectedSourceRow = Math.floor(selectedPixelIndex / sourceCols);
  const selectedSourceCol = selectedPixelIndex % sourceCols;

  const selectedGroupRow = Math.floor(selectedSourceRow / 2);
  const selectedGroupCol = Math.floor(selectedSourceCol / 2);

  const selectedGroupIndex = getGroupIndex(
    selectedGroupRow,
    selectedGroupCol,
    outputCols
  );

  const selectedGroupSourceIndexes = getSourceIndexesForGroup(
    selectedGroupRow,
    selectedGroupCol,
    sourceCols
  );

  const selectedCbGroupValues = getGroupValues(
    normalizedCb,
    selectedGroupRow,
    selectedGroupCol
  );

  const selectedCrGroupValues = getGroupValues(
    normalizedCr,
    selectedGroupRow,
    selectedGroupCol
  );

  const selectedCbAverage = average2x2Group(
    normalizedCb,
    selectedGroupRow,
    selectedGroupCol
  );

  const selectedCrAverage = average2x2Group(
    normalizedCr,
    selectedGroupRow,
    selectedGroupCol
  );

  const activeGroupValues =
    activeComponent === "Cb" ? selectedCbGroupValues : selectedCrGroupValues;

  const activeAverage =
    activeComponent === "Cb" ? selectedCbAverage : selectedCrAverage;

  const totalGroups = outputRows * outputCols;
  const revealedCount = safeRevealedGroupIndexes.length;
  const progressPercent = totalGroups
    ? Math.round((revealedCount / totalGroups) * 100)
    : 0;

  function revealSelectedGroup() {
    if (typeof setRevealedGroupIndexes !== "function") return;

    setRevealedGroupIndexes((prev) => {
      const current = Array.isArray(prev) ? prev : [];

      if (current.includes(selectedGroupIndex)) {
        return current;
      }

      return [...current, selectedGroupIndex].sort((a, b) => a - b);
    });

    setShowFormula(true);
  }

  async function autoSubsampleFullMatrix() {
    if (isAutoSubsampling || typeof setRevealedGroupIndexes !== "function") {
      return;
    }

    setIsAutoSubsampling(true);
    setShowFormula(true);
    setRevealedGroupIndexes([]);

    for (let index = 0; index < totalGroups; index += 1) {
      const groupRow = Math.floor(index / outputCols);
      const groupCol = index % outputCols;
      const sourceIndex = groupRow * 2 * sourceCols + groupCol * 2;

      if (typeof setSelectedPixelIndex === "function") {
        setSelectedPixelIndex(sourceIndex);
      }

      setRevealedGroupIndexes((prev) => {
        const current = Array.isArray(prev) ? prev : [];

        if (current.includes(index)) {
          return current;
        }

        return [...current, index].sort((a, b) => a - b);
      });

      await wait(70);
    }

    setIsAutoSubsampling(false);
  }

  function resetSubsampling() {
    if (typeof setRevealedGroupIndexes === "function") {
      setRevealedGroupIndexes([]);
    }

    setIsAutoSubsampling(false);
    setShowFormula(false);

    if (typeof setSelectedPixelIndex === "function") {
      setSelectedPixelIndex(0);
    }
  }

  function handleSourceCellClick(index) {
    if (typeof setSelectedPixelIndex === "function") {
      setSelectedPixelIndex(index);
    }

    setShowFormula(true);
  }

  return (
    <div className="step3SimplePage">
      <div className="step3ConceptBox">
        <div>
          <strong>Step 3 Concept:</strong> Chroma subsampling reduces the color
          information. The <b>Y matrix stays {normalizedY.length}×
          {normalizedY[0]?.length}</b>, while <b>Cb</b> and <b>Cr</b> are
          reduced from {sourceSize}×{sourceCols} to {outputRows}×{outputCols}.
        </div>

        <div>
          <strong>Why?</strong> Human vision is more sensitive to brightness
          than color detail, so JPEG keeps luminance Y unchanged and reduces
          chrominance Cb/Cr data.
        </div>

        <div>
          <strong>Method:</strong> Every 2×2 chroma group is replaced by one
          average value.
        </div>
      </div>

      <div className="step3SummaryGrid">
        <div>
          <span>Y Matrix</span>
          <strong>
            {normalizedY.length}×{normalizedY[0]?.length}
          </strong>
          <small>Unchanged luminance</small>
        </div>

        <div>
          <span>Cb Matrix</span>
          <strong>
            {normalizedCb.length}×{normalizedCb[0]?.length} →{" "}
            {downsampledCbMatrix.length}×{downsampledCbMatrix[0]?.length}
          </strong>
          <small>Blue chroma reduced</small>
        </div>

        <div>
          <span>Cr Matrix</span>
          <strong>
            {normalizedCr.length}×{normalizedCr[0]?.length} →{" "}
            {downsampledCrMatrix.length}×{downsampledCrMatrix[0]?.length}
          </strong>
          <small>Red chroma reduced</small>
        </div>
      </div>

      <div className="step3ControlBar">
        <button
          type="button"
          onClick={revealSelectedGroup}
          disabled={isAutoSubsampling}
        >
          Downsample Selected 2×2 Group
        </button>

        <button
          type="button"
          onClick={autoSubsampleFullMatrix}
          disabled={isAutoSubsampling}
        >
          {isAutoSubsampling ? "Downsampling..." : "Auto Downsample Full Chroma"}
        </button>

        <button type="button" onClick={resetSubsampling}>
          Reset
        </button>
      </div>

      <div className="step3ProgressBox">
        <div className="step3ProgressTop">
          <span>
            Revealed Groups: {revealedCount} / {totalGroups}
          </span>

          <strong>{progressPercent}%</strong>
        </div>

        <div className="step3ProgressTrack">
          <div
            className="step3ProgressFill"
            style={{
              width: `${progressPercent}%`,
            }}
          />
        </div>
      </div>

      <div className="step3Tabs">
        <button
          type="button"
          className={activeComponent === "Cb" ? "step3ActiveTab" : ""}
          onClick={() => setActiveComponent("Cb")}
        >
          Cb Downsampling
        </button>

        <button
          type="button"
          className={activeComponent === "Cr" ? "step3ActiveTab" : ""}
          onClick={() => setActiveComponent("Cr")}
        >
          Cr Downsampling
        </button>
      </div>

      <div className="step3MainGrid">
        <div className="step3Card">
          <h3>Input: {activeComponent} Matrix from Step 2</h3>

          <SourceMatrixGrid
            values={sourceMatrix}
            activeComponent={activeComponent}
            selectedGroupSourceIndexes={selectedGroupSourceIndexes}
            selectedPixelIndex={selectedPixelIndex}
            onCellClick={handleSourceCellClick}
          />

          <p className="step3SmallNote">
            Click any chroma value. The highlighted 2×2 group is averaged into
            one output value.
          </p>
        </div>

        <div className="step3CalculationCard">
          <h3>Selected 2×2 Group</h3>

          <div className="step3SelectedMeta">
            <div>
              <span>Selected Pixel</span>
              <strong>P{selectedPixelIndex + 1}</strong>
            </div>

            <div>
              <span>Source Position</span>
              <strong>
                Row {selectedSourceRow}, Col {selectedSourceCol}
              </strong>
            </div>

            <div>
              <span>Output Position</span>
              <strong>
                Row {selectedGroupRow}, Col {selectedGroupCol}
              </strong>
            </div>
          </div>

          <div className="step3GroupValues">
            {activeGroupValues.map((item) => (
              <div key={`${activeComponent}-${item.row}-${item.col}`}>
                <span>
                  ({item.row},{item.col})
                </span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>

          <div className="step3FormulaBox">
            Output value = round((v1 + v2 + v3 + v4) / 4)
          </div>

          {showFormula ? (
            <div className="step3CalculationResult">
              <div>
                {activeComponent} average = round((
                {activeGroupValues.map((item) => item.value).join(" + ")}) /{" "}
                {activeGroupValues.length}) = <b>{activeAverage}</b>
              </div>

              <div>
                Cb output for this group = <b>{selectedCbAverage}</b>
              </div>

              <div>
                Cr output for this group = <b>{selectedCrAverage}</b>
              </div>
            </div>
          ) : (
            <div className="step3PendingBox">
              Click Downsample Selected 2×2 Group to reveal the average.
            </div>
          )}
        </div>

        <div className="step3Card">
          <h3>
            Output: Downsampled {activeComponent} Matrix {outputRows}×
            {outputCols}
          </h3>

          <DownsampledMatrixGrid
            values={activeDownsampledMatrix}
            activeComponent={activeComponent}
            revealedGroupIndexes={safeRevealedGroupIndexes}
            selectedGroupIndex={selectedGroupIndex}
          />

          <p className="step3SmallNote">
            Unrevealed output cells stay hidden as “—”. Auto Downsample reveals
            values group by group.
          </p>
        </div>
      </div>

      <div className="rgbInfoBox">
        Step 3 Output = Y remains 16×16, Cb becomes 8×8, Cr becomes 8×8
      </div>
    </div>
  );
}

export default Step3ChromaSubsampling;