export const HERO_DIORAMAS_CRUSADER = {
  krak: {
    style: 'crusader',
    fidelityLabel: 'quellenbasiert',
    historicalMode: 'surveyed',
    sourceConfidence: 'hoch',
    focus: { x: 0, y: 8, z: 1 },
    cameraRadius: 44,
    terrainModel: 'custom',
    notes: 'Krak wird hier als Burgberg mit asymmetrischem Nordhang, massiver innerer Glacis und ansteigender Torrampe gelesen. Das Ziel ist eine glaubwuerdigere Topografie, nicht nur ein sauberer Ringplan.',
    sources: ['Paul Deschamps, Les Chateaux des Croises', 'historische Grundrisse des Krak des Chevaliers'],
    components: [
      // Burgberg des Krak removed: the procedural FBM terrain provides the natural landscape.
      // Oberes Felsplateau is restored as a TERRAIN_STACK that bridges the outer courtyard
      // plateau (y=1.98) seamlessly up to the Glacis base (y=4.92).
      {
        type: 'PLATEAU', x: 0, z: 1.2, y: 0, w: 31.5, d: 24.5, h: 1.98,
        label: 'Aeusserer Hofterrassenring',
        info: 'Der Raum zwischen den Ringen war keine rohe Boeschungsflaeche. Eine lesbare Hofterrasse stabilisiert hier den Zwinger und die Bewegungsflaechen des aeusseren Werks.',
      },
      {
        type: 'TERRAIN_STACK', x: 0.4, z: 0.1, y: 4.92,
        footprint: [
          { x: -13.6, z: -10.4 }, { x: -10.4, z: -13.2 }, { x: -1.6, z: -14.4 }, { x: 6.8, z: -13.1 },
          { x: 10.9, z: -9.1 }, { x: 11.8, z: -1.0 }, { x: 11.2, z: 7.0 }, { x: 7.8, z: 11.6 },
          { x: 0.8, z: 12.9 }, { x: -6.8, z: 11.8 }, { x: -10.8, z: 7.0 }, { x: -13.6, z: -0.6 },
        ],
        layers: [
          { scale: 1.04, h: 0.78 },
          { scale: 0.98, h: 0.74 },
          { scale: 0.93, h: 0.68 },
          { scale: 0.88, h: 0.56 },
          { scale: 0.84, h: 0.44 },
        ],
        label: 'Glacis (Massiver Steinsockel)',
        info: 'Der Krak-Sockel wird hier nicht mehr als runder Kegel gelesen, sondern als polygonaler, an die Hochburg angepasster Steinmantel. So schliesst der Glacis sauber an den Burgberg an und traegt den inneren Ring glaubwuerdiger.',
      },
      {
        type: 'TERRAIN_STACK', x: -9.5, z: 3.1, y: 5.16,
        footprint: [
          { x: -2.0, z: -1.2 }, { x: -1.2, z: -2.2 }, { x: 0.3, z: -2.4 }, { x: 1.6, z: -1.4 },
          { x: 1.9, z: 0.3 }, { x: 1.4, z: 1.8 }, { x: -0.1, z: 2.4 }, { x: -1.7, z: 1.6 },
        ],
        layers: [
          { scale: 1.18, h: 0.78 },
          { scale: 1.08, h: 0.72 },
          { scale: 0.99, h: 0.6 },
          { scale: 0.92, h: 0.48 },
          { scale: 0.86, h: 0.4 },
        ],
        label: 'Felsstuetze unter dem Suedwestturm',
        info: 'Kleine lokale Felsstuetze direkt unter dem Waechterturm statt eines rundum sichtbaren Podests.',
      },
      {
        type: 'TERRAIN_STACK', x: 0.0, z: 9.8, y: 5.18,
        footprint: [
          { x: -2.3, z: -1.5 }, { x: -1.4, z: -2.5 }, { x: 0.1, z: -2.8 }, { x: 1.8, z: -1.9 },
          { x: 2.3, z: -0.2 }, { x: 1.8, z: 1.7 }, { x: 0.4, z: 2.7 }, { x: -1.6, z: 2.4 },
        ],
        layers: [
          { scale: 1.2, h: 0.82 },
          { scale: 1.1, h: 0.74 },
          { scale: 1.0, h: 0.62 },
          { scale: 0.92, h: 0.5 },
          { scale: 0.86, h: 0.4 },
        ],
        label: 'Felsstuetze unter dem Torre Grande',
        info: 'Lokaler Felskeil unter dem grossen Suedturm, damit die Auflage wie Teil des Berges statt wie eine Scheibe wirkt.',
      },
      {
        type: 'TERRAIN_STACK', x: 9.5, z: 3.1, y: 5.16,
        footprint: [
          { x: -1.9, z: -1.3 }, { x: -1.0, z: -2.3 }, { x: 0.6, z: -2.5 }, { x: 1.8, z: -1.6 },
          { x: 2.0, z: 0.1 }, { x: 1.4, z: 1.8 }, { x: -0.2, z: 2.4 }, { x: -1.7, z: 1.5 },
        ],
        layers: [
          { scale: 1.18, h: 0.78 },
          { scale: 1.08, h: 0.72 },
          { scale: 0.99, h: 0.6 },
          { scale: 0.92, h: 0.48 },
          { scale: 0.86, h: 0.4 },
        ],
        label: 'Felsstuetze unter dem Suedostturm',
        info: 'Lokale Bergstuetze unter der Torre del Maestre, damit der Turm sauber auf dem Glacis steht.',
      },
      // Oberes Felsplateau – Übergang vom Zwingerplateau (y=1.98) zum Glacis (y=4.92)
      // Ersetzt den früheren Polygon-Burgberg durch eine nahtlose Geländestufe, die
      // den gebauten Glacissockel glaubwürdig aus dem Fels herauswachsen lässt.
      {
        type: 'TERRAIN_STACK', x: 0.4, z: 0.1, y: 1.98,
        footprint: [
          { x: -15.0, z: -11.5 }, { x: -11.5, z: -14.5 }, { x: -2.0, z: -16.0 }, { x: 7.5, z: -14.5 },
          { x: 12.0, z: -10.0 }, { x: 13.0, z: -1.2 }, { x: 12.4, z:  7.8 }, { x: 8.6, z: 12.8 },
          { x:  1.0, z:  14.2 }, { x: -7.5, z:  13.0 }, { x: -11.8, z:  7.8 }, { x: -15.0, z: -0.8 },
        ],
        layers: [
          { scale: 1.04, h: 0.74 },
          { scale: 1.00, h: 0.72 },
          { scale: 0.96, h: 0.76 },
          { scale: 0.92, h: 0.72 },
        ],
        label: 'Oberes Felsplateau (Burgfels)',
        info: 'Der natürliche Felsuntergrund des Krak steigt hier vom äusseren Hof zum Glacis an. Diese mittlere Geländestufe bildet den Übergang zwischen dem Zwingerhof und dem mächtigen Steinmantel der Hochburg.',
      },
      {
        type: 'RING', y: 8.12, matVariant: 'limestone',
        gate: {
          atIndex: 4, w: 3.5, d: 3.0, h: 6.5,
          label: 'Inneres Tor - Rampeneingang (Hochburg)',
          info: 'Der verschlungene Eingang in den Innenhof: eine ueberdachte Rampe, die in engen Kehren nach oben fuehrt.',
        },
        points: [
          { x: 0, z: 10, r: 2.3, h: 11.5, noRoof: true, plinthH: 1.2, plinthDrop: 0.62, plinthTopScale: 1.2, plinthBottomScale: 1.34, skirtH: 3.0, skirtTopScale: 1.34, skirtBottomScale: 1.54, label: 'Torre Grande (Grosser Turm)', info: 'Der maechtigste Turm des Krak und letzter Rueckzugspunkt der Johanniter.' },
          { x: -9.51, z: 3.09, r: 2.0, h: 10.0, noRoof: true, plinthH: 1.02, plinthDrop: 0.56, plinthTopScale: 1.2, plinthBottomScale: 1.34, skirtH: 2.8, skirtTopScale: 1.34, skirtBottomScale: 1.52, label: 'Suedwestturm (Waechterturm)', info: 'Einer der drei massiven Suedtuerme mit senkrechten Abwurfwinkeln auf Angreifer am Mauerfuss.' },
          { x: -5.88, z: -8.09, r: 1.5, h: 7.5, label: 'Nordwestturm (Innen)', info: 'Verbindungsturm zwischen Sued- und Nordmauer des Innenhofs.' },
          { x: 5.88, z: -8.09, r: 1.5, h: 7.5, label: 'Nordostturm (Innen)', info: 'Ueberblickte das aeussere Ostfeld und deckte das Haupttor von oben.' },
          { x: 9.51, z: 3.09, r: 1.9, h: 9.5, noRoof: true, plinthH: 0.98, plinthDrop: 0.54, plinthTopScale: 1.2, plinthBottomScale: 1.34, skirtH: 2.7, skirtTopScale: 1.34, skirtBottomScale: 1.5, label: 'Suedostturm (Torre del Maestre)', info: 'Flankiert den Rampeneingang zum Innenhof und schliesst die starke Suedfront.' },
        ],
        wall: { h: 6.0, thick: 1.3 },
      },
      {
        type: 'RING', y: 1.98,
        gate: {
          atIndex: 3, w: 5.5, d: 4.5, h: 7.5,
          label: 'Haupttor - Befestigte Rampe (Barbakane)',
          info: 'Der historische Eingang des Krak fuehrte ueber eine lange, ueberdachte Rampe mit mehreren Engstellen.',
        },
        points: [
          { x: 0, z: -20, r: 1.3, h: 5.5, label: 'Aussenturm Nord', info: 'Beobachtungsposten fuer den Nordhang.' },
          { x: 14.14, z: -14.14, r: 1.3, h: 5.5, label: 'Aussenturm NO', info: 'Flankierungsturm fuer Kreuzfeuer zwischen Ost- und Nordmauer.' },
          { x: 20, z: 0, r: 1.3, h: 5.5, label: 'Aussenturm Ost', info: 'Turm neben dem Haupttor mit Deckung des Torzugangs.' },
          { x: 14.14, z: 14.14, r: 1.3, h: 5.5, label: 'Aussenturm SO', info: 'Suedoestlicher Flankierungsturm des Torbereichs.' },
          { x: 0, z: 20, r: 1.3, h: 5.5, label: 'Aussenturm Sued', info: 'Suedturm des aeusseren Rings direkt unter der Glacis-Front.' },
          { x: -14.14, z: 14.14, r: 1.3, h: 5.5, label: 'Aussenturm SW', info: 'Suedwestturm mit Sichtlinie ueber das Vorgelaende.' },
          { x: -20, z: 0, r: 1.3, h: 5.5, label: 'Aussenturm West', info: 'Westturm, teilweise im Felsgelaende eingebettet.' },
          { x: -14.14, z: -14.14, r: 1.3, h: 5.5, label: 'Aussenturm NW', info: 'Nordwestturm zur Sicherung des kritischen Nordhangs.' },
        ],
        wall: { h: 3.0, thick: 0.8, buttresses: true },
      },
      {
        type: 'STAIRWAY', x: 0.5, z: 5.8, y: 5.02, w: 6.2, d: 6.0, h: 3.0, steps: 6, landingD: 1.0,
        label: 'Grosser Steinaufgang zur Hochburg',
        info: 'Der Zugang zur Hochburg war kein glatter Hang, sondern eine gestaffelte Steinrampe mit Treppen und kleinen Podesten unter Beschuss der inneren Tuerme.',
      },
      {
        type: 'PLATEAU', x: 0.1, z: -0.8, y: 8.18, w: 11.6, d: 8.2, h: 0.22,
        label: 'Innenhof-Terrasse (Hochburg)',
        info: 'Unsichtbar-stabile Trageflaeche fuer die Hofbauten, damit Hallen und Kleinobjekte sauber aufliegen.',
      },
      {
        type: 'GABLED_HALL', x: 0.0, z: -5.5, w: 8.8, d: 3.5, h: 3.2, y: 8.34, roofH: 1.9, buttressPairs: 3, slitCount: 2, doorSide: 'front', doorW: 0.9, chimneyCount: 2, gableStyle: 'triangular',
        label: 'Konventsaal der Johanniter',
        info: 'Der lange Saal der Johanniter bildet das zeremonielle und politische Herz der Hochburg. Ein eigener Hallenbau macht den Innenhof nun lesbarer als bewohnte Ordensburg.',
      },
      {
        type: 'GABLED_HALL', x: 4.9, z: -0.5, w: 2.9, d: 2.4, h: 3.8, y: 8.34, roofH: 1.55, slitCount: 1, doorSide: 'front', doorOffset: -0.2, porch: true, gableStyle: 'triangular',
        label: 'Johanniterkapelle',
        info: 'Die Kapelle der Hospitaliter erscheint hier als eigener kleiner Sakralbau mit Vorbau, statt nur als austauschbarer Block im Hof zu verschwinden.',
      },
      {
        type: 'GABLED_HALL', x: -2.8, z: 1.7, w: 3.5, d: 2.4, h: 2.5, y: 8.30, roofH: 1.15, doorSide: 'front', slitCount: 0, gableStyle: 'triangular',
        label: 'Kasernen- und Magazinbau',
        info: 'Niedriger Wirtschafts- und Magazintrakt im inneren Hof. Solche Nebengebaeude machen den Krak als bewohnte Ordensburg lesbarer und brechen die Leere im Hof.',
      },
      {
        type: 'SQUARE_TOWER', x: 0.5, z: 0.8, w: 1.5, d: 1.5, h: 0.95, y: 8.28, noRoof: true,
        label: 'Innenhof-Zisterne',
        info: 'Kleine sichtbare Hofzisterne als Erinnerung daran, dass Wasserwirtschaft im Krak ueberlebenswichtig war.',
      },
      {
        type: 'SQUARE_TOWER', x: -1.2, z: 4.4, w: 1.2, d: 0.8, h: 0.45, y: 8.26, noRoof: true,
        label: 'Lagerkisten und Vorratsstapel',
        info: 'Niedrige Vorratsstapel und Hofgut brechen die Leere im Innenbereich und lassen die Burg bewohnt wirken.',
      },
      {
        type: 'SQUARE_TOWER', x: 1.0, z: 4.1, w: 1.0, d: 0.7, h: 0.38, y: 8.26, noRoof: true,
        label: 'Werkhof',
        info: 'Kleiner Werk- und Lagerbereich im Hof vor dem inneren Mauerzug.',
      },
      {
        type: 'STAIRWAY', x: -13.5, z: 8.5, y: 1.98, w: 1.6, d: 5.2, h: 3.0, steps: 8, landingD: 0.5, rotation: 0.92,
        label: 'Wehrgangstreppe West',
        info: 'Seitentreppe vom aeusseren Zwingerhof auf den westlichen Wehrgang des Aussenrings.',
      },
      {
        type: 'STAIRWAY', x: 13.5, z: 8.5, y: 1.98, w: 1.6, d: 5.2, h: 3.0, steps: 8, landingD: 0.5, rotation: -0.92,
        label: 'Wehrgangstreppe Ost',
        info: 'Gegenstueck am oestlichen Abschnitt des aeusseren Rings fuer Wachwechsel und schnelle Verstaerkung.',
      },
      {
        type: 'PLATEAU', x: -10.2, z: 10.6, y: 3.90, w: 5.3, d: 2.7, h: 1.20, rotation: -0.52,
        label: 'Fundament Stall- und Werkhaus',
        info: 'Kleines steinernes Fundamentplateau, damit der Baukoerper sauber auf dem ansteigenden Terrain sitzt.',
      },
      {
        type: 'GABLED_HALL', x: -10.2, z: 10.6, y: 4.76, w: 4.8, d: 2.2, h: 2.2, roofH: 1.0, slitCount: 1, doorSide: 'front', doorOffset: 0.2, rotation: -0.52, chimneyCount: 1, gableStyle: 'triangular',
        label: 'Stall- und Werkhaus des aeusseren Werks',
        info: 'Auch der aeussere Hof war kein leerer Schiessplatz. Kleine Stall- und Werkbauten machten den Krak im Alltag erst funktionsfaehig.',
      },
      {
        type: 'PLATEAU', x: 10.0, z: 10.7, y: 3.90, w: 5.1, d: 2.7, h: 1.20, rotation: 0.52,
        label: 'Fundament Backhaus und Vorratshaus',
        info: 'Leicht angehobenes Fundament fuer den oestlichen Wirtschaftsbereich.',
      },
      {
        type: 'GABLED_HALL', x: 10.0, z: 10.7, y: 4.76, w: 4.7, d: 2.15, h: 2.2, roofH: 0.95, slitCount: 1, doorSide: 'front', doorOffset: -0.2, rotation: 0.52, chimneyCount: 1, gableStyle: 'triangular',
        label: 'Backhaus und Vorratshaus',
        info: 'Ein kleiner Ofen- und Vorratsbau im aeusseren Werk ergaenzt den grossen Hallen- und Magazinkern der Hochburg.',
      },
      {
        type: 'SQUARE_TOWER', x: -6.8, z: 8.1, y: 4.22, w: 0.85, d: 0.65, h: 0.42, noRoof: true,
        label: 'Futterkisten Westhof',
        info: 'Vorratskisten fuer Stalltiere und Marschproviant im westlichen Wirtschaftshof.',
      },
      {
        type: 'SQUARE_TOWER', x: -6.2, z: 9.3, y: 4.22, w: 0.82, d: 0.62, h: 0.38, noRoof: true,
        label: 'Werkkisten Westhof',
        info: 'Werk- und Materialstapel fuer Reparaturen an Wehrgang und Toren.',
      },
      {
        type: 'SQUARE_TOWER', x: 6.3, z: 9.4, y: 4.22, w: 0.9, d: 0.68, h: 0.42, noRoof: true,
        label: 'Holzstapel Osthof',
        info: 'Brennholz und Bauholz fuer Backhaus, Werkhof und winterliche Versorgung.',
      },
      {
        type: 'SQUARE_TOWER', x: 6.9, z: 8.2, y: 4.22, w: 0.82, d: 0.62, h: 0.36, noRoof: true,
        label: 'Vorratsstapel Osthof',
        info: 'Kleiner Lagerstapel im aeußeren Hof als Teil der Alltagslogistik.',
      },
      {
        type: 'GABLED_HALL', x: 0.7, z: 3.2, w: 1.9, d: 1.3, h: 1.45, y: 8.30, roofH: 0.62, doorSide: 'front', slitCount: 0, chimneyCount: 0, gableStyle: 'triangular',
        label: 'Hofunterstand',
        info: 'Kleiner Unterstand im inneren Hof fuer Werkzeug, Ersatzteile und Wachdienstmaterial.',
      },
      {
        type: 'GLACIS', x: 0, z: 16, y: 1.72, rTop: 3.0, rBot: 3.8, h: 0.7,
        label: 'Zisternenbecken (Suedring)',
        info: 'Eine der Hauptauffangzisternen im Zwinger zwischen den beiden Mauerringen.',
      },

      // ── PECHNASEN (MACHICOLATION) ─────────────────────────────────────────
      // Innere Hochburg – die drei massiven Suedtuerme (historisch belegt durch
      // Deschamps und die archaeologischen Grundrisse). Der Krak gehoert zu den
      // fruehesten Kreuzfahrerbauten mit vollstaendiger Pechnasen-Krone.
      {
        type: 'MACHICOLATION', mode: 'round',
        x: 0, z: 10, y: 19.62,
        r: 2.3, overhang: 0.55, gallH: 0.52, corbH: 0.32, count: 10, slotRatio: 0.38,
        label: 'Pechnasen – Torre Grande',
        info: 'Die umlaufende Abwurfgalerie am Scheitel des groessten Turms ermoeglichte senkrechten Beschuss auf Angreifer am Mauerfuss. Box-Machicoulis dieser Art waren im Krak komplexer ausgefuehrt als in zeitgenoessischen Bauten wie Saone oder Margat.',
      },
      {
        type: 'MACHICOLATION', mode: 'round',
        x: -9.51, z: 3.09, y: 18.12,
        r: 2.0, overhang: 0.52, gallH: 0.50, corbH: 0.30, count: 9, slotRatio: 0.40,
        label: 'Pechnasen – Suedwestturm (Waechterturm)',
        info: 'Die Abwurfkraenze am Waechterturm deckten den Glacisfuss und den Graben. Kein Angreifer konnte die Suedfront abschreiten, ohne unter direktem Beschuss von oben zu stehen.',
      },
      {
        type: 'MACHICOLATION', mode: 'round',
        x: 9.51, z: 3.09, y: 17.62,
        r: 1.9, overhang: 0.52, gallH: 0.50, corbH: 0.30, count: 9, slotRatio: 0.40,
        label: 'Pechnasen – Torre del Maestre',
        info: 'Der Turm des Ordensmeisters flankierte den Rampeneingang und erhielt als Statussymbol wie als Verteidigungsposten eine vollstaendige Pechnasen-Galerie.',
      },
      // Aeusserer Ring – drei am Zugang exponierte Tuerme
      {
        type: 'MACHICOLATION', mode: 'round',
        x: 20, z: 0, y: 7.48,
        r: 1.3, overhang: 0.42, gallH: 0.42, corbH: 0.26, count: 7, slotRatio: 0.40,
        label: 'Pechnasen – Aussenturm Ost (Torturm)',
        info: 'Der ostliche Torturm hatte als erster sichtbarer Flankenposten nach der Rampe Pechnasen, die den Torzugang von oben deckten.',
      },
      {
        type: 'MACHICOLATION', mode: 'round',
        x: 14.14, z: 14.14, y: 7.48,
        r: 1.3, overhang: 0.42, gallH: 0.42, corbH: 0.26, count: 7, slotRatio: 0.40,
        label: 'Pechnasen – Aussenturm SO',
        info: 'Der suedoestliche Flankenturm kontrollierte das Torvorfeld und schloss den Kreuzfeuerbuegel zwischen den Suedtuerme.',
      },
      {
        type: 'MACHICOLATION', mode: 'round',
        x: 0, z: 20, y: 7.48,
        r: 1.3, overhang: 0.42, gallH: 0.42, corbH: 0.26, count: 7, slotRatio: 0.40,
        label: 'Pechnasen – Aussenturm Sued',
        info: 'Der suedlichste Aussenturm direkt uber dem Glacis – seine Pechnasen deckten den kritischsten Abschnitt der gesamten Verteidigung.',
      },

      // ── HOLZKAMPFGALERIEN (HOARDINGS / HURDEN) ───────────────────────────
      // Provisorische Holzgalerien, in die Steckloecher der Mauerkrone gehängt.
      // Schichten aus Brettern mit Absturzoeffnungen im Boden ermoeglichten
      // senkrechten Beschuss direkt am Mauerfuss – ohne Kopf riskieren zu muessen.
      //
      // Innenring (y=14.12):
      //   Wandabschnitt SO→Grande  (4, SO): Mitte (4.76, 6.55), rot ≈ +0.628
      //   Wandabschnitt Grande→SW  (0→1):   Mitte (-4.76, 6.55), rot ≈ -0.628
      // Aussenring (y=4.98):
      //   Wandabschnitt Sued→SW    (4→5):   Mitte (-7.07, 17.07), rot ≈ -0.393
      {
        type: 'HOARDING',
        x: 4.76, z: 6.55, y: 14.12,
        w: 6.5, d: 1.20, h: 1.40,
        rotation: Math.atan2(0.588, 0.809),
        label: 'Hurde – Suedostmauer Innenring (Richtung Torre Grande)',
        info: 'Die holzernen Kampfgalerien (Hurden) der suedlichen Innenringmauer konnten bei Belagerung in wenigen Stunden eingehängt werden. Sie gaben Bogenschuetzen und Steinwerfern eine komplett ueberdachte Stellungslinie ueber dem freien Abfall der Hangmauer.',
      },
      {
        type: 'HOARDING',
        x: -4.76, z: 6.55, y: 14.12,
        w: 6.5, d: 1.20, h: 1.40,
        rotation: Math.atan2(-0.588, 0.809),
        label: 'Hurde – Suedwestmauer Innenring (Grande–Suedwestturm)',
        info: 'Der symmetrische Gegenabschnitt der Suedfront schloss die Lucke zwischen Torre Grande und dem Waechterturm. Zusammen mit den Pechnasen auf den Tuermen entstand eine lueckenlose Beschusslinie ueber die gesamte Suedfront des Innenrings.',
      },
      {
        type: 'HOARDING',
        x: -7.07, z: 17.07, y: 4.98,
        w: 8.0, d: 1.10, h: 1.30,
        rotation: Math.atan2(-0.383, 0.924),
        label: 'Hurde – Suedwestmauer Aussenring (Sued–SW)',
        info: 'Die laengste zusammenhaengende Holzkampfgalerie des aeusseren Mauerguertels sicherte den exponierten Suedwesthang. Von hier aus konnten Angreifer, die sich am Glacis vorbeigekaempft hatten, noch einmal unter kombiniertes Bogenfeuer von Mauer und Galerie genommen werden.',
      },

      // ── TREPPENZUGÄNGE (STAIR FLIGHTS) ───────────────────────────────────
      // Begehbare Treppengänge die das Erkunden der Burg zu Fuß ermöglichen.
      // Aussenwalltreppe Ost  – Zugang zum Wehrgang des äusseren Rings
      {
        type: 'STAIR_FLIGHT',
        x: 14.5, z: 2.0, y: 1.98,
        steps: 12, stepH: 0.25, stepD: 0.38, w: 1.8,
        rotation: Math.PI * 0.45,
        label: 'Wandaufgang Ost – Äusserer Ring',
        info: 'Treppenaufgang zur Wehrgangsplattform des östlichen Außenwalls. Über diesen Aufgang konnten Verteidiger schnell von der Hofebene auf den Kampfgang gelangen.',
      },
      // Innenringtreppe Süd – Glaciszugang zum inneren Hochburgring
      {
        type: 'STAIR_FLIGHT',
        x: 3.8, z: 12.5, y: 4.92,
        steps: 10, stepH: 0.32, stepD: 0.38, w: 2.0,
        rotation: Math.PI * 0.5,
        label: 'Glacisaufgang Süd – Innenring',
        info: 'Breiter Treppenaufgang vom Zwingerhof auf das Plateau des inneren Mauerwerks. Der steile Glacis des Krak erzwang einen langen, exponierten Anmarsch für Angreifer.',
      },
      // Turmanstieg Torre Grande
      {
        type: 'STAIR_FLIGHT',
        x: -1.5, z: 9.5, y: 8.12,
        steps: 6, stepH: 0.28, stepD: 0.38, w: 1.6,
        rotation: Math.PI * 0.85,
        label: 'Zugang Torre Grande – Innenhof',
        info: 'Kurzaufgang vom Innenhof zum Eingangsportal des Großturms Torre Grande. Der Turm war der letzte Rückzugsort der Besatzung.',
      },
      // Wehrgang Nordseite Aussenring
      {
        type: 'STAIR_FLIGHT',
        x: -14.5, z: -3.0, y: 1.98,
        steps: 12, stepH: 0.25, stepD: 0.38, w: 1.8,
        rotation: -Math.PI * 0.44,
        label: 'Wandaufgang Nord – Äusserer Ring',
        info: 'Nördlicher Wandaufgang des äusseren Mauerrings. Ermöglichte schnellen Nachschub von Pfeilen und Geschossen auf den Nordwehrgang.',
      },

      // ── ZUGBRUECKE (DRAWBRIDGE) ───────────────────────────────────────────
      // Der historische Zugang fuehrte ueber eine auskragende Zugbruecke vor
      // der Barbakane. Rampe (SLOPE_PATH) endet bei (~10.5, ~12.2); die Bruecke
      // spannt den Zwischenraum zum Torturm bei (14.14, 14.14).
      {
        // Gate atIndex:3 → Mittelpunkt zwischen SO (14.14,14.14) und Sued (0,20) = (7.07,17.07)
        // Bruecke zeigt von (7.07,17.07) zur SLOPE_PATH-Endpunkt (10.5,12.2)
        type: 'DRAWBRIDGE',
        x: 7.07, z: 17.07, y: 2.05,
        w: 4.8, d: 5.5, angle: 0, pitD: 1.6, pitH: 0.60,
        rotation: Math.atan2(10.5 - 7.07, 12.2 - 17.07),
        label: 'Zugbruecke – Haupttor (Barbakane)',
        info: 'Vor dem Haupttor lag kein freier Platz, sondern eine Zugbruecke uber den Zwinggraben. Sie bildete die erste mechanische Barriere im mehrstufigen Eingangsystem und konnte bei Alarm hochgezogen werden, bevor Angreifer das Tor erreichten.',
      },

      // ── GOTISCHE LOGGIA (Arkadenhalle) ────────────────────────────────────
      // Die beruehmt Arkadenhalle (Loggia) an der Suedseite des Konventsaals
      // ist eines der aussergewoehnlichsten gotischen Bauelemente in Outremer.
      // Rayonnant-Stil (Ile-de-France), fuenf Doppeljooche, Kragsteine mit
      // Blattmotiven vergleichbar der Sainte-Chapelle – datiert um 1250.
      // Position: an der Suedfront des Konventsaals (z=-5.5, Suedseite bei z=-3.75),
      // Loggia schliesst direkt an und oeffnet sich nach Suden in den Hof.
      {
        type: 'GABLED_HALL',
        x: 0.0, z: -2.82, y: 8.34,
        w: 8.2, d: 1.75, h: 2.55, roofH: 0.22,
        doorSide: 'front', porch: true, slitCount: 0,
        gableStyle: 'triangular',
        label: 'Gotische Loggia (Arkadenhalle des Konventsaals)',
        info: 'Die Loggia an der Suedseite des grossen Saals ist eines der schoensten gotischen Bauelemente im gesamten Outremer. Die offene Arkadenhalle mit fuenf Doppeljochen, feinen Saulen und Ogivalgewoelbe war Wandelgang, Repraesentation und Verbindungsweg zugleich – ein Beleg dafuer, dass der Krak nicht nur Festung, sondern auch Ordensresidenz war.',
      },
    ],
  },
  chateau_gaillard: {
    style: 'crusader',
    fidelityLabel: 'hero-burg',
    historicalMode: 'surveyed',
    sourceConfidence: 'hoch',
    focus: { x: 0, y: 8, z: -5 },
    cameraRadius: 38,
    terrainModel: 'custom',
    notes: 'Chateau Gaillard lebt von seinem Felssporn, dem gestaffelten Vorwerk und der stark gegliederten inneren Verteidigung. Das Diorama zeigt deshalb eine gestreckte Nord-Sued-Abfolge statt eines kompakten Zentralbaus.',
    sources: ['John Gillingham on Richard I fortifications', 'Normandy castle surveys'],
    components: [
      { type: 'TERRAIN_STACK', x: 0, z: -4, y: 0,
        footprint: [
          { x: -8, z: 22 }, { x: -5, z: 12 }, { x: -7, z: -4 }, { x: -9, z: -18 }, { x: -6, z: -28 },
          { x: 0, z: -34 }, { x: 6, z: -28 }, { x: 9, z: -18 }, { x: 7, z: -4 }, { x: 5, z: 12 }, { x: 8, z: 22 },
        ],
        layers: [{ scale: 1.08, h: 1.3 }, { scale: 1.0, h: 1.1 }, { scale: 0.93, h: 0.9 }],
        label: 'Felssporn von Chateau Gaillard',
        info: 'Die Burg sitzt auf einem schmalen Felssporn ueber der Seine. Das Diorama liest die Anlage deshalb als nach Norden auslaufenden Sporn statt als kreisfoermige Hoehenburg.',
      },
      { type: 'PLATEAU', x: 0, z: -6, y: 3.35, w: 13, d: 38, h: 0.6,
        label: 'Oberer Spornruecken',
        info: 'Auf dem schmalen Hochruecken staffeln sich Vorwerk, mittlere Enceinte und Hochburg hintereinander. Genau diese Tiefenstaffelung macht Gaillard so schwer lesbar und so stark.',
      },
      { type: 'SLOPE_PATH', x1: 0, z1: 23, x2: 0, z2: 15, y1: 0.3, y2: 3.45, w: 3.4, thick: 0.2,
        label: 'Zugang vom Sueden',
        info: 'Der suedliche Zugang lief ueber den schmalsten Teil des Sporns. Jeder Angreifer musste sich nacheinander durch Vorwerk, Mittelring und Hochburg arbeiten.',
      },
      { type: 'RING', y: 3.45,
        gate: { atIndex: 3, w: 3.0, d: 2.2, h: 4.5, label: 'Aeusseres Vorwerk (Suedtor)', info: 'Erster Verteidigungsring auf dem Felssporn. Philip II. brauchte Monate, um ueberhaupt bis an die mittlere Enceinte heranzukommen.' },
        points: [
          { x: 0, z: 3, r: 1.0, h: 4.5, label: 'Vorwerkturm N', info: 'Noerdlicher Anschlussturm zwischen Vorwerk und Mittelring.' },
          { x: 4.76, z: 7, r: 1.0, h: 4.0, label: 'Vorwerkturm NO', info: 'Flankenturm des aeusseren Vorwerks.' },
          { x: 4.76, z: 15, r: 1.0, h: 4.0, label: 'Vorwerkturm SO', info: 'Suedoestlicher Eckturm des Vorwerks.' },
          { x: 0, z: 19, r: 1.0, h: 4.5, label: 'Vorwerkturm S', info: 'Suedspitze des Vorwerks und erster echter Engpass.' },
          { x: -4.76, z: 15, r: 1.0, h: 4.0, label: 'Vorwerkturm SW', info: 'Suedwestturm des Vorwerks.' },
          { x: -4.76, z: 7, r: 1.0, h: 4.0, label: 'Vorwerkturm NW', info: 'Nordwestturm und Uebergang zum Mittelring.' },
        ],
        wall: { h: 3.5, thick: 0.8 },
      },
      { type: 'RING', y: 3.55,
        gate: { atIndex: 0, w: 3.0, d: 2.2, h: 5.5, label: 'Mittlere Enceinte (Suedtor)', info: 'Die beruehmte corrugated wall von Richard Loewenherz verdoppelte die Abwehrwinkel und minimierte tote Winkel entlang des Mittelteils.' },
        points: [
          { x: 0, z: 6, r: 1.1, h: 6.0, label: 'Mittlerer Ring S', info: 'Suedtor der mittleren Enceinte.' },
          { x: -4.28, z: 1.5, r: 1.1, h: 5.5, label: 'Mittlerer Ring SW', info: 'Wellenfoermige Mauerfuehrung als Signatur der Burg.' },
          { x: -2.64, z: -5.5, r: 1.1, h: 5.5, label: 'Mittlerer Ring NW', info: 'Nahe der beruechtigten Latrinenoeffnung in der Kapellenwand.' },
          { x: 2.64, z: -5.5, r: 1.1, h: 5.5, label: 'Mittlerer Ring NO', info: 'Nordostturm der mittleren Enceinte.' },
          { x: 4.28, z: 1.5, r: 1.1, h: 5.5, label: 'Mittlerer Ring SO', info: 'Suedostturm zur Flankierung des Mittelrings.' },
        ],
        wall: { h: 5.0, thick: 1.1 },
      },
      { type: 'RING', y: 3.75,
        gate: { atIndex: 1, w: 2.8, d: 2.2, h: 6.5, label: 'Innerer Ring (Hochburg)', info: 'Die Hochburg war Richards staerkster Abschnitt. Nach dem Fall der Latrinengalerie war auch dieser Ring psychologisch kaum noch zu halten.' },
        points: [
          { x: 0, z: -7, r: 1.2, h: 7.0, label: 'Hochburg N', info: 'Nordturm der Kernburg ueber dem Spornende.' },
          { x: 4, z: -12, r: 1.2, h: 6.5, label: 'Hochburg NO', info: 'Nordostturm der Hochburg.' },
          { x: 0, z: -17, r: 1.2, h: 6.5, label: 'Hochburg S', info: 'Suedlicher Abschluss der Hochburg.' },
          { x: -4, z: -12, r: 1.2, h: 6.5, label: 'Hochburg NW', info: 'Nordwestturm der Hochburg.' },
        ],
        wall: { h: 6.0, thick: 1.2 },
      },
      { type: 'ROUND_TOWER', x: 0, z: -14, r: 2.0, h: 12, y: 3.8, label: 'Donjon von Chateau Gaillard', info: 'Richards zylindrischer Donjon eliminierte tote Winkel fast vollstaendig. Die letzte Bastion der Burg fiel nicht durch Sturm, sondern durch eine schmale Oeffnung in der Kapelle.' },
      { type: 'SQUARE_TOWER', x: -1.6, z: -6.6, w: 2.6, d: 1.8, h: 3.6, y: 3.6, label: 'Kapellenbereich / Latrinenoeffnung', info: 'Hier lag die beruechtigte Schwaeche: Ein franzoesischer Soldat drang durch eine Latrinenoeffnung in die Kapelle ein und oeffnete danach das Tor.' },
    ],
  },
};
