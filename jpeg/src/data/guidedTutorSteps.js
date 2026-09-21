// Guided Tutor scripts — one array per JPEG pipeline step.
// Each entry: { title, text, target: "<css selector>" | null, placement }
// `target: null` (or a selector that isn't on screen) renders as a centered
// welcome-style card with a full dim background, same as the reference tutor.

function getStep1Steps(activeRgbMatrix) {
  const steps = [
    {
      title: "Welcome to Step 1",
      text: "This is where the JPEG compression pipeline begins. I'll walk you through every part of this page — just keep pressing Next, use Back to go to the previous step, and Exit to close the tutor at any time.",
      target: null,
    },
    {
      title: "Steps Panel",
      text: "This panel on the left shows the full 11-step JPEG encoding workflow. Click any unlocked step to jump straight to it. On mobile, this panel opens from the ☰ icon in the top-left corner — the tutor will open it for you automatically.",
      target: ".stepsList",
      placement: "right",
      requiresSidebar: true,
    },
    {
      title: "Choose an RGB Matrix",
      text: "Choose a Bright, Dark, or Random 16x16 RGB matrix here. This matrix becomes your starting input image patch, and the entire compression pipeline runs on it.",
      target: ".matrixSelectorPanel",
      placement: "bottom",
      requiresAction: (ctx) => !!ctx.activeRgbMatrix,
      actionMessage:
        "Please select an RGB matrix — Bright, Dark or Random — before continuing.",
    },
  ];

  if (activeRgbMatrix) {
    steps.push(
      {
        title: "Pixel Grid",
        text: "This is a visual 16x16 grid of your selected patch. Click on any pixel from P1 to P256 to inspect its exact RGB values.",
        target: ".step1SimplePatchGrid",
        placement: "right",
      },
      {
        title: "Selected Pixel Panel",
        text: "This panel shows the selected pixel's Row and Column, its Red, Green, and Blue components, and a color preview box.",
        target: ".step1SimpleInspector",
        placement: "left",
      },
      {
        title: "Split into R, G, B",
        text: "This button splits the whole patch into three separate Red, Green, and Blue matrices — these three become the input for the YCbCr conversion in Step 2.",
        target: ".step1SimpleActionRow",
        placement: "top",
      }
    );
  }

  steps.push({
    title: "Move to Step 2",
    text: "Once you've selected a matrix, use the Next (or Start) button below to move on to Step 2 — RGB to YCbCr Conversion.",
    target: ".controlButtons",
    placement: "top",
    requiresSidebar: true,
  });

  return steps;
}

function getStep2Steps() {
  return [
    {
      title: "Step 2 — RGB to YCbCr",
      text: "Now that same RGB patch is converted into three new matrices — Y (brightness), Cb, and Cr (color-difference). Let's see how this happens.",
      target: null,
    },
    {
      title: "Concept Reminder",
      text: "This box briefly explains that Y stores brightness, while Cb/Cr store color-difference. The human eye is more sensitive to brightness, so Cb/Cr can be reduced later.",
      target: ".step2ConceptBox",
      placement: "bottom",
    },
    {
      title: "RGB to YCbCr Formula",
      text: "These are the three formulas that convert every RGB pixel into Y, Cb, and Cr. The results are rounded and kept within the valid 0-255 range.",
      target: ".step2FormulaBox",
      placement: "bottom",
    },
    {
      title: "Run the Color Transform",
      text: "This button converts the whole patch to YCbCr pixel by pixel — the progress bar above will fill up as it goes.",
      target: ".step2ControlBar",
      placement: "bottom",
      requiresAction: (ctx) => !!ctx.isStep2Complete,
      actionMessage:
        "Please run \"RGB → YCbCr Color Transform\" on the full patch before continuing.",
    },
    {
      title: "Input RGB Patch",
      text: "This is the same RGB patch you selected in Step 1. Click any pixel to inspect its conversion.",
      target: ".step2Card",
      placement: "right",
    },
    {
      title: "Selected Pixel Conversion",
      text: "This shows the full step-by-step calculation for the selected pixel, from RGB to YCbCr.",
      target: ".step2SelectedCard",
      placement: "left",
    },
    {
      title: "Output Y, Cb, Cr Matrices",
      text: "You can view all three output matrices here in tabs — Y, Cb, and Cr. The selected pixel is highlighted here too.",
      target: ".step2OutputCard",
      placement: "top",
    },
    {
      title: "Move to Step 3",
      text: "Once the full conversion is complete, press Next to move on to Step 3 — Chroma Subsampling.",
      target: ".controlButtons",
      placement: "top",
      requiresSidebar: true,
    },
  ];
}

