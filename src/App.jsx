import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ROLEPLAY_RESPONSES, PERSONALITY_RESPONSES, SIMULATOR_FALLBACKS, WHATIF_FALLBACKS, getWhatIfFallback, LEXIKON_OFFLINE, getLexikonFacts, getAdvisorFallback } from "./data/fallbacks.js";
import { TOTAL_RES, BUILDER_BUDGET, SYNERGIES, getActiveSynergies, getSynergyBonuses, SEASONS, DEFENDER_TYPES, CASTLE_PERSONALITIES, getDefenderType, GENERALS, SIEGE_EVENTS, BUILDER, RES, WEATHER_TYPES } from "./data/gameData.js";
import { COORDS, CASTLES } from "./data/castles.js";
import ScoreBar from "./components/ui/ScoreBar.jsx";
import RadarChart from "./components/ui/RadarChart.jsx";

// ══════════════════════════════════════════════════════════════════════════
//  ██████╗ █████╗ ███████╗████████╗██╗     ███████╗
// ██╔════╝██╔══██╗██╔════╝╚══██╔══╝██║     ██╔════╝
// ██║     ███████║███████╗   ██║   ██║     █████╗
// ██║     ██╔══██║╚════██║   ██║   ██║     ██╔══╝
// ╚██████╗██║  ██║███████║   ██║   ███████╗███████╗
//  ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚══════╝╚══════╝
//  SIEGE ULTIMATE v8  —  35 Burgen · Kampagne · Generäle · Jahreszeiten
// ══════════════════════════════════════════════════════════════════════════
// Smart fallback API call — uses real API if available, fallback otherwise
async function callClaude(body) {
  try {
    const res = await fetch("/api/claude", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch(e) {
    // Return null to signal fallback should be used
    console.log("API unavailable, using fallback:", e.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════
const avg = c => Math.round(Object.values(c.ratings).reduce((a,b)=>a+b,0)/5);
const rCol = v => v>=80?"#8aaa68":v>=50?"#c9a84c":"#cc5544";
const epochs = [...new Set(CASTLES.map(c=>c.epoch))];
const regions = [...new Set(CASTLES.map(c=>c.region))];

// ═══════════════════════════════════════════════════════════════════════════
//  COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════
// CASTLE FLOOR PLAN MAPS — unique top-down SVG per castle
// ══════════════════════════════════════════════════════════════════════════

// Arrow marker helper (defined once in the SVG defs)
const ARROW_DEFS = `<defs><marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 Z" fill="rgba(204,68,68,0.6)"/></marker></defs>`;

// Each plan receives: ac (accent color), sel (selected zone id), onZone (click handler)
const CASTLE_PLANS = {

  krak: ({ac,sel,onZone}) => (
    <g>
      {/* Hill terrain */}
      <ellipse cx="110" cy="110" rx="100" ry="92" fill="rgba(100,78,28,0.18)" stroke="rgba(130,100,35,0.2)" strokeWidth="0.6"/>
      <ellipse cx="110" cy="108" rx="84" ry="76" fill="rgba(85,65,22,0.12)" stroke="rgba(110,85,30,0.15)" strokeWidth="0.4"/>
      {/* Outer wall ring */}
      {sel==="ou"&&<ellipse cx="110" cy="110" rx="78" ry="72" fill={ac} opacity="0.07" filter="url(#glowFilter)"/>}
      <ellipse cx="110" cy="110" rx="70" ry="64" fill={sel==="ou"?"rgba(139,105,20,0.22)":"rgba(139,105,20,0.07)"} stroke={sel==="ou"?`${ac}cc`:`${ac}66`} strokeWidth="5.5" style={{cursor:"pointer"}} onClick={()=>onZone("ou")}/>
      {Array.from({length:9},(_,i)=>{const a=i/9*Math.PI*2;return <rect key={i} x={110+70*Math.cos(a)-5} y={110+64*Math.sin(a)-5} width="10" height="10" rx="1" fill={sel==="ou"?`${ac}66`:`${ac}44`} stroke={`${ac}88`} strokeWidth="0.8" style={{cursor:"pointer"}} onClick={()=>onZone("ou")}/>;}) }
      {/* Killing ground label */}
      <text x="152" y="75" fill={`${ac}44`} fontSize="8" fontFamily="serif">Zwinger</text>
      {/* Inner wall ring */}
      {sel==="in"&&<ellipse cx="110" cy="108" rx="56" ry="51" fill={ac} opacity="0.08" filter="url(#glowFilter)"/>}
      <ellipse cx="110" cy="108" rx="48" ry="43" fill={sel==="in"?"rgba(201,168,76,0.22)":"rgba(201,168,76,0.08)"} stroke={sel==="in"?`${ac}ff`:`${ac}cc`} strokeWidth="6" style={{cursor:"pointer"}} onClick={()=>onZone("in")}/>
      {Array.from({length:6},(_,i)=>{const a=i/6*Math.PI*2;return <circle key={i} cx={110+48*Math.cos(a)} cy={108+43*Math.sin(a)} r="7.5" fill={sel==="in"?`${ac}66`:`${ac}44`} stroke={`${ac}99`} strokeWidth="1" style={{cursor:"pointer"}} onClick={()=>onZone("in")}/>;}) }
      <text x="110" y="84" textAnchor="middle" fill={`${ac}77`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("in")}>INNERER RING</text>
      {/* Donjon */}
      <rect x="94" y="93" width="32" height="30" rx="2" fill={sel==="kp"?"rgba(232,200,96,0.42)":"rgba(232,200,96,0.14)"} stroke="#e8c860" strokeWidth="2" style={{cursor:"pointer"}} onClick={()=>onZone("kp")}/>
      {[[94,93],[126,93],[94,123],[126,123]].map(([x,y],i)=><rect key={i} x={x-4} y={y-4} width="8" height="8" rx="1" fill="#e8c860" opacity="0.75"/>)}
      <text x="110" y="112" textAnchor="middle" fill="#e8c860" fontSize="10" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("kp")}>DONJON</text>
      {/* Cisterns */}
      <circle cx="148" cy="133" r="12" fill={sel==="ci"?"rgba(68,136,204,0.5)":"rgba(68,136,204,0.2)"} stroke="#4488cc" strokeWidth="1.8" style={{cursor:"pointer"}} onClick={()=>onZone("ci")}/>
      <text x="148" y="137" textAnchor="middle" fill="#4488cc" fontSize="9" style={{cursor:"pointer"}} onClick={()=>onZone("ci")}>Zistern</text>
      {/* North weakness */}
      <path d="M 98 42 L 110 32 L 122 42" fill={sel==="nw"?"rgba(204,68,68,0.55)":"rgba(204,68,68,0.22)"} stroke="#cc4444" strokeWidth="2" style={{cursor:"pointer"}} onClick={()=>onZone("nw")}/>
      <text x="110" y="30" textAnchor="middle" fill="#cc4444" fontSize="10" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("nw")}>⚠ NORD-FLANKE</text>
      {/* Gates */}
      <rect x="134" y="141" width="10" height="7" rx="1" fill="#c9a84c" opacity="0.8"/>
      <text x="146" y="158" fill={`${ac}66`} fontSize="8" fontFamily="serif">Haupttor</text>
      {/* Compass */}
      <text x="188" y="28" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="188" y1="30" x2="188" y2="46" stroke={`${ac}44`} strokeWidth="1"/>
      <polygon points="188,30 186,38 190,38" fill={`${ac}44`}/>
      {/* Title */}
      <text x="110" y="190" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">KRAK DES CHEVALIERS</text>
    </g>
  ),

  masada: ({ac,sel,onZone}) => (
    <g>
      {/* Desert terrain surrounding plateau */}
      <rect x="0" y="0" width="220" height="200" fill="rgba(100,80,40,0.15)"/>
      {/* Cliff faces — shading */}
      <path d="M 30 30 L 50 10 L 170 8 L 190 28 L 195 125 L 185 155 L 32 158 L 18 130 Z" fill="rgba(120,95,55,0.3)" stroke="rgba(140,110,60,0.35)" strokeWidth="1.5"/>
      {/* Cliff texture */}
      {[0,1,2,3,4].map(i=><path key={i} d={`M ${35+i*3} ${32-i*2} L ${50+i*2} ${12-i*2} L ${168-i*2} ${10-i*2} L ${188-i*3} ${28-i*2}`} fill="none" stroke="rgba(100,80,40,0.18)" strokeWidth="0.7"/>)}
      {/* Plateau top */}
      <path d="M 48 38 L 60 16 L 162 14 L 184 34 L 188 130 L 176 152 L 40 155 L 26 132 Z" fill={sel==="cl"?"rgba(139,115,85,0.28)":"rgba(139,115,85,0.14)"} stroke={`${ac}55`} strokeWidth="3" style={{cursor:"pointer"}} onClick={()=>onZone("cl")}/>
      <text x="118" y="50" textAnchor="middle" fill={`${ac}44`} fontSize="10" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("cl")}>STEILKLIPPEN (400m)</text>
      {/* Casemate wall */}
      <path d="M 58 42 L 68 20 L 154 18 L 178 38 L 180 128 L 168 148 L 50 150 L 36 130 Z" fill="none" stroke={`${ac}99`} strokeWidth="5" style={{cursor:"pointer"}} onClick={()=>onZone("wl")}/>
      <path d="M 58 42 L 68 20 L 154 18 L 178 38 L 180 128 L 168 148 L 50 150 L 36 130 Z" fill={sel==="wl"?"rgba(201,168,76,0.18)":"transparent"} stroke="none" style={{cursor:"pointer"}} onClick={()=>onZone("wl")}/>
      {/* Wall towers */}
      {[[68,20],[114,16],[154,18],[178,38],[180,85],[178,128],[168,148],[114,150],[50,150],[36,130],[36,85],[48,42]].map(([x,y],i)=>(
        <rect key={i} x={x-5} y={y-5} width="10" height="10" rx="1" fill={`${ac}44`} stroke={`${ac}88`} strokeWidth="0.8"/>
      ))}
      {/* Northern palace */}
      <rect x="75" y="25" width="62" height="32" rx="2" fill="rgba(201,168,76,0.12)" stroke={`${ac}66`} strokeWidth="1.2"/>
      <text x="106" y="45" textAnchor="middle" fill={`${ac}88`} fontSize="9" fontFamily="serif">Nordpalast</text>
      {/* Southern Palace */}
      <rect x="78" y="108" width="55" height="30" rx="2" fill="rgba(201,168,76,0.09)" stroke={`${ac}44`} strokeWidth="0.8"/>
      <text x="105" y="126" textAnchor="middle" fill={`${ac}66`} fontSize="9" fontFamily="serif">Südpalast</text>
      {/* Cisterns */}
      <circle cx="158" cy="85" r="11" fill={sel==="cs"?"rgba(68,136,204,0.5)":"rgba(68,136,204,0.2)"} stroke="#4488cc" strokeWidth="1.8" style={{cursor:"pointer"}} onClick={()=>onZone("cs")}/>
      <text x="158" y="89" textAnchor="middle" fill="#4488cc" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("cs")}>Zistern</text>
      {/* Western ramp / weakness */}
      <path d="M 0 75 L 38 75 L 38 100 L 0 100 Z" fill={sel==="ws"?"rgba(204,68,68,0.6)":"rgba(204,68,68,0.3)"} stroke="#cc4444" strokeWidth="2.5" style={{cursor:"pointer"}} onClick={()=>onZone("ws")}/>
      <text x="19" y="90" textAnchor="middle" fill="#cc4444" fontSize="8" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("ws")}>⚠ WEST-</text>
      <text x="19" y="97" textAnchor="middle" fill="#cc4444" fontSize="8" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("ws")}>SPORN</text>
      {/* Roman ramp arrow */}
      <path d="M 5 87 L 26 87" stroke="#cc4444" strokeWidth="2" strokeDasharray="3,2" opacity="0.7"/>
      <polygon points="26,84 26,90 32,87" fill="#cc4444" opacity="0.6"/>
      <text x="15" y="112" textAnchor="middle" fill="rgba(204,68,68,0.5)" fontSize="8">RAMPE</text>
      {/* Roman circumvallation hint */}
      <path d="M 8 170 Q 110 185 212 170" fill="none" stroke="rgba(180,50,20,0.25)" strokeWidth="1" strokeDasharray="4,3"/>
      <text x="110" y="182" textAnchor="middle" fill="rgba(180,50,20,0.35)" fontSize="8">Römische Circumvallation</text>
      {/* Compass + title */}
      <text x="196" y="22" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="196" y1="25" x2="196" y2="40" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="110" y="196" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">MASADA — TAFELBERG 73 n.Chr.</text>
    </g>
  ),

  carcassonne: ({ac,sel,onZone}) => (
    <g>
      {/* Hillside terrain */}
      <ellipse cx="110" cy="105" rx="105" ry="94" fill="rgba(80,65,28,0.14)" stroke="rgba(100,80,32,0.15)" strokeWidth="0.6"/>
      {/* Outer wall (52 towers) */}
      {sel==="om"&&<ellipse cx="110" cy="105" rx="94" ry="84" fill={ac} opacity="0.07" filter="url(#glowFilter)"/>}
      <ellipse cx="110" cy="105" rx="86" ry="76" fill={sel==="om"?"rgba(122,90,32,0.22)":"rgba(122,90,32,0.07)"} stroke={sel==="om"?`${ac}bb`:`${ac}55`} strokeWidth="5.5" style={{cursor:"pointer"}} onClick={()=>onZone("om")}/>
      {/* 16 towers around outer wall */}
      {Array.from({length:16},(_,i)=>{const a=i/16*Math.PI*2;return <rect key={i} x={110+86*Math.cos(a)-4.5} y={105+76*Math.sin(a)-4.5} width="9" height="9" rx="1" fill={sel==="om"?`${ac}66`:`${ac}33`} stroke={`${ac}66`} strokeWidth="0.7" style={{cursor:"pointer"}} onClick={()=>onZone("om")}/>;}) }
      <text x="170" y="58" fill={`${ac}44`} fontSize="8" fontFamily="serif">Äußere</text>
      <text x="170" y="65" fill={`${ac}44`} fontSize="8" fontFamily="serif">Vormauer</text>
      {/* Zwinger space */}
      <ellipse cx="110" cy="105" rx="68" ry="60" fill="rgba(45,36,14,0.12)" stroke="rgba(90,70,25,0.12)" strokeWidth="0.5"/>
      <text x="155" y="100" fill="rgba(100,80,30,0.4)" fontSize="8" fontFamily="serif">Zwinger</text>
      {/* Inner main wall */}
      <ellipse cx="110" cy="103" rx="52" ry="46" fill={sel==="im"?"rgba(201,168,76,0.22)":"rgba(201,168,76,0.07)"} stroke={`${ac}cc`} strokeWidth="6" style={{cursor:"pointer"}} onClick={()=>onZone("im")}/>
      {Array.from({length:12},(_,i)=>{const a=i/12*Math.PI*2;return <circle key={i} cx={110+52*Math.cos(a)} cy={103+46*Math.sin(a)} r="6.5" fill={`${ac}44`} stroke={`${ac}88`} strokeWidth="0.9" style={{cursor:"pointer"}} onClick={()=>onZone("im")}/>;}) }
      {/* City streets */}
      {[70,90,110,130].map(y=><line key={y} x1="64" y1={y} x2="158" y2={y} stroke="rgba(201,168,76,0.07)" strokeWidth="0.5"/>)}
      {[80,110,140].map(x=><line key={x} x1={x} y1="63" x2={x} y2="148" stroke="rgba(201,168,76,0.07)" strokeWidth="0.5"/>)}
      {/* Comtal castle */}
      <rect x="80" y="78" width="38" height="30" rx="2" fill={sel==="ch"?"rgba(232,200,96,0.42)":"rgba(232,200,96,0.14)"} stroke="#e8c860" strokeWidth="2" style={{cursor:"pointer"}} onClick={()=>onZone("ch")}/>
      {[[80,78],[118,78],[80,108],[118,108]].map(([x,y],i)=><rect key={i} x={x-3.5} y={y-3.5} width="7" height="7" fill="#e8c860" opacity="0.8"/>)}
      <text x="99" y="97" textAnchor="middle" fill="#e8c860" fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ch")}>Comtal</text>
      {/* Water vulnerability */}
      <circle cx="162" cy="138" r="11" fill={sel==="wt"?"rgba(204,68,68,0.55)":"rgba(204,68,68,0.22)"} stroke="#cc4444" strokeWidth="1.8" style={{cursor:"pointer"}} onClick={()=>onZone("wt")}/>
      <text x="162" y="143" textAnchor="middle" fill="#cc4444" fontSize="8" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("wt")}>⚠ Wasser</text>
      {/* Narbonne gate */}
      <rect x="100" y="178" width="20" height="9" rx="1" fill="#c9a84c" opacity="0.7"/>
      <text x="110" y="193" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">Narbonne-Tor</text>
      {/* Compass + title */}
      <text x="192" y="25" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="192" y1="28" x2="192" y2="44" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="110" y="200" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">CARCASSONNE</text>
    </g>
  ),

  helmsdeep: ({ac,sel,onZone}) => (
    <g>
      {/* Rock gorge walls */}
      <path d="M 0 0 L 48 0 L 58 200 L 0 200 Z" fill="rgba(75,68,52,0.65)" stroke="rgba(92,84,62,0.5)" strokeWidth="1"/>
      <path d="M 172 0 L 220 0 L 220 200 L 162 200 Z" fill="rgba(75,68,52,0.65)" stroke="rgba(92,84,62,0.5)" strokeWidth="1"/>
      {/* Rock texture */}
      {[25,50,75,100,125,150].flatMap(y=>[
        <line key={`l${y}`} x1="0" y1={y} x2="58" y2={y+6} stroke="rgba(95,85,65,0.2)" strokeWidth="0.5"/>,
        <line key={`r${y}`} x1="162" y1={y} x2="220" y2={y+6} stroke="rgba(95,85,65,0.2)" strokeWidth="0.5"/>
      ])}
      {/* Valley floor */}
      <rect x="58" y="0" width="104" height="200" fill="rgba(48,44,34,0.2)"/>
      {/* Attacker direction */}
      {[68,82,96,110,124,138,152].map((x,i)=>(
        <path key={i} d={`M ${x} 18 L ${x} 95`} stroke="rgba(204,68,68,0.18)" strokeWidth="0.8" strokeDasharray="3,3"/>
      ))}
      <text x="110" y="12" textAnchor="middle" fill="rgba(204,68,68,0.45)" fontSize="9">← URUK-HAI ANGRIFF →</text>
      {/* Deeping Wall */}
      <rect x="52" y="105" width="116" height="15" fill={sel==="dw"?"rgba(201,168,76,0.38)":"rgba(201,168,76,0.16)"} stroke={`${ac}dd`} strokeWidth="3.5" style={{cursor:"pointer"}} onClick={()=>onZone("dw")}/>
      {/* Battlements */}
      {Array.from({length:13},(_,i)=><rect key={i} x={54+i*8} y={101} width="5" height="6" fill={`${ac}99`}/>)}
      <text x="110" y="116" textAnchor="middle" fill={`${ac}ee`} fontSize="11" fontFamily="serif" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("dw")}>HORNMAUER</text>
      {/* Drain — FATAL */}
      <rect x="86" y="105" width="9" height="15" fill={sel==="dr"?"rgba(255,68,68,0.75)":"rgba(255,68,68,0.4)"} stroke="#ff4444" strokeWidth="2.5" style={{cursor:"pointer"}} onClick={()=>onZone("dr")}/>
      <text x="90" y="130" textAnchor="middle" fill="#ff4444" fontSize="10" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("dr")}>⚠⚠</text>
      <text x="90" y="138" textAnchor="middle" fill="#ff4444" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("dr")}>DRAIN</text>
      <text x="90" y="146" textAnchor="middle" fill="rgba(255,68,68,0.7)" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("dr")}>(Sprengstoff!)</text>
      {/* Hornburg */}
      <path d="M 136 65 L 168 65 L 168 108 L 136 108 Z" fill={sel==="hb"?"rgba(170,136,68,0.48)":"rgba(170,136,68,0.2)"} stroke="#aa8844" strokeWidth="2.5" style={{cursor:"pointer"}} onClick={()=>onZone("hb")}/>
      {[[136,65],[168,65],[136,108],[168,108]].map(([x,y],i)=><rect key={i} x={x-5} y={y-5} width="10" height="10" rx="1" fill="#aa8844" opacity="0.85"/>)}
      <text x="152" y="90" textAnchor="middle" fill="#aa8844" fontSize="10" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("hb")}>HORN-</text>
      <text x="152" y="98" textAnchor="middle" fill="#aa8844" fontSize="10" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("hb")}>BURG</text>
      {/* Postern gate to Hornburg */}
      <rect x="133" y="90" width="5" height="8" rx="1" fill="#c9a84c" opacity="0.8"/>
      {/* Aglarond caves */}
      <path d="M 58 120 L 58 200 L 162 200 L 162 120 Z" fill={sel==="ag"?"rgba(122,106,80,0.38)":"rgba(80,70,50,0.22)"} style={{cursor:"pointer"}} onClick={()=>onZone("ag")}/>
      {/* Cave mouth curves */}
      {[135,155,175].map(y=><path key={y} d={`M 58 ${y} Q 90 ${y+12} 110 ${y+8} Q 130 ${y+4} 162 ${y}`} fill="none" stroke="rgba(122,106,80,0.4)" strokeWidth="1"/>)}
      <text x="110" y="162" textAnchor="middle" fill="#7a6a50" fontSize="11" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ag")}>AGLAROND</text>
      <text x="110" y="172" textAnchor="middle" fill="#7a6a50" fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ag")}>HÖHLEN</text>
      {/* Compass */}
      <text x="200" y="25" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="200" y1="28" x2="200" y2="44" stroke={`${ac}44`} strokeWidth="1"/>
    </g>
  ),

  minas_tirith: ({ac,sel,onZone}) => (
    <g>
      {/* Pelennor fields — attacker zone */}
      <rect x="0" y="0" width="220" height="82" fill="rgba(55,42,22,0.18)"/>
      {/* Plains texture */}
      {[20,40,60].flatMap(y=>[40,90,140,190].map(x=><line key={`${x}${y}`} x1={x} y1={y} x2={x+15} y2={y+8} stroke="rgba(80,65,30,0.12)" strokeWidth="0.5"/>))}
      {/* Attack arrows */}
      {[38,65,92,110,128,155,182].map((x,i)=>(
        <path key={i} d={`M ${x} 16 L ${x} 75`} stroke="rgba(204,68,68,0.2)" strokeWidth="0.8" strokeDasharray="3,3"/>
      ))}
      <text x="110" y="10" textAnchor="middle" fill="rgba(204,68,68,0.38)" fontSize="9">← SAURONS HEER — ANGRIFF →</text>
      {/* Pelennor marker */}
      <rect x="15" y="38" width="40" height="20" rx="2" fill={sel==="pf"?"rgba(85,51,34,0.55)":"rgba(85,51,34,0.2)"} stroke="#774433" strokeWidth="1.5" style={{cursor:"pointer"}} onClick={()=>onZone("pf")}/>
      <text x="35" y="51" textAnchor="middle" fill="#774433" fontSize="8" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("pf")}>⚠ Pelennor</text>
      {/* Rock of Minas Tirith */}
      <path d="M 30 200 L 48 82 L 172 82 L 190 200 Z" fill="rgba(78,68,48,0.4)" stroke="rgba(95,82,58,0.45)" strokeWidth="1.5"/>
      {/* Rock shadow/texture */}
      {[100,120,140,160,180].map(y=><path key={y} d={`M ${30+(y-82)*0.15} ${y} L ${190-(y-82)*0.15} ${y}`} stroke="rgba(78,68,48,0.2)" strokeWidth="0.5"/>)}
      {/* 7 rings — outer to inner */}
      {[
        {rx:82,ry:50,cy:130,id:"r1",c:`${ac}55`,label:"MAUERN I–IV",fw:"normal"},
        {rx:64,ry:38,cy:124,id:"r2",c:`${ac}99`,label:"MAUERN V–VII",fw:"bold"},
        {rx:38,ry:22,cy:115,id:"cd",c:"rgba(232,232,200,0.8)",label:"CITADEL",fw:"bold"},
      ].map(({rx,ry,cy,id,c,label,fw})=>(
        <g key={id}>
          <ellipse cx="110" cy={cy} rx={rx} ry={ry}
            fill={sel===id?"rgba(201,168,76,0.18)":"rgba(201,168,76,0.05)"}
            stroke={c} strokeWidth={id==="cd"?4:5}
            style={{cursor:"pointer"}} onClick={()=>onZone(id)}/>
          {Array.from({length:id==="cd"?4:12},(_,j)=>{
            const a=j/(id==="cd"?4:12)*Math.PI*2-Math.PI/2;
            return <ellipse key={j} cx={110+rx*Math.cos(a)} cy={cy+ry*Math.sin(a)}
              rx="4.5" ry="3.5" fill={c} opacity="0.7"
              style={{cursor:"pointer"}} onClick={()=>onZone(id)}/>;
          })}
          <text x="110" y={cy+5} textAnchor="middle" fill={c} fontSize="10"
            fontFamily="serif" fontWeight={fw}
            style={{cursor:"pointer"}} onClick={()=>onZone(id)}>{label}</text>
        </g>
      ))}
      {/* Main gate */}
      <rect x="101" y="178" width="18" height="10" rx="2"
        fill={sel==="gt"?"rgba(204,68,68,0.65)":"rgba(204,68,68,0.3)"}
        stroke="#cc4444" strokeWidth="2.5" style={{cursor:"pointer"}} onClick={()=>onZone("gt")}/>
      <text x="110" y="196" textAnchor="middle" fill="#cc4444" fontSize="9" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("gt")}>⚠ HAUPTTOR (Grond!)</text>
      {/* White tree */}
      <circle cx="110" cy="115" r="4" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8"/>
      <text x="110" y="117" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="7">🌳</text>
      {/* Compass */}
      <text x="200" y="25" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="200" y1="28" x2="200" y2="44" stroke={`${ac}44`} strokeWidth="1"/>
    </g>
  ),

  constantinople: ({ac,sel,onZone}) => (
    <g>
      {/* Sea backgrounds */}
      <rect x="0" y="145" width="220" height="55" fill="rgba(22,48,90,0.4)"/>
      <rect x="175" y="0" width="45" height="145" fill="rgba(22,48,90,0.35)"/>
      {/* Sea labels */}
      <text x="87" y="162" textAnchor="middle" fill="rgba(68,136,204,0.45)" fontSize="10" fontFamily="serif">Marmarameer</text>
      <text x="197" y="75" textAnchor="middle" fill="rgba(68,136,204,0.4)" fontSize="9" fontFamily="serif" transform="rotate(90 197 75)">Bosporus</text>
      {/* City land */}
      <rect x="0" y="0" width="175" height="145" fill="rgba(55,45,20,0.14)"/>
      {/* Moat */}
      <rect x="0" y="0" width="175" height="14" fill={sel==="gr"?"rgba(68,136,204,0.5)":"rgba(68,136,204,0.22)"} stroke="#336688" strokeWidth="2.5" style={{cursor:"pointer"}} onClick={()=>onZone("gr")}/>
      <text x="87" y="11" textAnchor="middle" fill="#5599cc" fontSize="9" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("gr")}>VORGRABEN — 18m BREIT</text>
      {/* Outer wall */}
      <rect x="0" y="14" width="175" height="13" fill={sel==="w1"?"rgba(122,96,64,0.5)":"rgba(122,96,64,0.2)"} stroke={`${ac}77`} strokeWidth="3" style={{cursor:"pointer"}} onClick={()=>onZone("w1")}/>
      {Array.from({length:14},(_,i)=><rect key={i} x={i*12+2} y="12" width="8" height="5" fill={`${ac}55`}/>)}
      <text x="87" y="25" textAnchor="middle" fill={`${ac}88`} fontSize="9" style={{cursor:"pointer"}} onClick={()=>onZone("w1")}>ÄUSSERE MAUER</text>
      {/* Inner main wall — massive */}
      <rect x="0" y="27" width="175" height="18" fill={sel==="w2"?"rgba(201,168,76,0.38)":"rgba(201,168,76,0.14)"} stroke={`${ac}cc`} strokeWidth="5" style={{cursor:"pointer"}} onClick={()=>onZone("w2")}/>
      {Array.from({length:12},(_,i)=><rect key={i} x={i*14+3} y="24" width="10" height="7" fill={`${ac}88`}/>)}
      <text x="87" y="40" textAnchor="middle" fill={`${ac}ee`} fontSize="9" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("w2")}>INNERE MAUER — 12m HOCH, 5m DICK</text>
      {/* City interior */}
      <rect x="0" y="45" width="175" height="100" fill={sel==="ct"?"rgba(232,216,112,0.1)":"rgba(55,45,20,0.06)"} style={{cursor:"pointer"}} onClick={()=>onZone("ct")}/>
      {/* City grid */}
      {[60,75,90,105,120].map(y=><line key={y} x1="0" y1={y} x2="175" y2={y} stroke="rgba(201,168,76,0.05)" strokeWidth="0.5"/>)}
      {[35,65,95,125,155].map(x=><line key={x} x1={x} y1="45" x2={x} y2="145" stroke="rgba(201,168,76,0.05)" strokeWidth="0.5"/>)}
      <text x="87" y="82" textAnchor="middle" fill="rgba(232,216,112,0.28)" fontSize="8.5" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ct")}>ΚΩΝΣΤΑΝΤΙΝΟΥΠΟΛΙΣ</text>
      <text x="87" y="95" textAnchor="middle" fill="rgba(201,168,76,0.2)" fontSize="9" style={{cursor:"pointer"}} onClick={()=>onZone("ct")}>500.000 Einwohner · 1000 Jahre Hauptstadt</text>
      {/* Hagia Sophia dome */}
      <ellipse cx="95" cy="108" rx="10" ry="8" fill="rgba(201,168,76,0.16)" stroke={`${ac}44`} strokeWidth="0.8"/>
      <text x="95" y="111" textAnchor="middle" fill={`${ac}55`} fontSize="7">Hagia Sophia</text>
      {/* Hippodrome */}
      <ellipse cx="130" cy="112" rx="15" ry="8" fill="rgba(100,80,30,0.12)" stroke={`${ac}33`} strokeWidth="0.6"/>
      <text x="130" y="115" textAnchor="middle" fill={`${ac}33`} fontSize="7">Hippodrom</text>
      {/* Sea wall */}
      <rect x="0" y="141" width="175" height="5" fill="rgba(122,96,64,0.3)" stroke={`${ac}44`} strokeWidth="1.5"/>
      <text x="87" y="143.5" textAnchor="middle" fill={`${ac}44`} fontSize="7">SEEMAUER (60km)</text>
      {/* Kerkaporta — fatal */}
      <rect x="6" y="12" width="12" height="27" fill={sel==="kk"?"rgba(255,68,68,0.72)":"rgba(255,68,68,0.32)"} stroke="#ff4444" strokeWidth="2.5" style={{cursor:"pointer"}} onClick={()=>onZone("kk")}/>
      <text x="12" y="48" textAnchor="middle" fill="#ff4444" fontSize="8" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("kk")}>⚠</text>
      <text x="0" y="54" fill="#cc3322" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("kk")}>Kerkaporta</text>
      <text x="0" y="60" fill="rgba(204,50,34,0.8)" fontSize="7" style={{cursor:"pointer"}} onClick={()=>onZone("kk")}>(1453: offen!)</text>
      {/* Golden Horn hint */}
      <path d="M 0 45 Q 60 50 120 45" fill="none" stroke="rgba(68,136,204,0.2)" strokeWidth="2"/>
      <text x="60" y="44" fill="rgba(68,136,204,0.3)" fontSize="7">Goldenes Horn</text>
    </g>
  ),

  barad_dur: ({ac,sel,onZone}) => (
    <g>
      {/* Mordor wasteland */}
      <rect x="0" y="0" width="220" height="200" fill="rgba(30,15,5,0.5)"/>
      {/* Lava cracks */}
      {[[30,20,80,60],[150,10,100,70],[60,140,120,180],[160,130,180,160]].map(([x1,y1,x2,y2],i)=>(
        <path key={i} d={`M ${x1} ${y1} Q ${(x1+x2)/2+10} ${(y1+y2)/2} ${x2} ${y2}`} fill="none" stroke="rgba(180,60,10,0.3)" strokeWidth="1"/>
      ))}
      {/* Ash clouds */}
      <text x="170" y="30" textAnchor="middle" fill="rgba(80,60,40,0.35)" fontSize="11" fontFamily="serif">MORDOR</text>
      {/* Outer Mordor ring */}
      <path d="M 10 10 L 10 190 L 210 190 L 210 10 Z" fill="none" stroke={`${ac}33`} strokeWidth="2" strokeDasharray="4,3" style={{cursor:"pointer"}} onClick={()=>onZone("md")}/>
      <path d="M 10 10 L 10 190 L 210 190 L 210 10 Z" fill={sel==="md"?"rgba(58,32,16,0.35)":"transparent"} style={{cursor:"pointer"}} onClick={()=>onZone("md")}/>
      <text x="40" y="25" fill={`${ac}33`} fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("md")}>Mordor-Festungsring</text>
      {/* Tower walls */}
      <ellipse cx="110" cy="105" rx="62" ry="58" fill={sel==="tw"?"rgba(106,58,24,0.45)":"rgba(106,58,24,0.18)"} stroke={`${ac}77`} strokeWidth="5" style={{cursor:"pointer"}} onClick={()=>onZone("tw")}/>
      {Array.from({length:8},(_,i)=>{const a=i/8*Math.PI*2;return <rect key={i} x={110+62*Math.cos(a)-6} y={105+58*Math.sin(a)-6} width="12" height="12" rx="1" fill={`${ac}55`} stroke={`${ac}99`} strokeWidth="1" style={{cursor:"pointer"}} onClick={()=>onZone("tw")}/>;}) }
      {/* Inner tower */}
      <ellipse cx="110" cy="104" rx="38" ry="34" fill={sel==="it"?"rgba(138,74,34,0.5)":"rgba(138,74,34,0.2)"} stroke={`${ac}aa`} strokeWidth="6" style={{cursor:"pointer"}} onClick={()=>onZone("it")}/>
      {/* Dark tower shape */}
      <rect x="94" y="88" width="32" height="32" rx="2" fill={sel==="ey"?"rgba(204,68,34,0.55)":"rgba(204,68,34,0.2)"} stroke="#cc4422" strokeWidth="3" style={{cursor:"pointer"}} onClick={()=>onZone("ey")}/>
      {/* Eye of Sauron */}
      <ellipse cx="110" cy="104" rx="12" ry="8" fill="rgba(255,80,20,0.3)" stroke="rgba(255,80,20,0.7)" strokeWidth="1.5" style={{cursor:"pointer"}} onClick={()=>onZone("ey")}/>
      <ellipse cx="110" cy="104" rx="4" ry="7" fill="rgba(200,40,10,0.8)" style={{cursor:"pointer"}} onClick={()=>onZone("ey")}/>
      <text x="110" y="107" textAnchor="middle" fill="rgba(255,80,20,0.9)" fontSize="8" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("ey")}>👁</text>
      <text x="110" y="118" textAnchor="middle" fill="rgba(204,68,34,0.7)" fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ey")}>AUGE SAURONS</text>
      {/* Cirith Ungol */}
      <path d="M 175 30 L 195 50 L 178 55 L 170 38 Z" fill={sel==="cu"?"rgba(136,102,51,0.55)":"rgba(136,102,51,0.25)"} stroke="#886633" strokeWidth="1.8" style={{cursor:"pointer"}} onClick={()=>onZone("cu")}/>
      <text x="182" y="52" textAnchor="middle" fill="#886633" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("cu")}>⚠ C.Ungol</text>
      {/* Mount Doom */}
      <path d="M 45 160 L 65 120 L 85 160 Z" fill="rgba(180,60,10,0.35)" stroke="rgba(200,80,15,0.5)" strokeWidth="1.5"/>
      <text x="65" y="157" textAnchor="middle" fill="rgba(200,80,15,0.6)" fontSize="8">🌋 Schicksals-</text>
      <text x="65" y="164" textAnchor="middle" fill="rgba(200,80,15,0.6)" fontSize="8">berg</text>
      {/* Compass + title */}
      <text x="200" y="25" textAnchor="middle" fill={`${ac}55`} fontSize="8" fontFamily="serif">N</text>
      <line x1="200" y1="28" x2="200" y2="44" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="110" y="195" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">BARAD-DÛR — MORDOR</text>
    </g>
  ),

  chateau_gaillard: ({ac,sel,onZone}) => (
    <g>
      {/* Seine river — curves around the rock spur */}
      <path d="M 0 155 Q 55 145 90 160 Q 130 175 175 155 Q 200 145 220 150 L 220 200 L 0 200 Z"
        fill="rgba(30,70,130,0.35)" stroke="rgba(50,100,170,0.3)" strokeWidth="1"/>
      <text x="110" y="178" textAnchor="middle" fill="rgba(68,136,204,0.4)" fontSize="10" fontFamily="serif">Seine</text>
      {/* Rock spur — the cliff */}
      <path d="M 30 160 L 55 80 L 170 75 L 190 155 Z"
        fill="rgba(100,82,50,0.35)" stroke="rgba(120,98,58,0.4)" strokeWidth="1.2"/>
      {/* Rock texture */}
      {[90,105,120,135,150].map(y=><path key={y} d={`M ${40+(y-80)*0.18} ${y} L ${180-(y-80)*0.12} ${y}`} fill="none" stroke="rgba(100,82,50,0.18)" strokeWidth="0.5"/>)}
      {/* Outer ward */}
      <path d="M 48 148 L 62 88 L 162 83 L 176 148 Z"
        fill={sel==="op"?"rgba(122,96,48,0.28)":"rgba(122,96,48,0.1)"}
        stroke={`${ac}55`} strokeWidth="4"
        style={{cursor:"pointer"}} onClick={()=>onZone("op")}/>
      {/* Outer ward towers */}
      {[[62,88],[114,83],[162,83],[176,148],[114,148],[48,148]].map(([x,y],i)=>(
        <rect key={i} x={x-5} y={y-5} width="10" height="10" rx="1" fill={`${ac}33`} stroke={`${ac}77`} strokeWidth="0.8"/>
      ))}
      <text x="110" y="138" textAnchor="middle" fill={`${ac}55`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("op")}>ÄUSSERES VORWERK</text>
      {/* Middle ward — distinctive corrugated wall */}
      <path d="M 62 130 L 68 95 L 152 90 L 158 130 Z"
        fill={sel==="me"?"rgba(154,120,64,0.28)":"rgba(154,120,64,0.1)"}
        stroke={`${ac}88`} strokeWidth="4.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("me")}/>
      {/* Corrugated (wave) wall detail — middle ward's distinctive feature */}
      {Array.from({length:9},(_,i)=>{
        const t=i/9;
        const x=68+t*(152-68);
        return <path key={i} d={`M ${x} ${90+t*0.5} Q ${x+4} ${86} ${x+8} ${90+t*0.5}`}
          fill="none" stroke={`${ac}66`} strokeWidth="1.2"/>;
      })}
      <text x="110" y="118" textAnchor="middle" fill={`${ac}77`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("me")}>MITTL. ENCEINTE</text>
      <text x="110" y="126" textAnchor="middle" fill={`${ac}55`} fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("me")}>(wellenförmige Mauer)</text>
      {/* Inner ward */}
      <ellipse cx="110" cy="105" rx="30" ry="22"
        fill={sel==="ir"?"rgba(201,168,76,0.3)":"rgba(201,168,76,0.1)"}
        stroke={`${ac}cc`} strokeWidth="5"
        style={{cursor:"pointer"}} onClick={()=>onZone("ir")}/>
      {Array.from({length:5},(_,i)=>{const a=i/5*Math.PI*2;return <circle key={i} cx={110+30*Math.cos(a)} cy={105+22*Math.sin(a)} r="6" fill={`${ac}44`} stroke={`${ac}99`} strokeWidth="0.9" style={{cursor:"pointer"}} onClick={()=>onZone("ir")}/>;}) }
      {/* Donjon */}
      <ellipse cx="110" cy="105" rx="14" ry="11"
        fill={sel==="dj"?"rgba(232,200,96,0.45)":"rgba(232,200,96,0.16)"}
        stroke="#e8c860" strokeWidth="2"
        style={{cursor:"pointer"}} onClick={()=>onZone("dj")}/>
      <text x="110" y="108" textAnchor="middle" fill="#e8c860" fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("dj")}>DONJON</text>
      {/* Latrine — the infamous weakness */}
      <circle cx="148" cy="92" r="9"
        fill={sel==="lt"?"rgba(204,68,68,0.6)":"rgba(204,68,68,0.3)"}
        stroke="#cc4444" strokeWidth="2.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("lt")}/>
      <text x="148" y="90" textAnchor="middle" fill="#ff5555" fontSize="11" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("lt")}>⚠</text>
      <text x="148" y="98" textAnchor="middle" fill="#cc4444" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("lt")}>Latrine!</text>
      {/* Arrow showing infiltration */}
      <path d="M 160 82 L 150 88" stroke="#cc4444" strokeWidth="1.5" strokeDasharray="2,2" opacity="0.7"/>
      <polygon points="150,88 147,83 153,83" fill="#cc4444" opacity="0.6"/>
      <text x="172" y="78" textAnchor="middle" fill="rgba(204,68,68,0.5)" fontSize="7">Philipps</text>
      <text x="172" y="84" textAnchor="middle" fill="rgba(204,68,68,0.5)" fontSize="7">Soldat →</text>
      {/* Compass + title */}
      <text x="194" y="26" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="194" y1="29" x2="194" y2="44" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="110" y="198" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">CHÂTEAU GAILLARD — 1196</text>
    </g>
  ),

  harlech: ({ac,sel,onZone}) => (
    <g>
      {/* Irish Sea — west */}
      <rect x="0" y="0" width="55" height="200" fill="rgba(22,55,105,0.4)"/>
      {/* Wave lines on sea */}
      {[30,55,80,105,130,155].map(y=><path key={y} d={`M 5 ${y} Q 20 ${y-4} 35 ${y} Q 50 ${y+4} 55 ${y}`} fill="none" stroke="rgba(68,136,204,0.15)" strokeWidth="0.6"/>)}
      <text x="27" y="100" textAnchor="middle" fill="rgba(68,136,204,0.35)" fontSize="9" fontFamily="serif" transform="rotate(-90 27 100)">IRISCHE SEE</text>
      {/* Sea supply route arrow */}
      <path d="M 15 80 L 50 90" stroke="#44aacc" strokeWidth="1.5" strokeDasharray="3,2" opacity="0.5"/>
      <polygon points="50,90 44,85 44,93" fill="#44aacc" opacity="0.5"/>
      {/* Cliff rock face — N, S, W */}
      <path d="M 55 0 L 80 0 L 80 15 L 55 15 Z" fill="rgba(80,68,48,0.5)"/>
      <path d="M 55 185 L 80 185 L 80 200 L 55 200 Z" fill="rgba(80,68,48,0.5)"/>
      <path d="M 55 0 L 55 200 L 72 190 L 68 10 Z" fill="rgba(90,75,52,0.45)"/>
      {/* Rock texture */}
      {[25,50,75,100,125,150,175].map(y=><line key={y} x1="55" y1={y} x2="75" y2={y+4} stroke="rgba(90,75,50,0.2)" strokeWidth="0.5"/>)}
      {/* Outer cliff zone */}
      <path d="M 55 10 L 55 190 L 200 190 L 200 10 Z"
        fill={sel==="cl2"?"rgba(106,85,53,0.2)":"rgba(106,85,53,0.07)"}
        stroke={`${ac}33`} strokeWidth="1.5" strokeDasharray="4,3"
        style={{cursor:"pointer"}} onClick={()=>onZone("cl2")}/>
      <text x="60" y="22" fill={`${ac}33`} fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("cl2")}>Felsabfall 60m</text>
      {/* Main castle walls — roughly square with 4 towers */}
      <rect x="80" y="55" width="100" height="90" rx="2"
        fill={sel==="in3"?"rgba(201,168,76,0.22)":"rgba(201,168,76,0.08)"}
        stroke={`${ac}bb`} strokeWidth="5"
        style={{cursor:"pointer"}} onClick={()=>onZone("in3")}/>
      {/* 4 corner towers */}
      {[[80,55],[180,55],[80,145],[180,145]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="11"
          fill={sel==="in3"?"rgba(201,168,76,0.35)":"rgba(201,168,76,0.16)"}
          stroke={`${ac}cc`} strokeWidth="3"
          style={{cursor:"pointer"}} onClick={()=>onZone("in3")}/>
      ))}
      <text x="130" y="103" textAnchor="middle" fill={`${ac}88`} fontSize="11" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("in3")}>HAUPTKURTINE</text>
      {/* Inner courtyard */}
      <rect x="96" y="70" width="68" height="60" rx="1"
        fill="rgba(60,50,25,0.15)" stroke={`${ac}22`} strokeWidth="0.8"/>
      <text x="130" y="103" textAnchor="middle" fill="rgba(100,80,30,0.3)" fontSize="8" fontFamily="serif">Innenhof</text>
      {/* Gatehouse — east */}
      <rect x="176" y="88" width="22" height="25" rx="1"
        fill="rgba(201,168,76,0.2)" stroke={`${ac}88`} strokeWidth="2"/>
      <text x="187" y="103" textAnchor="middle" fill={`${ac}77`} fontSize="8" fontFamily="serif">Tor-</text>
      <text x="187" y="109" textAnchor="middle" fill={`${ac}77`} fontSize="8" fontFamily="serif">haus</text>
      {/* Sea gate — west side, the supply route */}
      <rect x="58" y="88" width="22" height="25" rx="1"
        fill={sel==="sg"?"rgba(68,170,204,0.5)":"rgba(68,170,204,0.22)"}
        stroke="#44aacc" strokeWidth="2.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("sg")}/>
      <text x="69" y="100" textAnchor="middle" fill="#44aacc" fontSize="7" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("sg")}>SEE-</text>
      <text x="69" y="106" textAnchor="middle" fill="#44aacc" fontSize="7" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("sg")}>TOR</text>
      {/* East side weakness */}
      <path d="M 200 70 L 220 70 L 220 130 L 200 130 Z"
        fill={sel==="es"?"rgba(204,102,68,0.45)":"rgba(204,102,68,0.18)"}
        stroke="#cc6644" strokeWidth="2"
        style={{cursor:"pointer"}} onClick={()=>onZone("es")}/>
      <text x="210" y="103" textAnchor="middle" fill="#cc6644" fontSize="8" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("es")}>⚠</text>
      <text x="210" y="110" textAnchor="middle" fill="#cc6644" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("es")}>Ost</text>
      {/* Compass + title */}
      <text x="190" y="22" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="190" y1="25" x2="190" y2="40" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="120" y="196" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">HARLECH CASTLE</text>
    </g>
  ),

  himeji: ({ac,sel,onZone}) => (
    <g>
      {/* Surrounding terrain */}
      <rect x="0" y="0" width="220" height="200" fill="rgba(42,50,32,0.18)"/>
      {/* Outer moat hint */}
      <ellipse cx="110" cy="105" rx="105" ry="92" fill="rgba(30,55,85,0.2)" stroke="rgba(40,70,110,0.2)" strokeWidth="1"/>
      {/* Maze paths — the 83-gate labyrinth system */}
      <ellipse cx="110" cy="105" rx="90" ry="78"
        fill={sel==="mz"?"rgba(85,102,68,0.22)":"rgba(85,102,68,0.07)"}
        stroke={`${ac}44`} strokeWidth="3"
        style={{cursor:"pointer"}} onClick={()=>onZone("mz")}/>
      {/* Maze path lines — the zig-zag approach roads */}
      {[
        "M 110 182 L 110 165 L 90 155 L 90 135 L 130 125",
        "M 130 125 L 130 108 L 110 100",
        "M 30 105 L 50 105 L 50 85 L 80 85 L 80 108",
        "M 190 105 L 170 105 L 170 125 L 140 125",
      ].map((d,i)=><path key={i} d={d} fill="none" stroke={`${ac}22`} strokeWidth="1.5" strokeDasharray="3,2"/>)}
      {/* Gate markers */}
      {[[110,165],[90,145],[130,125],[80,105],[170,125]].map(([x,y],i)=>(
        <rect key={i} x={x-3} y={y-3} width="6" height="6" rx="1" fill={`${ac}55`} stroke={`${ac}88`} strokeWidth="0.7"/>
      ))}
      <text x="35" y="186" fill={`${ac}33`} fontSize="8" fontFamily="serif">83 Tore — Irrgarten</text>
      {/* Second ring */}
      <ellipse cx="110" cy="103" rx="55" ry="48"
        fill={sel==="ib"?"rgba(170,187,119,0.22)":"rgba(170,187,119,0.07)"}
        stroke={`${ac}77`} strokeWidth="4"
        style={{cursor:"pointer"}} onClick={()=>onZone("ib")}/>
      {Array.from({length:8},(_,i)=>{const a=i/8*Math.PI*2;return <rect key={i} x={110+55*Math.cos(a)-4} y={103+48*Math.sin(a)-4} width="8" height="8" rx="1" fill={`${ac}44`} stroke={`${ac}88`} strokeWidth="0.7"/>;}) }
      <text x="110" y="80" textAnchor="middle" fill={`${ac}66`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ib")}>INNERES GELÄNDE</text>
      {/* Inner walls */}
      <ellipse cx="110" cy="103" rx="32" ry="28" fill="rgba(40,38,22,0.15)" stroke={`${ac}55`} strokeWidth="3"/>
      {/* Tenshu — the white tower */}
      <rect x="94" y="88" width="32" height="30" rx="2"
        fill={sel==="ts"?"rgba(232,216,112,0.45)":"rgba(232,216,112,0.15)"}
        stroke="#e8d870" strokeWidth="2.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("ts")}/>
      {/* Tenshu roof layers (pagoda effect) */}
      <rect x="98" y="84" width="24" height="5" rx="1" fill="#e8d870" opacity="0.4"/>
      <rect x="102" y="80" width="16" height="5" rx="1" fill="#e8d870" opacity="0.3"/>
      <text x="110" y="107" textAnchor="middle" fill="#e8d870" fontSize="10" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ts")}>TENSHU</text>
      <text x="110" y="114" textAnchor="middle" fill="#e8d870" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("ts")}>7 Stockwerke</text>
      {/* Fire hazard — NE corner */}
      <circle cx="155" cy="60" r="12"
        fill={sel==="fr"?"rgba(204,68,68,0.55)":"rgba(204,68,68,0.22)"}
        stroke="#cc4444" strokeWidth="2"
        style={{cursor:"pointer"}} onClick={()=>onZone("fr")}/>
      <text x="155" y="58" textAnchor="middle" fill="#ff6644" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("fr")}>🔥</text>
      <text x="155" y="68" textAnchor="middle" fill="#cc4444" fontSize="8" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("fr")}>⚠ Feuer</text>
      {/* Wind direction arrow */}
      <path d="M 178 40 L 155 55" stroke="#cc4444" strokeWidth="1.5" strokeDasharray="2,2" opacity="0.5"/>
      <text x="185" y="38" fill="rgba(204,68,68,0.45)" fontSize="8">Wind →</text>
      {/* White heron ornament */}
      <text x="110" y="74" textAnchor="middle" fill="rgba(240,240,220,0.2)" fontSize="10">🦢</text>
      {/* Compass + title */}
      <text x="194" y="22" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="194" y1="25" x2="194" y2="40" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="110" y="198" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">HIMEJI-JŌ — WEISSER REIHER</text>
    </g>
  ),

  alamut: ({ac,sel,onZone}) => (
    <g>
      {/* Mountain background */}
      <rect x="0" y="0" width="220" height="200" fill="rgba(38,28,18,0.35)"/>
      {/* Alborz mountain silhouette */}
      <path d="M 0 200 L 0 120 L 40 60 L 70 90 L 95 40 L 110 20 L 125 40 L 150 90 L 180 60 L 220 120 L 220 200 Z"
        fill="rgba(60,48,32,0.55)" stroke="rgba(80,62,40,0.4)" strokeWidth="1"/>
      {/* Snow peaks */}
      <path d="M 95 40 L 110 20 L 125 40 L 115 38 L 110 28 L 105 38 Z" fill="rgba(220,220,220,0.25)"/>
      {/* Cliff walls — the mountain IS the fortress */}
      <path d="M 55 140 L 70 80 L 110 55 L 150 80 L 165 140 L 110 160 Z"
        fill={sel==="mt"?"rgba(90,74,53,0.38)":"rgba(90,74,53,0.2)"}
        stroke={`${ac}66`} strokeWidth="3" strokeDasharray="5,3"
        style={{cursor:"pointer"}} onClick={()=>onZone("mt")}/>
      <text x="110" y="145" textAnchor="middle" fill={`${ac}55`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("mt")}>ALBORZ-GEBIRGE</text>
      <text x="110" y="153" textAnchor="middle" fill={`${ac}44`} fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("mt")}>2100m Höhe</text>
      {/* Rock ridge — the keep is built on */}
      <path d="M 78 118 L 85 90 L 110 78 L 135 90 L 142 118 L 110 130 Z"
        fill="rgba(80,65,42,0.4)" stroke="rgba(100,82,52,0.5)" strokeWidth="1.2"/>
      {/* Kernburg on ridge */}
      <path d="M 84 112 L 88 88 L 110 76 L 132 88 L 136 112 L 110 122 Z"
        fill={sel==="kb"?"rgba(201,168,76,0.35)":"rgba(201,168,76,0.14)"}
        stroke={`${ac}cc`} strokeWidth="4"
        style={{cursor:"pointer"}} onClick={()=>onZone("kb")}/>
      {/* Wall towers */}
      {[[88,88],[110,76],[132,88],[136,112],[110,122],[84,112]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="6" fill={`${ac}44`} stroke={`${ac}99`} strokeWidth="1"/>
      ))}
      <text x="110" y="98" textAnchor="middle" fill={`${ac}88`} fontSize="10" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("kb")}>KERNBURG</text>
      {/* Libraries & gardens (Assassins were scholars) */}
      <rect x="96" y="100" width="28" height="15" rx="1" fill="rgba(80,50,120,0.15)" stroke="rgba(100,70,150,0.3)" strokeWidth="0.8"/>
      <text x="110" y="111" textAnchor="middle" fill="rgba(150,100,200,0.4)" fontSize="8">Bibliothek</text>
      {/* The single path — the ONLY access */}
      <path d="M 110 170 L 110 162 L 100 148 L 108 136 L 108 122"
        stroke="#8b6914" strokeWidth="3" strokeDasharray="4,2" fill="none"/>
      <path d="M 110 170 L 120 160 L 115 148 L 112 136"
        stroke="rgba(139,105,20,0.4)" strokeWidth="1.5" strokeDasharray="3,3" fill="none"/>
      {/* Bergpfad weakness */}
      <circle cx="110" cy="172" r="11"
        fill={sel==="bp"?"rgba(204,68,68,0.55)":"rgba(204,68,68,0.25)"}
        stroke="#cc4444" strokeWidth="2.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("bp")}/>
      <text x="110" y="170" textAnchor="middle" fill="#cc4444" fontSize="10" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("bp")}>⚠</text>
      <text x="110" y="178" textAnchor="middle" fill="#cc4444" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("bp")}>Bergpfad</text>
      {/* Attacking force at bottom */}
      <text x="110" y="195" textAnchor="middle" fill="rgba(204,68,68,0.35)" fontSize="8">▲ Mongolisches Heer (unten)</text>
      {/* Compass + title */}
      <text x="196" y="22" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="196" y1="25" x2="196" y2="40" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="110" y="198" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">BURG ALAMUT — 2100m</text>
    </g>
  ),

  coucy: ({ac,sel,onZone}) => (
    <g>
      {/* Hillside terrain */}
      <ellipse cx="110" cy="105" rx="108" ry="96" fill="rgba(70,58,28,0.14)" stroke="rgba(90,72,32,0.15)" strokeWidth="0.6"/>
      {/* Outer moat — fills with water */}
      <ellipse cx="110" cy="105" rx="92" ry="83"
        fill={sel==="wg"?"rgba(68,102,136,0.38)":"rgba(68,102,136,0.18)"}
        stroke="#446688" strokeWidth="3"
        style={{cursor:"pointer"}} onClick={()=>onZone("wg")}/>
      <ellipse cx="110" cy="105" rx="85" ry="76" fill="rgba(8,14,25,0.35)" stroke="none"/>
      <text x="175" y="75" fill="#446688" fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("wg")}>Wassergraben</text>
      {/* Outer ring wall */}
      <ellipse cx="110" cy="105" rx="78" ry="70"
        fill={sel==="ar"?"rgba(122,96,64,0.25)":"rgba(122,96,64,0.08)"}
        stroke={`${ac}66`} strokeWidth="5"
        style={{cursor:"pointer"}} onClick={()=>onZone("ar")}/>
      {/* Half-round bastions */}
      {Array.from({length:10},(_,i)=>{const a=i/10*Math.PI*2;return <ellipse key={i} cx={110+78*Math.cos(a)} cy={105+70*Math.sin(a)} rx="8" ry="6" fill={`${ac}33`} stroke={`${ac}66`} strokeWidth="0.8" style={{cursor:"pointer"}} onClick={()=>onZone("ar")}/>;}) }
      <text x="165" y="108" fill={`${ac}44`} fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ar")}>Äußere</text>
      <text x="165" y="115" fill={`${ac}44`} fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ar")}>Ringmauer</text>
      {/* Inner ring wall */}
      <ellipse cx="110" cy="103" rx="55" ry="49"
        fill={sel==="ir2"?"rgba(170,136,64,0.25)":"rgba(170,136,64,0.08)"}
        stroke={`${ac}99`} strokeWidth="6"
        style={{cursor:"pointer"}} onClick={()=>onZone("ir2")}/>
      {/* 4 massive round towers */}
      {[[110-55,103],[110+55,103],[110,103-49],[110,103+49]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="11" fill={`${ac}44`} stroke={`${ac}bb`} strokeWidth="2" style={{cursor:"pointer"}} onClick={()=>onZone("ir2")}/>
      ))}
      <text x="110" y="80" textAnchor="middle" fill={`${ac}77`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ir2")}>INNERE RINGMAUER</text>
      {/* The great donjon — the centerpiece */}
      <circle cx="110" cy="103" r="26"
        fill={sel==="dn"?"rgba(232,200,96,0.42)":"rgba(232,200,96,0.15)"}
        stroke="#e8c860" strokeWidth="4"
        style={{cursor:"pointer"}} onClick={()=>onZone("dn")}/>
      {/* Donjon interior detail */}
      <circle cx="110" cy="103" r="18" fill="rgba(30,22,8,0.5)" stroke="rgba(232,200,96,0.3)" strokeWidth="0.5"/>
      <circle cx="110" cy="103" r="8" fill="rgba(232,200,96,0.1)" stroke="rgba(232,200,96,0.4)" strokeWidth="0.8"/>
      <text x="110" y="100" textAnchor="middle" fill="#e8c860" fontSize="11" fontFamily="serif" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("dn")}>DONJON</text>
      <text x="110" y="109" textAnchor="middle" fill="#e8c860" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("dn")}>54m · 31m ∅</text>
      <text x="110" y="117" textAnchor="middle" fill="rgba(232,200,96,0.6)" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("dn")}>7m Mauern</text>
      {/* Compass + title */}
      <text x="196" y="22" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="196" y1="25" x2="196" y2="40" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="110" y="198" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">CHÂTEAU DE COUCY</text>
    </g>
  ),

  babylon: ({ac,sel,onZone}) => (
    <g>
      {/* Desert landscape */}
      <rect x="0" y="0" width="220" height="200" fill="rgba(90,70,30,0.18)"/>
      {/* Euphrates river — flows N to S through/past city */}
      <path d="M 0 0 L 45 0 L 52 200 L 0 200 Z"
        fill={sel==="eu"?"rgba(68,136,204,0.5)":"rgba(40,90,160,0.3)"}
        stroke="#4488cc" strokeWidth="2"
        style={{cursor:"pointer"}} onClick={()=>onZone("eu")}/>
      {/* River current lines */}
      {[30,60,90,120,150].map(y=><path key={y} d={`M 5 ${y} Q 25 ${y+5} 45 ${y}`} fill="none" stroke="rgba(68,136,204,0.2)" strokeWidth="0.7"/>)}
      <text x="24" y="100" textAnchor="middle" fill="#4488cc" fontSize="10" fontFamily="serif" transform="rotate(90 24 100)">EUPHRAT</text>
      {/* Dry riverbed — the weakness when diverted */}
      <circle cx="22" cy="150" r="10"
        fill={sel==="fb"?"rgba(204,68,68,0.55)":"rgba(204,68,68,0.22)"}
        stroke="#cc4444" strokeWidth="2"
        style={{cursor:"pointer"}} onClick={()=>onZone("fb")}/>
      <text x="22" y="148" textAnchor="middle" fill="#ff4444" fontSize="10" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("fb")}>⚠</text>
      <text x="22" y="157" textAnchor="middle" fill="#cc4444" fontSize="7" style={{cursor:"pointer"}} onClick={()=>onZone("fb")}>Flussbett</text>
      {/* Outer wall */}
      <rect x="52" y="10" width="160" height="180"
        fill={sel==="ow"?"rgba(139,112,48,0.22)":"rgba(139,112,48,0.08)"}
        stroke={`${ac}55`} strokeWidth="5"
        style={{cursor:"pointer"}} onClick={()=>onZone("ow")}/>
      {/* Outer wall towers */}
      {[[52,10],[132,10],[212,10],[212,100],[212,190],[132,190],[52,190],[52,100]].map(([x,y],i)=>(
        <rect key={i} x={x-5} y={y-5} width="10" height="10" rx="1" fill={`${ac}33`} stroke={`${ac}77`} strokeWidth="0.7"/>
      ))}
      <text x="135" y="22" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ow")}>ÄUSSERE MAUER (7m)</text>
      {/* Inner wall */}
      <rect x="68" y="26" width="128" height="148"
        fill={sel==="iw"?"rgba(201,168,76,0.2)":"rgba(201,168,76,0.07)"}
        stroke={`${ac}aa`} strokeWidth="5.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("iw")}/>
      {/* Inner wall towers */}
      {[[68,26],[132,26],[196,26],[196,100],[196,174],[132,174],[68,174],[68,100]].map(([x,y],i)=>(
        <rect key={i} x={x-5} y={y-5} width="10" height="10" rx="1" fill={`${ac}44`} stroke={`${ac}88`} strokeWidth="0.8"/>
      ))}
      <text x="132" y="40" textAnchor="middle" fill={`${ac}77`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("iw")}>INNERE MAUER (7m) — STREITWAGEN-WEG</text>
      {/* Processional Way */}
      <line x1="132" y1="174" x2="132" y2="26" stroke="rgba(201,168,76,0.15)" strokeWidth="4"/>
      <text x="132" y="115" textAnchor="middle" fill="rgba(201,168,76,0.25)" fontSize="8" transform="rotate(90 132 115)">Prozessionsstraße</text>
      {/* Hanging Gardens */}
      <rect x="150" y="42" width="38" height="38" rx="3"
        fill={sel==="hg"?"rgba(136,170,68,0.45)":"rgba(136,170,68,0.18)"}
        stroke="#88aa44" strokeWidth="2"
        style={{cursor:"pointer"}} onClick={()=>onZone("hg")}/>
      <text x="169" y="58" textAnchor="middle" fill="#88aa44" fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("hg")}>Hängende</text>
      <text x="169" y="65" textAnchor="middle" fill="#88aa44" fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("hg")}>Gärten</text>
      <text x="169" y="72" textAnchor="middle" fill="#88aa44" fontSize="11" style={{cursor:"pointer"}} onClick={()=>onZone("hg")}>🌿</text>
      {/* Ishtar Gate — north */}
      <rect x="118" y="24" width="28" height="12" rx="1" fill={`${ac}55`} stroke={`${ac}99`} strokeWidth="1.5"/>
      <text x="132" y="33" textAnchor="middle" fill={`${ac}88`} fontSize="8">Ischtar-Tor</text>
      {/* Palace */}
      <rect x="76" y="40" width="62" height="45" rx="2" fill="rgba(201,168,76,0.1)" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="107" y="66" textAnchor="middle" fill={`${ac}55`} fontSize="8" fontFamily="serif">Palast</text>
      {/* Marduk temple */}
      <rect x="100" y="105" width="42" height="52" rx="2" fill="rgba(201,168,76,0.09)" stroke={`${ac}33`} strokeWidth="0.8"/>
      <text x="121" y="135" textAnchor="middle" fill={`${ac}44`} fontSize="8" fontFamily="serif">Esagila</text>
      <text x="121" y="143" textAnchor="middle" fill={`${ac}33`} fontSize="7">(Marduk-Tempel)</text>
      {/* Compass + title */}
      <text x="200" y="22" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="200" y1="25" x2="200" y2="40" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="135" y="197" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">BABYLON — 605 v.Chr.</text>
    </g>
  ),

  alhambra: ({ac,sel,onZone}) => (
    <g>
      {/* Granada valley below */}
      <rect x="0" y="0" width="220" height="200" fill="rgba(38,50,28,0.18)"/>
      {/* Red hill (hence Alhambra = "the red") */}
      <path d="M 10 200 L 25 120 L 55 90 L 165 85 L 195 115 L 210 200 Z"
        fill="rgba(120,60,30,0.25)" stroke="rgba(140,72,35,0.3)" strokeWidth="1"/>
      {/* Cliff shading */}
      {[130,148,166,184].map(y=><path key={y} d={`M ${20+(y-120)*0.35} ${y} L ${205-(y-120)*0.3} ${y}`} fill="none" stroke="rgba(100,52,25,0.15)" strokeWidth="0.5"/>)}
      {/* Acequia Real — water channel from Sierra Nevada */}
      <path d="M 0 35 Q 40 30 55 48 Q 70 65 75 90"
        fill="none" stroke={`${ac}44`} strokeWidth="2.5" strokeDasharray="5,3"
        style={{cursor:"pointer"}} onClick={()=>onZone("aq")}/>
      <circle cx="10" cy="35" r="7"
        fill={sel==="aq"?"rgba(68,136,204,0.55)":"rgba(68,136,204,0.22)"}
        stroke="#4488cc" strokeWidth="1.8"
        style={{cursor:"pointer"}} onClick={()=>onZone("aq")}/>
      <text x="6" y="25" fill="#4488cc" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("aq")}>Acequia</text>
      <text x="6" y="32" fill="#4488cc" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("aq")}>(Sierra↓)</text>
      {/* Cliff/mountain zone */}
      <path d="M 28 195 L 40 120 L 55 90 L 165 85 L 180 118 L 192 195 Z"
        fill={sel==="cl3"?"rgba(122,90,56,0.28)":"rgba(122,90,56,0.12)"}
        stroke={`${ac}33`} strokeWidth="1.5" strokeDasharray="4,3"
        style={{cursor:"pointer"}} onClick={()=>onZone("cl3")}/>
      <text x="30" y="155" fill={`${ac}33`} fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("cl3")}>Kliff &</text>
      <text x="30" y="163" fill={`${ac}33`} fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("cl3")}>Gebirge</text>
      {/* Alcazaba — military fortress (west end) */}
      <rect x="42" y="105" width="55" height="62" rx="2"
        fill={sel==="al"?"rgba(170,119,51,0.4)":"rgba(170,119,51,0.14)"}
        stroke="#aa7733" strokeWidth="3.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("al")}/>
      {[[42,105],[97,105],[42,167],[97,167]].map(([x,y],i)=>(
        <rect key={i} x={x-6} y={y-6} width="12" height="12" rx="1" fill="#aa7733" opacity="0.7"/>
      ))}
      {/* Torre de la Vela — tallest tower */}
      <rect x="42" y="95" width="16" height="22" rx="1" fill="#aa7733" opacity="0.8"/>
      <text x="70" y="130" textAnchor="middle" fill="#aa7733" fontSize="10" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("al")}>ALCAZABA</text>
      <text x="70" y="139" textAnchor="middle" fill="rgba(170,119,51,0.6)" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("al")}>(Militärburg)</text>
      {/* Nasrid Palaces — the famous ones */}
      <rect x="100" y="95" width="70" height="72" rx="2"
        fill={sel==="py"?"rgba(204,170,85,0.35)":"rgba(204,170,85,0.12)"}
        stroke={`${ac}cc`} strokeWidth="3.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("py")}/>
      {/* Courtyard of the Lions hint */}
      <rect x="114" y="108" width="42" height="30" rx="1" fill="rgba(201,168,76,0.1)" stroke={`${ac}44`} strokeWidth="0.8"/>
      <text x="135" y="122" textAnchor="middle" fill={`${ac}55`} fontSize="8">Löwenhof</text>
      {/* Courtyard of the Myrtles */}
      <rect x="108" y="142" width="54" height="18" rx="1" fill="rgba(68,136,204,0.12)" stroke="#4488cc" strokeWidth="0.6"/>
      <text x="135" y="153" textAnchor="middle" fill="rgba(68,136,204,0.5)" fontSize="8">Myrtenhof (Bassin)</text>
      <text x="135" y="128" textAnchor="middle" fill={`${ac}88`} fontSize="10" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("py")}>NASRIDEN-</text>
      <text x="135" y="137" textAnchor="middle" fill={`${ac}88`} fontSize="10" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("py")}>PALÄSTE</text>
      {/* Generalife gardens — east */}
      <rect x="172" y="88" width="42" height="50" rx="3"
        fill="rgba(100,140,60,0.2)" stroke="rgba(120,160,70,0.4)" strokeWidth="1.5"/>
      <text x="193" y="112" textAnchor="middle" fill="rgba(120,160,60,0.6)" fontSize="8" fontFamily="serif">Genera-</text>
      <text x="193" y="120" textAnchor="middle" fill="rgba(120,160,60,0.6)" fontSize="8" fontFamily="serif">life</text>
      {/* Main gate */}
      <rect x="95" y="167" width="16" height="8" rx="1" fill={`${ac}55`} opacity="0.8"/>
      <text x="103" y="183" textAnchor="middle" fill={`${ac}55`} fontSize="8" fontFamily="serif">Haupttor</text>
      {/* Compass + title */}
      <text x="196" y="22" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="196" y1="25" x2="196" y2="40" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="110" y="197" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">ALHAMBRA — GRANADA</text>
    </g>
  ),

  mehrangarh: ({ac,sel,onZone}) => (
    <g>
      {/* Jodhpur desert below — blue city */}
      <rect x="0" y="0" width="220" height="200" fill="rgba(35,40,60,0.2)"/>
      {/* City of Jodhpur below */}
      <path d="M 0 200 L 0 155 Q 55 145 110 150 Q 165 155 220 148 L 220 200 Z"
        fill="rgba(40,50,100,0.2)" stroke="rgba(50,65,120,0.2)" strokeWidth="0.5"/>
      <text x="110" y="178" textAnchor="middle" fill="rgba(80,100,160,0.25)" fontSize="9" fontFamily="serif">Jodhpur — Blaue Stadt</text>
      {/* The 122m cliff — SHEER rock face */}
      <path d="M 15 165 L 40 90 L 50 70 L 65 50 L 155 45 L 170 68 L 182 92 L 205 165 Z"
        fill="rgba(140,90,40,0.4)" stroke="rgba(160,105,45,0.45)" strokeWidth="1.5"/>
      {/* Cliff rock lines */}
      {[80,100,120,140,160].map(y=><path key={y} d={`M ${25+(y-80)*0.22} ${y} L ${198-(y-80)*0.2} ${y}`} fill="none" stroke="rgba(120,82,38,0.2)" strokeWidth="0.5"/>)}
      <text x="30" y="130" fill="rgba(140,90,40,0.4)" fontSize="8" fontFamily="serif" transform="rotate(-72 30 130)">122m FELS</text>
      {/* Rock base platform */}
      <path d="M 42 152 L 55 85 L 65 55 L 155 50 L 168 80 L 178 150 Z"
        fill={sel==="rk"?"rgba(180,120,55,0.28)":"rgba(160,105,48,0.15)"}
        stroke={`${ac}44`} strokeWidth="2" strokeDasharray="4,3"
        style={{cursor:"pointer"}} onClick={()=>onZone("rk")}/>
      {/* Main wall — climbs from cliff */}
      <path d="M 58 143 L 68 85 L 76 62 L 144 58 L 154 82 L 162 140 Z"
        fill={sel==="hw"?"rgba(204,136,51,0.3)":"rgba(204,136,51,0.1)"}
        stroke={`${ac}cc`} strokeWidth="5.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("hw")}/>
      {/* Wall towers */}
      {[[68,85],[106,58],[144,58],[154,82],[162,140],[58,143]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="8" fill={`${ac}44`} stroke={`${ac}99`} strokeWidth="1.2" style={{cursor:"pointer"}} onClick={()=>onZone("hw")}/>
      ))}
      <text x="110" y="115" textAnchor="middle" fill={`${ac}88`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("hw")}>HAUPTMAUER</text>
      <text x="110" y="123" textAnchor="middle" fill="rgba(204,136,51,0.6)" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("hw")}>bis 36m hoch</text>
      {/* Seven gates — sequential approach */}
      {[[110,148],[110,138],[110,126],[110,114],[110,105]].map(([x,y],i)=>(
        <rect key={i} x={x-6} y={y-4} width="12" height="8" rx="1"
          fill={sel==="pg"?"rgba(201,168,76,0.5)":"rgba(201,168,76,0.2)"}
          stroke={`${ac}88`} strokeWidth="1.5"
          style={{cursor:"pointer"}} onClick={()=>onZone("pg")}/>
      ))}
      <text x="130" y="140" fill={`${ac}66`} fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("pg")}>← 7 Tore</text>
      {/* Palace complex */}
      <rect x="78" y="65" width="64" height="52" rx="2"
        fill={sel==="pa"?"rgba(232,200,96,0.4)":"rgba(232,200,96,0.14)"}
        stroke="#e8c860" strokeWidth="2.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("pa")}/>
      {/* Palace details — jharokha windows */}
      {[85,100,115,125].map((x,i)=><rect key={i} x={x} y="68" width="7" height="10" rx="1" fill="rgba(232,200,96,0.3)" stroke="#e8c860" strokeWidth="0.5"/>)}
      <text x="110" y="96" textAnchor="middle" fill="#e8c860" fontSize="10" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("pa")}>PALASTKOMPLEX</text>
      {/* Compass + title */}
      <text x="196" y="22" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="196" y1="25" x2="196" y2="40" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="110" y="197" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">MEHRANGARH — JODHPUR</text>
    </g>
  ),

  akkon: ({ac,sel,onZone}) => (
    <g>
      {/* Mediterranean sea — west & north */}
      <rect x="0" y="0" width="220" height="60" fill="rgba(22,55,110,0.38)"/>
      <rect x="0" y="0" width="55" height="200" fill="rgba(22,55,110,0.35)"/>
      {/* Harbor */}
      <path d="M 0 60 Q 30 70 55 60 L 55 120 Q 30 115 0 120 Z"
        fill="rgba(25,65,125,0.5)" stroke="rgba(40,90,170,0.35)" strokeWidth="1"/>
      {/* Sea waves */}
      {[20,40].map(y=><path key={y} d={`M 5 ${y} Q 25 ${y-4} 45 ${y}`} fill="none" stroke="rgba(68,136,204,0.18)" strokeWidth="0.7"/>)}
      <text x="27" y="35" textAnchor="middle" fill="rgba(68,136,204,0.35)" fontSize="9" fontFamily="serif">MITTELMEER</text>
      {/* Sea walls */}
      <rect x="0" y="58" width="58" height="6"
        fill={sel==="sm"?"rgba(68,136,204,0.55)":"rgba(68,136,204,0.25)"}
        stroke="#4488cc" strokeWidth="2.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("sm")}/>
      <text x="29" y="55" textAnchor="middle" fill="#4488cc" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("sm")}>SEEMAUER</text>
      {/* Harbor marker */}
      <ellipse cx="28" cy="90" rx="20" ry="25"
        fill="rgba(25,65,125,0.35)" stroke="rgba(40,90,170,0.3)" strokeWidth="1"/>
      <text x="28" y="90" textAnchor="middle" fill="rgba(68,136,204,0.5)" fontSize="8" fontFamily="serif">Hafen</text>
      {/* Port critical zone */}
      <circle cx="48" cy="92" r="9"
        fill={sel==="ht"?"rgba(204,68,68,0.55)":"rgba(204,68,68,0.22)"}
        stroke="#cc4444" strokeWidth="2"
        style={{cursor:"pointer"}} onClick={()=>onZone("ht")}/>
      <text x="48" y="97" textAnchor="middle" fill="#cc4444" fontSize="7" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("ht")}>⚠</text>
      {/* Outer city wall */}
      <rect x="55" y="60" width="155" height="140"
        fill={sel==="oa"?"rgba(122,106,64,0.2)":"rgba(122,106,64,0.07)"}
        stroke={`${ac}66`} strokeWidth="4"
        style={{cursor:"pointer"}} onClick={()=>onZone("oa")}/>
      {Array.from({length:10},(_,i)=>{const t=i/10;const x=55+t*155;return <rect key={i} x={x-4} y={56} width="8" height="8" rx="1" fill={`${ac}33`} stroke={`${ac}66`} strokeWidth="0.7"/>;}) }
      {/* Inner wall */}
      <rect x="72" y="76" width="122" height="108"
        fill={sel==="ia"?"rgba(201,168,76,0.18)":"rgba(201,168,76,0.06)"}
        stroke={`${ac}aa`} strokeWidth="5"
        style={{cursor:"pointer"}} onClick={()=>onZone("ia")}/>
      {/* Streets & blocks */}
      {[100,120,140,160].map(y=><line key={y} x1="72" y1={y} x2="194" y2={y} stroke={`${ac}08`} strokeWidth="0.5"/>)}
      {[100,130,160].map(x=><line key={x} x1={x} y1="76" x2={x} y2="184" stroke={`${ac}08`} strokeWidth="0.5"/>)}
      <text x="133" y="110" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ia")}>INNERE STADTMAUER</text>
      {/* Johanniter Citadel */}
      <rect x="82" y="85" width="50" height="42" rx="2"
        fill={sel==="ja"?"rgba(232,200,96,0.42)":"rgba(232,200,96,0.15)"}
        stroke="#e8c860" strokeWidth="2.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("ja")}/>
      {[[82,85],[132,85],[82,127],[132,127]].map(([x,y],i)=>(
        <rect key={i} x={x-5} y={y-5} width="10" height="10" rx="1" fill="#e8c860" opacity="0.75"/>
      ))}
      <text x="107" y="110" textAnchor="middle" fill="#e8c860" fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ja")}>JOHANNITER-</text>
      <text x="107" y="118" textAnchor="middle" fill="#e8c860" fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ja")}>CITADEL</text>
      {/* Templar quarter */}
      <rect x="144" y="148" width="44" height="36" rx="2" fill="rgba(180,80,80,0.12)" stroke="rgba(180,80,80,0.3)" strokeWidth="1"/>
      <text x="166" y="168" textAnchor="middle" fill="rgba(180,80,80,0.5)" fontSize="8" fontFamily="serif">Templer</text>
      {/* Compass + title */}
      <text x="196" y="22" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="196" y1="25" x2="196" y2="40" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="135" y="197" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">AKKON — 1291</text>
    </g>
  ),

  mont_michel: ({ac,sel,onZone}) => (
    <g>
      {/* Tidal flats — vast expanse */}
      <rect x="0" y="0" width="220" height="200" fill="rgba(22,55,100,0.32)"/>
      {/* Tidal zone — huge outer ring */}
      <ellipse cx="110" cy="108" rx="108" ry="95"
        fill={sel==="ti"?"rgba(30,80,150,0.42)":"rgba(22,55,110,0.25)"}
        stroke="#336688" strokeWidth="3"
        style={{cursor:"pointer"}} onClick={()=>onZone("ti")}/>
      {/* Wave rings showing tidal reach */}
      {[88,75,62].map((rx,i)=>(
        <ellipse key={i} cx="110" cy="108" rx={rx} ry={rx*0.88} fill="none"
          stroke="rgba(68,136,204,0.18)" strokeWidth="0.6" strokeDasharray="3,3"/>
      ))}
      <text x="20" y="40" fill="rgba(68,136,204,0.4)" fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ti")}>GEZEITEN</text>
      <text x="20" y="48" fill="rgba(68,136,204,0.4)" fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ti")}>2× tägl.</text>
      {/* Quicksand zone */}
      <ellipse cx="110" cy="108" rx="82" ry="72"
        fill={sel==="qs"?"rgba(68,88,80,0.38)":"rgba(50,68,60,0.18)"}
        stroke="rgba(68,100,80,0.4)" strokeWidth="2.5" strokeDasharray="4,3"
        style={{cursor:"pointer"}} onClick={()=>onZone("qs")}/>
      <text x="182" y="80" fill="rgba(68,100,80,0.45)" fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("qs")}>Treibsand</text>
      {/* The causeway path — only approach */}
      <path d="M 110 195 L 110 160 L 108 145" stroke={`${ac}44`} strokeWidth="3" strokeDasharray="5,3"/>
      <text x="125" y="182" fill={`${ac}44`} fontSize="8">Damm</text>
      {/* The rock */}
      <ellipse cx="110" cy="108" rx="42" ry="36"
        fill="rgba(90,80,60,0.5)" stroke="rgba(110,95,68,0.55)" strokeWidth="1.5"/>
      {/* Town walls */}
      <ellipse cx="110" cy="106" rx="35" ry="30"
        fill={sel==="ws2"?"rgba(136,153,170,0.35)":"rgba(136,153,170,0.12)"}
        stroke={`${ac}99`} strokeWidth="4"
        style={{cursor:"pointer"}} onClick={()=>onZone("ws2")}/>
      {Array.from({length:8},(_,i)=>{const a=i/8*Math.PI*2;return <rect key={i} x={110+35*Math.cos(a)-4} y={106+30*Math.sin(a)-4} width="8" height="8" rx="1" fill={`${ac}44`} stroke={`${ac}88`} strokeWidth="0.8"/>;}) }
      <text x="110" y="127" textAnchor="middle" fill={`${ac}77`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ws2")}>STADTMAUERN</text>
      {/* Abbey — the summit */}
      <path d="M 96 94 L 100 78 L 110 68 L 120 78 L 124 94 Z"
        fill={sel==="ab"?"rgba(170,187,204,0.52)":"rgba(170,187,204,0.2)"}
        stroke={`${ac}cc`} strokeWidth="3.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("ab")}/>
      {/* Abbey spire */}
      <polygon points="110,58 106,78 114,78" fill={`${ac}66`} opacity="0.8"/>
      <text x="110" y="90" textAnchor="middle" fill={`${ac}99`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ab")}>ABTEI</text>
      {/* Compass + title */}
      <text x="194" y="22" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="194" y1="25" x2="194" y2="40" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="110" y="198" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">MONT SAINT-MICHEL</text>
    </g>
  ),

  caernarvon: ({ac,sel,onZone}) => (
    <g>
      {/* River Seiont — south */}
      <rect x="0" y="155" width="220" height="45" fill="rgba(22,55,110,0.35)"/>
      <text x="110" y="172" textAnchor="middle" fill="rgba(68,136,204,0.35)" fontSize="9" fontFamily="serif">Fluss Seiont</text>
      {/* Town — north */}
      <rect x="0" y="0" width="220" height="50" fill="rgba(38,50,28,0.15)"/>
      <text x="110" y="25" textAnchor="middle" fill="rgba(100,120,60,0.3)" fontSize="9" fontFamily="serif">Caernarfon — Stadt</text>
      {/* Castle — irregular polygon (not square, distinctive shape) */}
      <path d="M 35 50 L 35 155 L 185 155 L 185 50 Z"
        fill="rgba(50,45,28,0.15)"/>
      {/* Outer ward wall — the famous banded masonry */}
      <path d="M 35 50 L 35 155 L 185 155 L 185 50 L 35 50 Z"
        fill={sel==="em"?"rgba(153,136,187,0.22)":"rgba(153,136,187,0.07)"}
        stroke={`${ac}bb`} strokeWidth="5"
        style={{cursor:"pointer"}} onClick={()=>onZone("em")}/>
      {/* Eagle Tower — SW corner, the largest */}
      <circle cx="35" cy="100" r="20"
        fill={sel==="et"?"rgba(153,136,187,0.48)":"rgba(153,136,187,0.18)"}
        stroke="#9988bb" strokeWidth="4"
        style={{cursor:"pointer"}} onClick={()=>onZone("et")}/>
      <text x="35" y="95" textAnchor="middle" fill="#9988bb" fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("et")}>Eagle</text>
      <text x="35" y="103" textAnchor="middle" fill="#9988bb" fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("et")}>Tower</text>
      {/* Other towers — polygonal, not round */}
      {[[35,50],[105,50],[185,50],[185,155],[105,155],[35,155]].map(([x,y],i)=>(
        <rect key={i} x={x-8} y={y-8} width="16" height="16" rx="2"
          fill={`${ac}33`} stroke={`${ac}88`} strokeWidth="1.2"/>
      ))}
      {/* Inner ward */}
      <rect x="75" y="72" width="80" height="68" rx="2"
        fill="rgba(40,35,18,0.15)" stroke={`${ac}44`} strokeWidth="1.5" strokeDasharray="4,3"/>
      {/* King's Gate — north, the elaborate one */}
      <rect x="90" y="48" width="40" height="12" rx="1"
        fill={sel==="kg"?"rgba(201,168,76,0.5)":"rgba(201,168,76,0.2)"}
        stroke={`${ac}99`} strokeWidth="2.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("kg")}/>
      <text x="110" y="45" textAnchor="middle" fill={`${ac}88`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("kg")}>KÖNIGSTOR</text>
      {/* Water gate — south, sea supply */}
      <rect x="90" y="153" width="40" height="12" rx="1"
        fill={sel==="wg2"?"rgba(68,136,204,0.5)":"rgba(68,136,204,0.22)"}
        stroke="#4488cc" strokeWidth="2.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("wg2")}/>
      <text x="110" y="175" textAnchor="middle" fill="#4488cc" fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("wg2")}>Hafentor (Seeversorgung)</text>
      {/* Well */}
      <circle cx="110" cy="105" r="6" fill="rgba(68,136,204,0.2)" stroke="#4488cc" strokeWidth="0.8"/>
      <text x="110" y="108" textAnchor="middle" fill="rgba(68,136,204,0.5)" fontSize="7">Brunnen</text>
      {/* Compass + title */}
      <text x="196" y="35" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="196" y1="38" x2="196" y2="53" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="110" y="197" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">CAERNARVON CASTLE</text>
    </g>
  ),

  windsor: ({ac,sel,onZone}) => (
    <g>
      {/* Thames river — south */}
      <rect x="0" y="165" width="220" height="35" fill="rgba(22,55,110,0.3)"/>
      <text x="110" y="180" textAnchor="middle" fill="rgba(68,136,204,0.35)" fontSize="9" fontFamily="serif">Themse</text>
      {/* Hill */}
      <ellipse cx="110" cy="105" rx="105" ry="88" fill="rgba(55,65,35,0.14)" stroke="rgba(70,80,40,0.15)" strokeWidth="0.5"/>
      {/* Outer curtain wall */}
      <path d="M 20 60 L 20 160 L 200 160 L 200 60 Z"
        fill={sel==="mt2"?"rgba(204,153,68,0.18)":"rgba(204,153,68,0.06)"}
        stroke={`${ac}66`} strokeWidth="4.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("mt2")}/>
      {/* Wall towers along perimeter */}
      {[[20,60],[60,60],[110,60],[160,60],[200,60],[200,110],[200,160],[160,160],[110,160],[60,160],[20,160],[20,110]].map(([x,y],i)=>(
        <rect key={i} x={x-5} y={y-5} width="10" height="10" rx="1" fill={`${ac}33`} stroke={`${ac}77`} strokeWidth="0.7"/>
      ))}
      {/* Lower Ward */}
      <rect x="22" y="62" width="82" height="96"
        fill={sel==="la"?"rgba(153,119,51,0.22)":"rgba(153,119,51,0.07)"}
        stroke={`${ac}77`} strokeWidth="3"
        style={{cursor:"pointer"}} onClick={()=>onZone("la")}/>
      <text x="63" y="112" textAnchor="middle" fill={`${ac}66`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("la")}>LOWER</text>
      <text x="63" y="120" textAnchor="middle" fill={`${ac}66`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("la")}>WARD</text>
      {/* St George's Chapel */}
      <rect x="30" y="72" width="65" height="30" rx="2" fill="rgba(201,168,76,0.12)" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="62" y="91" textAnchor="middle" fill={`${ac}55`} fontSize="8">St. George's Chapel</text>
      {/* Round Tower — Motte, center */}
      <circle cx="110" cy="110" r="20"
        fill={sel==="rn"?"rgba(204,153,68,0.48)":"rgba(204,153,68,0.18)"}
        stroke={`${ac}cc`} strokeWidth="4"
        style={{cursor:"pointer"}} onClick={()=>onZone("rn")}/>
      <circle cx="110" cy="110" r="13" fill="rgba(30,22,8,0.5)" stroke={`${ac}44`} strokeWidth="0.8"/>
      <text x="110" y="107" textAnchor="middle" fill={`${ac}99`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("rn")}>ROUND</text>
      <text x="110" y="115" textAnchor="middle" fill={`${ac}99`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("rn")}>TOWER</text>
      {/* Upper Ward */}
      <rect x="116" y="62" width="82" height="96"
        fill={sel==="ua"?"rgba(204,153,68,0.22)":"rgba(204,153,68,0.07)"}
        stroke={`${ac}77`} strokeWidth="3"
        style={{cursor:"pointer"}} onClick={()=>onZone("ua")}/>
      <text x="157" y="112" textAnchor="middle" fill={`${ac}66`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ua")}>UPPER</text>
      <text x="157" y="120" textAnchor="middle" fill={`${ac}66`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ua")}>WARD</text>
      {/* State apartments */}
      <rect x="124" y="70" width="66" height="35" rx="2" fill="rgba(201,168,76,0.1)" stroke={`${ac}33`} strokeWidth="0.8"/>
      <text x="157" y="91" textAnchor="middle" fill={`${ac}44`} fontSize="8">Staatsgemächer</text>
      {/* Compass + title */}
      <text x="196" y="25" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="196" y1="28" x2="196" y2="43" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="110" y="197" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">WINDSOR CASTLE</text>
    </g>
  ),

  bodiam: ({ac,sel,onZone}) => (
    <g>
      {/* Wide moat — completely surrounding */}
      <ellipse cx="110" cy="105" rx="108" ry="95"
        fill={sel==="wm"?"rgba(30,80,150,0.45)":"rgba(22,60,130,0.28)"}
        stroke="#4488bb" strokeWidth="3"
        style={{cursor:"pointer"}} onClick={()=>onZone("wm")}/>
      {/* Moat ripples */}
      {[88,74,60].map(rx=><ellipse key={rx} cx="110" cy="105" rx={rx} ry={rx*0.88} fill="none" stroke="rgba(68,136,204,0.12)" strokeWidth="0.5" strokeDasharray="3,3"/>)}
      <text x="25" y="65" fill="rgba(68,136,204,0.4)" fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("wm")}>WASSER-</text>
      <text x="25" y="73" fill="rgba(68,136,204,0.4)" fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("wm")}>GRABEN</text>
      {/* Castle — near-square with 4 corner towers */}
      <rect x="68" y="64" width="84" height="82" rx="2"
        fill={sel==="bk"?"rgba(201,168,76,0.22)":"rgba(201,168,76,0.08)"}
        stroke={`${ac}bb`} strokeWidth="5.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("bk")}/>
      {/* 4 corner towers — large round */}
      {[[68,64],[152,64],[68,146],[152,146]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="14"
          fill={sel==="bk"?"rgba(201,168,76,0.35)":"rgba(201,168,76,0.14)"}
          stroke={`${ac}cc`} strokeWidth="3"
          style={{cursor:"pointer"}} onClick={()=>onZone("bk")}/>
      ))}
      {/* Inner courtyard */}
      <rect x="84" y="80" width="52" height="50" fill="rgba(40,35,15,0.2)" stroke={`${ac}22`} strokeWidth="0.8"/>
      {/* Well */}
      <circle cx="110" cy="105" r="5" fill="rgba(68,136,204,0.2)" stroke="#4488cc" strokeWidth="0.8"/>
      <text x="110" y="107" textAnchor="middle" fill="rgba(68,136,204,0.5)" fontSize="7">Brunnen</text>
      {/* Barbican — south gate approach */}
      <rect x="96" y="144" width="28" height="22" rx="1"
        fill={sel==="bb"?"rgba(201,168,76,0.45)":"rgba(201,168,76,0.18)"}
        stroke={`${ac}99`} strokeWidth="2.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("bb")}/>
      <text x="110" y="158" textAnchor="middle" fill={`${ac}88`} fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("bb")}>Barba-</text>
      <text x="110" y="165" textAnchor="middle" fill={`${ac}88`} fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("bb")}>kane</text>
      {/* Postern gate north */}
      <rect x="96" y="64" width="28" height="10" rx="1" fill={`${ac}44`} stroke={`${ac}77`} strokeWidth="1.5"/>
      <text x="110" y="60" textAnchor="middle" fill={`${ac}55`} fontSize="8">Nordtor</text>
      {/* Compass + title */}
      <text x="194" y="22" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="194" y1="25" x2="194" y2="40" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="110" y="197" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">BODIAM CASTLE</text>
    </g>
  ),

  rhodes: ({ac,sel,onZone}) => (
    <g>
      {/* Sea surrounding island */}
      <rect x="0" y="0" width="220" height="200" fill="rgba(22,55,110,0.28)"/>
      {/* Harbor — east */}
      <ellipse cx="190" cy="105" rx="35" ry="50" fill="rgba(25,65,130,0.45)" stroke="rgba(40,90,170,0.3)" strokeWidth="1"/>
      <text x="190" y="102" textAnchor="middle" fill="rgba(68,136,204,0.4)" fontSize="8" fontFamily="serif">Hafen</text>
      {/* Island terrain */}
      <path d="M 15 30 L 10 170 L 175 180 L 185 30 Z" fill="rgba(80,68,40,0.35)" stroke="rgba(100,82,48,0.4)" strokeWidth="1"/>
      {/* Sea wall */}
      <rect x="168" y="40" width="12" height="142"
        fill={sel==="sm2"?"rgba(68,136,204,0.5)":"rgba(68,136,204,0.22)"}
        stroke="#4488cc" strokeWidth="2.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("sm2")}/>
      <text x="163" y="35" fill="#4488cc" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("sm2")}>Seemauer</text>
      {/* Deep moat — land side (north) */}
      <rect x="15" y="30" width="155" height="15"
        fill={sel==="gv"?"rgba(50,80,60,0.5)":"rgba(40,65,48,0.28)"}
        stroke="rgba(60,100,72,0.45)" strokeWidth="2.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("gv")}/>
      <text x="93" y="42" textAnchor="middle" fill="rgba(60,140,90,0.6)" fontSize="8" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("gv")}>GRABEN — 17m TIEF (aus Fels gehauen)</text>
      {/* Outer bastions */}
      <path d="M 15 45 L 15 170 L 168 172 L 168 45 Z"
        fill={sel==="bm"?"rgba(139,112,64,0.22)":"rgba(139,112,64,0.08)"}
        stroke={`${ac}77`} strokeWidth="4.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("bm")}/>
      {/* Bastion bulwarks — along walls */}
      {[35,65,95,125,155].map((x,i)=>(
        <path key={i} d={`M ${x} 43 L ${x-8} 56 L ${x+8} 56 Z`}
          fill={`${ac}44`} stroke={`${ac}88`} strokeWidth="0.8"/>
      ))}
      {[45,75,105,135].map((x,i)=>(
        <path key={i} d={`M ${x} 170 L ${x-8} 157 L ${x+8} 157 Z`}
          fill={`${ac}44`} stroke={`${ac}88`} strokeWidth="0.8"/>
      ))}
      <text x="90" y="120" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("bm")}>BASTION-MAUERSYSTEM</text>
      {/* Collachium — Johanniter quarter */}
      <rect x="22" y="55" width="72" height="80" rx="2"
        fill={sel==="cz"?"rgba(201,168,76,0.3)":"rgba(201,168,76,0.1)"}
        stroke={`${ac}cc`} strokeWidth="4"
        style={{cursor:"pointer"}} onClick={()=>onZone("cz")}/>
      {/* Inns of the Tongues */}
      {["France","England","Germany","Spain"].map((t,i)=>(
        <rect key={i} x={28+i*16} y={62} width="12" height="18" rx="1"
          fill={`${ac}12`} stroke={`${ac}33`} strokeWidth="0.5"/>
      ))}
      <text x="58" y="110" textAnchor="middle" fill={`${ac}88`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("cz")}>COLLACHIUM</text>
      <text x="58" y="119" textAnchor="middle" fill={`${ac}55`} fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("cz")}>(Johanniterquartier)</text>
      {/* Gun placement — land side */}
      <circle cx="90" cy="52" r="7"
        fill={sel==="ko"?"rgba(204,85,53,0.5)":"rgba(204,85,53,0.2)"}
        stroke="#cc4433" strokeWidth="1.8"
        style={{cursor:"pointer"}} onClick={()=>onZone("ko")}/>
      <text x="90" y="46" textAnchor="middle" fill="#cc4433" fontSize="8" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("ko")}>⚠</text>
      <text x="90" y="36" textAnchor="middle" fill="rgba(204,68,53,0.5)" fontSize="7">Kanonen</text>
      {/* Compass + title */}
      <text x="10" y="22" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="10" y1="25" x2="10" y2="40" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="90" y="197" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">RHODOS — JOHANNITERBURG</text>
    </g>
  ),

  persepolis: ({ac,sel,onZone}) => (
    <g>
      {/* Desert terrain */}
      <rect x="0" y="0" width="220" height="200" fill="rgba(100,80,35,0.2)"/>
      {/* The artificial terrace — the defining feature */}
      <path d="M 15 190 L 15 100 L 205 100 L 205 190 Z" fill="rgba(140,105,50,0.3)" stroke="rgba(160,120,55,0.35)" strokeWidth="1.5"/>
      {/* Terrace edge lines */}
      <line x1="15" y1="100" x2="205" y2="100" stroke={`${ac}55`} strokeWidth="3"/>
      <text x="25" y="96" fill={`${ac}44`} fontSize="8">Terrasse — 12m hoch</text>
      {/* Terrace fill zone */}
      <rect x="15" y="100" width="190" height="90"
        fill={sel==="tf"?"rgba(153,119,51,0.28)":"rgba(153,119,51,0.1)"}
        stroke={`${ac}66`} strokeWidth="2"
        style={{cursor:"pointer"}} onClick={()=>onZone("tf")}/>
      {/* Stairway — both sides */}
      <path d="M 15 100 L 15 160 L 35 160 L 35 100" fill="rgba(160,125,55,0.25)" stroke={`${ac}55`} strokeWidth="1.2"/>
      <path d="M 185 100 L 185 160 L 205 160 L 205 100" fill="rgba(160,125,55,0.25)" stroke={`${ac}55`} strokeWidth="1.2"/>
      <text x="25" y="130" fill={`${ac}44`} fontSize="7" transform="rotate(90 25 130)">Treppe</text>
      {/* Gate of All Nations */}
      <rect x="90" y="100" width="40" height="18" rx="2"
        fill={sel==="gp"?"rgba(201,168,76,0.5)":"rgba(201,168,76,0.2)"}
        stroke={`${ac}aa`} strokeWidth="2.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("gp")}/>
      {/* Lamassu bulls flanking gate */}
      <text x="83" y="112" fontSize="8" fill="rgba(201,168,76,0.35)">🐂</text>
      <text x="126" y="112" fontSize="8" fill="rgba(201,168,76,0.35)">🐂</text>
      <text x="110" y="113" textAnchor="middle" fill={`${ac}88`} fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("gp")}>ALLER-VÖLKER-TOR</text>
      {/* Apadana — the great throne hall */}
      <rect x="40" y="120" width="80" height="55" rx="2"
        fill={sel==="ap"?"rgba(221,170,68,0.42)":"rgba(221,170,68,0.15)"}
        stroke="#ddaa44" strokeWidth="3"
        style={{cursor:"pointer"}} onClick={()=>onZone("ap")}/>
      {/* 72 columns in grid */}
      {Array.from({length:4},(_,ci)=>Array.from({length:3},(_,ri)=>(
        <circle key={`${ci}${ri}`} cx={52+ci*22} cy={132+ri*18} r="4"
          fill={`${ac}44`} stroke={`${ac}77`} strokeWidth="0.7"/>
      ))).flat()}
      <text x="80" y="150" textAnchor="middle" fill="#ddaa44" fontSize="10" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ap")}>APADANA</text>
      <text x="80" y="159" textAnchor="middle" fill="rgba(221,170,68,0.6)" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("ap")}>(Thronsaal)</text>
      {/* Treasury */}
      <rect x="130" y="130" width="60" height="48" rx="2"
        fill={sel==="tr"?"rgba(255,200,50,0.38)":"rgba(255,200,50,0.12)"}
        stroke="#ffcc33" strokeWidth="2.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("tr")}/>
      <text x="160" y="155" textAnchor="middle" fill="#ffcc33" fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("tr")}>SCHATZKAMMER</text>
      <text x="160" y="164" textAnchor="middle" fill="rgba(255,200,50,0.55)" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("tr")}>💰</text>
      {/* Palace of Darius */}
      <rect x="40" y="178" width="50" height="15" rx="1" fill="rgba(201,168,76,0.1)" stroke={`${ac}44`} strokeWidth="0.8"/>
      <text x="65" y="188" textAnchor="middle" fill={`${ac}44`} fontSize="8">Darius-Palast</text>
      {/* Compass + title */}
      <text x="196" y="22" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="196" y1="25" x2="196" y2="40" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="110" y="97" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">PERSEPOLIS — 518 v.Chr.</text>
    </g>
  ),

  great_wall: ({ac,sel,onZone}) => (
    <g>
      {/* Gobi desert — north */}
      <rect x="0" y="0" width="220" height="80" fill="rgba(120,95,48,0.2)"/>
      <text x="110" y="30" textAnchor="middle" fill="rgba(150,120,55,0.28)" fontSize="11" fontFamily="serif">GOBI-WÜSTE — MONGOLISCHES REICH</text>
      {/* Chinese heartland — south */}
      <rect x="0" y="130" width="220" height="70" fill="rgba(48,68,35,0.2)"/>
      <text x="110" y="170" textAnchor="middle" fill="rgba(60,90,40,0.28)" fontSize="11" fontFamily="serif">MING-CHINA</text>
      {/* Mountain passes flanking */}
      <path d="M 0 0 L 0 200 L 25 200 L 25 0 Z" fill="rgba(80,68,45,0.4)"/>
      <path d="M 195 0 L 220 0 L 220 200 L 195 200 Z" fill="rgba(80,68,45,0.4)"/>
      {/* THE GREAT WALL */}
      <rect x="25" y="88" width="170" height="16"
        fill={sel==="mm"?"rgba(170,136,68,0.45)":"rgba(170,136,68,0.2)"}
        stroke={`${ac}cc`} strokeWidth="5.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("mm")}/>
      {/* Battlements top */}
      {Array.from({length:20},(_,i)=><rect key={i} x={28+i*8} y="83" width="5" height="7" fill={`${ac}77`}/>)}
      {/* Watchtowers every ~200m */}
      {[35,62,89,116,143,170].map((x,i)=>(
        <rect key={i} x={x-8} y="76" width="16" height="28" rx="1"
          fill={sel==="wt3"?"rgba(201,168,76,0.45)":"rgba(201,168,76,0.2)"}
          stroke={`${ac}bb`} strokeWidth="2"
          style={{cursor:"pointer"}} onClick={()=>onZone("wt3")}/>
      ))}
      <text x="110" y="100" textAnchor="middle" fill={`${ac}ee`} fontSize="11" fontFamily="serif" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("mm")}>GROSSE MAUER</text>
      <text x="110" y="109" textAnchor="middle" fill={`${ac}77`} fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("mm")}>9m hoch · 5m breit · 20.000km</text>
      {/* Jiayuguan Fort — the western terminus */}
      <rect x="78" y="58" width="64" height="72" rx="2"
        fill={sel==="jg"?"rgba(204,170,85,0.42)":"rgba(204,170,85,0.15)"}
        stroke={`${ac}cc`} strokeWidth="4"
        style={{cursor:"pointer"}} onClick={()=>onZone("jg")}/>
      {[[78,58],[142,58],[78,130],[142,130]].map(([x,y],i)=>(
        <rect key={i} x={x-7} y={y-7} width="14" height="14" rx="2"
          fill={`${ac}44`} stroke={`${ac}99`} strokeWidth="1.2"/>
      ))}
      <text x="110" y="90" textAnchor="middle" fill={`${ac}99`} fontSize="10" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("jg")}>JIAYUGUAN-</text>
      <text x="110" y="98" textAnchor="middle" fill={`${ac}99`} fontSize="10" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("jg")}>FORT</text>
      {/* Desert path — bypass route (weakness) */}
      <path d="M 5 45 Q 15 65 25 88" stroke="#cc4444" strokeWidth="2" strokeDasharray="3,2" opacity="0.5"/>
      <circle cx="5" cy="45" r="8" fill="rgba(204,68,68,0.25)" stroke="#cc4444" strokeWidth="1.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("ds")}/>
      <text x="5" y="43" textAnchor="middle" fill="#cc4444" fontSize="10" fontWeight="bold"
        style={{cursor:"pointer"}} onClick={()=>onZone("ds")}>⚠</text>
      <text x="5" y="34" fill="rgba(204,68,68,0.5)" fontSize="8">Wüsten-</text>
      <text x="5" y="41" fill="rgba(204,68,68,0.5)" fontSize="8">umgehung</text>
      {/* Signal fire system */}
      {[35,62,89,116,143,170].map((x,i)=>(
        <text key={i} x={x} y="75" textAnchor="middle" fill="rgba(255,150,30,0.4)" fontSize="10">🔥</text>
      ))}
      {/* Compass + title */}
      <text x="196" y="145" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="196" y1="148" x2="196" y2="163" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="110" y="197" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">GROSSE MAUER — JIAYUGUAN</text>
    </g>
  ),

  angkor: ({ac,sel,onZone}) => (
    <g>
      {/* Jungle surround */}
      <rect x="0" y="0" width="220" height="200" fill="rgba(30,55,20,0.3)"/>
      {/* Outer moat — 10km, huge */}
      <ellipse cx="110" cy="103" rx="108" ry="95"
        fill={sel==="mg"?"rgba(30,100,80,0.42)":"rgba(22,80,65,0.25)"}
        stroke="#4488aa" strokeWidth="3.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("mg")}/>
      {/* Moat ripples */}
      {[90,78,66].map(rx=><ellipse key={rx} cx="110" cy="103" rx={rx} ry={rx*0.88} fill="none" stroke="rgba(40,120,90,0.15)" strokeWidth="0.5" strokeDasharray="3,4"/>)}
      <text x="20" y="40" fill="rgba(40,120,90,0.45)" fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("mg")}>10km WASSERGRABEN</text>
      {/* Jungle zone */}
      <ellipse cx="110" cy="103" rx="78" ry="68"
        fill={sel==="dj"?"rgba(30,80,25,0.35)":"rgba(22,65,18,0.18)"}
        stroke="rgba(40,100,32,0.4)" strokeWidth="2" strokeDasharray="4,3"
        style={{cursor:"pointer"}} onClick={()=>onZone("dj")}/>
      <text x="170" y="70" fill="rgba(40,100,32,0.45)" fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("dj")}>Dschungel</text>
      {/* Temple complex */}
      <ellipse cx="110" cy="103" rx="55" ry="48"
        fill={sel==="tp"?"rgba(170,140,85,0.3)":"rgba(170,140,85,0.1)"}
        stroke={`${ac}88`} strokeWidth="4"
        style={{cursor:"pointer"}} onClick={()=>onZone("tp")}/>
      {/* Concentric galleries */}
      {[42,30,18].map(rx=><ellipse key={rx} cx="110" cy="103" rx={rx} ry={rx*0.88} fill="none" stroke={`${ac}33`} strokeWidth="1"/>)}
      <text x="110" y="80" textAnchor="middle" fill={`${ac}66`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("tp")}>TEMPELGALERIEN</text>
      {/* Angkor Thom — central city */}
      <rect x="84" y="82" width="52" height="42" rx="2"
        fill={sel==="ak"?"rgba(204,170,85,0.42)":"rgba(204,170,85,0.15)"}
        stroke={`${ac}cc`} strokeWidth="3.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("ak")}/>
      {/* Central tower (Bayon) */}
      <circle cx="110" cy="103" r="12" fill="rgba(204,170,85,0.3)" stroke={`${ac}99`} strokeWidth="2"/>
      <text x="110" y="100" textAnchor="middle" fill={`${ac}99`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ak")}>ANGKOR</text>
      <text x="110" y="108" textAnchor="middle" fill={`${ac}99`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ak")}>THOM</text>
      {/* 4 causeways to city */}
      {[[110,55],[110,151],[55,103],[165,103]].map(([x,y],i)=>(
        <line key={i} x1={x} y1={y} x2={110} y2={103} stroke={`${ac}22`} strokeWidth="2" strokeDasharray="4,3"/>
      ))}
      {/* Compass + title */}
      <text x="196" y="22" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="196" y1="25" x2="196" y2="40" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="110" y="197" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">ANGKOR — KHMER-REICH</text>
    </g>
  ),

  gondolin: ({ac,sel,onZone}) => (
    <g>
      {/* Surrounding mountains */}
      <rect x="0" y="0" width="220" height="200" fill="rgba(30,40,55,0.4)"/>
      {/* Encircling mountain wall */}
      <ellipse cx="110" cy="105" rx="108" ry="96" fill="rgba(48,62,78,0.55)" stroke="rgba(60,78,95,0.5)" strokeWidth="1.5"/>
      {/* Mountain peaks */}
      {[[15,80],[40,40],[75,20],[145,18],[180,38],[205,75]].map(([x,y],i)=>(
        <polygon key={i} points={`${x},${y} ${x-20},${y+45} ${x+20},${y+45}`}
          fill="rgba(55,70,88,0.7)" stroke="rgba(70,88,108,0.5)" strokeWidth="0.8"/>
      ))}
      {/* Snow on peaks */}
      {[[15,80],[110,10],[205,75]].map(([x,y],i)=>(
        <polygon key={i} points={`${x},${y} ${x-6},${y+14} ${x+6},${y+14}`} fill="rgba(220,230,240,0.3)"/>
      ))}
      {/* Ered Wethrin zone */}
      <ellipse cx="110" cy="105" rx="96" ry="86"
        fill={sel==="ew"?"rgba(68,88,108,0.3)":"rgba(55,70,88,0.15)"}
        stroke={`${ac}33`} strokeWidth="2" strokeDasharray="5,4"
        style={{cursor:"pointer"}} onClick={()=>onZone("ew")}/>
      <text x="25" y="112" fill={`${ac}33`} fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ew")}>Ered Wethrin</text>
      {/* The hidden valley — Tumladen */}
      <ellipse cx="110" cy="105" rx="68" ry="60" fill="rgba(40,60,45,0.3)" stroke="rgba(55,80,58,0.3)" strokeWidth="0.8"/>
      {/* City walls */}
      <ellipse cx="110" cy="103" rx="48" ry="42"
        fill={sel==="gw"?"rgba(170,187,204,0.28)":"rgba(170,187,204,0.1)"}
        stroke={`${ac}bb`} strokeWidth="5"
        style={{cursor:"pointer"}} onClick={()=>onZone("gw")}/>
      {Array.from({length:10},(_,i)=>{const a=i/10*Math.PI*2;return <rect key={i} x={110+48*Math.cos(a)-4.5} y={103+42*Math.sin(a)-4.5} width="9" height="9" rx="1" fill={`${ac}44`} stroke={`${ac}88`} strokeWidth="0.8" style={{cursor:"pointer"}} onClick={()=>onZone("gw")}/>;}) }
      {/* City interior — the hidden city */}
      <ellipse cx="110" cy="103" rx="36" ry="31" fill="rgba(40,50,35,0.2)" stroke="rgba(80,100,68,0.2)" strokeWidth="0.5"/>
      {/* King's Tower */}
      <rect x="96" y="89" width="28" height="28" rx="2"
        fill={sel==="tk"?"rgba(220,240,255,0.42)":"rgba(220,240,255,0.14)"}
        stroke="#ddeeff" strokeWidth="2.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("tk")}/>
      <text x="110" y="103" textAnchor="middle" fill="#ddeeff" fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("tk")}>TURGONS</text>
      <text x="110" y="111" textAnchor="middle" fill="#ddeeff" fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("tk")}>TURM</text>
      {/* The Secret — Maeglin's betrayal */}
      <circle cx="110" cy="48" r="12"
        fill={sel==="gs"?"rgba(136,136,204,0.55)":"rgba(136,136,204,0.22)"}
        stroke="#8888cc" strokeWidth="2.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("gs")}/>
      <text x="110" y="46" textAnchor="middle" fill="#8888cc" fontSize="10" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("gs")}>⚠</text>
      <text x="110" y="54" textAnchor="middle" fill="#8888cc" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("gs")}>DAS GEHEIMNIS</text>
      <text x="110" y="62" textAnchor="middle" fill="rgba(136,136,204,0.6)" fontSize="7">(Maeglin!)</text>
      {/* Compass + title */}
      <text x="196" y="22" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="196" y1="25" x2="196" y2="40" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="110" y="197" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">GONDOLIN — VERBORGENE STADT</text>
    </g>
  ),

  erebor: ({ac,sel,onZone}) => (
    <g>
      {/* Rocky mountains */}
      <rect x="0" y="0" width="220" height="200" fill="rgba(35,28,18,0.4)"/>
      {/* The Lonely Mountain — vast rock mass */}
      <path d="M 0 200 L 10 150 L 30 100 L 55 60 L 80 35 L 110 10 L 140 35 L 165 60 L 190 100 L 210 150 L 220 200 Z"
        fill="rgba(80,65,40,0.55)" stroke="rgba(100,82,50,0.5)" strokeWidth="1.5"/>
      {/* Rock strata */}
      {[50,70,90,110,130,150,170].map(y=><path key={y} d={`M ${Math.max(0,10+(y-150)*(-0.6))} ${y} L ${Math.min(220,210-(y-150)*(-0.6))} ${y}`} fill="none" stroke="rgba(80,65,40,0.2)" strokeWidth="0.5"/>)}
      {/* Erebor zone — the whole mountain */}
      <path d="M 5 195 L 20 140 L 45 95 L 70 55 L 110 15 L 150 55 L 175 95 L 200 140 L 215 195 Z"
        fill={sel==="em2"?"rgba(74,58,37,0.35)":"transparent"}
        stroke={`${ac}22`} strokeWidth="1.5" strokeDasharray="5,4"
        style={{cursor:"pointer"}} onClick={()=>onZone("em2")}/>
      {/* Great Gate — the front entrance */}
      <rect x="86" y="155" width="48" height="20" rx="2"
        fill={sel==="fg"?"rgba(139,105,20,0.55)":"rgba(139,105,20,0.25)"}
        stroke="#8b6914" strokeWidth="3"
        style={{cursor:"pointer"}} onClick={()=>onZone("fg")}/>
      {/* Gate arch */}
      <path d="M 86 165 Q 110 148 134 165" fill="rgba(30,22,8,0.7)" stroke="#8b6914" strokeWidth="1.5"/>
      <text x="110" y="170" textAnchor="middle" fill="#8b6914" fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("fg")}>VORDERTOR</text>
      <text x="110" y="178" textAnchor="middle" fill="rgba(139,105,20,0.5)" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("fg")}>(einziger Zugang)</text>
      {/* Great Halls — inside mountain */}
      <ellipse cx="110" cy="115" rx="55" ry="38"
        fill={sel==="hh"?"rgba(170,136,64,0.35)":"rgba(170,136,64,0.13)"}
        stroke={`${ac}88`} strokeWidth="3.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("hh")}/>
      {/* Pillars in halls */}
      {[80,96,112,128,144].flatMap((x,i)=>[100,120].map((y,j)=>(
        <circle key={`${i}${j}`} cx={x} cy={y} r="3.5" fill={`${ac}33`} stroke={`${ac}66`} strokeWidth="0.6"/>
      )))}
      <text x="110" y="118" textAnchor="middle" fill={`${ac}77`} fontSize="10" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("hh")}>GROSSE HALLEN</text>
      {/* The treasure chamber */}
      <ellipse cx="110" cy="88" rx="28" ry="22"
        fill={sel==="sm2"?"rgba(232,200,32,0.45)":"rgba(232,200,32,0.15)"}
        stroke="#e8c820" strokeWidth="3"
        style={{cursor:"pointer"}} onClick={()=>onZone("sm2")}/>
      <text x="110" y="86" textAnchor="middle" fill="#e8c820" fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("sm2")}>SCHATZ-</text>
      <text x="110" y="94" textAnchor="middle" fill="#e8c820" fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("sm2")}>KAMMER</text>
      <text x="110" y="102" textAnchor="middle" fill="rgba(232,200,32,0.55)" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("sm2")}>🐉</text>
      {/* Secret door — east, barely visible */}
      <circle cx="172" cy="100" r="9"
        fill={sel==="sd"?"rgba(204,119,51,0.55)":"rgba(204,119,51,0.22)"}
        stroke="#cc7733" strokeWidth="2"
        style={{cursor:"pointer"}} onClick={()=>onZone("sd")}/>
      <text x="172" y="98" textAnchor="middle" fill="#cc7733" fontSize="9" style={{cursor:"pointer"}} onClick={()=>onZone("sd")}>⚠</text>
      <text x="172" y="107" textAnchor="middle" fill="#cc7733" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("sd")}>Seiten-</text>
      <text x="172" y="114" textAnchor="middle" fill="#cc7733" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("sd")}>tür</text>
      {/* Compass + title */}
      <text x="16" y="22" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="16" y1="25" x2="16" y2="40" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="110" y="197" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">EREBOR — DER EINSAME BERG</text>
    </g>
  ),

  isengard: ({ac,sel,onZone}) => (
    <g>
      {/* Surrounding landscape — the valley */}
      <rect x="0" y="0" width="220" height="200" fill="rgba(28,38,22,0.25)"/>
      {/* Fangorn Forest — NE corner, the threat */}
      <path d="M 140 0 L 220 0 L 220 80 L 140 80 Z" fill="rgba(22,55,18,0.55)"/>
      {/* Tree silhouettes */}
      {[[150,10],[165,8],[178,12],[192,8],[205,14],[158,30],[172,28],[186,32],[200,28],[212,32]].map(([x,y],i)=>(
        <polygon key={i} points={`${x},${y} ${x-5},${y+16} ${x+5},${y+16}`} fill="rgba(28,70,20,0.7)"/>
      ))}
      <text x="180" y="55" textAnchor="middle" fill="rgba(40,100,28,0.55)" fontSize="10" fontFamily="serif">FANGORN</text>
      <text x="180" y="63" textAnchor="middle" fill="rgba(40,100,28,0.45)" fontSize="8" fontFamily="serif">WALD</text>
      {/* Fangorn threat marker */}
      <circle cx="145" cy="72" r="10"
        fill={sel==="fn"?"rgba(74,122,51,0.55)":"rgba(74,122,51,0.25)"}
        stroke="#4a7a33" strokeWidth="2"
        style={{cursor:"pointer"}} onClick={()=>onZone("fn")}/>
      <text x="145" y="70" textAnchor="middle" fill="#4a7a33" fontSize="10" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("fn")}>⚠</text>
      <text x="145" y="79" textAnchor="middle" fill="#4a7a33" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("fn")}>Ents!</text>
      {/* River Isen — runs west */}
      <path d="M 0 155 Q 55 148 110 155 Q 165 162 220 155" fill="none" stroke="rgba(68,136,204,0.3)" strokeWidth="3"/>
      <text x="55" y="150" fill="rgba(68,136,204,0.3)" fontSize="8">Fluss Isen</text>
      {/* Outer ring wall — perfectly circular */}
      <circle cx="105" cy="105" r="90"
        fill={sel==="rw"?"rgba(85,102,85,0.22)":"rgba(85,102,85,0.07)"}
        stroke={`${ac}66`} strokeWidth="5"
        style={{cursor:"pointer"}} onClick={()=>onZone("rw")}/>
      {Array.from({length:12},(_,i)=>{const a=i/12*Math.PI*2;return <rect key={i} x={105+90*Math.cos(a)-5} y={105+90*Math.sin(a)-5} width="10" height="10" rx="1" fill={`${ac}33`} stroke={`${ac}77`} strokeWidth="0.7" style={{cursor:"pointer"}} onClick={()=>onZone("rw")}/>;}) }
      <text x="170" y="45" fill={`${ac}44`} fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("rw")}>Ringwall</text>
      {/* Factory complex — inside ring */}
      <ellipse cx="105" cy="112" rx="58" ry="50"
        fill={sel==="fk"?"rgba(68,85,68,0.35)":"rgba(68,85,68,0.14)"}
        stroke={`${ac}88`} strokeWidth="3.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("fk")}/>
      {/* Factory buildings */}
      {[[80,95],[105,88],[130,95],[80,122],[130,122]].map(([x,y],i)=>(
        <rect key={i} x={x-8} y={y-7} width="16" height="14" rx="1" fill="rgba(50,65,50,0.5)" stroke="rgba(70,90,70,0.4)" strokeWidth="0.7"/>
      ))}
      {/* Smoke stacks */}
      {[82,107,132].map((x,i)=><line key={i} x1={x} y1={88-i*5} x2={x} y2={68-i*5} stroke="rgba(80,80,80,0.4)" strokeWidth="1.5"/>)}
      <text x="105" y="116" textAnchor="middle" fill={`${ac}77`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("fk")}>FABRIKEN</text>
      <text x="105" y="124" textAnchor="middle" fill="rgba(100,120,100,0.5)" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("fk")}>(Uruk-hai Produktion)</text>
      {/* Orthanc — THE unbreakable tower */}
      <path d="M 97 85 L 97 55 L 105 42 L 113 55 L 113 85 Z"
        fill={sel==="ot"?"rgba(102,119,102,0.65)":"rgba(102,119,102,0.3)"}
        stroke="#667766" strokeWidth="3"
        style={{cursor:"pointer"}} onClick={()=>onZone("ot")}/>
      <polygon points="105,38 100,56 110,56" fill="#667766" opacity="0.8"/>
      <text x="105" y="72" textAnchor="middle" fill="#667766" fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ot")}>ORTHANC</text>
      <text x="105" y="80" textAnchor="middle" fill="rgba(102,119,102,0.6)" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("ot")}>(unzerstörbar)</text>
      {/* Dam / river control */}
      <rect x="0" y="148" width="25" height="14" rx="1" fill="rgba(68,136,204,0.25)" stroke="#4488cc" strokeWidth="1.5"/>
      <text x="12" y="158" textAnchor="middle" fill="rgba(68,136,204,0.5)" fontSize="7">Damm</text>
      {/* Compass + title */}
      <text x="16" y="22" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="16" y1="25" x2="16" y2="40" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="105" y="197" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">ISENGARD — NAN CURUNÍR</text>
    </g>
  ),

  minas_morgul: ({ac,sel,onZone}) => (
    <g>
      {/* Morgul Vale — poisoned valley */}
      <rect x="0" y="0" width="220" height="200" fill="rgba(15,18,35,0.55)"/>
      {/* Valley walls — mountains */}
      <path d="M 0 0 L 40 0 L 55 200 L 0 200 Z" fill="rgba(22,28,48,0.7)"/>
      <path d="M 165 0 L 220 0 L 220 200 L 165 200 Z" fill="rgba(22,28,48,0.7)"/>
      {/* Poisonous flowers on valley floor */}
      {[60,85,110,135,160].flatMap((x,i)=>[80,110,140,170].map((y,j)=>(
        <circle key={`${i}${j}`} cx={x} cy={y} r="2.5" fill="rgba(200,220,100,0.12)"/>
      )))}
      <text x="110" y="180" textAnchor="middle" fill="rgba(180,200,80,0.2)" fontSize="8" fontFamily="serif">Vergiftetes Tal — weißes Licht</text>
      {/* Moon-white walls — the outer ring */}
      <path d="M 48 35 L 48 165 L 172 165 L 172 35 Z"
        fill={sel==="mw"?"rgba(85,102,170,0.28)":"rgba(85,102,170,0.1)"}
        stroke="#5566aa" strokeWidth="5"
        style={{cursor:"pointer"}} onClick={()=>onZone("mw")}/>
      {/* Glowing wall towers */}
      {Array.from({length:8},(_,i)=>{const a=i/8*Math.PI*2;const x=110+65*Math.cos(a);const y=100+60*Math.sin(a);return <ellipse key={i} cx={x} cy={y} rx="7" ry="5" fill="rgba(150,170,220,0.25)" stroke="#8899cc" strokeWidth="1.2" style={{cursor:"pointer"}} onClick={()=>onZone("mw")}/>;}) }
      <text x="110" y="50" textAnchor="middle" fill="#5566aa" fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("mw")}>MONDWEISSE MAUERN</text>
      {/* Nazgûl Tower */}
      <path d="M 94 90 L 94 55 L 110 40 L 126 55 L 126 90 Z"
        fill={sel==="na"?"rgba(119,119,204,0.55)":"rgba(119,119,204,0.2)"}
        stroke="#7777cc" strokeWidth="3.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("na")}/>
      <polygon points="110,35 104,55 116,55" fill="#7777cc" opacity="0.75"/>
      <text x="110" y="75" textAnchor="middle" fill="#7777cc" fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("na")}>NAZGÛL-</text>
      <text x="110" y="83" textAnchor="middle" fill="#7777cc" fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("na")}>TURM</text>
      {/* Hexenkönig / Witch-king aura */}
      <circle cx="110" cy="67" r="16"
        fill={sel==="hk"?"rgba(153,153,238,0.4)":"rgba(153,153,238,0.1)"}
        stroke={`${ac}88`} strokeWidth="2.5" strokeDasharray="3,2"
        style={{cursor:"pointer"}} onClick={()=>onZone("hk")}/>
      <text x="110" y="64" textAnchor="middle" fill={`${ac}99`} fontSize="8" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("hk")}>HEXEN-</text>
      <text x="110" y="72" textAnchor="middle" fill={`${ac}99`} fontSize="8" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("hk")}>KÖNIG</text>
      {/* Morgul vale / poisoned ground */}
      <rect x="56" y="105" width="108" height="52" rx="2"
        fill={sel==="mt3"?"rgba(50,70,22,0.35)":"rgba(50,70,22,0.15)"}
        stroke="rgba(80,110,35,0.3)" strokeWidth="1.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("mt3")}/>
      <text x="110" y="135" textAnchor="middle" fill="rgba(120,160,50,0.4)" fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("mt3")}>Vergiftetes Tal</text>
      {/* Compass + title */}
      <text x="196" y="22" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="196" y1="25" x2="196" y2="40" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="110" y="196" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">MINAS MORGUL</text>
    </g>
  ),

  angband: ({ac,sel,onZone}) => (
    <g>
      {/* Thangorodrim — the three volcanic peaks */}
      <rect x="0" y="0" width="220" height="200" fill="rgba(18,10,5,0.65)"/>
      {/* Three volcanic peaks */}
      {[[60,5],[110,0],[160,5]].map(([cx,cy],i)=>(
        <g key={i}>
          <polygon points={`${cx},${cy} ${cx-50},${cy+120} ${cx+50},${cy+120}`}
            fill="rgba(60,25,10,0.7)" stroke="rgba(80,32,12,0.55)" strokeWidth="1.5"/>
          {/* Lava glow at top */}
          <circle cx={cx} cy={cy+5} r="8" fill="rgba(180,50,10,0.4)" stroke="rgba(220,80,20,0.4)" strokeWidth="1"/>
          <text x={cx} y={cy+8} textAnchor="middle" fill="rgba(220,80,20,0.5)" fontSize="10">🌋</text>
        </g>
      ))}
      {/* Underground labyrinth — Angband is UNDERGROUND */}
      <ellipse cx="110" cy="145" rx="98" ry="48"
        fill={sel==="df"?"rgba(106,48,24,0.45)":"rgba(80,35,15,0.25)"}
        stroke={`${ac}55`} strokeWidth="3"
        style={{cursor:"pointer"}} onClick={()=>onZone("df")}/>
      {/* Underground level lines */}
      {[130,145,160].map(y=><path key={y} d={`M ${15+(y-130)*0.5} ${y} L ${205-(y-130)*0.5} ${y}`} fill="none" stroke="rgba(80,35,15,0.2)" strokeWidth="0.5"/>)}
      <text x="110" y="148" textAnchor="middle" fill={`${ac}66`} fontSize="10" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("df")}>TIEFE KERKER</text>
      <text x="110" y="157" textAnchor="middle" fill={`${ac}44`} fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("df")}>(unzählige Stockwerke tief)</text>
      {/* Entrance gates */}
      <rect x="86" y="115" width="48" height="14" rx="2"
        fill={sel==="mk"?"rgba(153,34,17,0.55)":"rgba(153,34,17,0.25)"}
        stroke="#992211" strokeWidth="3"
        style={{cursor:"pointer"}} onClick={()=>onZone("mk")}/>
      <text x="110" y="126" textAnchor="middle" fill="#cc3322" fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("mk")}>MORGOTHS THRON</text>
      {/* Balrog guard markers */}
      {[[75,132],[145,132]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="10"
          fill="rgba(200,60,20,0.25)" stroke="rgba(220,80,20,0.4)" strokeWidth="1.5"/>
      ))}
      <text x="75" y="135" textAnchor="middle" fill="rgba(220,80,20,0.6)" fontSize="8">🔥</text>
      <text x="145" y="135" textAnchor="middle" fill="rgba(220,80,20,0.6)" fontSize="8">🔥</text>
      <text x="75" y="146" textAnchor="middle" fill="rgba(200,60,20,0.5)" fontSize="7">Balrog</text>
      <text x="145" y="146" textAnchor="middle" fill="rgba(200,60,20,0.5)" fontSize="7">Balrog</text>
      {/* Morgoth himself */}
      <circle cx="110" cy="130" r="14"
        fill="rgba(153,34,17,0.35)" stroke="#992211" strokeWidth="2.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("mk")}/>
      <text x="110" y="128" textAnchor="middle" fill="#cc3322" fontSize="11" style={{cursor:"pointer"}} onClick={()=>onZone("mk")}>👑</text>
      <text x="110" y="139" textAnchor="middle" fill="rgba(153,34,17,0.7)" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("mk")}>MORGOTH</text>
      {/* Thangorodrim zone */}
      <path d="M 0 0 L 220 0 L 220 120 L 0 120 Z"
        fill={sel==="th"?"rgba(60,25,10,0.25)":"transparent"}
        stroke={`${ac}22`} strokeWidth="1" strokeDasharray="5,4"
        style={{cursor:"pointer"}} onClick={()=>onZone("th")}/>
      <text x="15" y="108" fill={`${ac}33`} fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("th")}>THANGORODRIM</text>
      {/* Compass + title */}
      <text x="196" y="140" textAnchor="middle" fill={`${ac}44`} fontSize="8" fontFamily="serif">N</text>
      <line x1="196" y1="143" x2="196" y2="158" stroke={`${ac}33`} strokeWidth="1"/>
      <text x="110" y="196" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">ANGBAND — ERSTES ZEITALTER</text>
    </g>
  ),

  khazad_dum: ({ac,sel,onZone}) => (
    <g>
      {/* Deep mountain cross-section */}
      <rect x="0" y="0" width="220" height="200" fill="rgba(20,22,32,0.7)"/>
      {/* Mountain peaks above */}
      <path d="M 0 0 L 0 60 Q 55 45 110 50 Q 165 55 220 45 L 220 0 Z"
        fill="rgba(35,40,55,0.65)" stroke="rgba(48,55,70,0.5)" strokeWidth="1"/>
      {/* Underworld levels — Moria goes DEEP */}
      {[55,90,125,160].map((y,i)=><path key={y} d={`M 0 ${y} L 220 ${y}`} fill="none" stroke={`${ac}${['15','12','0e','08'][i]}`} strokeWidth="0.6" strokeDasharray="4,4"/>)}
      {['Obere Ebene','Mittlere Ebene','Tiefe Ebene','Tiefste Ebene'].map((l,i)=>(
        <text key={l} x="8" y={68+i*35} fill={`${ac}${['44','33','28','1e'][i]}`} fontSize="8" fontFamily="serif">{l}</text>
      ))}
      {/* Nebelgebirge zone */}
      <rect x="0" y="0" width="220" height="55"
        fill={sel==="ng"?"rgba(55,60,80,0.35)":"transparent"}
        style={{cursor:"pointer"}} onClick={()=>onZone("ng")}/>
      <text x="110" y="30" textAnchor="middle" fill={`${ac}33`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ng")}>NEBELGEBIRGE — GANZER BERG</text>
      {/* Great Halls — horizontal level */}
      <rect x="30" y="58" width="160" height="60"
        fill={sel==="gh"?"rgba(85,68,48,0.35)":"rgba(85,68,48,0.14)"}
        stroke={`${ac}77`} strokeWidth="3.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("gh")}/>
      {/* Dwarven pillars */}
      {[50,75,100,125,150,175].map((x,i)=>(
        <rect key={i} x={x-4} y="60" width="8" height="56" rx="1"
          fill={`${ac}66`} stroke={`${ac}44`} strokeWidth="0.6"/>
      ))}
      <text x="110" y="92" textAnchor="middle" fill={`${ac}66`} fontSize="10" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("gh")}>GROSSE HALLEN</text>
      <text x="110" y="101" textAnchor="middle" fill="rgba(120,100,60,0.4)" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("gh")}>(von Orks besetzt)</text>
      {/* Bridge of Khazad-dûm */}
      <rect x="88" y="118" width="44" height="10" rx="1"
        fill={sel==="bt"?"rgba(102,68,34,0.55)":"rgba(102,68,34,0.28)"}
        stroke="#664422" strokeWidth="2.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("bt")}/>
      {/* Abyss below bridge */}
      <path d="M 88 128 L 88 160 Q 110 170 132 160 L 132 128 Z" fill="rgba(5,5,10,0.8)"/>
      <text x="110" y="148" textAnchor="middle" fill="rgba(10,10,20,0.0)" fontSize="8">∞</text>
      <text x="110" y="123" textAnchor="middle" fill="#664422" fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("bt")}>BRÜCKE von</text>
      <text x="110" y="131" textAnchor="middle" fill="#664422" fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("bt")}>KHAZAD-DÛM</text>
      {/* Durin's Bane — the Balrog far below */}
      <ellipse cx="110" cy="172" rx="40" ry="18"
        fill={sel==="db"?"rgba(180,50,10,0.55)":"rgba(150,38,8,0.28)"}
        stroke="#882222" strokeWidth="2.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("db")}/>
      <text x="110" y="169" textAnchor="middle" fill="#cc3322" fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("db")}>DURINS BANE</text>
      <text x="110" y="178" textAnchor="middle" fill="rgba(200,60,20,0.6)" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("db")}>🔥</text>
      <text x="110" y="188" textAnchor="middle" fill="rgba(200,60,20,0.4)" fontSize="8">(BALROG — wartet)</text>
      {/* East & West gates */}
      <rect x="0" y="75" width="12" height="30" rx="1" fill="rgba(201,168,76,0.3)" stroke={`${ac}66`} strokeWidth="1.5"/>
      <rect x="208" y="75" width="12" height="30" rx="1" fill="rgba(201,168,76,0.3)" stroke={`${ac}66`} strokeWidth="1.5"/>
      <text x="6" y="95" textAnchor="middle" fill={`${ac}55`} fontSize="7" transform="rotate(-90 6 95)">W-Tor</text>
      <text x="214" y="95" textAnchor="middle" fill={`${ac}55`} fontSize="7" transform="rotate(90 214 95)">O-Tor</text>
      {/* Compass + title */}
      <text x="196" y="22" textAnchor="middle" fill={`${ac}44`} fontSize="8" fontFamily="serif">N</text>
      <line x1="196" y1="25" x2="196" y2="40" stroke={`${ac}33`} strokeWidth="1"/>
      <text x="110" y="197" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">KHAZAD-DÛM — MORIA</text>
    </g>
  ),

  edoras: ({ac,sel,onZone}) => (
    <g>
      {/* Rohan plains */}
      <rect x="0" y="0" width="220" height="200" fill="rgba(65,58,28,0.18)"/>
      {/* Plain grass texture */}
      {[30,55,80,105,130,155,180].flatMap(y=>[20,55,90,125,160,195].map(x=>(
        <line key={`${x}${y}`} x1={x} y1={y} x2={x+8} y2={y-6} stroke="rgba(90,80,35,0.12)" strokeWidth="0.4"/>
      )))}
      <text x="30" y="178" fill="rgba(100,90,35,0.25)" fontSize="10" fontFamily="serif">ROHAN — RIDDERMARK</text>
      {/* The hill */}
      <ellipse cx="110" cy="108" rx="88" ry="75" fill="rgba(100,82,40,0.28)" stroke="rgba(120,98,48,0.3)" strokeWidth="1.2"/>
      <ellipse cx="110" cy="106" rx="72" ry="60" fill="rgba(85,70,34,0.2)" stroke="rgba(100,82,40,0.2)" strokeWidth="0.7"/>
      {/* Palisade wall */}
      <ellipse cx="110" cy="105" rx="58" ry="50"
        fill={sel==="pw"?"rgba(122,96,48,0.28)":"rgba(122,96,48,0.1)"}
        stroke={`${ac}66`} strokeWidth="4"
        style={{cursor:"pointer"}} onClick={()=>onZone("pw")}/>
      {/* Palisade stakes */}
      {Array.from({length:20},(_,i)=>{const a=i/20*Math.PI*2;return <line key={i} x1={110+58*Math.cos(a)} y1={105+50*Math.sin(a)} x2={110+52*Math.cos(a)} y2={105+44*Math.sin(a)} stroke={`${ac}55`} strokeWidth="1.2"/>;}) }
      <text x="155" y="80" fill={`${ac}44`} fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("pw")}>Palisade</text>
      {/* Meduseld — the Golden Hall */}
      <rect x="72" y="80" width="76" height="45" rx="3"
        fill={sel==="md2"?"rgba(204,153,51,0.5)":"rgba(204,153,51,0.18)"}
        stroke="#cc9933" strokeWidth="3.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("md2")}/>
      {/* Golden roof ridge */}
      <line x1="72" y1="88" x2="148" y2="88" stroke="#cc9933" strokeWidth="2.5" opacity="0.7"/>
      {/* Roof pillars */}
      {[80,96,112,128,140].map((x,i)=><line key={i} x1={x} y1="80" x2={x} y2="125" stroke="#cc9933" strokeWidth="1" opacity="0.4"/>)}
      <text x="110" y="100" textAnchor="middle" fill="#cc9933" fontSize="11" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("md2")}>MEDUSELD</text>
      <text x="110" y="110" textAnchor="middle" fill="rgba(204,153,51,0.7)" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("md2")}>(Goldene Halle)</text>
      {/* Théoden's throne */}
      <rect x="99" y="84" width="22" height="15" rx="1" fill="rgba(232,200,80,0.2)" stroke="rgba(232,200,80,0.4)" strokeWidth="0.8"/>
      <text x="110" y="94" textAnchor="middle" fill="rgba(232,200,80,0.5)" fontSize="7">Thron</text>
      {/* Rohirrim cavalry strength indicator */}
      <ellipse cx="40" cy="105" rx="28" ry="20"
        fill={sel==="ro"?"rgba(204,153,51,0.35)":"rgba(204,153,51,0.12)"}
        stroke="#cc9933" strokeWidth="2"
        style={{cursor:"pointer"}} onClick={()=>onZone("ro")}/>
      <text x="40" y="102" textAnchor="middle" fill="#cc9933" fontSize="11" style={{cursor:"pointer"}} onClick={()=>onZone("ro")}>🐎</text>
      <text x="40" y="116" textAnchor="middle" fill="#cc9933" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("ro")}>Rohirrim</text>
      {/* Main gate */}
      <rect x="96" y="152" width="28" height="10" rx="1" fill={`${ac}44`} stroke={`${ac}77`} strokeWidth="1.5"/>
      <text x="110" y="168" textAnchor="middle" fill={`${ac}55`} fontSize="8" fontFamily="serif">Haupttor</text>
      {/* Compass + title */}
      <text x="196" y="22" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="196" y1="25" x2="196" y2="40" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="110" y="197" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">EDORAS — GOLDENE HALLE</text>
    </g>
  ),

  winterfell: ({ac,sel,onZone}) => (
    <g>
      {/* Northern landscape — snow */}
      <rect x="0" y="0" width="220" height="200" fill="rgba(18,25,38,0.3)"/>
      {/* Snow texture */}
      {[20,45,70,95,120,145,170,195].flatMap(y=>[15,50,85,120,155,190].map(x=>(
        <circle key={`${x}${y}`} cx={x} cy={y} r="1" fill="rgba(200,210,220,0.08)"/>
      )))}
      <text x="110" y="185" textAnchor="middle" fill="rgba(180,195,210,0.2)" fontSize="10" fontFamily="serif">DER NORDEN — WESTEROS</text>
      {/* Hot springs — heat lines under ground */}
      <path d="M 20 180 Q 60 172 100 176 Q 140 180 180 174" fill="none" stroke="rgba(180,100,40,0.2)" strokeWidth="1" strokeDasharray="3,3"/>
      <text x="100" y="178" textAnchor="middle" fill="rgba(180,100,40,0.3)" fontSize="8">Heiße Quellen (wärmt Mauern)</text>
      {/* Outer ward */}
      <rect x="18" y="22" width="184" height="148"
        fill={sel==="ow3"?"rgba(102,119,136,0.22)":"rgba(102,119,136,0.08)"}
        stroke={`${ac}66`} strokeWidth="4.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("ow3")}/>
      {/* Wall towers */}
      {[[18,22],[110,22],[202,22],[202,96],[202,170],[110,170],[18,170],[18,96]].map(([x,y],i)=>(
        <rect key={i} x={x-6} y={y-6} width="12" height="12" rx="1" fill={`${ac}33`} stroke={`${ac}77`} strokeWidth="0.8"/>
      ))}
      <text x="150" y="38" fill={`${ac}44`} fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ow3")}>Äußerer Ring</text>
      {/* Inner ward */}
      <rect x="48" y="48" width="124" height="96"
        fill={sel==="iw3"?"rgba(136,153,170,0.25)":"rgba(136,153,170,0.08)"}
        stroke={`${ac}aa`} strokeWidth="5"
        style={{cursor:"pointer"}} onClick={()=>onZone("iw3")}/>
      {[[48,48],[110,48],[172,48],[172,96],[172,144],[110,144],[48,144],[48,96]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="8" fill={`${ac}33`} stroke={`${ac}88`} strokeWidth="1"/>
      ))}
      <text x="110" y="75" textAnchor="middle" fill={`${ac}77`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("iw3")}>INNERER RING</text>
      {/* Great Keep — Stark's central hall */}
      <rect x="72" y="64" width="76" height="64" rx="2"
        fill="rgba(100,115,130,0.18)" stroke={`${ac}66`} strokeWidth="2"/>
      {/* Great Hall */}
      <rect x="80" y="72" width="60" height="38" rx="1"
        fill="rgba(80,95,110,0.2)" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="110" y="95" textAnchor="middle" fill={`${ac}77`} fontSize="9" fontFamily="serif">GREAT KEEP</text>
      {/* Godswood */}
      <circle cx="152" cy="110" r="18" fill="rgba(22,55,22,0.3)" stroke="rgba(30,80,30,0.35)" strokeWidth="1.5"/>
      <text x="152" y="107" textAnchor="middle" fill="rgba(40,100,40,0.5)" fontSize="8" fontFamily="serif">Gods-</text>
      <text x="152" y="115" textAnchor="middle" fill="rgba(40,100,40,0.5)" fontSize="8" fontFamily="serif">wood</text>
      {/* Hot springs / heating system */}
      <rect x="56" y="122" width="24" height="14" rx="1"
        fill={sel==="hq"?"rgba(180,100,40,0.45)":"rgba(180,100,40,0.18)"}
        stroke="#cc7744" strokeWidth="1.8"
        style={{cursor:"pointer"}} onClick={()=>onZone("hq")}/>
      <text x="68" y="131" textAnchor="middle" fill="#cc7744" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("hq")}>Quellen</text>
      {/* Crypts — the dangerous weakness */}
      <rect x="78" y="150" width="64" height="14" rx="1"
        fill={sel==="cr"?"rgba(51,68,85,0.55)":"rgba(51,68,85,0.22)"}
        stroke="#334455" strokeWidth="2.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("cr")}/>
      <text x="110" y="160" textAnchor="middle" fill="#556677" fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("cr")}>⚠ CRYPTEN (Untote!)</text>
      {/* Main gate — south */}
      <rect x="96" y="168" width="28" height="10" rx="1" fill={`${ac}44`} stroke={`${ac}77`} strokeWidth="1.5"/>
      <text x="110" y="183" textAnchor="middle" fill={`${ac}55`} fontSize="8" fontFamily="serif">Haupttor</text>
      {/* Compass + title */}
      <text x="196" y="22" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="196" y1="25" x2="196" y2="40" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="110" y="197" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">WINTERFELL</text>
    </g>
  ),

  harrenhal: ({ac,sel,onZone}) => (
    <g>
      {/* Riverlands terrain */}
      <rect x="0" y="0" width="220" height="200" fill="rgba(30,38,22,0.25)"/>
      {/* Gods Eye lake — nearby */}
      <ellipse cx="185" cy="155" rx="35" ry="40" fill="rgba(22,55,110,0.28)" stroke="rgba(30,70,135,0.2)" strokeWidth="0.8"/>
      <text x="185" y="160" textAnchor="middle" fill="rgba(40,90,160,0.25)" fontSize="8">Götterauge</text>
      {/* The outer walls — MASSIVE but half-ruined */}
      <rect x="15" y="15" width="175" height="168"
        fill={sel==="mw2"?"rgba(85,68,40,0.3)":"rgba(85,68,40,0.12)"}
        stroke={`${ac}77`} strokeWidth="5.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("mw2")}/>
      <text x="140" y="32" fill={`${ac}55`} fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("mw2")}>RIESENMAUERN</text>
      {/* Five melted towers — the iconic feature */}
      {[
        {x:35,y:35,label:"Turm I",melted:true},
        {x:90,y:22,label:"Turm II",melted:true},
        {x:155,y:28,label:"Turm III",melted:true},
        {x:175,y:95,label:"Turm IV",melted:false},
        {x:22,y:115,label:"Turm V",melted:true},
      ].map(({x,y,label,melted},i)=>(
        <g key={i} style={{cursor:"pointer"}} onClick={()=>onZone("mt3")}>
          {/* Melted tower — irregular top */}
          {melted
            ? <path d={`M ${x-16} ${y+8} L ${x-18} ${y-14} Q ${x-8} ${y-28} ${x} ${y-32} Q ${x+12} ${y-28} ${x+16} ${y-16} L ${x+16} ${y+8} Z`}
                fill={sel==="mt3"?"rgba(85,51,26,0.55)":"rgba(85,51,26,0.3)"}
                stroke="#553322" strokeWidth="1.8"/>
            : <rect x={x-16} y={y-32} width="32" height="40"
                fill={sel==="mt3"?"rgba(85,51,26,0.45)":"rgba(85,51,26,0.22)"}
                stroke="#553322" strokeWidth="1.8"/>
          }
          <text x={x} y={y+5} textAnchor="middle" fill="rgba(140,80,30,0.55)" fontSize="8" fontFamily="serif">{label}</text>
          {melted&&<text x={x} y={y-2} textAnchor="middle" fill="rgba(200,80,20,0.4)" fontSize="8">🔥</text>}
        </g>
      ))}
      {/* Interior — the vast dark chambers */}
      <rect x="25" y="28" width="155" height="150"
        fill={sel==="dk"?"rgba(68,34,17,0.38)":"rgba(68,34,17,0.15)"}
        stroke={`${ac}33`} strokeWidth="1.5" strokeDasharray="3,3"
        style={{cursor:"pointer"}} onClick={()=>onZone("dk")}/>
      <text x="102" y="100" textAnchor="middle" fill={`${ac}44`} fontSize="10" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("dk")}>DUNKLE KAMMERN</text>
      <text x="102" y="110" textAnchor="middle" fill={`${ac}33`} fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("dk")}>(labyrinthartig)</text>
      {/* The curse marker */}
      <circle cx="102" cy="140" r="16"
        fill={sel==="cr2"?"rgba(136,34,17,0.45)":"rgba(136,34,17,0.18)"}
        stroke="#882211" strokeWidth="2.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("cr2")}/>
      <text x="102" y="137" textAnchor="middle" fill="#cc3322" fontSize="10" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("cr2")}>⚠</text>
      <text x="102" y="148" textAnchor="middle" fill="#882211" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("cr2")}>DER FLUCH</text>
      {/* Main gate */}
      <rect x="88" y="181" width="28" height="10" rx="1" fill={`${ac}44`} stroke={`${ac}77`} strokeWidth="1.5"/>
      <text x="102" y="196" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">HARRENHAL</text>
    </g>
  ),

  kings_landing: ({ac,sel,onZone}) => (
    <g>
      {/* Blackwater Bay — south */}
      <rect x="0" y="148" width="220" height="52" fill="rgba(18,40,90,0.4)"/>
      {/* Water ripples */}
      {[158,168,178].map(y=><path key={y} d={`M 10 ${y} Q 55 ${y-5} 100 ${y} Q 145 ${y+5} 200 ${y}`} fill="none" stroke="rgba(50,100,180,0.2)" strokeWidth="0.8"/>)}
      <text x="110" y="172" textAnchor="middle" fill="rgba(40,90,170,0.35)" fontSize="10" fontFamily="serif">SCHWARZWASSER-BUCHT</text>
      {/* City terrain */}
      <rect x="0" y="0" width="220" height="148" fill="rgba(45,40,25,0.15)"/>
      {/* City walls */}
      <rect x="8" y="8" width="204" height="138"
        fill={sel==="sw2"?"rgba(154,96,48,0.22)":"rgba(154,96,48,0.08)"}
        stroke={`${ac}77`} strokeWidth="5"
        style={{cursor:"pointer"}} onClick={()=>onZone("sw2")}/>
      {/* Wall towers */}
      {[[8,8],[110,8],[212,8],[212,73],[212,146],[110,146],[8,146],[8,73]].map(([x,y],i)=>(
        <rect key={i} x={x-6} y={y-6} width="12" height="12" rx="1" fill={`${ac}33`} stroke={`${ac}77`} strokeWidth="0.8"/>
      ))}
      {/* 3 main gates */}
      <rect x="95" y="6" width="30" height="10" rx="1" fill={`${ac}44`} stroke={`${ac}77`} strokeWidth="1.5"/>
      <text x="110" y="5" textAnchor="middle" fill={`${ac}55`} fontSize="8">King's Gate</text>
      {/* City streets */}
      {[40,70,100,130].map(y=><line key={y} x1="8" y1={y} x2="212" y2={y} stroke={`${ac}07`} strokeWidth="0.5"/>)}
      {[55,110,165].map(x=><line key={x} x1={x} y1="8" x2={x} y2="148" stroke={`${ac}07`} strokeWidth="0.5"/>)}
      {/* Red Keep — on the hill, elevated */}
      <path d="M 60 30 L 60 95 L 145 95 L 145 30 Z"
        fill={sel==="rb"?"rgba(180,68,45,0.42)":"rgba(180,68,45,0.16)"}
        stroke="#cc4422" strokeWidth="4"
        style={{cursor:"pointer"}} onClick={()=>onZone("rb")}/>
      {/* Keep towers */}
      {[[60,30],[102,30],[145,30],[145,62],[145,95],[102,95],[60,95],[60,62]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="7" fill="#cc4422" opacity="0.6"/>
      ))}
      <text x="102" y="58" textAnchor="middle" fill="#cc4422" fontSize="11" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("rb")}>ROTE BURG</text>
      <text x="102" y="68" textAnchor="middle" fill="rgba(200,80,50,0.5)" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("rb")}>(Thronsaal)</text>
      {/* Sept of Baelor */}
      <ellipse cx="168" cy="55" rx="18" ry="14" fill="rgba(200,200,180,0.12)" stroke="rgba(200,200,180,0.25)" strokeWidth="1"/>
      <text x="168" y="58" textAnchor="middle" fill="rgba(200,200,180,0.35)" fontSize="8">Sept</text>
      {/* Dragonpit — north */}
      <ellipse cx="45" cy="55" rx="20" ry="16" fill="rgba(80,60,30,0.2)" stroke="rgba(100,75,35,0.3)" strokeWidth="1"/>
      <text x="45" y="57" textAnchor="middle" fill="rgba(140,100,40,0.4)" fontSize="8">Drachengrube</text>
      {/* Wildfire cache — the dangerous weakness */}
      <circle cx="80" cy="110" r="12"
        fill={sel==="wf"?"rgba(68,204,68,0.5)":"rgba(68,204,68,0.2)"}
        stroke="#44cc44" strokeWidth="2.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("wf")}/>
      <text x="80" y="108" textAnchor="middle" fill="#44cc44" fontSize="10" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("wf")}>⚠</text>
      <text x="80" y="117" textAnchor="middle" fill="#44cc44" fontSize="8" style={{cursor:"pointer"}} onClick={()=>onZone("wf")}>WILDFIRE</text>
      {/* Compass + title */}
      <text x="196" y="22" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="196" y1="25" x2="196" y2="40" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="110" y="196" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">KÖNIGSMUND</text>
    </g>
  ),

  schwarzer_bergfried: ({ac,sel,onZone}) => (
    <g>
      {/* Dark night sky */}
      <rect x="0" y="0" width="220" height="200" fill="rgba(4,4,8,0.95)"/>
      {/* Stars */}
      {[[18,12],[45,8],[72,18],[98,5],[130,14],[158,8],[185,16],[205,10],[12,35],[220,28],[38,45],[168,38]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="0.8" fill="rgba(200,200,220,0.6)"/>
      ))}
      {/* Moon */}
      <circle cx="185" cy="28" r="10" fill="rgba(220,215,190,0.12)" stroke="rgba(220,215,190,0.2)" strokeWidth="0.5"/>

      {/* Valley far below — implied depth */}
      <path d="M 0 185 Q 55 175 110 178 Q 165 181 220 174 L 220 200 L 0 200 Z"
        fill="rgba(15,25,10,0.7)"/>
      <text x="110" y="194" textAnchor="middle" fill="rgba(40,60,30,0.4)" fontSize="8" fontFamily="serif">Tal — 80m tiefer</text>

      {/* The cliff face — black basalt */}
      <path d="M 30 165 L 45 100 L 55 72 L 110 58 L 165 70 L 178 100 L 192 165 Z"
        fill="rgba(12,12,16,0.9)" stroke="rgba(80,80,100,0.4)" strokeWidth="1.5"/>
      {/* Rock strata — barely visible */}
      {[90,110,130,150].map(y=>(
        <path key={y} d={`M ${35+(y-90)*0.25} ${y} L ${185-(y-90)*0.22} ${y}`}
          fill="none" stroke="rgba(50,50,65,0.25)" strokeWidth="0.5"/>
      ))}
      <text x="22" y="130" fill="rgba(60,60,80,0.4)" fontSize="8" fontFamily="serif" transform="rotate(-72 22 130)">BASALT</text>

      {/* Felsplateau zone */}
      <path d="M 45 100 L 55 72 L 110 58 L 165 70 L 178 100 L 175 108 L 45 108 Z"
        fill={sel==="fp"?"rgba(80,80,100,0.3)":"rgba(50,50,68,0.12)"}
        stroke={`${ac}44`} strokeWidth="1.5" strokeDasharray="5,3"
        style={{cursor:"pointer"}} onClick={()=>onZone("fp")}/>
      <text x="110" y="88" textAnchor="middle" fill={`${ac}44`} fontSize="8" fontFamily="serif"
        style={{cursor:"pointer"}} onClick={()=>onZone("fp")}>BASALTFELS 80m</text>

      {/* Underground tunnels hint */}
      <path d="M 115 140 Q 140 145 165 140 Q 175 138 178 130" fill="none"
        stroke={sel==="ug"?"rgba(85,85,105,0.6)":"rgba(55,55,72,0.3)"}
        strokeWidth="2" strokeDasharray="4,3"
        style={{cursor:"pointer"}} onClick={()=>onZone("ug")}/>
      <path d="M 105 145 Q 80 150 55 142 Q 45 138 45 128" fill="none"
        stroke={sel==="ug"?"rgba(85,85,105,0.6)":"rgba(55,55,72,0.3)"}
        strokeWidth="2" strokeDasharray="4,3"
        style={{cursor:"pointer"}} onClick={()=>onZone("ug")}/>
      <text x="110" y="155" textAnchor="middle" fill="rgba(70,70,90,0.4)" fontSize="8" fontFamily="serif"
        style={{cursor:"pointer"}} onClick={()=>onZone("ug")}>? Unterirdische Gänge ?</text>

      {/* Outer wall ring */}
      <path d="M 62 108 L 68 82 L 110 70 L 152 82 L 158 108 Z"
        fill={sel==="or"?"rgba(100,95,55,0.2)":"rgba(70,65,35,0.08)"}
        stroke={`${ac}55`} strokeWidth="3"
        style={{cursor:"pointer"}} onClick={()=>onZone("or")}/>
      {/* Wall towers */}
      {[[68,82],[110,70],[152,82],[158,108],[62,108]].map(([x,y],i)=>(
        <rect key={i} x={x-5} y={y-5} width="10" height="10" rx="1"
          fill="rgba(30,30,40,0.8)" stroke={`${ac}66`} strokeWidth="1"/>
      ))}

      {/* THE TOWER — the centerpiece, tall and black */}
      <rect x="94" y="66" width="32" height="42" rx="1"
        fill={sel==="bt"?"rgba(80,80,100,0.5)":"rgba(8,8,14,0.95)"}
        stroke={`${ac}99`} strokeWidth="2.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("bt")}/>
      {/* Tower battlements */}
      {[94,100,106,112,118,124].map((x,i)=>(
        <rect key={i} x={x} y="60" width="4" height="8" rx="0.5"
          fill="rgba(8,8,14,0.95)" stroke={`${ac}88`} strokeWidth="0.8"/>
      ))}
      {/* Tower windows — glowing faintly */}
      {[[104,78],[112,78],[104,90],[112,90]].map(([x,y],i)=>(
        <rect key={i} x={x} y={y} width="5" height="6" rx="0.5"
          fill="rgba(180,160,80,0.15)" stroke="rgba(180,160,80,0.3)" strokeWidth="0.5"/>
      ))}
      {/* Mysterious inner light glow */}
      <ellipse cx="110" cy="87" rx="12" ry="18" fill="rgba(150,130,60,0.04)"/>
      <text x="110" y="93" textAnchor="middle" fill={`${ac}cc`} fontSize="9" fontFamily="serif"
        fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("bt")}>⬛</text>
      <text x="110" y="104" textAnchor="middle" fill={`${ac}88`} fontSize="7" fontFamily="serif"
        style={{cursor:"pointer"}} onClick={()=>onZone("bt")}>SCHWARZER</text>
      <text x="110" y="112" textAnchor="middle" fill={`${ac}88`} fontSize="7" fontFamily="serif"
        style={{cursor:"pointer"}} onClick={()=>onZone("bt")}>BERGFRIED</text>

      {/* Ordenskammer — hidden, marked with question */}
      <circle cx="80" cy="90" r="10"
        fill={sel==="or"?"rgba(160,140,50,0.3)":"rgba(100,90,30,0.12)"}
        stroke="#aa9944" strokeWidth="1.5" strokeDasharray="3,2"
        style={{cursor:"pointer"}} onClick={()=>onZone("or")}/>
      <text x="80" y="88" textAnchor="middle" fill="#aa9944" fontSize="10"
        style={{cursor:"pointer"}} onClick={()=>onZone("or")}>?</text>
      <text x="80" y="98" textAnchor="middle" fill="rgba(160,140,50,0.5)" fontSize="7"
        style={{cursor:"pointer"}} onClick={()=>onZone("or")}>Orden</text>

      {/* Single path — the only way up */}
      <path d="M 110 180 L 110 168 L 105 158 L 108 148 L 108 125"
        stroke="#cc4444" strokeWidth="2.5" strokeDasharray="4,2" fill="none" opacity="0.6"/>
      <circle cx="110" cy="182" r="8"
        fill={sel==="sp"?"rgba(180,50,30,0.45)":"rgba(150,40,25,0.2)"}
        stroke="#cc4444" strokeWidth="1.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("sp")}/>
      <text x="110" y="180" textAnchor="middle" fill="#cc4444" fontSize="8" fontWeight="bold"
        style={{cursor:"pointer"}} onClick={()=>onZone("sp")}>⚠</text>
      <text x="132" y="170" fill="rgba(180,50,30,0.5)" fontSize="7">Einziger</text>
      <text x="132" y="178" fill="rgba(180,50,30,0.5)" fontSize="7">Pfad ↑</text>

      {/* Order seal watermark */}
      <text x="190" y="168" textAnchor="middle" fill="rgba(138,138,154,0.08)"
        fontSize="28" fontFamily="serif">⬛</text>

      {/* Compass */}
      <text x="196" y="22" textAnchor="middle" fill={`${ac}55`} fontSize="10" fontFamily="serif">N</text>
      <line x1="196" y1="25" x2="196" y2="42" stroke={`${ac}33`} strokeWidth="1"/>
      <text x="110" y="198" textAnchor="middle" fill={`${ac}55`} fontSize="8"
        fontFamily="serif" letterSpacing="2">SCHWARZER BERGFRIED</text>
    </g>
  ),

  castle_sorrow: ({ac,sel,onZone}) => (
    <g>
      {/* parchment-like terrain */}
      <rect x="0" y="0" width="220" height="200" fill="rgba(46,32,18,0.20)"/>
      {[24,40,56,72,88,104,120,136].map(y=>(
        <path key={y} d={`M 0 ${y} Q 55 ${y-8} 110 ${y} Q 165 ${y+8} 220 ${y-2}`} fill="none" stroke="rgba(70,52,30,0.15)" strokeWidth="0.8"/>
      ))}

      {/* outer ring wall, closer to original shape */}
      <path d="M 18 160 Q 6 132 26 98 Q 46 62 82 42 Q 126 20 178 28 Q 205 31 214 54 Q 212 79 201 100 Q 209 128 191 156 Q 171 178 132 184 Q 84 190 48 178 Q 26 170 18 160 Z"
        fill={sel==="am"?"rgba(138,106,63,0.26)":"rgba(98,74,40,0.10)"}
        stroke={`${ac}77`} strokeWidth="5.2"
        style={{cursor:"pointer"}} onClick={()=>onZone("am")}/>
      {[ [20,160],[30,98],[84,42],[178,28],[214,54],[201,100],[191,156],[132,184],[48,178] ].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="5.5" fill={`${ac}30`} stroke={`${ac}88`} strokeWidth="1"/>
      ))}
      <text x="112" y="30" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif"
        style={{cursor:"pointer"}} onClick={()=>onZone("am")}>ÄUSSERE RINGMAUER</text>

      {/* town blocks */}
      {Array.from({length:32},(_,i)=>{
        const col=i%8,row=Math.floor(i/8);
        return <rect key={i} x={38+col*10+(row%2?2:0)} y={126+row*9} width="8" height="6" fill="rgba(90,72,52,0.24)" stroke="rgba(120,92,62,0.22)" strokeWidth="0.4"/>;
      })}

      {/* three inner courtyards */}
      <path d="M 56 108 L 64 66 L 102 58 L 108 104 L 84 118 Z"
        fill={sel==="ub"?"rgba(185,137,82,0.34)":"rgba(140,98,54,0.16)"}
        stroke={`${ac}aa`} strokeWidth="2.8" style={{cursor:"pointer"}} onClick={()=>onZone("ub")}/>
      <text x="82" y="90" textAnchor="middle" fill={`${ac}dd`} fontSize="7.5" fontFamily="serif">UNTERER</text>
      <text x="82" y="98" textAnchor="middle" fill={`${ac}dd`} fontSize="7.5" fontFamily="serif">BURGHOF</text>

      <path d="M 105 110 L 112 62 L 152 58 L 156 110 L 132 124 Z"
        fill={sel==="mb"?"rgba(197,150,88,0.34)":"rgba(150,108,62,0.16)"}
        stroke={`${ac}bb`} strokeWidth="2.8" style={{cursor:"pointer"}} onClick={()=>onZone("mb")}/>
      <text x="132" y="89" textAnchor="middle" fill={`${ac}dd`} fontSize="7.5" fontFamily="serif">MITTLERER</text>
      <text x="132" y="97" textAnchor="middle" fill={`${ac}dd`} fontSize="7.5" fontFamily="serif">BURGHOF</text>

      <path d="M 154 112 L 160 64 L 187 68 L 190 110 L 176 126 Z"
        fill={sel==="ob"?"rgba(216,173,112,0.34)":"rgba(166,122,73,0.18)"}
        stroke={`${ac}cc`} strokeWidth="2.8" style={{cursor:"pointer"}} onClick={()=>onZone("ob")}/>
      <text x="173" y="90" textAnchor="middle" fill={`${ac}dd`} fontSize="7.5" fontFamily="serif">OBERER</text>
      <text x="173" y="98" textAnchor="middle" fill={`${ac}dd`} fontSize="7.5" fontFamily="serif">BURGHOF</text>

      {/* bergfried + chapel zone */}
      <rect x="182" y="84" width="24" height="24" rx="2.5"
        fill={sel==="bf"?"rgba(232,198,138,0.50)":"rgba(192,154,92,0.22)"}
        stroke="#e8c68a" strokeWidth="2.2" style={{cursor:"pointer"}} onClick={()=>onZone("bf")}/>
      <text x="194" y="97" textAnchor="middle" fill="#e8c68a" fontSize="7.5" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("bf")}>BERGFRIED</text>

      {/* harbor quarter */}
      <path d="M 22 162 L 34 152 L 62 160 L 66 180 L 34 186 L 18 176 Z"
        fill={sel==="hf"?"rgba(77,143,191,0.42)":"rgba(60,112,152,0.20)"}
        stroke="#4d8fbf" strokeWidth="2" style={{cursor:"pointer"}} onClick={()=>onZone("hf")}/>
      <text x="42" y="174" textAnchor="middle" fill="#4d8fbf" fontSize="7.2" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("hf")}>HAFEN</text>
      <text x="42" y="181" textAnchor="middle" fill="#4d8fbf" fontSize="7.2" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("hf")}>VIERTEL</text>

      {/* city gate weakness */}
      <rect x="96" y="180" width="36" height="12" rx="2"
        fill={sel==="st"?"rgba(204,85,68,0.45)":"rgba(170,70,58,0.22)"}
        stroke="#cc5544" strokeWidth="1.8" style={{cursor:"pointer"}} onClick={()=>onZone("st")}/>
      <text x="114" y="188" textAnchor="middle" fill="#cc5544" fontSize="7" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("st")}>STADTTOR ⚠</text>

      {/* labels as in provided map style */}
      <text x="125" y="53" textAnchor="middle" fill={`${ac}55`} fontSize="6.8" fontFamily="serif">PALAS · ZEUGHAUS · VOGTEI</text>
      <text x="126" y="122" textAnchor="middle" fill={`${ac}55`} fontSize="6.8" fontFamily="serif">KEMENATE · ZISTERNE · KAPELLE</text>
      <text x="78" y="144" textAnchor="middle" fill={`${ac}55`} fontSize="7" fontFamily="serif">MARKTPLATZ / WERKSTÄTTEN</text>

      {/* Compass + title */}
      <text x="196" y="100" textAnchor="middle" fill={`${ac}55`} fontSize="10" fontFamily="serif">N</text>
      <line x1="196" y1="103" x2="196" y2="120" stroke={`${ac}33`} strokeWidth="1"/>
      <text x="110" y="197" textAnchor="middle" fill={`${ac}55`} fontSize="8"
        fontFamily="serif" letterSpacing="1.6">BURGFESTE DRACHENSTEIN (1150–1580)</text>
    </g>
  ),

  gravecrest: ({ac,sel,onZone}) => (
    <g>
      {/* Mountain landscape */}
      <rect x="0" y="0" width="220" height="200" fill="rgba(8,14,10,0.7)"/>
      {/* Mountain silhouette */}
      <path d="M 0 200 L 0 130 L 30 80 L 60 50 L 95 25 L 110 15 L 125 25 L 160 50 L 190 80 L 220 130 L 220 200 Z"
        fill="rgba(20,35,22,0.75)" stroke="rgba(30,50,32,0.5)" strokeWidth="1"/>
      {/* Snow cap */}
      <path d="M 95 25 L 110 15 L 125 25 L 118 32 L 110 22 L 102 32 Z"
        fill="rgba(200,215,200,0.25)"/>
      {/* Rock texture */}
      {[55,75,95,115,135].map(y=>(
        <path key={y} d={`M ${25+(y-55)*0.6} ${y} L ${195-(y-55)*0.55} ${y}`}
          fill="none" stroke="rgba(30,50,30,0.2)" strokeWidth="0.4"/>
      ))}
      {/* Mountain zone */}
      <path d="M 38 155 L 55 95 L 75 60 L 110 30 L 145 60 L 165 95 L 182 155 Z"
        fill={sel==="bp2"?"rgba(100,160,120,0.2)":"transparent"}
        stroke={`${ac}22`} strokeWidth="1" strokeDasharray="5,4"
        style={{cursor:"pointer"}} onClick={()=>onZone("bp2")}/>
      {/* Castle walls on mountain top */}
      <path d="M 68 125 L 75 90 L 95 68 L 110 58 L 125 68 L 145 90 L 152 125 Z"
        fill={sel==="bp2"?"rgba(100,160,120,0.28)":"rgba(70,110,80,0.1)"}
        stroke={`${ac}99`} strokeWidth="5"
        style={{cursor:"pointer"}} onClick={()=>onZone("bp2")}/>
      {/* Towers on wall */}
      {[[75,90],[110,58],[145,90],[152,125],[68,125]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="7" fill={`${ac}33`} stroke={`${ac}88`} strokeWidth="1.2"
          style={{cursor:"pointer"}} onClick={()=>onZone("bp2")}/>
      ))}
      <text x="110" y="102" textAnchor="middle" fill={`${ac}77`} fontSize="8" fontFamily="serif"
        style={{cursor:"pointer"}} onClick={()=>onZone("bp2")}>GIPFELBURG</text>
      <text x="110" y="112" textAnchor="middle" fill={`${ac}55`} fontSize="7"
        style={{cursor:"pointer"}} onClick={()=>onZone("bp2")}>Sicht auf 3 Festungen</text>
      {/* Inner citadel */}
      <ellipse cx="110" cy="90" rx="20" ry="16"
        fill={sel==="ow2"?"rgba(120,180,140,0.35)":"rgba(90,140,105,0.15)"}
        stroke={`${ac}cc`} strokeWidth="3"
        style={{cursor:"pointer"}} onClick={()=>onZone("ow2")}/>
      <text x="110" y="94" textAnchor="middle" fill={`${ac}99`} fontSize="7" fontFamily="serif"
        style={{cursor:"pointer"}} onClick={()=>onZone("ow2")}>ZITADELLE</text>
      {/* Muster point */}
      <rect x="55" y="110" width="35" height="22" rx="2"
        fill={sel==="rs"?"rgba(90,140,105,0.35)":"rgba(65,105,78,0.15)"}
        stroke={`${ac}77`} strokeWidth="2"
        style={{cursor:"pointer"}} onClick={()=>onZone("rs")}/>
      <text x="72" y="123" textAnchor="middle" fill={`${ac}66`} fontSize="7" fontFamily="serif"
        style={{cursor:"pointer"}} onClick={()=>onZone("rs")}>Sammel-</text>
      <text x="72" y="130" textAnchor="middle" fill={`${ac}66`} fontSize="7" fontFamily="serif"
        style={{cursor:"pointer"}} onClick={()=>onZone("rs")}>punkt</text>
      {/* Signal fire — sees both other castles */}
      <circle cx="162" cy="72" r="10"
        fill={sel==="sf2"?"rgba(200,130,40,0.45)":"rgba(160,100,30,0.2)"}
        stroke="#cc8833" strokeWidth="1.8"
        style={{cursor:"pointer"}} onClick={()=>onZone("sf2")}/>
      <text x="162" y="70" textAnchor="middle" fill="#cc8833" fontSize="9"
        style={{cursor:"pointer"}} onClick={()=>onZone("sf2")}>🔥</text>
      <text x="162" y="80" textAnchor="middle" fill="rgba(200,130,40,0.5)" fontSize="6"
        style={{cursor:"pointer"}} onClick={()=>onZone("sf2")}>Signalfeuer</text>
      {/* Lines to other castles */}
      <path d="M 162 72 L 200 40" stroke="rgba(200,130,40,0.2)" strokeWidth="1" strokeDasharray="3,3"/>
      <text x="178" y="35" fill="rgba(200,130,40,0.3)" fontSize="6">→ C. Sorrow</text>
      <path d="M 162 72 L 130 50" stroke="rgba(200,130,40,0.2)" strokeWidth="1" strokeDasharray="3,3"/>
      <text x="132" y="45" fill="rgba(200,130,40,0.3)" fontSize="6">→ S. B.</text>
      {/* Single path — the weakness */}
      <path d="M 110 175 L 110 162 L 108 150 L 108 138 L 108 125"
        stroke="#cc4444" strokeWidth="2.5" strokeDasharray="4,2" fill="none" opacity="0.6"/>
      <circle cx="110" cy="178" r="10"
        fill={sel==="sp2"?"rgba(180,50,30,0.45)":"rgba(150,40,25,0.2)"}
        stroke="#cc4444" strokeWidth="1.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("sp2")}/>
      <text x="110" y="176" textAnchor="middle" fill="#cc4444" fontSize="9" fontWeight="bold"
        style={{cursor:"pointer"}} onClick={()=>onZone("sp2")}>⚠</text>
      <text x="132" y="168" fill="rgba(180,50,30,0.5)" fontSize="6">Schmaler</text>
      <text x="132" y="176" fill="rgba(180,50,30,0.5)" fontSize="6">Pfad ↑</text>
      {/* Village below */}
      <text x="110" y="194" textAnchor="middle" fill="rgba(40,60,35,0.3)" fontSize="7" fontFamily="serif">Tal — Sorrowland</text>
      {/* Compass + title */}
      <text x="20" y="22" textAnchor="middle" fill={`${ac}55`} fontSize="10" fontFamily="serif">N</text>
      <line x1="20" y1="25" x2="20" y2="42" stroke={`${ac}33`} strokeWidth="1"/>
      <text x="110" y="197" textAnchor="middle" fill={`${ac}55`} fontSize="8"
        fontFamily="serif" letterSpacing="2">GRAVECREST — ORDO CUSTODUM</text>
    </g>
  ),

  // ── MALBORK — Größte Burg der Welt, 3 Burghöfe an der Nogat ──────────────
  malbork: ({ac,sel,onZone}) => (
    <g>
      {/* Terrain */}
      <rect x="4" y="8" width="178" height="184" rx="3" fill="rgba(70,60,28,0.13)"/>
      {/* Nogat River (east) */}
      <rect x="184" y="8" width="32" height="184" rx="2" fill="rgba(34,100,170,0.35)" stroke="#4488cc" strokeWidth="0.8"/>
      {[30,60,90,120,155].map(y=>(
        <path key={y} d={`M 185 ${y} Q 200 ${y+6} 215 ${y}`} fill="none" stroke="#4488cc" strokeWidth="0.5" opacity="0.5"/>
      ))}
      <text x="200" y="105" textAnchor="middle" fill="#4488cc88" fontSize="7" fontFamily="serif" transform="rotate(90,200,105)">NOGAT</text>

      {/* VORBURG — großes äußeres Schloss (Süd) */}
      {sel==="vb"&&<rect x="8" y="105" width="174" height="85" fill={ac} opacity="0.07" filter="url(#glowFilter)"/>}
      <rect x="8" y="105" width="174" height="85" rx="2"
        fill={sel==="vb"?"rgba(160,130,55,0.2)":"rgba(160,130,55,0.08)"}
        stroke={sel==="vb"?`${ac}cc`:`${ac}44`} strokeWidth={sel==="vb"?3.5:2.5}
        style={{cursor:"pointer"}} onClick={()=>onZone("vb")}/>
      {[[8,105],[8,190],[182,105],[182,190],[95,105],[95,190],[8,147],[182,147]].map(([x,y],i)=>(
        <rect key={i} x={x-5} y={y-5} width="10" height="10" rx="1"
          fill={sel==="vb"?`${ac}55`:`${ac}33`} stroke={`${ac}66`} strokeWidth="0.7"/>
      ))}
      <text x="95" y="150" textAnchor="middle" fill={sel==="vb"?ac:`${ac}99`}
        fontSize="11" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("vb")}>VORBURG</text>
      <text x="95" y="162" textAnchor="middle" fill={sel==="vb"?`${ac}bb`:`${ac}66`}
        fontSize="7.5" fontFamily="serif">Äußeres Schloss</text>

      {/* MITTELBURG — mittleres Schloss */}
      {sel==="mb2"&&<rect x="20" y="52" width="152" height="60" fill={ac} opacity="0.08" filter="url(#glowFilter)"/>}
      <rect x="20" y="52" width="152" height="60" rx="2"
        fill={sel==="mb2"?"rgba(201,168,76,0.22)":"rgba(201,168,76,0.09)"}
        stroke={sel==="mb2"?`${ac}ee`:`${ac}77`} strokeWidth={sel==="mb2"?4:3}
        style={{cursor:"pointer"}} onClick={()=>onZone("mb2")}/>
      {[[20,52],[172,52],[20,112],[172,112],[20,82],[172,82],[96,52],[96,112]].map(([x,y],i)=>(
        <rect key={i} x={x-5} y={y-5} width="10" height="10" rx="1"
          fill={sel==="mb2"?`${ac}66`:`${ac}44`} stroke={`${ac}88`} strokeWidth="0.8"/>
      ))}
      {/* Hochmeisterpalast */}
      <rect x="26" y="57" width="44" height="48" rx="1" fill="rgba(201,168,76,0.1)" stroke={`${ac}44`} strokeWidth="0.7"/>
      <text x="48" y="85" textAnchor="middle" fill={`${ac}55`} fontSize="6.5" fontFamily="serif">Hochmeisterpalast</text>
      <text x="118" y="85" textAnchor="middle" fill={sel==="mb2"?ac:`${ac}aa`}
        fontSize="11" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("mb2")}>MITTELBURG</text>

      {/* HOCHBURG — innerstes nördliches Schloss */}
      {sel==="hb2"&&<rect x="33" y="10" width="108" height="48" fill={ac} opacity="0.1" filter="url(#glowFilter)"/>}
      <rect x="33" y="10" width="108" height="48" rx="2"
        fill={sel==="hb2"?"rgba(240,210,96,0.32)":"rgba(240,210,96,0.13)"}
        stroke={sel==="hb2"?"#e8c860cc":`${ac}99`} strokeWidth={sel==="hb2"?4.5:3}
        style={{cursor:"pointer"}} onClick={()=>onZone("hb2")}/>
      {/* Innenhof */}
      <rect x="58" y="20" width="58" height="28" rx="1" fill="rgba(30,22,5,0.45)" stroke={`${ac}22`} strokeWidth="0.5"/>
      {/* Eckturm */}
      {[[33,10],[141,10],[33,58],[141,58]].map(([x,y],i)=>(
        <rect key={i} x={x-6} y={y-6} width="12" height="12" rx="1"
          fill={sel==="hb2"?"#e8c860":"#c9a84c"} opacity={sel==="hb2"?0.85:0.55} stroke="#e8c860" strokeWidth="0.8"/>
      ))}
      {/* St.-Annen-Kapelle */}
      <rect x="118" y="12" width="18" height="16" rx="1" fill="rgba(232,200,96,0.3)" stroke="#e8c860" strokeWidth="1"/>
      <text x="127" y="23" textAnchor="middle" fill="#e8c86077" fontSize="5.5" fontFamily="serif">St. Annen</text>
      <text x="87" y="38" textAnchor="middle" fill={sel==="hb2"?"#e8c860":ac}
        fontSize="11" fontFamily="serif" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("hb2")}>HOCHBURG</text>

      {/* Nogat-Fluss Zone */}
      {sel==="ng2"&&<rect x="165" y="8" width="22" height="184" fill="#4488cc" opacity="0.22" filter="url(#glowFilter)"/>}
      <rect x="180" y="8" width="8" height="184" rx="2"
        fill={sel==="ng2"?"rgba(68,136,204,0.6)":"rgba(68,136,204,0.35)"}
        stroke={sel==="ng2"?"#88ccff":"#4488cc"} strokeWidth={sel==="ng2"?2:1}
        style={{cursor:"pointer"}} onClick={()=>onZone("ng2")}/>

      {/* Kompass + Titel */}
      <g transform="translate(18,20)">
        <circle cx="0" cy="0" r="11" fill="rgba(3,2,1,0.75)" stroke={`${ac}30`} strokeWidth="0.8"/>
        <polygon points="0,-9 -2,-2 2,-2" fill={ac} opacity="0.9"/>
        <polygon points="0,9 -2,2 2,2" fill={`${ac}44`}/>
        <text x="0" y="-11" textAnchor="middle" fill={ac} fontSize="7" fontFamily="'Cinzel',serif" fontWeight="bold">N</text>
      </g>
      <text x="95" y="197" textAnchor="middle" fill={`${ac}55`} fontSize="8" fontFamily="serif" letterSpacing="1.2">MARIENBURG · GEGR. 1274</text>
    </g>
  ),

  // ── BEAUMARIS — Perfekter konzentrischer Grundriss, Edward I., 1295 ────────
  beaumaris: ({ac,sel,onZone}) => (
    <g>
      {/* Meer / Tidenwasser */}
      <rect x="0" y="0" width="220" height="200" fill="rgba(30,60,100,0.2)"/>
      {/* Hafenzugang (Süd) */}
      <rect x="82" y="173" width="56" height="24" rx="3" fill="rgba(34,100,170,0.35)" stroke="#4488cc" strokeWidth="1"/>
      <text x="110" y="187" textAnchor="middle" fill="#4488cc" fontSize="7.5" fontFamily="serif">⚓ Hafentor</text>

      {/* GRABEN + HAFEN */}
      {sel==="gv2"&&<rect x="10" y="10" width="200" height="180" rx="6" fill="#4488cc" opacity="0.12" filter="url(#glowFilter)"/>}
      <rect x="12" y="12" width="196" height="176" rx="5"
        fill={sel==="gv2"?"rgba(34,100,170,0.22)":"rgba(34,100,170,0.12)"}
        stroke={sel==="gv2"?"#66aaddbb":"#4488cc55"} strokeWidth={sel==="gv2"?2:1.5}
        strokeDasharray="8,4"
        style={{cursor:"pointer"}} onClick={()=>onZone("gv2")}/>
      <text x="26" y="34" fill={sel==="gv2"?"#66aadd":"#4488cc88"} fontSize="8" fontFamily="serif"
        style={{cursor:"pointer"}} onClick={()=>onZone("gv2")}>Wassergraben</text>

      {/* ÄUSSERE MAUER (16 Türme) */}
      {sel==="ow3"&&<rect x="25" y="24" width="170" height="152" fill={ac} opacity="0.08" filter="url(#glowFilter)"/>}
      <rect x="25" y="24" width="170" height="152" rx="3"
        fill={sel==="ow3"?"rgba(140,110,45,0.2)":"rgba(140,110,45,0.07)"}
        stroke={sel==="ow3"?`${ac}cc`:`${ac}55`} strokeWidth={sel==="ow3"?5:4}
        style={{cursor:"pointer"}} onClick={()=>onZone("ow3")}/>
      {Array.from({length:16},(_,i)=>{
        const t=i/16; const side=Math.floor(t*4); const p=(t*4)%1;
        let x,y;
        if(side===0){x=25+170*p;y=24;}
        else if(side===1){x=195;y=24+152*p;}
        else if(side===2){x=195-170*p;y=176;}
        else{x=25;y=176-152*p;}
        return <rect key={i} x={x-5.5} y={y-5.5} width="11" height="11" rx="1.5"
          fill={sel==="ow3"?`${ac}66`:`${ac}33`} stroke={sel==="ow3"?`${ac}bb`:`${ac}66`} strokeWidth="0.8"
          style={{cursor:"pointer"}} onClick={()=>onZone("ow3")}/>;
      })}
      <text x="110" y="38" textAnchor="middle" fill={sel==="ow3"?ac:`${ac}99`}
        fontSize="8.5" fontFamily="'Cinzel',serif" style={{cursor:"pointer"}} onClick={()=>onZone("ow3")}>ÄUSSERE MAUER · 16 TÜRME</text>

      {/* Zwinger (Killing ground) */}
      <rect x="52" y="50" width="116" height="100" rx="2" fill="rgba(10,8,3,0.35)" stroke={`${ac}15`} strokeWidth="0.5"/>

      {/* INNERE MAUER (6 Türme) */}
      {sel==="iw"&&<rect x="55" y="52" width="110" height="96" fill={ac} opacity="0.1" filter="url(#glowFilter)"/>}
      <rect x="55" y="52" width="110" height="96" rx="2"
        fill={sel==="iw"?"rgba(201,168,76,0.25)":"rgba(201,168,76,0.1)"}
        stroke={sel==="iw"?`${ac}ff`:`${ac}aa`} strokeWidth={sel==="iw"?5:4}
        style={{cursor:"pointer"}} onClick={()=>onZone("iw")}/>
      {[[55,52],[165,52],[55,148],[165,148],[55,100],[165,100]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={sel==="iw"?8:7}
          fill={sel==="iw"?`${ac}66`:`${ac}33`} stroke={sel==="iw"?`${ac}dd`:`${ac}88`}
          strokeWidth={sel==="iw"?1.8:1.2}
          style={{cursor:"pointer"}} onClick={()=>onZone("iw")}/>
      ))}
      {/* Innenhof */}
      <rect x="70" y="66" width="80" height="68" rx="2" fill="rgba(20,15,4,0.45)" stroke={`${ac}18`} strokeWidth="0.5"/>
      <text x="110" y="103" textAnchor="middle" fill={`${ac}25`} fontSize="9" fontFamily="serif">Hof</text>
      <text x="110" y="75" textAnchor="middle" fill={sel==="iw"?ac:`${ac}cc`}
        fontSize="10.5" fontFamily="'Cinzel',serif" style={{cursor:"pointer"}} onClick={()=>onZone("iw")}>INNERE MAUER</text>
      <text x="110" y="87" textAnchor="middle" fill={sel==="iw"?`${ac}bb`:`${ac}77`}
        fontSize="7.5" fontFamily="serif">(6 Türme)</text>

      {/* Kompass */}
      <g transform="translate(193,22)">
        <circle cx="0" cy="0" r="11" fill="rgba(3,2,1,0.75)" stroke={`${ac}30`} strokeWidth="0.8"/>
        <polygon points="0,-9 -2,-2 2,-2" fill={ac} opacity="0.9"/>
        <polygon points="0,9 -2,2 2,2" fill={`${ac}44`}/>
        <text x="0" y="-11" textAnchor="middle" fill={ac} fontSize="7" fontFamily="'Cinzel',serif" fontWeight="bold">N</text>
      </g>
      <text x="110" y="197" textAnchor="middle" fill={`${ac}55`} fontSize="8" fontFamily="serif" letterSpacing="1.2">BEAUMARIS · 1295 — EDWARD I.</text>
    </g>
  ),

  // ── DOVER CASTLE ─────────────────────────────────────────────────────────
  dover: ({ac,sel,onZone}) => (
    <g>
      <ellipse cx="110" cy="100" rx="104" ry="90" fill="rgba(180,170,140,0.1)" stroke="rgba(160,150,120,0.15)" strokeWidth="0.8"/>
      {/* Äußerer Mauerring */}
      {sel==="ow"&&<path d="M 15 58 L 38 14 L 110 8 L 182 14 L 205 58 L 207 132 L 188 178 L 110 187 L 30 178 L 12 132 Z" fill={ac} opacity="0.07" filter="url(#glowFilter)"/>}
      <path d="M 15 58 L 38 14 L 110 8 L 182 14 L 205 58 L 207 132 L 188 178 L 110 187 L 30 178 L 12 132 Z"
        fill={sel==="ow"?"rgba(140,110,45,0.2)":"rgba(140,110,45,0.07)"}
        stroke={sel==="ow"?`${ac}cc`:`${ac}44`} strokeWidth={sel==="ow"?4:3}
        style={{cursor:"pointer"}} onClick={()=>onZone("ow")}/>
      {[[38,14],[110,8],[182,14],[205,58],[207,132],[188,178],[110,187],[30,178],[15,58],[12,132],[60,10],[160,10],[205,95],[12,95]].map(([x,y],i)=>(
        <rect key={i} x={x-5} y={y-5} width="10" height="10" rx="1"
          fill={sel==="ow"?`${ac}55`:`${ac}33`} stroke={`${ac}66`} strokeWidth="0.7"/>
      ))}
      <text x="170" y="155" fill={sel==="ow"?ac:`${ac}77`} fontSize="8.5" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ow")}>Äußerer</text>
      <text x="170" y="166" fill={sel==="ow"?ac:`${ac}77`} fontSize="8.5" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("ow")}>Mauerring</text>
      {/* Innere Bailey */}
      <rect x="55" y="54" width="110" height="96" rx="2" fill="rgba(90,72,25,0.1)" stroke={`${ac}44`} strokeWidth="2"/>
      {[[55,54],[165,54],[55,150],[165,150],[55,102],[165,102]].map(([x,y],i)=>(
        <rect key={i} x={x-5} y={y-5} width="10" height="10" rx="1" fill={`${ac}33`} stroke={`${ac}55`} strokeWidth="0.7"/>
      ))}
      {/* Großer Turm */}
      {sel==="gt"&&<rect x="78" y="67" width="62" height="60" fill={ac} opacity="0.12" filter="url(#glowFilter)"/>}
      <rect x="78" y="67" width="62" height="60" rx="1"
        fill={sel==="gt"?"rgba(232,200,96,0.35)":"rgba(232,200,96,0.14)"}
        stroke={sel==="gt"?"#e8c860":"#c9a84c"} strokeWidth={sel==="gt"?3.5:2}
        style={{cursor:"pointer"}} onClick={()=>onZone("gt")}/>
      <rect x="108" y="67" width="22" height="16" rx="1" fill="rgba(201,168,76,0.2)" stroke={`${ac}44`} strokeWidth="0.8"/>
      {[[78,67],[140,67],[78,127],[140,127]].map(([x,y],i)=>(
        <rect key={i} x={x-6} y={y-6} width="12" height="12" rx="1"
          fill={sel==="gt"?"#e8c860":"#c9a84c"} opacity={sel==="gt"?0.85:0.5} stroke="#e8c860" strokeWidth="0.8"/>
      ))}
      <text x="109" y="100" textAnchor="middle" fill={sel==="gt"?"#e8c860":ac} fontSize="10" fontFamily="serif" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("gt")}>GROSSER</text>
      <text x="109" y="112" textAnchor="middle" fill={sel==="gt"?"#e8c860":ac} fontSize="10" fontFamily="serif" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("gt")}>TURM</text>
      {/* Nordtor */}
      {sel==="nt"&&<path d="M 88 6 L 110 2 L 132 6 L 132 22 L 110 26 L 88 22 Z" fill="#cc4444" opacity="0.25" filter="url(#glowFilter)"/>}
      <path d="M 88 6 L 110 2 L 132 6 L 132 22 L 110 26 L 88 22 Z"
        fill={sel==="nt"?"rgba(204,68,68,0.5)":"rgba(204,68,68,0.22)"}
        stroke="#cc4444" strokeWidth={sel==="nt"?2.5:1.5}
        style={{cursor:"pointer"}} onClick={()=>onZone("nt")}/>
      <text x="110" y="17" textAnchor="middle" fill="#cc4444" fontSize="8" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("nt")}>⚠ NORDTOR</text>
      <g transform="translate(192,24)">
        <circle cx="0" cy="0" r="11" fill="rgba(3,2,1,0.75)" stroke={`${ac}30`} strokeWidth="0.8"/>
        <polygon points="0,-9 -2,-2 2,-2" fill={ac} opacity="0.9"/>
        <polygon points="0,9 -2,2 2,2" fill={`${ac}44`}/>
        <text x="0" y="-11" textAnchor="middle" fill={ac} fontSize="7" fontFamily="'Cinzel',serif" fontWeight="bold">N</text>
      </g>
      <text x="110" y="197" textAnchor="middle" fill={`${ac}55`} fontSize="8" fontFamily="serif" letterSpacing="1.2">DOVER CASTLE · SEIT 1180</text>
    </g>
  ),

  // ── OSAKA CASTLE ─────────────────────────────────────────────────────────
  osaka: ({ac,sel,onZone}) => (
    <g>
      <rect x="0" y="0" width="220" height="200" fill="rgba(40,55,25,0.12)"/>
      {/* Sanomaru (Außenring) */}
      {sel==="sg2"&&<rect x="8" y="8" width="204" height="184" fill={ac} opacity="0.07" filter="url(#glowFilter)"/>}
      <rect x="10" y="10" width="200" height="180" rx="4"
        fill={sel==="sg2"?"rgba(80,100,50,0.2)":"rgba(80,100,50,0.08)"}
        stroke={sel==="sg2"?`${ac}bb`:`${ac}44`} strokeWidth={sel==="sg2"?4:2.5}
        style={{cursor:"pointer"}} onClick={()=>onZone("sg2")}/>
      <text x="26" y="30" fill={sel==="sg2"?ac:`${ac}88`} fontSize="8.5" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("sg2")}>SANOMARU</text>
      {/* Äußerer Wassergraben */}
      <rect x="28" y="28" width="164" height="144" rx="3" fill="rgba(20,50,90,0.38)" stroke="#3377bb" strokeWidth="1"/>
      {/* Ninomaru */}
      <rect x="46" y="46" width="128" height="108" rx="2" fill="rgba(40,55,25,0.25)" stroke={`${ac}33`} strokeWidth="1"/>
      {/* Honmaru-Graben */}
      <rect x="56" y="56" width="108" height="88" rx="2" fill="rgba(20,50,90,0.42)" stroke="#3377bb" strokeWidth="0.8"/>
      {/* Honmaru */}
      {sel==="hm"&&<rect x="64" y="63" width="92" height="74" fill={ac} opacity="0.1" filter="url(#glowFilter)"/>}
      <rect x="64" y="63" width="92" height="74" rx="2"
        fill={sel==="hm"?"rgba(201,168,76,0.25)":"rgba(201,168,76,0.1)"}
        stroke={sel==="hm"?`${ac}ff`:`${ac}88`} strokeWidth={sel==="hm"?4:2.5}
        style={{cursor:"pointer"}} onClick={()=>onZone("hm")}/>
      {[[64,63],[156,63],[64,137],[156,137]].map(([x,y],i)=>(
        <rect key={i} x={x-6} y={y-6} width="12" height="12" rx="1"
          fill={sel==="hm"?`${ac}66`:`${ac}44`} stroke={sel==="hm"?`${ac}cc`:`${ac}77`} strokeWidth="1"/>
      ))}
      <text x="110" y="76" textAnchor="middle" fill={sel==="hm"?ac:`${ac}99`} fontSize="9" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("hm")}>HONMARU</text>
      {/* Wassergräben */}
      {sel==="gm"&&<rect x="56" y="56" width="108" height="88" fill="#3377bb" opacity="0.1" filter="url(#glowFilter)"/>}
      <text x="40" y="128" fill={sel==="gm"?"#66aadd":"#3377bb88"} fontSize="7.5" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("gm")}>Graben</text>
      {/* Tenshukaku (Hauptturm) */}
      {sel==="tm"&&<rect x="82" y="76" width="56" height="48" fill={ac} opacity="0.15" filter="url(#glowFilter)"/>}
      <rect x="82" y="76" width="56" height="48" rx="1"
        fill={sel==="tm"?"rgba(240,210,100,0.42)":"rgba(240,210,100,0.18)"}
        stroke={sel==="tm"?"#f0d264":"#c9a84c"} strokeWidth={sel==="tm"?3:2}
        style={{cursor:"pointer"}} onClick={()=>onZone("tm")}/>
      <rect x="89" y="81" width="42" height="37" rx="1" fill="rgba(240,210,100,0.12)" stroke={`${ac}44`} strokeWidth="0.6"/>
      <rect x="97" y="86" width="26" height="24" rx="1" fill="rgba(240,210,100,0.1)" stroke={`${ac}33`} strokeWidth="0.5"/>
      <path d="M 82 76 Q 110 69 138 76" fill="none" stroke="#f0d264" strokeWidth={sel==="tm"?1.8:1.2} opacity="0.65"/>
      <path d="M 88 81 Q 110 75 132 81" fill="none" stroke="#f0d264" strokeWidth="0.9" opacity="0.4"/>
      <text x="110" y="102" textAnchor="middle" fill={sel==="tm"?"#f0d264":ac} fontSize="11" fontFamily="serif" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("tm")}>天守閣</text>
      <text x="110" y="114" textAnchor="middle" fill={sel==="tm"?"#f0d264cc":`${ac}88`} fontSize="7.5" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("tm")}>Tenshukaku</text>
      <g transform="translate(193,24)">
        <circle cx="0" cy="0" r="11" fill="rgba(3,2,1,0.75)" stroke={`${ac}30`} strokeWidth="0.8"/>
        <polygon points="0,-9 -2,-2 2,-2" fill={ac} opacity="0.9"/>
        <polygon points="0,9 -2,2 2,2" fill={`${ac}44`}/>
        <text x="0" y="-11" textAnchor="middle" fill={ac} fontSize="7" fontFamily="'Cinzel',serif" fontWeight="bold">N</text>
      </g>
      <text x="110" y="197" textAnchor="middle" fill={`${ac}55`} fontSize="8" fontFamily="serif" letterSpacing="1.2">OSAKA · 大坂城 · 1583</text>
    </g>
  ),

  // ── STIRLING CASTLE ───────────────────────────────────────────────────────
  stirling: ({ac,sel,onZone}) => (
    <g>
      <rect x="0" y="0" width="220" height="200" fill="rgba(45,60,30,0.12)"/>
      {/* Vulkanfels (Castle Rock) */}
      {sel==="vr"&&<path d="M 22 92 Q 24 42 56 22 Q 90 8 142 12 Q 178 16 194 46 Q 207 72 206 112 Q 204 152 180 170 Q 154 185 110 186 Q 64 186 40 168 Q 14 148 22 92 Z" fill={ac} opacity="0.07" filter="url(#glowFilter)"/>}
      <path d="M 22 92 Q 24 42 56 22 Q 90 8 142 12 Q 178 16 194 46 Q 207 72 206 112 Q 204 152 180 170 Q 154 185 110 186 Q 64 186 40 168 Q 14 148 22 92 Z"
        fill={sel==="vr"?"rgba(80,65,38,0.28)":"rgba(80,65,38,0.16)"}
        stroke={sel==="vr"?`${ac}88`:`${ac}30`} strokeWidth={sel==="vr"?2.5:1.5}
        style={{cursor:"pointer"}} onClick={()=>onZone("vr")}/>
      {[0,1,2,3].map(i=>(
        <path key={i} d={`M ${32+i*6} ${105-i*6} Q 110 ${90+i*4} ${188-i*5} ${108+i*4}`} fill="none" stroke={`${ac}09`} strokeWidth="0.6"/>
      ))}
      <text x="26" y="168" fill={sel==="vr"?ac:`${ac}77`} fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("vr")}>Castle Rock</text>
      {/* Esplanade */}
      {sel==="es"&&<rect x="68" y="10" width="74" height="30" fill="#cc4444" opacity="0.2" filter="url(#glowFilter)"/>}
      <rect x="68" y="12" width="74" height="26" rx="2"
        fill={sel==="es"?"rgba(204,68,68,0.38)":"rgba(204,68,68,0.16)"}
        stroke={sel==="es"?"#cc4444":"rgba(204,68,68,0.45)"} strokeWidth={sel==="es"?2:1}
        style={{cursor:"pointer"}} onClick={()=>onZone("es")}/>
      <text x="105" y="28" textAnchor="middle" fill="#cc4444" fontSize="8.5" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("es")}>⚠ ESPLANADE</text>
      {/* Forework */}
      {sel==="fp"&&<rect x="78" y="36" width="60" height="22" fill={ac} opacity="0.1" filter="url(#glowFilter)"/>}
      <rect x="78" y="37" width="60" height="20" rx="1"
        fill={sel==="fp"?"rgba(170,135,55,0.3)":"rgba(170,135,55,0.12)"}
        stroke={sel==="fp"?`${ac}cc`:`${ac}66`} strokeWidth={sel==="fp"?2.5:1.5}
        style={{cursor:"pointer"}} onClick={()=>onZone("fp")}/>
      {[[78,37],[138,37],[78,57],[138,57]].map(([x,y],i)=>(
        <rect key={i} x={x-5} y={y-5} width="10" height="10" rx="1" fill={sel==="fp"?`${ac}66`:`${ac}44`} stroke={`${ac}77`} strokeWidth="0.7"/>
      ))}
      <path d="M 99 57 L 99 45 Q 108 40 117 45 L 117 57" fill="rgba(0,0,0,0.45)" stroke={`${ac}44`} strokeWidth="0.8"/>
      <text x="108" y="51" textAnchor="middle" fill={sel==="fp"?ac:`${ac}99`} fontSize="8" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("fp")}>FOREWORK</text>
      {/* Nether Bailey */}
      {sel==="nk"&&<rect x="58" y="56" width="104" height="44" fill={ac} opacity="0.1" filter="url(#glowFilter)"/>}
      <rect x="58" y="56" width="104" height="44" rx="1"
        fill={sel==="nk"?"rgba(170,135,55,0.22)":"rgba(170,135,55,0.09)"}
        stroke={sel==="nk"?`${ac}dd`:`${ac}66`} strokeWidth={sel==="nk"?3.5:2}
        style={{cursor:"pointer"}} onClick={()=>onZone("nk")}/>
      {[[58,56],[162,56],[58,100],[162,100]].map(([x,y],i)=>(
        <rect key={i} x={x-5} y={y-5} width="10" height="10" rx="1" fill={sel==="nk"?`${ac}66`:`${ac}44`} stroke={`${ac}77`} strokeWidth="0.7"/>
      ))}
      <text x="110" y="82" textAnchor="middle" fill={sel==="nk"?ac:`${ac}99`} fontSize="9.5" fontFamily="serif" style={{cursor:"pointer"}} onClick={()=>onZone("nk")}>NETHER BAILEY</text>
      {/* Great Hall */}
      {sel==="gh"&&<rect x="65" y="100" width="90" height="58" fill={ac} opacity="0.1" filter="url(#glowFilter)"/>}
      <rect x="65" y="100" width="90" height="58" rx="1"
        fill={sel==="gh"?"rgba(232,200,96,0.35)":"rgba(232,200,96,0.14)"}
        stroke={sel==="gh"?"#e8c860":"#c9a84c"} strokeWidth={sel==="gh"?3:2}
        style={{cursor:"pointer"}} onClick={()=>onZone("gh")}/>
      <rect x="65" y="100" width="42" height="58" rx="1" fill="rgba(201,168,76,0.07)" stroke={`${ac}28`} strokeWidth="0.5"/>
      <text x="86" y="133" textAnchor="middle" fill={`${ac}44`} fontSize="7" fontFamily="serif">Kapelle</text>
      <text x="132" y="133" textAnchor="middle" fill={`${ac}44`} fontSize="7" fontFamily="serif">Palast</text>
      <text x="110" y="117" textAnchor="middle" fill={sel==="gh"?"#e8c860":ac} fontSize="10" fontFamily="serif" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("gh")}>GREAT HALL</text>
      <g transform="translate(193,24)">
        <circle cx="0" cy="0" r="11" fill="rgba(3,2,1,0.75)" stroke={`${ac}30`} strokeWidth="0.8"/>
        <polygon points="0,-9 -2,-2 2,-2" fill={ac} opacity="0.9"/>
        <polygon points="0,9 -2,2 2,2" fill={`${ac}44`}/>
        <text x="0" y="-11" textAnchor="middle" fill={ac} fontSize="7" fontFamily="'Cinzel',serif" fontWeight="bold">N</text>
      </g>
      <text x="110" y="197" textAnchor="middle" fill={`${ac}55`} fontSize="8" fontFamily="serif" letterSpacing="1.2">STIRLING CASTLE · SEIT 1110</text>
    </g>
  ),

  // ── RED FORT (Lal Qila) ───────────────────────────────────────────────────
  red_fort: ({ac,sel,onZone}) => (
    <g>
      <rect x="0" y="0" width="220" height="200" fill="rgba(60,35,20,0.1)"/>
      {/* Yamuna (Ost) */}
      {sel==="rg"&&<rect x="178" y="0" width="42" height="200" fill="#4488cc" opacity="0.18" filter="url(#glowFilter)"/>}
      <rect x="183" y="0" width="37" height="200" fill={sel==="rg"?"rgba(34,100,170,0.45)":"rgba(34,100,170,0.28)"} stroke={sel==="rg"?"#66aadd":"#4488cc55"} strokeWidth={sel==="rg"?1.5:1} style={{cursor:"pointer"}} onClick={()=>onZone("rg")}/>
      {[25,60,95,130,165].map(y=>(
        <path key={y} d={`M 184 ${y} Q 198 ${y+7} 216 ${y}`} fill="none" stroke="#4488cc" strokeWidth="0.5" opacity="0.45"/>
      ))}
      <text x="196" y="102" textAnchor="middle" fill={sel==="rg"?"#66aadd":"#4488cc99"} fontSize="7" fontFamily="serif" transform="rotate(90,196,102)" style={{cursor:"pointer"}} onClick={()=>onZone("rg")}>YAMUNA ⚠</text>
      {/* Rote Sandsteinmauern */}
      {sel==="rm"&&<path d="M 10 18 L 178 18 L 178 182 L 10 182 Z" fill={ac} opacity="0.07" filter="url(#glowFilter)"/>}
      <path d="M 10 18 L 178 18 L 178 182 L 10 182 Z"
        fill={sel==="rm"?"rgba(170,55,35,0.2)":"rgba(170,55,35,0.08)"}
        stroke={sel==="rm"?"#cc4422":"#aa3312"} strokeWidth={sel==="rm"?5:4}
        style={{cursor:"pointer"}} onClick={()=>onZone("rm")}/>
      {[[10,18],[10,182],[178,18],[178,182],[10,100],[178,100],[94,18],[94,182]].map(([x,y],i)=>(
        <polygon key={i} points={`${x},${y-7} ${x+4.5},${y-4.5} ${x+7},${y} ${x+4.5},${y+4.5} ${x},${y+7} ${x-4.5},${y+4.5} ${x-7},${y} ${x-4.5},${y-4.5}`}
          fill={sel==="rm"?"rgba(204,68,40,0.55)":"rgba(180,60,30,0.32)"} stroke={sel==="rm"?"#dd5533":"#bb4422"} strokeWidth="0.8"/>
      ))}
      {/* Tore */}
      <rect x="2" y="84" width="16" height="32" rx="2" fill="rgba(170,60,35,0.5)" stroke="#cc5533" strokeWidth="1.5"/>
      <text x="10" y="82" textAnchor="middle" fill="#cc5533" fontSize="6.5" fontFamily="serif">Lahore</text>
      <text x="10" y="122" textAnchor="middle" fill="#cc5533" fontSize="6.5" fontFamily="serif">Tor</text>
      <rect x="162" y="84" width="16" height="32" rx="2" fill="rgba(170,60,35,0.3)" stroke="#cc5533" strokeWidth="1"/>
      <text x="178" y="82" textAnchor="middle" fill="#cc5533" fontSize="6.5" fontFamily="serif">Delhi</text>
      <text x="178" y="122" textAnchor="middle" fill="#cc5533" fontSize="6.5" fontFamily="serif">Tor</text>
      <text x="94" y="32" textAnchor="middle" fill={sel==="rm"?"#ee6644":ac} fontSize="9" fontFamily="'Cinzel',serif" style={{cursor:"pointer"}} onClick={()=>onZone("rm")}>SANDSTEINMAUERN</text>
      {/* Palastkomplex */}
      {sel==="pc"&&<rect x="20" y="46" width="102" height="108" fill={ac} opacity="0.1" filter="url(#glowFilter)"/>}
      <rect x="20" y="46" width="102" height="108" rx="2"
        fill={sel==="pc"?"rgba(201,168,76,0.25)":"rgba(201,168,76,0.1)"}
        stroke={sel==="pc"?`${ac}ff`:`${ac}77`} strokeWidth={sel==="pc"?3:2}
        style={{cursor:"pointer"}} onClick={()=>onZone("pc")}/>
      <rect x="26" y="54" width="42" height="32" rx="1" fill="rgba(201,168,76,0.12)" stroke={`${ac}44`} strokeWidth="0.8"/>
      <text x="47" y="74" textAnchor="middle" fill={`${ac}55`} fontSize="7" fontFamily="serif">Diwan-i-Am</text>
      <rect x="76" y="54" width="38" height="28" rx="1" fill="rgba(201,168,76,0.12)" stroke={`${ac}44`} strokeWidth="0.8"/>
      <text x="95" y="72" textAnchor="middle" fill={`${ac}55`} fontSize="6.5" fontFamily="serif">Diwan-i-Khas</text>
      <rect x="26" y="96" width="32" height="28" rx="1" fill="rgba(68,136,204,0.1)" stroke="#4488cc33" strokeWidth="0.8"/>
      <text x="42" y="114" textAnchor="middle" fill="#4488cc44" fontSize="6.5" fontFamily="serif">Hammam</text>
      <rect x="76" y="92" width="38" height="32" rx="1" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8"/>
      <text x="95" y="112" textAnchor="middle" fill="rgba(255,255,255,0.28)" fontSize="6.5" fontFamily="serif">Moti Masjid</text>
      <text x="71" y="118" textAnchor="middle" fill={sel==="pc"?ac:`${ac}cc`} fontSize="10" fontFamily="'Cinzel',serif" fontWeight="bold" style={{cursor:"pointer"}} onClick={()=>onZone("pc")}>PALASTKOMPLEX</text>
      <g transform="translate(28,26)">
        <circle cx="0" cy="0" r="11" fill="rgba(3,2,1,0.75)" stroke={`${ac}30`} strokeWidth="0.8"/>
        <polygon points="0,-9 -2,-2 2,-2" fill={ac} opacity="0.9"/>
        <polygon points="0,9 -2,2 2,2" fill={`${ac}44`}/>
        <text x="0" y="-11" textAnchor="middle" fill={ac} fontSize="7" fontFamily="'Cinzel',serif" fontWeight="bold">N</text>
      </g>
      <text x="94" y="197" textAnchor="middle" fill={`${ac}55`} fontSize="8" fontFamily="serif" letterSpacing="1.2">LAL QILA · DELHI · 1639</text>
    </g>
  ),
};

// Generic plan for all other castles — enhanced top-down view
function GenericCastlePlan({castle,ac,sel,onZone}){
  const zones=castle.zones;

  // Crenellations along an ellipse/circle perimeter
  const crenels=(cx,cy,rx,ry,count,size,color,isH)=>
    Array.from({length:count},(_,i)=>{
      const a=i/count*Math.PI*2;
      return <rect key={i}
        x={cx+rx*Math.cos(a)-size/2} y={cy+ry*Math.sin(a)-size/2}
        width={size} height={size} rx="0.5"
        fill={isH?`${color}70`:`${color}38`}
        stroke={isH?`${color}aa`:`${color}66`} strokeWidth="0.4"/>;
    });

  const getPos=(z,i,total)=>{
    const isOuter=z.r>35;
    const isMid=z.r>15&&z.r<=35;
    if(isOuter) return {type:"ellipse",cx:110,cy:104,rx:76,ry:67};
    if(isMid)   return {type:"ellipse",cx:110,cy:104,rx:50,ry:44};
    const angle=(i/Math.max(total,1))*Math.PI*2-Math.PI/2;
    const dist=z.r<10?20:32;
    return {type:"circle",cx:110+dist*Math.cos(angle),cy:104+dist*Math.sin(angle),r:Math.min(z.r,17)};
  };

  return(
    <g>
      {/* Outer terrain boundary */}
      <ellipse cx="110" cy="105" rx="106" ry="91"
        fill={`${ac}04`} stroke={`${ac}10`} strokeWidth="0.5" strokeDasharray="8,5"/>
      {/* Terrain hash lines */}
      {Array.from({length:18},(_,i)=>{
        const a=i/18*Math.PI*2;
        return <line key={i}
          x1={110+88*Math.cos(a)} y1={105+76*Math.sin(a)}
          x2={110+102*Math.cos(a)} y2={105+88*Math.sin(a)}
          stroke={`${ac}0d`} strokeWidth="0.6"/>;
      })}
      {/* Inner ground wash */}
      <ellipse cx="110" cy="105" rx="80" ry="70" fill={`${ac}05`} stroke="none"/>

      {/* Zones */}
      {zones.map((z,i)=>{
        const isH=sel===z.id;
        const pos=getPos(z,i,zones.length);
        const isWeak=z.a<=2;
        const cCount=pos.type==="ellipse"?Math.floor(pos.rx*0.62):Math.floor(pos.r*0.55);
        const cSize=isH?5:4;
        return(
          <g key={z.id} style={{cursor:"pointer"}} onClick={()=>onZone(z.id)}>
            {pos.type==="ellipse"?(
              <>
                {/* Glow halo */}
                {isH&&<ellipse cx={pos.cx} cy={pos.cy} rx={pos.rx+9} ry={pos.ry+9}
                  fill={z.c} opacity="0.09" filter="url(#glowFilter)"/>}
                {/* Drop shadow */}
                <ellipse cx={pos.cx} cy={pos.cy+3} rx={pos.rx} ry={pos.ry*0.32}
                  fill="rgba(0,0,0,0.4)" stroke="none"/>
                {/* Wall ring */}
                <ellipse cx={pos.cx} cy={pos.cy} rx={pos.rx} ry={pos.ry}
                  fill={isH?`${z.c}22`:`${z.c}0d`}
                  stroke={isH?z.c:`${z.c}55`}
                  strokeWidth={isH?3.5:2.5}/>
                {/* Crenellations */}
                {crenels(pos.cx,pos.cy,pos.rx,pos.ry,cCount,cSize,z.c,isH)}
                {/* Corner towers */}
                {[0,2,4,6].map(j=>{
                  const a=j/8*Math.PI*2+Math.PI/8;
                  return <circle key={j}
                    cx={pos.cx+pos.rx*Math.cos(a)} cy={pos.cy+pos.ry*Math.sin(a)}
                    r={isH?6:5} fill={isH?`${z.c}44`:`${z.c}22`}
                    stroke={isH?`${z.c}aa`:`${z.c}66`} strokeWidth={isH?1.2:0.8}/>;
                })}
                {/* Label background + text */}
                <rect x={pos.cx-38} y={pos.cy-7} width="76" height="14" rx="2"
                  fill="rgba(3,2,1,0.75)" stroke={`${z.c}22`} strokeWidth="0.5"/>
                <text x={pos.cx} y={pos.cy+3} textAnchor="middle"
                  fill={isH?z.c:`${z.c}dd`} fontSize="9" fontFamily="'Cinzel',serif" letterSpacing="0.5">
                  {z.l.replace(/ ⚠+/g,"").slice(0,16)}
                </text>
                {isWeak&&<text x={pos.cx+pos.rx-2} y={pos.cy-pos.ry+5}
                  textAnchor="middle" fill="#cc4444" fontSize="11">⚠</text>}
              </>
            ):(
              <>
                {isH&&<circle cx={pos.cx} cy={pos.cy} r={pos.r+8}
                  fill={z.c} opacity="0.09" filter="url(#glowFilter)"/>}
                {/* Drop shadow */}
                <ellipse cx={pos.cx} cy={pos.cy+2} rx={pos.r} ry={pos.r*0.3}
                  fill="rgba(0,0,0,0.35)" stroke="none"/>
                {/* Tower body */}
                <circle cx={pos.cx} cy={pos.cy} r={pos.r}
                  fill={isH?`${z.c}38`:`${z.c}18`}
                  stroke={isH?z.c:`${z.c}88`}
                  strokeWidth={isH?2.5:1.5}/>
                {/* Mini turrets */}
                {Array.from({length:4},(_,j)=>{
                  const a=j/4*Math.PI*2+Math.PI/4;
                  return <circle key={j}
                    cx={pos.cx+pos.r*0.82*Math.cos(a)} cy={pos.cy+pos.r*0.82*Math.sin(a)}
                    r="3" fill={`${z.c}55`} stroke={`${z.c}88`} strokeWidth="0.5"/>;
                })}
                {/* Crenellations on tower */}
                {crenels(pos.cx,pos.cy,pos.r,pos.r,cCount,isH?4:3,z.c,isH)}
                {/* Label */}
                <rect x={pos.cx-22} y={pos.cy-6} width="44" height="12" rx="2"
                  fill="rgba(3,2,1,0.75)" stroke={`${z.c}22`} strokeWidth="0.5"/>
                <text x={pos.cx} y={pos.cy+2} textAnchor="middle"
                  fill={isH?z.c:`${z.c}dd`} fontSize="8" fontFamily="'Cinzel',serif">
                  {z.l.replace(/ ⚠+/g,"").slice(0,13)}
                </text>
                {isWeak&&<text x={pos.cx+pos.r+2} y={pos.cy-pos.r+3}
                  fill="#cc4444" fontSize="9">⚠</text>}
              </>
            )}
          </g>
        );
      })}

      {/* Compass rose */}
      <g transform="translate(194,18)">
        <circle cx="0" cy="0" r="13" fill="rgba(3,2,1,0.78)" stroke={`${ac}30`} strokeWidth="0.8"/>
        <polygon points="0,-10 -2.5,-2 2.5,-2" fill={ac} opacity="0.88"/>
        <polygon points="0,10 -2.5,2 2.5,2" fill={`${ac}44`}/>
        <polygon points="-10,0 -2,-2.5 -2,2.5" fill={`${ac}44`}/>
        <polygon points="10,0 2,-2.5 2,2.5" fill={`${ac}44`}/>
        <circle cx="0" cy="0" r="2" fill={ac} opacity="0.6"/>
        <text x="0" y="-13" textAnchor="middle" fill={ac} fontSize="7"
          fontFamily="'Cinzel',serif" fontWeight="bold">N</text>
      </g>

      {/* Castle name bar */}
      <rect x="24" y="189" width="160" height="10" rx="2" fill="rgba(3,2,1,0.7)" stroke={`${ac}18`} strokeWidth="0.5"/>
      <text x="110" y="197" textAnchor="middle" fill={`${ac}99`} fontSize="8"
        fontFamily="'Cinzel',serif" letterSpacing="1.5">
        {castle.name.toUpperCase().slice(0,26)}
      </text>
    </g>
  );
}

// ── IsoCastlePlan removed — diorama replaced by enhanced floor plans ───────
function IsoCastlePlan({castle,ac,sel,onZone}){
  const zones=castle.zones;
  const CX=110,CY=128;
  const HS=9; // pixels per defense point
  const defCol=a=>a>=5?"#6aaa50":a>=3?"#c9a84c":"#cc5533";
  // Project tower zone world coords (0..100, center 50,50) to iso screen
  const toIso=(wx,wy)=>({
    sx:CX+(wx-50-(wy-50))*0.55,
    sy:CY+(wx-50+(wy-50))*0.28
  });
  // Sort: outer rings first (painter's algo), towers back-to-front
  const sorted=[...zones].sort((a,b)=>{
    const aR=a.r>12,bR=b.r>12;
    if(aR&&bR) return b.r-a.r;
    if(aR) return -1;
    if(bR) return 1;
    return a.y-b.y;
  });
  return(
    <g>
      {/* Ground base */}
      <ellipse cx={CX} cy={CY+12} rx={90} ry={38} fill="rgba(6,4,2,0.95)" stroke={`${ac}1c`} strokeWidth="1"/>
      <ellipse cx={CX} cy={CY+12} rx={86} ry={34} fill="none" stroke={`${ac}0a`} strokeWidth="0.5"/>
      {/* Terrain marks */}
      {[-24,-12,0,12,24].map(d=>(
        <line key={d} x1={CX-76+Math.abs(d)*0.4} y1={CY+12+d*0.38}
          x2={CX+76-Math.abs(d)*0.4} y2={CY+12+d*0.38}
          stroke={`${ac}07`} strokeWidth="0.4"/>
      ))}
      {sorted.map(z=>{
        const isH=sel===z.id;
        const h=Math.max(z.a,0.6)*HS;
        const dc=defCol(z.a);
        if(z.r>12){
          // RING ZONE — isometric cylinder
          const rx=z.r*0.68;
          const ry=z.r*0.33;
          const battleCount=Math.min(Math.round(rx/5.5),14);
          return(
            <g key={z.id} style={{cursor:"pointer"}} onClick={()=>onZone(z.id)}>
              {/* Front cylinder face */}
              <path d={[
                `M ${CX-rx} ${CY}`,
                `L ${CX-rx} ${CY-h}`,
                `A ${rx} ${ry} 0 0 1 ${CX+rx} ${CY-h}`,
                `L ${CX+rx} ${CY}`,
                `A ${rx} ${ry} 0 0 0 ${CX-rx} ${CY}`,
                `Z`].join(" ")}
                fill={isH?`${z.c}22`:`${z.c}0e`}
                stroke={isH?`${z.c}cc`:`${z.c}44`}
                strokeWidth={isH?2:0.9}/>
              {/* Top ellipse */}
              <ellipse cx={CX} cy={CY-h} rx={rx} ry={ry}
                fill={isH?`${z.c}38`:`${z.c}1e`}
                stroke={isH?z.c:`${z.c}99`}
                strokeWidth={isH?2.5:1.5}/>
              {/* Battlements */}
              {Array.from({length:battleCount},(_,i)=>{
                const ang=(i/battleCount)*Math.PI*2;
                const bx=CX+rx*Math.cos(ang);
                const by=CY-h+ry*Math.sin(ang);
                return <rect key={i} x={bx-1.5} y={by-4} width={3} height={3} rx="0.5"
                  fill={z.c} opacity={isH?0.65:0.28}/>;
              })}
              {/* Defense value bar on right side */}
              <rect x={CX+rx+3} y={CY-h*0.75} width={4}
                height={Math.max(h*0.65,3)} rx="1"
                fill={dc} opacity={0.55}/>
              {/* Zone label */}
              <text x={CX} y={CY-h-ry-2} textAnchor="middle"
                fill={isH?z.c:`${z.c}cc`} fontSize="8" fontFamily="serif">
                {z.l.replace(/ ⚠+/g,"").slice(0,16)}
              </text>
              {/* Weak zone flag */}
              {z.a<=2&&<text x={CX+rx*0.75} y={CY-h+ry*0.5}
                textAnchor="middle" fill="#cc4444" fontSize="9">⚠</text>}
            </g>
          );
        } else {
          // TOWER ZONE — small isometric pillar
          const pos=toIso(z.x,z.y);
          const tr=Math.max(z.r,5)*0.55;
          const try_=tr*0.48;
          return(
            <g key={z.id} style={{cursor:"pointer"}} onClick={()=>onZone(z.id)}>
              {/* Pillar front face */}
              <path d={[
                `M ${pos.sx-tr} ${pos.sy}`,
                `L ${pos.sx-tr} ${pos.sy-h}`,
                `A ${tr} ${try_} 0 0 1 ${pos.sx+tr} ${pos.sy-h}`,
                `L ${pos.sx+tr} ${pos.sy}`,
                `A ${tr} ${try_} 0 0 0 ${pos.sx-tr} ${pos.sy}`,
                `Z`].join(" ")}
                fill={isH?`${z.c}32`:`${z.c}1a`}
                stroke={isH?`${z.c}dd`:`${z.c}66`}
                strokeWidth={isH?2:1}/>
              {/* Pillar top */}
              <ellipse cx={pos.sx} cy={pos.sy-h} rx={tr} ry={try_}
                fill={isH?`${z.c}52`:`${z.c}2e`}
                stroke={isH?z.c:`${z.c}aa`}
                strokeWidth={isH?2.5:1.5}/>
              {/* Mini battlements */}
              {Array.from({length:4},(_,i)=>{
                const ang=(i/4)*Math.PI*2;
                const bx=pos.sx+tr*0.7*Math.cos(ang);
                const by=pos.sy-h+try_*0.7*Math.sin(ang);
                return <rect key={i} x={bx-1.5} y={by-3.5} width={3} height={2.5} rx="0.3"
                  fill={z.c} opacity={isH?0.72:0.35}/>;
              })}
              {/* Label */}
              <text x={pos.sx} y={pos.sy-h-try_-2} textAnchor="middle"
                fill={isH?z.c:`${z.c}cc`} fontSize="7.5" fontFamily="serif">
                {z.l.replace(/ ⚠+/g,"").slice(0,13)}
              </text>
              {z.a<=2&&<text x={pos.sx+tr+2} y={pos.sy-h}
                fill="#cc4444" fontSize="9">⚠</text>}
            </g>
          );
        }
      })}
      {/* Legend */}
      <text x={8} y={196} fill={`${ac}30`} fontSize="7" fontFamily="serif">Höhe = Verteidigungswert</text>
      {/* Castle name */}
      <text x={CX} y={196} textAnchor="middle" fill={`${ac}40`} fontSize="9" fontFamily="serif" letterSpacing="1.5">
        {castle.name.toUpperCase().slice(0,22)}
      </text>
    </g>
  );
}

// ── BattleMap — top-down floor plan view ──────────────────────────────────
// ── Terrain description based on castle data ───────────────────────────────
function getTerrainDesc(castle){
  const r=castle.ratings;
  const loc=castle.loc.toLowerCase();
  const desc=castle.desc.toLowerCase();
  const hist=castle.history.toLowerCase();

  // Terrain type detection
  const isMountain=r.position>=90||(desc+hist).includes("berg")||(desc+hist).includes("fels")||(desc+hist).includes("gipfel")||(desc+hist).includes("cliff")||(desc+hist).includes("klippe");
  const isIsland=(desc+hist).includes("insel")||(desc+hist).includes("halbinsel")||(desc+hist).includes("meer")||(desc+hist).includes("see")||loc.includes("rhodos")||loc.includes("mont");
  const isDesert=(desc+hist).includes("wüst")||(desc+hist).includes("sahara")||loc.includes("marokko")||loc.includes("jaisalmer")||loc.includes("petra");
  const isForest=(desc+hist).includes("wald")||(desc+hist).includes("dschungel")||(desc+hist).includes("jungle");
  const isRiver=(desc+hist).includes("fluss")||(desc+hist).includes("river")||(desc+hist).includes("graben")||(desc+hist).includes("wassergraben");
  const isCoastal=(desc+hist).includes("küste")||(desc+hist).includes("hafen")||(desc+hist).includes("meer")||(desc+hist).includes("atlantik")||(desc+hist).includes("mittelmeer");
  const isPlain=r.position<65;

  if(isMountain&&r.position>=92) return `Liegt auf einem ${r.position>=97?"nahezu unzugänglichen":"steilen"} Felssporn oder Berggipfel — ${r.position>=95?"senkrechte Klippen auf allen Seiten machen jeden Frontalangriff zur Todesaufgabe":"der schmale Zugangspfad ist die einzige Angriffsmöglichkeit"}. Position ist die primäre Verteidigung.`;
  if(isMountain) return `Erhöhte Lage auf einem Hügel oder Felskamm — dominiert das umliegende Tal und bietet Sichtlinien auf Kilometer. Angreifer müssen bergauf kämpfen, was jeden Sturmangriff erheblich schwächt.`;
  if(isIsland) return `Lage auf einer Insel, Halbinsel oder Felsvorsprung mit Wasserschutz auf mehreren Seiten. Seeseitige Angriffe sind schwierig, landseitige Zugänge eng und kontrollierbar.`;
  if(isDesert) return `Mitten in der Wüste — die lebensfeindliche Umgebung ist die stärkste Verteidigung. Jeder Angreifer muss Wasser und Proviant für die gesamte Belagerung mitbringen. Aushungern funktioniert in beide Richtungen.`;
  if(isCoastal) return `Direkt an der Küste mit Zugang zum Meer — Versorgung per Schiff nahezu unblockierbar, aber Seeangriffe möglich. Kontrolle der Meerenge oder des Hafens gibt strategischen Vorteil.`;
  if(isRiver) return `Durch Wasserläufe, Gräben oder natürliche Gewässer geschützt — Wasser als primäres Verteidigungsmittel. Trockene Perioden oder Umleitung des Wassers sind historisch oft entscheidend gewesen.`;
  if(isForest) return `Im oder am Rande von dichtem Wald — Annäherung ohne Sichtlinienvorteil des Verteidigers schwierig. Gleichzeitig bietet der Wald Deckung für Angreifer bei der Annäherung.`;
  if(isPlain) return `Im offenen Flachland ohne natürlichen Geländeschutz — die Mauern und Festungsanlagen müssen die ganze Arbeit leisten. Belagerungsmaschinen können nah herangeführt werden, aber die Burg kontrolliert alle Zufahrtswege.`;
  return `Kontrollierte strategische Position an einem Verkehrs- oder Handelsknoten — wer diese Burg hält, kontrolliert die Bewegung von Armeen und Gütern in der Region. ${r.position>=80?"Die Geländevorteile verstärken den taktischen Wert erheblich.":""}`;
}

// ── MiniLeafletMap component — proper React component with useEffect ───────
function MiniLeafletMap({lat, lon, castle}){
  const mapRef=useRef(null);
  const mapInstance=useRef(null);

  useEffect(()=>{
    if(!mapRef.current) return;
    // Destroy existing map if any
    if(mapInstance.current){
      try{mapInstance.current.remove();}catch{}
      mapInstance.current=null;
    }
    const initMap=()=>{
      const L=window.L;
      if(!L||!mapRef.current) return;
      const map=L.map(mapRef.current,{
        center:[lat,lon],zoom:6,
        zoomControl:true,
        maxBounds:[[-90,-180],[90,180]],
        maxBoundsViscosity:1,
        attributionControl:false,
      });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{
        subdomains:'abcd',maxZoom:12,noWrap:true
      }).addTo(map);
      const icon=L.divIcon({
        html:`<div style="width:20px;height:20px;background:${castle.theme.accent};border-radius:50%;border:3px solid white;box-shadow:0 0 16px ${castle.theme.accent},0 0 6px rgba(0,0,0,0.8);"></div>`,
        className:'',iconSize:[20,20],iconAnchor:[10,10]
      });
      L.marker([lat,lon],{icon}).addTo(map)
        .bindPopup(`<div style="background:rgba(10,7,3,0.97);border:1px solid ${castle.theme.accent};color:${castle.theme.accent};padding:8px 12px;border-radius:4px;font-family:Georgia,serif;font-size:13px;white-space:nowrap"><strong>${castle.icon} ${castle.name}</strong><br><span style="color:#8a7a58;font-size:11px">${castle.loc} · ${castle.era}</span></div>`,
          {className:'custom-tooltip',opacity:1,closeButton:false})
        .openPopup();
      mapInstance.current=map;
    };
    if(window.L){
      initMap();
    } else {
      // Leaflet CSS
      if(!document.getElementById('leaflet-css')){
        const link=document.createElement('link');
        link.id='leaflet-css'; link.rel='stylesheet';
        link.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
        document.head.appendChild(link);
      }
      // Leaflet JS — inject if not yet loading
      if(!document.getElementById('leaflet-js')){
        const script=document.createElement('script');
        script.id='leaflet-js';
        script.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
        script.onload=initMap;
        document.head.appendChild(script);
      } else {
        // Script tag exists but not yet loaded — poll
        const t=setInterval(()=>{if(window.L){clearInterval(t);initMap();}},100);
        return()=>clearInterval(t);
      }
    }
    return()=>{
      if(mapInstance.current){
        try{mapInstance.current.remove();}catch{}
        mapInstance.current=null;
      }
    };
  },[lat,lon,castle.id]);

  return(
    <div ref={mapRef} style={{height:"320px",width:"100%"}}/>
  );
}

// ── Detailed Floor Plans (large viewBox, many clickable elements) ───────────
const DETAILED_PLANS={};

// ── Malbork ─────────────────────────────────────────────────────────────────
DETAILED_PLANS.malbork=({ac,sel,onSel})=>{
  const W=700,H=580;
  const S=(id,name,icon,type,desc,stats,weakness)=>({id,name,icon,type,desc,stats,weakness});
  const EL=[
    S("hb_keep","Hochburg – Hauptburg","🏯","Hochmeisterburg","Der innerste Kern von Malbork, erbaut um 1280 vom Deutschen Orden. Massiver Donjon mit Kapelle der Heiligen Anna im Erdgeschoss.",["Mauerstärke: 4m","Höhe: 28m","Erbaut: 1280"],null),
    S("hb_chapel","Kapelle St. Anna","⛪","Kapelle","Zweigeschossige Palastkapelle unter dem Kapitelsaal. Enthält die Grablege der Hochmeister – strategisch unantastbarer Sakralraum.",["Goldmosaiken","Gotisches Gewölbe"],null),
    S("hb_great","Großer Remter","🏛️","Palastsaal","Repräsentativer Speisesaal der Hochmeister, 30m lang. Granitsäule trägt das gesamte Sternengewölbe – Schwachstelle!",["Länge: 30m","Kapazität: 400 Ritter"],2),
    S("mb_palace","Hochmeisterpalast","👑","Palast","Prachtbau mit vier Türmen, errichtet 1382–1399 unter Hochmeister Konrad Zöllner. Repräsentativster Raum des Ordens.",["4 Türme","Größter Palast Nordeuropas","Heizung durch Hypokausten"],null),
    S("mb_wall","Mittelburg – Ringmauer","🧱","Curtainwall","Mittlerer Mauerring mit Zinnen und Schießscharten. Verbindet Hoch- und Vorburg. Breite Wehrgang-Plattform.",["Höhe: 12m","Dicke: 2.5m"],null),
    S("mb_gate","Mittelburger Tor","🚪","Torhaus","Hauptzugang zur Mittelburg über Zugbrücke und Fallgitter. Doppeltes Tortürme-System mit Pechnasen.",["Zugbrücke","Fallgitter","Pechnasen"],3),
    S("vb_outer","Vorburg – Außenwall","🏰","Vorburg","Größtes der drei Vorwerke. Enthält Werkstätten, Stallungen, Mühlen und Unterkünfte für Hunderte Knappen und Handwerker.",["400m Ausdehnung","Schmiede & Mühlen","Brauerei"],null),
    S("vb_gate","Vordertor / Danzig-Tor","⚔️","Haupttor","Einziger Zugang zur Vorburg, geschützt durch Barbakane und tiefen Graben. Schwächster Punkt der Gesamtanlage.",["Barbakane vorgelagert","Wassergraben 8m tief"],1),
    S("nogat","Fluss Nogat","🌊","Flussbarriere","Natürliche Ostgrenze der Burganlage. Schiffbare Verbindung zur Ostsee ermöglichte Nachschub für den Deutschen Orden.",["Breite: 60m","Schiffbar","Ostschutz"],null),
    S("nb_gate","Nordtor","🚧","Schwachstelle","Schmaler Zugang an der Nordseite mit weniger Verteidigungstiefe. Historisch mehrfach angegriffen.",["Wenig Tiefe","Flaches Gelände"],2),
  ];
  const el=(id)=>EL.find(e=>e.id===id)||null;
  const hit=(id)=>onSel(sel&&sel.id===id?null:el(id));
  const isSel=(id)=>sel&&sel.id===id;
  const zone=(id,fill,stroke)=>isSel(id)?`${fill}55`:`${fill}20`;
  const str=(id,c)=>isSel(id)?c+"cc":"#8a7a6055";

  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"100%",display:"block"}}>
      <defs>
        <radialGradient id="m_bg" cx="50%" cy="55%" r="65%">
          <stop offset="0%" stopColor="#100d07"/>
          <stop offset="100%" stopColor="#050402"/>
        </radialGradient>
        <filter id="m_glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <pattern id="m_stone" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="transparent"/>
          <rect x="1" y="1" width="8" height="8" fill={`${ac}07`} rx="1"/>
          <rect x="11" y="11" width="8" height="8" fill={`${ac}05`} rx="1"/>
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#m_bg)"/>
      <rect width={W} height={H} fill="url(#m_stone)" opacity="0.6"/>

      {/* Nogat River (east) */}
      <rect x="580" y="0" width="120" height={H} fill="rgba(34,100,180,0.28)" onClick={()=>hit("nogat")} style={{cursor:"pointer"}}/>
      {isSel("nogat")&&<rect x="580" y="0" width="120" height={H} fill="rgba(34,100,180,0.18)" filter="url(#m_glow)"/>}
      <text x="640" y="290" textAnchor="middle" fill="#4488cc" fontSize="13" fontFamily="'Cinzel',serif" transform="rotate(-90,640,290)">FLUSS NOGAT</text>
      <line x1="580" y1="0" x2="580" y2={H} stroke="#4488cc" strokeWidth="1.5" strokeDasharray="6,3"/>

      {/* Vorburg (outer ward) */}
      <rect x="60" y="80" width="500" height="420" rx="6"
        fill={zone("vb_outer","#a08040","#c0a050")} stroke={str("vb_outer","#c0a050")} strokeWidth="2.5"
        onClick={()=>hit("vb_outer")} style={{cursor:"pointer"}}/>
      {isSel("vb_outer")&&<rect x="60" y="80" width="500" height="420" rx="6" fill="rgba(180,140,40,0.08)" filter="url(#m_glow)"/>}
      <text x="92" y="112" fill={isSel("vb_outer")?ac:"#9a8040"} fontSize="10" fontFamily="'Cinzel',serif" fontWeight="bold" letterSpacing="1">VORBURG</text>

      {/* Vordertor */}
      <rect x="60" y="248" width="40" height="60" rx="3"
        fill={zone("vb_gate","#cc3322","#ee4433")} stroke={str("vb_gate","#ee4433")} strokeWidth="2.5"
        onClick={()=>hit("vb_gate")} style={{cursor:"pointer"}}/>
      {isSel("vb_gate")&&<rect x="56" y="244" width="48" height="68" rx="4" fill="rgba(220,50,30,0.15)" filter="url(#m_glow)"/>}
      <text x="80" y="282" textAnchor="middle" fill={isSel("vb_gate")?"#ee4433":"#cc5544"} fontSize="8" fontFamily="'Cinzel',serif">HAUPTTOR</text>

      {/* Mittelburg (middle ward) */}
      <rect x="190" y="130" width="340" height="300" rx="5"
        fill={zone("mb_wall","#8870a8","#9980c0")} stroke={str("mb_wall","#9980c0")} strokeWidth="2.5"
        onClick={()=>hit("mb_wall")} style={{cursor:"pointer"}}/>
      {isSel("mb_wall")&&<rect x="190" y="130" width="340" height="300" rx="5" fill="rgba(150,120,200,0.08)" filter="url(#m_glow)"/>}
      <text x="210" y="158" fill={isSel("mb_wall")?ac:"#9980c0"} fontSize="10" fontFamily="'Cinzel',serif" fontWeight="bold" letterSpacing="1">MITTELBURG</text>

      {/* Mittelburg Gate */}
      <rect x="190" y="245" width="35" height="70" rx="3"
        fill={zone("mb_gate","#cc5500","#ee7700")} stroke={str("mb_gate","#ee7700")} strokeWidth="2.5"
        onClick={()=>hit("mb_gate")} style={{cursor:"pointer"}}/>
      <text x="207" y="285" textAnchor="middle" fill={isSel("mb_gate")?"#ee7700":"#cc6600"} fontSize="7" fontFamily="'Cinzel',serif">TOR</text>

      {/* Hochmeisterpalast */}
      <rect x="220" y="160" width="180" height="110" rx="4"
        fill={zone("mb_palace","#cc9922","#ffcc44")} stroke={str("mb_palace","#ffcc44")} strokeWidth="2.5"
        onClick={()=>hit("mb_palace")} style={{cursor:"pointer"}}/>
      {isSel("mb_palace")&&<rect x="215" y="155" width="190" height="120" rx="5" fill="rgba(220,180,40,0.1)" filter="url(#m_glow)"/>}
      {/* Palace towers */}
      {[[220,160],[398,160],[220,268],[398,268]].map(([tx,ty],i)=>(
        <rect key={i} x={tx-10} y={ty-10} width="20" height="20" rx="2"
          fill={isSel("mb_palace")?"#ffcc4444":"#cc992222"} stroke={isSel("mb_palace")?"#ffcc44":"#cc9922"} strokeWidth="1.5"/>
      ))}
      <text x="310" y="218" textAnchor="middle" fill={isSel("mb_palace")?"#ffcc44":"#aa8822"} fontSize="11" fontFamily="'Cinzel',serif" fontWeight="bold">HOCHMEISTER-</text>
      <text x="310" y="232" textAnchor="middle" fill={isSel("mb_palace")?"#ffcc44":"#aa8822"} fontSize="11" fontFamily="'Cinzel',serif" fontWeight="bold">PALAST</text>

      {/* Hochburg (inner ward) */}
      <rect x="360" y="155" width="180" height="210" rx="4"
        fill={zone("hb_keep","#cc4488","#ee55aa")} stroke={str("hb_keep","#ee55aa")} strokeWidth="3"
        onClick={()=>hit("hb_keep")} style={{cursor:"pointer"}}/>
      {isSel("hb_keep")&&<rect x="355" y="150" width="190" height="220" rx="5" fill="rgba(200,60,130,0.1)" filter="url(#m_glow)"/>}
      <text x="450" y="180" textAnchor="middle" fill={isSel("hb_keep")?ac:"#cc4488"} fontSize="10" fontFamily="'Cinzel',serif" fontWeight="bold" letterSpacing="1">HOCHBURG</text>
      {/* Corner towers */}
      {[[360,155],[538,155],[360,363],[538,363]].map(([tx,ty],i)=>(
        <rect key={i} x={tx-12} y={ty-12} width="24" height="24" rx="3"
          fill={isSel("hb_keep")?"#ee55aa33":"#cc448822"} stroke={isSel("hb_keep")?"#ee55aa":"#cc4488"} strokeWidth="2"/>
      ))}

      {/* Great Remter */}
      <rect x="375" y="195" width="150" height="55" rx="3"
        fill={zone("hb_great","#ee4433","#ff5544")} stroke={str("hb_great","#ff5544")} strokeWidth="2"
        onClick={()=>hit("hb_great")} style={{cursor:"pointer"}}/>
      {isSel("hb_great")&&<rect x="370" y="190" width="160" height="65" rx="4" fill="rgba(220,60,40,0.1)" filter="url(#m_glow)"/>}
      <text x="450" y="225" textAnchor="middle" fill={isSel("hb_great")?"#ff5544":"#cc4433"} fontSize="9" fontFamily="'Cinzel',serif">GROSSER REMTER</text>

      {/* Chapel St. Anna */}
      <rect x="375" y="262" width="70" height="85" rx="3"
        fill={zone("hb_chapel","#5588ff","#7799ff")} stroke={str("hb_chapel","#7799ff")} strokeWidth="2"
        onClick={()=>hit("hb_chapel")} style={{cursor:"pointer"}}/>
      {isSel("hb_chapel")&&<rect x="370" y="257" width="80" height="95" rx="4" fill="rgba(80,120,220,0.1)" filter="url(#m_glow)"/>}
      <text x="410" y="307" textAnchor="middle" fill={isSel("hb_chapel")?"#7799ff":"#5566cc"} fontSize="8" fontFamily="'Cinzel',serif">ST. ANNA</text>

      {/* North gate */}
      <rect x="320" y="80" width="60" height="36" rx="3"
        fill={zone("nb_gate","#cc3322","#ee4433")} stroke={str("nb_gate","#ee4433")} strokeWidth="2"
        onClick={()=>hit("nb_gate")} style={{cursor:"pointer"}}/>
      {isSel("nb_gate")&&<rect x="315" y="75" width="70" height="46" rx="4" fill="rgba(200,50,30,0.12)" filter="url(#m_glow)"/>}
      <text x="350" y="100" textAnchor="middle" fill={isSel("nb_gate")?"#ee4433":"#cc4433"} fontSize="8" fontFamily="'Cinzel',serif">NORDTOR ⚠</text>

      {/* Labels for wells/stables etc. */}
      <text x="130" y="440" fill="#7a6a40" fontSize="8" fontFamily="'Cinzel',serif">Stallungen</text>
      <text x="130" y="455" fill="#7a6a40" fontSize="8" fontFamily="'Cinzel',serif">Mühlen</text>
      <text x="130" y="395" fill="#7a6a40" fontSize="8" fontFamily="'Cinzel',serif">Schmieden</text>
      <text x="130" y="200" fill="#7a6a40" fontSize="8" fontFamily="'Cinzel',serif">Brauerei</text>

      {/* Scale */}
      <line x1="80" y1={H-24} x2="230" y2={H-24} stroke={`${ac}44`} strokeWidth="1.5"/>
      <line x1="80" y1={H-20} x2="80" y2={H-28} stroke={`${ac}44`} strokeWidth="1.5"/>
      <line x1="230" y1={H-20} x2="230" y2={H-28} stroke={`${ac}44`} strokeWidth="1.5"/>
      <text x="155" y={H-10} textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="'Cinzel',serif">≈ 200m</text>

      {/* Compass */}
      <g transform={`translate(${W-44},44)`}>
        <circle r="18" fill="rgba(0,0,0,0.6)" stroke={`${ac}44`} strokeWidth="1"/>
        {[["N",0,"#f0e6cc"],["S",180,"#8a7a60"],["O",90,"#8a7a60"],["W",270,"#8a7a60"]].map(([l,a,c])=>{
          const r2=a*Math.PI/180;
          return<text key={l} x={Math.sin(r2)*11} y={-Math.cos(r2)*11+4}
            textAnchor="middle" fill={c} fontSize="8" fontFamily="'Cinzel',serif" fontWeight="bold">{l}</text>;
        })}
      </g>

      {/* Title */}
      <text x="20" y="28" fill={ac} fontSize="15" fontFamily="'Cinzel',serif" fontWeight="bold">MARIENBURG / MALBORK</text>
      <text x="20" y="44" fill="#9a8a60" fontSize="9" fontFamily="'Cinzel',serif">Ordensburg · 1274–1457 · Weichsel-Delta</text>
    </svg>
  );
};

// ── Beaumaris ────────────────────────────────────────────────────────────────
DETAILED_PLANS.beaumaris=({ac,sel,onSel})=>{
  const W=620,H=580;
  const cx=W/2,cy=H/2+20;
  const S=(id,name,icon,type,desc,stats,weakness)=>({id,name,icon,type,desc,stats,weakness});
  const EL=[
    S("outer_wall","Äußere Ringmauer","🧱","Curtainwall","Äußerer Mauerring mit 16 Türmen auf einem fast perfekten Quadrat. Erbaut 1295–1330 unter Edward I. Gilt als technisch vollkommenstes konzentrisch angelegtes Schloss der Welt.",["16 Türme","Höhe: 9m","Dicke: 2m"],null),
    S("inner_ward","Innerer Wehrhof","🏯","Innerer Ring","Der innere Mauerring bildet ein nahezu rundes Quadrat mit 6 massiven Türmen. Enthält Kapelle, Wohn- und Versorgungsgebäude.",["6 Türme","Höhe: 14m","2 Tore"],null),
    S("north_gate","Nordtor","🚪","Haupttor","Das mächtigste Tor der Anlage. Dreigliedrig mit Torhaus, Barbakane und Zugbrücke. Angriffsrichtung des geringsten Widerstands.",["Zugbrücke","Portcullis","Barbakane"],3),
    S("south_gate","Südtor","🚪","Tor","Südlicher Hauptzugang, leicht kleiner als das Nordtor. Ebenfalls mit Pechnasen und Mörder­löchern ausgestattet.",["Mörderlöcher","Fallgitter"],4),
    S("dock_gate","Hafentor","⚓","Seezugang","Schmales Tor an der Südseite, das den direkten Nachschub per Schiff ermöglichte. Strategisch entscheidend für die Versorgung.",["Direkter Seeweg","Wichtig für Versorgung"],2),
    S("moat","Gezeitengraben","🌊","Tidal Moat","Der Wassergraben um die gesamte Anlage war durch Gezeiten gefüllt. Machte eine direkte Belagerung ohne Schiffe nahezu unmöglich.",["Breite: 18m","Tidal gesteuert"],null),
    S("killing_ground","Zwinger","⚔️","Zwingergasse","Der schmale Korridor zwischen äußerem und innerem Mauerring. Angreifer, die den äußeren Ring überwanden, gerieten in dieses Kreuzfeuer.",["Breite: 8m","Kreuzfeuer","Keine Deckung"],null),
    S("chapel","Kapelle","⛪","Kapelle","Im Innenhof des inneren Rings gelegen. Kleiner aber solider Sakralbau im Stil der edwardianischen Gotik.",["Gotischer Stil","1320 erbaut"],null),
  ];
  const el=id=>EL.find(e=>e.id===id)||null;
  const hit=id=>onSel(sel&&sel.id===id?null:el(id));
  const isSel=id=>sel&&sel.id===id;
  const glow=(id,c)=>isSel(id)?`${c}55`:`${c}20`;
  const str2=(id,c)=>isSel(id)?c+"cc":"#8a7a6055";

  // Tower helper
  const tower=(key,tx,ty,r,c)=>(
    <g key={key}>
      {isSel(key)&&<circle cx={tx} cy={ty} r={r+6} fill={`${c}22`} filter="url(#b_glow)"/>}
      <circle cx={tx} cy={ty} r={r} fill={`${c}${isSel(key)?"44":"22"}`}
        stroke={`${c}${isSel(key)?"cc":"66"}`} strokeWidth={isSel(key)?2:1.5}/>
    </g>
  );

  // Outer wall towers (16, evenly spaced)
  const outerR=230,innerR=140,killW=40;
  const outerTowers=Array.from({length:16},(_,i)=>{
    const a=(i/16)*Math.PI*2;
    return{x:cx+Math.cos(a)*outerR,y:cy+Math.sin(a)*outerR};
  });
  const innerTowers=[0,1,2,3,4,5].map(i=>{
    const a=(i/6)*Math.PI*2-Math.PI/4;
    return{x:cx+Math.cos(a)*innerR,y:cy+Math.sin(a)*innerR};
  });

  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"100%",display:"block"}}>
      <defs>
        <radialGradient id="b_bg" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#06100e"/>
          <stop offset="100%" stopColor="#020608"/>
        </radialGradient>
        <filter id="b_glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <pattern id="b_stone" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="transparent"/>
          <rect x="1" y="1" width="8" height="8" fill={`${ac}06`} rx="1"/>
          <rect x="11" y="11" width="8" height="8" fill={`${ac}04`} rx="1"/>
        </pattern>
        <radialGradient id="b_sea" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(20,70,140,0.35)"/>
          <stop offset="100%" stopColor="rgba(10,40,90,0.55)"/>
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#b_bg)"/>
      <rect width={W} height={H} fill="url(#b_stone)" opacity="0.5"/>

      {/* Sea / moat background */}
      <circle cx={cx} cy={cy} r={outerR+30} fill="url(#b_sea)" onClick={()=>hit("moat")} style={{cursor:"pointer"}}/>
      {isSel("moat")&&<circle cx={cx} cy={cy} r={outerR+30} fill="rgba(30,100,180,0.12)" filter="url(#b_glow)"/>}
      <text x={cx} y={cy-outerR-10} textAnchor="middle" fill="#4488cc" fontSize="9" fontFamily="'Cinzel',serif">GEZEITENGRABEN</text>

      {/* Outer ring wall */}
      <circle cx={cx} cy={cy} r={outerR} fill={glow("outer_wall","#7a8860")}
        stroke={str2("outer_wall","#9aaa70")} strokeWidth="3"
        onClick={()=>hit("outer_wall")} style={{cursor:"pointer"}}/>
      {isSel("outer_wall")&&<circle cx={cx} cy={cy} r={outerR} fill="rgba(120,140,80,0.08)" filter="url(#b_glow)"/>}

      {/* Killing ground (zwinger) */}
      <circle cx={cx} cy={cy} r={outerR-killW} fill={glow("killing_ground","#cc4433")}
        stroke={str2("killing_ground","#ee5544")} strokeWidth="2"
        onClick={()=>hit("killing_ground")} style={{cursor:"pointer"}}/>
      {isSel("killing_ground")&&<circle cx={cx} cy={cy} r={outerR-killW} fill="rgba(180,50,30,0.08)" filter="url(#b_glow)"/>}
      <text x={cx+outerR-killW/2-16} y={cy+4} fill={isSel("killing_ground")?"#ee5544":"#7a3322"} fontSize="7" fontFamily="'Cinzel',serif">ZWINGER</text>

      {/* Inner ring wall */}
      <circle cx={cx} cy={cy} r={innerR} fill={glow("inner_ward","#8870a8")}
        stroke={str2("inner_ward","#aa88cc")} strokeWidth="3"
        onClick={()=>hit("inner_ward")} style={{cursor:"pointer"}}/>
      {isSel("inner_ward")&&<circle cx={cx} cy={cy} r={innerR} fill="rgba(130,100,180,0.1)" filter="url(#b_glow)"/>}

      {/* Inner ward courtyard */}
      <circle cx={cx} cy={cy} r={innerR-30} fill="rgba(40,30,20,0.4)"/>

      {/* Outer towers */}
      {outerTowers.map((t,i)=>tower(`ot${i}`,t.x,t.y,11,"#9aaa70"))}

      {/* Inner towers */}
      {innerTowers.map((t,i)=>tower(`it${i}`,t.x,t.y,14,"#aa88cc"))}

      {/* North gate */}
      <rect x={cx-20} y={cy-outerR-8} width="40" height="36" rx="3"
        fill={glow("north_gate","#ffcc44")} stroke={str2("north_gate","#ffdd66")} strokeWidth="2.5"
        onClick={()=>hit("north_gate")} style={{cursor:"pointer"}}/>
      {isSel("north_gate")&&<rect x={cx-25} y={cy-outerR-13} width="50" height="46" rx="4" fill="rgba(220,180,40,0.1)" filter="url(#b_glow)"/>}
      <text x={cx} y={cy-outerR+44} textAnchor="middle" fill={isSel("north_gate")?"#ffdd66":"#cc9922"} fontSize="8" fontFamily="'Cinzel',serif">NORDTOR</text>

      {/* South gate */}
      <rect x={cx-20} y={cy+outerR-28} width="40" height="36" rx="3"
        fill={glow("south_gate","#ff8844")} stroke={str2("south_gate","#ffaa66")} strokeWidth="2.5"
        onClick={()=>hit("south_gate")} style={{cursor:"pointer"}}/>
      {isSel("south_gate")&&<rect x={cx-25} y={cy+outerR-33} width="50" height="46" rx="4" fill="rgba(220,120,40,0.1)" filter="url(#b_glow)"/>}
      <text x={cx} y={cy+outerR+22} textAnchor="middle" fill={isSel("south_gate")?"#ffaa66":"#cc6633"} fontSize="8" fontFamily="'Cinzel',serif">SÜDTOR</text>

      {/* Dock gate */}
      <rect x={cx+outerR-28} y={cy-18} width="36" height="36" rx="3"
        fill={glow("dock_gate","#44aacc")} stroke={str2("dock_gate","#66ccee")} strokeWidth="2"
        onClick={()=>hit("dock_gate")} style={{cursor:"pointer"}}/>
      <text x={cx+outerR+14} y={cy+4} fill={isSel("dock_gate")?"#66ccee":"#3388aa"} fontSize="8" fontFamily="'Cinzel',serif">HAFEN</text>

      {/* Chapel */}
      <rect x={cx-18} y={cy-18} width="36" height="36" rx="3"
        fill={glow("chapel","#5577ff")} stroke={str2("chapel","#7799ff")} strokeWidth="2"
        onClick={()=>hit("chapel")} style={{cursor:"pointer"}}/>
      <text x={cx} y={cy+4} textAnchor="middle" fill={isSel("chapel")?"#7799ff":"#445588"} fontSize="8" fontFamily="'Cinzel',serif">KAP.</text>

      {/* INNER label */}
      <text x={cx} y={cy-innerR+18} textAnchor="middle" fill={isSel("inner_ward")?ac:"#9070c0"} fontSize="9" fontFamily="'Cinzel',serif" fontWeight="bold">INNERER HOF</text>

      {/* Compass */}
      <g transform={`translate(${W-40},40)`}>
        <circle r="16" fill="rgba(0,0,0,0.6)" stroke={`${ac}44`} strokeWidth="1"/>
        {[["N",0,"#f0e6cc"],["S",180,"#8a7a60"],["O",90,"#8a7a60"],["W",270,"#8a7a60"]].map(([l,a,c])=>{
          const r2=a*Math.PI/180;
          return<text key={l} x={Math.sin(r2)*9} y={-Math.cos(r2)*9+4}
            textAnchor="middle" fill={c} fontSize="8" fontFamily="'Cinzel',serif" fontWeight="bold">{l}</text>;
        })}
      </g>

      <text x="20" y="26" fill={ac} fontSize="15" fontFamily="'Cinzel',serif" fontWeight="bold">BEAUMARIS CASTLE</text>
      <text x="20" y="42" fill="#9a8a60" fontSize="9" fontFamily="'Cinzel',serif">Konzentrisch · 1295–1330 · Anglesey, Wales</text>
    </svg>
  );
};

// ── Dover ────────────────────────────────────────────────────────────────────
DETAILED_PLANS.dover=({ac,sel,onSel})=>{
  const W=640,H=580;
  const S=(id,name,icon,type,desc,stats,weakness)=>({id,name,icon,type,desc,stats,weakness});
  const EL=[
    S("great_tower","Großer Turm (Keep)","🏯","Donjon","Einer der mächtigsten Türme Englands, erbaut 1180 unter Heinrich II. Quadratischer Kern mit Vorgebäude, 29m hoch, Mauern 6.4m dick. Gilt als nahezu unbezwingbar.",["Höhe: 29m","Mauern: 6.4m","Erbaut: 1180"],null),
    S("forebuilding","Vorgebäude","🚪","Eingangsanlage","Dreigliedrige Eingangsanlage zum Great Tower. Kontrollierter Zugang über mehrere Torräume und eine Wendeltreppe – Angreifer müssen im Uhrzeigersinn aufsteigen.",["Rechtshändige Treppen","3 Torkammern"],3),
    S("inner_bailey","Innerer Wehrhof","🏰","Innerer Ring","Ovaler innerer Mauerring mit 14 Türmen. Enthält den Great Tower, die Kapelle und Speicherbauten.",["14 Türme","Ovale Form"],null),
    S("outer_bailey","Äußerer Mauerring","🧱","Äußerer Ring","Unregelmäßiger äußerer Mauerring, der dem Kliffverlauf folgt. 20 Türme. Philipps-Tor im Norden ist die historisch schwächste Stelle.",["20 Türme","Dem Kliff angepasst"],null),
    S("north_gate","Philipps-Tor (Nord)","⚠️","Schwachstelle","Der nördliche Zugang ist die historisch anfälligste Stelle. 1216 gelang es Prinz Ludwig von Frankreich beinahe, hier einzudringen.",["Historisch angegriffen","Flacheres Gelände"],1),
    S("coltons_gate","Colton-Tor","🚪","Südtor","Südlicher Eingang, durch zwei massige Türme flankiert. Sicherste Zugangsroute aufgrund des steilsten Kliffabschnitts.",["Steilstes Gelände","Sicherste Route"],null),
    S("cliff","Kreidefelsklippe","⛰️","Natürliche Barriere","Senkrechte Kreideklippen auf der Ost- und Südseite machen Angriffe von dieser Seite nahezu unmöglich.",["Höhe: 100m","Vertikaler Fels"],null),
    S("chapel","Kapelle St. Maria","⛪","Kapelle","Römisch-sächsischer Leuchtturm (Pharos) diente als Grundlage der Burgkapelle. Eines der ältesten Gebäude der Anlage.",["Römisches Fundament","Pharos-Turm"],null),
    S("well","Brunnen im Keep","💧","Wasserversorgung","Tiefer Brunnenschacht im inneren des Great Tower sichert die autonome Wasserversorgung – entscheidend für lange Belagerungen.",["Tiefe: 40m","Belagerungssicherheit"],null),
  ];
  const el=id=>EL.find(e=>e.id===id)||null;
  const hit=id=>onSel(sel&&sel.id===id?null:el(id));
  const isSel=id=>sel&&sel.id===id;
  const glo=(id,c)=>isSel(id)?`${c}44`:`${c}18`;
  const st=(id,c)=>isSel(id)?c+"cc":"#8a7a6055";

  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"100%",display:"block"}}>
      <defs>
        <radialGradient id="d_bg" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#0e0b06"/>
          <stop offset="100%" stopColor="#050402"/>
        </radialGradient>
        <filter id="d_glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <pattern id="d_stone" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="transparent"/>
          <rect x="1" y="1" width="8" height="8" fill={`${ac}06`} rx="1"/>
          <rect x="11" y="11" width="8" height="8" fill={`${ac}04`} rx="1"/>
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#d_bg)"/>
      <rect width={W} height={H} fill="url(#d_stone)" opacity="0.55"/>

      {/* Cliff (east) */}
      <path d="M540,0 Q560,100 555,200 Q565,300 550,400 Q545,500 540,580 L640,580 L640,0 Z"
        fill="rgba(100,80,40,0.25)" stroke="rgba(140,110,50,0.4)" strokeWidth="1.5"
        onClick={()=>hit("cliff")} style={{cursor:"pointer"}}/>
      {isSel("cliff")&&<path d="M540,0 Q560,100 555,200 Q565,300 550,400 Q545,500 540,580 L640,580 L640,0 Z" fill="rgba(140,110,50,0.1)" filter="url(#d_glow)"/>}
      <text x="590" y="290" textAnchor="middle" fill="#8a7040" fontSize="10" fontFamily="'Cinzel',serif" transform="rotate(90,590,290)">KREIDEKLIPPEN</text>

      {/* Outer bailey (irregular polygon) */}
      <path d="M80,100 L200,60 L420,55 L530,100 L535,200 Q540,300 530,400 L420,500 L200,510 L80,460 L60,300 Z"
        fill={glo("outer_bailey","#7a8860")} stroke={st("outer_bailey","#9aaa70")} strokeWidth="2.5"
        onClick={()=>hit("outer_bailey")} style={{cursor:"pointer"}}/>
      {isSel("outer_bailey")&&<path d="M80,100 L200,60 L420,55 L530,100 L535,200 Q540,300 530,400 L420,500 L200,510 L80,460 L60,300 Z"
        fill="rgba(100,130,70,0.07)" filter="url(#d_glow)"/>}
      <text x="110" y="480" fill={isSel("outer_bailey")?ac:"#7a8860"} fontSize="9" fontFamily="'Cinzel',serif">ÄUSSERER RING</text>

      {/* Outer towers (20) */}
      {[{x:80,y:100},{x:130,y:65},{x:200,y:60},{x:280,y:56},{x:360,y:55},{x:420,y:55},{x:480,y:70},{x:530,y:100},{x:534,y:160},{x:535,y:220},{x:536,y:290},{x:533,y:360},{x:528,y:420},{x:500,y:480},{x:420,y:500},{x:330,y:508},{x:240,y:510},{x:155,y:505},{x:90,y:470},{x:62,y:380}].map((t,i)=>(
        <circle key={i} cx={t.x} cy={t.y} r="10" fill={`${ac}18`} stroke={`${ac}55`} strokeWidth="1.5"/>
      ))}

      {/* Inner bailey */}
      <ellipse cx="310" cy="290" rx="150" ry="170"
        fill={glo("inner_bailey","#8870a8")} stroke={st("inner_bailey","#aa88cc")} strokeWidth="2.5"
        onClick={()=>hit("inner_bailey")} style={{cursor:"pointer"}}/>
      {isSel("inner_bailey")&&<ellipse cx="310" cy="290" rx="150" ry="170" fill="rgba(130,100,180,0.08)" filter="url(#d_glow)"/>}
      <text x="310" y="150" textAnchor="middle" fill={isSel("inner_bailey")?ac:"#9070c0"} fontSize="9" fontFamily="'Cinzel',serif" fontWeight="bold">INNERER HOF</text>

      {/* Inner towers (14) */}
      {[{x:165,y:220},{x:165,y:290},{x:165,y:360},{x:220,y:140},{x:310,y:127},{x:400,y:140},{x:452,y:220},{x:458,y:290},{x:452,y:360},{x:400,y:435},{x:310,y:455},{x:220,y:435},{x:190,y:170},{x:430,y:170}].map((t,i)=>(
        <rect key={i} x={t.x-8} y={t.y-8} width="16" height="16" rx="2"
          fill={`${ac}22`} stroke={`${ac}66`} strokeWidth="1.5"/>
      ))}

      {/* Great Tower */}
      <rect x="265" y="240" width="90" height="90" rx="4"
        fill={glo("great_tower","#ffcc44")} stroke={st("great_tower","#ffdd66")} strokeWidth="3"
        onClick={()=>hit("great_tower")} style={{cursor:"pointer"}}/>
      {isSel("great_tower")&&<rect x="258" y="233" width="104" height="104" rx="5" fill="rgba(220,180,40,0.1)" filter="url(#d_glow)"/>}
      {[[265,240],[353,240],[265,328],[353,328]].map(([tx,ty],i)=>(
        <rect key={i} x={tx-10} y={ty-10} width="20" height="20" rx="2"
          fill={isSel("great_tower")?"#ffdd6644":"#cc992222"} stroke={isSel("great_tower")?"#ffdd66":"#cc9922"} strokeWidth="1.5"/>
      ))}
      <text x="310" y="286" textAnchor="middle" fill={isSel("great_tower")?"#ffdd66":"#aa8822"} fontSize="10" fontFamily="'Cinzel',serif" fontWeight="bold">GREAT</text>
      <text x="310" y="300" textAnchor="middle" fill={isSel("great_tower")?"#ffdd66":"#aa8822"} fontSize="10" fontFamily="'Cinzel',serif" fontWeight="bold">TOWER</text>

      {/* Forebuilding */}
      <rect x="353" y="258" width="40" height="54" rx="3"
        fill={glo("forebuilding","#ff8844")} stroke={st("forebuilding","#ffaa66")} strokeWidth="2"
        onClick={()=>hit("forebuilding")} style={{cursor:"pointer"}}/>
      <text x="373" y="289" textAnchor="middle" fill={isSel("forebuilding")?"#ffaa66":"#994422"} fontSize="7" fontFamily="'Cinzel',serif">VORB.</text>

      {/* North gate */}
      <rect x="280" y="55" width="60" height="34" rx="3"
        fill={glo("north_gate","#ee3322")} stroke={st("north_gate","#ff4433")} strokeWidth="2.5"
        onClick={()=>hit("north_gate")} style={{cursor:"pointer"}}/>
      {isSel("north_gate")&&<rect x="274" y="49" width="72" height="46" rx="4" fill="rgba(200,40,30,0.12)" filter="url(#d_glow)"/>}
      <text x="310" y="76" textAnchor="middle" fill={isSel("north_gate")?"#ff4433":"#cc3322"} fontSize="8" fontFamily="'Cinzel',serif">PHILIPPS-TOR ⚠</text>

      {/* South gate */}
      <rect x="265" y="500" width="60" height="32" rx="3"
        fill={glo("coltons_gate","#44aacc")} stroke={st("coltons_gate","#66ccee")} strokeWidth="2"
        onClick={()=>hit("coltons_gate")} style={{cursor:"pointer"}}/>
      <text x="295" y="520" textAnchor="middle" fill={isSel("coltons_gate")?"#66ccee":"#336688"} fontSize="8" fontFamily="'Cinzel',serif">COLTON-TOR</text>

      {/* Chapel */}
      <rect x="222" y="220" width="36" height="44" rx="3"
        fill={glo("chapel","#5577ff")} stroke={st("chapel","#7799ff")} strokeWidth="2"
        onClick={()=>hit("chapel")} style={{cursor:"pointer"}}/>
      <text x="240" y="246" textAnchor="middle" fill={isSel("chapel")?"#7799ff":"#445588"} fontSize="7" fontFamily="'Cinzel',serif">PHAROS</text>

      {/* Well */}
      <circle cx="290" cy="300" r="8" fill={glo("well","#44ccff")} stroke={st("well","#66ddff")} strokeWidth="1.5"
        onClick={()=>hit("well")} style={{cursor:"pointer"}}/>
      <text x="290" y="328" textAnchor="middle" fill={isSel("well")?"#66ddff":"#336688"} fontSize="7" fontFamily="'Cinzel',serif">BRUNN.</text>

      {/* Compass */}
      <g transform={`translate(${W-40},40)`}>
        <circle r="16" fill="rgba(0,0,0,0.6)" stroke={`${ac}44`} strokeWidth="1"/>
        {[["N",0,"#f0e6cc"],["S",180,"#8a7a60"],["O",90,"#8a7a60"],["W",270,"#8a7a60"]].map(([l,a,c])=>{
          const r2=a*Math.PI/180;
          return<text key={l} x={Math.sin(r2)*9} y={-Math.cos(r2)*9+4}
            textAnchor="middle" fill={c} fontSize="8" fontFamily="'Cinzel',serif" fontWeight="bold">{l}</text>;
        })}
      </g>

      <text x="20" y="26" fill={ac} fontSize="15" fontFamily="'Cinzel',serif" fontWeight="bold">DOVER CASTLE</text>
      <text x="20" y="42" fill="#9a8a60" fontSize="9" fontFamily="'Cinzel',serif">Königliche Festung · 1180 · Kent, England</text>
    </svg>
  );
};

// ── Osaka ─────────────────────────────────────────────────────────────────────
DETAILED_PLANS.osaka=({ac,sel,onSel})=>{
  const W=640,H=600;
  const cx=W/2,cy=H/2+20;
  const S=(id,name,icon,type,desc,stats,weakness)=>({id,name,icon,type,desc,stats,weakness});
  const EL=[
    S("tenshukaku","Tenshukaku (天守閣)","🏯","Hauptturm","Fünfstöckiger Hauptturm, erbaut 1583 von Toyotomi Hideyoshi. 58m hoch, mit geschwungenen Dächern (Irimoya) und vergoldeten Tigerdekorationen. Symbol japanischer Macht.",["Höhe: 58m","5 Stockwerke","Gold-Dekoration"],null),
    S("honmaru","Honmaru (本丸)","🏰","Innerste Zone","Das innerste der drei konzentrischen Vierecke. Enthält den Tenshukaku, den Otemon und mehrere Yagura (Ecktürme).",["6 Yagura","Wassergraben: 30m"],null),
    S("ninomaru","Ninomaru (二の丸)","🧱","Zweite Zone","Mittlerer Mauerring. Enthält Verwaltungsgebäude und dient als Pufferzone. Breiterer Wassergraben.",["Breite: 400m","Steinmauern: 14m"],null),
    S("sannomaru","Sannomaru (三の丸)","🟤","Äußere Zone","Äußerster Ring. Ehemalige Stadtteile der Vasallen. Im 17. Jh. mit Wassergraben und Steinwällen gesichert.",["Größte Zone","Stadtartig angelegt"],null),
    S("otemon","Otemon (大手門)","🚪","Haupttor","Das prächtigste Tor der Anlage. Doppeltes Torhaus-System mit riesigen Eingangspfosten. Direkter Angriffspunkt.",["Riesige Holztore","Wachttürme beidseitig"],3),
    S("sakuramon","Sakuramon (桜門)","🚪","Tor","Das Kirschblütentor. Zweites Haupttor mit den berühmten 'Sanraku'-Dekorationen. Führt direkt zum Honmaru.",["Stein-Fundament","Kirschblüten-Motiv"],4),
    S("moat_inner","Innerer Wassergraben","🌊","Wassergraben","Innerer Graben trennt Honmaru von Ninomaru. Breite 30m, tiefe Steinböschungen machen Überwinden sehr schwer.",["Breite: 30m","Steinböschung"],null),
    S("moat_outer","Äußerer Wassergraben","🌊","Wassergraben","Äußerer Graben. Historisch gefüllt, heute teilweise trocken. Schützte ursprünglich die gesamte Burg.",["Breite: 50m","2.5km Umfang"],null),
    S("yagura_ne","Nordost-Yagura","🗼","Eckturm","Sogenannte 'Taubenturm' – wichtigster Eckturm im Nordosten. Diente als Lager und Beobachtungsposten.",["3 Stockwerke","Nachschublager"],null),
    S("kin_tiger","Goldener Tiger","⭐","Dekoration","Die goldenen Tigerfiguren auf den Dachgiebeln sind Symbol der Toyotomi-Macht. Reine Repräsentation.",["24-karätiges Gold","Toyotomi-Symbol"],null),
  ];
  const el=id=>EL.find(e=>e.id===id)||null;
  const hit=id=>onSel(sel&&sel.id===id?null:el(id));
  const isSel=id=>sel&&sel.id===id;
  const glo=(id,c)=>isSel(id)?`${c}44`:`${c}1a`;
  const st=(id,c)=>isSel(id)?c+"cc":"#8a7a6055";

  const ringRects=[
    {id:"sannomaru",w:560,h:520,c:"#8a7040"},
    {id:"ninomaru",w:400,h:360,c:"#7a8060"},
    {id:"honmaru",w:240,h:220,c:"#9080c0"},
  ];

  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"100%",display:"block"}}>
      <defs>
        <radialGradient id="o_bg" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#0a0c06"/>
          <stop offset="100%" stopColor="#040502"/>
        </radialGradient>
        <filter id="o_glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <pattern id="o_stone" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="transparent"/>
          <rect x="1" y="1" width="8" height="8" fill={`${ac}06`} rx="1"/>
          <rect x="11" y="11" width="8" height="8" fill={`${ac}04`} rx="1"/>
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#o_bg)"/>
      <rect width={W} height={H} fill="url(#o_stone)" opacity="0.55"/>

      {/* Concentric rings + moats */}
      {ringRects.map((r,i)=>{
        const x=cx-r.w/2, y=cy-r.h/2;
        const moatW=i===0?12:18;
        return(
          <g key={r.id}>
            {/* Moat */}
            {i<2&&<rect x={x-moatW} y={y-moatW} width={r.w+moatW*2} height={r.h+moatW*2} rx="6"
              fill={`rgba(30,80,160,${i===0?0.2:0.3})`}
              stroke={`rgba(50,120,200,${i===0?0.3:0.45})`} strokeWidth="1.5"
              onClick={()=>hit(i===0?"moat_outer":"moat_inner")} style={{cursor:"pointer"}}/>}
            {/* Wall */}
            <rect x={x} y={y} width={r.w} height={r.h} rx="4"
              fill={glo(r.id,r.c)} stroke={st(r.id,r.c)} strokeWidth={i===2?3:2}
              onClick={()=>hit(r.id)} style={{cursor:"pointer"}}/>
            {isSel(r.id)&&<rect x={x-4} y={y-4} width={r.w+8} height={r.h+8} rx="5"
              fill={`${r.c}08`} filter="url(#o_glow)"/>}
          </g>
        );
      })}

      {/* Zone labels */}
      <text x={cx-265} y={cy-248} fill={isSel("sannomaru")?ac:"#8a7040"} fontSize="9" fontFamily="'Cinzel',serif" fontWeight="bold">三の丸 SANNOMARU</text>
      <text x={cx-185} y={cy-168} fill={isSel("ninomaru")?ac:"#7a8060"} fontSize="9" fontFamily="'Cinzel',serif" fontWeight="bold">二の丸 NINOMARU</text>
      <text x={cx-108} y={cy-100} fill={isSel("honmaru")?ac:"#9080c0"} fontSize="9" fontFamily="'Cinzel',serif" fontWeight="bold">本丸 HONMARU</text>

      {/* Honmaru corner yagura */}
      {[[cx-120,cy-110],[cx+120,cy-110],[cx-120,cy+110],[cx+120,cy+110]].map(([tx,ty],i)=>(
        <rect key={i} x={tx-9} y={ty-9} width="18" height="18" rx="2"
          fill={isSel("yagura_ne")&&i===0?"#cc884444":"#88664422"} stroke={isSel("yagura_ne")&&i===0?"#cc8844":"#88664455"} strokeWidth="1.5"
          onClick={i===0?()=>hit("yagura_ne"):undefined} style={i===0?{cursor:"pointer"}:{}}/>
      ))}
      {isSel("yagura_ne")&&<rect x={cx-129} y={cy-119} width="36" height="36" rx="4" fill="rgba(180,120,40,0.1)" filter="url(#o_glow)"/>}
      <text x={cx-120} y={cy-128} textAnchor="middle" fill={isSel("yagura_ne")?"#cc8844":"#66440044"} fontSize="7" fontFamily="'Cinzel',serif">YAGURA</text>

      {/* Tenshukaku */}
      <rect x={cx-28} y={cy-32} width="56" height="64" rx="3"
        fill={glo("tenshukaku","#ffcc44")} stroke={st("tenshukaku","#ffee66")} strokeWidth="3"
        onClick={()=>hit("tenshukaku")} style={{cursor:"pointer"}}/>
      {isSel("tenshukaku")&&<rect x={cx-35} y={cy-39} width="70" height="78" rx="4" fill="rgba(220,180,40,0.12)" filter="url(#o_glow)"/>}
      {/* Roof lines */}
      <line x1={cx-28} y1={cy-18} x2={cx+28} y2={cy-18} stroke={isSel("tenshukaku")?"#ffee66":"#aa882255"} strokeWidth="1"/>
      <line x1={cx-28} y1={cy+4} x2={cx+28} y2={cy+4} stroke={isSel("tenshukaku")?"#ffee66":"#aa882255"} strokeWidth="1"/>
      <text x={cx} y={cy-8} textAnchor="middle" fill={isSel("tenshukaku")?"#ffee66":"#aa8822"} fontSize="8" fontFamily="'Cinzel',serif" fontWeight="bold">天守閣</text>
      <text x={cx} y={cy+8} textAnchor="middle" fill={isSel("tenshukaku")?"#ffcc44":"#887722"} fontSize="7" fontFamily="'Cinzel',serif">TENSHU-</text>
      <text x={cx} y={cy+20} textAnchor="middle" fill={isSel("tenshukaku")?"#ffcc44":"#887722"} fontSize="7" fontFamily="'Cinzel',serif">KAKU</text>

      {/* Otemon (main gate, south) */}
      <rect x={cx-22} y={cy+110} width="44" height="30" rx="3"
        fill={glo("otemon","#ee4433")} stroke={st("otemon","#ff5544")} strokeWidth="2.5"
        onClick={()=>hit("otemon")} style={{cursor:"pointer"}}/>
      {isSel("otemon")&&<rect x={cx-27} y={cy+105} width="54" height="40" rx="4" fill="rgba(200,50,30,0.1)" filter="url(#o_glow)"/>}
      <text x={cx} y={cy+129} textAnchor="middle" fill={isSel("otemon")?"#ff5544":"#cc3322"} fontSize="8" fontFamily="'Cinzel',serif">大手門</text>

      {/* Sakuramon (north gate to honmaru) */}
      <rect x={cx-22} y={cy-140} width="44" height="28" rx="3"
        fill={glo("sakuramon","#ff8844")} stroke={st("sakuramon","#ffaa66")} strokeWidth="2"
        onClick={()=>hit("sakuramon")} style={{cursor:"pointer"}}/>
      {isSel("sakuramon")&&<rect x={cx-27} y={cy-145} width="54" height="38" rx="4" fill="rgba(200,110,40,0.1)" filter="url(#o_glow)"/>}
      <text x={cx} y={cy-148} textAnchor="middle" fill={isSel("sakuramon")?"#ffaa66":"#cc6633"} fontSize="8" fontFamily="'Cinzel',serif">桜門</text>

      {/* Moat labels */}
      <text x={cx+215} y={cy} fill="#3a88cc" fontSize="8" fontFamily="'Cinzel',serif" transform={`rotate(-90,${cx+215},${cy})`}>ÄUSSERER GRABEN</text>
      <text x={cx+133} y={cy} fill="#4499dd" fontSize="7" fontFamily="'Cinzel',serif" transform={`rotate(-90,${cx+133},${cy})`}>INNERER GRABEN</text>

      {/* Compass */}
      <g transform={`translate(${W-40},40)`}>
        <circle r="16" fill="rgba(0,0,0,0.6)" stroke={`${ac}44`} strokeWidth="1"/>
        {[["N",0,"#f0e6cc"],["S",180,"#8a7a60"],["O",90,"#8a7a60"],["W",270,"#8a7a60"]].map(([l,a,c])=>{
          const r2=a*Math.PI/180;
          return<text key={l} x={Math.sin(r2)*9} y={-Math.cos(r2)*9+4}
            textAnchor="middle" fill={c} fontSize="8" fontFamily="'Cinzel',serif" fontWeight="bold">{l}</text>;
        })}
      </g>

      <text x="20" y="26" fill={ac} fontSize="15" fontFamily="'Cinzel',serif" fontWeight="bold">大阪城 OSAKA-JO</text>
      <text x="20" y="42" fill="#9a8a60" fontSize="9" fontFamily="'Cinzel',serif">Toyotomi-Burg · 1583 · Osaka, Japan</text>
    </svg>
  );
};

// ── Stirling ──────────────────────────────────────────────────────────────────
DETAILED_PLANS.stirling=({ac,sel,onSel})=>{
  const W=640,H=580;
  const S=(id,name,icon,type,desc,stats,weakness)=>({id,name,icon,type,desc,stats,weakness});
  const EL=[
    S("rock","Vulkanfels","⛰️","Natürliche Barriere","Stirling thront auf einem erloschenen Vulkankegel, 75m über der Umgebung. Drei Seiten bilden senkrechte Felswände – ein natürlicher Donjon.",["Höhe: 75m","3 Seiten unzugänglich"],null),
    S("great_hall","Großer Saal","🏛️","Repräsentationsbau","Der größte mittelalterliche Saal Schottlands, erbaut 1503 unter James IV. 42m lang, Hammerbalkendecke. Dreh- und Angelpunkt des schottischen Hofes.",["Länge: 42m","Hammerbalkendecke","1503 erbaut"],null),
    S("palace","Königspalast","👑","Palast","Renaissancepalast aus den 1540er-Jahren. Außenwände mit einzigartigen Renaissance-Skulpturen ('Stirling Heads'). Repräsentativster Renaissancebau Schottlands.",["Stirling Heads","Renaissance-Stil","1540er"],null),
    S("chapel_royal","Kapelle Royal","⛪","Kapelle","Königliche Kapelle, 1594 von James VI erbaut für die Taufe seines Sohnes. Hochwertige Innenausstattung aus Eichenholz.",["1594 erbaut","Königliche Taufe"],null),
    S("forework","Forework-Torhaus","🚪","Haupttor","Das spektakuläre Torhaus an der einzig angreifbaren Südseite. Flanktürme, Zugbrücke und Barbakane. Einzige reale Angriffsroute.",["Zugbrücke","Barbakane","2 Flanktürme"],2),
    S("esplanade","Esplanade","⚔️","Vorplatz","Der breite Vorplatz vor dem Forework. Historisch freies Schussfeld. Hier finden heute die Edinburgh-Tattoo-ähnlichen Zeremonien statt.",["Freies Schussfeld","Angriffsroute"],1),
    S("nether_bailey","Nether Bailey","🏰","Unterer Hof","Unterer Burghof, ursprünglich Verwaltungszentrum. Enthält das Große Magazin und das Mühlengebäude.",["Magazin","Stallungen"],null),
    S("great_kitchens","Große Küchen","🍖","Versorgung","Ausgedehnte Küchenanlage, fähig Hunderte Hofleute zu versorgen. Strategisch wichtig für lange Belagerungen.",["4 Feuerstellen","Große Vorratskammern"],null),
    S("crag","Crag & Tail","🌄","Geologie","Die charakteristische Geländeform: Burg auf dem 'Crag' (Fels), Altstadt auf dem abfallenden 'Tail' (Schwanz) dahinter.",["Eiszeit-Geologie","Natürlicher Schutz"],null),
  ];
  const el=id=>EL.find(e=>e.id===id)||null;
  const hit=id=>onSel(sel&&sel.id===id?null:el(id));
  const isSel=id=>sel&&sel.id===id;
  const glo=(id,c)=>isSel(id)?`${c}44`:`${c}1a`;
  const st=(id,c)=>isSel(id)?c+"cc":"#8a7a6055";

  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"100%",display:"block"}}>
      <defs>
        <radialGradient id="s_bg" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#080a0e"/>
          <stop offset="100%" stopColor="#030405"/>
        </radialGradient>
        <filter id="s_glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <pattern id="s_stone" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="transparent"/>
          <rect x="1" y="1" width="8" height="8" fill={`${ac}06`} rx="1"/>
          <rect x="11" y="11" width="8" height="8" fill={`${ac}04`} rx="1"/>
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#s_bg)"/>
      <rect width={W} height={H} fill="url(#s_stone)" opacity="0.55"/>

      {/* Crag & Tail terrain */}
      <path d="M120,480 Q100,420 90,350 Q80,280 110,220 Q130,160 170,120 Q220,70 300,55 Q380,42 450,60 Q510,75 540,110 Q570,145 560,200 Q550,260 520,300 Q490,340 460,370 Q430,400 400,430 Q360,465 300,480 Q240,495 180,490 Z"
        fill={glo("rock","#6a5a30")} stroke={st("rock","#8a7848")} strokeWidth="2"
        onClick={()=>hit("rock")} style={{cursor:"pointer"}}/>
      {isSel("rock")&&<path d="M120,480 Q100,420 90,350 Q80,280 110,220 Q130,160 170,120 Q220,70 300,55 Q380,42 450,60 Q510,75 540,110 Q570,145 560,200 Q550,260 520,300 Q490,340 460,370 Q430,400 400,430 Q360,465 300,480 Q240,495 180,490 Z"
        fill="rgba(100,80,40,0.1)" filter="url(#s_glow)"/>}
      <text x="150" y="455" fill={isSel("rock")?ac:"#7a6838"} fontSize="9" fontFamily="'Cinzel',serif">VULKANFELS</text>

      {/* Esplanade */}
      <rect x="190" y="420" width="210" height="65" rx="4"
        fill={glo("esplanade","#cc4433")} stroke={st("esplanade","#ee5544")} strokeWidth="2"
        onClick={()=>hit("esplanade")} style={{cursor:"pointer"}}/>
      {isSel("esplanade")&&<rect x="185" y="415" width="220" height="75" rx="5" fill="rgba(180,50,30,0.1)" filter="url(#s_glow)"/>}
      <text x="295" y="457" textAnchor="middle" fill={isSel("esplanade")?"#ee5544":"#cc4433"} fontSize="10" fontFamily="'Cinzel',serif">ESPLANADE ⚠</text>

      {/* Forework gatehouse */}
      <rect x="245" y="390" width="100" height="46" rx="4"
        fill={glo("forework","#ff8844")} stroke={st("forework","#ffaa66")} strokeWidth="2.5"
        onClick={()=>hit("forework")} style={{cursor:"pointer"}}/>
      {isSel("forework")&&<rect x="239" y="384" width="112" height="58" rx="5" fill="rgba(200,110,40,0.12)" filter="url(#s_glow)"/>}
      {/* Flanking towers */}
      <rect x="233" y="388" width="22" height="42" rx="3" fill={glo("forework","#ff8844")} stroke={st("forework","#ffaa66")} strokeWidth="1.5" onClick={()=>hit("forework")} style={{cursor:"pointer"}}/>
      <rect x="335" y="388" width="22" height="42" rx="3" fill={glo("forework","#ff8844")} stroke={st("forework","#ffaa66")} strokeWidth="1.5" onClick={()=>hit("forework")} style={{cursor:"pointer"}}/>
      <text x="295" y="418" textAnchor="middle" fill={isSel("forework")?"#ffaa66":"#cc7733"} fontSize="9" fontFamily="'Cinzel',serif" fontWeight="bold">FOREWORK</text>

      {/* Nether Bailey */}
      <path d="M210,380 L210,290 Q215,260 240,250 L360,250 Q385,260 390,290 L390,380 Z"
        fill={glo("nether_bailey","#7a8060")} stroke={st("nether_bailey","#9aaa70")} strokeWidth="2"
        onClick={()=>hit("nether_bailey")} style={{cursor:"pointer"}}/>
      {isSel("nether_bailey")&&<path d="M210,380 L210,290 Q215,260 240,250 L360,250 Q385,260 390,290 L390,380 Z"
        fill="rgba(100,130,70,0.07)" filter="url(#s_glow)"/>}
      <text x="300" y="325" textAnchor="middle" fill={isSel("nether_bailey")?ac:"#7a8060"} fontSize="9" fontFamily="'Cinzel',serif">NETHER</text>
      <text x="300" y="340" textAnchor="middle" fill={isSel("nether_bailey")?ac:"#7a8060"} fontSize="9" fontFamily="'Cinzel',serif">BAILEY</text>

      {/* Great Hall */}
      <rect x="220" y="180" width="170" height="62" rx="4"
        fill={glo("great_hall","#ffcc44")} stroke={st("great_hall","#ffee66")} strokeWidth="2.5"
        onClick={()=>hit("great_hall")} style={{cursor:"pointer"}}/>
      {isSel("great_hall")&&<rect x="214" y="174" width="182" height="74" rx="5" fill="rgba(220,180,40,0.1)" filter="url(#s_glow)"/>}
      <text x="305" y="214" textAnchor="middle" fill={isSel("great_hall")?"#ffee66":"#aa8822"} fontSize="11" fontFamily="'Cinzel',serif" fontWeight="bold">GROSSER SAAL</text>

      {/* Palace */}
      <rect x="348" y="140" width="130" height="130" rx="4"
        fill={glo("palace","#aa44cc")} stroke={st("palace","#cc66ee")} strokeWidth="2.5"
        onClick={()=>hit("palace")} style={{cursor:"pointer"}}/>
      {isSel("palace")&&<rect x="342" y="134" width="142" height="142" rx="5" fill="rgba(150,50,180,0.1)" filter="url(#s_glow)"/>}
      {[[348,140],[476,140],[348,268],[476,268]].map(([tx,ty],i)=>(
        <rect key={i} x={tx-10} y={ty-10} width="20" height="20" rx="2"
          fill={isSel("palace")?"#cc66ee33":"#aa44cc22"} stroke={isSel("palace")?"#cc66ee":"#aa44cc"} strokeWidth="1.5"/>
      ))}
      <text x="413" y="202" textAnchor="middle" fill={isSel("palace")?"#cc66ee":"#884499"} fontSize="10" fontFamily="'Cinzel',serif" fontWeight="bold">KÖNIGS-</text>
      <text x="413" y="218" textAnchor="middle" fill={isSel("palace")?"#cc66ee":"#884499"} fontSize="10" fontFamily="'Cinzel',serif" fontWeight="bold">PALAST</text>

      {/* Chapel Royal */}
      <rect x="220" y="110" width="110" height="62" rx="4"
        fill={glo("chapel_royal","#5577ff")} stroke={st("chapel_royal","#7799ff")} strokeWidth="2"
        onClick={()=>hit("chapel_royal")} style={{cursor:"pointer"}}/>
      {isSel("chapel_royal")&&<rect x="214" y="104" width="122" height="74" rx="5" fill="rgba(70,100,220,0.1)" filter="url(#s_glow)"/>}
      <text x="275" y="144" textAnchor="middle" fill={isSel("chapel_royal")?"#7799ff":"#4455aa"} fontSize="10" fontFamily="'Cinzel',serif" fontWeight="bold">KAPELLE</text>
      <text x="275" y="158" textAnchor="middle" fill={isSel("chapel_royal")?"#7799ff":"#4455aa"} fontSize="9" fontFamily="'Cinzel',serif">ROYAL</text>

      {/* Great Kitchens */}
      <rect x="220" y="250" width="110" height="55" rx="3"
        fill={glo("great_kitchens","#44aa88")} stroke={st("great_kitchens","#66ccaa")} strokeWidth="2"
        onClick={()=>hit("great_kitchens")} style={{cursor:"pointer"}}/>
      <text x="275" y="282" textAnchor="middle" fill={isSel("great_kitchens")?"#66ccaa":"#338866"} fontSize="9" fontFamily="'Cinzel',serif">GR. KÜCHEN</text>

      {/* Compass */}
      <g transform={`translate(${W-40},40)`}>
        <circle r="16" fill="rgba(0,0,0,0.6)" stroke={`${ac}44`} strokeWidth="1"/>
        {[["N",0,"#f0e6cc"],["S",180,"#8a7a60"],["O",90,"#8a7a60"],["W",270,"#8a7a60"]].map(([l,a,c])=>{
          const r2=a*Math.PI/180;
          return<text key={l} x={Math.sin(r2)*9} y={-Math.cos(r2)*9+4}
            textAnchor="middle" fill={c} fontSize="8" fontFamily="'Cinzel',serif" fontWeight="bold">{l}</text>;
        })}
      </g>

      <text x="20" y="26" fill={ac} fontSize="15" fontFamily="'Cinzel',serif" fontWeight="bold">STIRLING CASTLE</text>
      <text x="20" y="42" fill="#9a8a60" fontSize="9" fontFamily="'Cinzel',serif">Schottische Königsburg · 1100er · Stirling, Schottland</text>
    </svg>
  );
};

// ── Red Fort ──────────────────────────────────────────────────────────────────
DETAILED_PLANS.red_fort=({ac,sel,onSel})=>{
  const W=660,H=580;
  const S=(id,name,icon,type,desc,stats,weakness)=>({id,name,icon,type,desc,stats,weakness});
  const EL=[
    S("lahore_gate","Lahori-Tor (West)","🚪","Haupttor","Das Haupttor der Festung, erbaut 1648 unter Shah Jahan. Massiver roter Sandsteinbogen, flankiert von achteckigen Türmen. Heute Eingang zu nationalen Zeremonien.",["Roter Sandstein","1648 erbaut","Nationales Symbol"],3),
    S("delhi_gate","Delhi-Tor (Süd)","🚪","Südtor","Das architektonisch prächtigere Tor, einst für den Kaiser reserviert. Kleine Elefanten in Stein gemeißelt – Symbol kaiserlicher Macht.",["Kaiserlicher Eingang","Steinelefanten"],4),
    S("diwan_am","Diwan-i-Am","🏛️","Audienzsaal","'Halle der Allgemeinen Audienz'. Offener Säulenraum, wo der Kaiser öffentliche Audienzen abhielt. 60 Sandsteinpfeiler. Thronalkov mit Marmor.",["60 Säulen","Marmor-Thron","Öffentlich zugänglich"],null),
    S("diwan_khas","Diwan-i-Khas","💎","Privataudienzsaal","'Halle der Privaten Audienz'. Geheimer Treffpunkt für VIPs. Enthielt einst den Pfauenthron ('Takht-e-Tavus') – wertvollsten Thron der Welt.",["Pfauenthron","Persienschrift","Nur Adel"],null),
    S("hammam","Hammam","🛁","Bad","Kaiserliche Badeanlage mit kalten, lauwarmen und heißen Räumen. Inlaid-Marmor und Blumenmotive. Privat für den Kaiser und Haremsdamen.",["3 Kammern","Marmorinlays","Kaiserlich"],null),
    S("moti_masjid","Moti Masjid","🕌","Moschee","'Perlenmoschee', erbaut 1659 von Aurangzeb. Reinweißer Marmor, drei Kuppeln. Privatmoschee des Kaisers – kein gewöhnlicher Zutritt.",["Weißer Marmor","3 Kuppeln","1659 erbaut"],null),
    S("rang_mahal","Rang Mahal","🌸","Palast","'Palast der Farben'. Einst bunt bemalt und vergoldet. Residenz der kaiserlichen Damen. Lotusförmiges Wasserbecken im Zentrum.",["Ehemals bunt","Lotusbassin","Haremstrakt"],null),
    S("walls","Mauern & Bastionen","🧱","Befestigung","Massive Sandsteinmauern, 16–33m hoch, 2.4km Umfang. Acht achteckige Bastionen an den Ecken und entlang der Mauern.",["Höhe: 16-33m","Umfang: 2.4km","Roter Sandstein"],null),
    S("yamuna","Yamuna-Fluss","🌊","Natürliche Barriere","Der heilige Fluss schützte historisch die Ostseite der Festung. Heute ca. 1km entfernt, da der Fluss seinen Lauf verändert hat.",["Ehemals Ostschutz","Heiliger Fluss"],null),
  ];
  const el=id=>EL.find(e=>e.id===id)||null;
  const hit=id=>onSel(sel&&sel.id===id?null:el(id));
  const isSel=id=>sel&&sel.id===id;
  const glo=(id,c)=>isSel(id)?`${c}44`:`${c}1a`;
  const st=(id,c)=>isSel(id)?c+"cc":"#8a7a6055";

  // Main fort bounding box
  const fx=100,fy=60,fw=440,fh=460;
  const cx=fx+fw/2, cy=fy+fh/2;

  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"100%",display:"block"}}>
      <defs>
        <radialGradient id="rf_bg" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#0e0805"/>
          <stop offset="100%" stopColor="#060402"/>
        </radialGradient>
        <filter id="rf_glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <pattern id="rf_stone" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="transparent"/>
          <rect x="1" y="1" width="8" height="8" fill={`${ac}06`} rx="1"/>
          <rect x="11" y="11" width="8" height="8" fill={`${ac}04`} rx="1"/>
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#rf_bg)"/>
      <rect width={W} height={H} fill="url(#rf_stone)" opacity="0.55"/>

      {/* Yamuna river (east) */}
      <rect x="570" y="0" width="90" height={H} fill="rgba(34,100,180,0.2)"
        onClick={()=>hit("yamuna")} style={{cursor:"pointer"}}/>
      <text x="615" y="300" textAnchor="middle" fill="#4488cc" fontSize="10" fontFamily="'Cinzel',serif" transform="rotate(-90,615,300)">YAMUNA-FLUSS</text>

      {/* Main walls (irregular octagon) */}
      <path d={`M${fx+30},${fy} L${fx+fw-30},${fy} L${fx+fw},${fy+30} L${fx+fw},${fy+fh-30} L${fx+fw-30},${fy+fh} L${fx+30},${fy+fh} L${fx},${fy+fh-30} L${fx},${fy+30} Z`}
        fill={glo("walls","#cc4422")} stroke={st("walls","#ee5533")} strokeWidth="3"
        onClick={()=>hit("walls")} style={{cursor:"pointer"}}/>
      {isSel("walls")&&<path d={`M${fx+30},${fy} L${fx+fw-30},${fy} L${fx+fw},${fy+30} L${fx+fw},${fy+fh-30} L${fx+fw-30},${fy+fh} L${fx+30},${fy+fh} L${fx},${fy+fh-30} L${fx},${fy+30} Z`}
        fill="rgba(180,50,30,0.07)" filter="url(#rf_glow)"/>}

      {/* Corner bastions (octagonal) */}
      {[[fx+30,fy],[fx+fw-30,fy],[fx+fw,fy+30],[fx+fw,fy+fh-30],[fx+fw-30,fy+fh],[fx+30,fy+fh],[fx,fy+fh-30],[fx,fy+30]].map(([tx,ty],i)=>(
        <circle key={i} cx={tx} cy={ty} r="14"
          fill={`${ac}${isSel("walls")?"33":"18"}`} stroke={`${ac}${isSel("walls")?"88":"44"}`} strokeWidth="1.5"/>
      ))}

      {/* Inner courtyard */}
      <rect x={fx+50} y={fy+50} width={fw-100} height={fh-100} rx="3" fill="rgba(20,12,5,0.5)"/>

      {/* Lahore Gate (west) */}
      <rect x={fx-18} y={cy-30} width="46" height="60" rx="4"
        fill={glo("lahore_gate","#ff8844")} stroke={st("lahore_gate","#ffaa66")} strokeWidth="2.5"
        onClick={()=>hit("lahore_gate")} style={{cursor:"pointer"}}/>
      {isSel("lahore_gate")&&<rect x={fx-24} y={cy-36} width="58" height="72" rx="5" fill="rgba(200,110,40,0.12)" filter="url(#rf_glow)"/>}
      <text x={fx-8} y={cy+4} textAnchor="middle" fill={isSel("lahore_gate")?"#ffaa66":"#cc7733"} fontSize="7" fontFamily="'Cinzel',serif" fontWeight="bold">LAHORI</text>
      <text x={fx-8} y={cy+16} textAnchor="middle" fill={isSel("lahore_gate")?"#ffaa66":"#cc7733"} fontSize="7" fontFamily="'Cinzel',serif" fontWeight="bold">TOR</text>

      {/* Delhi Gate (south) */}
      <rect x={cx-30} y={fy+fh-18} width="60" height="46" rx="4"
        fill={glo("delhi_gate","#ff6644")} stroke={st("delhi_gate","#ff8866")} strokeWidth="2.5"
        onClick={()=>hit("delhi_gate")} style={{cursor:"pointer"}}/>
      {isSel("delhi_gate")&&<rect x={cx-36} y={fy+fh-24} width="72" height="58" rx="5" fill="rgba(200,80,40,0.1)" filter="url(#rf_glow)"/>}
      <text x={cx} y={fy+fh+20} textAnchor="middle" fill={isSel("delhi_gate")?"#ff8866":"#cc5533"} fontSize="9" fontFamily="'Cinzel',serif">DELHI-TOR ⚠</text>

      {/* Diwan-i-Am */}
      <rect x={fx+55} y={fy+180} width="145" height="80" rx="4"
        fill={glo("diwan_am","#ffcc44")} stroke={st("diwan_am","#ffee66")} strokeWidth="2.5"
        onClick={()=>hit("diwan_am")} style={{cursor:"pointer"}}/>
      {isSel("diwan_am")&&<rect x={fx+49} y={fy+174} width="157" height="92" rx="5" fill="rgba(220,180,40,0.1)" filter="url(#rf_glow)"/>}
      {/* Columns */}
      {[0,1,2,3,4].map(i=>(
        <rect key={i} x={fx+72+i*24} y={fy+186} width="6" height="68" rx="1"
          fill={isSel("diwan_am")?"#ffee6644":"#aa882222"} stroke={isSel("diwan_am")?"#ffee66":"#aa8822"} strokeWidth="1"/>
      ))}
      <text x={fx+127} y={fy+224} textAnchor="middle" fill={isSel("diwan_am")?"#ffee66":"#aa8822"} fontSize="10" fontFamily="'Cinzel',serif" fontWeight="bold">DIWAN-i-AM</text>

      {/* Diwan-i-Khas */}
      <rect x={fx+220} y={fy+160} width="100" height="90" rx="4"
        fill={glo("diwan_khas","#cc88ff")} stroke={st("diwan_khas","#ee99ff")} strokeWidth="2.5"
        onClick={()=>hit("diwan_khas")} style={{cursor:"pointer"}}/>
      {isSel("diwan_khas")&&<rect x={fx+214} y={fy+154} width="112" height="102" rx="5" fill="rgba(180,100,230,0.1)" filter="url(#rf_glow)"/>}
      <text x={fx+270} y={fy+208} textAnchor="middle" fill={isSel("diwan_khas")?"#ee99ff":"#9955cc"} fontSize="9" fontFamily="'Cinzel',serif" fontWeight="bold">DIWAN-i-</text>
      <text x={fx+270} y={fy+222} textAnchor="middle" fill={isSel("diwan_khas")?"#ee99ff":"#9955cc"} fontSize="9" fontFamily="'Cinzel',serif" fontWeight="bold">KHAS</text>

      {/* Rang Mahal */}
      <rect x={fx+55} y={fy+280} width="120" height="85" rx="4"
        fill={glo("rang_mahal","#ff6699")} stroke={st("rang_mahal","#ff88bb")} strokeWidth="2"
        onClick={()=>hit("rang_mahal")} style={{cursor:"pointer"}}/>
      {isSel("rang_mahal")&&<rect x={fx+49} y={fy+274} width="132" height="97" rx="5" fill="rgba(200,80,120,0.1)" filter="url(#rf_glow)"/>}
      <text x={fx+115} y={fy+326} textAnchor="middle" fill={isSel("rang_mahal")?"#ff88bb":"#cc4477"} fontSize="9" fontFamily="'Cinzel',serif" fontWeight="bold">RANG MAHAL</text>

      {/* Hammam */}
      <rect x={fx+220} y={fy+270} width="90" height="75" rx="4"
        fill={glo("hammam","#44aacc")} stroke={st("hammam","#66ccee")} strokeWidth="2"
        onClick={()=>hit("hammam")} style={{cursor:"pointer"}}/>
      <text x={fx+265} y={fy+311} textAnchor="middle" fill={isSel("hammam")?"#66ccee":"#3388aa"} fontSize="9" fontFamily="'Cinzel',serif" fontWeight="bold">HAMMAM</text>

      {/* Moti Masjid */}
      <rect x={fx+330} y={fy+260} width="85" height="80" rx="4"
        fill={glo("moti_masjid","#eeeeff")} stroke={st("moti_masjid","#ffffff")} strokeWidth="2"
        onClick={()=>hit("moti_masjid")} style={{cursor:"pointer"}}/>
      {/* Three domes */}
      {[fx+355,fx+372,fx+389].map((dx,i)=>(
        <ellipse key={i} cx={dx} cy={fy+270} rx="10" ry="7" fill={isSel("moti_masjid")?"#eeeeff55":"#ccccdd22"} stroke={isSel("moti_masjid")?"#ffffff":"#8888aa"} strokeWidth="1"/>
      ))}
      <text x={fx+372} y={fy+308} textAnchor="middle" fill={isSel("moti_masjid")?"#ffffff":"#9999bb"} fontSize="8" fontFamily="'Cinzel',serif" fontWeight="bold">MOTI</text>
      <text x={fx+372} y={fy+320} textAnchor="middle" fill={isSel("moti_masjid")?"#ffffff":"#9999bb"} fontSize="8" fontFamily="'Cinzel',serif" fontWeight="bold">MASJID</text>

      {/* Compass */}
      <g transform={`translate(${W-44},44)`}>
        <circle r="16" fill="rgba(0,0,0,0.6)" stroke={`${ac}44`} strokeWidth="1"/>
        {[["N",0,"#f0e6cc"],["S",180,"#8a7a60"],["O",90,"#8a7a60"],["W",270,"#8a7a60"]].map(([l,a,c])=>{
          const r2=a*Math.PI/180;
          return<text key={l} x={Math.sin(r2)*9} y={-Math.cos(r2)*9+4}
            textAnchor="middle" fill={c} fontSize="8" fontFamily="'Cinzel',serif" fontWeight="bold">{l}</text>;
        })}
      </g>

      <text x="20" y="26" fill={ac} fontSize="15" fontFamily="'Cinzel',serif" fontWeight="bold">LAL QILA – RED FORT</text>
      <text x="20" y="42" fill="#9a8a60" fontSize="9" fontFamily="'Cinzel',serif">Mogul-Festung · 1648 · Delhi, Indien</text>
    </svg>
  );
};

// ── Himeji ────────────────────────────────────────────────────────────────────
DETAILED_PLANS.himeji=({ac,sel,onSel})=>{
  const W=680,H=620;
  const S=(id,name,icon,type,desc,stats,weakness)=>({id,name,icon,type,desc,stats,weakness});
  const EL=[
    S("dai_tenshu","Dai-Tenshu 大天守","🏯","Hauptturm","Der sechsstöckige Hauptturm ('Weißer Reiher') ist das Wahrzeichen Japans. Außenwände mit weißem Kalkputz (Shikkui) feuerfest verputzt. Innen sieben Ebenen mit asymmetrischen Grundrissen.",["6+1 Stockwerke","Höhe: 46m","Weißer Shikkui-Putz","Erbaut: 1609"],null),
    S("ko_tenshu_e","Ko-Tenshu Ost 東小天守","🗼","Kleiner Turm","Östlicher Nebenturm, durch watari-yagura (Verbindungsgalerie) mit dem Dai-Tenshu verbunden. Flankiert den Hauptturm gegen Ostangriffe.",["3 Stockwerke","Verbindungsgalerie"],null),
    S("ko_tenshu_w","Ko-Tenshu West 西小天守","🗼","Kleiner Turm","Westlicher Nebenturm. Zusammen mit dem Nordturm bildet er das 'Hishi-Mon-System' — die viertürmige Verbundanlage.",["3 Stockwerke","Verbindungsgalerie"],null),
    S("ko_tenshu_n","Ko-Tenshu Nord 乾小天守","🗼","Kleiner Turm","Nördlichster der drei Nebentürme. Schützt den Hauptturm von der einzigen zugänglichen Nordseite des Hügels.",["3 Stockwerke","Steilstes Gelände"],null),
    S("nishi_maru","Nishi-no-Maru 西の丸","🏰","Westbefestigung","Die lange Westbefestigung (100m) war die Residenz von Senhime, Enkelin Tokugawa Ieyasus. Schmale Galerie mit Schießscharten, entlang des Hügelkamms.",["Länge: 100m","Senhime-Residenz","Kasemattengang"],null),
    S("honmaru","Honmaru 本丸","⬛","Innerer Hof","Der innerste Hof unmittelbar um den Turm-Komplex. Kasematten, Brunnen und der Hishi-no-Mon-Hauptzugang.",["Brunnen","Kasematten","Kaiserliches Territorium"],null),
    S("ni_maru","Ni-no-Maru 二の丸","🔲","Zweiter Hof","Zweiter Befestigungsring. Enthält die Kommandantur und die Hauptmagazine. Breiter Wehrgang.",["Kommandantur","Magazine"],null),
    S("san_maru","San-no-Maru 三の丸","⬜","Äußerer Ring","Äußerster Burghof mit Kasernen und Versorgungsbauten. Schützt die Zugänge von Süden und Westen.",["Kasernen","Versorgung","Hauptzugang"],null),
    S("moat","Wassergraben 外堀","🌊","Äußerer Graben","Breiter äußerer Wassergraben, der die Anlage von Westen und Süden umgibt. Nordseite durch steile Felsen natürlich geschützt.",["Breite: 30m","Westlich & südlich"],null),
    S("otemon","Ote-Mon 大手門","🚪","Haupttor","Das Hauptzugangstor von Süden. Großes zweigeschossiges Torhaus mit massiven Holzbeschlägen.",["Hauptzugang Süd","Zugbrücke"],3),
    S("hishi_gate","Hishi-no-Mon 菱の門","🚪","Inneres Tor","Das aufwendigste Tor der Anlage, direkt vor dem Turm-Komplex. Geschwungenes Dach im Eingangstorhaus-Stil.",["Vorzimmer zum Keep","Feinste Zimmerei"],4),
    S("maze","83-Tore-Labyrinth","🌀","Verteidigungsweg","Das berühmte Irrwegsystem: Angreifer müssen durch 83 Tore, ständig wendende Wege und Sackgassen. Manche Pfade sind 2km lang.",["83 Tore","Irrweg-System","Keine direkte Linie"],1),
    S("seppuku_maru","Seppuku-maru 切腹丸","⚔️","Turm","Der 'Selbstmord-Turm' — letzter Rückzugsort für ehrenhaften Tod. Im äußersten Winkel des Honmaru, diente als finales Magazin.",["Letzter Rückzug","Pulvermagazin"],null),
  ];
  const el=id=>EL.find(e=>e.id===id)||null;
  const hit=id=>onSel(sel&&sel.id===id?null:el(id));
  const isSel=id=>sel&&sel.id===id;
  const glo=(id,c)=>isSel(id)?`${c}50`:`${c}1c`;
  const st=(id,c)=>isSel(id)?c+"cc":"#9a8a6055";

  // helper: yagura (turret) marks along a wall
  const yagura=(key,positions,c)=>positions.map(([tx,ty],i)=>(
    <rect key={`${key}_${i}`} x={tx-7} y={ty-7} width="14" height="14" rx="2"
      fill={`${c}22`} stroke={`${c}66`} strokeWidth="1.2"/>
  ));

  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"100%",display:"block"}}>
      <defs>
        <radialGradient id="hj_bg" cx="50%" cy="55%" r="65%">
          <stop offset="0%" stopColor="#080a06"/>
          <stop offset="100%" stopColor="#030402"/>
        </radialGradient>
        <filter id="hj_glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <pattern id="hj_stone" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="transparent"/>
          <rect x="1" y="1" width="8" height="8" fill={`${ac}06`} rx="1"/>
          <rect x="11" y="11" width="8" height="8" fill={`${ac}04`} rx="1"/>
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#hj_bg)"/>
      <rect width={W} height={H} fill="url(#hj_stone)" opacity="0.5"/>

      {/* Outer moat */}
      <path d="M120,540 Q80,490 70,410 Q60,320 90,240 Q120,170 190,120 Q260,70 360,60 Q460,52 530,90 Q600,130 620,210 Q640,290 600,380 Q570,450 500,500 Q420,545 300,555 Z"
        fill={glo("moat","#2255aa")} stroke={st("moat","#4488cc")} strokeWidth="1.5"
        onClick={()=>hit("moat")} style={{cursor:"pointer"}}/>
      {isSel("moat")&&<path d="M120,540 Q80,490 70,410 Q60,320 90,240 Q120,170 190,120 Q260,70 360,60 Q460,52 530,90 Q600,130 620,210 Q640,290 600,380 Q570,450 500,500 Q420,545 300,555 Z"
        fill="rgba(30,80,180,0.08)" filter="url(#hj_glow)"/>}
      <text x="96" y="280" fill="#3366aa" fontSize="8" fontFamily="'Cinzel',serif" transform="rotate(-75,96,280)">WASSERGRABEN</text>

      {/* Hill / San-no-maru (outer ring) */}
      <path d="M155,515 Q110,460 115,380 Q115,300 155,230 Q200,160 290,120 Q380,82 460,105 Q545,130 570,205 Q595,275 565,360 Q540,425 475,470 Q400,510 280,520 Z"
        fill={glo("san_maru","#6a7848")} stroke={st("san_maru","#8a9a60")} strokeWidth="2.5"
        onClick={()=>hit("san_maru")} style={{cursor:"pointer"}}/>
      {isSel("san_maru")&&<path d="M155,515 Q110,460 115,380 Q115,300 155,230 Q200,160 290,120 Q380,82 460,105 Q545,130 570,205 Q595,275 565,360 Q540,425 475,470 Q400,510 280,520 Z"
        fill="rgba(80,100,50,0.07)" filter="url(#hj_glow)"/>}
      <text x="178" y="490" fill={isSel("san_maru")?ac:"#6a7840"} fontSize="9" fontFamily="'Cinzel',serif" fontWeight="bold">三の丸 SAN-NO-MARU</text>

      {/* Ni-no-maru */}
      <path d="M205,460 Q175,415 185,345 Q190,275 230,220 Q280,165 360,145 Q440,130 495,170 Q545,205 545,275 Q545,345 510,400 Q470,450 380,468 Q285,480 205,460 Z"
        fill={glo("ni_maru","#708860")} stroke={st("ni_maru","#90aa78")} strokeWidth="2.5"
        onClick={()=>hit("ni_maru")} style={{cursor:"pointer"}}/>
      {isSel("ni_maru")&&<path d="M205,460 Q175,415 185,345 Q190,275 230,220 Q280,165 360,145 Q440,130 495,170 Q545,205 545,275 Q545,345 510,400 Q470,450 380,468 Q285,480 205,460 Z"
        fill="rgba(80,120,60,0.07)" filter="url(#hj_glow)"/>}
      <text x="210" y="440" fill={isSel("ni_maru")?ac:"#708858"} fontSize="9" fontFamily="'Cinzel',serif" fontWeight="bold">二の丸 NI-NO-MARU</text>

      {/* Maze / labyrinth approach paths */}
      <g onClick={()=>hit("maze")} style={{cursor:"pointer"}}>
        {isSel("maze")&&<path d="M340,475 Q290,450 260,400 Q240,360 255,320 Q265,285 300,265" fill="none" stroke="rgba(180,120,40,0.2)" strokeWidth="20" filter="url(#hj_glow)"/>}
        {[
          "M340,475 Q310,455 290,420 Q275,390 280,360",
          "M280,360 Q285,335 305,318 Q325,302 350,298",
          "M350,298 Q375,294 390,275 Q400,258 395,235",
          "M395,235 Q388,212 370,205 Q350,198 335,208",
          "M335,208 Q318,218 318,238 Q318,252 330,262",
          "M480,420 Q460,395 445,370 Q435,348 440,322",
          "M440,322 Q445,300 430,282 Q415,265 395,265",
        ].map((d,i)=>(
          <path key={i} d={d} fill="none"
            stroke={isSel("maze")?"rgba(200,150,60,0.6)":"rgba(160,120,40,0.22)"}
            strokeWidth="3" strokeDasharray="5,3"/>
        ))}
        {/* Gate markers */}
        {[[340,475],[280,360],[350,298],[395,235],[335,208],[330,262],[480,420],[440,322],[395,265]].map(([x,y],i)=>(
          <rect key={i} x={x-4} y={y-4} width="8" height="8" rx="1"
            fill={isSel("maze")?"#cc993355":"#cc993322"} stroke={isSel("maze")?"#cc9933":"#aa7722"} strokeWidth="1"/>
        ))}
        <text x="250" y="455" fill={isSel("maze")?"#cc9933":"#886622"} fontSize="8" fontFamily="'Cinzel',serif">迷宮 83 TORE</text>
      </g>

      {/* West Bailey (Nishi-no-maru) */}
      <path d="M200,290 L200,195 Q205,180 220,178 L370,165 Q385,165 390,178 L390,195 L240,210 L235,290 Z"
        fill={glo("nishi_maru","#8870a8")} stroke={st("nishi_maru","#aa88cc")} strokeWidth="2.5"
        onClick={()=>hit("nishi_maru")} style={{cursor:"pointer"}}/>
      {isSel("nishi_maru")&&<path d="M200,290 L200,195 Q205,180 220,178 L370,165 Q385,165 390,178 L390,195 L240,210 L235,290 Z"
        fill="rgba(130,100,180,0.1)" filter="url(#hj_glow)"/>}
      <text x="290" y="193" textAnchor="middle" fill={isSel("nishi_maru")?ac:"#9070c0"} fontSize="8" fontFamily="'Cinzel',serif" fontWeight="bold">西の丸 NISHI-NO-MARU</text>
      {/* Window slits along west bailey */}
      {[225,250,275,300,325,350].map(x=>(
        <rect key={x} x={x-2} y="185" width="4" height="8" rx="1" fill={isSel("nishi_maru")?"#aa88cc55":"#66446622"}/>
      ))}

      {/* Honmaru */}
      <path d="M295,340 Q275,310 285,270 Q295,232 330,212 Q365,194 405,198 Q445,202 462,228 Q478,252 472,285 Q466,318 440,338 Q410,358 360,360 Z"
        fill={glo("honmaru","#c09030")} stroke={st("honmaru","#e0b040")} strokeWidth="3"
        onClick={()=>hit("honmaru")} style={{cursor:"pointer"}}/>
      {isSel("honmaru")&&<path d="M295,340 Q275,310 285,270 Q295,232 330,212 Q365,194 405,198 Q445,202 462,228 Q478,252 472,285 Q466,318 440,338 Q410,358 360,360 Z"
        fill="rgba(180,140,40,0.1)" filter="url(#hj_glow)"/>}
      <text x="380" y="348" textAnchor="middle" fill={isSel("honmaru")?ac:"#b08020"} fontSize="9" fontFamily="'Cinzel',serif" fontWeight="bold">本丸 HONMARU</text>

      {/* Seppukumaru (in corner of honmaru) */}
      <rect x="455" y="278" width="32" height="32" rx="3"
        fill={glo("seppuku_maru","#aa3322")} stroke={st("seppuku_maru","#cc4433")} strokeWidth="1.8"
        onClick={()=>hit("seppuku_maru")} style={{cursor:"pointer"}}/>
      <text x="471" y="298" textAnchor="middle" fill={isSel("seppuku_maru")?"#cc4433":"#882222"} fontSize="7" fontFamily="'Cinzel',serif">切腹</text>

      {/* Ko-tenshu East */}
      <rect x="418" y="198" width="32" height="36" rx="3"
        fill={glo("ko_tenshu_e","#88bbff")} stroke={st("ko_tenshu_e","#aaccff")} strokeWidth="2"
        onClick={()=>hit("ko_tenshu_e")} style={{cursor:"pointer"}}/>
      {/* Roof */}
      <polygon points="418,198 450,198 434,188" fill={isSel("ko_tenshu_e")?"#aaccff55":"#6688aa33"}
        stroke={isSel("ko_tenshu_e")?"#aaccff":"#6688aa"} strokeWidth="1"/>
      <text x="434" y="220" textAnchor="middle" fill={isSel("ko_tenshu_e")?"#aaccff":"#5577aa"} fontSize="7" fontFamily="'Cinzel',serif">東小</text>

      {/* Ko-tenshu West */}
      <rect x="338" y="185" width="32" height="36" rx="3"
        fill={glo("ko_tenshu_w","#88bbff")} stroke={st("ko_tenshu_w","#aaccff")} strokeWidth="2"
        onClick={()=>hit("ko_tenshu_w")} style={{cursor:"pointer"}}/>
      <polygon points="338,185 370,185 354,175" fill={isSel("ko_tenshu_w")?"#aaccff55":"#6688aa33"}
        stroke={isSel("ko_tenshu_w")?"#aaccff":"#6688aa"} strokeWidth="1"/>
      <text x="354" y="207" textAnchor="middle" fill={isSel("ko_tenshu_w")?"#aaccff":"#5577aa"} fontSize="7" fontFamily="'Cinzel',serif">西小</text>

      {/* Ko-tenshu North */}
      <rect x="362" y="168" width="32" height="36" rx="3"
        fill={glo("ko_tenshu_n","#88bbff")} stroke={st("ko_tenshu_n","#aaccff")} strokeWidth="2"
        onClick={()=>hit("ko_tenshu_n")} style={{cursor:"pointer"}}/>
      <polygon points="362,168 394,168 378,158" fill={isSel("ko_tenshu_n")?"#aaccff55":"#6688aa33"}
        stroke={isSel("ko_tenshu_n")?"#aaccff":"#6688aa"} strokeWidth="1"/>
      <text x="378" y="190" textAnchor="middle" fill={isSel("ko_tenshu_n")?"#aaccff":"#5577aa"} fontSize="7" fontFamily="'Cinzel',serif">乾小</text>

      {/* Connecting corridors between towers */}
      <rect x="370" y="197" width="48" height="7" rx="1" fill={`${ac}22`} stroke={`${ac}44`} strokeWidth="1"/>
      <rect x="362" y="204" width="10" height="26" rx="1" fill={`${ac}22`} stroke={`${ac}44`} strokeWidth="1"/>
      <rect x="416" y="204" width="10" height="26" rx="1" fill={`${ac}22`} stroke={`${ac}44`} strokeWidth="1"/>

      {/* Dai-tenshu (main keep) */}
      <rect x="365" y="218" width="62" height="66" rx="4"
        fill={glo("dai_tenshu","#ffffcc")} stroke={st("dai_tenshu","#ffff99")} strokeWidth="3"
        onClick={()=>hit("dai_tenshu")} style={{cursor:"pointer"}}/>
      {isSel("dai_tenshu")&&<rect x="358" y="211" width="76" height="80" rx="5" fill="rgba(255,255,180,0.08)" filter="url(#hj_glow)"/>}
      {/* Roof layers */}
      {[[365,218,62,7],[369,212,54,7],[374,206,44,7],[379,200,34,7]].map(([rx2,ry,rw,rh],i)=>(
        <rect key={i} x={rx2} y={ry} width={rw} height={rh} rx="2"
          fill={isSel("dai_tenshu")?"#ffff9933":"#eeee8822"}
          stroke={isSel("dai_tenshu")?"#ffff99":"#cccc6644"} strokeWidth="1"/>
      ))}
      <text x="396" y="252" textAnchor="middle" fill={isSel("dai_tenshu")?"#ffff99":"#cccc66"} fontSize="10" fontFamily="'Cinzel',serif" fontWeight="bold">大天守</text>
      <text x="396" y="266" textAnchor="middle" fill={isSel("dai_tenshu")?"#ffee88":"#aaaa44"} fontSize="8" fontFamily="'Cinzel',serif">DAI-TENSHU</text>
      <text x="396" y="278" textAnchor="middle" fill={isSel("dai_tenshu")?"#ffdd66":"#888833"} fontSize="7" fontFamily="'Cinzel',serif">46m · 6F</text>

      {/* Hishi Gate */}
      <rect x="290" y="260" width="20" height="30" rx="3"
        fill={glo("hishi_gate","#ffaa44")} stroke={st("hishi_gate","#ffcc66")} strokeWidth="2"
        onClick={()=>hit("hishi_gate")} style={{cursor:"pointer"}}/>
      {isSel("hishi_gate")&&<rect x="285" y="255" width="30" height="40" rx="4" fill="rgba(200,140,40,0.1)" filter="url(#hj_glow)"/>}
      <text x="300" y="300" textAnchor="middle" fill={isSel("hishi_gate")?"#ffcc66":"#cc8833"} fontSize="7" fontFamily="'Cinzel',serif">菱門</text>

      {/* Otemon (main outer gate) */}
      <rect x="335" y="490" width="50" height="34" rx="3"
        fill={glo("otemon","#ee5533")} stroke={st("otemon","#ff7755")} strokeWidth="2.5"
        onClick={()=>hit("otemon")} style={{cursor:"pointer"}}/>
      {isSel("otemon")&&<rect x="329" y="484" width="62" height="46" rx="4" fill="rgba(200,70,40,0.1)" filter="url(#hj_glow)"/>}
      <text x="360" y="511" textAnchor="middle" fill={isSel("otemon")?"#ff7755":"#cc4422"} fontSize="9" fontFamily="'Cinzel',serif">大手門 ⚠</text>

      {/* Yagura turrets along walls */}
      {yagura("s",[[185,390],[205,430],[245,468],[300,498],[410,490],[470,460],[520,400],[540,330],[530,260]],ac)}

      {/* Compass */}
      <g transform={`translate(${W-42},42)`}>
        <circle r="17" fill="rgba(0,0,0,0.65)" stroke={`${ac}44`} strokeWidth="1"/>
        {[["N",0,"#f0e6cc"],["S",180,"#8a7a60"],["O",90,"#8a7a60"],["W",270,"#8a7a60"]].map(([l,a,c])=>{
          const r2=a*Math.PI/180;
          return<text key={l} x={Math.sin(r2)*10} y={-Math.cos(r2)*10+4}
            textAnchor="middle" fill={c} fontSize="8" fontFamily="'Cinzel',serif" fontWeight="bold">{l}</text>;
        })}
      </g>

      {/* Scale bar */}
      <line x1="80" y1={H-22} x2="230" y2={H-22} stroke={`${ac}44`} strokeWidth="1.5"/>
      <line x1="80" y1={H-18} x2="80" y2={H-26} stroke={`${ac}44`} strokeWidth="1.5"/>
      <line x1="230" y1={H-18} x2="230" y2={H-26} stroke={`${ac}44`} strokeWidth="1.5"/>
      <text x="155" y={H-10} textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="'Cinzel',serif">≈ 300m</text>

      <text x="20" y="26" fill={ac} fontSize="15" fontFamily="'Cinzel',serif" fontWeight="bold">姫路城 HIMEJI-JŌ</text>
      <text x="20" y="42" fill="#9a8a60" fontSize="9" fontFamily="'Cinzel',serif">Shirasagijō – Weißer Reiher · 1609 · Hyōgo, Japan</text>
    </svg>
  );
};

// ── Krak des Chevaliers ───────────────────────────────────────────────────────
DETAILED_PLANS.krak=({ac,sel,onSel})=>{
  const W=680,H=580;
  const S=(id,nm,ic,tp,desc,stats,weak)=>({id,name:nm,icon:ic,type:tp,desc,stats,weakness:weak});
  const EL=[
    S("outer_wall","Äußerer Mauerring","🧱","Vorhof","13 Türme schützen den Zwinger. Hospitaller-Ritter konnten 2 000 Mann für 5 Jahre beherbergen. Die äußere Mauer wurde zwischen 1142–1271 mehrfach verstärkt.",["13 Türme","Erbaut: 1142","Hospitaller-Orden"],null),
    S("talus","Talus / Glacis","🪨","Schrägbasis","Die gewaltige gemauerte Schrägbasis (Talus) an der Süd- und Westseite des Innenhofs. Verhindert Untergraben, lässt Sturmleitern abrutschen. Einzigartiges Merkmal des Krak.",["Neigung: 45°","5m Mauerdicke","Gegen Minen"],null),
    S("great_hall","Salle des Chevaliers","🏛️","Großer Saal","Der berühmteste gotische Saal Syriens (1230er). Drei Schiffe, Kreuzgewölbe, 25m lang. Lawrence of Arabia nannte Krak 'das schönste Schloss der Welt'.",["Länge: 25m","Gotisches Gewölbe","1230er"],null),
    S("chapel","Kapelle","⛪","Kapelle","Die Hospitallerkapelle (12. Jh.) mit romanischen Bogenfenstern. Nach dem Fall 1271 zur Moschee umgewidmet — ein Minarett wurde hinzugefügt.",["Romanischer Stil","Später Moschee","12. Jh."],null),
    S("cisterns","Zisternen","💧","Wasserversorgung","Zwei riesige unterirdische Zisternen fassen genug Wasser für die gesamte Besatzung über Jahre. Entscheidend für lange Belagerungen im trockenen Klima.",["2 Zisternen","5-Jahres-Vorrat","Unterirdisch"],null),
    S("donjon","Donjon / Bergfried","🏯","Kernburg","Der quadratische Kernturm im Nordwesteck des Innenhofs. Letzter Rückzugsort der Ritter. Massivste Mauern der gesamten Anlage.",["Mauern: 5m","Letzter Rückzug"],null),
    S("south_tower","Großer Südturm","🗼","Südturm","Der mächtigste Einzelturm, halbkreisförmig nach außen gewölbt. Flankiert das Haupttor und die Loggia. Dominiert die Südflanke.",["Halbkreis-Grundriss","Mächtigster Turm"],null),
    S("loggia","Loggia","🌿","Loggia","Die elegante gotische Loggia vor dem großen Saal — ein offener Säulengang aus dem 13. Jh. Selten in Kreuzritter-Burgen, zeigt den Einfluss westeuropäischer Hofarchitektur.",["Gotische Säulen","13. Jh.","Offen"],null),
    S("aqueduct","Aquädukt","🌊","Wasserleitung","Ein gemauerts Aquädukt entlang der Nordmauer leitet Bergwasser in die Zisternen. Sicherte die Wasserversorgung auch bei langer Belagerung.",["Entlang Nordmauer","Bergwasser"],null),
    S("bent_entry","Geknickter Eingang","🌀","Zugangsweg","Der berühmte 'bent entrance': ein langer, dunkler Tunnel mit mehreren 90°-Kurven und Schießscharten. Angreifer können nie geradeaus vorstoßen.",["90°-Kurven","Dunkler Tunnel","Kein Anlauf"],2),
    S("north_weak","Nordflanke","⚠️","Schwachstelle","Die flachste und breiteste Angriffsroute. Der Zwinger ist hier am weitesten — aber die Mauern sind auch hier doppelt. 1271 hier durch Täuschung eingenommen.",["Flachstes Gelände","Historisch genutzt"],1),
  ];
  const el=id=>EL.find(e=>e.id===id)||null;
  const hit=id=>onSel(sel&&sel.id===id?null:el(id));
  const isSel=id=>sel&&sel.id===id;
  const glo=(id,c)=>isSel(id)?`${c}48`:`${c}1a`;
  const st=(id,c)=>isSel(id)?c+"cc":"#9a8a6055";

  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"100%",display:"block"}}>
      <defs>
        <radialGradient id="kr_bg" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#0e0b05"/>
          <stop offset="100%" stopColor="#050402"/>
        </radialGradient>
        <filter id="kr_glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <pattern id="kr_stone" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="transparent"/>
          <rect x="1" y="1" width="8" height="8" fill={`${ac}06`} rx="1"/>
          <rect x="11" y="11" width="8" height="8" fill={`${ac}04`} rx="1"/>
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#kr_bg)"/>
      <rect width={W} height={H} fill="url(#kr_stone)" opacity="0.55"/>

      {/* Hill terrain */}
      <ellipse cx="340" cy="295" rx="290" ry="255" fill="rgba(100,78,28,0.14)" stroke="rgba(130,100,35,0.15)" strokeWidth="1"/>

      {/* Outer wall (irregular ellipse following hill) */}
      <path d="M155,145 Q130,200 130,270 Q130,345 160,405 Q200,460 275,490 Q350,515 430,500 Q510,482 548,430 Q580,378 575,305 Q570,235 540,180 Q505,120 440,95 Q370,72 295,82 Q215,94 155,145 Z"
        fill={glo("outer_wall","#8a7040")} stroke={st("outer_wall","#b09050")} strokeWidth="3"
        onClick={()=>hit("outer_wall")} style={{cursor:"pointer"}}/>
      {isSel("outer_wall")&&<path d="M155,145 Q130,200 130,270 Q130,345 160,405 Q200,460 275,490 Q350,515 430,500 Q510,482 548,430 Q580,378 575,305 Q570,235 540,180 Q505,120 440,95 Q370,72 295,82 Q215,94 155,145 Z"
        fill="rgba(130,100,40,0.07)" filter="url(#kr_glow)"/>}
      <text x="168" y="460" fill={isSel("outer_wall")?ac:"#8a7040"} fontSize="9" fontFamily="'Cinzel',serif">ÄUSSERER RING</text>

      {/* Outer towers (13) */}
      {[{x:155,y:145},{x:130,y:200},{x:130,y:270},{x:140,y:340},{x:165,y:405},{x:220,y:462},{x:295,y:500},{x:380,y:508},{x:455,y:488},{x:520,y:445},{x:555,y:375},{x:560,y:295},{x:545,y:200},{x:495,y:125},{x:415,y:90},{x:335,y:78},{x:252,y:90}].map((t,i)=>(
        <circle key={i} cx={t.x} cy={t.y} r="12"
          fill={`${ac}${isSel("outer_wall")?"33":"18"}`}
          stroke={`${ac}${isSel("outer_wall")?"88":"44"}`} strokeWidth="1.8"/>
      ))}

      {/* Aqueduct (north wall) */}
      <path d="M210,112 Q280,88 360,82 Q430,78 490,105"
        fill="none" stroke={isSel("aqueduct")?"#4488cccc":"#4488cc55"} strokeWidth="5"
        onClick={()=>hit("aqueduct")} style={{cursor:"pointer"}}/>
      {isSel("aqueduct")&&<path d="M210,112 Q280,88 360,82 Q430,78 490,105" fill="none" stroke="rgba(40,100,200,0.2)" strokeWidth="18" filter="url(#kr_glow)"/>}
      <text x="345" y="72" textAnchor="middle" fill={isSel("aqueduct")?"#66aaee":"#336688"} fontSize="8" fontFamily="'Cinzel',serif">AQUÄDUKT ↓</text>

      {/* North weakness zone */}
      <rect x="230" y="88" width="210" height="50" rx="5"
        fill={glo("north_weak","#cc3322")} stroke={st("north_weak","#ee4433")} strokeWidth="2"
        onClick={()=>hit("north_weak")} style={{cursor:"pointer"}}/>
      {isSel("north_weak")&&<rect x="225" y="83" width="220" height="60" rx="6" fill="rgba(180,40,20,0.08)" filter="url(#kr_glow)"/>}
      <text x="335" y="118" textAnchor="middle" fill={isSel("north_weak")?"#ee4433":"#aa2211"} fontSize="9" fontFamily="'Cinzel',serif" fontWeight="bold">⚠ NORD-FLANKE</text>

      {/* Zwinger / killing ground label */}
      <text x="165" y="285" fill={`${ac}44`} fontSize="8" fontFamily="'Cinzel',serif" transform="rotate(-75,165,285)">ZWINGER</text>
      <text x="515" y="285" fill={`${ac}44`} fontSize="8" fontFamily="'Cinzel',serif" transform="rotate(75,515,285)">ZWINGER</text>

      {/* Inner ward walls */}
      <path d="M215,175 Q200,225 200,290 Q200,355 220,410 Q255,460 330,475 Q410,488 470,455 Q520,425 530,365 Q540,300 525,240 Q508,180 465,155 Q420,132 360,132 Q285,132 215,175 Z"
        fill="rgba(12,9,4,0.55)" stroke={`${ac}44`} strokeWidth="1.5"/>

      {/* Talus / Glacis (south & west of inner ward) */}
      <path d="M200,310 Q195,370 225,420 Q260,468 335,480 Q415,490 470,458 Q518,428 528,368 Q530,310 200,310 Z"
        fill={glo("talus","#aa8840")} stroke={st("talus","#ccaa55")} strokeWidth="2.5"
        onClick={()=>hit("talus")} style={{cursor:"pointer"}}/>
      {isSel("talus")&&<path d="M200,310 Q195,370 225,420 Q260,468 335,480 Q415,490 470,458 Q518,428 528,368 Q530,310 200,310 Z"
        fill="rgba(160,130,50,0.08)" filter="url(#kr_glow)"/>}
      {/* Talus hatching */}
      {[0,1,2,3,4,5].map(i=>(
        <line key={i} x1={210+i*55} y1={315+i*8} x2={230+i*48} y2={460-i*5}
          stroke={isSel("talus")?"#ccaa5544":"#aa884422"} strokeWidth="1.5"/>
      ))}
      <text x="340" y="450" textAnchor="middle" fill={isSel("talus")?ac:"#aa8840"} fontSize="10" fontFamily="'Cinzel',serif" fontWeight="bold">TALUS / GLACIS</text>

      {/* Inner ward main area */}
      <path d="M215,175 Q200,225 205,295 L528,295 Q520,230 500,190 Q465,148 400,138 Q330,128 268,148 Z"
        fill={glo("outer_wall","#705828")} stroke="none" onClick={()=>hit("outer_wall")} style={{cursor:"pointer"}}/>

      {/* Great Hall (Salle des Chevaliers) — south of inner ward */}
      <rect x="235" y="255" width="210" height="65" rx="4"
        fill={glo("great_hall","#ffcc44")} stroke={st("great_hall","#ffdd66")} strokeWidth="2.5"
        onClick={()=>hit("great_hall")} style={{cursor:"pointer"}}/>
      {isSel("great_hall")&&<rect x="229" y="249" width="222" height="77" rx="5" fill="rgba(220,180,40,0.1)" filter="url(#kr_glow)"/>}
      {/* Columns inside hall */}
      {[260,300,340,380,420].map(x=>(
        <rect key={x} x={x-3} y="263" width="6" height="50" rx="1"
          fill={isSel("great_hall")?"#ffdd6644":"#aa882222"} stroke={isSel("great_hall")?"#ffdd66":"#aa8822"} strokeWidth="1"/>
      ))}
      <text x="340" y="290" textAnchor="middle" fill={isSel("great_hall")?"#ffdd66":"#aa8822"} fontSize="11" fontFamily="'Cinzel',serif" fontWeight="bold">SALLE DES CHEVALIERS</text>

      {/* Loggia (in front of great hall, south) */}
      <rect x="235" y="318" width="210" height="28" rx="3"
        fill={glo("loggia","#88cc88")} stroke={st("loggia","#aaddaa")} strokeWidth="2"
        onClick={()=>hit("loggia")} style={{cursor:"pointer"}}/>
      {[265,305,345,385,415].map(x=>(
        <line key={x} x1={x} y1="318" x2={x} y2="346"
          stroke={isSel("loggia")?"#aaddaa55":"#88aa8833"} strokeWidth="2"/>
      ))}
      <text x="340" y="337" textAnchor="middle" fill={isSel("loggia")?"#aaddaa":"#558855"} fontSize="9" fontFamily="'Cinzel',serif" fontWeight="bold">LOGGIA</text>

      {/* Chapel (east inner ward) */}
      <rect x="440" y="165" width="75" height="90" rx="4"
        fill={glo("chapel","#5577ff")} stroke={st("chapel","#7799ff")} strokeWidth="2.5"
        onClick={()=>hit("chapel")} style={{cursor:"pointer"}}/>
      {isSel("chapel")&&<rect x="434" y="159" width="87" height="102" rx="5" fill="rgba(70,100,220,0.1)" filter="url(#kr_glow)"/>}
      {/* Apse */}
      <ellipse cx="515" cy="178" rx="16" ry="22"
        fill={glo("chapel","#5577ff")} stroke={st("chapel","#7799ff")} strokeWidth="2"
        onClick={()=>hit("chapel")} style={{cursor:"pointer"}}/>
      <text x="470" y="212" textAnchor="middle" fill={isSel("chapel")?"#7799ff":"#4455aa"} fontSize="10" fontFamily="'Cinzel',serif" fontWeight="bold">KAPELLE</text>

      {/* Cisterns (center inner ward) */}
      <rect x="295" y="168" width="55" height="45" rx="4"
        fill={glo("cisterns","#44aacc")} stroke={st("cisterns","#66ccee")} strokeWidth="2.5"
        onClick={()=>hit("cisterns")} style={{cursor:"pointer"}}/>
      {isSel("cisterns")&&<rect x="289" y="162" width="67" height="57" rx="5" fill="rgba(40,120,180,0.1)" filter="url(#kr_glow)"/>}
      <text x="322" y="194" textAnchor="middle" fill={isSel("cisterns")?"#66ccee":"#3388aa"} fontSize="9" fontFamily="'Cinzel',serif" fontWeight="bold">ZISTERNEN</text>

      {/* Donjon (NW corner inner ward) */}
      <rect x="215" y="155" width="65" height="65" rx="4"
        fill={glo("donjon","#cc8844")} stroke={st("donjon","#eeaa66")} strokeWidth="3"
        onClick={()=>hit("donjon")} style={{cursor:"pointer"}}/>
      {isSel("donjon")&&<rect x="209" y="149" width="77" height="77" rx="5" fill="rgba(180,120,40,0.1)" filter="url(#kr_glow)"/>}
      {[[215,155],[278,155],[215,218],[278,218]].map(([tx,ty],i)=>(
        <rect key={i} x={tx-9} y={ty-9} width="18" height="18" rx="2"
          fill={isSel("donjon")?"#eeaa6644":"#cc884422"} stroke={isSel("donjon")?"#eeaa66":"#cc8844"} strokeWidth="1.5"/>
      ))}
      <text x="247" y="186" textAnchor="middle" fill={isSel("donjon")?"#eeaa66":"#995522"} fontSize="10" fontFamily="'Cinzel',serif" fontWeight="bold">DONJON</text>

      {/* Great South Tower */}
      <path d="M200,345 Q175,380 185,415 Q200,448 230,458 Q255,466 265,445 Q272,420 265,390 L235,360 Z"
        fill={glo("south_tower","#cc6644")} stroke={st("south_tower","#ee8866")} strokeWidth="2.5"
        onClick={()=>hit("south_tower")} style={{cursor:"pointer"}}/>
      {isSel("south_tower")&&<path d="M200,345 Q175,380 185,415 Q200,448 230,458 Q255,466 265,445 Q272,420 265,390 L235,360 Z"
        fill="rgba(180,80,40,0.1)" filter="url(#kr_glow)"/>}
      <text x="207" y="410" textAnchor="middle" fill={isSel("south_tower")?"#ee8866":"#994433"} fontSize="8" fontFamily="'Cinzel',serif" fontWeight="bold">SÜDTURM</text>

      {/* Bent entrance */}
      <path d="M460,488 Q470,468 490,455 Q510,442 520,420 Q528,400 520,380"
        fill="none" stroke={isSel("bent_entry")?"#cc9933cc":"#cc993355"} strokeWidth="8"
        onClick={()=>hit("bent_entry")} style={{cursor:"pointer"}}/>
      {isSel("bent_entry")&&<path d="M460,488 Q470,468 490,455 Q510,442 520,420 Q528,400 520,380" fill="none" stroke="rgba(180,130,40,0.15)" strokeWidth="20" filter="url(#kr_glow)"/>}
      <text x="510" y="488" fill={isSel("bent_entry")?"#ccaa44":"#886622"} fontSize="8" fontFamily="'Cinzel',serif">EINGANG 🌀</text>

      {/* Compass */}
      <g transform={`translate(${W-42},42)`}>
        <circle r="17" fill="rgba(0,0,0,0.65)" stroke={`${ac}44`} strokeWidth="1"/>
        {[["N",0,"#f0e6cc"],["S",180,"#8a7a60"],["O",90,"#8a7a60"],["W",270,"#8a7a60"]].map(([l,a,c])=>{
          const r2=a*Math.PI/180;
          return<text key={l} x={Math.sin(r2)*10} y={-Math.cos(r2)*10+4}
            textAnchor="middle" fill={c} fontSize="8" fontFamily="'Cinzel',serif" fontWeight="bold">{l}</text>;
        })}
      </g>

      {/* Scale */}
      <line x1="80" y1={H-22} x2="230" y2={H-22} stroke={`${ac}44`} strokeWidth="1.5"/>
      <line x1="80" y1={H-18} x2="80" y2={H-26} stroke={`${ac}44`} strokeWidth="1.5"/>
      <line x1="230" y1={H-18} x2="230" y2={H-26} stroke={`${ac}44`} strokeWidth="1.5"/>
      <text x="155" y={H-10} textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="'Cinzel',serif">≈ 200m</text>

      <text x="20" y="26" fill={ac} fontSize="15" fontFamily="'Cinzel',serif" fontWeight="bold">KRAK DES CHEVALIERS</text>
      <text x="20" y="42" fill="#9a8a60" fontSize="9" fontFamily="'Cinzel',serif">Hospitaliterorden · 1142–1271 · Syrien</text>
    </svg>
  );
};

// ── Alhambra ──────────────────────────────────────────────────────────────────
// Architectural style: wall MASSES as dark fills, rooms as lighter voids on top
DETAILED_PLANS.alhambra=({ac,sel,onSel})=>{
  const W=800,H=560;
  const S=(id,nm,ic,tp,d,st,wk)=>({id,name:nm,icon:ic,type:tp,desc:d,stats:st,weakness:wk});
  const EL=[
    S("alcazaba","Alcazaba","🏯","Militärfestung","Ältester Teil der Alhambra (13. Jh.). Militärischer Kern mit Kaserne, Arsenal und der Torre de la Vela.",["13. Jh.","Muhammad I."],null),
    S("torre_vela","Torre de la Vela","🗼","Hauptturm","Der höchste Turm der Alcazaba (26m). Die Glocke rief die Bauern zum Bewässern. Panoramablick über Granada und die Sierra Nevada.",["Höhe: 26m","Wachtturm","Glockenturm"],null),
    S("mexuar","Mexuar","🏛️","Ratsaal","Der älteste der Nasridenpaläste (14. Jh.). Empfangsraum für öffentliche Audienzen und Rechtsangelegenheiten. Reich mit Azulejo-Kacheln verziert.",["14. Jh.","Audienzsaal","Azulejo-Kacheln"],null),
    S("comares","Comares-Palast","👑","Palast","Herzstück der Nasridenherrschaft. Der berühmte Patio de los Arrayanes (Myrtenhof) mit 34m langem Reflexionsbecken. Torre de Comares mit dem Thronsaal.",["Myrtenhof","Reflexionsbecken 34m","Thronsaal"],null),
    S("patio_lions","Löwenhof","🦁","Innenhof","Der weltberühmte Patio de los Leones mit 124 Marmorsäulen und dem Löwenbrunnen (12 Marmarlöwen). Gebaut unter Muhammad V., ca. 1370.",["124 Marmorsäulen","12 Löwen-Brunnen","~1370"],null),
    S("harem","Harem / Königsgemächer","🌙","Privatgemächer","Die privaten Königsgemächer südlich des Löwenhofs. Sala de los Reyes, Sala de las Dos Hermanas (Saal der zwei Schwestern) mit Stalaktiten-Kuppel.",["Stalaktiten-Kuppel","Sala de las Dos Hermanas"],null),
    S("carlos_v","Palast Karls V.","🏟️","Renaissance-Palast","Kreisförmiger Innenhof im quadratischen Außenbau, 1527 von Pedro Machuca begonnen. Ein Renaissance-Fremdkörper inmitten maurischer Architektur — nie fertiggestellt.",["Kreisrunder Hof","1527","Nie vollendet"],null),
    S("generalife","Generalife","🌿","Gartenpalast","Der Sommerpalast der Nasridenherrscher östlich der Hauptanlage. Berühmter Patio de la Acequia: 50m langer Garten mit zentralem Wasserkanal und Springbrunnen.",["Sommerpalast","Patio de la Acequia","50m Wasserkanal"],null),
    S("acequia","Acequia Real","💧","Wasserleitung","Der Königliche Wasserkanal kommt vom Fluss Darro, verläuft entlang des Hügelkamms und versorgt alle Brunnen, Becken und Gärten der Alhambra.",["Vom Río Darro","Gesamte Versorgung"],null),
    S("puerta_justicia","Puerta de la Justicia","🚪","Haupttor","Das mächtige Haupttor (1348) mit Hufeisenbogen. Hand und Schlüssel in Stein gemeißelt: Hand = 5 Säulen des Islam, Schlüssel = Macht Allahs.",["1348","Hufeisenbogen","Hand & Schlüssel"],3),
    S("medina","Medina (Stadtbereich)","🏘️","Unterstadt","Der östliche Teil der Alhambra war eine echte Stadt mit Moscheen, Bädern, Werkstätten und Wohnhäusern für tausende Einwohner.",["Moschee","Hamam","Handwerker"],null),
  ];
  const el=id=>EL.find(e=>e.id===id)||null;
  const hit=id=>onSel(sel&&sel.id===id?null:el(id));
  const isSel=id=>sel&&sel.id===id;
  const glo=(id,c)=>isSel(id)?`${c}48`:`${c}1a`;
  const st=(id,c)=>isSel(id)?c+"cc":"#9a8a6055";

  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"100%",display:"block"}}>
      <defs>
        <radialGradient id="al_bg" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#0a0704"/>
          <stop offset="100%" stopColor="#050403"/>
        </radialGradient>
        <filter id="al_glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width={W} height={H} fill="url(#al_bg)"/>
      {/* Sabika Hill terrain */}
      <path d="M36,490 Q30,368 34,256 Q40,165 80,116 Q132,70 252,54 Q394,38 530,48 Q634,56 678,104 Q712,150 706,243 Q698,338 678,428 Q658,500 630,520 L88,520 Z"
        fill="#18100a" stroke="rgba(100,65,30,0.25)" strokeWidth="1.5"/>

      {/* Red hill (Sabika) */}
      <path d="M30,500 Q25,380 40,280 Q55,180 100,130 Q150,85 260,70 Q380,58 500,65 Q590,72 630,110 Q665,150 660,240 Q655,330 640,410 Q625,480 610,510 Z"
        fill="url(#al_hill)" stroke="rgba(140,70,30,0.2)" strokeWidth="1"/>

      {/* Outer walls */}
      <path d="M80,460 Q60,380 65,290 Q70,205 110,155 Q155,105 250,85 Q360,65 490,72 Q580,78 620,125 Q655,165 648,255 Q640,345 625,430 Q610,490 590,510 L80,510 Z"
        fill="none" stroke={`${ac}33`} strokeWidth="2" strokeDasharray="6,3"/>

      {/* Acequia Real — royal water channel along north slope */}
      <path d="M48,110 Q158,64 292,52 Q428,42 546,54 Q624,62 664,98"
        fill="none" stroke={isSel("acequia")?"#3399bb":"#1a4a66"} strokeWidth={isSel("acequia")?5:3.5}
        onClick={()=>hit("acequia")} style={{cursor:"pointer"}}/>
      {isSel("acequia")&&<path d="M48,110 Q158,64 292,52 Q428,42 546,54 Q624,62 664,98"
        fill="none" stroke={`${ac}28`} strokeWidth="14" filter="url(#al_glow)"/>}
      <text x="330" y="44" textAnchor="middle" fill={isSel("acequia")?"#55bbdd":"#1f5577"} fontSize="8" fontFamily="'Cinzel',serif" letterSpacing="1">ACEQUIA REAL</text>

      {/* ═══ ALCAZABA — wall mass ═══ */}
      <g onClick={()=>hit("alcazaba")} style={{cursor:"pointer"}}>
        <path d="M42,125 L48,118 L188,118 L192,125 L192,408 L42,408 Z"
          fill={isSel("alcazaba")?"#4a2e14":"#3a2210"}
          stroke={isSel("alcazaba")?`${ac}88`:"#5a3818"} strokeWidth={isSel("alcazaba")?2:1.5}/>
        <rect x="80" y="110" width="24" height="16" fill={isSel("alcazaba")?"#5a3818":"#4a2e14"} stroke="#5a3818" strokeWidth="1"/>
        <rect x="138" y="110" width="24" height="16" fill={isSel("alcazaba")?"#5a3818":"#4a2e14"} stroke="#5a3818" strokeWidth="1"/>
        <rect x="28" y="162" width="18" height="22" fill={isSel("alcazaba")?"#5a3818":"#4a2e14"} stroke="#5a3818" strokeWidth="1"/>
        <rect x="28" y="224" width="18" height="22" fill={isSel("alcazaba")?"#5a3818":"#4a2e14"} stroke="#5a3818" strokeWidth="1"/>
        <rect x="28" y="288" width="18" height="22" fill={isSel("alcazaba")?"#5a3818":"#4a2e14"} stroke="#5a3818" strokeWidth="1"/>
        <rect x="28" y="350" width="18" height="22" fill={isSel("alcazaba")?"#5a3818":"#4a2e14"} stroke="#5a3818" strokeWidth="1"/>
        <rect x="186" y="178" width="18" height="22" fill={isSel("alcazaba")?"#5a3818":"#4a2e14"} stroke="#5a3818" strokeWidth="1"/>
        <rect x="186" y="260" width="18" height="22" fill={isSel("alcazaba")?"#5a3818":"#4a2e14"} stroke="#5a3818" strokeWidth="1"/>
        <rect x="186" y="340" width="18" height="22" fill={isSel("alcazaba")?"#5a3818":"#4a2e14"} stroke="#5a3818" strokeWidth="1"/>
        <rect x="80" y="400" width="24" height="18" fill={isSel("alcazaba")?"#5a3818":"#4a2e14"} stroke="#5a3818" strokeWidth="1"/>
        <rect x="138" y="400" width="24" height="18" fill={isSel("alcazaba")?"#5a3818":"#4a2e14"} stroke="#5a3818" strokeWidth="1"/>
        {/* Patio de Armas — interior void */}
        <rect x="68" y="168" width="110" height="214" fill="#0a0705"/>
        <rect x="68" y="384" width="52" height="22" fill="#130e08"/>
        <rect x="126" y="384" width="52" height="22" fill="#130e08"/>
        <circle cx="123" cy="272" r="6" fill="#0a0705" stroke="rgba(100,70,30,0.4)" strokeWidth="1"/>
        {isSel("alcazaba")&&<path d="M42,125 L48,118 L188,118 L192,125 L192,408 L42,408 Z"
          fill="none" stroke={`${ac}44`} strokeWidth="3" filter="url(#al_glow)"/>}
        <text x="117" y="288" textAnchor="middle" fill={isSel("alcazaba")?ac:"#7a5530"} fontSize="10" fontFamily="'Cinzel',serif" fontWeight="bold">ALCAZABA</text>
      </g>

      {/* Torre de la Vela */}
      <g onClick={()=>hit("torre_vela")} style={{cursor:"pointer"}}>
        <rect x="42" y="92" width="44" height="34" fill={isSel("torre_vela")?"#6a4520":"#503418"}
          stroke={isSel("torre_vela")?`${ac}99`:"#6a4520"} strokeWidth={isSel("torre_vela")?2:1.5}/>
        {[42,50,58,66,74,80].map(x=>(
          <rect key={x} x={x} y="85" width="6" height="10" fill={isSel("torre_vela")?"#6a4520":"#503418"} stroke={isSel("torre_vela")?`${ac}44`:"#6a4520"} strokeWidth="1"/>
        ))}
        <circle cx="64" cy="112" r="3.5" fill={isSel("torre_vela")?"#ddcc8888":"#aa884422"} stroke={isSel("torre_vela")?"#ddcc88":"#aa8844"} strokeWidth="1"/>
        {isSel("torre_vela")&&<rect x="38" y="82" width="52" height="48" fill="none" stroke={`${ac}44`} strokeWidth="2" filter="url(#al_glow)"/>}
        <text x="64" y="81" textAnchor="middle" fill={isSel("torre_vela")?ac:"#7a6030"} fontSize="7" fontFamily="'Cinzel',serif">T.VELA</text>
      </g>

      {/* ═══ COMARES PALACE — wall mass ═══ */}
      <g onClick={()=>hit("comares")} style={{cursor:"pointer"}}>
        <rect x="198" y="92" width="260" height="278" fill={isSel("comares")?"#3a2e10":"#2c2208"}
          stroke={isSel("comares")?`${ac}88`:"#4a3812"} strokeWidth={isSel("comares")?2:1.5}/>
        {/* Torre de Comares — solid tower projects north */}
        <rect x="288" y="62" width="82" height="38" fill={isSel("comares")?"#4a3c15":"#382c0c"}
          stroke={isSel("comares")?`${ac}66`:"#5a4818"} strokeWidth="1.5"/>
        {[288,297,306,315,324,333,342,351,358].map(x=>(
          <rect key={x} x={x} y="55" width="7" height="10" fill={isSel("comares")?"#4a3c15":"#382c0c"} stroke={isSel("comares")?`${ac}44`:"#5a4818"} strokeWidth="0.8"/>
        ))}
        {/* Salon de los Embajadores inside tower */}
        <rect x="302" y="68" width="54" height="24" fill="#140e04"/>
        {/* Patio de los Arrayanes — main courtyard void */}
        <rect x="232" y="112" width="192" height="168" fill="#0d0b04"/>
        {/* Myrtle hedges */}
        <rect x="248" y="130" width="160" height="14" fill="#0c0f08"/>
        <rect x="248" y="252" width="160" height="14" fill="#0c0f08"/>
        {/* Reflecting pool — 34m — blue water */}
        <rect x="292" y="146" width="74" height="104" rx="1"
          fill={isSel("comares")?"rgba(18,68,138,0.55)":"rgba(12,52,110,0.4)"}
          stroke={isSel("comares")?"#4488bbaa":"#1a5580"} strokeWidth="1"/>
        {[154,164,174,184,194,204,214,224,234,242].map(y=>(
          <line key={y} x1="300" y1={y} x2="358" y2={y} stroke="rgba(80,140,200,0.10)" strokeWidth="0.7"/>
        ))}
        <text x="329" y="200" textAnchor="middle" fill={isSel("comares")?"#88bbdd":"#1e4466"} fontSize="6.5" fontFamily="'Cinzel',serif">MYRTENHOF</text>
        {/* Side chambers */}
        <rect x="198" y="112" width="34" height="168" fill="#160f04"/>
        <rect x="424" y="112" width="34" height="168" fill="#160f04"/>
        {/* Southern rooms */}
        <rect x="198" y="282" width="260" height="86" fill="#120e06"/>
        {isSel("comares")&&<rect x="198" y="92" width="260" height="278" fill="none" stroke={`${ac}44`} strokeWidth="3" filter="url(#al_glow)"/>}
        <text x="329" y="346" textAnchor="middle" fill={isSel("comares")?ac:"#7a6020"} fontSize="9" fontFamily="'Cinzel',serif" fontWeight="bold">COMARES-PALAST</text>
      </g>

      {/* ═══ MEXUAR — overlaid NW of palace zone ═══ */}
      <g onClick={()=>hit("mexuar")} style={{cursor:"pointer"}}>
        <rect x="198" y="150" width="122" height="110" fill={isSel("mexuar")?"#2a2038":"#1e1828"}
          stroke={isSel("mexuar")?`${ac}88`:"#3a2a48"} strokeWidth={isSel("mexuar")?2:1.5}/>
        <rect x="212" y="164" width="94" height="56" fill="#0c0910"/>
        <rect x="212" y="222" width="44" height="36" fill="#0c0910"/>
        <rect x="258" y="228" width="60" height="30" fill="#110d18"/>
        {isSel("mexuar")&&<rect x="198" y="150" width="122" height="110" fill="none" stroke={`${ac}44`} strokeWidth="2" filter="url(#al_glow)"/>}
        <text x="259" y="198" textAnchor="middle" fill={isSel("mexuar")?ac:"#5a4870"} fontSize="9" fontFamily="'Cinzel',serif" fontWeight="bold">MEXUAR</text>
      </g>

      {/* ═══ PATIO DE LOS LEONES — wall mass ═══ */}
      <g onClick={()=>hit("patio_lions")} style={{cursor:"pointer"}}>
        <rect x="460" y="108" width="148" height="242" fill={isSel("patio_lions")?"#2e2210":"#221a0c"}
          stroke={isSel("patio_lions")?`${ac}88`:"#3a2a10"} strokeWidth={isSel("patio_lions")?2:1.5}/>
        {/* Central courtyard void */}
        <rect x="480" y="128" width="108" height="202" fill="#0d0b05"/>
        {/* Four halls */}
        <rect x="500" y="108" width="68" height="24" fill="#120e06"/>
        <rect x="500" y="328" width="68" height="24" fill="#120e06"/>
        <rect x="586" y="196" width="24" height="74" fill="#120e06"/>
        <rect x="460" y="196" width="22" height="74" fill="#120e06"/>
        {/* 124 Marmorsäulen — column dots */}
        {[482,493,504,515,526,537,548,559,570,578].map((x,i)=>(
          <circle key={`nc${i}`} cx={x} cy="133" r="2.2"
            fill={isSel("patio_lions")?"#c8a84888":"#7a621822"} stroke={isSel("patio_lions")?"#c8a848":"#7a6218"} strokeWidth="0.7"/>
        ))}
        {[482,493,504,515,526,537,548,559,570,578].map((x,i)=>(
          <circle key={`sc${i}`} cx={x} cy="325" r="2.2"
            fill={isSel("patio_lions")?"#c8a84888":"#7a621822"} stroke={isSel("patio_lions")?"#c8a848":"#7a6218"} strokeWidth="0.7"/>
        ))}
        {[145,160,175,190,205,220,235,250,265,280,295,310].map((y,i)=>(
          <circle key={`wc${i}`} cx="485" cy={y} r="2.2"
            fill={isSel("patio_lions")?"#c8a84888":"#7a621822"} stroke={isSel("patio_lions")?"#c8a848":"#7a6218"} strokeWidth="0.7"/>
        ))}
        {[145,160,175,190,205,220,235,250,265,280,295,310].map((y,i)=>(
          <circle key={`ec${i}`} cx="583" cy={y} r="2.2"
            fill={isSel("patio_lions")?"#c8a84888":"#7a621822"} stroke={isSel("patio_lions")?"#c8a848":"#7a6218"} strokeWidth="0.7"/>
        ))}
        {/* Lion fountain */}
        <circle cx="534" cy="229" r="13"
          fill={isSel("patio_lions")?"rgba(18,62,130,0.5)":"rgba(12,50,110,0.35)"}
          stroke={isSel("patio_lions")?"#4482bb":"#1a5080"} strokeWidth="1.5"/>
        <circle cx="534" cy="229" r="5" fill={isSel("patio_lions")?"#4482bb55":"#1a508033"} stroke={isSel("patio_lions")?"#4482bb":"#1a5080"} strokeWidth="0.8"/>
        {Array.from({length:12},(_,i)=>{const a=i*30*Math.PI/180;return(
          <circle key={i} cx={534+9*Math.cos(a)} cy={229+9*Math.sin(a)} r="1.5" fill={isSel("patio_lions")?"#4482bb99":"#1a508055"}/>
        )})}
        {isSel("patio_lions")&&<rect x="460" y="108" width="148" height="242" fill="none" stroke={`${ac}44`} strokeWidth="3" filter="url(#al_glow)"/>}
        <text x="534" y="364" textAnchor="middle" fill={isSel("patio_lions")?ac:"#6a5520"} fontSize="8.5" fontFamily="'Cinzel',serif" fontWeight="bold">LÖWENHOF</text>
        <text x="534" y="376" textAnchor="middle" fill={isSel("patio_lions")?"#c8a848":"#5a4810"} fontSize="7" fontFamily="'Cinzel',serif">124 Marmorsäulen</text>
      </g>

      {/* ═══ HAREM ═══ */}
      <g onClick={()=>hit("harem")} style={{cursor:"pointer"}}>
        <rect x="460" y="352" width="148" height="82" fill={isSel("harem")?"#2a1828":"#1e1020"}
          stroke={isSel("harem")?`${ac}88`:"#3a2038"} strokeWidth={isSel("harem")?2:1.5}/>
        <rect x="472" y="364" width="58" height="58" fill="#0d0810"/>
        <rect x="538" y="364" width="58" height="58" fill="#0d0810"/>
        <line x1="535" y1="364" x2="535" y2="422" stroke="rgba(60,30,60,0.3)" strokeWidth="1"/>
        {isSel("harem")&&<rect x="460" y="352" width="148" height="82" fill="none" stroke={`${ac}44`} strokeWidth="2" filter="url(#al_glow)"/>}
        <text x="534" y="406" textAnchor="middle" fill={isSel("harem")?ac:"#5a3060"} fontSize="9" fontFamily="'Cinzel',serif" fontWeight="bold">HAREM</text>
      </g>

      {/* ═══ PALACE OF CARLOS V — wall mass ═══ */}
      <g onClick={()=>hit("carlos_v")} style={{cursor:"pointer"}}>
        <rect x="198" y="378" width="260" height="148" fill={isSel("carlos_v")?"#1e2030":"#161820"}
          stroke={isSel("carlos_v")?`${ac}88`:"#2a2c3a"} strokeWidth={isSel("carlos_v")?2:1.5}/>
        {/* Circular courtyard void */}
        <circle cx="328" cy="452" r="58"
          fill="#0c0c0e" stroke={isSel("carlos_v")?"rgba(60,70,120,0.35)":"rgba(40,45,80,0.2)"} strokeWidth="1.5"/>
        {/* 32-column ring */}
        {Array.from({length:32},(_,i)=>{const a=i*Math.PI*2/32;return(
          <circle key={i} cx={328+50*Math.cos(a)} cy={452+50*Math.sin(a)} r="2.5"
            fill={isSel("carlos_v")?"#6070aa55":"#30385533"} stroke={isSel("carlos_v")?"#6070aa":"#303855"} strokeWidth="0.7"/>
        )})}
        <rect x="208" y="388" width="36" height="36" fill="#0f101a"/>
        <rect x="412" y="388" width="36" height="36" fill="#0f101a"/>
        <rect x="208" y="474" width="36" height="36" fill="#0f101a"/>
        <rect x="412" y="474" width="36" height="36" fill="#0f101a"/>
        {isSel("carlos_v")&&<rect x="198" y="378" width="260" height="148" fill="none" stroke={`${ac}44`} strokeWidth="2" filter="url(#al_glow)"/>}
        <text x="328" y="447" textAnchor="middle" fill={isSel("carlos_v")?ac:"#4a5070"} fontSize="8.5" fontFamily="'Cinzel',serif" fontWeight="bold">KARL V.</text>
        <text x="328" y="460" textAnchor="middle" fill={isSel("carlos_v")?"#8090cc":"#303855"} fontSize="7" fontFamily="'Cinzel',serif">Renaissance · 1527</text>
      </g>

      {/* ═══ MEDINA — city district ═══ */}
      <g onClick={()=>hit("medina")} style={{cursor:"pointer"}}>
        <rect x="614" y="150" width="88" height="288" fill={isSel("medina")?"#1a1c14":"#12140e"}
          stroke={isSel("medina")?`${ac}88`:"#2a2c1e"} strokeWidth={isSel("medina")?2:1.5}/>
        <line x1="656" y1="157" x2="656" y2="430" stroke="rgba(60,65,35,0.45)" strokeWidth="5"/>
        {[178,213,248,283,318,353,388].map(y=>(
          <rect key={y} x="618" y={y} width="34" height="26" fill="#0c0d09" stroke="rgba(50,55,30,0.2)" strokeWidth="0.5"/>
        ))}
        {[178,213,248,283,318,353,388].map(y=>(
          <rect key={y+1000} x="660" y={y} width="34" height="26" fill="#0c0d09" stroke="rgba(50,55,30,0.2)" strokeWidth="0.5"/>
        ))}
        {isSel("medina")&&<rect x="614" y="150" width="88" height="288" fill="none" stroke={`${ac}44`} strokeWidth="2" filter="url(#al_glow)"/>}
        <text x="657" y="295" textAnchor="middle" fill={isSel("medina")?ac:"#4a5030"} fontSize="9" fontFamily="'Cinzel',serif" fontWeight="bold" transform="rotate(-90,657,295)">MEDINA</text>
      </g>

      {/* ═══ GENERALIFE — garden palace east ═══ */}
      <g onClick={()=>hit("generalife")} style={{cursor:"pointer"}}>
        {/* Upper palace */}
        <rect x="714" y="86" width="72" height="80" fill={isSel("generalife")?"#1a2014":"#10160c"}
          stroke={isSel("generalife")?`${ac}88`:"#1e2818"} strokeWidth={isSel("generalife")?2:1.5}/>
        <rect x="726" y="96" width="48" height="60" fill="#0d1009"/>
        {/* Patio de la Acequia */}
        <rect x="714" y="174" width="72" height="212" fill={isSel("generalife")?"#1a2014":"#10160c"}
          stroke={isSel("generalife")?`${ac}88`:"#1e2818"} strokeWidth={isSel("generalife")?2:1.5}/>
        <rect x="722" y="182" width="22" height="196" fill="#0d1209"/>
        <rect x="762" y="182" width="20" height="196" fill="#0d1209"/>
        {/* Central water canal */}
        <rect x="744" y="182" width="16" height="196"
          fill={isSel("generalife")?"rgba(18,68,138,0.55)":"rgba(12,52,110,0.4)"}
          stroke={isSel("generalife")?"#4488bb":"#1a5088"} strokeWidth="0.8"/>
        {[198,218,238,258,278,298,318,338,358].map(y=>(
          <g key={y}>
            <line x1="740" y1={y} x2="744" y2={y} stroke={isSel("generalife")?"#5599cc44":"#2266aa22"} strokeWidth="1.2"/>
            <line x1="760" y1={y} x2="764" y2={y} stroke={isSel("generalife")?"#5599cc44":"#2266aa22"} strokeWidth="1.2"/>
          </g>
        ))}
        {isSel("generalife")&&<>
          <rect x="714" y="86" width="72" height="80" fill="none" stroke={`${ac}44`} strokeWidth="2" filter="url(#al_glow)"/>
          <rect x="714" y="174" width="72" height="212" fill="none" stroke={`${ac}44`} strokeWidth="2" filter="url(#al_glow)"/>
        </>}
        <text x="750" y="395" textAnchor="middle" fill={isSel("generalife")?ac:"#2a3820"} fontSize="8" fontFamily="'Cinzel',serif" fontWeight="bold" transform="rotate(-90,750,395)">GENERALIFE</text>
      </g>

      {/* Puerta de la Justicia */}
      <g onClick={()=>hit("puerta_justicia")} style={{cursor:"pointer"}}>
        <rect x="126" y="404" width="48" height="30" fill={isSel("puerta_justicia")?"#4a2010":"#38180c"}
          stroke={isSel("puerta_justicia")?`${ac}cc`:"#882222"} strokeWidth={isSel("puerta_justicia")?2.5:2}/>
        <path d="M134,432 Q134,418 150,414 Q166,418 166,432"
          fill={isSel("puerta_justicia")?"rgba(200,50,30,0.2)":"rgba(150,30,20,0.1)"}
          stroke={isSel("puerta_justicia")?"#cc4422":"#882222"} strokeWidth="1"/>
        {isSel("puerta_justicia")&&<rect x="122" y="400" width="56" height="38" fill="none" stroke={`${ac}44`} strokeWidth="2" filter="url(#al_glow)"/>}
        <text x="150" y="400" textAnchor="middle" fill={isSel("puerta_justicia")?ac:"#882222"} fontSize="6.5" fontFamily="'Cinzel',serif">P. JUSTICIA ⚠</text>
      </g>

      {/* Compass */}
      <g transform={`translate(${W-44},44)`}>
        <circle r="18" fill="rgba(0,0,0,0.7)" stroke={`${ac}44`} strokeWidth="1"/>
        {[["N",0,"#e8d8b0"],["S",180,"#7a6a48"],["O",90,"#7a6a48"],["W",270,"#7a6a48"]].map(([l,a,c])=>{
          const r2=a*Math.PI/180;
          return<text key={l} x={Math.sin(r2)*11} y={-Math.cos(r2)*11+4}
            textAnchor="middle" fill={c} fontSize="8" fontFamily="'Cinzel',serif" fontWeight="bold">{l}</text>;
        })}
        <circle r="2" fill={ac} opacity="0.6"/>
      </g>

      {/* Scale bar */}
      <g transform={`translate(50,${H-28})`}>
        <line x1="0" y1="0" x2="120" y2="0" stroke={`${ac}55`} strokeWidth="1.5"/>
        <line x1="0" y1="-5" x2="0" y2="5" stroke={`${ac}55`} strokeWidth="1.5"/>
        <line x1="60" y1="-3" x2="60" y2="3" stroke={`${ac}33`} strokeWidth="1"/>
        <line x1="120" y1="-5" x2="120" y2="5" stroke={`${ac}55`} strokeWidth="1.5"/>
        <text x="60" y="14" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="'Cinzel',serif">≈ 200m</text>
      </g>

      <text x="20" y="26" fill={ac} fontSize="15" fontFamily="'Cinzel',serif" fontWeight="bold">الحمراء  ALHAMBRA</text>
      <text x="20" y="42" fill="#9a8a60" fontSize="9" fontFamily="'Cinzel',serif">Nasridenreich · 13.–14. Jh. · Granada, Spanien</text>
    </svg>
  );
};

// ── Mont Saint-Michel ─────────────────────────────────────────────────────────
DETAILED_PLANS.mont_michel=({ac,sel,onSel})=>{
  const W=800,H=560;
  const S=(id,nm,ic,tp,d,st,wk)=>({id,name:nm,icon:ic,type:tp,desc:d,stats:st,weakness:wk});
  const EL=[
    S("ramparts","Stadtmauer & Türme","🏰","Befestigung","Die mittelalterlichen Befestigungsmauern umschließen die gesamte Felseninsel. Im 14.–15. Jh. nach englischen Angriffen massiv verstärkt. Drei Tore, zahlreiche Türme.",["14.–15. Jh.","3 Tore","Nie eingenommen"],null),
    S("grande_rue","Grande Rue","🛤️","Hauptstraße","Die einzige Straße des Dorfs, steil gepflastert und von Pilgerhäusern, Tavernen und kleinen Kapellen gesäumt. Im Mittelalter zogen hier täglich tausende Pilger hinauf.",["Pflasterstein","Mittelalterlich","Pilgerroute"],null),
    S("village","Dorf","🏘️","Mittelalterliches Dorf","Am Fuß des Berges lebten Fischer, Händler und Pilgerherbergen. Enge Gassen, alte Häuser, die Pfarrkirche Saint-Pierre.",["Fischer & Händler","Pfarrkirche","Enge Gassen"],null),
    S("chatelet","Châtelet","🚪","Abteitor","Das befestigte Tor des 15. Jh. führt von der Terrasse in die Abtei. Zwei flankierende Türme, Fallgitter. Hier begann das Heilige.",["15. Jh.","Fallgitter","Doppeltürme"],3),
    S("church","Abteikirche","⛪","Abteikirche","Die romanisch-gotische Kirche thront auf 92m. Langhaus 11. Jh., Chor im Flamboyantstil 1523 vollendet. Das Kirchenschiff ruht auf Krypten über dem Abgrund — ein Ingenieurswerk des Mittelalters.",["Romanik + Gotik","11.–16. Jh.","92m Höhe"],null),
    S("merveille","La Merveille","✨","Klosterkomplex","Das 'Wunder': drei Stockwerke übereinander gebaut — Almosenkammer & Gästehaus (unten), Rittersaal & Refektorium (Mitte), Kreuzgang (oben). Errichtet 1211–1228 in reiner Gotik.",["1211–1228","3 Stockwerke","Gotisches Meisterwerk"],null),
    S("cloister","Kreuzgang","🌿","Kreuzgang","Krönt La Merveille im obersten Stockwerk. Doppelte versetzte Säulenreihen in Granit schaffen ein Gefühl von Schwerelosigkeit — ein offenes gotisches Wunder über dem Meer.",["Doppelsäulen","Obergschoss","Über dem Abgrund"],null),
    S("crypts","Krypten & Unterbau","⚒️","Unterbau","Mehrere Krypten stützen die Abteikirche: Notre-Dame-sous-Terre (vorromanisch, 10. Jh.), Krypta der Großen Säulen (trägt den Chor), Krypta des Ecureuil.",["10. Jh.","Vorromanisch","Stützpfeiler"],null),
    S("gardens","Terrassen & Gärten","🌿","Terrassen","Die Südterrasse und der Klostergarten bieten Blick über die Bucht. Hier verweilten die Benediktinermönche bei Gebet und Betrachtung.",["Buchtblick","Benediktiner","Südterrasse"],null),
  ];
  const el=id=>EL.find(e=>e.id===id)||null;
  const hit=id=>onSel(sel&&sel.id===id?null:el(id));
  const isSel=id=>sel&&sel.id===id;

  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"100%",display:"block"}}>
      <defs>
        <radialGradient id="mm_sea" cx="50%" cy="60%" r="70%">
          <stop offset="0%" stopColor="#0c1318"/>
          <stop offset="100%" stopColor="#060a0d"/>
        </radialGradient>
        <filter id="mm_glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width={W} height={H} fill="url(#mm_sea)"/>
      {/* Tidal water lines */}
      {[80,140,200,260,320,380,440,500].map(y=>(
        <line key={y} x1="50" y1={y} x2="750" y2={y} stroke="rgba(40,80,120,0.07)" strokeWidth="1.5"/>
      ))}

      {/* Causeway from south */}
      <rect x="390" y="468" width="20" height="80" fill="#241a0e" stroke="rgba(100,70,30,0.3)" strokeWidth="1"/>
      <text x="400" y="530" textAnchor="middle" fill="rgba(80,120,160,0.35)" fontSize="8" fontFamily="'Cinzel',serif">DAMM</text>

      {/* Island rock (Mont Tombe) */}
      <path d="M400,130 C476,132 540,174 560,232 C576,286 566,352 540,398 C512,440 456,468 418,478 L400,484 L382,478 C344,468 288,440 260,398 C234,352 224,286 240,232 C260,174 324,132 400,130 Z"
        fill="#1e1508" stroke="rgba(100,65,30,0.3)" strokeWidth="1.5"/>

      {/* Outer rampart wall mass */}
      <path d="M400,142 C470,144 528,182 546,238 C560,290 552,352 526,394 C500,432 450,458 418,468 L400,473 L382,468 C350,458 300,432 274,394 C248,352 240,290 254,238 C272,182 330,144 400,142 Z"
        fill="#2c1e0e" stroke="rgba(130,85,35,0.5)" strokeWidth="2"/>

      {/* Rampart towers */}
      {[
        [400,143],[450,153],[498,180],[532,218],[546,268],[540,322],[518,368],[482,408],[440,438],[400,450],
        [360,438],[318,408],[282,368],[260,322],[254,268],[268,218],[302,180],[350,153]
      ].map(([cx,cy],i)=>(
        <circle key={i} cx={cx} cy={cy} r="10" fill="#3a2612" stroke="rgba(150,95,40,0.55)" strokeWidth="1.5"/>
      ))}

      {/* Interior island — slightly lighter void */}
      <path d="M400,160 C464,162 514,196 530,246 C542,292 534,348 510,386 C486,420 444,442 416,450 L400,454 L384,450 C356,442 314,420 290,386 C266,348 258,292 270,246 C286,196 336,162 400,160 Z"
        fill="#170e06"/>

      {/* Main south gate */}
      <rect x="391" y="452" width="18" height="14" fill="#120906" stroke="rgba(150,90,35,0.6)" strokeWidth="1.5"/>

      {/* ═══ VILLAGE ═══ */}
      <g onClick={()=>hit("village")} style={{cursor:"pointer"}}>
        {[
          [314,390,40,28],[358,390,30,28],[296,355,36,26],[336,355,30,26],[370,355,30,26],
          [282,318,34,26],[320,318,30,26],[280,280,32,26],[316,280,28,26]
        ].map(([x,y,w,h],i)=>(
          <rect key={i} x={x} y={y} width={w} height={h}
            fill={isSel("village")?"#2a1c0c":"#1e1408"} stroke={isSel("village")?"rgba(160,100,40,0.4)":"rgba(110,65,22,0.22)"} strokeWidth="0.8"/>
        ))}
        {[
          [446,390,40,28],[412,390,30,28],[464,355,36,26],[434,355,30,26],[400,355,30,26],
          [484,318,34,26],[450,318,30,26],[488,280,32,26],[456,280,28,26]
        ].map(([x,y,w,h],i)=>(
          <rect key={i+20} x={x} y={y} width={w} height={h}
            fill={isSel("village")?"#2a1c0c":"#1e1408"} stroke={isSel("village")?"rgba(160,100,40,0.4)":"rgba(110,65,22,0.22)"} strokeWidth="0.8"/>
        ))}
        {isSel("village")&&<path d="M400,160 C464,162 514,196 530,246 C542,292 534,348 510,386 C486,420 444,442 416,450 L400,454 L384,450 C356,442 314,420 290,386 C266,348 258,292 270,246 C286,196 336,162 400,160 Z"
          fill="none" stroke={`${ac}33`} strokeWidth="2" filter="url(#mm_glow)"/>}
        <text x="330" y="370" textAnchor="middle" fill={isSel("village")?ac:"#5a3a1a"} fontSize="8" fontFamily="'Cinzel',serif" fontWeight="bold">DORF</text>
      </g>

      {/* Grande Rue */}
      <g onClick={()=>hit("grande_rue")} style={{cursor:"pointer"}}>
        <rect x="396" y="248" width="8" height="200" fill={isSel("grande_rue")?"#4a3820":"#2e2010"}
          stroke={isSel("grande_rue")?`${ac}88`:"rgba(130,85,30,0.5)"} strokeWidth="1"/>
        {isSel("grande_rue")&&<rect x="392" y="244" width="16" height="208" fill="none" stroke={`${ac}44`} strokeWidth="2" filter="url(#mm_glow)"/>}
        <text x="376" y="348" textAnchor="end" fill={isSel("grande_rue")?ac:"#5a4020"} fontSize="7.5" fontFamily="'Cinzel',serif">Grande</text>
        <text x="376" y="360" textAnchor="end" fill={isSel("grande_rue")?ac:"#5a4020"} fontSize="7.5" fontFamily="'Cinzel',serif">Rue</text>
      </g>

      {/* Ramparts clickable overlay */}
      <g onClick={()=>hit("ramparts")} style={{cursor:"pointer"}}>
        {isSel("ramparts")&&<path d="M400,142 C470,144 528,182 546,238 C560,290 552,352 526,394 C500,432 450,458 418,468 L400,473 L382,468 C350,458 300,432 274,394 C248,352 240,290 254,238 C272,182 330,144 400,142 Z"
          fill="none" stroke={`${ac}55`} strokeWidth="3" filter="url(#mm_glow)"/>}
        <text x="555" y="310" textAnchor="middle" fill={isSel("ramparts")?ac:"#5a4020"} fontSize="7.5" fontFamily="'Cinzel',serif" fontWeight="bold" transform="rotate(25,555,310)">STADTMAUER</text>
      </g>

      {/* Gardens / South Terrace */}
      <g onClick={()=>hit("gardens")} style={{cursor:"pointer"}}>
        <path d="M332,248 L468,248 L466,262 L408,270 L400,274 L392,270 L334,262 Z"
          fill={isSel("gardens")?"#1a2214":"#101808"} stroke={isSel("gardens")?`${ac}88`:"rgba(40,70,20,0.35)"} strokeWidth="1.5"/>
        {[345,365,385,405,425,445,460].map(x=>(
          <line key={x} x1={x} y1="249" x2={x} y2="261" stroke={isSel("gardens")?"rgba(60,90,30,0.3)":"rgba(40,60,20,0.18)"} strokeWidth="0.7"/>
        ))}
        {isSel("gardens")&&<path d="M332,248 L468,248 L466,262 L408,270 L400,274 L392,270 L334,262 Z" fill="none" stroke={`${ac}44`} strokeWidth="2" filter="url(#mm_glow)"/>}
        <text x="400" y="258" textAnchor="middle" fill={isSel("gardens")?ac:"#3a5020"} fontSize="7" fontFamily="'Cinzel',serif">TERRASSEN</text>
      </g>

      {/* Crypts */}
      <g onClick={()=>hit("crypts")} style={{cursor:"pointer"}}>
        <rect x="340" y="228" width="120" height="24" fill={isSel("crypts")?"#251a10":"#1a1108"}
          stroke={isSel("crypts")?`${ac}88`:"rgba(120,70,30,0.3)"} strokeWidth="1.5"/>
        {[352,368,386,400,418,436,450].map(x=>(
          <circle key={x} cx={x} cy="240" r="2.5" fill={isSel("crypts")?"#5a3a1888":"#3a221033"} stroke={isSel("crypts")?"#5a3a18":"#3a2210"} strokeWidth="0.7"/>
        ))}
        {isSel("crypts")&&<rect x="336" y="224" width="128" height="32" fill="none" stroke={`${ac}44`} strokeWidth="2" filter="url(#mm_glow)"/>}
        <text x="400" y="242" textAnchor="middle" fill={isSel("crypts")?ac:"#5a3a18"} fontSize="7.5" fontFamily="'Cinzel',serif">KRYPTEN</text>
      </g>

      {/* ═══ ABBEY CHURCH ═══ */}
      <g onClick={()=>hit("church")} style={{cursor:"pointer"}}>
        {/* Nave */}
        <rect x="348" y="172" width="106" height="52" fill={isSel("church")?"#302416":"#221a0e"}
          stroke={isSel("church")?`${ac}88`:"rgba(160,110,40,0.4)"} strokeWidth={isSel("church")?2:1.5}/>
        {/* N transept */}
        <rect x="372" y="150" width="32" height="28" fill={isSel("church")?"#302416":"#221a0e"}
          stroke={isSel("church")?`${ac}88`:"rgba(160,110,40,0.4)"} strokeWidth={isSel("church")?2:1.5}/>
        {/* S transept */}
        <rect x="372" y="218" width="32" height="26" fill={isSel("church")?"#302416":"#221a0e"}
          stroke={isSel("church")?`${ac}88`:"rgba(160,110,40,0.4)"} strokeWidth={isSel("church")?2:1.5}/>
        {/* Choir (east) */}
        <rect x="450" y="178" width="38" height="40" fill={isSel("church")?"#302416":"#221a0e"}
          stroke={isSel("church")?`${ac}88`:"rgba(160,110,40,0.4)"} strokeWidth={isSel("church")?2:1.5}/>
        <path d="M488,184 Q504,198 488,212" fill={isSel("church")?"#221a0e":"#180e08"} stroke={isSel("church")?`${ac}66`:"rgba(160,110,40,0.35)"} strokeWidth="1.5"/>
        {/* Nave interior void */}
        <rect x="360" y="180" width="84" height="36" fill="#0e0a05"/>
        {/* Column pairs */}
        {[372,386,400,414,428].map(x=>(
          <g key={x}>
            <circle cx={x} cy="185" r="2" fill={isSel("church")?"#aa882244":"#6a551511"} stroke={isSel("church")?"#aa8822":"#6a5515"} strokeWidth="0.7"/>
            <circle cx={x} cy="211" r="2" fill={isSel("church")?"#aa882244":"#6a551511"} stroke={isSel("church")?"#aa8822":"#6a5515"} strokeWidth="0.7"/>
          </g>
        ))}
        {/* Crossing dashed outline */}
        <rect x="372" y="172" width="32" height="52" fill="none" stroke={isSel("church")?"rgba(200,160,60,0.4)":"rgba(140,100,30,0.18)"} strokeWidth="1.5" strokeDasharray="4,2"/>
        {/* West platform */}
        <rect x="330" y="180" width="22" height="36" fill={isSel("church")?"#281e0e":"#1c1508"}
          stroke={isSel("church")?`${ac}55`:"rgba(140,90,30,0.28)"} strokeWidth="1"/>
        {isSel("church")&&<><rect x="344" y="168" width="152" height="80" fill="none" stroke={`${ac}44`} strokeWidth="3" filter="url(#mm_glow)"/>
          <rect x="368" y="146" width="40" height="32" fill="none" stroke={`${ac}44`} strokeWidth="2" filter="url(#mm_glow)"/></>}
        <text x="400" y="196" textAnchor="middle" fill={isSel("church")?ac:"#7a6020"} fontSize="8" fontFamily="'Cinzel',serif" fontWeight="bold">ABTEIKIRCHE</text>
        <text x="400" y="208" textAnchor="middle" fill={isSel("church")?"#c8a840":"#5a4010"} fontSize="6.5" fontFamily="'Cinzel',serif">11.–16. Jh.</text>
      </g>

      {/* ═══ LA MERVEILLE ═══ */}
      <g onClick={()=>hit("merveille")} style={{cursor:"pointer"}}>
        <rect x="286" y="150" width="66" height="90" fill={isSel("merveille")?"#1e2430":"#141820"}
          stroke={isSel("merveille")?`${ac}88`:"rgba(80,100,160,0.35)"} strokeWidth={isSel("merveille")?2:1.5}/>
        <line x1="290" y1="180" x2="348" y2="180" stroke={isSel("merveille")?"rgba(80,100,160,0.4)":"rgba(60,80,130,0.2)"} strokeWidth="1"/>
        <line x1="290" y1="210" x2="348" y2="210" stroke={isSel("merveille")?"rgba(80,100,160,0.4)":"rgba(60,80,130,0.2)"} strokeWidth="1"/>
        <rect x="294" y="156" width="26" height="20" fill="#0e1018"/>
        <rect x="322" y="156" width="26" height="20" fill="#0e1018"/>
        <rect x="294" y="184" width="26" height="22" fill="#0e1018"/>
        <rect x="322" y="184" width="26" height="22" fill="#0e1018"/>
        <rect x="294" y="214" width="26" height="22" fill="#0e1018"/>
        <rect x="322" y="214" width="26" height="22" fill="#0e1018"/>
        {isSel("merveille")&&<rect x="282" y="146" width="74" height="98" fill="none" stroke={`${ac}44`} strokeWidth="2" filter="url(#mm_glow)"/>}
        <text x="319" y="248" textAnchor="middle" fill={isSel("merveille")?ac:"#3a5080"} fontSize="8.5" fontFamily="'Cinzel',serif" fontWeight="bold">LA MERVEILLE</text>
        <text x="319" y="260" textAnchor="middle" fill={isSel("merveille")?"#6080cc":"#2a3860"} fontSize="6.5" fontFamily="'Cinzel',serif">1211–1228</text>
      </g>

      {/* ═══ CLOISTER ═══ */}
      <g onClick={()=>hit("cloister")} style={{cursor:"pointer"}}>
        <rect x="292" y="152" width="52" height="52" fill={isSel("cloister")?"#1a2218":"#101810"}
          stroke={isSel("cloister")?`${ac}88`:"rgba(40,80,30,0.38)"} strokeWidth={isSel("cloister")?2:1.5}/>
        {/* Garden void */}
        <rect x="304" y="164" width="28" height="28" fill="#0c1009"/>
        {/* Column dots */}
        {[304,310,316,322,330].map(x=>(
          <circle key={x} cx={x} cy="164" r="1.5" fill={isSel("cloister")?"#60a06055":"#30502822"} stroke={isSel("cloister")?"#60a060":"#305028"} strokeWidth="0.5"/>
        ))}
        {[304,310,316,322,330].map(x=>(
          <circle key={x+100} cx={x} cy="192" r="1.5" fill={isSel("cloister")?"#60a06055":"#30502822"} stroke={isSel("cloister")?"#60a060":"#305028"} strokeWidth="0.5"/>
        ))}
        {[164,170,176,182,188].map(y=>(
          <circle key={y} cx="304" cy={y} r="1.5" fill={isSel("cloister")?"#60a06055":"#30502822"} stroke={isSel("cloister")?"#60a060":"#305028"} strokeWidth="0.5"/>
        ))}
        {[164,170,176,182,188].map(y=>(
          <circle key={y+100} cx="332" cy={y} r="1.5" fill={isSel("cloister")?"#60a06055":"#30502822"} stroke={isSel("cloister")?"#60a060":"#305028"} strokeWidth="0.5"/>
        ))}
        {isSel("cloister")&&<rect x="288" y="148" width="60" height="60" fill="none" stroke={`${ac}44`} strokeWidth="2" filter="url(#mm_glow)"/>}
        <text x="318" y="148" textAnchor="middle" fill={isSel("cloister")?ac:"#3a6030"} fontSize="7" fontFamily="'Cinzel',serif">KREUZGANG</text>
      </g>

      {/* ═══ CHÂTELET ═══ */}
      <g onClick={()=>hit("chatelet")} style={{cursor:"pointer"}}>
        <rect x="384" y="246" width="32" height="16" fill={isSel("chatelet")?"#3a1808":"#2a1006"}
          stroke={isSel("chatelet")?`${ac}cc`:"rgba(180,60,30,0.5)"} strokeWidth={isSel("chatelet")?2:1.5}/>
        <rect x="384" y="246" width="10" height="16" fill={isSel("chatelet")?"#4a2010":"#341208"} stroke="rgba(180,60,30,0.25)" strokeWidth="0.5"/>
        <rect x="406" y="246" width="10" height="16" fill={isSel("chatelet")?"#4a2010":"#341208"} stroke="rgba(180,60,30,0.25)" strokeWidth="0.5"/>
        {isSel("chatelet")&&<rect x="380" y="242" width="40" height="24" fill="none" stroke={`${ac}44`} strokeWidth="2" filter="url(#mm_glow)"/>}
        <text x="400" y="243" textAnchor="middle" fill={isSel("chatelet")?ac:"#8a3020"} fontSize="7" fontFamily="'Cinzel',serif">CHÂTELET ⚠</text>
      </g>

      {/* Compass */}
      <g transform={`translate(${W-44},44)`}>
        <circle r="18" fill="rgba(0,0,0,0.7)" stroke={`${ac}44`} strokeWidth="1"/>
        {[["N",0,"#e8d8b0"],["S",180,"#7a6a48"],["O",90,"#7a6a48"],["W",270,"#7a6a48"]].map(([l,a,c])=>{
          const r2=Number(a)*Math.PI/180;
          return<text key={l} x={Math.sin(r2)*11} y={-Math.cos(r2)*11+4}
            textAnchor="middle" fill={c} fontSize="8" fontFamily="'Cinzel',serif" fontWeight="bold">{l}</text>;
        })}
        <circle r="2" fill={ac} opacity="0.6"/>
      </g>

      {/* Scale */}
      <g transform={`translate(50,${H-28})`}>
        <line x1="0" y1="0" x2="100" y2="0" stroke={`${ac}55`} strokeWidth="1.5"/>
        <line x1="0" y1="-5" x2="0" y2="5" stroke={`${ac}55`} strokeWidth="1.5"/>
        <line x1="100" y1="-5" x2="100" y2="5" stroke={`${ac}55`} strokeWidth="1.5"/>
        <text x="50" y="14" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="'Cinzel',serif">≈ 100m</text>
      </g>

      <text x="20" y="26" fill={ac} fontSize="15" fontFamily="'Cinzel',serif" fontWeight="bold">MONT SAINT-MICHEL</text>
      <text x="20" y="42" fill="#9a8a60" fontSize="9" fontFamily="'Cinzel',serif">Normandie · 8.–16. Jh. · Frankreich</text>
    </svg>
  );
};

// ── Gravecrest ────────────────────────────────────────────────────────────────
DETAILED_PLANS.gravecrest=({ac,sel,onSel})=>{
  const W=1100,H=500;
  const S=(id,nm,ic,tp,d,st,wk)=>({id,name:nm,icon:ic,type:tp,desc:d,stats:st,weakness:wk});
  const EL=[
    S("rittersaal","Großer Rittersaal","⚔️","Repräsentationssaal","Der weitläufige Rittersaal folgt dem natürlichen Felsverlauf des Hügels. Hier hielt der Ordo Custodum Rittergelübde, Gerichtstage und Kriegsräte ab. Waffen und Rüstkammer flankieren den SE-Eingang.",["Natürlicher Fels","Wandmalereien","Kriegsrat"],null),
    S("palas","Palas-Wohntrakt","🏰","Wohngebäude","Der zentrale Wohntrakt mit vier massiven Rundtürmen. Mehrgeschossig mit Palas-Küche, Wohngemächern, Kaiserzimmer, Konvent-Zimmer, Schatzkammer und Bibliothek.",["4 Rundtürme","Mehrgeschossig","Residenz"],null),
    S("palas_kueche","Palas-Küche","🍖","Küche","Die große Burgküche im NW-Turm. Zwei Herdstellen, Bratspieß und Vorratskammern versorgen die gesamte Besatzung.",["2 Herdstellen","NW-Turm","Vorräte"],null),
    S("wohngemaecher","Wohngemächer","🛏️","Wohnräume","Herrschaftliche Schlafgemächer im NE-Flügel. Zugang über die Wendeltreppe im NE-Turm.",["Herrschaftlich","NE-Turm","Privaträume"],null),
    S("kaiserzimmer","Kaiserzimmer","👑","Repräsentationsraum","Prunksaal für Audienzen hochrangiger Gäste. Deckengewölbe mit Wappen des Ordo Custodum.",["Audienzraum","Gewölbe","Wappen"],null),
    S("konventzimmer","Konvent-Zimmer","📜","Ordensraum","Geheime Versammlungsräume des inneren Ordensrats. Schalldichte Steinwände, keine Außenfenster.",["Ordensrat","Geheim","Schalldicht"],null),
    S("schatzkammer","Schatzkammer","💎","Tresorraum","Gesicherter Tresor für Ordensgold, Reliquien und Archive. Dreifachschloss-Mechanismus.",["Dreifachschloss","Ordensgold","Archive"],null),
    S("bibliothek","Bibliothek","📚","Wissenszentrum","Ordensbibliothek im SW-Flügel. Seltene Manuskripte über Belagerungstechnik, Alchemie und verbotenes Wissen.",["Manuskripte","SW-Turm","Verbotenes Wissen"],null),
    S("innenhof","Oberer Innenhof","🏛️","Kleinerer Hof","Der kleinere Innenhof — Übungsplatz mit Galeriegängen, Kleinen Schmieden und Apotheken. Badehaus und Garderobe auf der Westseite.",["Galeriegänge","Übungsplatz","Kleinerer Hof"],null),
    S("mittleres_tor","Mittleres Burgtor","🚪","Quertor","Massives Quertor zwischen Ober- und Unterhof. Fallgitter, Schießscharten, beidseitige Torwächter.",["Fallgitter","Quertor","Zwischentor"],4),
    S("donjon","Großer Hauptturm (Donjon)","🏯","Bergfried","Zylindrischer Bergfried mit 4m Mauerdicke — stärkster Punkt der Burg. Letzter Rückzugsort der Ordenskrieger.",["4m Mauerdicke","Zylindrisch","Letzter Rückzug"],2),
    S("haupthof","Unterer Haupthof","🌿","Größerer Hof","Weitläufiger Haupthof — wirtschaftliches Zentrum mit Schmieden, Lagerhäusern, Ställen, Küchenhof und Flaschenzug.",["Wirtschaftszentrum","Größerer Hof","Flaschenzug"],null),
    S("torhaus","Torhaus","⚔️","Toranlage","Separat stehendes Torhaus mit vier Eckwachstuben und Zugbrücke. Letzte Verteidigungslinie.",["Zugbrücke","Eckwachstuben","Letztes Tor"],3),
    S("keller","Subterrane Gänge & Grüfte","💀","Unterirdisch","Weitverzweigtes Tunnelnetz unter der gesamten Burg — Kerker, Vorratsräume und geheime Fluchttunnel.",["Kerker","Fluchttunnel","Geheim"],null),
  ];
  const el=id=>EL.find(e=>e.id===id)||null;
  const hit=id=>onSel(sel&&sel.id===id?null:el(id));
  const isSel=id=>sel&&sel.id===id;
  const wf=id=>isSel(id)?"#382710":"#2c2208";
  const ws=id=>isSel(id)?`${ac}88`:`${ac}33`;

  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"100%",display:"block"}}>
      <defs>
        <radialGradient id="gc2_bg" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#0e0c05"/>
          <stop offset="100%" stopColor="#060402"/>
        </radialGradient>
        <pattern id="gc2_st" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="transparent"/>
          <rect x="0" y="0" width="9" height="9" fill={`${ac}04`}/>
          <rect x="11" y="11" width="9" height="9" fill={`${ac}03`}/>
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#gc2_bg)"/>

      {/* ═══ RITTERSAAL (x=20-168) ═══ */}
      <path d="M 168,60 L 105,60 L 68,48 L 34,78 L 18,162 L 16,250 L 18,362 L 42,440 L 112,440 L 168,440 Z"
        fill={wf("rittersaal")} stroke={ws("rittersaal")} strokeWidth="1.5"
        onClick={()=>hit("rittersaal")} style={{cursor:"pointer"}}/>
      {[[40,88,72,106],[24,204,46,224],[20,318,42,338],[52,432,88,440]].map(([x1,y1,x2,y2],i)=>(
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(0,0,0,0.35)" strokeWidth="2.5" style={{pointerEvents:"none"}}/>
      ))}
      <path d="M 168,78 L 112,78 L 80,96 L 56,134 L 44,198 L 42,260 L 46,362 L 68,422 L 114,422 L 168,422 Z" fill="#0d0b04" stroke="none"/>
      <path d="M 168,78 L 112,78 L 80,96 L 56,134 L 44,198 L 42,260 L 46,362 L 68,422 L 114,422 L 168,422 Z" fill="url(#gc2_st)" opacity="0.4" style={{pointerEvents:"none"}}/>
      <path d="M 168,78 L 112,78 L 80,96 L 56,134 L 44,198 L 42,260 L 46,362 L 68,422 L 114,422 L 168,422 Z"
        fill={isSel("rittersaal")?"rgba(50,35,8,0.14)":"transparent"}
        onClick={()=>hit("rittersaal")} style={{cursor:"pointer"}}/>
      <text x="88" y="252" textAnchor="middle" fill={isSel("rittersaal")?ac:`${ac}77`} fontSize="8" fontFamily="'Cinzel',serif" style={{pointerEvents:"none"}}>Großer</text>
      <text x="88" y="263" textAnchor="middle" fill={isSel("rittersaal")?ac:`${ac}66`} fontSize="8" fontFamily="'Cinzel',serif" style={{pointerEvents:"none"}}>Rittersaal</text>
      {/* SE rooms: Waffen, Rüstkammer */}
      {[[354,30,388,388,30],[388,30,422,388,30]].map(([y,w,y2,y3,w2],i)=>(
        <g key={i}>
          <rect x="118" y={y} width="48" height="30" fill={wf("rittersaal")} stroke={ws("rittersaal")} strokeWidth="1" onClick={()=>hit("rittersaal")} style={{cursor:"pointer"}}/>
          <rect x="124" y={y+6} width="36" height="18" fill="#0d0b04" stroke="none"/>
        </g>
      ))}
      <text x="142" y="372" textAnchor="middle" fill={`${ac}55`} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Waffen</text>
      <text x="142" y="406" textAnchor="middle" fill={`${ac}55`} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Rüstkammer</text>

      {/* ═══ PALAS BLOCK (x=168-366) ═══ */}
      <rect x="168" y="60" width="198" height="380" fill={wf("palas")} stroke={ws("palas")} strokeWidth="1.5" onClick={()=>hit("palas")} style={{cursor:"pointer"}}/>
      <rect x="186" y="78" width="162" height="344" fill="#0d0b04" stroke="none"/>
      {/* 4 corner towers */}
      {[[168,78],[366,78],[168,422],[366,422]].map(([cx,cy],i)=>(
        <circle key={i} cx={cx} cy={cy} r="26" fill={wf("palas")} stroke={ws("palas")} strokeWidth="1.5" onClick={()=>hit("palas")} style={{cursor:"pointer"}}/>
      ))}
      {[[168,78],[366,78],[168,422],[366,422]].map(([cx,cy],i)=>(
        <circle key={i} cx={cx} cy={cy} r="13" fill="#0d0b04" stroke="none"/>
      ))}
      {[[168,78],[366,78],[168,422],[366,422]].map(([cx,cy],i)=>(
        <circle key={i} cx={cx} cy={cy} r="6" fill="none" stroke={`${ac}22`} strokeWidth="0.8" style={{pointerEvents:"none"}}/>
      ))}
      {/* Room dividers */}
      {[150,228,308].map((y,i)=>(
        <rect key={i} x="186" y={y} width="162" height="8" fill={wf("palas")} stroke="none" style={{pointerEvents:"none"}}/>
      ))}
      <rect x="252" y="78" width="8" height="230" fill={wf("palas")} stroke="none" style={{pointerEvents:"none"}}/>
      {/* Palas-Küche */}
      <rect x="186" y="78" width="66" height="72" fill={isSel("palas_kueche")?"#2a2010":"#1e1808"} stroke={isSel("palas_kueche")?`${ac}77`:"rgba(150,95,30,0.3)"} strokeWidth={isSel("palas_kueche")?1.5:1} onClick={()=>hit("palas_kueche")} style={{cursor:"pointer"}}/>
      <text x="219" y="112" textAnchor="middle" fill={isSel("palas_kueche")?ac:`${ac}77`} fontSize="8" fontFamily="serif" style={{pointerEvents:"none"}}>Palas-</text>
      <text x="219" y="123" textAnchor="middle" fill={isSel("palas_kueche")?ac:`${ac}66`} fontSize="8" fontFamily="serif" style={{pointerEvents:"none"}}>Küche</text>
      {/* Wohngemächer */}
      <rect x="260" y="78" width="88" height="72" fill={isSel("wohngemaecher")?"#2a2010":"#1e1808"} stroke={isSel("wohngemaecher")?`${ac}77`:"rgba(150,95,30,0.3)"} strokeWidth={isSel("wohngemaecher")?1.5:1} onClick={()=>hit("wohngemaecher")} style={{cursor:"pointer"}}/>
      <text x="304" y="112" textAnchor="middle" fill={isSel("wohngemaecher")?ac:`${ac}77`} fontSize="8" fontFamily="serif" style={{pointerEvents:"none"}}>Wohn-</text>
      <text x="304" y="123" textAnchor="middle" fill={isSel("wohngemaecher")?ac:`${ac}66`} fontSize="8" fontFamily="serif" style={{pointerEvents:"none"}}>gemächer</text>
      {/* Kaiserzimmer */}
      <rect x="186" y="158" width="66" height="70" fill={isSel("kaiserzimmer")?"#2a2010":"#1e1808"} stroke={isSel("kaiserzimmer")?`${ac}77`:"rgba(150,95,30,0.3)"} strokeWidth={isSel("kaiserzimmer")?1.5:1} onClick={()=>hit("kaiserzimmer")} style={{cursor:"pointer"}}/>
      <text x="219" y="191" textAnchor="middle" fill={isSel("kaiserzimmer")?ac:`${ac}77`} fontSize="8" fontFamily="serif" style={{pointerEvents:"none"}}>Kaiser-</text>
      <text x="219" y="202" textAnchor="middle" fill={isSel("kaiserzimmer")?ac:`${ac}66`} fontSize="8" fontFamily="serif" style={{pointerEvents:"none"}}>zimmer</text>
      {/* Konvent-Zimmer */}
      <rect x="260" y="158" width="88" height="70" fill={isSel("konventzimmer")?"#2a2010":"#1e1808"} stroke={isSel("konventzimmer")?`${ac}77`:"rgba(150,95,30,0.3)"} strokeWidth={isSel("konventzimmer")?1.5:1} onClick={()=>hit("konventzimmer")} style={{cursor:"pointer"}}/>
      <text x="304" y="191" textAnchor="middle" fill={isSel("konventzimmer")?ac:`${ac}77`} fontSize="8" fontFamily="serif" style={{pointerEvents:"none"}}>Konvent-</text>
      <text x="304" y="202" textAnchor="middle" fill={isSel("konventzimmer")?ac:`${ac}66`} fontSize="8" fontFamily="serif" style={{pointerEvents:"none"}}>Zimmer</text>
      {/* Schatzkammer */}
      <rect x="186" y="236" width="66" height="72" fill={isSel("schatzkammer")?"#2a2010":"#1e1808"} stroke={isSel("schatzkammer")?`${ac}77`:"rgba(150,95,30,0.3)"} strokeWidth={isSel("schatzkammer")?1.5:1} onClick={()=>hit("schatzkammer")} style={{cursor:"pointer"}}/>
      <text x="219" y="270" textAnchor="middle" fill={isSel("schatzkammer")?ac:`${ac}77`} fontSize="8" fontFamily="serif" style={{pointerEvents:"none"}}>Schatz-</text>
      <text x="219" y="281" textAnchor="middle" fill={isSel("schatzkammer")?ac:`${ac}66`} fontSize="8" fontFamily="serif" style={{pointerEvents:"none"}}>kammer</text>
      {/* Bibliothek (bottom, full width) */}
      <rect x="186" y="316" width="162" height="106" fill={isSel("bibliothek")?"#1a2420":"#111a18"} stroke={isSel("bibliothek")?`${ac}88`:"rgba(40,90,70,0.5)"} strokeWidth={isSel("bibliothek")?2:1} onClick={()=>hit("bibliothek")} style={{cursor:"pointer"}}/>
      <text x="267" y="372" textAnchor="middle" fill={isSel("bibliothek")?ac:"rgba(70,140,100,0.7)"} fontSize="9" fontFamily="serif" style={{pointerEvents:"none"}}>Bibliothek</text>
      <text x="168" y="44" textAnchor="middle" fill={`${ac}44`} fontSize="6.5" fontFamily="serif">NW-Turm</text>
      <text x="366" y="44" textAnchor="middle" fill={`${ac}44`} fontSize="6.5" fontFamily="serif">NE-Turm</text>
      <text x="168" y="476" textAnchor="middle" fill={`${ac}44`} fontSize="6.5" fontFamily="serif">SW-Turm</text>
      <text x="366" y="476" textAnchor="middle" fill={`${ac}44`} fontSize="6.5" fontFamily="serif">SE-Turm</text>

      {/* ═══ CENTRAL SECTION (x=366-512): INNENHOF + FUNCTIONAL ═══ */}
      {/* N/S outer walls (continuous strip) */}
      <rect x="366" y="60" width="146" height="18" fill={wf("innenhof")} stroke="none" style={{pointerEvents:"none"}}/>
      <rect x="366" y="422" width="146" height="18" fill={wf("innenhof")} stroke="none" style={{pointerEvents:"none"}}/>
      {/* Fill entire central interior with wall mass */}
      <rect x="366" y="78" width="146" height="344" fill={wf("innenhof")} stroke="none" onClick={()=>hit("innenhof")} style={{cursor:"pointer"}}/>
      {/* Galeriegang N void */}
      <rect x="372" y="80" width="134" height="20" fill="#0d0b04" stroke="none"/>
      <text x="439" y="93" textAnchor="middle" fill={`${ac}44`} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Galeriegang</text>
      {/* Galeriegang S void */}
      <rect x="372" y="344" width="134" height="20" fill="#0d0b04" stroke="none"/>
      <text x="439" y="357" textAnchor="middle" fill={`${ac}44`} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Galeriegang</text>
      {/* W rooms: Badehaus (top void), Garderobe (bottom void) */}
      <rect x="374" y="108" width="30" height="98" fill="#0d0b04" stroke="none"/>
      <text x="389" y="155" textAnchor="middle" fill={`${ac}44`} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Bade-</text>
      <text x="389" y="165" textAnchor="middle" fill={`${ac}38`} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>haus</text>
      <rect x="374" y="216" width="30" height="118" fill="#0d0b04" stroke="none"/>
      <text x="389" y="273" textAnchor="middle" fill={`${ac}44`} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Garde-</text>
      <text x="389" y="283" textAnchor="middle" fill={`${ac}38`} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>robe</text>
      {/* N rooms above Innenhof: Kleine Schmieden, Apotheken */}
      <rect x="412" y="102" width="46" height="44" fill="#0d0b04" stroke="none"/>
      <text x="435" y="122" textAnchor="middle" fill={`${ac}44`} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Kl.</text>
      <text x="435" y="132" textAnchor="middle" fill={`${ac}38`} fontSize="6.5" fontFamily="serif" style={{pointerEvents:"none"}}>Schm.</text>
      <rect x="462" y="102" width="46" height="44" fill="#0d0b04" stroke="none"/>
      <text x="485" y="122" textAnchor="middle" fill={`${ac}44`} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Apothe-</text>
      <text x="485" y="132" textAnchor="middle" fill={`${ac}38`} fontSize="6.5" fontFamily="serif" style={{pointerEvents:"none"}}>ken</text>
      {/* Oberer Innenhof void */}
      <rect x="412" y="148" width="96" height="148" fill="#0d0b04" stroke={`${ac}22`} strokeWidth="1" onClick={()=>hit("innenhof")} style={{cursor:"pointer"}}/>
      <text x="460" y="218" textAnchor="middle" fill={`${ac}33`} fontSize="8" fontFamily="serif" style={{pointerEvents:"none"}}>Oberer</text>
      <text x="460" y="230" textAnchor="middle" fill={`${ac}33`} fontSize="8" fontFamily="serif" style={{pointerEvents:"none"}}>Innenhof</text>
      <text x="460" y="241" textAnchor="middle" fill={`${ac}25`} fontSize="6" fontFamily="serif" style={{pointerEvents:"none"}}>(Kleinerer Hof)</text>
      {/* S rooms below Innenhof */}
      <rect x="412" y="298" width="46" height="44" fill="#0d0b04" stroke="none"/>
      <text x="435" y="318" textAnchor="middle" fill={`${ac}44`} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Kl.</text>
      <text x="435" y="328" textAnchor="middle" fill={`${ac}38`} fontSize="6.5" fontFamily="serif" style={{pointerEvents:"none"}}>Schm.</text>
      <rect x="462" y="298" width="46" height="44" fill="#0d0b04" stroke="none"/>
      <text x="485" y="318" textAnchor="middle" fill={`${ac}44`} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Apothe-</text>
      <text x="485" y="328" textAnchor="middle" fill={`${ac}38`} fontSize="6.5" fontFamily="serif" style={{pointerEvents:"none"}}>ken</text>

      {/* ═══ MITTLERES BURGTOR (x=512-534) ═══ */}
      <rect x="512" y="60" width="22" height="380" fill={wf("mittleres_tor")} stroke={ws("mittleres_tor")} strokeWidth="1.5" onClick={()=>hit("mittleres_tor")} style={{cursor:"pointer"}}/>
      <rect x="517" y="192" width="12" height="116" fill="#0d0b04" stroke={`${ac}33`} strokeWidth="0.8" style={{pointerEvents:"none"}}/>
      <text x="523" y="258" textAnchor="middle" fill={isSel("mittleres_tor")?ac:`${ac}55`} fontSize="6" fontFamily="serif" transform="rotate(-90,523,258)" style={{pointerEvents:"none"}}>MITTL. BURGTOR</text>

      {/* ═══ RIGHT SECTION (x=534-870): HAUPTHOF + DONJON ═══ */}
      {/* Outer walls */}
      <rect x="534" y="60" width="336" height="18" fill={wf("haupthof")} stroke="none" style={{pointerEvents:"none"}}/>
      <rect x="534" y="422" width="336" height="18" fill={wf("haupthof")} stroke="none" style={{pointerEvents:"none"}}/>
      <rect x="852" y="60" width="18" height="380" fill={wf("haupthof")} stroke="none" style={{pointerEvents:"none"}}/>
      <rect x="534" y="60" width="18" height="380" fill={wf("haupthof")} stroke="none" style={{pointerEvents:"none"}}/>
      {/* Zinnen-Wehrtürme along N wall */}
      {[556,584,612,640,668,696,724,752,780,808,836].map((x,i)=>(
        <rect key={i} x={x} y="46" width="14" height="16" fill={wf("haupthof")} stroke={ws("haupthof")} strokeWidth="1" onClick={()=>hit("haupthof")} style={{cursor:"pointer"}}/>
      ))}
      <text x="696" y="38" textAnchor="middle" fill={`${ac}33`} fontSize="7" fontFamily="serif">Zinnen-Wehrtürme</text>
      {/* Fill entire right section interior with wall mass */}
      <rect x="552" y="78" width="300" height="344" fill={wf("haupthof")} stroke="none" onClick={()=>hit("haupthof")} style={{cursor:"pointer"}}/>
      {/* N room voids */}
      <rect x="560" y="84" width="50" height="40" fill="#0d0b04" stroke="none"/>
      <text x="585" y="107" textAnchor="middle" fill={`${ac}44`} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Waffen-</text>
      <text x="585" y="116" textAnchor="middle" fill={`${ac}38`} fontSize="6.5" fontFamily="serif" style={{pointerEvents:"none"}}>kämmer</text>
      <rect x="620" y="84" width="46" height="40" fill="#0d0b04" stroke="none"/>
      <text x="643" y="107" textAnchor="middle" fill={`${ac}44`} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Wach-</text>
      <text x="643" y="116" textAnchor="middle" fill={`${ac}38`} fontSize="6.5" fontFamily="serif" style={{pointerEvents:"none"}}>stuben</text>
      <rect x="676" y="84" width="50" height="40" fill="#0d0b04" stroke="none"/>
      <text x="701" y="107" textAnchor="middle" fill={`${ac}44`} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Küchen-</text>
      <text x="701" y="116" textAnchor="middle" fill={`${ac}38`} fontSize="6.5" fontFamily="serif" style={{pointerEvents:"none"}}>hof</text>
      <rect x="736" y="84" width="108" height="40" fill="#0d0b04" stroke="none"/>
      <text x="790" y="108" textAnchor="middle" fill={`${ac}44`} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Lagerhäuser</text>
      {/* Haupthof courtyard void */}
      <rect x="558" y="132" width="286" height="166" fill="#0d0b04" stroke={`${ac}22`} strokeWidth="1" onClick={()=>hit("haupthof")} style={{cursor:"pointer"}}/>
      <text x="701" y="292" textAnchor="middle" fill={`${ac}28`} fontSize="8" fontFamily="serif" style={{pointerEvents:"none"}}>Unterer Haupthof (Größerer Hof)</text>
      {/* Großer Hauptturm / Donjon — large round */}
      <circle cx="701" cy="215" r="52" fill={wf("donjon")} stroke={ws("donjon")} strokeWidth="2.5" onClick={()=>hit("donjon")} style={{cursor:"pointer"}}/>
      <circle cx="701" cy="215" r="36" fill="#0d0b04" stroke={`${ac}33`} strokeWidth="1" style={{pointerEvents:"none"}}/>
      <circle cx="701" cy="215" r="20" fill={wf("donjon")} stroke={`${ac}55`} strokeWidth="1.5" onClick={()=>hit("donjon")} style={{cursor:"pointer"}}/>
      <circle cx="701" cy="215" r="10" fill="#0d0b04" stroke="none" style={{pointerEvents:"none"}}/>
      <text x="701" y="213" textAnchor="middle" fill={isSel("donjon")?ac:`${ac}77`} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Donjon</text>
      <text x="701" y="222" textAnchor="middle" fill={isSel("donjon")?ac:`${ac}55`} fontSize="6" fontFamily="serif" style={{pointerEvents:"none"}}>(Hauptturm)</text>
      {/* S room voids */}
      <rect x="560" y="306" width="62" height="40" fill="#0d0b04" stroke="none"/>
      <text x="591" y="328" textAnchor="middle" fill={`${ac}44`} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Ställe</text>
      <rect x="632" y="306" width="44" height="40" fill="#0d0b04" stroke="none"/>
      <text x="654" y="328" textAnchor="middle" fill={`${ac}44`} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Wach-</text>
      <text x="654" y="337" textAnchor="middle" fill={`${ac}38`} fontSize="6.5" fontFamily="serif" style={{pointerEvents:"none"}}>stuben</text>
      <rect x="686" y="306" width="50" height="40" fill="#0d0b04" stroke="none"/>
      <text x="711" y="328" textAnchor="middle" fill={`${ac}44`} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Schmieden</text>
      <rect x="746" y="306" width="98" height="40" fill="#0d0b04" stroke="none"/>
      <text x="795" y="328" textAnchor="middle" fill={`${ac}44`} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Lagerhäuser</text>
      {/* Extra bottom: Apotheke, Militärakademie */}
      <rect x="616" y="356" width="54" height="38" fill="#0d0b04" stroke="none"/>
      <text x="643" y="378" textAnchor="middle" fill={`${ac}44`} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Apotheke</text>
      <rect x="680" y="356" width="164" height="38" fill="#0d0b04" stroke="none"/>
      <text x="762" y="378" textAnchor="middle" fill={`${ac}44`} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Militärakademie</text>
      {/* Unterirdische Gänge label (N side of right section) */}
      <text x="701" y="52" textAnchor="middle" fill={`${ac}33`} fontSize="6.5" fontFamily="serif">Unterirdische Gänge</text>

      {/* ═══ CONNECTION PASSAGE (x=870-932) ═══ */}
      <rect x="870" y="228" width="62" height="44" fill={isSel("torhaus")?"#3a1010":"#2c1008"} stroke={isSel("torhaus")?"#cc4433":"#882222"} strokeWidth="1" onClick={()=>hit("torhaus")} style={{cursor:"pointer"}}/>
      <rect x="876" y="234" width="50" height="32" fill="#0d0b04" stroke="none"/>

      {/* ═══ TORHAUS (x=932-1082) ═══ */}
      <rect x="932" y="148" width="122" height="204" fill={isSel("torhaus")?"#3a1010":"#2c1008"} stroke={isSel("torhaus")?"#cc4433":"#882222"} strokeWidth="2" onClick={()=>hit("torhaus")} style={{cursor:"pointer"}}/>
      {/* Gate passage void */}
      <rect x="984" y="148" width="18" height="204" fill="#0d0b04" stroke={`${ac}33`} strokeWidth="0.8" style={{pointerEvents:"none"}}/>
      {/* 4 wachstuben room voids */}
      <rect x="940" y="156" width="42" height="82" fill="#0d0b04" stroke="none"/>
      <rect x="1002" y="156" width="42" height="82" fill="#0d0b04" stroke="none"/>
      <rect x="940" y="262" width="42" height="82" fill="#0d0b04" stroke="none"/>
      <rect x="1002" y="262" width="42" height="82" fill="#0d0b04" stroke="none"/>
      {/* Corner square towers */}
      {[[932,148],[1054,148],[932,352],[1054,352]].map(([x,y],i)=>(
        <rect key={i} x={x-16} y={y-16} width="32" height="32" fill={isSel("torhaus")?"#3a1010":"#2c1008"} stroke={isSel("torhaus")?"#cc4433":"#882222"} strokeWidth="2" onClick={()=>hit("torhaus")} style={{cursor:"pointer"}}/>
      ))}
      {/* Labels */}
      <text x="961" y="199" textAnchor="middle" fill={isSel("torhaus")?"#ee6644":"#aa3322"} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Torhaus-</text>
      <text x="961" y="208" textAnchor="middle" fill={isSel("torhaus")?"#dd5533":"#993322"} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Wachstuben</text>
      <text x="1027" y="199" textAnchor="middle" fill={isSel("torhaus")?"#ee6644":"#aa3322"} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Torhaus-</text>
      <text x="1027" y="208" textAnchor="middle" fill={isSel("torhaus")?"#dd5533":"#993322"} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Wachstuben</text>
      <text x="961" y="305" textAnchor="middle" fill={isSel("torhaus")?"#ee6644":"#aa3322"} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Torhaus-</text>
      <text x="961" y="314" textAnchor="middle" fill={isSel("torhaus")?"#dd5533":"#993322"} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Wachstuben</text>
      <text x="1027" y="305" textAnchor="middle" fill={isSel("torhaus")?"#ee6644":"#aa3322"} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Torhaus-</text>
      <text x="1027" y="314" textAnchor="middle" fill={isSel("torhaus")?"#dd5533":"#993322"} fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Wachstuben</text>
      <text x="993" y="256" textAnchor="middle" fill={isSel("torhaus")?"#ff7755":"#cc3322"} fontSize="9" fontFamily="'Cinzel',serif" fontWeight="bold" style={{pointerEvents:"none"}}>TORHAUS</text>
      {/* Zugbrücke */}
      <rect x="1054" y="226" width="36" height="48" fill={isSel("torhaus")?"#2e1010":"#1e0e08"} stroke={isSel("torhaus")?"#cc4433":"#882222"} strokeWidth="1.5" onClick={()=>hit("torhaus")} style={{cursor:"pointer"}}/>
      <rect x="1060" y="232" width="24" height="36" fill="#0d0b04" stroke="none"/>
      <line x1="1060" y1="234" x2="1052" y2="242" stroke="#882222" strokeWidth="1.2" style={{pointerEvents:"none"}}/>
      <line x1="1084" y1="234" x2="1090" y2="242" stroke="#882222" strokeWidth="1.2" style={{pointerEvents:"none"}}/>
      <line x1="1060" y1="264" x2="1052" y2="256" stroke="#882222" strokeWidth="1.2" style={{pointerEvents:"none"}}/>
      <line x1="1084" y1="264" x2="1090" y2="256" stroke="#882222" strokeWidth="1.2" style={{pointerEvents:"none"}}/>
      <text x="1072" y="253" textAnchor="middle" fill="#882222" fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>Zug-</text>
      <text x="1072" y="262" textAnchor="middle" fill="#882222" fontSize="7" fontFamily="serif" style={{pointerEvents:"none"}}>brücke</text>

      {/* ═══ UNDERGROUND PASSAGES ═══ */}
      <rect x="42" y="448" width="828" height="16" rx="2" fill="rgba(6,5,2,0.85)" stroke={isSel("keller")?"rgba(120,90,30,0.7)":"rgba(60,45,20,0.4)"} strokeWidth="1" strokeDasharray="7,3" onClick={()=>hit("keller")} style={{cursor:"pointer"}}/>
      <text x="90" y="43" textAnchor="middle" fill={isSel("keller")?ac:`${ac}44`} fontSize="7" fontFamily="serif" onClick={()=>hit("keller")} style={{cursor:"pointer"}}>Subterrane Gänge &amp; Grüfte</text>
      <text x="220" y="460" fill={isSel("keller")?ac:`${ac}44`} fontSize="7" fontFamily="serif" onClick={()=>hit("keller")} style={{cursor:"pointer"}}>Unterirdische Gänge</text>
      <text x="500" y="460" fill={isSel("keller")?ac:`${ac}44`} fontSize="7" fontFamily="serif" onClick={()=>hit("keller")} style={{cursor:"pointer"}}>Unterirdische Gänge &amp; Grüfte</text>
      <text x="810" y="460" fill={isSel("keller")?ac:`${ac}44`} fontSize="7" fontFamily="serif" onClick={()=>hit("keller")} style={{cursor:"pointer"}}>Flaschenzug</text>

      {/* ═══ TITLE + COMPASS + SCALE ═══ */}
      <text x="540" y="20" textAnchor="middle" fill={ac} fontSize="13" fontFamily="'Cinzel',serif" fontWeight="bold" letterSpacing="2">GRUNDRISS DER BURG GRAVECREST</text>
      <text x="540" y="34" textAnchor="middle" fill={`${ac}55`} fontSize="8" fontFamily="'Cinzel',serif">Ordo Custodum · Fiktive Burg</text>
      <g transform="translate(1060,460)">
        <circle r="18" fill="rgba(8,6,3,0.65)" stroke={`${ac}33`} strokeWidth="1"/>
        <text x="0" y="-5" textAnchor="middle" fill={`${ac}77`} fontSize="9" fontFamily="serif">N</text>
        <line x1="0" y1="-2" x2="0" y2="-14" stroke={`${ac}66`} strokeWidth="1.5"/>
        <line x1="-10" y1="8" x2="0" y2="-2" stroke={`${ac}44`} strokeWidth="1"/>
        <line x1="10" y1="8" x2="0" y2="-2" stroke={`${ac}44`} strokeWidth="1"/>
      </g>
      <g transform="translate(50,482)">
        <line x1="0" y1="0" x2="100" y2="0" stroke={`${ac}55`} strokeWidth="1.5"/>
        <line x1="0" y1="-4" x2="0" y2="4" stroke={`${ac}55`} strokeWidth="1.5"/>
        <line x1="100" y1="-4" x2="100" y2="4" stroke={`${ac}55`} strokeWidth="1.5"/>
        <text x="50" y="12" textAnchor="middle" fill={`${ac}66`} fontSize="7.5" fontFamily="'Cinzel',serif">Maßstab 1:200</text>
      </g>
    </svg>
  );
};

DETAILED_PLANS.carcassonne=({ac,sel,onSel})=>{
  const W=800,H=560;
  const isSel=id=>sel&&sel.id===id;
  const S=(id,nm,ic,tp,desc,stats,weak)=>({id,name:nm,icon:ic,type:tp,desc,stats,weakness:weak});
  const EL=[
    S("outer_wall","Äußere Enceinte","🧱","Außenmauer","52 Türme schützen die Äußere Enceinte, errichtet im 13. Jh. unter Ludwig IX. und Philipp III. Viollet-le-Duc restaurierte sie 1853–1879 — umstrittenerweise mit spitzen Türmen statt der historisch flachen Bedachung.",["52 Türme","3–4 m stark","13. Jh."],7),
    S("lices","Lices — Zwinger","⚔️","Verteidigungszone","Der 8–12 m breite Korridor zwischen Äußerer und Innerer Enceinte. Eindringlinge, die die Außenmauer durchbrachen, gerieten hier unter Kreuzfeuer von beiden Seiten gleichzeitig.",["8–12 m breit","Kreuzfeuer","Tödliche Falle"],5),
    S("inner_wall","Innere Enceinte","🛡️","Innenmauer","Die ältere Stadtmauer mit gallo-romanischen und westgotischen Fundamenten (3.–6. Jh.). Einige Türme sind hufeisenförmig — typisch westgotisch. Bis zu 5 m dick.",["~30 Türme","Teils röm.","Westgotisch (5. Jh.)"],6),
    S("chateau","Château Comtal","🏯","Hauptburg","Die Grafenburg im NW der Cité, ursprünglich Residenz der Trencavel-Grafen (12. Jh.). Eigene Doppel-Ummauerung, Halbmond-Barbikan gegen die Stadt, tiefer Graben. Nach 1226 Sitz der königlichen Seneschalle.",["Barbikan","4 Türme","12. Jh."],3),
    S("saint_nazaire","Basilika Saint-Nazaire","⛪","Kathedrale","Gotische Basilika (11.–14. Jh.) mit romanischem Langhaus (1096) und prächtigen gotischen Querschiffen. Berühmt für Kreuzfahrer-Grabplatten und mittelalterliche Buntglasfenster.",["Romanisch/Gotisch","Rosette 14. Jh.","1096–1330"]),
    S("porte_narbonnaise","Porte Narbonnaise","🚪","Haupttor","Das Haupttor der Cité im Osten (1280 unter Philipp III.). Zwei mächtige Rundtürme flankieren den Eingang. Zugbrücke, Barbikan-Vorhof, Fallgitter und Schießscharten machen es zum stärksten Punkt.",["Zugbrücke","Fallgitter","Erbaut: 1280"],4),
    S("porte_aude","Porte d'Aude","🚪","Nebentor","Das Westtor führt den steilen Hang hinunter zur Aude-Brücke und zur Unterstadt. Der gewundene, schmale Aufstieg macht Sturmangriffe praktisch unmöglich.",["Steilweg","Flussseite","Westseite"],5),
    S("grande_rue","Grande Rue","🛤️","Hauptstraße","Die Hauptstraße verbindet Porte Narbonnaise mit Porte d'Aude auf der ganzen Länge des Hügels. Entlang ihr lagen Tavernen, Händler und Handwerksbetriebe.",["Hauptachse","Märkte","Händler"]),
    S("cite","Cité Innenstadt","🏘️","Wohnbebauung","Dichte mittelalterliche Bebauung mit engen Gassen, Wohnhäusern und Innenhöfen. Im Mittelalter wohnten hier ca. 1.000 Einwohner.",["~1000 Einw.","Enge Gassen","13. Jh."]),
  ];
  const el=id=>EL.find(e=>e.id===id)||null;
  const hit=id=>onSel(sel&&sel.id===id?null:el(id));

  const OP="M 175,195 L 215,115 L 285,70 L 380,50 L 480,58 L 562,92 L 622,148 L 652,220 L 656,300 L 635,382 L 582,450 L 475,492 L 360,500 L 240,474 L 162,412 L 138,322 Z";
  const IP="M 202,212 L 238,140 L 300,100 L 382,80 L 478,87 L 550,116 L 602,162 L 626,228 L 629,302 L 609,376 L 559,434 L 467,468 L 358,476 L 250,452 L 183,393 L 162,310 Z";
  const CV="M 224,228 L 254,158 L 308,118 L 383,100 L 475,107 L 540,132 L 586,173 L 608,234 L 610,302 L 590,368 L 543,412 L 460,446 L 355,454 L 256,430 L 198,375 L 178,308 Z";

  const OT=[[380,50],[440,52],[490,62],[535,80],[575,110],[610,142],[638,180],[650,225],[654,275],[648,320],[636,360],[614,400],[576,440],[525,475],[460,492],[390,500],[320,496],[252,480],[190,452],[150,410],[136,358],[136,308],[148,252],[170,198],[215,122],[275,72]];
  const IT=[[382,82],[445,86],[500,102],[540,122],[578,155],[606,190],[622,225],[628,265],[627,305],[618,345],[604,378],[576,415],[538,446],[488,465],[428,473],[360,474],[295,462],[248,440],[210,410],[184,374],[172,330],[168,285],[175,244],[198,210],[232,148]];

  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"100%",display:"block"}}>
      <defs>
        <radialGradient id="ca_bg" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#100e06"/>
          <stop offset="100%" stopColor="#060402"/>
        </radialGradient>
        <pattern id="ca_st" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="24" height="24" fill="transparent"/>
          <rect x="0" y="0" width="11" height="11" fill={`${ac}05`}/>
          <rect x="13" y="13" width="11" height="11" fill={`${ac}04`}/>
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#ca_bg)"/>

      {/* Hill terrain */}
      <ellipse cx="400" cy="275" rx="322" ry="262" fill="rgba(38,28,10,0.22)" stroke={`${ac}0a`} strokeWidth="0.5"/>

      {/* Outer enceinte mass */}
      <path d={OP} fill={isSel("outer_wall")?"#382710":"#2c2208"}
        stroke={isSel("outer_wall")?`${ac}77`:`${ac}33`} strokeWidth="1"
        onClick={()=>hit("outer_wall")} style={{cursor:"pointer"}}/>
      {/* Lices void (cuts inner part of outer fill) */}
      <path d={IP} fill="#0a0804" stroke="none"/>
      {/* Outer towers */}
      {OT.map(([cx,cy],i)=>(
        <circle key={i} cx={cx} cy={cy} r="13"
          fill={isSel("outer_wall")?"#382710":"#2c2208"}
          stroke={isSel("outer_wall")?`${ac}77`:`${ac}44`} strokeWidth="1"
          onClick={()=>hit("outer_wall")} style={{cursor:"pointer"}}/>
      ))}

      {/* Lices interactive overlay */}
      <path d={IP} fill={isSel("lices")?"rgba(50,75,28,0.14)":"transparent"}
        style={{cursor:"pointer"}} onClick={()=>hit("lices")}/>

      {/* Inner enceinte mass */}
      <path d={IP} fill={isSel("inner_wall")?"#382710":"#2c2208"}
        stroke={isSel("inner_wall")?`${ac}77`:`${ac}33`} strokeWidth="1"
        onClick={()=>hit("inner_wall")} style={{cursor:"pointer"}}/>
      {/* City void */}
      <path d={CV} fill="#0d0b04" stroke="none"/>
      {/* Inner towers */}
      {IT.map(([cx,cy],i)=>(
        <circle key={i} cx={cx} cy={cy} r="11"
          fill={isSel("inner_wall")?"#382710":"#2c2208"}
          stroke={isSel("inner_wall")?`${ac}77`:`${ac}44`} strokeWidth="1"
          onClick={()=>hit("inner_wall")} style={{cursor:"pointer"}}/>
      ))}

      {/* City stone texture */}
      <path d={CV} fill="url(#ca_st)" opacity="0.5"/>
      {/* Street grid */}
      {[230,260,290,320,350,380,410].map(y=>(
        <line key={y} x1="215" y1={y} x2="595" y2={y} stroke={`${ac}07`} strokeWidth="0.5"/>
      ))}
      {[270,320,375,430,490,545].map(x=>(
        <line key={x} x1={x} y1="115" x2={x} y2="448" stroke={`${ac}07`} strokeWidth="0.5"/>
      ))}

      {/* Building blocks — N strip */}
      {[[240,118,52,35],[300,112,52,35],[360,106,55,35],[422,104,52,35],[482,110,52,35],[542,122,42,35]].map(([x,y,w,h],i)=>(
        <rect key={i} x={x} y={y} width={w} height={h}
          fill={isSel("cite")?"#1e1610":"#181208"} stroke={`${ac}10`} strokeWidth="0.8"
          onClick={()=>hit("cite")} style={{cursor:"pointer"}}/>
      ))}
      {/* Building blocks — E strip */}
      {[[558,162,38,40],[554,210,42,40],[553,260,42,40],[552,310,42,40],[548,360,42,40],[534,406,42,32]].map(([x,y,w,h],i)=>(
        <rect key={i} x={x} y={y} width={w} height={h}
          fill={isSel("cite")?"#1e1610":"#181208"} stroke={`${ac}10`} strokeWidth="0.8"
          onClick={()=>hit("cite")} style={{cursor:"pointer"}}/>
      ))}
      {/* Building blocks — W strip */}
      {[[260,168,44,40],[257,218,44,40],[255,266,44,40],[258,314,44,40],[261,362,44,40],[266,408,44,30]].map(([x,y,w,h],i)=>(
        <rect key={i} x={x} y={y} width={w} height={h}
          fill={isSel("cite")?"#1e1610":"#181208"} stroke={`${ac}10`} strokeWidth="0.8"
          onClick={()=>hit("cite")} style={{cursor:"pointer"}}/>
      ))}
      {/* Building blocks — S strip */}
      {[[290,416,50,28],[350,423,50,26],[414,427,50,24],[474,421,48,28],[524,412,38,28]].map(([x,y,w,h],i)=>(
        <rect key={i} x={x} y={y} width={w} height={h}
          fill={isSel("cite")?"#1e1610":"#181208"} stroke={`${ac}10`} strokeWidth="0.8"
          onClick={()=>hit("cite")} style={{cursor:"pointer"}}/>
      ))}

      {/* Grande Rue (main N-S street) */}
      <rect x="388" y="118" width="16" height="316"
        fill={isSel("grande_rue")?"rgba(50,40,12,0.3)":"rgba(15,12,4,0.6)"}
        stroke={isSel("grande_rue")?`${ac}55`:`${ac}10`} strokeWidth="0.5"
        onClick={()=>hit("grande_rue")} style={{cursor:"pointer"}}/>

      {/* Place du Grand Puits */}
      <circle cx="396" cy="282" r="22"
        fill={isSel("cite")?"rgba(40,32,10,0.5)":"rgba(18,14,5,0.7)"}
        stroke={isSel("cite")?`${ac}55`:`${ac}20`} strokeWidth="1"
        onClick={()=>hit("cite")} style={{cursor:"pointer"}}/>
      <circle cx="396" cy="282" r="6" fill="none" stroke={`${ac}33`} strokeWidth="1" style={{pointerEvents:"none"}}/>

      {/* CHÂTEAU COMTAL */}
      <rect x="200" y="192" width="118" height="102" rx="2"
        fill={isSel("chateau")?"#3a2a0e":"#2c2208"}
        stroke={isSel("chateau")?`${ac}aa`:`${ac}66`} strokeWidth={isSel("chateau")?2:1.5}
        onClick={()=>hit("chateau")} style={{cursor:"pointer"}}/>
      <rect x="222" y="212" width="72" height="62" fill="#0d0b04" stroke="none"/>
      <rect x="224" y="214" width="32" height="26" fill={isSel("chateau")?"#1a1508":"#161006"}
        stroke={`${ac}18`} strokeWidth="0.5" style={{pointerEvents:"none"}}/>
      {[[200,192],[318,192],[200,294],[318,294]].map(([cx,cy],i)=>(
        <circle key={i} cx={cx} cy={cy} r="17"
          fill={isSel("chateau")?"#3a2a0e":"#2c2208"}
          stroke={isSel("chateau")?`${ac}aa`:`${ac}66`} strokeWidth={isSel("chateau")?2:1.5}
          onClick={()=>hit("chateau")} style={{cursor:"pointer"}}/>
      ))}
      <path d="M 318,215 Q 362,243 318,277" fill="none"
        stroke={isSel("chateau")?`${ac}99`:`${ac}55`} strokeWidth={isSel("chateau")?3:2}
        onClick={()=>hit("chateau")} style={{cursor:"pointer"}}/>
      <rect x="304" y="205" width="10" height="84"
        fill="rgba(22,44,70,0.65)" stroke="rgba(30,70,110,0.45)" strokeWidth="0.5" style={{pointerEvents:"none"}}/>

      {/* BASILIQUE SAINT-NAZAIRE */}
      <rect x="348" y="362" width="90" height="52"
        fill={isSel("saint_nazaire")?"#3a2a0e":"#2c2208"}
        stroke={isSel("saint_nazaire")?`${ac}aa`:`${ac}55`} strokeWidth={isSel("saint_nazaire")?2:1.5}
        onClick={()=>hit("saint_nazaire")} style={{cursor:"pointer"}}/>
      <rect x="362" y="374" width="62" height="28" fill="#0d0b04" stroke="none"/>
      <rect x="380" y="344" width="26" height="21"
        fill={isSel("saint_nazaire")?"#3a2a0e":"#2c2208"}
        stroke={isSel("saint_nazaire")?`${ac}aa`:`${ac}55`} strokeWidth={isSel("saint_nazaire")?2:1.5}
        onClick={()=>hit("saint_nazaire")} style={{cursor:"pointer"}}/>
      <rect x="388" y="351" width="12" height="12" fill="#0d0b04" stroke="none"/>
      <rect x="380" y="414" width="26" height="21"
        fill={isSel("saint_nazaire")?"#3a2a0e":"#2c2208"}
        stroke={isSel("saint_nazaire")?`${ac}aa`:`${ac}55`} strokeWidth={isSel("saint_nazaire")?2:1.5}
        onClick={()=>hit("saint_nazaire")} style={{cursor:"pointer"}}/>
      <rect x="388" y="416" width="12" height="12" fill="#0d0b04" stroke="none"/>
      <path d="M 438,365 Q 462,378 438,411" fill={isSel("saint_nazaire")?"#3a2a0e":"#2c2208"}
        stroke={isSel("saint_nazaire")?`${ac}aa`:`${ac}55`} strokeWidth={isSel("saint_nazaire")?2:1.5}
        onClick={()=>hit("saint_nazaire")} style={{cursor:"pointer"}}/>
      {[[348,362,14,22],[348,392,14,22]].map(([x,y,w,h],i)=>(
        <rect key={i} x={x} y={y} width={w} height={h}
          fill={isSel("saint_nazaire")?"#3a2a0e":"#2c2208"}
          stroke={isSel("saint_nazaire")?`${ac}aa`:`${ac}55`} strokeWidth={isSel("saint_nazaire")?2:1.5}
          onClick={()=>hit("saint_nazaire")} style={{cursor:"pointer"}}/>
      ))}

      {/* PORTE NARBONNAISE */}
      {[[648,272],[648,320]].map(([cx,cy],i)=>(
        <circle key={i} cx={cx} cy={cy} r="22"
          fill={isSel("porte_narbonnaise")?"#3a2a0e":"#2c2208"}
          stroke={isSel("porte_narbonnaise")?`${ac}cc`:`${ac}77`} strokeWidth="2"
          onClick={()=>hit("porte_narbonnaise")} style={{cursor:"pointer"}}/>
      ))}
      <rect x="641" y="283" width="26" height="28" fill="#0d0b04" stroke={`${ac}33`} strokeWidth="0.8" style={{pointerEvents:"none"}}/>
      <text x="688" y="300" fill={`${ac}77`} fontSize="7" fontFamily="'Cinzel',serif">PORTE</text>
      <text x="688" y="310" fill={`${ac}66`} fontSize="7" fontFamily="'Cinzel',serif">NARB.</text>

      {/* PORTE D'AUDE */}
      <rect x="144" y="284" width="26" height="40"
        fill={isSel("porte_aude")?"#3a2a0e":"#2c2208"}
        stroke={isSel("porte_aude")?`${ac}aa`:`${ac}55`} strokeWidth={isSel("porte_aude")?2:1.5}
        onClick={()=>hit("porte_aude")} style={{cursor:"pointer"}}/>
      <rect x="152" y="293" width="12" height="22" fill="#0d0b04" stroke="none"/>
      <text x="133" y="304" textAnchor="end" fill={`${ac}55`} fontSize="7" fontFamily="'Cinzel',serif">PORTE</text>
      <text x="133" y="314" textAnchor="end" fill={`${ac}44`} fontSize="7" fontFamily="'Cinzel',serif">D'AUDE</text>

      {/* Labels */}
      <text x="252" y="248" textAnchor="middle" fill={isSel("chateau")?ac:`${ac}88`} fontSize="8" fontFamily="'Cinzel',serif">CHÂTEAU</text>
      <text x="252" y="260" textAnchor="middle" fill={isSel("chateau")?ac:`${ac}77`} fontSize="8" fontFamily="'Cinzel',serif">COMTAL</text>
      <text x="400" y="396" textAnchor="middle" fill={isSel("saint_nazaire")?ac:`${ac}66`} fontSize="7" fontFamily="'Cinzel',serif">ST-NAZAIRE</text>
      <text x="172" y="448" fill={`${ac}33`} fontSize="7" fontFamily="serif" transform="rotate(-28,172,448)">LICES</text>
      <text x="596" y="452" fill={`${ac}33`} fontSize="7" fontFamily="serif" transform="rotate(22,596,452)">LICES</text>

      {/* Title */}
      <text x="400" y="22" textAnchor="middle" fill={`${ac}66`} fontSize="12" fontFamily="'Cinzel',serif" letterSpacing="3">CARCASSONNE</text>
      <text x="400" y="36" textAnchor="middle" fill={`${ac}33`} fontSize="8" fontFamily="serif" letterSpacing="1.5">DOPPELTER MAUERRING · 13. JAHRHUNDERT</text>
      <text x="765" y="32" textAnchor="middle" fill={`${ac}55`} fontSize="10" fontFamily="serif">N</text>
      <line x1="765" y1="36" x2="765" y2="52" stroke={`${ac}44`} strokeWidth="1"/>
      <line x1="761" y1="52" x2="765" y2="44" stroke={`${ac}44`} strokeWidth="1"/>
      <line x1="769" y1="52" x2="765" y2="44" stroke={`${ac}44`} strokeWidth="1"/>
      <line x1="680" y1="524" x2="780" y2="524" stroke={`${ac}44`} strokeWidth="1.5"/>
      <line x1="680" y1="519" x2="680" y2="529" stroke={`${ac}44`} strokeWidth="1"/>
      <line x1="780" y1="519" x2="780" y2="529" stroke={`${ac}44`} strokeWidth="1"/>
      <text x="730" y="537" textAnchor="middle" fill={`${ac}44`} fontSize="8" fontFamily="serif">≈200m</text>
    </svg>
  );
};

function CastleFloorPlanTab({castle}){
  const sel=castle;
  const [selEl,setSelEl]=useState(null);
  const plan=DETAILED_PLANS[sel.id];

  const infoPanel=(el)=>{
    if(!el)return(
      <div style={{padding:"16px",color:"#6a5a3a",fontFamily:"'Cinzel',serif",fontSize:"12px",textAlign:"center",letterSpacing:"0.5px"}}>
        <div style={{fontSize:"24px",marginBottom:"8px",opacity:0.4}}>🏰</div>
        Element anklicken<br/>für Details
      </div>
    );
    return(
      <div style={{padding:"14px",animation:"fadeIn 0.15s ease"}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px",paddingBottom:"8px",borderBottom:`1px solid ${sel.theme.accent}22`}}>
          <span style={{fontSize:"20px"}}>{el.icon||"🏛️"}</span>
          <div>
            <div style={{fontSize:"13px",fontWeight:"bold",color:"#f0e6cc",fontFamily:"'Cinzel',serif",lineHeight:1.2}}>{el.name}</div>
            {el.type&&<div style={{fontSize:"10px",color:sel.theme.accent,letterSpacing:"1px",marginTop:"2px"}}>{el.type}</div>}
          </div>
        </div>
        {el.desc&&<p style={{fontSize:"12px",color:"#c8b890",lineHeight:1.6,margin:"0 0 10px"}}>{el.desc}</p>}
        {el.stats&&<div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
          {el.stats.map((s,i)=>(
            <div key={i} style={{padding:"4px 8px",background:`${sel.theme.accent}12`,border:`1px solid ${sel.theme.accent}30`,borderRadius:"4px",fontSize:"10px",color:sel.theme.accent,fontFamily:"'Cinzel',serif"}}>{s}</div>
          ))}
        </div>}
        {el.weakness!=null&&<div style={{marginTop:"8px",padding:"6px 8px",background:"rgba(180,40,20,0.12)",border:"1px solid rgba(180,40,20,0.25)",borderRadius:"4px",fontSize:"11px",color:"#dd7755"}}>
          ⚠ Schwachstelle — Angriffswert {el.weakness}/10
        </div>}
      </div>
    );
  };

  return(
    <div style={{animation:"fadeIn 0.2s ease"}}>
      <div style={{display:"flex",gap:"14px",height:"calc(100vh - 220px)",minHeight:"520px"}}>
        {/* Main plan area */}
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:"8px",minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <span style={{fontSize:"11px",color:"#9a8a6a",fontFamily:"'Cinzel',serif",letterSpacing:"0.5px"}}>
              Mausrad · Zoomen &nbsp;|&nbsp; Ziehen · Verschieben &nbsp;|&nbsp; Klicken · Details
            </span>
            <button onClick={()=>setSelEl(null)}
              style={{marginLeft:"auto",padding:"4px 10px",fontSize:"10px",fontFamily:"'Cinzel',serif",
                background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",
                color:"#9a8a6a",borderRadius:"5px",cursor:"pointer"}}>Auswahl aufheben</button>
          </div>
          <PanZoomFloorPlan accent={sel.theme.accent} height={0} style={{flex:1}}>
            {plan
              ? plan({ac:sel.theme.accent,sel:selEl,onSel:setSelEl})
              : <GenericDetailedPlan castle={sel} ac={sel.theme.accent} sel={selEl} onSel={setSelEl}/>
            }
          </PanZoomFloorPlan>
        </div>
        {/* Side info panel */}
        <div style={{width:"220px",flexShrink:0,background:"rgba(8,6,3,0.95)",border:`1px solid ${sel.theme.accent}20`,borderRadius:"8px",overflow:"hidden",display:"flex",flexDirection:"column"}}>
          <div style={{padding:"8px 12px",borderBottom:`1px solid ${sel.theme.accent}18`,fontSize:"10px",color:sel.theme.accent,fontFamily:"'Cinzel',serif",letterSpacing:"2px"}}>ELEMENT</div>
          <div style={{flex:1,overflowY:"auto"}}>{infoPanel(selEl)}</div>
          <div style={{borderTop:`1px solid ${sel.theme.accent}15`,padding:"8px 12px"}}>
            <div style={{fontSize:"10px",color:"#6a5a3a",letterSpacing:"1px",marginBottom:"4px"}}>LEGENDE</div>
            {[{c:"#8888ff",l:"Türme"},{c:"#88ccff",l:"Tore"},{c:"#ffcc44",l:"Hauptgebäude"},{c:"#44bb88",l:"Höfe"},{c:"#cc4433",l:"Schwachstellen"}].map(lg=>(
              <div key={lg.l} style={{display:"flex",alignItems:"center",gap:"5px",marginBottom:"3px"}}>
                <div style={{width:"10px",height:"10px",borderRadius:"2px",background:lg.c,flexShrink:0}}/>
                <span style={{fontSize:"10px",color:"#9a8a68"}}>{lg.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Generic detailed plan (used when no DETAILED_PLANS entry exists)
function GenericDetailedPlan({castle,ac,sel,onSel}){
  const zones=castle.zones||[];
  const W=600,H=500;
  const cx=W/2,cy=H/2;
  const layers=Math.min(4,Math.ceil(zones.length/4));
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"100%",display:"block"}}>
      <defs>
        <radialGradient id="dp_bg" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#110d06"/>
          <stop offset="100%" stopColor="#060402"/>
        </radialGradient>
        <filter id="dp_glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <pattern id="dp_stone" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
          <rect width="30" height="30" fill="transparent"/>
          <rect x="1" y="1" width="13" height="13" fill={`${ac}06`} rx="1"/>
          <rect x="16" y="16" width="13" height="13" fill={`${ac}05`} rx="1"/>
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#dp_bg)"/>
      <rect width={W} height={H} fill="url(#dp_stone)" opacity="0.6"/>
      {/* Concentric curtain walls */}
      {[...Array(layers)].map((_,li)=>{
        const r=60+li*70;
        return<rect key={li} x={cx-r} y={cy-r} width={r*2} height={r*2} rx="8"
          fill="none" stroke={`${ac}${li===0?"55":"33"}`} strokeWidth={li===0?3:2}/>;
      })}
      {/* Zones */}
      {zones.map((z,i)=>{
        const angle=(i/zones.length)*Math.PI*2-Math.PI/2;
        const layer=Math.floor(i/(zones.length/layers));
        const r=80+layer*70;
        const zx=cx+Math.cos(angle)*r*0.6;
        const zy=cy+Math.sin(angle)*r*0.6;
        const isS=sel===z.id;
        return(
          <g key={z.id} onClick={()=>onSel(isS?null:{id:z.id,name:z.l,icon:"🏛️",type:"Zone",desc:z.d,weakness:z.a<=2?z.a:undefined,stats:[`Verteidigung ${z.a}/10`]})}
            style={{cursor:"pointer"}}>
            {isS&&<circle cx={zx} cy={zy} r="28" fill={`${z.c}22`} filter="url(#dp_glow)"/>}
            <circle cx={zx} cy={zy} r="22" fill={`${z.c}${isS?"30":"18"}`}
              stroke={`${z.c}${isS?"cc":"55"}`} strokeWidth={isS?2:1}/>
            <text x={zx} y={zy-2} textAnchor="middle" fill={isS?z.c:"#c8b890"}
              fontSize="9" fontFamily="'Cinzel',serif" fontWeight={isS?"bold":"normal"}>{z.l.slice(0,10)}</text>
            <text x={zx} y={zy+9} textAnchor="middle" fill={isS?"#dd6633":"#8a7a60"}
              fontSize="8">{z.a<=2?"⚠ Schwach":""}</text>
          </g>
        );
      })}
      {/* Center keep */}
      <rect x={cx-25} y={cy-25} width="50" height="50" rx="4"
        fill={`${ac}22`} stroke={`${ac}88`} strokeWidth="2.5"/>
      <text x={cx} y={cy+5} textAnchor="middle" fill={ac} fontSize="10" fontFamily="'Cinzel',serif" fontWeight="bold">KEEP</text>
      {/* Compass */}
      <g transform={`translate(${W-36},36)`}>
        <circle r="14" fill="rgba(0,0,0,0.5)" stroke={`${ac}40`} strokeWidth="1"/>
        {[["N",0,"#f0e6cc"],["S",180,"#c8b890"],["O",90,"#c8b890"],["W",270,"#c8b890"]].map(([l,a,c])=>{
          const rad=a*Math.PI/180;
          return<text key={l} x={Math.sin(rad)*9} y={-Math.cos(rad)*9+3.5}
            textAnchor="middle" fill={c} fontSize="7" fontFamily="'Cinzel',serif" fontWeight="bold">{l}</text>;
        })}
      </g>
    </svg>
  );
}

// ── Pan+Zoom Floor Plan Container ───────────────────────────────────────────
function PanZoomFloorPlan({children, accent, height=540, style={}}){
  const containerRef=useRef(null);
  const [tr,setTr]=useState({x:0,y:0,s:1});
  const drag=useRef(null);
  const didMove=useRef(false);

  const clampTr=(x,y,s,w,h)=>{
    const minX=w-w*s; const minY=h-h*s;
    return{x:Math.min(0,Math.max(minX,x)),y:Math.min(0,Math.max(minY,y)),s};
  };

  const onWheel=useCallback((e)=>{
    e.preventDefault();
    const rect=containerRef.current.getBoundingClientRect();
    const cx=e.clientX-rect.left; const cy=e.clientY-rect.top;
    const delta=e.deltaY<0?1.15:1/1.15;
    setTr(t=>{
      const ns=Math.min(8,Math.max(0.5,t.s*delta));
      const nx=cx-(cx-t.x)*(ns/t.s);
      const ny=cy-(cy-t.y)*(ns/t.s);
      return clampTr(nx,ny,ns,rect.width,rect.height);
    });
  },[]);

  useEffect(()=>{
    const el=containerRef.current;
    if(!el)return;
    el.addEventListener("wheel",onWheel,{passive:false});
    return()=>el.removeEventListener("wheel",onWheel);
  },[onWheel]);

  const onMouseDown=useCallback((e)=>{
    if(e.button!==0)return;
    drag.current={sx:e.clientX,sy:e.clientY,tx:tr.x,ty:tr.y};
    didMove.current=false;
    e.currentTarget.setPointerCapture(e.pointerId);
  },[tr]);

  const onMouseMove=useCallback((e)=>{
    if(!drag.current)return;
    const dx=e.clientX-drag.current.sx; const dy=e.clientY-drag.current.sy;
    if(!didMove.current&&(Math.abs(dx)>3||Math.abs(dy)>3))didMove.current=true;
    if(!didMove.current)return;
    const rect=containerRef.current.getBoundingClientRect();
    setTr(t=>clampTr(drag.current.tx+dx,drag.current.ty+dy,t.s,rect.width,rect.height));
  },[]);

  const onMouseUp=useCallback(()=>{drag.current=null;},[]);

  const onClickCapture=useCallback((e)=>{if(didMove.current)e.stopPropagation();},[]);

  const btnStyle=(extra={})=>({
    width:"30px",height:"30px",display:"flex",alignItems:"center",justifyContent:"center",
    background:"rgba(10,8,5,0.85)",border:`1px solid ${accent}40`,
    borderRadius:"6px",color:accent,cursor:"pointer",fontSize:"15px",
    fontFamily:"'Cinzel',serif",transition:"all 0.15s",userSelect:"none",...extra
  });

  return(
    <div ref={containerRef}
      style={{position:"relative",...(height>0?{height:`${height}px`}:{flex:1,minHeight:0}),
        background:"rgba(6,4,2,0.98)",border:`1px solid ${accent}28`,
        borderRadius:"10px",overflow:"hidden",
        boxShadow:`0 6px 32px rgba(0,0,0,0.75), inset 0 0 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.6)`,
        cursor:drag.current?"grabbing":"grab",...style}}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove}
      onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
      onClickCapture={onClickCapture}>
      <div style={{position:"absolute",top:0,left:0,
        transform:`translate(${tr.x}px,${tr.y}px) scale(${tr.s})`,
        transformOrigin:"0 0",width:"100%",height:"100%"}}>
        {children}
      </div>
      {/* Controls overlay */}
      <div style={{position:"absolute",bottom:"12px",right:"12px",
        display:"flex",flexDirection:"column",gap:"5px",zIndex:10}}>
        <button style={btnStyle()} title="Zoom in"
          onMouseDown={e=>e.stopPropagation()}
          onClick={()=>setTr(t=>{const ns=Math.min(8,t.s*1.3);const rect=containerRef.current.getBoundingClientRect();return clampTr(rect.width/2-(rect.width/2-t.x)*(ns/t.s),rect.height/2-(rect.height/2-t.y)*(ns/t.s),ns,rect.width,rect.height);})}>+</button>
        <button style={btnStyle()} title="Zoom out"
          onMouseDown={e=>e.stopPropagation()}
          onClick={()=>setTr(t=>{const ns=Math.max(0.5,t.s/1.3);const rect=containerRef.current.getBoundingClientRect();return clampTr(rect.width/2-(rect.width/2-t.x)*(ns/t.s),rect.height/2-(rect.height/2-t.y)*(ns/t.s),ns,rect.width,rect.height);})}>−</button>
        <button style={btnStyle()} title="Reset"
          onMouseDown={e=>e.stopPropagation()}
          onClick={()=>setTr({x:0,y:0,s:1})}>↺</button>
        <div style={{textAlign:"center",fontSize:"9px",color:accent,fontFamily:"'Cinzel',serif",
          background:"rgba(10,8,5,0.85)",border:`1px solid ${accent}30`,borderRadius:"5px",
          padding:"3px 4px",lineHeight:1}}>{Math.round(tr.s*100)}%</div>
      </div>
    </div>
  );
}

// ── Castle Map Tab ──────────────────────────────────────────────────────────
function CastleMapTab({castle}){
  const sel=castle;
  return(
                  <div style={{animation:"fadeIn 0.2s ease"}}>
                    {(
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
                        {/* Location info */}
                        <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                          {/* Header */}
                          <div style={{padding:"14px 16px",
                            background:`linear-gradient(135deg,${sel.theme.bg},rgba(8,5,2,0.98))`,
                            border:`1px solid ${sel.theme.accent}22`,
                            borderLeft:`4px solid ${sel.theme.accent}`,
                            borderRadius:"6px"}}>
                            <div style={{fontSize:"10px",color:sel.theme.accent,letterSpacing:"2px",marginBottom:"6px"}}>📍 HISTORISCHE LAGE</div>
                            <div style={{fontSize:"16px",fontWeight:"bold",color:"#f0e6cc",marginBottom:"2px"}}>{sel.name}</div>
                            <div style={{fontSize:"13px",color:sel.theme.accent,marginBottom:"4px"}}>{sel.sub}</div>
                            <div style={{fontSize:"12px",color:"#7a6a48"}}>{sel.loc}</div>
                            <div style={{fontSize:"12px",color:"#9a8a6a",marginTop:"2px"}}>{sel.era} · {sel.epoch}</div>
                          </div>

                          {/* Strategic significance — terrain based */}
                          <div style={{padding:"12px 14px",background:"rgba(0,0,0,0.2)",
                            border:"1px solid rgba(255,255,255,0.05)",borderRadius:"5px"}}>
                            <div style={{fontSize:"11px",color:sel.theme.accent,letterSpacing:"2px",marginBottom:"8px"}}>⛰️ STRATEGISCHE LAGE</div>
                            <div style={{fontSize:"13px",color:"#90a2cc",lineHeight:1.85}}>
                              {getTerrainDesc(sel)}
                            </div>
                          </div>

                          {/* Position rating */}
                          <div style={{padding:"10px 14px",background:"rgba(0,0,0,0.15)",
                            border:"1px solid rgba(255,255,255,0.04)",borderRadius:"5px"}}>
                            <div style={{fontSize:"11px",color:"#5a4a28",letterSpacing:"2px",marginBottom:"8px"}}>LAGEBEWERTUNG</div>
                            {[
                              {l:"Geländeposition",v:sel.ratings.position,i:"⛰️"},
                              {l:"Sichtlinie",v:Math.min(100,sel.ratings.position+5),i:"👁️"},
                              {l:"Zugänglichkeit",v:100-sel.ratings.position,i:"🚶",inv:true},
                              {l:"Versorgung",v:sel.ratings.supply,i:"🍖"},
                            ].map(s=>(
                              <div key={s.l} style={{marginBottom:"7px"}}>
                                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
                                  <span style={{fontSize:"11px",color:"#9a8a6a"}}>{s.i} {s.l}</span>
                                  <span style={{fontSize:"11px",fontWeight:"bold",color:s.inv?rCol(100-s.v):rCol(s.v)}}>{s.v}</span>
                                </div>
                                <div style={{height:"4px",background:"rgba(255,255,255,0.04)",borderRadius:"2px",overflow:"hidden"}}>
                                  <div style={{height:"100%",width:`${s.v}%`,
                                    background:s.inv?rCol(100-s.v):rCol(s.v),
                                    borderRadius:"2px",transition:"width 0.6s ease"}}/>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Nearby castles */}
                          {(()=>{
                            const gSel=GEO[sel.id];
                            if(!gSel)return null;
                            const nearby=CASTLES.filter(c=>c.id!==sel.id&&GEO[c.id]).map(c=>{
                              const g=GEO[c.id];
                              const dx=g.x-gSel.x,dy=g.y-gSel.y;
                              return{...c,dist:Math.round(Math.sqrt(dx*dx+dy*dy))};
                            }).sort((a,b)=>a.dist-b.dist).slice(0,4);
                            return(
                              <div style={{padding:"10px 14px",background:"rgba(0,0,0,0.15)",
                                border:"1px solid rgba(255,255,255,0.04)",borderRadius:"5px"}}>
                                <div style={{fontSize:"11px",color:"#5a4a28",letterSpacing:"2px",marginBottom:"8px"}}>📍 BENACHBARTE FESTUNGEN</div>
                                {nearby.map(c=>(
                                  <div key={c.id} style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:"5px"}}>
                                    <span style={{fontSize:"14px"}}>{c.icon}</span>
                                    <div style={{flex:1}}>
                                      <div style={{fontSize:"12px",color:"#8a7a50"}}>{c.name}</div>
                                      <div style={{fontSize:"10px",color:"#8a7860"}}>{c.loc}</div>
                                    </div>
                                    <div style={{fontSize:"11px",color:rCol(avg(c)),fontFamily:"monospace"}}>{avg(c)}</div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Right: mini leaflet map focused on castle */}
                        <div>
                          <div style={{fontSize:"11px",color:"#5a4a28",letterSpacing:"2px",marginBottom:"8px"}}>
                            🌍 POSITION AUF DER WELTKARTE
                          </div>
                          {GEO[sel.id]?(()=>{
                            const g=GEO[sel.id];
                            const lon=(g.x/1000*360)-180;
                            const lat=90-(g.y/500*180);
                            return(
                              <div style={{borderRadius:"8px",overflow:"hidden",
                                border:`1px solid ${sel.theme.accent}18`,
                                boxShadow:"0 4px 20px rgba(0,0,0,0.5)"}}>
                                <style>{`.leaflet-container{background:#040c18}`}</style>
                                <MiniLeafletMap key={sel.id} lat={lat} lon={lon} castle={sel}/>
                              </div>
                            );
                          })():(
                            <div style={{padding:"40px",textAlign:"center",color:"#8a7860",fontSize:"12px",
                              background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"8px"}}>
                              Keine Kartendaten verfügbar
                            </div>
                          )}
                          {/* Coordinates */}
                          {GEO[sel.id]&&(
                            <div style={{marginTop:"8px",padding:"7px 12px",
                              background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",
                              borderRadius:"4px",fontSize:"11px",color:"#8a7860",fontFamily:"monospace"}}>
                              {(()=>{const g=GEO[sel.id];const lon=((g.x/1000*360)-180).toFixed(2);const lat=(90-(g.y/500*180)).toFixed(2);return`${lat}°N ${lon}°E · ${sel.loc}`;})()}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
  );
}


function BattleMap({castle,interactive}){
  const [selZone,setSelZone]=useState(null);
  const ac=castle.theme.accent;
  const selZ=castle.zones.find(z=>z.id===selZone);

  const PlanComp=CASTLE_PLANS[castle.id];

  return(
    <div>
      <div style={{position:"relative",
        background:`linear-gradient(145deg,${castle.theme.bg} 0%,rgba(4,3,2,0.97) 100%)`,
        border:`1px solid ${ac}22`,borderRadius:"6px",overflow:"hidden",
        boxShadow:`0 6px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.03)`}}>
        <svg viewBox="0 0 220 200" style={{width:"100%",display:"block",cursor:"default"}}>
          <defs>
            <pattern id={`grid${castle.id}`} width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke={`${ac}07`} strokeWidth="0.3"/>
            </pattern>
            <radialGradient id={`vignette${castle.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="60%" stopColor="transparent"/>
              <stop offset="100%" stopColor="rgba(2,1,0,0.6)"/>
            </radialGradient>
          </defs>
          {/* Tactical grid background */}
          <rect width="220" height="200" fill={`url(#grid${castle.id})`}/>
          {/* Vignette */}
          <rect width="220" height="200" fill={`url(#vignette${castle.id})`}/>

          {/* Render the specific plan or generic fallback */}
          {PlanComp
            ? <PlanComp ac={ac} sel={selZone} onZone={setSelZone}/>
            : <GenericCastlePlan castle={castle} ac={ac} sel={selZone} onZone={setSelZone}/>
          }

          {/* Interaction prompt if no zone selected */}
          {!selZone&&<text x="110" y="6" textAnchor="middle" fill={`${ac}44`} fontSize="8" fontFamily="serif">
            Bereiche anklicken für Details
          </text>}
        </svg>
      </div>

      {/* Zone info panel */}
      {selZ&&(
        <div style={{marginTop:"10px",padding:"12px 14px",
          background:`linear-gradient(135deg,${castle.theme.bg} 0%,rgba(12,9,4,0.98) 100%)`,
          border:`1px solid ${selZ.c}55`,borderLeft:`4px solid ${selZ.c}`,
          borderRadius:"5px",
          boxShadow:`0 3px 14px rgba(0,0,0,0.5), 0 0 10px ${selZ.c}12`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"6px"}}>
            <div>
              <div style={{fontSize:"13px",fontWeight:"bold",color:"#f0e0c0",letterSpacing:"0.3px"}}>{selZ.l.replace(" ⚠","").replace(" ⚠⚠","")}</div>
              {selZ.l.includes("⚠")&&<div style={{fontSize:"13px",color:"#cc4422",marginTop:"1px",letterSpacing:"1px"}}>⚠ SCHWACHSTELLE</div>}
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"2px"}}>
              <div style={{fontSize:"12px",color:"#9a8a68",letterSpacing:"1px"}}>RÜSTUNG</div>
              <div style={{display:"flex",gap:"2px"}}>
                {Array.from({length:10},(_,i)=>(
                  <div key={i} style={{width:"7px",height:"7px",borderRadius:"1px",
                    background:i<selZ.a?rCol(selZ.a*10):"rgba(255,255,255,0.04)",
                    boxShadow:i<selZ.a?`0 0 3px ${rCol(selZ.a*10)}55`:""}}/>
                ))}
              </div>
            </div>
          </div>
          <div style={{fontSize:"14px",color:"#6a5a3a",lineHeight:1.8}}>{selZ.d}</div>
          <button onClick={()=>setSelZone(null)}
            style={{marginTop:"7px",fontSize:"12px",color:"#b09a70",background:"transparent",
              border:"1px solid rgba(255,255,255,0.06)",borderRadius:"3px",padding:"3px 8px",cursor:"pointer"}}>
            ✕ Schließen
          </button>
        </div>
      )}

      {/* Zone legend */}
      <div style={{marginTop:"8px",display:"flex",flexWrap:"wrap",gap:"5px"}}>
        {castle.zones.map(z=>(
          <button key={z.id} onClick={()=>setSelZone(selZone===z.id?null:z.id)}
            style={{padding:"3px 8px",fontSize:"12px",
              background:selZone===z.id?`${z.c}22`:"rgba(255,255,255,0.02)",
              border:`1px solid ${selZone===z.id?z.c+"66":"rgba(255,255,255,0.06)"}`,
              color:selZone===z.id?z.c:"#3a2a14",
              borderRadius:"3px",cursor:"pointer",transition:"all .12s",
              display:"flex",gap:"4px",alignItems:"center"}}>
            {z.l.includes("⚠")&&<span style={{color:"#cc4422",fontSize:"11px"}}>⚠</span>}
            {z.l.replace(" ⚠","").replace(" ⚠⚠","")}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── WorldMap ───────────────────────────────────────────────────────────────
// Precise lat/lon → SVG coordinates for the real-world map
// SVG viewBox="0 0 1000 500" — Mercator-ish projection
// lon: -180..180 → x: 0..1000  |  lat: 85..-85 → y: 0..500
// ── World Maps ──────────────────────────────────────────────────────────────
// Coordinate system: SVG 1000x500, simple equirectangular projection
// x = (lon + 180) / 360 * 1000
// y = (90 - lat) / 180 * 500

function lonlatToXY(lon, lat, label) {
  return { x: Math.round((lon + 180) / 360 * 1000), y: Math.round((90 - lat) / 180 * 500), label: label||"" };
}

// Historical castle positions (real lat/lon)
const GEO = {
  carcassonne:     lonlatToXY(  2.35, 43.21, "Carcassonne"),
  chateau_gaillard:lonlatToXY(  1.41, 49.24, "Ch. Gaillard"),
  coucy:           lonlatToXY(  3.32, 49.52, "Coucy"),
  mont_michel:     lonlatToXY( -1.51, 48.64, "Mont S-Michel"),
  harlech:         lonlatToXY( -4.11, 52.86, "Harlech"),
  caernarvon:      lonlatToXY( -4.28, 53.14, "Caernarvon"),
  windsor:         lonlatToXY( -0.61, 51.48, "Windsor"),
  bodiam:          lonlatToXY(  0.54, 51.00, "Bodiam"),
  alhambra:        lonlatToXY( -3.59, 37.18, "Alhambra"),
  constantinople:  lonlatToXY( 28.98, 41.01, "Konstantinopel"),
  rhodes:          lonlatToXY( 28.22, 36.44, "Rhodos"),
  krak:            lonlatToXY( 36.26, 34.76, "Krak"),
  akkon:           lonlatToXY( 35.07, 32.92, "Akkon"),
  masada:          lonlatToXY( 35.35, 31.32, "Masada"),
  babylon:         lonlatToXY( 44.42, 32.54, "Babylon"),
  persepolis:      lonlatToXY( 52.89, 29.93, "Persepolis"),
  alamut:          lonlatToXY( 50.57, 36.45, "Alamut"),
  mehrangarh:      lonlatToXY( 73.02, 26.30, "Mehrangarh"),
  great_wall:      lonlatToXY(116.57, 40.68, "Große Mauer"),
  himeji:          lonlatToXY(134.69, 34.84, "Himeji"),
  angkor:          lonlatToXY(103.87, 13.41, "Angkor"),
  // Batch 2 — neue historische Burgen
  dover:           lonlatToXY(  1.32, 51.12, "Dover"),
  caerphilly:      lonlatToXY( -3.22, 51.57, "Caerphilly"),
  kenilworth:      lonlatToXY( -1.59, 52.34, "Kenilworth"),
  chateau_de_gisors:lonlatToXY(1.78, 49.28, "Gisors"),
  beaumaris:       lonlatToXY( -4.09, 53.26, "Beaumaris"),
  san_leo:         lonlatToXY( 12.35, 43.89, "San Leo"),
  knossos:         lonlatToXY( 25.16, 35.30, "Knossos"),
  malbork:         lonlatToXY( 19.03, 53.90, "Malbork"),
  rohtas:          lonlatToXY( 73.47, 32.97, "Rohtas"),
  nimrod:          lonlatToXY( 35.71, 33.25, "Nimrod"),
  // Persönliche Burg
  schwarzer_bergfried: lonlatToXY(10.50, 47.80, "Schwarzer Bergfried"),
  castle_sorrow:       lonlatToXY(10.80, 47.65, "Burgfeste Drachenstein"),
  gravecrest:          lonlatToXY(10.25, 47.92, "Gravecrest"),
  // Batch 3
  kerak:               lonlatToXY(35.70, 31.18, "Kerak"),
  sigiriya:            lonlatToXY(80.76, 7.96,  "Sigiriya"),
  pierre_fonds:        lonlatToXY( 2.98, 49.35, "Pierrefonds"),
  great_zimbabwe:      lonlatToXY(30.93,-20.27, "Gr. Zimbabwe"),
  hochosterwitz:       lonlatToXY(14.46, 46.79, "Hochosterwitz"),
  red_fort:            lonlatToXY(77.24, 28.66, "Rotes Fort"),
  cachtice:            lonlatToXY(17.78, 48.72, "Čachtice"),
  conwy:               lonlatToXY(-3.83, 53.28, "Conwy"),
  // Batch 4 — neue Regionen
  osaka:               lonlatToXY(135.52, 34.69, "Osaka"),
  kumamoto:            lonlatToXY(130.70, 32.80, "Kumamoto"),
  sacsayhuaman:        lonlatToXY(-71.98,-13.51, "Sacsayhuamán"),
  chichen_itza:        lonlatToXY(-88.57, 20.68, "Chichén Itzá"),
  great_enclosure:     lonlatToXY(30.93,-20.27,  "Gr. Gehege"),
  mehmed_topkapi:      lonlatToXY(28.98, 41.01,  "Topkapi"),
  jaisalmer:           lonlatToXY(70.91, 26.92,  "Jaisalmer"),
  elmina:              lonlatToXY(-1.35,  5.08,  "Elmina"),
  chittorgarh:         lonlatToXY(74.64, 24.89,  "Chittorgarh"),
  ksar_of_ait:         lonlatToXY(-6.99, 31.05,  "Aït-Ben-Haddou"),
  // Batch 5 — Amerika, Südostasien, Japan
  tenochtitlan:        lonlatToXY(-99.13, 19.43,  "Tenochtitlán"),
  chan_chan:            lonlatToXY(-79.09,-8.11,   "Chan Chan"),
  caral:               lonlatToXY(-77.52,-10.89,  "Caral-Supe"),
  kuelap:              lonlatToXY(-77.92,-6.42,   "Kuélap"),
  mont_albán:          lonlatToXY(-96.76, 17.04,  "Monte Albán"),
  pagan:               lonlatToXY(94.86, 21.17,   "Bagan"),
  angkor_thom:         lonlatToXY(103.86, 13.44,  "Angkor Thom"),
  preah_vihear:        lonlatToXY(104.68, 14.39,  "Preah Vihear"),
  borobudur_fort:      lonlatToXY(110.36,-7.80,   "Yogyakarta"),
  sigiriya_lion:       lonlatToXY(80.76,  7.96,   "Pidurangala"),
  osaka_nijo:          lonlatToXY(135.75, 35.01,  "Nijō-jō"),
  matsumoto:           lonlatToXY(137.98, 36.23,  "Matsumoto"),
  // Batch 6 — fehlende Burgen
  stirling:            lonlatToXY( -3.95, 56.12,  "Stirling"),
  bamburgh:            lonlatToXY( -1.71, 55.61,  "Bamburgh"),
  trim:                lonlatToXY( -6.79, 53.56,  "Trim"),
  conwy_castle:        lonlatToXY( -3.83, 53.28,  "Conwy Castle"),
  peyrepertuse:        lonlatToXY(  2.83, 42.91,  "Peyrepertuse"),
  hohensalzburg:       lonlatToXY( 13.05, 47.80,  "Hohensalzburg"),
  samarkand:           lonlatToXY( 66.98, 39.65,  "Samarkand"),
  bagdad:              lonlatToXY( 44.39, 33.34,  "Rundes Bagdad"),
  citadel_aleppo:      lonlatToXY( 37.16, 36.20,  "Zitadelle Aleppo"),
  shobak:              lonlatToXY( 35.57, 30.53,  "Shobak"),
  nimrod_fortress:     lonlatToXY( 35.70, 33.26,  "Nimrod-Festung"),
  derbent:             lonlatToXY( 48.29, 42.05,  "Derbent"),
  carthage_byrsa:      lonlatToXY( 10.32, 36.85,  "Karthago"),
  gao_songhai:         lonlatToXY( -0.04, 16.27,  "Gao"),
  bala_hisar:          lonlatToXY( 69.18, 34.52,  "Bala Hissar"),
  mehrangarh_v2:       lonlatToXY( 74.64, 24.89,  "Chittorgarh"),
};

// Fantasy positions on a 600×400 canvas (fictional)
const ME_GEO = {
  // Mittelerde
  angband:     {x: 88, y: 48,  label:"Angband"},
  gondolin:    {x:140, y: 72,  label:"Gondolin"},
  erebor:      {x:244, y: 60,  label:"Erebor"},
  khazad_dum:  {x:168, y:108,  label:"Moria"},
  isengard:    {x:148, y:162,  label:"Isengard"},
  edoras:      {x:168, y:178,  label:"Edoras"},
  helmsdeep:   {x:152, y:188,  label:"Helms Klamm"},
  minas_tirith:{x:196, y:200,  label:"Minas Tirith"},
  minas_morgul:{x:212, y:210,  label:"M. Morgul"},
  barad_dur:   {x:228, y:206,  label:"Barad-dûr"},
  // Westeros (right half)
  winterfell:  {x:430, y: 72,  label:"Winterfell"},
  harrenhal:   {x:444, y:148,  label:"Harrenhal"},
  kings_landing:{x:456,y:168,  label:"Königsmund"},
  // Neue Westeros-Burgen
  dreadfort:   {x:438, y: 98,  label:"Dreadfort"},
  storms_end:  {x:460, y:200,  label:"Sturmkap"},
  casterly_rock:{x:388,y:188,  label:"Casterly Rock"},
  // Neue Mittelerde-Burgen
  dol_guldur:  {x:285, y:128,  label:"Dol Guldur"},
  minas_anor:  {x:215, y:188,  label:"Amon Anwar"},
  orthanc:     {x:152, y:163,  label:"Orthanc"},
  black_gate:  {x:255, y:195,  label:"Morannon"},
};

// ── World Maps ─────────────────────────────────────────────────────────────
// Leaflet.js approach — real map tiles, perfect coordinates
// Loaded dynamically to avoid bundle size issues

function RealWorldMap({castles,onSelect,selected}){
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef({});
  const real = castles.filter(c=>c.type==="real"&&GEO[c.id]);

  useEffect(()=>{
    // Load Leaflet CSS + JS dynamically
    if(!document.getElementById('leaflet-css')){
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(link);
    }
    if(window.L){
      initMap();
      return;
    }
    if(document.getElementById('leaflet-js')){
      const t=setInterval(()=>{if(window.L){clearInterval(t);initMap();}},100);
      return()=>clearInterval(t);
    }
    const script = document.createElement('script');
    script.id = 'leaflet-js';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    script.onload = initMap;
    document.head.appendChild(script);

    return ()=>{
      if(leafletMap.current){ leafletMap.current.remove(); leafletMap.current=null; }
    };
  },[]);

  function initMap(){
    if(!mapRef.current || leafletMap.current) return;
    const L = window.L;

    const map = L.map(mapRef.current, {
      center: [30, 30],
      zoom: 3,
      minZoom: 2,
      maxZoom: 10,
      zoomControl: false,
      worldCopyJump: false,
      maxBounds: [[-90, -180], [90, 180]],
      maxBoundsViscosity: 1.0,
    });

    // Dark tile layer (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
      noWrap: true,
      bounds: [[-90, -180], [90, 180]],
    }).addTo(map);

    // Add zoom control top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Historical connection lines between related castles
    const CONNECTIONS = [
      // Crusader network
      {from:"krak",     to:"akkon",     color:"rgba(201,168,76,0.3)",  label:"Kreuzfahrerroute"},
      {from:"akkon",    to:"masada",    color:"rgba(201,168,76,0.2)",  label:"Heiliges Land"},
      {from:"krak",     to:"constantinople", color:"rgba(201,168,76,0.2)", label:"Byzantinische Verbindung"},
      // English castle ring
      {from:"dover",    to:"bodiam",    color:"rgba(100,150,220,0.3)", label:"Ring of Iron"},
      {from:"harlech",  to:"caernarvon",color:"rgba(100,150,220,0.3)", label:"Walisischer Ring"},
      {from:"caernarvon",to:"beaumaris",color:"rgba(100,150,220,0.25)",label:"Edwards Burgen"},
      // French/Norman network
      {from:"carcassonne",to:"chateau_gaillard",color:"rgba(180,120,50,0.25)",label:"Normannisch"},
      {from:"chateau_gaillard",to:"coucy",color:"rgba(180,120,50,0.2)",label:"Nordfrankreich"},
      {from:"coucy",    to:"chateau_de_gisors",color:"rgba(180,120,50,0.2)",label:"Normandie"},
      // Silk Road / Eastern
      {from:"alamut",   to:"babylon",   color:"rgba(100,180,100,0.2)", label:"Seidenstraße"},
      {from:"babylon",  to:"persepolis",color:"rgba(100,180,100,0.2)", label:"Persisches Reich"},
      // Sorrowland Order
      {from:"schwarzer_bergfried",to:"castle_sorrow",color:"rgba(138,138,154,0.5)",label:"Ordo Custodum"},
      {from:"castle_sorrow",to:"gravecrest",color:"rgba(138,138,154,0.5)",label:"Ordo Custodum"},
      {from:"schwarzer_bergfried",to:"gravecrest",color:"rgba(138,138,154,0.35)",label:"Signalfeuer"},
    ];

    CONNECTIONS.forEach(({from,to,color,label})=>{
      const g1=GEO[from], g2=GEO[to];
      if(!g1||!g2) return;
      const lat1=90-(g1.y/500*180), lon1=(g1.x/1000*360)-180;
      const lat2=90-(g2.y/500*180), lon2=(g2.x/1000*360)-180;
      L.polyline([[lat1,lon1],[lat2,lon2]], {
        color, weight:1.5, opacity:0.8, dashArray:'6,5',
      }).addTo(map).bindTooltip(`<div style="background:rgba(8,5,2,0.95);border:1px solid rgba(201,168,76,0.3);color:#c9a84c;padding:3px 7px;border-radius:3px;font-size:11px;font-family:Georgia,serif">${label}</div>`, {
        className:'custom-tooltip', opacity:1,
      });
    });

    // Add markers for each castle
    real.forEach(c=>{
      const g = GEO[c.id];
      const isSelected = selected?.id === c.id;
      const color = c.theme.accent || '#c9a84c';

      const icon = L.divIcon({
        html: `<div style="
          width:${isSelected?16:12}px;
          height:${isSelected?16:12}px;
          background:${color};
          border-radius:50%;
          border:${isSelected?'2px solid white':'1.5px solid rgba(0,0,0,0.5)'};
          box-shadow:0 0 ${isSelected?10:6}px ${color};
          cursor:pointer;
          transition:all .15s;
        "></div>`,
        className: '',
        iconSize: [isSelected?16:12, isSelected?16:12],
        iconAnchor: [isSelected?8:6, isSelected?8:6],
      });

      // Convert x,y back to lat/lon for Leaflet
      const lon = (g.x / 1000 * 360) - 180;
      const lat = 90 - (g.y / 500 * 180);

      const marker = L.marker([lat, lon], {icon})
        .addTo(map)
        .bindTooltip(`<div style="
          background:rgba(10,7,3,0.95);
          border:1px solid ${color};
          border-left:3px solid ${color};
          color:${color};
          padding:6px 10px;
          border-radius:4px;
          font-family:Georgia,serif;
          font-size:13px;
          font-weight:bold;
          white-space:nowrap;
        ">${c.icon} ${c.name}<br><span style="color:#8a7a58;font-size:11px;font-weight:normal">${c.loc} · ${c.era}</span></div>`, {
          className: 'custom-tooltip',
          offset: [8, 0],
          opacity: 1,
        })
        .on('click', ()=>onSelect(c));

      markersRef.current[c.id] = marker;
    });

    leafletMap.current = map;
  }

  // Update markers when selection changes
  useEffect(()=>{
    const L = window.L;
    if(!L || !leafletMap.current) return;
    real.forEach(c=>{
      const marker = markersRef.current[c.id];
      if(!marker) return;
      const isSelected = selected?.id === c.id;
      const color = c.theme.accent || '#c9a84c';
      const icon = L.divIcon({
        html: `<div style="
          width:${isSelected?18:12}px;height:${isSelected?18:12}px;
          background:${color};border-radius:50%;
          border:${isSelected?'2.5px solid white':'1.5px solid rgba(0,0,0,0.5)'};
          box-shadow:0 0 ${isSelected?14:6}px ${color};
          cursor:pointer;
        "></div>`,
        className:'',
        iconSize:[isSelected?18:12,isSelected?18:12],
        iconAnchor:[isSelected?9:6,isSelected?9:6],
      });
      marker.setIcon(icon);
    });
  },[selected]);

  // Show/hide markers based on epoch filter (castles prop changes)
  useEffect(()=>{
    if(!leafletMap.current) return;
    const visibleIds=new Set(real.map(c=>c.id));
    Object.entries(markersRef.current).forEach(([id,marker])=>{
      if(!marker) return;
      if(visibleIds.has(id)){
        if(!leafletMap.current.hasLayer(marker)) marker.addTo(leafletMap.current);
      } else {
        if(leafletMap.current.hasLayer(marker)) leafletMap.current.removeLayer(marker);
      }
    });
  },[castles]); // re-runs when filtered castles list changes

  return(
    <div style={{position:"relative",borderRadius:"8px",overflow:"hidden",
      border:"1px solid rgba(201,168,76,0.15)",
      boxShadow:"0 4px 32px rgba(0,0,0,0.6)"}}>
      <style>{`
        .custom-tooltip { background:transparent!important; border:none!important; box-shadow:none!important; }
        .leaflet-tooltip { background:transparent; border:none; }
        .leaflet-container { background:#040c18; }
        .leaflet-control-attribution { display:none; }
        .leaflet-bar a { background:rgba(20,15,8,0.9)!important; color:#c9a84c!important; border-color:rgba(201,168,76,0.2)!important; }
        .leaflet-bar a:hover { background:rgba(40,30,10,0.95)!important; }
      `}</style>
      <div ref={mapRef} style={{height:"420px",width:"100%"}}/>
      <div style={{position:"absolute",bottom:"8px",left:"8px",
        background:"rgba(5,3,1,0.85)",border:"1px solid rgba(255,255,255,0.06)",
        borderRadius:"4px",padding:"5px 10px",fontSize:"11px",color:"#8a7a58",
        pointerEvents:"none"}}>
        🖱 Scrollen = Zoom · Ziehen = Pan · Klicken = Burg öffnen
      </div>
    </div>
  );
}

function FantasyMap({castles,onSelect,selected}){
  const [hov,setHov]=useState(null);
  const fantasy=castles.filter(c=>c.type==="fantasy"&&ME_GEO[c.id]);
  const selC=selected?.type==="fantasy"?selected:null;

  return(
    <div style={{position:"relative",background:"rgba(0,0,0,0.3)",borderRadius:"8px",
      border:"1px solid rgba(100,60,180,0.2)",overflow:"hidden",
      boxShadow:"0 4px 32px rgba(0,0,0,0.5)"}}>
      <svg viewBox="0 0 600 400" style={{width:"100%",display:"block"}}>
        <defs>
          <radialGradient id="me_bg2" cx="40%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#0e0818"/>
            <stop offset="100%" stopColor="#05030e"/>
          </radialGradient>
          <filter id="me_glow2">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        <rect width="600" height="400" fill="url(#me_bg2)"/>

        {/* Subtle grid */}
        {[80,160,240,320].flatMap(v=>[
          <line key={`gx${v}`} x1={v} y1="0" x2={v} y2="400" stroke="rgba(100,60,180,0.05)" strokeWidth="0.5"/>,
          <line key={`gy${v}`} x1="0" y1={v} x2="600" y2={v} stroke="rgba(100,60,180,0.05)" strokeWidth="0.5"/>
        ])}

        {/* Divider */}
        <line x1="375" y1="0" x2="375" y2="400" stroke="rgba(100,60,180,0.18)" strokeWidth="1" strokeDasharray="8,5"/>

        {/* Section headers */}
        <text x="188" y="20" textAnchor="middle" fill="rgba(150,100,220,0.38)" fontSize="12"
          fontFamily="'Palatino Linotype',Georgia,serif" letterSpacing="2">✦ MITTELERDE</text>
        <text x="490" y="20" textAnchor="middle" fill="rgba(100,140,200,0.38)" fontSize="12"
          fontFamily="'Palatino Linotype',Georgia,serif" letterSpacing="2">❄ WESTEROS</text>

        {/* MITTELERDE terrain */}
        {[[70,55],[108,42],[148,50]].map(([x,y],i)=>(
          <polygon key={i} points={`${x},${y} ${x-22},${y+55} ${x+22},${y+55}`}
            fill="rgba(52,38,65,0.65)" stroke="rgba(72,52,88,0.45)" strokeWidth="0.8"/>
        ))}
        {[[55,80],[80,68],[105,75],[130,80]].map(([x,y],i)=>(
          <polygon key={i} points={`${x},${y} ${x-14},${y+40} ${x+14},${y+40}`}
            fill="rgba(45,36,58,0.6)" stroke="rgba(62,50,78,0.38)" strokeWidth="0.7"/>
        ))}
        {[[188,92],[200,105],[210,120],[218,138],[224,158],[228,178]].map(([x,y],i)=>(
          <polygon key={i} points={`${x},${y} ${x-11},${y+32} ${x+11},${y+32}`}
            fill="rgba(45,38,58,0.58)" stroke="rgba(62,52,78,0.35)" strokeWidth="0.7"/>
        ))}
        {[[148,230],[168,222],[190,218],[212,215],[235,218],[258,222],[278,228]].map(([x,y],i)=>(
          <polygon key={i} points={`${x},${y} ${x-10},${y+28} ${x+10},${y+28}`}
            fill="rgba(45,38,58,0.52)" stroke="rgba(62,52,78,0.3)" strokeWidth="0.6"/>
        ))}
        <path d="M 0 0 L 48 0 L 40 400 L 0 400 Z" fill="rgba(10,20,50,0.55)"/>
        <text x="24" y="200" textAnchor="middle" fill="rgba(40,80,150,0.28)" fontSize="9" fontFamily="serif" transform="rotate(-90 24 200)">BELEGAR</text>
        <path d="M 228 205 L 295 200 L 330 210 L 338 235 L 328 262 L 295 272 L 255 268 L 228 255 L 218 232 Z"
          fill="rgba(38,12,6,0.75)" stroke="rgba(60,18,8,0.5)" strokeWidth="1"/>
        <text x="280" y="240" textAnchor="middle" fill="rgba(130,35,18,0.38)" fontSize="10" fontFamily="serif">MORDOR</text>
        <path d="M 148 195 L 228 190 L 232 248 L 218 268 L 172 272 L 145 258 L 138 230 Z"
          fill="rgba(55,68,28,0.32)" stroke="rgba(72,88,36,0.22)" strokeWidth="0.6"/>
        <text x="185" y="240" textAnchor="middle" fill="rgba(95,115,45,0.32)" fontSize="9" fontFamily="serif">ROHAN</text>
        <path d="M 228 248 L 292 242 L 310 260 L 305 290 L 278 302 L 248 298 L 228 278 Z"
          fill="rgba(50,58,38,0.32)" stroke="rgba(68,78,50,0.22)" strokeWidth="0.6"/>
        <text x="268" y="278" textAnchor="middle" fill="rgba(85,100,58,0.32)" fontSize="9" fontFamily="serif">GONDOR</text>
        <ellipse cx="108" cy="168" rx="28" ry="20" fill="rgba(58,78,28,0.32)" stroke="rgba(75,100,36,0.22)" strokeWidth="0.6"/>
        <text x="108" y="172" textAnchor="middle" fill="rgba(80,120,38,0.32)" fontSize="8" fontFamily="serif">Auenland</text>
        <path d="M 228 115 Q 240 145 238 175 Q 236 210 248 248" fill="none" stroke="rgba(30,65,120,0.28)" strokeWidth="1.5"/>

        {/* WESTEROS terrain */}
        <path d="M 392 35 L 428 30 L 460 34 L 482 48 L 495 72 L 492 108 L 484 148 L 472 185 L 460 222 L 452 262 L 448 302 L 440 338 L 428 362 L 415 366 L 400 356 L 390 326 L 386 290 L 384 252 L 384 210 L 383 168 L 382 128 L 384 88 L 388 58 Z"
          fill="rgba(42,56,34,0.58)" stroke="rgba(58,75,44,0.42)" strokeWidth="0.8"/>
        <rect x="384" y="54" width="94" height="6" rx="1.5"
          fill="rgba(195,218,235,0.5)" stroke="rgba(175,205,225,0.7)" strokeWidth="1"/>
        <text x="430" y="47" textAnchor="middle" fill="rgba(175,205,225,0.45)" fontSize="9" fontFamily="serif" letterSpacing="1">THE WALL</text>
        <path d="M 495 48 L 548 44 L 565 72 L 560 128 L 548 178 L 535 222 L 522 262 L 510 296 L 498 316 L 493 308 L 492 272 L 494 228 L 496 182 L 498 135 L 497 88 Z"
          fill="rgba(10,22,52,0.55)"/>
        <text x="530" y="185" textAnchor="middle" fill="rgba(40,75,148,0.28)" fontSize="8" fontFamily="serif" transform="rotate(-90 530 185)">SCHM. SEE</text>
        <text x="436" y="92" textAnchor="middle" fill="rgba(72,95,52,0.28)" fontSize="8" fontFamily="serif">THE NORTH</text>
        <text x="436" y="192" textAnchor="middle" fill="rgba(72,95,52,0.25)" fontSize="8" fontFamily="serif">STORMLANDS</text>

        {/* Castle pins */}
        <g filter="url(#me_glow2)">
          {fantasy.map(c=>{
            const g=ME_GEO[c.id];
            const iS=selC?.id===c.id;
            const isH=hov===c.id;
            const ac=c.theme.accent;
            return(
              <g key={c.id} style={{cursor:"pointer"}}
                onClick={()=>onSelect(c)}
                onMouseEnter={()=>setHov(c.id)}
                onMouseLeave={()=>setHov(null)}>
                {(iS||isH)&&<circle cx={g.x} cy={g.y} r={iS?10:7} fill={ac} opacity="0.18"/>}
                <polygon
                  points={`${g.x},${g.y-(iS?6:isH?5:4)} ${g.x+(iS?5:isH?4:3)},${g.y+(iS?4:isH?3:2)} ${g.x-(iS?5:isH?4:3)},${g.y+(iS?4:isH?3:2)}`}
                  fill={iS?ac:`${ac}dd`}
                  stroke={iS?"rgba(255,255,255,0.9)":isH?"rgba(255,255,255,0.5)":"rgba(0,0,0,0.4)"}
                  strokeWidth={iS?1.2:0.7}
                  style={{transition:"all .15s"}}/>
                {(iS||isH)&&(
                  <g>
                    <rect x={g.x+7} y={g.y-8} width={g.label.length*4.8+6} height="15" rx="2.5"
                      fill="rgba(3,1,8,0.94)" stroke={ac} strokeWidth="0.7"/>
                    <text x={g.x+10} y={g.y+3.5}
                      fill={ac} fontSize="9.5" fontFamily="'Palatino Linotype',Georgia,serif" fontWeight="bold">
                      {g.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Hover tooltip */}
      {hov&&(()=>{
        const c=castles.find(x=>x.id===hov);
        if(!c)return null;
        return(
          <div style={{position:"absolute",bottom:"8px",left:"8px",right:"8px",
            padding:"10px 14px",
            background:`linear-gradient(135deg,${c.theme.bg||"rgba(10,5,20,0.97)"} 0%,rgba(8,4,16,0.98) 100%)`,
            border:`1px solid ${c.theme.accent}55`,borderLeft:`4px solid ${c.theme.accent}`,
            borderRadius:"5px",display:"flex",gap:"12px",alignItems:"center",
            pointerEvents:"none"}}>
            <span style={{fontSize:"22px"}}>{c.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:"13px",fontWeight:"bold",color:"#f0e8d0"}}>{c.name}</div>
              <div style={{fontSize:"10px",color:c.theme.accent,marginTop:"1px"}}>{c.sub}</div>
            </div>
            <div style={{textAlign:"center",padding:"5px 10px",background:"rgba(0,0,0,0.3)",borderRadius:"4px"}}>
              <div style={{fontSize:"19px",fontWeight:"bold",color:rCol(avg(c))}}>{avg(c)}</div>
              <div style={{fontSize:"8px",color:"#8a7860",letterSpacing:"1px"}}>SCORE</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}


function useWeather(){
  const [weather, setWeather] = useState(()=>{
    // Pseudo-random based on day of year for consistency
    const day = Math.floor(Date.now() / (1000*60*60*24));
    return WEATHER_TYPES[day % WEATHER_TYPES.length];
  });
  const randomize = () => setWeather(WEATHER_TYPES[Math.floor(Math.random()*WEATHER_TYPES.length)]);
  return {weather, randomize};
}


function SorrowlandMap({castles,onSelect,selected}){
  const [hov,setHov]=useState(null);
  const sl=castles.filter(c=>["schwarzer_bergfried","castle_sorrow","gravecrest"].includes(c.id));
  // Positions on a 600×320 canvas — triangular arrangement
  const POS={
    schwarzer_bergfried:{x:300,y:80,  label:"Schwarzer Bergfried"},
    castle_sorrow:      {x:160,y:230, label:"Burgfeste Drachenstein"},
    gravecrest:         {x:440,y:230, label:"Gravecrest"},
  };
  return(
    <div style={{background:"rgba(4,4,8,0.95)",borderRadius:"8px",border:"1px solid rgba(138,138,154,0.2)",overflow:"hidden"}}>
      <svg viewBox="0 0 600 320" style={{width:"100%",display:"block"}}>
        <defs>
          <radialGradient id="sl_bg" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#0a080e"/>
            <stop offset="100%" stopColor="#040308"/>
          </radialGradient>
          <filter id="sl_glow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect width="600" height="320" fill="url(#sl_bg)"/>

        {/* Terrain */}
        <path d="M 0 320 L 0 200 Q 80 170 150 200 Q 200 220 230 210 L 230 320 Z" fill="rgba(30,40,20,0.35)"/>
        <path d="M 370 320 L 370 210 Q 400 200 450 195 Q 500 190 550 210 L 600 220 L 600 320 Z" fill="rgba(30,40,20,0.35)"/>
        {/* Mountains behind Gravecrest */}
        {[[420,190],[450,175],[480,190],[510,180],[540,195]].map(([x,y],i)=>(
          <polygon key={i} points={`${x},${y} ${x-20},${y+45} ${x+20},${y+45}`} fill="rgba(25,30,20,0.6)" stroke="rgba(35,45,28,0.4)" strokeWidth="0.8"/>
        ))}
        {/* Schwarzer Bergfried cliff */}
        <ellipse cx="300" cy="100" rx="55" ry="35" fill="rgba(15,12,20,0.7)" stroke="rgba(80,80,100,0.3)" strokeWidth="1.5"/>
        <text x="300" y="145" textAnchor="middle" fill="rgba(80,80,100,0.3)" fontSize="8" fontFamily="serif">FELSPLATEAU</text>
        {/* Valley floor */}
        <path d="M 100 260 Q 300 240 500 260 L 600 280 L 600 320 L 0 320 Z" fill="rgba(20,30,15,0.3)"/>
        <text x="300" y="300" textAnchor="middle" fill="rgba(40,60,30,0.3)" fontSize="9" fontFamily="serif" letterSpacing="2">SORROWLAND — TAL</text>

        {/* Signal fire connection lines */}
        {[
          ["schwarzer_bergfried","castle_sorrow"],
          ["schwarzer_bergfried","gravecrest"],
          ["castle_sorrow","gravecrest"],
        ].map(([a,b],i)=>{
          const pa=POS[a], pb=POS[b];
          const isActive=hov===a||hov===b;
          return(
            <line key={i} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
              stroke={isActive?"rgba(200,130,40,0.55)":"rgba(200,130,40,0.15)"}
              strokeWidth={isActive?1.5:0.8} strokeDasharray="8,5"/>
          );
        })}
        {/* Signal fire icons on lines */}
        {[{x:230,y:155},{x:375,y:155},{x:300,y:240}].map((p,i)=>(
          <text key={i} x={p.x} y={p.y} textAnchor="middle" fontSize="10" fill="rgba(200,130,40,0.4)">🔥</text>
        ))}

        {/* Castle pins */}
        <g filter="url(#sl_glow)">
          {sl.map(c=>{
            const p=POS[c.id];
            if(!p) return null;
            const iS=selected?.id===c.id;
            const isH=hov===c.id;
            const ac=c.theme.accent;
            return(
              <g key={c.id} style={{cursor:"pointer"}}
                onClick={()=>onSelect(c)}
                onMouseEnter={()=>setHov(c.id)}
                onMouseLeave={()=>setHov(null)}>
                {(iS||isH)&&<circle cx={p.x} cy={p.y} r={iS?28:22} fill={ac} opacity="0.08"/>}
                {/* Castle icon */}
                <text x={p.x} y={p.y+6} textAnchor="middle" fontSize={iS?30:24} style={{userSelect:"none"}}>{c.icon}</text>
                {/* Glow ring when selected */}
                {iS&&<circle cx={p.x} cy={p.y} r="20" fill="none" stroke={ac} strokeWidth="2" opacity="0.5"/>}
                {/* Label */}
                <rect x={p.x-45} y={p.y+(iS?22:18)} width="90" height="16" rx="3" fill="rgba(4,2,8,0.9)" stroke={`${ac}44`} strokeWidth="0.8"/>
                <text x={p.x} y={p.y+(iS?34:30)} textAnchor="middle"
                  fill={iS?ac:`${ac}cc`} fontSize="9.5" fontFamily="'Palatino Linotype',Georgia,serif" fontWeight="bold">
                  {p.label.split(" ")[0]==="Schwarzer"?"Schwarz. Bergfried":p.label}
                </text>
                {/* Era badge */}
                <text x={p.x} y={p.y+(iS?46:42)} textAnchor="middle" fill={`${ac}66`} fontSize="7.5">{c.era}</text>
              </g>
            );
          })}
        </g>

        {/* Title */}
        <text x="300" y="22" textAnchor="middle" fill="rgba(138,138,154,0.5)" fontSize="11" fontFamily="serif" letterSpacing="3">ORDO CUSTODUM SORROWLAND</text>
        <text x="300" y="34" textAnchor="middle" fill="rgba(138,138,154,0.3)" fontSize="8" fontFamily="serif" letterSpacing="1">In silentio vigilamus</text>
        {/* Legend */}
        <text x="10" y="315" fill="rgba(200,130,40,0.35)" fontSize="8">🔥 = Signalfeuer-Verbindung</text>
      </svg>
      {/* Hover info */}
      {hov&&(()=>{
        const c=castles.find(x=>x.id===hov);
        if(!c)return null;
        return(
          <div style={{padding:"10px 14px",borderTop:"1px solid rgba(138,138,154,0.15)",
            background:`linear-gradient(135deg,${c.theme.bg},rgba(6,4,10,0.98))`,
            display:"flex",gap:"10px",alignItems:"center"}}>
            <span style={{fontSize:"22px"}}>{c.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:"13px",fontWeight:"bold",color:"#f0e6cc"}}>{c.name}</div>
              <div style={{fontSize:"11px",color:c.theme.accent,marginTop:"1px"}}>{c.sub}</div>
              <div style={{fontSize:"10px",color:"#5a4a38",marginTop:"1px"}}>{c.era}</div>
            </div>
            <div style={{fontSize:"11px",color:"#9a8a6a",textAlign:"right",maxWidth:"160px",lineHeight:1.5}}>
              {c.desc.slice(0,80)}…
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function WorldMap({castles,onSelect,selected}){
  const [mapTab,setMapTab]=useState("real");
  const [epochFilter,setEpochFilter]=useState("all");
  const [distA,setDistA]=useState("");
  const [distB,setDistB]=useState("");
  const [showDist,setShowDist]=useState(false);

  const epochs=["all",...new Set(castles.filter(c=>c.type==="real").map(c=>c.epoch))].filter(Boolean);

  // Distance calculator — haversine formula
  const calcDistance=(idA,idB)=>{
    const gA=GEO[idA], gB=GEO[idB];
    if(!gA||!gB) return null;
    const lonA=(gA.x/1000*360)-180, latA=90-(gA.y/500*180);
    const lonB=(gB.x/1000*360)-180, latB=90-(gB.y/500*180);
    const R=6371;
    const dLat=(latB-latA)*Math.PI/180;
    const dLon=(lonB-lonA)*Math.PI/180;
    const a=Math.sin(dLat/2)**2+Math.cos(latA*Math.PI/180)*Math.cos(latB*Math.PI/180)*Math.sin(dLon/2)**2;
    const km=R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
    return Math.round(km);
  };

  const filteredCastles=epochFilter==="all"?castles:castles.filter(c=>c.epoch===epochFilter||c.type==="fantasy");
  const realCastles=castles.filter(c=>c.type==="real"&&GEO[c.id]);
  const distKm=distA&&distB?calcDistance(distA,distB):null;
  // Track for achievement
  const prevDistPair=useRef(null);
  if(distKm&&distA&&distB){
    const pair=`${distA}-${distB}`;
    if(pair!==prevDistPair.current){
      prevDistPair.current=pair;
      try{
        const stats=JSON.parse(localStorage.getItem('bAtlas_stats')||'{}');
        const next={...stats,distancesCalc:(stats.distancesCalc||0)+1};
        localStorage.setItem('bAtlas_stats',JSON.stringify(next));
      }catch{}
    }
  }
  const walkDays=distKm?Math.round(distKm/30):null; // ~30km/day marching army
  const horsedays=distKm?Math.round(distKm/80):null; // ~80km/day cavalry

  return(
    <div style={{padding:"18px 20px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px",flexWrap:"wrap",gap:"8px"}}>
        <div>
          <div style={{fontSize:"18px",fontWeight:"bold",color:"#f0e6cc",marginBottom:"3px"}}>🌍 Weltkarte der Festungen</div>
          <div style={{fontSize:"12px",color:"#9a8a68"}}>Klicken zum Analysieren · Hover für Details · Scrollen zum Zoomen</div>
        </div>
        <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
          {[{k:"real",l:"🌍 Historische Welt"},{k:"fantasy",l:"✦ Mittelerde & Westeros"},{k:"sorrowland",l:"⬛ Sorrowland"}].map(t=>(
            <button key={t.k} onClick={()=>setMapTab(t.k)}
              style={{padding:"6px 14px",fontSize:"11px",letterSpacing:"0.5px",
                background:mapTab===t.k?"rgba(201,168,76,0.14)":"rgba(255,255,255,0.03)",
                border:`1px solid ${mapTab===t.k?"rgba(201,168,76,0.4)":"rgba(255,255,255,0.08)"}`,
                color:mapTab===t.k?"#c9a84c":"#6a5a38",borderRadius:"4px",cursor:"pointer"}}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {/* Epoch filter — only for real map */}
      {mapTab==="real"&&(
        <div style={{display:"flex",gap:"5px",flexWrap:"wrap",marginBottom:"10px",alignItems:"center"}}>
          <span style={{fontSize:"11px",color:"#5a4a28",marginRight:"2px"}}>📅 Epoche:</span>
          {epochs.map(e=>(
            <button key={e} onClick={()=>setEpochFilter(e)}
              style={{padding:"3px 9px",fontSize:"10px",
                background:epochFilter===e?"rgba(201,168,76,0.14)":"rgba(255,255,255,0.02)",
                border:`1px solid ${epochFilter===e?"rgba(201,168,76,0.35)":"rgba(255,255,255,0.05)"}`,
                color:epochFilter===e?"#c9a84c":"#5a4a28",borderRadius:"10px",cursor:"pointer"}}>
              {e==="all"?"Alle":e}
            </button>
          ))}
        </div>
      )}

      {mapTab==="real" && <RealWorldMap castles={filteredCastles} onSelect={onSelect} selected={selected}/>}
      {mapTab==="fantasy" && <FantasyMap castles={castles} onSelect={onSelect} selected={selected}/>}
      {mapTab==="sorrowland" && <SorrowlandMap castles={castles} onSelect={onSelect} selected={selected}/>}

      {/* Distance calculator */}
      <div style={{marginTop:"10px",background:"rgba(0,0,0,0.25)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:"5px",overflow:"hidden"}}>
        <button onClick={()=>setShowDist(d=>!d)}
          style={{width:"100%",padding:"8px 14px",background:"transparent",border:"none",
            cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:"12px",color:"#8a7a58"}}>📏 Entfernungsrechner</span>
          <span style={{fontSize:"11px",color:"#5a4a28"}}>{showDist?"▲":"▼"}</span>
        </button>
        {showDist&&(
          <div style={{padding:"10px 14px",borderTop:"1px solid rgba(255,255,255,0.04)"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:"8px",alignItems:"center",marginBottom:"10px"}}>
              <select value={distA} onChange={e=>setDistA(e.target.value)}
                style={{padding:"5px 8px",background:"rgba(0,0,0,0.4)",border:"1px solid rgba(201,168,76,0.15)",
                  color:"#b09060",borderRadius:"4px",fontSize:"11px",outline:"none",fontFamily:"inherit"}}>
                <option value="">Burg A wählen…</option>
                {realCastles.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <span style={{color:"#5a4a28",fontSize:"14px",textAlign:"center"}}>→</span>
              <select value={distB} onChange={e=>setDistB(e.target.value)}
                style={{padding:"5px 8px",background:"rgba(0,0,0,0.4)",border:"1px solid rgba(201,168,76,0.15)",
                  color:"#b09060",borderRadius:"4px",fontSize:"11px",outline:"none",fontFamily:"inherit"}}>
                <option value="">Burg B wählen…</option>
                {realCastles.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            {distKm&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",animation:"fadeIn 0.2s ease"}}>
                {[
                  {icon:"📏",label:"Luftlinie",value:`${distKm.toLocaleString()} km`},
                  {icon:"🚶",label:"Heer (30km/Tag)",value:`~${walkDays} Tage`},
                  {icon:"🐴",label:"Kavallerie (80km/Tag)",value:`~${horsedays} Tage`},
                ].map(s=>(
                  <div key={s.label} style={{padding:"8px 10px",background:"rgba(255,255,255,0.02)",
                    border:"1px solid rgba(255,255,255,0.05)",borderRadius:"4px",textAlign:"center"}}>
                    <div style={{fontSize:"16px",marginBottom:"2px"}}>{s.icon}</div>
                    <div style={{fontSize:"14px",fontWeight:"bold",color:"#c9a84c"}}>{s.value}</div>
                    <div style={{fontSize:"10px",color:"#5a4a28",marginTop:"1px"}}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
            {distA&&distB&&!distKm&&(
              <div style={{fontSize:"11px",color:"#5a4a28",textAlign:"center"}}>
                Keine Kartendaten für diese Kombination.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:"18px",marginTop:"8px",padding:"7px 14px",
        background:"rgba(0,0,0,0.2)",borderRadius:"4px",border:"1px solid rgba(255,255,255,0.04)",flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
          <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4" fill="rgba(201,168,76,0.75)"/></svg>
          <span style={{fontSize:"11px",color:"#5a4a28"}}>Historische Burg</span>
        </div>
        <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
          <svg width="12" height="12" viewBox="0 0 12 12"><polygon points="6,1 11,10 1,10" fill="rgba(150,100,220,0.75)"/></svg>
          <span style={{fontSize:"11px",color:"#5a4a28"}}>Fantasy-Festung</span>
        </div>
        {epochFilter!=="all"&&<div style={{fontSize:"11px",color:"#c9a84c"}}>📅 Filter: {epochFilter}</div>}
        <div style={{marginLeft:"auto",fontSize:"11px",color:"#5a4a28"}}>
          {Object.keys(GEO).length + Object.keys(ME_GEO).length} Festungen kartiert
        </div>
      </div>
    </div>
  );
}
// ── Overview Grid ──────────────────────────────────────────────────────────
const REGION_LABELS={europa:"⚜ Europa",nahost:"☪ Naher Osten",ostasien:"⛩ Ostasien",suedostasien:"🌺 S-Asien",suedamerika:"🌎 Südamerika",mittelerde:"✦ Mittelerde",westeros:"❄ Westeros"};
const EPOCH_ORDER=["Antike","Spätantike","Mittelalter","Hochmittelalter","Feudaljapan","Neuzeit","Mittelerde","Silmarillion","Westeros"];

function CastleGrid({castles,onSelect,scores,filter,setFilter,epochFilter,setEpochFilter,regionFilter,setRegionFilter,search,setSearch,favs=new Set(),onFavToggle}){
  const [hov,setHov]=useState(null);
  const [sortBy,setSortBy]=useState("default");

  const filtered=useMemo(()=>{
    let arr=castles.filter(c=>{
      if(filter!=="all"&&c.type!==filter)return false;
      if(epochFilter&&c.epoch!==epochFilter)return false;
      if(regionFilter&&c.region!==regionFilter)return false;
      if(sortBy==="favs"&&!favs.has(c.id))return false;
      if(search&&!c.name.toLowerCase().includes(search.toLowerCase())&&!c.loc.toLowerCase().includes(search.toLowerCase()))return false;
      return true;
    });
    if(sortBy==="score") arr=[...arr].sort((a,b)=>avg(b)-avg(a));
    else if(sortBy==="epoch") arr=[...arr].sort((a,b)=>EPOCH_ORDER.indexOf(a.epoch)-EPOCH_ORDER.indexOf(b.epoch));
    else if(sortBy==="name") arr=[...arr].sort((a,b)=>a.name.localeCompare(b.name));
    return arr;
  },[castles,filter,epochFilter,regionFilter,search,sortBy,favs]);

  const grouped=useMemo(()=>{
    if(sortBy!=="default")return null;
    const g={};
    filtered.forEach(c=>{if(!g[c.region])g[c.region]=[];g[c.region].push(c);});
    return g;
  },[filtered,sortBy]);

  const CastleCard=({c})=>{
    const sc=avg(c),hs=scores[c.id],isH=hov===c.id,isFav=favs.has(c.id);
    const ac=c.theme.accent;
    const rEntries=Object.entries(c.ratings);
    const [maxK,maxV]=rEntries.reduce((a,b)=>a[1]>b[1]?a:b);
    const [minK,minV]=rEntries.reduce((a,b)=>a[1]<b[1]?a:b);
    const RLBL={walls:"Mauern",position:"Lage",supply:"Versorg.",garrison:"Garnison",morale:"Moral"};
    const scoreColor=rCol(sc);
    return(
      <button onClick={()=>onSelect(c)} onMouseEnter={()=>setHov(c.id)} onMouseLeave={()=>setHov(null)}
        style={{textAlign:"left",padding:0,background:"transparent",border:"none",cursor:"pointer",display:"block",width:"100%"}}>
        <div className="castle-card" style={{
          position:"relative",overflow:"hidden",
          background:isH
            ?`linear-gradient(145deg,${c.theme.bg} 0%,rgba(10,8,5,0.97) 65%,rgba(6,4,2,0.99) 100%)`
            :"linear-gradient(145deg,rgba(255,255,255,0.028),rgba(255,255,255,0.012))",
          border:`1px solid ${isH?ac+"65":"rgba(255,255,255,0.07)"}`,
          borderRadius:"14px",
          boxShadow:isH
            ?`0 16px 48px rgba(0,0,0,0.75),0 0 0 1px ${ac}22,0 4px 24px ${ac}18,inset 0 1px 0 ${ac}25`
            :"0 2px 10px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.02)",
        }}>
          {/* Top accent bar — thicker and more vivid on hover */}
          <div style={{
            height:"3px",
            background:`linear-gradient(90deg,${ac} 0%,${ac}88 45%,${ac}22 80%,transparent 100%)`,
            opacity:isH?1:0.28,
            transition:"opacity .25s ease, height .25s ease",
          }}/>

          {/* Hover glow overlay */}
          {isH&&<div style={{
            position:"absolute",top:0,left:0,right:0,height:"60%",pointerEvents:"none",
            background:`radial-gradient(ellipse at 20% 0%,${ac}12,transparent 60%)`,
          }}/>}

          <div style={{display:"flex",padding:"13px",gap:"12px",alignItems:"center"}}>
            {/* Icon bubble */}
            <div style={{
              width:"54px",height:"54px",flexShrink:0,borderRadius:"13px",
              background:isH
                ?`radial-gradient(circle at 35% 35%,${ac}32,${c.theme.bg}aa)`
                :`linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))`,
              border:`1px solid ${isH?ac+"45":"rgba(255,255,255,0.07)"}`,
              display:"flex",alignItems:"center",justifyContent:"center",
              transition:"all .25s ease",
              boxShadow:isH?`0 4px 16px ${ac}30,inset 0 1px 0 rgba(255,255,255,0.1)`:"none",
            }}>
              <span style={{
                fontSize:"27px",
                filter:isH?`drop-shadow(0 2px 10px ${ac}cc)`:"drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
                transition:"filter .25s ease, transform .25s ease",
                transform:isH?"scale(1.12)":"scale(1)",
                display:"block",
              }}>{c.icon}</span>
            </div>

            {/* Main content */}
            <div style={{flex:1,minWidth:0}}>
              {/* Name row */}
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"6px",marginBottom:"3px"}}>
                <div style={{
                  fontFamily:"'Cinzel',serif",fontSize:"13.5px",fontWeight:"700",
                  color:isH?"#f6eedd":"#b0a068",
                  letterSpacing:"0.03em",
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,
                  textShadow:isH?`0 0 22px ${ac}66`:"none",
                  transition:"color .2s ease, text-shadow .2s ease",
                }}>{c.name}</div>
                <div style={{display:"flex",gap:"4px",alignItems:"center",flexShrink:0}}>
                  {/* Type badge */}
                  <span style={{
                    fontSize:"8px",padding:"2px 7px",borderRadius:"20px",letterSpacing:"1px",
                    background:c.type==="real"
                      ?"linear-gradient(135deg,rgba(50,100,25,0.5),rgba(35,70,18,0.4))"
                      :"linear-gradient(135deg,rgba(70,35,120,0.5),rgba(50,25,90,0.4))",
                    border:`1px solid ${c.type==="real"?"rgba(80,160,40,0.4)":"rgba(120,60,200,0.4)"}`,
                    color:c.type==="real"?"#74cc44":"#b07aee",
                    fontFamily:"'Cinzel',serif",
                    boxShadow:isH&&c.type==="real"?"0 0 8px rgba(80,180,40,0.2)":isH?"0 0 8px rgba(130,70,220,0.2)":"none",
                  }}>{c.type==="real"?"HIST.":"FAN."}</span>
                  <button onClick={e=>{e.stopPropagation();onFavToggle&&onFavToggle(c.id);}}
                    style={{
                      background:"transparent",border:"none",cursor:"pointer",
                      fontSize:"13px",lineHeight:1,padding:"2px",
                      opacity:isFav?1:isH?0.5:0.15,
                      transition:"opacity .15s, transform .15s",
                      color:isFav?"#f0c040":"#c0a060",
                      transform:isFav?"scale(1.15)":"scale(1)",
                    }}>
                    {isFav?"⭐":"☆"}
                  </button>
                </div>
              </div>

              {/* Sub */}
              <div style={{
                fontSize:"11px",
                color:isH?`${ac}dd`:"#4e3e22",
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                marginBottom:"2px",
                transition:"color .2s ease",
              }}>{c.sub}</div>

              {/* Meta */}
              <div style={{
                fontSize:"10px",
                color:isH?"#5a4e34":"#322818",
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                marginBottom:"8px",
                transition:"color .2s ease",
              }}>{c.era} · {c.loc}</div>

              {/* Stats row */}
              <div style={{display:"flex",gap:"9px",alignItems:"center"}}>
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:"4px"}}>
                  {/* Best stat */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:"9px",color:isH?`${ac}cc`:"#4a3820",letterSpacing:"0.5px"}}>
                      ▲ {RLBL[maxK]}
                    </span>
                    <span style={{fontSize:"9px",fontFamily:"monospace",color:isH?"#90d845":"#506a22",fontWeight:"bold"}}>{maxV}</span>
                  </div>
                  <div style={{height:"3px",background:"rgba(255,255,255,0.06)",borderRadius:"2px",overflow:"hidden"}}>
                    <div style={{
                      height:"100%",width:`${maxV}%`,borderRadius:"2px",
                      background:isH?`linear-gradient(90deg,${ac},${ac}66)`:"linear-gradient(90deg,rgba(201,168,76,0.6),rgba(201,168,76,0.3))",
                      transition:"width .5s ease, background .25s",
                      boxShadow:isH?`0 0 6px ${ac}66`:"none",
                    }}/>
                  </div>
                  {/* Worst stat */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:"9px",color:"#8a7060",letterSpacing:"0.5px"}}>▼ {RLBL[minK]}</span>
                    <span style={{fontSize:"9px",fontFamily:"monospace",color:"#7a3a20"}}>{minV}</span>
                  </div>
                  <div style={{height:"3px",background:"rgba(255,255,255,0.06)",borderRadius:"2px",overflow:"hidden"}}>
                    <div style={{
                      height:"100%",width:`${minV}%`,borderRadius:"2px",
                      background:"rgba(180,70,35,0.55)",
                      transition:"width .5s ease",
                    }}/>
                  </div>
                </div>

                {/* Score ring */}
                <div style={{flexShrink:0,position:"relative",width:"40px",height:"40px"}}>
                  <svg width="40" height="40" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3"/>
                    <circle cx="20" cy="20" r="16" fill="none" stroke={scoreColor} strokeWidth="3"
                      strokeDasharray={`${sc*1.005} 100.5`} strokeLinecap="round"
                      transform="rotate(-90 20 20)"
                      style={{filter:isH?`drop-shadow(0 0 4px ${scoreColor}88)`:"none",transition:"filter .25s"}}
                    />
                  </svg>
                  <div style={{
                    position:"absolute",inset:0,display:"flex",flexDirection:"column",
                    alignItems:"center",justifyContent:"center",
                  }}>
                    <span style={{
                      fontSize:"11px",fontWeight:"800",color:scoreColor,
                      fontFamily:"'Cinzel',serif",lineHeight:1,
                      textShadow:isH?`0 0 8px ${scoreColor}88`:"none",
                      transition:"text-shadow .25s",
                    }}>{sc}</span>
                    {hs&&<span style={{fontSize:"8px",lineHeight:1,marginTop:"1px"}}>{hs.won?"✅":"❌"}</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </button>
    );
  };

  const RCOL={europa:"#7788bb",nahost:"#cc9944",ostasien:"#dd6644",suedostasien:"#66bb55",suedamerika:"#cc7722",mittelerde:"#8855cc",westeros:"#44aacc"};

  return(
    <div className="castle-outer" style={{padding:"18px 22px"}}>
      {/* ── FILTER BAR ── */}
      <div className="filter-bar" style={{
        marginBottom:"22px",
        background:"linear-gradient(145deg,rgba(14,10,6,0.96),rgba(10,8,5,0.94))",
        backdropFilter:"blur(16px)",
        WebkitBackdropFilter:"blur(16px)",
        border:"1px solid rgba(201,168,76,0.16)",
        borderTop:"1px solid rgba(201,168,76,0.1)",
        borderRadius:"16px",
        padding:"14px 18px",
        boxShadow:"0 8px 32px rgba(0,0,0,0.6),inset 0 1px 0 rgba(201,168,76,0.08)",
      }}>
        {/* Top row */}
        <div style={{display:"flex",gap:"10px",alignItems:"center",marginBottom:"14px",flexWrap:"wrap"}}>
          <div style={{flex:"1 1 auto",minWidth:0}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:"12px",fontWeight:"700",color:"#d4bc78",letterSpacing:"3.5px"}}>
              BURGENKATALOG
            </div>
            <div style={{fontSize:"10px",color:"#8a7a5a",letterSpacing:"1.5px",marginTop:"2px"}}>
              <span style={{color:"#c9a84c",fontWeight:"bold"}}>{filtered.length}</span>
              <span style={{color:"#7a6a4a"}}> von {castles.length} Festungen</span>
            </div>
          </div>
          {/* Search */}
          <div style={{position:"relative",flexShrink:0}}>
            <span style={{
              position:"absolute",left:"11px",top:"50%",transform:"translateY(-50%)",
              fontSize:"12px",pointerEvents:"none",opacity:0.5,
            }}>🔍</span>
            <input
              className="search-input"
              value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Burg suchen…"
              style={{
                padding:"7px 14px 7px 32px",
                background:"rgba(255,255,255,0.06)",
                border:"1px solid rgba(201,168,76,0.22)",
                borderRadius:"20px",
                color:"#c8b07a",fontSize:"12px",outline:"none",
                width:"140px",
                fontFamily:"inherit",
                transition:"width .25s ease, border-color .2s, box-shadow .2s",
              }}
              onFocus={e=>e.target.style.width="180px"}
              onBlur={e=>e.target.style.width="140px"}
            />
          </div>
        </div>

        {/* Filter pills row */}
        <div style={{display:"flex",gap:"5px",flexWrap:"wrap",alignItems:"center"}}>
          {/* Type filters */}
          {[{k:"all",l:"Alle"},{k:"real",l:"⚜ Historisch"},{k:"fantasy",l:"✦ Fantasy"}].map(f=>(
            <button key={f.k} onClick={()=>setFilter(f.k)} className="filter-pill" style={{
              background:filter===f.k
                ?"linear-gradient(135deg,rgba(201,168,76,0.25),rgba(201,168,76,0.12))"
                :"rgba(255,255,255,0.07)",
              border:`1px solid ${filter===f.k?"rgba(201,168,76,0.6)":"rgba(255,255,255,0.14)"}`,
              color:filter===f.k?"#e0c070":"#c0aa80",
              fontFamily:"inherit",
              boxShadow:filter===f.k?"0 2px 14px rgba(201,168,76,0.25)":"none",
            }}>
              {f.l}
            </button>
          ))}

          <div style={{width:"1px",height:"22px",background:"linear-gradient(180deg,transparent,rgba(201,168,76,0.35),transparent)",margin:"0 2px"}}/>

          {/* Epoch & Region selects */}
          {[
            {value:epochFilter,onChange:e=>setEpochFilter(e.target.value),opts:[{v:"",l:"Alle Epochen"},...epochs.map(e=>({v:e,l:e}))]},
            {value:regionFilter,onChange:e=>setRegionFilter(e.target.value),opts:[{v:"",l:"Alle Regionen"},...regions.map(r=>({v:r,l:REGION_LABELS[r]||r}))]},
          ].map((sel,i)=>(
            <select key={i} value={sel.value} onChange={sel.onChange} style={{
              padding:"6px 12px",
              background:"rgba(255,255,255,0.07)",
              border:"1px solid rgba(255,255,255,0.14)",
              color:"#b0a080",fontSize:"11px",borderRadius:"20px",
              outline:"none",fontFamily:"inherit",cursor:"pointer",
              transition:"border-color .18s",
            }}>
              {sel.opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          ))}

          <div style={{width:"1px",height:"22px",background:"linear-gradient(180deg,transparent,rgba(138,173,255,0.3),transparent)",margin:"0 2px"}}/>

          {/* Sort buttons */}
          {[{k:"default",l:"🗺 Karte"},{k:"score",l:"↓ Score"},{k:"epoch",l:"Epoche"},{k:"name",l:"A–Z"},{k:"favs",l:`⭐ ${favs.size}`}].map(s=>(
            <button key={s.k} onClick={()=>setSortBy(s.k)} className="filter-pill" style={{
              background:sortBy===s.k
                ?"linear-gradient(135deg,rgba(111,138,255,0.22),rgba(66,216,207,0.14))"
                :"rgba(255,255,255,0.07)",
              border:`1px solid ${sortBy===s.k?"rgba(138,173,255,0.5)":"rgba(255,255,255,0.14)"}`,
              color:sortBy===s.k?"#c8dcff":"#a8a898",
              fontFamily:"inherit",
              boxShadow:sortBy===s.k?"0 2px 14px rgba(111,138,255,0.2)":"none",
            }}>
              {s.l}
            </button>
          ))}
        </div>
      </div>

      {/* ── CARD GRID ── */}
      {grouped
        ? Object.entries(grouped)
            .sort(([a],[b])=>{const o=["europa","nahost","ostasien","suedostasien","suedamerika","mittelerde","westeros"];return(o.indexOf(a)>=0?o.indexOf(a):99)-(o.indexOf(b)>=0?o.indexOf(b):99);})
            .map(([region,cards])=>(
          <div key={region} style={{marginBottom:"36px"}}>
            {/* Region header — improved */}
            <div className="region-bar" style={{
              borderLeftColor:RCOL[region]||"#c9a84c",
              marginBottom:"16px",
            }}>
              <div style={{
                width:"28px",height:"28px",borderRadius:"8px",flexShrink:0,
                background:`linear-gradient(135deg,${RCOL[region]||"#c9a84c"}28,${RCOL[region]||"#c9a84c"}10)`,
                border:`1px solid ${RCOL[region]||"#c9a84c"}40`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:"14px",
              }}>
                {region==="europa"?"🏰":region==="nahost"?"🕌":region==="ostasien"?"⛩️":region==="suedostasien"?"🌿":region==="suedamerika"?"🌄":region==="mittelerde"?"🧙":"⚔️"}
              </div>
              <div>
                <div style={{
                  fontFamily:"'Cinzel',serif",fontSize:"12px",fontWeight:"700",
                  color:RCOL[region]||"#c9a84c",letterSpacing:"3px",textTransform:"uppercase",
                  textShadow:`0 0 16px ${RCOL[region]||"#c9a84c"}55`,
                }}>
                  {REGION_LABELS[region]||region}
                </div>
                <div style={{fontSize:"9px",color:"#8a7860",letterSpacing:"2px",marginTop:"2px",fontFamily:"monospace"}}>
                  {cards.length} FESTUNG{cards.length!==1?"EN":""}
                </div>
              </div>
              <div style={{flex:1,height:"1px",background:`linear-gradient(90deg,${RCOL[region]||"#c9a84c"}44,transparent)`}}/>
            </div>
            <div className="castle-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:"10px"}}>
              {cards.map(c=><CastleCard key={c.id} c={c}/>)}
            </div>
          </div>
        ))
        : <div className="castle-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:"10px"}}>
            {filtered.map(c=><CastleCard key={c.id} c={c}/>)}
          </div>
      }
    </div>
  );
}

// ── Roleplay Siege ─────────────────────────────────────────────────────────
function RoleplaySiege({castle,onScore,general,season}){
  const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [turn,setTurn]=useState(0);
  const [outcome,setOutcome]=useState(null);
  const [ev,setEv]=useState(null);
  const [journal,setJournal]=useState([]);
  const [showJournal,setShowJournal]=useState(false);
  const [chronicle,setChronicle]=useState(null);
  const [chronicleLoading,setChronicleLoading]=useState(false);
  const [abilityUsed,setAbilityUsed]=useState(false);
  const [abilityAnim,setAbilityAnim]=useState(null);
  const bot=useRef(null);
  const defType=getDefenderType(castle);

  // Local chronicle fallback — generates atmospheric text from journal
  const buildLocalChronicle=(jnl, won, turns)=>{
    const events=jnl.filter(e=>e.event).map(e=>e.event);
    const actions=jnl.map(e=>e.action).slice(0,3);
    const dayEst=turns*Math.floor(8+Math.random()*12);

    const openings=[
      `Tag ${Math.floor(dayEst*0.3)}: Die Belagerung von ${castle.name} begann mit ${actions[0]||"dem ersten Vorstoß"}.`,
      `Die Chronisten des ${castle.era} berichten: Vor den Mauern von ${castle.name} entbrannte ein Kampf der Generationen.`,
      `Feldnotizen, ${castle.era}: General ${general?.name||"des Angreifers"} schlug sein Lager vor ${castle.name} auf.`,
    ];
    const middles=events.length>0
      ? `Tag ${Math.floor(dayEst*0.5)}: ${events[0]==="SEUCHE"?"Die Ruhr griff um sich — Männer fielen nicht durch Schwerter, sondern durch Fieber.":events[0]==="ENTSATZ"?"Trompeten in der Ferne — Entsatz nahte. Die Garnison schöpfte neue Hoffnung.":events[0]==="VERRÄTER"?"Ein Überläufer öffnete seine Hände: Er kannte den Grundriss. Der Preis war hoch.":events[0]==="ERDBEBEN"?"Die Erde selbst schien zu urteilen — ein Beben erschütterte Mauern und Moral gleichermaßen.":events[0]==="MAUERTURM KOLLABIERT"?"Mit einem Donner kollabierte der Nordturm. Eine Bresche — und mit ihr alle Hoffnung der Verteidiger.":`Ein unerwartetes Ereignis — ${events[0]} — erschütterte den Verlauf.`}`
      : `Tag ${Math.floor(dayEst*0.5)}: Kein Ereignis des Schicksals — nur der stete Druck der Belagerung.`;
    const ending=won
      ? `Tag ${dayEst}: ${castle.name} fiel. ${castle.defender||"Der Burgherr"} — ${defType.label} bis zum Ende — ${defType.id==="fanatiker"?"kämpfte bis der letzte Stein fiel.":defType.id==="feigling"?"öffnete das Tor ehe der erste große Sturm begann.":defType.id==="ehrenmann"?"übergab das Tor mit erhobenem Haupt und wurde mit Ehren entlassen.":"erkannte die Hoffnungslosigkeit und handelte das Ende aus."} General ${general?.name||"des Angreifers"} schrieb sich in die Geschichte.`
      : `Tag ${dayEst}: Die Fahne von ${castle.name} weht noch. ${castle.defender||"Der Burgherr"} — ${defType.label} — hatte ${defType.id==="stratege"?"jeden Angriff antizipiert und konterkariert.":defType.id==="fanatiker"?"jeden Rückzug verweigert und jeden Mann bis ans Limit getrieben.":"die Burg mit zäher Geduld verteidigt."} Die Belagerer zogen ab.`;

    return `${openings[Math.floor(Math.random()*openings.length)]}\n\n${middles}\n\n${ending}\n\n— *Aus den Chroniken, ${castle.era}*`;
  };

  const generateChronicle=async(jnl, won, turns)=>{
    setChronicleLoading(true);
    const local=buildLocalChronicle(jnl, won, turns);
    try{
      const data=await callClaude({model:"claude-sonnet-4-20250514",max_tokens:400,
        messages:[{role:"user",content:`Schreibe einen kurzen atmosphärischen Chronik-Eintrag (150-200 Wörter, Deutsch, mittelalterlicher Stil) über diese Belagerung:
Burg: ${castle.name} (${castle.era}, ${castle.loc})
Verteidiger: ${castle.defender||"Burgherr"} — Typ: ${defType.label} (${defType.desc})
General des Angreifers: ${general?.name||"Unbekannt"}
Jahreszeit: ${season?.name||"Unbekannt"}
Verlauf: ${jnl.map(e=>`Zug ${e.turn}: ${e.action}${e.event?` [${e.event}]`:""}`).join("; ")}
Ereignisse: ${jnl.filter(e=>e.event).map(e=>e.event).join(", ")||"keine"}
Ergebnis: ${won?"EINGENOMMEN":"GEHALTEN"} nach ${turns} Zügen

Stil: Wie ein mittelalterlicher Chronist. Erwähne konkrete Details. Endet mit einem Fazit.`}]});
      if(data){
        setChronicle(data.content?.map(b=>b.text||"").join("").trim());
      } else {
        setChronicle(local);
      }
    }catch{
      setChronicle(local);
    }
    setChronicleLoading(false);
  };

  const reset=useCallback(()=>{
    setMsgs([{role:"assistant",text:`**BELAGERUNG BEGINNT: ${castle.name}**\n\nIch bin **${castle.defender||"der Burgherr"}** — ${defType.emoji} ${defType.label}.\n\n*${castle.siegeCtx}*\n${general?`\n*Dein General: ${general.emoji} ${general.name} — ${general.specialty}*`:""}\n${season?`*Jahreszeit: ${season.emoji} ${season.name} — ${season.desc}*`:""}\n${general?.ability?`\n*⚡ Spezialfähigkeit verfügbar: ${general.ability.emoji} ${general.ability.name}*`:""}\n\nDie Burg steht. Was ist dein erster Zug?`,type:"sys"}]);
    setTurn(0);setOutcome(null);setJournal([]);setChronicle(null);setAbilityUsed(false);setAbilityAnim(null);
  },[castle.id,general?.id,season?.id]);

  const useAbility=async()=>{
    if(!general?.ability||abilityUsed||loading||outcome)return;
    const ab=general.ability;
    setAbilityUsed(true);
    setAbilityAnim(ab);
    setTimeout(()=>setAbilityAnim(null),4000);
    const t=turn+1;setTurn(t);
    const newJournal=[...journal,{turn:t,action:`⚡ SPEZIALFÄHIGKEIT: ${ab.name}`,event:ab.name}];
    setJournal(newJournal);
    setMsgs(m=>[...m,{role:"user",text:`**ZUG ${t} — ⚡ SPEZIALFÄHIGKEIT: ${ab.emoji} ${ab.name}**\n\n*${ab.effect}*`}]);
    setLoading(true);
    const hist=msgs.filter(m=>m.type!=="sys").map(m=>({role:m.role,content:m.text}));
    try{
      const data=await callClaude({model:"claude-sonnet-4-20250514",max_tokens:500,
        system:`Du spielst ${castle.defender||"den Burgherrn"} der ${castle.name} verteidigt.
PERSÖNLICHKEIT: ${defType.label} — ${defType.desc}.
Der Angreifer setzt jetzt die Spezialfähigkeit "${ab.name}" ein: ${ab.desc}
Reagiere dramatisch auf diesen entscheidenden Moment. 80-120 Wörter Deutsch.
${ab.id==="saladin"||ab.name.includes("Diplomat")?`Wenn Persönlichkeit Feigling oder Pragmatiker: reagiere mit Kapitulation **[GEFALLEN]**`:""}
${ab.name.includes("Terror")||ab.name.includes("Schrecken")?`Wenn Persönlichkeit Feigling: reagiere mit Kapitulation **[GEFALLEN]**`:""}
Mächtige Fähigkeiten wie Artillerie-Bombardement oder Tunnel-Kollaps können direkt zum Sieg führen: **[GEFALLEN]**.`,
        messages:[...hist,{role:"user",content:`SPEZIALFÄHIGKEIT eingesetzt: ${ab.name} — ${ab.effect}`}]});
      let reply;
      if(!data){
        // Lokaler Fallback je nach Fähigkeit
        const localReplies={
          saladin: defType.id==="feigling"||defType.id==="pragmatiker"
            ?"Freier Abzug... ich... ja. Meine Männer haben genug gelitten. Das Tor steht offen. **[GEFALLEN]**"
            :"Ein ehrenvolles Angebot — aber diese Burg fällt nicht durch Worte. Antwortet mit Schwertern!",
          caesar: "Ein Belagerungsring! Wir sind eingeschlossen. Kein Entsatz, kein Proviant. Die Tage sind gezählt.",
          genghis: defType.id==="feigling"
            ?"Die Mongolen! Vor den Mauern! Ich öffne das Tor — nur nicht töten! **[GEFALLEN]**"
            :"Ihr Schrecken beeindruckt mich nicht. Meine Männer sterben lieber als sie vor dem Sturm fliehen!",
          vauban: "Laufgräben! Sie graben sich heran! Die Mauern... der Beschuss trifft jetzt nur noch eine Stelle. Wir müssen reagieren!",
          mehmed: "Der Donner... Ürban! Die Mauer... SIE BRICHT! Alle in die Bresche! **[GEFALLEN]**",
          richard: "Der König selbst stürmt vor! Meine Männer... ihr Mut bricht beim Anblick des Löwenherzens. Haltet stand! Haltet— **[GEFALLEN]**",
          mongke: "Ein Grollen unter unseren Füßen... der Nordturm... ER FÄLLT! Bresche! Sie strömen herein! **[GEFALLEN]**",
          napoleon: "Alle Kanonen gleichzeitig... ich habe so etwas nie gesehen. Die Mauer ist Staub. **[GEFALLEN]**",
        };
        reply=localReplies[general.id]||`Die Spezialfähigkeit ${ab.name} erschüttert die Verteidigung. Die Garnison wankt.`;
      } else {
        reply=data.content?.map(b=>b.text||"").join("")||"";
      }
      const fell=reply.includes("[GEFALLEN]"),held=reply.includes("[GEHALTEN]");
      setMsgs(m=>[...m,{role:"assistant",text:reply.replace(/\*\*\[GEFALLEN\]\*\*|\*\*\[GEHALTEN\]\*\*/g,"").trim()}]);
      if(fell){setOutcome("v");if(onScore)onScore(castle.id,true,t);generateChronicle(newJournal,true,t);}
      else if(held){setOutcome("d");if(onScore)onScore(castle.id,false,t);generateChronicle(newJournal,false,t);}
    }catch{setMsgs(m=>[...m,{role:"assistant",text:"*Die Fähigkeit entfaltet ihre Wirkung...*"}]);}
    setLoading(false);
  };

  useEffect(()=>{reset();},[castle.id]);
  useEffect(()=>{bot.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  const maybeEv=(t)=>{
    if(t>=2&&Math.random()<.28){
      const e=SIEGE_EVENTS[Math.floor(Math.random()*SIEGE_EVENTS.length)];
      setEv(e);setTimeout(()=>setEv(null),5500);
      return e;
    }
    return null;
  };

  const send=async()=>{
    if(!input.trim()||loading||outcome)return;
    const act=input.trim();setInput("");
    const t=turn+1;setTurn(t);
    const evnt=maybeEv(t);
    const newJournal=[...journal,{turn:t,action:act,event:evnt?.t}];
    setJournal(newJournal);
    setMsgs(m=>[...m,{role:"user",text:`**ZUG ${t}:** ${act}${evnt?`\n\n*⚡ EREIGNIS: ${evnt.e} ${evnt.t} — ${evnt.txt}*`:""}`}]);
    setLoading(true);
    const hist=msgs.filter(m=>m.type!=="sys").map(m=>({role:m.role,content:m.text}));
    const genBonus=general?`\nAngreifer-General: ${general.name} (${general.specialty})`:"";
    const seasonPen=season?`\nJahreszeit: ${season.name} — Boni: ${JSON.stringify(season.bonuses)} Malus: ${JSON.stringify(season.penalties)}`:"";
    try{
      const data=await callClaude({model:"claude-sonnet-4-20250514",max_tokens:600,
        system:`Du spielst ${castle.defender||"den Burgherrn"} der ${castle.name} verteidigt (${castle.era}).
PERSÖNLICHKEIT: ${defType.label} — ${defType.desc}. Antwortstil: ${defType.responseStyle}.${genBonus}${seasonPen}
STÄRKEN: ${castle.strengths.join("; ")}. SCHWÄCHEN: ${castle.weaknesses.join("; ")}.
Reagiere als Verteidiger in 1. Person, dramatisch, historisch akkurat, 80-130 Wörter Deutsch.
${evnt?`Das aktuelle Ereignis "${evnt.t}" beeinflusst die Situation.`:""}
Kapitulationsschwelle: ${defType.id==="fanatiker"?"NIEMALS freiwillig":defType.id==="feigling"?"Bei ernstem Druck schnell":defType.id==="stratege"?"Nur wenn wirklich keine Chance mehr":"Nach rationaler Analyse"}.
Nach 5-9 Zügen bei guter Strategie: "**[GEFALLEN]**", bei schlechter: "**[GEHALTEN]**".`,
        messages:[...hist,{role:"user",content:`ZUG ${t}: ${act}${evnt?` [EREIGNIS: ${evnt.t}]`:""}`}]});
      let reply;
      if(!data){
        // Smart fallback — keyword-matched + no-repeat tracking
        const actLow=act.toLowerCase();
        let pool;
        // Action-specific pools first
        if(actLow.includes("belagerungs")||actLow.includes("katapult")||actLow.includes("maschine")||actLow.includes("ramme")) pool=ROLEPLAY_RESPONSES.action_siege;
        else if(actLow.includes("spion")||actLow.includes("verrat")||actLow.includes("einschleusen")||actLow.includes("kundschaft")) pool=ROLEPLAY_RESPONSES.action_spy;
        else if(actLow.includes("hunger")||actLow.includes("blockade")||actLow.includes("abschneid")||actLow.includes("versorg")) pool=ROLEPLAY_RESPONSES.action_hunger;
        else if(actLow.includes("verhandl")||actLow.includes("kapitulat")||actLow.includes("frieden")||actLow.includes("angebot")) pool=ROLEPLAY_RESPONSES.action_diplomacy;
        else if(actLow.includes("mine")||actLow.includes("tunnel")||actLow.includes("graben")||actLow.includes("untermini")) pool=ROLEPLAY_RESPONSES.action_mining;
        else if(actLow.includes("feuer")||actLow.includes("brand")||actLow.includes("fackel")||actLow.includes("brennen")) pool=ROLEPLAY_RESPONSES.action_fire;
        else if(actLow.includes("kavall")||actLow.includes("reiter")||actLow.includes("pferd")||actLow.includes("sturm")) pool=ROLEPLAY_RESPONSES.action_cavalry;
        else if(actLow.includes("einschüchter")||actLow.includes("psych")||actLow.includes("trommel")||actLow.includes("terror")) pool=ROLEPLAY_RESPONSES.action_psych;
        else if(actLow.includes("leiter")||actLow.includes("erklettern")||actLow.includes("klettern")||actLow.includes("escalade")) pool=ROLEPLAY_RESPONSES.action_escalade;
        else if(actLow.includes("wasser")||actLow.includes("fluss")||actLow.includes("zisterne")||actLow.includes("vergift")) pool=ROLEPLAY_RESPONSES.action_water;
        else {
          // Phase-based pool — prefer personality-specific responses
          const personalityPool = PERSONALITY_RESPONSES[defType.id];
          const phasePool = t<=2
            ? (personalityPool?.early || ROLEPLAY_RESPONSES.early)
            : t<=5
            ? (personalityPool?.middle || ROLEPLAY_RESPONSES.middle)
            : ROLEPLAY_RESPONSES.late;
          const defPool=t>5?defType.lateResponses:null;
          pool=defPool&&Math.random()<0.45?defPool:phasePool;
        }
        // Avoid recent repeats — track last 3 used indices
        if(!window._rpUsed) window._rpUsed=[];
        const available=pool.map((_,i)=>i).filter(i=>!window._rpUsed.includes(`${pool===ROLEPLAY_RESPONSES.early?'e':pool===ROLEPLAY_RESPONSES.middle?'m':pool===ROLEPLAY_RESPONSES.late?'l':'a'}${i}`));
        const pickFrom=available.length>0?available:pool.map((_,i)=>i);
        const idx=pickFrom[Math.floor(Math.random()*pickFrom.length)];
        const key=`${pool===ROLEPLAY_RESPONSES.early?'e':pool===ROLEPLAY_RESPONSES.middle?'m':pool===ROLEPLAY_RESPONSES.late?'l':'a'}${idx}`;
        window._rpUsed=[...window._rpUsed.slice(-5),key];
        reply=pool[idx];
      } else {
        reply=data.content?.map(b=>b.text||"").join("")||"Keine Antwort.";
      }
      const fell=reply.includes("[GEFALLEN]"),held=reply.includes("[GEHALTEN]");
      setMsgs(m=>[...m,{role:"assistant",text:reply.replace(/\*\*\[GEFALLEN\]\*\*|\*\*\[GEHALTEN\]\*\*/g,"").trim()}]);
      if(fell){
        setOutcome("v");
        if(onScore)onScore(castle.id,true,t);
        generateChronicle(newJournal,true,t);
      } else if(held){
        setOutcome("d");
        if(onScore)onScore(castle.id,false,t);
        generateChronicle(newJournal,false,t);
      }
    }catch{setMsgs(m=>[...m,{role:"assistant",text:"*Verbindungsfehler.*"}]);}
    setLoading(false);
  };

  const exportLog=()=>{
    const txt=`BELAGERUNGSLOG: ${castle.name}\nGeneral: ${general?.name||"—"} · Jahreszeit: ${season?.name||"—"}\n${"=".repeat(50)}\n\n${journal.map(e=>`ZUG ${e.turn}: ${e.action}${e.event?`\n  ⚡ EREIGNIS: ${e.event}`:""}`).join("\n\n")}\n\n${outcome?"ERGEBNIS: "+(outcome==="v"?"EINGENOMMEN ✅":"GEHALTEN ❌"):"(laufend)"}`;
    const blob=new Blob([txt],{type:"text/plain"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`belagerung-${castle.id}.txt`;a.click();
  };

  const qas=["Ich lasse Bogenschützen auf die Mauern feuern","Ich unterbreche alle Versorgungswege","Ich setze Belagerungsmaschinen auf die Schwachstelle an","Ich schicke Spione um verborgene Eingänge zu finden","Ich greife bei Nacht und Nebel an","Ich biete Kapitulation gegen freien Abzug an","Ich baue eine Belagerungsrampe","Ich versuche den Kommandanten zu ermorden"];

  return(
    <div>
      <div style={{display:"flex",gap:"6px",marginBottom:"10px"}}>
        <div style={{flex:1,padding:"9px 12px",background:"rgba(130,35,8,.1)",border:"1px solid rgba(130,35,8,.22)",borderRadius:"4px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:"12px",color:"#cc5533",letterSpacing:"2px",marginBottom:"1px"}}>🎭 BELAGERUNG</div><div style={{fontSize:"14px",color:"#7a5040"}}>{castle.defender||"Burgherr"}{general&&` vs. ${general.name}`}</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:"18px",fontWeight:"bold",color:"#c9a84c"}}>{turn}</div><div style={{fontSize:"11px",color:"#9a8a68"}}>ZUG</div></div>
        </div>
        <button onClick={()=>setShowJournal(j=>!j)} style={{padding:"9px 11px",background:showJournal?"rgba(201,168,76,0.1)":"rgba(255,255,255,0.02)",border:`1px solid ${showJournal?"rgba(201,168,76,0.25)":"rgba(255,255,255,0.05)"}`,color:showJournal?"#c9a84c":"#3a2a14",borderRadius:"4px",cursor:"pointer",fontSize:"14px"}}>
          📖 {journal.length}
        </button>
        {journal.length>0&&<button onClick={exportLog} style={{padding:"9px 11px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",color:"#b09a70",borderRadius:"4px",cursor:"pointer",fontSize:"14px"}}>⬇️</button>}
      </div>

      {ev&&<div style={{padding:"9px 12px",marginBottom:"9px",background:"rgba(170,110,15,0.13)",border:"1px solid rgba(170,110,15,.3)",borderRadius:"4px",animation:"fadeIn .2s ease",display:"flex",gap:"8px",alignItems:"center"}}>
        <span style={{fontSize:"18px"}}>{ev.e}</span>
        <div><div style={{fontSize:"12px",letterSpacing:"2px",color:"#c9a84c",marginBottom:"1px"}}>{ev.t}</div><div style={{fontSize:"13px",color:"#7a6038"}}>{ev.txt}</div></div>
      </div>}

      {showJournal&&journal.length>0&&<div style={{marginBottom:"9px",padding:"10px",background:"rgba(0,0,0,0.35)",border:"1px solid rgba(201,168,76,0.1)",borderRadius:"4px",maxHeight:"160px",overflowY:"auto"}}>
        {journal.map((e,i)=><div key={i} style={{padding:"3px 0",borderBottom:"1px solid rgba(255,255,255,0.02)",fontSize:"13px",color:"#cbb888",display:"flex",gap:"6px"}}>
          <span style={{color:"#9a8a68",flexShrink:0}}>#{e.turn}</span><span style={{flex:1}}>{e.action}</span>
          {e.event&&<span style={{color:"#c9a84c",flexShrink:0}}>{e.event}</span>}
        </div>)}
      </div>}

      {outcome&&<div style={{marginBottom:"9px",animation:"fadeIn 0.3s ease"}}>
        {/* Result badge */}
        <div style={{padding:"12px 14px",textAlign:"center",
          background:outcome==="v"?"rgba(25,75,15,.18)":"rgba(90,15,8,.18)",
          border:`1px solid ${outcome==="v"?"rgba(40,110,20,.32)":"rgba(120,20,10,.32)"}`,
          borderRadius:"5px 5px 0 0",borderBottom:"none"}}>
          <div style={{fontSize:"22px",marginBottom:"3px"}}>{outcome==="v"?"🏴":"🛡️"}</div>
          <div style={{fontSize:"14px",fontWeight:"bold",color:outcome==="v"?"#8aaa68":"#cc5544"}}>
            {outcome==="v"?"BURG EINGENOMMEN!":"BURG GEHALTEN!"}
          </div>
          <div style={{fontSize:"12px",color:"#b09a70",marginTop:"2px"}}>
            {turn} Züge · {castle.name} · {defType.emoji} {defType.label}
          </div>
          <button onClick={reset}
            style={{marginTop:"8px",padding:"5px 13px",background:"rgba(201,168,76,0.09)",
              border:"1px solid rgba(201,168,76,0.22)",color:"#c9a84c",
              borderRadius:"3px",cursor:"pointer",fontSize:"12px"}}>
            ↺ Neu starten
          </button>
        </div>

        {/* Chronicle panel */}
        <div style={{padding:"13px 15px",background:"rgba(10,7,3,0.6)",
          border:"1px solid rgba(201,168,76,0.1)",borderTop:"1px solid rgba(201,168,76,0.06)",
          borderRadius:"0 0 5px 5px"}}>
          <div style={{fontSize:"10px",color:"#c9a84c",letterSpacing:"2px",marginBottom:"8px"}}>
            📜 CHRONIK DER BELAGERUNG
          </div>
          {chronicleLoading&&(
            <div style={{display:"flex",gap:"6px",alignItems:"center",color:"#5a4a28",fontSize:"12px"}}>
              <div style={{width:"10px",height:"10px",borderRadius:"50%",border:"1.5px solid #c9a84c",borderTopColor:"transparent",animation:"spin 0.8s linear infinite"}}/>
              Chronist schreibt...
            </div>
          )}
          {chronicle&&(
            <div style={{fontSize:"13px",color:"#9a8a68",lineHeight:1.85,fontStyle:"italic",
              whiteSpace:"pre-line",borderLeft:"2px solid rgba(201,168,76,0.15)",paddingLeft:"12px"}}>
              {chronicle}
            </div>
          )}
        </div>
      </div>}

      <div style={{height:"310px",overflowY:"auto",marginBottom:"9px"}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",gap:"6px",marginBottom:"8px",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
            {m.role==="assistant"&&<div style={{width:"20px",height:"20px",borderRadius:"50%",flexShrink:0,background:"rgba(130,35,8,.2)",border:"1px solid rgba(130,35,8,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",marginTop:"2px"}}>🛡</div>}
            <div style={{maxWidth:"88%",padding:"6px 10px",background:m.role==="user"?"rgba(201,168,76,0.06)":m.type==="sys"?"rgba(90,45,8,0.14)":"rgba(255,255,255,0.02)",border:`1px solid ${m.role==="user"?"rgba(201,168,76,0.13)":m.type==="sys"?"rgba(130,60,12,.2)":"rgba(255,255,255,0.04)"}`,borderRadius:m.role==="user"?"9px 9px 3px 9px":"9px 9px 9px 3px",fontSize:"14px",color:m.role==="user"?"#e8d8b0":"#7a6a50",lineHeight:1.75}}>
              {m.text.split("**").map((p,j)=>j%2===1?<strong key={j} style={{color:m.role==="user"?"#c9a84c":"#b89860"}}>{p}</strong>:<span key={j}>{p}</span>)}
            </div>
          </div>
        ))}
        {loading&&<div style={{display:"flex",gap:"6px"}}><div style={{width:"20px",height:"20px",borderRadius:"50%",background:"rgba(130,35,8,.2)",border:"1px solid rgba(130,35,8,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px"}}>🛡</div><div style={{padding:"6px 10px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"9px 9px 9px 3px",display:"flex",gap:"3px",alignItems:"center"}}>{[0,1,2].map(i=><div key={i} style={{width:"4px",height:"4px",borderRadius:"50%",background:"#c9a84c",animation:`bounce 1.2s ease infinite`,animationDelay:`${i*.2}s`}}/>)}</div></div>}
        <div ref={bot}/>
      </div>

      {!outcome&&<>
        {/* Ability animation flash */}
        {abilityAnim&&(
          <div style={{padding:"10px 14px",marginBottom:"8px",
            background:"linear-gradient(135deg,rgba(201,168,76,0.12),rgba(150,100,20,0.08))",
            border:"1px solid rgba(201,168,76,0.35)",borderRadius:"5px",
            animation:"fadeIn 0.2s ease",textAlign:"center"}}>
            <div style={{fontSize:"20px",marginBottom:"3px"}}>{abilityAnim.emoji}</div>
            <div style={{fontSize:"12px",fontWeight:"bold",color:"#c9a84c",letterSpacing:"1px"}}>{abilityAnim.name}</div>
            <div style={{fontSize:"11px",color:"#8a7a50",marginTop:"2px",fontStyle:"italic"}}>{abilityAnim.effect.slice(0,80)}...</div>
          </div>
        )}
        {/* General ability button — one-time use */}
        {general?.ability&&(
          <button onClick={useAbility} disabled={abilityUsed||loading}
            style={{width:"100%",marginBottom:"7px",padding:"8px 12px",
              background:abilityUsed?"rgba(255,255,255,0.02)":"rgba(201,168,76,0.08)",
              border:`1px solid ${abilityUsed?"rgba(255,255,255,0.05)":"rgba(201,168,76,0.3)"}`,
              color:abilityUsed?"#3a2a14":"#c9a84c",
              borderRadius:"5px",cursor:abilityUsed?"not-allowed":"pointer",
              display:"flex",gap:"10px",alignItems:"center",transition:"all 0.15s"}}>
            <span style={{fontSize:"18px",opacity:abilityUsed?0.3:1}}>{general.ability.emoji}</span>
            <div style={{flex:1,textAlign:"left"}}>
              <div style={{fontSize:"12px",fontWeight:"bold"}}>
                {abilityUsed?"✓ Bereits eingesetzt":general.ability.name}
              </div>
              <div style={{fontSize:"10px",opacity:0.7,marginTop:"1px"}}>
                {abilityUsed?"Einmalige Fähigkeit verbraucht":general.ability.desc.slice(0,55)+"…"}
              </div>
            </div>
            {!abilityUsed&&<div style={{fontSize:"10px",color:"#8a6a30",padding:"2px 6px",
              background:"rgba(201,168,76,0.1)",borderRadius:"8px",whiteSpace:"nowrap"}}>
              ⚡ EINMALIG
            </div>}
          </button>
        )}
        <div style={{display:"flex",gap:"3px",flexWrap:"wrap",marginBottom:"6px"}}>{qas.map((q,i)=><button key={i} onClick={()=>setInput(q)} style={{fontSize:"12px",padding:"2px 7px",background:"rgba(201,168,76,0.03)",border:"1px solid rgba(201,168,76,0.09)",color:"#8a7a60",borderRadius:"8px",cursor:"pointer"}}>{q.slice(0,32)}…</button>)}</div>
        <div style={{display:"flex",gap:"5px"}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Dein Angriffszug…" style={{flex:1,padding:"7px 10px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(201,168,76,0.13)",borderRadius:"4px",color:"#e8d8b0",fontSize:"14px",outline:"none",fontFamily:"inherit"}}/>
          <button onClick={send} disabled={loading||!input.trim()} style={{padding:"7px 12px",background:input.trim()&&!loading?"rgba(130,35,8,.18)":"rgba(255,255,255,.02)",border:`1px solid ${input.trim()&&!loading?"rgba(130,35,8,.36)":"rgba(255,255,255,.05)"}`,color:input.trim()&&!loading?"#cc5533":"#1a0e08",borderRadius:"4px",cursor:"pointer",fontSize:"13px"}}>⚔</button>
        </div>
      </>}
    </div>
  );
}

// ── Siege Simulator ────────────────────────────────────────────────────────
// ── Animated Siege View ───────────────────────────────────────────────────
function AnimatedSiegeView({result,alloc,castle}){
  const ac=castle.theme.accent;
  const W=280,H=158,CX=140,CY=78;
  const ok=result?.success;
  const hasInf=(alloc?.soldiers||0)>=2;
  const hasArch=(alloc?.archers||0)>=2;
  const hasSiege=(alloc?.siege||0)>=2;
  const hasMin=(alloc?.miners||0)>=1;
  const hasCav=(alloc?.cavalry||0)>=2;
  const hasArt=(alloc?.artillery||0)>=1;
  // animation speed by rating
  const spd=result?.rating>=7?1.4:result?.rating>=4?1.8:2.4;
  return(
    <div style={{marginBottom:"10px",borderRadius:"6px",overflow:"hidden",
      border:`1px solid ${ok?"rgba(35,90,18,0.28)":"rgba(105,18,10,0.28)"}`,
      boxShadow:`0 2px 16px rgba(0,0,0,0.5)`}}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",display:"block",maxHeight:"158px"}}>
        <defs>
          <radialGradient id="savbg" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#1c1006"/>
            <stop offset="100%" stopColor="#050302"/>
          </radialGradient>
          <radialGradient id="savglow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor={ac} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={ac} stopOpacity="0"/>
          </radialGradient>
          <style>{`
            @keyframes sav_ml{0%{transform:translateX(-64px);opacity:0}15%{opacity:1}80%{opacity:1}100%{transform:translateX(0);opacity:.2}}
            @keyframes sav_mr{0%{transform:translateX(64px);opacity:0}15%{opacity:1}80%{opacity:1}100%{transform:translateX(0);opacity:.2}}
            @keyframes sav_mt{0%{transform:translateY(-44px);opacity:0}15%{opacity:1}80%{opacity:1}100%{transform:translateY(0);opacity:.2}}
            @keyframes sav_mb{0%{transform:translateY(44px);opacity:0}15%{opacity:1}80%{opacity:1}100%{transform:translateY(0);opacity:.2}}
            @keyframes sav_flash{0%,100%{opacity:0}50%{opacity:.85}}
            @keyframes sav_arr{0%{opacity:0;transform:translate(-32px,18px)}45%{opacity:1}100%{opacity:0;transform:translate(22px,-12px)}}
            @keyframes sav_dust{0%,100%{opacity:0;transform:scale(.5)}50%{opacity:.4;transform:scale(1)}}
            @keyframes sav_breach{0%,65%{opacity:0}78%{opacity:1}100%{opacity:.7}}
            @keyframes sav_retreat{0%,65%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(28px,8px)}}
            @keyframes sav_pulse{0%,100%{r:4}50%{r:6}}
            @keyframes sav_canon{0%{opacity:0;transform:scale(.4)}20%{opacity:1;transform:scale(1)}80%{opacity:.6}100%{opacity:0;transform:scale(1.8)}}
          `}</style>
        </defs>
        {/* Ground */}
        <rect width={W} height={H} fill="url(#savbg)"/>
        <rect width={W} height={H} fill="url(#savglow)"/>
        {/* Terrain texture */}
        {[20,50,80,110,140].map(y=>(
          <line key={y} x1={10} y1={y} x2={W-10} y2={y} stroke={`${ac}07`} strokeWidth="0.4"/>
        ))}
        {/* ── Castle silhouette ── */}
        {/* Outer moat hint */}
        <ellipse cx={CX} cy={CY} rx={74} ry={56} fill="none" stroke={`${ac}14`} strokeWidth="0.6" strokeDasharray="2,5"/>
        {/* Outer wall */}
        <ellipse cx={CX} cy={CY} rx={56} ry={42} fill={`${ac}07`} stroke={`${ac}44`} strokeWidth="2"/>
        {/* Wall towers */}
        {[0,1,2,3,4,5,6,7].map(i=>{
          const a=(i/8)*Math.PI*2;
          return <rect key={i} x={CX+56*Math.cos(a)-4} y={CY+42*Math.sin(a)-4}
            width={8} height={8} rx={1} fill={`${ac}1a`} stroke={`${ac}55`} strokeWidth="1"/>;
        })}
        {/* Inner wall */}
        <ellipse cx={CX} cy={CY} rx={34} ry={26} fill={`${ac}10`} stroke={`${ac}66`} strokeWidth="1.5"/>
        {/* Keep */}
        <rect x={CX-12} y={CY-11} width={24} height={22} rx={2}
          fill={`${ac}16`} stroke={`${ac}88`} strokeWidth="2"/>
        <rect x={CX-4} y={CY-11} width={8} height={7} rx={1}
          fill={`${ac}28`} stroke={`${ac}66`} strokeWidth="0.8"/>

        {/* ── Attackers ── */}
        {/* Infantry left */}
        {hasInf&&[0,1,2,3,4].map(i=>(
          <rect key={`il${i}`} x={CX-124+i*6} y={CY-10+i*5} width={7} height={11} rx={1}
            fill="#cc4433" stroke="#ff5544" strokeWidth="0.6"
            style={{animation:`sav_ml ${spd}s ${i*0.14}s infinite ease-in`,
              transformOrigin:`${CX-124+i*6}px ${CY}px`}}/>
        ))}
        {/* Infantry right */}
        {hasInf&&[0,1,2,3,4].map(i=>(
          <rect key={`ir${i}`} x={CX+117-i*6} y={CY-10+i*5} width={7} height={11} rx={1}
            fill="#cc4433" stroke="#ff5544" strokeWidth="0.6"
            style={{animation:`sav_mr ${spd}s ${i*0.14+0.35}s infinite ease-in`,
              transformOrigin:`${CX+117-i*6}px ${CY}px`}}/>
        ))}
        {/* Cavalry — fast from right */}
        {hasCav&&[0,1,2].map(i=>(
          <ellipse key={`cv${i}`} cx={CX+126-i*8} cy={CY-18+i*12} rx={9} ry={5}
            fill="#dd5522" stroke="#ff6633" strokeWidth="0.8"
            style={{animation:`sav_mr ${spd*0.65}s ${i*0.22}s infinite ease-in`,
              transformOrigin:`${CX+126-i*8}px ${CY-18+i*12}px`}}/>
        ))}
        {/* Siege machines from bottom */}
        {hasSiege&&[0,1].map(i=>(
          <g key={`sm${i}`}
            style={{animation:`sav_mb ${spd*1.6}s ${i*0.7}s infinite linear`,
              transformOrigin:`${CX-40+i*80}px ${CY+100}px`}}>
            <rect x={CX-52+i*80} y={CY+85} width={22} height={15} rx={2}
              fill="rgba(100,75,35,.65)" stroke="#c9a84c" strokeWidth="1.4"/>
            <rect x={CX-48+i*80} y={CY+80} width={14} height={7} rx={1}
              fill="rgba(80,58,28,.5)" stroke="#a88030" strokeWidth="1"/>
            <line x1={CX-48+i*80} y1={CY+80} x2={CX-38+i*80} y2={CY+68}
              stroke="#c9a84c" strokeWidth="1.8"/>
            <circle cx={CX-44+i*80} cy={CY+100} r={4} fill="none" stroke="#c9a84c" strokeWidth="1.2"/>
            <circle cx={CX-34+i*80} cy={CY+100} r={4} fill="none" stroke="#c9a84c" strokeWidth="1.2"/>
          </g>
        ))}
        {/* Arrows */}
        {hasArch&&[0,1,2,3,4,5].map(i=>(
          <line key={`ar${i}`}
            x1={CX-102+i*12} y1={CY+36-i*3}
            x2={CX-68+i*12} y2={CY+16-i*2}
            stroke="#c9a84c" strokeWidth="1.3" strokeDasharray="3,2"
            style={{animation:`sav_arr 1.6s ${i*0.18}s infinite ease-in`,
              transformOrigin:`${CX-102+i*12}px ${CY+36-i*3}px`}}/>
        ))}
        {/* Miners tunnel */}
        {hasMin&&(
          <path d={`M ${CX-90} ${CY+52} Q ${CX-38} ${CY+68} ${CX+10} ${CY+56}`}
            fill="none" stroke="#8b6914" strokeWidth="2.2" strokeDasharray="4,3"
            style={{animation:`sav_flash 1.8s 0.4s infinite`}}/>
        )}
        {/* Artillery flash */}
        {hasArt&&[0,1].map(i=>(
          <circle key={`at${i}`} cx={CX-110+i*220} cy={CY+20-i*10} r={8}
            fill="rgba(255,180,40,0.7)" stroke="rgba(255,220,80,0.9)" strokeWidth="0.5"
            style={{animation:`sav_canon 1.2s ${i*0.55}s infinite ease-out`}}/>
        ))}

        {/* ── Wall impacts ── */}
        {[0,1,2,3,4,5].map(i=>{
          const a=(i/6)*Math.PI*2;
          return(
            <circle key={`imp${i}`} cx={CX+56*Math.cos(a)} cy={CY+42*Math.sin(a)} r={5}
              fill="rgba(255,130,40,.55)" stroke="rgba(255,200,70,.7)" strokeWidth="0.5"
              style={{animation:`sav_flash 0.75s ${i*0.13}s infinite ease-out`}}/>
          );
        })}
        {/* Dust clouds */}
        {[0,1,2].map(i=>(
          <ellipse key={`ds${i}`} cx={CX-52+i*52} cy={CY+40}
            rx={14} ry={7} fill="rgba(140,100,60,.3)"
            style={{animation:`sav_dust 2s ${i*0.55}s infinite ease-in-out`}}/>
        ))}

        {/* ── Outcome layer ── */}
        {ok&&(
          <g style={{animation:`sav_breach ${spd*1.2}s 0s infinite ease`}}>
            <path d={`M ${CX+50} ${CY-14} L ${CX+40} ${CY+2} L ${CX+54} ${CY+12}`}
              stroke="#ff6633" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
            <circle cx={CX+48} cy={CY-2} r={4} fill="rgba(255,100,40,.6)"/>
            <line x1={CX+3} y1={CY-9} x2={CX+3} y2={CY-27} stroke="#cc3322" strokeWidth="2.2"/>
            <rect x={CX+3} y={CY-27} width={12} height={8} rx={1}
              fill="#cc1a0a" stroke="#ff3322" strokeWidth="0.6"/>
          </g>
        )}
        {!ok&&[0,1].map(i=>(
          <g key={`ret${i}`} style={{animation:`sav_retreat ${spd}s ${i*0.3}s infinite ease`,
            transformOrigin:`${CX+(i===0?-90:90)}px ${CY}px`}}>
            <rect x={CX+(i===0?-100:88)} y={CY-8} width={7} height={11} rx={1}
              fill="#664422" stroke="#885533" strokeWidth="0.6"/>
            <rect x={CX+(i===0?-108:94)} y={CY-4} width={7} height={11} rx={1}
              fill="#664422" stroke="#885533" strokeWidth="0.6"/>
          </g>
        ))}

        {/* Status bar */}
        <rect x={0} y={H-18} width={W} height={18} fill="rgba(0,0,0,.45)"/>
        <text x={CX} y={H-6} textAnchor="middle"
          fill={ok?`#5aaa42`:`#cc3322`} fontSize="8.5" fontFamily="serif" letterSpacing="1.5">
          {ok?"⚔️ FESTUNG GEBROCHEN":"🛡️ BELAGERUNG ABGESCHLAGEN"}
          {result?.daysElapsed?` · ${result.daysElapsed} TAGE`:""}
        </text>
      </svg>
    </div>
  );
}

function SiegeSimulator({castle,onScore,general,season}){
  const initAlloc=()=>Object.fromEntries(Object.keys(RES).map(k=>[k,0]));
  const [alloc,setAlloc]=useState(initAlloc);
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const used=Object.values(alloc).reduce((a,b)=>a+b,0);
  const change=(k,v)=>{const n=Math.max(0,Math.min(5,v));if(used-alloc[k]+n>TOTAL_RES)return;setAlloc(p=>({...p,[k]:n}));setResult(null);};
  const run=async()=>{
    if(used<3)return;setLoading(true);setResult(null);
    const ad=Object.entries(alloc).filter(([,v])=>v>0).map(([k,v])=>`${RES[k].l}:${v}`).join(", ");
    const genCtx=general?`\nGeneral: ${general.name} (${general.specialty}). Bonus: ${Object.entries(general.bonus).map(([k,v])=>`${k}+${v}`).join(",")}`:""
    const seasonCtx=season?`\nJahreszeit: ${season.name}. Boni: ${JSON.stringify(season.bonuses)}. Malus: ${JSON.stringify(season.penalties)}`:""
    try{
      const apiData=await callClaude({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:`Militärhistoriker & Spielleiter. BURG: ${castle.name} (${castle.era}). KONTEXT: ${castle.siegeCtx}. STÄRKEN: ${castle.strengths.join("; ")}. SCHWÄCHEN: ${castle.weaknesses.join("; ")}.${genCtx}${seasonCtx}\n\nSTRATEGIE: ${ad} (${used}/${TOTAL_RES} Punkte).\n\nNUR JSON:\n{"success":true/false,"title":"Titel","outcome":"1 Satz","phases":["Phase 1","Phase 2","Phase 3","Phase 4"],"keyMoment":"dramatischer Wendepunkt 2 Sätze","mistakes":["Fehler1","Fehler2"],"whatWorked":["Erfolg1","Erfolg2"],"historicalParallel":"Vergleich","generalBonus":"wie General half oder schadete","seasonEffect":"Jahreszeiten-Einfluss","rating":1-10,"daysElapsed":10-500}`}]});
      let r;
      if(!apiData){r=SIMULATOR_FALLBACKS[Math.floor(Math.random()*SIMULATOR_FALLBACKS.length)];}
      else{r=JSON.parse(apiData.content?.map(b=>b.text||"").join("").replace(/```json|```/g,"").trim());}
      setResult(r);
      if(onScore)onScore(castle.id,r.success,r.rating);
    }catch{setResult({success:false,title:"Fehler",outcome:"Verbindungsfehler",phases:[],keyMoment:"",mistakes:[],whatWorked:[],historicalParallel:"",rating:0,daysElapsed:0});}
    setLoading(false);
  };
  return(
    <div>
      <div style={{padding:"10px 13px",background:"rgba(130,60,8,.1)",border:"1px solid rgba(180,90,20,.22)",borderRadius:"6px",marginBottom:"12px",fontSize:"13px",color:"#b09060",lineHeight:1.75}}>
        <strong style={{color:"#c9a84c",display:"block",marginBottom:"3px",fontSize:"11px",letterSpacing:"2px"}}>⚔️ BELAGERUNGSSZENARIO · {TOTAL_RES} PUNKTE</strong>{castle.siegeCtx}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
        <span style={{fontSize:"11px",color:"#b09a72",letterSpacing:"2.5px",fontFamily:"'Cinzel',serif"}}>RESSOURCEN VERTEILEN</span>
        <span style={{fontSize:"15px",fontWeight:"bold",color:used===TOTAL_RES?"#8aaa68":"#c9a84c"}}>{used}/{TOTAL_RES}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"5px",marginBottom:"12px"}}>
        {Object.entries(RES).map(([k,r])=>{
          const seasonBonus=season?.bonuses?.[k]||0,seasonPen=season?.penalties?.[k]||0;
          const genBonus=general?.bonus?.[k]||0;
          return(
            <div key={k} style={{
              padding:"8px 10px",
              background:alloc[k]>0?`${r.c}0d`:"rgba(255,255,255,.022)",
              border:`1px solid ${alloc[k]>0?`${r.c}35`:"rgba(255,255,255,.06)"}`,
              borderRadius:"6px",
              transition:"all .15s ease",
            }}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                <div style={{fontSize:"12px",color:alloc[k]>0?r.c:"#7a6a58",fontWeight:alloc[k]>0?600:400}}>{r.i} {r.l}</div>
                <div style={{display:"flex",gap:"3px",alignItems:"center"}}>
                  {genBonus!==0&&<span style={{fontSize:"10px",color:genBonus>0?"#7acc55":"#ee5544",fontWeight:"bold"}}>{genBonus>0?"+":""}{genBonus}</span>}
                  {seasonBonus>0&&<span style={{fontSize:"10px",color:"#88dd44",fontWeight:"bold"}}>+{seasonBonus}</span>}
                  {seasonPen<0&&<span style={{fontSize:"10px",color:"#ee4433",fontWeight:"bold"}}>{seasonPen}</span>}
                  <div style={{fontSize:"14px",fontWeight:"bold",color:alloc[k]>0?r.c:"#6a5a48",minWidth:"14px",textAlign:"right"}}>{alloc[k]}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:"2px"}}>{[0,1,2,3,4,5].map(v=><button key={v} onClick={()=>change(k,v)} style={{flex:1,height:"11px",borderRadius:"3px",border:"none",cursor:"pointer",background:v<=alloc[k]?r.c:"rgba(255,255,255,0.06)",opacity:v<=alloc[k]?1:.3,transition:"all .1s"}}/>)}</div>
            </div>
          );
        })}
      </div>
      <button onClick={run} disabled={loading||used<3} style={{
        width:"100%",padding:"10px",fontSize:"13px",letterSpacing:"1.5px",fontWeight:600,
        background:used>=3&&!loading
          ?"linear-gradient(135deg,rgba(200,80,20,.22),rgba(160,50,10,.15))"
          :"rgba(255,255,255,.03)",
        border:`1px solid ${used>=3&&!loading?"rgba(220,100,40,.45)":"rgba(255,255,255,.06)"}`,
        color:used>=3&&!loading?"#ee8855":"#5a4a38",
        borderRadius:"6px",cursor:used>=3?"pointer":"not-allowed",
        transition:"all .2s ease",
        boxShadow:used>=3&&!loading?"0 4px 16px rgba(200,80,20,.2)":"none",
      }}>
        {loading?"⏳ Belagerung läuft…":"⚔️ BELAGERUNG STARTEN"}
      </button>
      {result&&<div style={{marginTop:"12px",padding:"12px",background:result.success?"rgba(22,70,12,.1)":"rgba(85,12,7,.1)",border:`1px solid ${result.success?"rgba(35,95,18,.22)":"rgba(105,18,10,.22)"}`,borderRadius:"4px"}}>
        <AnimatedSiegeView result={result} alloc={alloc} castle={castle}/>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
          <div><div style={{fontSize:"11px",letterSpacing:"2px",color:result.success?"#5aaa42":"#cc3322",marginBottom:"2px"}}>{result.success?"✅ ERFOLG":"❌ GESCHEITERT"}</div><div style={{fontSize:"12px",fontWeight:"bold",color:"#f0e0c0"}}>{result.title}</div>{result.daysElapsed&&<div style={{fontSize:"12px",color:"#b09a70",marginTop:"1px"}}>~{result.daysElapsed} Tage</div>}</div>
          <div style={{textAlign:"center"}}><div style={{fontSize:"22px",fontWeight:"bold",color:rCol(result.rating*10)}}>{result.rating}</div><div style={{fontSize:"11px",color:"#9a8a68"}}>/10</div></div>
        </div>
        <div style={{fontSize:"14px",color:"#c0a870",lineHeight:1.75,marginBottom:"8px"}}>{result.outcome}</div>
        {result.keyMoment&&<div style={{padding:"8px 10px",background:"rgba(0,0,0,.28)",borderLeft:"3px solid rgba(201,168,76,.4)",borderRadius:"3px",fontSize:"13px",color:"#d4bc88",lineHeight:1.8,marginBottom:"8px"}}>{result.keyMoment}</div>}
        {result.phases?.length>0&&<div style={{marginBottom:"8px"}}>{result.phases.map((p,i)=><div key={i} style={{fontSize:"13px",color:"#c8b080",padding:"3px 0",borderBottom:"1px solid rgba(255,255,255,.04)",display:"flex",gap:"6px"}}><span style={{color:"#c9a84c",flexShrink:0,fontWeight:"bold"}}>{i+1}.</span>{p}</div>)}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"8px"}}>
          {result.whatWorked?.length>0&&<div style={{padding:"8px",background:"rgba(40,100,20,.1)",border:"1px solid rgba(60,140,30,.2)",borderRadius:"4px"}}>
            <div style={{fontSize:"10px",color:"#70cc44",letterSpacing:"2px",marginBottom:"5px"}}>FUNKTIONIERTE</div>
            {result.whatWorked.map((w,i)=><div key={i} style={{fontSize:"12px",color:"#90cc68",padding:"2px 0"}}>✓ {w}</div>)}
          </div>}
          {result.mistakes?.length>0&&<div style={{padding:"8px",background:"rgba(100,20,12,.1)",border:"1px solid rgba(150,30,20,.2)",borderRadius:"4px"}}>
            <div style={{fontSize:"10px",color:"#ee6644",letterSpacing:"2px",marginBottom:"5px"}}>FEHLER</div>
            {result.mistakes.map((m,i)=><div key={i} style={{fontSize:"12px",color:"#cc7060",padding:"2px 0"}}>✗ {m}</div>)}
          </div>}
        </div>
        {result.generalBonus&&<div style={{fontSize:"12px",color:"#a09068",fontStyle:"italic",borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:"6px",marginBottom:"3px"}}>⚔️ {result.generalBonus}</div>}
        {result.seasonEffect&&<div style={{fontSize:"12px",color:"#80a068",fontStyle:"italic"}}>🌿 {result.seasonEffect}</div>}
        {result.historicalParallel&&<div style={{fontSize:"12px",color:"#b0a07a",fontStyle:"italic",marginTop:"5px"}}>📜 {result.historicalParallel}</div>}
      </div>}
    </div>
  );
}

// ── What-If ────────────────────────────────────────────────────────────────
function WhatIf({castle}){
  const [scen,setScen]=useState("");
  const [res,setRes]=useState(null);
  const [loading,setLoading]=useState(false);
  const presets=[
    `Was wäre wenn ${castle.name} die doppelte Garnison gehabt hätte?`,
    `Was wäre wenn ${castle.weaknesses[0]} nicht existiert hätte?`,
    `Was wäre wenn ${castle.name} 200 Jahre früher erbaut worden wäre?`,
    `Was wäre wenn der Angreifer Drachen gehabt hätte?`,
    `Was wäre wenn ${castle.name} am Meer statt an ihrem Standort gebaut worden wäre?`,
    `Was wäre wenn moderne Artillerie (19. Jh.) eingesetzt worden wäre?`,
    `Was wäre wenn die Verteidiger einen Ausfall gemacht und angegriffen hätten?`,
  ];
  const analyze=async()=>{
    if(!scen.trim())return;setLoading(true);setRes(null);
    try{
      const apiData=await callClaude({model:"claude-sonnet-4-20250514",max_tokens:800,messages:[{role:"user",content:`Kontrafaktischer Militärhistoriker.\nBURG: ${castle.name} (${castle.era}). HISTORISCH: ${castle.history}. STÄRKEN: ${castle.strengths.join("; ")}. SCHWÄCHEN: ${castle.weaknesses.join("; ")}.\n\nSZENARIO: ${scen}\n\nNUR JSON:\n{"likelihood":1-10,"outcome":"1 Satz","analysis":"3-4 Sätze kontrafaktische Analyse (Deutsch)","wouldHaveFallen":true/false,"keyFactor":"1 Satz","timeChange":"wäre früher/später gefallen: 1 Satz","historicalParallels":["Beispiel 1","Beispiel 2"],"confidence":"hoch/mittel/niedrig"}`}]});
      if(!apiData){
        setRes(getWhatIfFallback(scen, castle));
      }
      else{setRes(JSON.parse(apiData.content?.map(b=>b.text||"").join("").replace(/```json|```/g,"").trim()));}
    }catch{setRes(getWhatIfFallback(scen, castle));}
    setLoading(false);
  };
  return(
    <div>
      <div style={{padding:"9px 12px",background:"rgba(50,60,100,.08)",border:"1px solid rgba(70,80,140,.2)",borderRadius:"4px",marginBottom:"12px",fontSize:"14px",color:"#7a8ab0",lineHeight:1.7}}>
        <strong style={{color:"#8899cc",display:"block",marginBottom:"1px"}}>🌀 WAS WÄRE WENN…</strong>Kontrafaktische Analyse: Wie hätte sich die Geschichte geändert?
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"3px",marginBottom:"9px"}}>
        {presets.map((p,i)=><button key={i} onClick={()=>setScen(p)} style={{fontSize:"12px",padding:"4px 10px",background:scen===p?"rgba(136,153,204,.16)":"rgba(255,255,255,.04)",border:`1px solid ${scen===p?"rgba(136,153,204,.4)":"rgba(255,255,255,.08)"}`,color:scen===p?"#a0b0e0":"#8a8aaa",borderRadius:"9px",cursor:"pointer",transition:"all .15s"}}>{p.length>52?p.slice(0,50)+"…":p}</button>)}
      </div>
      <div style={{display:"flex",gap:"5px",marginBottom:"10px"}}>
        <input value={scen} onChange={e=>setScen(e.target.value)} onKeyDown={e=>e.key==="Enter"&&analyze()} placeholder="Eigenes Szenario…" style={{flex:1,padding:"7px 10px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(136,153,204,.18)",borderRadius:"4px",color:"#e8d8b0",fontSize:"14px",outline:"none",fontFamily:"inherit"}}/>
        <button onClick={analyze} disabled={loading||!scen.trim()} style={{padding:"7px 12px",background:scen.trim()&&!loading?"rgba(70,85,140,.2)":"rgba(255,255,255,.02)",border:`1px solid ${scen.trim()&&!loading?"rgba(70,85,140,.4)":"rgba(255,255,255,.05)"}`,color:scen.trim()&&!loading?"#8899cc":"#1a1a2a",borderRadius:"4px",cursor:"pointer",fontSize:"14px"}}>{loading?"⏳":"🌀"}</button>
      </div>
      {res&&<div style={{padding:"12px",background:"rgba(0,0,0,.3)",border:"1px solid rgba(136,153,204,.14)",borderRadius:"4px",animation:"fadeIn .25s ease"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"}}>
          <div><div style={{fontSize:"11px",letterSpacing:"2px",color:res.wouldHaveFallen?"#cc4433":"#5a9a42",marginBottom:"2px"}}>{res.wouldHaveFallen?"💀 WÄRE GEFALLEN":"🛡️ HÄTTE GEHALTEN"}</div><div style={{fontSize:"12px",fontWeight:"bold",color:"#e0d0b0"}}>{res.outcome}</div></div>
          <div style={{textAlign:"center",padding:"5px 9px",background:"rgba(136,153,204,.08)",border:"1px solid rgba(136,153,204,.14)",borderRadius:"3px"}}>
            <div style={{fontSize:"15px",fontWeight:"bold",color:"#8899cc"}}>{res.likelihood}</div>
            <div style={{fontSize:"11px",color:"#7a7a9a"}}>PLAUSIB.</div>
          </div>
        </div>
        <div style={{fontSize:"14px",color:"#9090b8",lineHeight:1.8,marginBottom:"8px",fontStyle:"italic",borderLeft:"3px solid rgba(136,153,204,.3)",paddingLeft:"9px"}}>{res.analysis}</div>
        {res.keyFactor&&<div style={{padding:"6px 9px",background:"rgba(136,153,204,.08)",border:"1px solid rgba(136,153,204,.16)",borderRadius:"3px",marginBottom:"7px",fontSize:"13px",color:"#9898c0"}}><strong style={{color:"#a0aedd"}}>Entscheidend:</strong> {res.keyFactor}</div>}
        {res.timeChange&&<div style={{fontSize:"12px",color:"#8080a0",marginBottom:"5px"}}>⏱ {res.timeChange}</div>}
        {res.historicalParallels?.length>0&&<div><div style={{fontSize:"11px",color:"#7a7a9a",letterSpacing:"2px",marginBottom:"3px"}}>PARALLELEN</div>{res.historicalParallels.map((p,i)=><div key={i} style={{fontSize:"12px",color:"#8888a8",padding:"2px 0",display:"flex",gap:"5px"}}><span style={{color:"#9090c0"}}>›</span>{p}</div>)}</div>}
      </div>}
    </div>
  );
}

// ── AI Advisor ─────────────────────────────────────────────────────────────
function AIAdvisor({castle}){
  const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [activeCategory,setActiveCategory]=useState("angriff");
  const bot=useRef(null);

  useEffect(()=>{
    setMsgs([{role:"assistant",text:`**${castle.name}** — Militärberater bereit.

${castle.desc}

**Stärkste Seite:** ${castle.strengths[0]}
**Kritische Schwachstelle:** ${castle.weaknesses[0]}

Wähle eine Kategorie oder stelle eine eigene Frage.`}]);
    setActiveCategory("angriff");
  },[castle.id]);
  useEffect(()=>{bot.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  const QS_CATEGORIES={
    angriff:{label:"⚔️ Angriff",qs:["Schnellster Weg zur Einnahme?","Welche Ressourcen brauche ich?","Wie nutze ich die Schwachstellen?","Wie lange dauert eine Belagerung?"]},
    verteid:{label:"🛡️ Verteidigung",qs:["Wie als Verteidiger reagieren?","Welche Stärken maximal nutzen?","Wie Moral hochhalten?","Notfallplan bei Mauerbruch?"]},
    history:{label:"📜 Geschichte",qs:["Was war der kritischste Moment?","Wer hat diese Burg erbaut?","Historische Parallelen?","Wie fiel sie wirklich?"]},
    analyse:{label:"📊 Analyse",qs:["Was hätte man besser gebaut?","Moderner Angriff heute?","Stärken im Detail?","Vergleich mit anderen Burgen?"]},
  };

  const send=async(text)=>{
    const um=(text||input).trim();
    if(!um||loading)return;
    setInput("");
    setMsgs(m=>[...m,{role:"user",text:um}]);
    setLoading(true);
    try{
      const apiData=await callClaude({
        model:"claude-sonnet-4-20250514",max_tokens:700,
        system:`Brillanter Militärstratege und Historiker. Analysiere "${castle.name}" (${castle.sub}, ${castle.era}, ${castle.loc}).
Stärken: ${castle.strengths.join("; ")}.
Schwächen: ${castle.weaknesses.join("; ")}.
Geschichte: ${castle.history}.
Fazit: ${castle.verdict}.
Bewertungen: Mauern ${castle.ratings.walls}, Position ${castle.ratings.position}, Versorgung ${castle.ratings.supply}, Garnison ${castle.ratings.garrison}, Moral ${castle.ratings.morale}.
Antworte präzise auf Deutsch, 120-180 Wörter, meinungsstark, historisch präzise. Nutze **Fettdruck** für Schlüsselaussagen.`,
        messages:[...msgs.filter((_,i)=>i>0).map(m=>({role:m.role,content:m.text})),{role:"user",content:um}]
      });
      const reply=apiData
        ?apiData.content?.map(b=>b.text||"").join("")||"Keine Antwort."
        :getAdvisorFallback(um,castle);
      setMsgs(m=>[...m,{role:"assistant",text:reply}]);
    }catch{
      setMsgs(m=>[...m,{role:"assistant",text:getAdvisorFallback(um,castle)}]);
    }
    setLoading(false);
  };

  const ac=castle.theme.accent;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
      {/* Category tabs */}
      <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
        {Object.entries(QS_CATEGORIES).map(([key,cat])=>(
          <button key={key} onClick={()=>setActiveCategory(key)}
            style={{padding:"5px 10px",fontSize:"11px",
              background:activeCategory===key?`${ac}15`:"rgba(255,255,255,0.02)",
              border:`1px solid ${activeCategory===key?ac+"44":"rgba(255,255,255,0.06)"}`,
              color:activeCategory===key?ac:"#6a5a38",borderRadius:"12px",cursor:"pointer"}}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div style={{height:"280px",overflowY:"auto",display:"flex",flexDirection:"column",gap:"8px"}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",gap:"6px",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
            {m.role==="assistant"&&(
              <div style={{width:"22px",height:"22px",borderRadius:"50%",flexShrink:0,
                background:`${ac}18`,border:`1px solid ${ac}38`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:"12px",marginTop:"2px"}}>⚔️</div>
            )}
            <div style={{maxWidth:"88%",padding:"8px 11px",
              background:m.role==="user"?`${ac}08`:"rgba(255,255,255,0.02)",
              border:`1px solid ${m.role==="user"?ac+"18":"rgba(255,255,255,0.05)"}`,
              borderRadius:m.role==="user"?"10px 10px 3px 10px":"10px 10px 10px 3px",
              fontSize:"13px",color:m.role==="user"?"#e8d8b0":"#7a6a52",lineHeight:1.8}}>
              {m.text.split("**").map((p,j)=>j%2===1
                ?<strong key={j} style={{color:ac}}>{p}</strong>
                :<span key={j}>{p.split("\n").map((l,k)=><span key={k}>{l}{k<p.split("\n").length-1&&<br/>}</span>)}</span>
              )}
            </div>
          </div>
        ))}
        {loading&&(
          <div style={{display:"flex",gap:"6px"}}>
            <div style={{width:"22px",height:"22px",borderRadius:"50%",background:`${ac}18`,
              border:`1px solid ${ac}38`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px"}}>⚔️</div>
            <div style={{padding:"8px 11px",background:"rgba(255,255,255,0.02)",
              borderRadius:"10px 10px 10px 3px",display:"flex",gap:"3px",alignItems:"center"}}>
              {[0,1,2].map(i=><div key={i} style={{width:"4px",height:"4px",borderRadius:"50%",
                background:ac,animation:"bounce 1.2s ease infinite",animationDelay:`${i*.2}s`}}/>)}
            </div>
          </div>
        )}
        <div ref={bot}/>
      </div>

      {/* Quick questions for active category */}
      <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
        {QS_CATEGORIES[activeCategory].qs.map((q,i)=>(
          <button key={i} onClick={()=>send(q)}
            style={{fontSize:"11px",padding:"3px 8px",
              background:`${ac}07`,border:`1px solid ${ac}18`,
              color:"#9a8a68",borderRadius:"8px",cursor:"pointer"}}>
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{display:"flex",gap:"5px"}}>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&send()}
          placeholder="Eigene Frage stellen…"
          style={{flex:1,padding:"7px 11px",background:"rgba(255,255,255,.04)",
            border:`1px solid ${ac}1a`,borderRadius:"5px",
            color:"#e8d8b0",fontSize:"13px",outline:"none",fontFamily:"inherit"}}/>
        <button onClick={()=>send()} disabled={loading||!input.trim()}
          style={{padding:"7px 13px",
            background:input.trim()&&!loading?`${ac}16`:"rgba(255,255,255,.02)",
            border:`1px solid ${input.trim()&&!loading?ac+"32":"rgba(255,255,255,.05)"}`,
            color:input.trim()&&!loading?ac:"#3a2a14",
            borderRadius:"5px",cursor:"pointer",fontSize:"13px"}}>⚔</button>
      </div>
    </div>
  );
}

// ── Builder ────────────────────────────────────────────────────────────────
// Export Burg-Steckbrief als HTML-Datei
function exportBuildCard({name,res,sel,tD,tS,tP,activeSyns,spent}){
  const els=sel.map(id=>BUILDER.find(b=>b.id===id)).filter(Boolean);
  const stars="⭐".repeat(res.stars||3);
  const scoreColor=res.overallRating>=80?"#6aaa50":res.overallRating>=60?"#c9a84c":"#cc5533";
  const html=`<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<title>${name} — Belagerungs-Atlas Steckbrief</title>
<style>
  body{margin:0;padding:0;background:#060504;font-family:'Palatino Linotype',Georgia,serif;color:#e8dcc8}
  .card{width:480px;margin:20px auto;background:linear-gradient(135deg,#0e0a06,#050302);border:1px solid rgba(201,168,76,0.25);border-radius:12px;overflow:hidden}
  .header{padding:20px 24px;border-bottom:1px solid rgba(201,168,76,0.1);display:flex;justify-content:space-between;align-items:center}
  .badge{font-size:10px;color:#6a5a38;letter-spacing:2px;margin-bottom:6px}
  .title{font-size:22px;font-weight:bold;color:#f0e6cc}
  .score{font-size:36px;font-weight:bold;color:${scoreColor};text-align:center}
  .stars{font-size:16px;color:#c9a84c;text-align:center}
  .section{padding:14px 24px;border-bottom:1px solid rgba(255,255,255,0.03)}
  .label{font-size:10px;letter-spacing:2px;color:#6a5a38;margin-bottom:8px}
  .bars{display:grid;gap:6px}
  .bar-row{display:flex;align-items:center;gap:8px;font-size:12px}
  .bar-track{flex:1;height:5px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden}
  .bar-fill{height:100%;border-radius:3px}
  .italic{font-style:italic;font-size:13px;color:#c0a878;line-height:1.8;border-left:3px solid rgba(201,168,76,0.2);padding-left:10px}
  .items{display:flex;flex-wrap:wrap;gap:5px}
  .item{padding:3px 8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;font-size:11px;color:#7a6a48}
  .syn{padding:6px 10px;background:rgba(106,170,80,0.06);border:1px solid rgba(106,170,80,0.2);border-left:3px solid #6aaa50;border-radius:4px;font-size:11px;color:#4a8a30;margin-bottom:4px}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .list-item{font-size:12px;padding:2px 0;line-height:1.6}
  .footer{padding:12px 24px;font-size:10px;color:#4a3a20;text-align:center;letter-spacing:1px}
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div>
      <div class="badge">🏰 BELAGERUNGS-ATLAS · BAUMEISTER</div>
      <div class="title">${name}</div>
      <div style="font-size:11px;color:#8a7a58;margin-top:4px">${res.era||"Mittelalter"} · Budget: ${spent}/24 Gold</div>
    </div>
    <div>
      <div class="score">${res.overallRating}</div>
      <div class="stars">${stars}</div>
    </div>
  </div>

  <div class="section">
    <div class="label">KAMPFWERTE</div>
    <div class="bars">
      ${[["🧱 Verteidigung",tD],["🍖 Versorgung",tS],["⛰️ Position",tP]].map(([l,v])=>`
      <div class="bar-row">
        <span style="width:110px;color:#8a7a58">${l}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${v}%;background:${v>=70?"#6aaa50":v>=50?"#c9a84c":"#cc5533"}"></div></div>
        <span style="font-weight:bold;color:${v>=70?"#6aaa50":v>=50?"#c9a84c":"#cc5533"};width:28px;text-align:right">${v}</span>
      </div>`).join("")}
    </div>
  </div>

  ${res.flavorText?`<div class="section"><div class="italic">"${res.flavorText}"</div></div>`:""}

  ${activeSyns.length>0?`<div class="section">
    <div class="label">⚡ AKTIVE SYNERGIEN</div>
    ${activeSyns.map(s=>`<div class="syn">${s.emoji} <strong>${s.name}</strong> — ${s.desc}</div>`).join("")}
  </div>`:""}

  <div class="section">
    <div class="two-col">
      <div>
        <div class="label">✅ STÄRKEN</div>
        ${(res.strengths||[]).slice(0,3).map(s=>`<div class="list-item" style="color:#2a5018">✓ ${s}</div>`).join("")}
      </div>
      <div>
        <div class="label">⚠ SCHWÄCHEN</div>
        ${(res.weaknesses||[]).slice(0,3).map(w=>`<div class="list-item" style="color:#4a1810">✗ ${w}</div>`).join("")}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="label">🏗️ ELEMENTE (${els.length})</div>
    <div class="items">
      ${els.map(e=>`<span class="item">${e.i} ${e.l}</span>`).join("")}
    </div>
  </div>

  ${res.historicalComp?`<div class="section"><div style="font-size:12px;color:#9a8a68;font-style:italic">📜 ${res.historicalComp}</div></div>`:""}

  <div class="footer">BELAGERUNGS-ATLAS · belagerungs-atlas.vercel.app</div>
</div>
</body>
</html>`;

  const blob=new Blob([html],{type:"text/html"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`${name.replace(/\s+/g,"-").toLowerCase()}-steckbrief.html`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function CastleBuilder(){
  const [sel,setSel]=useState([]);const [res,setRes]=useState(null);const [loading,setLoading]=useState(false);const [name,setName]=useState("Meine Burg");
  const spent=sel.reduce((a,id)=>{const e=BUILDER.find(b=>b.id===id);return a+(e?.cost||0);},0);
  const rem=BUILDER_BUDGET-spent;
  const synBonuses=getSynergyBonuses(sel);
  const activeSyns=getActiveSynergies(sel);
  const tD=Math.min(100,sel.reduce((a,id)=>{const e=BUILDER.find(b=>b.id===id);return a+(e?.def||0);},0)+(synBonuses.def||0));
  const tS=Math.min(100,sel.reduce((a,id)=>{const e=BUILDER.find(b=>b.id===id);return a+(e?.sup||0);},0)+(synBonuses.sup||0));
  const tP=Math.min(100,sel.reduce((a,id)=>{const e=BUILDER.find(b=>b.id===id);return a+(e?.pos||0);},0)+(synBonuses.pos||0));
  const tM=Math.min(100,(synBonuses.mor||0));
  const toggle=(id)=>{const e=BUILDER.find(b=>b.id===id);if(sel.includes(id)){setSel(s=>s.filter(x=>x!==id));setRes(null);}else if(rem>=(e?.cost||0)){setSel(s=>[...s,id]);setRes(null);}};
  const analyze=async()=>{
    if(sel.length<2)return;setLoading(true);setRes(null);
    const els=sel.map(id=>BUILDER.find(b=>b.id===id)).filter(Boolean);
    const overall=Math.round((tD+tS+tP)/3);

    // Rich local fallback — always works without API
    const localFallback=()=>{
      const hasWater=sel.includes("moat")||sel.includes("cistern");
      const hasTower=sel.includes("towers")||sel.includes("keep");
      const hasWalls=sel.includes("walls_thick")||sel.includes("walls_thin");
      const hasDragon=sel.includes("dragon");
      const hasMagic=sel.includes("magic_ward");
      const hasArtillery=sel.includes("artillery");
      const hasNavy=sel.includes("navy");

      const strengths=els.slice(0,4).map(e=>e.l+" ("+e.desc+")");
      const missing=[];
      if(!hasWater) missing.push("Wasserschutz (Graben/Zisternen fehlen)");
      if(!hasTower) missing.push("Türme für Weitblick fehlen");
      if(!hasWalls) missing.push("Keine soliden Mauern");
      if(tS<30) missing.push("Versorgung kritisch — Hunger ist die größte Gefahr");
      if(missing.length===0) missing.push("Nahrungsversorgung bei langer Belagerung","Verrat von innen");

      // Historical comparison
      const historicals=[
        {cond:tD>=80&&tP>=70,comp:"Erinnert an den Krak des Chevaliers — konzentrische Stärke und Positionsvorteil."},
        {cond:hasWater&&tD>=60,comp:"Ähnelt Caerphilly — Wasserverteidigung als Hauptmerkmal."},
        {cond:tP>=85,comp:"Erinnert an Masada oder San Leo — die Position selbst ist die stärkste Waffe."},
        {cond:hasDragon||hasMagic,comp:"Erinnert an Barad-dûr oder Isengard — übernatürliche Elemente dominieren."},
        {cond:hasArtillery,comp:"Ähnelt der Marienburg nach 1410 — Kanonen-Bastionen als Modernisierung."},
        {cond:tS>=80,comp:"Wie der Krak mit seinen Zisternen — Selbstversorgung für Jahre."},
        {cond:tD<40,comp:"Ähnelt frühen Motte-and-Bailey-Burgen — mehr Wohnstätte als Festung."},
      ];
      const match=historicals.find(h=>h.cond)||{comp:`Eine eigenständige Konstruktion — ${overall>=70?"beeindruckend":"noch ausbaufähig"}.`};

      // Flavor text based on composition
      let flavor;
      if(hasDragon) flavor=`${name} braucht keine Mauern — der Drache über den Zinnen ist Abschreckung genug. Doch was geschieht wenn er schläft?`;
      else if(tP>=80&&tD>=80) flavor=`${name} steht wie ein Fels in der Brandung — wer diese Mauern sieht, zweifelt bereits am Angriff.`;
      else if(tS>=70&&tD>=60) flavor=`${name} kann jahrelang aushalten. Hunger und Zeit sind die wahren Verbündeten dieser Festung.`;
      else if(tD>=80) flavor=`${name} — massive Verteidigung, aber eine Schwäche in der Versorgung könnte alles zunichte machen.`;
      else flavor=`${name} — solide gebaut, doch jede Burg hat ihren Schwachpunkt. Wer ihn findet, findet den Schlüssel.`;

      // Best attack vector
      let bestAttack;
      if(!hasWater) bestAttack="Direktsturm auf die Hauptmauer — kein Graben schützt.";
      else if(tS<40) bestAttack="Vollständige Einkreisung — Hunger in Wochen.";
      else if(!hasWalls) bestAttack="Belagerungsmaschinen direkt an die Tore — keine dicken Mauern.";
      else bestAttack="Geduld: Diese Burg durch Versorgungsblockade aushungern. Kein Direktangriff lohnt sich.";

      // Improvements
      const improvements=[];
      if(!hasWalls) improvements.push("Dicke Mauern hinzufügen (+25 Verteidigung)");
      if(!hasWater) improvements.push("Wassergraben oder Zisternen — Schlüssel für lange Belagerungen");
      if(!hasTower) improvements.push("Wachtürme eliminieren tote Winkel");
      if(tS<50) improvements.push("Granarium oder Hospital für Versorgungsbonus");
      if(improvements.length===0) improvements.push("Diplomatische Verbindungen als weichen Schutz","Söldner als Reserve");

      return{
        overallRating:overall,
        stars:Math.max(1,Math.min(5,Math.ceil(overall/20))),
        strengths:strengths.slice(0,3),
        weaknesses:missing.slice(0,3),
        bestAttack,
        historicalComp:match.comp,
        improvements:improvements.slice(0,3),
        flavorText:flavor,
        era:hasArtillery?"15.–16. Jahrhundert":hasDragon||hasMagic?"Fantasy-Zeitalter":tP>=80?"Hochmittelalter (12.–13. Jh.)":"Mittelalter",
        worstVulnerability:missing[0]||"Versorgungsengpass bei langer Belagerung",
        isLocalFallback:true,
      };
    };

    try{
      const apiData=await callClaude({model:"claude-sonnet-4-20250514",max_tokens:900,messages:[{role:"user",content:`Mittelalterlicher Militärarchitekt.\nBURG "${name}": ${els.map(e=>`${e.l}: ${e.desc}`).join("; ")}.\nBudget: ${spent}/${BUILDER_BUDGET}. Def:${tD} Ver:${tS} Pos:${tP}.\nNUR JSON:\n{"overallRating":1-100,"stars":1-5,"strengths":["s1","s2","s3"],"weaknesses":["w1","w2"],"bestAttack":"1-2 Sätze","historicalComp":"ähnliche Burg+Grund","improvements":["v1","v2"],"flavorText":"poetische Beschreibung 2 Sätze","era":"typische Epoche","worstVulnerability":"schlimmste Schwachstelle"}`}]});
      if(!apiData){ setRes(localFallback()); }
      else{ setRes(JSON.parse(apiData.content?.map(b=>b.text||"").join("").replace(/```json|```/g,"").trim())); }
    }catch{ setRes(localFallback()); }
    setLoading(false);
  };
  return(
    <div>
      <div style={{marginBottom:"10px",display:"flex",gap:"8px",alignItems:"center"}}>
        <input value={name} onChange={e=>setName(e.target.value)} style={{flex:1,padding:"7px 10px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(201,168,76,.16)",color:"#e8d8b0",fontSize:"13px",borderRadius:"4px",outline:"none",fontFamily:"inherit"}} placeholder="Name deiner Burg…"/>
        <div style={{padding:"5px 10px",background:"rgba(0,0,0,.28)",border:"1px solid rgba(255,255,255,.05)",borderRadius:"4px",fontSize:"14px",fontWeight:"bold",color:rem<=0?"#8aaa68":"#c9a84c",whiteSpace:"nowrap"}}>💰 {rem}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"5px",marginBottom:"9px"}}>
        {[{l:"Verteidigung",v:tD,b:synBonuses.def},{l:"Versorgung",v:tS,b:synBonuses.sup},{l:"Position",v:tP,b:synBonuses.pos}].map(s=>(
          <div key={s.l} style={{textAlign:"center",padding:"7px 4px",background:"rgba(255,255,255,.018)",border:"1px solid rgba(255,255,255,.03)",borderRadius:"4px"}}>
            <div style={{fontSize:"17px",fontWeight:"bold",color:rCol(s.v)}}>{s.v}</div>
            {s.b>0&&<div style={{fontSize:"10px",color:"#6aaa50"}}>+{s.b} Synergie</div>}
            <div style={{fontSize:"11px",color:"#9cb0de",letterSpacing:"1px",marginTop:"1px"}}>{s.l.toUpperCase()}</div>
          </div>
        ))}
      </div>
      {/* Active synergies */}
      {activeSyns.length>0&&(
        <div style={{marginBottom:"9px",display:"flex",flexDirection:"column",gap:"4px"}}>
          {activeSyns.map(s=>(
            <div key={s.id} style={{padding:"7px 10px",background:"rgba(106,170,80,0.06)",
              border:"1px solid rgba(106,170,80,0.2)",borderLeft:"3px solid #6aaa50",
              borderRadius:"4px",display:"flex",gap:"8px",alignItems:"center",animation:"fadeIn 0.2s ease"}}>
              <span style={{fontSize:"16px"}}>{s.emoji}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:"12px",fontWeight:"bold",color:"#6aaa50"}}>{s.name}</div>
                <div style={{fontSize:"11px",color:"#7acc4a",lineHeight:1.5}}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px",marginBottom:"9px",maxHeight:"300px",overflowY:"auto"}}>
        {BUILDER.map(el=>{const isS=sel.includes(el.id),canA=rem>=(el.cost)||isS;return(
          <button key={el.id} onClick={()=>toggle(el.id)} style={{padding:"7px 9px",textAlign:"left",background:isS?"rgba(201,168,76,0.07)":"rgba(255,255,255,0.016)",border:`1px solid ${isS?"rgba(201,168,76,0.26)":canA?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.016)"}`,borderRadius:"4px",cursor:canA?"pointer":"not-allowed",opacity:canA?1:.3,transition:"all .1s"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"1px"}}><div style={{fontSize:"13px",color:isS?"#e0c878":"#4a3a28"}}>{el.i} {el.l}</div><div style={{fontSize:"12px",fontWeight:"bold",color:isS?"#c9a84c":"#1a0e08"}}>💰{el.cost}</div></div>
            <div style={{fontSize:"11px",color:"#9cb0de",lineHeight:1.4}}>{el.desc}</div>
            {isS&&<div style={{display:"flex",gap:"4px",marginTop:"2px"}}>{el.def>0&&<span style={{fontSize:"10px",color:"#cc7744"}}>🛡+{el.def}</span>}{el.sup>0&&<span style={{fontSize:"10px",color:"#4488cc"}}>📦+{el.sup}</span>}{el.pos>0&&<span style={{fontSize:"10px",color:"#88aa44"}}>⛰+{el.pos}</span>}</div>}
          </button>);})}
      </div>
      <button onClick={analyze} disabled={loading||sel.length<2} style={{width:"100%",padding:"8px",fontSize:"13px",letterSpacing:"1px",background:sel.length>=2&&!loading?"rgba(60,110,45,.14)":"rgba(255,255,255,.016)",border:`1px solid ${sel.length>=2&&!loading?"rgba(60,110,45,.28)":"rgba(255,255,255,.04)"}`,color:sel.length>=2&&!loading?"#7aaa62":"#1a1a0e",borderRadius:"4px",cursor:sel.length>=2?"pointer":"not-allowed"}}>
        {loading?"⏳ Analysiere…":`🏰 "${name}" ANALYSIEREN`}
      </button>
      {res&&<div style={{marginTop:"10px",padding:"12px",background:"rgba(255,255,255,.016)",border:"1px solid rgba(201,168,76,.1)",borderRadius:"4px"}}>
        {res.isLocalFallback&&<div style={{fontSize:"10px",color:"#5a7a40",letterSpacing:"1px",marginBottom:"8px",padding:"3px 8px",background:"rgba(60,100,30,0.1)",border:"1px solid rgba(60,100,30,0.2)",borderRadius:"3px",display:"inline-block"}}>📊 LOKALE ANALYSE (ohne KI)</div>}
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px",alignItems:"flex-start"}}>
          <div><div style={{fontSize:"12px",fontWeight:"bold",color:"#e0d0a0"}}>{name}</div>{res.era&&<div style={{fontSize:"12px",color:"#b09a70",marginTop:"1px"}}>Typisch: {res.era}</div>}</div>
          <div style={{textAlign:"center"}}><div style={{fontSize:"19px",fontWeight:"bold",color:rCol(res.overallRating)}}>{res.overallRating}</div><div style={{fontSize:"15px",color:"#c9a84c"}}>{"⭐".repeat(res.stars||3)}</div></div>
        </div>
        {res.flavorText&&<div style={{fontSize:"13px",color:"#c0a878",fontStyle:"italic",lineHeight:1.8,marginBottom:"8px",borderLeft:"3px solid rgba(201,168,76,.2)",paddingLeft:"8px"}}>{res.flavorText}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"8px"}}>
          <div><div style={{fontSize:"10px",color:"#7acc4a",letterSpacing:"2px",marginBottom:"3px"}}>STÄRKEN</div>{res.strengths?.map((s,i)=><div key={i} style={{fontSize:"12px",color:"#7acc5a",padding:"1px 0"}}>✓ {s}</div>)}</div>
          <div><div style={{fontSize:"10px",color:"#ee6644",letterSpacing:"2px",marginBottom:"3px"}}>SCHWÄCHEN</div>{res.weaknesses?.map((w,i)=><div key={i} style={{fontSize:"12px",color:"#cc7060",padding:"1px 0"}}>✗ {w}</div>)}</div>
        </div>
        {res.worstVulnerability&&<div style={{padding:"6px 9px",background:"rgba(110,18,6,.09)",border:"1px solid rgba(110,18,6,.16)",borderRadius:"3px",marginBottom:"6px",fontSize:"12px",color:"#5a2a18"}}><strong style={{color:"#bb4422",display:"block",marginBottom:"1px"}}>Kritischste Schwachstelle:</strong>{res.worstVulnerability}</div>}
        {res.bestAttack&&<div style={{padding:"6px 9px",background:"rgba(100,15,6,.08)",border:"1px solid rgba(100,15,6,.14)",borderRadius:"3px",marginBottom:"6px",fontSize:"12px",color:"#5a2818",lineHeight:1.7}}><strong style={{color:"#aa3322",display:"block",marginBottom:"1px"}}>Angreifbar durch:</strong>{res.bestAttack}</div>}
        {res.historicalComp&&<div style={{fontSize:"12px",color:"#9a8a68",fontStyle:"italic",borderTop:"1px solid rgba(255,255,255,.03)",paddingTop:"5px"}}>📜 {res.historicalComp}</div>}

        {/* Export button */}
        <button onClick={()=>exportBuildCard({name,res,sel,tD,tS,tP,activeSyns,spent})}
          style={{marginTop:"12px",width:"100%",padding:"8px",
            background:"rgba(201,168,76,0.07)",border:"1px solid rgba(201,168,76,0.2)",
            color:"#c9a84c",borderRadius:"4px",cursor:"pointer",fontSize:"12px",letterSpacing:"1px"}}>
          📥 STECKBRIEF HERUNTERLADEN
        </button>
      </div>}
    </div>
  );
}

// ── Compare ────────────────────────────────────────────────────────────────
function Compare({castles,init}){
  const [p,setP]=useState([init.id,castles.find(c=>c.id!==init.id)?.id]);
  const c1=castles.find(c=>c.id===p[0]),c2=castles.find(c=>c.id===p[1]);
  const cats=[
    {k:"walls",l:"Mauern",i:"🧱"},
    {k:"supply",l:"Versorgung",i:"🍖"},
    {k:"position",l:"Position",i:"⛰️"},
    {k:"garrison",l:"Garnison",i:"⚔️"},
    {k:"morale",l:"Moral",i:"🔥"},
  ];
  const ss={padding:"6px 10px",background:"rgba(0,0,0,.4)",border:"1px solid rgba(201,168,76,.14)",
    color:"#b09060",borderRadius:"4px",fontSize:"12px",width:"100%",outline:"none",fontFamily:"inherit"};
  return(
    <div style={{animation:"fadeIn 0.2s ease"}}>
      {/* Selectors */}
      <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:"10px",marginBottom:"16px",alignItems:"center"}}>
        <select value={p[0]} onChange={e=>setP([e.target.value,p[1]])} style={ss}>
          {castles.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <div style={{textAlign:"center",color:"#5a4a28",fontSize:"18px",fontWeight:"bold"}}>⚡</div>
        <select value={p[1]} onChange={e=>setP([p[0],e.target.value])} style={ss}>
          {castles.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      {c1&&c2&&(
        <div>
          {/* Header scores */}
          <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:"8px",textAlign:"center",marginBottom:"16px"}}>
            <div style={{padding:"12px",background:`${c1.theme.bg}`,border:`1px solid ${c1.theme.accent}33`,borderLeft:`4px solid ${c1.theme.accent}`,borderRadius:"5px"}}>
              <div style={{fontSize:"22px",marginBottom:"3px"}}>{c1.icon}</div>
              <div style={{fontSize:"13px",fontWeight:"bold",color:"#d0c090",marginBottom:"2px"}}>{c1.name}</div>
              <div style={{fontSize:"10px",color:c1.theme.accent,marginBottom:"6px"}}>{c1.era}</div>
              <div style={{fontSize:"26px",fontWeight:"bold",color:rCol(avg(c1))}}>{avg(c1)}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",color:"#8a7a60",fontSize:"12px",fontFamily:"serif"}}>VS</div>
            <div style={{padding:"12px",background:`${c2.theme.bg}`,border:`1px solid ${c2.theme.accent}33`,borderRight:`4px solid ${c2.theme.accent}`,borderRadius:"5px"}}>
              <div style={{fontSize:"22px",marginBottom:"3px"}}>{c2.icon}</div>
              <div style={{fontSize:"13px",fontWeight:"bold",color:"#d0c090",marginBottom:"2px"}}>{c2.name}</div>
              <div style={{fontSize:"10px",color:c2.theme.accent,marginBottom:"6px"}}>{c2.era}</div>
              <div style={{fontSize:"26px",fontWeight:"bold",color:rCol(avg(c2))}}>{avg(c2)}</div>
            </div>
          </div>

          {/* Unified dual radar */}
          <div style={{padding:"14px",background:"rgba(0,0,0,0.25)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:"6px",marginBottom:"14px"}}>
            <div style={{fontSize:"11px",color:"#9a8a6a",letterSpacing:"2px",textAlign:"center",marginBottom:"8px"}}>RADAR-VERGLEICH</div>
            <div style={{maxWidth:"240px",margin:"0 auto"}}>
              <RadarChart castle={c1} compare={c2}/>
            </div>
            <div style={{display:"flex",gap:"16px",justifyContent:"center",marginTop:"8px"}}>
              <div style={{display:"flex",gap:"5px",alignItems:"center"}}>
                <div style={{width:"20px",height:"2px",background:c1.theme.accent,borderRadius:"1px"}}/>
                <span style={{fontSize:"11px",color:c1.theme.accent}}>{c1.name.split(" ")[0]}</span>
              </div>
              <div style={{display:"flex",gap:"5px",alignItems:"center"}}>
                <div style={{width:"20px",borderTop:"2px dashed "+c2.theme.accent,borderRadius:"1px",height:"0"}}/>
                <span style={{fontSize:"11px",color:c2.theme.accent}}>{c2.name.split(" ")[0]}</span>
              </div>
            </div>
          </div>

          {/* Category bars */}
          <div style={{marginBottom:"14px"}}>
            {cats.map(cat=>{
              const v1=c1.ratings[cat.k],v2=c2.ratings[cat.k];
              const w=v1>v2?"l":v2>v1?"r":"t";
              const diff=Math.abs(v1-v2);
              return(
                <div key={cat.k} style={{marginBottom:"8px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
                    <span style={{fontSize:"12px",color:w==="l"?c1.theme.accent:"#5a4a28",fontWeight:w==="l"?"bold":"normal"}}>{v1}</span>
                    <span style={{fontSize:"11px",color:"#9a8a6a",letterSpacing:"1px"}}>{cat.i} {cat.l}</span>
                    <span style={{fontSize:"12px",color:w==="r"?c2.theme.accent:"#5a4a28",fontWeight:w==="r"?"bold":"normal"}}>{v2}</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 20px 1fr",gap:"3px",alignItems:"center"}}>
                    <div style={{display:"flex",justifyContent:"flex-end"}}>
                      <div style={{height:"5px",width:`${v1*0.6}%`,maxWidth:"100%",background:c1.theme.accent,borderRadius:"3px 0 0 3px",opacity:w==="l"?1:0.3,transition:"width 0.6s ease"}}/>
                    </div>
                    <div style={{textAlign:"center",fontSize:"10px",color:w==="t"?"#c9a84c":"#3a2a14"}}>
                      {w==="l"?"◀":w==="r"?"▶":"="}
                      {diff>0&&<div style={{fontSize:"8px",color:"#5a4a28"}}>+{diff}</div>}
                    </div>
                    <div style={{display:"flex"}}>
                      <div style={{height:"5px",width:`${v2*0.6}%`,maxWidth:"100%",background:c2.theme.accent,borderRadius:"0 3px 3px 0",opacity:w==="r"?1:0.3,transition:"width 0.6s ease"}}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Metadaten-Vergleich */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",marginBottom:"10px"}}>
            {[
              {l:"Epoche",v1:c1.epoch,v2:c2.epoch},
              {l:"Ort",v1:c1.loc,v2:c2.loc},
              {l:"Typ",v1:c1.type==="real"?"Historisch":"Fantasy",v2:c2.type==="real"?"Historisch":"Fantasy"},
              {l:"Jahr",v1:c1.year<0?`${Math.abs(c1.year)} v.Chr.`:`~${c1.year}`,v2:c2.year<0?`${Math.abs(c2.year)} v.Chr.`:`~${c2.year}`},
            ].map(row=>(
              <div key={row.l} style={{gridColumn:"1/-1",display:"grid",gridTemplateColumns:"1fr 60px 1fr",gap:"6px",alignItems:"start",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                <div style={{fontSize:"11px",color:"#a09070",textAlign:"right",paddingRight:"4px"}}>{row.v1}</div>
                <div style={{fontSize:"10px",color:"#8a7860",textAlign:"center",letterSpacing:"1px"}}>{row.l}</div>
                <div style={{fontSize:"11px",color:"#a09070",textAlign:"left",paddingLeft:"4px"}}>{row.v2}</div>
              </div>
            ))}
          </div>
          {/* Stärken/Schwächen */}
          {c1.strengths&&c2.strengths&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",marginBottom:"10px"}}>
              <div style={{padding:"8px 10px",background:`${c1.theme.bg}`,border:`1px solid ${c1.theme.accent}22`,borderRadius:"5px"}}>
                <div style={{fontSize:"10px",color:c1.theme.accent,letterSpacing:"1px",marginBottom:"4px"}}>STÄRKE</div>
                <div style={{fontSize:"11px",color:"#a09070"}}>{c1.strengths[0]}</div>
              </div>
              <div style={{padding:"8px 10px",background:`${c2.theme.bg}`,border:`1px solid ${c2.theme.accent}22`,borderRadius:"5px"}}>
                <div style={{fontSize:"10px",color:c2.theme.accent,letterSpacing:"1px",marginBottom:"4px"}}>STÄRKE</div>
                <div style={{fontSize:"11px",color:"#a09070"}}>{c2.strengths[0]}</div>
              </div>
              <div style={{padding:"8px 10px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(200,80,80,0.15)",borderRadius:"5px"}}>
                <div style={{fontSize:"10px",color:"#c05050",letterSpacing:"1px",marginBottom:"4px"}}>SCHWÄCHE</div>
                <div style={{fontSize:"11px",color:"#907060"}}>{c1.weaknesses?.[0]}</div>
              </div>
              <div style={{padding:"8px 10px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(200,80,80,0.15)",borderRadius:"5px"}}>
                <div style={{fontSize:"10px",color:"#c05050",letterSpacing:"1px",marginBottom:"4px"}}>SCHWÄCHE</div>
                <div style={{fontSize:"11px",color:"#907060"}}>{c2.weaknesses?.[0]}</div>
              </div>
            </div>
          )}
          {/* Verdict */}
          <div style={{padding:"11px 14px",background:"rgba(201,168,76,0.04)",border:"1px solid rgba(201,168,76,0.1)",borderRadius:"5px",textAlign:"center"}}>
            {avg(c1)===avg(c2)
              ? <span style={{fontSize:"13px",color:"#c9a84c"}}>⚖️ Gleichstand — beide Burgen haben verschiedene Stärken</span>
              : <span style={{fontSize:"13px",color:"#d0c090"}}>
                  {avg(c1)>avg(c2)
                    ? <><span style={{color:c1.theme.accent}}>{c1.icon} {c1.name}</span> gewinnt mit <strong style={{color:rCol(avg(c1)-avg(c2)+50)}}>+{avg(c1)-avg(c2)} Punkten</strong></>
                    : <><span style={{color:c2.theme.accent}}>{c2.icon} {c2.name}</span> gewinnt mit <strong style={{color:rCol(avg(c2)-avg(c1)+50)}}>+{avg(c2)-avg(c1)} Punkten</strong></>
                  }
                </span>
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ── Campaign ───────────────────────────────────────────────────────────────
const CAMPAIGNS = [
  {
    id:"crusader_trail",
    name:"Der Kreuzfahrer-Pfad",
    icon:"✝️",
    desc:"Folge den Kreuzrittern von Akkon bis zum Krak des Chevaliers — die Hochzeit der Kreuzfahrer-Festungen.",
    era:"12.–13. Jahrhundert",
    difficulty:"mittel",
    castles:["akkon","krak","masada","constantinople","rhodes"],
    story:[
      "1191: Du landest mit dem Kreuzzug in Akkon. Die Stadt ist der wichtigste Hafen des Heiligen Landes — und sie ist belagert.",
      "Die Levante. Ein einsamer Wachposten meldet: Saladins Spähtrupps kreisen Masada ein. Dein Heer ist erschöpft.",
      "Konstantinopel: Das Herz des byzantinischen Reichs. Der Kaiser empfängt dich — aber ist er ein Verbündeter?",
      "Rhodos: Die Johanniter bitten um Verstärkung. Ihre Flotte ist die einzige die den Seeweg sichert.",
      "Der Krak des Chevaliers. 130 Jahre uneingenommen. Baibars steht mit 8.000 Mann vor den Mauern.",
    ],
    choices:[
      // Kapitel 1: Akkon
      {
        question:"Ein Bote des Sultans bietet dir an, das Nordtor von innen zu öffnen — gegen Bezahlung. Vertraust du ihm?",
        options:[
          {label:"💰 Bezahlen & vertrauen", effect:"bonus", desc:"Das Tor öffnet sich. Aber kostet dich 200 Mann als Hinterhalt — der Bote war ein Doppelspion.", siegeBonus:-1},
          {label:"⚔️ Ablehnen & stürmen", effect:"neutral", desc:"Du lehnst ab. Der Sturmangriff kostet mehr Zeit, aber keine Falle.", siegeBonus:0},
          {label:"🕵️ Gegenspion schicken", effect:"bonus", desc:"Du schickst deinen eigenen Spion. Er entlarvt den Verräter — und bringt den echten Grundriss.", siegeBonus:1},
        ],
      },
      // Kapitel 2: Masada
      {
        question:"Deine Männer haben einen alten Tunnel entdeckt. Er führt in die Burg — aber er könnte eine Falle sein.",
        options:[
          {label:"⛏️ Tunnel nutzen", effect:"bonus", desc:"Der Tunnel ist echt. Zehn Männer schleichen hindurch und öffnen das Tor von innen.", siegeBonus:2},
          {label:"🔥 Tunnel verbrennen & Rampe bauen", effect:"neutral", desc:"Sicherer. Die Rampe kostet 3 Wochen — aber du verlierst keine Männer im Dunkel.", siegeBonus:0},
          {label:"🪤 Tunnel als Falle nutzen", effect:"bonus", desc:"Du schickst die Verteidiger hinein statt deine Männer — und sperrst sie dort ein.", siegeBonus:1},
        ],
      },
      // Kapitel 3: Konstantinopel
      {
        question:"Der byzantinische Kaiser bietet dir Hilfe an — aber er verlangt die Hälfte der Beute. Akzeptierst du?",
        options:[
          {label:"🤝 Akzeptieren", effect:"bonus", desc:"Mit byzantinischer Flotte und griechischem Feuer wird die Belagerung erheblich einfacher.", siegeBonus:2},
          {label:"❌ Ablehnen", effect:"neutral", desc:"Du kämpfst allein. Härter — aber der gesamte Ruhm gehört dir.", siegeBonus:0},
          {label:"🎭 Scheinakzeptanz", effect:"bonus", desc:"Du stimmst zu — und nimmst die Hilfe. Das Versprechen kannst du später neu verhandeln.", siegeBonus:1},
        ],
      },
      // Kapitel 4: Rhodos
      {
        question:"Ein Sturm zieht auf. Die Flotte könnte jetzt angreifen — oder drei Tage warten und sicher sein.",
        options:[
          {label:"🌊 Jetzt angreifen!", effect:"risky", desc:"Der Sturm trifft mitten im Angriff. Zwei Schiffe sinken — aber die Überraschung ist total.", siegeBonus:0},
          {label:"⏳ Warten", effect:"safe", desc:"Drei Tage Pause. Die Verteidiger nutzen sie für Reparaturen — aber du greifst ausgeruht an.", siegeBonus:0},
          {label:"🌩️ Sturm als Deckung nutzen", effect:"bonus", desc:"Geniales Manöver: Du segelt mit dem Sturm — Sichtschutz und Rückenwind gleichzeitig.", siegeBonus:2},
        ],
      },
      // Kapitel 5: Krak
      {
        question:"Ein gefälschter Brief vom ägyptischen Sultan liegt vor dir. Er könnte die Ritter zur Übergabe bewegen — eine historische Lüge.",
        options:[
          {label:"📜 Brief fälschen & senden", effect:"bonus", desc:"Die Geschichte wiederholt sich. Baibars' Trick funktioniert — die Burg öffnet ihre Tore.", siegeBonus:3},
          {label:"⚔️ Ehrenhafter Direktangriff", effect:"neutral", desc:"Kein Trick. Der Angriff dauert Monate länger — aber du kannst deinen Sieg als echt bezeichnen.", siegeBonus:0},
          {label:"🍞 Erst aushungern, dann fälschen", effect:"bonus", desc:"Geschwächte Verteidiger glauben dem Brief leichter. Kombinationsstrategie.", siegeBonus:2},
        ],
      },
    ],
  },
  {
    id:"edwards_conquest",
    name:"Edwards Eiserner Ring",
    icon:"👑",
    desc:"Edward I. bezwang Wales mit einem Ring aus Burgen. Belagere sie der Reihe nach.",
    era:"13.–14. Jahrhundert",
    difficulty:"leicht",
    castles:["dover","caernarvon","harlech","beaumaris","bodiam"],
    story:[
      "1265: Dover — Schlüssel zu England. Louis von Frankreich steht vor dem Tor. Du bist Hubert de Burgh.",
      "Wales, 1283: Caernarvon ist fast fertig. Die Waliser unter Madoc ap Llywelyn greifen an — das Gerüst steht noch.",
      "Harlech, 1404: Owain Glyndŵr belagert die Burg seit zwei Jahren. Die Garnison: 50 Mann, kein Wasser.",
      "Beaumaris, 1298: Die Burg ist noch im Bau. Welsh rebels nähern sich — die Mauern sind erst halb fertig.",
      "Bodiam, 1380: Die Franzosen landen. John de Dalyngrigge hat seine neue Burg — aber ist sie kriegstauglich?",
    ],
    choices:[
      {
        question:"Der Minengang unter dem Nordtor ist fast fertig. Deine Männer könnten ihn sofort sprengen — oder du wartest auf eine günstigere Position.",
        options:[
          {label:"💥 Sofort sprengen", effect:"bonus", desc:"Der Turm kollabiert. Bresche — aber deine Männer stehen noch nicht bereit.", siegeBonus:1},
          {label:"⏳ Warten & Position beziehen", effect:"bonus", desc:"Perfektes Timing. Bresche und Sturmangriff gleichzeitig.", siegeBonus:2},
          {label:"🚪 Gegentunnel graben", effect:"neutral", desc:"Du versuchst den Tunnel abzufangen. Es gelingt — du kennst nun den exakten Grundriss.", siegeBonus:0},
        ],
      },
      {
        question:"Walisische Verstärkung nähert sich. Deine Belagerung ist unvollständig. Kämpfst du auf zwei Fronten — oder ziehst du dich kurz zurück?",
        options:[
          {label:"⚔️ Zwei Fronten kämpfen", effect:"risky", desc:"Brutal. Du verlierst 30% deiner Männer — aber beide Angriffe scheitern.", siegeBonus:0},
          {label:"🔄 Kurzer Rückzug", effect:"safe", desc:"Verstärkung abwehren, dann zurück zur Belagerung. Sauber aber langsam.", siegeBonus:0},
          {label:"🏃 Schnellsturm vor Verstärkung", effect:"bonus", desc:"Risiko: Sofortsturm mit allem was du hast. Die Burg fällt bevor die Hilfe ankommt.", siegeBonus:2},
        ],
      },
      {
        question:"Die 50 Verteidiger von Harlech sind am Verhungern. Ein Parlamentär bietet ehrenvolle Übergabe an.",
        options:[
          {label:"🤝 Ehrenvolle Übergabe", effect:"safe", desc:"Sie übergeben. Freier Abzug. Keine Verluste auf beiden Seiten.", siegeBonus:1},
          {label:"⚔️ Ablehnen & stürmen", effect:"risky", desc:"Fanatische Verteidiger. Selbst verhungernd kämpfen sie weiter. Mehr Verluste.", siegeBonus:0},
          {label:"📜 Übergabe akzeptieren & brechen", effect:"risky", desc:"Du nimmst die Burg und die Männer gefangen. Schnell — aber das Wort Edwards steht auf dem Spiel.", siegeBonus:1},
        ],
      },
      {
        question:"Beaumaris ist nur halb fertig. Die Lücken in der Mauer sind offensichtlich. Nutzt du sie — oder wartest du auf einen würdigeren Kampf?",
        options:[
          {label:"🎯 Lücken direkt angreifen", effect:"bonus", desc:"Trivial fast. Die halbe Mauer ist kein Hindernis.", siegeBonus:2},
          {label:"🌊 Wasserseitig angreifen", effect:"bonus", desc:"Der Hafen ist noch nicht fertig. Boot direkt an die Mauern.", siegeBonus:2},
          {label:"😤 Warten bis sie fertig ist", effect:"neutral", desc:"Ehrenhaft aber naiv. Sie werden die Mauer in dieser Zeit fertigstellen.", siegeBonus:-1},
        ],
      },
      {
        question:"Bodiams Wassergraben ist breit. Ein lokaler Fischer kennt die Furt — gegen Bezahlung zeigt er dir den Weg.",
        options:[
          {label:"💰 Fischer bezahlen", effect:"bonus", desc:"Die Furt existiert. Deine Männer überqueren trocken.", siegeBonus:2},
          {label:"🪵 Brücke bauen", effect:"safe", desc:"Langsam aber sicher. Drei Tage Arbeit.", siegeBonus:0},
          {label:"🏊 Schwimmend überqueren", effect:"risky", desc:"Halb deiner Männer kommen nass und erschöpft an — aber sie kommen.", siegeBonus:0},
        ],
      },
    ],
  },
  {
    id:"fall_of_fantasy",
    name:"Das Dritte Zeitalter",
    icon:"✦",
    desc:"Mittelerde in der größten Krise — von Gondolin bis Barad-dûr.",
    era:"Erstes bis Drittes Zeitalter",
    difficulty:"legendär",
    castles:["gondolin","minas_tirith","helmsdeep","isengard","barad_dur"],
    story:[
      "Gondolin: Maeglin hat Morgoth den Weg gezeigt. Balrogs und Drachen stehen vor den Toren.",
      "Helms Klamm: Théoden will ausreiten und kämpfen. Aragorn empfiehlt zu halten. Die Nacht kommt.",
      "Isengard: Sarumans Heer ist ausgezogen. Der Ringwall ist verlassen — bis auf die Ents.",
      "Minas Tirith: Der Nazgûl-König hat das Tor gebrochen. Die erste Ebene fällt. Denethor brennt.",
      "Barad-dûr: Der Eine Ring ist im Schicksalsberg. Saurons Auge wendet sich von allem anderen ab.",
    ],
    choices:[
      {
        question:"Maeglin hat Idril verraten. Du kannst ihn verhaften — aber er kennt die geheimen Ausgänge. Nutzt du ihn noch?",
        options:[
          {label:"🔒 Sofort verhaften", effect:"safe", desc:"Gondolin ist gewarnt. Aber Maeglin stirbt ohne die Ausgänge zu verraten.", siegeBonus:0},
          {label:"🎭 Scheinfreiheit & überwachen", effect:"bonus", desc:"Er führt dich zu allen Geheimgängen. Dann verhaftest du ihn.", siegeBonus:2},
          {label:"⚔️ Sofort töten", effect:"neutral", desc:"Morgoth verliert seinen Spion. Gondolin hat mehr Zeit — aber auch keine Fluchtrouten.", siegeBonus:1},
        ],
      },
      {
        question:"Théoden will das Tor öffnen und ausreiten. Aragorn sagt: halten. Du entscheidest.",
        options:[
          {label:"🐴 Ausreiten mit Théoden", effect:"risky", desc:"Gewagter Ausfall. Chaos bei den Uruk-hai — aber Verluste sind enorm.", siegeBonus:1},
          {label:"🛡️ Halten bis Ents kommen", effect:"bonus", desc:"Die Mauern halten bis Gandalfs Ankunft. Perfektes Timing.", siegeBonus:2},
          {label:"🌅 Auf Anbruch des Morgenrots warten", effect:"bonus", desc:"Gandalfs Plan: Sonnenaufgang + Rohirrim. Du vertraust ihm.", siegeBonus:2},
        ],
      },
      {
        question:"Isengard ist leer. Sarumans Armee ist fort. Aber Orthanc steht noch — und Saruman ist darin.",
        options:[
          {label:"🗼 Orthanc belagern", effect:"neutral", desc:"Saruman lacht von oben. Der Turm ist unzerstörbar. Du wartest.", siegeBonus:0},
          {label:"💧 Ents fluten Isengard", effect:"bonus", desc:"Wasser gegen Feuer. Isengard versinkt. Saruman ist gefangen.", siegeBonus:3},
          {label:"📜 Palantír suchen", effect:"bonus", desc:"Im Chaos findest du den Sehstein — ein Werkzeug gegen Sauron selbst.", siegeBonus:2},
        ],
      },
      {
        question:"Denethor will die Vorratsschränke verbrennen und aufgeben. Du kannst ihn aufhalten — oder nicht.",
        options:[
          {label:"🔥 Denethor gewähren lassen", effect:"neutral", desc:"Minas Tirith verliert Vorräte und Hoffnung. Aber Aragorn kommt.", siegeBonus:0},
          {label:"⚔️ Denethor aufhalten", effect:"bonus", desc:"Faramir überlebt. Die Vorratsschränke bleiben. Die Verteidigung hält länger.", siegeBonus:2},
          {label:"📯 Rohirrim rufen bevor es brennt", effect:"bonus", desc:"Das Horn von Gondor — Merry hört es. Die Rohirrim beschleunigen.", siegeBonus:1},
        ],
      },
      {
        question:"Der Ring ist im Feuer. Sauron ist abgelenkt. Deine Armee steht am Schwarzen Tor — sinnloser Angriff oder Ablenkung?",
        options:[
          {label:"⚔️ Voller Angriff", effect:"risky", desc:"Saurons Auge bleibt auf Frodo gerichtet — aber deine Männer sterben.", siegeBonus:1},
          {label:"🎪 Ablenkungsmanöver halten", effect:"bonus", desc:"Du hältst. Frodo hat Zeit. Der Ring fällt ins Feuer.", siegeBonus:3},
          {label:"🏃 Rückzug & Frodo beschützen", effect:"neutral", desc:"Du versuchst Frodo zu erreichen. Saurons Auge folgt dir — Frodo schafft es trotzdem.", siegeBonus:1},
        ],
      },
    ],
  },
  {
    id:"mongolensturm",
    name:"Der Mongolensturm",
    icon:"🏇",
    desc:"Folge dem größten Eroberungszug der Geschichte — von Samarkand über Alamut und Bagdad bis vor Konstantinopel. Du bist der Sturm.",
    era:"1220–1260",
    difficulty:"legendär",
    castles:["samarkand","alamut","bagdad","constantinople"],
    story:[
      "1220 n.Chr. Samarkand. Dschingis Khan steht mit 200.000 Mongolen vor der Perle der Seidenstraße. Der Khwarezm-Shah ist geflohen. Die Stadtältesten wollen verhandeln — die türkischen Söldner wollen kämpfen. Du entscheidest.",
      "1256. Hulagu Khan. Die Assassinen in Alamut haben 150 Jahre lang Könige ermordet. Hassan-i Sabbah's Erben sitzen im Adlernest der Berge. Kein Heer hat Alamut je eingenommen. Aber keines hatte Hulagu Khan.",
      "1258. Bagdad. Der letzte Abbasidenkhalif Al-Mustasim verweigerte die Kapitulation. 800 Jahre islamisches Goldenes Zeitalter. Die Bibliothek des Hauses der Weisheit. 400.000 Menschen. Du stehst vor der rundesten Stadt der Welt.",
      "1260. Der Zug geht weiter. Konstantinopel — noch nicht gefallen, aber zitternd. Nichts hat den Mongolen bisher Einhalt geboten. Die Byzantiner hören die Hufe von Westanatolien. Du bist das Ende von allem.",
    ],
    choices:[
      // Kapitel 1: Samarkand
      {
        question:"Die Stadtältesten wollen kampflos übergeben. Die 30.000 türkischen Söldner wollen kämpfen und verlangen du teilst deine Truppen. Was tust du?",
        options:[
          {label:"🤝 Übergabe annehmen", effect:"bonus", desc:"Die Ältesten öffnen die Tore. Stadt gerettet — Söldner massakriert. Du sparst deine Truppen für das Nächste.", siegeBonus:2},
          {label:"⚔️ Söldner zuerst vernichten", effect:"risky", desc:"Du isolierst die Söldner in der Megara-Vorstadt. Schwere Kämpfe — aber die Stadt fällt danach kampflos.", siegeBonus:1},
          {label:"🔥 Totale Zerstörung", effect:"risky", desc:"Kein Erbarmen. Samarkand wird ein Beispiel. Nächste Städte kapitulieren sofort aus purer Angst.", siegeBonus:0},
        ],
      },
      // Kapitel 2: Alamut
      {
        question:"Der Großmeister der Assassinen bietet an, alle Burgen zu übergeben — wenn du seinen Orden weiterleben lässt. Er kann jederzeit jeden töten. Hulagu, vertraust du ihm?",
        options:[
          {label:"📜 Verhandeln — Orden bestehen lassen", effect:"neutral", desc:"Ruknuddin Khurshah übergibt alle 100 Assassinenburgen. Du hast das größte Spionagenetz der Welt gewonnen — oder eine Falle gestellt.", siegeBonus:1},
          {label:"⛏️ Belagern bis zur Übergabe", effect:"bonus", desc:"Kein Vertrauen in Assassinen. Monatelange Belagerung — Nahrung läuft aus. Kapitulation ohne Verhandlung.", siegeBonus:2},
          {label:"🕵️ Spione einschleusen & von innen öffnen", effect:"bonus", desc:"Mongol-Spion findet einen Überläufer unter den Assassinen. Das Tor öffnet sich in der Nacht.", siegeBonus:3},
        ],
      },
      // Kapitel 3: Bagdad
      {
        question:"Al-Mustasim verweigert die Kapitulation und beleidigt deinen Boten. Du könntest noch verhandeln — oder das schlimmste Massaker der Geschichte beginnen. Was entscheidest der Sturm?",
        options:[
          {label:"📯 Letztes Ultimatum senden", effect:"neutral", desc:"Ein letztes Angebot: Kapitulation gegen Leben. Al-Mustasim lacht. Dann fällt die Entscheidung von selbst.", siegeBonus:0},
          {label:"⚔️ Sofortiger Angriff — alle 13 Tage", effect:"bonus", desc:"Konzentrische Mauern systematisch brechen. 13 Tage — 800 Jahre Kaliphat enden.", siegeBonus:2},
          {label:"💧 Tigris sperren, dann warten", effect:"bonus", desc:"Du sperrst den Tigris. Ohne Wasser kapituliert selbst der Kalif — und du verlierst weniger Männer.", siegeBonus:1},
        ],
      },
      // Kapitel 4: Konstantinopel
      {
        question:"Konstantinopel zittert. Kaiser Michael VIII. schickt Botschafter. Die Theodosianischen Mauern sind uneingenommen seit 1.000 Jahren. Aber deine Armee hat noch nie verloren. Was ist die mongolische Entscheidung?",
        options:[
          {label:"🌊 Griechisches Feuer — Flotte zerstören", effect:"bonus", desc:"Byzanz hat eine Flotte. Du baust eine Gegenmacht am Bosporus. Dann kommt die Entscheidung.", siegeBonus:1},
          {label:"🤝 Diplomatisches Bündnis", effect:"bonus", desc:"Michael VIII. bietet Tributzahlung und Handelsrechte. Klug: Konstantinopel als Vasall ist wertvoller als Ruine.", siegeBonus:2},
          {label:"⚔️ Voller Sturm — die Mauern brechen", effect:"risky", desc:"Selbst deine Armee blutet an Theodosianischen Mauern. Aber du hast noch nie aufgehört.", siegeBonus:0},
        ],
      },
    ],
  },
  {
    id:"sorrowland_chronicles",
    name:"Chroniken von Sorrowland",
    icon:"⬛",
    desc:"Die vollständige Geschichte des Ordo Custodum — vom ersten Eid bis zur finalen Belagerung. Drei Burgen, ein Geheimnis, unzählige Feinde.",
    era:"9.–15. Jahrhundert",
    difficulty:"legendär",
    castles:["schwarzer_bergfried","castle_sorrow","gravecrest"],
    story:[
      "870 n.Chr. Großmeister Aldric von Dunmoor hält ein versiegeltes Bündel Karten. Sie zeigen Ruinen einer untergegangenen Zivilisation — Ruinen die beweisen würden, dass drei Königreiche auf geraubtem Land stehen. Er blickt auf den Schwarzen Bergfried und sagt: 'Hier hinein. Bis die Welt bereit ist.' Er weiß: Die Welt wird nie bereit sein.",
      "1050 n.Chr. Burgfeste Drachenstein erhebt sich. Großmeister Harwin der Gründer hat erkannt dass ein Turm allein den Orden nicht schützt. Der Ordensrat tagt erstmals hinter verschlossenen Türen. Bischof Aldous von Veldrath schreibt an den Papst: 'Dieser Orden hütet etwas Gefährliches. Ich weiß es — aber ich kann es nicht beweisen.'",
      "1312 n.Chr. Burgfeste Drachenstein ist gefallen. Kirchentruppen halten die Mauern. Die überlebenden Ritter fliehen nach Gravecrest — dem Ort der auf keiner Karte steht. Ritterhauptmann Oswin schließt das Tor. Unten stehen 600 Soldaten. Oben 80 Ritter. Und irgendwo zwischen den Steinen: der Weg zurück.",
    ],
    choices:[
      // Kapitel 1: Schwarzer Bergfried
      {
        question:"Ein Bote des Herzogs von Veldrath trägt ein Angebot: Frieden und Schutz — gegen Einsicht in das Archiv. Nur einmal, nur ein Dokument. Was antwortest du?",
        options:[
          {label:"📜 Ablehnen — In silentio vigilamus", effect:"safe", desc:"Du schweigst. Der Herzog wird zum Feind. Aber der Schwur bleibt ungebrochen.", siegeBonus:0},
          {label:"🤝 Verhandeln — Zeit kaufen", effect:"neutral", desc:"Du lässt ihn glauben er bekommt Zugang. Drei Monate Aufschub — drei Monate Vorbereitung.", siegeBonus:1},
          {label:"🔥 Falsche Karten erstellen", effect:"bonus", desc:"Du lässt Fälschungen anfertigen. Der Herzog ist zufrieden — für jetzt. Und du hast Zeit.", siegeBonus:2},
        ],
      },
      // Kapitel 2: Castle Sorrow
      {
        question:"Großmeisterin Sera von Dunmoor hat 11 Monate gehalten. Ihre Männer sind erschöpft. Ein Ratsmitglied flüstert: 'Gebt ihnen ein Dokument — nur eines. Dann ist Frieden.' Was entscheidest du?",
        options:[
          {label:"⚔️ Kämpfen bis zum Ende", effect:"safe", desc:"Sera hält. Moralisch unerschütterlich. Militärisch erschöpft. Aber der Orden überlebt.", siegeBonus:0},
          {label:"🎭 Das Ratsmitglied verhaften", effect:"bonus", desc:"Verrat im Ordensrat ist das Gefährlichste. Du handelst schnell — und die Moral festigt sich.", siegeBonus:2},
          {label:"💰 Geheimen Entsatz kaufen", effect:"risky", desc:"Söldner sind keine Ritter. Aber 200 Mann von außen könnten die Belagerung brechen.", siegeBonus:1},
        ],
      },
      // Kapitel 3: Gravecrest
      {
        question:"Alle drei Burgen des Ordens sind belagert. Gravecrest hält noch. Die verbotenen Karten sind in deinen Händen. Was tust du?",
        options:[
          {label:"🔥 Verbrennen — das Geheimnis stirbt hier", effect:"neutral", desc:"Der Orden überlebt vielleicht. Das Wissen ist für immer weg. Drei Königreiche bleiben legitim.", siegeBonus:0},
          {label:"🗺️ Verstecken — in den Ruinen selbst", effect:"bonus", desc:"Du versteckst die Karten an dem Ort den sie beschreiben. Das Geheimnis wartet auf die nächste Generation.", siegeBonus:2},
          {label:"📯 Bote zum nächsten König — alles enthüllen", effect:"risky", desc:"Du brichst den Schwur. Drei Dynastien fallen. Der Orden auch. Aber die Wahrheit kommt ans Licht.", siegeBonus:1},
        ],
      },
    ],
  },
];

function CampaignExplore({castle, general, season, siegeBonus, choiceMade, onSiegeDone, onBack}){
  const [siegeDone, setSiegeDone] = useState(false);
  const [won, setWon] = useState(null);

  const handleScore = (castleId, didWin, turns) => {
    // siegeBonus>0 makes winning easier (fewer turns needed), <0 harder
    const adjustedWin = siegeBonus >= 2 ? true : siegeBonus <= -1 && !didWin ? false : didWin;
    setWon(adjustedWin);
    setSiegeDone(true);
    onSiegeDone(adjustedWin, turns);
  };

  if(siegeDone){
    return(
      <div style={{padding:"24px 20px",textAlign:"center",animation:"fadeIn 0.3s ease"}}>
        <div style={{fontSize:"48px",marginBottom:"12px"}}>{won?"🏆":"🛡️"}</div>
        <div style={{fontSize:"18px",fontWeight:"bold",color:won?"#6aaa50":"#cc5533",marginBottom:"8px"}}>
          {won?"Burg eingenommen!":"Burg hält stand!"}
        </div>
        {choiceMade&&(
          <div style={{fontSize:"12px",color:"#7a6a40",marginBottom:"8px",fontStyle:"italic"}}>
            Deine Entscheidung "{choiceMade.label}" hat {siegeBonus>0?"geholfen":siegeBonus<0?"geschadet":"keinen Ausschlag gegeben"}.
          </div>
        )}
        <button onClick={onBack}
          style={{padding:"10px 24px",background:`${castle.theme.accent}18`,
            border:`1px solid ${castle.theme.accent}44`,color:castle.theme.accent,
            borderRadius:"5px",cursor:"pointer",fontSize:"13px",letterSpacing:"1px"}}>
          Weiter →
        </button>
      </div>
    );
  }

  return(
    <div>
      <div style={{padding:"10px 16px",background:"rgba(0,0,0,0.3)",
        borderBottom:"1px solid rgba(255,255,255,0.04)",
        display:"flex",gap:"10px",alignItems:"center",marginBottom:"4px"}}>
        <span style={{fontSize:"18px"}}>{castle.icon}</span>
        <div style={{flex:1}}>
          <div style={{fontSize:"13px",fontWeight:"bold",color:"#f0e6cc"}}>{castle.name}</div>
          <div style={{fontSize:"11px",color:castle.theme.accent}}>{castle.sub}</div>
        </div>
        {choiceMade&&(
          <div style={{padding:"3px 8px",borderRadius:"10px",fontSize:"10px",
            background:siegeBonus>0?"rgba(50,120,30,0.15)":siegeBonus<0?"rgba(150,40,20,0.15)":"rgba(255,255,255,0.04)",
            border:`1px solid ${siegeBonus>0?"rgba(60,150,35,0.3)":siegeBonus<0?"rgba(180,50,25,0.3)":"rgba(255,255,255,0.08)"}`,
            color:siegeBonus>0?"#6aaa50":siegeBonus<0?"#cc5533":"#8a7a58"}}>
            🎲 {siegeBonus>0?`+${siegeBonus} Bonus`:siegeBonus<0?`${siegeBonus} Malus`:"Neutral"}
          </div>
        )}
        <div style={{fontSize:"10px",color:"#cc4433",letterSpacing:"1px"}}>KAMPAGNE</div>
      </div>
      {choiceMade&&(
        <div style={{margin:"8px 16px",padding:"8px 12px",
          background:"rgba(180,140,40,0.06)",border:"1px solid rgba(180,140,40,0.15)",
          borderRadius:"4px",fontSize:"12px",color:"#9a8050",fontStyle:"italic"}}>
          🎲 "{choiceMade.desc}"
        </div>
      )}
      <RoleplaySiege castle={castle} onScore={handleScore} general={general} season={season}/>
    </div>
  );
}

function CampaignExploreMap({castle, onStartSiege, onBack}){
  const [selZone, setSelZone] = useState(null);
  const plan = CASTLE_PLANS[castle.id];
  const ac = castle.theme.accent;
  const selZ = castle.zones.find(z=>z.id===selZone);

  return(
    <div style={{padding:"16px 18px",animation:"fadeIn 0.25s ease"}}>
      {/* Header */}
      <div style={{display:"flex",gap:"12px",alignItems:"center",marginBottom:"14px"}}>
        <button onClick={onBack}
          style={{padding:"5px 10px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",
            color:"#8a7a58",borderRadius:"4px",cursor:"pointer",fontSize:"12px"}}>
          ← Zurück
        </button>
        <span style={{fontSize:"22px"}}>{castle.icon}</span>
        <div style={{flex:1}}>
          <div style={{fontSize:"15px",fontWeight:"bold",color:"#f0e6cc"}}>{castle.name}</div>
          <div style={{fontSize:"11px",color:ac}}>{castle.sub} · {castle.loc}</div>
        </div>
        <button onClick={onStartSiege}
          style={{padding:"8px 16px",background:`${ac}18`,border:`1px solid ${ac}44`,
            color:ac,borderRadius:"4px",cursor:"pointer",fontSize:"12px",letterSpacing:"1px"}}>
          ⚔️ Belagern
        </button>
      </div>

      {/* SVG floor plan */}
      <div style={{background:"rgba(8,6,3,0.95)",border:`1px solid ${ac}18`,borderRadius:"8px",
        overflow:"hidden",marginBottom:"12px",position:"relative"}}>
        <svg viewBox="0 0 220 200" style={{width:"100%",display:"block",maxHeight:"320px"}}>
          <defs>
            <radialGradient id="ceBg" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#0c0a06"/>
              <stop offset="100%" stopColor="#060402"/>
            </radialGradient>
          </defs>
          <rect width="220" height="200" fill="url(#ceBg)"/>
          {plan
            ? plan({ac, sel:selZone, onZone:setSelZone})
            : <GenericCastlePlan castle={castle} ac={ac} sel={selZone} onZone={setSelZone}/>
          }
        </svg>
      </div>

      {/* Selected zone info */}
      {selZ ? (
        <div style={{padding:"12px 14px",background:`${selZ.c}10`,
          border:`1px solid ${selZ.c}33`,borderLeft:`3px solid ${selZ.c}`,
          borderRadius:"5px",marginBottom:"10px",animation:"fadeIn 0.15s ease"}}>
          <div style={{fontSize:"11px",color:selZ.c,letterSpacing:"2px",marginBottom:"4px",fontWeight:"bold"}}>
            {selZ.l.toUpperCase()}
          </div>
          <div style={{fontSize:"13px",color:"#8a7a58",lineHeight:1.8,marginBottom:"6px"}}>{selZ.d}</div>
          <div style={{display:"flex",gap:"5px",alignItems:"center"}}>
            <div style={{height:"4px",flex:selZ.a,background:selZ.c,borderRadius:"2px",maxWidth:"100px"}}/>
            <span style={{fontSize:"11px",color:"#5a4a28"}}>Verteidigungswert: {selZ.a}/6</span>
          </div>
        </div>
      ) : (
        <div style={{padding:"10px 14px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"5px",marginBottom:"10px"}}>
          <div style={{fontSize:"12px",color:"#5a4a28"}}>👆 Klicke auf einen Bereich um Details zu sehen</div>
        </div>
      )}

      {/* Zones list */}
      <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
        {castle.zones.map(z=>(
          <button key={z.id} onClick={()=>setSelZone(selZone===z.id?null:z.id)}
            style={{padding:"4px 9px",fontSize:"11px",
              background:selZone===z.id?`${z.c}22`:"rgba(255,255,255,0.02)",
              border:`1px solid ${selZone===z.id?z.c+"55":"rgba(255,255,255,0.05)"}`,
              color:selZone===z.id?z.c:"#5a4a28",borderRadius:"12px",cursor:"pointer"}}>
            {z.l}
          </button>
        ))}
      </div>
    </div>
  );
}

function Campaign({castles,onSelect,addScore,general,season}){
  const [activeCampaign,setActiveCampaign]=useState(null);
  const [step,setStep]=useState(0);
  const [results,setResults]=useState([]);
  const [mode,setMode]=useState("intro"); // "intro" | "choice" | "explore" | "siege"
  const [choiceMade,setChoiceMade]=useState(null); // {option, effect}
  const [siegeBonus,setSiegeBonus]=useState(0); // accumulated bonus from choices
  const [campaignScores,setCampaignScores]=useState(()=>{
    try{return JSON.parse(localStorage.getItem("bAtlas_campaigns")||"{}");}catch{return {};}
  });

  const startCampaign=(camp)=>{setActiveCampaign(camp);setStep(0);setResults([]);setMode("intro");setChoiceMade(null);setSiegeBonus(0);};

  const nextStep=()=>{
    const nextS=step+1;
    if(nextS<activeCampaign.castles.length){setStep(nextS);setMode("intro");setChoiceMade(null);}
    else{
      const won=results.filter(r=>r.won).length+1; // +1 for current
      const total=activeCampaign.castles.length;
      const score=Math.round((won/total)*100);
      const next={...campaignScores,[activeCampaign.id]:{completed:true,score,won,total,ts:Date.now()}};
      setCampaignScores(next);
      try{localStorage.setItem("bAtlas_campaigns",JSON.stringify(next));}catch{}
      setActiveCampaign(null);
    }
  };

  const handleSiegeDone=(won,turns)=>{
    if(addScore) addScore(activeCampaign.castles[step],won,turns||5);
    setResults(r=>[...r,{won,castleId:activeCampaign.castles[step]}]);
    // Brief delay then move on
    setTimeout(()=>nextStep(), 2800);
  };

  const diffColor={leicht:"#6aaa50",mittel:"#c9a84c",schwer:"#cc6633",legendär:"#cc3333"};

  if(activeCampaign){
    const currentCastleId=activeCampaign.castles[step];
    const currentCastle=castles.find(c=>c.id===currentCastleId);
    if(!currentCastle) return null;

    return(
      <div style={{maxWidth:"720px"}}>
        {/* Progress bar — always visible */}
        <div style={{padding:"10px 18px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
            <div style={{fontSize:"13px",fontWeight:"bold",color:"#f0e6cc"}}>
              {activeCampaign.icon} {activeCampaign.name}
            </div>
            <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
              <span style={{fontSize:"11px",color:"#8a7a58"}}>Kapitel {step+1}/{activeCampaign.castles.length}</span>
              <button onClick={()=>setActiveCampaign(null)}
                style={{padding:"2px 7px",background:"transparent",border:"1px solid rgba(255,255,255,0.06)",
                  color:"#8a7860",borderRadius:"3px",cursor:"pointer",fontSize:"10px"}}>
                Abbrechen
              </button>
            </div>
          </div>
          <div style={{display:"flex",gap:"3px"}}>
            {activeCampaign.castles.map((id,i)=>{
              const res=results[i];
              const c=castles.find(x=>x.id===id);
              return(
                <div key={id} title={c?.name} style={{flex:1,height:"4px",borderRadius:"2px",
                  background:res?(res.won?"#6aaa50":"#cc4444"):i===step?currentCastle.theme.accent:"rgba(255,255,255,0.06)",
                  transition:"background 0.4s ease"}}/>
              );
            })}
          </div>
        </div>

        {/* MODE: Intro */}
        {mode==="intro"&&(
          <div style={{padding:"18px",animation:"fadeIn 0.25s ease"}}>
            <div style={{padding:"16px 18px",
              background:`linear-gradient(135deg,${currentCastle.theme.bg},rgba(8,5,2,0.98))`,
              border:`1px solid ${currentCastle.theme.accent}33`,
              borderLeft:`4px solid ${currentCastle.theme.accent}`,
              borderRadius:"6px",marginBottom:"16px"}}>
              <div style={{fontSize:"10px",color:currentCastle.theme.accent,letterSpacing:"2px",marginBottom:"8px"}}>
                📖 KAPITEL {step+1} — {currentCastle.name.toUpperCase()}
              </div>
              <p style={{fontSize:"14px",color:"#c0b080",lineHeight:1.9,margin:"0 0 14px",fontStyle:"italic"}}>
                "{activeCampaign.story[step]}"
              </p>
              <div style={{display:"flex",gap:"10px",alignItems:"center",padding:"10px",
                background:"rgba(0,0,0,0.2)",borderRadius:"4px"}}>
                <span style={{fontSize:"26px"}}>{currentCastle.icon}</span>
                <div>
                  <div style={{fontSize:"14px",fontWeight:"bold",color:"#f0e6cc"}}>{currentCastle.name}</div>
                  <div style={{fontSize:"11px",color:currentCastle.theme.accent,marginTop:"1px"}}>
                    {currentCastle.sub} · {currentCastle.era} · {currentCastle.loc}
                  </div>
                </div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
              <button onClick={()=>setMode("explore")}
                style={{padding:"14px",background:`${currentCastle.theme.accent}12`,
                  border:`1px solid ${currentCastle.theme.accent}33`,color:currentCastle.theme.accent,
                  borderRadius:"5px",cursor:"pointer",fontSize:"13px",lineHeight:1.5}}>
                🗺️ <strong>Burg erkunden</strong><br/>
                <span style={{fontSize:"11px",opacity:0.7}}>Grundriss & Zonen ansehen</span>
              </button>
              {activeCampaign.choices?.[step]&&!choiceMade?(
                <button onClick={()=>setMode("choice")}
                  style={{padding:"14px",background:"rgba(150,100,30,0.12)",
                    border:"1px solid rgba(180,130,40,0.35)",color:"#c9a84c",
                    borderRadius:"5px",cursor:"pointer",fontSize:"13px",lineHeight:1.5}}>
                  🎲 <strong>Entscheidung treffen</strong><br/>
                  <span style={{fontSize:"11px",opacity:0.7}}>Beeinflusst die Belagerung</span>
                </button>
              ):(
                <button onClick={()=>setMode("siege")}
                  style={{padding:"14px",background:"rgba(180,50,20,0.1)",
                    border:"1px solid rgba(180,50,20,0.3)",color:"#cc6644",
                    borderRadius:"5px",cursor:"pointer",fontSize:"13px",lineHeight:1.5}}>
                  ⚔️ <strong>Belagern</strong><br/>
                  <span style={{fontSize:"11px",opacity:0.7}}>
                    {choiceMade?`Bonus: ${siegeBonus>0?"+":""+(siegeBonus)} Züge`:"Direkt ins Rollenspiel"}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* MODE: Choice */}
        {mode==="choice"&&activeCampaign.choices?.[step]&&(()=>{
          const ch=activeCampaign.choices[step];
          return(
            <div style={{padding:"18px",animation:"fadeIn 0.25s ease"}}>
              <button onClick={()=>setMode("intro")}
                style={{padding:"4px 10px",marginBottom:"14px",background:"rgba(255,255,255,0.03)",
                  border:"1px solid rgba(255,255,255,0.07)",color:"#5a4a28",
                  borderRadius:"4px",cursor:"pointer",fontSize:"11px"}}>
                ← Zurück
              </button>
              <div style={{padding:"14px 16px",background:"rgba(180,140,40,0.06)",
                border:"1px solid rgba(180,140,40,0.2)",borderLeft:"4px solid #c9a84c",
                borderRadius:"5px",marginBottom:"16px"}}>
                <div style={{fontSize:"10px",color:"#c9a84c",letterSpacing:"2px",marginBottom:"8px"}}>
                  🎲 ENTSCHEIDUNGSMOMENT
                </div>
                <div style={{fontSize:"14px",color:"#d0b880",lineHeight:1.85,fontStyle:"italic"}}>
                  "{ch.question}"
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                {ch.options.map((opt,i)=>(
                  <button key={i} onClick={()=>{
                    setChoiceMade(opt);
                    setSiegeBonus(b=>b+opt.siegeBonus);
                    setMode("intro");
                  }} style={{padding:"13px 15px",textAlign:"left",
                    background:`${opt.effect==="bonus"?"rgba(50,100,30,0.1)":opt.effect==="risky"?"rgba(150,50,20,0.1)":"rgba(255,255,255,0.02)"}`,
                    border:`1px solid ${opt.effect==="bonus"?"rgba(60,130,35,0.3)":opt.effect==="risky"?"rgba(180,60,25,0.3)":"rgba(255,255,255,0.07)"}`,
                    borderRadius:"5px",cursor:"pointer",transition:"all 0.15s"}}>
                    <div style={{fontSize:"13px",fontWeight:"bold",
                      color:opt.effect==="bonus"?"#6aaa50":opt.effect==="risky"?"#cc6633":"#c9a84c",
                      marginBottom:"4px"}}>
                      {opt.label}
                      <span style={{fontSize:"10px",marginLeft:"8px",opacity:0.6,fontWeight:"normal"}}>
                        {opt.siegeBonus>0?`+${opt.siegeBonus} Bonus`:opt.siegeBonus<0?`${opt.siegeBonus} Malus`:"neutral"}
                      </span>
                    </div>
                    <div style={{fontSize:"12px",color:"#5a4a28",lineHeight:1.6}}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Chosen result badge */}
        {choiceMade&&mode==="intro"&&(
          <div style={{margin:"0 18px 12px",padding:"8px 12px",
            background:"rgba(50,100,30,0.08)",border:"1px solid rgba(60,130,35,0.2)",
            borderRadius:"4px",display:"flex",gap:"8px",alignItems:"center"}}>
            <span>🎲</span>
            <div style={{flex:1}}>
              <div style={{fontSize:"11px",color:"#6aaa50",marginBottom:"2px"}}>Entscheidung getroffen</div>
              <div style={{fontSize:"12px",color:"#4a7a30"}}>{choiceMade.label}</div>
            </div>
            {siegeBonus!==0&&<div style={{fontSize:"12px",fontWeight:"bold",
              color:siegeBonus>0?"#6aaa50":"#cc6633"}}>
              {siegeBonus>0?"+":""}{siegeBonus}
            </div>}
          </div>
        )}

        {/* MODE: Explore */}
        {mode==="explore"&&(
          <CampaignExploreMap
            castle={currentCastle}
            onStartSiege={()=>setMode("siege")}
            onBack={()=>setMode("intro")}
          />
        )}

        {/* MODE: Siege — real roleplay */}
        {mode==="siege"&&(
          <CampaignExplore
            castle={currentCastle}
            general={general}
            season={season}
            siegeBonus={siegeBonus}
            choiceMade={choiceMade}
            onSiegeDone={handleSiegeDone}
            onBack={()=>setMode("intro")}
          />
        )}

        {/* Previous results */}
        {results.length>0&&mode==="intro"&&(
          <div style={{padding:"0 18px 12px",display:"flex",gap:"5px",flexWrap:"wrap"}}>
            {results.map((r,i)=>{
              const c=castles.find(x=>x.id===activeCampaign.castles[i]);
              return(
                <div key={i} style={{padding:"3px 8px",fontSize:"11px",
                  background:r.won?"rgba(30,80,20,0.15)":"rgba(80,20,10,0.15)",
                  border:`1px solid ${r.won?"rgba(50,140,30,0.25)":"rgba(150,40,20,0.25)"}`,
                  borderRadius:"4px",color:r.won?"#6aaa50":"#cc5533",
                  display:"flex",gap:"4px",alignItems:"center"}}>
                  <span>{c?.icon}</span>{c?.name.split(" ")[0]} {r.won?"✅":"❌"}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Campaign selection
  return(
    <div style={{padding:"18px 20px"}}>
      <div style={{fontSize:"16px",fontWeight:"bold",color:"#f0e6cc",marginBottom:"5px"}}>📖 Kampagnenmodus</div>
      <div style={{fontSize:"13px",color:"#8a7a58",marginBottom:"18px",lineHeight:1.7}}>
        Erlebe Festungen als zusammenhängende Geschichte — erkunde Grundrisse, kämpfe echte Belagerungen.
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
        {CAMPAIGNS.map(camp=>{
          const saved=campaignScores[camp.id];
          const campCastles=camp.castles.map(id=>castles.find(c=>c.id===id)).filter(Boolean);
          return(
            <div key={camp.id}
              onClick={()=>startCampaign(camp)}
              style={{padding:"16px 18px",background:"rgba(255,255,255,0.02)",
                border:"1px solid rgba(255,255,255,0.06)",borderRadius:"6px",
                cursor:"pointer",transition:"all 0.15s",animation:"fadeIn 0.3s ease"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.12)"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"}>
              <div style={{display:"flex",gap:"12px",alignItems:"flex-start"}}>
                <span style={{fontSize:"28px",flexShrink:0}}>{camp.icon}</span>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:"4px",flexWrap:"wrap"}}>
                    <div style={{fontSize:"15px",fontWeight:"bold",color:"#f0e6cc"}}>{camp.name}</div>
                    <div style={{padding:"2px 7px",borderRadius:"10px",fontSize:"10px",
                      background:`${diffColor[camp.difficulty]}18`,
                      border:`1px solid ${diffColor[camp.difficulty]}44`,
                      color:diffColor[camp.difficulty]}}>{camp.difficulty}</div>
                    {saved?.completed&&<div style={{padding:"2px 7px",borderRadius:"10px",fontSize:"10px",
                      background:"rgba(30,80,20,0.2)",border:"1px solid rgba(50,140,30,0.3)",color:"#6aaa50"}}>
                      ✅ {saved.score}%</div>}
                  </div>
                  <div style={{fontSize:"12px",color:"#7a6a48",marginBottom:"6px",lineHeight:1.7}}>{camp.desc}</div>
                  <div style={{fontSize:"11px",color:"#9a8a6a",marginBottom:"8px"}}>⏳ {camp.era}</div>
                  <div style={{display:"flex",gap:"5px",flexWrap:"wrap",alignItems:"center"}}>
                    {campCastles.map(c=>(
                      <span key={c.id} style={{fontSize:"15px"}} title={c.name}>{c.icon}</span>
                    ))}
                    <span style={{fontSize:"11px",color:"#5a4a28",marginLeft:"4px"}}>
                      {camp.castles.length} Burgen
                    </span>
                  </div>
                </div>
                <div style={{fontSize:"20px",color:"#8a7a60",flexShrink:0,alignSelf:"center"}}>›</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
// ── Timeline ───────────────────────────────────────────────────────────────
function GlobalStats({scores,playStats,castles}){
  const [atab,setAtab]=useState("overview");

  const entries=Object.entries(scores).map(([id,s])=>{
    const c=castles.find(x=>x.id===id);
    return c?{...s,id,castle:c}:null;
  }).filter(Boolean);

  const total=entries.length;
  const wins=entries.filter(e=>e.won).length;
  const winRate=total>0?Math.round(wins/total*100):0;
  const avgRatingVal=entries.length>0?Math.round(entries.reduce((a,e)=>a+(e.rating||0),0)/entries.length*10)/10:0;

  const byRegion=castles.reduce((acc,c)=>{acc[c.region]=(acc[c.region]||0)+1;return acc;},{});
  const byEpoch=castles.reduce((acc,c)=>{acc[c.epoch]=(acc[c.epoch]||0)+1;return acc;},{});

  const topScored=[...castles].sort((a,b)=>avg(b)-avg(a)).slice(0,10);
  const difficultyRanked=[...castles].sort((a,b)=>avg(b)-avg(a));

  const catKeys=['walls','supply','position','garrison','morale'];
  const catLabels={walls:'Mauern',supply:'Versorgung',position:'Geländelage',garrison:'Garnison',morale:'Moral'};
  const catAvgVals=catKeys.map(k=>({
    k,label:catLabels[k],
    val:Math.round(castles.reduce((a,c)=>a+c.ratings[k],0)/castles.length),
  }));

  const generalWinsMap=playStats?.generalWins||{};
  const generalRanking=[...GENERALS].map(g=>({...g,wins:generalWinsMap[g.id]||0})).sort((a,b)=>b.wins-a.wins);

  const siegedByRegion=Object.keys(byRegion).map(r=>({
    region:r,total:byRegion[r],
    sieged:entries.filter(e=>e.castle.region===r).length,
    won:entries.filter(e=>e.castle.region===r&&e.won).length,
  })).sort((a,b)=>b.total-a.total);

  // ── NEW: type comparison data ──────────────────────────────────────────
  const realCastles=castles.filter(c=>c.type==="real");
  const fantasyCastles=castles.filter(c=>c.type==="fantasy");
  const realEntries=entries.filter(e=>e.castle.type==="real");
  const fantasyEntries=entries.filter(e=>e.castle.type==="fantasy");
  const catAvgFor=(list,k)=>list.length>0?Math.round(list.reduce((a,c)=>a+c.ratings[k],0)/list.length):0;

  // ── NEW: records data ──────────────────────────────────────────────────
  const allCatKeys=['walls','supply','position','garrison','morale'];
  const recordHigh=allCatKeys.map(k=>({k,label:catLabels[k],castle:[...castles].sort((a,b)=>b.ratings[k]-a.ratings[k])[0]}));
  const mostBalanced=[...castles].sort((a,b)=>{
    const varA=allCatKeys.reduce((s,k)=>s+Math.pow(a.ratings[k]-avg(a),2),0);
    const varB=allCatKeys.reduce((s,k)=>s+Math.pow(b.ratings[k]-avg(b),2),0);
    return varA-varB;
  }).slice(0,5);
  const mostSpecialized=[...castles].sort((a,b)=>{
    const varA=allCatKeys.reduce((s,k)=>s+Math.pow(a.ratings[k]-avg(a),2),0);
    const varB=allCatKeys.reduce((s,k)=>s+Math.pow(b.ratings[k]-avg(b),2),0);
    return varB-varA;
  }).slice(0,5);
  const topRating=[...castles].sort((a,b)=>avg(b)-avg(a))[0];
  const topSingleRating=allCatKeys.reduce((best,k)=>{
    const topC=[...castles].sort((a,b)=>b.ratings[k]-a.ratings[k])[0];
    return topC.ratings[k]>(best?best.val:0)?{castle:topC,k,val:topC.ratings[k],label:catLabels[k]}:best;
  },null);

  const tabBtn=(id,l)=>(
    <button key={id} onClick={()=>setAtab(id)} style={{
      padding:"4px 13px",fontSize:"11px",cursor:"pointer",letterSpacing:"1px",
      background:atab===id?"rgba(201,168,76,0.15)":"rgba(255,255,255,0.02)",
      border:`1px solid ${atab===id?"rgba(201,168,76,0.4)":"rgba(255,255,255,0.05)"}`,
      color:atab===id?"#c9a84c":"#6a5a38",borderRadius:"12px",
    }}>{l}</button>
  );

  return(
    <div style={{padding:"16px 20px"}}>
      {/* Sub-tab header */}
      <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"16px",flexWrap:"wrap"}}>
        <div style={{fontSize:"15px",fontWeight:"bold",color:"#f0e6cc",marginRight:"auto"}}>📊 Atlas-Statistiken</div>
        {tabBtn("overview","Übersicht")}
        {tabBtn("rankings","Ranglisten")}
        {tabBtn("analyse","Analyse")}
        {tabBtn("typen","Typen")}
        {tabBtn("rekorde","Rekorde")}
      </div>

      {/* ── ÜBERSICHT ── */}
      {atab==="overview"&&<>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px",marginBottom:"12px"}}>
          {[
            {l:"Burgen gesamt",v:castles.length,icon:"🏰",c:"#c9a84c"},
            {l:"Historisch",v:castles.filter(c=>c.type==="real").length,icon:"🌍",c:"#8aaa68"},
            {l:"Fantasy",v:castles.filter(c=>c.type==="fantasy").length,icon:"✦",c:"#9988bb"},
            {l:"Belagert",v:total,icon:"⚔️",c:"#cc8844"},
            {l:"Siege",v:wins,icon:"✅",c:"#6aaa50"},
            {l:"Niederlagen",v:total-wins,icon:"❌",c:"#cc5544"},
          ].map(s=>(
            <div key={s.l} style={{padding:"12px",background:"rgba(255,255,255,0.02)",
              border:"1px solid rgba(255,255,255,0.04)",borderRadius:"6px",textAlign:"center"}}>
              <div style={{fontSize:"18px",marginBottom:"3px"}}>{s.icon}</div>
              <div style={{fontSize:"21px",fontWeight:"bold",color:s.c}}>{s.v}</div>
              <div style={{fontSize:"10px",color:"#8a7a5a",letterSpacing:"1px",marginTop:"2px"}}>{s.l.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Atlas progress */}
        <div style={{padding:"14px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"6px",marginBottom:"10px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
            <div style={{fontSize:"11px",color:"#c9a84c",letterSpacing:"2px"}}>🗺️ ATLAS-FORTSCHRITT</div>
            <div style={{fontSize:"12px",color:"#7a6a40"}}>{total}/{castles.length} ({Math.round(total/castles.length*100)}%)</div>
          </div>
          <div style={{height:"7px",background:"rgba(255,255,255,0.04)",borderRadius:"4px",overflow:"hidden",marginBottom:"10px"}}>
            <div style={{height:"100%",width:`${(total/castles.length)*100}%`,
              background:"linear-gradient(90deg,#c9a84c,#e8c860)",borderRadius:"4px"}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"6px"}}>
            {[
              {l:"Siegquote",v:`${winRate}%`,c:rCol(winRate)},
              {l:"Ø Rating",v:avgRatingVal?`${avgRatingVal}/10`:"—",c:rCol(avgRatingVal*10)},
              {l:"Beststreak",v:playStats?.streak||0,c:"#cc8844"},
              {l:"Kampagnen",v:playStats?.campaignsDone||0,c:"#9988bb"},
            ].map(x=>(
              <div key={x.l} style={{textAlign:"center",padding:"8px 4px",background:"rgba(255,255,255,0.015)",borderRadius:"4px"}}>
                <div style={{fontSize:"16px",fontWeight:"bold",color:x.c}}>{x.v}</div>
                <div style={{fontSize:"9px",color:"#8a7860",letterSpacing:"1px",marginTop:"2px"}}>{x.l.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Win/loss bar */}
        {total>0&&(
          <div style={{padding:"14px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"6px",marginBottom:"10px"}}>
            <div style={{fontSize:"11px",color:"#c9a84c",letterSpacing:"2px",marginBottom:"8px"}}>⚔️ BELAGERUNGS-BILANZ</div>
            <div style={{display:"flex",gap:"3px",alignItems:"center",marginBottom:"6px",height:"10px"}}>
              <div style={{flex:wins,height:"100%",background:"linear-gradient(90deg,rgba(80,160,60,0.5),rgba(100,180,80,0.7))",borderRadius:"4px 0 0 4px",minWidth:"4px"}}/>
              <div style={{flex:total-wins,height:"100%",background:"linear-gradient(90deg,rgba(160,50,40,0.7),rgba(180,60,50,0.5))",borderRadius:"0 4px 4px 0",minWidth:"4px"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px",color:"#9a8a6a"}}>
              <span>✅ {wins} Siege ({winRate}%)</span>
              <span>❌ {total-wins} Niederlagen</span>
            </div>
          </div>
        )}

        {/* Regions breakdown with progress */}
        <div style={{padding:"14px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"6px"}}>
          <div style={{fontSize:"11px",color:"#c9a84c",letterSpacing:"2px",marginBottom:"10px"}}>🌍 REGIONEN-ÜBERBLICK</div>
          {siegedByRegion.map(({region,total:t,sieged,won})=>(
            <div key={region} style={{marginBottom:"7px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"2px"}}>
                <div style={{fontSize:"11px",color:"#7a6a40",flex:1,textTransform:"capitalize"}}>{region}</div>
                <div style={{fontSize:"10px",color:"#5a4a28"}}>{sieged}/{t}</div>
                {won>0&&<div style={{fontSize:"10px",color:"#6aaa50"}}>✅ {won}</div>}
              </div>
              <div style={{height:"5px",background:"rgba(255,255,255,0.04)",borderRadius:"3px",overflow:"hidden"}}>
                <div style={{height:"100%",display:"flex",borderRadius:"3px"}}>
                  <div style={{width:`${won/t*100}%`,background:"rgba(100,180,80,0.55)"}}/>
                  <div style={{width:`${(sieged-won)/t*100}%`,background:"rgba(180,80,50,0.5)"}}/>
                  <div style={{flex:1}}/>
                </div>
              </div>
            </div>
          ))}
          <div style={{display:"flex",gap:"14px",marginTop:"8px",fontSize:"10px",color:"#8a7a5a"}}>
            <span><span style={{display:"inline-block",width:"8px",height:"8px",background:"rgba(100,180,80,0.55)",borderRadius:"1px",marginRight:"3px",verticalAlign:"middle"}}/>Gewonnen</span>
            <span><span style={{display:"inline-block",width:"8px",height:"8px",background:"rgba(180,80,50,0.5)",borderRadius:"1px",marginRight:"3px",verticalAlign:"middle"}}/>Verloren</span>
            <span><span style={{display:"inline-block",width:"8px",height:"8px",background:"rgba(255,255,255,0.04)",borderRadius:"1px",marginRight:"3px",verticalAlign:"middle"}}/>Noch nicht</span>
          </div>
        </div>
      </>}

      {/* ── RANGLISTEN ── */}
      {atab==="rankings"&&<>
        {/* Top 10 overall */}
        <div style={{padding:"14px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"6px",marginBottom:"12px"}}>
          <div style={{fontSize:"11px",color:"#c9a84c",letterSpacing:"2px",marginBottom:"10px"}}>🏆 TOP-10 GESAMTWERTUNG</div>
          {topScored.map((c,i)=>{
            const played=!!scores[c.id];
            const medalC=i===0?"#c9a84c":i===1?"#999":i===2?"#7a5020":"#3a2a14";
            return(
              <div key={c.id} style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:"5px",
                padding:"5px 8px",borderRadius:"4px",
                background:i<3?"rgba(201,168,76,0.04)":"transparent",
                border:i<3?"1px solid rgba(201,168,76,0.07)":"1px solid transparent"}}>
                <div style={{fontSize:"12px",color:medalC,width:"18px",textAlign:"center",fontWeight:"bold"}}>{i+1}</div>
                <span style={{fontSize:"14px"}}>{c.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"12px",color:"#9a8860",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</div>
                  <div style={{fontSize:"10px",color:"#5a4a28"}}>{c.region} · {c.epoch}</div>
                </div>
                {played&&<span style={{fontSize:"11px"}}>{scores[c.id].won?"✅":"❌"}</span>}
                <div style={{fontSize:"14px",fontWeight:"bold",color:rCol(avg(c)),fontFamily:"monospace",flexShrink:0}}>{avg(c)}</div>
              </div>
            );
          })}
        </div>

        {/* Category leaders 2x3 (including morale) */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"12px"}}>
          {[
            {k:"walls",l:"🧱 Stärkste Mauern"},
            {k:"position",l:"⛰️ Beste Geländelage"},
            {k:"supply",l:"🍖 Beste Versorgung"},
            {k:"garrison",l:"🏹 Stärkste Garnison"},
            {k:"morale",l:"❤️ Höchste Moral"},
          ].map(({k,l})=>{
            const top3=[...castles].sort((a,b)=>b.ratings[k]-a.ratings[k]).slice(0,3);
            return(
              <div key={k} style={{padding:"12px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"6px"}}>
                <div style={{fontSize:"10px",color:"#c9a84c",letterSpacing:"1px",marginBottom:"8px"}}>{l}</div>
                {top3.map((c,i)=>(
                  <div key={c.id} style={{display:"flex",alignItems:"center",gap:"5px",marginBottom:"4px"}}>
                    <div style={{fontSize:"10px",color:i===0?"#c9a84c":"#4a3a20",width:"13px"}}>{i+1}</div>
                    <span style={{fontSize:"12px"}}>{c.icon}</span>
                    <div style={{flex:1,fontSize:"11px",color:"#7a6a40",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                    <div style={{fontSize:"12px",fontWeight:"bold",color:rCol(c.ratings[k]),fontFamily:"monospace"}}>{c.ratings[k]}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* General leaderboard */}
        <div style={{padding:"14px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"6px"}}>
          <div style={{fontSize:"11px",color:"#c9a84c",letterSpacing:"2px",marginBottom:"10px"}}>🎖️ GENERAL-RANGLISTE</div>
          {generalRanking.map((g,i)=>(
            <div key={g.id} style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:"7px"}}>
              <div style={{fontSize:"11px",color:i===0?"#c9a84c":i===1?"#888":"#4a3a20",width:"16px",textAlign:"center"}}>{i+1}</div>
              <span style={{fontSize:"17px"}}>{g.emoji}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:"12px",color:"#9a8860"}}>{g.name}</div>
                <div style={{fontSize:"10px",color:"#5a4a28"}}>{g.specialty}</div>
              </div>
              <div style={{textAlign:"right",minWidth:"40px"}}>
                <div style={{fontSize:"14px",fontWeight:"bold",color:g.wins>0?"#c9a84c":"#3a2a14"}}>{g.wins}</div>
                <div style={{fontSize:"9px",color:"#8a7a5a",letterSpacing:"1px"}}>SIEGE</div>
              </div>
              {g.wins>0&&(
                <div style={{width:"60px",height:"4px",background:"rgba(255,255,255,0.04)",borderRadius:"2px",overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${(g.wins/Math.max(...generalRanking.map(x=>x.wins),1))*100}%`,
                    background:"linear-gradient(90deg,#c9a84c,#e8c860)",borderRadius:"2px"}}/>
                </div>
              )}
            </div>
          ))}
        </div>
      </>}

      {/* ── ANALYSE ── */}
      {atab==="analyse"&&<>
        {/* Category averages across all castles */}
        <div style={{padding:"14px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"6px",marginBottom:"12px"}}>
          <div style={{fontSize:"11px",color:"#c9a84c",letterSpacing:"2px",marginBottom:"12px"}}>📐 Ø KATEGORIE-WERTUNG — alle {castles.length} Burgen</div>
          {catAvgVals.map(({k,label,val})=>(
            <div key={k} style={{marginBottom:"9px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
                <div style={{fontSize:"11px",color:"#8a7a58"}}>{label}</div>
                <div style={{fontSize:"12px",fontWeight:"bold",color:rCol(val),fontFamily:"monospace"}}>{val}</div>
              </div>
              <div style={{height:"6px",background:"rgba(255,255,255,0.04)",borderRadius:"3px",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${val}%`,
                  background:`linear-gradient(90deg,${rCol(val)}66,${rCol(val)})`,borderRadius:"3px"}}/>
              </div>
            </div>
          ))}
        </div>

        {/* Epoch distribution */}
        <div style={{padding:"14px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"6px",marginBottom:"12px"}}>
          <div style={{fontSize:"11px",color:"#c9a84c",letterSpacing:"2px",marginBottom:"10px"}}>📅 EPOCHEN-VERTEILUNG</div>
          {Object.entries(byEpoch).sort((a,b)=>b[1]-a[1]).map(([ep,cnt])=>{
            const played=entries.filter(e=>e.castle.epoch===ep).length;
            return(
              <div key={ep} style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"6px"}}>
                <div style={{fontSize:"11px",color:"#7a6a40",width:"120px",flexShrink:0}}>{ep}</div>
                <div style={{flex:1,height:"6px",background:"rgba(255,255,255,0.04)",borderRadius:"3px",overflow:"hidden",position:"relative"}}>
                  <div style={{position:"absolute",height:"100%",width:`${cnt/castles.length*100}%`,background:"rgba(201,168,76,0.2)",borderRadius:"3px"}}/>
                  <div style={{position:"absolute",height:"100%",width:`${played/castles.length*100}%`,background:"linear-gradient(90deg,#c9a84c,#aa8830)",borderRadius:"3px"}}/>
                </div>
                <div style={{fontSize:"10px",color:"#5a4a28",width:"38px",textAlign:"right",fontFamily:"monospace"}}>{played}/{cnt}</div>
              </div>
            );
          })}
          <div style={{display:"flex",gap:"14px",marginTop:"6px",fontSize:"10px",color:"#8a7a5a"}}>
            <span><span style={{display:"inline-block",width:"8px",height:"8px",background:"rgba(201,168,76,0.2)",borderRadius:"1px",marginRight:"3px",verticalAlign:"middle"}}/>Gesamt</span>
            <span><span style={{display:"inline-block",width:"8px",height:"8px",background:"#c9a84c",borderRadius:"1px",marginRight:"3px",verticalAlign:"middle"}}/>Belagert</span>
          </div>
        </div>

        {/* Hardest vs Easiest */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"12px"}}>
          <div style={{padding:"12px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"6px"}}>
            <div style={{fontSize:"10px",color:"#cc5544",letterSpacing:"1px",marginBottom:"8px"}}>💀 STÄRKSTE FESTUNGEN</div>
            {difficultyRanked.slice(0,5).map((c,i)=>(
              <div key={c.id} style={{display:"flex",alignItems:"center",gap:"5px",marginBottom:"5px"}}>
                <div style={{fontSize:"10px",color:"#5a3020",width:"13px"}}>{i+1}</div>
                <span style={{fontSize:"12px"}}>{c.icon}</span>
                <div style={{flex:1,fontSize:"11px",color:"#8a7860",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                <div style={{fontSize:"12px",fontWeight:"bold",color:rCol(avg(c)),fontFamily:"monospace"}}>{avg(c)}</div>
              </div>
            ))}
          </div>
          <div style={{padding:"12px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"6px"}}>
            <div style={{fontSize:"10px",color:"#8aaa68",letterSpacing:"1px",marginBottom:"8px"}}>🎯 ANGREIFBARSTE ZIELE</div>
            {[...difficultyRanked].reverse().slice(0,5).map((c,i)=>(
              <div key={c.id} style={{display:"flex",alignItems:"center",gap:"5px",marginBottom:"5px"}}>
                <div style={{fontSize:"10px",color:"#3a5020",width:"13px"}}>{i+1}</div>
                <span style={{fontSize:"12px"}}>{c.icon}</span>
                <div style={{flex:1,fontSize:"11px",color:"#7a8a60",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                <div style={{fontSize:"12px",fontWeight:"bold",color:rCol(avg(c)),fontFamily:"monospace"}}>{avg(c)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional play stats */}
        <div style={{padding:"14px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"6px"}}>
          <div style={{fontSize:"11px",color:"#c9a84c",letterSpacing:"2px",marginBottom:"10px"}}>🧮 SPIELER-STATISTIKEN</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px"}}>
            {[
              {l:"Belagerungen",v:playStats?.sieges||0,icon:"⚔️"},
              {l:"Siege",v:playStats?.wins||0,icon:"✅"},
              {l:"Ges. Tage",v:playStats?.totalDays||0,icon:"📅"},
              {l:"Entscheidungen",v:playStats?.choicesMade||0,icon:"🎲"},
              {l:"Bester Bau",v:playStats?.bestBuild?`${playStats.bestBuild} Pkt`:"—",icon:"🏗️"},
              {l:"Entfernungen",v:playStats?.distancesCalc||0,icon:"📏"},
            ].map(x=>(
              <div key={x.l} style={{padding:"8px",background:"rgba(255,255,255,0.015)",borderRadius:"4px",textAlign:"center"}}>
                <div style={{fontSize:"15px",marginBottom:"2px"}}>{x.icon}</div>
                <div style={{fontSize:"14px",fontWeight:"bold",color:"#c9a84c"}}>{x.v}</div>
                <div style={{fontSize:"9px",color:"#8a7a5a",letterSpacing:"1px"}}>{x.l.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      </>}

      {/* ── TYPEN ── */}
      {atab==="typen"&&<>
        {/* Real vs Fantasy overview */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"12px"}}>
          {[
            {label:"🌍 Historisch",list:realCastles,entries:realEntries,color:"#8aaa68",border:"rgba(138,170,104,0.2)"},
            {label:"✦ Fantasy",list:fantasyCastles,entries:fantasyEntries,color:"#9988bb",border:"rgba(153,136,187,0.2)"},
          ].map(({label,list,entries:ent,color,border})=>{
            const w=ent.filter(e=>e.won).length;
            const wr=ent.length>0?Math.round(w/ent.length*100):0;
            return(
              <div key={label} style={{padding:"14px",background:"rgba(0,0,0,0.2)",border:`1px solid ${border}`,borderRadius:"6px"}}>
                <div style={{fontSize:"12px",color,letterSpacing:"1px",marginBottom:"10px",fontWeight:"bold"}}>{label}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>
                  {[
                    {l:"Burgen",v:list.length},{l:"Belagert",v:ent.length},
                    {l:"Siege",v:w},{l:"Siegquote",v:ent.length>0?`${wr}%`:"—"},
                  ].map(x=>(
                    <div key={x.l} style={{textAlign:"center",padding:"6px 4px",background:"rgba(255,255,255,0.015)",borderRadius:"4px"}}>
                      <div style={{fontSize:"15px",fontWeight:"bold",color}}>{x.v}</div>
                      <div style={{fontSize:"9px",color:"#8a7a5a",letterSpacing:"1px"}}>{x.l.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Category comparison real vs fantasy */}
        <div style={{padding:"14px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"6px",marginBottom:"12px"}}>
          <div style={{fontSize:"11px",color:"#c9a84c",letterSpacing:"2px",marginBottom:"12px"}}>📐 KATEGORIE-VERGLEICH: HISTORISCH VS. FANTASY</div>
          {allCatKeys.map(k=>{
            const rVal=catAvgFor(realCastles,k);
            const fVal=catAvgFor(fantasyCastles,k);
            const maxVal=Math.max(rVal,fVal,1);
            return(
              <div key={k} style={{marginBottom:"10px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
                  <div style={{fontSize:"11px",color:"#8a7a58"}}>{catLabels[k]}</div>
                  <div style={{display:"flex",gap:"10px"}}>
                    <span style={{fontSize:"11px",color:"#8aaa68",fontFamily:"monospace"}}>🌍 {rVal}</span>
                    <span style={{fontSize:"11px",color:"#9988bb",fontFamily:"monospace"}}>✦ {fVal}</span>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
                  <div style={{height:"5px",background:"rgba(255,255,255,0.04)",borderRadius:"3px",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${rVal}%`,background:"rgba(138,170,104,0.6)",borderRadius:"3px"}}/>
                  </div>
                  <div style={{height:"5px",background:"rgba(255,255,255,0.04)",borderRadius:"3px",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${fVal}%`,background:"rgba(153,136,187,0.6)",borderRadius:"3px"}}/>
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{display:"flex",gap:"14px",marginTop:"6px",fontSize:"10px",color:"#8a7a5a"}}>
            <span><span style={{display:"inline-block",width:"8px",height:"8px",background:"rgba(138,170,104,0.6)",borderRadius:"1px",marginRight:"3px",verticalAlign:"middle"}}/>Historisch</span>
            <span><span style={{display:"inline-block",width:"8px",height:"8px",background:"rgba(153,136,187,0.6)",borderRadius:"1px",marginRight:"3px",verticalAlign:"middle"}}/>Fantasy</span>
          </div>
        </div>

        {/* Top 5 per type */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
          {[
            {label:"🌍 Stärkste hist. Burgen",list:realCastles,color:"#8aaa68"},
            {label:"✦ Stärkste Fantasy-Burgen",list:fantasyCastles,color:"#9988bb"},
          ].map(({label,list,color})=>(
            <div key={label} style={{padding:"12px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"6px"}}>
              <div style={{fontSize:"10px",color,letterSpacing:"1px",marginBottom:"8px"}}>{label}</div>
              {[...list].sort((a,b)=>avg(b)-avg(a)).slice(0,5).map((c,i)=>(
                <div key={c.id} style={{display:"flex",alignItems:"center",gap:"5px",marginBottom:"4px"}}>
                  <div style={{fontSize:"10px",color:i===0?color:"#8a7860",width:"13px"}}>{i+1}</div>
                  <span style={{fontSize:"12px"}}>{c.icon}</span>
                  <div style={{flex:1,fontSize:"11px",color:"#7a6a40",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                  <div style={{fontSize:"12px",fontWeight:"bold",color:rCol(avg(c)),fontFamily:"monospace"}}>{avg(c)}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </>}

      {/* ── REKORDE ── */}
      {atab==="rekorde"&&<>
        {/* Absolute records */}
        <div style={{padding:"14px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"6px",marginBottom:"12px"}}>
          <div style={{fontSize:"11px",color:"#c9a84c",letterSpacing:"2px",marginBottom:"10px"}}>🏅 KATEGORIE-REKORDE</div>
          {recordHigh.map(({k,label,castle:c})=>(
            <div key={k} style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px",padding:"6px 8px",background:"rgba(255,255,255,0.015)",borderRadius:"4px"}}>
              <div style={{fontSize:"10px",color:"#5a4a28",width:"90px",flexShrink:0}}>{label}</div>
              <span style={{fontSize:"14px"}}>{c.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"11px",color:"#9a8860",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                <div style={{fontSize:"9px",color:"#5a4a28"}}>{c.region} · {c.epoch}</div>
              </div>
              <div style={{fontSize:"16px",fontWeight:"bold",color:rCol(c.ratings[k]),fontFamily:"monospace",flexShrink:0}}>{c.ratings[k]}</div>
            </div>
          ))}
        </div>

        {/* Most balanced */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"12px"}}>
          <div style={{padding:"12px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"6px"}}>
            <div style={{fontSize:"10px",color:"#c9a84c",letterSpacing:"1px",marginBottom:"8px"}}>⚖️ AUSGEWOGENSTE BURGEN</div>
            {mostBalanced.map((c,i)=>(
              <div key={c.id} style={{display:"flex",alignItems:"center",gap:"5px",marginBottom:"4px"}}>
                <div style={{fontSize:"10px",color:i===0?"#c9a84c":"#4a3a20",width:"13px"}}>{i+1}</div>
                <span style={{fontSize:"12px"}}>{c.icon}</span>
                <div style={{flex:1,fontSize:"11px",color:"#7a6a40",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                <div style={{fontSize:"12px",fontWeight:"bold",color:rCol(avg(c)),fontFamily:"monospace"}}>{avg(c)}</div>
              </div>
            ))}
          </div>
          <div style={{padding:"12px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"6px"}}>
            <div style={{fontSize:"10px",color:"#cc8844",letterSpacing:"1px",marginBottom:"8px"}}>🎯 SPEZIALISIERTE BURGEN</div>
            {mostSpecialized.map((c,i)=>(
              <div key={c.id} style={{display:"flex",alignItems:"center",gap:"5px",marginBottom:"4px"}}>
                <div style={{fontSize:"10px",color:i===0?"#cc8844":"#4a3a20",width:"13px"}}>{i+1}</div>
                <span style={{fontSize:"12px"}}>{c.icon}</span>
                <div style={{flex:1,fontSize:"11px",color:"#7a6a40",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                <div style={{fontSize:"12px",fontWeight:"bold",color:rCol(avg(c)),fontFamily:"monospace"}}>{avg(c)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Rating distribution */}
        <div style={{padding:"14px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"6px",marginBottom:"12px"}}>
          <div style={{fontSize:"11px",color:"#c9a84c",letterSpacing:"2px",marginBottom:"10px"}}>📊 GESAMTWERTUNGS-VERTEILUNG</div>
          {[
            {range:"90–100",label:"Legendär",color:"#c9a84c"},
            {range:"75–89",label:"Stark",color:"#8aaa68"},
            {range:"60–74",label:"Solide",color:"#4488cc"},
            {range:"40–59",label:"Schwach",color:"#cc8844"},
            {range:"<40",label:"Verwundbar",color:"#cc5544"},
          ].map(({range,label,color})=>{
            const count=castles.filter(c=>{
              const v=avg(c);
              if(range==="90–100")return v>=90;
              if(range==="75–89")return v>=75&&v<90;
              if(range==="60–74")return v>=60&&v<75;
              if(range==="40–59")return v>=40&&v<60;
              return v<40;
            }).length;
            const pct=Math.round(count/castles.length*100);
            return(
              <div key={range} style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"6px"}}>
                <div style={{fontSize:"10px",color,width:"60px",flexShrink:0}}>{range}</div>
                <div style={{fontSize:"10px",color:"#5a4a28",width:"55px",flexShrink:0}}>{label}</div>
                <div style={{flex:1,height:"6px",background:"rgba(255,255,255,0.04)",borderRadius:"3px",overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:`${color}88`,borderRadius:"3px"}}/>
                </div>
                <div style={{fontSize:"10px",color:"#5a4a28",width:"30px",textAlign:"right",fontFamily:"monospace"}}>{count}</div>
              </div>
            );
          })}
        </div>

        {/* Fun records */}
        <div style={{padding:"14px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"6px"}}>
          <div style={{fontSize:"11px",color:"#c9a84c",letterSpacing:"2px",marginBottom:"10px"}}>⭐ BESONDERE REKORDE</div>
          {[
            {l:"Höchste Gesamtwertung",v:`${avg(topRating)} Punkte`,sub:topRating.name,icon:topRating.icon},
            {l:"Höchste Einzelwertung",v:`${topSingleRating?.val} (${topSingleRating?.label})`,sub:topSingleRating?.castle.name,icon:topSingleRating?.castle.icon},
            {l:"Meiste Regionen",v:`${Object.keys(castles.reduce((a,c)=>{a[c.region]=1;return a},{})).length} Regionen`,sub:"Weltweit verteilt",icon:"🌍"},
            {l:"Früheste Burg",v:`${Math.abs(castles.reduce((b,c)=>c.year<b.year?c:b).year)} v. Chr.`,sub:castles.reduce((b,c)=>c.year<b.year?c:b).name,icon:castles.reduce((b,c)=>c.year<b.year?c:b).icon},
            {l:"Späteste Burg",v:`${castles.reduce((b,c)=>c.year>b.year?c:b).year} n. Chr.`,sub:castles.reduce((b,c)=>c.year>b.year?c:b).name,icon:castles.reduce((b,c)=>c.year>b.year?c:b).icon},
          ].map(x=>(
            <div key={x.l} style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"7px",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
              <span style={{fontSize:"15px",flexShrink:0}}>{x.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"10px",color:"#5a4a28",letterSpacing:"1px"}}>{x.l.toUpperCase()}</div>
                <div style={{fontSize:"11px",color:"#7a6a40",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.sub}</div>
              </div>
              <div style={{fontSize:"13px",fontWeight:"bold",color:"#c9a84c",flexShrink:0,fontFamily:"monospace",textAlign:"right"}}>{x.v}</div>
            </div>
          ))}
        </div>
      </>}
    </div>
  );
}

function Timeline({castles,onSelect}){
  const [epochF,setEpochF]=useState("all");
  const epochs=[...new Set(castles.map(c=>c.epoch))].sort();
  const filtered=epochF==="all"?castles:castles.filter(c=>c.epoch===epochF);
  const sorted=[...filtered].sort((a,b)=>a.year-b.year);
  const minY=Math.min(...sorted.map(c=>c.year)),maxY=Math.max(...sorted.map(c=>c.year)),range=maxY-minY||1;
  return(
    <div style={{padding:"18px"}}>
      <div style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:"14px",flexWrap:"wrap"}}>
        <div style={{fontSize:"14px",fontWeight:"bold",color:"#f0e6cc"}}>📅 Chronologischer Zeitstrahl</div>
        <div style={{display:"flex",gap:"4px",flexWrap:"wrap",marginLeft:"auto"}}>
          {["all",...epochs].map(e=>(
            <button key={e} onClick={()=>setEpochF(e)}
              style={{padding:"3px 9px",fontSize:"11px",
                background:epochF===e?"rgba(201,168,76,0.14)":"rgba(255,255,255,0.02)",
                border:`1px solid ${epochF===e?"rgba(201,168,76,0.35)":"rgba(255,255,255,0.05)"}`,
                color:epochF===e?"#c9a84c":"#5a4a28",borderRadius:"12px",cursor:"pointer"}}>
              {e==="all"?"Alle":e}
            </button>
          ))}
        </div>
      </div>
      <div style={{position:"relative",height:"130px",marginBottom:"6px"}}>
        <div style={{position:"absolute",top:"63px",left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(201,168,76,.4),transparent)"}}/>
        {sorted.map((c,i)=>{
          const pct=sorted.length>1?((c.year-minY)/range)*100:50;
          const isUp=i%2===0;
          return(
            <button key={c.id} onClick={()=>onSelect(c)} title={`${c.name} · ${c.era}`}
              style={{position:"absolute",left:`${pct}%`,top:isUp?"4px":"68px",
                transform:"translateX(-50%)",background:"transparent",border:"none",cursor:"pointer",padding:0}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"1px"}}>
                {isUp&&<div style={{fontSize:"10px",color:"#b09a70",whiteSpace:"nowrap",maxWidth:"60px",overflow:"hidden",textOverflow:"ellipsis",textAlign:"center"}}>{c.name.split(" ")[0]}</div>}
                <div style={{fontSize:"13px",padding:"2px",background:`${c.theme.accent}12`,border:`1px solid ${c.theme.accent}28`,borderRadius:"50%",width:"24px",height:"24px",display:"flex",alignItems:"center",justifyContent:"center"}}>{c.icon}</div>
                {!isUp&&<div style={{fontSize:"10px",color:"#b09a70",whiteSpace:"nowrap",maxWidth:"60px",overflow:"hidden",textOverflow:"ellipsis",textAlign:"center"}}>{c.name.split(" ")[0]}</div>}
                <div style={{fontSize:"9px",color:"#9cb0de",fontFamily:"monospace"}}>{c.year>0?c.year:`${Math.abs(c.year)}v`}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px",color:"#9cb0de",fontFamily:"monospace",marginBottom:"16px"}}>
        <span>{minY>0?`${minY} n.Chr.`:`${Math.abs(minY)} v.Chr.`}</span>
        <span style={{color:"#9a8a6a"}}>{sorted.length} Burgen</span>
        <span>{maxY>0?`${maxY} n.Chr.`:`${Math.abs(maxY)} v.Chr.`}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:"5px"}}>
        {sorted.map(c=>(
          <button key={c.id} onClick={()=>onSelect(c)}
            style={{padding:"8px 10px",textAlign:"left",background:"rgba(255,255,255,.016)",
              border:"1px solid rgba(255,255,255,.035)",borderRadius:"4px",cursor:"pointer",
              display:"flex",gap:"8px",alignItems:"center"}}>
            <span style={{fontSize:"16px"}}>{c.icon}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:"12px",fontWeight:"bold",color:"#9a8860",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</div>
              <div style={{fontSize:"11px",color:"#9cb0de"}}>{c.era}</div>
            </div>
            <div style={{fontSize:"14px",fontWeight:"bold",color:rCol(avg(c)),flexShrink:0}}>{avg(c)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Achievements ───────────────────────────────────────────────────────────
const ACHIEVEMENTS = [
  // Belagerungs-Erfolge
  {id:"first_blood",    cat:"⚔️",name:"Erste Bresche",    desc:"Erste Belagerung gewonnen",            icon:"🏴", check:(s,c,p)=>Object.values(s).some(x=>x.won)},
  {id:"siege_master",  cat:"⚔️",name:"Belagerungsmeister",desc:"10 Burgen erfolgreich eingenommen",    icon:"⚔️", check:(s,c,p)=>Object.values(s).filter(x=>x.won).length>=10},
  {id:"unstoppable",   cat:"⚔️",name:"Unaufhaltsam",      desc:"5 Siege in Folge",                    icon:"🔥", check:(s,c,p)=>p.streak>=5},
  {id:"diplomat",      cat:"⚔️",name:"Diplomat",          desc:"Saladin gewählt und Belagerung gewonnen",icon:"🌙",check:(s,c,p)=>p.generalWins?.saladin>=1},
  {id:"engineer",      cat:"⚔️",name:"Ingenieur",         desc:"Caesar gewählt und Belagerung gewonnen", icon:"🦅",check:(s,c,p)=>p.generalWins?.caesar>=1},

  // Burgen-Erkunder
  {id:"wanderer",      cat:"🌍",name:"Wanderer",           desc:"10 verschiedene Burgen besucht",       icon:"🌍", check:(s,c,p)=>Object.keys(s).length>=10},
  {id:"world_traveler",cat:"🌍",name:"Weltreisender",      desc:"Burgen aus 4 verschiedenen Regionen",  icon:"✈️", check:(s,c,p)=>new Set(c.filter(x=>s[x.id]).map(x=>x.region)).size>=4},
  {id:"time_traveler", cat:"🌍",name:"Zeitreisender",      desc:"Burgen aus 3 verschiedenen Epochen",   icon:"⏳", check:(s,c,p)=>new Set(c.filter(x=>s[x.id]).map(x=>x.epoch)).size>=3},
  {id:"fantasy_fan",   cat:"🌍",name:"Fantasy-Ritter",     desc:"5 Fantasy-Festungen belagert",         icon:"✦",  check:(s,c,p)=>c.filter(x=>x.type==="fantasy"&&s[x.id]).length>=5},
  {id:"historian",     cat:"🌍",name:"Historiker",         desc:"Alle Epochen besucht",                 icon:"📜", check:(s,c,p)=>new Set(c.filter(x=>s[x.id]).map(x=>x.epoch)).size>=6},

  // Spezial-Burgen
  {id:"crusader",      cat:"🏰",name:"Kreuzritter",        desc:"Krak des Chevaliers eingenommen",      icon:"✝️", check:(s,c,p)=>s.krak?.won},
  {id:"last_stand",    cat:"🏰",name:"Letztes Aufgebot",   desc:"Masada eingenommen",                  icon:"🪨", check:(s,c,p)=>s.masada?.won},
  {id:"dragon_slayer", cat:"🏰",name:"Drachenbezwinger",   desc:"Barad-dûr oder Isengard eingenommen",  icon:"🐉", check:(s,c,p)=>s.barad_dur?.won||s.isengard?.won},
  {id:"guardian",      cat:"🏰",name:"Hüter des Ordens",   desc:"Alle 3 Sorrowland-Burgen belagert",    icon:"⬛", check:(s,c,p)=>s.schwarzer_bergfried&&s.castle_sorrow&&s.gravecrest},
  {id:"walls_of_fire", cat:"🏰",name:"Mauern aus Feuer",   desc:"Helms Klamm eingenommen",              icon:"⚡", check:(s,c,p)=>s.helmsdeep?.won},

  // Kampagnen
  {id:"campaigner",    cat:"📖",name:"Kampagnenkämpfer",   desc:"Erste Kampagne abgeschlossen",         icon:"📖", check:(s,c,p)=>p.campaignsDone>=1},
  {id:"veteran",       cat:"📖",name:"Veteran",            desc:"Alle 5 Kampagnen abgeschlossen",       icon:"🎖️", check:(s,c,p)=>p.campaignsDone>=5},
  {id:"adventurer",    cat:"📖",name:"Abenteurer",         desc:"10 Adventure-Entscheidungen getroffen",icon:"🎲", check:(s,c,p)=>p.choicesMade>=10},
  {id:"silentio",      cat:"📖",name:"In Silentio Vigilamus",desc:"Sorrowland-Kampagne abgeschlossen",  icon:"⬛", check:(s,c,p)=>s.schwarzer_bergfried?.won&&s.castle_sorrow?.won&&s.gravecrest?.won},
  {id:"storyteller",   cat:"📖",name:"Chronist",           desc:"30 Adventure-Entscheidungen getroffen",icon:"📜", check:(s,c,p)=>p.choicesMade>=30},

  // Strategie
  {id:"quick_victory", cat:"📊",name:"Schneller Sieg",     desc:"Belagerung in 3 Zügen gewonnen",       icon:"⚡", check:(s,c,p)=>Object.values(s).some(x=>x.won&&x.turns<=3)},
  {id:"long_siege",    cat:"📊",name:"Ewige Belagerung",   desc:"Belagerung über 9 Züge durchgehalten", icon:"⏰", check:(s,c,p)=>Object.values(s).some(x=>x.turns>=9)},
  {id:"perfectionist", cat:"📊",name:"Perfektionist",      desc:"Rating 9+ im Simulator",               icon:"💎", check:(s,c,p)=>Object.values(s).some(x=>x.rating>=9)},
  {id:"builder_pro",   cat:"📊",name:"Meisterbaumeister",  desc:"Burg mit Gesamtwert 80+ gebaut",        icon:"🏗️", check:(s,c,p)=>p.bestBuild>=80},
  {id:"synergist",     cat:"📊",name:"Synergie-Meister",   desc:"3 aktive Synergien gleichzeitig",       icon:"⚗️", check:(s,c,p)=>p.maxSynergies>=3},
  {id:"ability_user",  cat:"📊",name:"Heldenfähigkeit",    desc:"Erste Spezialfähigkeit eingesetzt",     icon:"⚡", check:(s,c,p)=>p.abilitiesUsed>=1},
  {id:"all_generals",  cat:"📊",name:"Generalstab",        desc:"Mit 5 verschiedenen Generälen gewonnen",icon:"🎖️", check:(s,c,p)=>Object.keys(p.generalWins||{}).length>=5},

  // Neue Regionen — Batch 4
  {id:"samurai",       cat:"🌍",name:"Samurai-Geist",      desc:"Japanische Burg belagert",              icon:"🌸", check:(s,c,p)=>s.osaka?.won||s.kumamoto?.won||s.himeji?.won},
  {id:"inca_trail",    cat:"🌍",name:"Inka-Wanderer",       desc:"Sacsayhuamán belagert",                icon:"🦙", check:(s,c,p)=>s.sacsayhuaman?.won},
  {id:"africa_rising", cat:"🌍",name:"Afrika-Entdecker",    desc:"Zwei afrikanische Festungen belagert",  icon:"🌍", check:(s,c,p)=>['great_zimbabwe','great_enclosure','elmina','ksar_of_ait'].filter(id=>s[id]).length>=2},
  {id:"rajput_honor",  cat:"🌍",name:"Rajput-Ehre",         desc:"Chittorgarh oder Jaisalmer belagert",  icon:"🔥", check:(s,c,p)=>s.chittorgarh?.won||s.jaisalmer?.won},
  {id:"conquistador",  cat:"🌍",name:"Conquistador",        desc:"Chichén Itzá oder Sacsayhuamán eingenommen",icon:"⚔️",check:(s,c,p)=>s.chichen_itza?.won||s.sacsayhuaman?.won},
  {id:"silk_road",     cat:"🌍",name:"Seidenstraße",        desc:"Burgen aus 5 verschiedenen Ländern belagert",icon:"🗺️",check:(s,c,p)=>new Set(c.filter(x=>s[x.id]).map(x=>x.loc.split(",")[1]?.trim()||x.loc)).size>=5},
  {id:"grand_tour",    cat:"🌍",name:"Grand Tour",          desc:"25 verschiedene Burgen besucht",        icon:"🌐", check:(s,c,p)=>Object.keys(s).length>=25},
  {id:"completionist", cat:"🌍",name:"Perfekter Atlas",     desc:"50 Burgen belagert",                   icon:"🏆", check:(s,c,p)=>Object.keys(s).length>=50},

  // Geheime Achievements
  {id:"secret_order",  cat:"⬛",name:"???",                 desc:"Alle drei Ordo-Burgen in einer Session",icon:"⬛", check:(s,c,p)=>s.schwarzer_bergfried&&s.castle_sorrow&&s.gravecrest},
  {id:"pacifist",      cat:"⬛",name:"Friedensfürst",       desc:"10 Belagerungen — aber nur Kapitulation akzeptiert",icon:"🕊️",check:(s,c,p)=>p.sieges>=10&&(p.wins||0)===0},
  {id:"distance_calc", cat:"⬛",name:"Kartograph",          desc:"Entfernung zwischen 5 Burgenpaaren berechnet",icon:"📏",check:(s,c,p)=>p.distancesCalc>=5},
];

function checkAchievements(scores,castles,playStats){
  return ACHIEVEMENTS.map(a=>({
    ...a,
    unlocked: !!a.check(scores,castles,playStats||{}),
  }));
}

function AchievementToast({achievement,onClose}){
  useEffect(()=>{const t=setTimeout(onClose,4000);return()=>clearTimeout(t);},[]);
  return(
    <div style={{position:"fixed",bottom:"20px",right:"20px",zIndex:9999,
      padding:"14px 18px",background:"linear-gradient(135deg,rgba(20,14,4,0.98),rgba(10,7,2,0.99))",
      border:"1px solid rgba(201,168,76,0.45)",borderLeft:"4px solid #c9a84c",
      borderRadius:"6px",boxShadow:"0 8px 32px rgba(0,0,0,0.7),0 0 20px rgba(201,168,76,0.15)",
      display:"flex",gap:"12px",alignItems:"center",maxWidth:"320px",
      animation:"slideUp 0.3s ease"}}>
      <div style={{fontSize:"28px"}}>{achievement.icon}</div>
      <div>
        <div style={{fontSize:"10px",color:"#c9a84c",letterSpacing:"2px",marginBottom:"2px"}}>
          🏆 ACHIEVEMENT FREIGESCHALTET
        </div>
        <div style={{fontSize:"14px",fontWeight:"bold",color:"#f0e6cc"}}>{achievement.name}</div>
        <div style={{fontSize:"11px",color:"#8a7a58",marginTop:"1px"}}>{achievement.desc}</div>
      </div>
    </div>
  );
}

function AchievementsPanel({scores,castles,playStats}){
  const all=checkAchievements(scores,castles,playStats);
  const unlocked=all.filter(a=>a.unlocked).length;
  const cats=[...new Set(ACHIEVEMENTS.map(a=>a.cat))];

  return(
    <div style={{padding:"18px 20px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
        <div>
          <div style={{fontSize:"16px",fontWeight:"bold",color:"#f0e6cc"}}>🏆 Achievements</div>
          <div style={{fontSize:"12px",color:"#8a7a58",marginTop:"2px"}}>
            {unlocked} / {ACHIEVEMENTS.length} freigeschaltet
          </div>
        </div>
        <div style={{padding:"8px 14px",background:"rgba(201,168,76,0.08)",
          border:"1px solid rgba(201,168,76,0.2)",borderRadius:"20px",
          fontSize:"14px",fontWeight:"bold",color:"#c9a84c"}}>
          {Math.round(unlocked/ACHIEVEMENTS.length*100)}%
        </div>
      </div>

      {/* Progress bar */}
      <div style={{height:"5px",background:"rgba(255,255,255,0.05)",borderRadius:"3px",marginBottom:"20px",overflow:"hidden"}}>
        <div style={{height:"100%",width:`${unlocked/ACHIEVEMENTS.length*100}%`,
          background:"linear-gradient(90deg,#c9a84c,#e8c870)",borderRadius:"3px",
          transition:"width 0.6s ease"}}/>
      </div>

      {cats.map(cat=>(
        <div key={cat} style={{marginBottom:"20px"}}>
          <div style={{fontSize:"11px",color:"#9a8a6a",letterSpacing:"2px",marginBottom:"10px"}}>{cat}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"6px"}}>
            {all.filter(a=>a.cat===cat).map(a=>(
              <div key={a.id} style={{padding:"10px 12px",
                background:a.unlocked?"rgba(201,168,76,0.06)":"rgba(255,255,255,0.015)",
                border:`1px solid ${a.unlocked?"rgba(201,168,76,0.25)":"rgba(255,255,255,0.04)"}`,
                borderRadius:"5px",display:"flex",gap:"10px",alignItems:"center",
                opacity:a.unlocked?1:0.5,transition:"all 0.2s ease"}}>
                <div style={{fontSize:"20px",filter:a.unlocked?"none":"grayscale(1)"}}>{a.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"12px",fontWeight:"bold",
                    color:a.unlocked?"#d0c090":"#4a3a28",
                    whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                    {a.unlocked?a.name:"???"}
                  </div>
                  <div style={{fontSize:"10px",color:a.unlocked?"#7a6a48":"#3a2a18",
                    marginTop:"1px",lineHeight:1.4}}>
                    {a.unlocked?a.desc:"Noch nicht freigeschaltet"}
                  </div>
                </div>
                {a.unlocked&&<div style={{fontSize:"14px"}}>✅</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tournament ─────────────────────────────────────────────────────────────
function Tournament({castles}){
  const [phase,setPhase]=useState("pick");
  const [sel,setSel]=useState([]);
  const [cur,setCur]=useState(0);
  const [results,setResults]=useState([]);
  const [alloc,setAlloc]=useState(()=>Object.fromEntries(Object.keys(RES).map(k=>[k,0])));
  const [loading,setLoading]=useState(false);
  const MAX=4;
  const used=Object.values(alloc).reduce((a,b)=>a+b,0);
  const toggle=(c)=>{if(sel.find(x=>x.id===c.id)){setSel(s=>s.filter(x=>x.id!==c.id));}else if(sel.length<MAX){setSel(s=>[...s,c]);}};
  const change=(k,v)=>{const n=Math.max(0,Math.min(5,v));if(used-alloc[k]+n>TOTAL_RES)return;setAlloc(p=>({...p,[k]:n}));};
  const run=async()=>{
    if(used<2)return;setLoading(true);
    const castle=sel[cur];
    const ad=Object.entries(alloc).filter(([,v])=>v>0).map(([k,v])=>`${RES[k].l}:${v}`).join(", ");
    try{
      const apiData=await callClaude({model:"claude-sonnet-4-20250514",max_tokens:450,messages:[{role:"user",content:`Militärhistoriker kompakt. BURG: ${castle.name}. STÄRKEN: ${castle.strengths.join("; ")}. SCHWÄCHEN: ${castle.weaknesses.join("; ")}. STRATEGIE: ${ad}. NUR JSON: {"success":true/false,"rating":1-10,"outcome":"1 Satz","keyDecision":"1 Satz","daysElapsed":10-400}`}]});
      const fb=SIMULATOR_FALLBACKS[Math.floor(Math.random()*SIMULATOR_FALLBACKS.length)];
      const r=!apiData?{success:fb.success,rating:fb.rating,outcome:fb.outcome,keyDecision:fb.keyMoment||"Entscheidender Moment.",daysElapsed:fb.daysElapsed}:JSON.parse(apiData.content?.map(b=>b.text||"").join("").replace(/```json|```/g,"").trim());
      const nr=[...results,{castle,alloc:{...alloc},rating:r.rating,success:r.success,outcome:r.outcome,keyDecision:r.keyDecision,days:r.daysElapsed}];
      setResults(nr);
      if(cur+1<sel.length){setCur(cur+1);setAlloc(Object.fromEntries(Object.keys(RES).map(k=>[k,0])));}
      else{setPhase("results");}
    }catch{}
    setLoading(false);
  };
  const total=results.reduce((a,r)=>a+r.rating,0),wins=results.filter(r=>r.success).length;
  if(phase==="results")return(
    <div>
      <div style={{textAlign:"center",padding:"14px",marginBottom:"14px",background:"rgba(201,168,76,.06)",border:"1px solid rgba(201,168,76,.16)",borderRadius:"6px"}}>
        <div style={{fontSize:"26px",marginBottom:"4px"}}>{wins===results.length?"🏆":wins>0?"⚔️":"💀"}</div>
        <div style={{fontSize:"14px",fontWeight:"bold",color:"#f0e0c0",marginBottom:"2px"}}>TURNIER ABGESCHLOSSEN</div>
        <div style={{fontSize:"13px",color:"#7a6840"}}>{wins}/{results.length} Burgen eingenommen · Gesamt: {total}/{results.length*10}</div>
      </div>
      {results.map((r,i)=>(
        <div key={i} style={{padding:"10px 12px",background:r.success?"rgba(22,70,12,.1)":"rgba(80,12,7,.1)",border:`1px solid ${r.success?"rgba(35,95,18,.2)":"rgba(100,15,8,.2)"}`,borderRadius:"4px",marginBottom:"5px",display:"flex",gap:"9px",alignItems:"flex-start"}}>
          <span style={{fontSize:"16px"}}>{r.castle.icon}</span>
          <div style={{flex:1}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"2px"}}><span style={{fontSize:"13px",fontWeight:"bold",color:"#c0b090"}}>{r.castle.name}</span>
              <div style={{display:"flex",gap:"7px",alignItems:"center"}}><span style={{fontSize:"11px",color:r.success?"#5a9a42":"#aa3322"}}>{r.success?"✅":"❌"}</span><span style={{fontSize:"12px",fontWeight:"bold",color:rCol(r.rating*10)}}>{r.rating}/10</span></div></div>
            <div style={{fontSize:"12px",color:"#c0a878",lineHeight:1.6}}>{r.outcome}</div>
            {r.days&&<div style={{fontSize:"11px",color:"#9a8a68",marginTop:"1px"}}>~{r.days} Tage</div>}
          </div>
        </div>
      ))}
      <button onClick={()=>{setPhase("pick");setSel([]);setResults([]);setCur(0);}} style={{width:"100%",marginTop:"10px",padding:"8px",background:"rgba(201,168,76,.08)",border:"1px solid rgba(201,168,76,.2)",color:"#c9a84c",borderRadius:"4px",cursor:"pointer",fontSize:"13px",letterSpacing:"1px"}}>NEUES TURNIER</button>
    </div>
  );
  if(phase==="siege"){
    const castle=sel[cur];
    return(<div>
      <div style={{display:"flex",gap:"4px",marginBottom:"10px",flexWrap:"wrap"}}>
        {sel.map((c,i)=><div key={i} style={{padding:"4px 8px",background:i===cur?`${c.theme.glow}`:"rgba(255,255,255,.02)",border:`1px solid ${i===cur?c.theme.accent+"44":"rgba(255,255,255,.04)"}`,borderRadius:"3px",fontSize:"13px",color:i===cur?c.theme.accent:i<cur?"#5a9a42":"#1a0e08",display:"flex",gap:"3px",alignItems:"center"}}>{c.icon}{i<cur?"✅":i===cur?"⚔️":""}</div>)}
      </div>
      <div style={{padding:"9px 11px",background:`${castle.theme.glow}`,border:`1px solid ${castle.theme.accent}33`,borderRadius:"4px",marginBottom:"10px",display:"flex",gap:"8px",alignItems:"center"}}>
        <span style={{fontSize:"20px"}}>{castle.icon}</span>
        <div><div style={{fontSize:"14px",fontWeight:"bold",color:"#e0d0b0"}}>{castle.name}</div><div style={{fontSize:"12px",color:"#c0a878"}}>{castle.sub} · {avg(castle)}</div></div>
        <div style={{marginLeft:"auto",fontSize:"12px",color:"#9a8a68"}}>Burg {cur+1}/{sel.length}</div>
      </div>
      <div style={{fontSize:"11px",color:"#9a8a68",letterSpacing:"2px",marginBottom:"7px",display:"flex",justifyContent:"space-between"}}><span>STRATEGIE</span><span style={{color:used===TOTAL_RES?"#8aaa68":"#c9a84c"}}>{used}/{TOTAL_RES}</span></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px",marginBottom:"9px"}}>
        {Object.entries(RES).slice(0,10).map(([k,r])=>(
          <div key={k} style={{padding:"6px 8px",background:"rgba(255,255,255,.014)",border:`1px solid ${alloc[k]>0?`${r.c}24`:"rgba(255,255,255,.028)"}`,borderRadius:"3px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}><div style={{fontSize:"11px",color:alloc[k]>0?r.c:"#1a0e0e"}}>{r.i} {r.l}</div><div style={{fontSize:"14px",fontWeight:"bold",color:alloc[k]>0?r.c:"#0a0600"}}>{alloc[k]}</div></div>
            <div style={{display:"flex",gap:"2px"}}>{[0,1,2,3,4,5].map(v=><button key={v} onClick={()=>change(k,v)} style={{flex:1,height:"9px",borderRadius:"2px",border:"none",cursor:"pointer",background:v<=alloc[k]?r.c:"rgba(255,255,255,.025)",opacity:v<=alloc[k]?1:.24,transition:"all .07s"}}/>)}</div>
          </div>
        ))}
      </div>
      <button onClick={run} disabled={loading||used<2} style={{width:"100%",padding:"8px",fontSize:"13px",letterSpacing:"1px",background:used>=2&&!loading?"rgba(140,55,10,.16)":"rgba(255,255,255,.016)",border:`1px solid ${used>=2&&!loading?"rgba(140,55,10,.34)":"rgba(255,255,255,.04)"}`,color:used>=2&&!loading?"#cc6633":"#0e0600",borderRadius:"4px",cursor:used>=2?"pointer":"not-allowed"}}>
        {loading?`⏳ Stürme ${castle.name}…`:`⚔️ ${castle.name} ANGREIFEN`}
      </button>
    </div>);
  }
  return(<div>
    <div style={{padding:"9px 12px",background:"rgba(201,168,76,.05)",border:"1px solid rgba(201,168,76,.14)",borderRadius:"4px",marginBottom:"12px",fontSize:"14px",color:"#7a6a40",lineHeight:1.7}}>
      <strong style={{color:"#c9a84c",display:"block",marginBottom:"1px"}}>🗡️ BELAGERUNGS-TURNIER</strong>
      Wähle 2–4 Burgen. Belagere alle mit derselben Strategie. Wer besiegt dich?
    </div>
    <div style={{fontSize:"11px",color:"#9a8a68",letterSpacing:"1px",marginBottom:"6px"}}>{sel.length}/{MAX} AUSGEWÄHLT</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"4px",marginBottom:"10px",maxHeight:"300px",overflowY:"auto"}}>
      {castles.map(c=>{const iS=sel.find(x=>x.id===c.id),canA=sel.length<MAX||iS;return(
        <button key={c.id} onClick={()=>toggle(c)} style={{padding:"7px 5px",textAlign:"center",background:iS?`${c.theme.glow}`:"rgba(255,255,255,.016)",border:`1px solid ${iS?c.theme.accent+"44":"rgba(255,255,255,.035)"}`,borderRadius:"4px",cursor:canA?"pointer":"not-allowed",opacity:canA?1:.28,transition:"all .11s"}}>
          <div style={{fontSize:"16px",marginBottom:"2px"}}>{c.icon}</div>
          <div style={{fontSize:"11px",fontWeight:"bold",color:iS?c.theme.accent:"#5a4a30",lineHeight:1.2}}>{c.name.split(" ").slice(0,2).join(" ")}</div>
          <div style={{fontSize:"11px",color:rCol(avg(c)),marginTop:"1px"}}>{avg(c)}</div>
          {iS&&<div style={{fontSize:"11px",color:c.theme.accent,marginTop:"1px"}}>✓</div>}
        </button>);})}
    </div>
    <button onClick={()=>{if(sel.length>=2){setPhase("siege");setCur(0);setResults([]);}}} disabled={sel.length<2} style={{width:"100%",padding:"8px",fontSize:"13px",letterSpacing:"1px",background:sel.length>=2?"rgba(201,168,76,.09)":"rgba(255,255,255,.016)",border:`1px solid ${sel.length>=2?"rgba(201,168,76,.25)":"rgba(255,255,255,.035)"}`,color:sel.length>=2?"#c9a84c":"#1a1008",borderRadius:"4px",cursor:sel.length>=2?"pointer":"not-allowed"}}>
      {sel.length>=2?`🗡️ TURNIER STARTEN (${sel.length} Burgen)`:"Mind. 2 Burgen wählen"}
    </button>
  </div>);
}

// ── Highscores ─────────────────────────────────────────────────────────────

function Highscores({scores,onSelect,playStats}){
  const [filter,setFilter]=useState("all"); // all | won | lost
  const [sortBy,setSortBy]=useState("rating"); // rating | turns | date | name
  const [showExport,setShowExport]=useState(false);

  const allEntries=Object.entries(scores).map(([id,s])=>{
    const c=CASTLES.find(x=>x.id===id);
    return c?{...s,id,name:c.name,icon:c.icon,castle:c}:null;
  }).filter(Boolean);

  const entries=[...allEntries]
    .filter(e=>filter==="all"||(filter==="won"&&e.won)||(filter==="lost"&&!e.won))
    .sort((a,b)=>{
      if(sortBy==="rating") return b.rating-a.rating;
      if(sortBy==="turns") return a.turns-b.turns;
      if(sortBy==="date") return b.ts-a.ts;
      if(sortBy==="name") return a.name.localeCompare(b.name);
      return 0;
    });

  const total=allEntries.length;
  const wins=allEntries.filter(e=>e.won).length;
  const avgRating=total?Math.round(allEntries.reduce((a,e)=>a+e.rating,0)/total):0;
  const winRate=total?Math.round(wins/total*100):0;

  // Records
  const bestRating=allEntries.filter(e=>e.won).sort((a,b)=>b.rating-a.rating)[0];
  const fastestWin=allEntries.filter(e=>e.won&&e.turns>0).sort((a,b)=>a.turns-b.turns)[0];
  const longestSiege=allEntries.filter(e=>e.turns>0).sort((a,b)=>b.turns-a.turns)[0];
  const hardestFall=allEntries.filter(e=>e.won).sort((a,b)=>b.castle.ratings.walls-a.castle.ratings.walls)[0];

  // Region breakdown
  const byRegion=allEntries.reduce((acc,e)=>{
    const r=e.castle.region||"andere";
    if(!acc[r]) acc[r]={total:0,wins:0};
    acc[r].total++;
    if(e.won) acc[r].wins++;
    return acc;
  },{});

  // Export as HTML
  const exportStats=()=>{
    const html=`<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/>
<title>Belagerungs-Atlas — Meine Statistiken</title>
<style>body{margin:0;background:#060504;color:#e8dcc8;font-family:Georgia,serif;padding:20px}
.card{max-width:600px;margin:0 auto;background:linear-gradient(135deg,#0e0a06,#050302);border:1px solid rgba(201,168,76,0.25);border-radius:12px;padding:24px}
h1{color:#c9a84c;font-size:20px;margin:0 0 4px}.sub{color:#6a5a38;font-size:12px;margin:0 0 20px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px}
.stat{text-align:center;padding:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:6px}
.sv{font-size:22px;font-weight:bold;color:#c9a84c}.sl{font-size:10px;color:#5a4a28;margin-top:3px;letter-spacing:1px}
.record{padding:10px 14px;border-left:3px solid #c9a84c;background:rgba(201,168,76,0.04);margin-bottom:6px;border-radius:0 4px 4px 0}
.rn{font-size:11px;color:#6a5a38;letter-spacing:1px}.rv{font-size:13px;color:#d0c090;margin-top:2px}
.entry{display:flex;gap:10px;padding:8px 10px;margin-bottom:4px;border-radius:4px;align-items:center}
.won{background:rgba(20,60,12,0.12);border:1px solid rgba(35,95,18,0.2)}
.lost{background:rgba(80,12,7,0.1);border:1px solid rgba(100,15,8,0.15)}
footer{text-align:center;font-size:10px;color:#3a2a14;margin-top:16px;letter-spacing:1px}</style>
</head><body><div class="card">
<h1>⚔️ Belagerungs-Chronik</h1>
<p class="sub">Meine persönlichen Statistiken — Belagerungs-Atlas</p>
<div class="grid">
<div class="stat"><div class="sv">${total}</div><div class="sl">BELAGERUNGEN</div></div>
<div class="stat"><div class="sv" style="color:#6aaa50">${wins}</div><div class="sl">SIEGE</div></div>
<div class="stat"><div class="sv">${winRate}%</div><div class="sl">SIEGESQUOTE</div></div>
</div>
${bestRating?`<div class="record"><div class="rn">🏆 BESTES RATING</div><div class="rv">${bestRating.icon} ${bestRating.name} — ${bestRating.rating}/10</div></div>`:""}
${fastestWin?`<div class="record"><div class="rn">⚡ SCHNELLSTER SIEG</div><div class="rv">${fastestWin.icon} ${fastestWin.name} — ${fastestWin.turns} Züge</div></div>`:""}
${longestSiege?`<div class="record"><div class="rn">⏰ LÄNGSTE BELAGERUNG</div><div class="rv">${longestSiege.icon} ${longestSiege.name} — ${longestSiege.turns} Züge</div></div>`:""}
<br/><div style="font-size:11px;color:#6a5a38;letter-spacing:2px;margin-bottom:8px">ALLE BELAGERUNGEN</div>
${allEntries.sort((a,b)=>b.rating-a.rating).map(e=>`
<div class="entry ${e.won?"won":"lost"}">
<span>${e.icon}</span>
<span style="flex:1;font-size:13px;color:#b09870">${e.name}</span>
<span style="font-size:12px;color:${e.won?"#4a7a32":"#7a2a18"}">${e.won?"✅":"❌"}</span>
<span style="font-size:13px;font-weight:bold;color:${e.rating>=7?"#6aaa50":e.rating>=5?"#c9a84c":"#cc5533"}">${e.rating}/10</span>
</div>`).join("")}
<footer>BELAGERUNGS-ATLAS · belagerungs-atlas.vercel.app</footer>
</div></body></html>`;
    const blob=new Blob([html],{type:"text/html"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="belagerungs-statistiken.html";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if(!total) return(
    <div style={{padding:"40px",textAlign:"center",animation:"fadeIn 0.3s ease"}}>
      <div style={{fontSize:"40px",marginBottom:"12px"}}>🏆</div>
      <div style={{fontSize:"14px",color:"#b09a70",marginBottom:"6px"}}>Noch keine Belagerungen aufgezeichnet.</div>
      <div style={{fontSize:"12px",color:"#9a8a6a",lineHeight:1.7}}>Starte eine Belagerung im Rollenspiel- oder Simulator-Tab<br/>um deine Statistiken hier zu sehen.</div>
    </div>
  );

  return(
    <div style={{padding:"18px 20px",animation:"fadeIn 0.2s ease"}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
        <div>
          <div style={{fontSize:"16px",fontWeight:"bold",color:"#f0e6cc"}}>🏆 Belagerungs-Chronik</div>
          <div style={{fontSize:"11px",color:"#9a8a6a",marginTop:"2px"}}>{total} Belagerungen · {winRate}% Siegesquote</div>
        </div>
        <button onClick={exportStats}
          style={{padding:"6px 12px",background:"rgba(201,168,76,0.07)",
            border:"1px solid rgba(201,168,76,0.2)",color:"#c9a84c",
            borderRadius:"4px",cursor:"pointer",fontSize:"11px",letterSpacing:"0.5px"}}>
          📥 Export
        </button>
      </div>

      {/* Summary stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"8px",marginBottom:"14px"}}>
        {[
          {l:"Gesamt",    v:total,         c:"#c9a84c",   i:"⚔️"},
          {l:"Siege",     v:wins,          c:"#6aaa50",   i:"✅"},
          {l:"Niederlagen",v:total-wins,   c:"#cc5533",   i:"❌"},
          {l:"Ø Rating",  v:avgRating+"/10",c:rCol(avgRating*10),i:"📊"},
        ].map(s=>(
          <div key={s.l} style={{padding:"10px 8px",background:"rgba(255,255,255,0.02)",
            border:"1px solid rgba(255,255,255,0.04)",borderRadius:"5px",textAlign:"center"}}>
            <div style={{fontSize:"16px",marginBottom:"2px"}}>{s.i}</div>
            <div style={{fontSize:"17px",fontWeight:"bold",color:s.c}}>{s.v}</div>
            <div style={{fontSize:"10px",color:"#5a4a28",letterSpacing:"0.5px",marginTop:"1px"}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Win rate bar */}
      <div style={{marginBottom:"14px",padding:"10px 14px",
        background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"5px"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
          <span style={{fontSize:"11px",color:"#9a8a6a",letterSpacing:"1.5px"}}>SIEGESQUOTE</span>
          <span style={{fontSize:"12px",fontWeight:"bold",color:rCol(winRate)}}>{winRate}%</span>
        </div>
        <div style={{height:"6px",background:"rgba(255,255,255,0.04)",borderRadius:"3px",overflow:"hidden"}}>
          <div style={{height:"100%",width:`${winRate}%`,
            background:`linear-gradient(90deg,#6aaa50,#c9a84c)`,
            borderRadius:"3px",transition:"width 0.8s ease"}}/>
        </div>
      </div>

      {/* Records */}
      {(bestRating||fastestWin||longestSiege||hardestFall)&&(
        <div style={{marginBottom:"14px"}}>
          <div style={{fontSize:"11px",color:"#9a8a6a",letterSpacing:"2px",marginBottom:"8px"}}>🏅 REKORDE</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>
            {[
              bestRating&&{icon:"🏆",label:"Bestes Rating",  value:`${bestRating.icon} ${bestRating.name}`,sub:`${bestRating.rating}/10`,castle:bestRating.castle},
              fastestWin&&{icon:"⚡",label:"Schnellster Sieg",value:`${fastestWin.icon} ${fastestWin.name}`,sub:`${fastestWin.turns} Züge`,castle:fastestWin.castle},
              longestSiege&&{icon:"⏰",label:"Längste Belagerung",value:`${longestSiege.icon} ${longestSiege.name}`,sub:`${longestSiege.turns} Züge`,castle:longestSiege.castle},
              hardestFall&&{icon:"💪",label:"Stärkste Einnahme",value:`${hardestFall.icon} ${hardestFall.name}`,sub:`Mauern: ${hardestFall.castle.ratings.walls}`,castle:hardestFall.castle},
            ].filter(Boolean).map((r,i)=>(
              <div key={i} onClick={()=>onSelect&&onSelect(r.castle)}
                style={{padding:"8px 10px",background:"rgba(201,168,76,0.04)",
                  border:"1px solid rgba(201,168,76,0.12)",borderLeft:"3px solid rgba(201,168,76,0.35)",
                  borderRadius:"4px",cursor:"pointer"}}>
                <div style={{fontSize:"10px",color:"#9a8a6a",letterSpacing:"1px",marginBottom:"3px"}}>{r.icon} {r.label.toUpperCase()}</div>
                <div style={{fontSize:"12px",color:"#d0c090",marginBottom:"1px"}}>{r.value}</div>
                <div style={{fontSize:"11px",color:"#c9a84c",fontWeight:"bold"}}>{r.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Region breakdown */}
      {Object.keys(byRegion).length>1&&(
        <div style={{marginBottom:"14px",padding:"12px 14px",
          background:"rgba(0,0,0,0.18)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"5px"}}>
          <div style={{fontSize:"11px",color:"#9a8a6a",letterSpacing:"2px",marginBottom:"10px"}}>🌍 NACH REGION</div>
          {Object.entries(byRegion).sort((a,b)=>b[1].total-a[1].total).map(([region,data])=>{
            const wr=Math.round(data.wins/data.total*100);
            return(
              <div key={region} style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"6px"}}>
                <div style={{fontSize:"11px",color:"#7a6a48",width:"80px",textTransform:"capitalize",flexShrink:0}}>{region}</div>
                <div style={{flex:1,height:"5px",background:"rgba(255,255,255,0.04)",borderRadius:"3px",overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${wr}%`,
                    background:wr>=70?"#6aaa50":wr>=50?"#c9a84c":"#cc5533",
                    borderRadius:"3px",transition:"width 0.6s ease"}}/>
                </div>
                <div style={{fontSize:"10px",color:"#5a4a28",width:"55px",textAlign:"right",flexShrink:0}}>
                  {data.wins}/{data.total} ({wr}%)
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters + Sort */}
      <div style={{display:"flex",gap:"6px",marginBottom:"10px",flexWrap:"wrap",alignItems:"center"}}>
        <div style={{display:"flex",gap:"4px"}}>
          {[{v:"all",l:"Alle"},{ v:"won",l:"✅ Siege"},{v:"lost",l:"❌ Niederlagen"}].map(f=>(
            <button key={f.v} onClick={()=>setFilter(f.v)}
              style={{padding:"3px 9px",fontSize:"11px",
                background:filter===f.v?"rgba(201,168,76,0.12)":"rgba(255,255,255,0.02)",
                border:`1px solid ${filter===f.v?"rgba(201,168,76,0.3)":"rgba(255,255,255,0.05)"}`,
                color:filter===f.v?"#c9a84c":"#6a5a38",borderRadius:"10px",cursor:"pointer"}}>
              {f.l}
            </button>
          ))}
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:"4px",alignItems:"center"}}>
          <span style={{fontSize:"10px",color:"#8a7860"}}>Sortieren:</span>
          {[{v:"rating",l:"Rating"},{v:"turns",l:"Züge"},{v:"date",l:"Datum"},{v:"name",l:"Name"}].map(s=>(
            <button key={s.v} onClick={()=>setSortBy(s.v)}
              style={{padding:"2px 7px",fontSize:"10px",
                background:sortBy===s.v?"rgba(201,168,76,0.1)":"rgba(255,255,255,0.02)",
                border:`1px solid ${sortBy===s.v?"rgba(201,168,76,0.25)":"rgba(255,255,255,0.04)"}`,
                color:sortBy===s.v?"#c9a84c":"#5a4a28",borderRadius:"8px",cursor:"pointer"}}>
              {s.l}
            </button>
          ))}
        </div>
      </div>

      {/* Entry list */}
      <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
        {entries.map((e,i)=>(
          <div key={e.id} onClick={()=>onSelect&&onSelect(e.castle)}
            style={{display:"flex",gap:"10px",padding:"10px 12px",
              background:e.won?"rgba(20,60,12,0.1)":"rgba(80,12,7,0.09)",
              border:`1px solid ${e.won?"rgba(35,95,18,0.18)":"rgba(100,15,8,0.16)"}`,
              borderRadius:"5px",alignItems:"center",cursor:"pointer",
              transition:"all 0.12s"}}>
            {/* Rank */}
            <div style={{fontSize:"12px",fontWeight:"bold",width:"18px",textAlign:"center",flexShrink:0,
              color:i===0?"#c9a84c":i===1?"#888":i===2?"#8a5520":"#3a2a14"}}>
              {i+1}
            </div>
            {/* Icon */}
            <div style={{fontSize:"18px",flexShrink:0}}>{e.icon}</div>
            {/* Info */}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:"13px",fontWeight:"bold",color:"#b09870",
                whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                {e.name}
              </div>
              <div style={{fontSize:"11px",display:"flex",gap:"8px",marginTop:"1px"}}>
                <span style={{color:e.won?"#4a7a32":"#7a2a18"}}>{e.won?"✅ Eingenommen":"❌ Gehalten"}</span>
                {e.turns>0&&<span style={{color:"#5a4a28"}}>· {e.turns} Züge</span>}
                {e.ts&&<span style={{color:"#8a7a60"}}>· {new Date(e.ts).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}</span>}
              </div>
            </div>
            {/* Rating bars */}
            <div style={{display:"flex",gap:"1px",flexShrink:0,alignItems:"flex-end"}}>
              {Array.from({length:10},(_,j)=>(
                <div key={j} style={{width:"3px",height:`${6+j*1.5}px`,borderRadius:"1px",
                  background:j<e.rating?rCol(e.rating*10):"rgba(255,255,255,0.05)"}}/>
              ))}
            </div>
            {/* Rating number */}
            <div style={{textAlign:"center",flexShrink:0,minWidth:"28px"}}>
              <div style={{fontSize:"15px",fontWeight:"bold",color:rCol(e.rating*10)}}>{e.rating}</div>
              <div style={{fontSize:"9px",color:"#8a7860"}}>/10</div>
            </div>
          </div>
        ))}
        {entries.length===0&&(
          <div style={{padding:"20px",textAlign:"center",color:"#8a7860",fontSize:"13px"}}>
            Keine Einträge für diesen Filter.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Lexikon ────────────────────────────────────────────────────────────────
const LEXIKON_FACTS = {
  krak:["Gebaut von den Johannitern auf einem älteren arabischen Fundament.","Die doppelte Ringmauer war ein Novum der Kreuzfahrerarchitektur.","Die Zisternen konnten 5 Jahre lang die gesamte Garnison mit Wasser versorgen.","Der gefälschte Brief von Baibars ist historisch belegt — ein Meisterwerk der Psychokriegsführung.","Nur ~200 Ritter hielten die Burg als sie 1271 fiel."],
  masada:["Herodes der Große ließ Masada als Luxusfluchtburg ausbauen — komplett mit Mosaikböden.","Die X. Legion Fretensis war für ihren Eber-Standard bekannt — Spott gegen jüdische Verteidiger.","Die Rampe ist noch heute im Original erhalten und besuchbar.","Archäologen fanden Skelette, Münzen und Schuhe der Zeloten.","Der 'Masada-Komplex': israelische Militäroffiziere leisten heute ihren Eid auf Masada."],
  constantinople:["Die Theodosianischen Mauern wurden 413 n.Chr. fertiggestellt — in nur wenigen Jahren.","Griechisches Feuer: eine Geheimwaffe die bis heute nicht vollständig rekonstruiert werden konnte.","1453 feuerte Urbans Kanone Kugeln von 600kg Gewicht.","Das Kerkaporta-Tor: Eine winzige Tür, die versehentlich offengelassen wurde, entschied über das Schicksal eines Jahrtausend-Imperiums.","Konstantinopel war mit 500.000 Einwohnern die größte Stadt Europas."],
  helmsdeep:["Tolkien basierte Helms Klamm teilweise auf mittelalterlichen Engpässen wie dem Thermopylae.","Der Abflusskanal ist eine typische Ingenieurslücke vieler mittelalterlicher Burgen.","Der Name 'Hornburg' bezieht sich auf das Horn, das geblasen wird wenn die Burg in Gefahr ist.","Baumbarts Ents sind Tolkiens Metapher für die Zerstörung der Natur durch Industrie.","Peter Jackson drehte die Helmschlacht-Szenen in über 3 Monaten Nachtdrehs."],
  minas_tirith:["Tolkien beschrieb Minas Tirith als ein in Fels gehauenes Meisterwerk — ähnlich Petra.","Die sieben Ringe repräsentieren die sieben Planetensphären der mittelalterlichen Kosmologie.","'Ithilstein' übersetzte Tolkien als 'Mondstein' — ein magisch hartes Material.","Die Pelennor-Felder basieren auf der Ebene vor Wien bei der osmanischen Belagerung 1683.","Aragorns Flotte mit den Toten ist Tolkiens Version der Argonautensage."],
  carcassonne:["Die heutige Burg ist zu 70% eine Restaurierung von Viollet-le-Duc (19. Jh.) — umstritten.","Die 52 Türme wurden so gebaut, dass kein Angreifer je im toten Winkel stehen konnte.","Der Albigenserkreuzzug 1209 war Carcassonnes historischer Tiefpunkt.","Trencavel wurde während der Verhandlungen verhaftet — ein Verstoß gegen das Kriegsrecht.","Carcassonne ist heute das meistbesuchte Monument Frankreichs nach dem Eiffelturm."],
  babylon:["Die Hängenden Gärten sind eine der Sieben Weltwunder — ihre Existenz ist bis heute umstritten.","Das Ischtar-Tor ist blau glasiert mit goldenen Stieren und Drachen — ein Meisterwerk.","Kyros nutzte einen Ablenkungsangriff: Während eines Festes der Babylonier wurde der Fluss umgeleitet.","Die 'Keilschrift-Mauern': Nebukadnezar ließ seinen Namen in jeden Backstein einbrennen.","Babylon war 600 v.Chr. mit 200.000 Einwohnern die größte Stadt der Welt."],
  chateau_gaillard:["Richard I. baute Château Gaillard in nur einem Jahr — ein Rekord für eine Burg dieser Größe.","Richard nannte sie 'meine schöne Tochter' — er liebte sie über alles.","Die wellenförmige (corrugated) Mauer der mittleren Enceinte war ein architektonisches Novum.","Der Soldat der durch die Latrine kroch hieß laut Chroniken 'Peter' — sein Nachname ist nicht überliefert.","Philipp II. benötigte 3 Monate für die Einnahme — was Richard als Lebenswerk in einem Jahr errichtet hatte."],
  harlech:["'Men of Harlech' ist eine der berühmtesten Kriegsballaden Walesnoch heute offizielles Lied des Walisischen Garde-Regiments.","50 Mann hielten Harlech 7 Jahre — die längste Belagerung im Rosenkrieg.","Der Versorgungsgang zum Meer: 61 Stufen hinunter zu einem kleinen Hafen — die Lebensader der Burg.","Harlech war die letzte Burg die für Lancaster fiel.","Edward I. ließ Harlech in nur 7 Jahren bauen — als Teil seines 'Ring of Iron'."],
  himeji:["Der weiße Kalkputz der Burg schützte vor Feuer — daher 'Weißer Reiher'.","83 Tore: Jedes auf einem anderen Niveau und in eine andere Richtung orientiert.","Himeji überstand den 2. Weltkrieg durch eine einzige Brandbombe die nicht explodierte.","Das Irrgarten-System ließ Angreifer buchstäblich im Kreis laufen — manche Wege sind 2km lang.","Himeji wurde nie in echtem Kampf getestet — seine Abschreckungswirkung war total."],
  alamut:["Die Assassinen (Hashishin) sollen ihren Namen von Cannabis ableiten — historisch umstritten.","Marco Polo besuchte die Ruinen und berichtete vom legendären 'Garten des Paradieses'.","Die Bibliothek von Alamut war eine der bedeutendsten islamischen Wissenssammlungen.","Hülegü lies die Bibliothek verbrennen — ein historisch irreparables Verbrechen.","Das Wort 'Assassin' kam durch die Kreuzfahrer ins Europäische."],
  gondolin:["Tolkien schrieb den Fall Gondolins erstmals 1917 — eines seiner frühesten Werke.","Gondolin bedeutet auf Sindarin 'Verborgener Fels'.","Maeglin war Turgons Neffe — sein Verrat war umso schmerzhafter.","Der Fall Gondolins ist das erste Kapitel der Geschichte von Tuor und Eärendil.","Tolkien selbst sagte: 'Der Fall von Gondolin ist Mittelerde's Troja.'"],
};

function Lexikon({castle,onAsk}){
  const facts=getLexikonFacts(castle);
  const [loading,setLoading]=useState(false);
  const [extraFact,setExtraFact]=useState(null);
  const [question,setQuestion]=useState("");

  const getFact=async()=>{
    setLoading(true);setExtraFact(null);
    try{
      const data=await callClaude({model:"claude-sonnet-4-20250514",max_tokens:400,messages:[{role:"user",content:`Nenne einen außergewöhnlichen, wenig bekannten historischen Fakt über "${castle.name}" (${castle.era}, ${castle.loc}). Der Fakt soll überraschend, präzise und fesselnd sein. Antwort auf Deutsch, 2-3 Sätze, kein Markdown.`}]});
      if(!data){
        const allFacts=getLexikonFacts(castle);
        setExtraFact(allFacts[Math.floor(Math.random()*allFacts.length)]);
      } else {
        setExtraFact(data.content?.map(b=>b.text||"").join("")||"");
      }
    }catch{
      const allFacts=getLexikonFacts(castle);
      setExtraFact(allFacts[Math.floor(Math.random()*allFacts.length)]);
    }
    setLoading(false);
  };

  const askQuestion=async()=>{
    if(!question.trim())return;
    setLoading(true);setExtraFact(null);
    const q=question.trim();setQuestion("");
    try{
      const data=await callClaude({model:"claude-sonnet-4-20250514",max_tokens:500,messages:[{role:"user",content:`Historiker über "${castle.name}" (${castle.era}, ${castle.loc}). Kontext: ${castle.history}. Frage: ${q}. Antworte präzise auf Deutsch, 2-4 Sätze.`}]});
      if(!data){
        // Smart offline answer based on question
        const ql=q.toLowerCase();
        let ans;
        if(ql.includes("wann")||ql.includes("jahr")||ql.includes("datum")) ans=`${castle.name} wurde in der Zeit ${castle.era} erbaut und ist in ${castle.loc} gelegen. ${castle.history}`;
        else if(ql.includes("wer")||ql.includes("erbaut")||ql.includes("gebaut")) ans=`${castle.name} (${castle.sub}) wurde ${castle.era} errichtet. ${castle.history.split(".")[0]}.`;
        else if(ql.includes("warum")||ql.includes("grund")||ql.includes("fiel")) ans=`${castle.verdict} — ${castle.history}`;
        else if(ql.includes("heute")||ql.includes("übrig")||ql.includes("erhalten")) ans=`${castle.name} aus der Zeit ${castle.era} ist heute ${castle.type==="real"?"ein historisches Denkmal in "+castle.loc:"eine fiktive Stätte aus Tolkiens Mittelerde"}. ${castle.verdict}`;
        else ans=`${castle.history} ${castle.verdict}`;
        setExtraFact(ans);
      } else {
        setExtraFact(data.content?.map(b=>b.text||"").join("")||"");
      }
    }catch{
      setExtraFact(`${castle.history} — ${castle.verdict}`);
    }
    setLoading(false);
  };

  return(
    <div style={{maxWidth:"600px"}}>
      {/* Header */}
      <div style={{padding:"12px 14px",background:`${castle.theme.accent}08`,border:`1px solid ${castle.theme.accent}18`,borderRadius:"4px",marginBottom:"14px",display:"flex",gap:"12px",alignItems:"center"}}>
        <span style={{fontSize:"28px"}}>{castle.icon}</span>
        <div>
          <div style={{fontSize:"13px",fontWeight:"bold",color:"#f0e6cc"}}>{castle.name}</div>
          <div style={{fontSize:"13px",color:castle.theme.accent,marginTop:"1px"}}>{castle.sub} · {castle.era} · {castle.loc}</div>
        </div>
      </div>

      {/* Known facts */}
      {facts.length>0&&(
        <div style={{marginBottom:"14px"}}>
          <div style={{fontSize:"11px",color:castle.theme.accent,letterSpacing:"2px",marginBottom:"8px"}}>📚 BEKANNTE FAKTEN</div>
          {facts.map((f,i)=>(
            <div key={i} style={{display:"flex",gap:"9px",padding:"8px 10px",marginBottom:"4px",
              background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.03)",
              borderLeft:`3px solid ${castle.theme.accent}44`,borderRadius:"3px"}}>
              <div style={{fontSize:"13px",color:castle.theme.accent,flexShrink:0,marginTop:"1px",fontFamily:"monospace"}}>{String(i+1).padStart(2,"0")}</div>
              <div style={{fontSize:"14px",color:"#cbb888",lineHeight:1.75}}>{f}</div>
            </div>
          ))}
        </div>
      )}

      {/* AI extra fact */}
      {extraFact&&(
        <div style={{marginBottom:"12px",padding:"12px 14px",
          background:"rgba(0,0,0,0.3)",border:`1px solid ${castle.theme.accent}28`,
          borderLeft:`3px solid ${castle.theme.accent}`,borderRadius:"4px",
          animation:"fadeIn 0.3s ease"}}>
          <div style={{fontSize:"11px",color:castle.theme.accent,letterSpacing:"2px",marginBottom:"5px"}}>✨ ÜBERRASCHUNGSFAKT</div>
          <div style={{fontSize:"14px",color:"#7a6a48",lineHeight:1.8}}>{extraFact}</div>
        </div>
      )}
      {loading&&(
        <div style={{padding:"12px",textAlign:"center",color:"#b09a70",fontSize:"14px",marginBottom:"12px"}}>
          {[0,1,2].map(i=><span key={i} style={{display:"inline-block",width:"5px",height:"5px",borderRadius:"50%",background:castle.theme.accent,margin:"0 2px",animation:`bounce 1.2s ease infinite`,animationDelay:`${i*.2}s`}}/>)}
        </div>
      )}

      {/* Action buttons */}
      <div style={{display:"flex",gap:"6px",marginBottom:"12px"}}>
        <button onClick={getFact} disabled={loading}
          style={{flex:1,padding:"8px",fontSize:"13px",letterSpacing:"1px",
            background:`${castle.theme.accent}12`,border:`1px solid ${castle.theme.accent}28`,
            color:castle.theme.accent,borderRadius:"4px",cursor:"pointer"}}>
          ✨ Überraschungsfakt
        </button>
      </div>

      {/* Question input */}
      <div style={{padding:"12px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"4px"}}>
        <div style={{fontSize:"11px",color:"#b09a70",letterSpacing:"2px",marginBottom:"7px"}}>❓ FRAGE STELLEN</div>
        <div style={{display:"flex",gap:"5px"}}>
          <input value={question} onChange={e=>setQuestion(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&askQuestion()}
            placeholder={`Was möchtest du über ${castle.name} wissen?`}
            style={{flex:1,padding:"7px 10px",background:"rgba(255,255,255,0.04)",
              border:`1px solid ${castle.theme.accent}18`,borderRadius:"4px",
              color:"#e8d8b0",fontSize:"14px",outline:"none",fontFamily:"inherit"}}/>
          <button onClick={askQuestion} disabled={loading||!question.trim()}
            style={{padding:"7px 12px",background:question.trim()&&!loading?`${castle.theme.accent}18`:"rgba(255,255,255,0.02)",
              border:`1px solid ${question.trim()&&!loading?castle.theme.accent+"32":"rgba(255,255,255,0.05)"}`,
              color:question.trim()&&!loading?castle.theme.accent:"#1a0e08",
              borderRadius:"4px",cursor:"pointer",fontSize:"13px"}}>→</button>
        </div>
        <div style={{display:"flex",gap:"4px",flexWrap:"wrap",marginTop:"6px"}}>
          {["Wann genau fiel sie?","Wer baute sie?","Was ist heute davon übrig?","Vergleich mit anderen Burgen?"].map((q,i)=>(
            <button key={i} onClick={()=>setQuestion(q)}
              style={{fontSize:"12px",padding:"2px 7px",background:"rgba(255,255,255,0.02)",
                border:"1px solid rgba(255,255,255,0.05)",color:"#9a8a68",borderRadius:"8px",cursor:"pointer"}}>
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}


// ── Castle 3D Diorama ─────────────────────────────────────────────────────


// ══════════════════════════════════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════════════════════════════════
export default function App(){
  const [sel,setSel]=useState(CASTLES[0]);
  const [tab,setTab]=useState("overview");
  const [dtab,setDtab]=useState("map");
  const [attackMode,setAttackMode]=useState(false);
  const [filter,setFilter]=useState("all");
  const [epochFilter,setEpochFilter]=useState("");
  const [regionFilter,setRegionFilter]=useState("");
  const [search,setSearch]=useState("");
  const [sideOpen,setSideOpen]=useState(true);
  // Persistenz via localStorage
  const [scores,setScores]=useState(()=>{
    try{ return JSON.parse(localStorage.getItem('bAtlas_scores')||'{}'); }catch{return {};}
  });
  const [favs,setFavs]=useState(()=>{
    try{ return new Set(JSON.parse(localStorage.getItem('bAtlas_favs')||'[]')); }catch{return new Set();}
  });
  const toggleFav=useCallback((id)=>{
    setFavs(prev=>{
      const next=new Set(prev);
      next.has(id)?next.delete(id):next.add(id);
      try{localStorage.setItem('bAtlas_favs',JSON.stringify([...next]));}catch{}
      return next;
    });
  },[]);
  const [playStats,setPlayStats]=useState(()=>{
    try{ return JSON.parse(localStorage.getItem('bAtlas_stats')||'{"sieges":0,"wins":0,"totalDays":0,"streak":0,"generalWins":{},"campaignsDone":0,"choicesMade":0,"bestBuild":0}'); }catch{return {sieges:0,wins:0,totalDays:0,streak:0,generalWins:{},campaignsDone:0,choicesMade:0,bestBuild:0};}
  });
  const [general,setGeneral]=useState(null);
  const [season,setSeason]=useState(SEASONS[0]);
  const {weather,randomize:randomizeWeather}=useWeather();
  const [showSetup,setShowSetup]=useState(false);
  const [visualPreset,setVisualPreset]=useState("blue");
  const [achievementToast,setAchievementToast]=useState(null);
  const prevAchievements=useRef(new Set());

  // Check for new achievements after score/stats changes
  const checkNewAchievements=useCallback((newScores,newStats)=>{
    const all=checkAchievements(newScores,CASTLES,newStats);
    all.forEach(a=>{
      if(a.unlocked&&!prevAchievements.current.has(a.id)){
        prevAchievements.current.add(a.id);
        setAchievementToast(a);
      }
    });
  },[]);

  const addScore=useCallback((castleId,won,r)=>{
    setScores(s=>{
      const next={...s,[castleId]:{won,rating:r||5,turns:r||0,ts:Date.now()}};
      try{localStorage.setItem('bAtlas_scores',JSON.stringify(next));}catch{}
      setPlayStats(ps=>{
        const streak=won?(ps.streak||0)+1:0;
        const gWins=won&&general?{...ps.generalWins,[general.id]:(ps.generalWins?.[general.id]||0)+1}:ps.generalWins||{};
        const next2={...ps,sieges:(ps.sieges||0)+1,wins:(ps.wins||0)+(won?1:0),totalDays:(ps.totalDays||0)+(r||0),streak,generalWins:gWins};
        try{localStorage.setItem('bAtlas_stats',JSON.stringify(next2));}catch{}
        checkNewAchievements(next,next2);
        return next2;
      });
      return next;
    });
  },[general,checkNewAchievements]);

  const go=(c)=>{setSel(c);setTab("detail");setDtab("map");setAttackMode(false);};

  const sideFiltered=useMemo(()=>CASTLES.filter(c=>{
    if(filter!=="all"&&c.type!==filter)return false;
    if(epochFilter&&c.epoch!==epochFilter)return false;
    if(regionFilter&&c.region!==regionFilter)return false;
    if(search&&!c.name.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  }),[filter,epochFilter,regionFilter,search]);
  const topCastles=useMemo(()=>[...CASTLES].sort((a,b)=>avg(b)-avg(a)).slice(0,4),[]);
  const uiTheme=visualPreset==="gold"
    ? {
        appBg:"radial-gradient(circle at 12% -10%, rgba(214,164,77,0.18) 0%, rgba(10,14,30,0) 42%), radial-gradient(circle at 88% -10%, rgba(139,96,45,0.16) 0%, rgba(10,14,30,0) 48%), linear-gradient(150deg,#120d07 0%,#1a1209 45%,#080604 100%)",
        appColor:"#f4ead7",
        headerBg:"linear-gradient(180deg,rgba(31,20,12,0.96) 0%,rgba(17,12,7,0.94) 100%)",
        headerBorder:"1px solid rgba(201,168,76,0.30)",
        setupBg:"rgba(24,16,10,0.92)",
        setupBorder:"1px solid rgba(201,168,76,0.25)",
        heroBorder:"1px solid rgba(201,168,76,0.35)",
        heroBg:"radial-gradient(circle at 10% 10%,rgba(201,168,76,0.16),transparent 36%),radial-gradient(circle at 90% 15%,rgba(232,200,120,0.18),transparent 42%),linear-gradient(145deg,rgba(30,20,12,0.9),rgba(14,10,6,0.92))",
        accent:"rgba(201,168,76,0.75)",
        accentSoft:"rgba(201,168,76,0.28)",
        textMuted:"#cbb38b",
        textStrong:"#f8edd8",
      }
    : {
        appBg:"radial-gradient(circle at 12% -10%, rgba(111,138,255,0.26) 0%, rgba(10,14,30,0) 42%), radial-gradient(circle at 88% -10%, rgba(64,224,208,0.15) 0%, rgba(10,14,30,0) 48%), linear-gradient(150deg,#070a14 0%,#080d1b 45%,#05070f 100%)",
        appColor:"#e8eeff",
        headerBg:"linear-gradient(180deg,rgba(16,24,44,0.96) 0%,rgba(10,16,32,0.94) 100%)",
        headerBorder:"1px solid rgba(138,173,255,0.28)",
        setupBg:"rgba(11,20,38,0.9)",
        setupBorder:"1px solid rgba(138,173,255,0.25)",
        heroBorder:"1px solid rgba(130,170,255,0.35)",
        heroBg:"radial-gradient(circle at 10% 10%,rgba(66,216,207,0.22),transparent 36%),radial-gradient(circle at 90% 15%,rgba(111,138,255,0.32),transparent 42%),linear-gradient(145deg,rgba(16,30,56,0.9),rgba(8,16,34,0.92))",
        accent:"rgba(138,173,255,0.78)",
        accentSoft:"rgba(138,173,255,0.28)",
        textMuted:"#9cb0de",
        textStrong:"#f1f6ff",
      };

  const sc=avg(sel);
  const DTABS=[{id:"map",l:"📍 Historische Lage"},{id:"grundriss",l:"🏰 Grundriss"},{id:"stats",l:"📊 Wertung"},{id:"roleplay",l:"🎭 Belagerung"},{id:"simulator",l:"⚔️ Simulator"},{id:"whatif",l:"🌀 Was wäre wenn"},{id:"ai",l:"🤖 Berater"},{id:"compare",l:"⚡ Vergleich"},{id:"history",l:"📜 Geschichte"},{id:"lexikon",l:"📚 Lexikon"}];
  const NAVTABS=[{id:"overview",l:"🏰 Übersicht"},{id:"worldmap",l:"🌍 Karte"},{id:"detail",l:`${sel.icon} ${sel.name.split(" ")[0]}`},{id:"campaign",l:"📖 Kampagne"},{id:"tournament",l:"🗡️ Turnier"},{id:"build",l:"🏗️ Bauen"},{id:"timeline",l:"📅 Zeit"},{id:"globalstats",l:"📊 Atlas"},{id:"achievements",l:"🏆 Erfolge"},{id:"highscores",l:"🎖️ Scores"}];

  return(
    <div className="app-shell" style={{height:"100vh",overflow:"hidden",background:uiTheme.appBg,color:uiTheme.appColor,fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",display:"flex",flexDirection:"column","--ui-accent":uiTheme.accent,"--ui-accent-soft":uiTheme.accentSoft,"--ui-muted":uiTheme.textMuted,"--ui-strong":uiTheme.textStrong}}>
      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#070b18}
        ::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#6f8aff,#42d8cf);border-radius:2px}
        ::-webkit-scrollbar-thumb:hover{background:linear-gradient(180deg,#9baeff,#63e9df)}
        input::placeholder{color:#6e7ca8}
        select option{background:#101a2e;color:#d8e6ff}
        button{transition:all 0.15s ease}
        button:hover{filter:brightness(1.15)}
        button:active{transform:scale(0.97)}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeInLeft{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-4px)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pf{0%{opacity:.85;transform:scale(1)}100%{opacity:0;transform:scale(2.5)}}
        @keyframes pulse{0%,100%{opacity:0.3}50%{opacity:0.75}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes glow{0%,100%{box-shadow:0 0 8px rgba(201,168,76,0.12)}50%{box-shadow:0 0 24px rgba(201,168,76,0.32)}}
        @keyframes barFill{from{width:0}to{width:var(--w)}}
        @keyframes float{0%,100%{transform:translateY(0px)}50%{transform:translateY(-5px)}}
        @keyframes borderGlow{0%,100%{box-shadow:0 0 0 1px rgba(111,138,255,0.15),0 4px 20px rgba(0,0,0,0.4)}50%{box-shadow:0 0 0 1px rgba(111,138,255,0.45),0 8px 32px rgba(111,138,255,0.18)}}
        @keyframes logoFloat{0%,100%{filter:drop-shadow(0 0 6px rgba(201,168,76,0.5))}50%{filter:drop-shadow(0 0 14px rgba(201,168,76,0.85))}}
        @keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes kpiPop{0%{transform:scale(0.88);opacity:0}60%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}
        @keyframes accentSlide{from{transform:scaleX(0);opacity:0}to{transform:scaleX(1);opacity:1}}
        @keyframes regionPulse{0%,100%{opacity:0.7}50%{opacity:1}}
        @keyframes dotPulse{0%,100%{box-shadow:0 0 0 0 rgba(111,138,255,0.5)}50%{box-shadow:0 0 0 5px rgba(111,138,255,0)}}
        @keyframes cardIn{from{opacity:0;transform:translateY(10px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}

        /* ── Castle cards ── */
        .castle-card{
          transition:transform 0.22s cubic-bezier(.4,0,.2,1),
            border-color 0.22s ease,
            box-shadow 0.22s cubic-bezier(.4,0,.2,1),
            background 0.22s ease;
          will-change:transform,box-shadow;
        }
        .castle-card:hover{
          transform:translateY(-5px) scale(1.012)!important;
        }

        /* ── Tab navigation ── */
        .tab-btn{transition:all 0.18s ease;position:relative;overflow:hidden}
        .tab-btn::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:currentColor;transform:scaleX(0);transition:transform 0.2s ease}
        .tab-btn.active::after{transform:scaleX(1)}
        .detail-panel{animation:fadeIn 0.22s ease}
        .score-ring{transition:stroke-dashoffset 0.8s ease}
        .stat-bar{animation:barFill 0.6s ease forwards}

        /* ── Responsive ── */
        @media(max-width:768px){
          .sidebar{display:none!important}
          .main-content{flex-direction:column!important}
          .nav-tabs{overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding-bottom:2px}
          .nav-tabs::-webkit-scrollbar{display:none}
          .castle-grid{grid-template-columns:repeat(auto-fill,minmax(160px,1fr))!important}
          .detail-tabs{overflow-x:auto;white-space:nowrap;scrollbar-width:none}
          .detail-tabs::-webkit-scrollbar{display:none}
          .leaflet-container{touch-action:pan-x pan-y}
          .castle-outer{padding:10px 12px!important}
          .filter-bar{padding:8px 10px!important;gap:5px!important}
          .grid-2col{grid-template-columns:1fr!important}
          .map-detail-grid{grid-template-columns:1fr!important}
          .header-sub{display:none!important}
        }
        @media(max-width:600px){
          .castle-grid{grid-template-columns:1fr 1fr!important}
          .castle-outer{padding:8px!important}
          header{height:44px!important}
          header span{font-size:12px!important}
          .card{width:calc(100vw - 24px)!important;margin:12px auto!important}
          .detail-header-meta{font-size:10px!important;white-space:normal!important}
        }
        @media(max-width:430px){
          .castle-grid{grid-template-columns:1fr!important}
          .header-title{letter-spacing:0.5px!important;font-size:12px!important}
          .detail-tabs button{padding:7px 8px!important;font-size:11px!important}
        }
        @media(hover:none){
          button:hover{filter:none}
          .castle-card:hover{transform:none!important}
        }
        @media(prefers-reduced-motion:reduce){
          *{animation:none!important;transition:none!important}
        }

        /* ── Typography ── */
        .cinzel{font-family:'Cinzel',serif!important;letter-spacing:0.05em}
        .cinzel-lg{font-family:'Cinzel',serif!important;letter-spacing:0.12em}
        input,textarea,select{font-family:inherit}
        .castle-card{transition:transform 0.18s ease,border-color 0.18s ease,box-shadow 0.18s ease,background 0.18s ease}

        .app-shell::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;background:linear-gradient(rgba(143,167,255,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(143,167,255,0.045) 1px,transparent 1px);background-size:34px 34px;mask-image:radial-gradient(circle at center,black 35%,transparent 90%)}
        .app-shell > *{position:relative;z-index:1}
        .glass{background:linear-gradient(160deg,rgba(18,28,52,0.82),rgba(12,20,40,0.62));backdrop-filter:blur(10px);border:1px solid var(--ui-accent-soft);box-shadow:0 14px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)}
        .premium-title{font-family:'Cinzel',serif;letter-spacing:0.2em;text-transform:uppercase}
        .nav-premium{position:relative;border:1px solid transparent;border-radius:10px;margin:6px 4px;padding:0 12px!important;height:38px!important;display:flex;align-items:center;justify-content:center;font-size:12px!important;font-weight:600;transition:all .2s ease}
        .nav-premium:hover{border-color:var(--ui-accent-soft);background:color-mix(in oklab,var(--ui-accent) 12%, transparent);transform:translateY(-1px)}
        .nav-premium.active{background:linear-gradient(135deg,color-mix(in oklab,var(--ui-accent) 32%, transparent),rgba(66,216,207,0.20));color:var(--ui-strong)!important;border-color:var(--ui-accent);box-shadow:0 0 0 1px color-mix(in oklab,var(--ui-accent) 32%, transparent),0 8px 24px rgba(66,216,207,0.18)}
        .panel-premium{background:linear-gradient(155deg,rgba(16,25,45,0.88),rgba(11,17,34,0.75));border:1px solid var(--ui-accent-soft);border-radius:14px;box-shadow:0 18px 30px rgba(0,0,0,0.26)}
        .hero-v2{margin:16px;border:1px solid rgba(130,170,255,0.35);border-radius:16px;padding:18px;background:
          radial-gradient(circle at 10% 10%,rgba(66,216,207,0.22),transparent 36%),
          radial-gradient(circle at 90% 15%,rgba(111,138,255,0.32),transparent 42%),
          linear-gradient(145deg,rgba(16,30,56,0.9),rgba(8,16,34,0.92));
          box-shadow:0 22px 42px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.08)}
        .hero-kpi{padding:10px 12px;border-radius:10px;background:rgba(8,16,32,0.46);border:1px solid var(--ui-accent-soft);text-align:center}
        .hero-cta{padding:9px 12px;border-radius:10px;border:1px solid var(--ui-accent);background:linear-gradient(135deg,color-mix(in oklab,var(--ui-accent) 42%, transparent),rgba(66,216,207,0.24));color:var(--ui-strong);cursor:pointer;font-weight:600}
        .hero-cta.alt{background:color-mix(in oklab,var(--ui-accent) 10%, transparent);color:var(--ui-muted)}
        .hero-mini-card{padding:10px;border-radius:12px;background:rgba(9,16,31,0.52);border:1px solid var(--ui-accent-soft);display:flex;align-items:center;justify-content:space-between;gap:8px}
        .hero-mini-card button{padding:6px 8px;border-radius:8px;border:1px solid var(--ui-accent-soft);background:color-mix(in oklab,var(--ui-accent) 14%, transparent);color:var(--ui-strong);font-size:11px;cursor:pointer}
        .content-wrap{max-width:1280px;margin:0 auto;width:100%}
        .mobile-quickbar{display:none}
        .soft-card{border-radius:14px;background:linear-gradient(155deg,rgba(14,22,41,0.78),rgba(10,16,31,0.62));border:1px solid var(--ui-accent-soft);box-shadow:0 10px 24px rgba(0,0,0,0.2)}
        .castle-card:hover{transform:translateY(-3px)}
        .gold-text{color:#c9a84c;font-family:'Cinzel',serif}
        .section-title{font-family:'Cinzel',serif;letter-spacing:0.08em;font-size:11px;color:#a08848;text-transform:uppercase}
        @media(max-width:768px){
          .mobile-quickbar{
            display:flex;position:fixed;left:10px;right:10px;bottom:10px;z-index:450;
            gap:8px;padding:8px;border-radius:12px;
            background:linear-gradient(155deg,rgba(10,18,36,0.95),rgba(8,14,28,0.92));
            border:1px solid rgba(138,173,255,0.24);box-shadow:0 14px 24px rgba(0,0,0,0.35)
          }
          .mobile-quickbar button{
            flex:1;border-radius:8px;border:1px solid rgba(138,173,255,0.28);
            background:rgba(138,173,255,0.1);color:#e8f0ff;padding:8px 6px;font-size:12px
          }
        }
      `}</style>

      {/* ── HEADER ── */}
      <header className="glass" style={{height:"62px",display:"flex",alignItems:"stretch",borderBottom:uiTheme.headerBorder,background:uiTheme.headerBg,position:"sticky",top:0,zIndex:300,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"0 16px",borderRight:"1px solid rgba(201,168,76,0.1)",flexShrink:0}}>
          <span style={{fontSize:"18px",filter:"drop-shadow(0 0 6px rgba(201,168,76,0.4))"}}>⚔️</span>
          <div style={{display:"flex",flexDirection:"column",gap:"1px"}}>
            <span className="header-title premium-title" style={{fontSize:"13px",fontWeight:"700",color:"#f1f5ff",whiteSpace:"nowrap",textShadow:"0 0 18px rgba(111,138,255,0.45)"}}>BELAGERUNGS-ATLAS</span>
            <span style={{fontSize:"9px",color:"#8ea2d8",letterSpacing:"2px",fontFamily:"'Cinzel',serif"}}>{CASTLES.length} FESTUNGEN</span>
          </div>
        </div>

        {/* Nav tabs */}
        <div className="nav-tabs" style={{display:"flex",height:"100%",flex:1,overflowX:"auto",padding:"0 4px"}}>
          {NAVTABS.map(t=>(
            <button className={`nav-premium ${tab===t.id?"active":""}`} key={t.id} onClick={()=>setTab(t.id)} style={{background:"transparent",border:"none",color:tab===t.id?"#ebf2ff":"#9aa9d0",cursor:"pointer",whiteSpace:"nowrap",fontFamily:tab===t.id?"'Cinzel',serif":"inherit"}}>{t.l}</button>
          ))}
        </div>

        {/* Setup button */}
        <button
          onClick={()=>setShowSetup(s=>!s)}
          style={{
            padding:"0 14px",
            background:showSetup
              ?"linear-gradient(135deg,rgba(201,168,76,0.14),rgba(201,168,76,0.06))"
              :"transparent",
            border:"none",
            borderLeft:"1px solid rgba(138,173,255,0.08)",
            borderBottom:`2px solid ${showSetup?"rgba(201,168,76,0.7)":"transparent"}`,
            color:showSetup?"#d4b060":"#6a5a48",
            cursor:"pointer",fontSize:"13px",whiteSpace:"nowrap",
            transition:"all .2s ease",
            display:"flex",alignItems:"center",gap:"5px",
          }}
        >
          <span style={{opacity:showSetup?1:0.7}}>⚙️</span>
          {general&&<span>{general.emoji}</span>}
          {season?.emoji&&<span>{season.emoji}</span>}
        </button>
      </header>

      {/* ── SETUP PANEL ── */}
      {showSetup&&(
        <div className="glass" style={{background:uiTheme.setupBg,borderBottom:uiTheme.setupBorder,padding:"14px 16px",display:"flex",gap:"16px",flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:"11px",color:"#b09a70",letterSpacing:"2px",marginBottom:"5px"}}>⚔️ GENERAL</div>
            <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
              <button onClick={()=>setGeneral(null)} style={{padding:"4px 10px",fontSize:"12px",background:!general?"rgba(201,168,76,0.12)":"rgba(255,255,255,0.04)",border:`1px solid ${!general?"rgba(201,168,76,0.35)":"rgba(255,255,255,0.08)"}`,color:!general?"#c9a84c":"#8a7a60",borderRadius:"4px",cursor:"pointer",transition:"all .15s"}}>Keiner</button>
              {GENERALS.map(g=>(
                <button key={g.id} onClick={()=>setGeneral(g===general?null:g)} title={g.bio} style={{padding:"4px 10px",fontSize:"12px",background:general?.id===g.id?"rgba(201,168,76,0.12)":"rgba(255,255,255,0.04)",border:`1px solid ${general?.id===g.id?"rgba(201,168,76,0.35)":"rgba(255,255,255,0.08)"}`,color:general?.id===g.id?"#c9a84c":"#8a7a60",borderRadius:"4px",cursor:"pointer",transition:"all .15s"}}>
                  {g.emoji} {g.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{fontSize:"11px",color:"#b09a70",letterSpacing:"2px",marginBottom:"5px"}}>🌿 JAHRESZEIT</div>
            <div style={{display:"flex",gap:"4px"}}>
              {SEASONS.map(s=>(
                <button key={s.id} onClick={()=>setSeason(s)} title={s.desc} style={{padding:"4px 10px",fontSize:"12px",background:season?.id===s.id?"rgba(201,168,76,0.12)":"rgba(255,255,255,0.04)",border:`1px solid ${season?.id===s.id?"rgba(201,168,76,0.35)":"rgba(255,255,255,0.08)"}`,color:season?.id===s.id?"#c9a84c":"#8a7a60",borderRadius:"4px",cursor:"pointer",transition:"all .15s"}}>
                  {s.emoji} {s.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{fontSize:"11px",color:"#b09a70",letterSpacing:"2px",marginBottom:"5px"}}>🎨 DESIGN</div>
            <div style={{display:"flex",gap:"4px"}}>
              <button onClick={()=>setVisualPreset("blue")} style={{padding:"3px 8px",fontSize:"12px",background:visualPreset==="blue"?"rgba(111,138,255,0.22)":"rgba(255,255,255,0.02)",border:`1px solid ${visualPreset==="blue"?"rgba(138,173,255,0.5)":"rgba(255,255,255,0.05)"}`,color:visualPreset==="blue"?"#dce8ff":"#7a6a48",borderRadius:"2px",cursor:"pointer"}}>🔹 Premium Blue</button>
              <button onClick={()=>setVisualPreset("gold")} style={{padding:"3px 8px",fontSize:"12px",background:visualPreset==="gold"?"rgba(201,168,76,0.18)":"rgba(255,255,255,0.02)",border:`1px solid ${visualPreset==="gold"?"rgba(201,168,76,0.45)":"rgba(255,255,255,0.05)"}`,color:visualPreset==="gold"?"#e8cc98":"#7a6a48",borderRadius:"2px",cursor:"pointer"}}>🟡 Royal Gold</button>
            </div>
          </div>
          {/* Weather display */}
          <div>
            <div style={{fontSize:"11px",color:"#b09a70",letterSpacing:"2px",marginBottom:"5px"}}>⛅ WETTER (HEUTE)</div>
            <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
              <div style={{padding:"5px 10px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"4px",display:"flex",gap:"6px",alignItems:"center",flex:1}}>
                <span style={{fontSize:"16px"}}>{weather.emoji}</span>
                <div>
                  <div style={{fontSize:"12px",color:"#c9a84c"}}>{weather.label.split(" ").slice(1).join(" ")}</div>
                  <div style={{fontSize:"10px",color:"#5a4a28"}}>{weather.desc}</div>
                  <div style={{fontSize:"10px",color:"#9a8a6a",marginTop:"1px"}}>
                    Angriff {weather.siegeMod>=0?"+":""}{weather.siegeMod} · Verteidigung {weather.defMod>=0?"+":""}{weather.defMod}
                  </div>
                </div>
              </div>
              <button onClick={randomizeWeather} title="Wetter zufällig" style={{padding:"5px 8px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",color:"#9a8a6a",borderRadius:"4px",cursor:"pointer",fontSize:"14px"}}>🎲</button>
            </div>
          </div>
          {general&&<div style={{padding:"6px 10px",background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"4px",fontSize:"13px",color:"#cbb888"}}>
            <strong style={{color:general?"#c9a84c":"#3a2a14"}}>{general.emoji} {general.name}</strong> — {general.specialty}<br/>
            <span style={{fontSize:"12px",color:"#b09a70"}}>{Object.entries(general.bonus).map(([k,v])=>`${k} +${v}`).join(" · ")}</span>
            {general.ability&&<div style={{fontSize:"11px",color:"#8a7a58",marginTop:"3px"}}>⚡ {general.ability.name}: {general.ability.desc.slice(0,50)}…</div>}
          </div>}
        </div>
      )}

      {/* ── OVERVIEW ── */}
      {tab==="overview"&&<div style={{flex:1,overflowY:"auto"}}>
        <div className="content-wrap">
        <section className="hero-v2" style={{border:uiTheme.heroBorder,background:uiTheme.heroBg}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:"14px",alignItems:"flex-start",flexWrap:"wrap"}}>
            <div style={{maxWidth:"620px"}}>
              <div style={{fontSize:"11px",letterSpacing:"2px",color:"#96aee4",marginBottom:"8px"}}>COMMAND OVERVIEW · V2</div>
              <h2 style={{margin:"0 0 8px",fontSize:"28px",lineHeight:1.15,color:"#f2f7ff",fontFamily:"'Cinzel',serif",letterSpacing:"1px"}}>Strategisches Erlebnis mit Premium-Inszenierung</h2>
              <p style={{margin:0,color:"#b5c5eb",fontSize:"14px",lineHeight:1.7}}>
                Entdecke Burgen wie in einem Tactical Command Center: schneller Zugriff auf Weltkarte, Kampagnen und Belagerungssimulation
                mit klaren KPIs und hochwertiger visueller Dramaturgie.
              </p>
            </div>
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
              <button className="hero-cta" onClick={()=>setTab("worldmap")}>🌍 Weltkarte öffnen</button>
              <button className="hero-cta alt" onClick={()=>setTab("campaign")}>📖 Kampagne starten</button>
              <button className="hero-cta alt" onClick={()=>{setTab("detail");setDtab("simulator");}}>⚔️ Simulator direkt</button>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:"10px",marginTop:"14px"}}>
            <div className="hero-kpi"><div style={{fontSize:"11px",color:"#8ea2d8",letterSpacing:"1px"}}>FESTUNGEN</div><div style={{fontSize:"22px",fontWeight:"700",color:"#ebf3ff"}}>{CASTLES.length}</div></div>
            <div className="hero-kpi"><div style={{fontSize:"11px",color:"#8ea2d8",letterSpacing:"1px"}}>ERFOLGE</div><div style={{fontSize:"22px",fontWeight:"700",color:"#ebf3ff"}}>{checkAchievements(scores,CASTLES,playStats).filter(a=>a.unlocked).length}</div></div>
            <div className="hero-kpi"><div style={{fontSize:"11px",color:"#8ea2d8",letterSpacing:"1px"}}>BELAGERUNGEN</div><div style={{fontSize:"22px",fontWeight:"700",color:"#ebf3ff"}}>{playStats?.sieges||0}</div></div>
            <div className="hero-kpi"><div style={{fontSize:"11px",color:"#8ea2d8",letterSpacing:"1px"}}>SIEGRATE</div><div style={{fontSize:"22px",fontWeight:"700",color:"#ebf3ff"}}>{playStats?.sieges?Math.round(((playStats.wins||0)/playStats.sieges)*100):0}%</div></div>
          </div>
          <div style={{marginTop:"12px"}}>
            <div style={{fontSize:"10px",letterSpacing:"2px",color:"#8ea2d8",marginBottom:"8px"}}>TOP FESTUNGEN · SCHNELLSTART</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:"8px"}}>
              {topCastles.map(c=>(
                <div key={c.id} className="hero-mini-card">
                  <div style={{display:"flex",gap:"8px",alignItems:"center",minWidth:0}}>
                    <span style={{fontSize:"18px"}}>{c.icon}</span>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:"12px",color:"#eff5ff",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</div>
                      <div style={{fontSize:"10px",color:"#8ea2d8"}}>{c.epoch} · Score {avg(c)}</div>
                    </div>
                  </div>
                  <button onClick={()=>{setSel(c);setTab("detail");setDtab("stats");}}>Öffnen</button>
                </div>
              ))}
            </div>
          </div>
        </section>
        <div className="soft-card" style={{margin:"0 16px 16px",padding:"2px"}}>
          <CastleGrid castles={CASTLES} onSelect={go} scores={scores} filter={filter} setFilter={setFilter} epochFilter={epochFilter} setEpochFilter={setEpochFilter} regionFilter={regionFilter} setRegionFilter={setRegionFilter} search={search} setSearch={setSearch} favs={favs} onFavToggle={toggleFav}/>
        </div>
        </div>
      </div>}

      {/* ── WORLD MAP ── */}
      {tab==="worldmap"&&<div style={{flex:1,overflowY:"auto"}}><WorldMap castles={CASTLES} onSelect={go} selected={sel}/></div>}

      {/* ── TOURNAMENT ── */}
      {tab==="tournament"&&<div style={{flex:1,overflowY:"auto",padding:"18px",maxWidth:"700px",margin:"0 auto",width:"100%"}}>
        <h2 style={{fontSize:"16px",fontWeight:"bold",color:"#f0e6cc",margin:"0 0 14px"}}>🗡️ Belagerungs-Turnier</h2>
        <Tournament castles={CASTLES}/>
      </div>}

      {/* ── BUILD ── */}
      {tab==="build"&&<div style={{flex:1,overflowY:"auto",padding:"18px",maxWidth:"680px",margin:"0 auto",width:"100%"}}>
        <h2 style={{fontSize:"16px",fontWeight:"bold",color:"#f0e6cc",margin:"0 0 5px"}}>🏗️ Burg-Baumeister</h2>
        <p style={{fontSize:"13px",color:"#b09a70",margin:"0 0 14px",lineHeight:1.7}}>Budget: {BUILDER_BUDGET} Gold · {BUILDER.length} Elemente · Einschließlich Drachen & Magie</p>
        <CastleBuilder/>
      </div>}

      {/* ── TIMELINE ── */}
      {tab==="timeline"&&<div style={{flex:1,overflowY:"auto"}}><Timeline castles={CASTLES.filter(c=>{if(filter!=="all"&&c.type!==filter)return false;return true;})} onSelect={go}/></div>}

      {/* ── HIGHSCORES ── */}
      {tab==="campaign"&&<div style={{flex:1,overflowY:"auto"}}><Campaign castles={CASTLES} onSelect={go} addScore={addScore} general={general} season={season}/></div>}
      {tab==="globalstats"&&<div style={{flex:1,overflowY:"auto"}}><GlobalStats scores={scores} playStats={playStats} castles={CASTLES}/></div>}
      {tab==="achievements"&&<div style={{flex:1,overflowY:"auto"}}><AchievementsPanel scores={scores} castles={CASTLES} playStats={playStats}/></div>}
      {tab==="highscores"&&<div style={{flex:1,overflowY:"auto"}}><Highscores scores={scores} onSelect={go} playStats={playStats}/></div>}

      <div className="mobile-quickbar">
        <button onClick={()=>setTab("overview")}>🏰 Übersicht</button>
        <button onClick={()=>setTab("worldmap")}>🌍 Karte</button>
        <button onClick={()=>setTab("campaign")}>📖 Kampagne</button>
      </div>

      {/* Achievement toast notification */}
      {achievementToast&&(
        <AchievementToast
          achievement={achievementToast}
          onClose={()=>setAchievementToast(null)}
        />
      )}

      {/* ── DETAIL ── */}
      {tab==="detail"&&(
        <div style={{display:"flex",flex:1,overflow:"hidden"}}>
          {/* Sidebar */}
          <aside className="sidebar" style={{width:sideOpen?"225px":"44px",flexShrink:0,transition:"width .2s ease",borderRight:"1px solid rgba(138,173,255,0.15)",background:"linear-gradient(180deg,rgba(10,16,30,0.88),rgba(8,12,24,0.84))",borderRadius:"14px",overflowY:"auto",overflowX:"hidden"}}>
            <button onClick={()=>setSideOpen(e=>!e)} style={{width:"100%",padding:"6px",background:"transparent",border:"none",borderBottom:"1px solid rgba(255,255,255,0.02)",color:"#9cb0de",cursor:"pointer",fontSize:"14px",textAlign:sideOpen?"right":"center"}}>{sideOpen?"◀":"▶"}</button>
            {sideFiltered.map(c=>{const a=avg(c),isA=sel.id===c.id,hs=scores[c.id];return(
              <button key={c.id} onClick={()=>{setSel(c);setDtab("map");setAttackMode(false);}} title={c.name}
                style={{width:"100%",textAlign:"left",padding:sideOpen?"6px 8px":"6px",background:isA?c.theme.glow:"transparent",border:"none",borderLeft:`2px solid ${isA?c.theme.accent:"transparent"}`,borderBottom:"1px solid rgba(255,255,255,0.018)",cursor:"pointer",display:"flex",gap:"5px",alignItems:"center",transition:"all .09s"}}>
                <span style={{fontSize:"13px",flexShrink:0}}>{c.icon}</span>
                {sideOpen&&<><div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"12px",fontWeight:"bold",color:isA?"#f0e6cc":"#9a8a6a",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</div>
                  <div style={{fontSize:"10px",color:c.type==="real"?"#5a8040":"#6a6aaa"}}>{c.type==="real"?"⚜":"✦"} {c.epoch}</div>
                </div>
                <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"1px"}}>
                  <span style={{fontSize:"12px",fontWeight:"bold",color:rCol(a)}}>{a}</span>
                  {hs&&<span style={{fontSize:"10px",color:hs.won?"#6aaa42":"#aa4a32"}}>{hs.won?"✅":"❌"}</span>}
                </div></>}
              </button>
            );})}
          </aside>

          {/* Main detail area */}
          <main className="panel-premium" style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column"}}>
            {/* Castle header */}
            <div style={{padding:"13px 16px 10px",borderBottom:"1px solid rgba(201,168,76,0.05)",background:`linear-gradient(135deg,${sel.theme.bg} 0%,rgba(12,20,40,0.88) 100%)`,flexShrink:0}}>
              <div style={{display:"flex",gap:"10px",alignItems:"flex-start"}}>
                <div style={{fontSize:"30px",width:"48px",height:"48px",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:`${sel.theme.accent}12`,border:`1px solid ${sel.theme.accent}24`,borderRadius:"4px"}}>{sel.icon}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:"4px",alignItems:"center",marginBottom:"2px",flexWrap:"wrap"}}>
                    <span style={{fontSize:"11px",letterSpacing:"2px",padding:"1px 6px",borderRadius:"2px",background:sel.type==="real"?"rgba(40,70,25,0.18)":"rgba(40,40,90,0.18)",color:sel.type==="real"?"#5a7a38":"#6a6aaa",border:`1px solid ${sel.type==="real"?"rgba(40,70,25,0.28)":"rgba(40,40,90,0.28)"}`}}>{sel.type==="real"?"⚜ HISTORISCH":"✦ FANTASY"}</span>
                    <span className="detail-header-meta" style={{fontSize:"11px",color:"#9cb0de",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%"}}>{sel.epoch} · {sel.loc} · {sel.era}</span>
                  </div>
                  <h1 style={{fontSize:"15px",fontWeight:"bold",color:"#f5edd8",margin:"0 0 1px"}}>{sel.name}</h1>
                  <div style={{fontSize:"12px",color:sel.theme.accent,marginBottom:"3px"}}>{sel.sub}</div>
                  <p style={{fontSize:"13px",color:"#b09a70",lineHeight:1.7,margin:0,maxWidth:"480px"}}>{sel.desc}</p>
                </div>
                <div style={{flexShrink:0,textAlign:"center",padding:"8px 11px",background:"rgba(0,0,0,0.35)",border:`1px solid ${sel.theme.accent}1e`,borderRadius:"4px"}}>
                  <div style={{fontSize:"20px",fontWeight:"bold",color:rCol(sc)}}>{sc}</div>
                  <div style={{fontSize:"10px",color:"#9cb0de",letterSpacing:"2px",marginTop:"1px"}}>GESAMT</div>
                  {general&&<div style={{fontSize:"12px",color:sel.theme.accent,marginTop:"2px"}}>{general.emoji}</div>}
                  {season&&<div style={{fontSize:"13px",marginTop:"1px"}}>{season.emoji}</div>}
                </div>
              </div>
            </div>

            {/* Detail tabs */}
            <div className="detail-tabs" style={{display:"flex",borderBottom:"1px solid rgba(201,168,76,0.05)",background:"rgba(12,20,36,0.6)",flexShrink:0,overflowX:"auto"}}>
              {DTABS.map(t=>(
                <button key={t.id} onClick={()=>setDtab(t.id)} style={{padding:"8px 12px",background:dtab===t.id?`${sel.theme.accent}0d`:"transparent",border:"none",borderBottom:`2px solid ${dtab===t.id?sel.theme.accent:"transparent"}`,color:dtab===t.id?sel.theme.accent:"#8a7a68",cursor:"pointer",fontSize:"12px",letterSpacing:"0.5px",transition:"all .18s ease",marginBottom:"-1px",whiteSpace:"nowrap",fontWeight:dtab===t.id?600:400}}>{t.l}</button>
              ))}
            </div>

            {/* Detail content */}
            <div style={{flex:1,padding:"14px 16px",animation:"fadeIn .2s ease",overflowY:"auto"}}>
              {dtab==="map"&&<CastleMapTab castle={sel}/>}
              {dtab==="grundriss"&&<CastleFloorPlanTab castle={sel}/>}

              {dtab==="stats"&&(
                <div className="grid-2col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                  <div>
                    <div style={{padding:"12px",background:"rgba(255,255,255,.016)",border:`1px solid ${sel.theme.accent}16`,borderRadius:"4px",marginBottom:"8px"}}>
                      <div style={{fontSize:"11px",color:sel.theme.accent,letterSpacing:"2px",marginBottom:"9px"}}>DEFENSIV-RATING</div>
                      <ScoreBar label="Mauerstärke" value={sel.ratings.walls} delay={0} accent={sel.theme.accent}/>
                      <ScoreBar label="Versorgung" value={sel.ratings.supply} delay={50} accent={sel.theme.accent}/>
                      <ScoreBar label="Position" value={sel.ratings.position} delay={100} accent={sel.theme.accent}/>
                      <ScoreBar label="Garnison" value={sel.ratings.garrison} delay={150} accent={sel.theme.accent}/>
                      <ScoreBar label="Moral" value={sel.ratings.morale} delay={200} accent={sel.theme.accent}/>
                      <div style={{marginTop:"9px",paddingTop:"8px",borderTop:"1px solid rgba(255,255,255,.03)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:"11px",color:"#9cb0de",letterSpacing:"2px"}}>GESAMT</span>
                        <span style={{fontSize:"16px",fontWeight:"bold",color:rCol(sc)}}>{sc}</span>
                      </div>
                    </div>
                    <div style={{padding:"10px",background:"rgba(255,255,255,.013)",border:`1px solid ${sel.theme.accent}12`,borderRadius:"4px"}}>
                      <div style={{fontSize:"11px",color:sel.theme.accent,letterSpacing:"2px",marginBottom:"6px"}}>RADAR-PROFIL</div>
                      <RadarChart castle={sel}/>
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
                    {[
                      {t:"STÄRKEN",items:sel.strengths,c:"rgba(40,80,22,.1)",bc:"rgba(60,120,30,.2)",tc:"#8acc68",ic:"#70bb44"},
                      {t:"SCHWÄCHEN",items:sel.weaknesses,c:"rgba(100,25,12,.1)",bc:"rgba(150,40,20,.2)",tc:"#dd8870",ic:"#ee6644"},
                      {t:"ANGRIFFSTIPPS",items:sel.attackTips,c:"rgba(120,50,8,.08)",bc:"rgba(180,80,20,.18)",tc:"#c8a060",ic:"#c9a84c"}
                    ].map(g=>(
                      <div key={g.t} style={{padding:"10px 12px",background:g.c,border:`1px solid ${g.bc}`,borderRadius:"6px"}}>
                        <div style={{fontSize:"10px",color:g.ic,letterSpacing:"2px",marginBottom:"6px",fontWeight:600}}>{g.t}</div>
                        {g.items.map((s,i)=><div key={i} style={{fontSize:"12px",color:g.tc,padding:"3px 0",borderBottom:i<g.items.length-1?"1px solid rgba(255,255,255,.04)":"none",display:"flex",gap:"6px",lineHeight:1.5}}><span style={{color:g.ic,flexShrink:0,fontWeight:"bold"}}>›</span>{s}</div>)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dtab==="roleplay"&&<RoleplaySiege castle={sel} onScore={addScore} general={general} season={season}/>}
              {dtab==="simulator"&&<SiegeSimulator castle={sel} onScore={addScore} general={general} season={season}/>}
              {dtab==="whatif"&&<div style={{maxWidth:"640px"}}><WhatIf castle={sel}/></div>}
              {dtab==="ai"&&<div style={{maxWidth:"600px"}}><AIAdvisor castle={sel}/></div>}
              {dtab==="compare"&&<div style={{maxWidth:"480px"}}><Compare castles={CASTLES} init={sel}/></div>}
              {dtab==="lexikon"&&<Lexikon castle={sel}/>}
              {dtab==="history"&&(
                <div style={{maxWidth:"640px",animation:"fadeIn 0.25s ease"}}>
                  {/* Castle header */}
                  <div style={{display:"flex",gap:"14px",alignItems:"center",padding:"14px 16px",
                    background:`linear-gradient(135deg,${sel.theme.bg},rgba(10,7,3,0.95))`,
                    border:`1px solid ${sel.theme.accent}22`,borderLeft:`4px solid ${sel.theme.accent}`,
                    borderRadius:"6px",marginBottom:"18px"}}>
                    <span style={{fontSize:"32px"}}>{sel.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"18px",fontWeight:"bold",color:"#f0e6cc",marginBottom:"2px"}}>{sel.name}</div>
                      <div style={{fontSize:"13px",color:sel.theme.accent,marginBottom:"1px"}}>{sel.sub}</div>
                      <div style={{fontSize:"12px",color:"#9a8a68"}}>{sel.loc} · {sel.era} · {sel.epoch}</div>
                    </div>
                    <div style={{textAlign:"center",padding:"10px 16px",background:"rgba(0,0,0,0.3)",borderRadius:"5px",border:`1px solid ${sel.theme.accent}18`}}>
                      <div style={{fontSize:"28px",fontWeight:"bold",color:rCol(avg(sel))}}>{avg(sel)}</div>
                      <div style={{fontSize:"9px",color:"#8a7860",letterSpacing:"1.5px"}}>GESAMTWERT</div>
                    </div>
                  </div>

                  {/* 5-stat bars */}
                  <div style={{padding:"14px 16px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"6px",marginBottom:"14px"}}>
                    <div style={{fontSize:"11px",color:sel.theme.accent,letterSpacing:"2px",marginBottom:"10px"}}>📊 KAMPFWERTE</div>
                    {[{k:"walls",l:"Mauern",i:"🧱"},{k:"supply",l:"Versorgung",i:"🍖"},{k:"position",l:"Position",i:"⛰️"},{k:"garrison",l:"Garnison",i:"⚔️"},{k:"morale",l:"Moral",i:"🔥"}].map(cat=>{
                      const v=sel.ratings[cat.k];
                      return(
                        <div key={cat.k} style={{marginBottom:"8px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
                            <span style={{fontSize:"12px",color:"#7a6a48"}}>{cat.i} {cat.l}</span>
                            <span style={{fontSize:"12px",fontWeight:"bold",color:rCol(v),fontFamily:"monospace"}}>{v}</span>
                          </div>
                          <div style={{height:"5px",background:"rgba(255,255,255,0.04)",borderRadius:"3px",overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${v}%`,background:`linear-gradient(90deg,${rCol(v)},${sel.theme.accent})`,borderRadius:"3px",transition:"width 0.8s ease"}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Historical timeline */}
                  <div style={{marginBottom:"14px"}}>
                    <div style={{fontSize:"11px",color:sel.theme.accent,letterSpacing:"2px",marginBottom:"10px"}}>⏳ HISTORISCHER ZEITSTRAHL</div>
                    <div style={{position:"relative",paddingLeft:"24px"}}>
                      <div style={{position:"absolute",left:"8px",top:0,bottom:0,width:"1px",
                        background:`linear-gradient(180deg,${sel.theme.accent}66,${sel.theme.accent}22,transparent)`}}/>
                      {[
                        {dot:"🏗️",label:sel.year>0?`${sel.era.split("–")[0]||sel.year}`:sel.year>-3000?`${Math.abs(sel.year)} v.Chr.`:sel.era,
                          text:`${sel.name} wird ${sel.type==="fantasy"?"erschaffen":"erbaut"} — ${sel.sub}.`,color:sel.theme.accent},
                        {dot:"⚔️",label:"Militärische Stärken",text:sel.strengths.join(" · "),color:"#8aaa68"},
                        {dot:"⚠️",label:"Kritische Schwächen",text:sel.weaknesses.join(" · "),color:"#cc7744"},
                        {dot:"📜",label:"Historischer Kern",text:sel.history,color:"#9a9a70",highlight:true},
                        {dot:"🏆",label:"Strategisches Fazit",text:sel.verdict,color:sel.theme.accent,highlight:true},
                        ...(sel.defender?[{dot:"🛡️",label:"Historischer Verteidiger",text:sel.defender,color:"#9a8860"}]:[]),
                      ].map((e,i)=>(
                        <div key={i} style={{position:"relative",marginBottom:"12px",paddingLeft:"16px",animation:`fadeIn 0.3s ease ${i*0.06}s both`}}>
                          <div style={{position:"absolute",left:"-16px",top:"2px",width:"18px",height:"18px",borderRadius:"50%",
                            background:e.highlight?`${e.color}25`:`${e.color}12`,border:`1.5px solid ${e.color}55`,
                            display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",
                            boxShadow:e.highlight?`0 0 10px ${e.color}33`:"none"}}>{e.dot}</div>
                          <div style={{padding:"10px 13px",
                            background:e.highlight?`${e.color}07`:"rgba(255,255,255,0.013)",
                            border:`1px solid ${e.highlight?e.color+"25":"rgba(255,255,255,0.03)"}`,
                            borderLeft:e.highlight?`3px solid ${e.color}88`:"1px solid rgba(255,255,255,0.03)",
                            borderRadius:"4px"}}>
                            <div style={{fontSize:"10px",color:e.color,letterSpacing:"1.5px",marginBottom:"4px",fontWeight:"bold"}}>{e.label.toUpperCase()}</div>
                            <div style={{fontSize:"13px",color:e.highlight?"#c0b090":"#5a4a30",lineHeight:1.85}}>{e.text}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Attack tips */}
                  {sel.attackTips&&(
                    <div style={{padding:"13px 15px",background:"rgba(60,15,8,0.08)",border:"1px solid rgba(150,40,20,0.18)",borderRadius:"5px",marginBottom:"12px"}}>
                      <div style={{fontSize:"11px",color:"#cc5533",letterSpacing:"2px",marginBottom:"8px"}}>⚔️ ANGRIFFSTAKTIKEN</div>
                      {sel.attackTips.map((t,i)=>(
                        <div key={i} style={{display:"flex",gap:"8px",fontSize:"13px",color:"#6a3820",padding:"3px 0",lineHeight:1.7}}>
                          <span style={{color:"#cc5533",flexShrink:0,fontWeight:"bold"}}>{i+1}.</span>{t}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Siege context */}
                  <div style={{padding:"13px 15px",background:`${sel.theme.accent}06`,border:`1px solid ${sel.theme.accent}18`,borderRadius:"5px"}}>
                    <div style={{fontSize:"11px",color:sel.theme.accent,letterSpacing:"2px",marginBottom:"6px"}}>🎭 BELAGERUNGSSZENARIO</div>
                    <p style={{fontSize:"13px",color:"#9a8868",lineHeight:1.9,margin:0,fontStyle:"italic"}}>{sel.siegeCtx}</p>
                    {sel.defender&&<div style={{marginTop:"8px",fontSize:"12px",color:"#7a6840"}}>🛡️ Verteidiger: <strong style={{color:sel.theme.accent}}>{sel.defender}</strong></div>}
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
