import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ══════════════════════════════════════════════════════════════════════════
//  ██████╗ █████╗ ███████╗████████╗██╗     ███████╗
// ██╔════╝██╔══██╗██╔════╝╚══██╔══╝██║     ██╔════╝
// ██║     ███████║███████╗   ██║   ██║     █████╗
// ██║     ██╔══██║╚════██║   ██║   ██║     ██╔══╝
// ╚██████╗██║  ██║███████║   ██║   ███████╗███████╗
//  ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚══════╝╚══════╝
//  SIEGE ULTIMATE v8  —  35 Burgen · Kampagne · Generäle · Jahreszeiten
// ══════════════════════════════════════════════════════════════════════════

// ─── CONSTANTS ────────────────────────────────────────────────────────────
const TOTAL_RES = 14;

// ─── OFFLINE FALLBACK RESPONSES ───────────────────────────────────────────
// Used when API is unavailable — still gives a good experience
const ROLEPLAY_RESPONSES = {
  // Generic defender responses per turn
  early: [
    "Eure Truppen nähern sich den Außenmauern — wir sind bereit! Die Garnison steht auf den Zinnen, Bogenschützen in Position. Ihr werdet euer Blut für jeden Meter bezahlen!",
    "Interessante Strategie. Doch ihr unterschätzt uns. Unsere Mauern haben Armeen vernichtet, die mächtiger waren als eure. Macht euren nächsten Zug.",
    "Meine Männer berichten von euren Bewegungen. Wir passen unsere Verteidigung entsprechend an. Jeder Angriff kostet euch mehr als ihr gewinnt.",
    "Ihr glaubt, eine Schwachstelle gefunden zu haben? Wir haben sie längst befestigt. Kommt nur nähern — die Verteidigung ist stärker als sie aussieht.",
  ],
  middle: [
    "Wochen vergehen und ihr habt kaum Fortschritte gemacht. Meine Männer halten stand, obwohl die Vorräte schwinden. Wir werden nicht aufgeben!",
    "Euer Belagerungsgerät beeindruckt mich — aber Steine und Holz allein nehmen keine Burg. Es braucht Mut, den ihr offensichtlich besitzt. Trotzdem: wir halten durch!",
    "Ein Ereignis erschüttert die Burg, aber der Geist meiner Soldaten ist ungebrochen. Wir schwören, diese Festung bis zum letzten Mann zu halten.",
    "Ihr seid hartnäckig, das muss ich zugeben. Aber Hartnäckigkeit allein reicht nicht. Diese Burg hat Schlimmeres überlebt als euren Angriff.",
  ],
  late: [
    "Die Situation ist ernst. Unsere Vorräte neigen sich dem Ende. Aber Kapitulation kommt nicht in Frage — lieber fallen wir mit der Burg!",
    "Ihr habt gut gekämpft. Meine Männer sind erschöpft, die Mauern beschädigt. Doch solange ich lebe, fällt diese Burg nicht. **[GEHALTEN]**",
    "Es ist vorbei. Ihr habt jeden Ausweg abgeschnitten, jede Schwäche ausgenutzt. Im Namen meiner Männer... wir ergeben uns. **[GEFALLEN]**",
    "Die Burg fällt! Ihr habt brillant taktiert — die Schwachstelle war genau dort wo ihr sie vermutet habt. Ein würdiger Sieg. **[GEFALLEN]**",
  ],
};

const SIMULATOR_FALLBACKS = [
  {success:true,title:"Brillante Belagerung",outcome:"Durch geschickte Kombination von Belagerungsmaschinen und Versorgungsblockade fiel die Burg nach hartem Kampf.",phases:["Außenring erkundet und Schwachstellen kartiert","Versorgungswege abgeschnitten — Garnison isoliert","Maschinen auf Schwachstelle konzentriert","Mauerbreschen — Sturmangriff erfolgreich"],keyMoment:"Der entscheidende Moment kam als die Hauptmauer unter dem konzentrierten Beschuss nachgab und eine breite Lücke entstand.",mistakes:["Kavallerie zu früh eingesetzt"],whatWorked:["Versorgungsblockade war effektiv","Schwachstelle korrekt identifiziert"],historicalParallel:"Ähnlich wie bei der Belagerung von Akkon 1291.",rating:8,daysElapsed:67},
  {success:false,title:"Verteidigung hält stand",outcome:"Trotz massiver Anstrengungen konnte die Burg nicht eingenommen werden — die Verteidiger nutzten jeden Vorteil ihrer Festung.",phases:["Erstangriff zurückgeschlagen","Belagerungsgeräte von der Garnison zerstört","Versorgung der Angreifer wurde knapp","Rückzug nach schwerem Verlust"],keyMoment:"Als die eigenen Vorräte nach 3 Monaten zur Neige gingen, musste der Angriff abgebrochen werden.",mistakes:["Keine vollständige Einkreisung","Zu wenig Geduld"],whatWorked:["Anfangsdruck war stark"],historicalParallel:"Ähnlich wie viele gescheiterte Belagerungen des Krak des Chevaliers.",rating:4,daysElapsed:95},
  {success:true,title:"Schneller Sieg durch List",outcome:"Statt direktem Angriff wurde durch Diplomaten und Spione ein Tor geöffnet — minimale Verluste, maximaler Erfolg.",phases:["Spione infiltrieren die Burg","Verbündete unter der Garnison gewonnen","Tor nachts geöffnet","Burg kampflos übernommen"],keyMoment:"Ein verräterischer Unteroffizier öffnete das Nebentor um Mitternacht — genau wie in der historischen Vorlage.",mistakes:["Hätte auch ohne List funktioniert"],whatWorked:["Diplomaten entschieden das Spiel","Spione lieferten entscheidende Infos"],historicalParallel:"Wie der Fall von Konstantinopel durch das offene Kerkaporta-Tor.",rating:9,daysElapsed:22},
];

const WHATIF_FALLBACKS = [
  {likelihood:7,outcome:"Mit doppelter Garnison hätte die Burg deutlich länger gehalten.",analysis:"Eine größere Verteidigungsstreitmacht hätte alle Schwachstellen gleichzeitig besetzen können. Die kritischen Engpässe wären gesichert worden, und die moralische Wirkung auf die Angreifer wäre verheerend gewesen. Historisch zeigt sich: Garnisonstärke ist oft entscheidender als Mauerstärke.",wouldHaveFallen:false,keyFactor:"Genug Männer für jeden Mauerabschnitt wäre spielentscheidend gewesen.",timeChange:"Die Burg hätte mindestens 50 Jahre länger gehalten.",historicalParallels:["Harlech mit 50 Mann hielt 7 Jahre","Masada mit 960 Mann gegen eine Legion"],confidence:"hoch"},
  {likelihood:5,outcome:"Das Szenario hätte die Balance grundlegend verschoben.",analysis:"Diese kontrafaktische Änderung hätte tiefgreifende Auswirkungen auf den Verlauf der Belagerung gehabt. Die Verteidiger hätten neue Optionen gehabt, aber auch die Angreifer hätten sich anpassen können. Geschichte zeigt selten einfache Kausalitäten.",wouldHaveFallen:true,keyFactor:"Technologie und Taktik hätten sich gegenseitig aufgehoben.",timeChange:"Schwer vorherzusagen — zu viele Variablen.",historicalParallels:["Viele Burgen fielen trotz scheinbarer Überlegenheit","Technologischer Vorsprung ist nie garantiert"],confidence:"mittel"},
];

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
const BUILDER_BUDGET = 24;

// ─── SEASONS ──────────────────────────────────────────────────────────────
const SEASONS = [
  { id:"spring", name:"Frühling", emoji:"🌱", bonuses:{cavalry:+1,supply:+1}, penalties:{},     desc:"Gute Straßen, frische Truppen." },
  { id:"summer", name:"Sommer",   emoji:"☀️",  bonuses:{archers:+1,siege:+1},  penalties:{},     desc:"Lange Tage, maximale Sicht." },
  { id:"autumn", name:"Herbst",   emoji:"🍂",  bonuses:{miners:+1},            penalties:{cavalry:-1},desc:"Weicher Boden begünstigt Mineure." },
  { id:"winter", name:"Winter",   emoji:"❄️",  bonuses:{},                    penalties:{siege:-2,cavalry:-1},desc:"Frost lähmt Belagerungsmaschinen." },
];

// ─── GENERALS ─────────────────────────────────────────────────────────────
const GENERALS = [
  { id:"saladin",   name:"Saladin",         emoji:"🌙", bonus:{soldiers:+2,diplomats:+2}, specialty:"Psychologische Kriegsführung", bio:"Meister der Diplomatie und des Sturmangriffs" },
  { id:"caesar",    name:"Julius Caesar",   emoji:"🦅", bonus:{siege:+2,sappers:+2},      specialty:"Ingenieursbelagerung",         bio:"Erfinder moderner Belagerungstaktik" },
  { id:"genghis",   name:"Dschingis Khan",  emoji:"🏇", bonus:{cavalry:+3,spies:+1},      specialty:"Schnelle Umgehung",            bio:"Unvergleichliche Mobilität und Schrecken" },
  { id:"vauban",    name:"Vauban",          emoji:"⛏️", bonus:{miners:+3,sappers:+2},     specialty:"Minenkrieg",                   bio:"Revolutionierte die Belagerungskunst" },
  { id:"mehmed",    name:"Mehmed II.",      emoji:"🏰", bonus:{siege:+3,soldiers:+1},     specialty:"Schwere Artillerie",           bio:"Bezwinger von Konstantinopel" },
  { id:"richard",   name:"Richard I.",      emoji:"⚔️", bonus:{soldiers:+2,archers:+2},   specialty:"Direktsturm",                  bio:"Der Löwenherz – Meister des Frontalangriffs" },
  { id:"mongke",    name:"Möngke Khan",     emoji:"🏔️", bonus:{miners:+2,cavalry:+2},     specialty:"Bergbelagerung",               bio:"Bezwang Alamut und Bagdad" },
  { id:"napoleon",  name:"Napoleon",        emoji:"🎯", bonus:{siege:+2,sappers:+2,soldiers:+1},specialty:"Artilleriekonzentration",bio:"Artillerie als Gottheit des Krieges" },
];

// ─── SIEGE EVENTS ─────────────────────────────────────────────────────────
const SIEGE_EVENTS = [
  { id:"plague",      e:"🦠", t:"SEUCHE",              side:"attacker", txt:"Ruhr bricht aus. Deine Truppen verlieren Kampfkraft." },
  { id:"rain",        e:"🌧️", t:"UNWETTER",            side:"both",     txt:"Tagelanger Regen macht Maschinen unbrauchbar." },
  { id:"traitor",     e:"🕵️", t:"VERRÄTER",            side:"attacker", txt:"Überläufer bringt dir den genauen Grundriss." },
  { id:"relief",      e:"🐴", t:"ENTSATZ",              side:"defender", txt:"Ein Entsatzheer nähert sich — der Verteidiger hält durch." },
  { id:"supply_cut",  e:"🚛", t:"VERSORGUNG KAPPT",    side:"attacker", txt:"Deine Versorgungslinie abgeschnitten." },
  { id:"fire",        e:"🔥", t:"BRAND IN DER BURG",   side:"defender", txt:"Feuer in der Burg — Verteidiger kurzzeitig abgelenkt!" },
  { id:"negotiate",   e:"📜", t:"VERHANDLUNGSANGEBOT", side:"defender", txt:"Der Burgherr bietet Kapitulation gegen freien Abzug." },
  { id:"spy_caught",  e:"👁️", t:"SPION ENTTARNT",      side:"attacker", txt:"Dein Spion wurde gefangen — Pläne enthüllt." },
  { id:"morale_up",   e:"🎺", t:"MORAL-PREDIGT",       side:"defender", txt:"Burgkaplan feuert die Garnison an. Widerstand erhöht." },
  { id:"tunnel",      e:"⛏️", t:"TUNNEL ENTDECKT",     side:"attacker", txt:"Alte Tunnelanlage gefunden — möglicher Geheimeingang!" },
  { id:"desertion",   e:"💨", t:"DESERTIONEN",         side:"defender", txt:"30 Soldaten desertieren aus Hunger und Hoffnungslosigkeit." },
  { id:"flood",       e:"🌊", t:"ÜBERFLUTUNG",         side:"attacker", txt:"Starkregen flutet deine Zeltlager — Munition beschädigt." },
  { id:"eclipse",     e:"🌑", t:"SONNENFINSTERNIS",    side:"defender", txt:"Totale Finsternis — beide Seiten in Schockstarre." },
  { id:"messenger",   e:"📯", t:"KÖNIGSBOTE",          side:"attacker", txt:"Verstärkung auf dem Weg — aber erst in 14 Tagen!" },
  { id:"sabotage",    e:"💣", t:"SABOTAGE",            side:"attacker", txt:"Spion sabotiert eine deiner Belagerungsmaschinen." },
  { id:"heroic",      e:"🗡️", t:"HELDENTAT",           side:"defender", txt:"Ein einzelner Ritter fällt aus der Burg und tötet 12 Angreifer." },
  { id:"epidemic_d",  e:"⚰️", t:"SEUCHE IN DER BURG", side:"defender", txt:"Typhus grassiert hinter den Mauern — Garrison geschwächt." },
  { id:"oracle",      e:"🔮", t:"WEISSAGUNG",          side:"both",     txt:"Ein Prophet verkündet: 'Diese Burg wird fallen, wenn...' — Psychose auf beiden Seiten." },
];

// ─── WORLD MAP POSITIONS ──────────────────────────────────────────────────
const COORDS = {
  krak:{x:62,y:39},masada:{x:61,y:41},carcassonne:{x:47,y:29},chateau_gaillard:{x:46,y:26},
  harlech:{x:44,y:22},akkon:{x:61,y:40},himeji:{x:83,y:33},alamut:{x:64,y:35},
  constantinople:{x:57,y:33},coucy:{x:47,y:26},babylon:{x:63,y:38},mont_michel:{x:45,y:26},
  alhambra:{x:44,y:34},mehrangarh:{x:68,y:39},caernarvon:{x:44,y:22},windsor:{x:45,y:24},
  bodiam:{x:45,y:24},rhodes:{x:57,y:35},angkor:{x:79,y:47},persepolis:{x:65,y:38},
  knossos:{x:56,y:35},troy:{x:56,y:33},great_wall:{x:78,y:31},morville:{x:46,y:26},
  // Fantasy in separate quadrant top-left — MITTELERDE oben, WESTEROS unten
  helmsdeep:{x:8,y:10},minas_tirith:{x:12,y:12},gondolin:{x:6,y:7},barad_dur:{x:14,y:14},
  erebor:{x:16,y:8},isengard:{x:9,y:11},minas_morgul:{x:13,y:13},angband:{x:5,y:5},
  khazad_dum:{x:10,y:9},edoras:{x:11,y:12},
  // Game of Thrones — WESTEROS unten im Fantasy-Bereich
  winterfell:{x:7,y:22},kings_landing:{x:13,y:25},harrenhal:{x:11,y:23},
};

