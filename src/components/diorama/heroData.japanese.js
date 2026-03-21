const OUTER_YAGURA_POINTS = [
  { x: 0, z: -20, r: 1.2, h: 5.4, label: 'Aeusserer Yagura N', info: 'Noerdlicher Flankierungsturm des aeusseren Bezirks.' },
  { x: 17.4, z: -10.5, r: 1.2, h: 5.4, label: 'Aeusserer Yagura NO', info: 'Nordoestlicher Turm ueber den ersten geknickten Zugangswegen.' },
  { x: 17.2, z: 9.5, r: 1.2, h: 5.4, label: 'Aeusserer Yagura SO', info: 'Landseitiger Flankierungsturm des vorderen Bezirks.' },
  { x: 0.5, z: 19.5, r: 1.2, h: 5.4, label: 'Aeusserer Yagura S', info: 'Suedlicher Turm im weiteren Vorfeld des Burgbergs.' },
  { x: -17.2, z: 9.2, r: 1.2, h: 5.4, label: 'Aeusserer Yagura SW', info: 'Suedwestlicher Eckturm des aeusseren Rings.' },
  { x: -17.4, z: -10.2, r: 1.2, h: 5.4, label: 'Aeusserer Yagura NW', info: 'Nordwestlicher Abschluss des ersten Bezirks.' },
];

const INNER_YAGURA_POINTS = [
  { x: 0, z: -13.2, r: 1.1, h: 6.1, label: 'Mittlerer Yagura N', info: 'Noerdlicher Turm auf der mittleren Hangterrasse.' },
  { x: 11.5, z: -6.8, r: 1.1, h: 6.1, label: 'Mittlerer Yagura NO', info: 'Nordoestlicher Turm des zweiten Wehrguertels.' },
  { x: 11.2, z: 6.4, r: 1.1, h: 6.1, label: 'Mittlerer Yagura SO', info: 'Landseitiger Zwischenpunkt im zweiten Verteidigungsring.' },
  { x: 0.2, z: 13.1, r: 1.1, h: 6.1, label: 'Mittlerer Yagura S', info: 'Suedlicher Turm auf der breiteren Hangstufe.' },
  { x: -11.2, z: 6.6, r: 1.1, h: 6.1, label: 'Mittlerer Yagura SW', info: 'Suedwestlicher Turm des mittleren Bezirks.' },
  { x: -11.5, z: -6.8, r: 1.1, h: 6.1, label: 'Mittlerer Yagura NW', info: 'Nordwestturm der inneren Hangstufe.' },
];

function makeCoreYaguraPoints(rx, rz, r, h, labels, infos) {
  return [
    { x: 0, z: -rz, r, h, label: labels.n, info: infos.n },
    { x: rx, z: 0, r, h, label: labels.o, info: infos.o },
    { x: 0, z: rz, r, h, label: labels.s, info: infos.s },
    { x: -rx, z: 0, r, h, label: labels.w, info: infos.w },
  ];
}

const HIMEJI_CORE_YAGURA_POINTS = makeCoreYaguraPoints(
  7.1,
  7.2,
  1.25,
  7.0,
  {
    n: 'Hon-maru Yagura N',
    o: 'Hon-maru Yagura O',
    s: 'Hon-maru Yagura S',
    w: 'Hon-maru Yagura W',
  },
  {
    n: 'Noerdlicher Eckturm des Kernbezirks.',
    o: 'Oestlicher Eckturm des Kernbezirks.',
    s: 'Suedlicher Turm des Hauptbezirks.',
    w: 'Westlicher letzter Rueckzugspunkt vor dem Hauptturm.',
  },
);