function getStep3Steps() {
  return [
    {
      title: "Step 3 — Chroma Subsampling",
      text: "The Y matrix stays the same, but the Cb and Cr matrices are made smaller here — because the human eye isn't as sensitive to color-difference as it is to brightness.",
      target: null,
    },
    {
      title: "Concept Reminder",
      text: "The Y matrix remains unchanged at its 16×16 size. Cb and Cr are reduced to 8×8 by averaging each 2×2 group.",
      target: ".step3ConceptBox",
      placement: "bottom",
    },
    {
      title: "Cb / Cr Tabs",
      text: "Switch between Cb and Cr here — both are independently downsampled using 2×2 averaging.",
      target: ".step3Tabs",
      placement: "bottom",
    },
    {
      title: "Run the Downsampling",
      text: "This button downsamples the whole matrix group by group — each 2×2 group turns into a single average value.",
      target: ".step3ControlBar",
      placement: "bottom",
      requiresAction: (ctx) => !!ctx.isStep3Complete,
      actionMessage:
        "Please run \"Run 2×2 Chroma Downsampling\" on the full matrix before continuing.",
    },
    {
      title: "Input Matrix",
      text: "This is the 16×16 matrix of the current component (Cb or Cr) — click any value to select its 2×2 group.",
      target: ".step3MainGrid > div:first-child",
      placement: "right",
    },
    {
      title: "Selected 2×2 Group",
      text: "This shows the 4 values of the selected 2×2 group and their average calculation — this same formula is applied to every group.",
      target: ".step3CalculationCard",
      placement: "left",
    },
    {
      title: "Output Matrix",
      text: "This shows the downsampled 8×8 matrix — each cell is the average value of one 2×2 group. This becomes the input for building the 8×8 blocks in Step 4.",
      target: ".step3MainGrid > div:last-child",
      placement: "top",
    },
    {
      title: "Move to Step 4",
      text: "Once both Cb and Cr are downsampled, press Next to move on to Step 4 — 8×8 Block Preparation.",
      target: ".controlButtons",
      placement: "top",
      requiresSidebar: true,
    },
  ];
}

function getStep4Steps() {
  return [
    {
      title: "Step 4 — 8×8 Block Preparation",
      text: "Real JPEG compression doesn't process the whole image at once — it breaks it into smaller 8×8 blocks. Here, your 16×16 Y matrix has been split into four 8×8 blocks (B1–B4).",
      target: null,
    },
    {
      title: "Choose a Block",
      text: "Select one block from B1 (top-left), B2 (top-right), B3 (bottom-left), or B4 (bottom-right) — this block is what gets processed through the rest of the pipeline from Step 5 onward.",
      target: ".step4BlockSelectorGrid",
      placement: "bottom",
      requiresAction: (ctx) => !!ctx.isStep4BlockSelected,
      actionMessage: "Please select one 8×8 block (B1–B4) before continuing.",
    },
    {
      title: "Extract the Block",
      text: "After selecting a block, use this button to extract its 64 values and reveal them in the output grid.",
      target: ".step4ControlBar",
      placement: "bottom",
      requiresAction: (ctx) => !!ctx.isStep4Complete,
      actionMessage:
        "Please click \"Extract Selected 8×8 Block\" before continuing.",
    },
    {
      title: "Input: 16×16 Y Matrix",
      text: "This is the full Y matrix that came from Step 3. You can also select a block directly by clicking on it here.",
      target: ".step4MainGrid > div:first-child",
      placement: "right",
    },
    {
      title: "Selected Block Details",
      text: "This shows the name of the selected block, its starting position, size (8×8 = 64 values), and the next step.",
      target: ".step4SelectedInfoCard",
      placement: "left",
    },
    {
      title: "Output: 8×8 Block",
      text: "This is the 8×8 block you extracted — these 64 values become the input for Step 5 (Level Shifting).",
      target: ".step4MainGrid > div:last-child",
      placement: "top",
    },
    {
      title: "Move to Step 5",
      text: "Once the block is extracted, press Next to move on to Step 5 — Level Shifting.",
      target: ".controlButtons",
      placement: "top",
      requiresSidebar: true,
    },
  ];
}

