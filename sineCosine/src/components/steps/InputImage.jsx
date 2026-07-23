import { useState } from "react";
import "./InputImage.css";
import { useMatrix } from "../../context/MatrixContext";

function createMatrix(type){

const matrix=[];

for(let i=0;i<16;i++){

const row=[];

for(let j=0;j<16;j++){

let value=0;

switch(type){

case "smooth":
value=Math.min(255,40+i*8+j*4);
break;

case "edge":
value=j<8?40:220;
break;

case "gradient":
value=Math.min(255,i*16+j*8);
break;

case "texture":
value=((i+j)%2===0)?60:200;
break;

default:
value=0;

}

row.push(value);

}

matrix.push(row);

}

return matrix;

}

const predefinedMatrices = [

{
name:"Matrix A",
type:"Smooth Region",
description:"Slow intensity variation",
preview:"smooth",
data:createMatrix("smooth")
},

{
name:"Matrix B",
type:"Vertical Edge",
description:"Sharp brightness transition",
preview:"edge",
data:createMatrix("edge")
},

{
name:"Matrix C",
type:"Texture Pattern",
description:"Repeated intensity pattern",
preview:"texture",
data:createMatrix("texture")
},

{
name:"Matrix D",
type:"Gradient",
description:"Gradual brightness change",
preview:"gradient",
data:createMatrix("gradient")
}

];

function InputImage() {

  const{

selectedMatrix,

setSelectedMatrix

}=useMatrix();

if(!selectedMatrix){

setSelectedMatrix(predefinedMatrices[0]);

return null;

}

  const values = selectedMatrix.data.flat();

const minValue = Math.min(...values);

const maxValue = Math.max(...values);

const averageValue = (
values.reduce((a,b)=>a+b,0)/values.length
).toFixed(2);

const dynamicRange = maxValue-minValue;

  const generateRandomMatrix = () => {

    const randomMatrix = [];

   for (let i = 0; i < 16; i++) {

      const row = [];

     for (let j = 0; j < 16; j++) {

        row.push(Math.floor(Math.random() * 256));

      }

      randomMatrix.push(row);

    }

    setSelectedMatrix({

      name: "Random Matrix",

      type: "Generated",

      data: randomMatrix

    });
    

  };

  return (

    <div className="inputImageContainer">

      <div className="pageHeading">

<h2>Input Image Selection</h2>

<p>

Select one predefined grayscale image matrix
or generate a random image matrix for simulation.

</p>

</div>

      <div className="matrixSelection">

        {predefinedMatrices.map((matrix) => (

          <div
            key={matrix.name}
            className={
              selectedMatrix.name === matrix.name
                ? "matrixCard activeMatrix"
                : "matrixCard"
            }
            onClick={() => setSelectedMatrix(matrix)}
          >

            <h3>{matrix.name}</h3>

<div className={`miniPreview ${matrix.preview}`}></div>

<h4>{matrix.type}</h4>

<p>{matrix.description}</p>

          </div>

        ))}

        <button
          className="randomButton"
          onClick={generateRandomMatrix}
        >
          🎲 Generate Random Matrix
        </button>

      </div>

      <div className="selectedMatrixCard">

<h3>{selectedMatrix.name}</h3>

<p className="matrixType">

<b>{selectedMatrix.type}</b>

<br/>

{selectedMatrix.description}

</p>

<div className="selectedMatrixLayout">

{/* Left Side */}

<div className="matrixBox">

<h4>Pixel Matrix</h4>

<div className="valueMatrix">

{selectedMatrix.data.map((row,rowIndex)=>

row.map((value,colIndex)=>(

<span key={rowIndex+"-"+colIndex}>
{value}
</span>

))

)}

</div>

</div>

<div className="previewBox">

<h4>Image Preview</h4>

<div className="matrixPreviewGrid">

{selectedMatrix.data.map((row,rowIndex)=>

row.map((value,colIndex)=>(

<div
key={rowIndex+"-"+colIndex}
className="previewPixel"
style={{
background:`rgb(${value},${value},${value})`
}}
></div>

))

)}



</div>

</div>



</div>

</div>




<div className="matrixInfoContainer">

<div className="infoCard">

<h3>🖼 Image Information</h3>

<p><strong>Resolution :</strong> 16 × 16</p>

<p><strong>Bit Depth :</strong> 8-bit</p>

<p><strong>Total Pixels :</strong> 256</p>

<p><strong>Pixel Range :</strong> 0–255</p>

</div>

<div className="infoCard">

<h3>📊 Matrix Statistics</h3>

<p><strong>Minimum :</strong> {minValue}</p>

<p><strong>Maximum :</strong> {maxValue}</p>

<p><strong>Average :</strong> {averageValue}</p>

<p><strong>Dynamic Range :</strong> {dynamicRange}</p>

</div>

      </div>

    </div>

  );

}

export default InputImage;