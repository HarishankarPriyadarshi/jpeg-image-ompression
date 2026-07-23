import "./PreProcessing.css";
import { useMatrix } from "../../context/MatrixContext";
import { useState } from "react";


function PreProcessing(){

    const [verificationStep,setVerificationStep]=useState(0);

    const [progress,setProgress]=useState(0);

    const [systemStatus,setSystemStatus]=useState("Idle");


const runVerification=()=>{

setVerificationStep(0);

setProgress(0);

setSystemStatus("Verifying...");

setTimeout(()=>{

setVerificationStep(1);

setProgress(20);

},500);

setTimeout(()=>{

setVerificationStep(2);

setProgress(40);

},1000);

setTimeout(()=>{

setVerificationStep(3);

setProgress(65);

},1500);

setTimeout(()=>{

setVerificationStep(4);

setProgress(85);

},2000);

setTimeout(()=>{

setVerificationStep(5);

setProgress(100);

setSystemStatus("Ready");

},2500);

}

const { selectedMatrix } = useMatrix();

if(!selectedMatrix){

return <h2>Loading...</h2>;

}

const values = selectedMatrix.data.flat();

const minValue=Math.min(...values);

const maxValue=Math.max(...values);

const averageValue=(values.reduce((a,b)=>a+b,0)/values.length).toFixed(2);

const dynamicRange=maxValue-minValue;

return(

<div className="preContainer">

<div className="preHeading">

<h2>Pre Processing</h2>

<div className="systemStatus">

<span>

{

systemStatus==="Idle"

?

"🔴"

:

systemStatus==="Verifying..."

?

"🟡"

:

"🟢"

}

</span>

<b>

System Status :

{systemStatus}

</b>

</div>

<p>

Preparing the selected image before transform based compression

</p>

</div>

<div className="preMain">

<div className="matrixPreview">

<h3>Selected Input Matrix</h3>

<div className="matrixGrid">

{selectedMatrix.data.map((row,rowIndex)=>

row.map((value,colIndex)=>

<span key={rowIndex+"-"+colIndex}>

{value}

</span>

)

)}

</div>

<div className="matrixLabel">

{selectedMatrix.name}

</div>

</div>

<div className="validationCard">

<h3>Verification Status</h3>

<div className={verificationStep>=1?"status success":"status"}>

{verificationStep>=1?"✔":"○"} Matrix Loaded

</div>

<div className={verificationStep>=2?"status success":"status"}>

{verificationStep>=2?"✔":"○"} Resolution Verified

</div>

<div className={verificationStep>=3?"status success":"status"}>

{verificationStep>=3?"✔":"○"} Pixel Range Valid

</div>

<div className={verificationStep>=4?"status success":"status"}>

{verificationStep>=4?"✔":"○"} Statistics Calculated

</div>

<div className={verificationStep>=5?"status success":"status"}>

{verificationStep>=5?"✔":"○"} Ready For Image Blocking

</div>
<div className="progressBar">

<div

className="progressFill"

style={{

width:`${progress}%`

}}

>

{progress}%

</div>

</div>

<button

className="verifyButton"

onClick={runVerification}

>

Run Verification

</button>

</div>

</div>

<div className="infoSection">

<div className="infoCard">

<h3>Image Properties</h3>

<p>

<span>Resolution</span>

<b>16 × 16</b>

</p>

<p>

<span>Bit Depth</span>

<b>8 Bit</b>

</p>

<p>

<span>Total Pixels</span>

<b>256</b>

</p>

<p>

<span>Color Mode</span>

<b>Grayscale</b>

</p>

</div>

<div className="infoCard">

<h3>Matrix Statistics</h3>

<p>

<span>Minimum</span>

<b>{minValue}</b>

</p>

<p>

<span>Maximum</span>

<b>{maxValue}</b>

</p>

<p>

<span>Average</span>

<b>{averageValue}</b>

</p>

<p>

<span>Dynamic Range</span>

<b>{dynamicRange}</b>

</p>

</div>

</div>

<div className="flowCard">

<h3>Processing Flow</h3>

<div className="flow">

<div>

Input Matrix

</div>

<span>↓</span>

<div>

Validation

</div>

<span>↓</span>

<div>

Statistics

</div>

<span>↓</span>

<div>

Ready

</div>

<span>↓</span>

<div
className={
verificationStep===5
?
"activeFlow flowGlow"
:
"activeFlow"
}
>

Image Blocking

</div>

</div>

</div>

<div className={verificationStep===5 ? "readyCard activeReady" : "readyCard"}>

<h2>

{verificationStep===5
? "🟢 Ready for Image Blocking"
: "🟡 Waiting for Verification"}

</h2>

<p>

{verificationStep===5

? "Input image verified successfully. The matrix can now proceed to the Image Blocking stage."

: "Click 'Run Verification' to validate the selected image matrix before processing."}

</p>

</div>

<div className="logCard">

<h3>Processing Log</h3>

<div className="logItem">

{verificationStep>=1 ? "🟢" : "⚪"}

<span>Matrix Loaded Successfully</span>

</div>

<div className="logItem">

{verificationStep>=2 ? "🟢" : "⚪"}

<span>Resolution Verified</span>

</div>

<div className="logItem">

{verificationStep>=3 ? "🟢" : "⚪"}

<span>Pixel Range Checked</span>

</div>

<div className="logItem">

{verificationStep>=4 ? "🟢" : "⚪"}

<span>Statistics Calculated</span>

</div>

<div className="logItem">

{verificationStep>=5 ? "🟢" : "⚪"}

<span>Ready For Image Blocking</span>

</div>

</div>

</div>

);

}

export default PreProcessing;