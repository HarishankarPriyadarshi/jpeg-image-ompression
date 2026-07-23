import { useState } from "react";
import steps from "../data/steps";
import InputImage from "./steps/InputImage";
import PreProcessing from "./steps/PreProcessing";
import ImageBlocking from "./steps/ImageBlocking";
import BasisMatrix from "./steps/BasisMatrix";
import TransformComputation from "./steps/TransformComputation";
import Quantization from "./steps/Quantization";
import ZigZagScan from "./steps/ZigZagScan";
import Encoding from "./steps/Encoding";
import InverseTransform from "./steps/InverseTransform";
import Comparison from "./steps/Comparison";

function ConceptModal({ onClose }) {


const nextStep = () => {
  if (!started) return;

  if (activeStep < steps.length) {
    setActiveStep(prev => prev + 1);
  }
};

const prevStep = () => {
  if (!started) return;

  if (activeStep > 1) {
    setActiveStep(prev => prev - 1);
  }
};


const [started, setStarted] = useState(false);

const [activeStep, setActiveStep] = useState(0);


const startSimulation = () => {
  setStarted(true);
  setActiveStep(1);
};

  

  return (

    
    <div className="overlay">

      <div className="modal">

<div className="headerBar">

  <div className="headerTitle">
    Sine & Cosine Compression Visualizer
  </div>

  

  <div className="headerActions">

    <button
      className="closeHeaderBtn"
      onClick={() => onClose && onClose()}
    >
      CLOSE
    </button>

  </div>

</div>

<div className="stepNavigator stepBar">

  

<button
className="navBtn"
onClick={prevStep}
disabled={!started || activeStep === 1}
>
❮
</button>

<div className="stepProgress">

<div>
{activeStep === 0
? "Welcome Screen"
: `Step ${activeStep} of ${steps.length} • ${steps[activeStep - 1]?.title}`}
</div>

<div>
{Math.round((activeStep / steps.length) * 100)}%
</div>

</div>


<button
className="navBtn"
onClick={nextStep}
disabled={!started || activeStep === steps.length}
>
❯
</button>

</div>

<div className="topConnector">
  <div className="leftLine"></div>
  <div className="rightLine"></div>
</div>

        <div className="contentArea">


<div className="leftPanel">

  <h2 className="stepsHeading">Steps</h2>

  <ul className="stepsList">
    {steps.map((step) => (
      <li
        key={step.id}
        className={
          step.id === activeStep
            ? "currentStep"
            : step.id < activeStep
            ? "completedStep"
            : "lockedStep"
        }
      >
        <span className="stepCircle">
          {step.id}
        </span>

        {step.title}
      </li>
    ))}
  </ul>

  <div className="controlButtons">

    <button
      onClick={prevStep}
      disabled={!started || activeStep === 1}
    >
      Prev
    </button>

    <button
      onClick={nextStep}
      disabled={!started}
    >
      Next
    </button>

    <button
      onClick={startSimulation}
      disabled={started}
    >
      Start
    </button>


  </div>

  

</div>
<div className="visualPanel">

  
<div className="stepWorkspace">

  
  


<div className="ioContainer">

{activeStep === 0 ? (

<div className="welcomeScreen">

  <h1>
    Sine & Cosine Transform Based Image Compression
  </h1>
  <h2 className="welcomeSubTitle">
Interactive Virtual Laboratory
</h2>

  <p>
    Learn how DCT and DST transforms compress images
    while preserving visual quality.
  </p>

  <div className="welcomeTopSection">

<div className="sampleMatrixCard">

<h3>Sample Input Image (16 × 16)</h3>

<div className="matrix16Preview">

{Array.from({ length: 16 }).map((_, row) => (

<div key={row} className="matrix16Row">

{Array.from({ length: 16 }).map((_, col) => (

<span key={col}>

{Math.min(255, 32 + row * 12 + col * 4)}

</span>

))}

</div>

))}

</div>

<p>

Educational Preview of a 16 × 16 Grayscale Image

</p>

</div>

<div className="objectiveCard">

  

<div className="objectiveHeading">

🎯 Experiment Objective

</div>

<ul className="objectiveList">

<li>Represent a grayscale image as a pixel matrix.</li>

<li>Preprocess image before transform coding.</li>

<li>Divide image into 8 × 8 processing blocks.</li>

<li>Generate DCT/DST basis matrices.</li>

<li>Apply transform-based image compression.</li>

<li>Reconstruct and compare image quality.</li>

</ul>

</div>

</div>


<div className="experimentInfo">

  <div>
    <b>Image Size</b>
    <span>16 × 16</span>
  </div>

  <div>
    <b>Bit Depth</b>
    <span>8-bit</span>
  </div>

  <div>
    <b>Pixel Range</b>
    <span>0–255</span>
  </div>

  <div>
    <b>Block Size</b>
    <span>8 × 8</span>
  </div>

  <div>
    <b>Total Blocks</b>
    <span>4</span>
  </div>

</div>

<div className="workflowPreview">

<div>Input Image</div>

<span>↓</span>

<div>Preprocessing</div>

<span>↓</span>

<div>BImage Blocking</div>

<span>↓</span>

<div>Basis Matrix</div>

<span>↓</span>

<div>DCT / DST</div>

<span>↓</span>

<div>Frequency Domain</div>

<span>↓</span>

<div>Quantization</div>

<span>↓</span>

<div>Inverse</div>

<span>↓</span>

<div>Comparison</div>

</div>

</div>








) : activeStep === 1 ? (

  



<InputImage />





) 

: activeStep === 2 ? (

<PreProcessing />

)

: activeStep === 3 ? (

<ImageBlocking />

)

: activeStep === 4 ? (

<BasisMatrix />

)

: activeStep === 5 ? (

<TransformComputation />

)

: activeStep === 6 ? (

<Quantization />

)

: activeStep === 7 ? (

<ZigZagScan />

)

: activeStep === 8 ? (

<Encoding />

)

: activeStep === 9 ? (

<InverseTransform />

)

: activeStep === 10 ? (

<Comparison />

)

: (

<div className="ioContainer">

Output Data Here

</div>

)}


</div>




  <div className="explanationBox">

<h3>Explanation</h3>

{activeStep === 0 ? (

<p>
📘 Overview
<br></br>
This virtual laboratory demonstrates the complete image compression workflow using the Discrete Cosine Transform (DCT) and the Discrete Sine Transform (DST).

The experiment illustrates how image data is represented as a matrix, transformed into the frequency domain, compressed by removing less significant coefficients, and reconstructed using the corresponding inverse transforms.

Students can observe every stage of the transform-based compression process and compare the reconstructed image with the original image.
</p>

) : activeStep === 1 ? (

<p>
A digital image can be represented as a matrix
of pixel intensity values. Each element stores
brightness information ranging from 0 to 255.

Image compression works by identifying and
removing less important information while
preserving the visual appearance of the image.

In the compressed matrix, several values are
reduced or discarded, resulting in a significant
reduction in storage requirements.
</p>




) : (

  

<p>
{steps[activeStep - 1]?.description}
</p>

)}




</div>


</div>
</div>
</div>

       

      </div>

    </div>
  );
}

export default ConceptModal;