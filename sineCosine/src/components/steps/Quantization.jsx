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

  const [status, setStatus] = useState(quantizedMatrix && quantizedMatrix.length ? "Completed ✓" : "Waiting");
  const [progress, setProgress] = useState(quantizedMatrix && quantizedMatrix.length ? 100 : 0);
  const [currentRow, setCurrentRow] = useState(-1);
  const [currentCol, setCurrentCol] = useState(-1);
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const [hasRun, setHasRun] = useState(quantizedMatrix && quantizedMatrix.length ? true : false);
  const intervalRef = useRef(null);
  const prevKey = useRef(selectedBlock + "_" + transform);
  const prevQF = useRef(qualityFactor);

  useEffect(() => {
    if (!selectedMatrix) return;
    const T = generateBasisMatrix(transform);
    const block = extractBlock(selectedMatrix.data, selectedBlock);
    const F = forwardTransform(block, T).map((row) => row.map((v) => Number(v.toFixed(2))));
    setFrequencyMatrix(F);
    const key = selectedBlock + "_" + transform;
    if (prevKey.current === key) return;
    prevKey.current = key;
    setQuantizedMatrix([]);
    setStatus("Waiting");
    setProgress(0);
    setCurrentRow(-1);
    setCurrentCol(-1);
    setHasRun(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBlock, transform, selectedMatrix]);

  const currentFrequency =
    frequencyMatrix.length === 8
      ? frequencyMatrix
      : Array.from({ length: 8 }, () => Array(8).fill(0));

  const scaledQuantMatrix = buildQuantTable(qualityFactor);

  useEffect(() => {
    setQuantTable(scaledQuantMatrix);
    if (prevQF.current === qualityFactor) return;
    prevQF.current = qualityFactor;
    setQuantizedMatrix([]);
    setStatus("Waiting");
    setProgress(0);
    setCurrentRow(-1);
    setCurrentCol(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qualityFactor]);

  useEffect(() => () => intervalRef.current && clearInterval(intervalRef.current), []);

  const performQuantization = () => {
    if (hasRun) return;
    setHasRun(true);
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
  const selectedRounded = Math.round(selectedDivision);
  const selectedQuantized = quantizedMatrix.length ? quantizedMatrix[selectedCell.row][selectedCell.col] : null;

  const isBaseTable = JSON.stringify(scaledQuantMatrix) === JSON.stringify(baseQuantizationTable);

  // -------- Coefficient calculation timeline (same pattern as Steps 3 & 4) --------
  const quantSteps = () => [
    {
      label: "Formula",
      node: <>Q(u,v) = Round( F(u,v) / T(u,v) )</>
    },
    {
      label: "Selected position",
      node: <>u = <b>{selectedCell.row}</b>, v = <b>{selectedCell.col}</b></>
    },
    {
      label: "Substitute & divide",
      node: <>F(u,v) = <b>{Number(selectedF).toFixed(2)}</b>, T(u,v) = <b>{selectedT}</b> &nbsp;→&nbsp; {Number(selectedF).toFixed(2)} ÷ {selectedT} = <b>{selectedDivision.toFixed(3)}</b></>
    },
    {
      label: "Round to nearest integer",
      node: <>Round({selectedDivision.toFixed(3)}) = <b>{selectedRounded}</b> &nbsp;→&nbsp; Q(u,v) = <b>{selectedRounded}</b></>,
      isResult: true
    }
  ];

  const quantTimelineSteps = quantSteps();

  const [calcStep, setCalcStep] = useState(quantTimelineSteps.length);

  useEffect(() => {
    setCalcStep(quantTimelineSteps.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCell, frequencyMatrix, scaledQuantMatrix]);

  const playCalc = () => {
    setCalcStep(0);
    let s = 0;
    const total = quantTimelineSteps.length;
    const interval = setInterval(() => {
      s++;
      setCalcStep(s);
      if (s >= total) clearInterval(interval);
    }, 700);
  };

  const fastForwardCalc = () => {
    setCalcStep(quantTimelineSteps.length);
  };

  return (
    <div className="quantContainer">
      <div className="quantHeading">
        <h2>Quantization</h2>
        <p>
          Each frequency coefficient F(u,v) is divided by a quality-scaled
          quantization step T(u,v) and rounded, removing perceptually minor detail.
        </p>
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
          disabled={hasRun}
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
        <button className="quantButton" onClick={performQuantization} disabled={hasRun}>
          Perform Quantization
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
        <div className="calcHeaderRow">
          <h3>Selected Coefficient Calculation</h3>
          <span className="calcCellBadge">u = {selectedCell.row}, v = {selectedCell.col}</span>
        </div>

        <div className="playControls">
          <button className="calcPlayBtn" onClick={playCalc}>▶ Play</button>
          <button className="calcPlayBtn calcFastForward" onClick={fastForwardCalc}>⚡ Show All</button>
        </div>

        <div className="calcTimeline">
          {quantTimelineSteps.slice(0, calcStep).map((step, i) => (
            <div key={i} className={step.isResult ? "calcTimelineItem calcResultItem" : "calcTimelineItem"}>
              <div className="calcStepBadge">{step.isResult ? "✓" : i + 1}</div>
              <div className="calcStepBody">
                <div className="calcStepLabel">{step.label}</div>
                <div className="calcStepExpr">{step.node}</div>
              </div>
            </div>
          ))}
        </div>

        {selectedQuantized === null && (
          <p className="calcHint">Click &quot;Perform Quantization&quot; above to also reveal this coefficient in the Quantized Matrix.</p>
        )}
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

    </div>
  );
}

export default Quantization;