// ═══════════════════════════════════════════════════════════════════════════
//  35 CASTLES
// ═══════════════════════════════════════════════════════════════════════════
const CASTLES = [
// ── HISTORISCH ──────────────────────────────────────────────────────────
{id:"krak",name:"Krak des Chevaliers",sub:"Kreuzritter-Festung",era:"1142–1271",year:1200,loc:"Syrien",type:"real",epoch:"Mittelalter",region:"nahost",icon:"🏰",
 theme:{bg:"#1a1205",accent:"#c9a84c",glow:"rgba(201,168,76,0.15)"},
 ratings:{walls:97,supply:85,position:92,garrison:60,morale:70},
 desc:"Doppelringmauer, Zisternen für 5 Jahre — das Meisterwerk der Kreuzritterarchitektur.",
 history:"130 Jahre uneingenommen. 1271 fiel sie nicht durch Sturm, sondern durch einen gefälschten Brief des ägyptischen Sultans.",
 verdict:"Uneinnehmbar durch direkten Angriff. Einzig Verrat, Hunger und Zeit konnten sie besiegen.",
 zones:[{id:"ou",l:"Äußerer Ring",x:50,y:50,r:43,c:"#8b6914",a:3,d:"Breiter Außenwall im Kreuzfeuer."},{id:"in",l:"Innerer Ring",x:50,y:50,r:27,c:"#c9a84c",a:5,d:"Massivste Mauern, höchste Türme."},{id:"kp",l:"Donjon",x:50,y:50,r:13,c:"#e8c860",a:6,d:"Letzter Rückzugsort."},{id:"ci",l:"Zisternen",x:72,y:65,r:7,c:"#4488cc",a:1,d:"Wasser für 5 Jahre."},{id:"nw",l:"Nordflügel ⚠",x:50,y:14,r:9,c:"#cc4444",a:1,d:"Schwachstelle: flacheres Gelände."}],
 strengths:["Konzentrische Doppelmauer","Zisternen für 5 Jahre","650m Hangposition","Dreifache Toranlagen"],
 weaknesses:["Nordflankenzugang","Garnison oft 200 statt 2000","Nahrungsabhängig von außen"],
 attackTips:["Nordwall zuerst","Vollständige Einkreisung","Versorgung kappen","Brief-Fälschung!"],
 siegeCtx:"1271 — Du befehligst Baibars' 8.000 Mann. 200 erschöpfte Ritter halten die Burg.",defender:"Grandmaster Bertrand de Blanquefort"},

{id:"masada",name:"Masada",sub:"Jüdische Bergfestung",era:"73 n.Chr.",year:73,loc:"Judäa",type:"real",epoch:"Antike",region:"nahost",icon:"🪨",
 theme:{bg:"#150c05",accent:"#c97a40",glow:"rgba(180,100,50,0.15)"},
 ratings:{walls:75,supply:55,position:99,garrison:30,morale:40},
 desc:"Tafelberg 400m über dem Toten Meer. Rom baute eine kilometerlange Rampe.",
 history:"960 Zeloten hielten 3 Jahre. Fiel durch Rampenbau am Westsporn. 960 Tote durch Massenselbsttötung.",
 verdict:"Nur durch Westsporn einnehmbar. Das größte Zeugnis: Eine Armee gegen 960 Hungernde.",
 zones:[{id:"cl",l:"Steilklippen (3 Seiten)",x:50,y:50,r:44,c:"#8b7355",a:10,d:"400m Abfall auf drei Seiten."},{id:"wl",l:"Kasamattenmauer",x:50,y:50,r:32,c:"#c9a84c",a:2,d:"Doppelte Mauer."},{id:"cs",l:"12 Zisternen",x:66,y:38,r:9,c:"#4488cc",a:1,d:"40.000 m³ Wasser."},{id:"ws",l:"Westsporn ⚠",x:14,y:50,r:10,c:"#cc4444",a:1,d:"EINZIGE SCHWACHSTELLE: 30m ans Plateau."}],
 strengths:["400m Steilklippen auf 3 Seiten","40.000m³ Zisternen","Scheinbar uneinnehmbar"],
 weaknesses:["Westlicher Geländesporn","Keine Entsatzmöglichkeit","Zu wenig Verteidiger"],
 attackTips:["Circumvallation (Belagerungsring)","Rampe am Westsporn bauen","Geduld: Jahre warten"],
 siegeCtx:"73 n.Chr. — Flavius Silva, X. Legion, 15.000 Soldaten. 960 Zeloten. Nur eine Rampe hilft.",defender:"Eleazar ben Yair"},

{id:"carcassonne",name:"Carcassonne",sub:"Doppelmauerstadt",era:"12.–13. Jh.",year:1200,loc:"Frankreich",type:"real",epoch:"Mittelalter",region:"europa",icon:"🏯",
 theme:{bg:"#140f08",accent:"#d4a855",glow:"rgba(200,150,70,0.15)"},
 ratings:{walls:91,supply:55,position:80,garrison:72,morale:75},
 desc:"52 Türme, doppelter Mauerring — eine ganze Stadt als Festung.",
 history:"1209 durch Wassermangel kapituliert, Trencavel beim Verhandeln verhaftet. Nie durch Sturm.",
 verdict:"Militärisch uneinnehmbar — fiel durch Wasser, Diplomatie und politischen Verrat.",
 zones:[{id:"om",l:"Äußere Vormauer",x:50,y:50,r:43,c:"#7a5a20",a:2,d:"Zwinger-Falle."},{id:"im",l:"Innere Hauptmauer",x:50,y:50,r:26,c:"#c9a84c",a:4,d:"52 Türme, kein toter Winkel."},{id:"ch",l:"Comtal-Schloss",x:40,y:40,r:12,c:"#e8c860",a:3,d:"Burg in der Burg."},{id:"wt",l:"Wasserversorgung ⚠",x:75,y:70,r:9,c:"#cc4444",a:1,d:"KRITISCH: Keine gesicherte Quelle."}],
 strengths:["Doppelmauerring als Zwingerfalle","52 Türme","Barbakane","Stadtgröße"],
 weaknesses:["Keine gesicherte Wasserquelle","Südostecke tiefer","Politische Anfälligkeit"],
 attackTips:["Wasserquellen sperren","Diplomatischen Druck aufbauen","Südostseite für Maschinen"],
 siegeCtx:"1209 — 20.000 Kreuzfahrer, 40 Tage Gelübde. Militärisch fast uneinnehmbar — aber durstig.",defender:"Raimund-Roger Trencavel"},

{id:"chateau_gaillard",name:"Château Gaillard",sub:"Philipps Nemesis",era:"1196–1204",year:1200,loc:"Normandie, FR",type:"real",epoch:"Mittelalter",region:"europa",icon:"🪖",
 theme:{bg:"#120e0a",accent:"#b8934a",glow:"rgba(180,130,60,0.15)"},
 ratings:{walls:88,supply:65,position:94,garrison:55,morale:72},
 desc:"Richard Löwenherz baute sie in einem Jahr. Philipp II. nahm sie durch eine Latrinenöffnung.",
 history:"1204 — ein Soldat kroch durch die Latrinenöffnung in die Kapelle, öffnete das Tor.",
 verdict:"Eine der stärksten Burgen ihrer Zeit — gefallen durch eine Toilette.",
 zones:[{id:"op",l:"Äußeres Vorwerk",x:50,y:50,r:43,c:"#7a6030",a:2,d:"Erstes Vorwerk auf Felssporn."},{id:"me",l:"Mittlere Enceinte",x:50,y:50,r:30,c:"#9a7840",a:3,d:"Wellenförmige Mauer."},{id:"ir",l:"Innerer Ring",x:50,y:50,r:19,c:"#c9a84c",a:5,d:"Innerster Ring mit Donjon."},{id:"lt",l:"Latrine ⚠",x:75,y:35,r:7,c:"#cc4444",a:0,d:"FATAL: Latrinenöffnung in Kapellenwand."},{id:"dj",l:"Donjon",x:50,y:50,r:10,c:"#e8c860",a:6,d:"Letzte Bastion."}],
 strengths:["Dreigliedrige Verteidigung","Wellenförmige Mauer (Corrugated)","Felssporposition"],
 weaknesses:["Latrinenöffnung in der Kapelle","Versorgungsrisiko","Kleine Garnison"],
 attackTips:["Spion sucht Schwachstellen","Latrinenöffnung als Eingang!","Versorgungsblockade"],
 siegeCtx:"1204 — Philipp II. gegen Gaillard. 3 Monate. Dein Spion berichtet von einer Öffnung...",defender:"Roger de Lacy"},

{id:"harlech",name:"Harlech Castle",sub:"Edwardianische Seefestung",era:"1283–1468",year:1400,loc:"Wales, UK",type:"real",epoch:"Hochmittelalter",region:"europa",icon:"🏴󠁧󠁢󠁷󠁬󠁳󠁿",
 theme:{bg:"#0d1015",accent:"#8899cc",glow:"rgba(100,120,180,0.15)"},
 ratings:{walls:89,supply:90,position:95,garrison:65,morale:80},
 desc:"60m Fels auf drei Seiten. Seeversorgungsgang. 7 Jahre mit 50 Mann gehalten.",
 history:"50 Mann hielten 7 Jahre im Rosenkrieg 1461–68. 'Men of Harlech' — Legende.",
 verdict:"Mit Seeweg nahezu uneinnehmbar. Die Leistung von 50 Mann ist bis heute rekordverdächtig.",
 zones:[{id:"cl2",l:"Felsabfall (3 Seiten)",x:50,y:50,r:44,c:"#6a5535",a:10,d:"60m Fels."},{id:"in3",l:"Hauptkurtine",x:50,y:50,r:26,c:"#c9a84c",a:4,d:"Vier riesige Ecktürme."},{id:"sg",l:"Seetor ⚡",x:14,y:50,r:10,c:"#44aacc",a:1,d:"GEHEIMWAFFE: Versorgungsgang zum Meer."},{id:"es",l:"Ostseite ⚠",x:86,y:50,r:10,c:"#cc6644",a:1,d:"Einzige angreifbare Seite."}],
 strengths:["Seeversorgungsgang","Drei Seiten unzugänglich","Torhaus eigenständig"],
 weaknesses:["Ostseite ohne Naturschutz","Abhängigkeit von Seemacht"],
 attackTips:["Seekontrolle zuerst!","Ostseite mit Belagerungsmaschinen","Jahre der Zermürbung"],
 siegeCtx:"Rosenkrieg 1461 — 50 Lancastrianer. Seeweg offen. Du hast Armee, aber keine Marine.",defender:"Dafydd ap Ieuan ap Einion"},

{id:"akkon",name:"Akkon",sub:"Letztes Kreuzfahrerkastell",era:"1104–1291",year:1250,loc:"Levante, Israel",type:"real",epoch:"Mittelalter",region:"nahost",icon:"⚓",
 theme:{bg:"#0a1018",accent:"#4488cc",glow:"rgba(60,120,180,0.18)"},
 ratings:{walls:85,supply:82,position:78,garrison:65,morale:55},
 desc:"Die Hafenstadt — letzter Kreuzfahrerstützpunkt. Dreifache Mauern, Seeversorgung.",
 history:"1291 — 92 Maschinen, 92.000 Mann. 18.000 Verteidiger. Ende der Kreuzfahrerstaaten.",
 verdict:"Fiel durch schiere Übermacht, nachdem der Seeweg gekappt wurde.",
 zones:[{id:"sm",l:"Seemauern",x:50,y:8,r:12,c:"#4488cc",a:6,d:"Solange Schiffe kommen, lebt die Stadt."},{id:"om2",l:"Äußere Stadtmauer",x:50,y:50,r:44,c:"#7a6a40",a:3,d:"Erste Linie."},{id:"im2",l:"Innere Mauer",x:50,y:50,r:30,c:"#c9a84c",a:4,d:"Hauptlinie."},{id:"jo",l:"Johanniter-Citadel",x:50,y:50,r:16,c:"#e8c860",a:5,d:"Letzte Bastion."},{id:"ht",l:"Hafen ⚠",x:65,y:12,r:9,c:"#cc4444",a:1,d:"Verlust des Hafens = Todesurteil."}],
 strengths:["Seemauern","Dreifache Verteidigung","Johanniter-Citadel"],
 weaknesses:["Hafen als kritischer Punkt","Einheitsprobleme unter Verteidigern"],
 attackTips:["Seeblockade zuerst","Landseite mit Artillerie","Koordinierter Gesamtangriff"],
 siegeCtx:"1291 — 92.000 Mann, 92 Belagerungsmaschinen. Der Seeweg ist noch offen...",defender:"Guillaume de Beaujeu"},

{id:"himeji",name:"Himeji-jō",sub:"Weißer Reiher Japans",era:"1346–1618",year:1580,loc:"Hyōgo, Japan",type:"real",epoch:"Feudaljapan",region:"ostasien",icon:"🗾",
 theme:{bg:"#0e1008",accent:"#99bb66",glow:"rgba(120,160,60,0.15)"},
 ratings:{walls:88,supply:75,position:82,garrison:78,morale:85},
 desc:"83 Tore, Irrgartenwege, sieben Stockwerke. Nie eingenommen. Der Feind verirrt sich buchstäblich.",
 history:"Nie eingenommen. UNESCO-Welterbe. Überstand den 2. Weltkrieg durch unverdientes Glück.",
 verdict:"Perfekt gegen Samurai. Gegen Artillerie: obsolet in Wochen.",
 zones:[{id:"mz",l:"Irrgartenwege",x:50,y:50,r:44,c:"#556644",a:2,d:"83 Tore = 83 Einzelgefechte."},{id:"ib",l:"Inneres Gelände",x:50,y:50,r:24,c:"#aabb77",a:2,d:"Irrgarten im Inneren."},{id:"ts",l:"Tenshu",x:50,y:50,r:13,c:"#e8d870",a:2,d:"7 Stockwerke."},{id:"fr",l:"Feuergefahr ⚠",x:72,y:28,r:9,c:"#cc4444",a:1,d:"HOLZBAU — Brandpfeil genügt."}],
 strengths:["83 Tore = 83 Gefechte","Irrgartensystem","Psychologische Verwirrung"],
 weaknesses:["Holz = Brandgefahr","Gegen Artillerie obsolet"],
 attackTips:["Brandanschlag bei starkem Wind","Irrgarten kartieren lassen","Feuer als Massenwaffe"],
 siegeCtx:"16. Jh. — Verstärkung könnte kommen. Du hast Feuerpfeile, Karten — und Geduld.",defender:"Katsumoto Akamatsu"},

{id:"alamut",name:"Burg Alamut",sub:"Assassinenfestung",era:"1090–1256",year:1180,loc:"Alborz, Persien",type:"real",epoch:"Mittelalter",region:"nahost",icon:"🗡️",
 theme:{bg:"#0e0c08",accent:"#8866aa",glow:"rgba(120,80,150,0.15)"},
 ratings:{walls:82,supply:78,position:96,garrison:70,morale:92},
 desc:"2.100m Höhe, ein einziger Pfad. 150 Jahre uneingenommen. Die Assassinen lehrten die Welt Angst.",
 history:"1256 politisch gefallen. Hülegü Khans Drohung: 'Alles oder nichts.'",
 verdict:"Militärisch unangreifbar. Nur politischer Kollaps konnte sie bezwingen.",
 zones:[{id:"mt",l:"Alborz-Gebirge",x:50,y:50,r:44,c:"#5a4a35",a:10,d:"2100m."},{id:"bp",l:"Bergpfad ⚠",x:50,y:10,r:8,c:"#8b6914",a:1,d:"Gesamter Angriff funnelt hier durch."},{id:"kb",l:"Kernburg",x:50,y:50,r:20,c:"#c9a84c",a:3,d:"Auf Felsrücken."}],
 strengths:["2100m Höhe","Einziger Bergpfad","Nahrungsautarkie","Assassinen-Terror"],
 weaknesses:["Politische Isolation","Mongolischer Gesamtdruck"],
 attackTips:["Winterblockade","Alle Assassinenburgen gleichzeitig","Politischen Druck maximieren"],
 siegeCtx:"Hülegü Khan 1256 — militärisch unmöglich. Aber alle anderen Assassinenburgen sind gefallen.",defender:"Rukn ad-Din Khurshah"},

{id:"constantinople",name:"Konstantinopel",sub:"Theodosianische Mauern",era:"413–1453",year:1000,loc:"Bosporus, Türkei",type:"real",epoch:"Spätantike",region:"europa",icon:"🌙",
 theme:{bg:"#080c12",accent:"#6688bb",glow:"rgba(80,110,160,0.18)"},
 ratings:{walls:99,supply:88,position:95,garrison:45,morale:50},
 desc:"Dreifache Landmauer, 60km Seemauer. 29 Belagerungen überlebt. Fiel durch eine vergessene Tür.",
 history:"1453 — Kerkaporta-Tor offen gelassen. 80.000 vs. 7.000. Eine Kanone veränderte die Welt.",
 verdict:"Stärkste Mauern der Geschichte. Gefallen durch Technologie — und menschliches Versagen.",
 zones:[{id:"gr",l:"Vorgraben 18m",x:50,y:50,r:46,c:"#336688",a:3,d:"18m breit, 6m tief."},{id:"w1",l:"Äußere Mauer",x:50,y:50,r:38,c:"#7a6040",a:3,d:"Erste Kampflinie."},{id:"w2",l:"Innere Mauer (12m)",x:50,y:50,r:26,c:"#c9a84c",a:6,d:"Fast unzerstörbar."},{id:"ct",l:"Stadt",x:50,y:50,r:16,c:"#e8d870",a:1,d:"500.000 Einwohner."},{id:"kk",l:"Kerkaporta ⚠",x:20,y:28,r:8,c:"#cc4444",a:0,d:"DAS vergessene Tor. Offen."}],
 strengths:["Dreifaches Mauersystem","Wassergraben","Griechisches Feuer","Bosporus schützt"],
 weaknesses:["Kerkaporta offen gelassen","7.000 vs. 80.000","Urbans Riesenkanone"],
 attackTips:["Kerkaporta durch Spionage lokalisieren","Riesenkanone auf Mauern","Graben füllen"],
 siegeCtx:"Mehmed II. 1453 — 80.000 vs. 7.000. Urbans Kanone schussbereit. Spion kennt das Kerkaporta.",defender:"Konstantinos XI. Palaiologos"},

{id:"coucy",name:"Château de Coucy",sub:"Größter Donjon Europas",era:"1225–1917",year:1300,loc:"Aisne, Frankreich",type:"real",epoch:"Hochmittelalter",region:"europa",icon:"🗼",
 theme:{bg:"#10100c",accent:"#aa9955",glow:"rgba(160,140,70,0.15)"},
 ratings:{walls:93,supply:80,position:78,garrison:68,morale:76},
 desc:"54m Donjon, 7m dicke Mauern. Nie militärisch eingenommen. 1917 gesprengt.",
 history:"Überstand alle Belagerungen. Kaiser Wilhelm II. ließ ihn 1917 aus purer Bösartigkeit sprengen.",
 verdict:"Militärisch unbesiegbar — zerstört durch Vandalismus des 20. Jahrhunderts.",
 zones:[{id:"wg",l:"Wassergraben",x:50,y:50,r:46,c:"#446688",a:3,d:"Erste Linie."},{id:"ar",l:"Äußere Ringmauer",x:50,y:50,r:36,c:"#7a6040",a:3,d:"Halbturm-Bastionen."},{id:"ir2",l:"Innere Ringmauer",x:50,y:50,r:26,c:"#aa8840",a:4,d:"Vier Rundtürme."},{id:"dn",l:"Großer Donjon",x:50,y:50,r:14,c:"#e8c860",a:8,d:"54m hoch, 7m Mauern."}],
 strengths:["54m Donjon mit 7m Mauern","Doppelter Mauerring","Graben","Hügelposition"],
 weaknesses:["Keine extreme Naturposition","Aufwändige Garnison nötig"],
 attackTips:["Graben überbrücken","Außenmauer brechen","Donjon: Langzeitblockade"],
 siegeCtx:"13. Jh. — Der Donjon ist legendär. Kein Angreifer hat je den Kern genommen. Du bist der erste.",defender:"Enguerrand de Coucy III."},

{id:"babylon",name:"Babylon",sub:"Stadtmauern Nebukadnezars",era:"605–539 v.Chr.",year:-600,loc:"Mesopotamien",type:"real",epoch:"Antike",region:"nahost",icon:"🏛️",
 theme:{bg:"#100e06",accent:"#cc9933",glow:"rgba(180,140,40,0.18)"},
 ratings:{walls:90,supply:95,position:60,garrison:75,morale:80},
 desc:"Doppelte 7m-Mauern, Euphrat als Graben, Hängende Gärten. Fiel durch Flussumleitung.",
 history:"Kyros der Große 539 v.Chr.: Euphrat umgeleitet — Soldaten durch das trockene Flussbett.",
 verdict:"Der Fluss war Stärke und Schwäche zugleich. Ein Ingenieursgeniestreich bezwang die Weltmacht.",
 zones:[{id:"ow",l:"Äußere Mauer 7m",x:50,y:50,r:44,c:"#8b7030",a:4,d:"Sieben Meter Backstein."},{id:"iw",l:"Innere Mauer 7m",x:50,y:50,r:32,c:"#c9a84c",a:5,d:"Fahrweg für Streitwagen."},{id:"eu",l:"Euphrat-Graben",x:50,y:8,r:10,c:"#4488cc",a:6,d:"Solange er fließt: sicher."},{id:"hg",l:"Hängende Gärten",x:50,y:50,r:18,c:"#88aa44",a:2,d:"Psychologische Dominanz."},{id:"fb",l:"Flussbett ⚠",x:20,y:8,r:9,c:"#cc4444",a:0,d:"SCHWACHSTELLE: Umleitung = Untergang."}],
 strengths:["Doppelte 7m-Mauern","Euphrat als Graben","Riesige Vorräte","Mächtigste Stadt"],
 weaknesses:["Fluss kann umgeleitet werden","Flache Ebene","Riesengroße Garnison nötig"],
 attackTips:["Euphrat oberhalb umleiten","Nachtangriff während Belsazars Fest","Durch trockenes Bett"],
 siegeCtx:"Du bist Kyros der Große (539 v.Chr.). Babylon ist die Welt. Du hast Ingenieure.",defender:"Belsazar"},

{id:"alhambra",name:"Alhambra",sub:"Maurische Palastburg",era:"889–1492",year:1300,loc:"Granada, Spanien",type:"real",epoch:"Mittelalter",region:"europa",icon:"🕌",
 theme:{bg:"#0c0e08",accent:"#bb8833",glow:"rgba(170,120,40,0.15)"},
 ratings:{walls:84,supply:88,position:92,garrison:72,morale:90},
 desc:"Palast und Festung zugleich. Wasserversorgung durch komplexes Aquäduktsystem. Auf rotem Felshügel.",
 history:"1492 übergaben — nicht in Kampf. Boabdil weinte beim Verlassen. 'Seufzer des Mohren.'",
 verdict:"Architektonisch brillant. Fiel nicht durch Gewalt, sondern durch politische Erschöpfung.",
 zones:[{id:"al",l:"Alcazaba (Militärburg)",x:28,y:50,r:18,c:"#aa7733",a:5,d:"Eigentliche Festung."},{id:"py",l:"Palastgebäude",x:60,y:50,r:20,c:"#ccaa55",a:2,d:"Palacios Nazaries."},{id:"aq",l:"Acequia Real (Wasserkanal)",x:50,y:18,r:8,c:"#4488cc",a:1,d:"Genialer Wasserkanal von der Sierra."},{id:"cl3",l:"Kliff & Gebirge",x:50,y:50,r:46,c:"#7a5a30",a:8,d:"Gebirgslage schützt 3 Seiten."}],
 strengths:["Gebirgslage","Wasserautarkie durch Acequia","Alcazaba als militärischer Kern","Hohe Moral"],
 weaknesses:["Politische Erschöpfung","Innere Zerwürfnisse","Langer Krieg der Reconquista"],
 attackTips:["Wasserkanal unterbrechen","Politische Spaltung ausnutzen","Geduld: Jahrzehnte"],
 siegeCtx:"1491 — Ferdinand und Isabella nach 10 Jahren Reconquista. Die Stadt ist militärisch stark — aber politisch gebrochen.",defender:"Sultan Muhammad XII. (Boabdil)"},

{id:"mehrangarh",name:"Mehrangarh",sub:"Sonnengeburts-Festung",era:"1459–heute",year:1500,loc:"Jodhpur, Indien",type:"real",epoch:"Neuzeit",region:"suedostasien",icon:"🌅",
 theme:{bg:"#140e06",accent:"#dd8833",glow:"rgba(200,120,40,0.18)"},
 ratings:{walls:92,supply:85,position:97,garrison:75,morale:88},
 desc:"Auf 122m Fels, Mauern bis 36m hoch. Akustische Alarmanlage aus Erz. Nie eingenommen.",
 history:"Rao Jodha ließ sie 1459 erbauen. Zahlreiche Belagerungsversuche — alle scheiterten.",
 verdict:"Eines der imponierendsten Militärbauwerke des Mittelalters. Nie gefallen.",
 zones:[{id:"rk",l:"Felssockel 122m",x:50,y:50,r:46,c:"#8b6020",a:10,d:"Senkrechter Fels."},{id:"hw",l:"Hauptmauer 36m",x:50,y:50,r:30,c:"#cc8833",a:7,d:"Bis 36m hohe Mauern."},{id:"pg",l:"Sieben Tore",x:50,y:12,r:10,c:"#aa6622",a:4,d:"Jedes Tor ein eigenständiges Hindernis."},{id:"pa",l:"Palastkomplex",x:50,y:50,r:16,c:"#e8aa44",a:3,d:"Kern der Festung."}],
 strengths:["122m Felssockel","36m Mauern","Sieben Tore","Akustische Alarmanlage"],
 weaknesses:["Wasserversorgung bei langer Blockade"],
 attackTips:["Wasserversorgung blockieren","Durch Sieben-Tore-System kämpfen","Keine Alternativen"],
 siegeCtx:"Du belagerst Mehrangarh im 16. Jh. Der Berg ist das Problem. Weder Leiter noch Rampe hilft.",defender:"Rao Jodha"},

{id:"caernarvon",name:"Caernarvon Castle",sub:"Edwardianische Ringburg",era:"1283–heute",year:1300,loc:"Wales, UK",type:"real",epoch:"Hochmittelalter",region:"europa",icon:"👑",
 theme:{bg:"#0e1014",accent:"#9988bb",glow:"rgba(130,110,160,0.15)"},
 ratings:{walls:90,supply:82,position:80,garrison:70,morale:78},
 desc:"Erste Ringburg ohne Donjon. Polygonale Türme, doppelter Mauerring. Walisischer Freiheitskampf.",
 history:"Mehrfach belagert im walisischen Aufstand (Owain Glyndŵr 1401). Hielt jedes Mal.",
 verdict:"Ein Meisterwerk edwardianischer Militärarchitektur. Wurde nie eingenommen.",
 zones:[{id:"em",l:"Eagle Tower (Hauptturm)",x:25,y:50,r:15,c:"#9988bb",a:6,d:"Größter polygonaler Turm — 7 separate Türme in einem."},{id:"nm",l:"Nördlicher Mauerring",x:50,y:20,r:20,c:"#7a6a80",a:4,d:"Unangreifbar durch Meeresnähe."},{id:"kn",l:"Königstor",x:70,y:50,r:12,c:"#cc9933",a:3,d:"Aufwändigstes Tor Britanniens."},{id:"ha",l:"Hafentor",x:50,y:80,r:10,c:"#4488cc",a:2,d:"Meeresseite — Seeversorgung gesichert."}],
 strengths:["Polygonale Türme ohne toten Winkel","Doppelter Ring","Seeversorgung","Psychologische Herrschaftsarchitektur"],
 weaknesses:["Riesige Garnison nötig","Abhängigkeit von Seeweg"],
 attackTips:["Landseitig mit Maschinen","Seeweg blockieren","Langer Aushungerungsversuch"],
 siegeCtx:"Owain Glyndŵr 1401 — walisischer Aufstand. Die Burg ist Symbol der englischen Unterdrückung.",defender:"Gouverneur John Bolde"},

{id:"rhodes",name:"Rhodos (Johanniterburg)",sub:"Inselfestung der Johanniter",era:"1309–1522",year:1400,loc:"Rhodos, Griechenland",type:"real",epoch:"Mittelalter",region:"nahost",icon:"✝️",
 theme:{bg:"#0a0e14",accent:"#cc8844",glow:"rgba(180,110,50,0.18)"},
 ratings:{walls:94,supply:80,position:88,garrison:70,morale:85},
 desc:"Johanniterburg mit Vorgraben, Bastionen und Seemauer. 213 Jahre gehalten. Zweimal gegen osmanische Übermacht.",
 history:"1480 — Süleiman I. mit 40.000. Johanniter mit 6.000. Held: d'Aubusson. 1522 nach 6 Monaten Verhandlung aufgegeben.",
 verdict:"Eines der längsten Durchhaltesymbol Europas. Fiel nur durch Abnutzung und Kompromiss.",
 zones:[{id:"sm2",l:"Seemauer",x:50,y:8,r:10,c:"#4488cc",a:5,d:"Schützt den Hafen."},{id:"bm",l:"Bastionsmauern",x:50,y:50,r:44,c:"#8b7040",a:5,d:"Baluard-Bastionen gegen Kanonen."},{id:"gv",l:"Großer Graben",x:50,y:50,r:36,c:"#336655",a:3,d:"17m tiefer Graben — ausgegraben aus Fels."},{id:"cz",l:"Stadtburg (Collachium)",x:50,y:50,r:20,c:"#c9a84c",a:4,d:"Johanniterquartier."},{id:"ko",l:"Kanonen-Position ⚠",x:50,y:88,r:10,c:"#cc4444",a:1,d:"Landseite: Osmanische Artillerie-Aufstellung."}],
 strengths:["Bastionssystem gegen Kanonen","Johanniter-Kampfgeist","Seemacht","Wasservorräte"],
 weaknesses:["Landseite durch Artillerie angreifbar","Kleine Insel = keine Tiefe"],
 attackTips:["Massive Artillerie auf Landseite","Hafen blockieren","Geduld: Wochen"],
 siegeCtx:"1480 — Süleiman I., 40.000 vs. 6.000 Johanniter. Einer der epischsten Verteidigungskämpfe.",defender:"Grand Master Pierre d'Aubusson"},

{id:"angkor",name:"Angkor (Yasodharapura)",sub:"Khmer-Hauptstadt",era:"802–1431",year:1200,loc:"Kambodscha",type:"real",epoch:"Mittelalter",region:"ostasien",icon:"🛕",
 theme:{bg:"#0a1208",accent:"#88aa44",glow:"rgba(100,140,50,0.15)"},
 ratings:{walls:80,supply:99,position:72,garrison:75,morale:88},
 desc:"3m tiefe Wassergräben, 10km Umfang, eingebettet in Dschungel. Die wasserreichste Stadt der Welt.",
 history:"1431 durch Ayutthaya eingenommen nach Jahrzehnten des Niedergangs.",
 verdict:"Militärisch schwerer zu nehmen als es scheint. Fiel durch wirtschaftliche und klimatische Faktoren.",
 zones:[{id:"mg",l:"Mekong-Graben (10km)",x:50,y:50,r:46,c:"#4488cc",a:6,d:"10km Wassergraben, 3m tief."},{id:"dj",l:"Dschungel",x:50,y:50,r:36,c:"#336622",a:5,d:"Orientierungslos ohne Karte."},{id:"tp",l:"Tempel-Komplex",x:50,y:50,r:24,c:"#aa9944",a:3,d:"Labyrinthartige Tempel."},{id:"ak",l:"Angkor Thom (Kern)",x:50,y:50,r:14,c:"#ccaa55",a:4,d:"Eigentliche Festungsstadt."}],
 strengths:["Riesiger Wassergraben","Dschungel als Labyrinth","Wasserautarkie (Reservoirs!)"],
 weaknesses:["Riesige Fläche = riesige Garnison","Nicht für Kanonen ausgelegt"],
 attackTips:["Wassersystem sabotieren","Dschungel-Führer organisieren","Wirtschaftsblockade Jahrzehnte"],
 siegeCtx:"1430 — Ayutthaya-Armee. Angkor ist geschwächt durch Klima und interne Konflikte.",defender:"König Ponhea Yat"},

{id:"bodiam",name:"Bodiam Castle",sub:"Ritterromantik mit System",era:"1385–heute",year:1400,loc:"Sussex, England",type:"real",epoch:"Hochmittelalter",region:"europa",icon:"🌊",
 theme:{bg:"#0e1018",accent:"#7799aa",glow:"rgba(100,130,150,0.15)"},
 ratings:{walls:82,supply:75,position:78,garrison:62,morale:74},
 desc:"Vollständig von Wasser umgeben. Komplexes Barbakanen-System. Sieht romantisch aus, funktioniert brutal.",
 history:"Wurde 1484 nach kurzer Belagerung ergeben. Nie wirklich getestet.",
 verdict:"Mehr psychologische Abschreckung als unüberwindbare Festung. Aber wasserseitig sehr stark.",
 zones:[{id:"wm",l:"Wassergraben (Vollumfang)",x:50,y:50,r:46,c:"#4488bb",a:7,d:"Vollständig umgeben."},{id:"bb",l:"Barbakane (Komplex)",x:50,y:86,r:12,c:"#7a6a40",a:4,d:"Dreifaches Torhindernis."},{id:"bk",l:"Kernburg",x:50,y:50,r:24,c:"#c9a84c",a:4,d:"Vier Ecktürme."},{id:"cw",l:"Korridormauern",x:50,y:50,r:14,c:"#aa8844",a:3,d:"Schusskorridore."}],
 strengths:["Vollständiger Wassergraben","Komplexe Barbakane","Psychologische Abschreckung"],
 weaknesses:["Nicht für Artillerie gebaut","Kleine Garnison","Einziger Zugang leicht berechenbar"],
 attackTips:["Wassergraben zuschütten/überbrücken","Artillerie aufstellen","Verrat begünstigt"],
 siegeCtx:"1484 — du hast eine Armee. Die Burg ist schön — aber der Graben ist tief und das Tor ist dreifach.",defender:"Richard Lewknor"},

{id:"windsor",name:"Windsor Castle",sub:"Königliche Ringburg",era:"1070–heute",year:1300,loc:"Berkshire, England",type:"real",epoch:"Hochmittelalter",region:"europa",icon:"👑",
 theme:{bg:"#100e0c",accent:"#cc9944",glow:"rgba(180,140,55,0.15)"},
 ratings:{walls:88,supply:90,position:82,garrison:78,morale:90},
 desc:"Größte bewohnte Burg der Welt. Motte-and-Bailey, dann Steinburg. Königssitz seit 1000 Jahren.",
 history:"1216 belagert von Barons im Ersten Baronskrieg. 2 Monate — dann aufgegeben.",
 verdict:"Symbol und Festung in einem. Fast unmöglich durch Hunger — königliche Versorgung.",
 zones:[{id:"rn",l:"Round Tower (Motte)",x:50,y:50,r:14,c:"#cc9944",a:6,d:"Ursprüngliche Motte-Burg."},{id:"ua",l:"Upper Ward",x:68,y:50,r:18,c:"#aa7733",a:4,d:"Königsgemächer."},{id:"la",l:"Lower Ward",x:32,y:50,r:18,c:"#997733",a:3,d:"St. George's Chapel etc."},{id:"mt",l:"Äußere Mauer",x:50,y:50,r:44,c:"#887744",a:4,d:"Gesamter Burgring."}],
 strengths:["Königliche Versorgung unbegrenzt","Hohe Moral (Königssitz)","Doppelter Ring","Lange Geschichte"],
 weaknesses:["Flache Lage","Kein natürlicher Schutz außer Thames"],
 attackTips:["Königsversorgung blockieren","Thames kontrollieren","Belagerung von Monaten nötig"],
 siegeCtx:"1216 — Barons gegen König John. Versorgung noch offen. Die Thames schützt eine Seite.",defender:"König John Lackland"},

{id:"great_wall",name:"Große Mauer (Jiayuguan)",sub:"Westliches Ende der Großen Mauer",era:"1372–1644",year:1450,loc:"Gansu, China",type:"real",epoch:"Neuzeit",region:"ostasien",icon:"🏗️",
 theme:{bg:"#0e0c08",accent:"#cc7733",glow:"rgba(180,100,40,0.18)"},
 ratings:{walls:95,supply:70,position:85,garrison:65,morale:78},
 desc:"20.000km Mauer. Jiayuguan ist der westlichste befestigte Punkt. Tor zwischen Zivilisation und Wildnis.",
 history:"Überwunden durch Umgehung (Mongolensturm), nicht durch direkten Angriff.",
 verdict:"Nie durch direkten Sturm überwunden — immer durch Umgehung oder Verrat.",
 zones:[{id:"mm",l:"Mauer (9m hoch, 5m breit)",x:50,y:50,r:44,c:"#aa7733",a:5,d:"Bis zu 5m breit auf der Mauerkrone."},{id:"wt2",l:"Wachttürme (alle 200m)",x:50,y:15,r:9,c:"#cc8844",a:3,d:"Alle 200m ein Turm."},{id:"jg",l:"Jiayuguan-Fort",x:50,y:50,r:18,c:"#e8aa44",a:6,d:"Hauptfort am Pass."},{id:"ds",l:"Wüste/Gebirge",x:85,y:85,r:12,c:"#555533",a:8,d:"Gobi-Wüste auf beiden Seiten."}],
 strengths:["20.000km Länge — kein Ende","Signalfeuer-System","Gebirge flankiert","Fort Jiayuguan als Anker"],
 weaknesses:["Umgehung durch Wüste möglich","Verrat öffnet Tore","Braucht riesige Garnison"],
 attackTips:["Umgehung durch Wüste","Torwächter bestechen","Signalfeuer-Kette unterbrechen"],
 siegeCtx:"Du befehligst mongolische Reiter. Die Mauer endet nirgends — aber der Wüstenpfad nördlich...",defender:"Ming-Kommandant Li Wen"},

{id:"persepolis",name:"Persepolis",sub:"Achämenidische Residenz",era:"518–330 v.Chr.",year:-500,loc:"Fars, Persien",type:"real",epoch:"Antike",region:"nahost",icon:"🏺",
 theme:{bg:"#120e06",accent:"#dd9933",glow:"rgba(200,140,40,0.18)"},
 ratings:{walls:78,supply:92,position:75,garrison:80,morale:88},
 desc:"Residenz der Achämeniden auf Felsterrasse. Hauptstadt des Perserreichs. Mehr Prachtanlage als Militärburg.",
 history:"Alexander der Große 330 v.Chr. — ohne Belagerung durch Verrat geöffnet. Dann niedergebrannt.",
 verdict:"Keine eigentliche Militärburg — prächtige Residenz. Fiel durch politischen Verrat.",
 zones:[{id:"tf",l:"Felsterrasse (12m hoch)",x:50,y:50,r:44,c:"#997733",a:5,d:"Künstliche Felsterrasse."},{id:"ap",l:"Apadana (Thronsaal)",x:50,y:50,r:22,c:"#ddaa44",a:2,d:"Größter Thronsaal der Antike."},{id:"gp",l:"Gate of All Nations",x:50,y:12,r:10,c:"#bb8833",a:3,d:"Einziges Tor."},{id:"tr",l:"Tresor",x:72,y:65,r:10,c:"#ffcc44",a:2,d:"Legendärer Schatz."}],
 strengths:["Felsterrasse","Massiver Tresor","Symbolische Bedeutung","Großgarnison"],
 weaknesses:["Mehr Palast als Burg","Kein Wassergraben","Verrat als Achillesferse"],
 attackTips:["Verrat der Torwächter","Psychologischer Druck (Überlegenheit)","Feuer nach dem Fall"],
 siegeCtx:"Du bist Alexander der Große (330 v.Chr.). Persepolis ist Symbol des Perserreiches. Ein Verräter wartet.",defender:"Satrap Ariobarzanes"},

{id:"mont_michel",name:"Mont Saint-Michel",sub:"Gezeitenfestung",era:"966–1434",year:1300,loc:"Normandie, FR",type:"real",epoch:"Mittelalter",region:"europa",icon:"🌊",
 theme:{bg:"#060c12",accent:"#4488aa",glow:"rgba(50,100,140,0.18)"},
 ratings:{walls:80,supply:72,position:98,garrison:60,morale:90},
 desc:"2x täglich Flut. Die Gezeiten sind das mächtigste Heer dieser Burg.",
 history:"Englische Belagerung 1423–1434 komplett gescheitert. Nie eingenommen.",
 verdict:"Die Natur ist die stärkste Festung. Kein Mensch besiegt die Flut.",
 zones:[{id:"ti",l:"Gezeitenzone",x:50,y:50,r:46,c:"#336688",a:10,d:"2x täglich Flut — alle Wege weg."},{id:"qs",l:"Treibsand",x:50,y:50,r:36,c:"#446677",a:8,d:"Ohne Guide tödlich."},{id:"ws2",l:"Stadtmauern",x:50,y:50,r:26,c:"#8899aa",a:4,d:"Aus Fels wachsend."},{id:"ab",l:"Abtei",x:50,y:50,r:15,c:"#aabbcc",a:3,d:"Gipfel und letzte Bastion."}],
 strengths:["Gezeiten 2x täglich","Treibsand","100 Jahre widerstanden"],
 weaknesses:["6h Ebbe-Fenster","Kleine Garnison","Versorgung bei langer Blockade"],
 attackTips:["Nur bei Ebbe (6h Fenster)","Gezeitenkarte kennen","Lokalen Guide organisieren"],
 siegeCtx:"Englische Armee 1423 — Gezeitenkarte dabei. Verräter als Guide. 6 Stunden Ebbe.",defender:"Abt Robert de Jolivet"},

// ── FANTASY: MITTELERDE ──────────────────────────────────────────────────
{id:"helmsdeep",name:"Helms Klamm",sub:"Hornburg von Rohan",era:"Drittes Zeitalter",year:3019,loc:"Thrihyrne, Rohan",type:"fantasy",epoch:"Mittelerde",region:"mittelerde",icon:"⚔️",
 theme:{bg:"#0c0c10",accent:"#8877aa",glow:"rgba(110,90,150,0.15)"},
 ratings:{walls:85,supply:70,position:90,garrison:75,morale:65},
 desc:"Schlucht als Festung. Geometrie schlägt Zahlen. Fast gefallen durch einen Abflusskanal.",
 history:"Fast gefallen. Gerettet durch Gandalf und die Rohirrim. Sarumans Sprengstoff kam durch den Drain.",
 verdict:"Fiel fast durch ein fehlendes Eisengitter — eines der tragischsten was-wäre-wenn der Fiktionsgeschichte.",
 zones:[{id:"dw",l:"Defiléwände",x:50,y:50,r:44,c:"#5a5040",a:10,d:"Die Schlucht IST die Festung."},{id:"hw",l:"Hornmauer",x:50,y:22,r:11,c:"#c9a84c",a:4,d:"Schließt die Schlucht ab."},{id:"dr",l:"Abflusskanal ⚠⚠",x:38,y:22,r:6,c:"#ff4444",a:0,d:"FATAL: Entwässerungsschlitz — Sprengstoff passt hindurch."},{id:"hb",l:"Hornburg",x:50,y:50,r:18,c:"#aa8844",a:5,d:"Auf nacktem Fels."},{id:"ag",l:"Aglarond-Höhlen",x:50,y:72,r:15,c:"#7a6a50",a:10,d:"Das Volk Rohans ist hier sicher."}],
 strengths:["Schlucht macht Überlegenheit sinnlos","Hornburg auf nacktem Fels","Aglarond als Rückzugsraum"],
 weaknesses:["Abflusskanal (FATAL)","Keine Flankenoption","Passive Defensive"],
 attackTips:["Sprengstoff in den Drain!","Massenschock zur Ablenkung","Gleichzeitiger Tor-Frontalangriff"],
 siegeCtx:"10.000 Uruk-hai. 300 Rohirrim. Eine Nacht. Du weißt vom Abflusskanal.",defender:"König Théoden von Rohan"},

{id:"minas_tirith",name:"Minas Tirith",sub:"Hauptstadt Gondors",era:"Drittes Zeitalter",year:3019,loc:"Gondor",type:"fantasy",epoch:"Mittelerde",region:"mittelerde",icon:"🏯",
 theme:{bg:"#10100a",accent:"#bbaa66",glow:"rgba(170,150,70,0.15)"},
 ratings:{walls:94,supply:80,position:85,garrison:70,morale:55},
 desc:"Sieben Mauerkreise aus Ithilstein. Jede Ebene höher. Ein Berg als Rücken.",
 history:"Fast gefallen. Rohirrim-Flanke und Aragorns Flotte retteten die Stadt in letzter Sekunde.",
 verdict:"Architektonisch perfekt — fast gefallen durch offene Pelennor-Felder und ein einzelnes Tor.",
 zones:[{id:"r1",l:"Äußere Mauern 1–4",x:50,y:50,r:43,c:"#7a6040",a:4,d:"Vier äußere Ringe."},{id:"r2",l:"Innere Mauern 5–7",x:50,y:50,r:26,c:"#c9a84c",a:6,d:"Reinster Ithilstein."},{id:"cd",l:"Citadel",x:50,y:50,r:13,c:"#e8e8cc",a:8,d:"Ultima Ratio."},{id:"pf",l:"Pelennor-Felder ⚠",x:50,y:8,r:8,c:"#553322",a:0,d:"Offene Ebene für Saurons Heer."},{id:"gt",l:"Haupttor ⚠",x:50,y:5,r:7,c:"#cc4444",a:2,d:"Ein einziges Tor — Grond wurde dafür gebaut."}],
 strengths:["7 Verteidigungsringe","Ithilstein","Höhenvorteil jeder Ebene","Anduin schützt Flanke"],
 weaknesses:["Pelennor ohne Schutz","Einzelnes Haupttor","Keine Flotte (normaler Zustand)"],
 attackTips:["Grond gegen Tor","Hexenkönig als Psychowaffe","Anduin-Flanke durch Überraschung"],
 siegeCtx:"Saurons Armeen. Grond bereit. Hexenkönig führt. 100.000 gegen 10.000 hinter sieben Mauern.",defender:"Denethor II., Truchsess Gondors"},

{id:"gondolin",name:"Gondolin",sub:"Die verborgene Stadt",era:"Erstes Zeitalter",year:-500,loc:"Tumladen, Mittelerde",type:"fantasy",epoch:"Silmarillion",region:"mittelerde",icon:"✨",
 theme:{bg:"#08101a",accent:"#88aacc",glow:"rgba(100,140,180,0.18)"},
 ratings:{walls:99,supply:95,position:99,garrison:88,morale:95},
 desc:"350 Jahre verborgen. Stärkste Elbenstreitmacht. Fiel durch einen einzigen Verräter.",
 history:"Maeglin verriet den Weg zu Morgoth. In einer Nacht zerstört. Das größte Paradox der Fantasyliteratur.",
 verdict:"Perfekte Festung — ein Geheimnis, ein Verräter, alles verloren.",
 zones:[{id:"ew",l:"Ered Wethrin",x:50,y:50,r:46,c:"#445566",a:10,d:"Ganzes Gebirge als Mauer."},{id:"gs",l:"Das Geheimnis ⚠",x:50,y:20,r:9,c:"#8888cc",a:0,d:"Bis Maeglin brach."},{id:"gw",l:"Stadtmauern",x:50,y:50,r:26,c:"#aabbcc",a:6,d:"Höher als alles was Elben je bauten."},{id:"tk",l:"Turm des Königs",x:50,y:50,r:13,c:"#ddeeff",a:5,d:"Turgons Turm."}],
 strengths:["350 Jahre unentdeckt","Ganzes Gebirge als Schutz","Stärkste Elbenstreitmacht","Unbegrenzte Versorgung"],
 weaknesses:["Geheimnis = einzige Basis","Ein Verräter genügt","Keine Luftverteidigung"],
 attackTips:["Spion (Maeglin) gewinnen","Zugangspfad erkunden","Drachen & Balrogs über die Berge"],
 siegeCtx:"Du bist Morgoths Stratege. Du hast Maeglin. Er kennt den Weg und jede Schwachstelle.",defender:"König Turgon"},

{id:"barad_dur",name:"Barad-dûr",sub:"Saurons Dunkler Turm",era:"Zweites & Drittes Zeitalter",year:3018,loc:"Mordor",type:"fantasy",epoch:"Mittelerde",region:"mittelerde",icon:"👁️",
 theme:{bg:"#0c0804",accent:"#cc4422",glow:"rgba(180,50,20,0.22)"},
 ratings:{walls:99,supply:70,position:96,garrison:98,morale:99},
 desc:"Solange der Eine Ring existiert: absolut uneinnehmbar. Fiel als Frodo den Ring warf.",
 history:"Fiel nicht durch Belagerung — fiel als der Eine Ring in den Schicksalsberg geworfen wurde.",
 verdict:"Unmöglich durch Waffengewalt. Fiel durch ein Hobbit, einen Gollum und einen blinden Moment der Gier.",
 zones:[{id:"md",l:"Mordor",x:50,y:50,r:46,c:"#3a2010",a:10,d:"Asche, Dunkel, Ork-Patrouillien."},{id:"cu",l:"Cirith Ungol ⚠",x:82,y:18,r:9,c:"#886633",a:2,d:"Heimlicher Eingang — aber Shelob wartet."},{id:"tw",l:"Turmwände",x:50,y:50,r:32,c:"#6a3a18",a:7,d:"Vulkanstein, unzerstörbar konventionell."},{id:"it",l:"Innerer Turm",x:50,y:50,r:18,c:"#8a4a22",a:9,d:"Tausende Orks."},{id:"ey",l:"Auge Saurons",x:50,y:50,r:9,c:"#cc4422",a:0,d:"Wenn er dich sieht: vorbei."}],
 strengths:["Praktisch unbegrenzte Garnison","Mordor als natürliche Festung","Auge sieht alles","Ring = Unsterblichkeit"],
 weaknesses:["Schicksalsberg in Reichweite","Ablenkung durch Elessar","Cirith Ungol als Geheimeingang","Gollum"],
 attackTips:["Ring zerstören (Schicksalsberg)","Ablenkung vor den Morannon-Toren","Gollum als unfreiwilligen Agenten"],
 siegeCtx:"Du willst Barad-dûr zerstören. Elessars Armee lenkt ab. Zwei Hobbits nähern sich dem Schicksalsberg.",defender:"Sauron, Herr der Ringe"},

{id:"erebor",name:"Erebor",sub:"Einsamer Berg",era:"Drittes Zeitalter",year:2941,loc:"Rhûn-Randgebirge",type:"fantasy",epoch:"Mittelerde",region:"mittelerde",icon:"⛏️",
 theme:{bg:"#0e0c06",accent:"#bb8822",glow:"rgba(170,120,30,0.15)"},
 ratings:{walls:96,supply:92,position:90,garrison:55,morale:80},
 desc:"Ein ganzer Berg. Einziger Zugang: ein Tunnel. Innen: Labyrinthe und ein Drache.",
 history:"Von Smaug durch Smaug-als-Dieb eingenommen. Durch Bilbos List zurückerobert.",
 verdict:"Militärisch uneinnehmbar — gefallen durch Insiderinformation und einen Drachen.",
 zones:[{id:"em",l:"Erebor-Massiv",x:50,y:50,r:46,c:"#4a3a25",a:10,d:"Ein ganzer Berg."},{id:"fg",l:"Vordertor ⚠",x:50,y:8,r:10,c:"#8b6914",a:2,d:"Einziger bekannter Zugang."},{id:"hh",l:"Große Hallen",x:50,y:50,r:28,c:"#aa8840",a:3,d:"Labyrinthe nur Zwergen bekannt."},{id:"sm",l:"Schatzberg (Smaugs Lager)",x:50,y:50,r:16,c:"#e8c820",a:2,d:"Drache schläft hier."},{id:"sd",l:"Seitentür ⚠",x:82,y:35,r:8,c:"#cc7733",a:1,d:"Geheimtür — kaum auffindbar."}],
 strengths:["Einziger Zugang: Tunnel","Labyrinthe nur Zwergen bekannt","Berg = Mauer","Riesige Vorräte"],
 weaknesses:["Drache zweischneidig","Seitentür existiert"],
 attackTips:["Seitentür (Schlüssel + Mondlicht)","Drachen durch List entfernen","Klein und heimlich"],
 siegeCtx:"Smaug schläft vielleicht. Vordertor zu riskant. Es gibt eine Seitentür — und einen Mondkalender.",defender:"Smaug der Goldene"},

{id:"isengard",name:"Isengard",sub:"Sarumans Ringburg",era:"Drittes Zeitalter",year:3019,loc:"Nan Curunír",type:"fantasy",epoch:"Mittelerde",region:"mittelerde",icon:"⚙️",
 theme:{bg:"#0a0f08",accent:"#668855",glow:"rgba(80,110,60,0.15)"},
 ratings:{walls:88,supply:92,position:72,garrison:85,morale:78},
 desc:"Industrielle Festung. Massenproduktion. Fiel durch Ents.",
 history:"Baumbart und die Ents zerstörten sie in Stunden. Saruman hatte Jahrhunderte Bäume gefällt.",
 verdict:"Militärisch stark gegen Menschen. Vor Naturgewalten außerhalb seiner Kalkulation.",
 zones:[{id:"rw",l:"Ringwall",x:50,y:50,r:44,c:"#556655",a:4,d:"Massiver Schwarzstein-Ring."},{id:"fk",l:"Fabriken",x:50,y:50,r:30,c:"#445544",a:2,d:"Uruk-hai-Produktion."},{id:"ot",l:"Orthanc (unzerstörbar)",x:50,y:50,r:14,c:"#667766",a:10,d:"Buchstäblich unzerstörbar."},{id:"fn",l:"Fangorn ⚠",x:14,y:14,r:10,c:"#4a7a33",a:0,d:"Die Ents vergessen nicht."}],
 strengths:["Orthanc unzerstörbar","Industrielle Stärke","Große Garnison"],
 weaknesses:["Fangorn als Bedrohung","Sprengstofflager explosiv"],
 attackTips:["Fangorn aktivieren!","Dam öffnen (Überschwemmung)","Fabriken als erstes"],
 siegeCtx:"Du bist Baumbart. Saruman fällte Jahrhunderte lang Bäume. Der Wald erinnert sich.",defender:"Saruman der Weiße"},

{id:"minas_morgul",name:"Minas Morgul",sub:"Turm der bösen Zauberei",era:"Drittes Zeitalter",year:2000,loc:"Ithilien, Mittelerde",type:"fantasy",epoch:"Mittelerde",region:"mittelerde",icon:"🌒",
 theme:{bg:"#060810",accent:"#7777cc",glow:"rgba(80,80,160,0.18)"},
 ratings:{walls:92,supply:65,position:90,garrison:88,morale:99},
 desc:"Leuchtet im Mondlicht. Hexenkönig residiert hier. Psych-Terror als primäre Waffe.",
 history:"Ehemals Minas Ithil, von Saurons Nazgûl eingenommen. Quelle des Nazgûl-Terrors.",
 verdict:"Die stärkste psychologische Waffe in Mittelerde — physisch kaum besser als Minas Tirith.",
 zones:[{id:"mw",l:"Mondweiße Mauern",x:50,y:50,r:44,c:"#5566aa",a:5,d:"Kaltes weißes Licht — psychologischer Terror."},{id:"na",l:"Nazgûl-Turm",x:50,y:50,r:22,c:"#7777cc",a:7,d:"Hexenkönig residiert hier."},{id:"hk",l:"Hexenkönig ⚡",x:50,y:50,r:12,c:"#9999ee",a:0,d:"Kein lebender Mann kann ihn töten. Aber..."},{id:"mt2",l:"Morgul-Tal",x:50,y:80,r:14,c:"#334466",a:6,d:"Das Tal selbst ist vergiftet."}],
 strengths:["Hexenkönig als Kommandant","Nazgûl-Terror","Psychologische Überlegenheit","Morgul-Tal vergiftet"],
 weaknesses:["Hexenkönig: 'kein lebender Mann' — aber Éowyn und Merry","Nicht gegen Eos-Licht"],
 attackTips:["Éowyn + Merry gegen Hexenkönig","Morgengrauen als taktisches Mittel","Kleines Kommando im Schatten"],
 siegeCtx:"Du willst Minas Morgul nehmen. Der Hexenkönig ist tot (nach dem Pelennor). Nazgûl sind noch da.",defender:"Gothmog (Feldmarschall)"},

{id:"angband",name:"Angband",sub:"Höllen-Schmiedeburg Morgoths",era:"Erstes Zeitalter",year:-1000,loc:"Thangorodrim, Mittelerde",type:"fantasy",epoch:"Silmarillion",region:"mittelerde",icon:"🌋",
 theme:{bg:"#080604",accent:"#993322",glow:"rgba(140,40,20,0.2)"},
 ratings:{walls:99,supply:75,position:99,garrison:99,morale:99},
 desc:"Unter drei Vulkanen. Balrogs, Drachen, Orks ohne Zahl. Die dunkelste Festung der Tolkien-Welt.",
 history:"Nie militärisch eingenommen. Nur durch Einwirkung der Valar und den Krieg der Zorn zerstört.",
 verdict:"Für Sterbliche: absolut uneinnehmbar. Fiel nur durch göttliche Intervention.",
 zones:[{id:"th",l:"Thangorodrim (3 Vulkane)",x:50,y:50,r:46,c:"#4a2010",a:10,d:"Drei Vulkane als Mauern."},{id:"df",l:"Tiefe Kerker",x:50,y:50,r:30,c:"#6a3018",a:8,d:"Unzählige Stockwerke tief."},{id:"bl",l:"Balrog-Wächter",x:30,y:30,r:10,c:"#cc4422",a:0,d:"Maiar-Feuer — nicht bekämpfbar."},{id:"dr",l:"Drachen",x:70,y:30,r:10,c:"#cc6622",a:0,d:"Glaurung, Ancalagon etc."},{id:"mk",l:"Morgoth's Throne",x:50,y:50,r:14,c:"#992211",a:10,d:"Melkor persönlich."}],
 strengths:["Drei Vulkane als Mauern","Balrogs","Drachen","Heer ohne Zahl"],
 weaknesses:["Nur durch Valar zu bezwingen","Beren & Lúthien kamen bis zum Thron","Zu selbstsicher"],
 attackTips:["Valar um Hilfe bitten (Kriegsruf)","Beren & Lúthien-Strategie (Täuschung)","Lass Lúthien singen"],
 siegeCtx:"Du bist Fingolfin, König der Noldor. Du reitest allein auf Angband zu. Ein Kampf mit Morgoth persönlich.",defender:"Morgoth Bauglir"},

{id:"khazad_dum",name:"Khazad-dûm",sub:"Moria — Die Zwergenminen",era:"Erstes bis Drittes Zeitalter",year:1500,loc:"Nebelgebirge",type:"fantasy",epoch:"Mittelerde",region:"mittelerde",icon:"⛏️",
 theme:{bg:"#060810",accent:"#886644",glow:"rgba(110,80,50,0.18)"},
 ratings:{walls:99,supply:88,position:99,garrison:60,morale:30},
 desc:"Ganzes Gebirge. 1000 Jahre verlassen. Ein Balrog hält es allein.",
 history:"Dwarven empire at peak: uneinnehmbar. Fiel durch Durin's Bane (Balrog) von innen.",
 verdict:"Das Paradox der größten Festung: Von innen heraus zerstört — der Balrog vertrieb die Zwerge.",
 zones:[{id:"ng",l:"Nebelgebirge",x:50,y:50,r:46,c:"#3a3a4a",a:10,d:"Das ganze Gebirge ist die Festung."},{id:"gh",l:"Große Hallen",x:50,y:50,r:30,c:"#553333",a:3,d:"Verlassen — Orks halten sie jetzt."},{id:"db",l:"Durin's Bane ⚠",x:50,y:70,r:12,c:"#882222",a:0,d:"BALROG: Gandalf-Klasse."},{id:"bt",l:"Brücke von Khazad-dûm",x:50,y:65,r:8,c:"#664422",a:2,d:"Einziger Übergang über die Tiefe."}],
 strengths:["Ganzes Gebirge","Labyrinthartige Ebenen","Balrog als Wächter","Unendliche Tiefe"],
 weaknesses:["Balrog vertrieb die Zwerge","Kein Licht","Orks als neue Besatzer (schwach)"],
 attackTips:["Balrog umgehen (unmöglich)","Brücke von Khazad-dûm halten","Gandalf schicken..."],
 siegeCtx:"Du willst Moria zurückerobern. Balin versuchte es — alle tot. Der Balrog wartet in der Tiefe.",defender:"Durin's Bane"},

{id:"edoras",name:"Edoras",sub:"Goldene Halle Rohans",era:"Drittes Zeitalter",year:3019,loc:"Ered Nimrais, Rohan",type:"fantasy",epoch:"Mittelerde",region:"mittelerde",icon:"🐎",
 theme:{bg:"#0e0c06",accent:"#cc9933",glow:"rgba(180,140,40,0.15)"},
 ratings:{walls:72,supply:75,position:85,garrison:70,morale:85},
 desc:"Auf einzelnem Fels. Goldenes Dach von Meduseld. Mehr Symbol als Festung.",
 history:"Nie belagert. Symbol Rohans. Théoden hielt es durch Sarumans Fernmanipulation passiv.",
 verdict:"Militärisch eher schwach. Stärke liegt in Moral und der Bereitschaft der Rohirrim zu sterben.",
 zones:[{id:"hf",l:"Hügelfestung",x:50,y:50,r:46,c:"#8b6020",a:5,d:"Einzelner Fels."},{id:"md",l:"Meduseld (Goldene Halle)",x:50,y:50,r:20,c:"#cc9933",a:3,d:"Zentrum — Théodens Thronsaal."},{id:"pw",l:"Palisadenwand",x:50,y:50,r:36,c:"#7a6030",a:2,d:"Holzpalisade."},{id:"ro",l:"Rohirrim-Moral ⚡",x:50,y:28,r:10,c:"#e8c860",a:0,d:"STÄRKE: Reiter-Armee. Defensiv nutzlos, offensiv unschlagbar."}],
 strengths:["Hügellage","Rohirrim-Moral","Meduseld als letzter Rückzug"],
 weaknesses:["Nur Palisade","Keine Wassergräben","Für Belagerungsmaschinen leicht"],
 attackTips:["Palisade verbrennen","Schnell vor Rohirrim-Entsatz","Théoden durch Psycho-Manipulation lähmen"],
 siegeCtx:"Sarumans Spion Gríma hat Théodens Willen gebrochen. Edoras ist wehrlos — solange Théoden regiert.",defender:"König Théoden (unter Sarumans Einfluss)"},

// ── FANTASY: GAME OF THRONES ─────────────────────────────────────────────
{id:"winterfell",name:"Winterfell",sub:"Sitz der Starks",era:"5. Jh. AL",year:300,loc:"Norden, Westeros",type:"fantasy",epoch:"Westeros",region:"westeros",icon:"❄️",
 theme:{bg:"#060c12",accent:"#8899bb",glow:"rgba(100,120,160,0.18)"},
 ratings:{walls:88,supply:90,position:80,garrison:65,morale:85},
 desc:"Drei Mauerringen, heiße Quellen unter dem Boden, Crypten tief unter der Erde.",
 history:"Eingenommen von Theon Greyjoy durch Verrat. Später von Ramsay Bolton. Battle of the Bastards.",
 verdict:"Militärisch stark — aber dreimal durch Verrat gefallen, nie durch direkten Sturm.",
 zones:[{id:"ow3",l:"Äußerer Mauerring",x:50,y:50,r:44,c:"#667788",a:3,d:"Erster Ring."},{id:"iw3",l:"Innerer Mauerring",x:50,y:50,r:28,c:"#889aaa",a:4,d:"Hauptverteidigung."},{id:"hq",l:"Heiße Quellen",x:50,y:50,r:16,c:"#cc7744",a:1,d:"Heizen Mauern — kein Einfrieren."},{id:"cr",l:"Crypten ⚠",x:30,y:70,r:10,c:"#334455",a:0,d:"Gefährliche Tiefe — Untote lauern."}],
 strengths:["Drei Ringe","Heiße Quellen (Wintervorteil)","Stark-Treue","Nahrungsvorräte"],
 weaknesses:["Verrat (Dreimal gefallen)","Crypten als Sicherheitsrisiko","Weiße Wanderer"],
 attackTips:["Verräter rekrutieren (Theon-Strategie)","Winter warten und Versorgung kappen","Untote als Waffe"],
 siegeCtx:"Night King, Armee der Toten. Winterfell ist die letzte Menschenfestung im Norden.",defender:"Jon Snow & Daenerys Targaryen"},

{id:"harrenhal",name:"Harrenhal",sub:"Verdammte Burg",era:"2. Jh. AL",year:300,loc:"Riverlands, Westeros",type:"fantasy",epoch:"Westeros",region:"westeros",icon:"💀",
 theme:{bg:"#100808",accent:"#993322",glow:"rgba(140,40,30,0.2)"},
 ratings:{walls:99,supply:65,position:70,garrison:40,morale:20},
 desc:"Größte Burg in Westeros. Von Aegons Drachen am ersten Tag des Angriffs eingeschmolzen.",
 history:"Harren the Black baute sie 40 Jahre. Aegon I. und Balerion schmolzen die Türme in Stunden.",
 verdict:"Uneinnehmbar gegen jede Armee — aber ein einziger Drache machte sie zur Ruine.",
 zones:[{id:"mt3",l:"Schmelz-Türme",x:50,y:50,r:44,c:"#553322",a:7,d:"Eingeschmolzen von Balerion — immer noch gewaltig."},{id:"mw2",l:"Riesenmauern",x:50,y:50,r:36,c:"#664433",a:8,d:"Dickste Mauern in Westeros."},{id:"dk",l:"Dunkle Kammern",x:50,y:50,r:20,c:"#442211",a:3,d:"Labyrinthe im Inneren."},{id:"cr2",l:"Der Fluch ⚠",x:50,y:50,r:10,c:"#882211",a:0,d:"Kein Herr von Harrenhal behält es lange."}],
 strengths:["Dickste Mauern Westeros","Größtes Gebäude","Einschüchternde Größe"],
 weaknesses:["Drachen!","Fluch: Jeder Herr stirbt","Zu groß für kleine Garnison","Halbzerstört"],
 attackTips:["Drachen einsetzen (Balerion-Strategie)","Kleines Kommando durch Ruinen","Giftige Psychologie nutzen"],
 siegeCtx:"Du bist Aegon I. Targaryen auf Balerion. Harren the Black steht auf seinen Türmen und lacht.",defender:"Harren der Schwarze"},

{id:"kings_landing",name:"Königsmund",sub:"Rote Burg & Stadtmauern",era:"2. Jh. AL",year:300,loc:"Westküste, Westeros",type:"fantasy",epoch:"Westeros",region:"westeros",icon:"🏰",
 theme:{bg:"#120e08",accent:"#cc6633",glow:"rgba(180,80,40,0.18)"},
 ratings:{walls:85,supply:80,position:72,garrison:75,morale:60},
 desc:"Rote Burg auf Hügel, Stadtmauern ringsherum, Schwarzwasserbucht als Schutz.",
 history:"Gefallen durch Tywin Lannister (Plünderung), durch Daenerys (Drache), durch westliche Invader.",
 verdict:"Drei Mal durch Interne gefallen — militärisch einnehmbar, wenn die Verteidiger gespalten sind.",
 zones:[{id:"rb",l:"Rote Burg (Hügel)",x:50,y:35,r:20,c:"#cc6633",a:5,d:"Königssitz auf Hochplateau."},{id:"sw2",l:"Stadtmauern",x:50,y:50,r:44,c:"#9a6030",a:4,d:"Drei Tore."},{id:"sb",l:"Schwarzwasserbucht",x:50,y:85,r:15,c:"#4466aa",a:6,d:"Meer schützt Südseite."},{id:"wf",l:"Wildfeuer-Arsenal ⚠",x:30,y:60,r:10,c:"#44cc44",a:0,d:"GEFÄHRLICH: Riesige Wildfeuer-Depots unter der Stadt."}],
 strengths:["Rote Burg auf erhöhtem Platz","Schwarzwasserbucht","Wildfeuer-Arsenal (zweischneidig)"],
 weaknesses:["Wildfeuer kann explodieren","Politische Instabilität","Verrat von innen"],
 attackTips:["Wildfeuer anzünden (Tyrion-Strategie)","Drachen direkt auf Rote Burg","Tor durch Belagerung"],
 siegeCtx:"Du willst Königsmund einnehmen. Die Straits sind gefährlich. Wildfeuer liegt unter der Stadt.",defender:"Königin Cersei Lannister"},
];

