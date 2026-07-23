import "./TransformComputation.css";
import { useState, useEffect } from "react";
import { useMatrix } from "../../context/MatrixContext";

function TransformComputation() {

const {

selectedMatrix,

frequencyMatrix,

setFrequencyMatrix

}=useMatrix();


const [transform, setTransform] = useState("DCT");
const [selectedBlock, setSelectedBlock] = useState(1);

const [progress,setProgress]=useState(0);

const [status,setStatus]=useState("Waiting");

const [step,setStep]=useState(0);


const [selectedCoefficient,setSelectedCoefficient]=useState({
u:0,
v:0
});

const u = selectedCoefficient.u;
const v = selectedCoefficient.v;

const selectedValue =
frequencyMatrix.length
?
Number(frequencyMatrix[u][v]).toFixed(2)
:
0;

const maxCoefficient =

frequencyMatrix.length

?

Math.max(

...frequencyMatrix.flat().map(v=>Math.abs(v))

)

:

1;

const calculateEnergy = () => {

if(!frequencyMatrix.length){

return{

dc:0,

low:0,

medium:0,

high:0

};

}

let dc=0;
let low=0;
let medium=0;
let high=0;

let total=0;

frequencyMatrix.forEach((row,u)=>{

row.forEach((value,v)=>{

const energy=value*value;

total+=energy;

if(u===0 && v===0){

dc+=energy;

}

else if(u+v<=3){

low+=energy;

}

else if(u+v<=7){

medium+=energy;

}

else{

high+=energy;

}

});

});

return{

dc:((dc/total)*100).toFixed(1),

low:((low/total)*100).toFixed(1),

medium:((medium/total)*100).toFixed(1),

high:((high/total)*100).toFixed(1)

};

};

const energy=calculateEnergy();

const getEnergyLevel=(value)=>{

const ratio=Math.abs(value)/maxCoefficient;

if(ratio>=0.75) return "energyVeryHigh";

if(ratio>=0.50) return "energyHigh";

if(ratio>=0.25) return "energyMedium";

if(ratio>=0.10) return "energyLow";

return "energyVeryLow";

};

if (!selectedMatrix) return null;

// -------- Select Current 8×8 Block --------

let rowStart = 0;
let colStart = 0;

switch(selectedBlock){

case 1:
rowStart = 0;
colStart = 0;
break;

case 2:
rowStart = 0;
colStart = 8;
break;

case 3:
rowStart = 8;
colStart = 0;
break;

case 4:
rowStart = 8;
colStart = 8;
break;

default:
rowStart = 0;
colStart = 0;

}

const imageBlock =
selectedMatrix.data
.slice(rowStart,rowStart+8)
.map(row=>row.slice(colStart,colStart+8));

const N = 8;

const generateBasisMatrix = () => {

const matrix = [];

for(let u=0;u<N;u++){

const row=[];

for(let x=0;x<N;x++){

let value;

if(transform==="DCT"){

const alpha =
u===0
?
Math.sqrt(1/N)
:
Math.sqrt(2/N);

value =
alpha *
Math.cos(
((2*x+1)*u*Math.PI)/(2*N)
);

}
else{

value =
Math.sqrt(2/(N+1))
*
Math.sin(
((u+1)*(x+1)*Math.PI)/(N+1)
);

}

row.push(Number(value.toFixed(4)));

}

matrix.push(row);

}

return matrix;

};

const [basisMatrix,setBasisMatrix]=useState([]);

useEffect(()=>{

setBasisMatrix(generateBasisMatrix());

},[transform]);

const transpose=(matrix)=>{

return matrix[0].map((_,col)=>

matrix.map(row=>row[col])

);

};

const multiply=(A,B)=>{

const result=[];

for(let i=0;i<A.length;i++){

result[i]=[];

for(let j=0;j<B[0].length;j++){

let sum=0;

for(let k=0;k<B.length;k++){

sum+=A[i][k]*B[k][j];

}

result[i][j]=sum;

}

}

return result;

};

useEffect(() => {

setFrequencyMatrix([]);

setProgress(0);

setStatus("Waiting");

setStep(0);

setSelectedCoefficient({
u:0,
v:0
});

},[selectedBlock,transform]);

const performTransform=()=>{

setProgress(0);

setStatus("Computing C × A");

setStep(1);

setFrequencyMatrix([]);

let p=0;

const interval=setInterval(()=>{

p+=5;

setProgress(p);

if(p===35){

setStatus("Computing (C × A) × Cᵀ");

setStep(2);

}

if(p===70){

setStatus("Generating Frequency Matrix");

setStep(3);

}

if(p>=100){

clearInterval(interval);

setProgress(100);

setStatus("Completed ✓");

setStep(4);

const T = basisMatrix;

const TT = transpose(T);

const first = multiply(T,imageBlock);

const second = multiply(first,TT);

setFrequencyMatrix(

second.map(row=>

row.map(value=>

Number(value.toFixed(2))

)

)

);

}

},80);

};

const transposeMatrix =

basisMatrix.length

?

basisMatrix[0].map((_,col)=>

basisMatrix.map(row=>row[col])

)

:

[];

const basisSymbol = transform==="DCT" ? "C" : "S";

const transposeSymbol = transform==="DCT" ? "Cᵀ" : "Sᵀ";

return(

<div className="transformContainer">

<div className="transformHeading">

<h2>

Step 5 : Transform Computation

</h2>

<p>

Apply the selected transform (DCT/DST) on the selected
8 × 8 image block to generate frequency coefficients.

</p>

</div>

<div className="topControls">

<div className="controlCard">

<h3>

Transform

</h3>

<div className="toggleButtons">

<button
className={transform==="DCT"?"activeBtn":""}
onClick={()=>setTransform("DCT")}
>

DCT

</button>

<button
className={transform==="DST"?"activeBtn":""}
onClick={()=>setTransform("DST")}
>

DST

</button>

</div>

</div>

<div className="controlCard">

<h3>

Processing Block

</h3>

<div className="blockButtons">

{

[1,2,3,4].map(block=>(

<button

key={block}

className={selectedBlock===block?"activeBtn":""}

onClick={()=>setSelectedBlock(block)}

>

B{block}

</button>

))

}

</div>

</div>

</div>

<div className="selectedBlockCard">



<h3>

Selected Image Block

</h3>

<div className="selectedBlockPreview">

{

imageBlock.map((row,rowIndex)=>

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
)

}

</div>

<p>

Current Block :

<b>

B{selectedBlock}

</b>

</p>

</div>

<div className="transformLayout">

<div className="matrixCard">

<h3>

Selected Block (A)

</h3>

<div className="miniMatrix">

{
imageBlock.map((row,rowIndex)=>

row.map((value,colIndex)=>(

<span
key={rowIndex+"-"+colIndex}
>

{value}

</span>

))

)

}

</div>

</div>


<div className="operator">

×

</div>


<div className="matrixCard">

<h3>

Basis Matrix

</h3>

<div className="miniMatrix">

{

basisMatrix.map((row,rowIndex)=>

row.map((value,colIndex)=>(

<span
key={rowIndex+"-"+colIndex}
>

{value}

</span>

))

)

}

</div>

</div>


<div className="operator">

×

</div>


<div className="matrixCard">

<h3>

Transpose Matrix

</h3>

<div className="miniMatrix">

{

transposeMatrix.map((row,rowIndex)=>

row.map((value,colIndex)=>(

<span
key={rowIndex+"-"+colIndex}
>

{value}

</span>

))

)

}

</div>

</div>

</div>

<div className="equationPreview">

<h3>

Current Transform Equation

</h3>

<h2>

{

transform==="DCT"

?

"F = C × A × Cᵀ"

:

"F = S × A × Sᵀ"

}

</h2>

<p>

A = Selected Image Block

<br/>

{

transform==="DCT"

?

"C = DCT Basis Matrix"

:

"S = DST Basis Matrix"

}

<br/>

F = Frequency Coefficient Matrix

</p>

</div>

<div className="transformProgressCard">

<h3>

Transform Progress

</h3>

<div className="progressTrack">

<div

className="progressFill"

style={{

width:`${progress}%`

}}

>

{progress}%

</div>

</div>

<p>

{status}

</p>

<button

className="transformButton"

onClick={performTransform}

disabled={progress>0 && progress<100}

>

Perform Transform

</button>

</div>

<div className="matrixAnimationCard">

<h3>

Matrix Multiplication Process

</h3>

<div className="matrixAnimation">

<div className={step>=1?"miniMatrixBox miniActiveMatrix":"miniMatrixBox"}>

{transform==="DCT"?"C":"S"}

</div>

<div className="matrixOperator">

×

</div>

<div className={step>=1?"miniMatrixBox miniActiveMatrix":"miniMatrixBox"}>

A

</div>

<div className="matrixOperator">

=

</div>

<div className={step>=2?"miniMatrixBox miniActiveMatrix":"miniMatrixBox"}>

CA

</div>

<div className="matrixOperator">

×

</div>

<div className={step>=3?"miniMatrixBox miniActiveMatrix":"miniMatrixBox"}>

{transform==="DCT"?"Cᵀ":"Sᵀ"}

</div>

<div className="matrixOperator">

=

</div>

<div className={step>=4?"matrixResult activeResult":"matrixResult"}>

F

</div>

</div>

<p>

Current Stage :

<b>

{

step===0?"Waiting":

step===1?"Computing C × A":

step===2?"Intermediate Matrix":

step===3?"Multiplying with Transpose":

"Frequency Matrix Generated"

}

</b>

</p>

</div>

<div className="multiplicationFlow">

<div className={step>=1?"activeFlowBox":"flowBox"}>

C × A

</div>

<div className="flowArrow">

→

</div>

<div className={step>=2?"activeFlowBox":"flowBox"}>

Intermediate

</div>

<div className="flowArrow">

→

</div>

<div className={step>=3?"activeFlowBox":"flowBox"}>

× Cᵀ

</div>

<div className="flowArrow">

→

</div>

<div className={step>=4?"activeFlowBox":"flowBox"}>

Frequency Matrix

</div>

</div>

<h4>

Transform Used :

{transform}

</h4>

{

frequencyMatrix.length>0 &&

<div className="frequencyCard">

<h3>

Frequency Coefficient Matrix (F)

</h3>

<div className="miniMatrix">

{

frequencyMatrix.map((row,rowIndex)=>

row.map((value,colIndex)=>(

<span

key={rowIndex+"-"+colIndex}

onClick={()=>setSelectedCoefficient({

u:rowIndex,

v:colIndex

})}

className={

`

${getEnergyLevel(value)}

${

selectedCoefficient.u===rowIndex &&

selectedCoefficient.v===colIndex

?

" activeCoefficient"

:

""

}

`

}

>

{Number(value).toFixed(2)}

</span>

))

)

}

</div>

</div>



}

<div className="largestCoeffCard">

<h3>

Largest Frequency Coefficient

</h3>

<h1>

{maxCoefficient.toFixed(2)}

</h1>

<p>

Usually located near the DC region and contains maximum image energy.

</p>

</div>

<div className="dcAcCard">

<h3>

DC vs AC Components

</h3>

<div className="dcAcGrid">

<div>

<h4>DC</h4>

<h2>

{

frequencyMatrix.length

?

frequencyMatrix[0][0]

:

0

}

</h2>

</div>

<div>

<h4>

AC Components

</h4>

<h2>

63

</h2>

</div>

</div>

</div>

<div className="compressionInsight">

<h3>

Compression Insight

</h3>

<ul>

<li>

Low-frequency coefficients preserve image quality.

</li>

<li>

High-frequency coefficients carry edge details.

</li>

<li>

JPEG mainly removes high-frequency coefficients.

</li>

<li>

Compression occurs after quantization.

</li>

</ul>

</div>

<div className="stepSummary">

<h3>

Step 5 Summary

</h3>

<div className="summaryFlow">

<div>

Image Block

</div>

↓

<div>

Basis Matrix

</div>

↓

<div>

Transform

</div>

↓

<div>

Frequency Matrix

</div>

↓

<div>

Ready for Frequency Visualization

</div>

</div>

</div>



<div className="energyLegend">

<div>

<span className="legend veryHigh"></span>

Very High

</div>

<div>

<span className="legend high"></span>

High

</div>

<div>

<span className="legend medium"></span>

Medium

</div>

<div>

<span className="legend low"></span>

Low

</div>

<div>

<span className="legend veryLow"></span>

Very Low

</div>

</div>
<div className="energyCard">

<h3>

Frequency Energy Distribution

</h3>

<div className="energyGrid">

{

frequencyMatrix.flat().map((value,index)=>(

<div

key={index}

className={getEnergyLevel(value)}

>

</div>

))

}

</div>

<p>

Brighter cells indicate coefficients carrying higher image energy.

</p>

</div>

<div className="energyDistribution">

<h3>

Energy Compaction

</h3>

<div className="energyBar">

<div className="dcBar">

70%

</div>

<div className="lowBar">

20%

</div>

<div className="mediumBar">

8%

</div>

<div className="highBar">

2%

</div>

</div>

<div className="energyLabels">

<span>DC</span>

<span>Low</span>

<span>Medium</span>

<span>High</span>

</div>

<p>

Most image energy remains concentrated inside the DC and Low-frequency coefficients after transform.

</p>

</div>

<div className="jpegObservation">

<h3>

JPEG Observation

</h3>

<ul>

<li>

DC coefficient contains maximum image energy.

</li>

<li>

Most image information is concentrated in low frequencies.

</li>

<li>

High-frequency coefficients are usually close to zero.

</li>

<li>

JPEG removes many high-frequency values during quantization.

</li>

</ul>

</div>

<div className="coefficientCard">

<h3>

Selected Frequency Coefficient

</h3>

<h2>

F(

{selectedCoefficient.u}

,

{selectedCoefficient.v}

)

</h2>

<h1>

{

frequencyMatrix.length>0

?

Number(

frequencyMatrix[

selectedCoefficient.u

][

selectedCoefficient.v

]

).toFixed(2)

:

0

}

</h1>

<p>

{

selectedCoefficient.u===0 &&

selectedCoefficient.v===0

?

"DC Coefficient (Average intensity of image block)"

:

"AC Coefficient"

}

</p>

</div>



<div className="calculationPanel">

<h3>

Interactive Mathematical Calculation

</h3>

<div className="formulaDisplay">

<h2>

F({u},{v})

</h2>

<div className="sigmaEquation">

<div>

F(u,v)

=

</div>

<div className="sigma">

Σ

</div>

<div className="sigma">

Σ

</div>

<div>

{

transform==="DCT"

?

"C(u,x)"

:

"S(u,x)"

}

×

A(x,y)

×

{

transform==="DCT"

?

"Cᵀ(y,v)"

:

"Sᵀ(y,v)"

}

</div>

</div>

</div>

<div className="calculationResult">

<h3>

Computed Coefficient

</h3>

<h1>

{selectedValue}

</h1>

</div>

<div className="calculationExplanation">

<p>

<b>Selected Position :</b>

({u},{v})

</p>

<p>

<b>Row Used :</b>

{

transform==="DCT"

?

`C(${u},x)`

:

`S(${u},x)`

}

</p>

<p>

<b>Column Used :</b>

{

transform==="DCT"

?

`Cᵀ(y,${v})`

:

`Sᵀ(y,${v})`

}

</p>

<p>

<b>Image Block :</b>

A(x,y)

</p>

</div>

</div>

<div className="researchNote">

<h3>

Research Interpretation

</h3>

<p>

Each frequency coefficient is calculated by multiplying

one row of the

<b>

{transform}

Basis Matrix

</b>

with the selected

<b>

8 × 8 Image Block

</b>

and one column of the

<b>

Transpose Basis Matrix

</b>

using double summation.

</p>

<p>

The selected coefficient

<b>

F({u},{v})

</b>

represents the contribution of one particular spatial frequency inside the image block.

</p>

</div>

<div className="frequencyTypeCard">

<h3>

Frequency Band

</h3>

<p>

{

selectedCoefficient.u+

selectedCoefficient.v

<=2

?

"Low Frequency"

:

selectedCoefficient.u+

selectedCoefficient.v

<=8

?

"Medium Frequency"

:

"High Frequency"

}

</p>

</div>

<div className="coefficientExplanation">

{

selectedCoefficient.u===0 &&

selectedCoefficient.v===0

?

"The DC coefficient stores the average brightness of the entire image block. It usually contains the largest amount of image energy."

:

selectedCoefficient.u+

selectedCoefficient.v

<=2

?

"Low-frequency coefficients describe smooth intensity changes. JPEG preserves these values after quantization."

:

selectedCoefficient.u+

selectedCoefficient.v

<=8

?

"Medium-frequency coefficients represent texture and moderate image details."

:

"High-frequency coefficients represent sharp edges and fine image details. These are usually compressed aggressively."

}

</div>


<div className="matrixInfoCard">

<div>

<b>Matrix Size</b>

<span>

8 × 8

</span>

</div>

<div>

<b>Transform</b>

<span>

{transform}

</span>

</div>

<div>

<b>Orthogonal</b>

<span>

YES

</span>

</div>

</div>

</div>

);

}

export default TransformComputation;