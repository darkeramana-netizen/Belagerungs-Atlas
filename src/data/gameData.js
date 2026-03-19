// Game data constants — extracted from App.jsx

export const TOTAL_RES = 14;

export const BUILDER_BUDGET = 24;

// Synergie-Kombinationen — Bonus wenn beide Elemente aktiv sind
export const SYNERGIES = [
  {
    id:"murder_holes", needs:["walls_thick","towers"],
    name:"Mörderische Falle", emoji:"💀",
    desc:"Dicke Mauern + Türme = Kreuzfeuer ohne toten Winkel. +15 Verteidigung.",
    bonus:{def:15},
  },
  {
    id:"water_fortress", needs:["moat","cistern"],
    name:"Wasserfestung", emoji:"🌊",
    desc:"Wassergraben + Zisternen = unabhängige Wasserversorgung. +20 Versorgung, +8 Verteidigung.",
    bonus:{def:8, sup:20},
  },
  {
    id:"iron_garrison", needs:["barracks","walls_thick"],
    name:"Eiserne Garnison", emoji:"⚔️",
    desc:"Kaserne + Dicke Mauern = kampfbereite Verteidiger hinter starken Mauern. +12 Def, +10 Moral.",
    bonus:{def:12, mor:10},
  },
  {
    id:"eyes_everywhere", needs:["towers","scouts"],
    name:"Augen überall", emoji:"👁️",
    desc:"Türme + Späher = kein Angreifer kann sich unbemerkt nähern. +20 Position.",
    bonus:{pos:20},
  },
  {
    id:"divine_protection", needs:["chapel","keep"],
    name:"Göttlicher Schutz", emoji:"✝️",
    desc:"Kapelle + Donjon = spirituelles und militärisches Zentrum vereint. +25 Moral.",
    bonus:{mor:25},
  },
  {
    id:"underground_war", needs:["tunnel_system","miners"],
    name:"Unterirdischer Krieg", emoji:"⛏️",
    desc:"Tunnelsystem + Mineure = aktive Gegenunterminierung. +18 Def.",
    bonus:{def:18},
  },
  {
    id:"fire_rain", needs:["towers","pitch_cauldrons"],
    name:"Feuerregen", emoji:"🔥",
    desc:"Türme + Pechnasen = siedendes Pech aus jeder Ecke. +22 Verteidigung.",
    bonus:{def:22},
  },
  {
    id:"naval_dominance", needs:["navy","harbor"],
    name:"Seeherrschaft", emoji:"⚓",
    desc:"Flotte + Hafen = unblockierbare Versorgung. +30 Versorgung.",
    bonus:{sup:30},
  },
  {
    id:"dragon_fortress", needs:["dragon","keep"],
    name:"Drachenfestung", emoji:"🐉",
    desc:"Drachen + Donjon = der Drache bewacht den Kern persönlich. +35 Verteidigung.",
    bonus:{def:35},
  },
  {
    id:"magical_ward", needs:["magic_ward","chapel"],
    name:"Heilige Barriere", emoji:"✨",
    desc:"Magische Wacht + Kapelle = Kombination aus weltlicher und übernatürlicher Kraft. +20 Def, +20 Moral.",
    bonus:{def:20, mor:20},
  },
];

export function getActiveSynergies(selIds){
  return SYNERGIES.filter(s=>s.needs.every(n=>selIds.includes(n)));
}

export function getSynergyBonuses(selIds){
  const active=getActiveSynergies(selIds);
  return active.reduce((acc,s)=>{
    Object.entries(s.bonus).forEach(([k,v])=>{ acc[k]=(acc[k]||0)+v; });
    return acc;
  },{});
}


// ─── SEASONS ──────────────────────────────────────────────────────────────
export const SEASONS = [
  { id:"spring", name:"Frühling", emoji:"🌱", bonuses:{cavalry:+1,supply:+1}, penalties:{},     desc:"Gute Straßen, frische Truppen." },
  { id:"summer", name:"Sommer",   emoji:"☀️",  bonuses:{archers:+1,siege:+1},  penalties:{},     desc:"Lange Tage, maximale Sicht." },
  { id:"autumn", name:"Herbst",   emoji:"🍂",  bonuses:{miners:+1},            penalties:{cavalry:-1},desc:"Weicher Boden begünstigt Mineure." },
  { id:"winter", name:"Winter",   emoji:"❄️",  bonuses:{},                    penalties:{siege:-2,cavalry:-1},desc:"Frost lähmt Belagerungsmaschinen." },
];

