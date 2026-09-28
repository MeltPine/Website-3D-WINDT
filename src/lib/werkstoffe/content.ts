/*
 * Qualitative German copy of the material library.
 *
 * Rules for this file:
 * - No numeric material values. Numbers are shown only from the material
 *   database (library.ts); the prose refers to "Kennwerte" instead.
 * - Conservative, generally accepted polymer engineering knowledge only.
 *   Anything that depends on the concrete product (food contact, flame
 *   retardancy, chemical resistance against a specific medium) is phrased as
 *   "prüfen", never as a promise.
 */

export interface WerkstoffFamilyContent {
  slug: string;
  /** H1 of the detail page. */
  headline: string;
  intro: string;
  strengths: readonly string[];
  applications: readonly string[];
  /** "Wann nicht verwenden". */
  limits: readonly string[];
  /** Print-process related caveats specific to this family. */
  printingNotes: readonly string[];
  /** Families worth comparing, by slug. */
  related: readonly string[];
  /** Related Wissen articles, by slug. */
  relatedKnowledge: readonly string[];
}

export const WERKSTOFF_CONTENT: readonly WerkstoffFamilyContent[] = [
  {
    slug: 'pla',
    headline: 'PLA im 3D-Druck: Eigenschaften, Grenzen und Kennwerte',
    intro:
      'PLA (Polylactid) ist der am einfachsten zu verarbeitende FDM-Werkstoff. Er ist steif, bildet Details sauber ab und verzieht sich kaum. Für Bauteile, die Wärme, Dauerlast oder Witterung ausgesetzt sind, ist PLA dagegen meist die falsche Wahl.',
    strengths: [
      'Hohe Steifigkeit und gute Maßhaltigkeit beim Druck',
      'Saubere Oberflächen und feine Details',
      'Geringer Verzug, dadurch auch große Teile gut druckbar',
      'Wirtschaftlich für Muster und Einzelteile',
    ],
    applications: [
      'Anschauungs- und Designmodelle',
      'Passproben und Einbauprüfungen vor dem Serienwerkstoff',
      'Lehren, Schablonen und Montagehilfen ohne Wärmelast',
      'Verpackungs- und Handhabungsmuster',
    ],
    limits: [
      'Nicht für warme Umgebungen: PLA erweicht bereits knapp oberhalb seiner Glasübergangstemperatur (siehe Kennwerte) – etwa im Fahrzeug, in Maschinennähe oder neben Heizquellen.',
      'Neigt unter Dauerlast zum Kriechen; nicht für dauerhaft vorgespannte Clips oder Schraubverbindungen.',
      'Vergleichsweise spröde: geringe Bruchdehnung, bricht eher als dass es nachgibt.',
      'Für dauerhaften Außeneinsatz nicht erste Wahl; hier ist ASA die sicherere Option.',
      '„Biobasiert“ heißt nicht „kompostiert im Alltag“: Die Abbaubarkeit ist an industrielle Kompostierbedingungen gebunden.',
    ],
    printingNotes: [
      'PLA-Teile sind in Schichtrichtung (senkrecht zu den Druckschichten) deutlich weniger belastbar als in der Ebene. Die Druckausrichtung legen wir nach dem Lastfall fest.',
    ],
    related: ['pla-tough', 'petg-pctg', 'asa'],
    relatedKnowledge: ['prototyping-iterationen-in-5-tagen', 'vorrichtungen-fuer-montagequalitaet'],
  },
  {
    slug: 'pla-tough',
    headline: 'PLA Tough: schlagzäh modifiziertes PLA im 3D-Druck',
    intro:
      'PLA Tough bezeichnet PLA-Typen, die der Hersteller auf höhere Zähigkeit modifiziert hat. Sie behalten die einfache Verarbeitung von PLA, brechen aber weniger schnell spröde. An der geringen Wärmebeständigkeit von PLA ändert die Modifikation in der Regel nichts.',
    strengths: [
      'Laut Datenblatt deutlich höhere Bruchdehnung als Standard-PLA (siehe Kennwerte)',
      'Einfache, maßhaltige Verarbeitung wie bei PLA',
      'Gute Oberflächenqualität',
    ],
    applications: [
      'Funktionsmuster, die Montage und Demontage überstehen müssen',
      'Vorrichtungen und Halter bei Raumtemperatur',
      'Gehäusemuster mit Schnapp- oder Clipverbindungen im Test',
    ],
    limits: [
      'Wärmebeständigkeit auf PLA-Niveau: nicht für warme Umgebungen.',
      'Nicht für dauerhaften Außeneinsatz; hier ASA wählen.',
      '„Tough“ ist keine genormte Bezeichnung – Eigenschaften unterscheiden sich je nach Hersteller. Maßgeblich ist das jeweilige Datenblatt.',
    ],
    printingNotes: [
      'Wie bei PLA gilt: Belastung quer zu den Druckschichten ist die Schwachstelle. Wir richten das Teil nach dem Lastfall aus.',
    ],
    related: ['pla', 'petg-pctg', 'abs'],
    relatedKnowledge: ['prototyping-iterationen-in-5-tagen', 'bauteiloptimierung-fuer-funktionssicherheit'],
  },
  {
    slug: 'petg-pctg',
    headline: 'PETG und PCTG im 3D-Druck: zähe Allrounder für Funktionsteile',
    intro:
      'PETG und PCTG sind Copolyester. Sie verbinden eine gutmütige Verarbeitung mit höherer Zähigkeit als PLA und mittlerer Wärmebeständigkeit. PETG ist unser Standardwerkstoff für Funktionsbauteile ohne besondere Anforderungen; PCTG ist eine Variante, die Hersteller vor allem wegen ihrer Zähigkeit anbieten.',
    strengths: [
      'Zäh und schlagfest, bricht selten spröde',
      'Gute Haftung zwischen den Druckschichten',
      'Wenig Verzug, gut für mittelgroße Teile',
      'Gegen viele wässrige Medien beständig',
    ],
    applications: [
      'Abdeckungen, Halter und Gehäuse im Innenbereich',
      'Funktionsbauteile in Instandhaltung und Betriebsmittelbau',
      'Schutzhauben und Führungen mit moderater Last',
    ],
    limits: [
      'Wärmebeständigkeit höher als PLA, aber unter technischen Werkstoffen wie PC oder faserverstärktem PA.',
      'Oberfläche kratzempfindlich und weniger detailscharf als PLA.',
      'Für dauerhafte direkte Sonneneinstrahlung ist ASA die sicherere Wahl.',
      'Lebensmittelkontakt nur mit Konformitätsnachweis des konkreten Filaments und nach Prüfung des Anwendungsfalls – keine pauschale Freigabe.',
    ],
    printingNotes: [
      'Im Preisrechner ist PETG als Werkstoffgruppe ohne hinterlegtes Datenblatt geführt. Kennwerte auf dieser Seite beziehen sich auf das referenzierte PCTG-Produkt.',
    ],
    related: ['pla-tough', 'abs', 'asa'],
    relatedKnowledge: ['chemische-bestaendigkeit-im-praktischen-einsatz', 'ersatzteil-nachfertigung-maschinenstillstand'],
  },
  {
    slug: 'abs',
    headline: 'ABS im 3D-Druck: schlagzäh, bearbeitbar, bewährt',
    intro:
      'ABS ist ein bewährter technischer Standardkunststoff: schlagzäh, deutlich wärmebeständiger als PLA und gut nachzubearbeiten (schleifen, bohren, kleben). Im FDM-Druck braucht ABS einen beheizten, geschlossenen Bauraum, weil es beim Abkühlen stark schwindet.',
    strengths: [
      'Schlagzäh und robust im Alltag',
      'Wärmebeständiger als PLA und PETG',
      'Gut mechanisch nachbearbeitbar und klebbar',
    ],
    applications: [
      'Gehäuse, Halter und Abdeckungen im Innenbereich',
      'Funktionsteile in Maschinen ohne Witterungseinfluss',
      'Teile, die nachträglich gebohrt, geschliffen oder verklebt werden',
    ],
    limits: [
      'Nicht für den dauerhaften Außeneinsatz: UV-Strahlung lässt ABS vergilben und verspröden – dafür ASA wählen.',
      'Wird von vielen Lösemitteln angegriffen (z. B. Aceton); Medienkontakt vorab klären.',
      'Große, flache Teile neigen zu Verzug; Geometrie und Ausrichtung stimmen wir ab.',
    ],
    printingNotes: [
      'Die Haftung zwischen den Schichten ist bei ABS prozessabhängig. Bauteile mit Last quer zur Schichtrichtung planen wir mit angepasster Ausrichtung oder Wandstärke.',
    ],
    related: ['asa', 'petg-pctg', 'pc'],
    relatedKnowledge: ['materialwahl-abs-asa-pc-pa', 'temperaturbestaendige-bauteile-richtig-auslegen'],
  },
  {
    slug: 'asa',
    headline: 'ASA im 3D-Druck: der Werkstoff für den Außeneinsatz',
    intro:
      'ASA verhält sich mechanisch ähnlich wie ABS, ist aber deutlich beständiger gegen UV-Strahlung und Witterung. Für Bauteile, die dauerhaft draußen oder im Sonnenlicht eingesetzt werden, ist ASA unter den gängigen FDM-Werkstoffen meist die erste Wahl.',
    strengths: [
      'UV- und witterungsbeständiger als ABS',
      'Schlagzäh, wärmebeständiger als PLA und PETG',
      'Matte, gleichmäßige Oberfläche',
    ],
    applications: [
      'Außengehäuse, Abdeckungen und Halterungen',
      'Beschilderung, Blenden und Anbauteile im Freien',
      'Teile an Fahrzeugen und Anlagen mit Sonneneinstrahlung',
    ],
    limits: [
      'Wie ABS empfindlich gegenüber vielen Lösemitteln.',
      'Verzug bei großen, flachen Teilen; beheizter Bauraum erforderlich.',
      'UV-beständig heißt nicht unbegrenzt: Farbe, Wandstärke und Einbausituation beeinflussen die Alterung. Für Sichtteile empfehlen wir ein Muster im realen Einsatz.',
    ],
    printingNotes: [
      'Auch bei ASA ist die Schichtrichtung die Schwachstelle; wir richten das Bauteil nach Lastfall und Sichtseite aus.',
    ],
    related: ['abs', 'petg-pctg', 'pc'],
    relatedKnowledge: ['uv-und-witterungsbestaendigkeit-kunststoffteile', 'materialwahl-abs-asa-pc-pa'],
  },
  {
    slug: 'hips',
    headline: 'HIPS im 3D-Druck: Stützmaterial und leichte Teile',
    intro:
      'HIPS (High Impact Polystyrene, schlagzähes Polystyrol) wird im FDM-Druck vor allem als Stützmaterial für ABS eingesetzt, weil es sich in Limonen auflösen lässt. Das referenzierte Produkt wird vom Hersteller ausdrücklich als Stützmaterial beschrieben. Als eigenständiger Konstruktionswerkstoff spielt HIPS eine untergeordnete Rolle.',
    strengths: [
      'Lösliches Stützmaterial für komplexe ABS-Geometrien',
      'Geringe Dichte, gut nachbearbeitbar',
      'Ähnliche Verarbeitungstemperaturen wie ABS',
    ],
    applications: [
      'Stützstrukturen für ABS-Bauteile mit innenliegenden Hohlräumen oder Überhängen',
      'Leichte Muster und Modelle ohne Funktionslast',
    ],
    limits: [
      'Nicht für tragende Funktionsteile oder dauerhafte Last.',
      'Nicht UV-beständig, nicht für den Außeneinsatz.',
      'Wird von vielen Lösemitteln angegriffen.',
    ],
    printingNotes: [
      'Ob lösliche Stützen für Ihr Teil sinnvoll sind, entscheiden wir bei der technischen Prüfung – oft reicht eine angepasste Ausrichtung.',
    ],
    related: ['abs', 'asa'],
    relatedKnowledge: ['bauteiloptimierung-fuer-funktionssicherheit'],
  },
  {
    slug: 'pc',
    headline: 'Polycarbonat (PC) im 3D-Druck: sehr schlagzäh und wärmebeständig',
    intro:
      'Polycarbonat gehört zu den zähesten und wärmebeständigsten Werkstoffen, die sich im FDM-Verfahren verarbeiten lassen. Der Druck ist anspruchsvoll: hohe Temperaturen, beheizter Bauraum und trockenes Material sind Pflicht.',
    strengths: [
      'Sehr hohe Schlagzähigkeit',
      'Hohe Wärmeformbeständigkeit im Vergleich zu Standardwerkstoffen',
      'Formstabil bei mechanischer Belastung',
    ],
    applications: [
      'Hoch beanspruchte Funktionsteile und Schutzabdeckungen',
      'Halter und Gehäuse in warmer Umgebung',
      'Vorrichtungen mit Schlag- oder Stoßbelastung',
    ],
    limits: [
      'Neigt bei Kontakt mit bestimmten Chemikalien (z. B. manchen Lösemitteln und Reinigern) zu Spannungsrissen – Medien vorab klären.',
      'Kerbempfindlich: scharfe Innenkanten und Kerben vermeiden.',
      'Feuchteempfindlich in der Verarbeitung; höherer Aufwand und Preis als Standardwerkstoffe.',
    ],
    printingNotes: [
      'Für PC ist noch kein Herstellerdatenblatt in unserer Materialdatenbank hinterlegt. Kennwerte nennen wir projektbezogen mit dem konkret eingesetzten Filament.',
    ],
    related: ['abs', 'asa', 'pa'],
    relatedKnowledge: ['materialwahl-abs-asa-pc-pa', 'temperaturbestaendige-bauteile-richtig-auslegen'],
  },
  {
    slug: 'pa',
    headline: 'Polyamid (PA, Nylon) im 3D-Druck: zäh, abriebfest, gleitfähig',
    intro:
      'Polyamide sind zähe, ermüdungs- und verschleißbeständige technische Kunststoffe. Im 3D-Druck eignen sie sich besonders für bewegte Teile: Zahnräder, Buchsen, Gleitführungen, Scharniere und Clips. Die wichtigste Eigenschaft für die Praxis: Polyamid nimmt Feuchtigkeit aus der Luft auf, und seine Eigenschaften ändern sich dadurch.',
    strengths: [
      'Hohe Zähigkeit und Ermüdungsbeständigkeit',
      'Gute Gleit- und Verschleißeigenschaften',
      'Gilt als gut beständig gegen Öle, Fette und Kraftstoffe',
    ],
    applications: [
      'Zahnräder, Buchsen, Gleitelemente und Führungen',
      'Clips, Schnapphaken und Filmscharniere',
      'Ersatzteile für Maschinen mit Öl- oder Fettkontakt',
    ],
    limits: [
      'Nimmt Feuchtigkeit auf: Steifigkeit, Festigkeit und Maße verändern sich mit der Umgebungsfeuchte. Datenblattwerte gelten für den dort genannten Zustand.',
      'Empfindlich gegenüber Säuren; Medienkontakt vorab klären.',
      'Für hohe Steifigkeit ist faserverstärktes PA (z. B. PA6-CF) besser geeignet.',
    ],
    printingNotes: [
      'Das referenzierte Datenblatt nennt Werte an gedruckten Prüfkörpern je Prüfrichtung. Diese Werte zeigen die Richtungsabhängigkeit, sind aber ebenfalls nicht direkt auf Ihre Geometrie übertragbar.',
    ],
    related: ['pa6-cf', 'tpu', 'petg-pctg'],
    relatedKnowledge: ['materialwahl-abs-asa-pc-pa', 'chemische-bestaendigkeit-im-praktischen-einsatz'],
  },
  {
    slug: 'pa6-cf',
    headline: 'PA6-CF im 3D-Druck: carbonfaserverstärktes Polyamid',
    intro:
      'In PA6-CF sind kurze Carbonfasern in Polyamid 6 eingebettet. Das Ergebnis ist deutlich steifer und maßhaltiger als unverstärktes Polyamid und behält auch bei erhöhter Temperatur mehr Formstabilität. Der Preis dafür: geringere Zähigkeit und eine ausgeprägte Richtungsabhängigkeit der Eigenschaften.',
    strengths: [
      'Hohe Steifigkeit laut Datenblatt (siehe Kennwerte)',
      'Gute Maßhaltigkeit, wenig Verzug',
      'Hohe Wärmeformbeständigkeit unter geringer Last laut Datenblatt',
      'Matte, technische Oberfläche',
    ],
    applications: [
      'Vorrichtungen, Aufnahmen und Lehren mit Steifigkeitsanforderung',
      'Halter, Konsolen und Strukturteile in Maschinen',
      'Ersatzteile, die bisher aus steifen technischen Kunststoffen gefertigt wurden',
    ],
    limits: [
      'Deutlich weniger schlag- und bruchzäh als unverstärktes PA; nicht für Schnapphaken oder stoßbelastete Teile.',
      'Stark richtungsabhängig: Die Fasern richten sich in Druckrichtung aus, quer zu den Schichten ist das Bauteil erheblich schwächer.',
      'Nimmt wie jedes Polyamid Feuchtigkeit auf.',
    ],
    printingNotes: [
      'Die Datenblattwerte stammen von Prüfkörpern. Bei faserverstärkten Werkstoffen ist der Unterschied zum gedruckten Bauteil besonders groß, weil Faserorientierung und Schichtaufbau die Eigenschaften bestimmen. Ausrichtung und Wandaufbau legen wir nach dem Lastfall fest.',
    ],
    related: ['pa', 'pet-cf', 'pc'],
    relatedKnowledge: ['temperaturbestaendige-bauteile-richtig-auslegen', 'vorrichtungen-fuer-montagequalitaet'],
  },
  {
    slug: 'pet-cf',
    headline: 'PET-CF im 3D-Druck: carbonfaserverstärkter Polyester',
    intro:
      'PET-CF ist ein Polyester mit eingebetteten kurzen Carbonfasern. Er ist steif und maßhaltig und nimmt in der Regel weniger Feuchtigkeit auf als faserverstärkte Polyamide. Damit eignet er sich für steife Bauteile, deren Maße über wechselnde Luftfeuchte stabil bleiben sollen.',
    strengths: [
      'Hohe Steifigkeit und Maßhaltigkeit',
      'In der Regel weniger feuchteempfindlich als PA-basierte Faserwerkstoffe',
      'Matte, technische Oberfläche',
    ],
    applications: [
      'Vorrichtungen, Lehren und Aufnahmen',
      'Steife Halter und Abdeckungen',
      'Strukturteile mit Anforderungen an Formstabilität',
    ],
    limits: [
      'Geringe Schlag- und Bruchzähigkeit; nicht für stoßbelastete oder federnde Teile.',
      'Stark richtungsabhängig wie alle kurzfaserverstärkten Druckwerkstoffe.',
    ],
    printingNotes: [
      'Für PET-CF ist noch kein Herstellerdatenblatt in unserer Materialdatenbank hinterlegt. Kennwerte nennen wir projektbezogen mit dem konkret eingesetzten Filament.',
    ],
    related: ['pa6-cf', 'petg-pctg', 'pla'],
    relatedKnowledge: ['vorrichtungen-fuer-montagequalitaet', 'fdm-toleranzen-im-industriealltag'],
  },
  {
    slug: 'tpu',
    headline: 'TPU im 3D-Druck: flexible, dämpfende Funktionsteile',
    intro:
      'TPU (thermoplastisches Polyurethan) ist ein Elastomer: Bauteile lassen sich biegen und stauchen und kehren in ihre Form zurück. TPU ist abriebfest und dämpft Stöße. Die Härte wird bei TPU in Shore angegeben; die Bezeichnung „95A“ im Produktnamen des referenzierten Filaments ist diese Härteangabe des Herstellers.',
    strengths: [
      'Elastisch und rückstellfähig',
      'Hohe Abriebfestigkeit',
      'Dämpft Stöße und Vibrationen, rutschhemmend',
    ],
    applications: [
      'Puffer, Anschläge und Dämpfungselemente',
      'Griffe, Schutzkappen und Kantenschutz',
      'Kabeldurchführungen, Knickschutz und Rollenbeläge',
    ],
    limits: [
      'Weniger maßhaltig als starre Werkstoffe; enge Passungen am Muster prüfen.',
      'Geringe Wärmebeständigkeit; nicht für warme Umgebungen.',
      'Keine Freigabe für druckdichte oder sicherheitsrelevante Dichtungen ohne Prüfung im Anwendungsfall.',
    ],
    printingNotes: [
      'Steifigkeit und Rückstellverhalten eines TPU-Teils hängen stark von Wandstärke, Füllgrad und Geometrie ab – oft stärker als vom Werkstoff selbst.',
    ],
    related: ['pa', 'petg-pctg'],
    relatedKnowledge: ['tpu-funktionsbauteile-belastbar-auslegen'],
  },
];

