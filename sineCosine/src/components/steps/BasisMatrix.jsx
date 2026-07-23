import "./BasisMatrix.css";
import React,{useState} from "react";
import { useMatrix } from "../../context/MatrixContext";

function BasisMatrix(){

const [transform,setTransform]=useState("DCT");

const [selectedBlock,setSelectedBlock]=useState(1);

const [basisMatrix,setBasisMatrix]=useState([]);

const [progress,setProgress]=useState(0);

const [status,setStatus]=useState("Waiting");

const [selectedVector,setSelectedVector]=useState(0);

const { selectedMatrix } = useMatrix();

if(!selectedMatrix){
   return null;
}

let rowStart=0;
let colStart=0;

switch(selectedBlock){

case 1:
rowStart=0;
colStart=0;
break;

case 2:
rowStart=0;
colStart=8;
break;

case 3:
rowStart=8;
colStart=0;
break;

case 4:
rowStart=8;
colStart=8;
break;

default:
rowStart=0;
colStart=0;

}

const processingBlock=
selectedMatrix.data
.slice(rowStart,rowStart+8)
.map(row=>row.slice(colStart,colStart+8));



const generateBasisMatrix=()=>{

setBasisMatrix([]);

setProgress(0);

setStatus("Generating...");

const N=8;

const matrix=[];

let row=0;

const interval=setInterval(()=>{

const currentRow=[];

for(let x=0;x<N;x++){

let alpha=
row===0
?
Math.sqrt(1/N)
:
Math.sqrt(2/N);

let value;

if(transform==="DCT"){

value=

alpha*

Math.cos(

((2*x+1)*row*Math.PI)/(2*N)

);

}

else{

value=

Math.sqrt(2/(N+1))

*

Math.sin(

((row+1)*(x+1)*Math.PI)/(N+1)

);

}

currentRow.push(

value.toFixed(4)

);

}

matrix.push(currentRow);

setBasisMatrix([...matrix]);

row++;

setProgress(

Math.round((row/N)*100)

);

if(row===N){

clearInterval(interval);

setStatus("Completed ✓");

}

},350);

};


return(

<div className="basisContainer">

<div className="basisHeading">

<h2>Generate Basis Matrix</h2>

<p>

Generate the orthogonal basis matrix required for
the selected transform before performing image compression.

</p>

</div>


<div className="topControls">

<div className="controlCard">

<h3>Transform</h3>

<div className="toggleButtons">

<button

className={
transform==="DCT"
?
"activeBtn"
:
""
}

onClick={()=>setTransform("DCT")}

>

DCT

</button>

<button

className={
transform==="DST"
?
"activeBtn"
:
""
}

onClick={()=>setTransform("DST")}

>

DST

</button>

</div>

</div>


<div className="controlCard">

<h3>Selected Block</h3>

<div className="blockButtons">

{

[1,2,3,4].map((block)=>(

<button

key={block}

className={
selectedBlock===block
?
"activeBtn"
:
""
}

onClick={()=>setSelectedBlock(block)}

>

B{block}

</button>

))

}

</div>

</div>

</div>


<div className="basisLayout">

<div className="basisCard blockCard">

<h3>

Selected Processing Block

</h3>

<div className="selectedBlockPreview">

{processingBlock.map((row,rowIndex)=>

row.map((value,colIndex)=>(

<div
key={rowIndex+"-"+colIndex}
className="blockPixel"
style={{
background:`rgb(${value},${value},${value})`
}}
>

</div>

))

)}

</div>



</div>



<div className="basisArrow">

➜

</div>

<div className="basisCard orthoMatrixCard">

<h3>

Orthogonal Basis Matrix ( C )

</h3>

<div className="basisGrid">

    <div></div>

{

Array.from({length:8}).map((_,i)=>(

<div
key={"head"+i}
className="matrixHeader"
>

x={i}

</div>

))

}

{

basisMatrix.length===0

?

<div className="waitingText">

Waiting...

</div>

:

basisMatrix.map((row,rowIndex)=>(
<React.Fragment key={rowIndex}>


<div className="matrixHeader">

u={rowIndex}

</div>

{

row.map((value,colIndex)=>(

<span

key={rowIndex+"-"+colIndex}

className={

selectedVector===rowIndex

?

"activeVector"

:

""

}

onClick={()=>setSelectedVector(rowIndex)}

>

{value}

</span>

))

}

</React.Fragment>

))



}

</div>

</div>

<div className="vectorInfoCard">

<h3>

Selected Basis Vector

</h3>

<h2>

u = {selectedVector}

</h2>

<p>

{

selectedVector===0

?

"DC Basis Vector (Lowest Frequency). Represents the average intensity of the image block."

:

selectedVector<=2

?

"Low Frequency Basis Vector. Represents smooth intensity variations."

:

selectedVector<=5

?

"Medium Frequency Basis Vector. Represents texture and moderate details."

:

"High Frequency Basis Vector. Represents edges and sharp transitions."

}

</p>

</div>

<div className="frequencyBar">

{

Array.from({length:8}).map((_,i)=>(

<div

key={i}

className={
selectedVector===i
?
"frequencyCell activeFrequency"
:
"frequencyCell"
}

onClick={()=>setSelectedVector(i)}

>

u={i}

</div>

))

}

</div>

</div>

<button

className="generateButton"

onClick={generateBasisMatrix}

>

Generate Basis Matrix

</button>

<div className="progressCard">

<h3>

Generation Status

</h3>

<p>

{status}

</p>

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



</div>

<div className="formulaSection">

<h3>Mathematical Formulation</h3>

{
transform==="DCT"
?
<>

<div className="formulaBox">

<h4>DCT-II Basis Function</h4>

<div className="equation">

<div className="leftPart">

C(u,x)= α(u) × cos

</div>

<div className="fraction">

<div className="numerator">

(2x+1)uπ

</div>

<div className="line"></div>

<div className="denominator">

2N

</div>

</div>

</div>

</div>

<div className="formulaBox">

<h4>Normalization Factor</h4>

<div className="piecewise">

<div className="pieceRow">

<div>α(u)= √(1/N)</div>

<div>u = 0</div>

</div>

<div className="pieceRow">

<div>α(u)= √(2/N)</div>

<div>u ≠ 0</div>

</div>

</div>

</div>

</>

:

<div className="formulaCard">

<h4>DST Basis Function</h4>

<div className="formulaBox">

<h4>DST Basis Function</h4>

<div className="equation">

<div className="leftPart">

S(u,x)=

√(2/(N+1))

×

sin

</div>

<div className="fraction">

<div className="numerator">

(u+1)(x+1)π

</div>

<div className="line"></div>

<div className="denominator">

N+1

</div>

</div>

</div>

</div>


</div>

}

</div>

<div className="currentCalculation">

<h3>Current Basis Calculation</h3>

<p>

Selected Vector :

<b> u = {selectedVector}</b>

</p>

<p>

Normalization :

<b>

{

selectedVector===0

?

"α(u)=√(1/N)"

:

"α(u)=√(2/N)"

}

</b>

</p>

<p>

Current x :

<b>0 → 7</b>

</p>

<p>

Basis Formula :

</p>

<div className="miniFormula">

{

transform==="DCT"

?

"C(u,x)=α(u) cos((2x+1)uπ / 2N)"

:

"S(u,x)=√(2/(N+1)) sin((u+1)(x+1)π /(N+1))"

}

</div>

</div>

<div className="waveCard">

<h3>Basis Function Visualization</h3>

<svg
className="waveSvg"
viewBox="0 0 520 220"
>

<line
x1="40"
y1="110"
x2="490"
y2="110"
className="axisLine"
/>

<line
x1="40"
y1="20"
x2="40"
y2="190"
className="axisLine"
/>

<polyline

fill="none"

stroke="#2563eb"

strokeWidth="4"

strokeLinecap="round"

strokeLinejoin="round"

points={

Array.from({length:8}).map((_,x)=>{

let value;

if(transform==="DCT"){

const alpha=

selectedVector===0

?

Math.sqrt(1/8)

:

Math.sqrt(2/8);

value=

alpha*

Math.cos(

((2*x+1)*selectedVector*Math.PI)/16

);

}

else{

value=

Math.sqrt(2/9)

*

Math.sin(

((selectedVector+1)*(x+1)*Math.PI)/9

);

}

return `${40+x*60},${110-value*70}`;

}).join(" ")

}

/>

{

Array.from({length:8}).map((_,x)=>{

let value;

if(transform==="DCT"){

const alpha=

selectedVector===0

?

Math.sqrt(1/8)

:

Math.sqrt(2/8);

value=

alpha*

Math.cos(

((2*x+1)*selectedVector*Math.PI)/16

);

}

else{

value=

Math.sqrt(2/9)

*

Math.sin(

((selectedVector+1)*(x+1)*Math.PI)/9

);

}

return(

<g key={x}>

<circle

cx={40+x*60}

cy={110-value*70}

r="5"

className="wavePoint"

/>

<text

x={34+x*60}

y="205"

className="waveLabel"

>

{x}

</text>

</g>

);

})

}

</svg>

<div className="waveLegend">

<div>

🔵

Amplitude

</div>

<div>

x = Pixel Position

</div>

<div>

u = {selectedVector}

</div>

</div>

</div>

<div className="waveDescription">

{

selectedVector===0

?

"Flat basis vector. Represents the DC component (average intensity)."

:

selectedVector<=2

?

"Low-frequency basis vector. Captures smooth brightness changes."

:

selectedVector<=5

?

"Medium-frequency basis vector. Represents image texture."

:

"High-frequency basis vector. Represents edges and fine details."

}

</div>

<div className="relationCard">

<h3>

Relation With Selected Block

</h3>

<p>

Selected Block :

<b>

B{selectedBlock}

</b>

</p>

<p>

The basis matrix is generated only once because it depends on the block size (8 × 8).

The selected block supplies the pixel values.

During the next step, this basis matrix will be multiplied with the selected block to generate frequency coefficients.

</p>

</div>



<div className="basisInfo">

<div>

<b>Selected Block</b>

<span>

B{selectedBlock}

</span>

</div>

<div>

<b>Transform</b>

<span>

{transform}

</span>

</div>

<div>

<b>Matrix Size</b>

<span>

8 × 8

</span>

</div>

<div>

<b>Orthogonal</b>

<span>

YES

</span>

</div>

<div>

<b>Normalization</b>

<span>

Enabled

</span>

</div>

<div>

<b>Basis Vectors</b>

<span>

8

</span>

</div>

</div>

<div className="conceptCard">

<h3>

Concept Explanation

</h3>

<p>

The selected processing block is

<b>

B{selectedBlock}

</b>

.

However, the generated

<b>

{transform}

Basis Matrix

</b>

does not change.

</p>

<p>

This is because the basis matrix depends only on

the block size

<b>

(8 × 8)

</b>

and not on the pixel values.

Every processing block uses the same orthogonal

basis vectors during transform coding.

</p>

</div>

<div className="pipelineCard">

<h2>

Next Step Preview

</h2>

<p>

The generated basis matrix is now ready for transform computation.

In the next step, the selected image block will be multiplied
with the basis matrix to obtain the frequency coefficients.

</p>

<div className="pipelineFlow">

<div className="pipelineBox">

<h4>

Selected Block

</h4>

<div>

B{selectedBlock}

</div>

</div>

<div className="pipelineOperator">

×

</div>

<div className="pipelineBox">

<h4>

Basis Matrix

</h4>

<div>

C

</div>

</div>

<div className="pipelineOperator">

×

</div>

<div className="pipelineBox">

<h4>

Transpose

</h4>

<div>

Cᵀ

</div>

</div>

<div className="pipelineOperator">

=

</div>

<div className="pipelineResult">

Frequency
<br/>
Coefficients

</div>

</div>

</div>

<div className="equationCard">

<h3>

Transform Equation

</h3>

{

transform==="DCT"

?

<p>

F = C × A × Cᵀ

</p>

:

<p>

F = S × A × Sᵀ

</p>

}

<p>

Where,

</p>

<ul>

<li>

A → Selected 8 × 8 Image Block

</li>

<li>

{

transform==="DCT"

?

"C"

:

"S"

}

→ Basis Matrix

</li>

<li>

{

transform==="DCT"

?

"Cᵀ"

:

"Sᵀ"

}

→ Transpose Basis Matrix

</li>

<li>

F → Frequency Coefficient Matrix

</li>

</ul>

</div>

<div className="nextStepCard">

<h3>

What will happen in Step 5?

</h3>

<div className="nextSteps">

<div>

✅ Matrix Multiplication

</div>

<div>

✅ Frequency Coefficient Generation

</div>

<div>

✅ DC Component Detection

</div>

<div>

✅ AC Component Calculation

</div>

<div>

✅ Frequency Visualization

</div>

</div>

</div>



</div>



);

}

export default BasisMatrix;