const steps = [
{
  id:1,
  title:"Input Image",
  description:
  "The user selects an image for processing."
},
{
  id:2,
  title:"Image Blocking",
  description:
  "The 16×16 image is divided into four fixed 8×8 blocks (B1-B4), the same block size real image codecs use, so each block can be transformed and compressed independently in the steps that follow."
},
{
  id:3,
  title:"Generate DCT/DST Basis Matrix",
  description:
  "Basis matrices are generated mathematically. Each entry comes from a cosine (DCT) or sine (DST) formula evaluated at a specific frequency index u and pixel position x. The matrix depends only on the fixed 8×8 block size, not on the image content, so it only needs to be generated once and can be reused for every block."
},
{
  id:4,
  title:"Apply DCT/DST",
  description:
  "The generated basis matrix is multiplied with the selected 8×8 image block and its transpose (F = C × A × Cᵀ) to convert the block from the spatial domain into frequency-domain coefficients."
},
{
  id:5,
  title:"Quantization",
  description:
  "Each frequency coefficient is divided by a corresponding value from a quantization table and rounded, so less visually important high-frequency values shrink toward zero while important low-frequency values are preserved."
},
{
  id:6,
  title:"Zig Zag Scan",
  description:
  "The quantized 8×8 coefficient matrix is read out in a diagonal zig-zag order, from low to high frequency, so that the many zero values produced by quantization end up grouped together for efficient encoding."
},
{
  id:7,
  title:"Encoding",
  description:
  "The zig-zag scanned coefficients are compressed using run-length encoding, which stores long runs of zeros compactly, producing the final compressed representation of the image block."
},
{
  id:8,
  title:"Comparison",
  description:
  "The compressed block is reconstructed using the inverse transform and compared against the original block using metrics like MSE and PSNR to evaluate how much quality was lost during compression."
}
];

export default steps;