// ─── GENERALS ─────────────────────────────────────────────────────────────
// Verteidiger-Persönlichkeiten — beeinflussen Fallback-Antworten und Kapitulationsschwelle
export const DEFENDER_TYPES = {
  fanatiker: {
    id:"fanatiker", label:"Der Fanatiker", emoji:"😤",
    desc:"Kämpft bis zum letzten Mann. Kapituliert nie freiwillig.",
    capitulateThreshold:0,  // niemals
    responseStyle:"trotzig, religiös, unnachgiebig",
    lateResponses:[
      "Niemals! Jeder Stein dieser Burg ist geheiligt. Wir sterben hier — alle! Für Gott und König!",
      "Kapitulation? Das Wort kennt diese Burg nicht. Meine letzten zehn Männer kämpfen noch. **[GEHALTEN]**",
      "Seht ihr die Fahne noch? Sie weht. Solange sie weht, kämpfen wir. Angreifer oder nicht.",
      "Meine Männer sterben singend. Ihr habt die Burg — aber nicht uns. **[GEFALLEN]**",
    ],
  },
  pragmatiker: {
    id:"pragmatiker", label:"Der Pragmatiker", emoji:"🤔",
    desc:"Analysiert die Lage kühl. Kapituliert wenn es sinnlos wird.",
    capitulateThreshold:6,  // nach 6 Zügen Druck
    responseStyle:"sachlich, taktisch, ohne Emotionen",
    lateResponses:[
      "Die Zahlen sprechen gegen uns. Drei Tage Wasser, drei Wochen Vorräte. Ich öffne das Tor. **[GEFALLEN]**",
      "Euer General hat gut gespielt. Die Schwachstelle war bekannt — ich hätte sie früher stärken sollen. **[GEFALLEN]**",
      "Ich habe die Burg so lange verteidigt wie es rational war. Jetzt verhandle ich. Freier Abzug?",
      "Gegen bessere Logistik kämpft man nicht mit Mut. Wir halten noch — aber nicht mehr lang. **[GEHALTEN]**",
    ],
  },
  feigling: {
    id:"feigling", label:"Der Feigling", emoji:"😰",
    desc:"Verliert schnell die Nerven. Kapituliert bei erstem ernstem Druck.",
    capitulateThreshold:9,  // früh
    responseStyle:"nervös, zögernd, schnell eingeschüchtert",
    lateResponses:[
      "Ich... ich gebe auf. Bitte verschont meine Männer. Das Tor steht offen. **[GEFALLEN]**",
      "Euer Heer ist zu groß. Wir hatten keine Chance. Wir ergeben uns. **[GEFALLEN]**",
      "Meine Offiziere drohen mir. Die Moral... sie ist weg. Ich kann nicht mehr. **[GEFALLEN]**",
      "Nehmt die Burg. Nehmt alles. Nur kein Blut mehr. **[GEFALLEN]**",
    ],
  },
  stratege: {
    id:"stratege", label:"Der Stratege", emoji:"🎯",
    desc:"Klug und geduldig. Nutzt jede Schwäche des Angreifers aus.",
    capitulateThreshold:2,  // hält sehr lang
    responseStyle:"intelligent, plant mehrere Züge voraus, überraschend",
    lateResponses:[
      "Ihr habt gut gespielt — aber ich habe euch die ganze Zeit beobachtet. Meine Reserve greift jetzt an. **[GEHALTEN]**",
      "Drei Schwachstellen habt ihr attackiert. Ich habe alle drei verstärkt während ihr euch auf die vierte konzentriert habt. **[GEHALTEN]**",
      "Ich habe meinen König um Entsatz gebeten. Er ist bereits unterwegs. Wir brauchen noch 48 Stunden. **[GEHALTEN]**",
      "Euer bester General liegt verletzt. Ohne ihn bricht eure Belagerung zusammen. Ich warte. **[GEHALTEN]**",
    ],
  },
  ehrenmann: {
    id:"ehrenmann", label:"Der Ehrenmann", emoji:"⚔️",
    desc:"Kämpft mit Würde. Akzeptiert Niederlage ehrenhaft.",
    capitulateThreshold:5,
    responseStyle:"ritterlich, fair, respektvoll gegenüber dem Feind",
    lateResponses:[
      "Ihr habt ehrenhaft gekämpft. Ich tue dasselbe — die Burg fällt, aber meine Männer gehen mit erhobenem Haupt. **[GEFALLEN]**",
      "Ein fairer Kampf. Ihr habt gewonnen. Ich übergebe das Tor persönlich — mit Handschlag. **[GEFALLEN]**",
      "Drei Wochen haben wir uns tapfer gewehrt. Mehr kann ich nicht verlangen. Wir halten noch. **[GEHALTEN]**",
      "Meine Männer haben alles gegeben was ritterliche Pflicht verlangt. Wir kapitulieren mit Ehren. **[GEFALLEN]**",
    ],
  },
};

