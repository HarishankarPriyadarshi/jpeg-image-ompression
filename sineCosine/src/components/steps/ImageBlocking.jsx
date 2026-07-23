import "./ImageBlocking.css";
import { useMatrix } from "../../context/MatrixContext";
import { useState } from "react";

function ImageBlocking() {

const { selectedMatrix } = useMatrix();

const [blocked, setBlocked] = useState(false);

const [filledCells, setFilledCells] = useState(0);

const [status, setStatus] = useState("Waiting");

const [selectedBlock, setSelectedBlock] = useState(1);

const [scanRow,setScanRow]=useState(-1);



const totalPixels = 64;

const progress = Math.round((filledCells / totalPixels) * 100);

const createBlock = () => {

    setScanRow(-1);


setBlocked(false);

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

setBlocked(true);

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

<h3>Input Image Matrix</h3>
<div className="imageWrapper">

<div className="matrixPreviewGrid">

    
{selectedMatrix.data.map((row,rowIndex)=>

row.map((value,colIndex)=>(

<div
key={rowIndex+"-"+colIndex}
className={`previewPixel
${
rowIndex >= rowStart &&
rowIndex < rowEnd &&
colIndex >= colStart &&
colIndex < colEnd
?
"selectedPreview"
:
""
}
${
rowIndex===scanRow
?
" scanningRow"
:
""
}`}
style={{
background:`rgb(${value},${value},${value})`
}}
></div>

))

)}

</div>

<div className="blockOverlay">

<div
className={selectedBlock===1?"overlayBlock activeOverlay":"overlayBlock"}
onClick={()=>setSelectedBlock(1)}
>
B1
</div>

<div
className={selectedBlock===2?"overlayBlock activeOverlay":"overlayBlock"}
onClick={()=>setSelectedBlock(2)}
>
B2
</div>

<div
className={selectedBlock===3?"overlayBlock activeOverlay":"overlayBlock"}
onClick={()=>setSelectedBlock(3)}
>
B3
</div>

<div
className={selectedBlock===4?"overlayBlock activeOverlay":"overlayBlock"}
onClick={()=>setSelectedBlock(4)}
>
B4
</div>

</div>

 </div>   


</div>

<div className="blockingArrow">

↓

</div>

<div className={blocked?"processingBlock activeBlock":"processingBlock"}>

<h3>Processing Block</h3>

<div className="progressContainer">

<div className="progressTrack">

<div
className="progressFill"
style={{ width: `${progress}%` }}
></div>

</div>

<div className="progressText">

{progress}%

</div>

</div>

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

<div className="processingFlow">

<div className={filledCells >= 1 ? "flowStep activeFlow" : "flowStep"}>
📥 Input Matrix
</div>

<div className="flowArrow">↓</div>

<div className={filledCells >= 5 ? "flowStep activeFlow" : "flowStep"}>
🔍 Scanning Pixels
</div>

<div className="flowArrow">↓</div>

<div className={filledCells >= 10 ? "flowStep activeFlow" : "flowStep"}>
🧩 Creating Block
</div>

<div className="flowArrow">↓</div>

<div className={blocked ? "flowStep activeFlow" : "flowStep"}>
✅ Ready For Basis Matrix
</div>

</div>

<p className="progressStatus">

{status}

</p>

<div className="blockInfo">

<div>

<b>Block ID</b>

<span>B{selectedBlock}</span>

</div>

<div>

<b>Dimensions</b>

<span>8 × 8</span>

</div>

<div>

<b>Total Pixels</b>

<span>64</span>

</div>

<div>

<b>Status</b>

<span>

{status}

</span>

</div>

</div>

</div>

);

}

export default ImageBlocking;