const OSAKA_OUTER_MOAT_POINTS = [
  { x: 0, z: -18, r: 1.1, h: 5.8, label: 'Sannomaru N', info: 'Noerdlicher Abschnitt des aeusseren Verteidigungsbezirks.' },
  { x: 13.5, z: -13.5, r: 1.1, h: 5.8, label: 'Sannomaru NO', info: 'Nordoestlicher Yagura ueber dem Vorfeld der Grabenanlagen.' },
  { x: 18.5, z: 0, r: 1.15, h: 6.0, label: 'Sannomaru O', info: 'Landseitige Flankierung des grossen Ostrandes.' },
  { x: 13.5, z: 13.5, r: 1.1, h: 5.8, label: 'Sannomaru SO', info: 'Suedoestlicher Turm des aeusseren Rings.' },
  { x: 0, z: 18, r: 1.1, h: 5.8, label: 'Sannomaru S', info: 'Suedlicher Abschnitt des breiten Aussenbezirks.' },
  { x: -13.5, z: 13.5, r: 1.1, h: 5.8, label: 'Sannomaru SW', info: 'Suedwestlicher Yagura des aeusseren Rings.' },
  { x: -18.5, z: 0, r: 1.15, h: 6.0, label: 'Sannomaru W', info: 'Westlicher Flankierungspunkt zwischen Graben und Mauer.' },
  { x: -13.5, z: -13.5, r: 1.1, h: 5.8, label: 'Sannomaru NW', info: 'Nordwestlicher Turm des aeusseren Verteidigungsbandes.' },
];

const OSAKA_INNER_RING_POINTS = [
  { x: 0, z: -10.2, r: 1.25, h: 6.6, label: 'Honmaru N', info: 'Noerdlicher Kernhof-Turm ueber den massiven Ishigaki-Sockeln.' },
  { x: 8.2, z: -5.6, r: 1.2, h: 6.4, label: 'Honmaru NO', info: 'Nordoestlicher Turm des inneren Hauptbezirks.' },
  { x: 10.5, z: 0.8, r: 1.3, h: 7.0, label: 'Ote-Torfront', info: 'Landseitige Front des inneren Rings mit konzentrierter Torverteidigung.' },
  { x: 7.4, z: 7.4, r: 1.2, h: 6.4, label: 'Honmaru SO', info: 'Suedoestlicher Turm des Kernhofs.' },
  { x: 0, z: 10.8, r: 1.25, h: 6.6, label: 'Honmaru S', info: 'Suedlicher Abschnitt des innersten Wehrbandes.' },
  { x: -8.0, z: 7.0, r: 1.2, h: 6.4, label: 'Honmaru SW', info: 'Suedwestlicher Turm des Hauptbezirks.' },
  { x: -10.0, z: 0.4, r: 1.25, h: 6.8, label: 'Honmaru W', info: 'Westlicher Eckturm mit Blick in die Grabenstaffelung.' },
  { x: -7.8, z: -7.2, r: 1.2, h: 6.4, label: 'Honmaru NW', info: 'Nordwestlicher Flankierungsturm des Kernrings.' },
];

const OSAKA_CORE_YAGURA_POINTS = makeCoreYaguraPoints(
  5.8,
  6.2,
  1.2,
  7.2,
  {
    n: 'Tenshu-Kern N',
    o: 'Tenshu-Kern O',
    s: 'Tenshu-Kern S',
    w: 'Tenshu-Kern W',
  },
  {
    n: 'Noerdlicher Kernhofturm direkt unter dem Hauptturm.',
    o: 'Oestlicher Kernhofturm des Tenshu-Sockels.',
    s: 'Suedlicher Kernhofturm am oberen Steinpodium.',
    w: 'Westlicher Rueckzugspunkt des innersten Hofes.',
  },
);

const KUMAMOTO_CORE_YAGURA_POINTS = makeCoreYaguraPoints(
  6.4,
  6.8,
  1.25,
  7.1,
  {
    n: 'Karasu-Kern N',
    o: 'Karasu-Kern O',
    s: 'Karasu-Kern S',
    w: 'Karasu-Kern W',
  },
  {
    n: 'Noerdlicher Kernhofturm ueber dem steilen Ishigaki-Sockel.',
    o: 'Oestlicher Flankierungsturm des Hauptplateaus.',
    s: 'Suedlicher Kernhofturm der oberen Burgstufe.',
    w: 'Westlicher Rueckzugspunkt des innersten Hofes.',
  },
);