// Assign personality to each castle based on defender/history
export const CASTLE_PERSONALITIES = {
  krak:"fanatiker", masada:"fanatiker", helmsdeep:"fanatiker",
  barad_dur:"fanatiker", angband:"fanatiker", schwarzer_bergfried:"fanatiker",
  minas_tirith:"stratege", gondolin:"stratege", constantinople:"stratege",
  castle_sorrow:"stratege", gravecrest:"stratege",
  carcassonne:"pragmatiker", himeji:"pragmatiker", malbork:"pragmatiker",
  windsor:"ehrenmann", dover:"ehrenmann", beaumaris:"ehrenmann",
  chateau_gaillard:"ehrenmann", caernarvon:"ehrenmann",
  harrenhal:"feigling", bodiam:"feigling",
};

export function getDefenderType(castle){
  const key=CASTLE_PERSONALITIES[castle.id]||"pragmatiker";
  return DEFENDER_TYPES[key];
}

export const GENERALS = [
  { id:"saladin",  name:"Saladin",        emoji:"🌙", bonus:{soldiers:+2,diplomats:+2}, specialty:"Psychologische Kriegsführung", bio:"Meister der Diplomatie und des Sturmangriffs",
    ability:{name:"Diplomatischer Schachzug",emoji:"📜",desc:"Biete ehrenvollen Abzug an — 40% Chance sofortiger Kapitulation, sonst +2 Moral für Verteidiger.",cooldown:1,
      effect:"Du sendest einen Boten mit ehrenvollem Abzugsangebot. Der Burgherr zögert... seine Männer flüstern über Hunger und Hoffnungslosigkeit."}},
  { id:"caesar",   name:"Julius Caesar",  emoji:"🦅", bonus:{siege:+2,sappers:+2},      specialty:"Ingenieursbelagerung",        bio:"Erfinder moderner Belagerungstaktik",
    ability:{name:"Circumvallatio",emoji:"🔄",desc:"Vollständiger Belagerungsring — Verteidiger kann keinen Entsatz mehr erhalten für 3 Züge.",cooldown:1,
      effect:"Deine Ingenieure errichten in einer Nacht einen vollständigen Belagerungsring. Kein Bote kommt durch, kein Proviant gelangt hinein."}},
  { id:"genghis",  name:"Dschingis Khan", emoji:"🏇", bonus:{cavalry:+3,spies:+1},      specialty:"Schnelle Umgehung",           bio:"Unvergleichliche Mobilität und Schrecken",
    ability:{name:"Psychologischer Terror",emoji:"😱",desc:"Schreckensbotschaft vorausschicken — Garnison verliert sofort 30 Moral. Feigling-Verteidiger kapituliert direkt.",cooldown:1,
      effect:"Köpfe auf Speeren, Trommeln in der Nacht. Die Garnison hört die Berichte was mit anderen Burgen geschah. Schreie hinter den Mauern."}},
  { id:"vauban",   name:"Vauban",         emoji:"⛏️", bonus:{miners:+3,sappers:+2},     specialty:"Minenkrieg",                  bio:"Revolutionierte die Belagerungskunst",
    ability:{name:"Parallelen-System",emoji:"📐",desc:"Wissenschaftliche Laufgräben — nächster Sturmangriff trifft direkt die Schwachstelle. +3 Siegesbonus.",cooldown:1,
      effect:"Deine Ingenieure graben drei parallele Laufgräben in Zickzack-Muster. Nach zwei Wochen stehen deine Kanonen 50 Meter vor der Mauer."}},
  { id:"mehmed",   name:"Mehmed II.",     emoji:"🏰", bonus:{siege:+3,soldiers:+1},     specialty:"Schwere Artillerie",          bio:"Bezwinger von Konstantinopel",
    ability:{name:"Urkan-Bombardement",emoji:"💥",desc:"Konzentrierter Artilleriebeschuss — öffnet Bresche in jeder Mauer. Überspringt eine Belagerungsphase.",cooldown:1,
      effect:"Der Basalt-Kanone Ürban donnert. Die Erde bebt. Drei Stunden Dauerbeschuss auf einen Punkt — die Mauer gibt nach."}},
  { id:"richard",  name:"Richard I.",     emoji:"⚔️", bonus:{soldiers:+2,archers:+2},   specialty:"Direktsturm",                 bio:"Der Löwenherz – Meister des Frontalangriffs",
    ability:{name:"Löwenherz-Angriff",emoji:"🦁",desc:"Persönlich anführen — Richard stürmt voran. Verteidiger-Moral bricht um 40%, aber Richard riskiert Verwundung.",cooldown:1,
      effect:"Du nimmst den Schild und stürmst als Erster. Deine Männer toben vor Mut. Der Anblick ihres Königs an der Spitze — unaufhaltbar."}},
  { id:"mongke",   name:"Möngke Khan",    emoji:"🏔️", bonus:{miners:+2,cavalry:+2},     specialty:"Bergbelagerung",              bio:"Bezwang Alamut und Bagdad",
    ability:{name:"Tunnel-Netzwerk",emoji:"⛏️",desc:"Unterminierung der Fundamente — nächste Runde kollabiert ein Turm automatisch. Gilt auch bei starken Mauern.",cooldown:1,
      effect:"Deine Mineure arbeiten seit Wochen. Holzstützen an vier Punkten gleichzeitig. Auf dein Zeichen — Feuer."}},
  { id:"napoleon", name:"Napoleon",       emoji:"🎯", bonus:{siege:+2,sappers:+2,soldiers:+1},specialty:"Artilleriekonzentration",bio:"Artillerie als Gottheit des Krieges",
    ability:{name:"Massenfeuer",emoji:"🎯",desc:"Alle Kanonen auf einen Punkt — in einer Stunde wird jede mittelalterliche Mauer zur Ruine. Sofort-Bresche.",cooldown:1,
      effect:"Du ordnest konzentriertes Kreuzfeuer an. Zwanzig Kanonen, ein Ziel. Napoleon nannte Artillerie 'le dieu de la guerre' — heute beweist du es."}},
];

