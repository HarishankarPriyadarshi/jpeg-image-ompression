// ============================================================
// Shared mathematical utilities for the transform coding
// pipeline (Steps 6 - 10). Kept dependency free and pure so
// every step can reproduce identical, verifiable results.
// ============================================================

export const N = 8;

// Base (JPEG-style luminance) quantization table used as the
// reference table T(u,v) before quality scaling. This is the
// standard research-literature table associated with
// psychovisual weighting of transform coefficients — low
// frequencies (top-left) are weighted lightly, high
// frequencies (bottom-right) are weighted heavily.
export const baseQuantizationTable = [
  [16, 11, 10, 16, 24, 40, 51, 61],
  [12, 12, 14, 19, 26, 58, 60, 55],
  [14, 13, 16, 24, 40, 57, 69, 56],
  [14, 17, 22, 29, 51, 87, 80, 62],
  [18, 22, 37, 56, 68, 109, 103, 77],
  [24, 35, 55, 64, 81, 104, 113, 92],
  [49, 64, 78, 87, 103, 121, 120, 101],
  [72, 92, 95, 98, 112, 100, 103, 99],
];

// Generate the orthogonal DCT-II or DST-I basis matrix (N x N).
export function generateBasisMatrix(transform) {
  const matrix = [];
  for (let u = 0; u < N; u++) {
    const row = [];
    for (let x = 0; x < N; x++) {
      let value;
      if (transform === "DCT") {
        const alpha = u === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N);
        value = alpha * Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N));
      } else {
        value = Math.sqrt(2 / (N + 1)) * Math.sin(((u + 1) * (x + 1) * Math.PI) / (N + 1));
      }
      row.push(Number(value.toFixed(4)));
    }
    matrix.push(row);
  }
  return matrix;
}

export function transpose(matrix) {
  return matrix[0].map((_, col) => matrix.map((row) => row[col]));
}

export function multiply(A, B) {
  const result = [];
  for (let i = 0; i < A.length; i++) {
    result[i] = [];
    for (let j = 0; j < B[0].length; j++) {
      let sum = 0;
      for (let k = 0; k < B.length; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

// Forward transform: F = T x Block x T^T
export function forwardTransform(block, T) {
  const TT = transpose(T);
  const first = multiply(T, block);
  return multiply(first, TT);
}

// Inverse transform: Block' = T^T x F x T
export function inverseTransform(freqMatrix, T) {
  const TT = transpose(T);
  const first = multiply(TT, freqMatrix);
  return multiply(first, T);
}

// Extract the 8x8 block (1..4) from a 16x16 source matrix.
export function getBlockCoords(blockId) {
  switch (blockId) {
    case 1: return { rowStart: 0, colStart: 0 };
    case 2: return { rowStart: 0, colStart: 8 };
    case 3: return { rowStart: 8, colStart: 0 };
    case 4: return { rowStart: 8, colStart: 8 };
    default: return { rowStart: 0, colStart: 0 };
  }
}

export function extractBlock(matrix16, blockId) {
  const { rowStart, colStart } = getBlockCoords(blockId);
  return matrix16.slice(rowStart, rowStart + 8).map((row) => row.slice(colStart, colStart + 8));
}

export function placeBlock(matrix16, blockId, block) {
  const { rowStart, colStart } = getBlockCoords(blockId);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      matrix16[rowStart + r][colStart + c] = block[r][c];
    }
  }
}

// Scale the base quantization table using the classic
// IJG (Independent JPEG Group) quality-scaling formula.
// This is a general transform-coding scaling rule, not a
// JPEG-only detail: it linearly interpolates the step size
// between "aggressive" and "fine" quantization.
export function buildQuantTable(qualityFactor) {
  const quality = Math.min(100, Math.max(1, qualityFactor));
  const scale = quality < 50 ? 5000 / quality : 200 - quality * 2;

  return baseQuantizationTable.map((row) =>
    row.map((value) => {
      const scaled = Math.floor((value * scale + 50) / 100);
      return Math.max(1, Math.min(255, scaled));
    })
  );
}

export function roundMatrix(matrix) {
  return matrix.map((row) => row.map((v) => Math.round(v)));
}

export function elementwiseDivideRound(F, T) {
  return F.map((row, u) => row.map((v, vv) => Math.round(F[u][vv] / T[u][vv])));
}

export function elementwiseMultiply(Q, T) {
  return Q.map((row, u) => row.map((v, vv) => Q[u][vv] * T[u][vv]));
}

// Generate the classical zig-zag traversal order for an N x N
// block, moving from the DC term (0,0) toward the highest
// frequency term (N-1,N-1) in diagonal sweeps.
export function zigZagOrder(size = N) {
  const order = [];
  let row = 0;
  let col = 0;
  let goingUp = true;

  while (order.length < size * size) {
    order.push([row, col]);

    if (goingUp) {
      if (col === size - 1) {
        row++;
        goingUp = false;
      } else if (row === 0) {
        col++;
        goingUp = false;
      } else {
        row--;
        col++;
      }
    } else {
      if (row === size - 1) {
        col++;
        goingUp = true;
      } else if (col === 0) {
        row++;
        goingUp = true;
      } else {
        row++;
        col--;
      }
    }
  }
  return order;
}

export function matrixToZigZagArray(matrix, order) {
  return order.map(([r, c]) => matrix[r][c]);
}

// Run-Length-Encode a zig-zag array of quantized coefficients.
// Uses (run-of-zeros, value) pairs terminated by an End-Of-Block
// (EOB) marker once only zeros remain — the standard transform
// coding entropy-preparation stage.
export function runLengthEncode(zigzagArray) {
  const pairs = [];
  let zeroRun = 0;

  // Find last non-zero index (everything after is trailing zeros -> EOB)
  let lastNonZero = -1;
  for (let i = 0; i < zigzagArray.length; i++) {
    if (zigzagArray[i] !== 0) lastNonZero = i;
  }

  for (let i = 0; i <= lastNonZero; i++) {
    const value = zigzagArray[i];
    if (value === 0) {
      zeroRun++;
    } else {
      pairs.push({ run: zeroRun, value, index: i });
      zeroRun = 0;
    }
  }

  const hasEOB = lastNonZero < zigzagArray.length - 1;

  return { pairs, hasEOB, lastNonZero };
}

export function mse(a, b) {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < a[i].length; j++) {
      sum += (a[i][j] - b[i][j]) ** 2;
      count++;
    }
  }
  return sum / count;
}

export function psnr(mseValue, maxValue = 255) {
  if (mseValue === 0) return Infinity;
  return 10 * Math.log10((maxValue * maxValue) / mseValue);
}

export function clamp(value, min = 0, max = 255) {
  return Math.min(max, Math.max(min, value));
}
