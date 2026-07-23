import { useEffect, useMemo, useState } from "react";

const PIPELINE_STAGES = [
  "RGB",
  "YCbCr",
  "Chroma Subsampling",
  "8×8 Block",
  "Level Shift",
  "DCT",
  "Quantization",
  "DC Difference",
  "Zig-Zag",
  "RLE",
  "Huffman",
  "Bitstream",
];

// Real JPEG files generated with Python/Pillow from the same real photo used in
// Step 1, at three real quality settings. Sizes are the ACTUAL bytes on disk —
// not estimated — so the ratios shown below are genuine, measured numbers.
const REAL_COMPRESSION_SAMPLES = {
  original: { url: "/jpeg-samples/original.png", bytes: 736996, label: "Original (PNG, lossless)" },
  q90: { url: "/jpeg-samples/compressed-q90.jpg", bytes: 145586, label: "JPEG Quality 90" },
  q50: { url: "/jpeg-samples/compressed-q50.jpg", bytes: 53964, label: "JPEG Quality 50" },
  q20: { url: "/jpeg-samples/compressed-q20.jpg", bytes: 29179, label: "JPEG Quality 20" },
};

// Raw uncompressed bitmap size of the 724x543 image (width x height x 3 bytes/pixel).
// This is the true "before any compression at all" reference size.
const RAW_BITMAP_BYTES = 724 * 543 * 3;

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