// ─── SIEGE EVENTS ─────────────────────────────────────────────────────────
export const SIEGE_EVENTS = [
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
  { id:"eclipse",     e:"🌑", t:"SONNENFINSTERNIS",    side:"both",     txt:"Totale Finsternis — beide Seiten in Schockstarre." },
  { id:"messenger",   e:"📯", t:"KÖNIGSBOTE",          side:"attacker", txt:"Verstärkung auf dem Weg — aber erst in 14 Tagen!" },
  { id:"sabotage",    e:"💣", t:"SABOTAGE",            side:"attacker", txt:"Spion sabotiert eine deiner Belagerungsmaschinen." },
  { id:"heroic",      e:"🗡️", t:"HELDENTAT",           side:"defender", txt:"Ein einzelner Ritter fällt aus der Burg und tötet 12 Angreifer." },
  { id:"epidemic_d",  e:"⚰️", t:"SEUCHE IN DER BURG", side:"defender", txt:"Typhus grassiert hinter den Mauern — Garrison geschwächt." },
  { id:"oracle",      e:"🔮", t:"WEISSAGUNG",          side:"both",     txt:"Ein Prophet verkündet: 'Diese Burg wird fallen, wenn...' — Psychose auf beiden Seiten." },
  // 12 neue Ereignisse
  { id:"gold_found",  e:"💰", t:"GOLDVORRAT ENTDECKT", side:"attacker", txt:"Deine Männer finden versteckten Proviant — Moral steigt sprunghaft." },
  { id:"catapult_jam",e:"⚙️", t:"KATAPULT KLEMMT",    side:"attacker", txt:"Die größte Katapulte bricht — Reparatur kostet 3 wertvolle Tage." },
  { id:"earthquake",  e:"🌋", t:"ERDBEBEN",            side:"both",     txt:"Die Erde bebt — eine Mauer bricht, aber das Lager liegt in Trümmern." },
  { id:"peace_offer", e:"🕊️", t:"FRIEDENSANGEBOT",    side:"both",     txt:"Ein Bote des Königs fordert sofortigen Waffenstillstand. Beide Seiten zögern." },
  { id:"reinforced",  e:"🛡️", t:"MAUERWERK GESTÄRKT", side:"defender", txt:"Verteidiger schütten flüssiges Blei in Mauerrisse — strukturell wesentlich stärker." },
  { id:"night_raid",  e:"🌙", t:"NACHTAUSFALL",        side:"defender", txt:"Bei Mondlosigkeit bricht ein Trupp aus — zerstört deine Vorräte." },
  { id:"river_divert",e:"💧", t:"FLUSSUMLEITUNG",      side:"attacker", txt:"Ingenieurs leiten einen Fluss um — Graben läuft leer. Direktangriff möglich!" },
  { id:"plague_both", e:"🦟", t:"PESTILENZ",           side:"both",     txt:"Eine Seuche trifft beide Seiten. Wer zuerst zusammenbricht, verliert." },
  { id:"fog_war",     e:"🌫️", t:"DICHTER NEBEL",       side:"both",     txt:"Drei Tage Nebel. Keine Bewegung, keine Sicht — aber auch kein Angriff möglich." },
  { id:"priest",      e:"✝️", t:"HEILIGER MANN",       side:"defender", txt:"Ein berühmter Priester schwört: 'Gott schützt diese Burg.' Moral der Verteidiger unzerstörbar." },
  { id:"arson",       e:"🔥", t:"BRANDPFEIL-STURM",   side:"attacker", txt:"Hunderte Brandpfeile — Holzbauten brennen, aber Steinmauern halten." },
  { id:"collapse",    e:"💥", t:"MAUERTURM KOLLABIERT",side:"defender", txt:"Ein Turm bricht spontan zusammen — Bresche im Mauerwerk. Sofortiger Angriff möglich!" },
  { id:"doublecross", e:"🤝", t:"DOPPELVERRÄTER",      side:"both",     txt:"Dein Verräter in der Burg war ein Gegenspion — alle Pläne offen gelegt." },
  { id:"starving_r",  e:"🍞", t:"HUNGERSNOT DRAUSSEN", side:"defender", txt:"Das belagernde Heer leidet unter Versorgungsmangel — Überläufer berichten von Meuterei." },
  { id:"siege_tower", e:"🗼", t:"BELAGERUNGSTURM",      side:"attacker", txt:"Ein gewaltiger Belagerungsturm erreicht die Mauern — aber Verteidiger gießen Öl!" },
  { id:"river_freeze",e:"❄️", t:"FLUSS GEFROREN",       side:"attacker", txt:"Der Graben gefriert — überquerbar! Aber das Eis hält nur kurz." },
  { id:"champion",    e:"🏆", t:"ZWEIKAMPF-ANGEBOT",   side:"both",     txt:"Der Verteidiger fordert Zweikampf — der Sieger entscheidet die Belagerung." },
  { id:"greek_fire2", e:"🌊", t:"GRIECHISCHES FEUER",  side:"defender", txt:"Flüssiges Feuer ergießt sich auf die Angreifer — verheerend aber riskant für die Burg." },
  { id:"spy_network", e:"🕸️", t:"SPIONAGE-NETZ",        side:"attacker", txt:"Dein Spionagenetz enthüllt: Die Garnison ist nur halb so groß wie gedacht!" },
  { id:"holy_relic",  e:"✨", t:"HEILIGE RELIQUIE",     side:"defender", txt:"Eine Reliquie wird von der Mauer gezeigt — Verteidiger kämpfen mit beispielloser Inbrunst." },
];

