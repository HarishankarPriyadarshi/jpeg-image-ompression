import { useEffect, useRef, useState } from "react";
import steps from "../data/steps";
import Step1RGBInput from "./steps/Step1RGBInput";
import Step2YCbCrConversion from "./steps/Step2YCbCrConversion";
import Step3ChromaSubsampling from "./steps/Step3ChromaSubsampling.jsx";
import Step4DivideBlocks from "./steps/Step4DivideBlocks.jsx";
import Step5LevelShifting from "./steps/Step5LevelShifting.jsx";
import Step6DCTTransform from "./steps/Step6DCTTransform.jsx";
import Step7Quantization from "./steps/Step7Quantization.jsx";
import Step8DCDifferenceCoding from "./steps/Step8DCDifferenceCoding.jsx";
import Step9ZigZagScanning from "./steps/Step9ZigZagScanning.jsx";
import Step10RunLengthEncoding from "./steps/Step10RunLengthEncoding.jsx";
import Step11HuffmanEncoding from "./steps/Step11HuffmanEncoding.jsx";
import Step12FinalOutput from "./steps/Step12FinalOutput.jsx";
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
  sample: {
    label: "Sample 16×16 Patch",
    matrix: createSample16x16RgbMatrix(245, 218, 180, 4, 3),
  },

  bright: {
    label: "Bright 16×16 Patch",
    matrix: createSample16x16RgbMatrix(255, 245, 235, 3, 2),
  },

  dark: {
    label: "Dark 16×16 Patch",
    matrix: createSample16x16RgbMatrix(150, 130, 115, 3, 2),
  },
};
function createRandomRgbMatrix() {
  return Array.from({ length: MATRIX_SIZE }, () =>
    Array.from({ length: MATRIX_SIZE }, () => [
      Math.floor(Math.random() * 256),
      Math.floor(Math.random() * 256),
      Math.floor(Math.random() * 256),
    ])
  );
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
const [started, setStarted] = useState(false);
const [activeStep, setActiveStep] = useState(0);
const [visible, setVisible] = useState(true);
const [maxUnlockedStep, setMaxUnlockedStep] = useState(0);

const [selectedMatrixType, setSelectedMatrixType] = useState("sample");
const [activeRgbMatrix, setActiveRgbMatrix] = useState(
  rgbMatrixPresets.sample.matrix
);
const [realPhotoMatrix, setRealPhotoMatrix] = useState(null);
const [realPhotoStatus, setRealPhotoStatus] = useState("loading");

useEffect(() => {
  const img = new Image();

  img.onload = () => {
    try {
      const matrix = extractRealPixelMatrix(img);
      setRealPhotoMatrix(matrix);
      setRealPhotoStatus("ready");
    } catch {
      setRealPhotoStatus("error");
    }
  };

  img.onerror = () => setRealPhotoStatus("error");
  img.src = REAL_PHOTO_URL;
}, []);
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

const selectedPixel = activeRgbMatrix.flat()[selectedPixelIndex] || [0, 0, 0];

const redMatrix = activeRgbMatrix.map((row) =>
  row.map((pixel) => pixel[0])
);

const greenMatrix = activeRgbMatrix.map((row) =>
  row.map((pixel) => pixel[1])
);

const blueMatrix = activeRgbMatrix.map((row) =>
  row.map((pixel) => pixel[2])
);
const yCbCrMatrix = activeRgbMatrix.map((row) =>
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
  resetStep2Conversion();
}

function handleRealPhotoSelect() {
  if (realPhotoStatus !== "ready" || !realPhotoMatrix) return;
  setSelectedMatrixType("real");
  setActiveRgbMatrix(realPhotoMatrix);
  resetStep2Conversion();
}

function handleRandomMatrix() {
  setSelectedMatrixType("random");
  setActiveRgbMatrix(createRandomRgbMatrix());
  resetStep2Conversion();
}
  const isFirstStep = activeStep === 1;
  const isLastStep = activeStep === steps.length;
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
}
function convertSelectedPixelOnly() {
  conversionRunRef.current += 1;
  setIsAutoConverting(false);
  setShowSelectedCalculation(true);

  setConvertedPixelIndexes((prevIndexes) =>
    prevIndexes.includes(selectedPixelIndex)
      ? prevIndexes
      : [...prevIndexes, selectedPixelIndex].sort((a, b) => a - b)
  );
}

