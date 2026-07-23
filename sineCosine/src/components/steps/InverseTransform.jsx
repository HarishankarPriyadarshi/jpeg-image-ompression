import "./InverseTransform.css";
import { useEffect, useRef, useState } from "react";
import { useMatrix } from "../../context/MatrixContext";
import {
  generateBasisMatrix,
  inverseTransform,
  extractBlock,
  elementwiseMultiply,
  clamp,
  mse,
  psnr,
} from "../../utils/transformUtils";

function InverseTransform() {
  const {
    selectedMatrix,
    quantizedMatrix,
    quantTable,
    transform,
    selectedBlock,
    dequantizedMatrix,
    setDequantizedMatrix,
    reconstructedBlock,
    setReconstructedBlock,
  } = useMatrix();

  const [status, setStatus] = useState("Waiting");
  const [progress, setProgress] = useState(0);
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const intervalRef = useRef(null);

  const hasInputs = quantizedMatrix.length === 8 && quantTable.length === 8 && selectedMatrix;
  const originalBlock = hasInputs ? extractBlock(selectedMatrix.data, selectedBlock) : null;

  useEffect(() => {
    setDequantizedMatrix([]);
    setReconstructedBlock([]);
    setStatus("Waiting");
    setProgress(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantizedMatrix, quantTable, selectedBlock, transform]);

  useEffect(() => () => intervalRef.current && clearInterval(intervalRef.current), []);

  const runReconstruction = () => {
    if (!hasInputs) return;
    if (intervalRef.current) clearInterval(intervalRef.current);

    setStatus("Dequantizing...");
    setProgress(10);
    setDequantizedMatrix([]);
    setReconstructedBlock([]);

    let p = 10;
    intervalRef.current = setInterval(() => {
      p += 10;
      setProgress(Math.min(p, 100));

      if (p === 30) {
        const dq = elementwiseMultiply(quantizedMatrix, quantTable);
        setDequantizedMatrix(dq);
        setStatus("Dequantized: F'(u,v) = Q(u,v) \u00d7 T(u,v)");
      }

      if (p === 60) {
        setStatus("Applying Inverse Transform: Block' = T\u1d40 \u00d7 F' \u00d7 T");
      }

      if (p >= 100) {
        clearInterval(intervalRef.current);
        const dq = elementwiseMultiply(quantizedMatrix, quantTable);
        const T = generateBasisMatrix(transform);
        const spatial = inverseTransform(dq, T);
        const rounded = spatial.map((row) => row.map((v) => clamp(Math.round(v))));
        setReconstructedBlock(rounded);
        setStatus("Completed \u2713");
      }
    }, 140);
  };

  const diffMatrix =
    reconstructedBlock.length && originalBlock
      ? originalBlock.map((row, r) => row.map((v, c) => v - reconstructedBlock[r][c]))
      : [];

  const blockMSE = reconstructedBlock.length && originalBlock ? mse(originalBlock, reconstructedBlock) : null;
  const blockPSNR = blockMSE !== null ? psnr(blockMSE) : null;

  const toGrayscale = (v) => `rgb(${v},${v},${v})`;

  return (
    <div className="invContainer">
      <div className="invHeading">
        <h2>Step 9 : Inverse Transform & Reconstruction</h2>
        <p>
          Reconstruction reverses the compression pipeline. First, each quantized
          coefficient is dequantized by multiplying back with the same quantization
          table used in Step 6, recovering an approximation F'(u,v) of the original
          frequency coefficients. The inverse transform then maps F'(u,v) back into the
          spatial domain. Because the DCT/DST basis matrix T is orthogonal, its inverse
          is simply its transpose, so reconstruction uses Tᵀ × F' × T.
        </p>
      </div>

      {!hasInputs && (
        <div className="invWarning">
          Please complete Steps 6-8 for this block first, then return here.
        </div>
      )}

      <div className="formulaSection">
        <h3>Reconstruction Formulas</h3>
        <div className="formulaCard">
          <h2>F'(u,v) = Q(u,v) × T(u,v)</h2>
          <h2>Block' = Tᵀ × F' × T</h2>
          <p>The result is rounded and clipped to the valid pixel range [0, 255] to form the reconstructed spatial-domain block.</p>
        </div>
      </div>

      <div className="invControls">
        <button className="invButton" onClick={runReconstruction} disabled={!hasInputs}>
          {reconstructedBlock.length ? "Re-run Reconstruction" : "Run Dequantization + Inverse Transform"}
        </button>
        <div className="progressTrack">
          <div className="progressFill" style={{ width: `${progress}%` }}>{progress}%</div>
        </div>
        <p className="invStatus">{status}</p>
      </div>

      <div className="invMatricesGrid">
        <div className="matrixCard">
          <h3>Quantized Q(u,v)</h3>
          <div className="miniMatrix">
            {quantizedMatrix.length
              ? quantizedMatrix.flat().map((v, i) => <span key={i}>{v}</span>)
              : Array.from({ length: 64 }).map((_, i) => <span key={i} className="pendingCell">·</span>)}
          </div>
        </div>
        <div className="operator">→</div>
        <div className="matrixCard">
          <h3>Dequantized F'(u,v)</h3>
          <div className="miniMatrix">
            {dequantizedMatrix.length
              ? dequantizedMatrix.flat().map((v, i) => <span key={i}>{Number(v).toFixed(0)}</span>)
              : Array.from({ length: 64 }).map((_, i) => <span key={i} className="pendingCell">·</span>)}
          </div>
        </div>
        <div className="operator">→</div>
        <div className="matrixCard">
          <h3>Reconstructed Block</h3>
          <div className="miniMatrix">
            {reconstructedBlock.length
              ? reconstructedBlock.flat().map((v, i) => {
                  const r = Math.floor(i / 8);
                  const c = i % 8;
                  return (
                    <span
                      key={i}
                      onClick={() => setSelectedCell({ row: r, col: c })}
                      className={selectedCell.row === r && selectedCell.col === c ? "chosenCell" : ""}
                    >
                      {v}
                    </span>
                  );
                })
              : Array.from({ length: 64 }).map((_, i) => <span key={i} className="pendingCell">·</span>)}
          </div>
        </div>
      </div>

      <div className="invImagesRow">
        <div className="invImageCard">
          <h3>Original Block (8×8)</h3>
          <div className="invPixelGrid">
            {originalBlock
              ? originalBlock.flat().map((v, i) => <div key={i} style={{ background: toGrayscale(v) }} />)
              : Array.from({ length: 64 }).map((_, i) => <div key={i} className="invEmptyPixel" />)}
          </div>
        </div>
        <div className="invImageCard">
          <h3>Reconstructed Block (8×8)</h3>
          <div className="invPixelGrid">
            {reconstructedBlock.length
              ? reconstructedBlock.flat().map((v, i) => <div key={i} style={{ background: toGrayscale(v) }} />)
              : Array.from({ length: 64 }).map((_, i) => <div key={i} className="invEmptyPixel" />)}
          </div>
        </div>
        <div className="invImageCard">
          <h3>Difference (Error) Map</h3>
          <div className="invPixelGrid">
            {diffMatrix.length
              ? diffMatrix.flat().map((v, i) => (
                  <div key={i} style={{ background: `rgba(220,38,38,${Math.min(1, Math.abs(v) / 40)})` }} title={v} />
                ))
              : Array.from({ length: 64 }).map((_, i) => <div key={i} className="invEmptyPixel" />)}
          </div>
        </div>
      </div>

      <div className="currentCalculation">
        <h3>Selected Pixel — Interactive Panel</h3>
        <p>Row : <b>{selectedCell.row}</b>   Column : <b>{selectedCell.col}</b></p>
        <div className="mathSteps">
          <div className="mathStep">
            <span>Original</span>
            <b>{originalBlock ? originalBlock[selectedCell.row][selectedCell.col] : "\u2014"}</b>
          </div>
          <div className="mathStep">
            <span>Reconstructed</span>
            <b>{reconstructedBlock.length ? reconstructedBlock[selectedCell.row][selectedCell.col] : "\u2014"}</b>
          </div>
          <div className="mathStep highlight">
            <span>Error</span>
            <b>{diffMatrix.length ? diffMatrix[selectedCell.row][selectedCell.col] : "\u2014"}</b>
          </div>
        </div>
      </div>

      <div className="compressionSection">
        <h3>Block-Level Reconstruction Quality</h3>
        <div className="compressionGrid">
          <div className="compressionCard">
            <span className="statLabel">Mean Squared Error (MSE)</span>
            <span className="statValue">{blockMSE !== null ? blockMSE.toFixed(2) : "\u2014"}</span>
          </div>
          <div className="compressionCard">
            <span className="statLabel">PSNR</span>
            <span className="statValue">{blockPSNR !== null ? (blockPSNR === Infinity ? "\u221e dB" : `${blockPSNR.toFixed(2)} dB`) : "\u2014"}</span>
          </div>
          <div className="compressionCard">
            <span className="statLabel">Transform</span>
            <span className="statValue">{transform}</span>
          </div>
        </div>
      </div>

      <div className="observationCard">
        <h3>Research Explanation</h3>
        <ul>
          <li>Because the basis matrix T is orthonormal (T × Tᵀ = I), the inverse transform is exact in the absence of quantization — all reconstruction error originates from the rounding performed in Step 6.</li>
          <li>The difference (error) map above visualizes exactly where quantization removed information: brighter red cells indicate larger reconstruction error, typically at sharp edges or fine texture.</li>
          <li>Lower quality factors increase this error but also increase compression, illustrating the fundamental rate-distortion trade-off in transform coding.</li>
        </ul>
      </div>

      <div className="pipelineCard">
        <h2>Next Step Preview</h2>
        <p>Step 10 assembles the full 16×16 image from all four reconstructed blocks and presents a complete quantitative and visual comparison against the original image.</p>
        <div className="pipelineFlow">
          <div className="pipelineBox">Dequantization</div>
          <div className="pipelineOperator">→</div>
          <div className="pipelineBox">Inverse Transform</div>
          <div className="pipelineOperator">→</div>
          <div className="pipelineResult">Final Comparison</div>
        </div>
      </div>
    </div>
  );
}

export default InverseTransform;