function getStep5Steps() {
  return [
    {
      title: "Step 5 — Level Shifting",
      text: "The DCT formula works better with values that are symmetric around 0. So we subtract 128 from each pixel value (0-255 range) to bring it into the range -128 to +127.",
      target: null,
    },
    {
      title: "Quick Summary",
      text: "At a glance: the input is the selected block, the operation is Value - 128, and the output goes on to Step 6 (DCT).",
      target: ".step5SummaryGrid",
      placement: "bottom",
    },
    {
      title: "Run the Level Shift",
      text: "This button subtracts 128 from all 64 values of the 8×8 block, one at a time.",
      target: ".step5ControlBar",
      placement: "bottom",
      requiresAction: (ctx) => !!ctx.isStep5Complete,
      actionMessage:
        "Please run \"Run Level Shift (Subtract 128)\" on the full block before continuing.",
    },
    {
      title: "Input: Selected 8×8 Block",
      text: "This is the same block you selected in Step 4 — all values are in the 0-255 range.",
      target: ".step5MainGrid > div:first-child",
      placement: "right",
    },
    {
      title: "Selected Cell Calculation",
      text: "This shows the full calculation for any selected cell — Original Value - 128 = Shifted Value.",
      target: ".step5CalculationCard",
      placement: "left",
    },
    {
      title: "Output: Level Shifted Block",
      text: "This shows all the shifted values, now in the range -128 to +127 — this becomes the input for Step 6 (2D DCT).",
      target: ".step5MainGrid > div:last-child",
      placement: "top",
    },
    {
      title: "Move to Step 6",
      text: "Once the whole block is shifted, press Next to move on to Step 6 — Apply 2D DCT / FDCT.",
      target: ".controlButtons",
      placement: "top",
      requiresSidebar: true,
    },
  ];
}

function getStep6Steps() {
  return [
    {
      title: "Step 6 — 2D DCT / FDCT",
      text: "Now we convert the level-shifted block from the spatial domain (pixel values) to the frequency domain (DCT coefficients). This is the most important mathematical step in JPEG compression.",
      target: null,
    },
    {
      title: "Quick Summary",
      text: "The input is the level-shifted block from Step 5, the operation is 2D DCT, and the output is a DCT coefficient matrix for Step 7 (Quantization).",
      target: ".step6SummaryGrid",
      placement: "bottom",
    },
    {
      title: "2D DCT Formula",
      text: "This is the actual DCT formula. Press the 'Show Formula' button to view it anytime — the cosine terms calculate every coefficient from all 64 input values.",
      target: ".step6FormulaBox",
      placement: "bottom",
    },
    {
      title: "Run 2D DCT Transform",
      text: "This button calculates all 64 DCT coefficients (u=0..7, v=0..7) one at a time.",
      target: ".step6ControlBar",
      placement: "bottom",
      requiresAction: (ctx) => !!ctx.isStep6Complete,
      actionMessage:
        "Please run \"Run 2D DCT Transform\" on the full block before continuing.",
    },
    {
      title: "Input: Level Shifted Block",
      text: "This is the level-shifted block from Step 5 — values are in the range -128 to +127.",
      target: ".step6MainGrid > div:first-child",
      placement: "right",
    },
    {
      title: "Selected DCT Coefficient",
      text: "This shows the position (u,v), type (DC or AC), and calculated value of the selected coefficient.",
      target: ".step6CalculationCard",
      placement: "left",
    },
    {
      title: "Output: DCT Coefficient Matrix",
      text: "The coefficient in the top-left corner is the DC coefficient (average brightness), and the rest are AC coefficients that store detail/frequency information. This becomes the input for Step 7 (Quantization).",
      target: ".step6MainGrid > div:last-child",
      placement: "top",
    },
    {
      title: "Move to Step 7",
      text: "Once all 64 coefficients are calculated, press Next to move on to Step 7 — Quantization.",
      target: ".controlButtons",
      placement: "top",
      requiresSidebar: true,
    },
  ];
}

