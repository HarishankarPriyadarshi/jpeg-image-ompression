import { createContext, useContext, useState } from "react";

const MatrixContext = createContext();

export const MatrixProvider = ({ children }) => {

  // Selected Input Matrix (Step 1)
  const [selectedMatrix, setSelectedMatrixRaw] = useState(null);

  // Step 4 Output (Frequency Matrix of the selected 8x8 block)
  const [frequencyMatrix, setFrequencyMatrix] = useState([]);

  // Selected Processing Block (1-4)
  const [selectedBlock, setSelectedBlock] = useState(null);

  // Whether processing block has been created (Step 2)
  const [blockCreated, setBlockCreated] = useState(false);

  // Basis Matrix (Step 3) - persisted across navigation
  const [basisMatrix, setBasisMatrix] = useState([]);
  const [basisGenerated, setBasisGenerated] = useState(false);

  // Global centered popup message
  const [popupMessage, setPopupMessage] = useState("");

  // Selected Transform (used by Step 3 onward)
  const [transform, setTransformRaw] = useState(null);

  // Step 5 : Quantization
  const [qualityFactor, setQualityFactor] = useState(50);
  const [quantTable, setQuantTable] = useState([]);           // T(u,v) scaled table actually used
  const [quantizedMatrix, setQuantizedMatrix] = useState([]); // Q(u,v)

  // Step 6 : Zig-Zag Scan
  const [zigzagArray, setZigzagArray] = useState([]);

  // Step 7 : Encoding (Run Length Encoding)
  const [encodedRuns, setEncodedRuns] = useState(null);

  // Step 8 : Reconstruction (Comparison) / Reconstruction
  const [dequantizedMatrix, setDequantizedMatrix] = useState([]);
  const [reconstructedBlock, setReconstructedBlock] = useState([]);

  // Switching DCT <-> DST invalidates the basis matrix and everything computed
  // from it (frequency matrix, quantization, zig-zag, encoding).
  const setTransform = (t) => {
    if (t === transform) return;
    setTransformRaw(t);
    setBasisMatrix([]);
    setBasisGenerated(false);
    setFrequencyMatrix([]);
    setQuantTable([]);
    setQuantizedMatrix([]);
    setZigzagArray([]);
    setEncodedRuns(null);
    setDequantizedMatrix([]);
    setReconstructedBlock([]);
  };

  // Choosing a DIFFERENT image invalidates everything computed from the old
  // one (block, transform output, quantization, zig-zag, encoding, ...), so
  // reset all of it. Re-selecting the same image keeps the current progress.
  const setSelectedMatrix = (matrix) => {
    if (matrix === selectedMatrix) return;
    setSelectedMatrixRaw(matrix);
    setSelectedBlock(null);
    setBlockCreated(false);
    setFrequencyMatrix([]);
    setQuantTable([]);
    setQuantizedMatrix([]);
    setZigzagArray([]);
    setEncodedRuns(null);
    setDequantizedMatrix([]);
    setReconstructedBlock([]);
  };

  return (
    <MatrixContext.Provider
      value={{
        selectedMatrix,
        setSelectedMatrix,

        frequencyMatrix,
        setFrequencyMatrix,

        selectedBlock,
        setSelectedBlock,

        blockCreated,
        setBlockCreated,

        transform,
        setTransform,

        basisMatrix,
        setBasisMatrix,

        basisGenerated,
        setBasisGenerated,

        popupMessage,
        setPopupMessage,

        qualityFactor,
        setQualityFactor,

        quantTable,
        setQuantTable,

        quantizedMatrix,
        setQuantizedMatrix,

        zigzagArray,
        setZigzagArray,

        encodedRuns,
        setEncodedRuns,

        dequantizedMatrix,
        setDequantizedMatrix,

        reconstructedBlock,
        setReconstructedBlock,
      }}
    >
      {children}
    </MatrixContext.Provider>
  );
};

export const useMatrix = () => useContext(MatrixContext);
