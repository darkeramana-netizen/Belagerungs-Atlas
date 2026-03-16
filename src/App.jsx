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
  early: [
    "Eure Truppen nähern sich den Außenmauern — wir sind bereit! Bogenschützen auf den Zinnen, Pechkübel bereit. Ihr werdet euer Blut für jeden Meter bezahlen!",
    "Interessante Strategie. Doch ihr unterschätzt uns. Unsere Mauern haben Armeen vernichtet die mächtiger waren als eure. Macht euren nächsten Zug.",
    "Meine Männer berichten von euren Bewegungen. Wir passen die Verteidigung an. Jeder Angriff kostet euch mehr als ihr gewinnt.",
    "Ihr glaubt, eine Schwachstelle gefunden zu haben? Wir haben sie längst befestigt. Kommt näher — die Verteidigung ist stärker als sie aussieht.",
    "Wir sahen eure Banner aus drei Meilen Entfernung. Tore verriegelt, Zisternen gefüllt, Vorräte für Monate. Habt ihr Zeit für eine lange Belagerung?",
    "Alarm! Alle auf die Mauern! Fallgitter geschlossen, Bogenschützen in Position. Wir erwarten euch!",
    "Ich habe diese Burg von meinem Vater geerbt und ich werde sie meinen Söhnen übergeben. Kein Angreifer fasst hier Fuß.",
    "Dreißig Jahre habe ich diese Mauern verteidigt. Ich kenne jeden Stein und jeden schwachen Punkt — alle längst verstärkt.",
  ],
  middle: [
    "Wochen vergehen und ihr habt kaum Fortschritte. Meine Männer halten stand obwohl die Vorräte schwinden. Wir geben nicht auf!",
    "Euer Belagerungsgerät beeindruckt mich — aber Steine und Holz allein nehmen keine Burg. Wir halten durch!",
    "Ein Ereignis erschüttert die Burg, aber der Geist meiner Soldaten ist ungebrochen. Diese Festung hält bis zum letzten Mann.",
    "Ihr seid hartnäckig — das gebe ich zu. Aber diese Burg hat Schlimmeres überlebt als euren Angriff.",
    "Meine Männer murren. Hunger zeigt seine Wirkung. Aber jeder Tag den wir halten, bringt den Entsatz näher. Haltet aus!",
    "Euer Angriffsturm war gefährlich — wir haben ihn in Brand gesetzt. Wie viele gute Männer könnt ihr euch noch leisten zu verlieren?",
    "Nacht für Nacht höre ich euch graben. Unterminierung? Meine Ingenieure haben Gegentunnel. Wenn ihr durchbrecht, empfangen wir euch mit Schwertern.",
    "Der Brief meines Königs sagt: kein Entsatz kommt. Ich habe ihn der Garnison nicht gezeigt. Was sie nicht weiß, schwächt sie nicht.",
    "Drei Wochen nur Wasser und Salzbrot. Meine Männer werden dünner aber nicht schwächer im Geist. Hunger tötet den Körper — nicht den Willen.",
  ],
  late: [
    "Die Situation ist ernst. Vorräte neigen sich. Aber Kapitulation kommt nicht in Frage — lieber fallen wir mit der Burg!",
    "Ihr habt gut gekämpft. Meine Männer erschöpft, Mauern beschädigt. Doch solange ich lebe, fällt diese Burg nicht. **[GEHALTEN]**",
    "Es ist vorbei. Ihr habt jeden Ausweg abgeschnitten, jede Schwäche genutzt. Im Namen meiner Männer... wir ergeben uns. **[GEFALLEN]**",
    "Die Burg fällt! Ihr habt brillant taktiert. Ein würdiger Sieg. **[GEFALLEN]**",
    "Kein Wasser mehr. Keine Nahrung. Seuche fällt meine Männer schneller als eure Schwerter. Ich öffne das Tor — aber ich verlange ehrenvolle Kapitulation. **[GEFALLEN]**",
    "Das letzte Dutzend meiner Männer hält die Innengemächer. Wir gehen nicht lebend heraus. Für Gott und König! **[GEHALTEN]**",
    "Ein Verräter hat euch durch den Geheimgang geführt. Meine eigene Garnison — ich hätte es sehen müssen. Es ist vorbei. **[GEFALLEN]**",
    "Entsatz! Ich sehe die Banner meines Königs am Horizont! Halten, Männer — nur noch Stunden! **[GEHALTEN]**",
    "Die Mauer ist gebrochen. Meine Männer kämpfen in den Gassen. Für jeden Raum zahlt ihr in Blut. Aber ihr werdet siegen. **[GEFALLEN]**",
    "Ich habe euch jeden Tag beschäftigt während mein Bote zum König ritt. Der Entsatz ist auf dem Weg. Noch drei Tage. **[GEHALTEN]**",
  ],
};

const SIMULATOR_FALLBACKS = [
  {success:true,title:"Brillante Belagerung",outcome:"Durch Belagerungsmaschinen und Versorgungsblockade fiel die Burg nach hartem Kampf.",phases:["Außenring erkundet, Schwachstellen kartiert","Versorgungswege abgeschnitten — Garnison isoliert","Belagerungsmaschinen auf Schwachstelle konzentriert","Mauerdurchbruch — Sturmangriff erfolgreich"],keyMoment:"Die Hauptmauer gab unter konzentriertem Beschuss nach und eine breite Lücke entstand.",mistakes:["Kavallerie zu früh eingesetzt"],whatWorked:["Versorgungsblockade wirksam","Schwachstelle korrekt identifiziert"],historicalParallel:"Ähnlich der Belagerung von Akkon 1291.",generalBonus:"Der General nutzte seine Spezialität entscheidend.",seasonEffect:"Die Jahreszeit begünstigte den Angreifer.",rating:8,daysElapsed:67},
  {success:false,title:"Verteidigung hält stand",outcome:"Trotz aller Anstrengungen konnte die Burg nicht eingenommen werden.",phases:["Erstangriff zurückgeschlagen","Belagerungsgeräte zerstört","Eigene Versorgung knapp","Rückzug nach schwerem Verlust"],keyMoment:"Als die eigenen Vorräte nach 3 Monaten versiegten, musste abgebrochen werden.",mistakes:["Keine vollständige Einkreisung","Zu wenig Geduld"],whatWorked:["Anfangsdruck war stark"],historicalParallel:"Wie viele gescheiterte Belagerungen des Krak des Chevaliers.",generalBonus:"General kämpfte gut, konnte die Verteidigung aber nicht durchbrechen.",seasonEffect:"Schlechtes Wetter behinderte Belagerungsmaschinen.",rating:4,daysElapsed:95},
  {success:true,title:"Sieg durch List",outcome:"Ein Verräter öffnete ein Tor — minimale Verluste, maximaler Erfolg.",phases:["Spione infiltrieren die Burg","Verbündete in der Garnison gewonnen","Nebentor nachts geöffnet","Burg kampflos übernommen"],keyMoment:"Ein verräterischer Unteroffizier öffnete das Nebentor um Mitternacht.",mistakes:["Abhängigkeit vom Verräter war riskant"],whatWorked:["Diplomaten entschieden","Spione lieferten Infos"],historicalParallel:"Wie Konstantinopel durch das offene Kerkaporta-Tor.",generalBonus:"Diplomaten und Spione brillant eingesetzt.",seasonEffect:"Dunkelheit der Nacht begünstigte den Überraschungsangriff.",rating:9,daysElapsed:22},
  {success:true,title:"Hunger als Waffe",outcome:"Vollständige Einkreisung und Geduld zwangen die Garnison in die Knie.",phases:["Vollständige circumvallatio errichtet","Versorgungslinien zu Wasser und Land gekappt","3 Monate warten — Seuche bricht in der Burg aus","Garnison öffnet Tore kampflos"],keyMoment:"Als die letzten Pferde geschlachtet wurden, wusste der Verteidiger: Es gibt kein Halten.",mistakes:["Eigene Versorgung ebenfalls knapp"],whatWorked:["Geduld","Vollständige Blockade"],historicalParallel:"Wie Flavius Silvas Belagerung von Masada 73 n.Chr.",generalBonus:"Disziplin verhinderte ungeduldige Ausbrüche.",seasonEffect:"Sommer machte die Belagerung erträglich.",rating:7,daysElapsed:142},
  {success:false,title:"Entsatz bricht Belagerung",outcome:"Ein Entsatzheer zwang die Belagerer zum Rückzug.",phases:["Erste Angriffe scheitern","Burg schickt Boten durch die Linien","Entsatzheer erscheint nach 6 Wochen","Belagerer zwischen zwei Fronten — Rückzug"],keyMoment:"Die Trompeten des Entsatzheeres erschollen kurz bevor die letzte Wasserreserve verbraucht war.",mistakes:["Keine Aufklärung über Entsatztruppen","Zu wenig Kavallerie"],whatWorked:["Anfangsdruck psychologisch stark"],historicalParallel:"Wie die gescheiterte Belagerung von Orléans 1429.",generalBonus:"General durch Entsatz überrascht.",seasonEffect:"Herbstschlamm verlangsamte Truppenbewegung.",rating:3,daysElapsed:45},
  {success:true,title:"Ingenieursbelagerung",outcome:"Systematisches Unterminieren ließ den Hauptturm kollabieren.",phases:["Schwachstelle der Fundamentierung identifiziert","Mineure graben Tunnel unter der Hauptmauer","Holzstützen in Brand gesetzt","Turm kollabiert — Bresche für Sturm"],keyMoment:"Das Grollen unter der Erde — dann das Krachen des Turms. Dreißig Jahre Stein in Sekunden.",mistakes:["Verluste der Mineure hoch"],whatWorked:["Ingenieursexpertise","Präzise Tunnelführung"],historicalParallel:"Wie bei Château Gaillard 1204.",generalBonus:"Minenkrieg-Spezialist war entscheidend.",seasonEffect:"Trockener Sommer erleichterte Tunnelbau.",rating:8,daysElapsed:54},
];

const WHATIF_FALLBACKS = [
  {likelihood:7,outcome:"Mit doppelter Garnison hätte die Burg deutlich länger gehalten.",analysis:"Eine größere Verteidigungsstreitmacht hätte alle Schwachstellen gleichzeitig besetzen können. Historisch zeigt sich: Garnisonstärke ist oft entscheidender als Mauerstärke. Ein erschöpfter Verteidiger verliert — ein ausgeruhter hält.",wouldHaveFallen:false,keyFactor:"Genug Männer für jeden Mauerabschnitt wäre spielentscheidend.",timeChange:"Die Burg hätte mindestens 50 Jahre länger gehalten.",historicalParallels:["Harlech mit 50 Mann hielt 7 Jahre","Masada mit 960 Mann gegen eine ganze Legion"],confidence:"hoch"},
  {likelihood:5,outcome:"Das Szenario hätte die Balance verschoben — aber nicht zwingend zugunsten einer Seite.",analysis:"Diese Änderung hätte tiefgreifende Auswirkungen gehabt. Die Verteidiger hätten neue Optionen gehabt, aber die Angreifer hätten sich angepasst. Geschichte zeigt selten einfache Kausalitäten — jede Stärke schafft eine neue Schwäche.",wouldHaveFallen:true,keyFactor:"Technologie und Taktik hätten sich gegenseitig aufgehoben.",timeChange:"Schwer vorherzusagen — zu viele Variablen.",historicalParallels:["Viele Burgen fielen trotz scheinbarer Überlegenheit","Technologischer Vorsprung ist nie garantiert"],confidence:"mittel"},
  {likelihood:8,outcome:"Ohne diese Schwäche wäre die Burg wohl uneinnehmbar geblieben.",analysis:"Die beseitigte Schwachstelle war historisch der entscheidende Faktor. Ohne sie hätten die Angreifer keine Möglichkeit gehabt, die übrigen Linien zu überwinden. Die Festung wäre zum Symbol der Uneinnehmbarkeit geworden.",wouldHaveFallen:false,keyFactor:"Jede Festung hat ihre Achillesferse — ohne sie verschieben sich alle Kräfteverhältnisse.",timeChange:"Die Burg hätte noch Jahrhunderte gehalten.",historicalParallels:["Konstantinopel ohne Kerkaporta wäre nie gefallen","Helms Klamm ohne Drain hätte die Nacht überstanden"],confidence:"hoch"},
  {likelihood:6,outcome:"Moderne Technik hätte alle mittelalterlichen Vorteile zunichte gemacht.",analysis:"Artillerie des 19. Jahrhunderts pulverisiert jede mittelalterliche Mauer in Stunden. Konstantinopel, Carcassonne, Krak — alle hätten gegen Haubitzenfeuer keine Chance. Nur Geländeposition bliebe als echter Schutz.",wouldHaveFallen:true,keyFactor:"Artillerie macht Mauerstärke obsolet — nur Geländeposition zählt.",timeChange:"Die Burg wäre in Stunden oder Tagen gefallen, nicht Monaten.",historicalParallels:["Vauban revolutionierte Belagerungstechnik im 17. Jh.","Krupps Kanonen 1866 machten alle Festungen obsolet"],confidence:"sehr hoch"},
  {likelihood:4,outcome:"Frühere Erbauung hätte technisch schwächere Mittel bedeutet.",analysis:"Frühere Epochen verfügten über weniger Baumaterial und weniger Ingenieurswissen. Die Burg wäre kleiner und schwächer. Gleichzeitig wären Angreifer schwächer — das Gleichgewicht bliebe ähnlich, nur auf niedrigerem Niveau.",wouldHaveFallen:true,keyFactor:"Technisches Wissen bestimmt die Qualität — früher bedeutet schwächer.",timeChange:"Die Burg wäre schneller gefallen, da primitiver konstruiert.",historicalParallels:["Motte-and-Bailey des 10. Jh. vs. Steinburgen des 12. Jh."],confidence:"mittel"},
  {likelihood:6,outcome:"Wasserreserven als Waffe hätten das Gleichgewicht gebrochen.",analysis:"Die Kontrolle über Wasser war in Belagerungen oft entscheidend. Kyros der Große leitete den Euphrat um und nahm Babylon in einer Nacht. Wer die Zisternen sichert oder den Graben trockenlegt, kontrolliert den Ausgang.",wouldHaveFallen:true,keyFactor:"Wasser ist Macht — für Verteidigung wie Angriff.",timeChange:"Ohne Wasser wäre die Burg in Wochen statt Jahren gefallen.",historicalParallels:["Kyros leitete den Euphrat um — Babylon fiel 539 v.Chr.","Wasserlinien sind die verwundbarste Versorgungsader"],confidence:"hoch"},
  {likelihood:7,outcome:"Verrat ist die häufigste Todesursache starker Burgen.",analysis:"Historisch fielen die stärksten Burgen selten durch direkten Angriff, sondern durch Verrat, Hunger oder politisches Versagen. Ein bestochener Torwächter kann tausend tapfere Männer zunichte machen. Das gilt für San Leo, Konstantinopel und Château Gaillard gleichermaßen.",wouldHaveFallen:true,keyFactor:"Keine Mauer ist stark genug gegen einen Verräter im eigenen Lager.",timeChange:"Der Fall wäre schlagartig innerhalb von Stunden gekommen.",historicalParallels:["San Leo fiel 1631 durch einen Torwächter","Château Gaillard durch die Latrinenöffnung"],confidence:"hoch"},
];

