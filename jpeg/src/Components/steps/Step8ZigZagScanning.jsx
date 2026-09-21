import { useEffect, useMemo, useRef, useState } from "react";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const ZIG_ZAG_ORDER = [
  [0, 0],
  [0, 1], [1, 0],
  [2, 0], [1, 1], [0, 2],
  [0, 3], [1, 2], [2, 1], [3, 0],
  [4, 0], [3, 1], [2, 2], [1, 3], [0, 4],
  [0, 5], [1, 4], [2, 3], [3, 2], [4, 1], [5, 0],
  [6, 0], [5, 1], [4, 2], [3, 3], [2, 4], [1, 5], [0, 6],
  [0, 7], [1, 6], [2, 5], [3, 4], [4, 3], [5, 2], [6, 1], [7, 0],
  [7, 1], [6, 2], [5, 3], [4, 4], [3, 5], [2, 6], [1, 7],
  [2, 7], [3, 6], [4, 5], [5, 4], [6, 3], [7, 2],
  [7, 3], [6, 4], [5, 5], [4, 6], [3, 7],
  [4, 7], [5, 6], [6, 5], [7, 4],
  [7, 5], [6, 6], [5, 7],
  [6, 7], [7, 6],
  [7, 7],
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

function buildFullSequence(matrix) {
  return ZIG_ZAG_ORDER.map(([row, col]) => matrix[row][col]);
}

function Step8ZigZagScanning({
  quantizationData,
  dcCodingData,
  onZigZagChange,
  scanIndex,
  setScanIndex,
  scannedIndexes,
  setScannedIndexes,
  isAutoScanning,
  setIsAutoScanning,
}) {
  const runRef = useRef(0);

  const quantizedMatrix = useMemo(
    () => normalize8x8Block(quantizationData?.values),
    [quantizationData]
  );

  const fullSequence = useMemo(
    () => buildFullSequence(quantizedMatrix),
    [quantizedMatrix]
  );

  const dcValue = fullSequence[0];
  const acSequence = fullSequence.slice(1);

  const componentName = quantizationData?.component || "Y";

  const blockIndex =
    typeof quantizationData?.blockIndex === "number"
      ? quantizationData.blockIndex
      : 0;

  const blockNumber = blockIndex + 1;

  const scannedCount = scannedIndexes.length;
  const progressPercent = Math.round((scannedCount / 64) * 100);
  const currentCell = ZIG_ZAG_ORDER[scanIndex] || [0, 0];
  const cellFlatIndex = currentCell[0] * 8 + currentCell[1];

  function emitZigZagData(sequence) {
    if (typeof onZigZagChange !== "function") return;

    onZigZagChange({
      component: componentName,
      blockIndex,
      quantizedMatrix,
      fullSequence: sequence,
      dcValue: sequence[0],
      acSequence: sequence.slice(1),
      zigZagOrder: ZIG_ZAG_ORDER,
    });
  }

  useEffect(() => {
    emitZigZagData(fullSequence);
  }, [quantizationData]);

  function scanSelectedPosition() {
    runRef.current += 1;
    setIsAutoScanning(false);

    setScannedIndexes((prev) => {
      if (prev.includes(scanIndex)) return prev;
      const next = [...prev, scanIndex].sort((a, b) => a - b);
      return next;
    });

    if (scanIndex < 63) {
      setScanIndex((prev) => prev + 1);
    }
  }

  async function autoZigZagScan() {
    if (isAutoScanning) return;

    const runId = runRef.current + 1;
    runRef.current = runId;

    setIsAutoScanning(true);
    setScannedIndexes([]);

    for (let index = 0; index < 64; index += 1) {
      if (runRef.current !== runId) return;

      setScanIndex(index);

      setScannedIndexes((prev) => {
        if (prev.includes(index)) return prev;
        return [...prev, index].sort((a, b) => a - b);
      });

      await wait(55);
    }

    setIsAutoScanning(false);
    emitZigZagData(fullSequence);
  }

  function resetScan() {
    runRef.current += 1;
    setScanIndex(0);
    setScannedIndexes([]);
    setIsAutoScanning(false);
  }
  void resetScan;
  void scanSelectedPosition;

  return (
    <div className="step8SimplePage">

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
          <strong>Zig-Zag Traversal</strong>
          <small>Low frequency → high frequency order</small>
        </div>

        <div>
          <span>Output To Step 9</span>
          <strong>63 AC Values</strong>
          <small>DC value already handled automatically</small>
        </div>
      </div>

      <div className="step8ControlBar">
        <button
          type="button"
          onClick={autoZigZagScan}
          disabled={isAutoScanning}
        >
          {isAutoScanning ? "Scanning..." : "Run Zig-Zag Scan"}
        </button>
      </div>

      <div className="step8ProgressBox">
        <div className="step8ProgressTop">
          <span>Scanned Positions: {scannedCount} / 64</span>
          <strong>{progressPercent}%</strong>
        </div>

        <div className="step8ProgressTrack">
          <div
            className="step8ProgressFill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="step8MainGrid">
        <div className="step8Card">
          <h3>Input: Quantized 8×8 Matrix With Zig-Zag Path</h3>

          <div className="step8MatrixWrap">
            <svg
              className="step8PathOverlay"
              viewBox="0 0 400 400"
              preserveAspectRatio="none"
            >
              <polyline
                className={`step8PathLine ${
                  isAutoScanning ? "step8PathAnimating" : ""
                }`}
                points={ZIG_ZAG_ORDER.slice(0, scannedCount || 1)
                  .map(([r, c]) => `${c * 50 + 25},${r * 50 + 25}`)
                  .join(" ")}
              />

              <circle
                className="step8PathDot"
                cx={currentCell[1] * 50 + 25}
                cy={currentCell[0] * 50 + 25}
                r="7"
              />
            </svg>

            <div className="step8MatrixGrid">
              {quantizedMatrix.flat().map((value, index) => {
                const row = Math.floor(index / 8);
                const col = index % 8;

                const pathPosition = ZIG_ZAG_ORDER.findIndex(
                  ([r, c]) => r === row && c === col
                );

                const isScanned = scannedIndexes.includes(pathPosition);
                const isCurrent = cellFlatIndex === index;

                return (
                  <span
                    key={`step8-cell-${index}`}
                    className={`step8MatrixCell ${
                      isScanned ? "step8ScannedCell" : ""
                    } ${isCurrent ? "step8CurrentCell" : ""} ${
                      pathPosition === 0 ? "step8DcCell" : ""
                    }`}
                    title={`Zig-zag position ${pathPosition}`}
                  >
                    <b>{value}</b>
                    <small>#{pathPosition}</small>
                  </span>
                );
              })}
            </div>
          </div>

          <p className="step8SmallNote">
            Numbers in each cell show the zig-zag scan order (0 to 63). The
            blue line traces the actual path already scanned; the yellow dot
            is the current position. Cell #0 is the DC coefficient.
          </p>
        </div>

        <div className="step8CalculationCard">
          <h3>Current Scan Position</h3>

          <div className="step8InfoRow">
            <span>Scan Index</span>
            <strong>{scanIndex} / 63</strong>
          </div>

          <div className="step8InfoRow">
            <span>Matrix Position</span>
            <strong>
              row {currentCell[0]}, col {currentCell[1]}
            </strong>
          </div>

          <div className="step8InfoRow">
            <span>Value At Position</span>
            <strong>{quantizedMatrix[currentCell[0]][currentCell[1]]}</strong>
          </div>

          <div className="step8MiniFormula">
            Zig-Zag Order Position {scanIndex} → Matrix (u={currentCell[0]},
            v={currentCell[1]})
          </div>

          <p className="step8PreviousNote">
            Click Run Zig-Zag Scan to reveal the entire path.
          </p>
        </div>

        <div className="step8OutputCard">
          <h3>Full Zig-Zag Sequence (as a 1D string, not a matrix)</h3>

          <p className="step8SequenceString">
            "
            {fullSequence
              .map((value, index) =>
                scannedIndexes.includes(index) ? value : "_"
              )
              .join(", ")}
            "
          </p>

          <div className="step8SplitRow">
            <div>
              <span>DC Value</span>
              <strong>
                {scannedIndexes.includes(0) ? dcValue : "—"}
              </strong>
              <small>
                Already computed automatically
                {dcCodingData
                  ? ` (difference = ${dcCodingData.dcDifference})`
                  : ""}
              </small>
            </div>

            <div>
              <span>AC Sequence Length</span>
              <strong>{acSequence.length}</strong>
              <small>Sent forward as a string to Run-Length Encoding in Step 9</small>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default Step8ZigZagScanning;
