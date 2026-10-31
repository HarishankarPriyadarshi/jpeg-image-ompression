import "./ImageBlocking.css";
import { useMatrix } from "../../context/MatrixContext";
import { useState, useEffect } from "react";

function ImageBlocking() {

const { selectedMatrix, selectedBlock, setSelectedBlock, blockCreated, setBlockCreated, setPopupMessage } = useMatrix();

const [filledCells, setFilledCells] = useState(blockCreated ? 64 : 0);

const [status, setStatus] = useState(blockCreated ? "Ready ✓" : "Waiting");

const [scanRow,setScanRow]=useState(-1);

// Entry animation: 0 = whole image, 1 = cut lines drawn, 2 = four parts
// slide apart (B1-B4 appear), 3 = settled back, ready for interaction.
// Skipped when the block was already created (e.g. coming back from a later step).
const [phase,setPhase]=useState(blockCreated?3:0);

useEffect(()=>{
if(phase===3) return;
const timers=[
setTimeout(()=>setPhase(1),400),
setTimeout(()=>setPhase(2),1750),
setTimeout(()=>setPhase(3),3950)
];
return ()=>timers.forEach(clearTimeout);
// eslint-disable-next-line react-hooks/exhaustive-deps
},[]);

const phaseHeadings=[
"Input Image Matrix (16 × 16)",
"Dividing the image into 4 parts…",
"Four 8 × 8 blocks: B1, B2, B3, B4",
"Input Image Matrix"
];



const totalPixels = 64;

const progress = Math.round((filledCells / totalPixels) * 100);

const createBlock = () => {

    if (!selectedBlock) {
      setPopupMessage("Please select a block (B1, B2, B3, or B4) first.");
      return;
    }

    setScanRow(-1);


setBlockCreated(false);

setFilledCells(0);

setStatus("Scanning Image...");

let count = 0;

const interval = setInterval(() => {

count++;

if(count===32){

setStatus("Creating Processing Block...");

}

setFilledCells(count);

setFilledCells(count);

if(count === totalPixels){

clearInterval(interval);

setBlockCreated(true);

setStatus("Ready ✓");

}

},120);

};


if(!selectedMatrix) return null;

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

const rowEnd = rowStart + 8;
const colEnd = colStart + 8;

const processingBlock =
selectedMatrix.data
.slice(rowStart,rowStart+8)
.map(row=>row.slice(colStart,colStart+8));

return(

<div className="blockingContainer">

<div className="blockingHeading">

<h2>Image Blocking</h2>

<p>

The selected image is organized into a processing
block before applying the transform.

</p>

</div>

<div className="blockingContent">

<div className="inputBlock">

<h3 className="phaseHeading" key={phase}>{phaseHeadings[phase]}</h3>
<div className={`imageWrapper split${phase}${selectedBlock?" hasSel":""}`} onClick={()=>{ if(phase<3) setPhase(3); }} title={phase<3?"Click to skip animation":undefined}>

<div className="cutLine cutV"></div>
<div className="cutLine cutH"></div>
<div className="cutDot"></div>

<div className="matrixPreviewGrid">

{[0,1,2,3].map(b=>{
const br=Math.floor(b/2);
const bc=b%2;
return(
<div
key={b}
className={`quad quad${b+1}${selectedBlock && selectedBlock!==b+1 ? " dim" : ""}`}
>
{Array.from({length:64}).map((_,idx)=>{
const r=Math.floor(idx/8);
const c=idx%8;
const rowIndex=br*8+r;
const colIndex=bc*8+c;
const value=selectedMatrix.data[rowIndex][colIndex];
return(
<div
key={idx}
className={rowIndex===scanRow?"previewPixel scanningRow":"previewPixel"}
style={{background:`rgb(${value},${value},${value})`}}
></div>
);
})}
</div>
);
})}

</div>

<div className="blockOverlay">

{[1,2,3,4].map(id=>(
<div
key={id}
className={`overlayBlock ob${id}${selectedBlock===id?" activeOverlay":""}`}
onClick={()=>!blockCreated && setSelectedBlock(id)}
>
<span className="blockLabel">B{id}</span>
</div>
))}

</div>

</div>

</div>

<div className="blockingArrow">

→

</div>

<div className={blockCreated?"processingBlock activeBlock":"processingBlock"}>

<h3>Processing Block</h3>

<div className="processingMatrixGrid">

{processingBlock.flat().map((value,index)=>(

<span

key={index}

className={

index < filledCells

?

"filledCell"

:

"emptyCell"

}

>

{index < filledCells ? value : ""}

</span>

))}

</div>

</div>

</div>

<button
className="blockButton"
onClick={createBlock}
disabled={status !== "Waiting"}
>

 

Create Processing Block

</button>

<div className="blockInfo">

<div>

<b>Block ID</b>

<span>{selectedBlock ? `B${selectedBlock}` : "Not selected"}</span>

</div>

<div>

<b>Dimensions</b>

<span>8 × 8</span>

</div>

<div>

<b>Total Pixels</b>

<span>64</span>

</div>

</div>

</div>

);

}

export default ImageBlocking;