// WhatIf — pick best fallback based on scenario keywords
function getWhatIfFallback(scen, castle) {
  const s = scen.toLowerCase();
  let base;
  if(s.includes("garnison")||s.includes("mehr soldat")||s.includes("doppelt")||s.includes("truppen")) base=WHATIF_FALLBACKS[0];
  else if(s.includes("modern")||s.includes("kanone")||s.includes("artillerie")||s.includes("19.")||s.includes("20.")||s.includes("gewehr")) base=WHATIF_FALLBACKS[3];
  else if(s.includes("schwach")||s.includes("nicht existiert")||s.includes("repariert")||s.includes("latrine")||s.includes("drain")||s.includes("kerkaporta")||s.includes("lücke")) base=WHATIF_FALLBACKS[2];
  else if(s.includes("früher")||s.includes("100 jahre")||s.includes("200 jahre")||s.includes("früh")||s.includes("später")) base=WHATIF_FALLBACKS[4];
  else if(s.includes("wasser")||s.includes("fluss")||s.includes("graben")||s.includes("überflutu")||s.includes("trocken")) base=WHATIF_FALLBACKS[5];
  else if(s.includes("verräter")||s.includes("verrat")||s.includes("bestoch")||s.includes("spion")) base=WHATIF_FALLBACKS[6];
  else base=WHATIF_FALLBACKS[Math.floor(Math.random()*2)];
  return {
    ...base,
    outcome: base.outcome.replace("die Burg", castle.name),
    keyFactor: castle.weaknesses[0] ? `${castle.weaknesses[0]} war kritisch — ${base.keyFactor}` : base.keyFactor,
    historicalParallels: [...base.historicalParallels, `${castle.name}: ${castle.verdict.slice(0,75)}…`],
  };
}

