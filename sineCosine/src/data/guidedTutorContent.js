// Detailed step-by-step tutorial content shown by the "Guided Tutor" panel.
// Kept separate from steps.js (which only holds the short sidebar
// title/description) so the tutor can explain each step in more depth
// without cluttering the compact step list.

const guidedTutorContent = [
  {
    id: 1,
    title: "Step 1 — Input Image Selection",
    intro:
      "Every compression pipeline needs a starting image. Here you either pick a ready-made 16×16 grayscale pattern or generate a random one.",
    tips: [
      "Click any of the four preset cards (Smooth, Edge, Texture, Gradient) to load a sample 16×16 pixel matrix — each highlights a different kind of image content.",
      "\"Generate Random Matrix\" fills all 256 pixels with random 0-255 brightness values, useful for testing the pipeline on unpredictable data.",
      "Each pixel value (0-255) is a grayscale brightness — 0 is black, 255 is white.",
      "The Pixel Matrix table and the Image Preview canvas always show the same data, just in two forms: numbers and a picture.",
      "Once a matrix is selected, click \"Start\" / \"Next\" to move on to Image Blocking.",
    ],
  },
  {
    id: 2,
    title: "Step 2 — Image Blocking",
    intro:
      "Real compression never transforms a whole image at once — it splits it into small, fixed-size blocks first.",
    tips: [
      "The 16×16 image is divided into four 8×8 blocks (B1-B4), matching how JPEG-style codecs process images in 8×8 tiles.",
      "Pick one block (B1-B4) to carry forward through the rest of the pipeline — every later step works on this single block.",
      "Click \"Create Processing Block\" to lock in your selection before moving on.",
    ],
  },
  {
    id: 3,
    title: "Step 3 — Generate DCT/DST Basis Matrix",
    intro:
      "Before transforming any pixel data, the pipeline builds the mathematical basis matrix it will use.",
    tips: [
      "DCT (Discrete Cosine Transform) uses cosine waves; DST (Discrete Sine Transform) uses sine waves — pick whichever transform you want to explore.",
      "Each entry of the 8×8 basis matrix comes from evaluating the cosine/sine formula at a frequency index (u) and a pixel position (x).",
      "This matrix only depends on the fixed 8×8 size, not on the image — so it's generated once and reused for every block.",
      "Click \"Generate\" to watch the matrix fill in cell by cell.",
    ],
  },
  {
    id: 4,
    title: "Step 4 — Apply DCT/DST",
    intro:
      "This is where the actual transform happens: pixel values become frequency-domain coefficients.",
    tips: [
      "The formula is F = T × Block × Tᵀ, where T is the basis matrix from Step 3 and Block is the 8×8 pixel block from Step 2.",
      "The top-left value (DC term) represents the average brightness of the block; values further down/right represent higher-frequency detail.",
      "Most natural images concentrate their energy in the top-left corner — this is exactly what makes compression possible later.",
    ],
  },
  {
    id: 5,
    title: "Step 5 — Quantization",
    intro:
      "Quantization is where actual data is discarded — this is the \"lossy\" part of lossy compression.",
    tips: [
      "A quantization table scales with the Quality Factor slider — lower quality means more aggressive rounding, especially for high-frequency terms.",
      "Each frequency coefficient is divided by its matching quantization-table entry and rounded, often turning small high-frequency values into zero.",
      "More zeros here means better compression later, at the cost of some image detail.",
    ],
  },
  {
    id: 6,
    title: "Step 6 — Zig-Zag Scan",
    intro:
      "Before encoding, the 8×8 grid of quantized values is flattened into a single ordered list.",
    tips: [
      "The zig-zag path starts at the DC term (top-left) and sweeps diagonally toward the highest-frequency term (bottom-right).",
      "This ordering groups low frequencies first and pushes the (usually zero) high frequencies together at the end.",
      "Grouping the zeros together is exactly what makes the next step, Run-Length Encoding, effective.",
    ],
  },
  {
    id: 7,
    title: "Step 7 — Encoding",
    intro:
      "Run-Length Encoding (RLE) compresses the zig-zag list by describing runs of zeros instead of storing every zero individually.",
    tips: [
      "Each non-zero value is stored as a (run-of-zeros, value) pair — e.g. (3, 5) means \"three zeros, then a 5\".",
      "Once only zeros remain until the end of the block, an End-Of-Block (EOB) marker replaces all of them.",
      "The more zeros a block has after quantization, the shorter its encoded representation — this is the real compression payoff.",
    ],
  },
  {
    id: 8,
    title: "Step 8 — Comparison",
    intro:
      "Finally, the pipeline reverses itself (dequantize → inverse transform) and compares the result with the original image.",
    tips: [
      "MSE (Mean Squared Error) measures the average squared difference between original and reconstructed pixel values — lower is better.",
      "PSNR (Peak Signal-to-Noise Ratio) converts MSE into a decibel scale that's easier to interpret — higher PSNR means a closer match to the original.",
      "Compare results across different Quality Factors to see the classic trade-off: more compression usually means lower PSNR (more visible loss).",
    ],
  },
];

export default guidedTutorContent;
