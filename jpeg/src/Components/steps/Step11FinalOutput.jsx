import { useEffect, useMemo } from "react";

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

function clamp255(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

// Standard Inverse 2D DCT — the exact mathematical reverse of Step 6's forward DCT.
function inverseDct8x8(coeffMatrix) {
  const C = (k) => (k === 0 ? 1 / Math.sqrt(2) : 1);
  const result = createFallback8x8Block();

  for (let x = 0; x < 8; x += 1) {
    for (let y = 0; y < 8; y += 1) {
      let sum = 0;

      for (let u = 0; u < 8; u += 1) {
        for (let v = 0; v < 8; v += 1) {
          sum +=
            C(u) *
            C(v) *
            coeffMatrix[u][v] *
            Math.cos(((2 * x + 1) * u * Math.PI) / 16) *
            Math.cos(((2 * y + 1) * v * Math.PI) / 16);
        }
      }

      result[x][y] = 0.25 * sum;
    }
  }

  return result;
}

function dequantize(quantizedMatrix, quantizationTable) {
  return quantizedMatrix.map((row, r) =>
    row.map((value, c) => value * quantizationTable[r][c])
  );
}

function GrayBlockGrid({ values, title, selectedIndex, onCellClick, errorFlat, showHeatmap }) {
  return (
    <div className="step11GrayBlockWrap">
      <span className="step11GrayBlockTitle">{title}</span>

      <div className="step11GrayBlockGrid">
        {values.flat().map((value, index) => {
          const isSelected = selectedIndex === index;
          const error = errorFlat ? errorFlat[index] : 0;

          const heatStyle =
            showHeatmap && errorFlat
              ? { boxShadow: `inset 0 0 0 999px rgba(239, 68, 68, ${Math.min(error / 12, 0.55)})` }
              : {};

          const isLight = value >= 150;
          const textColor = isLight ? "#0b1a3a" : "#f8fafc";
          const textShadow = isLight
            ? "0 0 2px rgba(255, 255, 255, 0.85)"
            : "0 0 3px rgba(0, 0, 0, 0.9)";

          return (
            <button
              type="button"
              key={`${title}-${index}`}
              className={`step11GrayCell ${isSelected ? "step11GrayCellActive" : ""}`}
              style={{
                backgroundColor: `rgb(${value}, ${value}, ${value})`,
                color: textColor,
                textShadow,
                ...heatStyle,
              }}
              onClick={() => onCellClick?.(index)}
              title={`Row ${Math.floor(index / 8)}, Col ${index % 8} — value = ${value}`}
            >
              {value}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Step11FinalOutput({
  huffmanData,
  quantizationData,
  originalBlockData,
  isGenerated,
  setIsGenerated,
  selectedCellIndex = 0,
  setSelectedCellIndex = () => {},
  showHeatmap = false,
  setShowHeatmap = () => {},
}) {

  const finalBitstream = huffmanData?.finalBitstream || "";

  const originalBits = 64 * 8;
  const compressedBits = finalBitstream.length || 1;
  const compressionRatio = useMemo(
    () => (originalBits / compressedBits).toFixed(2),
    [compressedBits]
  );

  // ---- Real block-level reconstruction (dequantize -> inverse DCT -> +128 -> clamp) ----
  const originalYBlock = useMemo(
    () => normalize8x8Block(originalBlockData?.values),
    [originalBlockData]
  );

  const reconstructedYBlock = useMemo(() => {
    if (!quantizationData?.values || !quantizationData?.quantizationTable) {
      return createFallback8x8Block();
    }

    const quantizedMatrix = normalize8x8Block(quantizationData.values);
    const dctApprox = dequantize(quantizedMatrix, quantizationData.quantizationTable);
    const spatialApprox = inverseDct8x8(dctApprox);

    return spatialApprox.map((row) => row.map((v) => clamp255(v + 128)));
  }, [quantizationData]);

  const errorFlat = useMemo(() => {
    const flat = [];
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        flat.push(Math.abs(originalYBlock[r][c] - reconstructedYBlock[r][c]));
      }
    }
    return flat;
  }, [originalYBlock, reconstructedYBlock]);

  const averageAbsoluteError = useMemo(() => {
    const total = errorFlat.reduce((sum, v) => sum + v, 0);
    return (total / 64).toFixed(2);
  }, [errorFlat]);


  const selectedRow = Math.floor(selectedCellIndex / 8);
  const selectedCol = selectedCellIndex % 8;
  const selectedOriginal = originalYBlock[selectedRow][selectedCol];
  const selectedReconstructed = reconstructedYBlock[selectedRow][selectedCol];
  const selectedDiff = selectedOriginal - selectedReconstructed;

  const dcCode = huffmanData?.dcEncoded?.fullCode || "";

  useEffect(() => {
    setIsGenerated(false);
  }, [huffmanData]);

  function generateFinalOutput() {
    setIsGenerated(true);
  }

  function resetOutput() {
    setIsGenerated(false);
  }
  void resetOutput;

  return (
    <div className="step11SimplePage">
      <div className="step11ControlBar">
        <button type="button" onClick={generateFinalOutput}>
          Generate Final Compressed Output
        </button>
      </div>

      <div className="step11MainGrid">
        <div className="step11Card">
          <h3>Final Bitstream Preview</h3>

          <div className={`step11BitstreamBox ${isGenerated ? "step11BitstreamReveal" : ""}`}>
            {isGenerated ? (
              finalBitstream ? (
                <>
                  <span className="step11DcBits">{dcCode}</span>
                  <span className="step11AcBits">{finalBitstream.slice(dcCode.length)}</span>
                </>
              ) : (
                "—"
              )
            ) : (
              "—"
            )}
          </div>

          {isGenerated && finalBitstream && (
            <div className="step11BitLegend">
              <span><i className="step11DcSwatch" />DC bits ({dcCode.length})</span>
              <span><i className="step11AcSwatch" />AC bits ({finalBitstream.length - dcCode.length})</span>
            </div>
          )}
        </div>

        <div className="step11StatsCard">
          <h3>Size: Before vs After</h3>

          <div className="step11StatRow">
            <span>Original Block Size (64 pixels × 8 bits)</span>
            <strong>{isGenerated ? `${originalBits} bits` : "—"}</strong>
          </div>

          <div className="step11StatRow">
            <span>Compressed Size (this block)</span>
            <strong>{isGenerated ? `${compressedBits} bits` : "—"}</strong>
          </div>

          <div className="step11StatRow step11RatioRow">
            <span>Compression Ratio</span>
            <strong>{isGenerated ? `${compressionRatio} : 1` : "—"}</strong>
          </div>
        </div>
      </div>

      <div className="step11ReconstructCard">
        <div className="step11ReconstructHeader">
          <h3>What Changed — Your Selected Block, Before vs After Compression</h3>

          <label className="step11HeatmapToggle">
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
            />
            Show error heatmap
          </label>
        </div>

        <p className="step11SmallNote">
          Click any pixel to compare it on both sides.
        </p>

        <div className="step11ReconstructRow">
          <GrayBlockGrid
            values={originalYBlock}
            title="Original 8×8 Y Block (Before)"
            selectedIndex={selectedCellIndex}
            onCellClick={setSelectedCellIndex}
            errorFlat={errorFlat}
            showHeatmap={showHeatmap}
          />
          <span className="step11ReconstructArrow">→ lossy round-trip →</span>
          <GrayBlockGrid
            values={reconstructedYBlock}
            title="Reconstructed 8×8 Y Block (After)"
            selectedIndex={selectedCellIndex}
            onCellClick={setSelectedCellIndex}
            errorFlat={errorFlat}
            showHeatmap={showHeatmap}
          />
        </div>

        <div className="step11PixelInspector">
          <span>Pixel (Row {selectedRow}, Col {selectedCol})</span>
          <span>
            Before: <strong>{selectedOriginal}</strong>
          </span>
          <span>
            After: <strong>{selectedReconstructed}</strong>
          </span>
          <span className={selectedDiff === 0 ? "step11DiffZero" : "step11DiffNonZero"}>
            Diff: <strong>{selectedDiff > 0 ? `+${selectedDiff}` : selectedDiff}</strong>
          </span>
        </div>

        <div className="step11ErrorBox">
          Average per-pixel brightness error introduced by quantization ={" "}
          <b>{averageAbsoluteError}</b> (out of 0–255 scale). Lower quality in
          Step 7 → higher error here.
        </div>
      </div>
    </div>
  );
}

export default Step11FinalOutput;
