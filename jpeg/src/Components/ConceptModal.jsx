import { useEffect, useRef, useState } from "react";
import steps from "../data/steps";
import GuidedTutor from "./GuidedTutor";
import { getGuidedTutorSteps } from "../data/guidedTutorSteps";
import Step1RGBInput from "./steps/Step1RGBInput";
import Step2YCbCrConversion from "./steps/Step2YCbCrConversion";
import Step3ChromaSubsampling from "./steps/Step3ChromaSubsampling.jsx";
import Step4DivideBlocks from "./steps/Step4DivideBlocks.jsx";
import Step5LevelShifting from "./steps/Step5LevelShifting.jsx";
import Step6DCTTransform from "./steps/Step6DCTTransform.jsx";
import Step7Quantization from "./steps/Step7Quantization.jsx";
import Step8ZigZagScanning from "./steps/Step8ZigZagScanning.jsx";
import Step9RunLengthEncoding from "./steps/Step9RunLengthEncoding.jsx";
import Step10HuffmanEncoding from "./steps/Step10HuffmanEncoding.jsx";
import Step11FinalOutput from "./steps/Step11FinalOutput.jsx";
const luminanceQuantizationMatrix = [
  16, 11, 10, 16, 24, 40, 51, 61,
  12, 12, 14, 19, 26, 58, 60, 55,
  14, 13, 16, 24, 40, 57, 69, 56,
  14, 17, 22, 29, 51, 87, 80, 62,
  18, 22, 37, 56, 68, 109, 103, 77,
  24, 35, 55, 64, 81, 104, 113, 92,
  49, 64, 78, 87, 103, 121, 120, 101,
  72, 92, 95, 98, 112, 100, 103, 99,
];

const MATRIX_SIZE = 16;

// Real photo used for Step 1 "Real Photo Patch" and Step 12 real compression demo.
// Served from /public/jpeg-samples/ so it can be loaded with a normal <img> + canvas.
const REAL_PHOTO_URL = "/jpeg-samples/original.png";
const REAL_PHOTO_CROP = { row: 32, col: 272 }; // fixed 16x16 crop with real visual detail

function extractRealPixelMatrix(imageEl) {
  const canvas = document.createElement("canvas");
  canvas.width = imageEl.naturalWidth;
  canvas.height = imageEl.naturalHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(imageEl, 0, 0);

  const { row, col } = REAL_PHOTO_CROP;
  const imageData = ctx.getImageData(col, row, MATRIX_SIZE, MATRIX_SIZE).data;

  return Array.from({ length: MATRIX_SIZE }, (_, r) =>
    Array.from({ length: MATRIX_SIZE }, (_, c) => {
      const offset = (r * MATRIX_SIZE + c) * 4;
      return [imageData[offset], imageData[offset + 1], imageData[offset + 2]];
    })
  );
}