// ═══════════════════════════════════════════════════════════════════════════
//  BUILDER ELEMENTS (25 Stück)
// ═══════════════════════════════════════════════════════════════════════════
const BUILDER = [
  {id:"moat",l:"Wassergraben",i:"💧",cost:2,def:15,sup:0,pos:5,desc:"Verlangsamt jeden Angreifer"},
  {id:"walls_thin",l:"Einfache Mauern",i:"🧱",cost:1,def:10,sup:0,pos:0,desc:"Grundschutz, günstig"},
  {id:"walls_thick",l:"Dicke Mauern",i:"⬛",cost:3,def:25,sup:0,pos:0,desc:"Widersteht Belagerungsmaschinen"},
  {id:"towers",l:"Wachtürme",i:"🗼",cost:2,def:12,sup:0,pos:5,desc:"Kein toter Winkel"},
  {id:"keep",l:"Donjon",i:"🏰",cost:3,def:20,sup:5,pos:0,desc:"Letzte Bastion"},
  {id:"cistern",l:"Zisternen",i:"🪣",cost:2,def:0,sup:25,pos:0,desc:"Wasserautarkie"},
  {id:"granary",l:"Getreidespeicher",i:"🌾",cost:2,def:0,sup:20,pos:0,desc:"Nahrungsvorrat"},
  {id:"barbican",l:"Barbakane",i:"🚪",cost:2,def:15,sup:0,pos:5,desc:"Dreifaches Torhindernis"},
  {id:"concentric",l:"Konzentrische Mauer",i:"🔄",cost:4,def:30,sup:0,pos:0,desc:"Zwingerfalle"},
  {id:"hillfort",l:"Hangposition",i:"⛰️",cost:3,def:10,sup:0,pos:30,desc:"Natürlicher Höhenvorteil"},
  {id:"seagate",l:"Seezugang",i:"⚓",cost:3,def:5,sup:20,pos:10,desc:"Versorgung trotz Blockade"},
  {id:"garrison_bld",l:"Kaserne",i:"🏕️",cost:2,def:8,sup:5,pos:0,desc:"Größere Garnison"},
  {id:"underground",l:"Tunnel",i:"🕳️",cost:3,def:5,sup:10,pos:5,desc:"Geheimwege & Flucht"},
  {id:"greek_fire",l:"Griechisches Feuer",i:"🔥",cost:3,def:20,sup:0,pos:0,desc:"Verheerend gegen Schiffe & Holz"},
  {id:"ballista",l:"Ballistae",i:"🏹",cost:2,def:15,sup:0,pos:0,desc:"Fernkampf auf Mauern"},
  {id:"drawbridge",l:"Zugbrücke",i:"🌉",cost:1,def:8,sup:0,pos:0,desc:"Schnelles Verschließen"},
  {id:"murder_holes",l:"Maschikulis",i:"🕳️",cost:2,def:12,sup:0,pos:0,desc:"Senkt Siedendes Pech durch Löcher"},
  {id:"sally_port",l:"Ausfalltor",i:"🚀",cost:2,def:10,sup:3,pos:0,desc:"Überraschungsangriffe"},
  {id:"crenellations",l:"Zinnen",i:"👑",cost:1,def:8,sup:0,pos:0,desc:"Schutz für Bogenschützen"},
  {id:"magazine",l:"Munitionslager",i:"📦",cost:2,def:5,sup:15,pos:0,desc:"Langfristiger Nachschub"},
  {id:"spy_network",l:"Spionagenetz",i:"🕵️",cost:3,def:10,sup:5,pos:5,desc:"Frühwarnung + Verräteraufdeckung"},
  {id:"hospital",l:"Feldlazarett",i:"🏥",cost:2,def:0,sup:10,pos:0,desc:"Moral & Regeneration"},
  {id:"lighthouse",l:"Leuchtturm",i:"💡",cost:2,def:5,sup:5,pos:10,desc:"Koordination & Signale"},
  {id:"dragon",l:"Drache (!)",i:"🐉",cost:6,def:40,sup:0,pos:0,desc:"ULTIMATIV — aber kann auch fliegen"},
  {id:"magic_walls",l:"Verzauberte Mauern",i:"✨",cost:5,def:35,sup:0,pos:0,desc:"Fantasy-Option: magischer Schutz"},
];

