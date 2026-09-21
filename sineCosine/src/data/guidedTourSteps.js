// Guided Tour configuration — one array of "sub-steps" per pipeline step id.
// Each sub-step can:
//   - just point at an element and explain it (informational), or
//   - require the user to actually perform an action before the tour moves on
//     (requireAction: true + check(ctx) => boolean), showing a red
//     "Action Required" tooltip until the condition becomes true, then
//     auto-advancing.
//
// Shape of a sub-step:
// {
//   title: string,
//   target: ".cssSelector" | null,      // element to highlight + anchor to (null = centered)
//   body: string,                        // shown (and spoken) once satisfied
//   requireAction?: true,
//   check?: (ctx) => boolean,            // ctx = the useMatrix() context value
//   waitingTarget?: ".cssSelector",      // element to anchor to while NOT satisfied
//   waitingBody?: string,                // shown (and spoken) while NOT satisfied
// }
//
// To add a tour for another pipeline step, add a new `<id>: [ ... ]` entry
// below — nothing else needs to change, GuidedTour.jsx reads this file.

const guidedTourSteps = {
  1: [
    {
      title: "Welcome",
      target: ".guidedTutorBtn",
      body:
        "Welcome to the Sine & Cosine Compression Visualizer! In this simulation you will see, step by step, how an image is compressed using DCT and DST — starting from choosing an image, all the way to comparing the compressed result with the original.",
    },
    {
      title: "Instruction Panel",
      target: ".controlButtons",
      body:
        "Use the Prev and Next buttons here to move through each step of the compression pipeline, one at a time, in order.",
    },
    {
      title: "Pipeline Steps",
      target: ".stepsList",
      body:
        "This list shows all 8 steps of the pipeline. The step you're currently on is highlighted in blue, and steps you've already completed turn green.",
    },
    {
      title: "Select Input Image",
      target: ".matrixSelection",
      body:
        "Select one of these predefined grayscale image matrices, or generate a random one. This 16 by 16 image will be used throughout the compression pipeline.",
    },
    {
      title: "Generate Random Matrix",
      target: ".randomButton",
      body:
        "You can also click 'Generate Random Matrix' instead of picking a predefined one — it creates a random 16 × 16 grayscale image, useful for testing the pipeline on unpredictable pixel data.",
    },
    {
      title: "Select an Image",
      target: ".selectedMatrixCard",
      waitingTarget: ".matrixSelection",
      body:
        "Here you can see the selected image's pixel matrix on the left, and a preview of what it looks like on the right.",
      waitingBody: "Please click one of the image cards above to continue.",
      requireAction: true,
      check: (ctx) => !!ctx.selectedMatrix,
    },
  ],
  2: [
    {
      title: "Choose a Block",
      target: ".blockOverlay",
      body:
        "The 16 × 16 image is divided into four 8 × 8 blocks — B1, B2, B3 and B4. DCT/DST is applied one block at a time, so first pick which block to process.",
    },
    {
      title: "Block Selected",
      // Stay on the input-image side (same spot as "Choose a Block") both
      // while waiting and once selected — the Processing Block panel is
      // still empty at this point, so highlighting it here would look
      // identical to the next sub-step once the block is actually created.
      target: ".blockOverlay",
      body:
        "The block you picked is now highlighted on the image, and its 8 × 8 region is about to be copied into the Processing Block panel on the right.",
      waitingBody: "Click one of the B1, B2, B3 or B4 tiles on the image to select a block.",
      requireAction: true,
      check: (ctx) => !!ctx.selectedBlock,
    },
    {
      title: "Create Processing Block",
      target: ".processingBlock",
      waitingTarget: ".blockButton",
      body:
        "The scan is complete — all 64 pixel values from your chosen block have been copied into the Processing Block matrix, ready for the next step.",
      waitingBody: "Click 'Create Processing Block' to scan the selected 8 × 8 region into the processing block.",
      requireAction: true,
      check: (ctx) => !!ctx.blockCreated,
    },
    {
      title: "Block Summary",
      target: ".blockInfo",
      body:
        "This summary shows the Block ID, its dimensions (8 × 8), and the total pixel count (64). This exact block moves forward into the DCT/DST transform in the next step.",
    },
  ],
  3: [
    {
      title: "Selected Block",
      target: ".blockCard",
      body:
        "This is the same 8 × 8 image block you selected in the previous step. Its pixel values will be used together with the basis matrix to compute frequency coefficients.",
    },
    {
      title: "Choose a Transform",
      target: ".toggleButtons",
      body:
        "You've picked a transform. DCT builds its basis matrix from cosine waves, DST from sine waves — both convert the block from the spatial domain into the frequency domain, just with different basis functions.",
      waitingBody: "Click DCT or DST above to choose which transform to generate a basis matrix for.",
      requireAction: true,
      check: (ctx) => !!ctx.transform,
    },
    {
      title: "Transform Formula",
      target: ".miniFormulaText",
      body:
        "This box shows the exact formula for the transform you picked — C(u,x) with cosine for DCT, or S(u,x) with sine for DST — laid out with its numerator and denominator just like in the textbook.",
    },
    {
      title: "Generate the Basis Matrix",
      target: ".orthoMatrixCard",
      waitingTarget: ".generateButton",
      body:
        "The orthogonal basis matrix C is now fully generated. Each row u represents one frequency, computed across all 8 pixel positions x.",
      waitingBody: "Click 'Generate Basis Matrix' to compute all 64 basis values for the transform you chose.",
      requireAction: true,
      check: (ctx) => !!ctx.basisGenerated,
    },
    {
      title: "Explore the Calculation",
      target: ".currentCalculation",
      body:
        "Click any cell in the matrix above to see exactly how that value was derived, step by step — or press Play to animate through the formula automatically.",
    },
    {
      title: "Basis Function Wave",
      target: ".waveCard",
      body:
        "This graph plots the selected basis vector as a wave. Row u = 0 is a flat line — the DC component, or average brightness — while higher rows oscillate faster, capturing finer and finer detail.",
    },
  ],
  4: [
    {
      title: "Matrix Multiplication",
      target: ".transformLayout",
      body:
        "The frequency matrix F is computed as F = C × A × Cᵀ — the basis matrix, multiplied by your selected 8 × 8 block, multiplied by the basis matrix's transpose.",
    },
    {
      title: "Perform Transform",
      target: ".frequencyCard",
      waitingTarget: ".transformButton",
      body:
        "The frequency matrix F is now fully computed. Each cell F(u, v) is one frequency coefficient — brighter cells below carry more image energy.",
      waitingBody: "Click 'Perform Transform' to multiply the matrices and compute the frequency coefficients.",
      requireAction: true,
      check: (ctx) => !!(ctx.frequencyMatrix && ctx.frequencyMatrix.length),
    },
    {
      title: "Selected Frequency Coefficient",
      target: ".coefficientCard",
      body:
        "Whichever cell you click in the matrix above is shown enlarged here, labeled as either the DC coefficient (the block's average brightness) or an AC coefficient (a specific spatial frequency).",
    },
    {
      title: "Explore Coefficients",
      target: ".calculationPanel",
      body:
        "Click any cell in the frequency matrix above to see exactly how that coefficient was derived, step by step, from the basis and block values.",
    },
    {
      title: "DC vs AC & Largest Coefficient",
      target: ".largestCoeffCard",
      body:
        "These cards highlight two key numbers: the single largest-magnitude coefficient in the block (usually near the DC term), and how the 64 coefficients split into exactly 1 DC value versus 63 AC values.",
    },
    {
      title: "Energy Compaction",
      target: ".energyDistribution",
      body:
        "This bar shows how the image's total energy is distributed across DC, Low, Medium and High frequency coefficients — most of it usually concentrates in the DC and Low bands.",
    },
    {
      title: "Compression Insight",
      target: ".compressionInsight",
      body:
        "This is the key idea behind JPEG-style compression: low-frequency coefficients preserve visible quality, while high-frequency ones — carrying fine edge detail — can be discarded with little visual loss.",
    },
  ],
  5: [
    {
      title: "Quality Factor",
      target: ".qualityCard",
      body:
        "Drag this slider to set the Quality Factor (Q). A lower Q uses larger quantization steps — more compression, lower quality; a higher Q keeps finer steps, preserving more detail.",
    },
    {
      title: "Perform Quantization",
      target: ".currentCalculation",
      waitingTarget: ".quantButton",
      body:
        "Quantization is complete — every frequency coefficient F(u,v) has been divided by its quantization step T(u,v) and rounded to the nearest integer.",
      waitingBody: "Click 'Perform Quantization' to divide every frequency coefficient by its quantization step and round it.",
      requireAction: true,
      check: (ctx) => !!(ctx.quantizedMatrix && ctx.quantizedMatrix.length),
    },
    {
      title: "Explore the Calculation",
      target: ".currentCalculation",
      body:
        "Click any cell in the Quantized Matrix above to see exactly how that value was derived — the division by the quantization step, then the rounding — or press Play to animate through it.",
    },
    {
      title: "Zero Coefficients",
      target: ".zeroStatsSection",
      body:
        "Many small coefficients round down to exactly zero after quantization — this bar shows what fraction of the 64 coefficients became zero, which is the real source of compression.",
    },
    {
      title: "Compression Analysis",
      target: ".compressionSection",
      body:
        "These numbers estimate how much smaller the data becomes once only the non-zero coefficients need to be stored, compared to the original 64 values.",
    },
    {
      title: "Research Insights",
      target: ".observationCard",
      body:
        "This section explains WHY quantization works: high frequencies get large step sizes and vanish, while the image's energy — concentrated in low frequencies — is preserved with fine steps.",
    },
  ],
  6: [
    {
      title: "Traversal Order",
      target: ".zzGridCard",
      body:
        "The quantized matrix is read in a diagonal zig-zag order, starting from the DC term at the top-left — the small number inside each cell shows its position in that order.",
    },
    {
      title: "Start the Scan",
      target: ".zz1dCard",
      waitingTarget: ".zzButton",
      body:
        "The 1-D output array is ready. Index 0 holds the DC coefficient, and the trailing zeros at the end are exactly what the next step will compress away.",
      waitingBody: "Click 'Start Zig-Zag Scan' to reorder the quantized matrix into a 1-D sequence.",
      requireAction: true,
      check: (ctx) => !!(ctx.zigzagArray && ctx.zigzagArray.length === 64),
    },
    {
      title: "Traversal Rule",
      target: ".zzFormula",
      body:
        "This is the exact rule the scan follows: alternating up-right and down-left along anti-diagonals, reflecting off the matrix edges, so every cell is visited exactly once.",
    },
    {
      title: "Research Observations",
      target: ".observationCard",
      body:
        "The zig-zag order isn't arbitrary — it's chosen because it matches how DCT/DST energy is distributed in natural images, grouping the zeros together for the next compression stage.",
    },
  ],
  7: [
    {
      title: "Source Sequence",
      target: ".encSequenceCard",
      body:
        "This is the same 1-D sequence from the Zig-Zag step. The pink cells are zeros — notice how they cluster toward the end, which is exactly what Run-Length Encoding exploits.",
    },
    {
      title: "Run the Encoding",
      target: ".encStreamCard",
      waitingTarget: ".encButton",
      body:
        "The sequence is now compressed into compact (run, value) pairs — each pair means 'skip this many zeros, then place this value' — ending in a single EOB symbol if trailing zeros remain.",
      waitingBody: "Click 'Start Run-Length Encoding' to compress the sequence into (run, value) pairs.",
      requireAction: true,
      check: (ctx) => !!(ctx.encodedRuns && ctx.encodedRuns.pairs && ctx.encodedRuns.pairs.length > 0),
    },
    {
      title: "What is EOB?",
      target: ".eobExplainCard",
      body:
        "EOB (End Of Block) is a single symbol that replaces every remaining zero once the last non-zero coefficient has passed — this is the single biggest source of compression in RLE.",
    },
    {
      title: "Compression Statistics",
      target: ".compressionSection",
      body:
        "This compares how many symbols were needed before RLE (always 64) against how many are needed after — fewer symbols after encoding means a smaller file.",
    },
    {
      title: "Educational Explanation",
      target: ".observationCard",
      body:
        "This section explains what each (run, value) pair means, and notes that real codecs like JPEG add Huffman or arithmetic entropy coding on top of RLE — RLE removes structural redundancy, entropy coding removes statistical redundancy.",
    },
  ],
  8: [
    {
      title: "Pipeline Summary",
      target: ".cmpPipeline",
      body:
        "This shows the full journey side by side: the original image, the surviving quantized coefficient energy, and the final reconstructed image after dequantization and the inverse transform.",
    },
    {
      title: "Quality Controls",
      target: ".cmpControls",
      body:
        "Switch between DCT and DST, or drag the Quality Factor slider, to instantly see how the choice of transform and compression level affects the reconstructed image and its metrics below.",
    },
    {
      title: "Quality Metrics",
      target: ".cmpMetricsGrid",
      body:
        "MSE and RMSE measure the average reconstruction error; PSNR expresses that as a quality score in decibels — higher is better, and above ~30 dB is generally considered visually acceptable.",
    },
    {
      title: "Error Heatmap",
      target: ".cmpDiffSection",
      body:
        "This heatmap shows exactly WHERE the reconstruction differs from the original — darker red means a bigger per-pixel error, usually concentrated around sharp edges and fine texture.",
    },
    {
      title: "Coefficient Statistics",
      target: ".cmpCoeffStats",
      body:
        "This bar aggregates zero vs non-zero quantized coefficients across all 4 blocks combined (256 total) — the same zero/non-zero idea from the Quantization step, now summarized for the whole image.",
    },
    {
      title: "Research Observations",
      target: ".observationCard",
      body:
        "Key takeaways: PSNR above ~30 dB is generally visually acceptable; Energy Retained stays high because natural images concentrate energy in low frequencies; lowering Quality Factor raises compression but lowers PSNR — the core rate-distortion trade-off; and DCT vs DST compact energy differently depending on the image.",
    },
    {
      title: "Final Conclusions",
      target: ".cmpConclusion",
      body:
        "This ties the whole pipeline together: substantial data reduction was achieved while most of the original image's signal energy and visual quality were retained — the core trade-off behind all transform-based compression.",
    },
  ],
};

export default guidedTourSteps;
