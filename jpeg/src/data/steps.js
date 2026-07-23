const steps = [
    
{
  id: 1,
  title: "RGB Image Input",
  input: "Fixed 16×16 sample 24-bit RGB matrix",
  process:
    "Read each RGB pixel and separate it into Red, Green, and Blue channel values.",
  output:
    "16×16 RGB tuple matrix and separate 16×16 R, G, and B channel matrices",
  description:
    "JPEG compression starts with a 24-bit RGB image. Each pixel contains three 8-bit color components: Red, Green, and Blue, with values from 0 to 255. In this simulation, a fixed synthetic 16×16 RGB sample patch is used so that block division can be shown clearly. This patch is separated into R, G, and B channel matrices."
},
  {
  id: 2,
  title: "RGB to YCbCr Conversion",
  input: "16×16 RGB pixel matrix from Step 1",
  process:
    "Convert each RGB pixel into Y, Cb and Cr values using the RGB to YCbCr color transform.",
  output: "16×16 Y, Cb and Cr component matrices",
  description:
    "In this step, the RGB image patch from Step 1 is converted into Y, Cb and Cr components. Y represents luminance or brightness, while Cb and Cr represent chrominance or color-difference information. This separation is useful in JPEG because the human eye is more sensitive to brightness than color details, so chrominance data can be reduced in the next step."
},
  {
  id: 3,
  title: "Chroma Subsampling / Down Sampling",
  input: "16×16 Y, Cb and Cr matrices from Step 2",
  process:
    "Keep the Y luminance matrix unchanged and reduce the Cb and Cr chrominance matrices using 2×2 averaging.",
  output: "Y = 16×16, Cb = 8×8, Cr = 8×8",
  description:
    "In this step, chroma subsampling is applied after RGB to YCbCr conversion. The Y matrix is kept unchanged because it carries brightness information. The Cb and Cr matrices are reduced because the human eye is less sensitive to chrominance details. In this simulation, every 2×2 group of Cb and Cr values is replaced by one average value, reducing Cb and Cr from 16×16 to 8×8."
},
{
  id: 4,
  title: "8×8 Block Preparation",
  input: "16×16 Y luminance matrix from Step 3",
  process:
    "Divide the 16×16 Y matrix into four non-overlapping 8×8 blocks and select one block for further processing.",
  output: "Selected 8×8 Y processing block",
  description:
    "In JPEG compression, image component samples are processed in 8×8 blocks. In this simulation, the 16×16 Y luminance matrix is divided into four 8×8 blocks: B1, B2, B3 and B4. The selected 8×8 block is sent to Level Shifting, DCT, Quantization and the later encoding steps."
},
 {
  id: 5,
  title: "Level Shifting",
  input: "Selected 8×8 Y block from Step 4",
  process:
    "Subtract 128 from each value in the selected 8×8 block to shift the range around zero.",
  output: "Level shifted 8×8 block with values approximately from -128 to +127",
  description:
    "Before applying DCT, JPEG shifts the sample values by subtracting 128 from each value. Original image component values are in the unsigned range 0 to 255. After level shifting, the values are centered around zero, approximately from -128 to +127. This prepares the selected 8×8 block for the 2D DCT step."
},
  {
  id: 6,
  title: "Apply 2D DCT / FDCT",
  input: "Level shifted 8×8 block from Step 5",
  process:
    "Apply the Forward 2D Discrete Cosine Transform to convert spatial sample values into frequency coefficients.",
  output: "8×8 DCT coefficient matrix",
  description:
    "The 2D DCT converts the level shifted 8×8 block from the spatial domain into the frequency domain. The top-left coefficient is the DC coefficient and represents the average intensity of the block. The remaining 63 coefficients are AC coefficients and represent different frequency details. This prepares the block for quantization in the next step."
},
{
  id: 7,
  title: "Quantization",
  input: "8×8 DCT coefficient matrix from Step 6",
  process:
    "Divide each DCT coefficient by the corresponding JPEG luminance quantization table value and round the result.",
  output: "8×8 quantized DCT coefficient matrix",
  description:
    "Quantization is the main lossy step in JPEG compression. Each DCT coefficient is divided by the corresponding value from the quantization table and then rounded. Low-frequency coefficients are preserved more carefully, while high-frequency coefficients are reduced more strongly. This creates many small values and zeros, which makes later entropy encoding more efficient."
},
  {
  id: 8,
  title: "DC Difference Coding",
  input: "DC coefficient from the quantized 8×8 block",
  process:
    "Subtract the previous block DC coefficient from the current block DC coefficient.",
  output: "Differential DC value",
  description:
    "After quantization, JPEG treats the DC coefficient separately. The DC coefficient is the top-left value at position (0,0) of the quantized 8×8 block and represents the average intensity of the block. Since nearby blocks usually have similar average values, JPEG stores the difference between the current block DC and the previous block DC instead of storing the full DC value."
},
  {
    id: 9,
    title: "Zig-Zag Scanning",
    input: "Quantized 8×8 coefficient matrix after DC preparation",
    process: "Arrange the 64 quantized coefficients in zig-zag order.",
    output: "1D zig-zag sequence of coefficients",
    description:
      "Zig-zag scanning converts the 8×8 quantized coefficient matrix into a one-dimensional sequence. It starts from low-frequency coefficients near the top-left and moves toward high-frequency coefficients near the bottom-right. This ordering places many zero values near the end of the sequence, which makes Run-Length Encoding more effective."
  },
  {
    id: 10,
    title: "Run-Length Encoding",
    input: "AC coefficients from the zig-zag sequence",
    process: "Encode consecutive zero values using run-length coding.",
    output: "Run-length encoded AC data",
    description:
      "After zig-zag scanning, many high-frequency AC coefficients become zero and appear together near the end of the sequence. Run-Length Encoding represents repeated zeros in compact form instead of storing every zero separately."
  },
  {
    id: 11,
    title: "Huffman Encoding",
    input: "DC difference and run-length encoded AC data",
    process:
      "Assign shorter binary codes to common symbols and longer binary codes to uncommon symbols.",
    output: "Huffman encoded bitstream",
    description:
      "Huffman encoding compresses the DC difference and run-length encoded AC data further. It assigns shorter binary codes to frequently occurring symbols and longer binary codes to less frequent symbols, producing the final compressed bitstream."
  },
  {
    id: 12,
    title: "Final Compressed JPEG Output",
    input: "Huffman encoded bitstream",
    process: "Store or transmit the compressed JPEG data.",
    output: "Compressed JPEG bitstream / image data",
    description:
      "After Huffman encoding, the final compressed JPEG output is generated for storage or transmission."
  }
];

export default steps;