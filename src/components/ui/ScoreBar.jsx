import { useState, useEffect } from "react";

const rCol = v => v>=80?"#8aaa68":v>=50?"#c9a84c":"#cc5544";

export default function ScoreBar({label,value,delay=0,accent}){
  const [w,setW]=useState(0);
  useEffect(()=>{const t=setTimeout(()=>setW(value),delay+80);return()=>clearTimeout(t);},[value,delay]);
  return(
    <div style={{marginBottom:"8px"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
        <span style={{fontSize:"13px",color:"#cbb888",letterSpacing:"1px"}}>{label.toUpperCase()}</span>
        <span style={{fontSize:"14px",fontWeight:"bold",color:rCol(value),fontFamily:"monospace"}}>{value}</span>
      </div>
      <div style={{height:"2px",background:"rgba(255,255,255,0.05)",borderRadius:"2px",overflow:"hidden"}}>
        <div style={{height:"100%",width:`${w}%`,background:accent||rCol(value),
          transition:`width 0.8s cubic-bezier(.4,0,.2,1) ${delay}ms`,
          boxShadow:`0 0 6px ${(accent||rCol(value))}55`}}/>
      </div>
    </div>
  );
}