function clampRgb(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function createSample16x16RgbMatrix(baseR, baseG, baseB, rowStep, colStep) {
  return Array.from({ length: MATRIX_SIZE }, (_, row) =>
    Array.from({ length: MATRIX_SIZE }, (_, col) => {
      return [
        clampRgb(baseR - row * rowStep - col * colStep),
        clampRgb(baseG - row * Math.max(1, rowStep - 1) - col * Math.max(1, colStep - 1)),
        clampRgb(baseB - row * Math.max(1, rowStep - 2) - col * Math.max(1, colStep - 2)),
      ];
    })
  );
}
const rgbMatrixPresets = {
  bright: {
    label: "Bright 16×16 Matrix",
    matrix: createSample16x16RgbMatrix(255, 245, 235, 3, 2),
  },

  dark: {
    label: "Dark 16×16 Matrix",
    matrix: createSample16x16RgbMatrix(150, 130, 115, 3, 2),
  },
};
const CENTER = (MATRIX_SIZE - 1) / 2;
const MID = Math.floor(CENTER); // 7

const BRIGHT = [255, 90, 90];
const DARK = [35, 40, 65];

function twoTone(isOn) {
  return isOn ? BRIGHT : DARK;
}

const randomPatternPresets = [
  {
    name: "Plus Sign",
    build: () =>
      Array.from({ length: MATRIX_SIZE }, (_, row) =>
        Array.from({ length: MATRIX_SIZE }, (_, col) =>
          twoTone(row === MID || col === MID)
        )
      ),
  },
  {
    name: "X Sign",
    build: () =>
      Array.from({ length: MATRIX_SIZE }, (_, row) =>
        Array.from({ length: MATRIX_SIZE }, (_, col) =>
          twoTone(row === col || row + col === MATRIX_SIZE - 1)
        )
      ),
  },
  {
    name: "Checkerboard",
    build: () =>
      Array.from({ length: MATRIX_SIZE }, (_, row) =>
        Array.from({ length: MATRIX_SIZE }, (_, col) =>
          twoTone((row + col) % 2 === 0)
        )
      ),
  },
  {
    name: "Horizontal Stripes",
    build: () =>
      Array.from({ length: MATRIX_SIZE }, (_, row) =>
        Array.from({ length: MATRIX_SIZE }, () =>
          twoTone(Math.floor(row / 2) % 2 === 0)
        )
      ),
  },
  {
    name: "Vertical Stripes",
    build: () =>
      Array.from({ length: MATRIX_SIZE }, () =>
        Array.from({ length: MATRIX_SIZE }, (_, col) =>
          twoTone(Math.floor(col / 2) % 2 === 0)
        )
      ),
  },
  {
    name: "Border Frame",
    build: () =>
      Array.from({ length: MATRIX_SIZE }, (_, row) =>
        Array.from({ length: MATRIX_SIZE }, (_, col) =>
          twoTone(
            row === 0 || row === MATRIX_SIZE - 1 || col === 0 || col === MATRIX_SIZE - 1
          )
        )
      ),
  },
  {
    name: "Diagonal Line",
    build: () =>
      Array.from({ length: MATRIX_SIZE }, (_, row) =>
        Array.from({ length: MATRIX_SIZE }, (_, col) => twoTone(row === col))
      ),
  },
  {
    name: "Anti-Diagonal Line",
    build: () =>
      Array.from({ length: MATRIX_SIZE }, (_, row) =>
        Array.from({ length: MATRIX_SIZE }, (_, col) =>
          twoTone(row + col === MATRIX_SIZE - 1)
        )
      ),
  },
  {
    name: "Dot Grid",
    build: () =>
      Array.from({ length: MATRIX_SIZE }, (_, row) =>
        Array.from({ length: MATRIX_SIZE }, (_, col) =>
          twoTone(row % 3 === 0 && col % 3 === 0)
        )
      ),
  },
  {
    name: "Center Square",
    build: () =>
      Array.from({ length: MATRIX_SIZE }, (_, row) =>
        Array.from({ length: MATRIX_SIZE }, (_, col) =>
          twoTone(row >= 6 && row <= 9 && col >= 6 && col <= 9)
        )
      ),
  },
];

function createRandomRgbMatrix() {
  const preset =
    randomPatternPresets[Math.floor(Math.random() * randomPatternPresets.length)];
  return { matrix: preset.build(), name: preset.name };
}
function getReadableTextColor(pixel) {
  return "#111827";
}

function getSoftRgbPreviewColor(pixel) {
  const [r, g, b] = pixel;
  const mixWithWhite = 0.45;

  const softR = Math.round(r + (255 - r) * mixWithWhite);
  const softG = Math.round(g + (255 - g) * mixWithWhite);
  const softB = Math.round(b + (255 - b) * mixWithWhite);

  return `rgb(${softR}, ${softG}, ${softB})`;
}
function getGrayValueFromRgb(pixel) {
  const [r, g, b] = pixel;

  return Math.round(r * 0.299 + g * 0.587 + b * 0.114);
}

function WelcomeMatrixPreview({ values }) {
  return (
    <div className="welcomeMatrixPreview">
      <div className="welcomePreviewTitle">RGB Preview Patch</div>

      <div className="welcomePreviewGrid">
      {values.flat().slice(0, 16).map((pixel, index) => {
                  const gray = getGrayValueFromRgb(pixel);

          return (
            <span
              key={`welcome-preview-${index}`}
              className="welcomePreviewPixel"
              style={{
                backgroundColor: `rgb(${gray}, ${gray}, ${gray})`,
                color: gray > 145 ? "#111827" : "#ffffff",
              }}
              title={`P${index + 1}: Gray = ${gray}`}
            >
              P{index + 1}
            </span>
          );
        })}
      </div>

      <div className="welcomePreviewNote">
  Top-left 4×4 preview from the fixed 16×16 RGB sample patch
</div>
    </div>
  );
}
function clampValue(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function convertRgbToYCbCr(pixel) {
  const [r, g, b] = pixel;

  const y = clampValue(0.299 * r + 0.587 * g + 0.114 * b);
  const cb = clampValue(-0.169 * r - 0.334 * g + 0.5 * b + 128);
  const cr = clampValue(0.5 * r - 0.419 * g - 0.081 * b + 128);

  return [y, cb, cr];
}
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function MatrixGrid8({ values }) {
  return (
    <div className="matrixGrid8">
      {values.map((value, index) => (
        <span key={`${value}-${index}`}>{value}</span>
      ))}
    </div>
  );
}

function RGBPixelMatrix({ values, selectedPixelIndex, onPixelClick }) {
  return (
    <div className="rgbPixelGrid">
      {values.flat().map((pixel, index) => (
        <button
          key={`rgb-${index}`}
          type="button"
          className={`rgbPixelCell ${
            selectedPixelIndex === index ? "selectedRgbPixel" : ""
          }`}
         style={{
  backgroundColor: getSoftRgbPreviewColor(pixel),
  color: getReadableTextColor(pixel),
}}          onClick={() => onPixelClick(index)}
          title={`P${index + 1}: (${pixel[0]}, ${pixel[1]}, ${pixel[2]})`}
        >
          P{index + 1}
        </button>
      ))}
    </div>
  );
}
function RGBTupleMatrix({ values, selectedPixelIndex, onPixelClick }) {
  return (
    <div className="rgbTupleMatrix">
      {values.flat().map((pixel, index) => (
        <button
          key={`tuple-${index}`}
          type="button"
          className={`rgbTupleCell ${
            selectedPixelIndex === index ? "selectedTupleCell" : ""
          }`}
          onClick={() => onPixelClick(index)}
        >
          [{pixel[0]},{pixel[1]},{pixel[2]}]
        </button>
      ))}
    </div>
  );
}
function ChannelMatrix({ title, values, channelClass, selectedPixelIndex }) {
  return (
    <div className={`channelMatrix ${channelClass}`}>
      <h4>{title}</h4>

      <div className="channelGrid">
        {values.flat().map((value, index) => (
          <span
            key={`${title}-${index}`}
            className={selectedPixelIndex === index ? "selectedChannelValue" : ""}
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}
function RevealedChannelMatrix({
  title,
  values,
  channelClass,
  selectedPixelIndex,
  convertedPixelIndexes,
}) {
  return (
    <div className={`channelMatrix ${channelClass}`}>
      <h4>{title}</h4>

      <div className="channelGrid">
        {values.flat().map((value, index) => {
          const isRevealed = convertedPixelIndexes.includes(index);

          return (
            <span
              key={`${title}-${index}`}
              className={`${selectedPixelIndex === index ? "selectedChannelValue" : ""} ${
                isRevealed ? "revealedConvertedValue" : "hiddenConvertedValue"
              }`}
            >
              {isRevealed ? value : "—"}
            </span>
          );
        })}
      </div>
    </div>
  );
}
function ConceptModal({ onClose }) {
const [started, setStarted] = useState(true);
const [activeStep, setActiveStep] = useState(1);
const [sidebarOpen, setSidebarOpen] = useState(false);
const [visible, setVisible] = useState(true);
const [maxUnlockedStep, setMaxUnlockedStep] = useState(1);

const [selectedMatrixType, setSelectedMatrixType] = useState(null);
const [randomPatternName, setRandomPatternName] = useState(null);
const [activeRgbMatrix, setActiveRgbMatrix] = useState(null);
const [showMatrixRequiredPopup, setShowMatrixRequiredPopup] = useState(false);
const [showGuidedTutor, setShowGuidedTutor] = useState(false);
const [tutorMuted, setTutorMuted] = useState(false);
const [hasStartedFlow, setHasStartedFlow] = useState(false);
const [showConversionRequiredPopup, setShowConversionRequiredPopup] = useState(false);
const [showSubsamplingRequiredPopup, setShowSubsamplingRequiredPopup] = useState(false);
const [showBlockRequiredPopup, setShowBlockRequiredPopup] = useState(false);
const [step4SelectedBlockIndex, setStep4SelectedBlockIndex] = useState(null);
const [step4RevealedIndexes, setStep4RevealedIndexes] = useState([]);
const [step5SelectedCellIndex, setStep5SelectedCellIndex] = useState(0);
const [step5RevealedIndexes, setStep5RevealedIndexes] = useState([]);
const [step5IsAutoShifting, setStep5IsAutoShifting] = useState(false);
const [showLevelShiftRequiredPopup, setShowLevelShiftRequiredPopup] = useState(false);
const [step6SelectedCoefficientIndex, setStep6SelectedCoefficientIndex] = useState(0);
const [step6RevealedIndexes, setStep6RevealedIndexes] = useState([]);
const [step6IsAutoApplying, setStep6IsAutoApplying] = useState(false);
const [showDctRequiredPopup, setShowDctRequiredPopup] = useState(false);
const [step7SelectedIndex, setStep7SelectedIndex] = useState(0);
const [step7RevealedIndexes, setStep7RevealedIndexes] = useState([]);
const [step7IsAutoQuantizing, setStep7IsAutoQuantizing] = useState(false);
const [step7Quality, setStep7Quality] = useState(50);
const [showQuantizationRequiredPopup, setShowQuantizationRequiredPopup] = useState(false);
const [step9ScanIndex, setStep9ScanIndex] = useState(0);
const [step9ScannedIndexes, setStep9ScannedIndexes] = useState([]);
const [step9IsAutoScanning, setStep9IsAutoScanning] = useState(false);
const [showZigZagRequiredPopup, setShowZigZagRequiredPopup] = useState(false);
const [step10SelectedIndex, setStep10SelectedIndex] = useState(0);
const [step10EncodedUpTo, setStep10EncodedUpTo] = useState(-1);
const [step10IsAutoEncoding, setStep10IsAutoEncoding] = useState(false);
const [step10Complete, setStep10Complete] = useState(false);
const [showRleRequiredPopup, setShowRleRequiredPopup] = useState(false);
const [step11IsDcEncoded, setStep11IsDcEncoded] = useState(false);
const [step11AcEncodedUpTo, setStep11AcEncodedUpTo] = useState(-1);
const [step11IsAutoEncoding, setStep11IsAutoEncoding] = useState(false);
const [step11Complete, setStep11Complete] = useState(false);
const [showHuffmanRequiredPopup, setShowHuffmanRequiredPopup] = useState(false);
const [step12IsGenerated, setStep12IsGenerated] = useState(false);
const [selectedPixelIndex, setSelectedPixelIndex] = useState(0);
const conversionRunRef = useRef(0);

const [convertedPixelIndexes, setConvertedPixelIndexes] = useState([]);
const [isAutoConverting, setIsAutoConverting] = useState(false);
const [showSelectedCalculation, setShowSelectedCalculation] = useState(false);
const [selectedBlockData, setSelectedBlockData] = useState(null);
const [levelShiftData, setLevelShiftData] = useState(null);
const [dctData, setDctData] = useState(null);
const [quantizationData, setQuantizationData] = useState(null);
const [dcCodingData, setDcCodingData] = useState(null);
const [zigZagData, setZigZagData] = useState(null);
const [rleData, setRleData] = useState(null);
const [huffmanData, setHuffmanData] = useState(null);
const [step3RevealedGroupIndexes, setStep3RevealedGroupIndexes] = useState([]);
const currentStep = activeStep > 0 ? steps[activeStep - 1] : null;

const safeRgbMatrix = activeRgbMatrix || rgbMatrixPresets.bright.matrix;

const selectedPixel = safeRgbMatrix.flat()[selectedPixelIndex] || [0, 0, 0];

const redMatrix = safeRgbMatrix.map((row) =>
  row.map((pixel) => pixel[0])
);

const greenMatrix = safeRgbMatrix.map((row) =>
  row.map((pixel) => pixel[1])
);

const blueMatrix = safeRgbMatrix.map((row) =>
  row.map((pixel) => pixel[2])
);
const yCbCrMatrix = safeRgbMatrix.map((row) =>
  row.map((pixel) => convertRgbToYCbCr(pixel))
);

const yMatrix = yCbCrMatrix.map((row) =>
  row.map((pixel) => pixel[0])
);

const cbMatrix = yCbCrMatrix.map((row) =>
  row.map((pixel) => pixel[1])
);

const crMatrix = yCbCrMatrix.map((row) =>
  row.map((pixel) => pixel[2])
);

const selectedYCbCr = convertRgbToYCbCr(selectedPixel);
function handleMatrixPresetChange(type) {
  setSelectedMatrixType(type);
  setActiveRgbMatrix(rgbMatrixPresets[type].matrix);
  setRandomPatternName(null);
  resetStep2Conversion();
}

function handleRandomMatrix() {
  const { matrix, name } = createRandomRgbMatrix();
  setSelectedMatrixType("random");
  setActiveRgbMatrix(matrix);
  setRandomPatternName(name);
  resetStep2Conversion();
}
  const isFirstStep = activeStep === 1;
  const isLastStep = activeStep === steps.length;

useEffect(() => {
  if (!quantizationData?.values) return;

  const quantizedMatrix = Array.from({ length: 8 }, (_, row) =>
    Array.from({ length: 8 }, (_, col) => {
      const value = quantizationData.values[row]?.[col];
      return typeof value === "number" ? value : 0;
    })
  );

  const previousDc = 0;
  const currentDc = quantizedMatrix[0][0];
  const dcDifference = currentDc - previousDc;
  const absValue = Math.abs(dcDifference);
  const dcCategory = absValue === 0 ? 0 : Math.floor(Math.log2(absValue)) + 1;
  const magnitudeBits =
    dcCategory === 0
      ? "—"
      : (() => {
          const absBinary = absValue.toString(2).padStart(dcCategory, "0");
          return dcDifference > 0
            ? absBinary
            : absBinary
                .split("")
                .map((bit) => (bit === "0" ? "1" : "0"))
                .join("");
        })();

  setDcCodingData({
    component: quantizationData.component || "Y",
    blockIndex: quantizationData.blockIndex ?? 0,
    quantizedMatrix,
    previousDc,
    currentDc,
    dcDifference,
    dcCategory,
    magnitudeBits,
    startRow: quantizationData.startRow ?? 0,
    startCol: quantizationData.startCol ?? 0,
  });
}, [quantizationData]);
function resetStep2Conversion() {
  conversionRunRef.current += 1;
  setIsAutoConverting(false);
  setConvertedPixelIndexes([]);
  setShowSelectedCalculation(false);
  setSelectedPixelIndex(0);
  setSelectedBlockData(null);
  setLevelShiftData(null);
  setDctData(null);
  setQuantizationData(null);
  setDcCodingData(null);
  setZigZagData(null);
  setRleData(null);
  setHuffmanData(null);
  setStep3RevealedGroupIndexes([]);
  setStep4SelectedBlockIndex(null);
  setStep4RevealedIndexes([]);
  setStep5SelectedCellIndex(0);
  setStep5RevealedIndexes([]);
  setStep5IsAutoShifting(false);
  setStep6SelectedCoefficientIndex(0);
  setStep6RevealedIndexes([]);
  setStep6IsAutoApplying(false);
  setStep7SelectedIndex(0);
  setStep7RevealedIndexes([]);
  setStep7IsAutoQuantizing(false);
  setStep7Quality(50);
  setStep9ScanIndex(0);
  setStep9ScannedIndexes([]);
  setStep9IsAutoScanning(false);
  setStep10SelectedIndex(0);
  setStep10EncodedUpTo(-1);
  setStep10IsAutoEncoding(false);
  setStep10Complete(false);
  setStep11IsDcEncoded(false);
  setStep11AcEncodedUpTo(-1);
  setStep11IsAutoEncoding(false);
  setStep11Complete(false);
  setStep12IsGenerated(false);
}
async function autoConvertFullMatrix() {
  if (isAutoConverting) return;

  const runId = conversionRunRef.current + 1;
  conversionRunRef.current = runId;

  setIsAutoConverting(true);
  setShowSelectedCalculation(true);
  setConvertedPixelIndexes([]);

  const totalPixels = safeRgbMatrix.flat().length;

  for (let index = 0; index < totalPixels; index += 1) {
    if (conversionRunRef.current !== runId) return;

    setSelectedPixelIndex(index);

    setConvertedPixelIndexes((prevIndexes) =>
      prevIndexes.includes(index)
        ? prevIndexes
        : [...prevIndexes, index].sort((a, b) => a - b)
    );

await wait(80);
  }

  setIsAutoConverting(false);
}
function startSimulation() {
  setStarted(true);
  setActiveStep(1);
  setMaxUnlockedStep(1);
  resetStep2Conversion();
}
function nextStep() {
  if (!started || isLastStep) return;

  if (activeStep === 1 && !selectedMatrixType) {
    setShowMatrixRequiredPopup(true);
    return;
  }

  if (activeStep === 2 && convertedPixelIndexes.length < safeRgbMatrix.flat().length) {
    setShowConversionRequiredPopup(true);
    return;
  }

  if (activeStep === 3) {
    const cbRows = cbMatrix.length;
    const cbCols = cbMatrix[0]?.length || cbRows;
    const totalGroups = Math.floor(cbRows / 2) * Math.floor(cbCols / 2);

    if (step3RevealedGroupIndexes.length < totalGroups) {
      setShowSubsamplingRequiredPopup(true);
      return;
    }
  }

  if (activeStep === 4 && step4SelectedBlockIndex === null) {
    setShowBlockRequiredPopup(true);
    return;
  }

  if (activeStep === 5 && step5RevealedIndexes.length < 64) {
    setShowLevelShiftRequiredPopup(true);
    return;
  }

  if (activeStep === 6 && step6RevealedIndexes.length < 64) {
    setShowDctRequiredPopup(true);
    return;
  }

  if (activeStep === 7 && step7RevealedIndexes.length < 64) {
    setShowQuantizationRequiredPopup(true);
    return;
  }

  if (activeStep === 8 && step9ScannedIndexes.length < 64) {
    setShowZigZagRequiredPopup(true);
    return;
  }

  if (activeStep === 9 && !step10Complete) {
    setShowRleRequiredPopup(true);
    return;
  }

  if (activeStep === 10 && !step11Complete) {
    setShowHuffmanRequiredPopup(true);
    return;
  }

  const next = activeStep + 1;

  setActiveStep(next);
  setMaxUnlockedStep((prevMax) => Math.max(prevMax, next));
}

  function prevStep() {
    if (!started || isFirstStep) return;
    setActiveStep((prev) => prev - 1);
  }

function goToStep(stepId) {
  if (!started) return;

  if (stepId > maxUnlockedStep) {
    return;
  }

  setActiveStep(stepId);
  setSidebarOpen(false);
}

  function handleClose() {
    if (typeof onClose === "function") {
      onClose();
      return;
    }

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="overlay">
      <div className="modal">
        {showMatrixRequiredPopup && (
          <div className="matrixRequiredOverlay">
            <div className="matrixRequiredPopup">
              <h3>Select an Input Matrix</h3>
              <p>Please select an RGB matrix (Bright / Dark / Random) before proceeding to the next step.</p>
              <button type="button" onClick={() => setShowMatrixRequiredPopup(false)}>
                OK
              </button>
            </div>
          </div>
        )}
        {showConversionRequiredPopup && (
          <div className="matrixRequiredOverlay">
            <div className="matrixRequiredPopup">
              <h3>Run the Color Transform</h3>
              <p>Please run "RGB → YCbCr Color Transform" on the full patch before proceeding to the next step.</p>
              <button type="button" onClick={() => setShowConversionRequiredPopup(false)}>
                OK
              </button>
            </div>
          </div>
        )}
        {showSubsamplingRequiredPopup && (
          <div className="matrixRequiredOverlay">
            <div className="matrixRequiredPopup">
              <h3>Run Chroma Downsampling</h3>
              <p>Please run "Run 2×2 Chroma Downsampling" to reduce Cb and Cr before proceeding to the next step.</p>
              <button type="button" onClick={() => setShowSubsamplingRequiredPopup(false)}>
                OK
              </button>
            </div>
          </div>
        )}
        {showBlockRequiredPopup && (
          <div className="matrixRequiredOverlay">
            <div className="matrixRequiredPopup">
              <h3>Select an 8×8 Block</h3>
              <p>Please select one 8×8 block (B1–B4) from the Y matrix before proceeding to the next step.</p>
              <button type="button" onClick={() => setShowBlockRequiredPopup(false)}>
                OK
              </button>
            </div>
          </div>
        )}
        {showLevelShiftRequiredPopup && (
          <div className="matrixRequiredOverlay">
            <div className="matrixRequiredPopup">
              <h3>Run Level Shifting</h3>
              <p>Please run "Run Level Shift (Subtract 128)" on the full block before proceeding to the next step.</p>
              <button type="button" onClick={() => setShowLevelShiftRequiredPopup(false)}>
                OK
              </button>
            </div>
          </div>
        )}
        {showDctRequiredPopup && (
          <div className="matrixRequiredOverlay">
            <div className="matrixRequiredPopup">
              <h3>Run the 2D DCT</h3>
              <p>Please run "Run 2D DCT Transform" on the full block before proceeding to the next step.</p>
              <button type="button" onClick={() => setShowDctRequiredPopup(false)}>
                OK
              </button>
            </div>
          </div>
        )}
        {showQuantizationRequiredPopup && (
          <div className="matrixRequiredOverlay">
            <div className="matrixRequiredPopup">
              <h3>Run Quantization</h3>
              <p>Please run "Run Quantization (DCT ÷ Table)" on the full block before proceeding to the next step.</p>
              <button type="button" onClick={() => setShowQuantizationRequiredPopup(false)}>
                OK
              </button>
            </div>
          </div>
        )}
        {showZigZagRequiredPopup && (
          <div className="matrixRequiredOverlay">
            <div className="matrixRequiredPopup">
              <h3>Run the Zig-Zag Scan</h3>
              <p>Please run "Run Zig-Zag Scan" on the full block before proceeding to the next step.</p>
              <button type="button" onClick={() => setShowZigZagRequiredPopup(false)}>
                OK
              </button>
            </div>
          </div>
        )}
        {showRleRequiredPopup && (
          <div className="matrixRequiredOverlay">
            <div className="matrixRequiredPopup">
              <h3>Run RLE Encoding</h3>
              <p>Please run "Run Run-Length Encoding" before proceeding to the next step.</p>
              <button type="button" onClick={() => setShowRleRequiredPopup(false)}>
                OK
              </button>
            </div>
          </div>
        )}
        {showHuffmanRequiredPopup && (
          <div className="matrixRequiredOverlay">
            <div className="matrixRequiredPopup">
              <h3>Run Huffman Encoding</h3>
              <p>Please run "Run Huffman Encoding" before proceeding to the next step.</p>
              <button type="button" onClick={() => setShowHuffmanRequiredPopup(false)}>
                OK
              </button>
            </div>
          </div>
        )}
        <div className="headerBar">
          <div className="headerLeft">
            <button
              type="button"
              className="menuToggleBtn"
              aria-label="Toggle steps menu"
              onClick={() => setSidebarOpen((prev) => !prev)}
            >
              <span />
              <span />
              <span />
            </button>
            <div className="headerTitleGroup">
              <div className="headerTitle">JPEG Compression Visualizer</div>
              <div className="headerSubtitle">
                Step {activeStep} of {steps.length} · {currentStep?.title}
              </div>
            </div>
          </div>

          <div className="headerActions">
            <button
              className={`headerSpeakerBtn ${tutorMuted ? "headerSpeakerBtnMuted" : ""}`}
              type="button"
              onClick={() => setTutorMuted((prev) => !prev)}
              title={tutorMuted ? "Unmute tutor narration" : "Mute tutor narration"}
              aria-label={tutorMuted ? "Unmute tutor narration" : "Mute tutor narration"}
            >
              {tutorMuted ? "🔇" : "🔊"}
            </button>
            <button
              className="guidedTutorBtn"
              type="button"
              onClick={() => setShowGuidedTutor(true)}
            >
              🎓 <span>Guided Tutor</span>
            </button>
            <button
              className="closeHeaderBtn"
              type="button"
              onClick={handleClose}
            >
              CLOSE
            </button>
          </div>
        </div>

        <GuidedTutor
          open={showGuidedTutor}
          onClose={() => setShowGuidedTutor(false)}
          muted={tutorMuted}
          onToggleMute={() => setTutorMuted((prev) => !prev)}
          actionContext={{
            activeRgbMatrix,
            isStep2Complete:
              convertedPixelIndexes.length >= safeRgbMatrix.flat().length,
            isStep3Complete:
              step3RevealedGroupIndexes.length >=
              Math.floor(cbMatrix.length / 2) *
                Math.floor((cbMatrix[0]?.length || cbMatrix.length) / 2),
            isStep4BlockSelected: step4SelectedBlockIndex !== null,
            isStep4Complete: step4RevealedIndexes.length > 0,
            isStep5Complete: step5RevealedIndexes.length >= 64,
            isStep6Complete: step6RevealedIndexes.length >= 64,
            isStep7Complete: step7RevealedIndexes.length >= 64,
            isStep9Complete: step9ScannedIndexes.length >= 64,
            isStep10Complete: step10Complete,
            isStep11Complete: step11Complete,
            isStep12Complete: step12IsGenerated,
          }}
          onRequireSidebar={setSidebarOpen}
          steps={getGuidedTutorSteps({ activeStep, activeRgbMatrix, currentStep })}
        />

        <div className="contentArea">
          {sidebarOpen && (
            <div
              className="sidebarBackdrop"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <div className={`leftPanel${sidebarOpen ? " leftPanelOpen" : ""}`}>
            <div className="stepsPanelHeader">
              <h2 className="stepsHeading">Steps</h2>
              <button
                type="button"
                className="sidebarCloseBtn"
                aria-label="Close steps menu"
                onClick={() => setSidebarOpen(false)}
              >
                ✕
              </button>
            </div>

            <p className="stepsSubtitle">
              11-step JPEG encoding workflow
            </p>

            <div className="stepsProgressTrack">
              <div
                className="stepsProgressFill"
                style={{
                  width: `${Math.round((activeStep / steps.length) * 100)}%`,
                }}
              />
            </div>

            <ul className="stepsList">
  {steps.map((step, index) => {
    const isLocked = !started || step.id > maxUnlockedStep;

    return (
      <li
        key={step.id}
        className={
          step.id === activeStep
            ? "currentStep"
            : isLocked
            ? "lockedStep"
            : step.id < activeStep
            ? "completedStep"
            : "unlockedStep"
        }
        onClick={() => {
          if (!isLocked) {
            goToStep(step.id);
          }
        }}
      >
        <span className="stepCircle">{index + 1}</span>
        {step.title}
      </li>
    );
  })}
</ul>

            <div className="controlButtons">
              <button
                type="button"
                onClick={prevStep}
                disabled={!started || isFirstStep}
              >
                Prev
              </button>

              <button
                type="button"
                onClick={() => {
                  setHasStartedFlow(true);
                  nextStep();
                }}
                disabled={!started || isLastStep}
              >
                {hasStartedFlow ? "Next" : "Start"}
              </button>

            </div>
          </div>

          <div className="visualPanel">
            <div className="stepWorkspace">
              <h2>{currentStep?.title}</h2>

              {activeStep === 1 ? (
  <Step1RGBInput
    rgbMatrixPresets={rgbMatrixPresets}
    selectedMatrixType={selectedMatrixType}
    handleMatrixPresetChange={handleMatrixPresetChange}
    handleRandomMatrix={handleRandomMatrix}
    randomPatternName={randomPatternName}
    activeRgbMatrix={activeRgbMatrix}
    selectedPixelIndex={selectedPixelIndex}
    setSelectedPixelIndex={setSelectedPixelIndex}
    selectedPixel={selectedPixel}
    redMatrix={redMatrix}
    greenMatrix={greenMatrix}
    blueMatrix={blueMatrix}
    RGBPixelMatrix={RGBPixelMatrix}
    RGBTupleMatrix={RGBTupleMatrix}
    ChannelMatrix={ChannelMatrix}
  />
  ) : activeStep === 2 ? (
  <Step2YCbCrConversion
    activeRgbMatrix={activeRgbMatrix}
    selectedPixelIndex={selectedPixelIndex}
    setSelectedPixelIndex={setSelectedPixelIndex}
    selectedPixel={selectedPixel}
    selectedYCbCr={selectedYCbCr}
    yMatrix={yMatrix}
    cbMatrix={cbMatrix}
    crMatrix={crMatrix}
    convertedPixelIndexes={convertedPixelIndexes}
    isAutoConverting={isAutoConverting}
    showSelectedCalculation={showSelectedCalculation}
    autoConvertFullMatrix={autoConvertFullMatrix}
    RGBTupleMatrix={RGBTupleMatrix}
    RevealedChannelMatrix={RevealedChannelMatrix}
  />
) : activeStep === 3 ? (
<Step3ChromaSubsampling
  yMatrix={yMatrix}
  cbMatrix={cbMatrix}
  crMatrix={crMatrix}
  selectedPixelIndex={selectedPixelIndex}
  setSelectedPixelIndex={setSelectedPixelIndex}
  revealedGroupIndexes={step3RevealedGroupIndexes}
  setRevealedGroupIndexes={setStep3RevealedGroupIndexes}
/>
) : activeStep === 4 ? (
  <Step4DivideBlocks
    yMatrix={yMatrix}
    onSelectedBlockChange={setSelectedBlockData}
    selectedBlockIndex={step4SelectedBlockIndex}
    setSelectedBlockIndex={setStep4SelectedBlockIndex}
    revealedIndexes={step4RevealedIndexes}
    setRevealedIndexes={setStep4RevealedIndexes}
  />
) : activeStep === 5 ? (
  <Step5LevelShifting
    selectedBlockData={selectedBlockData}
    onLevelShiftChange={setLevelShiftData}
    selectedCellIndex={step5SelectedCellIndex}
    setSelectedCellIndex={setStep5SelectedCellIndex}
    revealedIndexes={step5RevealedIndexes}
    setRevealedIndexes={setStep5RevealedIndexes}
    isAutoShifting={step5IsAutoShifting}
    setIsAutoShifting={setStep5IsAutoShifting}
  />
) : activeStep === 6 ? (
 <Step6DCTTransform
  selectedBlockData={selectedBlockData}
  levelShiftData={levelShiftData}
  onDctChange={setDctData}
  selectedCoefficientIndex={step6SelectedCoefficientIndex}
  setSelectedCoefficientIndex={setStep6SelectedCoefficientIndex}
  revealedIndexes={step6RevealedIndexes}
  setRevealedIndexes={setStep6RevealedIndexes}
  isAutoApplying={step6IsAutoApplying}
  setIsAutoApplying={setStep6IsAutoApplying}
/>
) : activeStep === 7 ? (
  <Step7Quantization
    dctData={dctData}
    onQuantizationChange={setQuantizationData}
    selectedIndex={step7SelectedIndex}
    setSelectedIndex={setStep7SelectedIndex}
    revealedIndexes={step7RevealedIndexes}
    setRevealedIndexes={setStep7RevealedIndexes}
    isAutoQuantizing={step7IsAutoQuantizing}
    setIsAutoQuantizing={setStep7IsAutoQuantizing}
    quality={step7Quality}
    setQuality={setStep7Quality}
  />
) : activeStep === 8 ? (
  <Step8ZigZagScanning
    quantizationData={quantizationData}
    dcCodingData={dcCodingData}
    onZigZagChange={setZigZagData}
    scanIndex={step9ScanIndex}
    setScanIndex={setStep9ScanIndex}
    scannedIndexes={step9ScannedIndexes}
    setScannedIndexes={setStep9ScannedIndexes}
    isAutoScanning={step9IsAutoScanning}
    setIsAutoScanning={setStep9IsAutoScanning}
  />
) : activeStep === 9 ? (
  <Step9RunLengthEncoding
    zigZagData={zigZagData}
    dcCodingData={dcCodingData}
    onRleChange={setRleData}
    selectedIndex={step10SelectedIndex}
    setSelectedIndex={setStep10SelectedIndex}
    encodedUpTo={step10EncodedUpTo}
    setEncodedUpTo={setStep10EncodedUpTo}
    isAutoEncoding={step10IsAutoEncoding}
    setIsAutoEncoding={setStep10IsAutoEncoding}
    setComplete={setStep10Complete}
  />
) : activeStep === 10 ? (
  <Step10HuffmanEncoding
    dcCodingData={dcCodingData}
    rleData={rleData}
    onHuffmanChange={setHuffmanData}
    isDcEncoded={step11IsDcEncoded}
    setIsDcEncoded={setStep11IsDcEncoded}
    acEncodedUpTo={step11AcEncodedUpTo}
    setAcEncodedUpTo={setStep11AcEncodedUpTo}
    isAutoEncoding={step11IsAutoEncoding}
    setIsAutoEncoding={setStep11IsAutoEncoding}
    setComplete={setStep11Complete}
  />
) : activeStep === 11 ? (
  <Step11FinalOutput
    huffmanData={huffmanData}
    rleData={rleData}
    dcCodingData={dcCodingData}
    quantizationData={quantizationData}
    originalBlockData={selectedBlockData}
    isGenerated={step12IsGenerated}
    setIsGenerated={setStep12IsGenerated}
  />
) : (
                <div className="ioContainer">
                  <div className="ioBox">
                    <h3>Input</h3>
                    <div className="ioContent">{currentStep?.input}</div>
                  </div>

                  <div className="ioArrow">↓</div>

                  <div className="ioBox">
                    <h3>Process</h3>
                    <div className="ioContent">{currentStep?.process}</div>
                  </div>

                  <div className="ioArrow">↓</div>

                  <div className="ioBox">
                    <h3>Output</h3>
                    <div className="ioContent">{currentStep?.output}</div>
                  </div>
                </div>
              )}

              {activeStep !== 1 && activeStep !== 11 && (
              <div className="explanationBox">
  <h3>Explanation</h3>

  <p>
    {activeStep === 2
      ? "In this step, the same 16×16 RGB sample patch from Step 1 is converted into 16×16 Y, Cb and Cr matrices. Y stores luminance or brightness information, while Cb and Cr store chrominance or color-difference information. This separation is useful in JPEG because the human eye is more sensitive to luminance than chrominance, so Cb and Cr color information can be reduced in the next step."
      : activeStep === 3
      ? "In this step, chroma subsampling is applied to the Y, Cb and Cr matrices from Step 2. The Y matrix remains unchanged at 16×16 because it stores brightness information. The Cb and Cr matrices are downsampled from 16×16 to 8×8 by replacing every 2×2 group with one average value. This reduces color data while keeping the visually important brightness data."
      : activeStep === 4
      ? "In actual JPEG compression, image component samples are divided into non-overlapping 8×8 blocks before level shifting and DCT. In this simulation, the 16×16 Y matrix is divided into four 8×8 blocks: B1, B2, B3 and B4. The selected 8×8 block contains 64 luminance values and becomes the input for Level Shifting."
      : currentStep?.description}
  </p>
</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConceptModal;