const steps = [
{
  id:1,
  title:"Input Image",
  description:
  "The user selects an image for processing."
},
{
  id:2,
  title:"Pre Processing",
  description:
  "Image is prepared before applying transform."
},
{
  id:3,
  title:"Image Blocking",
  description:
  "Image is divided into 8×8 blocks."
},
{
  id:4,
  title:"Generate DCT/DST Basis Matrix",
  description:
  "Basis matrices are generated mathematically."
},
{
  id:5,
  title:"Apply DCT/DST",
  description:
  "Transform converts image into frequency domain."
},

{
  id:6,
  title:"Quantization",
  description:
  "Less important values are reduced."
},
{
  id:7,
  title:"Zig Zag Scan",
  description:
  "Coefficients are rearranged."
},
{
  id:8,
  title:"Encoding",
  description:
  "Compressed data is stored efficiently."
},
{
  id:9,
  title:"Inverse DCT/DST",
  description:
  "Image is reconstructed."
},
{
  id:10,
  title:"Comparison",
  description:
  "Original and reconstructed images are compared."
}
];

export default steps;