function getStep7Steps() {
  return [
    {
      title: "Step 7 — Quantization",
      text: "This is the most lossy (data-losing) step in JPEG. Every DCT coefficient is divided by a quantization table value and rounded — this turns many high-frequency coefficients into zero.",
      target: null,
    },
    {
      title: "Quick Summary",
      text: "The input is the DCT coefficient matrix from Step 6, the operation is DCT ÷ Quant Table, and the output is a quantized matrix for Step 8 (Zig-Zag Scanning).",
      target: ".step7SummaryGrid",
      placement: "bottom",
    },
    {
      title: "Quantization Formula",
      text: "Every coefficient is calculated as Q(u,v) = round( DCT(u,v) ÷ QuantizationTable(u,v) ). Smaller table values preserve low-frequency detail, while larger values reduce high-frequency detail more.",
      target: ".step7FormulaBox",
      placement: "bottom",
    },
    {
      title: "JPEG Quality Slider",
      text: "Adjust the quality with this slider — lower quality means larger table values, so more coefficients become zero (smaller file, more loss). Higher quality does the opposite.",
      target: ".step7QualityBox",
      placement: "bottom",
    },
    {
      title: "Run Quantization",
      text: "This button quantizes all 64 coefficients of the matrix using the DCT ÷ Table formula.",
      target: ".step7ControlBar",
      placement: "bottom",
      requiresAction: (ctx) => !!ctx.isStep7Complete,
      actionMessage:
        "Please run \"Run Quantization (DCT ÷ Table)\" on the full matrix before continuing.",
    },
    {
      title: "Input: DCT Coefficient Matrix",
      text: "This is the DCT coefficient matrix that came from Step 6.",
      target: ".step7MainGrid > div:nth-child(1)",
      placement: "right",
    },
    {
      title: "JPEG Luminance Quantization Table",
      text: "This is the standard 8×8 table used for the Y (luminance) component — the quality slider scales the values in this table.",
      target: ".step7MainGrid > div:nth-child(2)",
      placement: "left",
    },
    {
      title: "Selected Coefficient Calculation",
      text: "This shows the full calculation for the selected coefficient — the DCT value is divided by the table value and rounded.",
      target: ".step7CalculationCard",
      placement: "left",
    },
    {
      title: "Output: Quantized Matrix",
      text: "This shows the quantized values — notice how many coefficients are now 0, especially in the bottom-right (high-frequency) corner.",
      target: ".step7MainGrid > div:nth-child(4)",
      placement: "top",
    },
    {
      title: "Move to Step 8",
      text: "Once the whole matrix is quantized, press Next to move on to Step 8 — Zig-Zag Scanning.",
      target: ".controlButtons",
      placement: "top",
      requiresSidebar: true,
    },
  ];
}