// ═══════════════════════════════════════════════════════════════════════════
//  RESOURCE TYPES
// ═══════════════════════════════════════════════════════════════════════════
const RES = {
  soldiers:  {l:"Infanterie",        i:"⚔️",  c:"#cc7744"},
  archers:   {l:"Bogenschützen",     i:"🏹",  c:"#88aa44"},
  siege:     {l:"Belagerungsm.",     i:"🏗️",  c:"#bb6633"},
  miners:    {l:"Mineure",           i:"⛏️",  c:"#aa8844"},
  sappers:   {l:"Pioniere",          i:"🔥",  c:"#cc4433"},
  cavalry:   {l:"Kavallerie",        i:"🐴",  c:"#9966cc"},
  diplomats: {l:"Diplomaten",        i:"📜",  c:"#88aacc"},
  spies:     {l:"Spione",            i:"🕵️",  c:"#558877"},
  engineers: {l:"Ingenieure",        i:"🔧",  c:"#77aadd"},
  navy:      {l:"Flotte",            i:"⚓",  c:"#3366aa"},
  provisions:{l:"Verpflegung",       i:"🍖",  c:"#cc9944"},
  mercenaries:{l:"Söldner",         i:"💰",  c:"#aaa022"},
  healers:   {l:"Heiler",            i:"🏥",  c:"#66aa88"},
  artillery: {l:"Artillerie (15.Jh.)",i:"💥", c:"#cc5533"},
};

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

