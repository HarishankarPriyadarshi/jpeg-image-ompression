import { useRef, useEffect, useState } from "react";
import "./InputImage.css";
import { useMatrix } from "../../context/MatrixContext";

function createMatrix(type) {
  const matrix = [];
  for (let i = 0; i < 16; i++) {
    const row = [];
    for (let j = 0; j < 16; j++) {
      let value = 0;
      switch (type) {
        case "smooth":
          value = Math.min(255, 40 + i * 8 + j * 4);
          break;
        case "edge":
          value = j < 8 ? 40 : 220;
          break;
        case "gradient":
          value = Math.min(255, i * 16 + j * 8);
          break;
        case "texture":
          value = (i + j) % 2 === 0 ? 60 : 200;
          break;
        default:
          value = 0;
      }
      row.push(value);
    }
    matrix.push(row);
  }
  return matrix;
}

const predefinedMatrices = [
  { name: "Smooth Matrix", type: "Smooth Region", description: "Slow intensity variation", preview: "smooth", data: createMatrix("smooth") },
  { name: "Edge Matrix", type: "Vertical Edge", description: "Sharp brightness transition", preview: "edge", data: createMatrix("edge") },
  { name: "Texture Matrix", type: "Texture Pattern", description: "Repeated intensity pattern", preview: "texture", data: createMatrix("texture") },
  { name: "Gradient Matrix", type: "Gradient", description: "Gradual brightness change", preview: "gradient", data: createMatrix("gradient") },
];

function InputImage() {
  const { selectedMatrix, setSelectedMatrix } = useMatrix();
  const canvasRef = useRef(null);
  const [rolling, setRolling] = useState(false);
  const [previewNum, setPreviewNum] = useState(0);

  useEffect(() => {
    if (!selectedMatrix || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const cell = 32;
    ctx.clearRect(0, 0, 512, 512);
    selectedMatrix.data.forEach((row, r) => {
      row.forEach((value, c) => {
        ctx.fillStyle = `rgb(${value},${value},${value})`;
        ctx.fillRect(c * cell, r * cell, cell, cell);
      });
    });
  }, [selectedMatrix]);

  const generateRandomMatrix = () => {
    setRolling(true);
    let ticks = 0;
    const shuffle = setInterval(() => {
      ticks++;
      setPreviewNum(Math.floor(Math.random() * 256));
      if (ticks >= 6) {
        clearInterval(shuffle);
        const randomMatrix = [];
        for (let i = 0; i < 16; i++) {
          const row = [];
          for (let j = 0; j < 16; j++) {
            row.push(Math.floor(Math.random() * 256));
          }
          randomMatrix.push(row);
        }
        setSelectedMatrix({ name: "Random Matrix", type: "Generated", data: randomMatrix });
        setRolling(false);
      }
    }, 60);
  };

  return (
    <div className="inputImageContainer">

      <div className="pageHeading">
        <h2>Input Image Selection</h2>
        <p>Select one predefined grayscale image matrix or generate a random image matrix for simulation.</p>
      </div>

      <div className="matrixSelection">
        {predefinedMatrices.map((matrix) => (
          <div
            key={matrix.name}
            className={selectedMatrix?.name === matrix.name ? "matrixCard activeMatrix" : "matrixCard"}
            onClick={() => setSelectedMatrix(matrix)}
          >
            <h3>{matrix.name}</h3>
            <div className={`miniPreview ${matrix.preview}`}></div>
          </div>
        ))}

        <button className={rolling ? "randomButton rolling" : "randomButton"} onClick={generateRandomMatrix} disabled={rolling}>
          {rolling ? `Shuffling... ${previewNum}` : "Generate Random Matrix"}
        </button>
      </div>

      {!selectedMatrix ? (
        <div className="noMatrixMsg">Select a matrix above to view its details.</div>
      ) : (
        <>
          <div className="selectedMatrixCard">
            <h3>{selectedMatrix.name}</h3>

            <div className="selectedMatrixLayout">
              <div className="matrixBox">
                <h4>Pixel Matrix (16 × 16)</h4>
                <div className="valueMatrix" style={{display:"grid",gridTemplateColumns:"repeat(16, minmax(0,1fr))",width:"100%",maxWidth:"512px",gap:"1px"}}>
                  {selectedMatrix.data.map((row, rowIndex) =>
                    row.map((value, colIndex) => (
                      <span
                        className="pixelCell"
                        style={{
                          width:"100%",
                          height:"auto",
                          aspectRatio:"1",
                          fontSize:"clamp(8px,2.6vw,10.5px)",
                          fontWeight:700,
                          letterSpacing:"-0.3px",
                        }}
                        key={rowIndex + "-" + colIndex}
                      >{value}</span>
                    ))
                  )}
                </div>
              </div>

              <div className="previewBox">
                <h4>Image Preview</h4>
                <canvas ref={canvasRef} width={512} height={512} className="previewCanvas" style={{width:"100%",maxWidth:"512px",height:"auto",aspectRatio:"1"}}></canvas>
              </div>
            </div>
          </div>

        </>
      )}

    </div>
  );
}

export default InputImage;