// Lexikon offline facts — per castle
const LEXIKON_OFFLINE = {
  krak:["130 Jahre uneingenommen durch direkte Kraft — nur ein gefälschter Brief bezwang sie.","Die Kreuzritter bauten über eine frühere arabische Festung des 11. Jahrhunderts.","Der Wasservorrat in den Zisternen reichte theoretisch für 5 Jahre — die Garnison hätte ewig aushalten können.","1271 umfasste die Garnison nur noch etwa 200 statt der geplanten 2.000 Ritter.","Die doppelte Ringmauer war ein Novum: Bei Durchbruch der äußeren Mauer wartete bereits die innere."],
  masada:["Herodes der Große baute Masada als persönliche Fluchtburg aus — mit Mosaikböden, Badehäusern und Luxusapartments.","Die X. Legion Fretensis führte den Angriff — ihr Symbol war ein Eber, was die jüdischen Verteidiger besonders provozierte.","Der 'Masada-Komplex': Israelische Militäroffiziere leisten bis heute ihren Eid auf dem Tafelberg.","Archäologen fanden Ostraka (Tonscherben) mit Namen — möglicherweise die Lose für die letzte Hinrichtung.","Die Rampe ist bis heute sichtbar und eines der besterhaltenen römischen Ingenieurswerke."],
  carcassonne:["Die heutige Burg ist zu 70% eine Restaurierung von Viollet-le-Duc (19. Jh.) — historisch umstritten.","Kein toter Winkel: Jeder Zentimeter der Außenmauer kann von mindestens zwei Türmen beschossen werden.","Trencavel wurde während der Kapitulationsverhandlungen verhaftet — ein klarer Verstoß gegen das Kriegsrecht.","Carcassonne ist nach dem Eiffelturm das meistbesuchte Monument Frankreichs.","Der Zwinger zwischen den beiden Mauerringen diente als tödliche Falle für eingedrungene Angreifer."],
  chateau_gaillard:["Richard I. baute Gaillard in nur einem Jahr — er nannte sie 'meine schöne Tochter'.","Die gewellte (corrugated) Außenmauer war eine architektonische Innovation: Kugeln prallten ab statt einzuschlagen.","Der Soldat der durch die Latrine kroch hieß laut Chroniken Peter — sein Nachname ist nicht überliefert.","Philipp II. benötigte 3 Monate — Richard hätte laut Zeitgenossen gesagt, er würde sie auch halten wenn die Mauern aus Butter wären.","Die Burg stand auf einem isolierten Felsvorsprung über der Seine — drei Seiten waren natürlich geschützt."],
  harlech:["50 Mann hielten Harlech 7 Jahre im Rosenkrieg — die längste Belagerung des Konflikts.","'Men of Harlech' ist heute noch das offizielle Lied des Walisischen Garde-Regiments.","Der Versorgungsgang zum Meer: 61 Stufen hinunter zu einem kleinen Hafen — solange die See frei war, war die Burg unbesiegbar.","Edward I. baute Harlech als Teil seines 'Ring of Iron' — einem Netz von Burgen zur Kontrolle Wales.","Die vier Ecktürme sind so massiv, dass jeder einzeln als eigenständige Festung fungieren konnte."],
  constantinople:["Die Theodosianischen Mauern wurden 413 n.Chr. in nur wenigen Jahren fertiggestellt — ein Baurekord der Antike.","Griechisches Feuer: Das Rezept ist bis heute nicht vollständig rekonstruiert — Chemiker streiten noch über die genaue Zusammensetzung.","Urbans Kanone feuerte 600kg-Kugeln — und Urban arbeitete zunächst für die Byzantiner, die ihm zu wenig bezahlten.","29 Belagerungen in über 1.000 Jahren — jede scheiterte, bis zum letzten Tag.","Das Kerkaporta-Tor war so klein und unwichtig, dass niemand daran dachte, es zu sichern."],
  helmsdeep:["Tolkien basierte Helms Klamm teilweise auf dem Thermopylae-Pass wo Leonidas 300 Spartaner befehligte.","Der Abflusskanal ist eine typische Ingenieursschwäche: Viele historische Burgen haben ähnliche Drainagen.","'Tiefe' im Namen bezieht sich auf die Schlucht dahinter — Helm war ein früher König Rohans.","Peter Jackson drehte die Helmklamm-Szenen über 3 Monate ausschließlich nachts — die Schauspieler schliefen tagsüber.","Die Aglarond-Höhlen werden später von Gimli als das 'schönste Wunder von Mittelerde' beschrieben."],
  minas_tirith:["Tolkien beschrieb Minas Tirith als Abbild der mittelalterlichen kosmologischen Vorstellung der sieben Planetensphären.","'Ithilstein' (Mondstein) ist Tolkiens fiktives Material — widerstandsfähiger als alles Bekannte.","Die Pelennor-Felder basieren auf der Ebene vor Wien bei der osmanischen Belagerung 1683.","Der Weiße Baum im Innenhof der Citadel ist ein zentrales Symbol: Er blüht wenn der rechtmäßige König regiert.","Aragorns Armee der Toten ist Tolkiens Version der griechischen Sage von kämpfenden Totengeistern."],
  gondolin:["Tolkien schrieb den Fall Gondolins erstmals 1917 als junger Soldat im Ersten Weltkrieg.","'Gondolin' bedeutet auf Sindarin 'Verborgener Fels' — der Name verrät schon das Geheimnis.","Tolkien selbst nannte Gondolin 'Mittelerde's Troja' und den Fall das wichtigste Ereignis des Ersten Zeitalters.","Maeglin war Turgons eigener Neffe — der Verrat erschütterte Tolkiens Weltbild von Treue und Familie.","Die Geschichte wurde dreimal umgeschrieben — Tolkien konnte sich nie entscheiden wie tragisch der Verrat dargestellt werden sollte."],
  babylon:["Die Hängenden Gärten sind eine der Sieben Weltwunder — aber kein einziger babylonischer Text erwähnt sie.","Kyros nutzte eine perfekte Ablenkung: Das babylonische Neujahrsfest Akitu — Belsazar feierte während sein Reich fiel.","Nebukadnezar ließ seinen Namen in jeden einzelnen Backstein brennen — Millionen Ziegel tragen heute noch seinen Namen.","Die Doppelmauern waren so breit, dass vier Pferdegespanne nebeneinander auf der Mauerkrone fahren konnten.","Babylon war mit ca. 200.000 Einwohnern 600 v.Chr. die größte Stadt der Welt — weit vor Rom oder Athen."],
  barad_dur:["Tolkien beschreibt Barad-dûr als durch Saurons Willen allein zusammengehalten — nicht durch Baukunst.","Der Turm wurde zweimal zerstört: Einmal durch die Allianz in der Zweiten Ära, einmal durch den Ringwurf.","Das Auge Saurons ist nicht sein buchstäbliches Auge — es ist ein metaphysisches Symbol seiner Aufmerksamkeit.","Sauron ist keine körperliche Kreatur mehr — er kann sich nicht mehr in menschlicher Form zeigen nach dem Fall Númenors.","Barad-dûr wurde an einem Berghang im Inneren Mordors gebaut — selbst die Lage ist eine Verteidigungswaffe."],
  isengard:["Saruman hatte Jahrhunderte damit verbracht, Isengard zur Industriefestung umzubauen — er fiel Bäume für Jahrhunderte.","Orthanc bedeutet auf Sindarin 'Gespaltene Spitze' — aber auch 'Gerissener Verstand'.","Die Ents sind Tolkiens Metapher für die Zerstörung der Natur durch Industrie und Technik.","Saruman hatte einen Palantir (Seh-Stein) — damit konnte er direkt mit Sauron kommunizieren und wurde korrumpiert.","Nach der Zerstörung wurde Isengard in einen Garten verwandelt — das 'Nan Curunír' kehrte zur Natur zurück."],
  erebor:["Tolkien basierte Erebor auf nordischen Sagen von Drachen die auf Schätzen schlafen.","Smaug ist nach Tolkien der 'letzte und mächtigste' Drache in Mittelerde zur Zeit des Hobbit.","Der Arkenstein ('Herz des Berges') ist Tolkiens Version des Rheingoldes aus der deutschen Mythologie.","Die Geheimtür kann nur bei Durin's Day im letzten Mondlicht gefunden werden — einmal im Jahr, für wenige Minuten.","Gimli, Sohn Gloins, der an der Gemeinschaft teilnahm, war selbst ein Bewohner Erebors."],
  winterfell:["Winterfell wurde vor 8.000 Jahren von Bran dem Erbauer gegründet — er soll auch die Mauer gebaut haben.","Die heißen Quellen unter der Burg sind einzigartig — sie verhindern das Einfrieren der Mauern im Winter.","Der Name bedeutet 'wo der Winter fällt' — die Starks sind buchstäblich die Wächter gegen den kommenden Winter.","Die Krypten reichen tiefer als die Burg alt ist — niemand weiß wer die ersten Gräber anlegte.","'Der Norden erinnert sich' — die Treue der Nordlords zu Winterfell übersteht Generationen von Verrat und Krieg."],
  kings_landing:["Aegon I. Targaryen gründete Königsmund an der Stelle wo er mit Balerion landete.","Der Eiserne Thron ist aus tausend geschmolzenen Schwertern gefertigt — und schneidet absichtlich: 'Ein König sollte nie bequem sitzen.'","Die Wildfeuer-Depots unter der Stadt enthalten genug Substanz um die gesamte Stadt zu verbrennen.","Die Rote Burg wurde von Maegor dem Grausamen gebaut — er ließ alle Baumeister töten damit niemand die Geheimgänge kannte.","Königsmund hatte 500.000 Einwohner — die größte Stadt Westeros, aber auch die schmutzigste."],
  // Neue historische Burgen
  dover:["Dover ist die einzige englische Burg die seit der Normannenzeit bis heute ununterbrochen in militärischem Gebrauch war — über 900 Jahre.","Hubert de Burgh hielt Dover 1216 gegen Louis von Frankreich: Ein Minengang unter dem Nordtor kollabierte — gerettet durch schnelles Ummauern.","Unter Dover existiert ein geheimes Tunnelsystem aus dem Zweiten Weltkrieg das als Hauptquartier für die Evakuierung von Dünkirchen genutzt wurde.","Heinrich II. baute den Großen Turm in den 1180ern — mit 3m dicken Mauern und 21m Höhe war er für sein Zeitalter einzigartig.","'Schlüssel zu England' nannte man Dover — wer die Burg hielt, kontrollierte die kürzeste Überfahrt zum Kontinent."],
  caerphilly:["Caerphilly war die erste Burg in Großbritannien die das Prinzip der konzentrischen Wasserverteidigung vollständig umsetzte.","Gilbert de Clare baute sie 1268–1271 als direkte Reaktion auf Llywelyn ap Gruffudd — ein architektonisches Wettrüsten.","Der Südturm von Caerphilly ist berühmter als der Schiefe Turm von Pisa — er lehnt um fast 10 Grad, wurde aber nie restauriert.","Die Seen wurden durch Dämme aufgestaut — im Kriegsfall konnte man die Schleusen öffnen und das Umland überfluten.","Caerphilly ist nach Windsor die flächenmäßig zweitgrößte Burg in England und Wales."],
  kenilworth:["Die 9-monatige Belagerung 1265 ist die längste Belagerung in der gesamten englischen Geschichte.","Heinrich III. ließ extra eine schwimmende Plattform mit Katapulten bauen — die Verteidiger beschossen sie und versenkten sie.","Der Merevale-See, ein künstlich aufgestauter See, machte drei Seiten der Burg uneinnehmbar.","Simon de Montfort gilt als 'Vater des englischen Parlaments' — seine Anhänger in Kenilworth kämpften für die Magna Carta.","Robert Dudley, Liebling Elisabeths I., baute Kenilworth später zu einem Prachtschloss um — die Belagerungsruinen wurden zum Garten."],
  chateau_de_gisors:["27 Jahre wechselte Gisors zwischen England und Frankreich — kein anderes Bauwerk symbolisiert den Kampf um die Normandie besser.","Heinrich II. und Philipp II. trafen sich hier für diplomatische Verhandlungen — unter dem 'Ulmenbaum von Gisors'.","Legenden besagen dass die Templer den Heiligen Gral in den Kellern von Gisors versteckten — keine historische Grundlage, aber persistenter Mythos.","Richard Löwenherz soll gesagt haben er würde Gisors 'lieber verkaufen als zurückgeben' — er tat es trotzdem.","1193 fiel Gisors in wenigen Wochen — als Richard in Wien gefangen saß, gab es niemanden der die Normannen führte."],
  beaumaris:["Beaumaris wird von Architektur-Historikern als 'die geometrisch vollkommenste Burg der Welt' bezeichnet.","Ironischerweise wurde Beaumaris nie fertiggestellt — Geldmangel stoppte den Bau nach 35 Jahren.","Die mathematische Symmetrie ist verblüffend: Jeder Turm, jedes Tor, jeder Zugang ist exakt spiegelbildlich.","Edward I. baute Beaumaris 1295 als letzte seiner walisischen Burgen — er hatte 1282 Wales endgültig unterworfen.","Beaumaris wurde so gut wie nie ernsthaft angegriffen — ihre bloße Existenz schreckte jeden möglichen Angreifer ab."],
  san_leo:["Nur ein einziger Pfad führt auf den Felsmonolith — Friedrich Barbarossa, Cesare Borgia und Napoleon scheiterten alle.","1631 fiel San Leo durch einen einzigen Torwächter der bestochen wurde — nach 400 Jahren der Uneinnehmbarkeit.","Graf Cagliostro, der berühmte Scharlatan des 18. Jahrhunderts, starb in den Gefängnissen von San Leo.","Francesco di Giorgio Martini, einer der bedeutendsten Militärarchitekten der Renaissance, baute San Leo im 15. Jahrhundert um.","Der Fels selbst ist das Fundament der Burg — kein Unterminieren, kein Ausheben ist möglich."],
  knossos:["Knossos hatte 1350 v.Chr. eine unterirdische Kanalisation mit fließendem Wasser — ein Luxus der in Europa erst im 19. Jahrhundert wiederkehrte.","Sir Arthur Evans rekonstruierte Knossos 1900–1935 teilweise — kontrovers, da er viele Details erfand statt fand.","Die minoische Schrift 'Linear A' ist bis heute nicht entziffert — wir wissen nicht was die Minorer selbst über Knossos dachten.","Das Labyrinth-Motiv könnte auf die verwirrenden 1300 Räume des Palastes zurückgehen — die wirkliche Inspiration des Minotaurus-Mythos.","1450 v.Chr. erlebte Kreta eine mysteriöse Katastrophe — ob Vulkan, Tsunami oder Invasion, die Historiker streiten noch heute."],
  malbork:["Die Marienburg ist mit 143.591 m² die flächenmäßig größte Burg der Welt — größer als die meisten mittelalterlichen Städte.","1410 verlor der Deutsche Orden die Entscheidungsschlacht bei Tannenberg vernichtend — aber die Burg hielt stand.","1457 verkauften unbezahlte böhmische Söldner die Marienburg einfach an Polen — der billigste Burgkauf der Geschichte.","Im Zweiten Weltkrieg wurde die Burg zu 50% zerstört — die Wiederherstellung begann 1962 und dauert bis heute.","Die Backsteinarbeiten der Marienburg sind das größte Backsteinbauwerk der Welt — jeder Stein wurde von Hand gefertigt."],
  rohtas:["Sher Shah Suri baute Rohtas in nur 8 Jahren — ein Tempo das für ein 4km² großes Bollwerk kaum vorstellbar ist.","Rohtas wurde nie durch direkten Angriff eingenommen — selbst Akbar der Große umging es lieber als es anzugreifen.","Das Kahani-Tor ist das prächtigste Tor des Subkontinents — 18m hoch, mit geometrischen Mustern verziert.","Die 68 halbkreisförmigen Bastionen wurden mathematisch so berechnet dass kein Bereich außerhalb der Schussreichweite liegt.","Rohtas und das Rohtas Fort in Pakistan (Sher Shahs) sind zwei verschiedene Burgen — beide UNESCO-Welterbe, beide uneingenommen."],
  nimrod:["Nimrod Fortress ist nach dem biblischen Jäger Nimrod benannt — obwohl sie 3000 Jahre nach ihm gebaut wurde.","Die 420 Meter lange Mauer folgt exakt dem Bergrücken — ein Ingenieurswunder ohne Vermessungstechnik.","1260 überlebte Nimrod den Mongolen-Sturm der Syrien verwüstete — einer der wenigen Punkte die der Mongolenflut widerstanden.","Heute liegt Nimrod auf den Golanhöhen — genau an der Grenze zwischen Israel und Syrien, politisch so umstritten wie einst.","Der höchste Punkt des Ostturms bietet Sicht bis Damaskus, den See Genezareth und den Hermon — militärisch unbezahlbar."],
  // Neue Fantasy-Burgen
  dol_guldur:["Tolkien schrieb Dol Guldur zuerst als geheimnisvolles 'Hill of Sorcery' — erst später wurde klar dass Sauron dort residierte.","Gandalf brach dreimal in Dol Guldur ein — beim dritten Mal fand er Thráin II., Thorins Vater, wahnsinnig aber noch lebend.","'Dol Guldur' bedeutet auf Sindarin 'Hügel des dunklen Zauberers' — ein Euphemismus der den wahren Bewohner verschleierte.","Galadriel zerstörte Dol Guldur persönlich in der Nacht der Ringkrieg begann — eine der wenigen Momente wo sie ihre volle Macht zeigte.","Der Düsterwald selbst war Dol Guldurs beste Verteidigung — er verwandelte sich durch Saurons Einfluss in ein mörderisches Labyrinth."],
  storms_end:["Sturmkap wurde laut Legende von Durran Donnergott mit Hilfe der Götter gebaut — der Turm hat keine Ecken oder Kanten damit der Wind keinen Halt findet.","Stannis Baratheon hielt Sturmkap ein Jahr lang mit einer hungernden Garnison — gerettet durch Davos Seaworth der als Zwiebelschmuggler Nahrung durchschleuste.","Die Architektur ist magisch begründet: Runde Türme ohne Winkel lassen Katapultsteine abgleiten statt eindringen.","Jon Connington verteidigte Sturmkap in Roberts Rebellion — und verlor sie letztlich, was seine Verbannung bedeutete.","Das Kap des Zorns ist für seine tödlichen Stürme bekannt — selbst feindliche Flotten verloren mehr Schiffe an Stürmen als an Verteidigern."],
  // Persönliche Burg
  schwarzer_bergfried:["Ursprünglich ca. 800–850 als Wachturm errichtet — noch vor der Gründung des Ordo Custodum Sorrowland selbst.","Das Motto: 'In silentio vigilamus' — Im Schweigen wachen wir. Der Schwarze Bergfried verkörpert es: massiv, kompakt, schweigsam.","Hier lagert das Archiv des Ordens — Jahrhunderte an Wissen und Geheimnissen. Die Ritter sterben eher als es preiszugeben.","Der Turm ist letzter Rückzugspunkt des Ordenssystems. Erst wenn Castle Sorrow und Gravecrest fallen, wird er aktiv verteidigt.","Das Wappen zeigt diesen Turm in zwei Varianten: detailliertes Siegelwappen für Dokumente, vereinfachter schwarzer Turm für Schilde und Banner."],
  castle_sorrow:["Castle Sorrow wurde im 10.–11. Jahrhundert als Ordenshauptquartier errichtet — erste feste Heimat des Ordo Custodum Sorrowland.","Im 15.–16. Jahrhundert um einen Kanonen-Bastionsturm erweitert — eine frühe Anpassung an Schwarzpulverwaffen, ähnlich wie bei der Marienburg in Polen.","Hier tagt der Ordensrat, hier lagern die Waffen, hier leben die meisten Ritter. Castle Sorrow ist das Herz des Ordens.","Die größte Schwäche ist die Größe selbst — mehr Fläche bedeutet mehr zu verteidigen, und bei zu kleiner Garnison entstehen tote Winkel.","Das strategische Konzept: Castle Sorrow hält den Hauptangriff, Gravecrest sammelt Verstärkung, der Schwarze Bergfried bleibt letzter Rückzugsort. Ein Feind muss alle drei isolieren."],
  gravecrest:["Gravecrest wurde im 12. Jahrhundert erbaut und ähnelt in seiner Berglagen-Strategie dem Hochosterwitz in Kärnten — nur ein schmaler Pfad führt hinauf.","Von Gravecrest aus sieht man Castle Sorrow und den Schwarzen Bergfried gleichzeitig — ideal für das Signalfeuer-System des Ordens.","Rauchsignale am Tag, Feuerzeichen in der Nacht, Hornsignale bei Alarm — das Drei-Burgen-System verhindert jeden Überraschungsangriff.","Die Bergfestung dient als Sammelplatz wenn Castle Sorrow unter Druck steht — überlebende Ritter reorganisieren sich hier für den Gegenangriff.","Fast unmöglich zu stürmen: Ein Dutzend Mann kann auf dem Pfad Hunderte aufhalten. Hunger bleibt die einzige echte Waffe gegen Gravecrest."],
};

// Generic Lexikon facts for castles without specific entries
function getLexikonFacts(castle) {
  if(LEXIKON_OFFLINE[castle.id]) return LEXIKON_OFFLINE[castle.id];
  // Generate from castle data
  return [
    `${castle.name} (${castle.era}) war eine der bedeutendsten Festungen ihrer Zeit in ${castle.loc}.`,
    `Die wichtigste Stärke: ${castle.strengths[0]}. Das machte sie zu einem formidablen Verteidigungsbauwerk.`,
    `Die kritische Schwachstelle war ${castle.weaknesses[0].toLowerCase()} — genau das führte zum historischen Ende.`,
    castle.history,
    `Fazit der Militärhistoriker: ${castle.verdict}`,
  ];
}

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