// ── ScoreBar ───────────────────────────────────────────────────────────────
function ScoreBar({label,value,delay=0,accent}){
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

// ── RadarChart ─────────────────────────────────────────────────────────────
function RadarChart({castle,compare}){
  const cats=[{k:"walls",l:"Mauern"},{k:"position",l:"Position"},{k:"morale",l:"Moral"},{k:"garrison",l:"Garnison"},{k:"supply",l:"Versorgung"}];
  const N=cats.length,cx=50,cy=52,R=34;
  const pt=(val,i)=>{const a=(i/N)*2*Math.PI-Math.PI/2,r=(val/100)*R;return{x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)};};
  const axPt=(i,s=1)=>{const a=(i/N)*2*Math.PI-Math.PI/2;return{x:cx+R*s*Math.cos(a),y:cy+R*s*Math.sin(a)};};
  const poly=(r)=>cats.map((c,i)=>pt(r[c.k],i)).map(p=>`${p.x},${p.y}`).join(" ");
  const ac=castle.theme.accent;
  return(
    <svg viewBox="0 0 100 100" style={{width:"100%",maxWidth:"200px",display:"block",margin:"0 auto"}}>
      {[0.25,0.5,0.75,1].map((s,i)=>(
        <polygon key={i} points={cats.map((_,j)=>axPt(j,s)).map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.4"/>
      ))}
      {cats.map((_,i)=>{const p=axPt(i);return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.07)" strokeWidth="0.3"/>;}) }
      {compare&&<polygon points={poly(compare.ratings)} fill="rgba(100,200,100,0.07)" stroke="#6aaa52" strokeWidth="0.5" strokeDasharray="1.5,1" opacity="0.8"/>}
      <polygon points={poly(castle.ratings)} fill={`${ac}18`} stroke={ac} strokeWidth="0.7"/>
      {cats.map((c,i)=>{const p=pt(castle.ratings[c.k],i);return <circle key={i} cx={p.x} cy={p.y} r="1.2" fill={ac} opacity="0.9"/>;}) }
      {cats.map((c,i)=>{const p=axPt(i,1.22);return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">{c.l}</text>;}) }
      <circle cx={cx} cy={cy} r="0.8" fill={ac} opacity="0.5"/>
    </svg>
  );
}


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
      <ellipse cx="110" cy="110" rx="70" ry="64" fill={sel==="ou"?"rgba(139,105,20,0.22)":"rgba(139,105,20,0.07)"} stroke={`${ac}66`} strokeWidth="5.5" style={{cursor:"pointer"}} onClick={()=>onZone("ou")}/>
      {Array.from({length:9},(_,i)=>{const a=i/9*Math.PI*2;return <rect key={i} x={110+70*Math.cos(a)-5} y={110+64*Math.sin(a)-5} width="10" height="10" rx="1" fill={`${ac}44`} stroke={`${ac}88`} strokeWidth="0.8" style={{cursor:"pointer"}} onClick={()=>onZone("ou")}/>;}) }
      {/* Killing ground label */}
      <text x="152" y="75" fill={`${ac}44`} fontSize="8" fontFamily="serif">Zwinger</text>
      {/* Inner wall ring */}
      <ellipse cx="110" cy="108" rx="48" ry="43" fill={sel==="in"?"rgba(201,168,76,0.22)":"rgba(201,168,76,0.08)"} stroke={`${ac}cc`} strokeWidth="6" style={{cursor:"pointer"}} onClick={()=>onZone("in")}/>
      {Array.from({length:6},(_,i)=>{const a=i/6*Math.PI*2;return <circle key={i} cx={110+48*Math.cos(a)} cy={108+43*Math.sin(a)} r="7.5" fill={`${ac}44`} stroke={`${ac}99`} strokeWidth="1" style={{cursor:"pointer"}} onClick={()=>onZone("in")}/>;}) }
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
      <ellipse cx="110" cy="105" rx="86" ry="76" fill={sel==="om"?"rgba(122,90,32,0.22)":"rgba(122,90,32,0.07)"} stroke={`${ac}55`} strokeWidth="5.5" style={{cursor:"pointer"}} onClick={()=>onZone("om")}/>
      {/* 16 towers around outer wall */}
      {Array.from({length:16},(_,i)=>{const a=i/16*Math.PI*2;return <rect key={i} x={110+86*Math.cos(a)-4.5} y={105+76*Math.sin(a)-4.5} width="9" height="9" rx="1" fill={`${ac}33`} stroke={`${ac}66`} strokeWidth="0.7" style={{cursor:"pointer"}} onClick={()=>onZone("om")}/>;}) }
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
};

// Generic plan for all other castles
function GenericCastlePlan({castle,ac,sel,onZone}){
  const zones=castle.zones;
  // Smart positions based on zone index and type
  const getPos=(z,i,total)=>{
    // outermost zones get outer ring, innermost get center
    const isOuter=z.r>35;
    const isMid=z.r>15&&z.r<=35;
    if(isOuter) return {type:"ellipse",cx:110,cy:108,rx:75,ry:68};
    if(isMid)   return {type:"ellipse",cx:110,cy:108,rx:52,ry:46};
    // Small zones: distribute around center
    const angle=(i/Math.max(total,1))*Math.PI*2-Math.PI/2;
    const dist=z.r<10?22:34;
    return {type:"circle",cx:110+dist*Math.cos(angle),cy:108+dist*Math.sin(angle),r:Math.min(z.r,16)};
  };
  return(
    <g>
      {/* Background */}
      <rect x="5" y="5" width="210" height="190" rx="6" fill={`${ac}05`} stroke={`${ac}14`} strokeWidth="0.8"/>
      {/* Subtle grid */}
      {[40,70,100,130,160].flatMap(v=>[
        <line key={`gx${v}`} x1={v} y1="5" x2={v} y2="195" stroke={`${ac}06`} strokeWidth="0.4"/>,
        <line key={`gy${v}`} x1="5" y1={v} x2="215" y2={v} stroke={`${ac}06`} strokeWidth="0.4"/>
      ])}
      {/* Terrain hint */}
      <path d="M 5 170 Q 60 155 110 160 Q 160 165 215 155 L 215 195 L 5 195 Z" fill={`${ac}07`} stroke="none"/>
      {/* Zones */}
      {zones.map((z,i)=>{
        const isH=sel===z.id;
        const pos=getPos(z,i,zones.length);
        const isWeak=z.l.includes("⚠");
        return(
          <g key={z.id} style={{cursor:"pointer"}} onClick={()=>onZone(z.id)}>
            {pos.type==="ellipse"
              ?<ellipse cx={pos.cx} cy={pos.cy} rx={pos.rx} ry={pos.ry}
                  fill={isH?`${z.c}28`:`${z.c}0e`}
                  stroke={isH?z.c:`${z.c}66`}
                  strokeWidth={isH?3:1.8}/>
              :<circle cx={pos.cx} cy={pos.cy} r={pos.r}
                  fill={isH?`${z.c}3a`:`${z.c}14`}
                  stroke={isH?z.c:`${z.c}88`}
                  strokeWidth={isH?2.5:1.5}/>
            }
            {/* Zone name */}
            <text
              x={pos.type==="ellipse"?pos.cx:pos.cx}
              y={pos.type==="ellipse"?pos.cy+4:pos.cy+2}
              textAnchor="middle" fill={isH?z.c:`${z.c}aa`}
              fontSize="9" fontFamily="serif">
              {z.l.replace(" ⚠","").replace(" ⚠⚠","")}
            </text>
            {isWeak&&<text
              x={pos.type==="ellipse"?pos.cx:pos.cx}
              y={pos.type==="ellipse"?pos.cy+14:pos.cy+12}
              textAnchor="middle" fill="#cc4444" fontSize="8">⚠</text>}
            {/* Tower dots on ellipse rings */}
            {pos.type==="ellipse"&&Array.from({length:8},(_,j)=>{
              const a=j/8*Math.PI*2;
              return <rect key={j} x={pos.cx+pos.rx*Math.cos(a)-3.5} y={pos.cy+pos.ry*Math.sin(a)-3.5}
                width="7" height="7" rx="1"
                fill={`${z.c}33`} stroke={`${z.c}66`} strokeWidth="0.7"
                style={{cursor:"pointer"}}/>;
            })}
          </g>
        );
      })}
      {/* Castle name */}
      <text x="110" y="193" textAnchor="middle" fill={`${ac}44`} fontSize="9" fontFamily="serif" letterSpacing="1.5">
        {castle.name.toUpperCase().slice(0,22)}
      </text>
      {/* Compass */}
      <text x="198" y="24" textAnchor="middle" fill={`${ac}66`} fontSize="8" fontFamily="serif">N</text>
      <line x1="198" y1="27" x2="198" y2="42" stroke={`${ac}44`} strokeWidth="1"/>
      <polygon points="198,27 196,35 200,35" fill={`${ac}44`}/>
    </g>
  );
}

// ── BattleMap — top-down floor plan view ──────────────────────────────────
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
function WorldMap({castles,onSelect,selected}){
  const [hov,setHov]=useState(null);
  const [tooltip,setTooltip]=useState(null); // {c, x, y}
  const svgRef=useRef(null);
  const real=castles.filter(c=>COORDS[c.id]&&c.type==="real");
  const fantasy=castles.filter(c=>COORDS[c.id]&&c.type==="fantasy");

  const handleEnter=(c,e)=>{
    const svg=svgRef.current;
    if(!svg)return;
    const rect=svg.getBoundingClientRect();
    const pos=COORDS[c.id];
    // Convert SVG coords → pixel coords
    const px=(pos.x/100)*rect.width;
    const py=(pos.y/62)*rect.height;
    setHov(c.id);
    setTooltip({c,px,py});
  };
  const handleLeave=()=>{setHov(null);setTooltip(null);};

  const MapPin=({c,pos,shape="circle"})=>{
    const iS=selected?.id===c.id,iH=hov===c.id;
    const ac=c.theme.accent;
    return(
      <g onClick={()=>onSelect(c)} onMouseEnter={e=>handleEnter(c,e)} onMouseLeave={handleLeave} style={{cursor:"pointer"}}>
        {/* Glow ring for selected/hover */}
        {(iS||iH)&&<circle cx={pos.x} cy={pos.y} r={iS?6:4.5}
          fill="none" stroke={ac} strokeWidth="0.4" strokeOpacity={iS?"0.5":"0.3"}
          style={{animation:"pulse 2s ease infinite"}}/>}
        {/* Outer glow blob */}
        <circle cx={pos.x} cy={pos.y} r={iS?4:iH?3.2:2.4}
          fill={ac} fillOpacity={iS?0.18:iH?0.14:0.07}/>
        {shape==="circle"
          ? <circle cx={pos.x} cy={pos.y} r={iS?2.8:iH?2.2:1.6}
              fill={iS?ac:`${ac}dd`} fillOpacity={iS?1:iH?0.9:0.65}
              stroke={iS?"rgba(255,255,255,0.8)":ac} strokeWidth={iS?0.5:0.25}
              style={{transition:"all .2s ease"}}/>
          : <polygon
              points={`${pos.x},${pos.y-(iS?3.2:iH?2.6:1.9)} ${pos.x+(iS?2.8:iH?2.2:1.6)},${pos.y+(iS?1.6:iH?1.3:1)} ${pos.x-(iS?2.8:iH?2.2:1.6)},${pos.y+(iS?1.6:iH?1.3:1)}`}
              fill={iS?ac:`${ac}dd`} fillOpacity={iS?1:iH?0.9:0.65}
              stroke={iS?"rgba(255,255,255,0.8)":ac} strokeWidth={iS?0.5:0.25}
              style={{transition:"all .2s ease"}}/>
        }
        {/* Castle name label — always visible for selected */}
        {iS&&<>
          <rect x={pos.x-8} y={pos.y-8.5} width="16" height="4.5" rx="0.8"
            fill="rgba(6,4,2,0.88)" stroke={ac} strokeWidth="0.3" strokeOpacity="0.6"/>
          <text x={pos.x} y={pos.y-5.5} textAnchor="middle" dominantBaseline="middle"
            fill={ac} fontSize="7" fontFamily="'Palatino Linotype',Georgia,serif" letterSpacing="0.1">
            {c.name.length>12?c.name.slice(0,11)+"…":c.name}
          </text>
        </>}
        {/* Hover name — smaller */}
        {iH&&!iS&&<>
          <rect x={pos.x-7} y={pos.y-7.5} width="14" height="4" rx="0.7"
            fill="rgba(6,4,2,0.82)" stroke={ac} strokeWidth="0.25" strokeOpacity="0.5"/>
          <text x={pos.x} y={pos.y-4.8} textAnchor="middle" dominantBaseline="middle"
            fill="rgba(240,220,180,0.9)" fontSize="7" fontFamily="'Palatino Linotype',Georgia,serif">
            {c.name.length>12?c.name.slice(0,11)+"…":c.name}
          </text>
        </>}
      </g>
    );
  };

  const hC=tooltip?.c;

  return(
    <div style={{padding:"18px 20px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:"14px"}}>
        <div>
          <div style={{fontSize:"17px",fontWeight:"bold",color:"#f0e6cc",letterSpacing:"0.5px",marginBottom:"3px"}}>🌍 Weltkarte der Festungen</div>
          <div style={{fontSize:"13px",color:"#b09a70",letterSpacing:"1px"}}>● HISTORISCH  ▲ FANTASY-REICH  · Hover für Details · Klicken zum Analysieren</div>
        </div>
        <div style={{textAlign:"right",fontSize:"13px",color:"#b09a70"}}>
          <div>{real.length} historische Burgen</div>
          <div>{fantasy.length} Fantasy-Festungen</div>
        </div>
      </div>

      <div style={{position:"relative",borderRadius:"8px",overflow:"hidden",
        boxShadow:"0 0 0 1px rgba(201,168,76,0.12), 0 4px 32px rgba(0,0,0,0.6), inset 0 0 60px rgba(0,0,0,0.4)"}}>
        <svg ref={svgRef} viewBox="0 0 100 62" style={{width:"100%",display:"block"}}>
          <defs>
            <radialGradient id="oceanGrad" cx="55%" cy="45%" r="60%">
              <stop offset="0%" stopColor="#0d1e38"/>
              <stop offset="60%" stopColor="#081428"/>
              <stop offset="100%" stopColor="#040c18"/>
            </radialGradient>
            <radialGradient id="landEurope" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4a6335"/>
              <stop offset="100%" stopColor="#354828"/>
            </radialGradient>
            <radialGradient id="landAsia" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4a6030"/>
              <stop offset="100%" stopColor="#304020"/>
            </radialGradient>
            <radialGradient id="landAfrica" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#6a5828"/>
              <stop offset="100%" stopColor="#4a3e1a"/>
            </radialGradient>
            <filter id="landShadow">
              <feDropShadow dx="0" dy="0.4" stdDeviation="0.6" floodColor="rgba(0,0,0,0.5)"/>
            </filter>
            <filter id="pinGlow">
              <feGaussianBlur stdDeviation="1" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <pattern id="oceanGrid" width="5" height="5" patternUnits="userSpaceOnUse">
              <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="0.2"/>
            </pattern>
          </defs>

          {/* Deep ocean */}
          <rect width="100" height="62" fill="url(#oceanGrad)"/>
          {/* Ocean grid pattern */}
          <rect width="100" height="62" fill="url(#oceanGrid)"/>
          {/* Ocean depth lines */}
          {[15,25,35,45,55].map(y=>(
            <line key={y} x1="0" y1={y} x2="100" y2={y}
              stroke="rgba(100,160,255,0.025)" strokeWidth="0.15"/>
          ))}

          {/* ── CONTINENTS (much more detailed paths) ── */}

          {/* EUROPE — detailed */}
          <path filter="url(#landShadow)"
            d="M39 16 L41 14 L43 13.5 L44 12 L45.5 12 L46 11 L47 11.5 L48 11 L49 12 L50 11.5 L51 12 L52 13 L54 13 L56 14 L58 14.5 L59 16 L59 18 L58 19 L57 21 L56 22 L54 23.5 L52 24.5 L51 26 L50 27 L49 27.5 L47 27 L45.5 26.5 L44 26 L42 25 L40 24 L39 22 L38.5 20 L39 18Z"
            fill="url(#landEurope)" stroke="rgba(80,110,55,0.7)" strokeWidth="0.3"/>
          {/* Iberian Peninsula */}
          <path d="M40 24 L42 24 L43.5 25.5 L43 28 L41 29 L39.5 28 L39 26 L39.5 25Z"
            fill="url(#landEurope)" stroke="rgba(80,110,55,0.5)" strokeWidth="0.25"/>
          {/* Italian boot hint */}
          <path d="M49 26 L50 27.5 L51 29.5 L50.5 31 L49.5 31 L49 30 L48.5 28 L48.5 27Z"
            fill="url(#landEurope)" stroke="rgba(80,110,55,0.5)" strokeWidth="0.22"/>
          {/* Scandinavian peninsula */}
          <path d="M47 11.5 L48.5 11 L49.5 10 L50 9 L50.5 8.5 L51 9 L51.5 10 L52 12 L51 12Z"
            fill="url(#landEurope)" stroke="rgba(80,110,55,0.5)" strokeWidth="0.22"/>
          {/* British Isles */}
          <ellipse cx="42.5" cy="15.5" rx="1.4" ry="2.2" fill="url(#landEurope)" stroke="rgba(80,110,55,0.6)" strokeWidth="0.25"/>
          <ellipse cx="41" cy="14.8" rx="0.8" ry="1.4" fill="url(#landEurope)" stroke="rgba(80,110,55,0.5)" strokeWidth="0.2"/>

          {/* NORTH AFRICA */}
          <path filter="url(#landShadow)"
            d="M39 29 L41.5 27 L44 26.5 L48 26.5 L52 27 L56 27 L60 27.5 L63 28 L65 29 L66 31 L66 35 L65 38 L62 40 L58 41 L54 41.5 L50 41.5 L46 41 L43 40 L40 38.5 L38.5 36 L38 33 L38 31Z"
            fill="url(#landAfrica)" stroke="rgba(110,90,35,0.6)" strokeWidth="0.3"/>
          {/* Mediterranean cutout */}
          <path d="M44 26.5 L58 26.5 L59.5 28.5 L58 30.5 L52 31 L45 31 L43.5 29 Z"
            fill="url(#oceanGrad)" opacity="0.95"/>

          {/* MIDDLE EAST */}
          <path filter="url(#landShadow)"
            d="M58 27 L62 26.5 L66 26.5 L70 27 L72 28 L73 30 L72 33 L70 36 L68 38 L65 39 L63 38 L60 37 L58 35 L57 33 L57 30Z"
            fill="url(#landAfrica)" stroke="rgba(110,90,35,0.55)" strokeWidth="0.28"/>

          {/* SUB-SAHARAN AFRICA hint */}
          <path d="M42 41 L50 41.5 L56 41 L60 41 L63 42 L64 44 L63 47 L60 49.5 L56 51 L50 52 L44 51 L40 49 L38.5 46 L38.5 43 L40 41Z"
            fill="url(#landAfrica)" stroke="rgba(110,90,35,0.45)" strokeWidth="0.28" opacity="0.8"/>

          {/* ASIA — large landmass */}
          <path filter="url(#landShadow)"
            d="M58 14 L62 13 L66 13 L70 13 L75 12.5 L80 13 L85 13 L90 14 L93 16 L94 19 L93 22 L91 25 L88 27.5 L84 29.5 L80 30.5 L76 31 L72 30.5 L68 29 L65 27.5 L62 26.5 L59 25 L58 22 L57.5 20 L57.5 18Z"
            fill="url(#landAsia)" stroke="rgba(70,95,48,0.6)" strokeWidth="0.3"/>
          {/* India subcontinent */}
          <path d="M68 29 L70 30 L72 32 L73 34 L72 37 L70 39.5 L68 41 L66 40 L64 38 L63 36 L64 33 L66 31 L68 30Z"
            fill="url(#landAsia)" stroke="rgba(70,95,48,0.5)" strokeWidth="0.25"/>
          {/* Southeast Asia hint */}
          <path d="M78 31 L80 32 L82 33 L83 35 L82 37 L80 37.5 L78 37 L77 35 L77 33Z"
            fill="url(#landAsia)" stroke="rgba(70,95,48,0.45)" strokeWidth="0.22" opacity="0.85"/>

          {/* JAPAN */}
          <ellipse cx="83.5" cy="27" rx="1.2" ry="3.8"
            fill="url(#landAsia)" stroke="rgba(70,95,48,0.6)" strokeWidth="0.25"
            transform="rotate(-20 83.5 27)"/>

          {/* CENTRAL ASIA / PERSIA region highlight — lighter tone */}
          <path d="M64 23 L70 22.5 L74 23 L76 25 L74 27.5 L70 28.5 L66 28 L63 26.5Z"
            fill="rgba(90,75,38,0.3)" stroke="rgba(120,95,45,0.3)" strokeWidth="0.2"/>

          {/* Fantasy continent region — top left, visually distinct */}
          <rect x="1" y="1" width="36" height="28" rx="2"
            fill="rgba(20,10,35,0.7)" stroke="rgba(80,50,130,0.3)" strokeWidth="0.3" strokeDasharray="1,0.8"/>
          {/* Fantasy land texture */}
          <path d="M3 8 L8 6 L14 6.5 L18 5.5 L22 6 L26 5.5 L30 6.5 L34 6 L36 8 L36 16 L34 18 L30 19 L26 20 L22 21.5 L18 21 L14 22 L10 21.5 L6 20 L3 18 L2 14 L2 10Z"
            fill="rgba(40,25,65,0.5)" stroke="rgba(90,60,150,0.35)" strokeWidth="0.3"/>
          {/* Westeros region */}
          <path d="M3 20 L8 20.5 L12 21 L14 22 L13 25 L10 26.5 L6 26.5 L3 25 L2.5 23Z"
            fill="rgba(30,35,55,0.5)" stroke="rgba(70,90,140,0.35)" strokeWidth="0.3"/>
          {/* Fantasy region labels */}
          <text x="19" y="4" textAnchor="middle" fill="rgba(150,100,220,0.45)" fontSize="7"
            fontFamily="'Palatino Linotype',Georgia,serif" letterSpacing="0.3">✦ MITTELERDE</text>
          <text x="8" y="28.5" textAnchor="middle" fill="rgba(100,130,200,0.4)" fontSize="7"
            fontFamily="'Palatino Linotype',Georgia,serif">❄ WESTEROS</text>
          {/* Divider line between fantasy regions */}
          <line x1="1" y1="20" x2="36" y2="20" stroke="rgba(80,80,160,0.18)" strokeWidth="0.2" strokeDasharray="0.8,0.8"/>

          {/* Ocean latitude lines (subtle) */}
          <line x1="0" y1="31" x2="100" y2="31" stroke="rgba(100,160,255,0.04)" strokeWidth="0.3"/>

          {/* ── CASTLE PINS ── */}
          <g filter="url(#pinGlow)">
            {real.map(c=>{const pos=COORDS[c.id];return pos?<MapPin key={c.id} c={c} pos={pos} shape="circle"/>:null;})}
            {fantasy.map(c=>{const pos=COORDS[c.id];return pos?<MapPin key={c.id} c={c} pos={pos} shape="triangle"/>:null;})}
          </g>
        </svg>

        {/* Floating tooltip */}
        {hC&&<div style={{position:"absolute",bottom:"10px",left:"12px",right:"12px",
          padding:"10px 14px",
          background:"linear-gradient(135deg,rgba(10,7,3,0.97) 0%,rgba(18,12,5,0.97) 100%)",
          border:`1px solid ${hC.theme.accent}55`,
          borderLeft:`3px solid ${hC.theme.accent}`,
          borderRadius:"6px",display:"flex",gap:"12px",alignItems:"center",
          pointerEvents:"none",
          boxShadow:`0 4px 20px rgba(0,0,0,0.7), 0 0 12px ${hC.theme.accent}18`}}>
          <div style={{fontSize:"22px",flexShrink:0}}>{hC.icon}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:"12px",fontWeight:"bold",color:"#f0e8d0",marginBottom:"2px"}}>{hC.name}</div>
            <div style={{fontSize:"13px",color:"#cbb888",letterSpacing:"0.5px"}}>{hC.sub}</div>
            <div style={{fontSize:"12px",color:"#b09a70",marginTop:"2px"}}>{hC.loc} · {hC.era}</div>
          </div>
          <div style={{textAlign:"center",flexShrink:0}}>
            <div style={{fontSize:"20px",fontWeight:"bold",color:rCol(avg(hC)),lineHeight:1}}>{avg(hC)}</div>
            <div style={{fontSize:"11px",color:"#9a8a68",letterSpacing:"1px",marginTop:"1px"}}>SCORE</div>
          </div>
          <div style={{fontSize:"12px",color:hC.theme.accent,flexShrink:0,letterSpacing:"1px"}}>KLICKEN →</div>
        </div>}
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:"18px",marginTop:"10px",padding:"8px 12px",background:"rgba(0,0,0,0.25)",borderRadius:"4px",border:"1px solid rgba(255,255,255,0.04)"}}>
        <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
          <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4" fill="rgba(201,168,76,0.7)"/></svg>
          <span style={{fontSize:"13px",color:"#4a3a20"}}>Historische Burg</span>
        </div>
        <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
          <svg width="12" height="12" viewBox="0 0 12 12"><polygon points="6,1 11,10 1,10" fill="rgba(136,102,204,0.7)"/></svg>
          <span style={{fontSize:"13px",color:"#4a3a20"}}>Fantasy-Festung</span>
        </div>
        <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
          <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4" fill="rgba(201,168,76,0.25)" stroke="rgba(201,168,76,0.9)" strokeWidth="1.5"/></svg>
          <span style={{fontSize:"13px",color:"#4a3a20"}}>Ausgewählt</span>
        </div>
        <div style={{marginLeft:"auto",fontSize:"13px",color:"#9a8a68"}}>{real.length + fantasy.length} Festungen kartiert</div>
      </div>
    </div>
  );
}

// ── Overview Grid ──────────────────────────────────────────────────────────
const REGION_LABELS={europa:"⚜ Europa",nahost:"☪ Naher Osten",ostasien:"⛩ Ostasien",suedostasien:"🌺 S-Asien",mittelerde:"✦ Mittelerde",westeros:"❄ Westeros"};
const EPOCH_ORDER=["Antike","Spätantike","Mittelalter","Hochmittelalter","Feudaljapan","Neuzeit","Mittelerde","Silmarillion","Westeros"];

function CastleGrid({castles,onSelect,scores,filter,setFilter,epochFilter,setEpochFilter,regionFilter,setRegionFilter,search,setSearch}){
  const [hov,setHov]=useState(null);
  const [sortBy,setSortBy]=useState("default");

  const filtered=useMemo(()=>{
    let arr=castles.filter(c=>{
      if(filter!=="all"&&c.type!==filter)return false;
      if(epochFilter&&c.epoch!==epochFilter)return false;
      if(regionFilter&&c.region!==regionFilter)return false;
      if(search&&!c.name.toLowerCase().includes(search.toLowerCase())&&!c.loc.toLowerCase().includes(search.toLowerCase()))return false;
      return true;
    });
    if(sortBy==="score") arr=[...arr].sort((a,b)=>avg(b)-avg(a));
    else if(sortBy==="epoch") arr=[...arr].sort((a,b)=>EPOCH_ORDER.indexOf(a.epoch)-EPOCH_ORDER.indexOf(b.epoch));
    else if(sortBy==="name") arr=[...arr].sort((a,b)=>a.name.localeCompare(b.name));
    return arr;
  },[castles,filter,epochFilter,regionFilter,search,sortBy]);

  const grouped=useMemo(()=>{
    if(sortBy!=="default")return null;
    const g={};
    filtered.forEach(c=>{if(!g[c.region])g[c.region]=[];g[c.region].push(c);});
    return g;
  },[filtered,sortBy]);

  const CastleCard=({c})=>{
    const sc=avg(c),hs=scores[c.id],isH=hov===c.id;
    const cats=["walls","position","supply","garrison","morale"];
    const catLabels=["Mauern","Lage","Vers.","Garnis.","Moral"];
    const maxR=Math.max(...Object.values(c.ratings));
    const minR=Math.min(...Object.values(c.ratings));
    return(
      <button onClick={()=>onSelect(c)} onMouseEnter={()=>setHov(c.id)} onMouseLeave={()=>setHov(null)}
        style={{textAlign:"left",padding:0,background:"transparent",border:"none",cursor:"pointer",display:"block",width:"100%"}}>
        <div style={{
          position:"relative",overflow:"hidden",
          background:isH?`linear-gradient(135deg,${c.theme.bg} 0%,rgba(10,8,5,0.98) 100%)`:"rgba(255,255,255,0.018)",
          border:`1px solid ${isH?c.theme.accent+"66":"rgba(255,255,255,0.05)"}`,
          borderRadius:"8px",transition:"all .2s ease",
          transform:isH?"translateY(-3px)":"none",
          boxShadow:isH?`0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${c.theme.accent}22, inset 0 1px 0 rgba(255,255,255,0.04)`:"none",
        }}>
          {/* Accent top strip */}
          <div style={{height:"2px",background:`linear-gradient(90deg,${c.theme.accent},${c.theme.accent}00)`,opacity:isH?0.9:0.3,transition:"opacity .2s"}}/>
          {/* Type badge */}
          <div style={{position:"absolute",top:"8px",right:"8px",padding:"1px 5px",borderRadius:"2px",fontSize:"10px",letterSpacing:"1px",
            background:c.type==="real"?"rgba(40,70,25,0.45)":"rgba(50,30,80,0.5)",
            color:c.type==="real"?"#5a8a38":"#9977cc",
            border:`1px solid ${c.type==="real"?"rgba(60,100,35,0.4)":"rgba(80,50,130,0.4)"}`}}>
            {c.type==="real"?"⚜":"✦"}
          </div>
          {hs&&<div style={{position:"absolute",top:"7px",left:"8px",fontSize:"13px",filter:"drop-shadow(0 1px 3px rgba(0,0,0,0.6))"}}>{hs.won?"✅":"❌"}</div>}
          <div style={{padding:"12px 12px 10px"}}>
            {/* Icon + Score circle */}
            <div style={{display:"flex",alignItems:"flex-start",gap:"8px",marginBottom:"9px"}}>
              <div style={{fontSize:"26px",lineHeight:1,filter:isH?"drop-shadow(0 2px 6px rgba(0,0,0,0.6))":"none",transition:"filter .2s",flexShrink:0}}>{c.icon}</div>
              <div style={{flex:1}}/>
              <div style={{flexShrink:0,position:"relative",width:"36px",height:"36px"}}>
                <svg width="36" height="36" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5"/>
                  <circle cx="18" cy="18" r="15" fill="none" stroke={rCol(sc)} strokeWidth="2.5"
                    strokeDasharray={`${sc*0.942} 100`} strokeLinecap="round" transform="rotate(-90 18 18)" opacity="0.85"/>
                </svg>
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:"14px",fontWeight:"bold",color:rCol(sc),fontFamily:"monospace"}}>{sc}</div>
              </div>
            </div>
            {/* Name */}
            <div style={{fontSize:"15px",fontWeight:"bold",color:isH?"#f5edd8":"#c0b090",lineHeight:1.25,marginBottom:"2px",letterSpacing:"0.2px"}}>{c.name}</div>
            <div style={{fontSize:"12px",color:isH?c.theme.accent:"#3a2a14",marginBottom:"1px",letterSpacing:"0.3px"}}>{c.sub}</div>
            <div style={{fontSize:"11px",color:"#9a8a68",marginBottom:"9px"}}>{c.loc} · {c.era}</div>
            {/* Stat bars */}
            <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
              {cats.map((k,i)=>{
                const v=c.ratings[k],isMax=v===maxR,isMin=v===minR;
                return(
                  <div key={k} style={{display:"flex",alignItems:"center",gap:"5px"}}>
                    <div style={{fontSize:"10px",color:"#9a8a68",width:"28px",flexShrink:0,letterSpacing:"0.3px"}}>{catLabels[i]}</div>
                    <div style={{flex:1,height:"2px",background:"rgba(255,255,255,0.04)",borderRadius:"1px",overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${v}%`,background:isMax?c.theme.accent:isMin?"#cc4422":rCol(v),borderRadius:"1px",opacity:isH?0.9:0.55,transition:"width .4s ease, opacity .2s"}}/>
                    </div>
                    <div style={{fontSize:"11px",color:isMax?c.theme.accent:isMin?"#884422":rCol(v),fontFamily:"monospace",width:"18px",textAlign:"right",flexShrink:0}}>{v}</div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Bottom epoch strip */}
          <div style={{padding:"5px 12px",borderTop:"1px solid rgba(255,255,255,0.04)",background:"rgba(0,0,0,0.2)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:"11px",color:isH?c.theme.accent:"#2a1a08",letterSpacing:"1px"}}>{c.epoch.toUpperCase()}</span>
            {hs?.rating&&<span style={{fontSize:"11px",color:rCol(hs.rating*10),fontFamily:"monospace"}}>{hs.rating}/10</span>}
          </div>
        </div>
      </button>
    );
  };

  return(
    <div style={{padding:"18px 20px"}}>
      {/* Filter/sort bar */}
      <div style={{display:"flex",gap:"7px",flexWrap:"wrap",marginBottom:"16px",alignItems:"center",padding:"10px 14px",background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:"6px"}}>
        <span style={{fontSize:"14px",fontWeight:"bold",color:"#e0d0b0",letterSpacing:"0.5px",marginRight:"2px"}}>⚔️ Alle Festungen</span>
        <div style={{height:"16px",width:"1px",background:"rgba(255,255,255,0.08)",margin:"0 1px"}}/>
        {[{k:"all",l:"Alle"},{k:"real",l:"⚜ Historisch"},{k:"fantasy",l:"✦ Fantasy"}].map(f=>(
          <button key={f.k} onClick={()=>setFilter(f.k)} style={{padding:"3px 9px",fontSize:"12px",letterSpacing:"1px",background:filter===f.k?"rgba(201,168,76,0.12)":"transparent",border:`1px solid ${filter===f.k?"rgba(201,168,76,0.35)":"rgba(255,255,255,0.07)"}`,color:filter===f.k?"#c9a84c":"#3a2a10",borderRadius:"3px",cursor:"pointer",transition:"all .14s"}}>{f.l}</button>
        ))}
        <div style={{height:"16px",width:"1px",background:"rgba(255,255,255,0.08)",margin:"0 1px"}}/>
        <select value={epochFilter} onChange={e=>setEpochFilter(e.target.value)} style={{padding:"3px 7px",background:"rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.08)",color:"#6a5a30",fontSize:"12px",borderRadius:"3px",outline:"none",fontFamily:"inherit"}}>
          <option value="">Alle Epochen</option>{epochs.map(e=><option key={e} value={e}>{e}</option>)}
        </select>
        <select value={regionFilter} onChange={e=>setRegionFilter(e.target.value)} style={{padding:"3px 7px",background:"rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.08)",color:"#6a5a30",fontSize:"12px",borderRadius:"3px",outline:"none",fontFamily:"inherit"}}>
          <option value="">Alle Regionen</option>{regions.map(r=><option key={r} value={r}>{REGION_LABELS[r]||r}</option>)}
        </select>
        <div style={{height:"16px",width:"1px",background:"rgba(255,255,255,0.08)",margin:"0 1px"}}/>
        {[{k:"default",l:"Gruppiert"},{k:"score",l:"↓ Score"},{k:"epoch",l:"Chronol."},{k:"name",l:"A–Z"}].map(s=>(
          <button key={s.k} onClick={()=>setSortBy(s.k)} style={{padding:"3px 7px",fontSize:"11px",letterSpacing:"1px",background:sortBy===s.k?"rgba(201,168,76,0.08)":"transparent",border:`1px solid ${sortBy===s.k?"rgba(201,168,76,0.25)":"rgba(255,255,255,0.05)"}`,color:sortBy===s.k?"#c9a84c":"#2a1a08",borderRadius:"3px",cursor:"pointer"}}>{s.l}</button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",gap:"7px",alignItems:"center"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Burg suchen…" style={{padding:"4px 8px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",color:"#a09070",fontSize:"12px",borderRadius:"3px",outline:"none",width:"95px",fontFamily:"inherit"}}/>
          <span style={{fontSize:"12px",color:"#9a8a68",fontFamily:"monospace"}}>{filtered.length}/{castles.length}</span>
        </div>
      </div>

      {/* Cards — grouped or flat */}
      {grouped
        ? Object.entries(grouped).sort(([a],[b])=>{const o=["europa","nahost","ostasien","suedostasien","mittelerde","westeros"];return o.indexOf(a)-o.indexOf(b);}).map(([region,cards])=>(
          <div key={region} style={{marginBottom:"22px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px",paddingBottom:"6px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
              <span style={{fontSize:"12px",fontWeight:"bold",color:"#9a8860",letterSpacing:"1px"}}>{REGION_LABELS[region]||region.toUpperCase()}</span>
              <span style={{fontSize:"12px",color:"#9a8a68"}}>{cards.length} Festungen</span>
              <div style={{flex:1,height:"1px",background:"rgba(255,255,255,0.03)"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(162px,1fr))",gap:"8px"}}>
              {cards.map(c=><CastleCard key={c.id} c={c}/>)}
            </div>
          </div>
        ))
        : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(162px,1fr))",gap:"8px"}}>
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
  const bot=useRef(null);

  const reset=useCallback(()=>{
    setMsgs([{role:"assistant",text:`**BELAGERUNG BEGINNT: ${castle.name}**\n\nIch bin **${castle.defender||"der Burgherr"}**.\n\n*${castle.siegeCtx}*\n${general?`\n*Dein General: ${general.name} — ${general.specialty}*`:""}\n${season?`*Jahreszeit: ${season.emoji} ${season.name} — ${season.desc}*`:""}\n\nDie Burg steht. Was ist dein erster Zug?`,type:"sys"}]);
    setTurn(0);setOutcome(null);setJournal([]);
  },[castle.id,general?.id,season?.id]);

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
    setJournal(j=>[...j,{turn:t,action:act,event:evnt?.t}]);
    setMsgs(m=>[...m,{role:"user",text:`**ZUG ${t}:** ${act}${evnt?`\n\n*⚡ EREIGNIS: ${evnt.e} ${evnt.t} — ${evnt.txt}*`:""}`}]);
    setLoading(true);
    const hist=msgs.filter(m=>m.type!=="sys").map(m=>({role:m.role,content:m.text}));
    const genBonus=general?`\nAngreifer-General: ${general.name} (${general.specialty})`:"";
    const seasonPen=season?`\nJahreszeit: ${season.name} — Boni: ${JSON.stringify(season.bonuses)} Malus: ${JSON.stringify(season.penalties)}`:"";
    try{
      const data=await callClaude({model:"claude-sonnet-4-20250514",max_tokens:600,
        system:`Du spielst ${castle.defender||"den Burgherrn"} der ${castle.name} verteidigt (${castle.era}).${genBonus}${seasonPen}
STÄRKEN: ${castle.strengths.join("; ")}. SCHWÄCHEN: ${castle.weaknesses.join("; ")}.
Reagiere als Verteidiger in 1. Person, dramatisch, historisch akkurat, 80-130 Wörter Deutsch.
${evnt?`Das aktuelle Ereignis "${evnt.t}" beeinflusst die Situation.`:""}
Nach 5-9 Zügen bei guter Strategie: "**[GEFALLEN]**", bei schlechter: "**[GEHALTEN]**".`,
        messages:[...hist,{role:"user",content:`ZUG ${t}: ${act}${evnt?` [EREIGNIS: ${evnt.t}]`:""}`}]});
      let reply;
      if(!data){
        // Fallback: pick response based on turn number
        const pool=t<=2?ROLEPLAY_RESPONSES.early:t<=5?ROLEPLAY_RESPONSES.middle:ROLEPLAY_RESPONSES.late;
        reply=pool[Math.floor(Math.random()*pool.length)];
      } else {
        reply=data.content?.map(b=>b.text||"").join("")||"Keine Antwort.";
      }
      const fell=reply.includes("[GEFALLEN]"),held=reply.includes("[GEHALTEN]");
      setMsgs(m=>[...m,{role:"assistant",text:reply.replace(/\*\*\[GEFALLEN\]\*\*|\*\*\[GEHALTEN\]\*\*/g,"").trim()}]);
      if(fell){setOutcome("v");if(onScore)onScore(castle.id,true,t);}
      else if(held){setOutcome("d");if(onScore)onScore(castle.id,false,t);}
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

      {outcome&&<div style={{padding:"13px",marginBottom:"9px",textAlign:"center",background:outcome==="v"?"rgba(25,75,15,.18)":"rgba(90,15,8,.18)",border:`1px solid ${outcome==="v"?"rgba(40,110,20,.32)":"rgba(120,20,10,.32)"}`,borderRadius:"4px"}}>
        <div style={{fontSize:"22px",marginBottom:"4px"}}>{outcome==="v"?"🏴":"🛡️"}</div>
        <div style={{fontSize:"14px",fontWeight:"bold",color:outcome==="v"?"#8aaa68":"#cc5544"}}>{outcome==="v"?"BURG EINGENOMMEN!":"BURG GEHALTEN!"}</div>
        <div style={{fontSize:"13px",color:"#b09a70",marginTop:"2px"}}>{turn} Züge · {castle.name}</div>
        <button onClick={reset} style={{marginTop:"8px",padding:"5px 13px",background:"rgba(201,168,76,0.09)",border:"1px solid rgba(201,168,76,0.22)",color:"#c9a84c",borderRadius:"3px",cursor:"pointer",fontSize:"13px"}}>Neu starten</button>
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
        <div style={{display:"flex",gap:"3px",flexWrap:"wrap",marginBottom:"6px"}}>{qas.map((q,i)=><button key={i} onClick={()=>setInput(q)} style={{fontSize:"12px",padding:"2px 7px",background:"rgba(201,168,76,0.03)",border:"1px solid rgba(201,168,76,0.09)",color:"#3a2a16",borderRadius:"8px",cursor:"pointer"}}>{q.slice(0,32)}…</button>)}</div>
        <div style={{display:"flex",gap:"5px"}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Dein Angriffszug…" style={{flex:1,padding:"7px 10px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(201,168,76,0.13)",borderRadius:"4px",color:"#e8d8b0",fontSize:"14px",outline:"none",fontFamily:"inherit"}}/>
          <button onClick={send} disabled={loading||!input.trim()} style={{padding:"7px 12px",background:input.trim()&&!loading?"rgba(130,35,8,.18)":"rgba(255,255,255,.02)",border:`1px solid ${input.trim()&&!loading?"rgba(130,35,8,.36)":"rgba(255,255,255,.05)"}`,color:input.trim()&&!loading?"#cc5533":"#1a0e08",borderRadius:"4px",cursor:"pointer",fontSize:"13px"}}>⚔</button>
        </div>
      </>}
    </div>
  );
}

// ── Siege Simulator ────────────────────────────────────────────────────────
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
      <div style={{padding:"9px 12px",background:"rgba(130,60,8,.07)",border:"1px solid rgba(130,60,8,.16)",borderRadius:"4px",marginBottom:"12px",fontSize:"14px",color:"#7a6038",lineHeight:1.7}}>
        <strong style={{color:"#c9a84c",display:"block",marginBottom:"1px"}}>⚔️ SIMULATOR · {TOTAL_RES} PUNKTE</strong>{castle.siegeCtx}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
        <span style={{fontSize:"11px",color:"#9a8a68",letterSpacing:"2px"}}>RESSOURCEN VERTEILEN</span>
        <span style={{fontSize:"15px",fontWeight:"bold",color:used===TOTAL_RES?"#8aaa68":"#c9a84c"}}>{used}/{TOTAL_RES}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"5px",marginBottom:"12px"}}>
        {Object.entries(RES).map(([k,r])=>{
          const seasonBonus=season?.bonuses?.[k]||0,seasonPen=season?.penalties?.[k]||0;
          const genBonus=general?.bonus?.[k]||0;
          return(
            <div key={k} style={{padding:"7px 9px",background:"rgba(255,255,255,.016)",border:`1px solid ${alloc[k]>0?`${r.c}28`:"rgba(255,255,255,.03)"}`,borderRadius:"3px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
                <div style={{fontSize:"12px",color:alloc[k]>0?r.c:"#2a1a14"}}>{r.i} {r.l}</div>
                <div style={{display:"flex",gap:"3px",alignItems:"center"}}>
                  {genBonus!==0&&<span style={{fontSize:"11px",color:genBonus>0?"#8aaa68":"#cc5544"}}>{genBonus>0?"+":""}{genBonus}</span>}
                  {seasonBonus>0&&<span style={{fontSize:"11px",color:"#88cc44"}}>+{seasonBonus}</span>}
                  {seasonPen<0&&<span style={{fontSize:"11px",color:"#cc4433"}}>{seasonPen}</span>}
                  <div style={{fontSize:"15px",fontWeight:"bold",color:alloc[k]>0?r.c:"#1a0a00"}}>{alloc[k]}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:"2px"}}>{[0,1,2,3,4,5].map(v=><button key={v} onClick={()=>change(k,v)} style={{flex:1,height:"10px",borderRadius:"2px",border:"none",cursor:"pointer",background:v<=alloc[k]?r.c:"rgba(255,255,255,0.03)",opacity:v<=alloc[k]?1:.26,transition:"all .08s"}}/>)}</div>
            </div>
          );
        })}
      </div>
      <button onClick={run} disabled={loading||used<3} style={{width:"100%",padding:"9px",fontSize:"13px",letterSpacing:"1px",background:used>=3&&!loading?"rgba(160,60,12,.16)":"rgba(255,255,255,.018)",border:`1px solid ${used>=3&&!loading?"rgba(160,60,12,.36)":"rgba(255,255,255,.04)"}`,color:used>=3&&!loading?"#dd7744":"#1a0e08",borderRadius:"4px",cursor:used>=3?"pointer":"not-allowed"}}>
        {loading?"⏳ Belagerung läuft…":"⚔️ BELAGERUNG STARTEN"}
      </button>
      {result&&<div style={{marginTop:"12px",padding:"12px",background:result.success?"rgba(22,70,12,.1)":"rgba(85,12,7,.1)",border:`1px solid ${result.success?"rgba(35,95,18,.22)":"rgba(105,18,10,.22)"}`,borderRadius:"4px"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
          <div><div style={{fontSize:"11px",letterSpacing:"2px",color:result.success?"#5aaa42":"#cc3322",marginBottom:"2px"}}>{result.success?"✅ ERFOLG":"❌ GESCHEITERT"}</div><div style={{fontSize:"12px",fontWeight:"bold",color:"#f0e0c0"}}>{result.title}</div>{result.daysElapsed&&<div style={{fontSize:"12px",color:"#b09a70",marginTop:"1px"}}>~{result.daysElapsed} Tage</div>}</div>
          <div style={{textAlign:"center"}}><div style={{fontSize:"22px",fontWeight:"bold",color:rCol(result.rating*10)}}>{result.rating}</div><div style={{fontSize:"11px",color:"#9a8a68"}}>/10</div></div>
        </div>
        <div style={{fontSize:"14px",color:"#6a5038",lineHeight:1.75,marginBottom:"8px"}}>{result.outcome}</div>
        {result.keyMoment&&<div style={{padding:"7px 9px",background:"rgba(0,0,0,.22)",borderLeft:"3px solid rgba(201,168,76,.28)",borderRadius:"2px",fontSize:"13px",color:"#cbb888",lineHeight:1.8,marginBottom:"8px"}}>{result.keyMoment}</div>}
        {result.phases?.length>0&&<div style={{marginBottom:"8px"}}>{result.phases.map((p,i)=><div key={i} style={{fontSize:"13px",color:"#c0a878",padding:"2px 0",borderBottom:"1px solid rgba(255,255,255,.02)",display:"flex",gap:"5px"}}><span style={{color:"#c9a84c",flexShrink:0}}>{i+1}.</span>{p}</div>)}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"7px",marginBottom:"7px"}}>
          {result.whatWorked?.length>0&&<div><div style={{fontSize:"11px",color:"#3a7022",letterSpacing:"2px",marginBottom:"3px"}}>FUNKTIONIERTE</div>{result.whatWorked.map((w,i)=><div key={i} style={{fontSize:"12px",color:"#2a5518",padding:"1px 0"}}>✓ {w}</div>)}</div>}
          {result.mistakes?.length>0&&<div><div style={{fontSize:"11px",color:"#702a18",letterSpacing:"2px",marginBottom:"3px"}}>FEHLER</div>{result.mistakes.map((m,i)=><div key={i} style={{fontSize:"12px",color:"#5a2010",padding:"1px 0"}}>✗ {m}</div>)}</div>}
        </div>
        {result.generalBonus&&<div style={{fontSize:"12px",color:"#4a4030",fontStyle:"italic",borderTop:"1px solid rgba(255,255,255,0.03)",paddingTop:"5px",marginBottom:"3px"}}>⚔️ {result.generalBonus}</div>}
        {result.seasonEffect&&<div style={{fontSize:"12px",color:"#3a4030",fontStyle:"italic"}}>🌿 {result.seasonEffect}</div>}
        {result.historicalParallel&&<div style={{fontSize:"12px",color:"#9a8a68",fontStyle:"italic",marginTop:"4px"}}>📜 {result.historicalParallel}</div>}
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
      if(!apiData){setRes(WHATIF_FALLBACKS[Math.floor(Math.random()*WHATIF_FALLBACKS.length)]);}
      else{setRes(JSON.parse(apiData.content?.map(b=>b.text||"").join("").replace(/```json|```/g,"").trim()));}
    }catch{setRes({likelihood:5,outcome:"Fehler",analysis:"",wouldHaveFallen:false,keyFactor:"",timeChange:"",historicalParallels:[],confidence:"niedrig"});}
    setLoading(false);
  };
  return(
    <div>
      <div style={{padding:"9px 12px",background:"rgba(50,60,100,.08)",border:"1px solid rgba(70,80,140,.2)",borderRadius:"4px",marginBottom:"12px",fontSize:"14px",color:"#7a8ab0",lineHeight:1.7}}>
        <strong style={{color:"#8899cc",display:"block",marginBottom:"1px"}}>🌀 WAS WÄRE WENN…</strong>Kontrafaktische Analyse: Wie hätte sich die Geschichte geändert?
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"3px",marginBottom:"9px"}}>
        {presets.map((p,i)=><button key={i} onClick={()=>setScen(p)} style={{fontSize:"12px",padding:"3px 8px",background:scen===p?"rgba(136,153,204,.12)":"rgba(255,255,255,.018)",border:`1px solid ${scen===p?"rgba(136,153,204,.3)":"rgba(255,255,255,.05)"}`,color:scen===p?"#8899cc":"#3a3a5a",borderRadius:"9px",cursor:"pointer"}}>{p.length>52?p.slice(0,50)+"…":p}</button>)}
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
            <div style={{fontSize:"11px",color:"#2a2a40"}}>PLAUSIB.</div>
          </div>
        </div>
        <div style={{fontSize:"14px",color:"#5a5a80",lineHeight:1.8,marginBottom:"8px",fontStyle:"italic",borderLeft:"3px solid rgba(136,153,204,.22)",paddingLeft:"9px"}}>{res.analysis}</div>
        {res.keyFactor&&<div style={{padding:"6px 9px",background:"rgba(136,153,204,.06)",border:"1px solid rgba(136,153,204,.1)",borderRadius:"3px",marginBottom:"7px",fontSize:"13px",color:"#6a6a8a"}}><strong style={{color:"#8899cc"}}>Entscheidend:</strong> {res.keyFactor}</div>}
        {res.timeChange&&<div style={{fontSize:"12px",color:"#4a4a60",marginBottom:"5px"}}>⏱ {res.timeChange}</div>}
        {res.historicalParallels?.length>0&&<div><div style={{fontSize:"11px",color:"#2a2a48",letterSpacing:"2px",marginBottom:"3px"}}>PARALLELEN</div>{res.historicalParallels.map((p,i)=><div key={i} style={{fontSize:"12px",color:"#3a3a58",padding:"1px 0",display:"flex",gap:"5px"}}><span style={{color:"#8899cc"}}>›</span>{p}</div>)}</div>}
      </div>}
    </div>
  );
}

// ── AI Advisor ─────────────────────────────────────────────────────────────
function AIAdvisor({castle}){
  const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const bot=useRef(null);
  useEffect(()=>{setMsgs([{role:"assistant",text:`**${castle.name}** — bereit.\nStärken: ${castle.strengths.slice(0,2).join(", ")}.\nKritische Schwachstelle: ${castle.weaknesses[0]}.\nFrag mich alles über diese Festung.`}]);},[castle.id]);
  useEffect(()=>{bot.current?.scrollIntoView({behavior:"smooth"});},[msgs]);
  const send=async()=>{
    if(!input.trim()||loading)return;
    const um=input.trim();setInput("");
    setMsgs(m=>[...m,{role:"user",text:um}]);setLoading(true);
    try{
      const apiData=await callClaude({model:"claude-sonnet-4-20250514",max_tokens:700,system:`Brillanter Militärstratege und Historiker. Analysiere "${castle.name}" (${castle.sub}, ${castle.era}, ${castle.loc}). Stärken: ${castle.strengths.join("; ")}. Schwächen: ${castle.weaknesses.join("; ")}. Geschichte: ${castle.history}. Fazit: ${castle.verdict}. Antworte präzise auf Deutsch, 100-180 Wörter, meinungsstark, historische Präzision.`,messages:[...msgs.filter((_,i)=>i>0).map(m=>({role:m.role,content:m.text})),{role:"user",content:um}]});
      const reply=!apiData?`${castle.name} ist eine bemerkenswerte Festung ihrer Zeit. ${castle.verdict} Die wichtigste Schwachstelle: ${castle.weaknesses[0]}. Tipp: ${castle.attackTips[0]}.`:apiData.content?.map(b=>b.text||"").join("")||"Keine Antwort.";
      setMsgs(m=>[...m,{role:"assistant",text:reply}]);
    }catch{setMsgs(m=>[...m,{role:"assistant",text:"Verbindungsfehler."}]);}
    setLoading(false);
  };
  const qs=["Schnellster Weg zur Einnahme?","Wie als Verteidiger reagieren?","Was hätte man besser gebaut?","Historische Parallelen?","Wie würde moderne Armee angreifen?","Was war der kritischste Moment der echten Belagerung?"];
  return(
    <div style={{display:"flex",flexDirection:"column",height:"380px"}}>
      <div style={{flex:1,overflowY:"auto",marginBottom:"8px"}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",gap:"6px",marginBottom:"8px",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
            {m.role==="assistant"&&<div style={{width:"20px",height:"20px",borderRadius:"50%",flexShrink:0,background:`${castle.theme.accent}18`,border:`1px solid ${castle.theme.accent}38`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",marginTop:"2px"}}>⚔️</div>}
            <div style={{maxWidth:"87%",padding:"6px 10px",background:m.role==="user"?"rgba(201,168,76,0.06)":"rgba(255,255,255,0.02)",border:`1px solid ${m.role==="user"?"rgba(201,168,76,0.12)":"rgba(255,255,255,0.04)"}`,borderRadius:m.role==="user"?"9px 9px 3px 9px":"9px 9px 9px 3px",fontSize:"14px",color:m.role==="user"?"#e8d8b0":"#7a6a52",lineHeight:1.75}}>
              {m.text.split("**").map((p,j)=>j%2===1?<strong key={j} style={{color:castle.theme.accent}}>{p}</strong>:<span key={j}>{p}</span>)}
            </div>
          </div>
        ))}
        {loading&&<div style={{display:"flex",gap:"6px"}}><div style={{width:"20px",height:"20px",borderRadius:"50%",background:`${castle.theme.accent}18`,border:`1px solid ${castle.theme.accent}38`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px"}}>⚔️</div><div style={{padding:"6px 10px",background:"rgba(255,255,255,0.02)",borderRadius:"9px 9px 9px 3px",display:"flex",gap:"3px",alignItems:"center"}}>{[0,1,2].map(i=><div key={i} style={{width:"4px",height:"4px",borderRadius:"50%",background:castle.theme.accent,animation:"bounce 1.2s ease infinite",animationDelay:`${i*.2}s`}}/>)}</div></div>}
        <div ref={bot}/>
      </div>
      <div style={{display:"flex",gap:"3px",flexWrap:"wrap",marginBottom:"5px"}}>{qs.map((q,i)=><button key={i} onClick={()=>setInput(q)} style={{fontSize:"12px",padding:"2px 7px",background:`${castle.theme.accent}07`,border:`1px solid ${castle.theme.accent}16`,color:"#b09a70",borderRadius:"8px",cursor:"pointer"}}>{q}</button>)}</div>
      <div style={{display:"flex",gap:"5px"}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Frage stellen…" style={{flex:1,padding:"6px 10px",background:"rgba(255,255,255,.04)",border:`1px solid ${castle.theme.accent}1a`,borderRadius:"4px",color:"#e8d8b0",fontSize:"14px",outline:"none",fontFamily:"inherit"}}/>
        <button onClick={send} disabled={loading||!input.trim()} style={{padding:"6px 12px",background:input.trim()&&!loading?`${castle.theme.accent}16`:"rgba(255,255,255,.02)",border:`1px solid ${input.trim()&&!loading?castle.theme.accent+"32":"rgba(255,255,255,.05)"}`,color:input.trim()&&!loading?castle.theme.accent:"#1a0e08",borderRadius:"4px",cursor:"pointer",fontSize:"13px"}}>⚔</button>
      </div>
    </div>
  );
}

// ── Builder ────────────────────────────────────────────────────────────────
function CastleBuilder(){
  const [sel,setSel]=useState([]);const [res,setRes]=useState(null);const [loading,setLoading]=useState(false);const [name,setName]=useState("Meine Burg");
  const spent=sel.reduce((a,id)=>{const e=BUILDER.find(b=>b.id===id);return a+(e?.cost||0);},0);
  const rem=BUILDER_BUDGET-spent;
  const tD=Math.min(100,sel.reduce((a,id)=>{const e=BUILDER.find(b=>b.id===id);return a+(e?.def||0);},0));
  const tS=Math.min(100,sel.reduce((a,id)=>{const e=BUILDER.find(b=>b.id===id);return a+(e?.sup||0);},0));
  const tP=Math.min(100,sel.reduce((a,id)=>{const e=BUILDER.find(b=>b.id===id);return a+(e?.pos||0);},0));
  const toggle=(id)=>{const e=BUILDER.find(b=>b.id===id);if(sel.includes(id)){setSel(s=>s.filter(x=>x!==id));setRes(null);}else if(rem>=(e?.cost||0)){setSel(s=>[...s,id]);setRes(null);}};
  const analyze=async()=>{
    if(sel.length<2)return;setLoading(true);setRes(null);
    const els=sel.map(id=>BUILDER.find(b=>b.id===id)).filter(Boolean);
    try{
      const apiData=await callClaude({model:"claude-sonnet-4-20250514",max_tokens:900,messages:[{role:"user",content:`Mittelalterlicher Militärarchitekt.\nBURG "${name}": ${els.map(e=>`${e.l}: ${e.desc}`).join("; ")}.\nBudget: ${spent}/${BUILDER_BUDGET}. Def:${tD} Ver:${tS} Pos:${tP}.\nNUR JSON:\n{"overallRating":1-100,"stars":1-5,"strengths":["s1","s2","s3"],"weaknesses":["w1","w2"],"bestAttack":"1-2 Sätze","historicalComp":"ähnliche Burg+Grund","improvements":["v1","v2"],"flavorText":"poetische Beschreibung 2 Sätze","era":"typische Epoche","worstVulnerability":"schlimmste Schwachstelle"}`}]});
      if(!apiData){setRes({overallRating:Math.round((tD+tS+tP)/3),stars:Math.ceil((tD+tS+tP)/3/20),strengths:els.slice(0,3).map(e=>e.l),weaknesses:["KI-Analyse nicht verfügbar","Ohne API-Key keine Details"],bestAttack:"Attackiere die schwächste Zone direkt.",historicalComp:"Vergleich nicht verfügbar.",improvements:["API Key für detaillierte Analyse"],flavorText:`${name} — eine Festung die Respekt verdient.`,era:"Mittelalter",worstVulnerability:"Unbekannt ohne KI-Analyse"});}
      else{setRes(JSON.parse(apiData.content?.map(b=>b.text||"").join("").replace(/```json|```/g,"").trim()));}
    }catch{setRes({overallRating:50,stars:3,strengths:["Fehler"],weaknesses:["Verbindungsfehler"],bestAttack:"",historicalComp:"",improvements:[],flavorText:"",era:""});}
    setLoading(false);
  };
  return(
    <div>
      <div style={{marginBottom:"10px",display:"flex",gap:"8px",alignItems:"center"}}>
        <input value={name} onChange={e=>setName(e.target.value)} style={{flex:1,padding:"7px 10px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(201,168,76,.16)",color:"#e8d8b0",fontSize:"13px",borderRadius:"4px",outline:"none",fontFamily:"inherit"}} placeholder="Name deiner Burg…"/>
        <div style={{padding:"5px 10px",background:"rgba(0,0,0,.28)",border:"1px solid rgba(255,255,255,.05)",borderRadius:"4px",fontSize:"14px",fontWeight:"bold",color:rem<=0?"#8aaa68":"#c9a84c",whiteSpace:"nowrap"}}>💰 {rem}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"5px",marginBottom:"9px"}}>
        {[{l:"Verteidigung",v:tD},{l:"Versorgung",v:tS},{l:"Position",v:tP}].map(s=>(
          <div key={s.l} style={{textAlign:"center",padding:"7px 4px",background:"rgba(255,255,255,.018)",border:"1px solid rgba(255,255,255,.03)",borderRadius:"4px"}}>
            <div style={{fontSize:"17px",fontWeight:"bold",color:rCol(s.v)}}>{s.v}</div>
            <div style={{fontSize:"11px",color:"#8a7a60",letterSpacing:"1px",marginTop:"1px"}}>{s.l.toUpperCase()}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px",marginBottom:"9px",maxHeight:"300px",overflowY:"auto"}}>
        {BUILDER.map(el=>{const isS=sel.includes(el.id),canA=rem>=(el.cost)||isS;return(
          <button key={el.id} onClick={()=>toggle(el.id)} style={{padding:"7px 9px",textAlign:"left",background:isS?"rgba(201,168,76,0.07)":"rgba(255,255,255,0.016)",border:`1px solid ${isS?"rgba(201,168,76,0.26)":canA?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.016)"}`,borderRadius:"4px",cursor:canA?"pointer":"not-allowed",opacity:canA?1:.3,transition:"all .1s"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"1px"}}><div style={{fontSize:"13px",color:isS?"#e0c878":"#4a3a28"}}>{el.i} {el.l}</div><div style={{fontSize:"12px",fontWeight:"bold",color:isS?"#c9a84c":"#1a0e08"}}>💰{el.cost}</div></div>
            <div style={{fontSize:"11px",color:"#8a7a60",lineHeight:1.4}}>{el.desc}</div>
            {isS&&<div style={{display:"flex",gap:"4px",marginTop:"2px"}}>{el.def>0&&<span style={{fontSize:"10px",color:"#cc7744"}}>🛡+{el.def}</span>}{el.sup>0&&<span style={{fontSize:"10px",color:"#4488cc"}}>📦+{el.sup}</span>}{el.pos>0&&<span style={{fontSize:"10px",color:"#88aa44"}}>⛰+{el.pos}</span>}</div>}
          </button>);})}
      </div>
      <button onClick={analyze} disabled={loading||sel.length<2} style={{width:"100%",padding:"8px",fontSize:"13px",letterSpacing:"1px",background:sel.length>=2&&!loading?"rgba(60,110,45,.14)":"rgba(255,255,255,.016)",border:`1px solid ${sel.length>=2&&!loading?"rgba(60,110,45,.28)":"rgba(255,255,255,.04)"}`,color:sel.length>=2&&!loading?"#7aaa62":"#1a1a0e",borderRadius:"4px",cursor:sel.length>=2?"pointer":"not-allowed"}}>
        {loading?"⏳ Analysiere…":`🏰 "${name}" ANALYSIEREN`}
      </button>
      {res&&<div style={{marginTop:"10px",padding:"12px",background:"rgba(255,255,255,.016)",border:"1px solid rgba(201,168,76,.1)",borderRadius:"4px"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px",alignItems:"flex-start"}}>
          <div><div style={{fontSize:"12px",fontWeight:"bold",color:"#e0d0a0"}}>{name}</div>{res.era&&<div style={{fontSize:"12px",color:"#b09a70",marginTop:"1px"}}>Typisch: {res.era}</div>}</div>
          <div style={{textAlign:"center"}}><div style={{fontSize:"19px",fontWeight:"bold",color:rCol(res.overallRating)}}>{res.overallRating}</div><div style={{fontSize:"15px",color:"#c9a84c"}}>{"⭐".repeat(res.stars||3)}</div></div>
        </div>
        {res.flavorText&&<div style={{fontSize:"13px",color:"#c0a878",fontStyle:"italic",lineHeight:1.8,marginBottom:"8px",borderLeft:"3px solid rgba(201,168,76,.2)",paddingLeft:"8px"}}>{res.flavorText}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"8px"}}>
          <div><div style={{fontSize:"10px",color:"#3a6a22",letterSpacing:"2px",marginBottom:"3px"}}>STÄRKEN</div>{res.strengths?.map((s,i)=><div key={i} style={{fontSize:"12px",color:"#2a5018",padding:"1px 0"}}>✓ {s}</div>)}</div>
          <div><div style={{fontSize:"10px",color:"#6a2a18",letterSpacing:"2px",marginBottom:"3px"}}>SCHWÄCHEN</div>{res.weaknesses?.map((w,i)=><div key={i} style={{fontSize:"12px",color:"#4a1810",padding:"1px 0"}}>✗ {w}</div>)}</div>
        </div>
        {res.worstVulnerability&&<div style={{padding:"6px 9px",background:"rgba(110,18,6,.09)",border:"1px solid rgba(110,18,6,.16)",borderRadius:"3px",marginBottom:"6px",fontSize:"12px",color:"#5a2a18"}}><strong style={{color:"#bb4422",display:"block",marginBottom:"1px"}}>Kritischste Schwachstelle:</strong>{res.worstVulnerability}</div>}
        {res.bestAttack&&<div style={{padding:"6px 9px",background:"rgba(100,15,6,.08)",border:"1px solid rgba(100,15,6,.14)",borderRadius:"3px",marginBottom:"6px",fontSize:"12px",color:"#5a2818",lineHeight:1.7}}><strong style={{color:"#aa3322",display:"block",marginBottom:"1px"}}>Angreifbar durch:</strong>{res.bestAttack}</div>}
        {res.historicalComp&&<div style={{fontSize:"12px",color:"#9a8a68",fontStyle:"italic",borderTop:"1px solid rgba(255,255,255,.03)",paddingTop:"5px"}}>📜 {res.historicalComp}</div>}
      </div>}
    </div>
  );
}

// ── Compare ────────────────────────────────────────────────────────────────
function Compare({castles,init}){
  const [p,setP]=useState([init.id,castles.find(c=>c.id!==init.id)?.id]);
  const c1=castles.find(c=>c.id===p[0]),c2=castles.find(c=>c.id===p[1]);
  const cats=[{k:"walls",l:"Mauern"},{k:"supply",l:"Versorgung"},{k:"position",l:"Lage"},{k:"garrison",l:"Garnison"},{k:"morale",l:"Moral"}];
  const ss={padding:"5px 9px",background:"rgba(0,0,0,.3)",border:"1px solid rgba(201,168,76,.12)",color:"#b09060",borderRadius:"3px",fontSize:"13px",width:"100%",outline:"none",fontFamily:"inherit"};
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:"8px",marginBottom:"12px",alignItems:"center"}}>
        <select value={p[0]} onChange={e=>setP([e.target.value,p[1]])} style={ss}>{castles.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select>
        <div style={{color:"#8a7a60",fontSize:"14px"}}>vs</div>
        <select value={p[1]} onChange={e=>setP([p[0],e.target.value])} style={ss}>{castles.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select>
      </div>
      {c1&&c2&&(<div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 36px 1fr",gap:"5px",textAlign:"center",marginBottom:"10px"}}>
          <div><div style={{fontSize:"17px"}}>{c1.icon}</div><div style={{fontSize:"13px",fontWeight:"bold",color:"#c0b090"}}>{c1.name}</div><div style={{fontSize:"18px",fontWeight:"bold",color:rCol(avg(c1))}}>{avg(c1)}</div></div>
          <div/>
          <div><div style={{fontSize:"17px"}}>{c2.icon}</div><div style={{fontSize:"13px",fontWeight:"bold",color:"#c0b090"}}>{c2.name}</div><div style={{fontSize:"18px",fontWeight:"bold",color:rCol(avg(c2))}}>{avg(c2)}</div></div>
        </div>
        {cats.map(cat=>{const v1=c1.ratings[cat.k],v2=c2.ratings[cat.k],w=v1>v2?"l":v2>v1?"r":"t";return(
          <div key={cat.k} style={{marginBottom:"6px"}}>
            <div style={{fontSize:"11px",color:"#8a7a60",letterSpacing:"2px",textAlign:"center",marginBottom:"2px"}}>{cat.l.toUpperCase()}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 18px 1fr",gap:"3px",alignItems:"center"}}>
              <div style={{display:"flex",justifyContent:"flex-end",gap:"3px",alignItems:"center"}}><span style={{fontSize:"12px",fontWeight:"bold",color:rCol(v1)}}>{v1}</span><div style={{height:"4px",width:`${v1*.55}px`,maxWidth:"55px",background:rCol(v1),borderRadius:"2px 0 0 2px",opacity:w==="l"?1:.25}}/></div>
              <div style={{textAlign:"center",fontSize:"12px",color:w==="t"?"#c9a84c":"#1a0e08"}}>{w==="l"?"◀":w==="r"?"▶":"="}</div>
              <div style={{display:"flex",gap:"3px",alignItems:"center"}}><div style={{height:"4px",width:`${v2*.55}px`,maxWidth:"55px",background:rCol(v2),borderRadius:"0 2px 2px 0",opacity:w==="r"?1:.25}}/><span style={{fontSize:"12px",fontWeight:"bold",color:rCol(v2)}}>{v2}</span></div>
            </div>
          </div>);})}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginTop:"10px"}}>
          <div style={{padding:"9px",background:`${c1.theme.glow}`,border:`1px solid ${c1.theme.accent}22`,borderRadius:"4px"}}>
            <RadarChart castle={c1}/>
          </div>
          <div style={{padding:"9px",background:`${c2.theme.glow}`,border:`1px solid ${c2.theme.accent}22`,borderRadius:"4px"}}>
            <RadarChart castle={c2}/>
          </div>
        </div>
        <div style={{marginTop:"8px",padding:"8px",textAlign:"center",background:"rgba(201,168,76,.03)",border:"1px solid rgba(201,168,76,.08)",borderRadius:"4px",fontSize:"13px",color:"#cbb888"}}>
          {avg(c1)===avg(c2)?"⚖️ Gleichstand — verschiedene Stärken":`${avg(c1)>avg(c2)?c1.icon+" "+c1.name:c2.icon+" "+c2.name} gewinnt (+${Math.abs(avg(c1)-avg(c2))})`}
        </div>
      </div>)}
    </div>
  );
}

// ── Timeline ───────────────────────────────────────────────────────────────
function Timeline({castles,onSelect}){
  const sorted=[...castles].sort((a,b)=>a.year-b.year);
  const minY=Math.min(...castles.map(c=>c.year)),maxY=Math.max(...castles.map(c=>c.year)),range=maxY-minY||1;
  return(
    <div style={{padding:"18px"}}>
      <div style={{fontSize:"14px",fontWeight:"bold",color:"#f0e6cc",marginBottom:"12px"}}>📅 Chronologischer Zeitstrahl</div>
      <div style={{position:"relative",height:"130px",marginBottom:"6px"}}>
        <div style={{position:"absolute",top:"63px",left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(201,168,76,.4),transparent)"}}/>
        {sorted.map((c,i)=>{
          const pct=((c.year-minY)/range)*100,isUp=i%2===0;
          return(
            <button key={c.id} onClick={()=>onSelect(c)} title={`${c.name} · ${c.era}`} style={{position:"absolute",left:`${pct}%`,top:isUp?"4px":"68px",transform:"translateX(-50%)",background:"transparent",border:"none",cursor:"pointer",padding:0}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"1px"}}>
                {isUp&&<div style={{fontSize:"11px",color:"#b09a70",whiteSpace:"nowrap",maxWidth:"60px",overflow:"hidden",textOverflow:"ellipsis",textAlign:"center"}}>{c.name}</div>}
                <div style={{fontSize:"13px",padding:"2px",background:`${c.theme.accent}12`,border:`1px solid ${c.theme.accent}28`,borderRadius:"50%",width:"24px",height:"24px",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>{c.icon}</div>
                {!isUp&&<div style={{fontSize:"11px",color:"#b09a70",whiteSpace:"nowrap",maxWidth:"60px",overflow:"hidden",textOverflow:"ellipsis",textAlign:"center"}}>{c.name}</div>}
                <div style={{fontSize:"10px",color:"#8a7a60",fontFamily:"monospace"}}>{c.year>0?c.year:`${Math.abs(c.year)}v`}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px",color:"#8a7a60",fontFamily:"monospace",marginBottom:"18px"}}>
        <span>{minY>0?`${minY} n.Chr.`:`${Math.abs(minY)} v.Chr.`}</span>
        <span>{maxY>0?`${maxY} n.Chr.`:`${Math.abs(maxY)} v.Chr.`}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:"5px"}}>
        {sorted.map(c=>(
          <button key={c.id} onClick={()=>onSelect(c)} style={{padding:"8px 10px",textAlign:"left",background:"rgba(255,255,255,.016)",border:"1px solid rgba(255,255,255,.035)",borderRadius:"4px",cursor:"pointer",display:"flex",gap:"8px",alignItems:"center",transition:"all .12s"}}>
            <span style={{fontSize:"16px"}}>{c.icon}</span>
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:"13px",fontWeight:"bold",color:"#9a8860",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</div><div style={{fontSize:"11px",color:"#8a7a60"}}>{c.era}</div></div>
            <div style={{fontSize:"14px",fontWeight:"bold",color:rCol(avg(c)),flexShrink:0}}>{avg(c)}</div>
          </button>
        ))}
      </div>
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

function Highscores({scores,onSelect}){
  const entries=Object.entries(scores).map(([id,s])=>{
    const c=CASTLES.find(x=>x.id===id);
    return c?{...s,id,name:c.name,icon:c.icon,castle:c}:null;
  }).filter(Boolean).sort((a,b)=>b.rating-a.rating);

  const total=entries.length;
  const wins=entries.filter(e=>e.won).length;
  const avgRating=total?Math.round(entries.reduce((a,e)=>a+e.rating,0)/total):0;
  const hardest=entries.filter(e=>!e.won).sort((a,b)=>b.castle.ratings.walls-a.castle.ratings.walls)[0];
  const easiest=entries.filter(e=>e.won).sort((a,b)=>a.rating-b.rating)[0];

  if(!total) return(
    <div style={{padding:"40px",textAlign:"center"}}>
      <div style={{fontSize:"32px",marginBottom:"10px"}}>🏆</div>
      <div style={{fontSize:"12px",color:"#b09a70",marginBottom:"6px"}}>Noch keine Belagerungen.</div>
      <div style={{fontSize:"13px",color:"#9a8a68"}}>Starte den Simulator oder das Rollenspiel um Scores zu sammeln.</div>
    </div>
  );

  return(
    <div style={{padding:"18px 20px"}}>
      <div style={{fontSize:"16px",fontWeight:"bold",color:"#f0e6cc",marginBottom:"14px"}}>🏆 Belagerungs-Chronik</div>
      {/* Stats summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"8px",marginBottom:"18px"}}>
        {[
          {l:"Belagerungen",v:total,c:"#c9a84c"},
          {l:"Eingenommen",v:wins,c:"#8aaa68"},
          {l:"Gescheitert",v:total-wins,c:"#cc5544"},
          {l:"Ø Bewertung",v:avgRating+"/10",c:rCol(avgRating*10)},
        ].map(s=>(
          <div key={s.l} style={{padding:"10px 8px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"4px",textAlign:"center"}}>
            <div style={{fontSize:"18px",fontWeight:"bold",color:s.c}}>{s.v}</div>
            <div style={{fontSize:"11px",color:"#9a8a68",letterSpacing:"1px",marginTop:"2px"}}>{s.l.toUpperCase()}</div>
          </div>
        ))}
      </div>
      {/* Win rate bar */}
      <div style={{marginBottom:"16px",padding:"10px 12px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"4px"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px",fontSize:"12px",color:"#b09a70"}}>
          <span>SIEGESQUOTE</span><span style={{color:rCol(wins/total*100)}}>{Math.round(wins/total*100)}%</span>
        </div>
        <div style={{height:"5px",background:"rgba(255,255,255,0.04)",borderRadius:"3px",overflow:"hidden"}}>
          <div style={{height:"100%",width:`${wins/total*100}%`,background:`linear-gradient(90deg,#8aaa68,#c9a84c)`,borderRadius:"3px",transition:"width 0.8s ease"}}/>
        </div>
        {hardest&&<div style={{marginTop:"8px",fontSize:"12px",color:"#b09a70"}}>Härtester Gegner: <span style={{color:"#cc5544"}}>{hardest.icon} {hardest.name}</span></div>}
        {easiest&&<div style={{marginTop:"2px",fontSize:"12px",color:"#b09a70"}}>Leichtester Sieg: <span style={{color:"#8aaa68"}}>{easiest.icon} {easiest.name}</span></div>}
      </div>
      {/* Entries */}
      <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
        {entries.map((e,i)=>(
          <div key={e.id}
            onClick={()=>onSelect&&onSelect(e.castle)}
            style={{display:"flex",gap:"10px",padding:"10px 12px",
              background:e.won?"rgba(20,60,12,0.1)":"rgba(80,12,7,0.1)",
              border:`1px solid ${e.won?"rgba(35,95,18,0.18)":"rgba(100,15,8,0.18)"}`,
              borderRadius:"4px",alignItems:"center",cursor:onSelect?"pointer":"default",transition:"all 0.12s"}}>
            <div style={{fontSize:"12px",fontWeight:"bold",
              color:i===0?"#c9a84c":i===1?"#888":i===2?"#8a5520":"#1a0e08",
              width:"18px",textAlign:"center",flexShrink:0}}>{i+1}</div>
            <div style={{fontSize:"18px",flexShrink:0}}>{e.icon}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:"14px",fontWeight:"bold",color:"#b09870",marginBottom:"1px"}}>{e.name}</div>
              <div style={{fontSize:"12px",color:e.won?"#4a7a32":"#7a2a18",display:"flex",gap:"8px"}}>
                <span>{e.won?"✅ Eingenommen":"❌ Gehalten"}</span>
                {e.turns>0&&<span>· {e.turns} {typeof e.turns==="number"&&e.turns>20?"Tage":"Züge"}</span>}
              </div>
            </div>
            {/* Mini rating bar */}
            <div style={{display:"flex",gap:"1px",flexShrink:0}}>
              {Array.from({length:10},(_,j)=>(
                <div key={j} style={{width:"4px",height:"14px",borderRadius:"1px",background:j<e.rating?rCol(e.rating*10):"rgba(255,255,255,0.04)"}}/>
              ))}
            </div>
            <div style={{textAlign:"center",flexShrink:0}}>
              <div style={{fontSize:"14px",fontWeight:"bold",color:rCol(e.rating*10)}}>{e.rating}</div>
              <div style={{fontSize:"10px",color:"#8a7a60"}}>/10</div>
            </div>
          </div>
        ))}
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
  const facts=LEXIKON_FACTS[castle.id]||[];
  const [loading,setLoading]=useState(false);
  const [extraFact,setExtraFact]=useState(null);
  const [question,setQuestion]=useState("");

  const getFact=async()=>{
    setLoading(true);setExtraFact(null);
    try{
      const data=await callClaude({model:"claude-sonnet-4-20250514",max_tokens:400,messages:[{role:"user",content:`Nenne einen außergewöhnlichen, wenig bekannten historischen Fakt über "${castle.name}" (${castle.era}, ${castle.loc}). Der Fakt soll überraschend, präzise und fesselnd sein. Antwort auf Deutsch, 2-3 Sätze, kein Markdown.`}]});
      setExtraFact(d.content?.map(b=>b.text||"").join("")||"");
    }catch{setExtraFact("Verbindungsfehler.");}
    setLoading(false);
  };

  const askQuestion=async()=>{
    if(!question.trim())return;
    setLoading(true);setExtraFact(null);
    const q=question.trim();setQuestion("");
    try{
      const data=await callClaude({model:"claude-sonnet-4-20250514",max_tokens:500,messages:[{role:"user",content:`Historiker über "${castle.name}" (${castle.era}, ${castle.loc}). Kontext: ${castle.history}. Frage: ${q}. Antworte präzise auf Deutsch, 2-4 Sätze.`}]});
      setExtraFact(d.content?.map(b=>b.text||"").join("")||"");
    }catch{setExtraFact("Verbindungsfehler.");}
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
  const [scores,setScores]=useState({});
  const [general,setGeneral]=useState(null);
  const [season,setSeason]=useState(SEASONS[0]);
  const [showSetup,setShowSetup]=useState(false);

  const addScore=useCallback((castleId,won,r)=>{
    setScores(s=>({...s,[castleId]:{won,rating:r||5,turns:r||0,ts:Date.now()}}));
  },[]);

  const go=(c)=>{setSel(c);setTab("detail");setDtab("map");setAttackMode(false);};

  const sideFiltered=useMemo(()=>CASTLES.filter(c=>{
    if(filter!=="all"&&c.type!==filter)return false;
    if(epochFilter&&c.epoch!==epochFilter)return false;
    if(regionFilter&&c.region!==regionFilter)return false;
    if(search&&!c.name.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  }),[filter,epochFilter,regionFilter,search]);

  const sc=avg(sel);
  const DTABS=[{id:"map",l:"🗺 Karte"},{id:"stats",l:"📊 Wertung"},{id:"roleplay",l:"🎭 Belagerung"},{id:"simulator",l:"⚔️ Simulator"},{id:"whatif",l:"🌀 Was wäre wenn"},{id:"ai",l:"🤖 Berater"},{id:"compare",l:"⚡ Vergleich"},{id:"history",l:"📜 Geschichte"},{id:"lexikon",l:"📚 Lexikon"}];
  const NAVTABS=[{id:"overview",l:"🏰 Übersicht"},{id:"worldmap",l:"🌍 Karte"},{id:"detail",l:`${sel.icon} ${sel.name.split(" ")[0]}`},{id:"tournament",l:"🗡️ Turnier"},{id:"build",l:"🏗️ Bauen"},{id:"timeline",l:"📅 Zeit"},{id:"highscores",l:"🏆 Scores"}];

  return(
    <div style={{minHeight:"100vh",background:"#060504",color:"#e8dcc8",fontFamily:"'Palatino Linotype','Book Antiqua',Georgia,serif",display:"flex",flexDirection:"column"}}>
      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:#080604}
        ::-webkit-scrollbar-thumb{background:#2a1808;border-radius:2px}
        input::placeholder{color:#180e04}
        select option{background:#100c06;color:#c0a070}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-4px)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pf{0%{opacity:.85;transform:scale(1)}100%{opacity:0;transform:scale(2.5)}}
        @keyframes pulse{0%,100%{opacity:0.3;r:5}50%{opacity:0.6;r:7}}
      `}</style>

      {/* ── HEADER ── */}
      <header style={{height:"46px",display:"flex",alignItems:"stretch",borderBottom:"1px solid rgba(201,168,76,0.07)",background:"rgba(5,4,3,0.99)",position:"sticky",top:0,zIndex:300,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:"7px",padding:"0 12px",borderRight:"1px solid rgba(255,255,255,0.04)",flexShrink:0}}>
          <span style={{fontSize:"14px"}}>⚔️</span>
          <span style={{fontSize:"14px",fontWeight:"bold",color:"#f0e6cc",letterSpacing:"2px",whiteSpace:"nowrap"}}>BELAGERUNGS-ATLAS</span>
          <span style={{fontSize:"12px",color:"#b09a70",borderLeft:"1px solid rgba(255,255,255,0.05)",paddingLeft:"7px"}}>{CASTLES.length} Burgen</span>
        </div>
        <div style={{display:"flex",height:"100%",flex:1,overflowX:"auto"}}>
          {NAVTABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{height:"100%",padding:"0 12px",background:"transparent",border:"none",borderBottom:`2px solid ${tab===t.id?"#c9a84c":"transparent"}`,color:tab===t.id?"#c9a84c":"#2a1a08",cursor:"pointer",fontSize:"13px",letterSpacing:"0.5px",transition:"all .14s",marginBottom:"-1px",whiteSpace:"nowrap"}}>{t.l}</button>
          ))}
        </div>
        {/* Setup button */}
        <button onClick={()=>setShowSetup(s=>!s)} style={{padding:"0 12px",background:showSetup?"rgba(201,168,76,0.08)":"transparent",border:"none",borderBottom:`2px solid ${showSetup?"#c9a84c":"transparent"}`,borderLeft:"1px solid rgba(255,255,255,0.04)",color:showSetup?"#c9a84c":"#2a1a08",cursor:"pointer",fontSize:"13px",whiteSpace:"nowrap",marginBottom:"-1px"}}>
          ⚙️ {general?general.emoji:""} {season?.emoji||""}
        </button>
      </header>

      {/* ── SETUP PANEL ── */}
      {showSetup&&(
        <div style={{background:"rgba(8,6,4,0.98)",borderBottom:"1px solid rgba(201,168,76,0.1)",padding:"12px 14px",display:"flex",gap:"16px",flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:"11px",color:"#b09a70",letterSpacing:"2px",marginBottom:"5px"}}>⚔️ GENERAL</div>
            <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
              <button onClick={()=>setGeneral(null)} style={{padding:"3px 8px",fontSize:"12px",background:!general?"rgba(201,168,76,0.08)":"rgba(255,255,255,0.02)",border:`1px solid ${!general?"rgba(201,168,76,0.25)":"rgba(255,255,255,0.05)"}`,color:!general?"#c9a84c":"#2a1a0a",borderRadius:"2px",cursor:"pointer"}}>Keiner</button>
              {GENERALS.map(g=>(
                <button key={g.id} onClick={()=>setGeneral(g===general?null:g)} title={g.bio} style={{padding:"3px 8px",fontSize:"12px",background:general?.id===g.id?"rgba(201,168,76,0.08)":"rgba(255,255,255,0.02)",border:`1px solid ${general?.id===g.id?"rgba(201,168,76,0.25)":"rgba(255,255,255,0.05)"}`,color:general?.id===g.id?"#c9a84c":"#2a1a0a",borderRadius:"2px",cursor:"pointer"}}>
                  {g.emoji} {g.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{fontSize:"11px",color:"#b09a70",letterSpacing:"2px",marginBottom:"5px"}}>🌿 JAHRESZEIT</div>
            <div style={{display:"flex",gap:"4px"}}>
              {SEASONS.map(s=>(
                <button key={s.id} onClick={()=>setSeason(s)} title={s.desc} style={{padding:"3px 8px",fontSize:"12px",background:season?.id===s.id?"rgba(201,168,76,0.08)":"rgba(255,255,255,0.02)",border:`1px solid ${season?.id===s.id?"rgba(201,168,76,0.25)":"rgba(255,255,255,0.05)"}`,color:season?.id===s.id?"#c9a84c":"#2a1a0a",borderRadius:"2px",cursor:"pointer"}}>
                  {s.emoji} {s.name}
                </button>
              ))}
            </div>
          </div>
          {general&&<div style={{padding:"6px 10px",background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"4px",fontSize:"13px",color:"#cbb888"}}>
            <strong style={{color:general?"#c9a84c":"#3a2a14"}}>{general.emoji} {general.name}</strong> — {general.specialty}<br/>
            <span style={{fontSize:"12px",color:"#b09a70"}}>{Object.entries(general.bonus).map(([k,v])=>`${k} +${v}`).join(" · ")}</span>
          </div>}
        </div>
      )}

      {/* ── OVERVIEW ── */}
      {tab==="overview"&&<div style={{flex:1,overflowY:"auto"}}>
        <CastleGrid castles={CASTLES} onSelect={go} scores={scores} filter={filter} setFilter={setFilter} epochFilter={epochFilter} setEpochFilter={setEpochFilter} regionFilter={regionFilter} setRegionFilter={setRegionFilter} search={search} setSearch={setSearch}/>
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
      {tab==="highscores"&&<div style={{flex:1,overflowY:"auto"}}><Highscores scores={scores} onSelect={go}/></div>}

      {/* ── DETAIL ── */}
      {tab==="detail"&&(
        <div style={{display:"flex",flex:1,overflow:"hidden"}}>
          {/* Sidebar */}
          <aside style={{width:sideOpen?"195px":"40px",flexShrink:0,transition:"width .2s ease",borderRight:"1px solid rgba(201,168,76,0.05)",background:"rgba(0,0,0,0.16)",overflowY:"auto",overflowX:"hidden"}}>
            <button onClick={()=>setSideOpen(e=>!e)} style={{width:"100%",padding:"6px",background:"transparent",border:"none",borderBottom:"1px solid rgba(255,255,255,0.02)",color:"#8a7a60",cursor:"pointer",fontSize:"14px",textAlign:sideOpen?"right":"center"}}>{sideOpen?"◀":"▶"}</button>
            {sideFiltered.map(c=>{const a=avg(c),isA=sel.id===c.id,hs=scores[c.id];return(
              <button key={c.id} onClick={()=>{setSel(c);setDtab("map");setAttackMode(false);}} title={c.name}
                style={{width:"100%",textAlign:"left",padding:sideOpen?"6px 8px":"6px",background:isA?c.theme.glow:"transparent",border:"none",borderLeft:`2px solid ${isA?c.theme.accent:"transparent"}`,borderBottom:"1px solid rgba(255,255,255,0.018)",cursor:"pointer",display:"flex",gap:"5px",alignItems:"center",transition:"all .09s"}}>
                <span style={{fontSize:"13px",flexShrink:0}}>{c.icon}</span>
                {sideOpen&&<><div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"12px",fontWeight:"bold",color:isA?"#f0e6cc":"#5a4a30",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</div>
                  <div style={{fontSize:"10px",color:c.type==="real"?"#1a4010":"#1a1a48"}}>{c.type==="real"?"⚜":"✦"} {c.epoch}</div>
                </div>
                <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"1px"}}>
                  <span style={{fontSize:"12px",fontWeight:"bold",color:rCol(a)}}>{a}</span>
                  {hs&&<span style={{fontSize:"10px",color:hs.won?"#4a7a32":"#7a2a18"}}>{hs.won?"✅":"❌"}</span>}
                </div></>}
              </button>
            );})}
          </aside>

          {/* Main detail area */}
          <main style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column"}}>
            {/* Castle header */}
            <div style={{padding:"13px 16px 10px",borderBottom:"1px solid rgba(201,168,76,0.05)",background:`linear-gradient(135deg,${sel.theme.bg} 0%,rgba(6,5,4,0.9) 100%)`,flexShrink:0}}>
              <div style={{display:"flex",gap:"10px",alignItems:"flex-start"}}>
                <div style={{fontSize:"30px",width:"48px",height:"48px",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:`${sel.theme.accent}12`,border:`1px solid ${sel.theme.accent}24`,borderRadius:"4px"}}>{sel.icon}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:"4px",alignItems:"center",marginBottom:"2px",flexWrap:"wrap"}}>
                    <span style={{fontSize:"11px",letterSpacing:"2px",padding:"1px 6px",borderRadius:"2px",background:sel.type==="real"?"rgba(40,70,25,0.18)":"rgba(40,40,90,0.18)",color:sel.type==="real"?"#5a7a38":"#6a6aaa",border:`1px solid ${sel.type==="real"?"rgba(40,70,25,0.28)":"rgba(40,40,90,0.28)"}`}}>{sel.type==="real"?"⚜ HISTORISCH":"✦ FANTASY"}</span>
                    <span style={{fontSize:"11px",color:"#8a7a60"}}>{sel.epoch} · {sel.loc} · {sel.era}</span>
                  </div>
                  <h1 style={{fontSize:"15px",fontWeight:"bold",color:"#f5edd8",margin:"0 0 1px"}}>{sel.name}</h1>
                  <div style={{fontSize:"12px",color:sel.theme.accent,marginBottom:"3px"}}>{sel.sub}</div>
                  <p style={{fontSize:"13px",color:"#b09a70",lineHeight:1.7,margin:0,maxWidth:"480px"}}>{sel.desc}</p>
                </div>
                <div style={{flexShrink:0,textAlign:"center",padding:"8px 11px",background:"rgba(0,0,0,0.35)",border:`1px solid ${sel.theme.accent}1e`,borderRadius:"4px"}}>
                  <div style={{fontSize:"20px",fontWeight:"bold",color:rCol(sc)}}>{sc}</div>
                  <div style={{fontSize:"10px",color:"#8a7a60",letterSpacing:"2px",marginTop:"1px"}}>GESAMT</div>
                  {general&&<div style={{fontSize:"12px",color:sel.theme.accent,marginTop:"2px"}}>{general.emoji}</div>}
                  {season&&<div style={{fontSize:"13px",marginTop:"1px"}}>{season.emoji}</div>}
                </div>
              </div>
            </div>

            {/* Detail tabs */}
            <div style={{display:"flex",borderBottom:"1px solid rgba(201,168,76,0.05)",background:"rgba(0,0,0,0.06)",flexShrink:0,overflowX:"auto"}}>
              {DTABS.map(t=>(
                <button key={t.id} onClick={()=>setDtab(t.id)} style={{padding:"7px 11px",background:"transparent",border:"none",borderBottom:`2px solid ${dtab===t.id?sel.theme.accent:"transparent"}`,color:dtab===t.id?sel.theme.accent:"#1a0e08",cursor:"pointer",fontSize:"12px",letterSpacing:"0.5px",transition:"all .13s",marginBottom:"-1px",whiteSpace:"nowrap"}}>{t.l}</button>
              ))}
            </div>

            {/* Detail content */}
            <div style={{flex:1,padding:"14px 16px",animation:"fadeIn .2s ease",overflowY:"auto"}}>
              {dtab==="map"&&(
                <div>
                  <div style={{marginBottom:"8px",display:"flex",gap:"6px",alignItems:"center"}}>
                    <div style={{fontSize:"11px",color:sel.theme.accent,letterSpacing:"2px"}}>🗺 GRUNDRISS — KLICKE BEREICHE AN</div>
                    <div style={{flex:1}}/>
                    <div style={{fontSize:"12px",color:"#b09a70"}}>{sel.epoch} · {sel.loc}</div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"minmax(260px,340px) 1fr",gap:"14px"}}>
                    <div>
                      <BattleMap castle={sel}/>
                    </div>
                    <div>
                      <div style={{fontSize:"11px",color:sel.theme.accent,letterSpacing:"2px",marginBottom:"6px"}}>ALLE BEREICHE</div>
                      {sel.zones.map(z=>(
                        <div key={z.id} style={{display:"flex",gap:"6px",padding:"7px 9px",marginBottom:"4px",background:"rgba(255,255,255,.013)",border:"1px solid rgba(255,255,255,.025)",borderLeft:`3px solid ${z.c}`,borderRadius:"3px"}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:"12px",fontWeight:"bold",color:"#907850",marginBottom:"2px"}}>{z.l}</div>
                            <div style={{fontSize:"11px",color:"#8a7a60",lineHeight:1.6}}>{z.d}</div>
                            <div style={{display:"flex",gap:"1px",marginTop:"3px"}}>
                              {Array.from({length:10},(_,i)=><div key={i} style={{width:"4px",height:"4px",borderRadius:"1px",background:i<z.a?rCol(z.a*10):"rgba(255,255,255,.03)"}}/>)}
                            </div>
                          </div>
                        </div>
                      ))}
                      {/* Quick stats */}
                      <div style={{marginTop:"10px",padding:"9px 11px",background:"rgba(255,255,255,0.015)",border:`1px solid ${sel.theme.accent}12`,borderRadius:"4px"}}>
                        <div style={{fontSize:"11px",color:sel.theme.accent,letterSpacing:"2px",marginBottom:"6px"}}>SCHNELLWERTUNG</div>
                        {[["Mauern",sel.ratings.walls],["Position",sel.ratings.position],["Versorgung",sel.ratings.supply]].map(([l,v])=>(
                          <div key={l} style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"4px"}}>
                            <div style={{fontSize:"11px",color:"#9a8a68",width:"52px"}}>{l}</div>
                            <div style={{flex:1,height:"3px",background:"rgba(255,255,255,0.04)",borderRadius:"2px",overflow:"hidden"}}>
                              <div style={{height:"100%",width:`${v}%`,background:rCol(v),borderRadius:"2px"}}/>
                            </div>
                            <div style={{fontSize:"12px",color:rCol(v),fontFamily:"monospace",width:"22px",textAlign:"right"}}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {dtab==="stats"&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                  <div>
                    <div style={{padding:"12px",background:"rgba(255,255,255,.016)",border:`1px solid ${sel.theme.accent}16`,borderRadius:"4px",marginBottom:"8px"}}>
                      <div style={{fontSize:"11px",color:sel.theme.accent,letterSpacing:"2px",marginBottom:"9px"}}>DEFENSIV-RATING</div>
                      <ScoreBar label="Mauerstärke" value={sel.ratings.walls} delay={0} accent={sel.theme.accent}/>
                      <ScoreBar label="Versorgung" value={sel.ratings.supply} delay={50} accent={sel.theme.accent}/>
                      <ScoreBar label="Position" value={sel.ratings.position} delay={100} accent={sel.theme.accent}/>
                      <ScoreBar label="Garnison" value={sel.ratings.garrison} delay={150} accent={sel.theme.accent}/>
                      <ScoreBar label="Moral" value={sel.ratings.morale} delay={200} accent={sel.theme.accent}/>
                      <div style={{marginTop:"9px",paddingTop:"8px",borderTop:"1px solid rgba(255,255,255,.03)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:"11px",color:"#8a7a60",letterSpacing:"2px"}}>GESAMT</span>
                        <span style={{fontSize:"16px",fontWeight:"bold",color:rCol(sc)}}>{sc}</span>
                      </div>
                    </div>
                    <div style={{padding:"10px",background:"rgba(255,255,255,.013)",border:`1px solid ${sel.theme.accent}12`,borderRadius:"4px"}}>
                      <div style={{fontSize:"11px",color:sel.theme.accent,letterSpacing:"2px",marginBottom:"6px"}}>RADAR-PROFIL</div>
                      <RadarChart castle={sel}/>
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
                    {[{t:"STÄRKEN",items:sel.strengths,c:"rgba(40,70,22,.07)",bc:"rgba(40,70,22,.13)",tc:"#3a5a1e",ic:"#4a6a28"},{t:"SCHWÄCHEN",items:sel.weaknesses,c:"rgba(80,20,10,.07)",bc:"rgba(80,20,10,.13)",tc:"#4a2010",ic:"#622a18"},{t:"ANGRIFFSTIPPS",items:sel.attackTips,c:"rgba(100,40,6,.05)",bc:"rgba(100,40,6,.1)",tc:"#5a3018",ic:"#c9a84c"}].map(g=>(
                      <div key={g.t} style={{padding:"9px 10px",background:g.c,border:`1px solid ${g.bc}`,borderRadius:"4px"}}>
                        <div style={{fontSize:"10px",color:g.ic,letterSpacing:"2px",marginBottom:"5px"}}>{g.t}</div>
                        {g.items.map((s,i)=><div key={i} style={{fontSize:"12px",color:g.tc,padding:"2px 0",borderBottom:i<g.items.length-1?"1px solid rgba(255,255,255,.018)":"none",display:"flex",gap:"4px"}}><span style={{color:g.ic,flexShrink:0}}>›</span>{s}</div>)}
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
                <div style={{maxWidth:"620px"}}>
                  {/* Timeline */}
                  <div style={{marginBottom:"16px"}}>
                    <div style={{fontSize:"11px",color:sel.theme.accent,letterSpacing:"2px",marginBottom:"10px"}}>⏳ HISTORISCHER ZEITSTRAHL</div>
                    <div style={{position:"relative",paddingLeft:"22px"}}>
                      {/* Vertical line */}
                      <div style={{position:"absolute",left:"8px",top:0,bottom:0,width:"1px",
                        background:`linear-gradient(180deg,${sel.theme.accent}55,${sel.theme.accent}22,transparent)`}}/>
                      {/* Timeline entries — built from castle data */}
                      {[
                        sel.year<0
                          ?{dot:"🏗️",label:`${Math.abs(sel.year)} v.Chr.`,text:`${sel.name} wird erbaut — ${sel.sub}.`,color:sel.theme.accent}
                          :sel.year>2000
                          ?{dot:"✦",label:`${sel.era}`,text:`${sel.name} entsteht — ${sel.sub}.`,color:sel.theme.accent}
                          :{dot:"🏗️",label:`${sel.era.split("–")[0] || sel.year}`,text:`${sel.name} wird erbaut — ${sel.sub}.`,color:sel.theme.accent},
                        {dot:"⚔️",label:"Erste Belagerungen",text:sel.strengths.slice(0,2).join(" · "),color:"#c9a84c"},
                        {dot:"📜",label:"Historischer Wendepunkt",text:sel.history,color:"#8a9a70",highlight:true},
                        {dot:"🏆",label:"Strategisches Erbe",text:sel.verdict,color:sel.theme.accent},
                        ...(sel.defender?[{dot:"🛡️",label:"Verteidiger",text:sel.defender,color:"#9a8860"}]:[]),
                      ].map((e,i)=>(
                        <div key={i} style={{position:"relative",marginBottom:"14px",paddingLeft:"14px"}}>
                          {/* Dot */}
                          <div style={{
                            position:"absolute",left:"-14px",top:"2px",
                            width:"16px",height:"16px",
                            borderRadius:"50%",
                            background:e.highlight?e.color:`${e.color}22`,
                            border:`1px solid ${e.color}66`,
                            display:"flex",alignItems:"center",justifyContent:"center",
                            fontSize:"12px",
                            boxShadow:e.highlight?`0 0 8px ${e.color}44`:"none",
                          }}>{e.dot}</div>
                          {/* Content */}
                          <div style={{
                            padding:"9px 12px",
                            background:e.highlight?`${e.color}08`:"rgba(255,255,255,0.013)",
                            border:`1px solid ${e.highlight?e.color+"28":"rgba(255,255,255,0.03)"}`,
                            borderLeft:e.highlight?`3px solid ${e.color}`:"1px solid rgba(255,255,255,0.03)",
                            borderRadius:"4px",
                          }}>
                            <div style={{fontSize:"11px",color:e.color,letterSpacing:"1.5px",marginBottom:"4px",fontWeight:"bold"}}>{e.label.toUpperCase()}</div>
                            <div style={{fontSize:"14px",color:e.highlight?"#c0b090":"#4a3a28",lineHeight:1.8}}>{e.text}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Strengths/Weaknesses summary */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"10px"}}>
                    <div style={{padding:"10px 12px",background:"rgba(40,70,22,0.07)",border:"1px solid rgba(40,70,22,0.14)",borderRadius:"4px"}}>
                      <div style={{fontSize:"11px",color:"#5a8a38",letterSpacing:"2px",marginBottom:"6px"}}>⚡ STÄRKEN</div>
                      {sel.strengths.map((s,i)=>(
                        <div key={i} style={{fontSize:"13px",color:"#3a5820",padding:"2px 0",borderBottom:i<sel.strengths.length-1?"1px solid rgba(255,255,255,0.02)":"none",display:"flex",gap:"5px"}}>
                          <span style={{color:"#5a8a38",flexShrink:0}}>›</span>{s}
                        </div>
                      ))}
                    </div>
                    <div style={{padding:"10px 12px",background:"rgba(80,20,10,0.07)",border:"1px solid rgba(80,20,10,0.14)",borderRadius:"4px"}}>
                      <div style={{fontSize:"11px",color:"#8a3a20",letterSpacing:"2px",marginBottom:"6px"}}>⚠ SCHWÄCHEN</div>
                      {sel.weaknesses.map((w,i)=>(
                        <div key={i} style={{fontSize:"13px",color:"#5a2818",padding:"2px 0",borderBottom:i<sel.weaknesses.length-1?"1px solid rgba(255,255,255,0.02)":"none",display:"flex",gap:"5px"}}>
                          <span style={{color:"#8a3a20",flexShrink:0}}>›</span>{w}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Siege Context box */}
                  <div style={{padding:"11px 13px",background:`${sel.theme.accent}07`,border:`1px solid ${sel.theme.accent}18`,borderRadius:"4px"}}>
                    <div style={{fontSize:"11px",color:sel.theme.accent,letterSpacing:"2px",marginBottom:"5px"}}>⚔️ BELAGERUNGSSZENARIO</div>
                    <p style={{fontSize:"14px",color:"#5a4828",lineHeight:1.9,margin:0,fontStyle:"italic"}}>{sel.siegeCtx}</p>
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
