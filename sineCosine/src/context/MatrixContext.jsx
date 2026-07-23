import { createContext, useContext, useState } from "react";

const MatrixContext = createContext();

export const MatrixProvider = ({ children }) => {

  // Selected Input Matrix (Step 1)
  const [selectedMatrix, setSelectedMatrix] = useState(null);

  // Step 5 Output (Frequency Matrix of the selected 8x8 block)
  const [frequencyMatrix, setFrequencyMatrix] = useState([]);

  // Selected Processing Block (1-4)
  const [selectedBlock, setSelectedBlock] = useState(1);

  // Selected Transform
  const [transform, setTransform] = useState("DCT");

  // Step 6 : Quantization
  const [qualityFactor, setQualityFactor] = useState(50);
  const [quantTable, setQuantTable] = useState([]);           // T(u,v) scaled table actually used
  const [quantizedMatrix, setQuantizedMatrix] = useState([]); // Q(u,v)

  // Step 7 : Zig-Zag Scan
  const [zigzagArray, setZigzagArray] = useState([]);

  // Step 8 : Encoding (Run Length Encoding)
  const [encodedRuns, setEncodedRuns] = useState(null);

  // Step 9 : Inverse Transform / Reconstruction
  const [dequantizedMatrix, setDequantizedMatrix] = useState([]);
  const [reconstructedBlock, setReconstructedBlock] = useState([]);

  return (
    <MatrixContext.Provider
      value={{
        selectedMatrix,
        setSelectedMatrix,

        frequencyMatrix,
        setFrequencyMatrix,

        selectedBlock,
        setSelectedBlock,

        transform,
        setTransform,

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
