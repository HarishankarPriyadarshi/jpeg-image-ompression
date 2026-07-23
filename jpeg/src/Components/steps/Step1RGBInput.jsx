import { useMemo, useState } from "react";

const formulaConfig = {
  sample: {
    title: "Sample Patch",
    r: { base: 245, rowStep: 4, colStep: 3 },
    g: { base: 218, rowStep: 3, colStep: 2 },
    b: { base: 180, rowStep: 2, colStep: 1 },
  },
  bright: {
    title: "Bright Patch",
    r: { base: 255, rowStep: 3, colStep: 2 },
    g: { base: 245, rowStep: 2, colStep: 1 },
    b: { base: 235, rowStep: 1, colStep: 1 },
  },
  dark: {
    title: "Dark Patch",
    r: { base: 150, rowStep: 3, colStep: 2 },
    g: { base: 130, rowStep: 2, colStep: 1 },
    b: { base: 115, rowStep: 1, colStep: 1 },
  },
};

function clampRgb(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function getGeneratedValue(channel, row, col) {
  return clampRgb(channel.base - row * channel.rowStep - col * channel.colStep);
}

function getLuminance(pixel) {
  const [r, g, b] = pixel;
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}
function getTextColor() {
  return "#06142f";
}

function getSoftRgbColor(pixel) {
  const [r, g, b] = pixel;
  const mix = 0.35;

  const softR = Math.round(r + (255 - r) * mix);
  const softG = Math.round(g + (255 - g) * mix);
  const softB = Math.round(b + (255 - b) * mix);

  return `rgb(${softR}, ${softG}, ${softB})`;
}

function ChannelMatrix({
  title,
  values,
  channelClass,
  selectedPixelIndex,
  matrixSize,
}) {
  return (
    <div className={`step1SimpleChannelCard ${channelClass}`}>
      <h4>{title}</h4>

      <div
        className="step1SimpleChannelGrid"
        style={{
          gridTemplateColumns: `repeat(${matrixSize}, 24px)`,
        }}
      >
        {values.flat().map((value, index) => (
          <span
            key={`${title}-${index}`}
            className={
              selectedPixelIndex === index ? "step1SimpleSelectedCell" : ""
            }
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function Step1RGBInput({
  rgbMatrixPresets,
  selectedMatrixType,
  handleMatrixPresetChange,
  handleRandomMatrix,
  activeRgbMatrix,
  selectedPixelIndex,
  setSelectedPixelIndex,
  selectedPixel,
  redMatrix,
  greenMatrix,
  blueMatrix,
  realPhotoStatus,
  onSelectRealPhoto,
  realPhotoCrop,
}) {
  const [showTupleMatrix, setShowTupleMatrix] = useState(false);
  const [showFormula, setShowFormula] = useState(false);
  const [showChannels, setShowChannels] = useState(false);

  const matrixSize = activeRgbMatrix.length;
  const totalPixels = activeRgbMatrix.flat().length;

  const selectedRow = Math.floor(selectedPixelIndex / matrixSize);
  const selectedCol = selectedPixelIndex % matrixSize;

  const selectedFormula = formulaConfig[selectedMatrixType] || null;

  const formulaResult = useMemo(() => {
    if (!selectedFormula) return null;

    return {
      r: getGeneratedValue(selectedFormula.r, selectedRow, selectedCol),
      g: getGeneratedValue(selectedFormula.g, selectedRow, selectedCol),
      b: getGeneratedValue(selectedFormula.b, selectedRow, selectedCol),
    };
  }, [selectedFormula, selectedRow, selectedCol]);

  const isValidRgbMatrix = activeRgbMatrix.flat().every(
    (pixel) =>
      Array.isArray(pixel) &&
      pixel.length === 3 &&
      pixel.every((value) => value >= 0 && value <= 255)
  );

  return (
    <div className="step1SimplePage">
      <div className="matrixCategoryBar">
        <span className="matrixCategoryLabel">Choose RGB Matrix:</span>

        {Object.entries(rgbMatrixPresets).map(([type, preset]) => (
          <button
            key={type}
            type="button"
            className={`matrixPresetBtn ${
              selectedMatrixType === type ? "activeMatrixPreset" : ""
            }`}
            onClick={() => handleMatrixPresetChange(type)}
          >
            {preset.label}
          </button>
        ))}

        <button
          type="button"
          className={`matrixPresetBtn randomPresetBtn ${
            selectedMatrixType === "random" ? "activeMatrixPreset" : ""
          }`}
          onClick={handleRandomMatrix}
        >
          Random Matrix
        </button>

        <button
          type="button"
          className={`matrixPresetBtn realPhotoPresetBtn ${
            selectedMatrixType === "real" ? "activeMatrixPreset" : ""
          }`}
          onClick={onSelectRealPhoto}
          disabled={realPhotoStatus !== "ready"}
          title="Loads actual RGB pixel values from a real photo using canvas getImageData()"
        >
          {realPhotoStatus === "ready"
            ? "Real Photo Patch (Live Pixels)"
            : realPhotoStatus === "error"
            ? "Real Photo Unavailable"
            : "Loading Real Photo..."}
        </button>
      </div>

      <div className="step1SimpleConceptBox">
        <div>
          <strong>Step 1 Concept:</strong> JPEG starts with a 24-bit RGB image.
          Each pixel is stored as <b>[R, G, B]</b>, where R, G and B are 8-bit
          values from <b>0 to 255</b>.
        </div>

        <div>
          <strong>Current Matrix:</strong> {matrixSize}×{matrixSize} RGB patch ={" "}
          {totalPixels} pixels.
          <span className={isValidRgbMatrix ? "step1ValidText" : "step1ErrorText"}>
            {" "}
            {isValidRgbMatrix ? "Valid RGB range." : "Invalid RGB values."}
          </span>
        </div>

        <div>
          <strong>Note:</strong> No compression happens in Step 1. This step
          only prepares RGB values for RGB to YCbCr conversion.
        </div>
      </div>

      <div className="step1SimpleMainGrid">
        <div className="step1SimpleCard">
          <h3>Input: {matrixSize}×{matrixSize} RGB Sample Patch</h3>

          <div
            className="step1SimplePatchGrid"
            style={{
              gridTemplateColumns: `repeat(${matrixSize}, 30px)`,
            }}
          >
            {activeRgbMatrix.flat().map((pixel, index) => (
              <button
                key={`pixel-${index}`}
                type="button"
                className={`step1SimplePixel ${
                  selectedPixelIndex === index ? "step1SimplePixelActive" : ""
                }`}
                style={{
                  backgroundColor: getSoftRgbColor(pixel),
                  color: getTextColor(pixel),
                }}
                onClick={() => setSelectedPixelIndex(index)}
                title={`P${index + 1}: RGB(${pixel[0]}, ${pixel[1]}, ${
                  pixel[2]
                })`}
              >
                P{index + 1}
              </button>
            ))}
          </div>

          <p className="matrixNote">
            This grid is the visual form of the input RGB image patch. Click any
            pixel to inspect its Red, Green and Blue values.
          </p>
        </div>

        <div className="step1SimpleInspector">
          <h3>Selected RGB Pixel</h3>

          <div className="selectedPixelLabel">
            Selected Pixel: P{selectedPixelIndex + 1}
          </div>

          <div className="step1SimplePosition">
            Row {selectedRow}, Col {selectedCol}
          </div>

          <div className="selectedRgbValue">
            RGB = [{selectedPixel[0]}, {selectedPixel[1]}, {selectedPixel[2]}]
          </div>

          <div className="componentList">
            <div className="componentItem redItem">
              <span>Red Component</span>
              <strong>{selectedPixel[0]}</strong>
            </div>

            <div className="componentItem greenItem">
              <span>Green Component</span>
              <strong>{selectedPixel[1]}</strong>
            </div>

            <div className="componentItem blueItem">
              <span>Blue Component</span>
              <strong>{selectedPixel[2]}</strong>
            </div>
          </div>

          <div className="colorPreviewWrap">
            <span>Pixel Color Preview</span>

            <div
              className="colorPreviewBox"
              style={{
                backgroundColor: `rgb(${selectedPixel[0]}, ${selectedPixel[1]}, ${selectedPixel[2]})`,
              }}
            />
          </div>

          <p className="inspectorHint">
            One RGB pixel stores three separate color component values.
          </p>
        </div>
      </div>

      <div className="step1SimpleActionRow">
        <button type="button" onClick={() => setShowFormula((prev) => !prev)}>
          {showFormula ? "Hide Value Source Formula" : "Show Value Source Formula"}
        </button>

        <button
          type="button"
          onClick={() => setShowTupleMatrix((prev) => !prev)}
        >
          {showTupleMatrix ? "Hide RGB Tuple Matrix" : "Show Full RGB Tuple Matrix"}
        </button>

        <button type="button" onClick={() => setShowChannels((prev) => !prev)}>
          {showChannels
            ? "Hide R/G/B Matrices"
            : "Separate RGB Components into Matrices"}
        </button>
      </div>

      {showFormula && (
        <div className="step1SimpleCard step1SimpleFade">
          <h3>Value Source / Validity</h3>

          {selectedFormula ? (
            <>
              <p className="step1SimpleFormulaIntro">
                This is a fixed synthetic RGB sample patch. The values are not
                copied from a paper; they are generated using a smooth gradient
                formula while keeping every R, G and B value inside 0–255.
              </p>

              <div className="step1SimpleFormulaGrid">
                <div>
                  R(row, col) = {selectedFormula.r.base} −{" "}
                  {selectedFormula.r.rowStep}row −{" "}
                  {selectedFormula.r.colStep}col
                </div>

                <div>
                  G(row, col) = {selectedFormula.g.base} −{" "}
                  {selectedFormula.g.rowStep}row −{" "}
                  {selectedFormula.g.colStep}col
                </div>

                <div>
                  B(row, col) = {selectedFormula.b.base} −{" "}
                  {selectedFormula.b.rowStep}row −{" "}
                  {selectedFormula.b.colStep}col
                </div>
              </div>

              <div className="step1SimpleCalculation">
                <h4>Selected Pixel Calculation</h4>

                <div>
                  R = {selectedFormula.r.base} − {selectedFormula.r.rowStep}(
                  {selectedRow}) − {selectedFormula.r.colStep}({selectedCol}) ={" "}
                  <b>{formulaResult.r}</b>
                </div>

                <div>
                  G = {selectedFormula.g.base} − {selectedFormula.g.rowStep}(
                  {selectedRow}) − {selectedFormula.g.colStep}({selectedCol}) ={" "}
                  <b>{formulaResult.g}</b>
                </div>

                <div>
                  B = {selectedFormula.b.base} − {selectedFormula.b.rowStep}(
                  {selectedRow}) − {selectedFormula.b.colStep}({selectedCol}) ={" "}
                  <b>{formulaResult.b}</b>
                </div>
              </div>
            </>
          ) : selectedMatrixType === "real" ? (
            <>
              <p className="step1SimpleFormulaIntro">
                These are <b>real pixel values</b>, not generated by any
                formula. A real photo is loaded in the browser, drawn onto an
                HTML canvas, and a 16×16 pixel block is read directly using{" "}
                <b>canvas.getImageData()</b> starting at real image position
                row {realPhotoCrop?.row}, col {realPhotoCrop?.col}.
              </p>

              <div className="step1SimpleCalculation">
                <h4>How This Pixel's Value Was Obtained</h4>

                <div>
                  Source image pixel = (row {realPhotoCrop?.row + selectedRow},
                  col {realPhotoCrop?.col + selectedCol}) of the real photo
                </div>

                <div>
                  getImageData() returns raw bytes → this pixel&apos;s actual
                  bytes are{" "}
                  <b>
                    [{selectedPixel[0]}, {selectedPixel[1]}, {selectedPixel[2]}]
                  </b>
                </div>

                <div>
                  No rounding, no generation — this is the exact stored RGB
                  value of that real image pixel.
                </div>
              </div>
            </>
          ) : (
            <p className="step1SimpleFormulaIntro">
              Random Matrix creates random valid RGB values between 0 and 255.
              It is useful for testing, but the fixed sample matrix is better
              for explaining JPEG compression.
            </p>
          )}
        </div>
      )}

      {showTupleMatrix && (
        <div className="step1SimpleCard step1SimpleFade">
          <h3>RGB Pixel Matrix Form</h3>

          <div className="step1SimpleTupleScroll">
            <div
              className="step1SimpleTupleGrid"
              style={{
                gridTemplateColumns: `repeat(${matrixSize}, 84px)`,
              }}
            >
              {activeRgbMatrix.flat().map((pixel, index) => (
                <button
                  key={`tuple-${index}`}
                  type="button"
                  className={`step1SimpleTupleCell ${
                    selectedPixelIndex === index
                      ? "step1SimpleTupleActive"
                      : ""
                  }`}
                  onClick={() => setSelectedPixelIndex(index)}
                >
                  [{pixel[0]},{pixel[1]},{pixel[2]}]
                </button>
              ))}
            </div>
          </div>

          <p className="matrixNote">
            These are the same pixels shown as [R, G, B] tuples before RGB to
            YCbCr conversion.
          </p>
        </div>
      )}

      {showChannels && (
        <div className="step1SimpleCard step1SimpleFade">
          <h3>Output: R, G and B Component Matrices</h3>

          <div className="step1SimpleProcess">
            RGB Pixel Matrix → R Matrix + G Matrix + B Matrix
          </div>

          <div className="step1SimpleChannelRow">
            <ChannelMatrix
              title="R Matrix"
              values={redMatrix}
              channelClass="step1RedMatrix"
              selectedPixelIndex={selectedPixelIndex}
              matrixSize={matrixSize}
            />

            <ChannelMatrix
              title="G Matrix"
              values={greenMatrix}
              channelClass="step1GreenMatrix"
              selectedPixelIndex={selectedPixelIndex}
              matrixSize={matrixSize}
            />

            <ChannelMatrix
              title="B Matrix"
              values={blueMatrix}
              channelClass="step1BlueMatrix"
              selectedPixelIndex={selectedPixelIndex}
              matrixSize={matrixSize}
            />
          </div>

          <p className="matrixNote">
            The selected pixel value is highlighted in each component matrix.
            These R, G and B values become the input for Step 2.
          </p>
        </div>
      )}

      <div className="rgbInfoBox">
        Step 1 Output = RGB pixel matrix + R, G and B component matrices
      </div>
    </div>
  );
}

export default Step1RGBInput;