export const HERO_DIORAMAS_JAPANESE = {
  himeji: {
    style: 'japanese',
    fidelityLabel: 'hero-burg',
    historicalMode: 'surveyed',
    sourceConfidence: 'hoch',
    focus: { x: 2, y: 9, z: 2 },
    cameraRadius: 41,
    terrainModel: 'custom',
    notes: 'Himeji lebt nicht von einem einzigen Ring, sondern von der Choreografie des Aufstiegs. Das Diorama liest die Anlage deshalb als gestaffelten Burgberg mit geknickten Zugangswegen, Yagura-Baendern und dominantem Tenshu.',
    sources: ['UNESCO dossier for Himeji-jo', 'Japanese castle layout studies'],
    components: [
      {
        type: 'TERRAIN_STACK',
        x: 0, z: 0, y: 0,
        footprint: [
          { x: -23, z: -18 }, { x: -16, z: -24 }, { x: -2, z: -26 }, { x: 12, z: -22 }, { x: 22, z: -12 },
          { x: 24, z: 2 }, { x: 19, z: 16 }, { x: 7, z: 23 }, { x: -8, z: 22 }, { x: -20, z: 13 }, { x: -24, z: -2 },
        ],
        layers: [{ scale: 1.1, h: 1.2 }, { scale: 1.0, h: 1.0 }, { scale: 0.92, h: 0.8 }],
        label: 'Himeyama-Burgberg',
        info: 'Himeji sitzt auf dem Himeyama-Huegel, nicht auf einer flachen Buehne. Die Anlage steigt in Terrassen und Stuetzmauern an, sodass jeder naechste Hof hoeher und enger wirkt als der vorherige.',
      },
      {
        type: 'PLATEAU',
        x: 0.5, z: 0.8, y: 2.95, w: 30, d: 22, h: 0.45,
        label: 'Untere Hangterrasse',
        info: 'Die breite erste Terrasse traegt die ausgedehnten Zugangs- und Irrgartenzonen. Hier verlieren Angreifer bereits Zeit, Formation und Uebersicht.',
      },
      {
        type: 'PLATEAU',
        x: 0.2, z: 0.4, y: 5.5, w: 16, d: 13, h: 0.4,
        label: 'Oberer Kernhuegel',
        info: 'Auf der oberen Terrasse verdichtet sich die Burg zum Hon-maru. Von hier dominiert der Tenshu die gesamte Anlage und das Vorland.',
      },
      {
        type: 'SLOPE_PATH',
        x1: 18.5, z1: 16.5, x2: 10.8, z2: 8.2, y1: 0.35, y2: 2.95, w: 3.2, thick: 0.2,
        label: 'Geknickter Anmarschweg',
        info: 'Der Anmarsch nach Himeji verlief nicht frontal, sondern ueber geknickte Wege und Torfolgen. Genau diese kontrollierte Verwirrung war ein Kern der Verteidigung.',
      },
      {
        type: 'SLOPE_PATH',
        x1: 9.2, z1: 7.4, x2: 4.5, z2: 2.8, y1: 2.95, y2: 5.55, w: 2.4, thick: 0.18,
        label: 'Innerer Aufstieg',
        info: 'Je hoeher der Weg steigt, desto enger und manipulierter wird er. Die Burg fuehrt Angreifer absichtlich in einen zermuerbenden Ablauf aus Drehungen, Toren und Sichtverlusten.',
      },
      {
        type: 'RING',
        y: 0.2,
        gate: {
          atIndex: 2, w: 3.2, d: 2.5, h: 5.0,
          label: 'Hishi-no-mon',
          info: 'Eines der markantesten Tore des aeusseren Zugangs. In Himeji ist das Tor nicht bloss Oeffnung, sondern Teil eines ganzen Labyrinths aus Richtungswechseln und Feuerwinkeln.',
        },
        points: OUTER_YAGURA_POINTS,
        wall: { h: 3.8, thick: 0.75 },
      },
      {
        type: 'RING',
        y: 3.0,
        gate: {
          atIndex: 2, w: 2.8, d: 2.2, h: 5.5,
          label: 'Ni-no-mon',
          info: 'Der zweite groessere Torabschnitt zwingt Angreifer weiter in den Hang hinein. Jeder Abschnitt der Wegfuehrung fragmentiert den Angriff in kleine, kontrollierbare Kaempfe.',
        },
        points: INNER_YAGURA_POINTS,
        wall: { h: 4.8, thick: 0.85 },
      },
      {
        type: 'RING',
        y: 5.65,
        gate: {
          atIndex: 1, w: 2.5, d: 2.0, h: 6.5,
          label: 'San-no-mon',
          info: 'Im innersten Bezirk ist der Raum bereits maximal verdichtet. Wer hier ankommt, hat den eigentlichen Zweck der Burg bereits erlebt: Erschoepfung durch Choreografie.',
        },
        points: HIMEJI_CORE_YAGURA_POINTS,
        wall: { h: 5.9, thick: 1.0 },
      },
      {
        type: 'SQUARE_TOWER',
        x: 0.4, z: 0.2, w: 5.2, d: 4.7, h: 17.5, y: 5.65,
        label: 'Tenshu von Himeji',
        info: 'Der grosse Tenshu ist zugleich Symbol, Beobachtungspunkt und psychologischer Mittelpunkt der Anlage. Seine weisse Silhouette machte Himeji schon aus grosser Entfernung lesbar.',
      },
      {
        type: 'SQUARE_TOWER',
        x: -4.8, z: 3.9, w: 2.8, d: 2.2, h: 4.4, y: 5.65,
        noRoof: true,
        label: 'Verbindungsbau / Kernhof',
        info: 'Zwischen den Hauptkoerpern des innersten Bezirks liegen kleinere Hoefe und Verbindungsbauten. Gerade diese Verdichtung macht Himeji glaubwuerdig anders als westliche Ringburgen.',
      },
    ],
  },
  osaka: {
    style: 'japanese',
    fidelityLabel: 'hero-burg',
    historicalMode: 'surveyed',
    sourceConfidence: 'hoch',
    focus: { x: 1, y: 8, z: 0 },
    cameraRadius: 44,
    terrainModel: 'custom',
    notes: 'Osaka lebt von Grabenstaffelung, riesigen Steinpodien und einem kompakten Tenshu ueber dem Honmaru. Das Diorama liest die Anlage deshalb als Wasserfestung mit aufragendem Ishigaki-Kern statt als blossen Ringplan.',
    sources: ['Osaka Castle historical plans', 'Studies on Toyotomi and Tokugawa sieges of Osaka'],
    components: [
      {
        type: 'WATER_PLANE',
        x: 0, z: 0, y: 0.05, w: 54, d: 54,
        label: 'Aeusserer Wassergraben',
        info: 'Osakas breite Wassergraben machten direkte Sturmangriffe extrem teuer. 1615 war ihre politische Entschaerfung entscheidender als jede Bresche in der Mauer.',
      },
      {
        type: 'PLATEAU',
        x: 0, z: 0, y: 0.2, w: 42, d: 42, h: 0.5,
        label: 'Sannomaru-Dammzone',
        info: 'Zwischen Graben und aeusserem Mauerband lag kein leerer Rand, sondern ein kontrollierter Vorbereich mit Dammwegen, Torlinien und Artilleriestellungen.',
      },
      {
        type: 'WATER_PLANE',
        x: 0.8, z: 0.2, y: 0.95, w: 31, d: 31,
        label: 'Innerer Wassergraben',
        info: 'Die innere Grabenstaffelung trennte den eigentlichen Kernbereich vom aeusseren Hof. Solange hier Wasser stand, blieb der Honmaru schwer direkt auszunutzen.',
      },
      {
        type: 'PLATEAU',
        x: 0.6, z: 0.3, y: 1.18, w: 22.5, d: 22.5, h: 0.55,
        label: 'Honmaru-Grundplatte',
        info: 'Der Kernhof sitzt als kompakter, kuenstlich gefasster Block ueber den Grabenlinien. Schon dieser Absatz trennt Osaka klar in Aussen- und Innenwelt.',
      },
      {
        type: 'TERRAIN_STACK',
        x: 0.6, z: 0.3, y: 1.72,
        footprint: [
          { x: -8.5, z: -8.2 }, { x: -4.5, z: -10.8 }, { x: 3.2, z: -10.5 }, { x: 8.8, z: -7.6 },
          { x: 10.4, z: -1.4 }, { x: 9.1, z: 6.2 }, { x: 4.2, z: 9.3 }, { x: -3.8, z: 9.6 }, { x: -8.9, z: 6.1 }, { x: -10.2, z: -1.5 },
        ],
        layers: [{ scale: 1.08, h: 0.9 }, { scale: 1.0, h: 0.85 }, { scale: 0.9, h: 0.7 }],
        label: 'Ishigaki-Steinpodium',
        info: 'Osakas eigentliche Signatur sind die gewaltigen Steinmauern. Das Diorama staffelt den Tenshu-Sockel daher als massiven, ansteigenden Steinberg ueber dem Honmaru.',
      },
      {
        type: 'SLOPE_PATH',
        x1: 21.5, z1: 1.8, x2: 14.2, z2: 1.2, y1: 0.32, y2: 1.2, w: 3.4, thick: 0.18,
        label: 'Ote-Anmarsch',
        info: 'Der landseitige Zugang fuehrte ueber Damm und Torstaffel in die Grabenwelt hinein. Nicht der Turm, sondern die kontrollierte Annahmezone machte Osaka so schwer zu stuermen.',
      },
      {
        type: 'SLOPE_PATH',
        x1: 11.5, z1: 1.0, x2: 6.8, z2: 0.8, y1: 1.2, y2: 3.22, w: 2.4, thick: 0.18,
        label: 'Rampe zum Tenshu-Sockel',
        info: 'Der letzte Aufstieg fuehrt ueber steile Steinpodien in den Kernhof. Gerade diese aufsteigende Sequenz aus Mauern, Graben und Sockel strukturierte die Verteidigung von Osaka.',
      },
      {
        type: 'RING',
        y: 0.72,
        gate: {
          atIndex: 2, w: 3.4, d: 2.8, h: 5.8,
          label: 'Sannomaru-Torlinie',
          info: 'Der aeussere Ring bewachte nicht bloss eine Mauer, sondern die entscheidende Zone zwischen Dammweg und Wassergraben. Hier begann die eigentliche Zugriffskontrolle der Burg.',
        },
        points: OSAKA_OUTER_MOAT_POINTS,
        wall: { h: 4.0, thick: 0.8 },
      },
      {
        type: 'RING',
        y: 1.78,
        gate: {
          atIndex: 2, w: 3.0, d: 2.4, h: 6.4,
          label: 'Honmaru-Ote',
          info: 'Am inneren Ring verdichtet sich Osaka vom grossen Wasserfestungssystem zur eigentlichen Kernburg. Tokugawas Strategie zielte genau darauf, diesen Kern vor dem zweiten Angriff politisch freizulegen.',
        },
        points: OSAKA_INNER_RING_POINTS,
        wall: { h: 5.0, thick: 0.95 },
      },
      {
        type: 'RING',
        y: 3.25,
        gate: {
          atIndex: 1, w: 2.4, d: 1.9, h: 6.8,
          label: 'Tenshu-Hof',
          info: 'Der kleinste innere Hof dient vor allem der Inszenierung des Hauptturms. Im Diorama steht er als letzter gestaffelter Rueckzugsraum ueber den Steinmassen.',
        },
        points: OSAKA_CORE_YAGURA_POINTS,
        wall: { h: 5.8, thick: 0.95 },
      },
      {
        type: 'SQUARE_TOWER',
        x: 0.8, z: 0.3, w: 5.4, d: 4.9, h: 16.8, y: 3.25,
        label: 'Tenshukaku von Osaka',
        info: 'Der Hauptturm war Toyotomis Machtzeichen im Massstab einer Hauptstadt. Seine Silhouette ueber den Steinpodien machte Osaka politisch wie militaerisch zu einer Ansage.',
      },
      {
        type: 'SQUARE_TOWER',
        x: -4.2, z: -2.6, w: 2.9, d: 2.2, h: 4.2, y: 3.25,
        noRoof: true,
        label: 'Kernhofbau / Magazin',
        info: 'Neben dem Hauptturm verdichten kleinere Bauten den innersten Hof. Sie machen das Diorama weniger zu einem Solitaer und naeher an eine belebte, geschichtete Festungsplattform.',
      },
    ],
  },
  kumamoto: {
    style: 'japanese',
    fidelityLabel: 'hero-burg',
    historicalMode: 'surveyed',
    sourceConfidence: 'hoch',
    focus: { x: -1, y: 8.5, z: 1 },
    cameraRadius: 43,
    terrainModel: 'custom',
    notes: 'Kumamoto wird als schwarze, schwer zugreifbare Hangburg mit starkem Ishigaki-Profil gelesen. Das Diorama zeigt deshalb weniger breite Wassergraben als Osaka und mehr steile Steinpodien, versetzte Hoefe und einen verdichteten Kern mit separatem Uto-Turm.',
    sources: ['Kumamoto Castle restoration surveys', 'Studies on the 1877 Satsuma Rebellion siege'],
    components: [
      {
        type: 'TERRAIN_STACK',
        x: 0, z: 0, y: 0,
        footprint: [
          { x: -20, z: -18 }, { x: -12, z: -23 }, { x: 2, z: -22 }, { x: 14, z: -18 }, { x: 19, z: -9 },
          { x: 20, z: 5 }, { x: 13, z: 16 }, { x: 0, z: 20 }, { x: -12, z: 16 }, { x: -19, z: 8 }, { x: -21, z: -5 },
        ],
        layers: [{ scale: 1.08, h: 1.15 }, { scale: 1.0, h: 1.0 }, { scale: 0.94, h: 0.85 }],
        label: 'Burgberg von Kumamoto',
        info: 'Kumamoto verteilt sich ueber eine gestufte Huegelkante. Die Anlage wirkt deshalb weniger wie ein einziger Zentralberg und mehr wie mehrere zusammengezogene Verteidigungsterrassen.',
      },
      {
        type: 'PLATEAU',
        x: -1.5, z: 1.0, y: 3.05, w: 28, d: 20, h: 0.5,
        label: 'Unterer Hauptbezirk',
        info: 'Die untere Hauptstufe traegt die grossen Hofraeume und den Zugang zum Kern. Schon hier erzwingen Mauern und Sockel eine gebrochene, langsame Annaeherung.',
      },
      {
        type: 'TERRAIN_STACK',
        x: -0.8, z: 0.4, y: 3.55,
        footprint: [
          { x: -8.8, z: -9.5 }, { x: -3.6, z: -11.8 }, { x: 4.8, z: -10.6 }, { x: 9.4, z: -6.5 }, { x: 10.2, z: 0.4 },
          { x: 8.8, z: 7.2 }, { x: 3.1, z: 10.6 }, { x: -4.7, z: 10.3 }, { x: -9.0, z: 6.4 }, { x: -10.3, z: -0.8 },
        ],
        layers: [{ scale: 1.06, h: 0.95 }, { scale: 1.0, h: 0.85 }, { scale: 0.92, h: 0.72 }],
        label: 'Oberes Ishigaki-Podium',
        info: 'Der innere Kern sitzt auf hochgezogenen Steinpodien mit den beruehmten konkaven Ishigaki-Linien. Diese Sockel machen Kumamoto schon ohne Wassergraben schwer erkletterbar und fast unminierbar.',
      },
      {
        type: 'GLACIS',
        x: -0.6, z: 0.5, y: 3.45, rTop: 10.5, rBot: 13.6, h: 1.2,
        label: 'Konkaver Ishigaki-Ring',
        info: 'Der nach aussen weitende Steinsockel ueberzeichnet bewusst die konkave Wirkung der Kumamoto-Ishigaki. Er soll zeigen, warum Leitern, Haken und Minen an dieser Burg so schlecht funktionierten.',
      },
      {
        type: 'SLOPE_PATH',
        x1: 17.8, z1: 6.5, x2: 9.8, z2: 3.4, y1: 0.35, y2: 3.05, w: 3.0, thick: 0.18,
        label: 'Suedost-Anmarsch',
        info: 'Der suedostoestliche Zugang fuehrte nicht direkt auf den Tenshu, sondern in gebrochene Hof- und Mauerfolgen. Kumamoto verteidigt sich durch steile Sockel plus Richtungswechsel.',
      },
      {
        type: 'SLOPE_PATH',
        x1: 7.6, z1: 2.8, x2: 3.0, z2: 1.2, y1: 3.1, y2: 5.95, w: 2.3, thick: 0.18,
        label: 'Rampe zum Karasu-Kern',
        info: 'Der letzte Aufstieg in den Hauptkern fuehrt ueber einen engen, steilen Uebergang. Genau dort verdichten sich Sockel, Torstellung und Schusswinkel zu Kumamotos eigentlicher Nahverteidigung.',
      },
      {
        type: 'RING',
        y: 3.1,
        gate: {
          atIndex: 2, w: 3.0, d: 2.5, h: 5.9,
          label: 'Aeusseres Kernhof-Tor',
          info: 'Kumamotos aeussere Hoflinie ist weniger weit ausgreifend als Osaka, aber dichter und steiler. Jeder Angriff verliert hier Schwung, bevor er den Hauptsockel ueberhaupt beruehrt.',
        },
        points: [
          { x: 0, z: -11.8, r: 1.15, h: 5.8, label: 'Aeusserer Hof N', info: 'Noerdlicher Turm des unteren Hauptbezirks.' },
          { x: 8.8, z: -6.4, r: 1.1, h: 5.7, label: 'Aeusserer Hof NO', info: 'Nordoestlicher Flankierungsturm der unteren Stufe.' },
          { x: 11.6, z: 1.0, r: 1.2, h: 6.0, label: 'Aeusserer Hof O', info: 'Oestliche Tor- und Flankierungszone des unteren Hofes.' },
          { x: 7.4, z: 8.2, r: 1.1, h: 5.7, label: 'Aeusserer Hof SO', info: 'Suedoestlicher Turm der unteren Hofkante.' },
          { x: -0.2, z: 11.2, r: 1.15, h: 5.8, label: 'Aeusserer Hof S', info: 'Suedlicher Abschnitt der unteren Hauptstufe.' },
          { x: -8.4, z: 8.0, r: 1.1, h: 5.7, label: 'Aeusserer Hof SW', info: 'Suedwestlicher Flankierungsturm.' },
          { x: -11.0, z: 0.6, r: 1.2, h: 5.9, label: 'Aeusserer Hof W', info: 'Westliche Hofkante mit Blick auf die fallende Hangseite.' },
          { x: -8.6, z: -7.0, r: 1.1, h: 5.7, label: 'Aeusserer Hof NW', info: 'Nordwestturm des unteren Hauptbezirks.' },
        ],
        wall: { h: 4.4, thick: 0.82 },
      },
      {
        type: 'RING',
        y: 6.0,
        gate: {
          atIndex: 1, w: 2.5, d: 2.0, h: 6.7,
          label: 'Karasu-Kern',
          info: 'Am innersten Ring verschmilzt Kumamotos schwarze Silhouette mit den Ishigaki-Sockeln. Dieser Kern ist die eigentliche Kraehenburg, dicht, hoch und schwer frontal lesbar.',
        },
        points: KUMAMOTO_CORE_YAGURA_POINTS,
        wall: { h: 5.7, thick: 0.95 },
      },
      {
        type: 'SQUARE_TOWER',
        x: -0.4, z: 0.3, w: 5.1, d: 4.6, h: 16.2, y: 6.0,
        label: 'Karasu-jo Hauptturm',
        info: 'Der schwarze Hauptturm gab Kumamoto seinen Beinamen Kraehenburg. Im Diorama sitzt er als dunkler, vertikaler Kontrapunkt direkt ueber dem steilen Ishigaki-Sockel.',
      },
      {
        type: 'SQUARE_TOWER',
        x: 8.8, z: -3.6, w: 3.4, d: 2.8, h: 10.5, y: 3.2,
        label: 'Uto-Turm',
        info: 'Der Uto-Turm ist Kumamotos zweites grosses Zeichen im Grundriss. Seine Eigenstaendigkeit macht die Burg komplexer als einen blossen Tenshu-mit-Hof-Typ.',
      },
      {
        type: 'SQUARE_TOWER',
        x: -4.6, z: 3.4, w: 2.8, d: 2.2, h: 4.3, y: 6.0,
        noRoof: true,
        label: 'Innerer Magazinbau',
        info: 'Kleinere Nebengebaeude verdichten den Kernhof und unterstreichen Kumamotos Charakter als genutzte, vielschichtige Verteidigungsanlage statt isoliertem Einzelturm.',
      },
    ],
  },
};
