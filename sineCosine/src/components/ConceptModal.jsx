import { useState } from "react";
import steps from "../data/steps";
import guidedTutorContent from "../data/guidedTutorContent";
import guidedTourSteps from "../data/guidedTourSteps";
import GuidedTour from "./GuidedTour";
import { useMatrix } from "../context/MatrixContext";
import InputImage from "./steps/InputImage";
import ImageBlocking from "./steps/ImageBlocking";
import BasisMatrix from "./steps/BasisMatrix";
import TransformComputation from "./steps/TransformComputation";
import Quantization from "./steps/Quantization";
import ZigZagScan from "./steps/ZigZagScan";
import Encoding from "./steps/Encoding";
import Comparison from "./steps/Comparison";

function ConceptModal({ onClose }) {


const matrixCtx = useMatrix();
const { selectedMatrix, blockCreated, setBlockCreated, selectedBlock, basisGenerated, frequencyMatrix, quantizedMatrix, zigzagArray, encodedRuns, popupMessage, setPopupMessage } = matrixCtx;

const nextStep = () => {
  if (!started) return;

  if (activeStep === 1 && !selectedMatrix) {
    setPopupMessage("Please select a matrix first before proceeding to the next step.");
    return;
  }

  if (activeStep === 2) {
    if (!selectedBlock) {
      setPopupMessage("Please select a block (B1-B4) and click 'Create Processing Block' first.");
      return;
    }
    if (!blockCreated) {
      setBlockCreated(true);
    }
  }

  if (activeStep === 3 && !basisGenerated) {
    setPopupMessage("Please generate the Basis Matrix first before proceeding.");
    return;
  }

  if (activeStep === 4 && (!frequencyMatrix || frequencyMatrix.length === 0)) {
    setPopupMessage("Please click 'Perform Transform' first before proceeding.");
    return;
  }

  if (activeStep === 5 && (!quantizedMatrix || quantizedMatrix.length === 0)) {
    setPopupMessage("Please click 'Perform Quantization' first before proceeding.");
    return;
  }

  if (activeStep === 6 && (!zigzagArray || zigzagArray.length === 0)) {
    setPopupMessage("Please run the Zig-Zag Scan first before proceeding.");
    return;
  }

  if (activeStep === 7 && (!encodedRuns || !encodedRuns.pairs || encodedRuns.pairs.length === 0)) {
    setPopupMessage("Please run Run-Length Encoding first before proceeding.");
    return;
  }

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


const [started, setStarted] = useState(true);

const [activeStep, setActiveStep] = useState(1);

const [showGuidedTutor, setShowGuidedTutor] = useState(false);

const [tourMuted, setTourMuted] = useState(false);

const activeTutor = guidedTutorContent.find((item) => item.id === activeStep);

const activeTourSteps = guidedTourSteps[activeStep];

const startSimulation = () => {
  setStarted(true);
  setActiveStep(1);
};



  return (

    
    <div className="overlay">

      <div className="modal">

{popupMessage && (
  <div className="centerPopupOverlay">
    <div className="centerPopupBox">
      <p>{popupMessage}</p>
      <button onClick={() => setPopupMessage("")}>OK</button>
    </div>
  </div>
)}

{showGuidedTutor && activeTourSteps && (
  <GuidedTour
    steps={activeTourSteps}
    ctx={matrixCtx}
    muted={tourMuted}
    onToggleMute={() => setTourMuted((m) => !m)}
    onClose={() => setShowGuidedTutor(false)}
  />
)}

{showGuidedTutor && !activeTourSteps && activeTutor && (
  <div className="guidedTutorOverlay" onClick={() => setShowGuidedTutor(false)}>
    <div className="guidedTutorBox" onClick={(e) => e.stopPropagation()}>
      <div className="guidedTutorHeader">
        <h3>{activeTutor.title}</h3>
        <button className="guidedTutorCloseBtn" onClick={() => setShowGuidedTutor(false)} aria-label="Close guided tutor">✕</button>
      </div>
      <p className="guidedTutorIntro">{activeTutor.intro}</p>
      <ul className="guidedTutorTips">
        {activeTutor.tips.map((tip, index) => (
          <li key={index}>{tip}</li>
        ))}
      </ul>
      <button className="guidedTutorGotIt" onClick={() => setShowGuidedTutor(false)}>Got it</button>
    </div>
  </div>
)}

<div className="headerBar">
  <div className="headerTitle">Sine & Cosine Compression Visualizer</div>
  <div className="headerActions">
    <button
      className="speakerBtn"
      title={tourMuted ? "Unmute narration" : "Mute narration"}
      onClick={() => setTourMuted((m) => !m)}
    >
      {tourMuted ? "🔇" : "🔊"}
    </button>
    <button className="guidedTutorBtn" onClick={() => setShowGuidedTutor(true)}>GUIDED TUTOR</button>
    <button className="closeHeaderBtn" onClick={() => onClose && onClose()}>CLOSE</button>
  </div>
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
      disabled={!started || activeStep === steps.length}
    >
      {activeStep === 1 ? "Start" : activeStep === steps.length ? "Finish" : "Next"}
    </button>

  </div>

  

</div>
<div className="visualPanel">

  
<div className="stepWorkspace">

  
  


<div className={`ioContainer${[3,4,5,6,7,8].includes(activeStep) ? " ioFullWidth" : ""}`}>

{activeStep === 1 ? (

  



<InputImage />





) 

: activeStep === 2 ? (

<ImageBlocking />

)

: activeStep === 3 ? (

<BasisMatrix />

)

: activeStep === 4 ? (

<TransformComputation />

)

: activeStep === 5 ? (

<Quantization />

)

: activeStep === 6 ? (

<ZigZagScan />

)

: activeStep === 7 ? (

<Encoding />

)

: activeStep === 8 ? (

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

{activeStep === 1 ? (

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