function getStep8Steps() {
  return [
    {
      title: "Step 8 — Zig-Zag Scanning",
      text: "Now we traverse the quantized 8×8 matrix along a zig-zag diagonal path, turning it into a single 1D sequence (list) — low-frequency values come first, high-frequency values come later.",
      target: null,
    },
    {
      title: "Quick Summary",
      text: "The input is the quantized matrix from Step 7, the operation is a zig-zag traversal, and the output is 63 AC values (DC is already handled separately) that go on to Step 9.",
      target: ".step8SummaryGrid",
      placement: "bottom",
    },
    {
      title: "Run the Zig-Zag Scan",
      text: "This button scans the whole matrix in a diagonal zig-zag pattern — watch the blue line trace the path while the yellow dot marks the current position.",
      target: ".step8ControlBar",
      placement: "bottom",
      requiresAction: (ctx) => !!ctx.isStep9Complete,
      actionMessage: "Please run \"Run Zig-Zag Scan\" on the full matrix before continuing.",
    },
    {
      title: "Zig-Zag Path Over the Matrix",
      text: "Every cell shows its scan-order number (0 to 63). Cell #0 is the DC coefficient. Low-frequency (top-left) values are scanned first, high-frequency (bottom-right) values later.",
      target: ".step8Card",
      placement: "right",
    },
    {
      title: "Current Scan Position",
      text: "This shows the current scan index, matrix position, and the value there — it updates as the scan moves forward.",
      target: ".step8CalculationCard",
      placement: "left",
    },
    {
      title: "Full Zig-Zag Sequence",
      text: "The whole matrix becomes a single 1D string here — the DC value is shown separately, and the remaining 63 AC values go on to the next step (Run-Length Encoding).",
      target: ".step8OutputCard",
      placement: "top",
    },
    {
      title: "Move to Step 9",
      text: "Once the whole matrix is scanned, press Next to move on to Step 9 — Run-Length Encoding.",
      target: ".controlButtons",
      placement: "top",
      requiresSidebar: true,
    },
  ];
}

function getStep9Steps() {
  return [
    {
      title: "Step 9 — Run-Length Encoding",
      text: "After the zig-zag scan, the AC values often contain long runs of zeros, especially near the end. Run-Length Encoding (RLE) represents these repeated zeros in a compact form.",
      target: null,
    },
    {
      title: "Run AC Run-Length Coding",
      text: "This button encodes the entire AC sequence position by position — a position counter is shown alongside it.",
      target: ".step9ControlBar",
      placement: "bottom",
      requiresAction: (ctx) => !!ctx.isStep10Complete,
      actionMessage: "Please run \"Run AC Run-Length Coding\" before continuing.",
    },
    {
      title: "AC Values From Step 8",
      text: "Grey cells are zero (they're just counted). Blue cells are non-zero (these are what actually get encoded). Click any cell to inspect its position.",
      target: ".step9Card",
      placement: "right",
    },
    {
      title: "Selected Value",
      text: "This shows the value at the selected position and how many zeros preceded it (the run) — for a non-zero value, this becomes a (run, value) pair.",
      target: ".step9CalculationCard",
      placement: "left",
    },
    {
      title: "Final Codes (RLE Symbols)",
      text: "(run, value) pairs, ZRL (16 zeros in a row), and EOB (everything remaining is zero, stop here) — these compact symbols go on to Step 10 (Huffman Encoding).",
      target: ".step9OutputCard",
      placement: "top",
    },
    {
      title: "Move to Step 10",
      text: "Once the whole sequence is encoded, press Next to move on to Step 10 — Huffman Encoding.",
      target: ".controlButtons",
      placement: "top",
      requiresSidebar: true,
    },
  ];
}

function getStep10Steps() {
  return [
    {
      title: "Step 10 — Huffman Encoding",
      text: "All the symbols built so far (the DC category, and the AC RLE symbols) are now converted into actual binary bits — the more common a symbol is, the shorter its code.",
      target: null,
    },
    {
      title: "Quick Summary",
      text: "The input is the DC difference (automatic) plus the RLE symbols, the operation is Huffman Code + extra bits, and the output is the final entropy bitstream for Step 11.",
      target: ".step10SummaryGrid",
      placement: "bottom",
    },
    {
      title: "Run Huffman Encoding",
      text: "This button first encodes the DC value, then finds a Huffman code for each AC symbol one at a time.",
      target: ".step10ControlBar",
      placement: "bottom",
      requiresAction: (ctx) => !!ctx.isStep11Complete,
      actionMessage: "Please run \"Run Huffman Encoding\" before continuing.",
    },
    {
      title: "DC Encoding",
      text: "The DC category number is first encoded with its own Huffman code, then the magnitude bits are appended to it — this is the DC's final code.",
      target: ".step10MainGrid > div:first-child",
      placement: "right",
    },
    {
      title: "AC RLE Symbols → Huffman Codes",
      text: "Every (run, value) pair, along with ZRL and EOB, has its own fixed Huffman code. Common symbols (like EOB) get shorter codes, rare symbols (like ZRL) get longer ones.",
      target: ".step10WideCard",
      placement: "left",
    },
    {
      title: "Final Entropy Bitstream",
      text: "All the DC and AC codes are joined together in order to form this final bitstream — this is the actual compressed data for this 8×8 block that goes into the JPEG file.",
      target: ".step10BitstreamCard",
      placement: "top",
    },
    {
      title: "Move to Step 11",
      text: "Once all symbols are encoded, press Next to move on to Step 11 — Final Compressed JPEG Output.",
      target: ".controlButtons",
      placement: "top",
      requiresSidebar: true,
    },
  ];
}

