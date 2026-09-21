import "./TransformComputation.css";
import React, { useState, useEffect, useRef } from "react";
import { useMatrix } from "../../context/MatrixContext";

function TransformComputation() {

  const {
    selectedMatrix,
    frequencyMatrix,
    setFrequencyMatrix,
    transform,
    selectedBlock
  } = useMatrix();

  const [progress, setProgress] = useState(frequencyMatrix && frequencyMatrix.length ? 100 : 0);
  const [status, setStatus] = useState(frequencyMatrix && frequencyMatrix.length ? "Completed ✓" : "Waiting");
  const [step, setStep] = useState(frequencyMatrix && frequencyMatrix.length ? 4 : 0);
  const [hasRun, setHasRun] = useState(frequencyMatrix && frequencyMatrix.length ? true : false);

  const [selectedCoefficient, setSelectedCoefficient] = useState({ u: 0, v: 0 });
  const u = selectedCoefficient.u;
  const v = selectedCoefficient.v;

  const [coeffCalcStep, setCoeffCalcStep] = useState(4);

  const selectedValue = frequencyMatrix.length ? Number(frequencyMatrix[u][v]).toFixed(2) : 0;

  const maxCoefficient = frequencyMatrix.length
    ? Math.max(...frequencyMatrix.flat().map(v => Math.abs(v)))
    : 1;

  let maxRow = -1, maxCol = -1;
  if (frequencyMatrix.length) {
    frequencyMatrix.forEach((row, ri) => {
      row.forEach((val, ci) => {
        if (Math.abs(val) === maxCoefficient) {
          maxRow = ri;
          maxCol = ci;
        }
      });
    });
  }

  const calculateEnergy = () => {
    if (!frequencyMatrix.length) {
      return { dc: 0, low: 0, medium: 0, high: 0 };
    }
    let dc = 0, low = 0, medium = 0, high = 0, total = 0;
    frequencyMatrix.forEach((row, u) => {
      row.forEach((value, v) => {
        const energyVal = value * value;
        total += energyVal;
        if (u === 0 && v === 0) dc += energyVal;
        else if (u + v <= 3) low += energyVal;
        else if (u + v <= 7) medium += energyVal;
        else high += energyVal;
      });
    });
    return {
      dc: ((dc / total) * 100).toFixed(1),
      low: ((low / total) * 100).toFixed(1),
      medium: ((medium / total) * 100).toFixed(1),
      high: ((high / total) * 100).toFixed(1)
    };
  };

  const energy = calculateEnergy();

  const getEnergyLevel = (value) => {
    const ratio = Math.abs(value) / maxCoefficient;
    if (ratio >= 0.75) return "energyVeryHigh";
    if (ratio >= 0.50) return "energyHigh";
    if (ratio >= 0.25) return "energyMedium";
    if (ratio >= 0.10) return "energyLow";
    return "energyVeryLow";
  };

  if (!selectedMatrix) return null;

  // -------- Select Current 8×8 Block --------
  let rowStart = 0;
  let colStart = 0;

  switch (selectedBlock) {
    case 1: rowStart = 0; colStart = 0; break;
    case 2: rowStart = 0; colStart = 8; break;
    case 3: rowStart = 8; colStart = 0; break;
    case 4: rowStart = 8; colStart = 8; break;
    default: rowStart = 0; colStart = 0;
  }

  const imageBlock = selectedMatrix.data
    .slice(rowStart, rowStart + 8)
    .map(row => row.slice(colStart, colStart + 8));

  const N = 8;

  const generateBasisMatrix = () => {
    const matrix = [];
    for (let u = 0; u < N; u++) {
      const row = [];
      for (let x = 0; x < N; x++) {
        let value;
        if (transform === "DCT") {
          const alpha = u === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N);
          value = alpha * Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N));
        } else {
          value = Math.sqrt(2 / (N + 1)) * Math.sin(((u + 1) * (x + 1) * Math.PI) / (N + 1));
        }
        row.push(Number(value.toFixed(4)));
      }
      matrix.push(row);
    }
    return matrix;
  };

  const [basisMatrix, setBasisMatrix] = useState([]);

  useEffect(() => {
    setBasisMatrix(generateBasisMatrix());
  }, [transform]);

  const transpose = (matrix) => matrix[0].map((_, col) => matrix.map(row => row[col]));

  const multiply = (A, B) => {
    const result = [];
    for (let i = 0; i < A.length; i++) {
      result[i] = [];
      for (let j = 0; j < B[0].length; j++) {
        let sum = 0;
        for (let k = 0; k < B.length; k++) sum += A[i][k] * B[k][j];
        result[i][j] = sum;
      }
    }
    return result;
  };

  const prevKey = useRef(selectedBlock + "_" + transform);

  useEffect(() => {
    const key = selectedBlock + "_" + transform;
    if (prevKey.current === key) return;
    prevKey.current = key;
    setFrequencyMatrix([]);
    setProgress(0);
    setStatus("Waiting");
    setStep(0);
    setHasRun(false);
    setSelectedCoefficient({ u: 0, v: 0 });
  }, [selectedBlock, transform]);

  const performTransform = () => {
    if (hasRun) return;
    setHasRun(true);
    setProgress(0);
    setStatus("Computing C × A");
    setStep(1);
    setFrequencyMatrix([]);

    let p = 0;
    const interval = setInterval(() => {
      p += 5;
      setProgress(p);

      if (p === 35) {
        setStatus("Computing (C × A) × Cᵀ");
        setStep(2);
      }
      if (p === 70) {
        setStatus("Generating Frequency Matrix");
        setStep(3);
      }
      if (p >= 100) {
        clearInterval(interval);
        setProgress(100);
        setStatus("Completed ✓");
        setStep(4);

        const T = basisMatrix;
        const TT = transpose(T);
        const first = multiply(T, imageBlock);
        const second = multiply(first, TT).map(row => row.map(value => Number(value.toFixed(2))));

        const revealMatrix = Array.from({ length: 8 }, () => Array(8).fill(null));
        setFrequencyMatrix(revealMatrix.map(r => [...r]));

        let ru = 0, rx = 0;
        const revealInterval = setInterval(() => {
          revealMatrix[ru][rx] = second[ru][rx];
          setFrequencyMatrix(revealMatrix.map(r => [...r]));
          rx++;
          if (rx >= 8) { rx = 0; ru++; }
          if (ru >= 8) clearInterval(revealInterval);
        }, 35);
      }
    }, 80);
  };

  const intermediateMatrix = basisMatrix.length && imageBlock.length
    ? multiply(basisMatrix, imageBlock)
    : [];

  const calcTerms = intermediateMatrix.length
    ? intermediateMatrix[u].map((val, y) => ({
        a: val,
        b: basisMatrix[v][y],
        p: val * basisMatrix[v][y]
      }))
    : [];

  const calcSum = calcTerms.reduce((s, t) => s + t.p, 0);

  const transposeMatrix = basisMatrix.length
    ? basisMatrix[0].map((_, col) => basisMatrix.map(row => row[col]))
    : [];

  const basisSymbol = transform === "DCT" ? "C" : "S";
  const transposeSymbol = transform === "DCT" ? "Cᵀ" : "Sᵀ";

  // -------- Coefficient calculation timeline (same pattern as Step 3) --------
  const coeffSteps = () => [
    {
      label: "Formula",
      node: <>F(u,v) = Σ (C×A)[u,k] × {basisSymbol}[v,k], for k = 0…7</>
    },
    {
      label: "Selected position",
      node: <>u = <b>{u}</b>, v = <b>{v}</b></>
    },
    {
      label: "Multiply matching terms",
      node: (
        <div className="multiplyRow">
          {calcTerms.map((t, i) => (
            <span key={i} className="multiplyChip">
              {i > 0 && <span className="plusSign">+</span>}
              ({t.a.toFixed(2)}×{t.b.toFixed(2)})
            </span>
          ))}
        </div>
      )
    },
    {
      label: "Sum all products",
      node: <>Σ = <b>{calcSum.toFixed(2)}</b></>,
      isResult: true
    }
  ];

  const coeffTimelineSteps = coeffSteps();

  useEffect(() => {
    setCoeffCalcStep(coeffTimelineSteps.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [u, v, transform, selectedBlock, frequencyMatrix]);

  const playCoeffCalc = () => {
    setCoeffCalcStep(0);
    let s = 0;
    const total = coeffTimelineSteps.length;
    const interval = setInterval(() => {
      s++;
      setCoeffCalcStep(s);
      if (s >= total) clearInterval(interval);
    }, 700);
  };

  const fastForwardCoeffCalc = () => {
    setCoeffCalcStep(coeffTimelineSteps.length);
  };

  return (
    <div className="transformContainer">

      <div className="transformHeading">
        <h2>Transform Computation</h2>
        <p>
          Apply the selected transform (DCT/DST) on the selected
          8 × 8 image block to generate frequency coefficients.
        </p>
        <div className="formulaDisplay">
          <h2>{transform === "DCT" ? "F = C × A × Cᵀ" : "F = S × A × Sᵀ"}</h2>
        </div>
      </div>

      <div className="transformLayout">

        <div className="matrixCard">
          <h3>Basis Matrix ({basisSymbol})</h3>
          <div className="miniMatrix">
            {basisMatrix.map((row, rowIndex) =>
              row.map((value, colIndex) => (
                <span key={rowIndex + "-" + colIndex} title={value}>{value}</span>
              ))
            )}
          </div>
        </div>

        <div className="operator">×</div>

        <div className="matrixCard">
          <h3>Selected Block (A)</h3>
          <div className="miniMatrix">
            {imageBlock.map((row, rowIndex) =>
              row.map((value, colIndex) => (
                <span key={rowIndex + "-" + colIndex}>{value}</span>
              ))
            )}
          </div>
        </div>

        <div className="operator">×</div>

        <div className="matrixCard">
          <h3>Transpose Matrix ({transposeSymbol})</h3>
          <div className="miniMatrix">
            {transposeMatrix.map((row, rowIndex) =>
              row.map((value, colIndex) => (
                <span key={rowIndex + "-" + colIndex} title={value}>{value}</span>
              ))
            )}
          </div>
        </div>

      </div>

      <div className="matrixAnimationCard">
        <div className="matrixAnimation">
          <div className={step >= 1 ? "miniMatrixBox miniActiveMatrix" : "miniMatrixBox"}>{basisSymbol}</div>
          <div className="matrixOperator">×</div>
          <div className={step >= 1 ? "miniMatrixBox miniActiveMatrix" : "miniMatrixBox"}>A</div>
          <div className="matrixOperator">=</div>
          <div className={step >= 2 ? "miniMatrixBox miniActiveMatrix" : "miniMatrixBox"}>{basisSymbol}A</div>
          <div className="matrixOperator">×</div>
          <div className={step >= 3 ? "miniMatrixBox miniActiveMatrix" : "miniMatrixBox"}>{transposeSymbol}</div>
          <div className="matrixOperator">=</div>
          <div className={step >= 4 ? "matrixResult activeResult" : "matrixResult"}>F</div>
        </div>
      </div>

      <div className="frequencyCard">
        <h3>Frequency Coefficient Matrix (F)</h3>

        <div className="freqGrid">
          <div className="freqCorner"></div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={"fh" + i} className="freqHeader">v={i}</div>
          ))}

          {(frequencyMatrix.length > 0 ? frequencyMatrix : Array.from({ length: 8 }, () => Array(8).fill(null))).map((row, rowIndex) => (
            <React.Fragment key={rowIndex}>
              <div className="freqHeader">u={rowIndex}</div>
              {row.map((value, colIndex) => (
                <span
                  key={(value === null ? "blank-" : "filled-") + rowIndex + "-" + colIndex}
                  onClick={() => { if (value !== null) setSelectedCoefficient({ u: rowIndex, v: colIndex }); }}
                  className={
                    value === null
                      ? "frequencyBlankCell"
                      : `${getEnergyLevel(value)}${rowIndex === maxRow && colIndex === maxCol ? " maxCoefficientCell" : ""}${selectedCoefficient.u === rowIndex && selectedCoefficient.v === colIndex ? " activeCoefficient" : ""}`
                  }
                >
                  {value === null ? "" : Number(value).toFixed(2)}
                </span>
              ))}
            </React.Fragment>
          ))}
        </div>

        <button className="transformButton" disabled={hasRun} onClick={performTransform}>
          Perform Transform
        </button>
      </div>

      <div className="coefficientCard">
        <h3>Selected Frequency Coefficient</h3>
        <h2>F({selectedCoefficient.u}, {selectedCoefficient.v})</h2>
        <h1>{frequencyMatrix.length > 0 ? Number(frequencyMatrix[selectedCoefficient.u][selectedCoefficient.v]).toFixed(2) : 0}</h1>
        <p>
          {selectedCoefficient.u === 0 && selectedCoefficient.v === 0
            ? "DC Coefficient (Average intensity of image block)"
            : "AC Coefficient"}
        </p>
      </div>

      <div className="calculationPanel">
        <div className="calcHeaderRow">
          <h3>Coefficient Calculation</h3>
          <span className="calcCellBadge">u = {u}, v = {v}</span>
        </div>

        <div className="playControls">
          <button className="calcPlayBtn" onClick={playCoeffCalc}>▶ Play</button>
          <button className="calcPlayBtn calcFastForward" onClick={fastForwardCoeffCalc}>⏩ Show All</button>
        </div>

        <div className="calcTimeline">
          {coeffTimelineSteps.slice(0, coeffCalcStep).map((s, i) => (
            <div key={i} className={s.isResult ? "calcTimelineItem calcResultItem" : "calcTimelineItem"}>
              <div className="calcStepBadge">{s.isResult ? "✓" : i + 1}</div>
              <div className="calcStepBody">
                <div className="calcStepLabel">{s.label}</div>
                <div className="calcStepExpr">{s.node}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="largestCoeffCard">
        <h3>Largest Frequency Coefficient</h3>
        <h1>{maxCoefficient.toFixed(2)}</h1>
        <p>Usually located near the DC region and contains maximum image energy.</p>
      </div>

      <div className="dcAcCard">
        <h3>DC vs AC Components</h3>
        <div className="dcAcGrid">
          <div>
            <h4>DC Coefficient</h4>
            <h2>{frequencyMatrix.length ? Number(frequencyMatrix[0][0]).toFixed(2) : "0.00"}</h2>
            <p className="dcAcNote">Average intensity value</p>
          </div>
          <div>
            <h4>AC Coefficients</h4>
            <h2>63</h2>
            <p className="dcAcNote">Remaining frequency values</p>
          </div>
        </div>
      </div>

      <div className="compressionInsight">
        <h3>Compression Insight</h3>
        <ul>
          <li>Low-frequency coefficients preserve image quality.</li>
          <li>High-frequency coefficients carry edge details.</li>
          <li>JPEG mainly removes high-frequency coefficients.</li>
          <li>Compression occurs after quantization.</li>
        </ul>
      </div>

      <div className="energyLegend">
        <div><span className="legend veryHigh"></span>Very High</div>
        <div><span className="legend high"></span>High</div>
        <div><span className="legend medium"></span>Medium</div>
        <div><span className="legend low"></span>Low</div>
        <div><span className="legend veryLow"></span>Very Low</div>
      </div>

      <div className="energyCard">
        <h3>Frequency Energy Distribution</h3>
        <div className="energyGrid">
          {frequencyMatrix.flat().map((value, index) => (
            <div key={index} className={getEnergyLevel(value)}></div>
          ))}
        </div>
        <p>Brighter cells indicate coefficients carrying higher image energy.</p>
      </div>

      <div className="energyDistribution">
        <h3>Energy Compaction</h3>
        <div className="energyBar">
          <div className="dcBar" style={{ width: `${energy.dc}%` }}></div>
          <div className="lowBar" style={{ width: `${energy.low}%` }}></div>
          <div className="mediumBar" style={{ width: `${energy.medium}%` }}></div>
          <div className="highBar" style={{ width: `${energy.high}%` }}></div>
        </div>
        <div className="energyLabels">
          <span>DC<br /><b>{energy.dc}%</b></span>
          <span>Low<br /><b>{energy.low}%</b></span>
          <span>Medium<br /><b>{energy.medium}%</b></span>
          <span>High<br /><b>{energy.high}%</b></span>
        </div>
        <p>Most image energy remains concentrated inside the DC and Low-frequency coefficients after transform.</p>
      </div>

      <div className="jpegObservation">
        <h3>JPEG Observation</h3>
        <ul>
          <li>DC coefficient contains maximum image energy.</li>
          <li>Most image information is concentrated in low frequencies.</li>
          <li>High-frequency coefficients are usually close to zero.</li>
          <li>JPEG removes many high-frequency values during quantization.</li>
        </ul>
      </div>

      <div className="researchNote">
        <h3>Research Interpretation</h3>
        <p>
          Each frequency coefficient is calculated by multiplying one row of the <b>{transform} Basis Matrix</b> with the selected <b>8 × 8 Image Block</b> and one column of the <b>Transpose Basis Matrix</b>, using double summation.
        </p>
        <p>
          The selected coefficient <b>F({u}, {v})</b> represents the contribution of one particular spatial frequency inside the image block.
        </p>
      </div>

      <div className="frequencyTypeCard">
        <h3>Frequency Band</h3>
        <p>
          {selectedCoefficient.u + selectedCoefficient.v <= 2
            ? "Low Frequency"
            : selectedCoefficient.u + selectedCoefficient.v <= 8
            ? "Medium Frequency"
            : "High Frequency"}
        </p>
      </div>

      <div className="coefficientExplanation">
        {selectedCoefficient.u === 0 && selectedCoefficient.v === 0
          ? "The DC coefficient stores the average brightness of the entire image block. It usually contains the largest amount of image energy."
          : selectedCoefficient.u + selectedCoefficient.v <= 2
          ? "Low-frequency coefficients describe smooth intensity changes. JPEG preserves these values after quantization."
          : selectedCoefficient.u + selectedCoefficient.v <= 8
          ? "Medium-frequency coefficients represent texture and moderate image details."
          : "High-frequency coefficients represent sharp edges and fine image details. These are usually compressed aggressively."}
      </div>

    </div>
  );
}

export default TransformComputation;
