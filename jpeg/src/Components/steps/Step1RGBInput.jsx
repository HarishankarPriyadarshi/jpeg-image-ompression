import { useState } from "react";

function getPreviewTiles(type) {
  const palettes = {
    bright: ["#fff9e8", "#ffefc2", "#ffe28a", "#ffe9b3", "#fff3d1", "#ffdb70", "#fff6de", "#ffe6a3", "#ffd766"],
    dark: ["#232b45", "#10182b", "#1a2338", "#0c1220", "#2a3350", "#161d33", "#0f1526", "#242c48", "#131a2c"],
    random: ["#ff5f6d", "#47cf73", "#2f6bff", "#ffc371", "#a855f7", "#22d3ee", "#f43f5e", "#facc15", "#34d399"],
  };
  return palettes[type] || palettes.random;
}

function MatrixCardPreview({ type }) {
  return (
    <div className="matrixCardPreview">
      {getPreviewTiles(type).map((color, i) => (
        <span key={i} style={{ backgroundColor: color }} />
      ))}
    </div>
  );
}

function clampRgb(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
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
          gridTemplateColumns: `repeat(${matrixSize}, 1fr)`,
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
  randomPatternName,
  activeRgbMatrix,
  selectedPixelIndex,
  setSelectedPixelIndex,
  selectedPixel,
  redMatrix,
  greenMatrix,
  blueMatrix,
}) {
  const [showChannels, setShowChannels] = useState(false);

  const matrixSize = activeRgbMatrix ? activeRgbMatrix.length : 16;
  const totalPixels = activeRgbMatrix ? activeRgbMatrix.flat().length : 0;

  const selectedRow = Math.floor(selectedPixelIndex / matrixSize);
  const selectedCol = selectedPixelIndex % matrixSize;

  const isValidRgbMatrix = activeRgbMatrix
    ? activeRgbMatrix.flat().every(
        (pixel) =>
          Array.isArray(pixel) &&
          pixel.length === 3 &&
          pixel.every((value) => value >= 0 && value <= 255)
      )
    : false;

  const matrixLabel =
    selectedMatrixType === "random"
      ? `Random Matrix${randomPatternName ? ` — ${randomPatternName}` : ""}`
      : rgbMatrixPresets[selectedMatrixType]?.label || "No Matrix Selected";

  const matrixCardMeta = {
    bright: {
      desc: "High-brightness 16×16 sample",
    },
    dark: {
      desc: "Low-brightness 16×16 sample",
    },
    random: {
      desc: "Randomized RGB values",
    },
  };

  return (
    <div className="step1SimplePage">
      <div className="matrixSelectorPanel">
        <div className="matrixSelectorHeader">
          <span className="matrixSelectorTitle">Choose RGB Matrix</span>
          <span className="matrixSelectorSubtitle">
            {activeRgbMatrix
              ? `Selected: ${matrixLabel}`
              : "Select one matrix to begin"}
          </span>
        </div>

        <div className="matrixSelectorGrid">
          {Object.entries(rgbMatrixPresets).map(([type, preset]) => (
            <button
              key={type}
              type="button"
              className={`matrixSelectorCard ${
                selectedMatrixType === type ? "matrixSelectorCardActive" : ""
              }`}
              onClick={() => handleMatrixPresetChange(type)}
            >
              {selectedMatrixType === type && (
                <span className="matrixCardCheck">✓ Selected</span>
              )}
              <MatrixCardPreview type={type} />
              <span className="matrixCardLabel">{preset.label}</span>
              <span className="matrixCardDesc">{matrixCardMeta[type].desc}</span>
            </button>
          ))}

          <button
            type="button"
            className={`matrixSelectorCard ${
              selectedMatrixType === "random" ? "matrixSelectorCardActive" : ""
            }`}
            onClick={handleRandomMatrix}
          >
            {selectedMatrixType === "random" && (
              <span className="matrixCardCheck">✓ Selected</span>
            )}
            <MatrixCardPreview type="random" />
            <span className="matrixCardLabel">Random Matrix</span>
            <span className="matrixCardDesc">{matrixCardMeta.random.desc}</span>
          </button>
        </div>
      </div>

      {!activeRgbMatrix && (
        <div className="step1EmptyStateWrap">
          <div className="step1EmptyState">
            <div className="step1EmptyIcon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="7" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.8" />
                <rect x="14" y="3" width="7" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.8" />
                <rect x="3" y="14" width="7" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.8" />
                <rect x="14" y="14" width="7" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </div>
            <div className="step1EmptyTextCol">
              <h3>Select a Matrix to Begin</h3>
              <p>
                Choose Bright, Dark or Random from the options above — the
                16×16 pixel grid and R/G/B channel matrices will appear here
                instantly.
              </p>
              <div className="step1EmptyHints">
                <span>One click to select</span>
                <span>16×16 RGB sample</span>
                <span>Inspect any pixel</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeRgbMatrix && (
      <div className="step1SimpleMainGrid">
        <div className="step1SimpleCard">
          <h3>{matrixLabel}</h3>

          <>
          <div className="step1SimplePatchGridScroll">
          <div
            className="step1SimplePatchGrid"
            style={{
              gridTemplateColumns: `repeat(${matrixSize}, 1fr)`,
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
                <span className="pixelPrefix">P</span>
                <span className="pixelNumber">{index + 1}</span>
              </button>
            ))}
          </div>
          </div>

          <p className="matrixNote">
            This grid is the visual form of the input RGB image patch. Click any
            pixel to inspect its Red, Green and Blue values.
          </p>
          </>
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
      )}

      {activeRgbMatrix && (
      <div className="step1SimpleActionRow">
        <button type="button" onClick={() => setShowChannels((prev) => !prev)}>
          {showChannels
            ? "Hide R/G/B Matrices"
            : "Separate RGB Components into Matrices"}
        </button>
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
    </div>
  );
}

export default Step1RGBInput;