function getStep11Steps() {
  return [
    {
      title: "Step 11 — Final Compressed Output",
      text: "This is the final step of the JPEG pipeline. Here you'll see the block you selected back in Step 1, its final compressed bitstream, and the actual difference compression made — all together.",
      target: null,
    },
    {
      title: "Selected Block",
      text: "This is a reminder of which block you've been processing through the whole pipeline.",
      target: ".step11InfoStrip",
      placement: "bottom",
    },
    {
      title: "Generate Final Output",
      text: "This button reveals the final bitstream and the size comparison.",
      target: ".step11ControlBar",
      placement: "bottom",
      requiresAction: (ctx) => !!ctx.isStep12Complete,
      actionMessage: "Please click \"Generate Final Compressed Output\" before continuing.",
    },
    {
      title: "Final Bitstream Preview",
      text: "This is the final compressed bitstream that came from Step 10 — the DC bits and AC bits are shown in different colors.",
      target: ".step11Card",
      placement: "right",
    },
    {
      title: "Size: Before vs After",
      text: "See here how the original block — 64 pixels × 8 bits = 512 bits — fits into far fewer bits after compression, along with the compression ratio.",
      target: ".step11StatsCard",
      placement: "left",
    },
    {
      title: "Before vs After — What Changed",
      text: "This is the most important part: the left side is the original block, and the right side is the block reconstructed after quantization + inverse DCT. Click any pixel to see the exact difference — 'Show error heatmap' also shows the error pattern across the whole block.",
      target: ".step11ReconstructCard",
      placement: "top",
    },
    {
      title: "Tutorial Complete! 🎉",
      text: "Congratulations! You've seen the entire JPEG compression pipeline — from RGB all the way to the final compressed bitstream. You can run the Guided Tutor again anytime from any step.",
      target: null,
    },
  ];
}

/**
 * Returns the guided-tutor step list for the given app step.
 * Falls back to a single centered card (using that step's own
 * title/process/description) for steps that don't have a dedicated
 * script yet, so Guided Tutor always has something to show.
 */
export function getGuidedTutorSteps({ activeStep, activeRgbMatrix, currentStep }) {
  if (activeStep === 1) {
    return getStep1Steps(activeRgbMatrix);
  }

  if (activeStep === 2) {
    return getStep2Steps();
  }

  if (activeStep === 3) {
    return getStep3Steps();
  }

  if (activeStep === 4) {
    return getStep4Steps();
  }

  if (activeStep === 5) {
    return getStep5Steps();
  }

  if (activeStep === 6) {
    return getStep6Steps();
  }

  if (activeStep === 7) {
    return getStep7Steps();
  }

  if (activeStep === 8) {
    return getStep8Steps();
  }

  if (activeStep === 9) {
    return getStep9Steps();
  }

  if (activeStep === 10) {
    return getStep10Steps();
  }

  if (activeStep === 11) {
    return getStep11Steps();
  }

  return [
    {
      title: `Step ${activeStep}: ${currentStep?.title || ""}`,
      text: currentStep?.process || currentStep?.description || "",
      target: null,
    },
  ];
}

export default getGuidedTutorSteps;