async function autoConvertFullMatrix() {
  if (isAutoConverting) return;

  const runId = conversionRunRef.current + 1;
  conversionRunRef.current = runId;

  setIsAutoConverting(true);
  setShowSelectedCalculation(true);
  setConvertedPixelIndexes([]);

  const totalPixels = activeRgbMatrix.flat().length;

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
        <div className="headerBar">
          <div className="headerTitle">JPEG Compression Visualizer</div>

          <div className="headerActions">
            <button
              className="closeHeaderBtn"
              type="button"
              onClick={handleClose}
            >
              CLOSE
            </button>
          </div>
        </div>

        <div
          className={`stepNavigator ${
            activeStep === 0 ? "startStepNavigator" : ""
          }`}
        >
          <button
            className="navBtn"
            type="button"
            onClick={prevStep}
            disabled={!started || isFirstStep}
          >
            ❮
          </button>

          <div className="stepText">
            {activeStep === 0
              ? "Ready to Start JPEG Compression Simulation"
              : `Step ${activeStep} of ${steps.length} • ${currentStep?.title}`}
          </div>

          <button
            className="navBtn"
            type="button"
            onClick={nextStep}
            disabled={!started || isLastStep}
          >
            ❯
          </button>
        </div>

        <div className="contentArea">
          <div className="leftPanel">
            <h2 className="stepsHeading">Steps</h2>

            <p className="stepsSubtitle">
              12-step JPEG encoding workflow
            </p>

            <ul className="stepsList">
  {steps.map((step) => {
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
        <span className="stepCircle">{step.id}</span>
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
                onClick={nextStep}
                disabled={!started || isLastStep}
              >
                Next
              </button>

              <button
                type="button"
                onClick={startSimulation}
                disabled={started}
              >
                {started ? "Started" : "Start"}
              </button>
            </div>
          </div>

          <div className="visualPanel">
            <div className="stepWorkspace">
              <h2>
                {activeStep === 0
                  ? "JPEG Compression Simulation"
                  : currentStep?.title}
              </h2>

              {activeStep === 0 && (
               <p className="startPageSubtitle">
  DCT-based Baseline Sequential JPEG Encoding Workflow
</p>
              )}

              {activeStep === 0 ? (
                <div className="ioContainer startPageFlow">
                 <div className="ioBox welcomeInputBox">
  <h3>Input</h3>

 <div className="ioContent">
  Fixed 24-bit RGB Image Patch / 16×16 Sample Matrix
</div>

  <WelcomeMatrixPreview values={activeRgbMatrix} />
</div>

                  <div className="ioArrow">↓</div>

                 <div className="ioBox processOverviewBox">
  <h3>Process</h3>

  <div className="ioContent">
    <b>JPEG Compression Pipeline</b>
    <br />
    Color Preparation
    <br />
    <span className="processSmallText">RGB → YCbCr + Subsampling</span>
    <br />
    ↓
    <br />
    Block Preparation
    <br />
    <span className="processSmallText">16×16 Patch → 8×8 Blocks + Level Shifting</span>
    <br />
    ↓
    <br />
    Transform Coding
    <br />
    <span className="processSmallText">2D DCT / FDCT</span>
    <br />
    ↓
    <br />
    Quantization
    <br />
    ↓
    <br />
    Entropy Encoding
    <br />
    <span className="processSmallText">
      DC Difference + Zig-Zag + RLE + Huffman
    </span>
  </div>
</div>
                  <div className="ioArrow">↓</div>

                  <div className="ioBox">
                    <h3>Output</h3>
                    <div className="ioContent">
                      Compressed JPEG Bitstream / Image Data
                    </div>
                  </div>

                  <div className="startGoalBox">
  Goal: Reduce image size by removing visually less important information while
  preserving acceptable visual quality.
</div>
                </div>
              ) : activeStep === 1 ? (
  <Step1RGBInput
    rgbMatrixPresets={rgbMatrixPresets}
    selectedMatrixType={selectedMatrixType}
    handleMatrixPresetChange={handleMatrixPresetChange}
    handleRandomMatrix={handleRandomMatrix}
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
    realPhotoStatus={realPhotoStatus}
    onSelectRealPhoto={handleRealPhotoSelect}
    realPhotoCrop={REAL_PHOTO_CROP}
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
    convertSelectedPixelOnly={convertSelectedPixelOnly}
    autoConvertFullMatrix={autoConvertFullMatrix}
    resetStep2Conversion={resetStep2Conversion}
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
  />
) : activeStep === 5 ? (
  <Step5LevelShifting
    selectedBlockData={selectedBlockData}
    onLevelShiftChange={setLevelShiftData}
  />
) : activeStep === 6 ? (
 <Step6DCTTransform
  selectedBlockData={selectedBlockData}
  levelShiftData={levelShiftData}
  onDctChange={setDctData}
/>
) : activeStep === 7 ? (
  <Step7Quantization
    dctData={dctData}
    onQuantizationChange={setQuantizationData}
  />
) : activeStep === 8 ? (
  <Step8DCDifferenceCoding
    quantizationData={quantizationData}
    onDcCodingChange={setDcCodingData}
  />
) : activeStep === 9 ? (
  <Step9ZigZagScanning
    quantizationData={quantizationData}
    dcCodingData={dcCodingData}
    onZigZagChange={setZigZagData}
  />
) : activeStep === 10 ? (
  <Step10RunLengthEncoding
    zigZagData={zigZagData}
    dcCodingData={dcCodingData}
    onRleChange={setRleData}
  />
) : activeStep === 11 ? (
  <Step11HuffmanEncoding
    dcCodingData={dcCodingData}
    rleData={rleData}
    onHuffmanChange={setHuffmanData}
  />
) : activeStep === 12 ? (
  <Step12FinalOutput
    huffmanData={huffmanData}
    rleData={rleData}
    dcCodingData={dcCodingData}
    quantizationData={quantizationData}
    originalBlockData={selectedBlockData}
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

              <div className="explanationBox">
  <h3>Explanation</h3>

  <p>
    {activeStep === 0
      ? "This simulation demonstrates Baseline Sequential JPEG encoding using a fixed 16×16 RGB sample patch. Each pixel is represented as [R, G, B] with 8-bit values from 0 to 255. The patch is converted into Y, Cb and Cr matrices, chroma data is reduced, and the Y component is divided into 8×8 blocks. A selected 8×8 block is then processed through level shifting, DCT, quantization, DC difference coding, zig-zag scanning, run-length encoding and Huffman encoding."
      : activeStep === 1
      ? "JPEG encoding starts with a 24-bit RGB image. In this simulation, the input image is represented as a fixed 16×16 RGB sample patch containing 256 pixels. Each pixel is stored as [R, G, B], where Red, Green and Blue are 8-bit component values in the range 0 to 255. This RGB patch is separated into R, G and B component matrices before RGB to YCbCr conversion."
      : activeStep === 2
      ? "In this step, the same 16×16 RGB sample patch from Step 1 is converted into 16×16 Y, Cb and Cr matrices. Y stores luminance or brightness information, while Cb and Cr store chrominance or color-difference information. This separation is useful in JPEG because the human eye is more sensitive to luminance than chrominance, so Cb and Cr color information can be reduced in the next step."
      : activeStep === 3
      ? "In this step, chroma subsampling is applied to the Y, Cb and Cr matrices from Step 2. The Y matrix remains unchanged at 16×16 because it stores brightness information. The Cb and Cr matrices are downsampled from 16×16 to 8×8 by replacing every 2×2 group with one average value. This reduces color data while keeping the visually important brightness data."
      : activeStep === 4
      ? "In actual JPEG compression, image component samples are divided into non-overlapping 8×8 blocks before level shifting and DCT. In this simulation, the 16×16 Y matrix is divided into four 8×8 blocks: B1, B2, B3 and B4. The selected 8×8 block contains 64 luminance values and becomes the input for Level Shifting."
      : currentStep?.description}
  </p>
</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConceptModal;