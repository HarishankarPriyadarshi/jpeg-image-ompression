import { useMemo, useState } from "react";

const componentDetails = {
  Y: {
    title: "Y Matrix",
    label: "Y",
    meaning: "Luminance / Brightness",
    className: "step2YCell",
  },
  Cb: {
    title: "Cb Matrix",
    label: "Cb",
    meaning: "Blue chrominance difference",
    className: "step2CbCell",
  },
  Cr: {
    title: "Cr Matrix",
    label: "Cr",
    meaning: "Red chrominance difference",
    className: "step2CrCell",
  },
};

function getLuminance(pixel) {
  const [r, g, b] = pixel;
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

function getSoftRgbColor(pixel) {
  const [r, g, b] = pixel;
  const mix = 0.35;

  const softR = Math.round(r + (255 - r) * mix);
  const softG = Math.round(g + (255 - g) * mix);
  const softB = Math.round(b + (255 - b) * mix);

  return `rgb(${softR}, ${softG}, ${softB})`;
}

function getSelectedMatrix(component, yMatrix, cbMatrix, crMatrix) {
  if (component === "Cb") return cbMatrix;
  if (component === "Cr") return crMatrix;
  return yMatrix;
}

function getComponentShortMeaning(component) {
  if (component === "Y") {
    return "Y keeps brightness information. JPEG preserves it more carefully.";
  }

  if (component === "Cb") {
    return "Cb stores blue color-difference information. It can be reduced in chroma subsampling.";
  }

  return "Cr stores red color-difference information. It can be reduced in chroma subsampling.";
}

function RgbInputGrid({
  values,
  selectedPixelIndex,
  setSelectedPixelIndex,
  convertedPixelIndexes,
}) {
  const matrixSize = values.length;

  return (
    <div
      className="step2RgbGrid"
      style={{
        gridTemplateColumns: `repeat(${matrixSize}, 28px)`,
      }}
    >
      {values.flat().map((pixel, index) => {
        const isSelected = selectedPixelIndex === index;
        const isConverted = convertedPixelIndexes.includes(index);

        return (
          <button
            key={`step2-rgb-${index}`}
            type="button"
            className={`step2RgbPixel ${isSelected ? "step2SelectedRgbPixel" : ""} ${
              isConverted ? "step2ConvertedRgbPixel" : ""
            }`}
            style={{
              backgroundColor: getSoftRgbColor(pixel),
              color: "#06142f",
            }}
            onClick={() => setSelectedPixelIndex(index)}
            title={`P${index + 1}: RGB(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`}
          >
            P{index + 1}
          </button>
        );
      })}
    </div>
  );
}

function OutputMatrixGrid({
  values,
  activeComponent,
  selectedPixelIndex,
  convertedPixelIndexes,
}) {
  const matrixSize = values.length;
  const component = componentDetails[activeComponent];

  return (
    <div
      className="step2OutputGrid"
      style={{
        gridTemplateColumns: `repeat(${matrixSize}, 28px)`,
      }}
    >
      {values.flat().map((value, index) => {
        const isSelected = selectedPixelIndex === index;
        const isRevealed = convertedPixelIndexes.includes(index);

        return (
          <span
            key={`step2-output-${activeComponent}-${index}`}
            className={`${component.className} ${
              isSelected ? "step2SelectedOutputCell" : ""
            } ${isRevealed ? "step2RevealedOutputCell" : "step2HiddenOutputCell"}`}
          >
            {isRevealed ? value : "—"}
          </span>
        );
      })}
    </div>
  );
}

function Step2YCbCrConversion({
  activeRgbMatrix,
  selectedPixelIndex,
  setSelectedPixelIndex,
  selectedPixel,
  selectedYCbCr,
  yMatrix,
  cbMatrix,
  crMatrix,
  convertedPixelIndexes,
  isAutoConverting,
  showSelectedCalculation,
  convertSelectedPixelOnly,
  autoConvertFullMatrix,
  resetStep2Conversion,
}) {
  const [activeComponent, setActiveComponent] = useState("Y");

  const matrixSize = activeRgbMatrix.length;
  const totalPixels = activeRgbMatrix.flat().length;

  const convertedCount = convertedPixelIndexes.length;
  const progressPercent = totalPixels
    ? Math.round((convertedCount / totalPixels) * 100)
    : 0;

  const selectedRow = Math.floor(selectedPixelIndex / matrixSize);
  const selectedCol = selectedPixelIndex % matrixSize;

  const [r, g, b] = selectedPixel;
  const [y, cb, cr] = selectedYCbCr;

  const outputMatrix = useMemo(
    () => getSelectedMatrix(activeComponent, yMatrix, cbMatrix, crMatrix),
    [activeComponent, yMatrix, cbMatrix, crMatrix]
  );

  const isSelectedConverted = convertedPixelIndexes.includes(selectedPixelIndex);
  const shouldShowSelectedConversion =
    showSelectedCalculation || isSelectedConverted;

  const activeDetails = componentDetails[activeComponent];

  return (
    <div className="step2SimplePage">
      <div className="step2ConceptBox">
        <div>
          <strong>Step 2 Concept:</strong> The same {matrixSize}×{matrixSize} RGB
          patch from Step 1 is converted into <b>Y</b>, <b>Cb</b> and <b>Cr</b>{" "}
          matrices.
        </div>

        <div>
          <strong>Why?</strong> Y stores brightness information, while Cb and Cr
          store color-difference information. JPEG separates brightness and color
          so that color data can be reduced in the next step.
        </div>

        <div>
          <strong>Output:</strong> {matrixSize}×{matrixSize} Y matrix +{" "}
          {matrixSize}×{matrixSize} Cb matrix + {matrixSize}×{matrixSize} Cr
          matrix.
        </div>
      </div>

      <div className="step2FormulaBox">
        <h3>RGB to YCbCr Formula</h3>

        <div className="step2FormulaGrid">
          <div>
            <b>Y</b> = 0.299R + 0.587G + 0.114B
          </div>

          <div>
            <b>Cb</b> = -0.169R - 0.334G + 0.500B + 128
          </div>

          <div>
            <b>Cr</b> = 0.500R - 0.419G - 0.081B + 128
          </div>
        </div>

        <p>
          In this simulation, results are rounded and kept inside the valid
          8-bit range 0–255.
        </p>
      </div>

      <div className="step2ControlBar">
        <button
          type="button"
          onClick={convertSelectedPixelOnly}
          disabled={isAutoConverting}
        >
          Convert Selected Pixel
        </button>

        <button
          type="button"
          onClick={autoConvertFullMatrix}
          disabled={isAutoConverting}
        >
          {isAutoConverting ? "Converting..." : "Auto Convert Full Matrix"}
        </button>

        <button type="button" onClick={resetStep2Conversion}>
          Reset
        </button>
      </div>

      <div className="step2ProgressBox">
        <div className="step2ProgressTop">
          <span>
            Converted Pixels: {convertedCount} / {totalPixels}
          </span>

          <strong>{progressPercent}%</strong>
        </div>

        <div className="step2ProgressTrack">
          <div
            className="step2ProgressFill"
            style={{
              width: `${progressPercent}%`,
            }}
          />
        </div>
      </div>

      <div className="step2MainGrid">
        <div className="step2Card">
          <h3>Input: Same RGB Patch from Step 1</h3>

          <RgbInputGrid
            values={activeRgbMatrix}
            selectedPixelIndex={selectedPixelIndex}
            setSelectedPixelIndex={setSelectedPixelIndex}
            convertedPixelIndexes={convertedPixelIndexes}
          />

          <p className="step2SmallNote">
            Click any pixel, then press Convert Selected Pixel to see the
            formula applied on that pixel.
          </p>
        </div>

        <div className="step2SelectedCard">
          <h3>Selected Pixel Conversion</h3>

          <div className="step2SelectedLabel">
            Selected Pixel: P{selectedPixelIndex + 1}
          </div>

          <div className="step2PositionBox">
            Row {selectedRow}, Col {selectedCol}
          </div>

          <div className="step2RgbValue">
            RGB = [{r}, {g}, {b}]
          </div>

          <div className="step2DownArrow">↓</div>

          {shouldShowSelectedConversion ? (
            <>
              <div className="step2YcbcrValue">
                YCbCr = [{y}, {cb}, {cr}]
              </div>

              <div className="step2ComponentResultGrid">
                <div className="step2YResult">
                  <span>Y</span>
                  <strong>{y}</strong>
                </div>

                <div className="step2CbResult">
                  <span>Cb</span>
                  <strong>{cb}</strong>
                </div>

                <div className="step2CrResult">
                  <span>Cr</span>
                  <strong>{cr}</strong>
                </div>
              </div>

              <div className="step2CalculationBox">
                <div>
                  Y = 0.299({r}) + 0.587({g}) + 0.114({b}) = <b>{y}</b>
                </div>

                <div>
                  Cb = -0.169({r}) - 0.334({g}) + 0.500({b}) + 128 ={" "}
                  <b>{cb}</b>
                </div>

                <div>
                  Cr = 0.500({r}) - 0.419({g}) - 0.081({b}) + 128 ={" "}
                  <b>{cr}</b>
                </div>
              </div>
            </>
          ) : (
            <div className="step2PendingBox">
              Conversion output is hidden. Click Convert Selected Pixel or Auto
              Convert Full Matrix.
            </div>
          )}
        </div>
      </div>

      <div className="step2OutputCard">
        <div className="step2OutputHeader">
          <div>
            <h3>Output: Y, Cb and Cr Matrices</h3>
            <p>{getComponentShortMeaning(activeComponent)}</p>
          </div>

          <div className="step2MatrixTabs">
            {Object.entries(componentDetails).map(([key, details]) => (
              <button
                key={key}
                type="button"
                className={activeComponent === key ? "step2ActiveTab" : ""}
                onClick={() => setActiveComponent(key)}
              >
                {details.label}
              </button>
            ))}
          </div>
        </div>

        <div className="step2ActiveMatrixTitle">
          <strong>{activeDetails.title}</strong>
          <span>{activeDetails.meaning}</span>
        </div>

        <OutputMatrixGrid
          values={outputMatrix}
          activeComponent={activeComponent}
          selectedPixelIndex={selectedPixelIndex}
          convertedPixelIndexes={convertedPixelIndexes}
        />

        <p className="step2SmallNote">
          Values appear only after conversion. The selected pixel is highlighted
          in the active output matrix.
        </p>
      </div>

      <div className="rgbInfoBox">
        Step 2 Output = 16×16 Y Matrix + 16×16 Cb Matrix + 16×16 Cr Matrix
      </div>
    </div>
  );
}

export default Step2YCbCrConversion;