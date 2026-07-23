import "./Comparison.css";
import { useMemo } from "react";
import { useMatrix } from "../../context/MatrixContext";
import {
  generateBasisMatrix,
  forwardTransform,
  inverseTransform,
  extractBlock,
  placeBlock,
  buildQuantTable,
  clamp,
  mse,
  psnr,
} from "../../utils/transformUtils";

function Comparison() {
  const { selectedMatrix, transform, setTransform, qualityFactor, setQualityFactor } = useMatrix();

  const result = useMemo(() => {
    if (!selectedMatrix) return null;

    const T = generateBasisMatrix(transform);
    const quantTable = buildQuantTable(qualityFactor);

    const reconstructed = Array.from({ length: 16 }, () => Array(16).fill(0));
    const energyMap = Array.from({ length: 16 }, () => Array(16).fill(0));

    let zeroCount = 0;
    let nonZeroCount = 0;
    let energyBefore = 0;
    let energyAfter = 0;

    for (let blockId = 1; blockId <= 4; blockId++) {
      const block = extractBlock(selectedMatrix.data, blockId);
      const freq = forwardTransform(block, T);
      const quantized = freq.map((row, u) => row.map((v, vv) => Math.round(freq[u][vv] / quantTable[u][vv])));
      const dequantized = quantized.map((row, u) => row.map((v, vv) => quantized[u][vv] * quantTable[u][vv]));
      const spatial = inverseTransform(dequantized, T);
      const roundedBlock = spatial.map((row) => row.map((v) => clamp(Math.round(v))));

      placeBlock(reconstructed, blockId, roundedBlock);

      quantized.flat().forEach((v) => (v === 0 ? zeroCount++ : nonZeroCount++));
      freq.flat().forEach((v) => (energyBefore += v * v));
      dequantized.flat().forEach((v) => (energyAfter += v * v));

      const magMatrix = quantized.map((row) => row.map((v) => Math.abs(v)));
      placeBlock(energyMap, blockId, magMatrix);
    }

    const totalCoeff = 256;
    const zeroPercent = ((zeroCount / totalCoeff) * 100).toFixed(1);
    const nonZeroPercent = (100 - Number(zeroPercent)).toFixed(1);

    const originalBits = totalCoeff * 8;
    const compressedBits = Math.max(nonZeroCount * 8, 8);
    const compressionRatio = (originalBits / compressedBits).toFixed(2);

    const energyRetained = energyBefore > 0 ? ((energyAfter / energyBefore) * 100).toFixed(2) : "100.00";

    const imgMSE = mse(selectedMatrix.data, reconstructed);
    const imgRMSE = Math.sqrt(imgMSE);
    const imgPSNR = psnr(imgMSE);

    const maxEnergy = Math.max(...energyMap.flat(), 1);

    return {
      reconstructed,
      energyMap,
      maxEnergy,
      zeroCount,
      nonZeroCount,
      zeroPercent,
      nonZeroPercent,
      compressionRatio,
      energyRetained,
      imgMSE,
      imgRMSE,
      imgPSNR,
    };
  }, [selectedMatrix, transform, qualityFactor]);

  if (!selectedMatrix) {
    return (
      <div className="cmpContainer">
        <div className="cmpWarning">Please select an input image in Step 1 first.</div>
      </div>
    );
  }

  const original = selectedMatrix.data;
  const toGrayscale = (v) => `rgb(${v},${v},${v})`;

  return (
    <div className="cmpContainer">
      <div className="cmpHeading">
        <h2>Step 10 : Final Comparison Dashboard</h2>
        <p>
          The complete 16×16 image is reassembled from all four independently
          transformed, quantized, and reconstructed 8×8 blocks. This dashboard
          quantifies the fidelity of the reconstruction against the original image using
          standard image-quality metrics, and visualizes exactly where information was
          lost during compression.
        </p>
      </div>

      <div className="cmpControls">
        <div className="controlCard">
          <h3>Transform</h3>
          <div className="toggleButtons">
            <button className={transform === "DCT" ? "activeBtn" : ""} onClick={() => setTransform("DCT")}>DCT</button>
            <button className={transform === "DST" ? "activeBtn" : ""} onClick={() => setTransform("DST")}>DST</button>
          </div>
        </div>
        <div className="controlCard">
          <h3>Quality Factor : Q{qualityFactor}</h3>
          <input
            type="range"
            min="10"
            max="100"
            step="10"
            value={qualityFactor}
            onChange={(e) => setQualityFactor(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="cmpPipeline">
        <div className="cmpImageBlock">
          <h3>Original Image</h3>
          <div className="cmpPixelGrid16">
            {original.flat().map((v, i) => <div key={i} style={{ background: toGrayscale(v) }} />)}
          </div>
          <p>16×16 source pixel matrix</p>
        </div>

        <div className="cmpArrow">→</div>

        <div className="cmpImageBlock">
          <h3>Processed (Quantized Coefficient Energy)</h3>
          <div className="cmpPixelGrid16">
            {result.energyMap.flat().map((v, i) => (
              <div
                key={i}
                style={{ background: `rgba(37,99,235,${Math.min(1, v / result.maxEnergy)})` }}
              />
            ))}
          </div>
          <p>Brighter cells = larger surviving quantized coefficients</p>
        </div>

        <div className="cmpArrow">→</div>

        <div className="cmpImageBlock">
          <h3>Reconstructed Image</h3>
          <div className="cmpPixelGrid16">
            {result.reconstructed.flat().map((v, i) => <div key={i} style={{ background: toGrayscale(v) }} />)}
          </div>
          <p>After dequantization + inverse transform</p>
        </div>
      </div>

      <div className="cmpMetricsGrid">
        <div className="cmpMetricCard">
          <span className="statLabel">MSE</span>
          <span className="statValue">{result.imgMSE.toFixed(3)}</span>
        </div>
        <div className="cmpMetricCard">
          <span className="statLabel">RMSE</span>
          <span className="statValue">{result.imgRMSE.toFixed(3)}</span>
        </div>
        <div className="cmpMetricCard">
          <span className="statLabel">PSNR</span>
          <span className="statValue">{result.imgPSNR === Infinity ? "\u221e dB" : `${result.imgPSNR.toFixed(2)} dB`}</span>
        </div>
        <div className="cmpMetricCard">
          <span className="statLabel">Compression Ratio</span>
          <span className="statValue">{result.compressionRatio} : 1</span>
        </div>
        <div className="cmpMetricCard">
          <span className="statLabel">Energy Retained</span>
          <span className="statValue">{result.energyRetained}%</span>
        </div>
        <div className="cmpMetricCard">
          <span className="statLabel">Non-Zero Coefficients</span>
          <span className="statValue">{result.nonZeroCount} / 256</span>
        </div>
      </div>

      <div className="cmpCoeffStats">
        <h3>Coefficient Statistics (Full Image, 4 Blocks)</h3>
        <div className="zeroBarTrack">
          <div className="zeroBarFill" style={{ width: `${result.zeroPercent}%` }} />
        </div>
        <div className="cmpCoeffLegend">
          <span><i className="cmpDotZero" /> Zero: {result.zeroCount} ({result.zeroPercent}%)</span>
          <span><i className="cmpDotNonZero" /> Non-Zero: {result.nonZeroCount} ({result.nonZeroPercent}%)</span>
        </div>
      </div>

      <div className="cmpDiffSection">
        <h3>Difference (Error) Heatmap</h3>
        <div className="cmpPixelGrid16 cmpDiffGrid">
          {original.flat().map((v, i) => {
            const r = Math.floor(i / 16);
            const c = i % 16;
            const diff = Math.abs(v - result.reconstructed[r][c]);
            return <div key={i} style={{ background: `rgba(220,38,38,${Math.min(1, diff / 40)})` }} title={diff} />;
          })}
        </div>
        <p className="cmpDiffCaption">Darker red indicates larger per-pixel reconstruction error.</p>
      </div>

      <div className="observationCard">
        <h3>Research Observations</h3>
        <ul>
          <li>PSNR above ~30 dB is generally considered visually acceptable for 8-bit grayscale imagery; values above ~40 dB are typically indistinguishable from the original to the human eye.</li>
          <li>Energy Retained quantifies the fraction of total signal energy preserved after quantization — it stays high even at moderate compression because natural image energy is concentrated in the low-frequency coefficients preserved by the quantization table.</li>
          <li>Reducing the Quality Factor increases the Compression Ratio but decreases PSNR and Energy Retained, directly demonstrating the fundamental rate-distortion trade-off of lossy transform coding.</li>
          <li>DCT (real, even-symmetric basis) and DST (real, odd-symmetric basis) exhibit different energy compaction behaviour depending on the underlying image content — switch the transform above to compare their reconstruction quality on the current image.</li>
        </ul>
      </div>

      <div className="cmpConclusion">
        <h3>Final Conclusions</h3>
        <p>
          This experiment demonstrated the complete transform-coding pipeline: image
          blocking, orthogonal basis generation, forward transform, perceptually-weighted
          quantization, zig-zag reordering, run-length symbol preparation, and inverse
          reconstruction. The measured PSNR of <b>{result.imgPSNR === Infinity ? "\u221e dB" : `${result.imgPSNR.toFixed(2)} dB`}</b>{" "}
          at Quality Factor <b>Q{qualityFactor}</b> with the <b>{transform}</b> basis
          confirms that substantial data reduction (<b>{result.compressionRatio}:1</b>) can be
          achieved while retaining <b>{result.energyRetained}%</b> of the original signal
          energy — the central principle exploited by all modern transform-based
          image and video compression systems.
        </p>
      </div>
    </div>
  );
}

export default Comparison;