function GrayBlockGrid({ values, title }) {
  return (
    <div className="step12GrayBlockWrap">
      <span className="step12GrayBlockTitle">{title}</span>

      <div className="step12GrayBlockGrid">
        {values.flat().map((value, index) => (
          <span
            key={`${title}-${index}`}
            className="step12GrayCell"
            style={{ backgroundColor: `rgb(${value}, ${value}, ${value})` }}
            title={`Gray value = ${value}`}
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function Step12FinalOutput({
  huffmanData,
  rleData,
  dcCodingData,
  quantizationData,
  originalBlockData,
}) {
  const [isGenerated, setIsGenerated] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState("q50");

  const componentName =
    huffmanData?.component ||
    rleData?.component ||
    dcCodingData?.component ||
    quantizationData?.component ||
    "Y";

  const blockIndex =
    typeof huffmanData?.blockIndex === "number"
      ? huffmanData.blockIndex
      : typeof quantizationData?.blockIndex === "number"
      ? quantizationData.blockIndex
      : 0;

  const blockNumber = blockIndex + 1;

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

  const averageAbsoluteError = useMemo(() => {
    let total = 0;
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        total += Math.abs(originalYBlock[r][c] - reconstructedYBlock[r][c]);
      }
    }
    return (total / 64).toFixed(2);
  }, [originalYBlock, reconstructedYBlock]);

  const selectedSample = REAL_COMPRESSION_SAMPLES[selectedQuality];
  const realRatio = (RAW_BITMAP_BYTES / selectedSample.bytes).toFixed(1);
  const pngRatio = (RAW_BITMAP_BYTES / REAL_COMPRESSION_SAMPLES.original.bytes).toFixed(1);

  useEffect(() => {
    setIsGenerated(false);
  }, [huffmanData]);

  function generateFinalOutput() {
    setIsGenerated(true);
  }

  function resetOutput() {
    setIsGenerated(false);
  }

  return (
    <div className="step12SimplePage">
      <div className="step12ConceptBox">
        <div>
          <strong>Step 12 Concept:</strong> The final compressed JPEG output
          combines the entropy encoded bitstream from Step 11 into the
          educational compressed scan data for the selected block.
        </div>

        <div>
          <strong>Important note:</strong> A real JPEG file also stores
          markers, headers, the quantization table and Huffman tables. This
          simulation focuses only on the baseline block-level encoding
          pipeline for learning purposes, not a full file writer.
        </div>
      </div>

      <div className="step12PipelineBox">
        <h3>Full Pipeline Summary</h3>

        <div className="step12PipelineFlow">
          {PIPELINE_STAGES.map((stage, index) => (
            <span key={`step12-stage-${index}`} className="step12PipelineStage">
              {stage}
              {index < PIPELINE_STAGES.length - 1 && (
                <span className="step12PipelineArrow">→</span>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="step12SummaryGrid">
        <div>
          <span>Selected Block</span>
          <strong>
            {componentName} Block B{blockNumber}
          </strong>
          <small>Traced through all 12 steps</small>
        </div>

        <div>
          <span>Input</span>
          <strong>Huffman Bitstream</strong>
          <small>From Step 11</small>
        </div>

        <div>
          <span>Output</span>
          <strong>Compressed Bitstream Preview</strong>
          <small>Educational baseline result</small>
        </div>
      </div>

      <div className="step12ControlBar">
        <button type="button" onClick={generateFinalOutput}>
          Generate Final Output
        </button>

        <button type="button" onClick={resetOutput}>
          Reset
        </button>
      </div>

      <div className="step12MainGrid">
        <div className="step12Card">
          <h3>Final Bitstream Preview</h3>

          <div className="step12BitstreamBox">
            {isGenerated ? finalBitstream || "—" : "—"}
          </div>

          <p className="step12SmallNote">
            {isGenerated
              ? `${finalBitstream.length} bits generated for this block.`
              : "Click Generate Final Output to reveal the compressed bitstream."}
          </p>
        </div>

        <div className="step12StatsCard">
          <h3>Approximate Compression Stats (This Block)</h3>

          <div className="step12StatRow">
            <span>Original Block Size</span>
            <strong>{isGenerated ? `${originalBits} bits` : "—"}</strong>
          </div>

          <div className="step12StatRow">
            <span>8×8 Y Block</span>
            <strong>{isGenerated ? "64 samples × 8 bits" : "—"}</strong>
          </div>

          <div className="step12StatRow">
            <span>Compressed Scan Bits</span>
            <strong>{isGenerated ? `${compressedBits} bits` : "—"}</strong>
          </div>

          <div className="step12StatRow step12RatioRow">
            <span>Compression Ratio</span>
            <strong>{isGenerated ? `${compressionRatio} : 1` : "—"}</strong>
          </div>

          <p className="step12SmallNote">
            Compression Ratio = Original Bits ÷ Compressed Bits
          </p>
        </div>
      </div>

      <div className="step12ReconstructCard">
        <h3>Before vs After — Real Lossy Reconstruction (Same Block)</h3>

        <p className="step12SmallNote">
          This is real math, not a picture swap: Step 7&apos;s quantized matrix
          is <b>dequantized</b> (× quantization table), passed through the{" "}
          <b>Inverse DCT</b>, then <b>+128</b> is added back (undoing Step 5).
          The result is compared against the original block from Step 4 to see
          exactly how much detail quantization actually destroyed.
        </p>

        <div className="step12ReconstructRow">
          <GrayBlockGrid values={originalYBlock} title="Original 8×8 Y Block (Before)" />
          <span className="step12ReconstructArrow">→ lossy round-trip →</span>
          <GrayBlockGrid
            values={reconstructedYBlock}
            title="Reconstructed 8×8 Y Block (After)"
          />
        </div>

        <div className="step12ErrorBox">
          Average per-pixel brightness error introduced by quantization ={" "}
          <b>{averageAbsoluteError}</b> (out of 0–255 scale). Lower quality in
          Step 7 → higher error here.
        </div>
      </div>

      <div className="step12RealImageCard">
        <h3>Real Photo Compression (Actual Files, Not Estimated)</h3>

        <p className="step12SmallNote">
          These are genuine files generated with Python/Pillow from the same
          real photo used in Step 1&apos;s &quot;Real Photo Patch&quot;. Sizes
          below are the actual bytes measured on disk.
        </p>

        <div className="step12QualityPicker">
          {Object.entries(REAL_COMPRESSION_SAMPLES)
            .filter(([key]) => key !== "original")
            .map(([key, sample]) => (
              <button
                key={key}
                type="button"
                className={`step12QualityBtn ${
                  selectedQuality === key ? "step12QualityBtnActive" : ""
                }`}
                onClick={() => setSelectedQuality(key)}
              >
                {sample.label}
              </button>
            ))}
        </div>

        <div className="step12RealImageRow">
          <div className="step12RealImageBox">
            <img
              src={REAL_COMPRESSION_SAMPLES.original.url}
              alt="Original uncompressed reference"
            />
            <span>Original (raw bitmap ≈ {(RAW_BITMAP_BYTES / 1024).toFixed(0)} KB)</span>
          </div>

          <div className="step12RealImageBox">
            <img src={selectedSample.url} alt={selectedSample.label} />
            <span>
              {selectedSample.label} ({(selectedSample.bytes / 1024).toFixed(1)} KB)
            </span>
          </div>
        </div>

        <div className="step12RealStatsRow">
          <div>
            <span>Raw Bitmap Size</span>
            <strong>{(RAW_BITMAP_BYTES / 1024).toFixed(0)} KB</strong>
          </div>

          <div>
            <span>Lossless PNG</span>
            <strong>
              {(REAL_COMPRESSION_SAMPLES.original.bytes / 1024).toFixed(0)} KB
              ({pngRatio}:1)
            </strong>
          </div>

          <div className="step12RatioHighlight">
            <span>{selectedSample.label}</span>
            <strong>
              {(selectedSample.bytes / 1024).toFixed(1)} KB ({realRatio}:1)
            </strong>
          </div>
        </div>
      </div>

      <div className="rgbInfoBox">
        Step 12 Output = Final educational compressed bitstream for the
        selected 8×8 block, completing the baseline JPEG encoding simulation.
      </div>
    </div>
  );
}

export default Step12FinalOutput;
