export const HERO_DIORAMAS_ANCIENT = {
  masada: {
    style: 'ancient',
    fidelityLabel: 'topografisch',
    historicalMode: 'surveyed',
    sourceConfidence: 'hoch',
    focus: { x: -2, y: 8, z: -1 },
    cameraRadius: 42,
    terrainModel: 'custom',
    notes: 'Masada wird hier als laenglicher Felsruecken mit Westsporn dargestellt, nicht als idealisierte Kreisburg.',
    sources: ['Josephus, De Bello Judaico', 'Yigael Yadin, Masada excavations'],
    components: [
      {
        type: 'TERRAIN_STACK', x: 0, z: 0, y: 0,
        footprint: [
          { x: -18.5, z: -13.8 }, { x: -13.5, z: -17.2 }, { x: -2.4, z: -18.8 }, { x: 9.8, z: -17.1 }, { x: 16.4, z: -12.8 },
          { x: 18.2, z: -3.2 }, { x: 17.5, z: 8.8 }, { x: 12.2, z: 16.7 }, { x: 1.2, z: 18.6 }, { x: -10.6, z: 17.1 },
          { x: -16.2, z: 10.8 }, { x: -18.4, z: 0.8 },
        ],
        layers: [{ scale: 1.16, h: 1.5 }, { scale: 1.08, h: 1.5 }, { scale: 1.02, h: 1.4 }, { scale: 0.97, h: 1.2 }, { scale: 0.93, h: 0.8 }],
        label: 'Masada-Plateau (Tafelberg)',
        info: 'Das Diorama zeigt Masada als laengliches Plateau mit steilen Flanken. Die eigentliche Staerke der Festung war das Gelaende und nicht eine perfekte Mauergeometrie.',
      },
      {
        type: 'TERRAIN_STACK', x: -21, z: 1.6, y: 0,
        footprint: [
          { x: -2.8, z: -3.4 }, { x: 1.8, z: -5.0 }, { x: 5.6, z: -3.7 }, { x: 7.2, z: 0.2 }, { x: 5.0, z: 3.8 }, { x: 0.1, z: 4.8 }, { x: -3.6, z: 2.4 },
        ],
        layers: [{ scale: 1.05, h: 1.0 }, { scale: 0.98, h: 0.9 }, { scale: 0.9, h: 0.8 }],
        label: 'Silvas Belagerungsrampe (Westsporn)',
        info: 'Hier setzte Flavius Silva an. Der Westsporn war die einzige Stelle, an der Roemer eine Rampe bis an die Plateaukante treiben konnten.',
      },
      {
        type: 'RING', y: 6.4, squareTowers: true,
        gate: {
          atIndex: 8, w: 2.2, d: 1.8, h: 3.8,
          label: 'Westtor (Serpentinenweg)',
          info: 'Einziger regulaerer Zugang ueber den gewundenen Fusspfad der Westseite.',
        },
        points: [
          { x: 0, z: -17, r: 0.85, h: 4.5, label: 'Nordturm', info: 'Beobachtet das noerdliche Ufer des Toten Meers und die Belagerungswerke der X. Legion.' },
          { x: 6.4, z: -13.7, r: 0.8, h: 4.0, label: 'Nordostturm', info: 'Flankierungsturm entlang des Plateau-Rands.' },
          { x: 10.5, z: -5.3, r: 0.8, h: 4.0, label: 'Ostturm Nord', info: 'Oestliche Steilseite mit praktisch unmoeglicher Angriffslinie.' },
          { x: 10.5, z: 5.3, r: 0.8, h: 4.0, label: 'Ostturm Sued', info: 'Die Natur ersetzte hier fast die gesamte Mauer.' },
          { x: 6.4, z: 13.7, r: 0.8, h: 4.0, label: 'Suedostturm', info: 'Suedoestliche Ecke ueber dem Toten Meer.' },
          { x: 0, z: 17, r: 0.85, h: 4.5, label: 'Suedturm', info: 'Suedende des Plateaus und schmalster Punkt der Anlage.' },
          { x: -6.4, z: 13.7, r: 0.8, h: 4.0, label: 'Suedwestturm', info: 'Kontrolle ueber den westlichen Serpentinenweg.' },
          { x: -10.5, z: 5.3, r: 0.85, h: 4.5, label: 'Westturm Sued', info: 'Ueber dem westlichen Gelaendesporn.' },
          { x: -10.5, z: -5.3, r: 0.85, h: 4.5, label: 'Westturm Nord', info: 'Direkt ueber dem Ansatzpunkt der roemischen Belagerungsrampe.' },
          { x: -6.4, z: -13.7, r: 0.8, h: 4.0, label: 'Nordwestturm', info: 'Blick auf die komplette Circumvallation der X. Legion.' },
        ],
        wall: { h: 3.0, thick: 0.9 },
      },
      {
        type: 'PLATEAU', x: 1.5, z: -12.8, w: 6.8, d: 2.6, h: 0.5, y: 6.5,
        label: 'Nordpalast-Terrasse',
        info: 'Der Nordpalast lag terrassiert an der Felskante und wird hier bewusst als vorgelagerte Plattform lesbar gemacht.',
      },
      {
        type: 'SQUARE_TOWER', x: 1.5, z: -12.8, w: 5.5, d: 2.5, h: 2.8, y: 7.0,
        label: 'Herodianischer Nordpalast',
        info: 'Dreistufige Palastanlage auf Felsvorspruengen als Zeichen der luxurioesen Herodes-Architektur.',
      },
      {
        type: 'SQUARE_TOWER', x: -3.5, z: 0, w: 7, d: 2, h: 1.8, y: 6.4, noRoof: true,
        label: 'Magazingebaeude (Zehn Speicher)',
        info: 'Lange Lagerhaeuser mit Vorraeten fuer Jahre und Bezug zu den in den Fels gehauenen Zisternen.',
      },
    ],
  },
};
