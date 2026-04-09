export default function RadarChart({castle,compare}){
  const cats=[
    {k:"walls",l:"Mauern",i:"🧱"},
    {k:"position",l:"Position",i:"⛰️"},
    {k:"morale",l:"Moral",i:"🔥"},
    {k:"garrison",l:"Garnison",i:"⚔️"},
    {k:"supply",l:"Versorgung",i:"🍖"},
  ];
  const N=cats.length,cx=55,cy=56,R=36;
  const pt=(val,i)=>{const a=(i/N)*2*Math.PI-Math.PI/2,r=(val/100)*R;return{x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)};};
  const axPt=(i,s=1)=>{const a=(i/N)*2*Math.PI-Math.PI/2;return{x:cx+R*s*Math.cos(a),y:cy+R*s*Math.sin(a)};};
  const poly=(r)=>cats.map((c,i)=>pt(r[c.k],i)).map(p=>`${p.x},${p.y}`).join(" ");
  const ac=castle.theme.accent;
  const ac2=compare?.theme.accent||"#6aaa52";
  return(
    <svg viewBox="0 0 110 110" style={{width:"100%",maxWidth:"220px",display:"block",margin:"0 auto"}}>
      {[0.25,0.5,0.75,1].map((s,i)=>(
        <polygon key={i} points={cats.map((_,j)=>axPt(j,s)).map(p=>`${p.x},${p.y}`).join(" ")}
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.4"/>
      ))}
      {cats.map((_,i)=>{const p=axPt(i);return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" strokeWidth="0.3"/>;}) }
      {[25,50,75,100].map(v=>(
        <text key={v} x={cx+2} y={cy-(v/100)*R+1} fill="rgba(255,255,255,0.12)" fontSize="3.5" fontFamily="monospace">{v}</text>
      ))}
      {compare&&<polygon points={poly(compare.ratings)} fill={`${ac2}12`} stroke={ac2} strokeWidth="0.8" strokeDasharray="2,1.5" opacity="0.85"/>}
      <polygon points={poly(castle.ratings)} fill={`${ac}1a`} stroke={ac} strokeWidth="1"/>
      {cats.map((c,i)=>{
        const p=pt(castle.ratings[c.k],i);
        return <circle key={i} cx={p.x} cy={p.y} r="1.5" fill={ac} opacity="0.9"/>;
      })}
      {compare&&cats.map((c,i)=>{
        const p=pt(compare.ratings[c.k],i);
        return <circle key={i} cx={p.x} cy={p.y} r="1.2" fill={ac2} opacity="0.7"/>;
      })}
      {cats.map((c,i)=>{
        const p=axPt(i,1.3);
        const v=castle.ratings[c.k];
        const v2=compare?.ratings[c.k];
        return(
          <g key={i}>
            <text x={p.x} y={p.y-1.5} textAnchor="middle" dominantBaseline="middle"
              fill={`${ac}88`} fontSize="6.5" fontFamily="serif">{c.l}</text>
            <text x={p.x} y={p.y+5} textAnchor="middle" dominantBaseline="middle"
              fill={ac} fontSize="5.5" fontFamily="monospace" fontWeight="bold">{v}</text>
            {compare&&<text x={p.x} y={p.y+9.5} textAnchor="middle" dominantBaseline="middle"
              fill={ac2} fontSize="5" fontFamily="monospace">{v2}</text>}
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r="1" fill={ac} opacity="0.4"/>
    </svg>
  );
}