// ─── WORLD MAP POSITIONS ──────────────────────────────────────────────────
const COORDS = {
  // ── EUROPA ─────────────────────────────────────────
  carcassonne:    {x:46, y:24},   // S-Frankreich
  chateau_gaillard:{x:46,y:20},   // Normandie
  coucy:          {x:48, y:21},   // N-Frankreich
  mont_michel:    {x:44, y:22},   // Bretagne
  harlech:        {x:42, y:19},   // Wales
  caernarvon:     {x:42, y:21},   // Wales
  windsor:        {x:44, y:19},   // England
  bodiam:         {x:45, y:20},   // SE England
  alhambra:       {x:43, y:31},   // Spanien
  // ── NAHER OSTEN ─────────────────────────────────────
  constantinople: {x:57, y:28},   // Bosphorus
  rhodes:         {x:57, y:32},   // Ägäis
  krak:           {x:62, y:33},   // Syrien
  akkon:          {x:61, y:35},   // Levante
  masada:         {x:61, y:37},   // Judäa
  babylon:        {x:64, y:34},   // Mesopotamien
  persepolis:     {x:66, y:35},   // Persien
  alamut:         {x:65, y:30},   // Alborz
  // ── OSTASIEN ────────────────────────────────────────
  great_wall:     {x:78, y:27},   // China
  himeji:         {x:84, y:30},   // Japan
  angkor:         {x:79, y:44},   // Kambodscha
  mehrangarh:     {x:69, y:36},   // Indien
  // ── MITTELERDE (oben links, gut verteilt) ────────────
  angband:        {x:5,  y:5 },
  gondolin:       {x:9,  y:6 },
  erebor:         {x:15, y:5 },
  khazad_dum:     {x:7,  y:9 },
  isengard:       {x:5,  y:12},
  edoras:         {x:9,  y:12},
  helmsdeep:      {x:6,  y:15},
  minas_tirith:   {x:12, y:14},
  minas_morgul:   {x:14, y:16},
  barad_dur:      {x:17, y:13},
  // ── WESTEROS (unten links, klar getrennt) ────────────
  winterfell:     {x:6,  y:22},
  harrenhal:      {x:10, y:24},
  kings_landing:  {x:14, y:23},
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

// ── NEUE BURGEN (Batch 2) ─────────────────────────────────────────────────

{id:"dover",name:"Dover Castle",sub:"Schlüssel zu England",era:"1180–1216",year:1180,loc:"Kent, England",type:"real",epoch:"Mittelalter",region:"europa",icon:"🏴",
 theme:{bg:"#0e0f14",accent:"#8899cc",glow:"rgba(120,140,200,0.14)"},
 ratings:{walls:88,supply:82,position:95,garrison:75,morale:80},
 desc:"Auf Kreidefelsen über dem Ärmelkanal — der kürzeste Punkt zwischen England und Frankreich.",
 history:"1216 hielt Louis von Frankreich monatelang stand. Durch einen Minengang unter dem Nordtor fast gefallen — gerettet durch schnelle Reparatur.",
 verdict:"Strategisch unersetzbar. Wer Dover hält, hält England.",
 zones:[{id:"gt",l:"Großer Turm (12. Jh.)",x:50,y:45,r:15,c:"#8899cc",a:6,d:"Henrys II. Meisterwerk — 3m dicke Mauern."},{id:"ow",l:"Äußerer Mauerring",x:50,y:50,r:44,c:"#6677aa",a:4,d:"Konzentrische Verteidigung."},{id:"nt",l:"Nordtor ⚠",x:50,y:8,r:10,c:"#cc4444",a:1,d:"1216 fast durch Minengang gefallen."}],
 strengths:["Kreideklippen 100m hoch","Doppelte Ringmauer","Direkter Seeblick"],
 weaknesses:["Nordtor durch Unterminierung anfällig","Große Fläche zu verteidigen"],
 attackTips:["Nördlichen Boden unterminieren","Aushungern über Seeblockade","Tunnelbau unter dem Nordtor"],
 siegeCtx:"1216 — Du befehligst Louis' französische Ritter. Northgate ist die Schwachstelle.",defender:"Hubert de Burgh"},

{id:"caerphilly",name:"Caerphilly Castle",sub:"Wasserburg-Meisterwerk",era:"1268–1327",year:1270,loc:"Wales",type:"real",epoch:"Mittelalter",region:"europa",icon:"💧",
 theme:{bg:"#0a1015",accent:"#44aacc",glow:"rgba(60,150,180,0.14)"},
 ratings:{walls:90,supply:78,position:85,garrison:65,morale:72},
 desc:"Größte Wasserburg Großbritanniens. Vier separate Inseln durch künstliche Seen verbunden.",
 history:"Gilbert de Clare baute sie als Antwort auf Llywelyn ap Gruffudd. Einzige walisische Burg die nie durch direkten Angriff fiel.",
 verdict:"Die Wasserverteidigung machte Caerphilly praktisch uneinnehmbar — bis die Seen trockengelegt wurden.",
 zones:[{id:"ws",l:"Wassergräben (2 Seen)",x:50,y:50,r:44,c:"#4488cc",a:5,d:"Künstliche Seen auf 3 Seiten."},{id:"mk",l:"Mittelburg",x:50,y:50,r:22,c:"#44aacc",a:5,d:"Hauptkernburg auf Insel."},{id:"sd",l:"Süddamm ⚠",x:50,y:90,r:10,c:"#cc4444",a:1,d:"Einziger Landzugang."}],
 strengths:["Vier konzentrische Wasserringe","Künstliche Seen","Selbstversorgend durch Wasserregulierung"],
 weaknesses:["Süddamm einziger Landzugang","Seen können manipuliert werden"],
 attackTips:["Süddamm angreifen","Seen durch Kanäle ablassen","Belagerungstürme auf Flöße"],
 siegeCtx:"1270er — Llywelyns Heer steht vor den Seen. Der Damm ist der einzige Weg.",defender:"Gilbert de Clare"},

{id:"kenilworth",name:"Kenilworth Castle",sub:"Längste Belagerung Englands",era:"1265",year:1265,loc:"Warwickshire, England",type:"real",epoch:"Mittelalter",region:"europa",icon:"🔴",
 theme:{bg:"#130a08",accent:"#cc5533",glow:"rgba(180,70,40,0.14)"},
 ratings:{walls:85,supply:90,position:80,garrison:70,morale:85},
 desc:"1265: 9 Monate Belagerung durch Heinrich III. — die längste in der englischen Geschichte.",
 history:"Simon de Montforts Anhänger hielten 9 Monate. Fiel letztlich durch Hunger und Seuchen, nicht durch militärischen Durchbruch.",
 verdict:"Ausreichende Wasserversorgung und Vorräte machen jede Burg zur Geduldsprobe für den Angreifer.",
 zones:[{id:"mk2",l:"Merevale-See",x:50,y:60,r:35,c:"#4488cc",a:4,d:"Künstlicher See schützt Süd+West."},{id:"dt",l:"Großer Turm",x:50,y:40,r:18,c:"#cc5533",a:5,d:"Mächtigstes Element."},{id:"nb",l:"Nordzugang ⚠",x:50,y:5,r:10,c:"#cc4444",a:1,d:"Nordzugang ohne Seeschutz."}],
 strengths:["Künstlicher See","Große Vorräte","Hohe Moral durch politische Überzeugung"],
 weaknesses:["Isoliert ohne Entsatz möglich","Krankheit bei langer Belagerung"],
 attackTips:["Vollständige Einkreisung","Geduld — Hunger besiegt sie","Seuchen durch Kadaver ins Wasser"],
 siegeCtx:"1265 — Heinrich III. Heer umzingelt Kenilworth. 9 Monate Geduld sind nötig.",defender:"Henry de Hastings"},

{id:"chateau_de_gisors",name:"Château de Gisors",sub:"Streitapfel der Könige",era:"1097–1193",year:1097,loc:"Normandie, Frankreich",type:"real",epoch:"Mittelalter",region:"europa",icon:"⚔️",
 theme:{bg:"#100d08",accent:"#b08840",glow:"rgba(160,120,55,0.14)"},
 ratings:{walls:80,supply:72,position:82,garrison:60,morale:65},
 desc:"27 Jahre wechselte Gisors zwischen Frankreich und England. Philipp II. nahm sie 1193 während Richard im Kreuzzug war.",
 history:"Gebaut von William Rufus. Heinrich II. und Philipp II. trafen sich hier für diplomatische Verhandlungen. 1193 gefallen als Richard Löwenherz in Wien gefangen saß.",
 verdict:"Politisch wichtiger als militärisch stark — ein Symbol des Kampfes um die Normandie.",
 zones:[{id:"rk",l:"Große Runde (Bergfried)",x:50,y:45,r:18,c:"#b08840",a:5,d:"Achteckiger Turm auf Motte."},{id:"ow2",l:"Äußere Enceinte",x:50,y:50,r:42,c:"#806030",a:3,d:"Große Außenanlage."},{id:"sw3",l:"Stadtmauer ⚠",x:50,y:80,r:14,c:"#cc4444",a:2,d:"Schützt nur Stadt, nicht Burg."}],
 strengths:["Oktagonaler Bergfried","Motte mit natürlichem Höhenvorteil","Strategisch zwischen Paris und Rouen"],
 weaknesses:["Stadt schlecht gesichert","Bei Abwesenheit des Königs gefährdet"],
 attackTips:["Stadt zuerst nehmen","Bergfried isolieren","Psychologisch: abwarten bis König abwesend"],
 siegeCtx:"1193 — Richard ist in Wien gefangen. Philipp greift Gisors an. Nur wenige Ritter halten die Burg.",defender:"Gilbert de Vascoeuil"},

{id:"beaumaris",name:"Beaumaris Castle",sub:"Die perfekte Burg",era:"1295–1330",year:1295,loc:"Anglesey, Wales",type:"real",epoch:"Mittelalter",region:"europa",icon:"💎",
 theme:{bg:"#0c0f12",accent:"#77aacc",glow:"rgba(100,160,190,0.14)"},
 ratings:{walls:94,supply:80,position:78,garrison:68,morale:70},
 desc:"Symmetrisch perfekt, nie fertiggestellt — die letzte und vollkommenste Konzentrisch-Burg Edwards I.",
 history:"Nie fertiggestellt durch Geldmangel. Wurde so gut wie nie ernsthaft belagert — ihre bloße Existenz schreckte ab.",
 verdict:"Architektonisch die vollendetste Burg der Welt — aber nie kämpferisch getestet.",
 zones:[{id:"ow3",l:"Äußere Mauer (16 Türme)",x:50,y:50,r:44,c:"#77aacc",a:4,d:"16 Türme in perfekter Symmetrie."},{id:"iw",l:"Innere Mauer (6 Türme)",x:50,y:50,r:28,c:"#aaccdd",a:5,d:"Massiver als die äußere."},{id:"gv2",l:"Graben+Hafen",x:50,y:80,r:14,c:"#4488cc",a:5,d:"Wassergraben mit Hafen für Versorgung."}],
 strengths:["Perfekte konzentrische Symmetrie","Kein toter Winkel möglich","Hafen für Seeversorgung"],
 weaknesses:["Nie fertiggestellt","Wenig historisch getestet"],
 attackTips:["Theoretisch: Hafen blockieren","Geldmangel ausnutzen (historisch)","Verhandeln — nie ernsthaft belagert"],
 siegeCtx:"1298 — Du befehligst walisische Rebellen. Beaumaris ist noch im Bau. Jetzt ist die Chance.",defender:"Walter de Windsor"},

{id:"san_leo",name:"San Leo",sub:"Uneinnehmbare Felsburg",era:"1240–1631",year:1240,loc:"Montefeltro, Italien",type:"real",epoch:"Mittelalter",region:"europa",icon:"🦅",
 theme:{bg:"#110d0a",accent:"#c07840",glow:"rgba(180,110,55,0.14)"},
 ratings:{walls:85,supply:55,position:99,garrison:40,morale:75},
 desc:"Auf einem 600m-Felsmonolith — nur ein einziger Pfad führt hinauf.",
 history:"Friedrich Barbarossa, Cesare Borgia, Napoleon — alle scheiterten. Fiel 1631 nur durch Verrat eines Torwächters.",
 verdict:"Die Position macht den Verteidiger — aber jede Burg fällt durch Verrat.",
 zones:[{id:"fp",l:"Felsplateau",x:50,y:50,r:44,c:"#8b6030",a:6,d:"600m hoher Monolith — 3 Seiten senkrecht."},{id:"sp",l:"Einzelner Pfad ⚠",x:50,y:95,r:10,c:"#cc4444",a:1,d:"EINZIGER Zugang — kann leicht blockiert werden."},{id:"ct2",l:"Zitadelle",x:50,y:35,r:15,c:"#c07840",a:5,d:"Kern auf höchstem Punkt."}],
 strengths:["600m Felsmonolith","Einziger Pfad leicht verteidigbar","Psychologische Wirkung"],
 weaknesses:["Versorgung nur über einen Pfad","Wenig Verteidiger möglich","Verrat gefährlich"],
 attackTips:["Pfad blockieren — Hunger","Verräter kaufen","Jahrelange Geduld"],
 siegeCtx:"Du belagertst San Leo. Der einzige Pfad ist eng. Ein einzelner Verräter kann alles ändern.",defender:"Guido da Montefeltro"},

{id:"knossos",name:"Palast von Knossos",sub:"Labyrinth des Minotaurus",era:"2000–1450 v.Chr.",year:-1700,loc:"Kreta, Griechenland",type:"real",epoch:"Antike",region:"nahost",icon:"🐂",
 theme:{bg:"#150f05",accent:"#d4aa44",glow:"rgba(200,160,55,0.14)"},
 ratings:{walls:55,supply:85,position:72,garrison:50,morale:90},
 desc:"Minoischer Palast ohne klassische Mauern — die Labyrinthartige Anlage war die Verteidigung.",
 history:"1450 v.Chr. durch unbekannte Katastrophe zerstört — Erdbeben, Tsunami oder mykenische Invasion. Homer nennt es 'Knossos, die große Stadt'.",
 verdict:"Nicht durch Mauern geschützt, sondern durch Seemacht und geografische Isolation.",
 zones:[{id:"th",l:"Thronsaal",x:50,y:40,r:14,c:"#d4aa44",a:3,d:"Rituelles Zentrum."},{id:"lb",l:"Labyrinth-Komplex",x:50,y:50,r:35,c:"#aa8830",a:2,d:"1300 Räume — orientierungslos."},{id:"hb",l:"Hafen",x:50,y:85,r:15,c:"#4488cc",a:4,d:"Minoische Flotte schützte."}],
 strengths:["Minoische Seemacht","Geografische Insellage","Wirtschaftliche Stärke"],
 weaknesses:["Keine klassischen Mauern","Verwundbar ohne Seemacht"],
 attackTips:["Minoische Flotte zerstören","Tsunami abwarten","Inneren Aufstand schüren"],
 siegeCtx:"1450 v.Chr. — Mykenische Krieger landen auf Kreta. Die Flotte ist weg. Knossos liegt offen.",defender:"König Minos"},

{id:"malbork",name:"Marienburg (Malbork)",sub:"Größte Backsteinburg der Welt",era:"1274–1457",year:1274,loc:"Polen",type:"real",epoch:"Mittelalter",region:"europa",icon:"✝️",
 theme:{bg:"#0e0c08",accent:"#cc9933",glow:"rgba(185,140,45,0.14)"},
 ratings:{walls:92,supply:88,position:82,garrison:78,morale:82},
 desc:"Hauptsitz des Deutschen Ordens. 6 km² Fläche — die größte Burg der Welt nach Fläche.",
 history:"1410 nach Tannenberg belagert — trotz vernichtender Niederlage des Ordens hielt die Burg. Fiel 1457 durch unbezahlte Söldner die sie verkauften.",
 verdict:"Selbst nach totaler Niederlage im Feld ist eine gut versorgte Burg kaum zu nehmen.",
 zones:[{id:"hb2",l:"Hochburg",x:50,y:30,r:18,c:"#cc9933",a:6,d:"Kern — Sitz des Hochmeisters."},{id:"mb2",l:"Mittelburg",x:50,y:55,r:28,c:"#aa7722",a:5,d:"Verwaltung und Ritter."},{id:"vb",l:"Vorburg",x:50,y:78,r:40,c:"#886611",a:3,d:"Wirtschaftsbereich."},{id:"ng2",l:"Nogat-Fluss",x:10,y:50,r:14,c:"#4488cc",a:4,d:"Fluss schützt Westseite."}],
 strengths:["Dreistufige Verteidigung","Flussschutz im Westen","Enorme Vorräte für langen Kampf"],
 weaknesses:["Enormer Personalaufwand","Söldner als Schwachstelle"],
 attackTips:["Söldner bestechen (historisch 1457)","Vollständige Einkreisung","Flussüberquerung erzwingen"],
 siegeCtx:"1410 nach Tannenberg — Polnisch-litauisches Heer vor den Mauern. Der Orden liegt am Boden.",defender:"Heinrich von Plauen"},

{id:"rohtas",name:"Rohtas Fort",sub:"Das uneinnehmbare Bollwerk",era:"1541–1555",year:1541,loc:"Punjab, Pakistan",type:"real",epoch:"Neuzeit",region:"nahost",icon:"🏔️",
 theme:{bg:"#12100a",accent:"#c8a050",glow:"rgba(185,148,65,0.14)"},
 ratings:{walls:90,supply:82,position:88,garrison:72,morale:78},
 desc:"Sher Shah Suri baute Rohtas in 8 Jahren um den Mogul Humayun aus dem Punjab fernzuhalten.",
 history:"Nie durch direkten Angriff eingenommen. Humayun kehrte 1555 zurück — aber Rohtas blieb stehen.",
 verdict:"Rohtas beweist: Eine gut geplante Burg braucht keine mächtige Armee zur Verteidigung.",
 zones:[{id:"km",l:"Kahani-Tor",x:30,y:80,r:14,c:"#c8a050",a:4,d:"Haupteingang mit Torhäusern."},{id:"bst",l:"Bastionen (68 Stück)",x:50,y:50,r:42,c:"#a08040",a:5,d:"68 halbkreisförmige Bastionen."},{id:"rv",l:"Kahan-Fluss",x:50,y:90,r:15,c:"#4488cc",a:4,d:"Fluss schützt Südseite."}],
 strengths:["68 Bastionen ohne toten Winkel","Flussschutz","Massive Fläche 4km²"],
 weaknesses:["Zu groß für kleine Garnison","Weit von Hilfstruppen entfernt"],
 attackTips:["Kahani-Tor zuerst","Belagerungsrampen an Flanken","Interne Unruhen schüren"],
 siegeCtx:"1555 — Humayun marschiert zurück. Rohtas steht. Nur List oder Verrat können helfen.",defender:"Todar Mal"},

{id:"nimrod",name:"Nimrod Fortress",sub:"Kreuzritter am Hermon",era:"1228–1260",year:1228,loc:"Golanhöhen, Israel",type:"real",epoch:"Mittelalter",region:"nahost",icon:"🗻",
 theme:{bg:"#0f0d0a",accent:"#9aaa55",glow:"rgba(140,160,70,0.14)"},
 ratings:{walls:82,supply:68,position:96,garrison:55,morale:68},
 desc:"Auf einem Bergrücken des Hermon, 815m hoch. Gebaut um den Weg von Damaskus nach Jerusalem zu kontrollieren.",
 history:"1260 von den Mongolen belagert — hielt stand. Fiel letztlich durch politische Vereinbarung, nicht durch Kampf.",
 verdict:"Position allein macht eine Burg gefährlich — Nimrod kontrollierte jeden Karawanenweg.",
 zones:[{id:"er",l:"Ostturm (Höchster Punkt)",x:80,y:20,r:12,c:"#9aaa55",a:5,d:"Sicht auf 50km."},{id:"lw",l:"Langgestreckte Mauer 420m",x:50,y:50,r:42,c:"#7a8a40",a:4,d:"Folgt dem Bergrücken."},{id:"wt",l:"Westtor ⚠",x:15,y:65,r:10,c:"#cc4444",a:2,d:"Schwächster Punkt."}],
 strengths:["815m Berglage","420m Mauer folgt dem Grat","Sichtkontrolle aller Karawanenwege"],
 weaknesses:["Schmal und langgestreckt","Westende schwächer"],
 attackTips:["Westende zuerst angreifen","Versorgung von Damaskus abschneiden","Belagerungstürme den Hang hochziehen"],
 siegeCtx:"1260 — Hulagu Khans Mongolen marschieren durch Syrien. Nimrod ist das letzte Kreuzfahrerhindernis.",defender:"Julien de Grenier"},

// ── NEUE FANTASY-BURGEN ────────────────────────────────────────────────────

{id:"minas_anor",name:"Ost-Emnet Turm",sub:"Amon Anwar",era:"Drittes Zeitalter",year:3019,loc:"Gondan, Mittelerde",type:"fantasy",epoch:"Mittelerde",region:"mittelerde",icon:"🌟",
 theme:{bg:"#0e1018",accent:"#aabbdd",glow:"rgba(150,170,210,0.14)"},
 ratings:{walls:78,supply:72,position:85,garrison:60,morale:88},
 desc:"Beobachtungsturm auf dem Grenzrücken zwischen Rohan und Gondor — ursprünglicher Ort des Orthanc-Steins.",
 history:"Als Arnor zerfiel wurde der Turm aufgegeben. Später entdeckten die Rohirrim seine strategische Bedeutung für die Kontrolle des Undeeps.",
 verdict:"Strategische Sichtlinie trumpft Mauerstärke — ein einsamer Turm kann eine ganze Grenze kontrollieren.",
 zones:[{id:"bt2",l:"Beobachtungsturm",x:50,y:35,r:15,c:"#aabbdd",a:5,d:"Sicht auf Fangorn und Emyn Muil."},{id:"gw2",l:"Grenzwall",x:50,y:60,r:32,c:"#8899bb",a:3,d:"Niedriger Schutzwall."},{id:"og",l:"Offenes Gelände ⚠",x:50,y:85,r:14,c:"#cc4444",a:1,d:"Keine natürlichen Hindernisse im Süden."}],
 strengths:["Palantir-Fernkommunikation","Sicht auf drei Königreiche","Geheime Lage"],
 weaknesses:["Isoliert","Keine starken Mauern","Kleines Verteidigungspotential"],
 attackTips:["Kommunikation stören","Schnellen Kavalleriestoß","Nachtangriff wenn Palantir nicht aktiv"],
 siegeCtx:"Saruman schickt Späher nach dem verlorenen Palantir. Der Turm liegt verlassen — aber nicht unbeobachtet.",defender:"Geisterhaftes Echos von Isildur"},

{id:"dol_guldur",name:"Dol Guldur",sub:"Hügel des Dunklen Zauberers",era:"1050–3019 D.Z.",year:2941,loc:"Düsterwald, Mittelerde",type:"fantasy",epoch:"Mittelerde",region:"mittelerde",icon:"🕷️",
 theme:{bg:"#050805",accent:"#448844",glow:"rgba(55,110,55,0.14)"},
 ratings:{walls:88,supply:75,position:92,garrison:85,morale:40},
 desc:"Saurons Festung im Düsterwald. Gandalf entdeckte hier 2941 den gefangenen Thráin II.",
 history:"Dreimal von den Weißen Ratsmitgliedern 'gereinigt'. Sauron kehrte jedes Mal zurück. Endgültig zerstört 3019 durch Galadriel.",
 verdict:"Eine Festung des Willens — ohne Saurons Präsenz fällt sie, aber er kehrt immer zurück.",
 zones:[{id:"dt2",l:"Dunkler Turm",x:50,y:30,r:16,c:"#448844",a:5,d:"Zentrum der Dunkelheit."},{id:"df2",l:"Düsterwald-Tarnung",x:50,y:50,r:42,c:"#224422",a:4,d:"Wald verbirgt Ausmaß der Burg."},{id:"dk2",l:"Kerker",x:70,y:65,r:12,c:"#336633",a:3,d:"Dort saß Thráin II. gefangen."},{id:"or2",l:"Ork-Patrouillen ⚠",x:25,y:75,r:10,c:"#cc4444",a:2,d:"Orks kontrollieren den Wald."}],
 strengths:["Düsterwald als natürlicher Schutz","Saurons Willen als Verteidigung","Psychologische Lähmung der Feinde"],
 weaknesses:["Moralzusammenbruch ohne Sauron","Galadriel/Weiße Ratsmacht wirksam"],
 attackTips:["Weiße Ratsmacht konzentrieren","Sauron direkt bannen","Düsterwald-Orks dezimieren"],
 siegeCtx:"2941 — Die Weißen kennen Saurons Versteck. Gandalf, Saruman, Galadriel planen den Angriff.",defender:"Sauron (Nekromant)"},

{id:"dreadfort",name:"Die Dreadfort",sub:"Haus Bolton",era:"Zeitalter der Helden",year:300,loc:"The North, Westeros",type:"fantasy",epoch:"Westeros",region:"westeros",icon:"🩸",
 theme:{bg:"#120508",accent:"#cc3333",glow:"rgba(180,40,40,0.14)"},
 ratings:{walls:82,supply:75,position:80,garrison:70,morale:45},
 desc:"Sitz Haus Boltons — bekannt für gefolterte Gefangene und entblößte Männer als 'Bolton-Banner'.",
 history:"Haus Bolton war tausendjahrelang Haus Starks Vasall — und Rivale. Die Dreadfort stand für Grausamkeit und Geheimniskrämerei.",
 verdict:"Psychologischer Terror ist eine Waffe — aber er erzeugt Hass, keine Loyalität.",
 zones:[{id:"dt3",l:"Hauptturm",x:50,y:35,r:17,c:"#cc3333",a:5,d:"Boltons Throne und Gefängnisse."},{id:"tw",l:"Turm der Schreie ⚠",x:75,y:50,r:12,c:"#882222",a:1,d:"Folterturm — Quell der Angst."},{id:"ow4",l:"Äußerer Ring",x:50,y:50,r:42,c:"#992222",a:4,d:"Gediegene Mauern."}],
 strengths:["Psychologische Abschreckung","Strategische Nordlage","Starke Mauern"],
 weaknesses:["Wenig Loyalität der Vasallen","Isoliert im Norden","Kleines Territorium"],
 attackTips:["Vasallen abwerben","Psychologisch kontern (Flaggen zeigen)","Schnell angreifen bevor Verstärkung kommt"],
 siegeCtx:"Ramsay hält Theon gefangen. Eine Rettungsexpedition plant den Angriff auf die Dreadfort.",defender:"Ramsay Bolton"},

{id:"storms_end",name:"Sturmkap",sub:"Unbrechbarer Turm",era:"Zeit der Helden",year:1,loc:"Kap des Zorns, Westeros",type:"fantasy",epoch:"Westeros",region:"westeros",icon:"⛈️",
 theme:{bg:"#0a0d12",accent:"#6699cc",glow:"rgba(85,130,180,0.14)"},
 ratings:{walls:96,supply:55,position:95,garrison:65,morale:90},
 desc:"Vom sagenhaften Durran Donnergott gebaut — Turm ohne Ecken oder Kanten damit der Wind keinen Ansatz findet.",
 history:"Stannis Baratheon hielt Sturmkap ein Jahr gegen Mace Tyrells Belagerung durch Hunger. Gerettet durch Davos Seeworthdas Zwiebelritter der Zwiebelschmuggler.",
 verdict:"Architektonisch unüberwindbar — aber Hunger ist stärker als Stein.",
 zones:[{id:"rt",l:"Runder Turm (kein Winkel)",x:50,y:45,r:20,c:"#6699cc",a:6,d:"Keine Kanten — Wind und Katapulte gleiten ab."},{id:"cl4",l:"Klippen am Kap",x:50,y:80,r:30,c:"#445577",a:5,d:"Drei Seiten Klippen."},{id:"sp",l:"Seeversorgung ⚠",x:10,y:50,r:12,c:"#cc4444",a:1,d:"Einzige Versorgung über See — blockierbar."}],
 strengths:["Runder Turm — kein Ansatzpunkt","Klippen auf drei Seiten","Legendärer magischer Bau"],
 weaknesses:["Seeversorgung einzige Rettung","Hunger bei Blockade","Kleine Garnison für große Burg"],
 attackTips:["Seeblockade total","Hunger erzwingen","Magischen Schutz brechen (Magie nötig)"],
 siegeCtx:"Roberts Rebellion — Mace Tyrell belagert Sturmkap. Stannis hat noch einen Monat Vorräte.",defender:"Stannis Baratheon"},

// ── PERSÖNLICHE BURG ───────────────────────────────────────────────────────

{id:"schwarzer_bergfried",name:"Schwarzer Bergfried",sub:"Spirituelles Zentrum des Ordens",era:"ca. 800–850",year:825,loc:"Sorrowland",type:"real",epoch:"Mittelalter",region:"europa",icon:"⬛",
 theme:{bg:"#060608",accent:"#8a8a9a",glow:"rgba(100,100,130,0.18)"},
 ratings:{walls:85,supply:65,position:92,garrison:55,morale:99},
 desc:"Die älteste Festung des Ordo Custodum Sorrowland. Ursprünglicher Wachturm, spirituelles Zentrum, Archiv und letzter Rückzugspunkt. Das Wappen des Ordens trägt sein Bild.",
 history:"Ca. 800–850 als Wachturm errichtet — noch vor der Gründung des Ordens. Als der Ordo Custodum Sorrowland ca. 870–900 entstand, wurde der Turm zum Ordenssymbol. Hier lagern die wichtigsten Relikte und das Archiv des Ordens. Das Motto des Ordens: 'In silentio vigilamus' — Im Schweigen wachen wir.",
 verdict:"Kein Angreifer hat je alle drei Burgen des Ordens gleichzeitig isoliert. Solange Gravecrest und Castle Sorrow stehen, ist der Schwarze Bergfried uneinnehmbar.",
 zones:[
   {id:"bt",l:"Schwarzer Bergfried",x:50,y:35,r:16,c:"#8a8a9a",a:6,d:"Massiver Bergfried mit extrem dicken Mauern, wenigen Fenstern, schwer zugänglichem Eingang. Die Ordensreliquien lagern hier."},
   {id:"ar",l:"Archiv des Ordens",x:30,y:38,r:9,c:"#aa9944",a:5,d:"Jahrhunderte an Wissen, Karten, Geheimnissen. Unzerstörbar soll es sein — die Ritter sterben eher als es preiszugeben."},
   {id:"fp",l:"Felsplateau",x:50,y:58,r:36,c:"#666677",a:5,d:"Drei Seiten senkrecht abfallend. Teil des koordinierten Signalsystems mit Castle Sorrow und Gravecrest."},
   {id:"sg",l:"Signalfeuer",x:78,y:25,r:8,c:"#cc8833",a:3,d:"Feuerzeichen nachts, Rauch tagsüber. Direkte Verbindung zu Gravecrest und Castle Sorrow."},
   {id:"sp",l:"Einziger Pfad ⚠",x:50,y:92,r:9,c:"#cc4444",a:1,d:"Der einzige Zugang. Wird von Gravecrest aus überwacht — kein Angreifer kann ihn unbemerkt nutzen."},
 ],
 strengths:["Spirituelles Zentrum — Moral der Ritter unerschütterlich","Koordiniertes Signalsystem mit 2 weiteren Burgen","Extremdicke Mauern, wenige Angriffspunkte","Archiv und Relikte geben dem Orden besonderen Verteidigungswillen"],
 weaknesses:["Kleine Garnison — kein eigenständiger Großkampf möglich","Versorgung nur über den Pfad","Isoliert wenn Gravecrest und Castle Sorrow fallen"],
 attackTips:["Zuerst Gravecrest nehmen — Pfadüberwachung eliminieren","Signalsystem stören — alle drei gleichzeitig angreifen","Archiv als Verhandlungsmasse nutzen — Ritter könnten kapitulieren um es zu schützen"],
 siegeCtx:"Der Orden hat alle drei Burgen verloren bis auf den Bergfried. Die letzten 40 Ritter halten das Archiv. Ein Feind mit 800 Mann steht am Fuß des Felsens.",
 defender:"Großmeister des Ordo Custodum Sorrowland"},

{id:"castle_sorrow",name:"Castle Sorrow",sub:"Hauptsitz des Ordens",era:"10.–11. Jh.",year:1000,loc:"Sorrowland",type:"real",epoch:"Mittelalter",region:"europa",icon:"🏰",
 theme:{bg:"#0a080e",accent:"#aa6688",glow:"rgba(150,80,120,0.15)"},
 ratings:{walls:90,supply:92,position:82,garrison:88,morale:90},
 desc:"Ordenshauptquartier, Hauptgarnison, Waffenlager, Verwaltungszentrum. Größte der drei Burgen — und erste Verteidigungslinie gegen jeden Angriff.",
 history:"Im 10.–11. Jahrhundert als Ordenshauptquartier errichtet. Später im 15.–16. Jahrhundert um einen Kanonen-Bastionsturm erweitert — eine der ersten Anpassungen an Schwarzpulverwaffen in der Region. Hält den Hauptangriff auf, während Gravecrest Verstärkung sammelt.",
 verdict:"Wer Castle Sorrow nimmt, hat den Orden militärisch enthauptet. Aber ohne Gravecrest und Schwarzen Bergfried ist der Sieg nicht vollständig.",
 zones:[
   {id:"bt2",l:"Bastionsturm (15. Jh.)",x:75,y:30,r:14,c:"#cc5533",a:6,d:"Kanonen-Bastionsturm — nachträglich für Schwarzpulverwaffen errichtet. Kontrolliert alle Annäherungsrouten."},
   {id:"rm",l:"Ringmauer",x:50,y:50,r:42,c:"#aa6688",a:5,d:"Große Ringmauer mit mehreren Türmen. Befestigtes Torhaus im Süden."},
   {id:"hq",l:"Ordensrat & Verwaltung",x:40,y:42,r:14,c:"#886699",a:4,d:"Hier tagt der Ordensrat. Waffenlager, Hauptgarnison, logistische Versorgung."},
   {id:"th2",l:"Befestigtes Torhaus",x:50,y:82,r:10,c:"#aa6688",a:4,d:"Doppeltes Fallgitter, Schießscharten, Mordloch."},
   {id:"sf",l:"Signalfeuer",x:22,y:22,r:8,c:"#cc8833",a:3,d:"Koordiniert mit Gravecrest und Schwarzem Bergfried."},
   {id:"ow",l:"Offene Fläche ⚠",x:50,y:68,r:12,c:"#cc4444",a:2,d:"Größte Burg = mehr Fläche zu verteidigen. Schwachstelle bei zu kleiner Garnison."},
 ],
 strengths:["Kanonen-Bastionsturm dominiert Umgebung","Große Garnison und Logistik","Befestigtes Torhaus mit Mordloch","Direkte Signalverbindung zu Gravecrest"],
 weaknesses:["Größte Burg — meiste Fläche zu verteidigen","Verlust hier enthauptet den Orden militärisch","Im offenen Gelände keine natürliche Erhöhung wie Gravecrest"],
 attackTips:["Offene Südflanke zuerst","Bastionsturm mit schwerem Gerät ausschalten","Torhaus unterminieren","Versorgungswege kappen bevor Belagerung beginnt"],
 siegeCtx:"Eine feindliche Armee von 2.000 Mann marschiert auf Castle Sorrow. Gravecrest ist noch frei — aber der Entsatz braucht 3 Tage. Hält der Bastionsturm?",
 defender:"Ordensmarschall von Sorrowland"},

{id:"gravecrest",name:"Gravecrest",sub:"Bergfestung & Rückzugspunkt",era:"12. Jh.",year:1150,loc:"Sorrowland",type:"real",epoch:"Mittelalter",region:"europa",icon:"⛰️",
 theme:{bg:"#080c0a",accent:"#7aaa88",glow:"rgba(100,160,120,0.15)"},
 ratings:{walls:92,supply:72,position:97,garrison:68,morale:92},
 desc:"Hoch oben auf einem Berg, nur ein schmaler Zugangspfad. Militärischer Sammelpunkt, Rückzugsfestung, strategische Höhenposition. Ähnlich Hochosterwitz in Kärnten.",
 history:"Im 12. Jahrhundert als strategische Höhenposition erbaut. Gravecrest sammelt Verstärkung wenn Castle Sorrow unter Druck steht, und überwacht den einzigen Pfad zum Schwarzen Bergfried. Fast unmöglich zu stürmen — ideal für Entsatzarmeen.",
 verdict:"Solange Gravecrest steht, kann der Orden sich regenerieren. Kein Feind kann den Schwarzen Bergfried einnehmen ohne zuerst Gravecrest zu kontrollieren.",
 zones:[
   {id:"bp2",l:"Berggipfel-Position",x:50,y:30,r:22,c:"#7aaa88",a:6,d:"Beherrschende Höhenposition — Sicht auf das gesamte umliegende Land, inkl. Castle Sorrow und Schwarzem Bergfried."},
   {id:"sp2",l:"Schmaler Zugangspfad ⚠",x:50,y:90,r:10,c:"#cc4444",a:2,d:"Einziger Zugang. Ein Dutzend Mann kann Hunderte aufhalten. Aber auch Versorgung kommt nur hier durch."},
   {id:"sf2",l:"Signalfeuer",x:78,y:28,r:9,c:"#cc8833",a:4,d:"Verbindet alle drei Burgen. Von hier aus sieht man beide anderen Burgen gleichzeitig."},
   {id:"rs",l:"Sammelplatz für Verstärkung",x:35,y:52,r:14,c:"#558866",a:3,d:"Truppen die von Castle Sorrow fliehen sammeln sich hier. Organisierter Gegenangriff startet von hier."},
   {id:"ow2",l:"Innere Zitadelle",x:55,y:40,r:12,c:"#7aaa88",a:5,d:"Kern der Bergfestung. Letzter Rückzugsort innerhalb von Gravecrest selbst."},
 ],
 strengths:["Steilhang auf allen Seiten","Sichtkontrolle über gesamtes Sorrowland","Sammelpunkt für Entsatz","Überwacht Zugang zum Schwarzen Bergfried"],
 weaknesses:["Versorgung nur über Pfad","Kleiner Mauerring wegen Bergkuppe","Schwer mit großer Garnison zu besetzen"],
 attackTips:["Pfad mit kleiner Einheit blockieren — Hunger erzwingen","Versorgungskolonnen abfangen","Gleichzeitig mit Castle Sorrow angreifen um Signalsystem zu überlasten","Winter abwarten — Pfad wird schwer passierbar"],
 siegeCtx:"Castle Sorrow ist gefallen. Die überlebenden Ritter haben sich nach Gravecrest zurückgezogen. 400 feindliche Soldaten stürmen den Pfad. Oben warten 80 Ritter.",
 defender:"Ritterhauptmann von Gravecrest"},
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
      {/* Grid rings */}
      {[0.25,0.5,0.75,1].map((s,i)=>(
        <polygon key={i} points={cats.map((_,j)=>axPt(j,s)).map(p=>`${p.x},${p.y}`).join(" ")}
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.4"/>
      ))}
      {/* Axis lines */}
      {cats.map((_,i)=>{const p=axPt(i);return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" strokeWidth="0.3"/>;}) }
      {/* Value labels on rings */}
      {[25,50,75,100].map(v=>(
        <text key={v} x={cx+2} y={cy-(v/100)*R+1} fill="rgba(255,255,255,0.12)" fontSize="3.5" fontFamily="monospace">{v}</text>
      ))}
      {/* Compare polygon */}
      {compare&&<polygon points={poly(compare.ratings)} fill={`${ac2}12`} stroke={ac2} strokeWidth="0.8" strokeDasharray="2,1.5" opacity="0.85"/>}
      {/* Main polygon */}
      <polygon points={poly(castle.ratings)} fill={`${ac}1a`} stroke={ac} strokeWidth="1"/>
      {/* Data points */}
      {cats.map((c,i)=>{
        const p=pt(castle.ratings[c.k],i);
        return <circle key={i} cx={p.x} cy={p.y} r="1.5" fill={ac} opacity="0.9"/>;
      })}
      {/* Compare data points */}
      {compare&&cats.map((c,i)=>{
        const p=pt(compare.ratings[c.k],i);
        return <circle key={i} cx={p.x} cy={p.y} r="1.2" fill={ac2} opacity="0.7"/>;
      })}
      {/* Axis labels with values */}
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
      {/* Center dot */}
      <circle cx={cx} cy={cy} r="1" fill={ac} opacity="0.4"/>
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
      {/* Landscape */}
      <rect x="0" y="0" width="220" height="200" fill="rgba(20,12,18,0.6)"/>
      {/* Rolling hills */}
      <path d="M 0 160 Q 55 148 110 155 Q 165 162 220 150 L 220 200 L 0 200 Z"
        fill="rgba(35,20,30,0.5)"/>
      {/* Outer ward — large, with multiple towers */}
      <rect x="20" y="45" width="180" height="135"
        fill={sel==="rm"?"rgba(150,80,120,0.2)":"rgba(100,50,80,0.07)"}
        stroke={`${ac}66`} strokeWidth="4.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("rm")}/>
      {/* Wall towers — 8 total */}
      {[[20,45],[110,45],[200,45],[200,112],[200,180],[110,180],[20,180],[20,112]].map(([x,y],i)=>(
        <rect key={i} x={x-7} y={y-7} width="14" height="14" rx="2"
          fill={`${ac}33`} stroke={`${ac}77`} strokeWidth="1.2"/>
      ))}
      <text x="110" y="62" textAnchor="middle" fill={`${ac}55`} fontSize="8" fontFamily="serif"
        style={{cursor:"pointer"}} onClick={()=>onZone("rm")}>RINGMAUER (mehrere Türme)</text>
      {/* Bastion Tower — added 15th c., dominates NE corner */}
      <path d="M 182 28 L 218 28 L 220 65 L 182 65 Z"
        fill={sel==="bt2"?"rgba(200,80,50,0.45)":"rgba(160,60,35,0.22)"}
        stroke="#cc5533" strokeWidth="3"
        style={{cursor:"pointer"}} onClick={()=>onZone("bt2")}/>
      {/* Cannon ports */}
      {[[188,38],[200,38],[212,38],[188,50],[200,50],[212,50]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="2.5" fill="#cc5533" opacity="0.6"/>
      ))}
      <text x="200" y="32" textAnchor="middle" fill="#cc5533" fontSize="8" fontWeight="bold"
        style={{cursor:"pointer"}} onClick={()=>onZone("bt2")}>💥</text>
      <text x="200" y="42" textAnchor="middle" fill="#cc5533" fontSize="7"
        style={{cursor:"pointer"}} onClick={()=>onZone("bt2")}>BASTIONS-</text>
      <text x="200" y="51" textAnchor="middle" fill="#cc5533" fontSize="7"
        style={{cursor:"pointer"}} onClick={()=>onZone("bt2")}>TURM</text>
      <text x="200" y="60" textAnchor="middle" fill="rgba(200,80,50,0.5)" fontSize="6">(15. Jh.)</text>
      {/* Fortified gatehouse — south */}
      <rect x="88" y="178" width="44" height="18" rx="2"
        fill={sel==="th2"?"rgba(150,80,120,0.45)":"rgba(120,60,95,0.22)"}
        stroke={`${ac}99`} strokeWidth="2.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("th2")}/>
      <text x="110" y="190" textAnchor="middle" fill={`${ac}88`} fontSize="7" fontFamily="serif"
        style={{cursor:"pointer"}} onClick={()=>onZone("th2")}>BEFEST. TORHAUS</text>
      {/* Inner court — HQ */}
      <rect x="52" y="72" width="116" height="88" rx="2"
        fill={sel==="hq"?"rgba(120,60,95,0.28)":"rgba(90,45,72,0.1)"}
        stroke={`${ac}88`} strokeWidth="3.5"
        style={{cursor:"pointer"}} onClick={()=>onZone("hq")}/>
      {/* Buildings inside */}
      <rect x="62" y="82" width="40" height="28" rx="1" fill="rgba(80,40,65,0.3)" stroke={`${ac}33`} strokeWidth="0.6"/>
      <text x="82" y="100" textAnchor="middle" fill={`${ac}44`} fontSize="7">Ordensrat</text>
      <rect x="118" y="82" width="40" height="28" rx="1" fill="rgba(80,40,65,0.3)" stroke={`${ac}33`} strokeWidth="0.6"/>
      <text x="138" y="100" textAnchor="middle" fill={`${ac}44`} fontSize="7">Waffenlager</text>
      <text x="110" y="128" textAnchor="middle" fill={`${ac}77`} fontSize="8" fontFamily="serif"
        style={{cursor:"pointer"}} onClick={()=>onZone("hq")}>HAUPTQUARTIER</text>
      {/* Open flank weakness */}
      <circle cx="110" cy="155" r="12"
        fill={sel==="ow"?"rgba(200,60,60,0.35)":"rgba(160,45,45,0.15)"}
        stroke="#cc4444" strokeWidth="2"
        style={{cursor:"pointer"}} onClick={()=>onZone("ow")}/>
      <text x="110" y="153" textAnchor="middle" fill="#cc4444" fontSize="8" fontWeight="bold"
        style={{cursor:"pointer"}} onClick={()=>onZone("ow")}>⚠</text>
      <text x="110" y="162" textAnchor="middle" fill="rgba(180,50,50,0.5)" fontSize="6"
        style={{cursor:"pointer"}} onClick={()=>onZone("ow")}>Offene Fläche</text>
      {/* Signal fire NW */}
      <circle cx="28" cy="32" r="9"
        fill={sel==="sf"?"rgba(200,130,40,0.45)":"rgba(160,100,30,0.2)"}
        stroke="#cc8833" strokeWidth="1.8"
        style={{cursor:"pointer"}} onClick={()=>onZone("sf")}/>
      <text x="28" y="30" textAnchor="middle" fill="#cc8833" fontSize="8"
        style={{cursor:"pointer"}} onClick={()=>onZone("sf")}>🔥</text>
      <text x="28" y="40" textAnchor="middle" fill="rgba(200,130,40,0.5)" fontSize="6"
        style={{cursor:"pointer"}} onClick={()=>onZone("sf")}>Signal</text>
      {/* Connection lines to other castles */}
      <path d="M 20 45 L 5 20" stroke="rgba(200,130,40,0.2)" strokeWidth="1" strokeDasharray="3,3"/>
      <text x="5" y="15" fill="rgba(200,130,40,0.3)" fontSize="6">↗ Gravecrest</text>
      <path d="M 200 45 L 215 20" stroke="rgba(200,130,40,0.2)" strokeWidth="1" strokeDasharray="3,3"/>
      <text x="175" y="15" fill="rgba(200,130,40,0.3)" fontSize="6">↗ S. Bergfried</text>
      {/* Compass + title */}
      <text x="196" y="100" textAnchor="middle" fill={`${ac}55`} fontSize="10" fontFamily="serif">N</text>
      <line x1="196" y1="103" x2="196" y2="120" stroke={`${ac}33`} strokeWidth="1"/>
      <text x="110" y="197" textAnchor="middle" fill={`${ac}55`} fontSize="8"
        fontFamily="serif" letterSpacing="2">CASTLE SORROW — ORDO CUSTODUM</text>
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
  castle_sorrow:       lonlatToXY(10.80, 47.65, "Castle Sorrow"),
  gravecrest:          lonlatToXY(10.25, 47.92, "Gravecrest"),
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
  // Neue Mittelerde-Burgen
  dol_guldur:  {x:285, y:128,  label:"Dol Guldur"},
  minas_anor:  {x:215, y:188,  label:"Amon Anwar"},
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
    const script = document.createElement('script');
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
              <div style={{fontSize:"8px",color:"#4a3a20",letterSpacing:"1px"}}>SCORE</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function WorldMap({castles,onSelect,selected}){
  const [mapTab,setMapTab]=useState("real");

  return(
    <div style={{padding:"18px 20px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
        <div>
          <div style={{fontSize:"18px",fontWeight:"bold",color:"#f0e6cc",marginBottom:"4px"}}>🌍 Weltkarte der Festungen</div>
          <div style={{fontSize:"12px",color:"#9a8a68"}}>Klicken zum Analysieren · Hover für Details</div>
        </div>
        <div style={{display:"flex",gap:"6px"}}>
          {[{k:"real",l:"🌍 Historische Welt"},{k:"fantasy",l:"✦ Mittelerde & Westeros"}].map(t=>(
            <button key={t.k} onClick={()=>setMapTab(t.k)}
              style={{padding:"6px 14px",fontSize:"11px",letterSpacing:"0.5px",
                background:mapTab===t.k?"rgba(201,168,76,0.14)":"rgba(255,255,255,0.03)",
                border:`1px solid ${mapTab===t.k?"rgba(201,168,76,0.4)":"rgba(255,255,255,0.08)"}`,
                color:mapTab===t.k?"#c9a84c":"#6a5a38",borderRadius:"4px",cursor:"pointer",
                transition:"all .15s"}}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {mapTab==="real"
        ? <RealWorldMap castles={castles} onSelect={onSelect} selected={selected}/>
        : <FantasyMap castles={castles} onSelect={onSelect} selected={selected}/>
      }

      <div style={{display:"flex",gap:"18px",marginTop:"10px",padding:"8px 14px",
        background:"rgba(0,0,0,0.25)",borderRadius:"4px",border:"1px solid rgba(255,255,255,0.04)"}}>
        <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
          <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4" fill="rgba(201,168,76,0.75)"/></svg>
          <span style={{fontSize:"11px",color:"#5a4a28"}}>Historische Burg</span>
        </div>
        <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
          <svg width="12" height="12" viewBox="0 0 12 12"><polygon points="6,1 11,10 1,10" fill="rgba(150,100,220,0.75)"/></svg>
          <span style={{fontSize:"11px",color:"#5a4a28"}}>Fantasy-Festung</span>
        </div>
        <div style={{marginLeft:"auto",fontSize:"11px",color:"#5a4a28"}}>
          {Object.keys(GEO).length + Object.keys(ME_GEO).length} Festungen kartiert
        </div>
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
      let reply;
      if(!apiData){
        // Rich offline fallback — varies by question content
        const q_low=um.toLowerCase();
        if(q_low.includes("schnell")||q_low.includes("einnahme")||q_low.includes("angriff")){
          reply=`**Schnellster Weg zur Einnahme von ${castle.name}:**\n\n${castle.attackTips.map((t,i)=>`${i+1}. ${t}`).join("\n")}\n\nDie entscheidende Schwachstelle: **${castle.weaknesses[0]}**`;
        } else if(q_low.includes("verteid")||q_low.includes("reaktion")){
          reply=`**Als Verteidiger von ${castle.name}:**\n\n${castle.strengths.map((s,i)=>`${i+1}. ${s} nutzen`).join("\n")}\n\nHistorisch: ${castle.history}`;
        } else if(q_low.includes("parallel")||q_low.includes("vergleich")||q_low.includes("ähnlich")){
          reply=`**Historische Parallelen zu ${castle.name}:**\n\n${castle.verdict}\n\nVerdikt: Diese Burg gehört zur Kategorie der ${castle.epoch}-Festungen die primär durch ${castle.weaknesses[0].toLowerCase()} gefährdet waren — genau wie andere Burgen dieser Ära.`;
        } else if(q_low.includes("gebaut")||q_low.includes("besser")||q_low.includes("fehler")){
          reply=`**Was man an ${castle.name} besser hätte bauen können:**\n\nDie Hauptschwächen waren:\n${castle.weaknesses.map((w,i)=>`${i+1}. ${w}`).join("\n")}\n\nEin Architekt hätte besonders ${castle.weaknesses[0].toLowerCase()} beheben müssen — das war letztlich entscheidend.`;
        } else if(q_low.includes("modern")||q_low.includes("armee")||q_low.includes("heute")){
          reply=`**Moderner Angriff auf ${castle.name}:**\n\nMit moderner Technik wäre ${castle.name} in Stunden einnehmbar. Die ${castle.strengths[0]} würde gegen Artillerie nichts nützen. ${castle.ratings.position>85?"Einzig die Geländeposition böte noch echten Widerstand.":"Kein Element der Burg könnte modernen Waffen standhalten."}`;
        } else if(q_low.includes("moment")||q_low.includes("kritisch")||q_low.includes("wend")){
          reply=`**Der kritischste Moment bei ${castle.name}:**\n\n${castle.history}\n\n${castle.verdict}`;
        } else {
          reply=`**${castle.name}** (${castle.sub}, ${castle.era})\n\n${castle.history}\n\n**Fazit:** ${castle.verdict}\n\n**Stärken:** ${castle.strengths.join(" · ")}\n**Schwächen:** ${castle.weaknesses.join(" · ")}`;
        }
      } else {
        reply=apiData.content?.map(b=>b.text||"").join("")||"Keine Antwort.";
      }
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
            <div style={{display:"flex",alignItems:"center",color:"#3a2a14",fontSize:"12px",fontFamily:"serif"}}>VS</div>
            <div style={{padding:"12px",background:`${c2.theme.bg}`,border:`1px solid ${c2.theme.accent}33`,borderRight:`4px solid ${c2.theme.accent}`,borderRadius:"5px"}}>
              <div style={{fontSize:"22px",marginBottom:"3px"}}>{c2.icon}</div>
              <div style={{fontSize:"13px",fontWeight:"bold",color:"#d0c090",marginBottom:"2px"}}>{c2.name}</div>
              <div style={{fontSize:"10px",color:c2.theme.accent,marginBottom:"6px"}}>{c2.era}</div>
              <div style={{fontSize:"26px",fontWeight:"bold",color:rCol(avg(c2))}}>{avg(c2)}</div>
            </div>
          </div>

          {/* Unified dual radar */}
          <div style={{padding:"14px",background:"rgba(0,0,0,0.25)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:"6px",marginBottom:"14px"}}>
            <div style={{fontSize:"11px",color:"#6a5a38",letterSpacing:"2px",textAlign:"center",marginBottom:"8px"}}>RADAR-VERGLEICH</div>
            <div style={{maxWidth:"240px",margin:"0 auto"}}>
              <RadarChart castle={c1} compare={c2}/>
            </div>
            <div style={{display:"flex",gap:"16px",justifyContent:"center",marginTop:"8px"}}>
              <div style={{display:"flex",gap:"5px",alignItems:"center"}}>
                <div style={{width:"20px",height:"2px",background:c1.theme.accent,borderRadius:"1px"}}/>
                <span style={{fontSize:"11px",color:c1.theme.accent}}>{c1.name.split(" ")[0]}</span>
              </div>
              <div style={{display:"flex",gap:"5px",alignItems:"center"}}>
                <div style={{width:"20px",height:"2px",background:c2.theme.accent,borderRadius:"1px",borderTop:"2px dashed "+c2.theme.accent,height:"0"}}/>
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
                    <span style={{fontSize:"11px",color:"#6a5a38",letterSpacing:"1px"}}>{cat.i} {cat.l}</span>
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

// ── Timeline ───────────────────────────────────────────────────────────────
function GlobalStats({scores,playStats,castles}){
  const entries=Object.entries(scores).map(([id,s])=>{
    const c=castles.find(x=>x.id===id);
    return c?{...s,id,castle:c}:null;
  }).filter(Boolean);

  const total=entries.length;
  const wins=entries.filter(e=>e.won).length;
  const byRegion=castles.reduce((acc,c)=>{
    acc[c.region]=(acc[c.region]||0)+1; return acc;
  },{});
  const topScored=[...castles].sort((a,b)=>avg(b)-avg(a)).slice(0,5);
  const mostPlayed=entries.sort((a,b)=>b.rating-a.rating).slice(0,3);

  return(
    <div style={{padding:"18px 20px"}}>
      <div style={{fontSize:"16px",fontWeight:"bold",color:"#f0e6cc",marginBottom:"16px"}}>📊 Globale Statistiken</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px",marginBottom:"18px"}}>
        {[
          {l:"Burgen gesamt",v:castles.length,icon:"🏰",c:"#c9a84c"},
          {l:"Historisch",v:castles.filter(c=>c.type==="real").length,icon:"🌍",c:"#8aaa68"},
          {l:"Fantasy",v:castles.filter(c=>c.type==="fantasy").length,icon:"✦",c:"#9988bb"},
          {l:"Belagerungen",v:total,icon:"⚔️",c:"#cc8844"},
          {l:"Siege",v:wins,icon:"✅",c:"#6aaa50"},
          {l:"Niederlagen",v:total-wins,icon:"❌",c:"#cc5544"},
        ].map(s=>(
          <div key={s.l} style={{padding:"12px",background:"rgba(255,255,255,0.02)",
            border:"1px solid rgba(255,255,255,0.04)",borderRadius:"6px",textAlign:"center",
            animation:"fadeIn 0.3s ease"}}>
            <div style={{fontSize:"20px",marginBottom:"4px"}}>{s.icon}</div>
            <div style={{fontSize:"22px",fontWeight:"bold",color:s.c}}>{s.v}</div>
            <div style={{fontSize:"10px",color:"#3a2a14",letterSpacing:"1px",marginTop:"2px"}}>{s.l.toUpperCase()}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"16px"}}>
        {/* Top rated castles */}
        <div style={{padding:"14px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"6px"}}>
          <div style={{fontSize:"11px",color:"#c9a84c",letterSpacing:"2px",marginBottom:"10px"}}>🏆 TOP-WERTUNGEN</div>
          {topScored.map((c,i)=>(
            <div key={c.id} style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:"6px"}}>
              <div style={{fontSize:"12px",color:i===0?"#c9a84c":i===1?"#888":"#7a5020",width:"16px",fontWeight:"bold"}}>{i+1}</div>
              <span style={{fontSize:"15px"}}>{c.icon}</span>
              <div style={{flex:1,fontSize:"12px",color:"#9a8860"}}>{c.name}</div>
              <div style={{fontSize:"14px",fontWeight:"bold",color:rCol(avg(c))}}>{avg(c)}</div>
            </div>
          ))}
        </div>

        {/* Regions */}
        <div style={{padding:"14px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"6px"}}>
          <div style={{fontSize:"11px",color:"#c9a84c",letterSpacing:"2px",marginBottom:"10px"}}>🌍 REGIONEN</div>
          {Object.entries(byRegion).sort((a,b)=>b[1]-a[1]).map(([region,count])=>(
            <div key={region} style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"5px"}}>
              <div style={{fontSize:"11px",color:"#7a6a40",flex:1,textTransform:"capitalize"}}>{region}</div>
              <div style={{flex:2,height:"5px",background:"rgba(255,255,255,0.04)",borderRadius:"3px",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${(count/castles.length)*100}%`,background:"linear-gradient(90deg,#c9a84c,#aa8830)",borderRadius:"3px"}}/>
              </div>
              <div style={{fontSize:"11px",color:"#8a7a58",width:"20px",textAlign:"right"}}>{count}</div>
            </div>
          ))}
        </div>
      </div>

      {total>0&&(
        <div style={{padding:"14px",background:"rgba(0,0,0,0.2)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"6px"}}>
          <div style={{fontSize:"11px",color:"#c9a84c",letterSpacing:"2px",marginBottom:"8px"}}>⚔️ DEINE BELAGERUNGS-BILANZ</div>
          <div style={{display:"flex",gap:"6px",alignItems:"center",marginBottom:"6px"}}>
            <div style={{flex:wins/total,height:"8px",background:"rgba(100,180,80,0.6)",borderRadius:"4px 0 0 4px",minWidth:"4px"}}/>
            <div style={{flex:(total-wins)/total,height:"8px",background:"rgba(180,60,50,0.6)",borderRadius:"0 4px 4px 0",minWidth:"4px"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px",color:"#6a5a38"}}>
            <span>✅ {wins} Siege ({Math.round(wins/total*100)}%)</span>
            <span>❌ {total-wins} Niederlagen</span>
          </div>
        </div>
      )}
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
                <div style={{fontSize:"9px",color:"#8a7a60",fontFamily:"monospace"}}>{c.year>0?c.year:`${Math.abs(c.year)}v`}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px",color:"#8a7a60",fontFamily:"monospace",marginBottom:"16px"}}>
        <span>{minY>0?`${minY} n.Chr.`:`${Math.abs(minY)} v.Chr.`}</span>
        <span style={{color:"#5a4a30"}}>{sorted.length} Burgen</span>
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
              <div style={{fontSize:"11px",color:"#8a7a60"}}>{c.era}</div>
            </div>
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
  const [playStats,setPlayStats]=useState(()=>{
    try{ return JSON.parse(localStorage.getItem('bAtlas_stats')||'{"sieges":0,"wins":0,"totalDays":0,"favCastle":null}'); }catch{return {sieges:0,wins:0,totalDays:0,favCastle:null};}
  });
  const [general,setGeneral]=useState(null);
  const [season,setSeason]=useState(SEASONS[0]);
  const [showSetup,setShowSetup]=useState(false);

  const addScore=useCallback((castleId,won,r)=>{
    setScores(s=>{
      const next={...s,[castleId]:{won,rating:r||5,turns:r||0,ts:Date.now()}};
      try{localStorage.setItem('bAtlas_scores',JSON.stringify(next));}catch{}
      return next;
    });
    setPlayStats(ps=>{
      const next={...ps,sieges:ps.sieges+1,wins:ps.wins+(won?1:0),totalDays:ps.totalDays+(r||0)};
      try{localStorage.setItem('bAtlas_stats',JSON.stringify(next));}catch{}
      return next;
    });
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
  const NAVTABS=[{id:"overview",l:"🏰 Übersicht"},{id:"worldmap",l:"🌍 Karte"},{id:"detail",l:`${sel.icon} ${sel.name.split(" ")[0]}`},{id:"tournament",l:"🗡️ Turnier"},{id:"build",l:"🏗️ Bauen"},{id:"timeline",l:"📅 Zeit"},{id:"globalstats",l:"📊 Atlas"},{id:"highscores",l:"🏆 Scores"}];

  return(
    <div style={{minHeight:"100vh",background:"#060504",color:"#e8dcc8",fontFamily:"'Palatino Linotype','Book Antiqua',Georgia,serif",display:"flex",flexDirection:"column"}}>
      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#080604}
        ::-webkit-scrollbar-thumb{background:#3a2010;border-radius:2px}
        ::-webkit-scrollbar-thumb:hover{background:#5a3018}
        input::placeholder{color:#2a1a0a}
        select option{background:#100c06;color:#c0a070}
        button{transition:all 0.15s ease}
        button:hover{filter:brightness(1.15)}
        button:active{transform:scale(0.97)}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeInLeft{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-4px)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pf{0%{opacity:.85;transform:scale(1)}100%{opacity:0;transform:scale(2.5)}}
        @keyframes pulse{0%,100%{opacity:0.3}50%{opacity:0.7}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes glow{0%,100%{box-shadow:0 0 8px rgba(201,168,76,0.1)}50%{box-shadow:0 0 20px rgba(201,168,76,0.25)}}
        @keyframes barFill{from{width:0}to{width:var(--w)}}
        .castle-card{transition:transform 0.15s ease,border-color 0.15s ease,box-shadow 0.15s ease}
        .castle-card:hover{transform:translateY(-2px)}
        .tab-btn{transition:all 0.18s ease;position:relative;overflow:hidden}
        .tab-btn::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:currentColor;transform:scaleX(0);transition:transform 0.2s ease}
        .tab-btn.active::after{transform:scaleX(1)}
        .detail-panel{animation:fadeIn 0.22s ease}
        .score-ring{transition:stroke-dashoffset 0.8s ease}
        .stat-bar{animation:barFill 0.6s ease forwards}
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
      {tab==="globalstats"&&<div style={{flex:1,overflowY:"auto"}}><GlobalStats scores={scores} playStats={playStats} castles={CASTLES}/></div>}
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
                      <div style={{fontSize:"12px",color:"#6a5a38"}}>{sel.loc} · {sel.era} · {sel.epoch}</div>
                    </div>
                    <div style={{textAlign:"center",padding:"10px 16px",background:"rgba(0,0,0,0.3)",borderRadius:"5px",border:`1px solid ${sel.theme.accent}18`}}>
                      <div style={{fontSize:"28px",fontWeight:"bold",color:rCol(avg(sel))}}>{avg(sel)}</div>
                      <div style={{fontSize:"9px",color:"#4a3a20",letterSpacing:"1.5px"}}>GESAMTWERT</div>
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
                    <p style={{fontSize:"13px",color:"#5a4828",lineHeight:1.9,margin:0,fontStyle:"italic"}}>{sel.siegeCtx}</p>
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
