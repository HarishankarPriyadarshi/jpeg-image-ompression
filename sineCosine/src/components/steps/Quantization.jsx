import "./Quantization.css";
import { useEffect, useRef, useState } from "react";
import { useMatrix } from "../../context/MatrixContext";
import {
  generateBasisMatrix,
  forwardTransform,
  extractBlock,
  buildQuantTable,
  baseQuantizationTable,
} from "../../utils/transformUtils";

function Quantization() {
  const {
    selectedMatrix,
    frequencyMatrix,
    setFrequencyMatrix,
    transform,
    setTransform,
    selectedBlock,
    setSelectedBlock,
    qualityFactor,
    setQualityFactor,
    setQuantTable,
    quantizedMatrix,
    setQuantizedMatrix,
  } = useMatrix();

  const [status, setStatus] = useState("Waiting");
  const [progress, setProgress] = useState(0);
  const [currentRow, setCurrentRow] = useState(-1);
  const [currentCol, setCurrentCol] = useState(-1);
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!selectedMatrix) return;
    const T = generateBasisMatrix(transform);
    const block = extractBlock(selectedMatrix.data, selectedBlock);
    const F = forwardTransform(block, T).map((row) => row.map((v) => Number(v.toFixed(2))));
    setFrequencyMatrix(F);
    setQuantizedMatrix([]);
    setStatus("Waiting");
    setProgress(0);
    setCurrentRow(-1);
    setCurrentCol(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBlock, transform, selectedMatrix]);

  const currentFrequency =
    frequencyMatrix.length === 8
      ? frequencyMatrix
      : Array.from({ length: 8 }, () => Array(8).fill(0));

  const scaledQuantMatrix = buildQuantTable(qualityFactor);

  useEffect(() => {
    setQuantTable(scaledQuantMatrix);
    setQuantizedMatrix([]);
    setStatus("Waiting");
    setProgress(0);
    setCurrentRow(-1);
    setCurrentCol(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qualityFactor]);

  useEffect(() => () => intervalRef.current && clearInterval(intervalRef.current), []);

  const performQuantization = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    setStatus("Performing Quantization...");
    setProgress(0);
    setQuantizedMatrix([]);

    const matrix = Array.from({ length: 8 }, () => Array(8).fill(null));
    let row = 0;
    let col = 0;

    intervalRef.current = setInterval(() => {
      setCurrentRow(row);
      setCurrentCol(col);

      matrix[row][col] = Math.round(currentFrequency[row][col] / scaledQuantMatrix[row][col]);
      setQuantizedMatrix(matrix.map((r) => [...r]));

      const completed = row * 8 + col + 1;
      setProgress(Math.round((completed / 64) * 100));

      col++;
      if (col === 8) {
        col = 0;
        row++;
      }
      if (row === 8) {
        clearInterval(intervalRef.current);
        setStatus("Completed \u2713");
        setCurrentRow(-1);
        setCurrentCol(-1);
      }
    }, 55);
  };

  const flatQuantized = quantizedMatrix.length ? quantizedMatrix.flat() : [];
  const totalCoeff = 64;
  const zeroCount = flatQuantized.filter((v) => v === 0).length;
  const nonZeroCount = flatQuantized.length ? flatQuantized.length - zeroCount : 0;
  const zeroPercent = flatQuantized.length ? ((zeroCount / totalCoeff) * 100).toFixed(1) : "0.0";

  const originalBits = totalCoeff * 8;
  const nonZeroBits = flatQuantized.length ? nonZeroCount * 8 : totalCoeff * 8;
  const compressionRatio = flatQuantized.length ? (originalBits / Math.max(nonZeroBits, 8)).toFixed(2) : "1.00";
  const infoRemovedPercent = flatQuantized.length ? Number(zeroPercent) : 0;

  const selectedF = currentFrequency[selectedCell.row][selectedCell.col];
  const selectedT = scaledQuantMatrix[selectedCell.row][selectedCell.col];
  const selectedDivision = selectedF / selectedT;
  const selectedQuantized = quantizedMatrix.length ? quantizedMatrix[selectedCell.row][selectedCell.col] : null;

  const isBaseTable = JSON.stringify(scaledQuantMatrix) === JSON.stringify(baseQuantizationTable);

  return (
    <div className="quantContainer">
      <div className="quantHeading">
        <h2>Step 6 : Quantization</h2>
        <p>
          Quantization is the lossy stage of transform coding. Every frequency-domain
          coefficient F(u,v) produced in Step 5 is divided by a corresponding weight
          T(u,v) from a quantization table and rounded to the nearest integer. Because
          human perception is far less sensitive to high-frequency detail than to
          low-frequency structure, T(u,v) is designed to weight high frequencies far
          more heavily, driving many of them to zero and enabling data compression
          with minimal perceptual loss.
        </p>
      </div>

      <div className="topControls">
        <div className="controlCard">
          <h3>Transform</h3>
          <div className="toggleButtons">
            <button className={transform === "DCT" ? "activeBtn" : ""} onClick={() => setTransform("DCT")}>DCT</button>
            <button className={transform === "DST" ? "activeBtn" : ""} onClick={() => setTransform("DST")}>DST</button>
          </div>
        </div>

        <div className="controlCard">
          <h3>Processing Block</h3>
          <div className="blockButtons">
            {[1, 2, 3, 4].map((block) => (
              <button
                key={block}
                className={selectedBlock === block ? "activeBtn" : ""}
                onClick={() => setSelectedBlock(block)}
              >
                B{block}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="qualityCard">
        <h3>Quality Factor</h3>
        <input
          type="range"
          min="10"
          max="100"
          step="10"
          value={qualityFactor}
          onChange={(e) => setQualityFactor(Number(e.target.value))}
        />
        <div className="qfMarks">
          {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((q) => (
            <span key={q} className={qualityFactor === q ? "qfMarkActive" : ""}>Q{q}</span>
          ))}
        </div>
        <h2>Q = {qualityFactor}</h2>
        <p>
          {qualityFactor <= 30
            ? "High Compression \u2014 aggressive scaling, more coefficients rounded to zero."
            : qualityFactor <= 70
            ? "Balanced Compression \u2014 moderate step sizes, typical operating point."
            : "High Image Quality \u2014 fine step sizes, fewer coefficients removed."}
        </p>
        <div className="qfNote">
          {isBaseTable
            ? "Currently using the unscaled base quantization table (Q = 50 reference point)."
            : `Base table entries are ${qualityFactor < 50 ? "scaled up" : "scaled down"} using scale = ${
                qualityFactor < 50 ? (5000 / qualityFactor).toFixed(0) : (200 - qualityFactor * 2).toFixed(0)
              } / 100.`}
        </div>
      </div>

      <div className="quantLayout">
        <div className="matrixCard">
          <h3>Frequency Matrix F(u,v)</h3>
          <div className="miniMatrix">
            {currentFrequency.flat().map((value, index) => (
              <span
                key={index}
                className={currentRow === Math.floor(index / 8) && currentCol === index % 8 ? "activeCell" : ""}
              >
                {Number(value).toFixed(1)}
              </span>
            ))}
          </div>
        </div>

        <div className="operator">÷</div>

        <div className="matrixCard">
          <h3>Quantization Table T(u,v)</h3>
          <div className="miniMatrix">
            {scaledQuantMatrix.flat().map((value, index) => (
              <span
                key={index}
                className={currentRow === Math.floor(index / 8) && currentCol === index % 8 ? "activeCell" : ""}
              >
                {value}
              </span>
            ))}
          </div>
        </div>

        <div className="operator">=</div>

        <div className="matrixCard">
          <h3>Quantized Matrix Q(u,v)</h3>
          <div className="miniMatrix">
            {quantizedMatrix.length === 0
              ? Array.from({ length: 64 }).map((_, index) => <span key={index} className="pendingCell">·</span>)
              : quantizedMatrix.flat().map((value, index) => {
                  const r = Math.floor(index / 8);
                  const c = index % 8;
                  return (
                    <span
                      key={index}
                      onClick={() => setSelectedCell({ row: r, col: c })}
                      className={
                        (currentRow === r && currentCol === c ? "generatedCell " : "") +
                        (value === 0 ? "zeroCell " : "") +
                        (selectedCell.row === r && selectedCell.col === c ? "chosenCell" : "")
                      }
                    >
                      {value}
                    </span>
                  );
                })}
          </div>
        </div>
      </div>

      <div className="progressCard">
        <h3>Quantization Status</h3>
        <p>
          {status}
          <br />
          <small>{currentRow === -1 ? "Waiting" : `Processing Cell : (${currentRow},${currentCol})`}</small>
        </p>
        <div className="progressTrack">
          <div className="progressFill" style={{ width: `${progress}%` }}>{progress}%</div>
        </div>
        <button className="quantButton" onClick={performQuantization}>
          {quantizedMatrix.length ? "Re-run Quantization" : "Perform Quantization"}
        </button>
      </div>

      <div className="formulaSection">
        <h3>Quantization Formula</h3>
        <div className="formulaCard">
          <h2>Q(u,v) = Round( F(u,v) / T(u,v) )</h2>
          <p><b>F(u,v)</b> → Frequency coefficient from the transform stage</p>
          <p><b>T(u,v)</b> → Quality-scaled quantization step size</p>
          <p><b>Q(u,v)</b> → Quantized (compressed) coefficient</p>
          <hr />
          <p>
            Each transform coefficient is divided by its corresponding quantization step
            and rounded to the nearest integer, discarding the fractional remainder.
            This rounding is the source of the information loss in transform coding.
          </p>
        </div>
      </div>

      <div className="currentCalculation">
        <h3>Selected Coefficient — Interactive Panel</h3>
        <p>Row (u) : <b>{selectedCell.row}</b>   Column (v) : <b>{selectedCell.col}</b></p>
        <div className="mathSteps">
          <div className="mathStep"><span>F(u,v)</span><b>{Number(selectedF).toFixed(2)}</b></div>
          <div className="mathStep"><span>T(u,v)</span><b>{selectedT}</b></div>
          <div className="mathStep"><span>Division</span><b>{selectedDivision.toFixed(3)}</b></div>
          <div className="mathStep"><span>Round( )</span><b>{Math.round(selectedDivision)}</b></div>
          <div className="mathStep highlight">
            <span>Q(u,v)</span>
            <b>{selectedQuantized !== null ? selectedQuantized : "Run quantization \u2192"}</b>
          </div>
        </div>
      </div>

      <div className="zeroStatsSection">
        <h3>Zero Coefficient Visualization</h3>
        <div className="zeroStatsGrid">
          <div className="zeroStatCard zeroCard">
            <span className="statLabel">Zero Coefficients</span>
            <span className="statValue">{zeroCount}</span>
          </div>
          <div className="zeroStatCard nonZeroCard">
            <span className="statLabel">Non-Zero Coefficients</span>
            <span className="statValue">{nonZeroCount}</span>
          </div>
          <div className="zeroStatCard percentCard">
            <span className="statLabel">Zero Percentage</span>
            <span className="statValue">{zeroPercent}%</span>
          </div>
        </div>
        <div className="zeroBarTrack">
          <div className="zeroBarFill" style={{ width: `${zeroPercent}%` }} />
        </div>
        <p className="zeroBarCaption">Proportion of the 64 coefficients rounded to zero (green cells above).</p>
      </div>

      <div className="compressionSection">
        <h3>Compression Analysis</h3>
        <div className="compressionGrid">
          <div className="compressionCard">
            <span className="statLabel">Estimated Compression Ratio</span>
            <span className="statValue">{compressionRatio} : 1</span>
          </div>
          <div className="compressionCard">
            <span className="statLabel">Information Removed</span>
            <span className="statValue">{infoRemovedPercent}%</span>
          </div>
          <div className="compressionCard">
            <span className="statLabel">Information Retained</span>
            <span className="statValue">{(100 - infoRemovedPercent).toFixed(1)}%</span>
          </div>
        </div>
        <div className="compressionChart">
          <div className="chartBarGroup">
            <div className="chartBar" style={{ height: "100%" }}><span>64</span></div>
            <label>Before Quantization</label>
          </div>
          <div className="chartBarGroup">
            <div
              className="chartBar chartBarAfter"
              style={{ height: `${Math.max(4, (nonZeroCount / 64) * 100)}%` }}
            >
              <span>{nonZeroCount || "\u2014"}</span>
            </div>
            <label>Non-Zero After Quantization</label>
          </div>
        </div>
      </div>

      <div className="observationCard">
        <h3>Research Insights & Educational Observations</h3>
        <ul>
          <li><b>Why high frequencies vanish:</b> the quantization table assigns large step sizes to high (u,v) indices, so small high-frequency coefficients divide down toward zero and round away.</li>
          <li><b>How compression is achieved:</b> long runs of zero coefficients (visible above) compress extremely well under run-length and entropy coding in the next stages.</li>
          <li><b>Why visual quality remains acceptable:</b> most of a natural image's energy is concentrated in the low-frequency (top-left) coefficients, which this table preserves with fine step sizes.</li>
          <li><b>Transform-coding generality:</b> this quantize-then-entropy-code strategy applies to any orthogonal transform (DCT, DST, Walsh-Hadamard, wavelets); it is a general transform-coding principle, not tied to one file format.</li>
          <li><b>Trade-off:</b> lowering the quality factor increases the compression ratio but also increases reconstruction error, quantified later using PSNR in Step 10.</li>
        </ul>
      </div>

      <div className="pipelineCard">
        <h2>Next Step Preview</h2>
        <p>After quantization, the coefficient matrix is rearranged into a 1-D sequence using the Zig-Zag scanning process, grouping the zero coefficients together for efficient encoding.</p>
        <div className="pipelineFlow">
          <div className="pipelineBox">Frequency Matrix</div>
          <div className="pipelineOperator">→</div>
          <div className="pipelineBox">Quantization</div>
          <div className="pipelineOperator">→</div>
          <div className="pipelineResult">Zig-Zag Scan</div>
        </div>
      </div>
    </div>
  );
}

export default Quantization;