export const WERKSTOFF_CONTENT_BY_SLUG: Readonly<Record<string, WerkstoffFamilyContent>> = Object.fromEntries(
  WERKSTOFF_CONTENT.map((content) => [content.slug, content]),
);

/* ------------------------------------------------ use-case guide */

export interface UseCaseRecommendation {
  slug: string;
  note: string;
}

export interface UseCase {
  id: string;
  label: string;
  question: string;
  recommended: readonly UseCaseRecommendation[];
  avoid: readonly UseCaseRecommendation[];
  caveat: string;
}

export const USE_CASES: readonly UseCase[] = [
  {
    id: 'aussen',
    label: 'Außen, UV & Witterung',
    question: 'Das Teil wird dauerhaft im Freien oder im Sonnenlicht eingesetzt.',
    recommended: [
      { slug: 'asa', note: 'Erste Wahl für bewitterte Teile: ABS-ähnliche Mechanik mit besserer UV-Beständigkeit.' },
      { slug: 'petg-pctg', note: 'Für geschützten Außeneinsatz oder begrenzte Nutzungsdauer.' },
    ],
    avoid: [
      { slug: 'pla', note: 'Wärme und Witterung setzen PLA schnell zu.' },
      { slug: 'abs', note: 'Vergilbt und versprödet unter UV-Strahlung.' },
      { slug: 'hips', note: 'Nicht UV-beständig.' },
    ],
    caveat:
      'Farbe, Wandstärke und Einbausituation beeinflussen die Alterung. Für Sichtteile empfehlen wir ein Muster im realen Einsatz.',
  },
  {
    id: 'waerme',
    label: 'Erhöhte Temperatur',
    question: 'Das Teil sitzt in warmer Umgebung, z. B. in Maschinennähe oder im Fahrzeug.',
    recommended: [
      { slug: 'pa6-cf', note: 'Hohe Wärmeformbeständigkeit unter geringer Last laut Datenblatt, dazu hohe Steifigkeit.' },
      { slug: 'pc', note: 'Sehr zäh und wärmebeständig; anspruchsvoll in der Verarbeitung.' },
      { slug: 'asa', note: 'Deutlich wärmebeständiger als PLA, zusätzlich UV-beständig.' },
      { slug: 'abs', note: 'Deutlich wärmebeständiger als PLA, für Innenanwendungen.' },
    ],
    avoid: [
      { slug: 'pla', note: 'Erweicht bereits bei moderater Wärme.' },
      { slug: 'pla-tough', note: 'Wärmebeständigkeit auf PLA-Niveau.' },
      { slug: 'tpu', note: 'Geringe Wärmebeständigkeit.' },
    ],
    caveat:
      'Maßgeblich ist die Temperatur unter Last über die Zeit. HDT- und Vicat-Werte sind Kurzzeit-Kennwerte am Prüfkörper – nennen Sie uns Temperatur, Dauer und Belastung.',
  },
  {
    id: 'schlag',
    label: 'Schlag & Stoß',
    question: 'Das Teil muss Stöße, Stürze oder Schläge aushalten.',
    recommended: [
      { slug: 'pc', note: 'Sehr hohe Schlagzähigkeit.' },
      { slug: 'petg-pctg', note: 'Zäh und gutmütig, bricht selten spröde.' },
      { slug: 'pa', note: 'Zäh und ermüdungsbeständig, z. B. für Clips.' },
      { slug: 'abs', note: 'Schlagzäher Standard für Gehäuse.' },
      { slug: 'pla-tough', note: 'Schlagzähe PLA-Variante für Funktionsmuster bei Raumtemperatur.' },
    ],
    avoid: [
      { slug: 'pla', note: 'Vergleichsweise spröde.' },
      { slug: 'pa6-cf', note: 'Faserverstärkt: steif, aber weniger schlagzäh.' },
      { slug: 'pet-cf', note: 'Faserverstärkt: steif, aber weniger schlagzäh.' },
    ],
    caveat:
      'Kerben, scharfe Innenkanten und Stöße quer zu den Druckschichten verringern die Schlagfestigkeit deutlich. Wir berücksichtigen das bei Ausrichtung und Konstruktion.',
  },
  {
    id: 'flexibel',
    label: 'Flexibel & dämpfend',
    question: 'Das Teil soll nachgeben, dämpfen oder rutschhemmend sein.',
    recommended: [{ slug: 'tpu', note: 'Elastisch, rückstellfähig und abriebfest.' }],
    avoid: [
      { slug: 'pa6-cf', note: 'Sehr steif, nicht federnd.' },
      { slug: 'pet-cf', note: 'Sehr steif, nicht federnd.' },
    ],
    caveat:
      'TPU-Teile sind weniger maßhaltig als starre Werkstoffe. Dicht- und Dauerbiegefunktionen prüfen wir am Muster.',
  },
  {
    id: 'steif',
    label: 'Steif & maßhaltig',
    question: 'Lehren, Vorrichtungen oder Aufnahmen, die sich nicht verformen dürfen.',
    recommended: [
      { slug: 'pa6-cf', note: 'Sehr steif und maßhaltig, auch bei erhöhter Temperatur.' },
      { slug: 'pet-cf', note: 'Steif, maßhaltig und wenig feuchteempfindlich.' },
      { slug: 'pla', note: 'Steif und präzise, solange keine Wärmelast auftritt.' },
    ],
    avoid: [{ slug: 'tpu', note: 'Elastisch, nicht formstabil.' }],
    caveat: 'Steifigkeit und Maßhaltigkeit hängen stark von Druckrichtung, Füllgrad und Wandaufbau ab.',
  },
  {
    id: 'verschleiss',
    label: 'Gleiten & Verschleiß',
    question: 'Bewegte Teile: Zahnräder, Buchsen, Führungen, Rollen.',
    recommended: [
      { slug: 'pa', note: 'Gute Gleit- und Verschleißeigenschaften.' },
      { slug: 'tpu', note: 'Abriebfest bei elastischer Beanspruchung, z. B. Rollenbeläge.' },
    ],
    avoid: [
      { slug: 'pla', note: 'Spröde und verschleißanfällig bei Reibung und Wärme.' },
      { slug: 'hips', note: 'Nicht für Funktionslast ausgelegt.' },
    ],
    caveat:
      'Gegenlaufpartner, Schmierung, Drehzahl und Flächenpressung entscheiden über die Lebensdauer – bitte in der Anfrage angeben.',
  },
  {
    id: 'medien',
    label: 'Öle, Fette & Reiniger',
    question: 'Das Teil kommt mit Betriebsmitteln oder Reinigungsmitteln in Kontakt.',
    recommended: [
      { slug: 'pa', note: 'Gilt als gut beständig gegen Öle, Fette und Kraftstoffe; empfindlich gegenüber Säuren.' },
      { slug: 'petg-pctg', note: 'Gegen viele wässrige Medien beständig.' },
    ],
    avoid: [
      { slug: 'abs', note: 'Styrolkunststoffe werden von vielen Lösemitteln angegriffen.' },
      { slug: 'asa', note: 'Styrolkunststoffe werden von vielen Lösemitteln angegriffen.' },
      { slug: 'hips', note: 'Styrolkunststoffe werden von vielen Lösemitteln angegriffen.' },
      { slug: 'pc', note: 'Neigt bei bestimmten Medien zu Spannungsrissen.' },
    ],
    caveat:
      'Chemische Beständigkeit hängt vom konkreten Medium, seiner Konzentration, der Temperatur und der Einwirkdauer ab. Nennen Sie uns das Medium; im Zweifel prüfen wir mit einem Probekörper.',
  },
  {
    id: 'lebensmittel',
    label: 'Lebensmittelkontakt',
    question: 'Das Teil berührt Lebensmittel oder Trinkwasser.',
    recommended: [],
    avoid: [],
    caveat:
      'Wir geben keine pauschale Freigabe für Lebensmittelkontakt. Die Eignung hängt von der Konformitätserklärung des konkreten Filaments (einschließlich Farbe und Zusätzen), vom Druckprozess und von der Oberfläche ab: Gedruckte Teile haben Rillen zwischen den Schichten, in denen sich Rückstände halten können. Die hier verlinkten Datenblätter sind kein Nachweis für Lebensmittelkontakt. Sprechen Sie uns vor der Anfrage an.',
  },
];