export const BUILDER = [
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

export const RES = {
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

export const WEATHER_TYPES = [
  {id:"clear",   label:"☀️ Klar",      emoji:"☀️", siegeMod:0,  defMod:0,  desc:"Ideale Kampfbedingungen."},
  {id:"rain",    label:"🌧️ Regen",     emoji:"🌧️", siegeMod:-1, defMod:+1, desc:"Belagerungsmaschinen beeinträchtigt. Verteidiger bevorzugt."},
  {id:"fog",     label:"🌫️ Nebel",     emoji:"🌫️", siegeMod:-1, defMod:-1, desc:"Sicht eingeschränkt — beide Seiten benachteiligt."},
  {id:"wind",    label:"💨 Sturm",     emoji:"💨", siegeMod:-2, defMod:0,  desc:"Pfeile ungenau, Leitern instabil. Schwerer Angriff."},
  {id:"snow",    label:"❄️ Schnee",    emoji:"❄️", siegeMod:-2, defMod:+2, desc:"Bewegung langsam, Pfade blockiert. Belagerung im Winter."},
  {id:"heat",    label:"🌡️ Hitze",     emoji:"🌡️", siegeMod:+1, defMod:-2, desc:"Heißes Öl effektiver. Verteidiger dehydriert schneller."},
  {id:"thunder", label:"⛈️ Gewitter",  emoji:"⛈️", siegeMod:-2, defMod:-1, desc:"Chaos auf beiden Seiten. Unvorhersehbare Ereignisse."},
];
