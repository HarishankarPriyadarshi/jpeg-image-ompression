import "./BasisMatrix.css";
import React,{useState} from "react";
import { useMatrix } from "../../context/MatrixContext";

// Small inline "numerator over denominator" display, used inside the
// calculation timeline so any division always renders as a proper stacked
// fraction instead of a plain "a / b" string.
function Frac({num,den}){
return (
<span className="inlineFrac">
<span className="inlineFracNum">{num}</span>
<span className="inlineFracLine"></span>
<span className="inlineFracDen">{den}</span>
</span>
);
}

function BasisMatrix(){

const { selectedMatrix, selectedBlock, transform, setTransform, basisMatrix, setBasisMatrix, basisGenerated, setBasisGenerated } = useMatrix();

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

const [selectedCell,setSelectedCell]=useState(null);

const [calcStep,setCalcStep]=useState(0);

const computeValue=(u,x)=>{
const N=8;
if(transform==="DCT"){
const alpha=u===0?Math.sqrt(1/N):Math.sqrt(2/N);
return alpha*Math.cos(((2*x+1)*u*Math.PI)/(2*N));
}
return Math.sqrt(2/(N+1))*Math.sin(((u+1)*(x+1)*Math.PI)/(N+1));
};

const generateBasisMatrix=()=>{
if(!transform || basisGenerated) return;
const N=8;
const matrix=Array.from({length:N},()=>Array(N).fill(null));
setBasisMatrix(matrix.map(r=>[...r]));
let u=0,x=0;
const interval=setInterval(()=>{
matrix[u][x]=computeValue(u,x).toFixed(4);
setBasisMatrix(matrix.map(r=>[...r]));
setSelectedCell({row:u,col:x});
setCalcStep(cellSteps(u,x).length);
x++;
if(x>=N){x=0;u++;}
if(u>=N){
clearInterval(interval);
setBasisGenerated(true);
}
},60);
};

const cellSteps=(u,x)=>{
if(transform==="DCT"){
const num=(2*x+1)*u;
const angle=(num*Math.PI)/16;
const cosVal=Math.cos(angle);
const alpha=u===0?Math.sqrt(1/8):Math.sqrt(2/8);
return [
{
label:"Formula",
node:<>C(u,x) = α(u) · cos<Frac num="(2x+1)uπ" den="2N" /></>
},
{
label:"Substitute u & x",
node:<>u = <b>{u}</b>, x = <b>{x}</b> &nbsp;→&nbsp; (2×{x}+1)×{u} = <b>{num}</b></>
},
{
label:"Compute the angle",
node:<>angle = <Frac num={`${num}π`} den="16" /> = <b>{angle.toFixed(4)}</b> rad</>
},
{
label:"Apply cosine",
node:<>cos({angle.toFixed(4)}) = <b>{cosVal.toFixed(4)}</b></>
},
{
label:"Normalize with α(u)",
node:<>α = {u===0?"√(1/8)":"√(2/8)"} = <b>{alpha.toFixed(4)}</b></>
},
{
label:"Final value",
node:<>{alpha.toFixed(4)} × {cosVal.toFixed(4)} = <b>{(alpha*cosVal).toFixed(4)}</b></>,
isResult:true
}
];
}
const angle=((u+1)*(x+1)*Math.PI)/9;
const sinVal=Math.sin(angle);
const coeff=Math.sqrt(2/9);
return [
{
label:"Formula",
node:<>S(u,x) = <Frac num="2" den="N+1" /><sup>½</sup> · sin<Frac num="(u+1)(x+1)π" den="N+1" /></>
},
{
label:"Substitute u & x",
node:<>u = <b>{u}</b>, x = <b>{x}</b> &nbsp;→&nbsp; ({u}+1)×({x}+1) = <b>{(u+1)*(x+1)}</b></>
},
{
label:"Compute the angle",
node:<>angle = <Frac num={`${(u+1)*(x+1)}π`} den="9" /> = <b>{angle.toFixed(4)}</b> rad</>
},
{
label:"Apply sine",
node:<>sin({angle.toFixed(4)}) = <b>{sinVal.toFixed(4)}</b></>
},
{
label:"Coefficient",
node:<>√<Frac num="2" den="9" /> = <b>{coeff.toFixed(4)}</b></>
},
{
label:"Final value",
node:<>{coeff.toFixed(4)} × {sinVal.toFixed(4)} = <b>{(coeff*sinVal).toFixed(4)}</b></>,
isResult:true
}
];
};

const playCalc=()=>{
if(!selectedCell) return;
setCalcStep(0);
let step=0;
const total=cellSteps((selectedCell?.row??0),selectedCell.col).length;
const interval=setInterval(()=>{
step++;
setCalcStep(step);
if(step>=total){clearInterval(interval);}
},700);
};

const fastForwardCalc=()=>{
if(!selectedCell) return;
setCalcStep(cellSteps((selectedCell?.row??0),selectedCell.col).length);
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

disabled={basisGenerated}

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

disabled={basisGenerated}

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

<div className="miniFormulaText">
{!transform ? "Select DCT or DST above" : (
<div className="equation">
<div className="leftPart">
{transform==="DCT" ? "C(u,x) = α(u)·cos" : "S(u,x) = √(2/(N+1))·sin"}
</div>
<div className="fraction">
<div className="numerator">{transform==="DCT" ? "(2x+1)uπ" : "(u+1)(x+1)π"}</div>
<div className="line"></div>
<div className="denominator">{transform==="DCT" ? "2N" : "N+1"}</div>
</div>
</div>
)}
</div>

</div>

</div>


<div className="basisLayout">

<div className="basisCard blockCard">

<h3>Selected Processing Block ({selectedBlock ? `B${selectedBlock}` : "—"})</h3>

<div className="basisBlockPreview">

{processingBlock.map((row,rowIndex)=>

row.map((value,colIndex)=>(

<div
key={rowIndex+"-"+colIndex}
className="basisBlockPixel"
style={{background:`rgb(${value},${value},${value})`}}
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

    <div className="matrixCorner"></div>

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

Array.from({length:8}).map((_,rowIndex)=>(
<React.Fragment key={"ph"+rowIndex}>

<div className="matrixHeader">u={rowIndex}</div>

{Array.from({length:8}).map((_,colIndex)=>(
<span key={"ph"+rowIndex+"-"+colIndex} className="emptyBasisCell"></span>
))}

</React.Fragment>
))

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
value===null
?
"emptyBasisCell"
:
selectedCell && (selectedCell?.row??0)===rowIndex && selectedCell.col===colIndex
?
"activeVector"
:
""
}

onClick={()=>{if(value!==null){setSelectedCell({row:rowIndex,col:colIndex});setCalcStep(0);}}}

>

{value===null?"":value}

</span>

))

}

</React.Fragment>

))



}

</div>

</div>

</div>

<button

className="generateButton"

disabled={!transform || basisGenerated}

onClick={generateBasisMatrix}

>

Generate Basis Matrix

</button>


<div className="currentCalculation">

<div className="calcHeaderRow">

<h3>Current Basis Calculation</h3>

{selectedCell && (
<span className="calcCellBadge">u = {(selectedCell?.row??0)}, x = {selectedCell.col}</span>
)}

</div>

{!selectedCell ? (

<p className="calcHint">Click any cell in the matrix above to see its calculation, step by step.</p>

) : (

<>

<div className="playControls">

<button className="calcPlayBtn" onClick={playCalc}>▶ Play</button>

<button className="calcPlayBtn calcFastForward" onClick={fastForwardCalc}>⏩ Show All</button>

</div>

<div className="calcTimeline">

{cellSteps((selectedCell?.row??0),selectedCell.col).slice(0,calcStep).map((step,i)=>(

<div key={i} className={step.isResult ? "calcTimelineItem calcResultItem" : "calcTimelineItem"}>

<div className="calcStepBadge">{step.isResult ? "✓" : i+1}</div>

<div className="calcStepBody">

<div className="calcStepLabel">{step.label}</div>

<div className="calcStepExpr">{step.node}</div>

</div>

</div>

))}

</div>

</>

)}

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

(selectedCell?.row??0)===0

?

Math.sqrt(1/8)

:

Math.sqrt(2/8);

value=

alpha*

Math.cos(

((2*x+1)*(selectedCell?.row??0)*Math.PI)/16

);

}

else{

value=

Math.sqrt(2/9)

*

Math.sin(

(((selectedCell?.row??0)+1)*(x+1)*Math.PI)/9

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

(selectedCell?.row??0)===0

?

Math.sqrt(1/8)

:

Math.sqrt(2/8);

value=

alpha*

Math.cos(

((2*x+1)*(selectedCell?.row??0)*Math.PI)/16

);

}

else{

value=

Math.sqrt(2/9)

*

Math.sin(

(((selectedCell?.row??0)+1)*(x+1)*Math.PI)/9

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

u = {(selectedCell?.row??0)}

</div>

</div>

</div>

<div className="waveDescription">

{

(selectedCell?.row??0)===0

?

"Flat basis vector. Represents the DC component (average intensity)."

:

(selectedCell?.row??0)<=2

?

"Low-frequency basis vector. Captures smooth brightness changes."

:

(selectedCell?.row??0)<=5

?

"Medium-frequency basis vector. Represents image texture."

:

"High-frequency basis vector. Represents edges and fine details."

}

</div>




</div>



);

}

export default BasisMatrix;