const { Plugin, PluginSettingTab, Setting, TFile, Notice, Modal, ItemView, setIcon } = require('obsidian');

// === Farbpaletten ===
const DEFAULT_PALETTE  = ['#3295D2', '#6CC261', '#DDC88D', '#9c9090', '#CD6155', '#FFD700', '#000000', '#FFFFFF'];
const DEFAULT_PALETTE2 = ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#8000ff', '#ff00ff'];

// === Toolbar Schriftgröße & Höhe ===
const TOOLBAR_INPUT_FONT_SIZE = '13px';
const TOOLBAR_INPUT_HEIGHT = '24px';

// === Farben (Standardwerte) ===
const DEFAULT_MASTER_COLOR = '#000000';
const DEFAULT_RIVER_COLOR = '#3295D2';
const DEFAULT_ROAD_COLOR = '#f5deb3';
const DEFAULT_BORDER_COLOR = '#FF0000';
const DEFAULT_TEXT_COLOR = '#ffffff';
const DEFAULT_EXTRAS_SYMBOL_COLOR = '#228B22';
const DEFAULT_EXTRAS_BG_COLOR = '#6CC261';
const DEFAULT_VEGETATION_SYMBOL_COLOR = '#228B22';
const DEFAULT_VEGETATION_BG_COLOR = '#6CC261';
const DEFAULT_MOUNTAIN_SYMBOL_COLOR = '#5D4037';
const DEFAULT_MOUNTAIN_BG_COLOR = '#808080';
const DEFAULT_BUILDING_SYMBOL_COLOR = '#CD6155';
const DEFAULT_BUILDING_BG_COLOR = '#DDC88D';

// === Größen & Abstände ===
const DEFAULT_GRID_SIZE = 30;
const DEFAULT_OFF_X = 400;
const DEFAULT_OFF_Y = 300;
const DEFAULT_RIVER_WIDTH = 5;
const DEFAULT_ROAD_WIDTH = 3;
const DEFAULT_BORDER_HIGHLIGHT_WIDTH = 3;
const DEFAULT_BORDER_DASHES = 1;
const DEFAULT_PATH_DASHES = 1;
const PATH_END_INSET = 0.15;
const MAX_HISTORY = 50;
const MIN_ZOOM = 0.01; // Minimale Verkleinerung (1% einer Wabe)
const MAX_ZOOM = 4; // Maximale Vergrößerung (Zahl x 100% einer Wabe. 4 = 400%)
const VIEWPORT_PADDING = 0.9;

// === Text-Defaults ===
const DEFAULT_TEXT_SIZE = 16;
const DEFAULT_SHADOW_DISTANCE = 5;
const DEFAULT_SHADOW_OPACITY = 50;

// === UI-Styling ===
const ACTIVE_COLOR = '#4A9EFF';
const ACTIVE_BOX_SHADOW = `0 0 8px ${ACTIVE_COLOR}66`;
const ACTIVE_BORDER = `3px solid ${ACTIVE_COLOR}`;
const PICKER_ACTIVE_BG = ACTIVE_COLOR;
const BUTTON_BG_DEFAULT = '#ffffff';

// === Symbol-Konfiguration (Größe/Position pro Symbol) ===
const SVG_SYMBOL_CONFIG = {
    'question':    { size: 0.5,   align: 'center', marginX: 0, marginY: 0 },
    'exclamation': { size: 0.5,   align: 'center', marginX: 0, marginY: 0 },
    'cross':       { size: 0.5,   align: 'center', marginX: 0, marginY: 0 },
    'dot':         { size: 0.45,   align: 'center', marginX: 0, marginY: 0 },
    'grass':       { size: 0.30,  align: 'center', marginX: 0, marginY: 0 },
    'swamp':       { size: 0.30,  align: 'center', marginX: 0, marginY: 0 },
    'bush':        { size: 0.35,  align: 'center', marginX: 0, marginY: 0 },
    'tree':        { size: 0.30,  align: 'center', marginX: 0, marginY: -6 },
    'pine':        { size: 0.35,  align: 'center', marginX: 0, marginY: -2 },
    'palm':        { size: 0.325, align: 'center', marginX: 0, marginY: 0 },
    'hill':        { size: 0.50,  align: 'center', marginX: 0, marginY: 0 },
    'mountain':    { size: 0.60,  align: 'center', marginX: 0, marginY: 0 },
    'tent':        { size: 0.325,  align: 'center', marginX: 0, marginY: 0 },
    'house':       { size: 0.30, align: 'center', marginX: 0, marginY: -2 },
    'village':     { size: 0.50,  align: 'center', marginX: 0, marginY: 0 },
    'town':        { size: 0.60,  align: 'center', marginX: 0, marginY: -1 },
    'castle':      { size: 0.65,  align: 'center', marginX: 0, marginY: 0 },
    'harbor':      { size: 0.30,  align: 'center', marginX: 0, marginY: 0 },
    'monastery':   { size: 0.65,  align: 'center', marginX: 0, marginY: -3 },
    'tower':       { size: 0.30,  align: 'center', marginX: 0, marginY: 0 },
    'ruin':        { size: 0.30,  align: 'center', marginX: 0, marginY: 0 },
    'cave':        { size: 0.30,  align: 'center', marginX: 0, marginY: 0 },
    'oasis':       { size: 0.30,  align: 'center', marginX: 0, marginY: 0 }
};

// === Übersetzungen ===
function getObsidianLanguage() {
    const lang = window.localStorage.getItem('language');
    return (lang && TRANSLATIONS[lang]) ? lang : 'en';
}
let currentLanguage = 'en';

const TRANSLATIONS = {
    de: {
        // Tool-Gruppen
        'tool.extras': 'Extras',
        'tool.vegetation': 'Vegetation',
        'tool.mountain': 'Berg',
        'tool.building': 'Gebäude',

        // Varianten — Extras
        'variant.question': 'Fragezeichen',
        'variant.exclamation': 'Ausrufezeichen',
        'variant.cross': 'Kreuz',
        'variant.dot': 'Start/Ziel-Punkt',
        // Varianten — Vegetation
        'variant.grass': 'Gras',
        'variant.swamp': 'Sumpf',
        'variant.bush': 'Strauch',
        'variant.tree': 'Laubbaum',
        'variant.pine': 'Nadelbaum',
        'variant.palm': 'Palme',
        // Varianten — Berge
        'variant.hill': 'Hügel',
        'variant.mountain': 'Berg',
        // Varianten — Gebäude
        'variant.tent': 'Zelt',
        'variant.house': 'Haus',
        'variant.village': 'Dorf',
        'variant.town': 'Stadt',
        'variant.castle': 'Burg',
        'variant.monastery': 'Kloster',
        'variant.harbor': 'Hafen',
        'variant.tower': 'Turm',
        'variant.ruin': 'Ruine',
        'variant.cave': 'Höhle',
        'variant.oasis': 'Oase',

        // Tooltips — Hauptwerkzeuge
        'tooltip.editMode': 'Edit-Modus\nKlick: Werkzeuge ein-/ausblenden',
        'tooltip.colorPicker': 'Aktuelle Farbe\nKlick: Farbwähler öffnen',
        'tooltip.hexColor': 'Waben\nKlick: Waben einfärben\nRechtsklick in Karte: Löschen',
        'tooltip.fill': 'Fülleimer\nKlick: Zusammenhängende Fläche füllen\nErneut klicken: Fülleimer ausschalten',
        'tooltip.text': 'Text-Werkzeug\nKlick auf Karte: Neuen Text erstellen\nKlick auf Text: Text bearbeiten/verschieben\nRechtsklick in Karte auf Text: Text löschen',
        'tooltip.eraser': 'Radierer\nKlick: Wabeninhalt löschen\nDoppelklick: Zusammenhängendes löschen',
        'tooltip.undo': 'Rückgängig\nStrg+Z: Letzte Aktion rückgängig machen',
        'tooltip.redo': 'Wiederholen\nStrg+Y: Rückgängig gemachte Aktion wiederholen',
        'tooltip.fit': 'Karte einpassen\nKlick: Fenster mit gesamter Karte ausfüllen',
        'tooltip.palette': 'Farbpalette\nKlick: Farbe als aktuelle Farbe übernehmen\nRechtsklick: Palettenfarbe ändern',
        'tooltip.toolGroup': '{name}\nKlick: Zeichnen\nRechtsklick: Variante wählen\nRechtsklick in Karte: Löschen',
        'tooltip.toolGroupVariant': '{label}\nKlick: Zeichnen\nRechtsklick: Variante wählen\nRechtsklick in Karte: Löschen',

        // Tooltips — Musterwerkzeug
        'tooltip.pattern': 'Muster-Werkzeug\nKlick: Mit aufgenommenem Muster zeichnen\nRechtsklick in Karte: Löschen\nDoppelklick Radierer: Zusammenhängendes Muster löschen',
        'tooltip.patternPicker': 'Muster aufnehmen\nKlick: Wabe als Muster übernehmen',

        // Tooltips — Fluss/Weg
        'tooltip.river': 'Fluss-Werkzeug\nKlick: Wegpunkte setzen/verschieben\nDoppelklick Endpunkt: Fluss schließen (nur ohne Abzweigungen)\nRechtsklick in Karte: Teilstück löschen\nDoppelklick Radierer: Ganzen Fluss löschen',
        'tooltip.road': 'Weg-Werkzeug\nKlick: Wegpunkte setzen/verschieben\nRechtsklick in Karte: Teilstück löschen\nDoppelklick Radierer: Ganzen Weg löschen',
        'tooltip.pathPicker': 'Fluss/Weg aufnehmen\nKlick: Vorhandenen Fluss/Weg auswählen',
        'tooltip.pathFinish': 'Abschließen\nKlick: Aktuellen Fluss/Weg fertigstellen',
        'tooltip.roadFinish': 'Weg abschließen',
        'tooltip.riverFinish': 'Fluss abschließen',
        'input.riverWidth': 'Flussbreite',
        'input.roadWidth': 'Wegbreite',
        'input.pathDashes': 'Striche',

        // Tooltips — Grenzen
        'tooltip.border': 'Grenz-Werkzeug\nKlick: Grenzwaben zeichnen\nRechtsklick in Karte: Löschen\nDoppelklick Radierer: Zusammenhängende Grenze löschen',
        'tooltip.borderPicker': 'Grenzfarbe aufnehmen\nKlick: Vorhandene Grenze zum bearbeiten auswählen',
        'tooltip.borderFinish': 'Abschließen\nKlick: Aktuelle Grenze fertigstellen',
        'tooltip.borderVisibility': 'Grenzen-Sichtbarkeit\nKlick: Grenzen ein-/ausblenden',
        'input.borderDashes': 'Striche',

        // Notices
        'notice.fileCreateError': 'Fehler beim Erstellen der Datei: {error}',
        'notice.nothingToUndo': 'Nichts zum Rückgängigmachen',
        'notice.nothingToRedo': 'Nichts zum Wiederholen',
        'notice.noHexesToShow': 'Keine Waben oder Texte zum Anzeigen',
        'notice.noPattern': 'Kein Muster ausgewählt. Nutze den Picker-Button, um ein Muster aufzunehmen.',
        'notice.clickToPickPattern': 'Klicke auf eine Wabe, um das Muster aufzunehmen',
        'notice.patternPicked': 'Muster aufgenommen!',
        'notice.noHexAtPosition': 'Keine Wabe an dieser Position',
        'notice.riverSelected': 'Fluss #{id} ausgewählt',
        'notice.roadSelected': 'Weg #{id} ausgewählt',
        'notice.noRiverOrRoad': 'Kein Fluss oder Weg an dieser Position',
        'notice.borderSelected': 'Grenze #{id} ausgewählt',
        'notice.noBorderAtPosition': 'Keine Grenze an dieser Position',

        // Modal — Dateiauswahl
        'modal.selectFile': 'MD Datei auswählen',
        'modal.searchFile': 'Dateiname suchen...',
        'modal.noFilesFound': 'Keine Dateien gefunden',
        'modal.removeLink': 'Link entfernen',
        'modal.cancel': 'Abbrechen',

        // Modal — Textformatierung
        'modal.formatText': 'Text formatieren',
        'modal.displayText': 'Anzeigetext:',
        'modal.textPlaceholder': 'Text eingeben...',
        'modal.textSize': 'Textgröße:',
        'modal.textColor': 'Textfarbe:',
        'modal.palette': 'Palette:',
        'modal.formatting': 'Formatierung:',
        'modal.outline': 'Outline',
        'modal.bold': 'Fett',
        'modal.shadowSettings': 'Schatten-Einstellungen:',
        'modal.shadowEnable': 'Schatten aktivieren',
        'modal.shadowDistance': 'Abstand (px):',
        'modal.shadowOpacity': 'Transparenz (%):',
        'modal.linkToFile': 'Link zu MD-Datei:',
        'modal.noLinkSelected': 'Kein Link ausgewählt',
        'modal.selectFileBtn': 'Datei wählen...',
        'modal.deleteText': 'Text löschen',
        'modal.confirmDeleteText': 'Text wirklich löschen?',

        // Einstellungen
        'settings.exportWidth': 'Standard-Breite für Bildexport in Pixeln.',
        'settings.exportWidthDesc': 'Standardbreite in Pixeln beim Exportieren als Bild.',
        'settings.showCrosshair': 'Fadenkreuz anzeigen',
        'settings.showCrosshairDesc': 'Zeigt ein Fadenkreuz im Zentrum der Karte an.',
        'settings.donateText': 'Spendiere mir einen Kaffee. Ich freue mich darüber, Euch den Hex Cartographer kostenlos zur Verfügung zu stellen. Allerdings bedurfte die Entwicklung lange Zeit. Wenn mir etwas neues einfällt, wird es für Euch Updates geben. Ihr würdet mir eine große Freude bereiten, wenn ihr mir für diese Arbeit eine kleine Spende hinterlasst.',
        'settings.donateButton': 'Spende einen Kaffee',

        // Anleitung
        'guide.title': 'Kurzanleitung',
        'guide.basics': 'Grundlagen',
        'guide.basics.create': 'Rechtsklick auf einen Ordner in der Dateiübersicht → „Neue Hex Cartographer Karte erstellen."',
        'guide.basics.editMode': 'Bearbeitungsmodus ein-/ausschalten.',
        'guide.navigation': 'Navigation',
        'guide.navigation.zoom': 'Mausrad = Zoom.',
        'guide.navigation.pan': 'Mittlere Maustaste oder Shift+Ziehen = Karte verschieben.',
        'guide.navigation.fit': 'Ganze Karte zeigen.',
        'guide.hexcolor': 'Wabenfarbe',
        'guide.hexcolor.paint': 'Farbe wählen und auf Waben klicken zum Einfärben.',
        'guide.hexcolor.eyedropper': 'Farbpipette: Farbe auf der Karte aufnehmen.',
        'guide.hexcolor.palette': 'Rechtsklick auf Palettenplatz = Farbe neu setzen.',
        'guide.symbols': 'Symbole',
        'guide.symbols.groups': 'Werkzeuggruppe wählen (Extras, Vegetation, Berg, Gebäude).',
        'guide.symbols.variant': 'Rechtsklick = Auswahl der Symbolvariante.',
        'guide.symbols.colors': 'Die aktuelle Master-Farbe bestimmt die Symbolfarbe.',
        'guide.drawing': 'Zeichenmodi',
        'guide.drawing.pen': 'Zum Zeichnen klicken oder ziehen.',
        'guide.drawing.fill': 'Fläche mit aktiver Farbe oder Symbol füllen.',
        'guide.drawing.eraser': 'Feld, Symbol oder Weg-/Fluss-Abschnitt durch Klicken löschen (Doppelklick = zusammenhängende Elemente löschen).',
        'guide.drawing.rightclick': 'Rechte Maustaste = Radierer (halten + ziehen = mehrere Elemente löschen, Doppelklick = zusammenhängendes löschen).',
        'guide.pattern': 'Musterwerkzeug',
        'guide.pattern.stamp': 'Muster auf Waben setzen. Ziehen um mit Muster zu zeichnen.',
        'guide.pattern.pick': 'Vorhandenes Muster aufnehmen, um damit zu zeichnen.',
        'guide.paths': 'Flüsse & Wege',
        'guide.paths.river': 'Wegpunkte setzen für Flüsse. Flussenden laufen an Sackgassen spitz zu. Doppelklick auf einen Endpunkt schließt den Fluss (nur ohne Abzweigungen). Letzten Punkt auf den vorletzten ziehen deaktiviert die Verengung an diesem Ende.',
        'guide.paths.road': 'Wegpunkte setzen für Wege.',
        'guide.paths.pick': 'Bestehenden Fluss/Weg auswählen und bearbeiten.',
        'guide.paths.width': 'Breite der Flüsse/Wege über die Eingabefelder mit einem Wert anpassen.',
        'guide.paths.dashes': 'Unterteilt jedes Waben-Segment in abwechselnd Strich und Lücke (1 = durchgehend, 2 = halbe Linie, 3 = zwei Striche usw.).',
        'guide.borders': 'Grenzen',
        'guide.borders.draw': 'Grenzregion zeichnen durch Klicken oder Ziehen auf Waben.',
        'guide.borders.pick': 'Bestehende Grenze zum Bearbeiten auswählen.',
        'guide.borders.dash': 'Unterteilt jede Wabenkante in abwechselnd Strich und Lücke (1 = durchgehend, 2 = halbe Linie, 3 = zwei Striche usw.).',
        'guide.borders.visibility': 'Grenzen auf der Karte ein-/ausblenden.',
        'guide.text': 'Text',
        'guide.text.tool': 'Auf Karte klicken um Textinhalt, Größe, Farbe und Format einzustellen.<br>Erneut auf Text klicken, um ihn zu bearbeiten.<br>Zum Verschieben ziehen.',
        'guide.undoredo': 'Rückgängig / Wiederholen',
        'guide.undoredo.undo': 'Strg+Z = Rückgängig',
        'guide.undoredo.redo': 'Strg+Y = Wiederholen',
        'guide.print': 'Drucken / Exportieren',
        'guide.print.pc': 'Drei-Punkte-Menü → „Karte drucken" öffnet den Druckdialog (PC).',
        'guide.print.export': 'Drei-Punkte-Menü → „Als Bild exportieren" speichert die Karte als JPEG oder PNG.',
        'guide.print.exportMobile': 'Auf Mobilgeräten wird das Bild im Ordner „Hex Cartographer Export" neben der Kartendatei gespeichert.',
        'guide.touch': 'Infos für Benutzer mit Touch Screen',
        'guide.touch.tap': 'Tippen = Setzen, Platzieren, Auswählen.<br>Mit einem Finger streichen = Zeichnen.',
        'guide.touch.longpress': 'Langes Halten auf Werkzeug-Buttons = z.B. Symbolvariante wählen oder Palettenfarbe ändern.',
        'guide.touch.zoom': 'Zwei-Finger-Pinch = Zoom.',
        'guide.touch.pan': 'Zwei-Finger-Ziehen = Karte verschieben.',

        // Modal — Farbwähler
        'modal.colorPickerTitle': 'Farbe wählen',
        'modal.colorPickerCancel': 'Abbrechen',
        'tooltip.colorEyedropper': 'Farbpipette\nTippe auf die Karte, um eine beliebige Farbe zu übernehmen',
        'notice.tapToPickColor': 'Tippe auf eine Wabe, um die Farbe aufzunehmen',
        'notice.colorPicked': 'Farbe aufgenommen',
        'notice.noColorAtPosition': 'Keine Farbe an dieser Position',

        // Menü-Einträge
        'menu.createNew': 'Neue Hex Cartographer Karte erstellen',
        'menu.openInEditor': 'Im Hex Cartographer öffnen',
        'menu.printMap': 'Karte drucken',
        'menu.shareMap': 'Karte teilen',
        'menu.exportMap': 'Als Bild exportieren',
        'notice.noContentToPrint': 'Keine Karteninhalte zum Drucken vorhanden',
        'notice.exportSaved': 'Exportiert nach',
        'modal.exportTitle': 'Als Bild exportieren',
        'modal.exportFormat': 'Format',
        'modal.exportQuality': 'Qualität',
        'modal.exportExport': 'Exportieren',
    },

    en: {
        // Tool groups
        'tool.extras': 'Extras',
        'tool.vegetation': 'Vegetation',
        'tool.mountain': 'Mountain',
        'tool.building': 'Building',

        // Variants — Extras
        'variant.question': 'Question Mark',
        'variant.exclamation': 'Exclamation Mark',
        'variant.cross': 'Cross',
        'variant.dot': 'Start/End Point',
        // Variants — Vegetation
        'variant.grass': 'Grass',
        'variant.swamp': 'Swamp',
        'variant.bush': 'Bush',
        'variant.tree': 'Deciduous Tree',
        'variant.pine': 'Conifer',
        'variant.palm': 'Palm Tree',
        // Variants — Mountains
        'variant.hill': 'Hill',
        'variant.mountain': 'Mountain',
        // Variants — Buildings
        'variant.tent': 'Tent',
        'variant.house': 'House',
        'variant.village': 'Village',
        'variant.town': 'Town',
        'variant.castle': 'Castle',
        'variant.monastery': 'Monastery',
        'variant.harbor': 'Harbor',
        'variant.tower': 'Tower',
        'variant.ruin': 'Ruin',
        'variant.cave': 'Cave',
        'variant.oasis': 'Oasis',

        // Tooltips — Main tools
        'tooltip.editMode': 'Edit Mode\nClick: Show/hide tools',
        'tooltip.colorPicker': 'Current Color\nClick: Pick any color from the map',
        'tooltip.hexColor': 'Hexes\nClick: Color hexes\nRight-click on map: Delete',
        'tooltip.fill': 'Fill Bucket\nClick: Fill connected area\nClick again: Turn off fill',
        'tooltip.text': 'Text Tool\nClick on map: Create new text\nClick on text: Edit/move text\nRight-click on map text: Delete text',
        'tooltip.eraser': 'Eraser\nClick: Delete hex content\nDouble-click: Delete connected area',
        'tooltip.undo': 'Undo\nCtrl+Z: Undo last action',
        'tooltip.redo': 'Redo\nCtrl+Y: Redo undone action',
        'tooltip.fit': 'Fit Map\nClick: Fit entire map to window',
        'tooltip.palette': 'Color Palette\nClick: Use as current color\nRight-click: Change palette color',
        'tooltip.toolGroup': '{name}\nClick: Draw\nRight-click: Choose variant\nRight-click on map: Delete',
        'tooltip.toolGroupVariant': '{label}\nClick: Draw\nRight-click: Choose variant\nRight-click on map: Delete',

        // Tooltips — Pattern tool
        'tooltip.pattern': 'Pattern Tool\nClick: Draw with picked pattern\nRight-click on map: Delete\nDouble-click Eraser: Delete connected pattern',
        'tooltip.patternPicker': 'Pick Pattern\nClick: Pick hex as pattern',

        // Tooltips — River/Road
        'tooltip.river': 'River Tool\nClick: Place/move waypoints\nDouble-click endpoint: Close river (only without branches)\nRight-click on map: Delete segment\nDouble-click Eraser: Delete entire river',
        'tooltip.road': 'Road Tool\nClick: Place/move waypoints\nRight-click on map: Delete segment\nDouble-click Eraser: Delete entire road',
        'tooltip.pathPicker': 'Pick River/Road\nClick: Select existing river/road',
        'tooltip.pathFinish': 'Finish\nClick: Complete current river/road',
        'tooltip.roadFinish': 'Finish road',
        'tooltip.riverFinish': 'Finish river',
        'input.riverWidth': 'River width',
        'input.roadWidth': 'Road width',
        'input.pathDashes': 'Dashes',

        // Tooltips — Borders
        'tooltip.border': 'Border Tool\nClick: Draw border hexes\nRight-click on map: Delete\nDouble-click Eraser: Delete connected border',
        'tooltip.borderPicker': 'Pick Border Color\nClick: Select existing border to edit',
        'tooltip.borderFinish': 'Finish\nClick: Complete current border',
        'tooltip.borderVisibility': 'Border Visibility\nClick: Show/hide borders',
        'input.borderDashes': 'Dashes',

        // Notices
        'notice.fileCreateError': 'Error creating file: {error}',
        'notice.nothingToUndo': 'Nothing to undo',
        'notice.nothingToRedo': 'Nothing to redo',
        'notice.noHexesToShow': 'No hexes or texts to display',
        'notice.noPattern': 'No pattern selected. Use the picker button to pick a pattern.',
        'notice.clickToPickPattern': 'Click on a hex to pick the pattern',
        'notice.patternPicked': 'Pattern picked!',
        'notice.noHexAtPosition': 'No hex at this position',
        'notice.riverSelected': 'River #{id} selected',
        'notice.roadSelected': 'Road #{id} selected',
        'notice.noRiverOrRoad': 'No river or road at this position',
        'notice.borderSelected': 'Border #{id} selected',
        'notice.noBorderAtPosition': 'No border at this position',

        // Modal — File selector
        'modal.selectFile': 'Select MD File',
        'modal.searchFile': 'Search file name...',
        'modal.noFilesFound': 'No files found',
        'modal.removeLink': 'Remove link',
        'modal.cancel': 'Cancel',

        // Modal — Text formatting
        'modal.formatText': 'Format Text',
        'modal.displayText': 'Display text:',
        'modal.textPlaceholder': 'Enter text...',
        'modal.textSize': 'Text size:',
        'modal.textColor': 'Text color:',
        'modal.palette': 'Palette:',
        'modal.formatting': 'Formatting:',
        'modal.outline': 'Outline',
        'modal.bold': 'Bold',
        'modal.shadowSettings': 'Shadow Settings:',
        'modal.shadowEnable': 'Enable shadow',
        'modal.shadowDistance': 'Distance (px):',
        'modal.shadowOpacity': 'Opacity (%):',
        'modal.linkToFile': 'Link to MD file:',
        'modal.noLinkSelected': 'No link selected',
        'modal.selectFileBtn': 'Choose file...',
        'modal.deleteText': 'Delete text',
        'modal.confirmDeleteText': 'Really delete this text?',

        // Settings
        'settings.exportWidth': 'Default width for image export in pixels.',
        'settings.exportWidthDesc': 'Default width in pixels when exporting as image.',
        'settings.showCrosshair': 'Show crosshair',
        'settings.showCrosshairDesc': 'Displays a crosshair at the center of the map.',
        'settings.donateText': 'Buy me a coffee. I am happy to provide Hex Cartographer to you for free. However, the development took a long time. When I come up with something new, there will be updates. It would make me very happy if you leave a small donation for this work.',
        'settings.donateButton': 'Buy me a coffee',

        // Guide
        'guide.title': 'Quick Guide',
        'guide.basics': 'Basics',
        'guide.basics.create': 'Right-click a folder in the file explorer → "Create new Hex Cartographer Map."',
        'guide.basics.editMode': 'Toggle edit mode on/off.',
        'guide.navigation': 'Navigation',
        'guide.navigation.zoom': 'Mouse wheel = Zoom.',
        'guide.navigation.pan': 'Middle mouse button or Shift+Drag = Pan map.',
        'guide.navigation.fit': 'Fit entire map to view.',
        'guide.hexcolor': 'Hexes',
        'guide.hexcolor.paint': 'Choose a color and click hexes to paint them.',
        'guide.hexcolor.eyedropper': 'Color eyedropper: Pick a color from the map.',
        'guide.hexcolor.palette': 'Right-click a palette slot = Set new color.',
        'guide.symbols': 'Symbols',
        'guide.symbols.groups': 'Choose a tool group (Extras, Vegetation, Mountain, Building).',
        'guide.symbols.variant': 'Right-click = Select symbol variant.',
        'guide.symbols.colors': 'The current master color determines the symbol color.',
        'guide.drawing': 'Drawing Modes',
        'guide.drawing.pen': 'Click or drag to draw.',
        'guide.drawing.fill': 'Fill area with active color or symbol.',
        'guide.drawing.eraser': 'Delete hex or symbol (double-click = delete connected color area or symbols).',
        'guide.drawing.rightclick': 'Right-click = Eraser (hold + drag = delete multiple, double-click = delete connected area).',
        'guide.pattern': 'Pattern Tool',
        'guide.pattern.stamp': 'Place pattern on hexes. Drag to draw with pattern.',
        'guide.pattern.pick': 'Pick up an existing pattern to draw with.',
        'guide.paths': 'Rivers & Roads',
        'guide.paths.river': 'Place waypoints for rivers. River ends taper at dead ends. Double-click an endpoint to close the river (only without branches). Drag the last point onto the second-to-last to disable tapering at that end.',
        'guide.paths.road': 'Place waypoints for roads.',
        'guide.paths.pick': 'Select an existing river/road to edit.',
        'guide.paths.width': 'Adjust river/road width via the input fields.',
        'guide.paths.dashes': 'Divides each hex-to-hex section into alternating dashes and gaps (1 = continuous, 2 = half line, 3 = two dashes, etc.).',
        'guide.borders': 'Borders',
        'guide.borders.draw': 'Draw border region by clicking or dragging on hexes.',
        'guide.borders.pick': 'Select an existing border to edit.',
        'guide.borders.dash': 'Divides each hex edge into alternating dashes and gaps (1 = continuous, 2 = half line, 3 = two dashes, etc.).',
        'guide.borders.visibility': 'Show/hide borders on the map.',
        'guide.text': 'Text',
        'guide.text.tool': 'Click on map to set text content, size, color and format.<br>Click text again to edit.<br>Drag to move.',
        'guide.undoredo': 'Undo / Redo',
        'guide.undoredo.undo': 'Ctrl+Z = Undo',
        'guide.undoredo.redo': 'Ctrl+Y = Redo',
        'guide.print': 'Print / Export',
        'guide.print.pc': 'Three-dot menu → "Print map" opens the print dialog (PC).',
        'guide.print.export': 'Three-dot menu → "Export as image" saves the map as JPEG or PNG.',
        'guide.print.exportMobile': 'On mobile devices, the image is saved in the "Hex Cartographer Export" folder next to the map file.',
        'guide.touch': 'Touch Screen Users',
        'guide.touch.tap': 'Tap = Left click (draw, place, select).',
        'guide.touch.longpress': 'Long press on tool buttons = Right click (e.g. choose symbol variant or change palette color).',
        'guide.touch.zoom': 'Two-finger pinch = Zoom.',
        'guide.touch.pan': 'Two-finger drag = Pan map.',

        // Modal — Color picker
        'modal.colorPickerTitle': 'Choose Color',
        'modal.colorPickerCancel': 'Cancel',
        'tooltip.colorEyedropper': 'Color Eyedropper\nTap on a hex to pick its color',
        'notice.tapToPickColor': 'Tap on a hex to pick its color',
        'notice.colorPicked': 'Color picked',
        'notice.noColorAtPosition': 'No color at this position',

        // Menu entries
        'menu.createNew': 'Create new Hex Cartographer Map',
        'menu.openInEditor': 'Open in Hex Cartographer',
        'menu.printMap': 'Print map',
        'menu.shareMap': 'Share map',
        'menu.exportMap': 'Export as image',
        'notice.noContentToPrint': 'No map content to print',
        'notice.exportSaved': 'Exported to',
        'modal.exportTitle': 'Export as image',
        'modal.exportFormat': 'Format',
        'modal.exportQuality': 'Quality',
        'modal.exportExport': 'Export',
    },

    zh: {
        'tool.extras': '其他',
        'tool.vegetation': '植被',
        'tool.mountain': '山脉',
        'tool.building': '建筑',
        'variant.question': '问号',
        'variant.exclamation': '感叹号',
        'variant.cross': '十字',
        'variant.dot': '起点/终点',
        'variant.grass': '草地',
        'variant.swamp': '沼泽',
        'variant.bush': '灌木',
        'variant.tree': '阔叶树',
        'variant.pine': '针叶树',
        'variant.palm': '棕榈树',
        'variant.hill': '丘陵',
        'variant.mountain': '山脉',
        'variant.tent': '帐篷',
        'variant.house': '房屋',
        'variant.village': '村庄',
        'variant.town': '城镇',
        'variant.castle': '城堡',
        'variant.monastery': '修道院',
        'variant.harbor': '港口',
        'variant.tower': '塔楼',
        'variant.ruin': '废墟',
        'variant.cave': '洞穴',
        'variant.oasis': '绿洲',
        'tooltip.editMode': '编辑模式\n点击：显示/隐藏工具',
        'tooltip.colorPicker': '当前颜色\n点击：打开颜色选择器',
        'tooltip.hexColor': '六角格\n点击：为六角格着色\n右键地图：删除',
        'tooltip.fill': '填充工具\n点击：填充相连区域\n再次点击：关闭填充工具',
        'tooltip.text': '文本工具\n点击地图：创建新文本\n点击文本：编辑/移动文本\n右键地图文本：删除文本',
        'tooltip.eraser': '橡皮擦\n点击：删除六角格内容\n双击：删除相连内容',
        'tooltip.undo': '撤销\nCtrl+Z：撤销上一步操作',
        'tooltip.redo': '重做\nCtrl+Y：重做已撤销的操作',
        'tooltip.fit': '适应地图\n点击：在窗口中显示整个地图',
        'tooltip.palette': '调色板\n点击：设为当前颜色\n右键点击：更改调色板颜色',
        'tooltip.toolGroup': '{name}\n点击：绘制\n右键点击：选择变体\n右键地图：删除',
        'tooltip.toolGroupVariant': '{label}\n点击：绘制\n右键点击：选择变体\n右键地图：删除',
        'tooltip.pattern': '图案工具\n点击：使用已采集的图案绘制\n右键地图：删除\n双击橡皮擦：删除相连图案',
        'tooltip.patternPicker': '采集图案\n点击：将六角格作为图案采集',
        'tooltip.river': '河流工具\n点击：设置/移动路径点\n双击端点：关闭河流（仅无分支时）\n右键地图：删除路段\n双击橡皮擦：删除整条河流',
        'tooltip.road': '道路工具\n点击：设置/移动路径点\n右键地图：删除路段\n双击橡皮擦：删除整条道路',
        'tooltip.pathPicker': '采集河流/道路\n点击：选择已有的河流/道路',
        'tooltip.pathFinish': '完成\n点击：完成当前河流/道路',
        'tooltip.roadFinish': '完成道路',
        'tooltip.riverFinish': '完成河流',
        'input.riverWidth': '河流宽度',
        'input.roadWidth': '道路宽度',
        'input.pathDashes': '虚线',
        'tooltip.border': '边界工具\n点击：绘制边界六角格\n右键地图：删除\n双击橡皮擦：删除相连边界',
        'tooltip.borderPicker': '采集边界颜色\n点击：选择已有边界进行编辑',
        'tooltip.borderFinish': '完成\n点击：完成当前边界',
        'tooltip.borderVisibility': '边界可见性\n点击：显示/隐藏边界',
        'input.borderDashes': '虚线',
        'notice.fileCreateError': '创建文件时出错：{error}',
        'notice.nothingToUndo': '没有可撤销的操作',
        'notice.nothingToRedo': '没有可重做的操作',
        'notice.noHexesToShow': '没有可显示的六角格或文本',
        'notice.noPattern': '未选择图案。使用采集按钮来采集图案。',
        'notice.clickToPickPattern': '点击一个六角格以采集图案',
        'notice.patternPicked': '图案已采集！',
        'notice.noHexAtPosition': '该位置没有六角格',
        'notice.riverSelected': '河流 #{id} 已选择',
        'notice.roadSelected': '道路 #{id} 已选择',
        'notice.noRiverOrRoad': '该位置没有河流或道路',
        'notice.borderSelected': '边界 #{id} 已选择',
        'notice.noBorderAtPosition': '该位置没有边界',
        'modal.selectFile': '选择 MD 文件',
        'modal.searchFile': '搜索文件名...',
        'modal.noFilesFound': '未找到文件',
        'modal.removeLink': '移除链接',
        'modal.cancel': '取消',
        'modal.formatText': '格式化文本',
        'modal.displayText': '显示文本：',
        'modal.textPlaceholder': '输入文本...',
        'modal.textSize': '文本大小：',
        'modal.textColor': '文本颜色：',
        'modal.palette': '调色板：',
        'modal.formatting': '格式：',
        'modal.outline': '描边',
        'modal.bold': '粗体',
        'modal.shadowSettings': '阴影设置：',
        'modal.shadowEnable': '启用阴影',
        'modal.shadowDistance': '距离 (px)：',
        'modal.shadowOpacity': '透明度 (%)：',
        'modal.linkToFile': '链接到 MD 文件：',
        'modal.noLinkSelected': '未选择链接',
        'modal.selectFileBtn': '选择文件...',
        'modal.deleteText': '删除文本',
        'modal.confirmDeleteText': '确定要删除文本吗？',
        'settings.exportWidth': '图片导出的默认宽度（像素）。',
        'settings.exportWidthDesc': '导出为图片时的默认宽度（像素）。',
        'settings.showCrosshair': '显示十字准线',
        'settings.showCrosshairDesc': '在地图中心显示十字准线。',
        'settings.donateText': '请我喝杯咖啡。我很高兴能为大家免费提供 Hex Cartographer。然而，开发花费了很长时间。如果我有了新的想法，会为大家提供更新。如果您能为这项工作留下一点捐赠，我会非常高兴。',
        'settings.donateButton': '请我喝杯咖啡',
        'guide.title': '快速指南',
        'guide.basics': '基础操作',
        'guide.basics.create': '右键点击文件浏览器中的文件夹 → "创建新 Hex Cartographer 地图"。',
        'guide.basics.editMode': '开启/关闭编辑模式。',
        'guide.navigation': '导航',
        'guide.navigation.zoom': '鼠标滚轮 = 缩放。',
        'guide.navigation.pan': '中键或 Shift+拖动 = 平移地图。',
        'guide.navigation.fit': '显示整个地图。',
        'guide.hexcolor': '六角格颜色',
        'guide.hexcolor.paint': '选择颜色并点击六角格进行着色。',
        'guide.hexcolor.eyedropper': '取色器：从地图上采集颜色。',
        'guide.hexcolor.palette': '右键点击调色板位置 = 设置新颜色。',
        'guide.symbols': '符号',
        'guide.symbols.groups': '选择工具组（其他、植被、山脉、建筑）。',
        'guide.symbols.variant': '右键点击 = 选择符号变体。',
        'guide.symbols.colors': '当前主颜色决定符号颜色。',
        'guide.drawing': '绘制模式',
        'guide.drawing.pen': '点击或拖动进行绘制。',
        'guide.drawing.fill': '用当前颜色或符号填充区域。',
        'guide.drawing.eraser': '点击删除格子、符号或道路/河流段（双击 = 删除相连元素）。',
        'guide.drawing.rightclick': '右键 = 橡皮擦（按住并拖动 = 删除多个元素，双击 = 删除相连内容）。',
        'guide.pattern': '图案工具',
        'guide.pattern.stamp': '将图案放置到六角格上。拖动可用图案绘制。',
        'guide.pattern.pick': '采集已有图案，用于绘制。',
        'guide.paths': '河流与道路',
        'guide.paths.river': '为河流设置路径点。河流在死胡同处逐渐变细。双击端点可关闭河流（仅无分支时）。将最后一个点拖到倒数第二个点上可禁用该端的收窄效果。',
        'guide.paths.road': '为道路设置路径点。',
        'guide.paths.pick': '选择并编辑已有的河流/道路。',
        'guide.paths.width': '通过输入框调整河流/道路的宽度值。',
        'guide.paths.dashes': '将每个六角格段分为交替的线段和间隔（1 = 实线，2 = 半线，3 = 两段线等）。',
        'guide.borders': '边界',
        'guide.borders.draw': '点击或拖动六角格绘制边界区域。',
        'guide.borders.pick': '选择已有边界进行编辑。',
        'guide.borders.dash': '将每条六角格边分为交替的线段和间隔（1 = 实线，2 = 半线，3 = 两段线等）。',
        'guide.borders.visibility': '在地图上显示/隐藏边界。',
        'guide.text': '文本',
        'guide.text.tool': '点击地图设置文本内容、大小、颜色和格式。<br>再次点击文本进行编辑。<br>拖动可移动文本。',
        'guide.undoredo': '撤销 / 重做',
        'guide.undoredo.undo': 'Ctrl+Z = 撤销',
        'guide.undoredo.redo': 'Ctrl+Y = 重做',
        'guide.print': '打印 / 导出',
        'guide.print.pc': '三点菜单 → "打印地图" 打开打印对话框（电脑）。',
        'guide.print.export': '三点菜单 → "导出为图片" 将地图保存为 JPEG 或 PNG。',
        'guide.print.exportMobile': '在移动设备上，图片将保存在地图文件旁的 "Hex Cartographer Export" 文件夹中。',
        'guide.touch': '触摸屏用户须知',
        'guide.touch.tap': '点按 = 放置、设置、选择。<br>单指滑动 = 绘制。',
        'guide.touch.longpress': '长按工具按钮 = 例如选择符号变体或更改调色板颜色。',
        'guide.touch.zoom': '双指捏合 = 缩放。',
        'guide.touch.pan': '双指拖动 = 平移地图。',
        'modal.colorPickerTitle': '选择颜色',
        'modal.colorPickerCancel': '取消',
        'tooltip.colorEyedropper': '取色器\n点击地图以采集任意颜色',
        'notice.tapToPickColor': '点击一个六角格以采集颜色',
        'notice.colorPicked': '颜色已采集',
        'notice.noColorAtPosition': '该位置没有颜色',
        'menu.createNew': '创建新 Hex Cartographer 地图',
        'menu.openInEditor': '在 Hex Cartographer 中打开',
        'menu.printMap': '打印地图',
        'menu.shareMap': '分享地图',
        'menu.exportMap': '导出为图片',
        'notice.noContentToPrint': '没有可打印的地图内容',
        'notice.exportSaved': '已导出到',
        'modal.exportTitle': '导出为图片',
        'modal.exportFormat': '格式',
        'modal.exportQuality': '质量',
        'modal.exportExport': '导出',
    },

    ru: {
        'tool.extras': 'Прочее',
        'tool.vegetation': 'Растительность',
        'tool.mountain': 'Горы',
        'tool.building': 'Здания',
        'variant.question': 'Вопросительный знак',
        'variant.exclamation': 'Восклицательный знак',
        'variant.cross': 'Крест',
        'variant.dot': 'Старт/Финиш',
        'variant.grass': 'Трава',
        'variant.swamp': 'Болото',
        'variant.bush': 'Кустарник',
        'variant.tree': 'Лиственное дерево',
        'variant.pine': 'Хвойное дерево',
        'variant.palm': 'Пальма',
        'variant.hill': 'Холм',
        'variant.mountain': 'Гора',
        'variant.tent': 'Палатка',
        'variant.house': 'Дом',
        'variant.village': 'Деревня',
        'variant.town': 'Город',
        'variant.castle': 'Замок',
        'variant.monastery': 'Монастырь',
        'variant.harbor': 'Гавань',
        'variant.tower': 'Башня',
        'variant.ruin': 'Руины',
        'variant.cave': 'Пещера',
        'variant.oasis': 'Оазис',
        'tooltip.editMode': 'Режим редактирования\nКлик: Показать/скрыть инструменты',
        'tooltip.colorPicker': 'Текущий цвет\nКлик: Открыть выбор цвета',
        'tooltip.hexColor': 'Соты\nКлик: Окрасить соты\nПравый клик на карте: Удалить',
        'tooltip.fill': 'Заливка\nКлик: Залить связанную область\nПовторный клик: Отключить заливку',
        'tooltip.text': 'Текстовый инструмент\nКлик по карте: Создать новый текст\nКлик по тексту: Редактировать/переместить текст\nПравый клик по тексту на карте: Удалить текст',
        'tooltip.eraser': 'Ластик\nКлик: Удалить содержимое соты\nДвойной клик: Удалить связанные элементы',
        'tooltip.undo': 'Отменить\nCtrl+Z: Отменить последнее действие',
        'tooltip.redo': 'Повторить\nCtrl+Y: Повторить отменённое действие',
        'tooltip.fit': 'Вписать карту\nКлик: Показать всю карту в окне',
        'tooltip.palette': 'Палитра цветов\nКлик: Использовать как текущий цвет\nПравый клик: Изменить цвет палитры',
        'tooltip.toolGroup': '{name}\nКлик: Рисовать\nПравый клик: Выбрать вариант\nПравый клик на карте: Удалить',
        'tooltip.toolGroupVariant': '{label}\nКлик: Рисовать\nПравый клик: Выбрать вариант\nПравый клик на карте: Удалить',
        'tooltip.pattern': 'Инструмент «Шаблон»\nКлик: Рисовать выбранным шаблоном\nПравый клик на карте: Удалить\nДвойной клик ластиком: Удалить связанный шаблон',
        'tooltip.patternPicker': 'Захватить шаблон\nКлик: Скопировать соту как шаблон',
        'tooltip.river': 'Инструмент «Река»\nКлик: Установить/переместить путевые точки\nДвойной клик по конечной точке: Замкнуть реку (только без ответвлений)\nПравый клик на карте: Удалить сегмент\nДвойной клик ластиком: Удалить всю реку',
        'tooltip.road': 'Инструмент «Дорога»\nКлик: Установить/переместить путевые точки\nПравый клик на карте: Удалить сегмент\nДвойной клик ластиком: Удалить всю дорогу',
        'tooltip.pathPicker': 'Захватить реку/дорогу\nКлик: Выбрать существующую реку/дорогу',
        'tooltip.pathFinish': 'Завершить\nКлик: Завершить текущую реку/дорогу',
        'tooltip.roadFinish': 'Завершить дорогу',
        'tooltip.riverFinish': 'Завершить реку',
        'input.riverWidth': 'Ширина реки',
        'input.roadWidth': 'Ширина дороги',
        'input.pathDashes': 'Штрихи',
        'tooltip.border': 'Инструмент «Граница»\nКлик: Рисовать граничные соты\nПравый клик на карте: Удалить\nДвойной клик ластиком: Удалить связанную границу',
        'tooltip.borderPicker': 'Захватить цвет границы\nКлик: Выбрать существующую границу для редактирования',
        'tooltip.borderFinish': 'Завершить\nКлик: Завершить текущую границу',
        'tooltip.borderVisibility': 'Видимость границ\nКлик: Показать/скрыть границы',
        'input.borderDashes': 'Штрихи',
        'notice.fileCreateError': 'Ошибка при создании файла: {error}',
        'notice.nothingToUndo': 'Нечего отменять',
        'notice.nothingToRedo': 'Нечего повторять',
        'notice.noHexesToShow': 'Нет сот или текстов для отображения',
        'notice.noPattern': 'Шаблон не выбран. Используйте кнопку захвата, чтобы скопировать шаблон.',
        'notice.clickToPickPattern': 'Нажмите на соту, чтобы захватить шаблон',
        'notice.patternPicked': 'Шаблон захвачен!',
        'notice.noHexAtPosition': 'На этой позиции нет соты',
        'notice.riverSelected': 'Река #{id} выбрана',
        'notice.roadSelected': 'Дорога #{id} выбрана',
        'notice.noRiverOrRoad': 'На этой позиции нет реки или дороги',
        'notice.borderSelected': 'Граница #{id} выбрана',
        'notice.noBorderAtPosition': 'На этой позиции нет границы',
        'modal.selectFile': 'Выбрать MD файл',
        'modal.searchFile': 'Поиск по имени файла...',
        'modal.noFilesFound': 'Файлы не найдены',
        'modal.removeLink': 'Удалить ссылку',
        'modal.cancel': 'Отмена',
        'modal.formatText': 'Форматирование текста',
        'modal.displayText': 'Отображаемый текст:',
        'modal.textPlaceholder': 'Введите текст...',
        'modal.textSize': 'Размер текста:',
        'modal.textColor': 'Цвет текста:',
        'modal.palette': 'Палитра:',
        'modal.formatting': 'Форматирование:',
        'modal.outline': 'Обводка',
        'modal.bold': 'Жирный',
        'modal.shadowSettings': 'Настройки тени:',
        'modal.shadowEnable': 'Включить тень',
        'modal.shadowDistance': 'Расстояние (px):',
        'modal.shadowOpacity': 'Прозрачность (%):',
        'modal.linkToFile': 'Ссылка на MD-файл:',
        'modal.noLinkSelected': 'Ссылка не выбрана',
        'modal.selectFileBtn': 'Выбрать файл...',
        'modal.deleteText': 'Удалить текст',
        'modal.confirmDeleteText': 'Действительно удалить текст?',
        'settings.exportWidth': 'Стандартная ширина для экспорта изображений в пикселях.',
        'settings.exportWidthDesc': 'Стандартная ширина в пикселях при экспорте в изображение.',
        'settings.showCrosshair': 'Показать перекрестие',
        'settings.showCrosshairDesc': 'Отображает перекрестие в центре карты.',
        'settings.donateText': 'Угостите меня кофе. Я рад предоставлять Hex Cartographer бесплатно для всех. Тем не менее, разработка заняла много времени. Если мне придут новые идеи, вас ждут обновления. Я буду очень рад, если вы оставите небольшое пожертвование за эту работу.',
        'settings.donateButton': 'Угостить кофе',
        'guide.title': 'Краткое руководство',
        'guide.basics': 'Основы',
        'guide.basics.create': 'Правый клик по папке в проводнике файлов → «Создать новую карту Hex Cartographer».',
        'guide.basics.editMode': 'Включить/выключить режим редактирования.',
        'guide.navigation': 'Навигация',
        'guide.navigation.zoom': 'Колесо мыши = Масштаб.',
        'guide.navigation.pan': 'Средняя кнопка мыши или Shift+перетаскивание = Перемещение карты.',
        'guide.navigation.fit': 'Показать всю карту.',
        'guide.hexcolor': 'Цвет сот',
        'guide.hexcolor.paint': 'Выберите цвет и нажмите на соты для окрашивания.',
        'guide.hexcolor.eyedropper': 'Пипетка: захватить цвет с карты.',
        'guide.hexcolor.palette': 'Правый клик по месту в палитре = Задать новый цвет.',
        'guide.symbols': 'Символы',
        'guide.symbols.groups': 'Выберите группу инструментов (Прочее, Растительность, Горы, Здания).',
        'guide.symbols.variant': 'Правый клик = Выбор варианта символа.',
        'guide.symbols.colors': 'Текущий основной цвет определяет цвет символа.',
        'guide.drawing': 'Режимы рисования',
        'guide.drawing.pen': 'Нажмите или перетащите для рисования.',
        'guide.drawing.fill': 'Заполнить область активным цветом или символом.',
        'guide.drawing.eraser': 'Удалить ячейку, символ или сегмент дороги/реки нажатием (двойной клик = удалить связанные элементы).',
        'guide.drawing.rightclick': 'Правая кнопка мыши = Ластик (удерживать + тянуть = удалить несколько элементов, двойной клик = удалить связанные).',
        'guide.pattern': 'Инструмент «Шаблон»',
        'guide.pattern.stamp': 'Поставить шаблон на соты. Перетаскивайте для рисования шаблоном.',
        'guide.pattern.pick': 'Захватить существующий шаблон для рисования.',
        'guide.paths': 'Реки и дороги',
        'guide.paths.river': 'Установить путевые точки для рек. Концы рек сужаются в тупиках. Двойной клик по конечной точке замыкает реку (только без ответвлений). Перетащите последнюю точку на предпоследнюю, чтобы отключить сужение на этом конце.',
        'guide.paths.road': 'Установить путевые точки для дорог.',
        'guide.paths.pick': 'Выбрать и редактировать существующую реку/дорогу.',
        'guide.paths.width': 'Настроить ширину рек/дорог через поля ввода.',
        'guide.paths.dashes': 'Разбивает каждый сегмент соты на чередующиеся штрихи и пробелы (1 = сплошная, 2 = половина линии, 3 = два штриха и т.д.).',
        'guide.borders': 'Границы',
        'guide.borders.draw': 'Рисовать область границы нажатием или перетаскиванием по сотам.',
        'guide.borders.pick': 'Выбрать существующую границу для редактирования.',
        'guide.borders.dash': 'Разбивает каждую грань соты на чередующиеся штрихи и пробелы (1 = сплошная, 2 = половина линии, 3 = два штриха и т.д.).',
        'guide.borders.visibility': 'Показать/скрыть границы на карте.',
        'guide.text': 'Текст',
        'guide.text.tool': 'Нажмите на карту, чтобы задать содержание, размер, цвет и формат текста.<br>Нажмите на текст снова, чтобы редактировать.<br>Перетащите для перемещения.',
        'guide.undoredo': 'Отменить / Повторить',
        'guide.undoredo.undo': 'Ctrl+Z = Отменить',
        'guide.undoredo.redo': 'Ctrl+Y = Повторить',
        'guide.print': 'Печать / Экспорт',
        'guide.print.pc': 'Меню «три точки» → «Печать карты» открывает диалог печати (ПК).',
        'guide.print.export': 'Меню «три точки» → «Экспорт как изображение» сохраняет карту в JPEG или PNG.',
        'guide.print.exportMobile': 'На мобильных устройствах изображение сохраняется в папку «Hex Cartographer Export» рядом с файлом карты.',
        'guide.touch': 'Информация для пользователей с сенсорным экраном',
        'guide.touch.tap': 'Касание = Установить, разместить, выбрать.<br>Провести одним пальцем = Рисовать.',
        'guide.touch.longpress': 'Долгое нажатие на кнопки инструментов = напр. выбрать вариант символа или изменить цвет палитры.',
        'guide.touch.zoom': 'Сведение двумя пальцами = Масштаб.',
        'guide.touch.pan': 'Перетаскивание двумя пальцами = Перемещение карты.',
        'modal.colorPickerTitle': 'Выбрать цвет',
        'modal.colorPickerCancel': 'Отмена',
        'tooltip.colorEyedropper': 'Пипетка\nНажмите на карту, чтобы захватить любой цвет',
        'notice.tapToPickColor': 'Нажмите на соту, чтобы захватить цвет',
        'notice.colorPicked': 'Цвет захвачен',
        'notice.noColorAtPosition': 'На этой позиции нет цвета',
        'menu.createNew': 'Создать новую карту Hex Cartographer',
        'menu.openInEditor': 'Открыть в Hex Cartographer',
        'menu.printMap': 'Печать карты',
        'menu.shareMap': 'Поделиться картой',
        'menu.exportMap': 'Экспорт как изображение',
        'notice.noContentToPrint': 'Нет содержимого карты для печати',
        'notice.exportSaved': 'Экспортировано в',
        'modal.exportTitle': 'Экспорт как изображение',
        'modal.exportFormat': 'Формат',
        'modal.exportQuality': 'Качество',
        'modal.exportExport': 'Экспортировать',
    },

    ja: {
        'tool.extras': 'その他',
        'tool.vegetation': '植生',
        'tool.mountain': '山',
        'tool.building': '建物',
        'variant.question': '疑問符',
        'variant.exclamation': '感嘆符',
        'variant.cross': '十字',
        'variant.dot': 'スタート/ゴール地点',
        'variant.grass': '草',
        'variant.swamp': '沼地',
        'variant.bush': '低木',
        'variant.tree': '広葉樹',
        'variant.pine': '針葉樹',
        'variant.palm': 'ヤシの木',
        'variant.hill': '丘',
        'variant.mountain': '山',
        'variant.tent': 'テント',
        'variant.house': '家',
        'variant.village': '村',
        'variant.town': '町',
        'variant.castle': '城',
        'variant.monastery': '修道院',
        'variant.harbor': '港',
        'variant.tower': '塔',
        'variant.ruin': '廃墟',
        'variant.cave': '洞窟',
        'variant.oasis': 'オアシス',
        'tooltip.editMode': '編集モード\nクリック：ツールの表示/非表示',
        'tooltip.colorPicker': '現在の色\nクリック：カラーピッカーを開く',
        'tooltip.hexColor': 'ヘックス\nクリック：ヘックスを着色\nマップ上で右クリック：削除',
        'tooltip.fill': '塗りつぶし\nクリック：つながった領域を塗りつぶす\n再度クリック：塗りつぶしをオフ',
        'tooltip.text': 'テキストツール\nマップをクリック：新しいテキストを作成\nテキストをクリック：テキストを編集/移動\nマップ上のテキストを右クリック：テキスト削除',
        'tooltip.eraser': '消しゴム\nクリック：ヘックスの内容を削除\nダブルクリック：つながった要素を削除',
        'tooltip.undo': '元に戻す\nCtrl+Z：最後の操作を元に戻す',
        'tooltip.redo': 'やり直し\nCtrl+Y：元に戻した操作をやり直す',
        'tooltip.fit': 'マップを合わせる\nクリック：ウィンドウにマップ全体を表示',
        'tooltip.palette': 'カラーパレット\nクリック：現在の色として使用\n右クリック：パレットの色を変更',
        'tooltip.toolGroup': '{name}\nクリック：描画\n右クリック：バリエーションを選択\nマップ上で右クリック：削除',
        'tooltip.toolGroupVariant': '{label}\nクリック：描画\n右クリック：バリエーションを選択\nマップ上で右クリック：削除',
        'tooltip.pattern': 'パターンツール\nクリック：取得したパターンで描画\nマップ上で右クリック：削除\nダブルクリック消しゴム：つながったパターンを削除',
        'tooltip.patternPicker': 'パターンを取得\nクリック：ヘックスをパターンとして取得',
        'tooltip.river': '川ツール\nクリック：経由点を設置/移動\n端点ダブルクリック：川を閉じる（分岐なしの場合のみ）\nマップ上で右クリック：区間を削除\nダブルクリック消しゴム：川全体を削除',
        'tooltip.road': '道ツール\nクリック：経由点を設置/移動\nマップ上で右クリック：区間を削除\nダブルクリック消しゴム：道全体を削除',
        'tooltip.pathPicker': '川/道を取得\nクリック：既存の川/道を選択',
        'tooltip.pathFinish': '完了\nクリック：現在の川/道を確定',
        'tooltip.roadFinish': '道を確定',
        'tooltip.riverFinish': '川を確定',
        'input.riverWidth': '川の幅',
        'input.roadWidth': '道の幅',
        'input.pathDashes': '破線',
        'tooltip.border': '境界ツール\nクリック：境界ヘックスを描画\nマップ上で右クリック：削除\nダブルクリック消しゴム：つながった境界を削除',
        'tooltip.borderPicker': '境界色を取得\nクリック：既存の境界を選択して編集',
        'tooltip.borderFinish': '完了\nクリック：現在の境界を確定',
        'tooltip.borderVisibility': '境界の表示\nクリック：境界の表示/非表示',
        'input.borderDashes': '破線',
        'notice.fileCreateError': 'ファイル作成エラー：{error}',
        'notice.nothingToUndo': '元に戻す操作がありません',
        'notice.nothingToRedo': 'やり直す操作がありません',
        'notice.noHexesToShow': '表示するヘックスまたはテキストがありません',
        'notice.noPattern': 'パターンが選択されていません。ピッカーボタンでパターンを取得してください。',
        'notice.clickToPickPattern': 'ヘックスをクリックしてパターンを取得',
        'notice.patternPicked': 'パターンを取得しました！',
        'notice.noHexAtPosition': 'この位置にヘックスがありません',
        'notice.riverSelected': '川 #{id} を選択しました',
        'notice.roadSelected': '道 #{id} を選択しました',
        'notice.noRiverOrRoad': 'この位置に川または道がありません',
        'notice.borderSelected': '境界 #{id} を選択しました',
        'notice.noBorderAtPosition': 'この位置に境界がありません',
        'modal.selectFile': 'MD ファイルを選択',
        'modal.searchFile': 'ファイル名を検索...',
        'modal.noFilesFound': 'ファイルが見つかりません',
        'modal.removeLink': 'リンクを削除',
        'modal.cancel': 'キャンセル',
        'modal.formatText': 'テキストの書式設定',
        'modal.displayText': '表示テキスト：',
        'modal.textPlaceholder': 'テキストを入力...',
        'modal.textSize': 'テキストサイズ：',
        'modal.textColor': 'テキストの色：',
        'modal.palette': 'パレット：',
        'modal.formatting': '書式：',
        'modal.outline': 'アウトライン',
        'modal.bold': '太字',
        'modal.shadowSettings': '影の設定：',
        'modal.shadowEnable': '影を有効にする',
        'modal.shadowDistance': '距離 (px)：',
        'modal.shadowOpacity': '透明度 (%)：',
        'modal.linkToFile': 'MD ファイルへのリンク：',
        'modal.noLinkSelected': 'リンクが選択されていません',
        'modal.selectFileBtn': 'ファイルを選択...',
        'modal.deleteText': 'テキストを削除',
        'modal.confirmDeleteText': '本当にテキストを削除しますか？',
        'settings.exportWidth': '画像エクスポートのデフォルト幅（ピクセル）。',
        'settings.exportWidthDesc': '画像としてエクスポートする際のデフォルト幅（ピクセル）。',
        'settings.showCrosshair': '十字線を表示',
        'settings.showCrosshairDesc': 'マップの中心に十字線を表示します。',
        'settings.donateText': 'コーヒーをおごってください。Hex Cartographer を無料で提供できることを嬉しく思っています。しかし、開発には長い時間がかかりました。新しいアイデアが浮かべば、アップデートを提供します。この作業に対して少額の寄付をいただけると大変嬉しいです。',
        'settings.donateButton': 'コーヒーをおごる',
        'guide.title': 'クイックガイド',
        'guide.basics': '基本操作',
        'guide.basics.create': 'ファイルブラウザのフォルダを右クリック → 「新しい Hex Cartographer マップを作成」。',
        'guide.basics.editMode': '編集モードのオン/オフ。',
        'guide.navigation': 'ナビゲーション',
        'guide.navigation.zoom': 'マウスホイール = ズーム。',
        'guide.navigation.pan': '中ボタンまたは Shift+ドラッグ = マップを移動。',
        'guide.navigation.fit': 'マップ全体を表示。',
        'guide.hexcolor': 'ヘックスの色',
        'guide.hexcolor.paint': '色を選んでヘックスをクリックして着色。',
        'guide.hexcolor.eyedropper': 'スポイト：マップから色を取得。',
        'guide.hexcolor.palette': 'パレット枠を右クリック = 色を変更。',
        'guide.symbols': 'シンボル',
        'guide.symbols.groups': 'ツールグループを選択（その他、植生、山、建物）。',
        'guide.symbols.variant': '右クリック = シンボルバリエーションの選択。',
        'guide.symbols.colors': '現在のマスターカラーがシンボルの色を決定します。',
        'guide.drawing': '描画モード',
        'guide.drawing.pen': 'クリックまたはドラッグで描画。',
        'guide.drawing.fill': 'アクティブな色またはシンボルで領域を塗りつぶし。',
        'guide.drawing.eraser': 'クリックでセル、シンボル、または道/川の区間を削除（ダブルクリック = つながった要素を削除）。',
        'guide.drawing.rightclick': '右クリック = 消しゴム（長押し+ドラッグ = 複数の要素を削除、ダブルクリック = つながった要素を削除）。',
        'guide.pattern': 'パターンツール',
        'guide.pattern.stamp': 'ヘックスにパターンを配置。ドラッグでパターンを描画。',
        'guide.pattern.pick': '既存のパターンを取得して描画に使用。',
        'guide.paths': '川と道',
        'guide.paths.river': '川の経由点を設置。川の行き止まりは先細りになります。端点をダブルクリックすると川を閉じます（分岐なしの場合のみ）。最後の点を手前の点にドラッグすると、その端の先細りを無効にします。',
        'guide.paths.road': '道の経由点を設置。',
        'guide.paths.pick': '既存の川/道を選択して編集。',
        'guide.paths.width': '入力フィールドで川/道の幅を調整。',
        'guide.paths.dashes': '各ヘックスセグメントを線と間隔に交互に分割（1 = 実線、2 = 半分の線、3 = 2本の線など）。',
        'guide.borders': '境界',
        'guide.borders.draw': 'ヘックスをクリックまたはドラッグして境界領域を描画。',
        'guide.borders.pick': '既存の境界を選択して編集。',
        'guide.borders.dash': '各ヘックスの辺を線と間隔に交互に分割（1 = 実線、2 = 半分の線、3 = 2本の線など）。',
        'guide.borders.visibility': 'マップ上の境界を表示/非表示。',
        'guide.text': 'テキスト',
        'guide.text.tool': 'マップをクリックしてテキストの内容、サイズ、色、書式を設定。<br>テキストを再度クリックして編集。<br>ドラッグで移動。',
        'guide.undoredo': '元に戻す / やり直し',
        'guide.undoredo.undo': 'Ctrl+Z = 元に戻す',
        'guide.undoredo.redo': 'Ctrl+Y = やり直し',
        'guide.print': '印刷 / エクスポート',
        'guide.print.pc': '三点メニュー → 「マップを印刷」で印刷ダイアログを開く（PC）。',
        'guide.print.export': '三点メニュー → 「画像としてエクスポート」でマップを JPEG または PNG として保存。',
        'guide.print.exportMobile': 'モバイル端末では、画像はマップファイルの隣の「Hex Cartographer Export」フォルダに保存されます。',
        'guide.touch': 'タッチスクリーンユーザー向け情報',
        'guide.touch.tap': 'タップ = 配置、設置、選択。<br>1本指でスワイプ = 描画。',
        'guide.touch.longpress': 'ツールボタンを長押し = シンボルバリエーションの選択やパレット色の変更など。',
        'guide.touch.zoom': '2本指ピンチ = ズーム。',
        'guide.touch.pan': '2本指ドラッグ = マップを移動。',
        'modal.colorPickerTitle': '色を選択',
        'modal.colorPickerCancel': 'キャンセル',
        'tooltip.colorEyedropper': 'スポイト\nマップをタップして任意の色を取得',
        'notice.tapToPickColor': 'ヘックスをタップして色を取得',
        'notice.colorPicked': '色を取得しました',
        'notice.noColorAtPosition': 'この位置に色がありません',
        'menu.createNew': '新しい Hex Cartographer マップを作成',
        'menu.openInEditor': 'Hex Cartographer で開く',
        'menu.printMap': 'マップを印刷',
        'menu.shareMap': 'マップを共有',
        'menu.exportMap': '画像としてエクスポート',
        'notice.noContentToPrint': '印刷するマップの内容がありません',
        'notice.exportSaved': 'エクスポート先',
        'modal.exportTitle': '画像としてエクスポート',
        'modal.exportFormat': 'フォーマット',
        'modal.exportQuality': '品質',
        'modal.exportExport': 'エクスポート',
    },

    fr: {
        'tool.extras': 'Extras',
        'tool.vegetation': 'Végétation',
        'tool.mountain': 'Montagne',
        'tool.building': 'Bâtiment',
        'variant.question': 'Point d\'interrogation',
        'variant.exclamation': 'Point d\'exclamation',
        'variant.cross': 'Croix',
        'variant.dot': 'Point de départ/arrivée',
        'variant.grass': 'Herbe',
        'variant.swamp': 'Marais',
        'variant.bush': 'Buisson',
        'variant.tree': 'Feuillu',
        'variant.pine': 'Conifère',
        'variant.palm': 'Palmier',
        'variant.hill': 'Colline',
        'variant.mountain': 'Montagne',
        'variant.tent': 'Tente',
        'variant.house': 'Maison',
        'variant.village': 'Village',
        'variant.town': 'Ville',
        'variant.castle': 'Château',
        'variant.monastery': 'Monastère',
        'variant.harbor': 'Port',
        'variant.tower': 'Tour',
        'variant.ruin': 'Ruine',
        'variant.cave': 'Grotte',
        'variant.oasis': 'Oasis',
        'tooltip.editMode': 'Mode édition\nClic : Afficher/masquer les outils',
        'tooltip.colorPicker': 'Couleur actuelle\nClic : Ouvrir le sélecteur de couleur',
        'tooltip.hexColor': 'Hexagones\nClic : Colorier les hexagones\nClic droit sur la carte : Supprimer',
        'tooltip.fill': 'Pot de peinture\nClic : Remplir une zone contiguë\nCliquer à nouveau : Désactiver le pot de peinture',
        'tooltip.text': 'Outil texte\nClic sur la carte : Créer un nouveau texte\nClic sur un texte : Modifier/déplacer le texte\nClic droit sur texte de la carte : Supprimer le texte',
        'tooltip.eraser': 'Gomme\nClic : Effacer le contenu de l\'hexagone\nDouble-clic : Effacer les éléments contigus',
        'tooltip.undo': 'Annuler\nCtrl+Z : Annuler la dernière action',
        'tooltip.redo': 'Rétablir\nCtrl+Y : Rétablir l\'action annulée',
        'tooltip.fit': 'Ajuster la carte\nClic : Afficher toute la carte dans la fenêtre',
        'tooltip.palette': 'Palette de couleurs\nClic : Utiliser comme couleur actuelle\nClic droit : Modifier la couleur de la palette',
        'tooltip.toolGroup': '{name}\nClic : Dessiner\nClic droit : Choisir une variante\nClic droit sur la carte : Supprimer',
        'tooltip.toolGroupVariant': '{label}\nClic : Dessiner\nClic droit : Choisir une variante\nClic droit sur la carte : Supprimer',
        'tooltip.pattern': 'Outil motif\nClic : Dessiner avec le motif capturé\nClic droit sur la carte : Supprimer\nDouble-clic gomme : Effacer le motif contigu',
        'tooltip.patternPicker': 'Capturer un motif\nClic : Capturer un hexagone comme motif',
        'tooltip.river': 'Outil rivière\nClic : Placer/déplacer des points de passage\nDouble-clic point final : Fermer la rivière (uniquement sans embranchements)\nClic droit sur la carte : Supprimer un segment\nDouble-clic gomme : Supprimer toute la rivière',
        'tooltip.road': 'Outil chemin\nClic : Placer/déplacer des points de passage\nClic droit sur la carte : Supprimer un segment\nDouble-clic gomme : Supprimer tout le chemin',
        'tooltip.pathPicker': 'Capturer rivière/chemin\nClic : Sélectionner une rivière/un chemin existant',
        'tooltip.pathFinish': 'Terminer\nClic : Finaliser la rivière/le chemin en cours',
        'tooltip.roadFinish': 'Terminer le chemin',
        'tooltip.riverFinish': 'Terminer la rivière',
        'input.riverWidth': 'Largeur de rivière',
        'input.roadWidth': 'Largeur de chemin',
        'input.pathDashes': 'Tirets',
        'tooltip.border': 'Outil frontière\nClic : Dessiner des hexagones de frontière\nClic droit sur la carte : Supprimer\nDouble-clic gomme : Supprimer la frontière contiguë',
        'tooltip.borderPicker': 'Capturer la couleur de frontière\nClic : Sélectionner une frontière existante pour la modifier',
        'tooltip.borderFinish': 'Terminer\nClic : Finaliser la frontière en cours',
        'tooltip.borderVisibility': 'Visibilité des frontières\nClic : Afficher/masquer les frontières',
        'input.borderDashes': 'Tirets',
        'notice.fileCreateError': 'Erreur lors de la création du fichier : {error}',
        'notice.nothingToUndo': 'Rien à annuler',
        'notice.nothingToRedo': 'Rien à rétablir',
        'notice.noHexesToShow': 'Aucun hexagone ou texte à afficher',
        'notice.noPattern': 'Aucun motif sélectionné. Utilisez le bouton picker pour capturer un motif.',
        'notice.clickToPickPattern': 'Cliquez sur un hexagone pour capturer le motif',
        'notice.patternPicked': 'Motif capturé !',
        'notice.noHexAtPosition': 'Aucun hexagone à cette position',
        'notice.riverSelected': 'Rivière #{id} sélectionnée',
        'notice.roadSelected': 'Chemin #{id} sélectionné',
        'notice.noRiverOrRoad': 'Aucune rivière ou chemin à cette position',
        'notice.borderSelected': 'Frontière #{id} sélectionnée',
        'notice.noBorderAtPosition': 'Aucune frontière à cette position',
        'modal.selectFile': 'Sélectionner un fichier MD',
        'modal.searchFile': 'Rechercher un fichier...',
        'modal.noFilesFound': 'Aucun fichier trouvé',
        'modal.removeLink': 'Supprimer le lien',
        'modal.cancel': 'Annuler',
        'modal.formatText': 'Formater le texte',
        'modal.displayText': 'Texte affiché :',
        'modal.textPlaceholder': 'Saisir le texte...',
        'modal.textSize': 'Taille du texte :',
        'modal.textColor': 'Couleur du texte :',
        'modal.palette': 'Palette :',
        'modal.formatting': 'Mise en forme :',
        'modal.outline': 'Contour',
        'modal.bold': 'Gras',
        'modal.shadowSettings': 'Paramètres d\'ombre :',
        'modal.shadowEnable': 'Activer l\'ombre',
        'modal.shadowDistance': 'Distance (px) :',
        'modal.shadowOpacity': 'Opacité (%) :',
        'modal.linkToFile': 'Lien vers fichier MD :',
        'modal.noLinkSelected': 'Aucun lien sélectionné',
        'modal.selectFileBtn': 'Choisir un fichier...',
        'modal.deleteText': 'Supprimer le texte',
        'modal.confirmDeleteText': 'Vraiment supprimer le texte ?',
        'settings.exportWidth': 'Largeur par défaut pour l\'export d\'image en pixels.',
        'settings.exportWidthDesc': 'Largeur par défaut en pixels lors de l\'export en image.',
        'settings.showCrosshair': 'Afficher le réticule',
        'settings.showCrosshairDesc': 'Affiche un réticule au centre de la carte.',
        'settings.donateText': 'Offrez-moi un café. Je suis heureux de mettre Hex Cartographer gratuitement à votre disposition. Cependant, le développement a nécessité beaucoup de temps. Si de nouvelles idées me viennent, vous recevrez des mises à jour. Vous me feriez très plaisir en laissant un petit don pour ce travail.',
        'settings.donateButton': 'Offrir un café',
        'guide.title': 'Guide rapide',
        'guide.basics': 'Bases',
        'guide.basics.create': 'Clic droit sur un dossier dans l\'explorateur de fichiers → « Créer une nouvelle carte Hex Cartographer ».',
        'guide.basics.editMode': 'Activer/désactiver le mode édition.',
        'guide.navigation': 'Navigation',
        'guide.navigation.zoom': 'Molette = Zoom.',
        'guide.navigation.pan': 'Bouton central de la souris ou Shift+glisser = Déplacer la carte.',
        'guide.navigation.fit': 'Afficher toute la carte.',
        'guide.hexcolor': 'Couleur des hexagones',
        'guide.hexcolor.paint': 'Choisir une couleur et cliquer sur les hexagones pour les colorier.',
        'guide.hexcolor.eyedropper': 'Pipette : Capturer une couleur sur la carte.',
        'guide.hexcolor.palette': 'Clic droit sur un emplacement de palette = Définir une nouvelle couleur.',
        'guide.symbols': 'Symboles',
        'guide.symbols.groups': 'Choisir un groupe d\'outils (Extras, Végétation, Montagne, Bâtiment).',
        'guide.symbols.variant': 'Clic droit = Choisir la variante du symbole.',
        'guide.symbols.colors': 'La couleur principale actuelle détermine la couleur du symbole.',
        'guide.drawing': 'Modes de dessin',
        'guide.drawing.pen': 'Cliquer ou glisser pour dessiner.',
        'guide.drawing.fill': 'Remplir une zone avec la couleur ou le symbole actif.',
        'guide.drawing.eraser': 'Cliquer pour effacer un hexagone, un symbole ou un segment de chemin/rivière (double-clic = effacer les éléments contigus).',
        'guide.drawing.rightclick': 'Clic droit = Gomme (maintenir + glisser = effacer plusieurs éléments, double-clic = effacer les éléments contigus).',
        'guide.pattern': 'Outil motif',
        'guide.pattern.stamp': 'Appliquer un motif sur les hexagones. Glisser pour dessiner avec le motif.',
        'guide.pattern.pick': 'Capturer un motif existant pour dessiner avec.',
        'guide.paths': 'Rivières & Chemins',
        'guide.paths.river': 'Placer des points de passage pour les rivières. Les extrémités des rivières s\'affinent en impasse. Double-cliquer sur un point final ferme la rivière (uniquement sans embranchements). Glisser le dernier point sur l\'avant-dernier désactive l\'effilement à cette extrémité.',
        'guide.paths.road': 'Placer des points de passage pour les chemins.',
        'guide.paths.pick': 'Sélectionner et modifier une rivière/un chemin existant.',
        'guide.paths.width': 'Ajuster la largeur des rivières/chemins via les champs de saisie.',
        'guide.paths.dashes': 'Divise chaque segment d\'hexagone en alternance de tiret et d\'espace (1 = continu, 2 = demi-ligne, 3 = deux tirets, etc.).',
        'guide.borders': 'Frontières',
        'guide.borders.draw': 'Dessiner une région de frontière en cliquant ou en glissant sur les hexagones.',
        'guide.borders.pick': 'Sélectionner une frontière existante pour la modifier.',
        'guide.borders.dash': 'Divise chaque bord d\'hexagone en alternance de tiret et d\'espace (1 = continu, 2 = demi-ligne, 3 = deux tirets, etc.).',
        'guide.borders.visibility': 'Afficher/masquer les frontières sur la carte.',
        'guide.text': 'Texte',
        'guide.text.tool': 'Cliquer sur la carte pour définir le contenu, la taille, la couleur et le format du texte.<br>Cliquer à nouveau sur le texte pour le modifier.<br>Glisser pour déplacer.',
        'guide.undoredo': 'Annuler / Rétablir',
        'guide.undoredo.undo': 'Ctrl+Z = Annuler',
        'guide.undoredo.redo': 'Ctrl+Y = Rétablir',
        'guide.print': 'Imprimer / Exporter',
        'guide.print.pc': 'Menu trois points → « Imprimer la carte » ouvre la boîte de dialogue d\'impression (PC).',
        'guide.print.export': 'Menu trois points → « Exporter en image » enregistre la carte en JPEG ou PNG.',
        'guide.print.exportMobile': 'Sur les appareils mobiles, l\'image est enregistrée dans le dossier « Hex Cartographer Export » à côté du fichier de carte.',
        'guide.touch': 'Infos pour les utilisateurs d\'écran tactile',
        'guide.touch.tap': 'Toucher = Placer, positionner, sélectionner.<br>Glisser avec un doigt = Dessiner.',
        'guide.touch.longpress': 'Appui long sur les boutons d\'outils = p. ex. choisir une variante de symbole ou modifier la couleur de la palette.',
        'guide.touch.zoom': 'Pincer à deux doigts = Zoom.',
        'guide.touch.pan': 'Glisser à deux doigts = Déplacer la carte.',
        'modal.colorPickerTitle': 'Choisir une couleur',
        'modal.colorPickerCancel': 'Annuler',
        'tooltip.colorEyedropper': 'Pipette\nTouchez la carte pour capturer une couleur',
        'notice.tapToPickColor': 'Touchez un hexagone pour capturer la couleur',
        'notice.colorPicked': 'Couleur capturée',
        'notice.noColorAtPosition': 'Aucune couleur à cette position',
        'menu.createNew': 'Créer une nouvelle carte Hex Cartographer',
        'menu.openInEditor': 'Ouvrir dans Hex Cartographer',
        'menu.printMap': 'Imprimer la carte',
        'menu.shareMap': 'Partager la carte',
        'menu.exportMap': 'Exporter en image',
        'notice.noContentToPrint': 'Aucun contenu de carte à imprimer',
        'notice.exportSaved': 'Exporté vers',
        'modal.exportTitle': 'Exporter en image',
        'modal.exportFormat': 'Format',
        'modal.exportQuality': 'Qualité',
        'modal.exportExport': 'Exporter',
    },

    pt: {
        'tool.extras': 'Extras',
        'tool.vegetation': 'Vegetação',
        'tool.mountain': 'Montanha',
        'tool.building': 'Edifício',
        'variant.question': 'Ponto de interrogação',
        'variant.exclamation': 'Ponto de exclamação',
        'variant.cross': 'Cruz',
        'variant.dot': 'Ponto de partida/chegada',
        'variant.grass': 'Grama',
        'variant.swamp': 'Pântano',
        'variant.bush': 'Arbusto',
        'variant.tree': 'Árvore',
        'variant.pine': 'Conífera',
        'variant.palm': 'Palmeira',
        'variant.hill': 'Colina',
        'variant.mountain': 'Montanha',
        'variant.tent': 'Tenda',
        'variant.house': 'Casa',
        'variant.village': 'Aldeia',
        'variant.town': 'Cidade',
        'variant.castle': 'Castelo',
        'variant.monastery': 'Mosteiro',
        'variant.harbor': 'Porto',
        'variant.tower': 'Torre',
        'variant.ruin': 'Ruína',
        'variant.cave': 'Caverna',
        'variant.oasis': 'Oásis',
        'tooltip.editMode': 'Modo de edição\nClique: Mostrar/ocultar ferramentas',
        'tooltip.colorPicker': 'Cor atual\nClique: Abrir seletor de cor',
        'tooltip.hexColor': 'Hexágonos\nClique: Colorir hexágonos\nClique direito no mapa: Excluir',
        'tooltip.fill': 'Balde de tinta\nClique: Preencher área contígua\nClicar novamente: Desativar balde de tinta',
        'tooltip.text': 'Ferramenta de texto\nClique no mapa: Criar novo texto\nClique no texto: Editar/mover texto\nClique direito em texto no mapa: Excluir texto',
        'tooltip.eraser': 'Borracha\nClique: Apagar conteúdo do hexágono\nDuplo clique: Apagar elementos contíguos',
        'tooltip.undo': 'Desfazer\nCtrl+Z: Desfazer última ação',
        'tooltip.redo': 'Refazer\nCtrl+Y: Refazer ação desfeita',
        'tooltip.fit': 'Ajustar mapa\nClique: Exibir o mapa inteiro na janela',
        'tooltip.palette': 'Paleta de cores\nClique: Usar como cor atual\nClique direito: Alterar cor da paleta',
        'tooltip.toolGroup': '{name}\nClique: Desenhar\nClique direito: Escolher variante\nClique direito no mapa: Excluir',
        'tooltip.toolGroupVariant': '{label}\nClique: Desenhar\nClique direito: Escolher variante\nClique direito no mapa: Excluir',
        'tooltip.pattern': 'Ferramenta de padrão\nClique: Desenhar com o padrão capturado\nClique direito no mapa: Excluir\nDuplo clique borracha: Apagar padrão contíguo',
        'tooltip.patternPicker': 'Capturar padrão\nClique: Capturar hexágono como padrão',
        'tooltip.river': 'Ferramenta de rio\nClique: Colocar/mover pontos de passagem\nDuplo clique ponto final: Fechar rio (apenas sem ramificações)\nClique direito no mapa: Excluir segmento\nDuplo clique borracha: Excluir rio inteiro',
        'tooltip.road': 'Ferramenta de caminho\nClique: Colocar/mover pontos de passagem\nClique direito no mapa: Excluir segmento\nDuplo clique borracha: Excluir caminho inteiro',
        'tooltip.pathPicker': 'Capturar rio/caminho\nClique: Selecionar rio/caminho existente',
        'tooltip.pathFinish': 'Finalizar\nClique: Concluir o rio/caminho atual',
        'tooltip.roadFinish': 'Finalizar caminho',
        'tooltip.riverFinish': 'Finalizar rio',
        'input.riverWidth': 'Largura do rio',
        'input.roadWidth': 'Largura do caminho',
        'input.pathDashes': 'Traços',
        'tooltip.border': 'Ferramenta de fronteira\nClique: Desenhar hexágonos de fronteira\nClique direito no mapa: Excluir\nDuplo clique borracha: Apagar fronteira contígua',
        'tooltip.borderPicker': 'Capturar cor da fronteira\nClique: Selecionar fronteira existente para editar',
        'tooltip.borderFinish': 'Finalizar\nClique: Concluir a fronteira atual',
        'tooltip.borderVisibility': 'Visibilidade das fronteiras\nClique: Mostrar/ocultar fronteiras',
        'input.borderDashes': 'Traços',
        'notice.fileCreateError': 'Erro ao criar o arquivo: {error}',
        'notice.nothingToUndo': 'Nada para desfazer',
        'notice.nothingToRedo': 'Nada para refazer',
        'notice.noHexesToShow': 'Nenhum hexágono ou texto para exibir',
        'notice.noPattern': 'Nenhum padrão selecionado. Use o botão picker para capturar um padrão.',
        'notice.clickToPickPattern': 'Clique em um hexágono para capturar o padrão',
        'notice.patternPicked': 'Padrão capturado!',
        'notice.noHexAtPosition': 'Nenhum hexágono nesta posição',
        'notice.riverSelected': 'Rio #{id} selecionado',
        'notice.roadSelected': 'Caminho #{id} selecionado',
        'notice.noRiverOrRoad': 'Nenhum rio ou caminho nesta posição',
        'notice.borderSelected': 'Fronteira #{id} selecionada',
        'notice.noBorderAtPosition': 'Nenhuma fronteira nesta posição',
        'modal.selectFile': 'Selecionar arquivo MD',
        'modal.searchFile': 'Buscar arquivo...',
        'modal.noFilesFound': 'Nenhum arquivo encontrado',
        'modal.removeLink': 'Remover link',
        'modal.cancel': 'Cancelar',
        'modal.formatText': 'Formatar texto',
        'modal.displayText': 'Texto exibido:',
        'modal.textPlaceholder': 'Digitar texto...',
        'modal.textSize': 'Tamanho do texto:',
        'modal.textColor': 'Cor do texto:',
        'modal.palette': 'Paleta:',
        'modal.formatting': 'Formatação:',
        'modal.outline': 'Contorno',
        'modal.bold': 'Negrito',
        'modal.shadowSettings': 'Configurações de sombra:',
        'modal.shadowEnable': 'Ativar sombra',
        'modal.shadowDistance': 'Distância (px):',
        'modal.shadowOpacity': 'Opacidade (%):',
        'modal.linkToFile': 'Link para arquivo MD:',
        'modal.noLinkSelected': 'Nenhum link selecionado',
        'modal.selectFileBtn': 'Escolher arquivo...',
        'modal.deleteText': 'Excluir texto',
        'modal.confirmDeleteText': 'Realmente excluir o texto?',
        'settings.exportWidth': 'Largura padrão para exportação de imagem em pixels.',
        'settings.exportWidthDesc': 'Largura padrão em pixels ao exportar como imagem.',
        'settings.showCrosshair': 'Mostrar retículo',
        'settings.showCrosshairDesc': 'Exibe um retículo no centro do mapa.',
        'settings.donateText': 'Me pague um café. Fico feliz em disponibilizar o Hex Cartographer gratuitamente para vocês. No entanto, o desenvolvimento levou muito tempo. Se eu tiver novas ideias, haverá atualizações para vocês. Ficaria muito feliz se deixassem uma pequena doação por este trabalho.',
        'settings.donateButton': 'Pagar um café',
        'guide.title': 'Guia rápido',
        'guide.basics': 'Básico',
        'guide.basics.create': 'Clique direito em uma pasta no explorador de arquivos → "Criar novo mapa Hex Cartographer".',
        'guide.basics.editMode': 'Ativar/desativar modo de edição.',
        'guide.navigation': 'Navegação',
        'guide.navigation.zoom': 'Roda do mouse = Zoom.',
        'guide.navigation.pan': 'Botão do meio do mouse ou Shift+arrastar = Mover o mapa.',
        'guide.navigation.fit': 'Mostrar mapa inteiro.',
        'guide.hexcolor': 'Cor do hexágono',
        'guide.hexcolor.paint': 'Escolher cor e clicar nos hexágonos para colorir.',
        'guide.hexcolor.eyedropper': 'Conta-gotas: Capturar cor do mapa.',
        'guide.hexcolor.palette': 'Clique direito no espaço da paleta = Definir nova cor.',
        'guide.symbols': 'Símbolos',
        'guide.symbols.groups': 'Escolher grupo de ferramentas (Extras, Vegetação, Montanha, Edifício).',
        'guide.symbols.variant': 'Clique direito = Escolher variante do símbolo.',
        'guide.symbols.colors': 'A cor principal atual determina a cor do símbolo.',
        'guide.drawing': 'Modos de desenho',
        'guide.drawing.pen': 'Clicar ou arrastar para desenhar.',
        'guide.drawing.fill': 'Preencher área com a cor ou símbolo ativo.',
        'guide.drawing.eraser': 'Clicar para apagar hexágono, símbolo ou segmento de caminho/rio (duplo clique = apagar elementos contíguos).',
        'guide.drawing.rightclick': 'Clique direito = Borracha (segurar + arrastar = apagar vários elementos, duplo clique = apagar contíguos).',
        'guide.pattern': 'Ferramenta de padrão',
        'guide.pattern.stamp': 'Aplicar padrão nos hexágonos. Arrastar para desenhar com padrão.',
        'guide.pattern.pick': 'Capturar padrão existente para desenhar.',
        'guide.paths': 'Rios & Caminhos',
        'guide.paths.river': 'Colocar pontos de passagem para rios. As extremidades dos rios afinam em becos sem saída. Duplo clique num ponto final fecha o rio (apenas sem ramificações). Arrastar o último ponto para o penúltimo desativa o afinamento nessa extremidade.',
        'guide.paths.road': 'Colocar pontos de passagem para caminhos.',
        'guide.paths.pick': 'Selecionar e editar rio/caminho existente.',
        'guide.paths.width': 'Ajustar a largura dos rios/caminhos pelos campos de entrada.',
        'guide.paths.dashes': 'Divide cada segmento de hexágono em alternância de traço e espaço (1 = contínuo, 2 = meia linha, 3 = dois traços, etc.).',
        'guide.borders': 'Fronteiras',
        'guide.borders.draw': 'Desenhar região de fronteira clicando ou arrastando sobre hexágonos.',
        'guide.borders.pick': 'Selecionar fronteira existente para editar.',
        'guide.borders.dash': 'Divide cada borda de hexágono em alternância de traço e espaço (1 = contínuo, 2 = meia linha, 3 = dois traços, etc.).',
        'guide.borders.visibility': 'Mostrar/ocultar fronteiras no mapa.',
        'guide.text': 'Texto',
        'guide.text.tool': 'Clicar no mapa para definir conteúdo, tamanho, cor e formato do texto.<br>Clicar novamente no texto para editá-lo.<br>Arrastar para mover.',
        'guide.undoredo': 'Desfazer / Refazer',
        'guide.undoredo.undo': 'Ctrl+Z = Desfazer',
        'guide.undoredo.redo': 'Ctrl+Y = Refazer',
        'guide.print': 'Imprimir / Exportar',
        'guide.print.pc': 'Menu de três pontos → "Imprimir mapa" abre a caixa de diálogo de impressão (PC).',
        'guide.print.export': 'Menu de três pontos → "Exportar como imagem" salva o mapa como JPEG ou PNG.',
        'guide.print.exportMobile': 'Em dispositivos móveis, a imagem é salva na pasta "Hex Cartographer Export" ao lado do arquivo do mapa.',
        'guide.touch': 'Informações para usuários de tela sensível ao toque',
        'guide.touch.tap': 'Tocar = Colocar, posicionar, selecionar.<br>Deslizar com um dedo = Desenhar.',
        'guide.touch.longpress': 'Toque longo nos botões de ferramentas = p. ex. escolher variante de símbolo ou alterar cor da paleta.',
        'guide.touch.zoom': 'Pinça com dois dedos = Zoom.',
        'guide.touch.pan': 'Arrastar com dois dedos = Mover o mapa.',
        'modal.colorPickerTitle': 'Escolher cor',
        'modal.colorPickerCancel': 'Cancelar',
        'tooltip.colorEyedropper': 'Conta-gotas\nToque no mapa para capturar uma cor',
        'notice.tapToPickColor': 'Toque em um hexágono para capturar a cor',
        'notice.colorPicked': 'Cor capturada',
        'notice.noColorAtPosition': 'Nenhuma cor nesta posição',
        'menu.createNew': 'Criar novo mapa Hex Cartographer',
        'menu.openInEditor': 'Abrir no Hex Cartographer',
        'menu.printMap': 'Imprimir mapa',
        'menu.shareMap': 'Compartilhar mapa',
        'menu.exportMap': 'Exportar como imagem',
        'notice.noContentToPrint': 'Nenhum conteúdo de mapa para imprimir',
        'notice.exportSaved': 'Exportado para',
        'modal.exportTitle': 'Exportar como imagem',
        'modal.exportFormat': 'Formato',
        'modal.exportQuality': 'Qualidade',
        'modal.exportExport': 'Exportar',
    },

    ko: {
        'tool.extras': '기타',
        'tool.vegetation': '식생',
        'tool.mountain': '산',
        'tool.building': '건물',
        'variant.question': '물음표',
        'variant.exclamation': '느낌표',
        'variant.cross': '십자',
        'variant.dot': '출발/도착 지점',
        'variant.grass': '풀',
        'variant.swamp': '늪',
        'variant.bush': '관목',
        'variant.tree': '활엽수',
        'variant.pine': '침엽수',
        'variant.palm': '야자수',
        'variant.hill': '언덕',
        'variant.mountain': '산',
        'variant.tent': '텐트',
        'variant.house': '집',
        'variant.village': '마을',
        'variant.town': '도시',
        'variant.castle': '성',
        'variant.monastery': '수도원',
        'variant.harbor': '항구',
        'variant.tower': '탑',
        'variant.ruin': '폐허',
        'variant.cave': '동굴',
        'variant.oasis': '오아시스',
        'tooltip.editMode': '편집 모드\n클릭: 도구 표시/숨기기',
        'tooltip.colorPicker': '현재 색상\n클릭: 색상 선택기 열기',
        'tooltip.hexColor': '헥스 셀\n클릭: 헥스 셀 색칠하기\n지도에서 우클릭: 삭제',
        'tooltip.fill': '채우기 도구\n클릭: 인접한 영역 채우기\n다시 클릭: 채우기 도구 끄기',
        'tooltip.text': '텍스트 도구\n지도 클릭: 새 텍스트 만들기\n텍스트 클릭: 텍스트 편집/이동\n지도에서 텍스트 우클릭: 텍스트 삭제',
        'tooltip.eraser': '지우개\n클릭: 헥스 셀 내용 지우기\n더블 클릭: 인접한 요소 지우기',
        'tooltip.undo': '실행 취소\nCtrl+Z: 마지막 작업 실행 취소',
        'tooltip.redo': '다시 실행\nCtrl+Y: 취소한 작업 다시 실행',
        'tooltip.fit': '지도 맞추기\n클릭: 창에 전체 지도 표시',
        'tooltip.palette': '색상 팔레트\n클릭: 현재 색상으로 사용\n우클릭: 팔레트 색상 변경',
        'tooltip.toolGroup': '{name}\n클릭: 그리기\n우클릭: 변형 선택\n지도에서 우클릭: 삭제',
        'tooltip.toolGroupVariant': '{label}\n클릭: 그리기\n우클릭: 변형 선택\n지도에서 우클릭: 삭제',
        'tooltip.pattern': '패턴 도구\n클릭: 캡처한 패턴으로 그리기\n지도에서 우클릭: 삭제\n더블 클릭 지우개: 인접한 패턴 지우기',
        'tooltip.patternPicker': '패턴 캡처\n클릭: 헥스 셀을 패턴으로 캡처',
        'tooltip.river': '강 도구\n클릭: 경유점 배치/이동\n끝점 더블 클릭: 강 닫기 (분기 없는 경우만)\n지도에서 우클릭: 구간 삭제\n더블 클릭 지우개: 전체 강 삭제',
        'tooltip.road': '길 도구\n클릭: 경유점 배치/이동\n지도에서 우클릭: 구간 삭제\n더블 클릭 지우개: 전체 길 삭제',
        'tooltip.pathPicker': '강/길 캡처\n클릭: 기존 강/길 선택',
        'tooltip.pathFinish': '완료\n클릭: 현재 강/길 완성',
        'tooltip.roadFinish': '길 완료',
        'tooltip.riverFinish': '강 완료',
        'input.riverWidth': '강 너비',
        'input.roadWidth': '길 너비',
        'input.pathDashes': '대시',
        'tooltip.border': '경계 도구\n클릭: 경계 헥스 셀 그리기\n지도에서 우클릭: 삭제\n더블 클릭 지우개: 인접한 경계 지우기',
        'tooltip.borderPicker': '경계 색상 캡처\n클릭: 기존 경계를 선택하여 편집',
        'tooltip.borderFinish': '완료\n클릭: 현재 경계 완성',
        'tooltip.borderVisibility': '경계 표시\n클릭: 경계 표시/숨기기',
        'input.borderDashes': '대시',
        'notice.fileCreateError': '파일 생성 오류: {error}',
        'notice.nothingToUndo': '실행 취소할 항목이 없습니다',
        'notice.nothingToRedo': '다시 실행할 항목이 없습니다',
        'notice.noHexesToShow': '표시할 헥스 셀이나 텍스트가 없습니다',
        'notice.noPattern': '패턴이 선택되지 않았습니다. 피커 버튼을 사용하여 패턴을 캡처하세요.',
        'notice.clickToPickPattern': '헥스 셀을 클릭하여 패턴을 캡처하세요',
        'notice.patternPicked': '패턴 캡처 완료!',
        'notice.noHexAtPosition': '이 위치에 헥스 셀이 없습니다',
        'notice.riverSelected': '강 #{id} 선택됨',
        'notice.roadSelected': '길 #{id} 선택됨',
        'notice.noRiverOrRoad': '이 위치에 강 또는 길이 없습니다',
        'notice.borderSelected': '경계 #{id} 선택됨',
        'notice.noBorderAtPosition': '이 위치에 경계가 없습니다',
        'modal.selectFile': 'MD 파일 선택',
        'modal.searchFile': '파일 검색...',
        'modal.noFilesFound': '파일을 찾을 수 없습니다',
        'modal.removeLink': '링크 제거',
        'modal.cancel': '취소',
        'modal.formatText': '텍스트 서식',
        'modal.displayText': '표시 텍스트:',
        'modal.textPlaceholder': '텍스트 입력...',
        'modal.textSize': '텍스트 크기:',
        'modal.textColor': '텍스트 색상:',
        'modal.palette': '팔레트:',
        'modal.formatting': '서식:',
        'modal.outline': '외곽선',
        'modal.bold': '굵게',
        'modal.shadowSettings': '그림자 설정:',
        'modal.shadowEnable': '그림자 활성화',
        'modal.shadowDistance': '거리 (px):',
        'modal.shadowOpacity': '불투명도 (%):',
        'modal.linkToFile': 'MD 파일 링크:',
        'modal.noLinkSelected': '선택된 링크 없음',
        'modal.selectFileBtn': '파일 선택...',
        'modal.deleteText': '텍스트 삭제',
        'modal.confirmDeleteText': '텍스트를 정말 삭제하시겠습니까?',
        'settings.exportWidth': '이미지 내보내기의 기본 너비(픽셀).',
        'settings.exportWidthDesc': '이미지로 내보낼 때 기본 너비(픽셀)입니다.',
        'settings.showCrosshair': '십자선 표시',
        'settings.showCrosshairDesc': '지도 중심에 십자선을 표시합니다.',
        'settings.donateText': '커피 한 잔 사주세요. Hex Cartographer를 무료로 제공하게 되어 기쁩니다. 하지만 개발에 오랜 시간이 걸렸습니다. 새로운 아이디어가 떠오르면 업데이트를 제공하겠습니다. 이 작업에 대해 작은 기부를 남겨주시면 큰 기쁨이 되겠습니다.',
        'settings.donateButton': '커피 한 잔 기부하기',
        'guide.title': '빠른 가이드',
        'guide.basics': '기본',
        'guide.basics.create': '파일 탐색기에서 폴더를 우클릭 → "새 Hex Cartographer 지도 만들기".',
        'guide.basics.editMode': '편집 모드 켜기/끄기.',
        'guide.navigation': '탐색',
        'guide.navigation.zoom': '마우스 휠 = 확대/축소.',
        'guide.navigation.pan': '마우스 가운데 버튼 또는 Shift+드래그 = 지도 이동.',
        'guide.navigation.fit': '전체 지도 표시.',
        'guide.hexcolor': '헥스 셀 색상',
        'guide.hexcolor.paint': '색상을 선택하고 헥스 셀을 클릭하여 색칠합니다.',
        'guide.hexcolor.eyedropper': '스포이트: 지도에서 색상을 캡처합니다.',
        'guide.hexcolor.palette': '팔레트 자리 우클릭 = 새 색상 설정.',
        'guide.symbols': '기호',
        'guide.symbols.groups': '도구 그룹 선택 (기타, 식생, 산, 건물).',
        'guide.symbols.variant': '우클릭 = 기호 변형 선택.',
        'guide.symbols.colors': '현재 마스터 색상이 기호 색상을 결정합니다.',
        'guide.drawing': '그리기 모드',
        'guide.drawing.pen': '클릭 또는 드래그하여 그립니다.',
        'guide.drawing.fill': '활성 색상 또는 기호로 영역을 채웁니다.',
        'guide.drawing.eraser': '클릭하여 헥스 셀, 기호 또는 길/강 구간을 지웁니다 (더블 클릭 = 인접한 요소 지우기).',
        'guide.drawing.rightclick': '우클릭 = 지우개 (누른 채 드래그 = 여러 요소 지우기, 더블 클릭 = 인접한 요소 지우기).',
        'guide.pattern': '패턴 도구',
        'guide.pattern.stamp': '헥스 셀에 패턴을 적용합니다. 드래그하여 패턴으로 그립니다.',
        'guide.pattern.pick': '기존 패턴을 캡처하여 그립니다.',
        'guide.paths': '강 & 길',
        'guide.paths.river': '강의 경유점을 배치합니다. 강의 막다른 끝은 점점 가늘어집니다. 끝점을 더블 클릭하면 강을 닫습니다 (분기 없는 경우만). 마지막 점을 끝에서 두 번째 점으로 드래그하면 해당 끝의 테이퍼를 비활성화합니다.',
        'guide.paths.road': '길의 경유점을 배치합니다.',
        'guide.paths.pick': '기존 강/길을 선택하여 편집합니다.',
        'guide.paths.width': '입력 필드를 통해 강/길의 너비를 조정합니다.',
        'guide.paths.dashes': '각 헥스 셀 구간을 대시와 간격으로 번갈아 나눕니다 (1 = 연속, 2 = 반 선, 3 = 두 대시 등).',
        'guide.borders': '경계',
        'guide.borders.draw': '헥스 셀을 클릭하거나 드래그하여 경계 영역을 그립니다.',
        'guide.borders.pick': '기존 경계를 선택하여 편집합니다.',
        'guide.borders.dash': '각 헥스 셀 가장자리를 대시와 간격으로 번갈아 나눕니다 (1 = 연속, 2 = 반 선, 3 = 두 대시 등).',
        'guide.borders.visibility': '지도에서 경계를 표시/숨깁니다.',
        'guide.text': '텍스트',
        'guide.text.tool': '지도를 클릭하여 텍스트 내용, 크기, 색상 및 서식을 설정합니다.<br>텍스트를 다시 클릭하여 편집합니다.<br>드래그하여 이동합니다.',
        'guide.undoredo': '실행 취소 / 다시 실행',
        'guide.undoredo.undo': 'Ctrl+Z = 실행 취소',
        'guide.undoredo.redo': 'Ctrl+Y = 다시 실행',
        'guide.print': '인쇄 / 내보내기',
        'guide.print.pc': '점 세 개 메뉴 → "지도 인쇄"로 인쇄 대화 상자를 엽니다 (PC).',
        'guide.print.export': '점 세 개 메뉴 → "이미지로 내보내기"로 지도를 JPEG 또는 PNG로 저장합니다.',
        'guide.print.exportMobile': '모바일 기기에서는 이미지가 지도 파일 옆의 "Hex Cartographer Export" 폴더에 저장됩니다.',
        'guide.touch': '터치 스크린 사용자 정보',
        'guide.touch.tap': '탭 = 배치, 놓기, 선택.<br>한 손가락으로 스와이프 = 그리기.',
        'guide.touch.longpress': '도구 버튼 길게 누르기 = 예: 기호 변형 선택 또는 팔레트 색상 변경.',
        'guide.touch.zoom': '두 손가락 핀치 = 확대/축소.',
        'guide.touch.pan': '두 손가락 드래그 = 지도 이동.',
        'modal.colorPickerTitle': '색상 선택',
        'modal.colorPickerCancel': '취소',
        'tooltip.colorEyedropper': '스포이트\n지도를 탭하여 색상을 캡처합니다',
        'notice.tapToPickColor': '헥스 셀을 탭하여 색상을 캡처하세요',
        'notice.colorPicked': '색상 캡처 완료',
        'notice.noColorAtPosition': '이 위치에 색상이 없습니다',
        'menu.createNew': '새 Hex Cartographer 지도 만들기',
        'menu.openInEditor': 'Hex Cartographer에서 열기',
        'menu.printMap': '지도 인쇄',
        'menu.shareMap': '지도 공유',
        'menu.exportMap': '이미지로 내보내기',
        'notice.noContentToPrint': '인쇄할 지도 내용이 없습니다',
        'notice.exportSaved': '내보내기 완료:',
        'modal.exportTitle': '이미지로 내보내기',
        'modal.exportFormat': '형식',
        'modal.exportQuality': '품질',
        'modal.exportExport': '내보내기',
    },

    es: {
        'tool.extras': 'Extras',
        'tool.vegetation': 'Vegetación',
        'tool.mountain': 'Montaña',
        'tool.building': 'Edificio',
        'variant.question': 'Signo de interrogación',
        'variant.exclamation': 'Signo de exclamación',
        'variant.cross': 'Cruz',
        'variant.dot': 'Punto de inicio/meta',
        'variant.grass': 'Hierba',
        'variant.swamp': 'Pantano',
        'variant.bush': 'Arbusto',
        'variant.tree': 'Árbol caducifolio',
        'variant.pine': 'Conífera',
        'variant.palm': 'Palmera',
        'variant.hill': 'Colina',
        'variant.mountain': 'Montaña',
        'variant.tent': 'Tienda',
        'variant.house': 'Casa',
        'variant.village': 'Aldea',
        'variant.town': 'Ciudad',
        'variant.castle': 'Castillo',
        'variant.monastery': 'Monasterio',
        'variant.harbor': 'Puerto',
        'variant.tower': 'Torre',
        'variant.ruin': 'Ruina',
        'variant.cave': 'Cueva',
        'variant.oasis': 'Oasis',
        'tooltip.editMode': 'Modo edición\nClic: Mostrar/ocultar herramientas',
        'tooltip.colorPicker': 'Color actual\nClic: Abrir selector de color',
        'tooltip.hexColor': 'Celdas\nClic: Colorear celdas\nClic derecho en mapa: Eliminar',
        'tooltip.fill': 'Cubo de relleno\nClic: Rellenar área contigua\nClic de nuevo: Desactivar cubo de relleno',
        'tooltip.text': 'Herramienta de texto\nClic en mapa: Crear nuevo texto\nClic en texto: Editar/mover texto\nClic derecho en texto del mapa: Eliminar texto',
        'tooltip.eraser': 'Borrador\nClic: Borrar contenido de celda\nDoble clic: Borrar elementos contiguos',
        'tooltip.undo': 'Deshacer\nCtrl+Z: Deshacer última acción',
        'tooltip.redo': 'Rehacer\nCtrl+Y: Rehacer acción deshecha',
        'tooltip.fit': 'Ajustar mapa\nClic: Ajustar ventana al mapa completo',
        'tooltip.palette': 'Paleta de colores\nClic: Usar como color actual\nClic derecho: Cambiar color de paleta',
        'tooltip.toolGroup': '{name}\nClic: Dibujar\nClic derecho: Elegir variante\nClic derecho en mapa: Eliminar',
        'tooltip.toolGroupVariant': '{label}\nClic: Dibujar\nClic derecho: Elegir variante\nClic derecho en mapa: Eliminar',
        'tooltip.pattern': 'Herramienta de patrón\nClic: Dibujar con patrón capturado\nClic derecho en mapa: Eliminar\nDoble clic borrador: Borrar patrón contiguo',
        'tooltip.patternPicker': 'Capturar patrón\nClic: Usar celda como patrón',
        'tooltip.river': 'Herramienta de río\nClic: Colocar/mover puntos de ruta\nDoble clic punto final: Cerrar río (solo sin ramificaciones)\nClic derecho en mapa: Borrar segmento\nDoble clic borrador: Borrar río completo',
        'tooltip.road': 'Herramienta de camino\nClic: Colocar/mover puntos de ruta\nClic derecho en mapa: Borrar segmento\nDoble clic borrador: Borrar camino completo',
        'tooltip.pathPicker': 'Capturar río/camino\nClic: Seleccionar río/camino existente',
        'tooltip.pathFinish': 'Finalizar\nClic: Completar río/camino actual',
        'tooltip.roadFinish': 'Finalizar camino',
        'tooltip.riverFinish': 'Finalizar río',
        'input.riverWidth': 'Ancho de río',
        'input.roadWidth': 'Ancho de camino',
        'input.pathDashes': 'Trazos',
        'tooltip.border': 'Herramienta de frontera\nClic: Dibujar celdas de frontera\nClic derecho en mapa: Eliminar\nDoble clic borrador: Borrar frontera contigua',
        'tooltip.borderPicker': 'Capturar color de frontera\nClic: Seleccionar frontera existente para editar',
        'tooltip.borderFinish': 'Finalizar\nClic: Completar frontera actual',
        'tooltip.borderVisibility': 'Visibilidad de fronteras\nClic: Mostrar/ocultar fronteras',
        'input.borderDashes': 'Trazos',
        'notice.fileCreateError': 'Error al crear el archivo: {error}',
        'notice.nothingToUndo': 'Nada que deshacer',
        'notice.nothingToRedo': 'Nada que rehacer',
        'notice.noHexesToShow': 'No hay celdas ni textos para mostrar',
        'notice.noPattern': 'Ningún patrón seleccionado. Usa el botón picker para capturar un patrón.',
        'notice.clickToPickPattern': 'Haz clic en una celda para capturar el patrón',
        'notice.patternPicked': '¡Patrón capturado!',
        'notice.noHexAtPosition': 'No hay celda en esta posición',
        'notice.riverSelected': 'Río #{id} seleccionado',
        'notice.roadSelected': 'Camino #{id} seleccionado',
        'notice.noRiverOrRoad': 'No hay río ni camino en esta posición',
        'notice.borderSelected': 'Frontera #{id} seleccionada',
        'notice.noBorderAtPosition': 'No hay frontera en esta posición',
        'modal.selectFile': 'Seleccionar archivo MD',
        'modal.searchFile': 'Buscar nombre de archivo...',
        'modal.noFilesFound': 'No se encontraron archivos',
        'modal.removeLink': 'Eliminar enlace',
        'modal.cancel': 'Cancelar',
        'modal.formatText': 'Formatear texto',
        'modal.displayText': 'Texto a mostrar:',
        'modal.textPlaceholder': 'Introducir texto...',
        'modal.textSize': 'Tamaño de texto:',
        'modal.textColor': 'Color de texto:',
        'modal.palette': 'Paleta:',
        'modal.formatting': 'Formato:',
        'modal.outline': 'Contorno',
        'modal.bold': 'Negrita',
        'modal.shadowSettings': 'Ajustes de sombra:',
        'modal.shadowEnable': 'Activar sombra',
        'modal.shadowDistance': 'Distancia (px):',
        'modal.shadowOpacity': 'Transparencia (%):',
        'modal.linkToFile': 'Enlace a archivo MD:',
        'modal.noLinkSelected': 'Ningún enlace seleccionado',
        'modal.selectFileBtn': 'Elegir archivo...',
        'modal.deleteText': 'Eliminar texto',
        'modal.confirmDeleteText': '¿Eliminar texto realmente?',
        'settings.exportWidth': 'Ancho predeterminado para exportación de imagen en píxeles.',
        'settings.exportWidthDesc': 'Ancho predeterminado en píxeles al exportar como imagen.',
        'settings.showCrosshair': 'Mostrar retícula',
        'settings.showCrosshairDesc': 'Muestra una retícula en el centro del mapa.',
        'settings.donateText': 'Invítame a un café. Me alegra poner Hex Cartographer a vuestra disposición de forma gratuita. Sin embargo, el desarrollo requirió mucho tiempo. Si se me ocurre algo nuevo, habrá actualizaciones para vosotros. Me haríais muy feliz si dejáis una pequeña donación por este trabajo.',
        'settings.donateButton': 'Dona un café',
        'guide.title': 'Guía rápida',
        'guide.basics': 'Conceptos básicos',
        'guide.basics.create': 'Clic derecho en una carpeta en el explorador de archivos → «Crear nuevo mapa Hex Cartographer».',
        'guide.basics.editMode': 'Activar/desactivar modo de edición.',
        'guide.navigation': 'Navegación',
        'guide.navigation.zoom': 'Rueda del ratón = Zoom.',
        'guide.navigation.pan': 'Botón central del ratón o Shift+arrastrar = Mover mapa.',
        'guide.navigation.fit': 'Mostrar mapa completo.',
        'guide.hexcolor': 'Color de celda',
        'guide.hexcolor.paint': 'Elegir color y hacer clic en celdas para colorearlas.',
        'guide.hexcolor.eyedropper': 'Cuentagotas: Capturar color del mapa.',
        'guide.hexcolor.palette': 'Clic derecho en lugar de paleta = Cambiar color.',
        'guide.symbols': 'Símbolos',
        'guide.symbols.groups': 'Elegir grupo de herramientas (Extras, Vegetación, Montaña, Edificio).',
        'guide.symbols.variant': 'Clic derecho = Selección de variante de símbolo.',
        'guide.symbols.colors': 'El color maestro actual determina el color del símbolo.',
        'guide.drawing': 'Modos de dibujo',
        'guide.drawing.pen': 'Clic o arrastrar para dibujar.',
        'guide.drawing.fill': 'Rellenar área con color o símbolo activo.',
        'guide.drawing.eraser': 'Borrar celda, símbolo o segmento de camino/río haciendo clic (doble clic = borrar elementos contiguos).',
        'guide.drawing.rightclick': 'Clic derecho = Borrador (mantener + arrastrar = borrar varios elementos, doble clic = borrar contiguos).',
        'guide.pattern': 'Herramienta de patrón',
        'guide.pattern.stamp': 'Colocar patrón en celdas. Arrastrar para dibujar con patrón.',
        'guide.pattern.pick': 'Capturar patrón existente para dibujar con él.',
        'guide.paths': 'Ríos y caminos',
        'guide.paths.river': 'Colocar puntos de ruta para ríos. Los extremos de los ríos se estrechan en callejones sin salida. Doble clic en un punto final cierra el río (solo sin ramificaciones). Arrastrar el último punto sobre el penúltimo desactiva el estrechamiento en ese extremo.',
        'guide.paths.road': 'Colocar puntos de ruta para caminos.',
        'guide.paths.pick': 'Seleccionar y editar río/camino existente.',
        'guide.paths.width': 'Ajustar el ancho de ríos/caminos mediante los campos de entrada.',
        'guide.paths.dashes': 'Divide cada segmento de celda en alternancia de trazo y hueco (1 = continuo, 2 = media línea, 3 = dos trazos, etc.).',
        'guide.borders': 'Fronteras',
        'guide.borders.draw': 'Dibujar región fronteriza haciendo clic o arrastrando sobre celdas.',
        'guide.borders.pick': 'Seleccionar frontera existente para editar.',
        'guide.borders.dash': 'Divide cada borde de celda en alternancia de trazo y hueco (1 = continuo, 2 = media línea, 3 = dos trazos, etc.).',
        'guide.borders.visibility': 'Mostrar/ocultar fronteras en el mapa.',
        'guide.text': 'Texto',
        'guide.text.tool': 'Clic en el mapa para configurar contenido, tamaño, color y formato del texto.<br>Clic de nuevo en el texto para editarlo.<br>Arrastrar para mover.',
        'guide.undoredo': 'Deshacer / Rehacer',
        'guide.undoredo.undo': 'Ctrl+Z = Deshacer',
        'guide.undoredo.redo': 'Ctrl+Y = Rehacer',
        'guide.print': 'Imprimir / Exportar',
        'guide.print.pc': 'Menú de tres puntos → «Imprimir mapa» abre el diálogo de impresión (PC).',
        'guide.print.export': 'Menú de tres puntos → «Exportar como imagen» guarda el mapa como JPEG o PNG.',
        'guide.print.exportMobile': 'En dispositivos móviles, la imagen se guarda en la carpeta «Hex Cartographer Export» junto al archivo del mapa.',
        'guide.touch': 'Información para usuarios con pantalla táctil',
        'guide.touch.tap': 'Tocar = Colocar, ubicar, seleccionar.<br>Deslizar con un dedo = Dibujar.',
        'guide.touch.longpress': 'Mantener pulsado en botones de herramientas = p. ej. elegir variante de símbolo o cambiar color de paleta.',
        'guide.touch.zoom': 'Pellizcar con dos dedos = Zoom.',
        'guide.touch.pan': 'Arrastrar con dos dedos = Mover mapa.',
        'modal.colorPickerTitle': 'Elegir color',
        'modal.colorPickerCancel': 'Cancelar',
        'tooltip.colorEyedropper': 'Cuentagotas\nToca el mapa para capturar cualquier color',
        'notice.tapToPickColor': 'Toca una celda para capturar el color',
        'notice.colorPicked': 'Color capturado',
        'notice.noColorAtPosition': 'No hay color en esta posición',
        'menu.createNew': 'Crear nuevo mapa Hex Cartographer',
        'menu.openInEditor': 'Abrir en Hex Cartographer',
        'menu.printMap': 'Imprimir mapa',
        'menu.shareMap': 'Compartir mapa',
        'menu.exportMap': 'Exportar como imagen',
        'notice.noContentToPrint': 'No hay contenido del mapa para imprimir',
        'notice.exportSaved': 'Exportado a',
        'modal.exportTitle': 'Exportar como imagen',
        'modal.exportFormat': 'Formato',
        'modal.exportQuality': 'Calidad',
        'modal.exportExport': 'Exportar',
    },

    pl: {
        'tool.extras': 'Dodatki',
        'tool.vegetation': 'Roślinność',
        'tool.mountain': 'Góra',
        'tool.building': 'Budynek',
        'variant.question': 'Znak zapytania',
        'variant.exclamation': 'Wykrzyknik',
        'variant.cross': 'Krzyż',
        'variant.dot': 'Punkt startowy/docelowy',
        'variant.grass': 'Trawa',
        'variant.swamp': 'Bagno',
        'variant.bush': 'Krzew',
        'variant.tree': 'Drzewo liściaste',
        'variant.pine': 'Drzewo iglaste',
        'variant.palm': 'Palma',
        'variant.hill': 'Wzgórze',
        'variant.mountain': 'Góra',
        'variant.tent': 'Namiot',
        'variant.house': 'Dom',
        'variant.village': 'Wioska',
        'variant.town': 'Miasto',
        'variant.castle': 'Zamek',
        'variant.monastery': 'Klasztor',
        'variant.harbor': 'Port',
        'variant.tower': 'Wieża',
        'variant.ruin': 'Ruina',
        'variant.cave': 'Jaskinia',
        'variant.oasis': 'Oaza',
        'tooltip.editMode': 'Tryb edycji\nKliknij: Pokaż/ukryj narzędzia',
        'tooltip.colorPicker': 'Aktualny kolor\nKliknij: Otwórz wybór koloru',
        'tooltip.hexColor': 'Komórki\nKliknij: Pokoloruj komórki\nPrawy klik na mapie: Usuń',
        'tooltip.fill': 'Wiadro wypełnienia\nKliknij: Wypełnij przyległy obszar\nKliknij ponownie: Wyłącz wiadro wypełnienia',
        'tooltip.text': 'Narzędzie tekstowe\nKliknij na mapę: Utwórz nowy tekst\nKliknij na tekst: Edytuj/przesuń tekst\nPrawy klik na tekst na mapie: Usuń tekst',
        'tooltip.eraser': 'Gumka\nKliknij: Usuń zawartość komórki\nPodwójne kliknięcie: Usuń przyległe elementy',
        'tooltip.undo': 'Cofnij\nCtrl+Z: Cofnij ostatnią akcję',
        'tooltip.redo': 'Ponów\nCtrl+Y: Ponów cofniętą akcję',
        'tooltip.fit': 'Dopasuj mapę\nKliknij: Dopasuj okno do całej mapy',
        'tooltip.palette': 'Paleta kolorów\nKliknij: Użyj jako aktualny kolor\nPrawy przycisk: Zmień kolor palety',
        'tooltip.toolGroup': '{name}\nKliknij: Rysuj\nPrawy przycisk: Wybierz wariant\nPrawy klik na mapie: Usuń',
        'tooltip.toolGroupVariant': '{label}\nKliknij: Rysuj\nPrawy przycisk: Wybierz wariant\nPrawy klik na mapie: Usuń',
        'tooltip.pattern': 'Narzędzie wzoru\nKliknij: Rysuj pobranym wzorem\nPrawy klik na mapie: Usuń\nPodwójne kliknięcie gumką: Usuń przyległy wzór',
        'tooltip.patternPicker': 'Pobierz wzór\nKliknij: Użyj komórki jako wzoru',
        'tooltip.river': 'Narzędzie rzeki\nKliknij: Ustaw/przesuń punkty trasy\nPodwójne kliknięcie punktu końcowego: Zamknij rzekę (tylko bez rozgałęzień)\nPrawy klik na mapie: Usuń odcinek\nPodwójne kliknięcie gumką: Usuń całą rzekę',
        'tooltip.road': 'Narzędzie drogi\nKliknij: Ustaw/przesuń punkty trasy\nPrawy klik na mapie: Usuń odcinek\nPodwójne kliknięcie gumką: Usuń całą drogę',
        'tooltip.pathPicker': 'Pobierz rzekę/drogę\nKliknij: Wybierz istniejącą rzekę/drogę',
        'tooltip.pathFinish': 'Zakończ\nKliknij: Zakończ bieżącą rzekę/drogę',
        'tooltip.roadFinish': 'Zakończ drogę',
        'tooltip.riverFinish': 'Zakończ rzekę',
        'input.riverWidth': 'Szerokość rzeki',
        'input.roadWidth': 'Szerokość drogi',
        'input.pathDashes': 'Kreski',
        'tooltip.border': 'Narzędzie granicy\nKliknij: Rysuj komórki graniczne\nPrawy klik na mapie: Usuń\nPodwójne kliknięcie gumką: Usuń przyległą granicę',
        'tooltip.borderPicker': 'Pobierz kolor granicy\nKliknij: Wybierz istniejącą granicę do edycji',
        'tooltip.borderFinish': 'Zakończ\nKliknij: Zakończ bieżącą granicę',
        'tooltip.borderVisibility': 'Widoczność granic\nKliknij: Pokaż/ukryj granice',
        'input.borderDashes': 'Kreski',
        'notice.fileCreateError': 'Błąd podczas tworzenia pliku: {error}',
        'notice.nothingToUndo': 'Nie ma czego cofnąć',
        'notice.nothingToRedo': 'Nie ma czego ponowić',
        'notice.noHexesToShow': 'Brak komórek lub tekstów do wyświetlenia',
        'notice.noPattern': 'Nie wybrano wzoru. Użyj przycisku picker, aby pobrać wzór.',
        'notice.clickToPickPattern': 'Kliknij na komórkę, aby pobrać wzór',
        'notice.patternPicked': 'Wzór pobrany!',
        'notice.noHexAtPosition': 'Brak komórki w tej pozycji',
        'notice.riverSelected': 'Rzeka #{id} wybrana',
        'notice.roadSelected': 'Droga #{id} wybrana',
        'notice.noRiverOrRoad': 'Brak rzeki lub drogi w tej pozycji',
        'notice.borderSelected': 'Granica #{id} wybrana',
        'notice.noBorderAtPosition': 'Brak granicy w tej pozycji',
        'modal.selectFile': 'Wybierz plik MD',
        'modal.searchFile': 'Szukaj nazwy pliku...',
        'modal.noFilesFound': 'Nie znaleziono plików',
        'modal.removeLink': 'Usuń link',
        'modal.cancel': 'Anuluj',
        'modal.formatText': 'Formatuj tekst',
        'modal.displayText': 'Wyświetlany tekst:',
        'modal.textPlaceholder': 'Wpisz tekst...',
        'modal.textSize': 'Rozmiar tekstu:',
        'modal.textColor': 'Kolor tekstu:',
        'modal.palette': 'Paleta:',
        'modal.formatting': 'Formatowanie:',
        'modal.outline': 'Obrys',
        'modal.bold': 'Pogrubienie',
        'modal.shadowSettings': 'Ustawienia cienia:',
        'modal.shadowEnable': 'Włącz cień',
        'modal.shadowDistance': 'Odległość (px):',
        'modal.shadowOpacity': 'Przezroczystość (%):',
        'modal.linkToFile': 'Link do pliku MD:',
        'modal.noLinkSelected': 'Nie wybrano linku',
        'modal.selectFileBtn': 'Wybierz plik...',
        'modal.deleteText': 'Usuń tekst',
        'modal.confirmDeleteText': 'Czy na pewno usunąć tekst?',
        'settings.exportWidth': 'Domyślna szerokość eksportu obrazu w pikselach.',
        'settings.exportWidthDesc': 'Domyślna szerokość w pikselach przy eksporcie jako obraz.',
        'settings.showCrosshair': 'Pokaż celownik',
        'settings.showCrosshairDesc': 'Wyświetla celownik w centrum mapy.',
        'settings.donateText': 'Postaw mi kawę. Cieszę się, że mogę udostępnić Wam Hex Cartographer za darmo. Jednak jego rozwój wymagał długiego czasu. Jeśli wpadnę na nowy pomysł, będą dla Was aktualizacje. Sprawiłoby mi ogromną radość, gdybyście zostawili drobną darowiznę za tę pracę.',
        'settings.donateButton': 'Postaw kawę',
        'guide.title': 'Skrócona instrukcja',
        'guide.basics': 'Podstawy',
        'guide.basics.create': 'Prawy przycisk na folder w przeglądarce plików → „Utwórz nową mapę Hex Cartographer".',
        'guide.basics.editMode': 'Włącz/wyłącz tryb edycji.',
        'guide.navigation': 'Nawigacja',
        'guide.navigation.zoom': 'Kółko myszy = Zoom.',
        'guide.navigation.pan': 'Środkowy przycisk myszy lub Shift+przeciąganie = Przesuwanie mapy.',
        'guide.navigation.fit': 'Pokaż całą mapę.',
        'guide.hexcolor': 'Kolor komórki',
        'guide.hexcolor.paint': 'Wybierz kolor i kliknij na komórki, aby je pokolorować.',
        'guide.hexcolor.eyedropper': 'Pipeta: Pobierz kolor z mapy.',
        'guide.hexcolor.palette': 'Prawy przycisk na miejsce palety = Ustaw nowy kolor.',
        'guide.symbols': 'Symbole',
        'guide.symbols.groups': 'Wybierz grupę narzędzi (Dodatki, Roślinność, Góra, Budynek).',
        'guide.symbols.variant': 'Prawy przycisk = Wybór wariantu symbolu.',
        'guide.symbols.colors': 'Aktualny kolor główny określa kolor symbolu.',
        'guide.drawing': 'Tryby rysowania',
        'guide.drawing.pen': 'Kliknij lub przeciągnij, aby rysować.',
        'guide.drawing.fill': 'Wypełnij obszar aktywnym kolorem lub symbolem.',
        'guide.drawing.eraser': 'Usuń komórkę, symbol lub odcinek drogi/rzeki kliknięciem (podwójne kliknięcie = usuń przyległe elementy).',
        'guide.drawing.rightclick': 'Prawy przycisk = Gumka (przytrzymaj + przeciągnij = usuń wiele elementów, podwójne kliknięcie = usuń przyległe).',
        'guide.pattern': 'Narzędzie wzoru',
        'guide.pattern.stamp': 'Umieść wzór na komórkach. Przeciągnij, aby rysować wzorem.',
        'guide.pattern.pick': 'Pobierz istniejący wzór, aby nim rysować.',
        'guide.paths': 'Rzeki i drogi',
        'guide.paths.river': 'Ustaw punkty trasy dla rzek. Końce rzek zwężają się w ślepych uliczkach. Podwójne kliknięcie punktu końcowego zamyka rzekę (tylko bez rozgałęzień). Przeciągnij ostatni punkt na przedostatni, aby wyłączyć zwężanie na tym końcu.',
        'guide.paths.road': 'Ustaw punkty trasy dla dróg.',
        'guide.paths.pick': 'Wybierz i edytuj istniejącą rzekę/drogę.',
        'guide.paths.width': 'Dostosuj szerokość rzek/dróg za pomocą pól wartości.',
        'guide.paths.dashes': 'Dzieli każdy segment komórki na naprzemienne kreski i przerwy (1 = ciągła, 2 = pół linii, 3 = dwie kreski itd.).',
        'guide.borders': 'Granice',
        'guide.borders.draw': 'Rysuj region graniczny klikając lub przeciągając po komórkach.',
        'guide.borders.pick': 'Wybierz istniejącą granicę do edycji.',
        'guide.borders.dash': 'Dzieli każdą krawędź komórki na naprzemienne kreski i przerwy (1 = ciągła, 2 = pół linii, 3 = dwie kreski itd.).',
        'guide.borders.visibility': 'Pokaż/ukryj granice na mapie.',
        'guide.text': 'Tekst',
        'guide.text.tool': 'Kliknij na mapę, aby ustawić treść, rozmiar, kolor i format tekstu.<br>Kliknij ponownie na tekst, aby go edytować.<br>Przeciągnij, aby przesunąć.',
        'guide.undoredo': 'Cofnij / Ponów',
        'guide.undoredo.undo': 'Ctrl+Z = Cofnij',
        'guide.undoredo.redo': 'Ctrl+Y = Ponów',
        'guide.print': 'Drukowanie / Eksport',
        'guide.print.pc': 'Menu trzech kropek → „Drukuj mapę" otwiera okno drukowania (PC).',
        'guide.print.export': 'Menu trzech kropek → „Eksportuj jako obraz" zapisuje mapę jako JPEG lub PNG.',
        'guide.print.exportMobile': 'Na urządzeniach mobilnych obraz jest zapisywany w folderze „Hex Cartographer Export" obok pliku mapy.',
        'guide.touch': 'Informacje dla użytkowników z ekranem dotykowym',
        'guide.touch.tap': 'Dotknij = Ustaw, umieść, wybierz.<br>Przeciągnij jednym palcem = Rysuj.',
        'guide.touch.longpress': 'Długie przytrzymanie na przyciskach narzędzi = np. wybór wariantu symbolu lub zmiana koloru palety.',
        'guide.touch.zoom': 'Szczypanie dwoma palcami = Zoom.',
        'guide.touch.pan': 'Przeciąganie dwoma palcami = Przesuwanie mapy.',
        'modal.colorPickerTitle': 'Wybierz kolor',
        'modal.colorPickerCancel': 'Anuluj',
        'tooltip.colorEyedropper': 'Pipeta\nDotknij mapy, aby pobrać dowolny kolor',
        'notice.tapToPickColor': 'Dotknij komórki, aby pobrać kolor',
        'notice.colorPicked': 'Kolor pobrany',
        'notice.noColorAtPosition': 'Brak koloru w tej pozycji',
        'menu.createNew': 'Utwórz nową mapę Hex Cartographer',
        'menu.openInEditor': 'Otwórz w Hex Cartographer',
        'menu.printMap': 'Drukuj mapę',
        'menu.shareMap': 'Udostępnij mapę',
        'menu.exportMap': 'Eksportuj jako obraz',
        'notice.noContentToPrint': 'Brak zawartości mapy do wydrukowania',
        'notice.exportSaved': 'Wyeksportowano do',
        'modal.exportTitle': 'Eksportuj jako obraz',
        'modal.exportFormat': 'Format',
        'modal.exportQuality': 'Jakość',
        'modal.exportExport': 'Eksportuj',
    },

    it: {
        'tool.extras': 'Extra',
        'tool.vegetation': 'Vegetazione',
        'tool.mountain': 'Montagna',
        'tool.building': 'Edificio',
        'variant.question': 'Punto interrogativo',
        'variant.exclamation': 'Punto esclamativo',
        'variant.cross': 'Croce',
        'variant.dot': 'Punto di partenza/arrivo',
        'variant.grass': 'Erba',
        'variant.swamp': 'Palude',
        'variant.bush': 'Cespuglio',
        'variant.tree': 'Albero deciduo',
        'variant.pine': 'Conifera',
        'variant.palm': 'Palma',
        'variant.hill': 'Collina',
        'variant.mountain': 'Montagna',
        'variant.tent': 'Tenda',
        'variant.house': 'Casa',
        'variant.village': 'Villaggio',
        'variant.town': 'Città',
        'variant.castle': 'Castello',
        'variant.monastery': 'Monastero',
        'variant.harbor': 'Porto',
        'variant.tower': 'Torre',
        'variant.ruin': 'Rovina',
        'variant.cave': 'Grotta',
        'variant.oasis': 'Oasi',
        'tooltip.editMode': 'Modalità modifica\nClic: Mostra/nascondi strumenti',
        'tooltip.colorPicker': 'Colore attuale\nClic: Apri selettore colore',
        'tooltip.hexColor': 'Celle\nClic: Colora celle\nClic destro sulla mappa: Elimina',
        'tooltip.fill': 'Secchio di riempimento\nClic: Riempi area contigua\nClic di nuovo: Disattiva secchio di riempimento',
        'tooltip.text': 'Strumento testo\nClic sulla mappa: Crea nuovo testo\nClic sul testo: Modifica/sposta testo\nClic destro su testo nella mappa: Elimina testo',
        'tooltip.eraser': 'Gomma\nClic: Cancella contenuto cella\nDoppio clic: Cancella elementi contigui',
        'tooltip.undo': 'Annulla\nCtrl+Z: Annulla ultima azione',
        'tooltip.redo': 'Ripeti\nCtrl+Y: Ripeti azione annullata',
        'tooltip.fit': 'Adatta mappa\nClic: Adatta finestra all\'intera mappa',
        'tooltip.palette': 'Tavolozza colori\nClic: Usa come colore attuale\nClic destro: Cambia colore tavolozza',
        'tooltip.toolGroup': '{name}\nClic: Disegna\nClic destro: Scegli variante\nClic destro sulla mappa: Elimina',
        'tooltip.toolGroupVariant': '{label}\nClic: Disegna\nClic destro: Scegli variante\nClic destro sulla mappa: Elimina',
        'tooltip.pattern': 'Strumento motivo\nClic: Disegna con motivo acquisito\nClic destro sulla mappa: Elimina\nDoppio clic gomma: Cancella motivo contiguo',
        'tooltip.patternPicker': 'Acquisisci motivo\nClic: Usa cella come motivo',
        'tooltip.river': 'Strumento fiume\nClic: Posiziona/sposta punti di percorso\nDoppio clic punto finale: Chiudi fiume (solo senza diramazioni)\nClic destro sulla mappa: Cancella segmento\nDoppio clic gomma: Cancella intero fiume',
        'tooltip.road': 'Strumento strada\nClic: Posiziona/sposta punti di percorso\nClic destro sulla mappa: Cancella segmento\nDoppio clic gomma: Cancella intera strada',
        'tooltip.pathPicker': 'Acquisisci fiume/strada\nClic: Seleziona fiume/strada esistente',
        'tooltip.pathFinish': 'Completa\nClic: Completa fiume/strada corrente',
        'tooltip.roadFinish': 'Completa strada',
        'tooltip.riverFinish': 'Completa fiume',
        'input.riverWidth': 'Larghezza fiume',
        'input.roadWidth': 'Larghezza strada',
        'input.pathDashes': 'Tratti',
        'tooltip.border': 'Strumento confine\nClic: Disegna celle di confine\nClic destro sulla mappa: Elimina\nDoppio clic gomma: Cancella confine contiguo',
        'tooltip.borderPicker': 'Acquisisci colore confine\nClic: Seleziona confine esistente per modificare',
        'tooltip.borderFinish': 'Completa\nClic: Completa confine corrente',
        'tooltip.borderVisibility': 'Visibilità confini\nClic: Mostra/nascondi confini',
        'input.borderDashes': 'Tratti',
        'notice.fileCreateError': 'Errore nella creazione del file: {error}',
        'notice.nothingToUndo': 'Niente da annullare',
        'notice.nothingToRedo': 'Niente da ripetere',
        'notice.noHexesToShow': 'Nessuna cella o testo da visualizzare',
        'notice.noPattern': 'Nessun motivo selezionato. Usa il pulsante picker per acquisire un motivo.',
        'notice.clickToPickPattern': 'Clicca su una cella per acquisire il motivo',
        'notice.patternPicked': 'Motivo acquisito!',
        'notice.noHexAtPosition': 'Nessuna cella in questa posizione',
        'notice.riverSelected': 'Fiume #{id} selezionato',
        'notice.roadSelected': 'Strada #{id} selezionata',
        'notice.noRiverOrRoad': 'Nessun fiume o strada in questa posizione',
        'notice.borderSelected': 'Confine #{id} selezionato',
        'notice.noBorderAtPosition': 'Nessun confine in questa posizione',
        'modal.selectFile': 'Seleziona file MD',
        'modal.searchFile': 'Cerca nome file...',
        'modal.noFilesFound': 'Nessun file trovato',
        'modal.removeLink': 'Rimuovi link',
        'modal.cancel': 'Annulla',
        'modal.formatText': 'Formatta testo',
        'modal.displayText': 'Testo visualizzato:',
        'modal.textPlaceholder': 'Inserisci testo...',
        'modal.textSize': 'Dimensione testo:',
        'modal.textColor': 'Colore testo:',
        'modal.palette': 'Tavolozza:',
        'modal.formatting': 'Formattazione:',
        'modal.outline': 'Contorno',
        'modal.bold': 'Grassetto',
        'modal.shadowSettings': 'Impostazioni ombra:',
        'modal.shadowEnable': 'Attiva ombra',
        'modal.shadowDistance': 'Distanza (px):',
        'modal.shadowOpacity': 'Trasparenza (%):',
        'modal.linkToFile': 'Link a file MD:',
        'modal.noLinkSelected': 'Nessun link selezionato',
        'modal.selectFileBtn': 'Scegli file...',
        'modal.deleteText': 'Elimina testo',
        'modal.confirmDeleteText': 'Eliminare davvero il testo?',
        'settings.exportWidth': 'Larghezza predefinita per l\'esportazione di immagini in pixel.',
        'settings.exportWidthDesc': 'Larghezza predefinita in pixel durante l\'esportazione come immagine.',
        'settings.showCrosshair': 'Mostra mirino',
        'settings.showCrosshairDesc': 'Mostra un mirino al centro della mappa.',
        'settings.donateText': 'Offrimi un caffè. Sono felice di mettere Hex Cartographer a vostra disposizione gratuitamente. Tuttavia, lo sviluppo ha richiesto molto tempo. Se mi viene in mente qualcosa di nuovo, ci saranno aggiornamenti per voi. Mi farebbe molto piacere se lasciaste una piccola donazione per questo lavoro.',
        'settings.donateButton': 'Offri un caffè',
        'guide.title': 'Guida rapida',
        'guide.basics': 'Nozioni di base',
        'guide.basics.create': 'Clic destro su una cartella nel browser file → «Crea nuova mappa Hex Cartographer».',
        'guide.basics.editMode': 'Attiva/disattiva modalità modifica.',
        'guide.navigation': 'Navigazione',
        'guide.navigation.zoom': 'Rotella del mouse = Zoom.',
        'guide.navigation.pan': 'Pulsante centrale del mouse o Shift+trascinamento = Spostare mappa.',
        'guide.navigation.fit': 'Mostra mappa intera.',
        'guide.hexcolor': 'Colore cella',
        'guide.hexcolor.paint': 'Scegli colore e clicca sulle celle per colorarle.',
        'guide.hexcolor.eyedropper': 'Contagocce: Acquisisci colore dalla mappa.',
        'guide.hexcolor.palette': 'Clic destro su posto tavolozza = Imposta nuovo colore.',
        'guide.symbols': 'Simboli',
        'guide.symbols.groups': 'Scegli gruppo strumenti (Extra, Vegetazione, Montagna, Edificio).',
        'guide.symbols.variant': 'Clic destro = Selezione variante simbolo.',
        'guide.symbols.colors': 'Il colore principale corrente determina il colore del simbolo.',
        'guide.drawing': 'Modalità di disegno',
        'guide.drawing.pen': 'Clicca o trascina per disegnare.',
        'guide.drawing.fill': 'Riempi area con colore o simbolo attivo.',
        'guide.drawing.eraser': 'Cancella cella, simbolo o segmento di strada/fiume cliccando (doppio clic = cancella elementi contigui).',
        'guide.drawing.rightclick': 'Clic destro = Gomma (tieni premuto + trascina = cancella più elementi, doppio clic = cancella contigui).',
        'guide.pattern': 'Strumento motivo',
        'guide.pattern.stamp': 'Posiziona motivo sulle celle. Trascina per disegnare con il motivo.',
        'guide.pattern.pick': 'Acquisisci motivo esistente per disegnare con esso.',
        'guide.paths': 'Fiumi e strade',
        'guide.paths.river': 'Posiziona punti di percorso per fiumi. Le estremità dei fiumi si assottigliano nei vicoli ciechi. Doppio clic su un punto finale chiude il fiume (solo senza diramazioni). Trascinare l\'ultimo punto sul penultimo disattiva l\'assottigliamento a quella estremità.',
        'guide.paths.road': 'Posiziona punti di percorso per strade.',
        'guide.paths.pick': 'Seleziona e modifica fiume/strada esistente.',
        'guide.paths.width': 'Regola la larghezza di fiumi/strade tramite i campi di input.',
        'guide.paths.dashes': 'Divide ogni segmento di cella in tratti e spazi alternati (1 = continuo, 2 = mezza linea, 3 = due tratti ecc.).',
        'guide.borders': 'Confini',
        'guide.borders.draw': 'Disegna regione di confine cliccando o trascinando sulle celle.',
        'guide.borders.pick': 'Seleziona confine esistente per modificare.',
        'guide.borders.dash': 'Divide ogni bordo di cella in tratti e spazi alternati (1 = continuo, 2 = mezza linea, 3 = due tratti ecc.).',
        'guide.borders.visibility': 'Mostra/nascondi confini sulla mappa.',
        'guide.text': 'Testo',
        'guide.text.tool': 'Clicca sulla mappa per impostare contenuto, dimensione, colore e formato del testo.<br>Clicca di nuovo sul testo per modificarlo.<br>Trascina per spostare.',
        'guide.undoredo': 'Annulla / Ripeti',
        'guide.undoredo.undo': 'Ctrl+Z = Annulla',
        'guide.undoredo.redo': 'Ctrl+Y = Ripeti',
        'guide.print': 'Stampa / Esportazione',
        'guide.print.pc': 'Menu tre punti → «Stampa mappa» apre la finestra di stampa (PC).',
        'guide.print.export': 'Menu tre punti → «Esporta come immagine» salva la mappa come JPEG o PNG.',
        'guide.print.exportMobile': 'Sui dispositivi mobili, l\'immagine viene salvata nella cartella «Hex Cartographer Export» accanto al file della mappa.',
        'guide.touch': 'Informazioni per utenti con schermo touch',
        'guide.touch.tap': 'Tocca = Posiziona, piazza, seleziona.<br>Scorri con un dito = Disegna.',
        'guide.touch.longpress': 'Pressione prolungata sui pulsanti strumento = ad es. scegliere variante simbolo o cambiare colore tavolozza.',
        'guide.touch.zoom': 'Pizzico con due dita = Zoom.',
        'guide.touch.pan': 'Trascinamento con due dita = Spostare mappa.',
        'modal.colorPickerTitle': 'Scegli colore',
        'modal.colorPickerCancel': 'Annulla',
        'tooltip.colorEyedropper': 'Contagocce\nTocca la mappa per acquisire qualsiasi colore',
        'notice.tapToPickColor': 'Tocca una cella per acquisire il colore',
        'notice.colorPicked': 'Colore acquisito',
        'notice.noColorAtPosition': 'Nessun colore in questa posizione',
        'menu.createNew': 'Crea nuova mappa Hex Cartographer',
        'menu.openInEditor': 'Apri in Hex Cartographer',
        'menu.printMap': 'Stampa mappa',
        'menu.shareMap': 'Condividi mappa',
        'menu.exportMap': 'Esporta come immagine',
        'notice.noContentToPrint': 'Nessun contenuto della mappa da stampare',
        'notice.exportSaved': 'Esportato in',
        'modal.exportTitle': 'Esporta come immagine',
        'modal.exportFormat': 'Formato',
        'modal.exportQuality': 'Qualità',
        'modal.exportExport': 'Esporta',
    },
};

// Übersetzungsfunktion mit Fallback auf Englisch und Platzhalterersetzung
function t(key, params) {
    let str = TRANSLATIONS[currentLanguage]?.[key]
           ?? TRANSLATIONS['en'][key]
           ?? key;
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            str = str.replace(`{${k}}`, v);
        }
    }
    return str;
}

// === HSB/RGB/Hex Konvertierung ===
function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    return { r: parseInt(hex.substring(0, 2), 16), g: parseInt(hex.substring(2, 4), 16), b: parseInt(hex.substring(4, 6), 16) };
}
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}
function rgbToHsb(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d !== 0) {
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
    }
    return { h: h * 360, s: max === 0 ? 0 : (d / max) * 100, b: max * 100 };
}
function hsbToRgb(h, s, b) {
    h /= 360; s /= 100; b /= 100;
    const i = Math.floor(h * 6), f = h * 6 - i, p = b * (1 - s), q = b * (1 - f * s), t = b * (1 - (1 - f) * s);
    let r, g, bl;
    switch (i % 6) {
        case 0: r = b; g = t; bl = p; break; case 1: r = q; g = b; bl = p; break;
        case 2: r = p; g = b; bl = t; break; case 3: r = p; g = q; bl = b; break;
        case 4: r = t; g = p; bl = b; break; case 5: r = b; g = p; bl = q; break;
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(bl * 255) };
}
function hsbToHex(h, s, b) { const rgb = hsbToRgb(h, s, b); return rgbToHex(rgb.r, rgb.g, rgb.b); }
function hexToHsb(hex) { const rgb = hexToRgb(hex); return rgbToHsb(rgb.r, rgb.g, rgb.b); }

const DEFAULT_SETTINGS = { exportWidth: 1024, showCrosshair: true };

// === Hauptklasse des Plugins ===
class HexCartographerPlugin extends Plugin {
    async onload() {
        await this.loadSettings();
        currentLanguage = getObsidianLanguage();
        this.addSettingTab(new HexCartographerSettingTab(this.app, this));

        this.registerView('hex-cartographer', (leaf) => new HexCartographerView(leaf, this));

        this.registerExtensions(['hexcartographer.md'], 'hex-cartographer');

        this.registerEvent(
            this.app.workspace.on('file-open', async (file) => {
                if (!file || !file.path) return;
                if (file.path.endsWith('.hexcartographer.md')) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    const leaf = this.app.workspace.activeLeaf;
                    if (!leaf) return;
                    if (leaf.view.getViewType() === 'markdown') {
                        await leaf.setViewState({
                            type: 'hex-cartographer',
                            state: { file: file.path }
                        });
                    }
                }
            })
        );

        setTimeout(() => {
            this.hideHexExtensionInExplorer();
        }, 500);

        this.registerEvent(this.app.vault.on('rename', async (file, oldPath) => {
            if (oldPath.endsWith('.hexcartographer.md') && !file.path.endsWith('.hexcartographer.md')) {
                const newName = file.name.replace(/\.md$/, '') + '.hexcartographer.md';
                const newPath = file.parent ? `${file.parent.path}/${newName}` : newName;


                await this.app.fileManager.renameFile(file, newPath);
            } else if (file.path.endsWith('.hexcartographer.md')) {
                this.hideHexExtensionInExplorer();
            }
        }));

        this.addRibbonIcon('map', 'Create Hex Map', async () => {
            await this.createNewHexMap();
        });

        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                menu.addItem((item) => {
                    item
                        .setTitle(t('menu.createNew'))
                        .setIcon('map')
                        .setSection('create')
                        .onClick(async () => {
                            await this.createNewHexMap(file);
                        });
                });
            })
        );

        this.registerEvent(this.app.vault.on('delete', (file) => {
            const leaves = this.app.workspace.getLeavesOfType('hex-cartographer');
            leaves.forEach(leaf => {
                if (leaf.view instanceof HexCartographerView && leaf.view.file && leaf.view.file.path === file.path) {
                    if (leaf.view.saveTimeout) clearTimeout(leaf.view.saveTimeout);
                    leaf.detach();
                }
            });
        }));

        this.registerEvent(this.app.vault.on('modify', (file) => {
            const leaves = this.app.workspace.getLeavesOfType('hex-cartographer');
            leaves.forEach(leaf => {
                const view = leaf.view;
                if (view instanceof HexCartographerView && view.file && view.file.path === file.path) {
                    if (!view.isSaving) {
                        view.reloadFile();
                    }
                }
            });
        }));

        this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
            const leaves = this.app.workspace.getLeavesOfType('hex-cartographer');
            leaves.forEach((leaf) => {
                const view = leaf.view;
                if (view instanceof HexCartographerView && view.file &&
                    (view.file.path === oldPath || view.file === file)) {
                    view.file = file;
                }
            });
            setTimeout(() => {
                const allLeaves = this.app.workspace.getLeavesOfType('hex-cartographer');
                allLeaves.forEach((leaf) => {
                    const view = leaf.view;
                    if (view instanceof HexCartographerView && view.file) {
                        leaf.updateHeader();
                        const titleEl = leaf.tabHeaderEl?.querySelector('.workspace-tab-header-inner-title');
                        if (titleEl) {
                            titleEl.textContent = view.getDisplayText();
                        }
                    }
                });
            }, 300);
        }));

        this.registerEvent(this.app.workspace.on('file-open', (file) => {
            if (!file || file.extension !== 'hexcartographer') return;

            const leaves = this.app.workspace.getLeavesOfType('hex-cartographer');
            leaves.forEach((leaf) => {
                const view = leaf.view;
                if (view instanceof HexCartographerView && view.file && view.file.path === file.path) {
                    view.reloadFile();
                }
            });
        }));

        this.registerEvent(this.app.workspace.on('active-leaf-change', (leaf) => {
            document.querySelectorAll('.nav-file-title.hex-active').forEach(el => {
                el.classList.remove('is-active');
                el.classList.remove('hex-active');
            });

            if (leaf?.view instanceof HexCartographerView && leaf.view.file) {
                setTimeout(() => {
                    document.querySelectorAll('.nav-file-title.is-active').forEach(el => {
                        el.classList.remove('is-active');
                    });
                    const fileEl = document.querySelector(`.nav-file-title[data-path="${CSS.escape(leaf.view.file.path)}"]`);
                    if (fileEl) {
                        fileEl.classList.add('is-active');
                        fileEl.classList.add('hex-active');
                    }
                }, 50);
            } else if (leaf?.view?.file) {
                setTimeout(() => {
                    const fileEl = document.querySelector(`.nav-file-title[data-path="${CSS.escape(leaf.view.file.path)}"]`);
                    if (fileEl && !fileEl.classList.contains('is-active')) {
                        fileEl.classList.add('is-active');
                    }
                }, 100);
            }
        }));

        this.app.workspace.onLayoutReady(() => {
            setTimeout(() => {
                const activeLeaf = this.app.workspace.activeLeaf;
                if (!activeLeaf) return;
                const state = activeLeaf.getViewState();
                const filePath = state?.state?.file ||
                    (activeLeaf.view instanceof HexCartographerView && activeLeaf.view.file?.path);
                if (state?.type === 'hex-cartographer' && filePath) {
                    const fileEl = document.querySelector(`.nav-file-title[data-path="${CSS.escape(filePath)}"]`);
                    if (fileEl) {
                        fileEl.classList.add('is-active');
                        fileEl.classList.add('hex-active');
                    }
                }
            }, 500);
        });
    }

    async createNewHexMap(targetFile = null) {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const fileName = `HexMap_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${pad(now.getDate())}${pad(now.getMonth() + 1)}${String(now.getFullYear()).slice(-2)}.hexcartographer.md`;

        let folderPath = '';
        if (targetFile) {
            if (targetFile.children) {
                folderPath = targetFile.path;
            }
            else if (targetFile.parent) {
                folderPath = targetFile.parent.path;
            }
        }

        const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;

        const initialData = {
            hexes: {},
            rivers: [],
            roads: [],
            texts: [],
            borders: [],
            gridSize: 30,
            zoom: 1,
            offX: 400,
            offY: 300,
            settings: {
                colorPalette: [...DEFAULT_PALETTE],
                colorPalette2: [...DEFAULT_PALETTE2],
                activeColorSlot: 0,
                drawMode: 'pen',
                currentToolGroup: 'hexcolor',
                patternData: null,
                patternSourceHex: null
            }
        };

        try {
            const now = new Date().toISOString().split('T')[0];
            const frontmatter = `---\ntype: hexcartographer\ncreated: ${now}\n---\n\n`;
            const jsonData = JSON.stringify(initialData, null, 2);
            const content = `${frontmatter}# ${fileName.replace('.hexcartographer.md', '')}\n\n\`\`\`json\n${jsonData}\n\`\`\`\n`;

            const file = await this.app.vault.create(filePath, content);
            const leaf = this.app.workspace.getLeaf(false);
            await leaf.setViewState({
                type: 'hex-cartographer',
                active: true,
                state: { file: file.path }
            });
        } catch (err) {
            new Notice(t('notice.fileCreateError', { error: err }));
        }
    }

    hideHexExtensionInExplorer() {
        const hideExtension = () => {
            const fileElements = document.querySelectorAll('.nav-file-title[data-path$=".hexcartographer.md"]');
            fileElements.forEach(el => {
                const titleEl = el.querySelector('.nav-file-title-content');
                if (titleEl && titleEl.textContent.includes('.hexcartographer')) {
                    titleEl.textContent = titleEl.textContent.replace('.hexcartographer', '');
                }

                if (!el.classList.contains('hex-cartographer-file')) {
                    el.classList.add('hex-cartographer-file');
                }
            });
        };

        hideExtension();

        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    shouldUpdate = true;
                }
            });
            if (shouldUpdate) {
                hideExtension();
            }
        });

        const fileExplorer = document.querySelector('.nav-files-container');
        if (fileExplorer) {
            observer.observe(fileExplorer, {
                childList: true,
                subtree: true,
                characterData: true
            });

            this.register(() => observer.disconnect());
        }

        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                setTimeout(hideExtension, 100);
            })
        );

        const intervalId = setInterval(hideExtension, 2000);
        this.register(() => clearInterval(intervalId));
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

// === View-Klasse für den Hex Cartographer ===
class HexCartographerView extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.navigation = true;
        this.plugin = plugin;
        this.file = null;
        this.data = { hexes: {}, rivers: [], roads: [], texts: [], borders: [], gridSize: DEFAULT_GRID_SIZE, zoom: 1, offX: DEFAULT_OFF_X, offY: DEFAULT_OFF_Y };

        this.history = [];
        this.redoStack = [];
        this.maxHistory = MAX_HISTORY;

        this.saveTimeout = null;
        this.isMouseDown = false;
        this.isDraggingMap = false;
        this.lastHex = null;
        this.lastErasedHex = null;
        this.isReloading = false;
        this.isSaving = false;
        this.draggedText = null;

        this.startHex = null;
        this.borderSettings = { dashes: DEFAULT_BORDER_DASHES, activeRegionId: null, pickedHex: null, visible: true };
        this.borderHighlightWidth = DEFAULT_BORDER_HIGHLIGHT_WIDTH;
        this.borderPickMode = false;
        this.riverSettings = { width: DEFAULT_RIVER_WIDTH, activeRiverId: null, editMode: false, insertAfter: null };
        this.roadSettings = { width: DEFAULT_ROAD_WIDTH, activeRoadId: null, editMode: false, insertAfter: null };
        this.pathDashes = DEFAULT_PATH_DASHES;
        this.pathPickMode = false;
        this.lastToolGroup = null;
        // Wie weit Pfad-Endpunkte ins Hex reichen: 0 = Hex-Rand, 1 = Hex-Zentrum
        this.pathEndInset = PATH_END_INSET;
        this.riverDragIndex = null;
        this.roadDragIndex = null;
        this.lastWaypointClick = null;
        this.pendingHistory = false;

        this.masterColor = DEFAULT_MASTER_COLOR;
        this.hexColorColor = DEFAULT_PALETTE[0];

        this.colorPalette = [...DEFAULT_PALETTE];
        this.colorPalette2 = [...DEFAULT_PALETTE2];
        this.activeColorSlot = 0; // Standardfarbe: erste Palettenfarbe
        this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        this.colorPickMode = false;

        this.initToolConfigs();

        this.editMode = false; // Edit-Modus: true = Werkzeuge sichtbar, false = nur Navigation
        this.drawMode = 'pen'; // pen, fill, eraser
        this.currentToolGroup = null; // grass, tree, mountain, building, oder null für Farbpalette

        this.patternData = null;
        this.patternPickMode = false;
        this.patternSourceHex = null; // Speichert q/r der Musterwabe

        this.svgSymbols = {};
        this.svgSymbolsLoaded = false;
        this.svgLoadPromise = this.loadSVGSymbols();

        this.svgSymbolConfig = SVG_SYMBOL_CONFIG;

        this.lastUsedTextSize = DEFAULT_TEXT_SIZE;
        this.lastUsedTextColor = DEFAULT_TEXT_COLOR;
        this.lastUsedTextOutline = true;
        this.lastUsedTextBold = false;
        this.lastUsedTextShadow = false;
        this.lastUsedTextShadowDistance = DEFAULT_SHADOW_DISTANCE;
        this.lastUsedTextShadowOpatown = DEFAULT_SHADOW_OPACITY;
    }

    initToolConfigs() {
        const ex = this.toolConfigs || {};
        this.toolConfigs = {
            grass: {
                name: t('tool.extras'),
                variants: [
                    { id: 'question', label: t('variant.question'), icon: 'help-circle' },
                    { id: 'exclamation', label: t('variant.exclamation'), icon: 'alert-circle' },
                    { id: 'cross', label: t('variant.cross'), icon: 'x' },
                    { id: 'dot', label: t('variant.dot'), icon: 'circle' }
                ],
                currentVariant: ex.grass?.currentVariant || 'question',
                symbolColor: ex.grass?.symbolColor || DEFAULT_EXTRAS_SYMBOL_COLOR,
                backgroundColor: ex.grass?.backgroundColor || DEFAULT_EXTRAS_BG_COLOR,
                backgroundEnabled: ex.grass?.backgroundEnabled || false
            },
            tree: {
                name: t('tool.vegetation'),
                variants: [
                    { id: 'grass', label: t('variant.grass'), icon: 'sprout' },
                    { id: 'swamp', label: t('variant.swamp'), icon: 'waves' },
                    { id: 'bush', label: t('variant.bush'), icon: 'leaf' },
                    { id: 'tree', label: t('variant.tree'), icon: 'trees' },
                    { id: 'pine', label: t('variant.pine'), icon: 'triangle' },
                    { id: 'palm', label: t('variant.palm'), icon: 'palmtree' }
                ],
                currentVariant: ex.tree?.currentVariant || 'tree',
                symbolColor: ex.tree?.symbolColor || DEFAULT_VEGETATION_SYMBOL_COLOR,
                backgroundColor: ex.tree?.backgroundColor || DEFAULT_VEGETATION_BG_COLOR,
                backgroundEnabled: ex.tree?.backgroundEnabled || false
            },
            mountain: {
                name: t('tool.mountain'),
                variants: [
                    { id: 'hill', label: t('variant.hill'), icon: 'chevron-up' },
                    { id: 'mountain', label: t('variant.mountain'), icon: 'mountain' }
                ],
                currentVariant: ex.mountain?.currentVariant || 'mountain',
                symbolColor: ex.mountain?.symbolColor || DEFAULT_MOUNTAIN_SYMBOL_COLOR,
                backgroundColor: ex.mountain?.backgroundColor || DEFAULT_MOUNTAIN_BG_COLOR,
                backgroundEnabled: ex.mountain?.backgroundEnabled || false
            },
            building: {
                name: t('tool.building'),
                variants: [
                    { id: 'tent', label: t('variant.tent'), icon: 'tent' },
                    { id: 'house', label: t('variant.house'), icon: 'home' },
                    { id: 'village', label: t('variant.village'), icon: 'school' },
                    { id: 'town', label: t('variant.town'), icon: 'castle' },
                    { id: 'castle', label: t('variant.castle'), icon: 'shield' },
                    { id: 'monastery', label: t('variant.monastery'), icon: 'church' },
                    { id: 'harbor', label: t('variant.harbor'), icon: 'ship' },
                    { id: 'tower', label: t('variant.tower'), icon: 'tower' },
                    { id: 'ruin', label: t('variant.ruin'), icon: 'archive' },
                    { id: 'cave', label: t('variant.cave'), icon: 'circle' },
                    { id: 'oasis', label: t('variant.oasis'), icon: 'droplet' }
                ],
                currentVariant: ex.building?.currentVariant || 'house',
                symbolColor: ex.building?.symbolColor || DEFAULT_BUILDING_SYMBOL_COLOR,
                backgroundColor: ex.building?.backgroundColor || DEFAULT_BUILDING_BG_COLOR,
                backgroundEnabled: ex.building?.backgroundEnabled || false
            }
        };
    }

    rebuildToolbar() {
        const toolbar = this.containerEl.querySelector('.hex-toolbar');
        if (!toolbar) return;
        toolbar.empty();
        this.createToolbar(toolbar);
        this.updateToolbarState(toolbar);
        if (this.editMode) {
            this.recalcToolbarWidths();
        }
    }

    getViewType() { return 'hex-cartographer'; }
    getDisplayText() {
        if (!this.file) return 'Hex Cartographer';
        return this.file.basename.replace('.hexcartographer', '');
    }
    getState() { return { file: this.file ? this.file.path : null }; }

    getIcon() { return 'map'; }

    onPaneMenu(menu, source) {
        if (source === 'more-options') {
            menu.addItem((item) => {
                item.setTitle(t('menu.exportMap'))
                    .setIcon('download')
                    .onClick(() => {
                        const mapSize = this.getMapWorldSize();
                        if (!mapSize) { new Notice(t('notice.noContentToPrint')); return; }
                        new ExportMapModal(this.app, mapSize, this.plugin.settings.exportWidth, async (format, width, quality) => {
                            const tmpCanvas = this.renderFullMap({ targetWidth: width });
                            if (!tmpCanvas) { new Notice(t('notice.noContentToPrint')); return; }
                            const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
                            const ext = format === 'jpeg' ? '.jpg' : '.png';
                            const baseName = this.file ? this.file.basename.replace('.hexcartographer', '') : 'hex-cartographer-map';
                            const blob = await new Promise(resolve => tmpCanvas.toBlob(resolve, mimeType, format === 'jpeg' ? quality / 100 : undefined));
                            if (this.isTouchDevice) {
                                // Mobil: In Export-Unterordner neben der .hexcartographer-Datei speichern
                                const parentFolder = this.file ? this.file.parent.path : '';
                                const exportFolder = parentFolder ? `${parentFolder}/Hex Cartographer Export` : 'Hex Cartographer Export';
                                if (!this.app.vault.getAbstractFileByPath(exportFolder)) {
                                    await this.app.vault.createFolder(exportFolder);
                                }
                                const fileName = baseName + ext;
                                const filePath = `${exportFolder}/${fileName}`;
                                const buffer = await blob.arrayBuffer();
                                const existing = this.app.vault.getAbstractFileByPath(filePath);
                                if (existing) { await this.app.vault.modifyBinary(existing, buffer); }
                                else { await this.app.vault.createBinary(filePath, buffer); }
                                new Notice(`${t('notice.exportSaved')}: ${filePath}`);
                            } else {
                                const link = document.createElement('a');
                                link.href = URL.createObjectURL(blob);
                                link.download = baseName + ext;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                setTimeout(() => URL.revokeObjectURL(link.href), 5000);
                            }
                        }).open();
                    });
            });

            if (!this.isTouchDevice) {
                menu.addItem((item) => {
                    item.setTitle(t('menu.printMap'))
                        .setIcon('printer')
                        .onClick(() => {
                            const tmpCanvas = this.renderFullMap();
                            if (!tmpCanvas) { new Notice(t('notice.noContentToPrint')); return; }
                            const dataUrl = tmpCanvas.toDataURL('image/png');
                            const title = this.file ? this.file.basename.replace('.hexcartographer', '') : 'Hex Cartographer Map';
                            const iframe = document.createElement('iframe');
                            iframe.style.position = 'fixed';
                            iframe.style.left = '-9999px';
                            iframe.style.width = '0';
                            iframe.style.height = '0';
                            document.body.appendChild(iframe);
                            const doc = iframe.contentDocument || iframe.contentWindow.document;
                            doc.open();
                            doc.write(`<html><head><title>${title}</title><style>@media print { @page { margin: 10mm; } body { margin: 0; } img { max-width: 100%; max-height: 100%; } } body { margin: 0; }</style></head><body><img src="${dataUrl}" /></body></html>`);
                            doc.close();
                            iframe.contentWindow.onafterprint = () => { document.body.removeChild(iframe); };
                            setTimeout(() => { iframe.contentWindow.print(); }, 200);
                        });
                });
            }
        }
        super.onPaneMenu(menu, source);
    }

    async loadSVGSymbols() {
        for (const [key, data] of Object.entries(SVG_SYMBOL_DATA)) {
            this.svgSymbols[key] = { pathData: data.pathData, viewBoxWidth: data.viewBoxWidth };
        }

        const symbolsDir = '.obsidian/plugins/hex-cartographer/symbols';
        try {
            const listing = await this.app.vault.adapter.list(symbolsDir);
            if (listing && listing.files && listing.files.length > 0) {
                for (const filePath of listing.files) {
                    if (!filePath.endsWith('.svg')) continue;
                    const filename = filePath.split('/').pop();
                    const key = filename.replace(/-\d+\.svg$/, '');
                    try {
                        const svgContent = await this.app.vault.adapter.read(filePath);
                        const parser = new DOMParser();
                        const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
                        const svgElement = svgDoc.querySelector('svg');
                        const pathElement = svgDoc.querySelector('path');
                        if (pathElement && svgElement) {
                            const pathData = pathElement.getAttribute('d');
                            const viewBox = svgElement.getAttribute('viewBox');
                            let viewBoxWidth = 100;
                            if (viewBox) {
                                viewBoxWidth = parseFloat(viewBox.split(' ')[2]);
                            }
                            this.svgSymbols[key] = { pathData, viewBoxWidth };
                            console.log(`SVG from file: ${key}`);
                        }
                    } catch (e) {
                        console.log(`Could not read SVG file: ${filename}`);
                    }
                }
            }
        } catch (e) {
        }

        this.svgSymbolsLoaded = true;
    }

    updateToolConfigsWithAvailableSVGs() {
        ['grass', 'tree', 'mountain', 'building'].forEach(groupId => {
            const config = this.toolConfigs[groupId];
            if (config && config.variants) {
                const firstAvailableSVG = config.variants.find(v => this.svgSymbols[v.id]);
                if (firstAvailableSVG) {
                    config.currentVariant = firstAvailableSVG.id;
                    console.log(`✓ Set default variant for ${groupId}: ${firstAvailableSVG.id}`);
                }
            }
        });
    }

    updateToolGroupButtonIcons() {
        if (!this.containerEl) return;

        const toolbar = this.containerEl.querySelector('.hex-toolbar');
        if (!toolbar) return;

        ['grass', 'tree', 'mountain', 'building'].forEach(groupId => {
            const config = this.toolConfigs[groupId];
            if (!config) return;

            const wrapper = toolbar.querySelector(`[data-tool-group-wrapper="${groupId}"]`);
            if (!wrapper) return;

            const btn = wrapper.querySelector('.hex-tool-btn');
            if (!btn) return;

            const currentVariant = config.variants.find(v => v.id === config.currentVariant);
            if (!currentVariant) return;

            if (this.svgSymbols[currentVariant.id]) {
                const symbolInfo = this.svgSymbols[currentVariant.id];
                btn.innerHTML = `<svg viewBox="0 0 ${symbolInfo.viewBoxWidth} ${symbolInfo.viewBoxWidth}"
                                      width="16" height="16" style="vertical-align: middle;">
                    <path d="${symbolInfo.pathData}" fill="currentColor"/>
                </svg>`;
                console.log(`✓ Updated button icon for ${groupId} to ${currentVariant.id}`);
            } else {
                btn.innerHTML = '';
                setIcon(btn, currentVariant.icon);
            }
        });
    }

    async setState(state, result) {
        if (state && state.file) {
            const file = this.app.vault.getAbstractFileByPath(state.file);
            if (file instanceof TFile) {
                this.file = file;
                await this.reloadFile();
            }
        }
        await super.setState(state, result);
    }

    async reloadFile() {
        if (!this.file || this.isReloading) return;
        this.isReloading = true;
        try {
            if (this.svgLoadPromise && !this.svgSymbolsLoaded) {
                await this.svgLoadPromise;
            }

            const content = await this.app.vault.read(this.file);

            let jsonContent = content;

            if (content.includes('```json')) {
                const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                    jsonContent = jsonMatch[1];
                }
            }

            const newData = JSON.parse(jsonContent);

            // KRITISCH: Validiere gridSize und repariere falls nötig
            if (!newData.gridSize || newData.gridSize < 1 || newData.gridSize > 1000 || !isFinite(newData.gridSize)) {
                console.warn('Invalid gridSize detected:', newData.gridSize, '- resetting to 30');
                newData.gridSize = 30;
            }

            if (!newData.zoom || newData.zoom < MIN_ZOOM || newData.zoom > MAX_ZOOM || !isFinite(newData.zoom)) {
                console.warn('Invalid zoom detected:', newData.zoom, '- resetting to 1');
                newData.zoom = 1;
            }

            if (Array.isArray(newData.hexes)) {
                const migratedHexes = {};
                newData.hexes.forEach(h => {
                    const key = `${h.q}_${h.r}`;
                    migratedHexes[key] = {
                        q: h.q,
                        r: h.r,
                        color: h.backgroundColor || h.color, // backgroundColor hat Vorrang
                        symbol: h.symbol,
                        symbolColor: h.symbolColor
                    };
                });
                newData.hexes = migratedHexes;
            } else {
                // Migration: backgroundColor -> color (falls backgroundColor existiert)
                Object.values(newData.hexes).forEach(h => {
                    if (h.backgroundColor) {
                        h.color = h.backgroundColor;
                        delete h.backgroundColor;
                    }
                });
            }

            if (newData.settings) {
                if (newData.settings.colorPalette) {
                    this.colorPalette = newData.settings.colorPalette;
                }
                if (newData.settings.colorPalette2) {
                    this.colorPalette2 = newData.settings.colorPalette2;
                }
                if (newData.settings.activeColorSlot !== undefined) {
                    this.activeColorSlot = newData.settings.activeColorSlot;
                }
                this.editMode = newData.settings.editMode === true;
                const savedToolGroup = newData.settings.currentToolGroup || null;
                const savedDrawMode = newData.settings.drawMode || 'pen';
                if (this.editMode) {
                    this.currentToolGroup = savedToolGroup;
                    this.drawMode = savedDrawMode;
                } else {
                    this.currentToolGroup = null;
                    this.drawMode = 'pen';
                    this._savedToolGroup = savedToolGroup;
                    this._savedDrawMode = savedDrawMode;
                }
                if (newData.settings.toolConfigs) {
                    // WICHTIG: Explizit jeden Key einzeln laden, um sicherzustellen,
                    ['grass', 'tree', 'mountain', 'building'].forEach(key => {
                        if (newData.settings.toolConfigs[key] && this.toolConfigs[key]) {
                            const saved = newData.settings.toolConfigs[key];

                            if (saved.currentVariant !== undefined) {
                                this.toolConfigs[key].currentVariant = saved.currentVariant;
                            }
                            if (saved.symbolColor !== undefined) {
                                this.toolConfigs[key].symbolColor = saved.symbolColor;
                            }
                            if (saved.backgroundColor !== undefined) {
                                this.toolConfigs[key].backgroundColor = saved.backgroundColor;
                            }
                            if (saved.backgroundEnabled !== undefined) {
                                this.toolConfigs[key].backgroundEnabled = saved.backgroundEnabled;
                            }
                        }
                    });
                    this.updateToolGroupButtonIcons();
                } else {
                    this.updateToolConfigsWithAvailableSVGs();
                    this.updateToolGroupButtonIcons();
                }
                if (newData.settings.patternData) {
                    this.patternData = newData.settings.patternData;
                }
                if (newData.settings.patternSourceHex) {
                    this.patternSourceHex = newData.settings.patternSourceHex;
                }
                if (newData.settings.borderSettings) {
                    this.borderSettings = newData.settings.borderSettings;
                    this.borderSettings.activeRegionId = null;
                    this.borderSettings.pickedHex = null;
                }
                if (newData.settings.riverSettings) {
                    this.riverSettings = newData.settings.riverSettings;
                    this.riverSettings.editMode = false;
                    this.riverSettings.activeRiverId = null;
                    this.riverSettings.insertAfter = null;
                }
                if (newData.settings.roadSettings) {
                    this.roadSettings = newData.settings.roadSettings;
                    this.roadSettings.editMode = false;
                    this.roadSettings.activeRoadId = null;
                    this.roadSettings.insertAfter = null;
                }
                if (newData.settings.hexColorColor) {
                    this.hexColorColor = newData.settings.hexColorColor;
                }
                if (newData.settings.lastUsedTextSize !== undefined) this.lastUsedTextSize = newData.settings.lastUsedTextSize;
                if (newData.settings.lastUsedTextOutline !== undefined) this.lastUsedTextOutline = newData.settings.lastUsedTextOutline;
                if (newData.settings.lastUsedTextBold !== undefined) this.lastUsedTextBold = newData.settings.lastUsedTextBold;
                if (newData.settings.lastUsedTextShadow !== undefined) this.lastUsedTextShadow = newData.settings.lastUsedTextShadow;
                if (newData.settings.lastUsedTextShadowDistance !== undefined) this.lastUsedTextShadowDistance = newData.settings.lastUsedTextShadowDistance;
                if (newData.settings.lastUsedTextShadowOpatown !== undefined) this.lastUsedTextShadowOpatown = newData.settings.lastUsedTextShadowOpatown;
                if (newData.settings.masterColor) {
                    this.masterColor = newData.settings.masterColor;
                    if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                }
                if (this.currentToolGroup === 'hexcolor') {
                    this.masterColor = this.hexColorColor;
                    if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                } else if (this.currentToolGroup && this.toolConfigs[this.currentToolGroup]) {
                    this.masterColor = this.toolConfigs[this.currentToolGroup].symbolColor;
                    if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                }
            } else {
                this.updateToolConfigsWithAvailableSVGs();
                this.updateToolGroupButtonIcons();
            }

            if (!newData.borders) newData.borders = [];
            // Migration: altes Flat-Array [{q,r}] → neues Regionen-Format [{id, color, hexes}]
            if (newData.borders.length > 0 && newData.borders[0].q !== undefined) {
                newData.borders = [{ id: 1, color: DEFAULT_BORDER_COLOR, hexes: newData.borders }];
            }

            if (!newData.rivers) newData.rivers = [];
            // Migration: altes Segment-Format [{from, to, width}] → neues Waypoint-Format
            if (newData.rivers.length > 0 && newData.rivers[0].from !== undefined) {
                const waypoints = [];
                newData.rivers.forEach(seg => {
                    if (waypoints.length === 0 || waypoints[waypoints.length - 1].q !== seg.from.q || waypoints[waypoints.length - 1].r !== seg.from.r) {
                        waypoints.push({ q: seg.from.q, r: seg.from.r });
                    }
                    waypoints.push({ q: seg.to.q, r: seg.to.r });
                });
                newData.rivers = waypoints.length > 0 ? [{ id: 1, color: DEFAULT_RIVER_COLOR, width: DEFAULT_RIVER_WIDTH, waypoints }] : [];
            }

            if (!newData.roads) newData.roads = [];
            // Migration: altes Segment-Format [{from, to, width}] → neues Waypoint-Format
            if (newData.roads.length > 0 && newData.roads[0].from !== undefined) {
                const waypoints = [];
                newData.roads.forEach(seg => {
                    if (waypoints.length === 0 || waypoints[waypoints.length - 1].q !== seg.from.q || waypoints[waypoints.length - 1].r !== seg.from.r) {
                        waypoints.push({ q: seg.from.q, r: seg.from.r });
                    }
                    waypoints.push({ q: seg.to.q, r: seg.to.r });
                });
                newData.roads = waypoints.length > 0 ? [{ id: 1, color: DEFAULT_ROAD_COLOR, width: DEFAULT_ROAD_WIDTH, waypoints }] : [];
            }

            if (JSON.stringify(this.data) !== JSON.stringify(newData)) {
                this.data = Object.assign({}, newData);

                if (this.canvas) {
                    if (this.data.settings && this.data.settings.viewportSaved) {
                        this.render();
                    } else if (Object.keys(this.data.hexes).length > 0) {
                        setTimeout(() => { this.fitMapToView(); }, 100);
                    } else {
                        if (this.canvas.width > 0) {
                            this.data.offX = this.canvas.width / 2;
                            this.data.offY = this.canvas.height / 2;
                        }
                        this.render();
                    }
                }
            }

            if (this.containerEl) {
                const toolbar = this.containerEl.querySelector('.hex-toolbar');
                if (toolbar) {
                    this.updateToolbarState(toolbar);
                    if (this.editMode) {
                        setTimeout(() => {
                            this.updateToolbarState(toolbar);
                            this.recalcToolbarWidths();
                        }, 50);
                    }
                }
            }
        } catch(e) {
            console.error("HexCartographer Sync Fehler:", e);
        } finally {
            this.isReloading = false;
        }
    }

    pushHistory() {
        const dataToSave = {
            hexes: this.data.hexes,
            rivers: this.data.rivers,
            roads: this.data.roads,
            texts: this.data.texts,
            borders: this.data.borders,
            gridSize: this.data.gridSize
        };
        this.history.push(JSON.stringify(dataToSave));
        if (this.history.length > this.maxHistory) this.history.shift();
        this.redoStack = [];
        this.pendingHistory = false;
    }

    pushHistoryIfNeeded() {
        if (this.pendingHistory) {
            this.pushHistory();
        }
    }

    undo() {
        if (this.history.length > 0) {
            const dataToSave = {
                hexes: this.data.hexes,
                rivers: this.data.rivers,
                roads: this.data.roads,
                texts: this.data.texts,
                borders: this.data.borders,
                gridSize: this.data.gridSize
            };
            this.redoStack.push(JSON.stringify(dataToSave));
            const previousState = this.history.pop();
            const restored = JSON.parse(previousState);
            this.data.hexes = restored.hexes;
            this.data.rivers = restored.rivers;
            this.data.roads = restored.roads;
            this.data.texts = restored.texts;
            this.data.borders = restored.borders || [];
            this.data.gridSize = restored.gridSize;
            this.render();
            this.requestSave();
        } else {
            new Notice(t('notice.nothingToUndo'));
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const dataToSave = {
                hexes: this.data.hexes,
                rivers: this.data.rivers,
                roads: this.data.roads,
                texts: this.data.texts,
                borders: this.data.borders,
                gridSize: this.data.gridSize
            };
            this.history.push(JSON.stringify(dataToSave));
            const nextState = this.redoStack.pop();
            const restored = JSON.parse(nextState);
            this.data.hexes = restored.hexes;
            this.data.rivers = restored.rivers;
            this.data.roads = restored.roads;
            this.data.texts = restored.texts;
            this.data.borders = restored.borders || [];
            this.data.gridSize = restored.gridSize;
            this.render();
            this.requestSave();
        } else {
            new Notice(t('notice.nothingToRedo'));
        }
    }

    fitMapToView() {
        const hexes = Object.values(this.data.hexes);
        const texts = this.data.texts || [];
        const borders = this.data.borders || [];

        const borderOnlyHexes = [];
        const hexKeySet = new Set(Object.keys(this.data.hexes));
        for (const region of borders) {
            for (const bh of region.hexes) {
                if (!hexKeySet.has(`${bh.q}_${bh.r}`)) {
                    borderOnlyHexes.push(bh);
                }
            }
        }

        if (hexes.length === 0 && texts.length === 0 && borderOnlyHexes.length === 0) {
            new Notice(t('notice.noHexesToShow'));
            return;
        }

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        const expandBounds = (hex) => {
            const pos = this.hexToPixel(hex);
            const s = this.data.gridSize;
            minX = Math.min(minX, pos.x - s);
            maxX = Math.max(maxX, pos.x + s);
            minY = Math.min(minY, pos.y - s);
            maxY = Math.max(maxY, pos.y + s);
        };

        hexes.forEach(expandBounds);
        borderOnlyHexes.forEach(expandBounds);

        texts.forEach(t => {
            const textSize = t.size || 16;
            const estimatedWidth = t.text.length * textSize * 0.6; // Geschätzte Textbreite
            const estimatedHeight = textSize;

            minX = Math.min(minX, t.x - estimatedWidth / 2);
            maxX = Math.max(maxX, t.x + estimatedWidth / 2);
            minY = Math.min(minY, t.y - estimatedHeight / 2);
            maxY = Math.max(maxY, t.y + estimatedHeight / 2);
        });

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const width = maxX - minX;
        const height = maxY - minY;

        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const zoomX = (canvasWidth * VIEWPORT_PADDING) / width;
        const zoomY = (canvasHeight * VIEWPORT_PADDING) / height;
        const newZoom = Math.max(MIN_ZOOM, Math.min(zoomX, zoomY, MAX_ZOOM));

        this.data.zoom = newZoom;
        this.data.offX = canvasWidth / 2 - centerX * newZoom;
        this.data.offY = canvasHeight / 2 - centerY * newZoom;

        this.render();
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.height = '100%';

        const style = document.createElement('style');
        style.textContent = `
            input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
            input[type="color"]::-webkit-color-swatch { border: none; border-radius: 3px; }
            .hex-toolbar-sep {
                width: 1px !important;
                min-width: 1px !important;
                align-self: stretch !important;
                background-color: #b8b8b8 !important;
                flex-shrink: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                display: block !important;
            }
        `;
        container.appendChild(style);

        const toolbar = container.createDiv({ cls: 'hex-toolbar' });
        toolbar.style.padding = '8px';
        toolbar.style.display = 'flex';
        toolbar.style.flexWrap = 'wrap';
        toolbar.style.gap = '8px';
        toolbar.style.background = 'var(--background-secondary)';
        toolbar.style.borderBottom = '1px solid var(--divider-color)';
        toolbar.style.alignItems = 'flex-start';
        toolbar.style.flexShrink = '0';
        toolbar.style.overflowY = 'auto';
        toolbar.style.maxHeight = '120px';

        toolbar.addEventListener('wheel', (e) => {
            e.stopPropagation();
        }, { passive: true });

        this.createToolbar(toolbar);

        this.updateToolbarState(toolbar);

        const canvasContainer = container.createDiv();
        canvasContainer.style.position = 'relative';
        canvasContainer.style.flexGrow = '1';
        canvasContainer.style.overflow = 'hidden';

        this.canvas = canvasContainer.createEl('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.cursor = 'crosshair';
        this.canvas.tabIndex = 0;
        this.canvas.style.outline = 'none';
        this.ctx = this.canvas.getContext('2d');

        this.svgLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svgLayer.style.position = 'absolute';
        this.svgLayer.style.top = '0';
        this.svgLayer.style.left = '0';
        this.svgLayer.style.width = '100%';
        this.svgLayer.style.height = '100%';
        this.svgLayer.style.pointerEvents = 'none'; // Lässt Maus-Events durch
        canvasContainer.appendChild(this.svgLayer);

        this.textCanvas = canvasContainer.createEl('canvas', { cls: 'hex-text-canvas' });
        this.textCtx = this.textCanvas.getContext('2d');

        this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
        this.resizeObserver.observe(canvasContainer);

        this.setupEventListeners();
        this.render();
    }

    createToolbar(toolbar) {
        const editModeBtn = this.createToolButton(toolbar, { icon: 'wrench', title: t('tooltip.editMode') });
        this.editModeBtn = editModeBtn;
        editModeBtn.onclick = () => {
            this.editMode = !this.editMode;
            if (!this.editMode) {
                this.exitPathEditMode();
                this._savedToolGroup = this.currentToolGroup;
                this._savedDrawMode = this.drawMode;
                this.drawMode = 'pen';
                this.currentToolGroup = null;
                this.borderPickMode = false;
                this.pathPickMode = false;
            } else {
                this.currentToolGroup = this._savedToolGroup !== undefined ? this._savedToolGroup : 'hexcolor';
                this.drawMode = this._savedDrawMode || 'pen';
                if (this.currentToolGroup === 'hexcolor') {
                    this.masterColor = this.hexColorColor;
                } else if (this.currentToolGroup && this.toolConfigs[this.currentToolGroup]) {
                    this.masterColor = this.toolConfigs[this.currentToolGroup].symbolColor;
                }
            }
            this.editContent.style.display = this.editMode ? 'contents' : 'none';
            editModeBtn.classList.toggle('active', this.editMode);
            this.updateToolbarState(toolbar);
            if (this.editMode) {
                setTimeout(() => this.recalcToolbarWidths(), 0);
            }
            this.render();
            this.requestSave();
        };

        const editContent = toolbar.createDiv({ style: this.editMode ? 'display: contents;' : 'display: none;' });
        this.editContent = editContent;

        const masterColorBtn = editContent.createEl('button', {
            attr: { title: t('tooltip.colorPicker'), style: 'width: 50px; height: 50px; min-width: 50px; border: 1px solid var(--divider-color); border-radius: 4px; cursor: pointer; box-sizing: border-box; padding: 0;' }
        });
        masterColorBtn.style.backgroundColor = this.masterColor;
        this.masterColorBtn = masterColorBtn;

        const masterColorInput = editContent.createEl('input', {
            type: 'color',
            value: this.masterColor,
            attr: { style: 'position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none;' }
        });
        this.masterColorInput = masterColorInput;

        masterColorBtn.onclick = () => {
            if (this.isTouchDevice) {
                new ColorPickerModal(this.app, this.masterColor, (color) => {
                    this.masterColor = color;
                    masterColorBtn.style.backgroundColor = this.masterColor;
                    masterColorInput.value = this.masterColor;
                    this.updateActivePathColor();
                    this.requestSave();
                }).open();
            } else {
                masterColorInput.click();
            }
        };
        this.makeInputInteractive(masterColorBtn);
        masterColorInput.oninput = (e) => {
            this.masterColor = e.target.value;
            masterColorBtn.style.backgroundColor = this.masterColor;
            this.updateActivePathColor();
        };
        masterColorInput.addEventListener('change', () => {
            this.requestSave();
        });

        const colorEyedropperBtn = this.createToolButton(editContent, { icon: 'pipette', title: t('tooltip.colorEyedropper') });
        colorEyedropperBtn.style.background = BUTTON_BG_DEFAULT;
        this.colorEyedropperBtn = colorEyedropperBtn;
        colorEyedropperBtn.onclick = () => {
            const wasActive = this.colorPickMode;
            this.exitPathEditMode();
            this.colorPickMode = !wasActive;
            colorEyedropperBtn.style.background = this.colorPickMode ? PICKER_ACTIVE_BG : BUTTON_BG_DEFAULT;
            colorEyedropperBtn.style.color = this.colorPickMode ? 'var(--text-on-accent)' : '';
            if (this.colorPickMode) new Notice(t('notice.tapToPickColor'));
        };

        editContent.createEl('span', { cls: 'hex-toolbar-sep', text: '\u200B' });

        this.createColorPalette(editContent);
        
        editContent.createEl('span', { cls: 'hex-toolbar-sep', text: '\u200B' });

        const hexColorBtn = this.createToolButton(editContent, { icon: 'hexagon', title: t('tooltip.hexColor'), dataset: { toolGroup: 'hexcolor' } });
        hexColorBtn.onclick = () => {
            const needsRender = this.currentToolGroup === 'pattern' || this.borderSettings.pickedHex;
            this.exitPathEditMode();
            if (this.currentToolGroup === 'hexcolor') {
                this.drawMode = 'pen';
            } else {
                this.currentToolGroup = 'hexcolor';
                this.drawMode = 'pen';
                this.masterColor = this.hexColorColor;
                if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
            }
            this.updateToolbarState(toolbar);
            if (needsRender) this.render();
            this.requestSave();
        };

        this.createToolGroupButton(editContent, 'grass');
        this.createToolGroupButton(editContent, 'tree');
        this.createToolGroupButton(editContent, 'mountain');
        this.createToolGroupButton(editContent, 'building');

        editContent.createEl('span', { cls: 'hex-toolbar-sep', text: '\u200B' });

        this.createDrawModeButton(editContent, 'fill', 'paint-bucket', t('tooltip.fill'));

        const textBtn = this.createToolButton(editContent, { icon: 'type', title: t('tooltip.text'), dataset: { toolGroup: 'text' } });
        textBtn.onclick = () => {
            const needsRender = this.currentToolGroup === 'pattern' || this.borderSettings.pickedHex;
            this.exitPathEditMode();
            this.currentToolGroup = 'text';
            this.drawMode = 'none';
            this.updateToolbarState(toolbar);
            if (needsRender) this.render();
            this.requestSave();
        };

        this.createDrawModeButton(editContent, 'eraser', 'eraser', t('tooltip.eraser'));

        editContent.createEl('span', { cls: 'hex-toolbar-sep', text: '\u200B' });

        this.createPatternTool(editContent);

        editContent.createEl('span', { cls: 'hex-toolbar-sep', text: '\u200B' });

        this.createPathToolbar(editContent);
        this.createBorderButton(editContent);

        editContent.createEl('span', { cls: 'hex-toolbar-sep', text: '\u200B' });

        const undoBtn = this.createToolButton(editContent, { icon: 'undo-2', title: t('tooltip.undo') });
        undoBtn.onclick = () => this.undo();

        const redoBtn = this.createToolButton(editContent, { icon: 'redo-2', title: t('tooltip.redo') });
        redoBtn.onclick = () => this.redo();

        const fitBtn = this.createToolButton(toolbar, { icon: 'maximize-2', title: t('tooltip.fit') });
        fitBtn.onclick = () => this.fitMapToView();

        this.updateToolbarState(toolbar);
    }

    createDrawModeButton(toolbar, mode, icon, title) {
        const btn = this.createToolButton(toolbar, { icon, title, dataset: { drawMode: mode } });
        btn.onclick = () => {
            if (mode === 'eraser' && (this.patternPickMode || this.pathPickMode || this.borderPickMode || this.colorPickMode)) return;
            const needsRender = this.currentToolGroup === 'pattern' || this.borderSettings.pickedHex;
            if (mode !== 'eraser') this.exitPathEditMode();
            if (this.drawMode === mode && (mode === 'eraser' || mode === 'fill')) {
                this.drawMode = 'pen';
                this.updateToolbarState(toolbar);
                return;
            }
            this.drawMode = mode;

            if (mode === 'fill' && (!this.currentToolGroup || this.currentToolGroup === 'text' || this.currentToolGroup === 'river' || this.currentToolGroup === 'road' || this.currentToolGroup === 'border')) {
                this.exitPathEditMode();
                this.currentToolGroup = 'hexcolor';
            }
            else if (this.currentToolGroup === 'text') {
                this.currentToolGroup = null;
            }

            this.updateToolbarState(toolbar);

            if (needsRender && this.currentToolGroup !== 'pattern') {
                this.render();
            }
            this.requestSave();
        };
    }

    createToolGroupButton(toolbar, groupId) {
        const config = this.toolConfigs[groupId];
        const wrapper = toolbar.createDiv({
            cls: 'tool-group-wrapper',
            style: 'display: inline-flex; flex-direction: column; align-items: center; gap: 2px;'
        });
        wrapper.dataset.toolGroupWrapper = groupId;

        const btnWrapper = wrapper.createDiv({ style: 'position: relative; display: inline-block;' });
        const btn = this.createToolButton(btnWrapper, {
            title: t('tooltip.toolGroup', { name: config.name }),
            dataset: { toolGroup: groupId },
            style: `position: relative; background: ${config.backgroundEnabled ? config.backgroundColor : BUTTON_BG_DEFAULT};`
        });

        const currentVariant = config.variants.find(v => v.id === config.currentVariant);

        if (this.svgSymbols[currentVariant.id]) {
            const symbolInfo = this.svgSymbols[currentVariant.id];
            btn.innerHTML = `<svg viewBox="0 0 ${symbolInfo.viewBoxWidth} ${symbolInfo.viewBoxWidth}"
                                  width="16" height="16" style="vertical-align: middle;">
                <path d="${symbolInfo.pathData}" fill="currentColor"/>
            </svg>`;
        } else {
            setIcon(btn, currentVariant.icon);
        }

        if (config.symbolColor) {
            btn.style.color = config.symbolColor;
        }

        btnWrapper.createEl('span', {
            text: '▼',
            attr: {
                style: 'position: absolute; right: 2px; bottom: 2px; font-size: 8px; pointer-events: none; color: var(--text-muted);'
            }
        });

        btn.onclick = () => {
            const needsRender = this.currentToolGroup === 'pattern' || this.borderSettings.pickedHex;
            this.exitPathEditMode();
            this.currentToolGroup = groupId;
            this.drawMode = 'pen';
            this.masterColor = config.symbolColor;
            if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }

            this.updateToolbarState(toolbar);

            if (needsRender) {
                this.render();
            }
            this.requestSave();
        };

        btn.oncontextmenu = (e) => {
            e.preventDefault();
            this.showVariantMenu(groupId, wrapper);
        };

    }

    createPatternTool(toolbar) {
        const wrapper = toolbar.createDiv({ style: 'display: flex; align-items: center; gap: 4px;' });

        const patternBtn = this.createToolButton(wrapper, { icon: 'copy', title: t('tooltip.pattern'), dataset: { toolGroup: 'pattern' } });

        patternBtn.onclick = () => {
            if (!this.patternData) {
                new Notice(t('notice.noPattern'));
                return;
            }
            this.exitPathEditMode();
            this.currentToolGroup = 'pattern';
            this.drawMode = 'pen';
            this.updateToolbarState(toolbar);
            this.render();
            this.requestSave();
        };

        const pickerBtn = this.createToolButton(wrapper, { icon: 'pipette', title: t('tooltip.patternPicker'), style: 'width: 24px; padding: 2px;' });

        pickerBtn.onclick = () => {
            const wasActive = this.patternPickMode;
            this.exitPathEditMode();
            this.patternPickMode = !wasActive;
            pickerBtn.style.background = this.patternPickMode ? PICKER_ACTIVE_BG : BUTTON_BG_DEFAULT;
            if (this.patternPickMode) {
                this.currentToolGroup = null;
                new Notice(t('notice.clickToPickPattern'));
            }
            this.updateToolbarState(toolbar);
        };

        this.patternPickerBtn = pickerBtn;
    }

    showVariantMenu(groupId, wrapper) {
        const config = this.toolConfigs[groupId];
        const btn = wrapper.querySelector('.hex-tool-btn');

        const oldMenu = document.querySelector('.hex-variant-menu');
        if (oldMenu) oldMenu.remove();

        const menu = document.body.createDiv({ cls: 'hex-variant-menu' });
        menu.style.position = 'absolute';
        menu.style.background = 'var(--background-primary)';
        menu.style.border = '1px solid var(--divider-color)';
        menu.style.borderRadius = '4px';
        menu.style.padding = '4px';
        menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        menu.style.zIndex = '1000';

        const rect = btn.getBoundingClientRect();
        menu.style.left = rect.left + 'px';
        menu.style.top = (rect.bottom + 4) + 'px';

        config.variants.forEach(variant => {
            const item = menu.createDiv({
                text: variant.label,
                style: 'padding: 6px 12px; cursor: pointer; border-radius: 3px;'
            });

            if (variant.id === config.currentVariant) {
                item.style.background = 'var(--interactive-accent)';
                item.style.color = 'var(--text-on-accent)';
            }

            item.onmouseover = () => {
                if (variant.id !== config.currentVariant) {
                    item.style.background = 'var(--background-modifier-hover)';
                }
            };
            item.onmouseout = () => {
                if (variant.id !== config.currentVariant) {
                    item.style.background = '';
                }
            };

            item.onclick = () => {
                config.currentVariant = variant.id;

                if (this.svgSymbols[variant.id]) {
                    const symbolInfo = this.svgSymbols[variant.id];
                    btn.innerHTML = `<svg viewBox="0 0 ${symbolInfo.viewBoxWidth} ${symbolInfo.viewBoxWidth}"
                                          width="16" height="16" style="vertical-align: middle;">
                        <path d="${symbolInfo.pathData}" fill="currentColor"/>
                    </svg>`;
                } else {
                    setIcon(btn, variant.icon);
                }

                this.currentToolGroup = groupId;
                this.drawMode = 'pen';
                this.masterColor = config.symbolColor;
                if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }

                menu.remove();
                this.updateToolbarState(this.containerEl.querySelector('.hex-toolbar'));
                this.requestSave();
            };
        });

        setTimeout(() => {
            const closeMenu = (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            document.addEventListener('click', closeMenu);
        }, 10);
    }

    openColorPickerModal(groupId, wrapper) {
        const config = this.toolConfigs[groupId];
        const btn = wrapper.querySelector('.hex-tool-btn');

        const modal = new Modal(this.app);
        modal.contentEl.createEl('h3', { text: `${config.name} - Hintergrundfarbe` });

        const bgSection = modal.contentEl.createDiv({ style: 'margin: 15px 0;' });

        const bgRow = bgSection.createDiv({ style: 'display: flex; gap: 10px; align-items: center; margin-bottom: 10px;' });
        bgRow.createEl('label', { text: 'Farbe:' });
        const bgPicker = bgRow.createEl('input', { type: 'color', value: config.backgroundColor || BUTTON_BG_DEFAULT });

        const bgPaletteRow = bgSection.createDiv({ style: 'display: flex; gap: 5px; flex-wrap: wrap;' });
        bgPaletteRow.createEl('span', { text: 'Palette:', attr: { style: 'width: 100%; font-size: 11px; margin-bottom: 5px;' } });
        this.colorPalette.forEach(color => {
            const paletteBtn = bgPaletteRow.createEl('button', {
                attr: {
                    style: `width: 30px; height: 30px; background: ${color}; border: 2px solid var(--divider-color); border-radius: 3px; cursor: pointer;`
                }
            });
            paletteBtn.onclick = () => {
                bgPicker.value = color;
            };
        });

        const btnRow = modal.contentEl.createDiv({ style: 'display: flex; gap: 10px; margin-top: 20px;' });

        const okBtn = btnRow.createEl('button', { text: 'OK', cls: 'mod-cta' });
        okBtn.onclick = () => {
            config.backgroundColor = bgPicker.value;
            if (config.backgroundEnabled) {
                btn.style.background = config.backgroundColor;
            }
            modal.close();
            this.requestSave();
            this.render();
        };

        const cancelBtn = btnRow.createEl('button', { text: 'Abbrechen' });
        cancelBtn.onclick = () => modal.close();

        modal.open();
    }

    createColorPalette(toolbar) {
        const outer = toolbar.createDiv({ style: 'display: inline-flex; flex-direction: column; gap: 2px; border-left: 1px solid #bbb; border-right: 1px solid #bbb; padding: 0 6px;' });
        this.paletteOuter = outer;

        this._createPaletteRow(outer, this.colorPalette, 'colorPalette');
        this._createPaletteRow(outer, this.colorPalette2, 'colorPalette2');
    }

    _createPaletteRow(parent, palette, paletteKey) {
        const row = parent.createDiv({ style: 'display: flex; align-items: center; gap: 3px;' });

        palette.forEach((color, index) => {
            const btn = row.createEl('button', {
                cls: 'hex-color-slot',
                attr: {
                    title: t('tooltip.palette'),
                    style: 'width: 24px; height: 24px; min-width: 24px; border: none; border-radius: 3px; cursor: pointer; padding: 0;'
                }
            });
            btn.style.backgroundColor = color;
            btn.dataset.paletteKey = paletteKey;
            btn.dataset.paletteIndex = index;

            const hiddenInput = row.createEl('input', {
                type: 'color',
                value: color,
                attr: { style: 'position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none;' }
            });

            btn.onclick = () => {
                if (this.currentToolGroup === 'pattern' || this.patternPickMode || this.pathPickMode || this.borderPickMode || this.colorPickMode) {
                    this.exitPathEditMode();
                    this.currentToolGroup = 'hexcolor';
                    this.drawMode = 'pen';
                }
                this.masterColor = this[paletteKey][index];
                if (this.currentToolGroup === 'hexcolor') this.hexColorColor = this.masterColor;
                if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                this.updateActivePathColor();
                const toolbar = this.containerEl.querySelector('.hex-toolbar');
                if (toolbar) this.updateToolbarState(toolbar);
            };

            const openPaletteColorPicker = () => {
                if (this.isTouchDevice) {
                    new ColorPickerModal(this.app, this[paletteKey][index], (color) => {
                        this[paletteKey][index] = color;
                        btn.style.backgroundColor = color;
                        hiddenInput.value = color;
                        this.masterColor = color;
                        if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                        this.updateActivePathColor();
                        this.requestSave();
                    }).open();
                } else {
                    hiddenInput.click();
                }
            };

            btn.oncontextmenu = (e) => {
                e.preventDefault();
                openPaletteColorPicker();
            };

            let longPressTimer = null;
            btn.addEventListener('touchstart', (e) => {
                longPressTimer = setTimeout(() => {
                    e.preventDefault();
                    openPaletteColorPicker();
                    longPressTimer = null;
                }, 500);
            }, { passive: false });
            btn.addEventListener('touchend', () => {
                if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
            });
            btn.addEventListener('touchmove', () => {
                if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
            });

            hiddenInput.oninput = (e) => {
                this[paletteKey][index] = e.target.value;
                btn.style.backgroundColor = e.target.value;
                this.masterColor = e.target.value;
                if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                this.updateActivePathColor();
            };
            hiddenInput.addEventListener('change', () => {
                this.requestSave();
            });
        });
    }

    createPathToolbar(toolbar) {
        const wrapper = toolbar.createDiv({
            style: 'display: inline-flex; flex-direction: column; gap: 2px;'
        });

        const topRow = wrapper.createDiv({ style: 'display: flex; gap: 2px; align-items: center;' });

        const riverBtn = this.createToolButton(topRow, { icon: 'waves', title: t('tooltip.river'), dataset: { toolGroup: 'river' } });
        this.riverBtn = riverBtn;
        riverBtn.onclick = () => {
            const needsRender = this.currentToolGroup === 'pattern' || this.borderSettings.pickedHex;
            this.exitPathEditMode();
            this.currentToolGroup = 'river';
            this.drawMode = 'pen';
            this.updateToolbarState(toolbar);
            if (needsRender) this.render();
            this.requestSave();
        };

        const roadBtn = this.createToolButton(topRow, { icon: 'route', title: t('tooltip.road'), dataset: { toolGroup: 'road' } });
        this.roadBtn = roadBtn;
        roadBtn.onclick = () => {
            const needsRender = this.currentToolGroup === 'pattern' || this.borderSettings.pickedHex;
            this.exitPathEditMode();
            this.currentToolGroup = 'road';
            this.drawMode = 'pen';
            this.updateToolbarState(toolbar);
            if (needsRender) this.render();
            this.requestSave();
        };

        const pickerBtn = this.createToolButton(topRow, { icon: 'mouse-pointer', title: t('tooltip.pathPicker') });
        this.pathPickerBtn = pickerBtn;
        pickerBtn.onclick = () => {
            const settings = this.currentToolGroup === 'river' ? this.riverSettings : this.roadSettings;
            if (settings.editMode) {
                this.exitPathEditMode();
                return;
            }
            this.pathPickMode = !this.pathPickMode;
            if (this.pathPickMode) {
                this.lastToolGroup = this.currentToolGroup;
                this.currentToolGroup = null;
                this.patternPickMode = false;
                if (this.patternPickerBtn) { this.patternPickerBtn.style.background = BUTTON_BG_DEFAULT; }
                this.borderPickMode = false;
                if (this.borderPickerBtn) { this.borderPickerBtn.style.background = BUTTON_BG_DEFAULT; this.borderPickerBtn.style.color = ''; }
            }
            this.drawMode = 'pen';
            pickerBtn.style.background = this.pathPickMode ? PICKER_ACTIVE_BG : BUTTON_BG_DEFAULT;
            pickerBtn.style.color = this.pathPickMode ? 'var(--text-on-accent)' : '';
            this.updateToolbarState(toolbar);
        };

        const bottomRow = wrapper.createDiv({ style: 'display: flex; gap: 2px;' });

        const riverWidthInput = bottomRow.createEl('input', {
            type: 'number',
            value: this.riverSettings.width.toString(),
            attr: { title: t('input.riverWidth'), min: '1', max: '999', style: `height: ${TOOLBAR_INPUT_HEIGHT}; font-size: ${TOOLBAR_INPUT_FONT_SIZE}; padding: 2px; box-sizing: border-box;` }
        });
        this.makeInputInteractive(riverWidthInput);
        this.riverWidthInput = riverWidthInput;
        riverWidthInput.oninput = (e) => {
            if (e.target.value.length > 3) e.target.value = e.target.value.slice(0, 3);
            this.riverSettings.width = Math.min(999, Math.max(1, parseInt(e.target.value) || DEFAULT_RIVER_WIDTH));
            e.target.value = this.riverSettings.width;
            const river = this.data.rivers && this.data.rivers.find(r => r.id === this.riverSettings.activeRiverId);
            if (river) river.width = this.riverSettings.width;
            this.render();
        };

        const roadWidthInput = bottomRow.createEl('input', {
            type: 'number',
            value: this.roadSettings.width.toString(),
            attr: { title: t('input.roadWidth'), min: '1', max: '999', style: `height: ${TOOLBAR_INPUT_HEIGHT}; font-size: ${TOOLBAR_INPUT_FONT_SIZE}; padding: 2px; box-sizing: border-box;` }
        });
        this.makeInputInteractive(roadWidthInput);
        this.roadWidthInput = roadWidthInput;
        roadWidthInput.oninput = (e) => {
            if (e.target.value.length > 3) e.target.value = e.target.value.slice(0, 3);
            this.roadSettings.width = Math.min(999, Math.max(1, parseInt(e.target.value) || DEFAULT_ROAD_WIDTH));
            e.target.value = this.roadSettings.width;
            const road = this.data.roads && this.data.roads.find(r => r.id === this.roadSettings.activeRoadId);
            if (road) road.width = this.roadSettings.width;
            this.render();
        };

        const dashesInput = bottomRow.createEl('input', {
            type: 'number',
            value: (this.pathDashes || DEFAULT_PATH_DASHES).toString(),
            attr: { title: t('input.pathDashes'), min: '1', max: '99', style: `height: ${TOOLBAR_INPUT_HEIGHT}; font-size: ${TOOLBAR_INPUT_FONT_SIZE}; padding: 2px; box-sizing: border-box;` }
        });
        this.makeInputInteractive(dashesInput);
        this.pathDashesInput = dashesInput;
        dashesInput.oninput = (e) => {
            if (e.target.value.length > 2) e.target.value = e.target.value.slice(0, 2);
            this.pathDashes = Math.min(99, Math.max(1, parseInt(e.target.value) || DEFAULT_PATH_DASHES));
            e.target.value = this.pathDashes;
            const river = this.data.rivers && this.data.rivers.find(r => r.id === this.riverSettings.activeRiverId);
            if (river) river.dashes = this.pathDashes;
            const road = this.data.roads && this.data.roads.find(r => r.id === this.roadSettings.activeRoadId);
            if (road) road.dashes = this.pathDashes;
            this.render();
        };

        setTimeout(() => {
            riverWidthInput.style.width = `${riverBtn.offsetWidth}px`;
            roadWidthInput.style.width = `${roadBtn.offsetWidth}px`;
            dashesInput.style.width = `${pickerBtn.offsetWidth}px`;
        }, 0);
    }

    handleWaypointClick(path, settings, clickedIdx) {
        const now = Date.now();
        const isDouble = this.lastWaypointClick &&
                         this.lastWaypointClick.pathId === path.id &&
                         this.lastWaypointClick.idx === clickedIdx &&
                         (now - this.lastWaypointClick.time) < 400;
        if (isDouble) {
            const isEndpoint = clickedIdx === 0 || clickedIdx === path.waypoints.length - 1;
            const hasBreaks = path.waypoints.some(wp => wp.break);
            if (isEndpoint && !hasBreaks && path.waypoints.length >= 3) {
                const first = path.waypoints[0];
                path.waypoints.push({ q: first.q, r: first.r });
                settings.insertAfter = path.waypoints.length - 1;
            }
            this.lastWaypointClick = null;
        } else {
            this.lastWaypointClick = {
                pathId: path.id,
                idx: clickedIdx,
                time: now
            };
            settings.insertAfter = clickedIdx;
        }
        this.render();
        this.requestSave();
    }

    pickPathAtHex(hex) {
        const foundRiver = this.findRiverAtHex(hex);
        const foundRoad = this.findRoadAtHex(hex);
        if (foundRiver) {
            this.exitPathEditMode();
            this.currentToolGroup = 'river';
            this.riverSettings.activeRiverId = foundRiver.id;
            this.riverSettings.width = foundRiver.width;
            this.riverSettings.editMode = true;
            this.riverSettings.insertAfter = foundRiver.waypoints.length - 1;
            this.masterColor = foundRiver.color;
            if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
            if (this.riverWidthInput) this.riverWidthInput.value = foundRiver.width.toString();
            this.pathDashes = foundRiver.dashes || DEFAULT_PATH_DASHES;
            if (this.pathDashesInput) this.pathDashesInput.value = this.pathDashes.toString();
            new Notice(t('notice.riverSelected', { id: foundRiver.id }));
        } else if (foundRoad) {
            this.exitPathEditMode();
            this.currentToolGroup = 'road';
            this.roadSettings.activeRoadId = foundRoad.id;
            this.roadSettings.width = foundRoad.width;
            this.roadSettings.editMode = true;
            this.roadSettings.insertAfter = foundRoad.waypoints.length - 1;
            this.masterColor = foundRoad.color;
            if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
            if (this.roadWidthInput) this.roadWidthInput.value = foundRoad.width.toString();
            this.pathDashes = foundRoad.dashes || DEFAULT_PATH_DASHES;
            if (this.pathDashesInput) this.pathDashesInput.value = this.pathDashes.toString();
            new Notice(t('notice.roadSelected', { id: foundRoad.id }));
        } else {
            this.currentToolGroup = this.lastToolGroup;
            if (this.currentToolGroup === 'hexcolor') {
                this.masterColor = this.hexColorColor;
            } else if (this.currentToolGroup && this.toolConfigs[this.currentToolGroup]) {
                this.masterColor = this.toolConfigs[this.currentToolGroup].symbolColor;
            }
        }
        this.lastToolGroup = null;
        this.pathPickMode = false;
        if (this.pathPickerBtn) {
            this.pathPickerBtn.style.background = BUTTON_BG_DEFAULT;
            this.pathPickerBtn.style.color = '';
        }
        this.drawMode = 'pen';
        const toolbar = this.containerEl.querySelector('.hex-toolbar');
        if (toolbar) this.updateToolbarState(toolbar);
        this.render();
    }

    updateActivePathColor() {
        if (this.riverSettings.editMode) {
            const river = this.data.rivers && this.data.rivers.find(r => r.id === this.riverSettings.activeRiverId);
            if (river) { river.color = this.masterColor; this.render(); this.requestSave(); }
        }
        if (this.roadSettings.editMode) {
            const road = this.data.roads && this.data.roads.find(r => r.id === this.roadSettings.activeRoadId);
            if (road) { road.color = this.masterColor; this.render(); this.requestSave(); }
        }
        if (this.borderSettings.activeRegionId !== null && this.currentToolGroup === 'border') {
            const region = this.data.borders && this.data.borders.find(r => r.id === this.borderSettings.activeRegionId);
            if (region) { region.color = this.masterColor; this.render(); this.requestSave(); }
        }
        if (this.currentToolGroup === 'hexcolor') {
            this.hexColorColor = this.masterColor;
            const toolbar = this.containerEl.querySelector('.hex-toolbar');
            if (toolbar) this.updateToolbarState(toolbar);
        } else if (this.currentToolGroup && this.toolConfigs[this.currentToolGroup]) {
            this.toolConfigs[this.currentToolGroup].symbolColor = this.masterColor;
            const toolbar = this.containerEl.querySelector('.hex-toolbar');
            if (toolbar) this.updateToolbarState(toolbar);
        }
    }

    exitPathEditMode() {
        let changed = false;
        for (const settings of [this.riverSettings, this.roadSettings]) {
            if (settings.editMode) {
                const isRiver = settings === this.riverSettings;
                const activeIdKey = isRiver ? 'activeRiverId' : 'activeRoadId';
                const arr = isRiver ? this.data.rivers : this.data.roads;
                const activeId = settings[activeIdKey];
                if (activeId != null && arr) {
                    const idx = arr.findIndex(p => p.id === activeId);
                    if (idx !== -1 && arr[idx].waypoints.length < 2) {
                        arr.splice(idx, 1);
                    }
                }
                settings.editMode = false;
                settings[activeIdKey] = null;
                settings.insertAfter = null;
                changed = true;
            }
        }
        if (this.pathPickerBtn) {
            setIcon(this.pathPickerBtn, 'mouse-pointer');
            this.pathPickerBtn.style.background = BUTTON_BG_DEFAULT;
            this.pathPickerBtn.style.color = '';
            this.pathPickerBtn.setAttribute('title', t('tooltip.pathPicker'));
        }
        this.pathPickMode = false;
        this.patternPickMode = false;
        if (this.patternPickerBtn) {
            this.patternPickerBtn.style.background = BUTTON_BG_DEFAULT;
        }
        this.borderPickMode = false;
        if (this.borderPickerBtn) {
            this.borderPickerBtn.style.background = BUTTON_BG_DEFAULT;
            this.borderPickerBtn.style.color = '';
        }
        this.colorPickMode = false;
        if (this.colorEyedropperBtn) {
            this.colorEyedropperBtn.style.background = BUTTON_BG_DEFAULT;
            this.colorEyedropperBtn.style.color = '';
        }
        if (this.borderSettings.activeRegionId !== null) {
            this.borderSettings.activeRegionId = null;
            this.borderSettings.pickedHex = null;
            if (this.drawMode === 'eraser') this.drawMode = 'pen';
            changed = true;
        }
        if (changed) this.render();
    }

    createBorderButton(toolbar) {
        const wrapper = toolbar.createDiv({
            style: 'display: inline-flex; flex-direction: column; gap: 2px;'
        });

        const topRow = wrapper.createDiv({ style: 'display: flex; gap: 2px; align-items: center;' });

        const btn = this.createToolButton(topRow, { icon: 'shield', title: t('tooltip.border'), dataset: { toolGroup: 'border' } });
        this.borderBtn = btn;

        btn.onclick = () => {
            const wasPatternActive = this.currentToolGroup === 'pattern';
            const wasHidden = !this.borderSettings.visible;
            this.exitPathEditMode();
            this.borderPickMode = false;
            this.borderSettings.activeRegionId = null;
            this.borderSettings.pickedHex = null;
            this.currentToolGroup = 'border';
            this.drawMode = 'pen';
            if (wasHidden) this.borderSettings.visible = true;
            this.updateToolbarState(toolbar);
            if (wasPatternActive || wasHidden) {
                this.render();
            }
            this.requestSave();
        };

        const pickerBtn = this.createToolButton(topRow, { icon: 'mouse-pointer', title: t('tooltip.borderPicker') });
        this.borderPickerBtn = pickerBtn;
        pickerBtn.onclick = () => {
            if (this.borderSettings.activeRegionId !== null) {
                this.borderSettings.activeRegionId = null;
                this.borderSettings.pickedHex = null;
                if (this.drawMode === 'eraser') this.drawMode = 'pen';
                this.updateToolbarState(toolbar);
                this.render();
                return;
            }
            const wasActive = this.borderPickMode;
            this.exitPathEditMode();
            this.borderPickMode = !wasActive;
            this.currentToolGroup = this.borderPickMode ? null : 'border';
            this.drawMode = 'pen';
            pickerBtn.style.background = this.borderPickMode ? PICKER_ACTIVE_BG : BUTTON_BG_DEFAULT;
            pickerBtn.style.color = this.borderPickMode ? 'var(--text-on-accent)' : '';
            this.updateToolbarState(toolbar);
        };

        const visBtn = this.createToolButton(topRow, { icon: this.borderSettings.visible ? 'eye' : 'eye-off', title: t('tooltip.borderVisibility') });
        visBtn.style.opacity = this.borderSettings.visible ? '1' : '0.4';
        visBtn.onclick = () => {
            this.borderSettings.visible = !this.borderSettings.visible;
            setIcon(visBtn, this.borderSettings.visible ? 'eye' : 'eye-off');
            visBtn.style.opacity = this.borderSettings.visible ? '1' : '0.4';
            this.render();
            this.requestSave();
        };
        this.borderVisBtn = visBtn;

        const inputRow = wrapper.createDiv({ style: 'display: flex; gap: 2px;' });

        const dashesInput = inputRow.createEl('input', {
            type: 'number',
            value: (this.borderSettings.dashes || DEFAULT_BORDER_DASHES).toString(),
            attr: { title: t('input.borderDashes'), min: '1', max: '99', style: `height: ${TOOLBAR_INPUT_HEIGHT}; font-size: ${TOOLBAR_INPUT_FONT_SIZE}; padding: 2px; box-sizing: border-box;` }
        });
        this.makeInputInteractive(dashesInput);
        this.borderDashesInput = dashesInput;
        dashesInput.oninput = (e) => {
            if (e.target.value.length > 2) e.target.value = e.target.value.slice(0, 2);
            this.borderSettings.dashes = Math.min(99, Math.max(1, parseInt(e.target.value) || DEFAULT_BORDER_DASHES));
            e.target.value = this.borderSettings.dashes;
            const region = this.data.borders && this.data.borders.find(r => r.id === this.borderSettings.activeRegionId);
            if (region) region.dashes = this.borderSettings.dashes;
            this.render();
        };

        setTimeout(() => {
            dashesInput.style.width = `${btn.offsetWidth}px`;
        }, 0);
    }

    makeInputInteractive(input) {
        input.addEventListener('mousedown', (e) => e.stopPropagation());
        input.addEventListener('keydown', (e) => e.stopPropagation());
        input.addEventListener('pointerdown', (e) => e.stopPropagation());
    }

    createToolButton(parent, { icon, title, dataset, style } = {}) {
        const btn = parent.createEl('button', {
            cls: 'hex-tool-btn',
            attr: { title, ...(style ? { style } : {}) }
        });
        btn.style.background = BUTTON_BG_DEFAULT;
        if (dataset) Object.assign(btn.dataset, dataset);
        if (icon) setIcon(btn, icon);
        return btn;
    }

    recalcToolbarWidths() {
        if (this.riverBtn && this.roadBtn && this.riverWidthInput && this.roadWidthInput) {
            this.riverWidthInput.style.width = `${this.riverBtn.offsetWidth}px`;
            this.roadWidthInput.style.width = `${this.roadBtn.offsetWidth}px`;
            if (this.pathDashesInput && this.pathPickerBtn) this.pathDashesInput.style.width = `${this.pathPickerBtn.offsetWidth}px`;
        }
        if (this.borderBtn && this.borderDashesInput) {
            this.borderDashesInput.style.width = `${this.borderBtn.offsetWidth}px`;
        }
    }

    updateToolbarState(toolbar) {
        if (this.editModeBtn) {
            this.editModeBtn.classList.toggle('active', this.editMode);
            this.editModeBtn.style.background = this.editMode ? PICKER_ACTIVE_BG : BUTTON_BG_DEFAULT;
            this.editModeBtn.style.border = this.editMode ? ACTIVE_BORDER : '';
            this.editModeBtn.style.boxShadow = this.editMode ? ACTIVE_BOX_SHADOW : '';
        }
        if (this.editContent) this.editContent.style.display = this.editMode ? 'contents' : 'none';

        if (this.borderVisBtn) {
            setIcon(this.borderVisBtn, this.borderSettings.visible ? 'eye' : 'eye-off');
            this.borderVisBtn.style.opacity = this.borderSettings.visible ? '1' : '0.4';
        }

        if (this.riverWidthInput) this.riverWidthInput.value = this.riverSettings.width.toString();
        if (this.roadWidthInput) this.roadWidthInput.value = this.roadSettings.width.toString();

        const activePathSettings = this.currentToolGroup === 'river' ? this.riverSettings : this.roadSettings;
        if (this.pathPickerBtn) {
            if (activePathSettings.editMode) {
                setIcon(this.pathPickerBtn, 'check');
                this.pathPickerBtn.style.background = PICKER_ACTIVE_BG;
                this.pathPickerBtn.style.color = 'var(--text-on-accent)';
                this.pathPickerBtn.setAttribute('title', t('tooltip.pathFinish'));
            } else if (!this.pathPickMode) {
                setIcon(this.pathPickerBtn, 'mouse-pointer');
                this.pathPickerBtn.style.background = BUTTON_BG_DEFAULT;
                this.pathPickerBtn.style.color = '';
                this.pathPickerBtn.setAttribute('title', t('tooltip.pathPicker'));
            }
        }

        if (this.borderPickerBtn) {
            if (this.borderSettings.activeRegionId !== null) {
                setIcon(this.borderPickerBtn, 'check');
                this.borderPickerBtn.style.background = PICKER_ACTIVE_BG;
                this.borderPickerBtn.style.color = 'var(--text-on-accent)';
                this.borderPickerBtn.setAttribute('title', t('tooltip.borderFinish'));
            } else if (!this.borderPickMode) {
                setIcon(this.borderPickerBtn, 'mouse-pointer');
                this.borderPickerBtn.style.background = BUTTON_BG_DEFAULT;
                this.borderPickerBtn.style.color = '';
                this.borderPickerBtn.setAttribute('title', t('tooltip.borderPicker'));
            }
        }

        if (this.borderDashesInput) this.borderDashesInput.value = (this.borderSettings.dashes || DEFAULT_BORDER_DASHES).toString();

        toolbar.querySelectorAll('[data-draw-mode]').forEach(btn => {
            const isActive = btn.dataset.drawMode === this.drawMode;
            btn.classList.toggle('active', isActive);
            btn.style.background = isActive ? PICKER_ACTIVE_BG : BUTTON_BG_DEFAULT;
            btn.style.border = isActive ? ACTIVE_BORDER : '';
            btn.style.boxShadow = isActive ? ACTIVE_BOX_SHADOW : '';
        });

        ['grass', 'tree', 'mountain', 'building'].forEach(groupId => {
            const config = this.toolConfigs[groupId];
            const wrapper = toolbar.querySelector(`[data-tool-group-wrapper="${groupId}"]`);
            const btn = toolbar.querySelector(`[data-tool-group="${groupId}"]`);

            if (!btn || !config || !wrapper) return;

            const isActive = this.currentToolGroup === groupId;
            btn.classList.toggle('active', isActive);

            const currentVariant = config.variants.find(v => v.id === config.currentVariant);
            if (currentVariant) {
                btn.setAttribute('title', t('tooltip.toolGroupVariant', { label: currentVariant.label }));
            }

            btn.style.background = isActive ? PICKER_ACTIVE_BG : (config.backgroundEnabled ? config.backgroundColor : BUTTON_BG_DEFAULT);
            btn.style.color = config.symbolColor;

            btn.style.border = isActive ? ACTIVE_BORDER : '';
            btn.style.boxShadow = isActive ? ACTIVE_BOX_SHADOW : '';
        });

        toolbar.querySelectorAll('[data-tool-group]').forEach(btn => {
            const groupId = btn.dataset.toolGroup;
            if (!['grass', 'tree', 'mountain', 'building'].includes(groupId)) {
                const isActive = btn.dataset.toolGroup === this.currentToolGroup;
                btn.classList.toggle('active', isActive);
                btn.style.background = isActive ? PICKER_ACTIVE_BG : BUTTON_BG_DEFAULT;
                btn.style.border = isActive ? ACTIVE_BORDER : '';
                btn.style.boxShadow = isActive ? ACTIVE_BOX_SHADOW : '';
                if (groupId === 'hexcolor') {
                    btn.style.color = this.hexColorColor;
                }
            }
        });

        toolbar.querySelectorAll('.hex-color-slot').forEach(slot => {
            const pk = slot.dataset.paletteKey;
            const pi = parseInt(slot.dataset.paletteIndex);
            if (pk && this[pk]) {
                slot.style.backgroundColor = this[pk][pi];
            }
        });
    }


    getTextAt(worldX, worldY) {
        if (!this.data.texts) return null;
        return this.data.texts.find(t => {
            const weight = t.bold ? "bold " : "";
            this.ctx.font = `${weight}${t.size || 16}px Verdana`;
            const metrics = this.ctx.measureText(t.text);
            const halfWidth = metrics.width / 2;
            const height = t.size || 16;
            return worldX >= t.x - halfWidth - 5 && worldX <= t.x + halfWidth + 5 &&
                   worldY >= t.y - height && worldY <= t.y + 5;
        });
    }

    setupEventListeners() {
        this.containerEl.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                this.undo();
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                this.redo();
            }
        });

        this.canvas.addEventListener('mousedown', (e) => {
            this.canvas.focus();
            const world = this.getWorldCoords(e);

            if (e.button === 1 || e.shiftKey) {
                this.isDraggingMap = true;
                return;
            }

            if (e.button === 2 && this.editMode) {
                e.preventDefault();
                const now = Date.now();
                const hex = this.pixelToHex(world.x, world.y);
                const key = `${hex.q}_${hex.r}`;
                if (this._rightClickLast && now - this._rightClickLast.time < 400 && this._rightClickLast.key === key) {
                    this._rightClickLast = null;
                    this.handleEraserFlood(hex);
                    this.render();
                    this.requestSave();
                    return;
                }
                this._rightClickLast = { time: now, key };
                this.isRightMouseErasing = true;
                this.rightEraseLastHex = null;
                this.pushHistory();
                this.handleEraser(hex, world.x, world.y);
                this.rightEraseLastHex = key;
                this.render();
                return;
            }

            this.pendingHistory = true;
            this.isMouseDown = true;
            this.mouseDownPos = { x: world.x, y: world.y };
            this.startHex = this.pixelToHex(world.x, world.y);
            this.lastHex = this.startHex;

            if (this.colorPickMode) {
                const cx = Math.round(this.mouseDownPos.x * this.data.zoom + this.data.offX);
                const cy = Math.round(this.mouseDownPos.y * this.data.zoom + this.data.offY);
                if (cx >= 0 && cy >= 0 && cx < this.canvas.width && cy < this.canvas.height) {
                    const pixel = this.ctx.getImageData(cx, cy, 1, 1).data;
                    if (pixel[3] > 0) {
                        this.masterColor = rgbToHex(pixel[0], pixel[1], pixel[2]);
                        if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                        this.updateActivePathColor();
                        new Notice(t('notice.colorPicked'));
                    } else {
                        new Notice(t('notice.noColorAtPosition'));
                    }
                } else {
                    new Notice(t('notice.noColorAtPosition'));
                }
                this.colorPickMode = false;
                if (this.colorEyedropperBtn) { this.colorEyedropperBtn.style.background = BUTTON_BG_DEFAULT; this.colorEyedropperBtn.style.color = ''; }
                this.isMouseDown = false;
                const toolbar = this.containerEl.querySelector('.hex-toolbar');
                if (toolbar) this.updateToolbarState(toolbar);
                this.render();
                return;
            }

            if (this.patternPickMode) {
                const key = `${this.startHex.q}_${this.startHex.r}`;
                const hexData = this.data.hexes[key];
                if (hexData) {
                    this.patternData = JSON.parse(JSON.stringify(hexData));
                    this.patternSourceHex = { q: this.startHex.q, r: this.startHex.r };
                    new Notice(t('notice.patternPicked'));
                    this.currentToolGroup = 'pattern';
                    this.drawMode = 'pen';
                } else {
                    this.patternData = null;
                    this.patternSourceHex = null;
                    new Notice(t('notice.noHexAtPosition'));
                }
                this.patternPickMode = false;
                if (this.patternPickerBtn) {
                    this.patternPickerBtn.style.background = BUTTON_BG_DEFAULT;
                }
                const toolbar = this.containerEl.querySelector('.hex-toolbar');
                if (toolbar) {
                    this.updateToolbarState(toolbar);
                }
                this.render();
                this.requestSave(); // Speichere Muster sofort
                return;
            }

            if (this.borderPickMode) {
                const clickedHex = this.startHex;
                let foundRegion = null;
                if (this.data.borders) {
                    for (const region of this.data.borders) {
                        if (region.hexes.some(b => b.q === clickedHex.q && b.r === clickedHex.r)) {
                            foundRegion = region;
                            break;
                        }
                    }
                }
                if (foundRegion) {
                    this.borderSettings.activeRegionId = foundRegion.id;
                    this.borderSettings.pickedHex = { q: clickedHex.q, r: clickedHex.r };
                    this.borderSettings.dashes = foundRegion.dashes || DEFAULT_BORDER_DASHES;
                    this.masterColor = foundRegion.color;
                    if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                    if (this.borderDashesInput) this.borderDashesInput.value = this.borderSettings.dashes.toString();
                    new Notice(t('notice.borderSelected', { id: foundRegion.id }));
                } else {
                    new Notice(t('notice.noBorderAtPosition'));
                }
                this.borderPickMode = false;
                if (this.borderPickerBtn) {
                    this.borderPickerBtn.style.background = BUTTON_BG_DEFAULT;
                    this.borderPickerBtn.style.color = '';
                }
                this.currentToolGroup = 'border';
                this.drawMode = 'pen';
                const toolbar = this.containerEl.querySelector('.hex-toolbar');
                if (toolbar) {
                    this.updateToolbarState(toolbar);
                }
                this.render();
                return;
            }

            if (this.pathPickMode) {
                this.pickPathAtHex(this.startHex);
                return;
            }

            let hitText = this.getTextAt(world.x, world.y);
            if (hitText && this.currentToolGroup === 'text' && this.drawMode === 'none') {
                this.pushHistoryIfNeeded();
                this.draggedText = hitText;
            } else {
                this.processInput(e, true);
            }
        });

        this.canvas.addEventListener('contextmenu', (e) => {
            if (this.editMode) e.preventDefault();
        });

        this.canvas.addEventListener('dblclick', (e) => {
            if (!this.editMode) return;
            if (e.button === 2 || this.drawMode === 'eraser') {
                const world = this.getWorldCoords(e);
                const hex = this.pixelToHex(world.x, world.y);
                if (this.history.length > 0) this.history.pop();
                this.handleEraserFlood(hex);
                this.render();
                this.requestSave();
            }
        });

        this.containerEl.addEventListener('mousemove', (e) => {
            const world = this.getWorldCoords(e);
            if (this.isRightMouseErasing) {
                const hex = this.pixelToHex(world.x, world.y);
                const key = `${hex.q}_${hex.r}`;
                if (key !== this.rightEraseLastHex) {
                    this.handleEraser(hex, world.x, world.y);
                    this.rightEraseLastHex = key;
                    this.render();
                }
                return;
            }
            if (this.isDraggingMap) {
                this.data.offX += e.movementX;
                this.data.offY += e.movementY;
                this.render();
            } else if (this.draggedText) {
                this.draggedText.x = world.x;
                this.draggedText.y = world.y;
                this.render();
            } else if (this.isMouseDown) {
                if (this.roadDragIndex !== null && this.roadSettings.editMode) {
                    const road = this.data.roads && this.data.roads.find(r => r.id === this.roadSettings.activeRoadId);
                    if (road) {
                        const currentHex = this.pixelToHex(world.x, world.y);
                        const curQ = road.waypoints[this.roadDragIndex.idx].q;
                        const curR = road.waypoints[this.roadDragIndex.idx].r;
                        if (curQ !== currentHex.q || curR !== currentHex.r) {
                            this.pushHistoryIfNeeded();
                            this.roadDragIndex.group.forEach(i => {
                                road.waypoints[i].q = currentHex.q;
                                road.waypoints[i].r = currentHex.r;
                            });
                            this.render();
                        }
                    }
                } else if (this.riverDragIndex !== null && this.riverSettings.editMode) {
                    const river = this.data.rivers && this.data.rivers.find(r => r.id === this.riverSettings.activeRiverId);
                    if (river) {
                        const currentHex = this.pixelToHex(world.x, world.y);
                        const curQ = river.waypoints[this.riverDragIndex.idx].q;
                        const curR = river.waypoints[this.riverDragIndex.idx].r;
                        if (curQ !== currentHex.q || curR !== currentHex.r) {
                            this.pushHistoryIfNeeded();
                            this.riverDragIndex.group.forEach(i => {
                                river.waypoints[i].q = currentHex.q;
                                river.waypoints[i].r = currentHex.r;
                            });
                            this.render();
                        }
                    }
                } else {
                    this.processInput(e, false);
                    this.render();
                }
            }

            const hoverText = this.getTextAt(world.x, world.y);
            if (hoverText && hoverText.link) {
                this.canvas.title = `${hoverText.link}`;
                this.canvas.style.cursor = 'pointer';
            } else {
                this.canvas.title = '';
                this.canvas.style.cursor = (hoverText && this.currentToolGroup === 'text') ? 'text' : 'crosshair';
            }
        });

        const stop = (e) => {
            if (this.isRightMouseErasing) {
                this.isRightMouseErasing = false;
                this.rightEraseLastHex = null;
                this.requestSave();
                return;
            }
            const world = this.getWorldCoords(e);
            if (this.isMouseDown && this.mouseDownPos) {
                if (this.roadDragIndex !== null && this.roadSettings.editMode) {
                    const dist = Math.sqrt((world.x - this.mouseDownPos.x)**2 + (world.y - this.mouseDownPos.y)**2);
                    if (dist < 5) {
                        const road = this.data.roads && this.data.roads.find(r => r.id === this.roadSettings.activeRoadId);
                        if (road) {
                            this.handleWaypointClick(road, this.roadSettings, this.roadDragIndex.idx);
                        }
                    }
                    this.roadDragIndex = null;
                    this.requestSave();
                    this.isMouseDown = false;
                    this.isDraggingMap = false;
                    this.draggedText = null;
                    this.lastHex = null;
                    this.startHex = null;
                    this.render();
                    return;
                }

                if (this.riverDragIndex !== null && this.riverSettings.editMode) {
                    const dist = Math.sqrt((world.x - this.mouseDownPos.x)**2 + (world.y - this.mouseDownPos.y)**2);
                    if (dist < 5) {
                        const river = this.data.rivers && this.data.rivers.find(r => r.id === this.riverSettings.activeRiverId);
                        if (river) {
                            this.handleWaypointClick(river, this.riverSettings, this.riverDragIndex.idx);
                        }
                    }
                    this.riverDragIndex = null;
                    this.requestSave();
                    this.isMouseDown = false;
                    this.isDraggingMap = false;
                    this.draggedText = null;
                    this.lastHex = null;
                    this.startHex = null;
                    this.render();
                    return;
                }
                const dist = Math.sqrt((world.x - this.mouseDownPos.x)**2 + (world.y - this.mouseDownPos.y)**2);
                if (dist < 5 && this.drawMode !== 'eraser') {
                    const hitText = this.getTextAt(world.x, world.y);
                    if (hitText) {
                        if (this.currentToolGroup === 'text') {
                            const hitX = hitText.x, hitY = hitText.y;
                            new TextInputModal(this.app, (v, s, l, c, o, b, sh, shd, sho) => {
                                const target = this.data.texts.find(t => t.x === hitX && t.y === hitY);
                                if (v && target) {
                                    target.text = v; target.size = s; target.link = l;
                                    target.color = c; target.outline = o; target.bold = b;
                                    target.shadow = sh; target.shadowDistance = shd; target.shadowOpatown = sho;
                                    this.lastUsedTextSize = s; this.lastUsedTextColor = c; this.lastUsedTextOutline = o; this.lastUsedTextBold = b;
                                    this.lastUsedTextShadow = sh; this.lastUsedTextShadowDistance = shd; this.lastUsedTextShadowOpatown = sho;
                                }
                                else if (!v) { this.data.texts = this.data.texts.filter(t => !(t.x === hitX && t.y === hitY)); }
                                this.render(); this.requestSave();
                            }, hitText.text, hitText.size, hitText.link, hitText.color, hitText.outline, hitText.bold, hitText.shadow, hitText.shadowDistance, hitText.shadowOpatown, this.colorPalette, this.colorPalette2).open();
                        } else if (hitText.link) {
                            this.app.workspace.openLinkText(hitText.link, this.file.path, true);
                        }
                    }
                }
            }
            if (this.isMouseDown || this.draggedText) this.requestSave();
            this.isMouseDown = false;
            this.isDraggingMap = false;
            this.draggedText = null;
            this.roadDragIndex = null;
            this.riverDragIndex = null;
            this.lastHex = null;
            this.startHex = null;
            this.render();
        };
        this.containerEl.addEventListener('mouseup', stop);
        this.containerEl.addEventListener('mouseleave', stop);

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();

            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const oldZoom = this.data.zoom;
            const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * zoomFactor));
            if (newZoom === oldZoom) return;

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const worldX = (mouseX - this.data.offX) / oldZoom;
            const worldY = (mouseY - this.data.offY) / oldZoom;

            this.data.offX = mouseX - worldX * newZoom;
            this.data.offY = mouseY - worldY * newZoom;
            this.data.zoom = newZoom;

            this.render();
        }, { passive: false });

        this.touchState = {
            touches: [],
            initialDistance: 0,
            initialZoom: 1,
            initialPanX: 0,
            initialPanY: 0,
            isTwoFingerGesture: false,
            touchStartTimeout: null,
            pendingTouchStart: null,
            hasMovedSinceStart: false,
            lastTapTime: 0,
            lastTapHex: null
        };

        this.canvas.addEventListener('touchstart', (e) => {
            this.canvas.focus();
            this.touchState.touches = Array.from(e.touches);

            if (this.touchState.touchStartTimeout) {
                clearTimeout(this.touchState.touchStartTimeout);
                this.touchState.touchStartTimeout = null;
                this.touchState.pendingTouchStart = null;
            }

            if (e.touches.length === 2) {
                e.preventDefault();
                this.touchState.isTwoFingerGesture = true;
                this.touchState.hasMovedSinceStart = false;

                if (this.isMouseDown && !this.touchState.hasMovedSinceStart) {
                    this.isMouseDown = false;
                    this.draggedText = null;
                    if (this.history.length > 0 && !this.touchState.hasMovedSinceStart) {
                        this.history.pop(); // Entferne den History-Eintrag vom Touch-Start
                    }
                }

                const touch1 = e.touches[0];
                const touch2 = e.touches[1];

                const dx = touch2.clientX - touch1.clientX;
                const dy = touch2.clientY - touch1.clientY;
                this.touchState.initialDistance = Math.sqrt(dx * dx + dy * dy);
                this.touchState.initialZoom = this.data.zoom;

                this.touchState.initialPanX = this.data.offX;
                this.touchState.initialPanY = this.data.offY;
                this.touchState.centerX = (touch1.clientX + touch2.clientX) / 2;
                this.touchState.centerY = (touch1.clientY + touch2.clientY) / 2;

                const rect = this.canvas.getBoundingClientRect();
                this.touchState.pivotX = this.touchState.centerX - rect.left;
                this.touchState.pivotY = this.touchState.centerY - rect.top;
            } else if (e.touches.length === 1) {
                this.touchState.isTwoFingerGesture = false;
                this.touchState.hasMovedSinceStart = false;

                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousedown', {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    button: 0,
                    bubbles: true,
                    cancelable: true
                });

                this.touchState.pendingTouchStart = {
                    touch: touch,
                    mouseEvent: mouseEvent,
                    timestamp: Date.now()
                };

                this.touchState.touchStartTimeout = setTimeout(() => {
                    if (this.touchState.pendingTouchStart && !this.touchState.isTwoFingerGesture) {
                        const world = this.getWorldCoords(this.touchState.pendingTouchStart.mouseEvent);
                        this.pendingHistory = true;
                        this.isMouseDown = true;
                        this.mouseDownPos = { x: world.x, y: world.y };
                        this.startHex = this.pixelToHex(world.x, world.y);
                        this.lastHex = this.startHex;

                        if (this.colorPickMode) {
                            const cx = Math.round(this.mouseDownPos.x * this.data.zoom + this.data.offX);
                            const cy = Math.round(this.mouseDownPos.y * this.data.zoom + this.data.offY);
                            if (cx >= 0 && cy >= 0 && cx < this.canvas.width && cy < this.canvas.height) {
                                const pixel = this.ctx.getImageData(cx, cy, 1, 1).data;
                                if (pixel[3] > 0) {
                                    this.masterColor = rgbToHex(pixel[0], pixel[1], pixel[2]);
                                    if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                                    this.updateActivePathColor();
                                    new Notice(t('notice.colorPicked'));
                                } else {
                                    new Notice(t('notice.noColorAtPosition'));
                                }
                            } else {
                                new Notice(t('notice.noColorAtPosition'));
                            }
                            this.colorPickMode = false;
                            if (this.colorEyedropperBtn) { this.colorEyedropperBtn.style.background = BUTTON_BG_DEFAULT; this.colorEyedropperBtn.style.color = ''; }
                            this.isMouseDown = false;
                            this.touchState.pendingTouchStart = null;
                            const toolbar = this.containerEl.querySelector('.hex-toolbar');
                            if (toolbar) this.updateToolbarState(toolbar);
                            this.render();
                            return;
                        }

                        if (this.patternPickMode) {
                            const key = `${this.startHex.q}_${this.startHex.r}`;
                            const hexData = this.data.hexes[key];
                            if (hexData) {
                                this.patternData = JSON.parse(JSON.stringify(hexData));
                                this.patternSourceHex = { q: this.startHex.q, r: this.startHex.r };
                                new Notice(t('notice.patternPicked'));
                                this.currentToolGroup = 'pattern';
                                this.drawMode = 'pen';
                            } else {
                                this.patternData = null;
                                this.patternSourceHex = null;
                                new Notice(t('notice.noHexAtPosition'));
                            }
                            this.patternPickMode = false;
                            if (this.patternPickerBtn) {
                                this.patternPickerBtn.style.background = BUTTON_BG_DEFAULT;
                            }
                            const toolbar = this.containerEl.querySelector('.hex-toolbar');
                            if (toolbar) {
                                this.updateToolbarState(toolbar);
                            }
                            this.render();
                            this.requestSave();
                            this.touchState.pendingTouchStart = null;
                            return;
                        }

                        if (this.borderPickMode) {
                            const clickedHex = this.startHex;
                            let foundRegion = null;
                            if (this.data.borders) {
                                for (const region of this.data.borders) {
                                    if (region.hexes.some(b => b.q === clickedHex.q && b.r === clickedHex.r)) {
                                        foundRegion = region;
                                        break;
                                    }
                                }
                            }
                            if (foundRegion) {
                                this.borderSettings.activeRegionId = foundRegion.id;
                                this.borderSettings.pickedHex = { q: clickedHex.q, r: clickedHex.r };
                                this.borderSettings.dashes = foundRegion.dashes || DEFAULT_BORDER_DASHES;
                                this.masterColor = foundRegion.color;
                                if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                                if (this.borderDashesInput) this.borderDashesInput.value = this.borderSettings.dashes.toString();
                                new Notice(t('notice.borderSelected', { id: foundRegion.id }));
                            } else {
                                new Notice(t('notice.noBorderAtPosition'));
                            }
                            this.borderPickMode = false;
                            if (this.borderPickerBtn) { this.borderPickerBtn.style.background = BUTTON_BG_DEFAULT; this.borderPickerBtn.style.color = ''; }
                            this.currentToolGroup = 'border';
                            this.drawMode = 'pen';
                            const toolbar = this.containerEl.querySelector('.hex-toolbar');
                            if (toolbar) this.updateToolbarState(toolbar);
                            this.render();
                            this.touchState.pendingTouchStart = null;
                            return;
                        }

                        if (this.pathPickMode) {
                            this.pickPathAtHex(this.startHex);
                            this.touchState.pendingTouchStart = null;
                            return;
                        }

                        let hitText = this.getTextAt(world.x, world.y);
                        if (hitText && this.currentToolGroup === 'text' && this.drawMode === 'none') {
                            this.pushHistoryIfNeeded();
                            this.draggedText = hitText;
                        } else {
                            this.processInput(this.touchState.pendingTouchStart.mouseEvent, true);
                        }
                    }
                    this.touchState.pendingTouchStart = null;
                    this.touchState.touchStartTimeout = null;
                }, 150); // 150ms Verzögerung
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && this.touchState.isTwoFingerGesture) {
                e.preventDefault();

                const touch1 = e.touches[0];
                const touch2 = e.touches[1];

                const dx = touch2.clientX - touch1.clientX;
                const dy = touch2.clientY - touch1.clientY;
                const currentDistance = Math.sqrt(dx * dx + dy * dy);
                const zoomFactor = currentDistance / this.touchState.initialDistance;
                const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.touchState.initialZoom * zoomFactor));

                const pivotWorldX = (this.touchState.pivotX - this.touchState.initialPanX) / this.touchState.initialZoom;
                const pivotWorldY = (this.touchState.pivotY - this.touchState.initialPanY) / this.touchState.initialZoom;

                const newOffX = this.touchState.pivotX - pivotWorldX * newZoom;
                const newOffY = this.touchState.pivotY - pivotWorldY * newZoom;

                const currentCenterX = (touch1.clientX + touch2.clientX) / 2;
                const currentCenterY = (touch1.clientY + touch2.clientY) / 2;
                const deltaX = currentCenterX - this.touchState.centerX;
                const deltaY = currentCenterY - this.touchState.centerY;

                this.data.zoom = newZoom;
                this.data.offX = newOffX + deltaX;
                this.data.offY = newOffY + deltaY;

                this.render();
            } else if (e.touches.length === 1 && !this.touchState.isTwoFingerGesture) {
                if (!this.isMouseDown && this.touchState.pendingTouchStart) {
                    return;
                }

                e.preventDefault();
                this.touchState.hasMovedSinceStart = true;

                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousemove', {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    bubbles: true,
                    cancelable: true
                });

                const world = this.getWorldCoords(mouseEvent);

                if (this.draggedText) {
                    this.draggedText.x = world.x;
                    this.draggedText.y = world.y;
                    this.render();
                } else if (this.isMouseDown) {
                    if (this.roadDragIndex !== null && this.roadSettings.editMode) {
                        const road = this.data.roads && this.data.roads.find(r => r.id === this.roadSettings.activeRoadId);
                        if (road) {
                            const currentHex = this.pixelToHex(world.x, world.y);
                            const curQ = road.waypoints[this.roadDragIndex.idx].q;
                            const curR = road.waypoints[this.roadDragIndex.idx].r;
                            if (curQ !== currentHex.q || curR !== currentHex.r) {
                                this.pushHistoryIfNeeded();
                                this.roadDragIndex.group.forEach(i => {
                                    road.waypoints[i].q = currentHex.q;
                                    road.waypoints[i].r = currentHex.r;
                                });
                                this.render();
                            }
                        }
                    } else if (this.riverDragIndex !== null && this.riverSettings.editMode) {
                        const river = this.data.rivers && this.data.rivers.find(r => r.id === this.riverSettings.activeRiverId);
                        if (river) {
                            const currentHex = this.pixelToHex(world.x, world.y);
                            const curQ = river.waypoints[this.riverDragIndex.idx].q;
                            const curR = river.waypoints[this.riverDragIndex.idx].r;
                            if (curQ !== currentHex.q || curR !== currentHex.r) {
                                this.pushHistoryIfNeeded();
                                this.riverDragIndex.group.forEach(i => {
                                    river.waypoints[i].q = currentHex.q;
                                    river.waypoints[i].r = currentHex.r;
                                });
                                this.render();
                            }
                        }
                    } else {
                        this.processInput(mouseEvent, false);
                        this.render();
                    }
                }
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            if (this.touchState.touchStartTimeout) {
                clearTimeout(this.touchState.touchStartTimeout);
                this.touchState.touchStartTimeout = null;
            }

            if (this.touchState.isTwoFingerGesture && e.touches.length < 2) {
                e.preventDefault();
                this.touchState.isTwoFingerGesture = false;
            } else if (e.touches.length === 0 && !this.touchState.isTwoFingerGesture) {
                e.preventDefault();

                if (this.touchState.pendingTouchStart && !this.isMouseDown) {
                    const world = this.getWorldCoords(this.touchState.pendingTouchStart.mouseEvent);
                    this.pendingHistory = true;
                    this.isMouseDown = true;
                    this.mouseDownPos = { x: world.x, y: world.y };
                    this.startHex = this.pixelToHex(world.x, world.y);
                    this.lastHex = this.startHex;

                    if (this.colorPickMode) {
                        const cx = Math.round(this.mouseDownPos.x * this.data.zoom + this.data.offX);
                        const cy = Math.round(this.mouseDownPos.y * this.data.zoom + this.data.offY);
                        if (cx >= 0 && cy >= 0 && cx < this.canvas.width && cy < this.canvas.height) {
                            const pixel = this.ctx.getImageData(cx, cy, 1, 1).data;
                            if (pixel[3] > 0) {
                                this.masterColor = rgbToHex(pixel[0], pixel[1], pixel[2]);
                                if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                                this.updateActivePathColor();
                                new Notice(t('notice.colorPicked'));
                            } else {
                                new Notice(t('notice.noColorAtPosition'));
                            }
                        } else {
                            new Notice(t('notice.noColorAtPosition'));
                        }
                        this.colorPickMode = false;
                        if (this.colorEyedropperBtn) { this.colorEyedropperBtn.style.background = BUTTON_BG_DEFAULT; this.colorEyedropperBtn.style.color = ''; }
                        this.isMouseDown = false;
                        this.touchState.pendingTouchStart = null;
                        const toolbar = this.containerEl.querySelector('.hex-toolbar');
                        if (toolbar) this.updateToolbarState(toolbar);
                        this.render();
                        return;
                    }

                    if (this.patternPickMode) {
                        const key = `${this.startHex.q}_${this.startHex.r}`;
                        const hexData = this.data.hexes[key];
                        if (hexData) {
                            this.patternData = JSON.parse(JSON.stringify(hexData));
                            this.patternSourceHex = { q: this.startHex.q, r: this.startHex.r };
                            new Notice(t('notice.patternPicked'));
                            this.currentToolGroup = 'pattern';
                            this.drawMode = 'pen';
                        } else {
                            this.patternData = null;
                            this.patternSourceHex = null;
                            new Notice(t('notice.noHexAtPosition'));
                        }
                        this.patternPickMode = false;
                        if (this.patternPickerBtn) {
                            this.patternPickerBtn.style.background = BUTTON_BG_DEFAULT;
                        }
                        const toolbar = this.containerEl.querySelector('.hex-toolbar');
                        if (toolbar) {
                            this.updateToolbarState(toolbar);
                        }
                        this.render();
                        this.requestSave();
                        this.touchState.pendingTouchStart = null;
                        this.isMouseDown = false;
                        return;
                    }

                    if (this.borderPickMode) {
                        const clickedHex = this.startHex;
                        let foundRegion = null;
                        if (this.data.borders) {
                            for (const region of this.data.borders) {
                                if (region.hexes.some(b => b.q === clickedHex.q && b.r === clickedHex.r)) {
                                    foundRegion = region;
                                    break;
                                }
                            }
                        }
                        if (foundRegion) {
                            this.borderSettings.activeRegionId = foundRegion.id;
                            this.borderSettings.pickedHex = { q: clickedHex.q, r: clickedHex.r };
                            this.borderSettings.dashes = foundRegion.dashes || DEFAULT_BORDER_DASHES;
                            this.masterColor = foundRegion.color;
                            if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                            if (this.borderDashesInput) this.borderDashesInput.value = this.borderSettings.dashes.toString();
                            new Notice(t('notice.borderSelected', { id: foundRegion.id }));
                        } else {
                            new Notice(t('notice.noBorderAtPosition'));
                        }
                        this.borderPickMode = false;
                        if (this.borderPickerBtn) { this.borderPickerBtn.style.background = BUTTON_BG_DEFAULT; this.borderPickerBtn.style.color = ''; }
                        this.currentToolGroup = 'border';
                        this.drawMode = 'pen';
                        const toolbar = this.containerEl.querySelector('.hex-toolbar');
                        if (toolbar) this.updateToolbarState(toolbar);
                        this.render();
                        this.touchState.pendingTouchStart = null;
                        this.isMouseDown = false;
                        return;
                    }

                    if (this.pathPickMode) {
                        this.pickPathAtHex(this.startHex);
                        this.touchState.pendingTouchStart = null;
                        this.isMouseDown = false;
                        return;
                    }

                    let hitText = this.getTextAt(world.x, world.y);
                    if (hitText && this.currentToolGroup === 'text' && this.drawMode === 'none') {
                        this.pushHistoryIfNeeded();
                        this.draggedText = hitText;
                    } else {
                        this.processInput(this.touchState.pendingTouchStart.mouseEvent, true);
                    }
                }

                const touch = e.changedTouches[0];
                const mouseEvent = new MouseEvent('mouseup', {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    bubbles: true,
                    cancelable: true
                });

                const world = this.getWorldCoords(mouseEvent);

                if (this.isMouseDown && this.mouseDownPos) {
                    if (this.roadDragIndex !== null && this.roadSettings.editMode) {
                        const dist = Math.sqrt((world.x - this.mouseDownPos.x)**2 + (world.y - this.mouseDownPos.y)**2);
                        if (dist < 5) {
                            const road = this.data.roads && this.data.roads.find(r => r.id === this.roadSettings.activeRoadId);
                            if (road) {
                                this.handleWaypointClick(road, this.roadSettings, this.roadDragIndex.idx);
                            }
                        }
                        this.roadDragIndex = null;
                        this.requestSave();
                        this.isMouseDown = false;
                        this.draggedText = null;
                        this.lastHex = null;
                        this.startHex = null;
                        this.touchState.pendingTouchStart = null;
                        this.render();
                        return;
                    }

                    if (this.riverDragIndex !== null && this.riverSettings.editMode) {
                        const dist = Math.sqrt((world.x - this.mouseDownPos.x)**2 + (world.y - this.mouseDownPos.y)**2);
                        if (dist < 5) {
                            const river = this.data.rivers && this.data.rivers.find(r => r.id === this.riverSettings.activeRiverId);
                            if (river) {
                                this.handleWaypointClick(river, this.riverSettings, this.riverDragIndex.idx);
                            }
                        }
                        this.riverDragIndex = null;
                        this.requestSave();
                        this.isMouseDown = false;
                        this.draggedText = null;
                        this.lastHex = null;
                        this.startHex = null;
                        this.touchState.pendingTouchStart = null;
                        this.render();
                        return;
                    }
                    const dist = Math.sqrt((world.x - this.mouseDownPos.x)**2 + (world.y - this.mouseDownPos.y)**2);
                    if (dist < 5 && this.drawMode !== 'eraser') {
                        const hitText = this.getTextAt(world.x, world.y);
                        if (hitText) {
                            if (this.currentToolGroup === 'text') {
                                const hitX = hitText.x, hitY = hitText.y;
                                new TextInputModal(this.app, (v, s, l, c, o, b, sh, shd, sho) => {
                                    const target = this.data.texts.find(t => t.x === hitX && t.y === hitY);
                                    if (v && target) {
                                        target.text = v; target.size = s; target.link = l;
                                        target.color = c; target.outline = o; target.bold = b;
                                        target.shadow = sh; target.shadowDistance = shd; target.shadowOpatown = sho;
                                        this.lastUsedTextSize = s; this.lastUsedTextColor = c; this.lastUsedTextOutline = o; this.lastUsedTextBold = b;
                                        this.lastUsedTextShadow = sh; this.lastUsedTextShadowDistance = shd; this.lastUsedTextShadowOpatown = sho;
                                    }
                                    else if (!v) { this.data.texts = this.data.texts.filter(t => !(t.x === hitX && t.y === hitY)); }
                                    this.render(); this.requestSave();
                                }, hitText.text, hitText.size, hitText.link, hitText.color, hitText.outline, hitText.bold, hitText.shadow, hitText.shadowDistance, hitText.shadowOpatown, this.colorPalette, this.colorPalette2).open();
                            } else if (hitText.link) {
                                this.app.workspace.openLinkText(hitText.link, this.file.path, true);
                            }
                        }
                    }
                }
                if (this.isMouseDown || this.draggedText) this.requestSave();

                if (this.editMode && this.drawMode === 'eraser' && e.changedTouches.length > 0) {
                    const tapTouch = e.changedTouches[0];
                    const tapEvent = new MouseEvent('mouseup', { clientX: tapTouch.clientX, clientY: tapTouch.clientY, bubbles: true, cancelable: true });
                    const tapWorld = this.getWorldCoords(tapEvent);
                    const tapHex = this.pixelToHex(tapWorld.x, tapWorld.y);
                    const now = Date.now();

                    if (this.touchState.lastTapTime &&
                        now - this.touchState.lastTapTime < 400 &&
                        this.touchState.lastTapHex &&
                        this.touchState.lastTapHex.q === tapHex.q &&
                        this.touchState.lastTapHex.r === tapHex.r) {
                        if (this.history.length > 0) this.history.pop();
                        this.handleEraserFlood(tapHex);
                        this.render();
                        this.requestSave();
                        this.touchState.lastTapTime = 0;
                        this.touchState.lastTapHex = null;
                    } else {
                        this.touchState.lastTapTime = now;
                        this.touchState.lastTapHex = { q: tapHex.q, r: tapHex.r };
                    }
                }

                this.isMouseDown = false;
                this.draggedText = null;
                this.roadDragIndex = null;
                this.riverDragIndex = null;
                this.lastHex = null;
                this.startHex = null;
                this.touchState.pendingTouchStart = null;
                this.render();
            }

            this.touchState.touches = Array.from(e.touches);
        }, { passive: false });

        this.canvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();

            if (this.touchState.touchStartTimeout) {
                clearTimeout(this.touchState.touchStartTimeout);
                this.touchState.touchStartTimeout = null;
            }

            this.touchState.isTwoFingerGesture = false;
            this.touchState.pendingTouchStart = null;
            this.isMouseDown = false;
            this.draggedText = null;
            this.roadDragIndex = null;
            this.riverDragIndex = null;
            this.lastHex = null;
            this.startHex = null;
            this.touchState.touches = [];
            this.render();
        }, { passive: false });
    }

    calculateHexPath(start, end, width) {
        if (!start || !end) return [];
        const path = [];
        const n = this.hexDistance(start, end);
        let prev = start;
        for (let i = 1; i <= n; i++) {
            const next = this.hexLerp(start, end, i / n);
            path.push({ from: {q: prev.q, r: prev.r}, to: {q: next.q, r: next.r}, width: width });
            prev = next;
        }
        return path;
    }

    hexDistance(a, b) {
        return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
    }

    hexLerp(a, b, t) {
        const q = a.q + (b.q - a.q) * t, r = a.r + (b.r - a.r) * t;
        let rq = Math.round(q), rr = Math.round(r), rs = Math.round(-q-r);
        const qd = Math.abs(rq - q), rd = Math.abs(rr - r), sd = Math.abs(rs - (-q-r));
        if (qd > rd && qd > sd) rq = -rr-rs;
        else if (rd > sd) rr = -rq-rs;
        return { q: rq, r: rr };
    }

    processInput(e, isInitial) {
        this.pushHistoryIfNeeded();
        const world = this.getWorldCoords(e);
        const hex = this.pixelToHex(world.x, world.y);

        if (this.currentToolGroup === 'text' && this.drawMode === 'none' && isInitial) {
            const existingText = this.getTextAt(world.x, world.y);
            if (!existingText) {
                new TextInputModal(this.app, (v, s, l, c, o, b, sh, shd, sho) => {
                    if(v) {
                        this.data.texts.push({text: v, x: world.x, y: world.y, size: s, link: l, color: c, outline: o, bold: b, shadow: sh, shadowDistance: shd, shadowOpatown: sho});
                        this.lastUsedTextSize = s; this.lastUsedTextColor = c; this.lastUsedTextOutline = o; this.lastUsedTextBold = b;
                        this.lastUsedTextShadow = sh; this.lastUsedTextShadowDistance = shd; this.lastUsedTextShadowOpatown = sho;
                        this.render(); this.requestSave();
                    }
                }, '', this.lastUsedTextSize, '', this.lastUsedTextColor || this.masterColor, this.lastUsedTextOutline, this.lastUsedTextBold, this.lastUsedTextShadow, this.lastUsedTextShadowDistance, this.lastUsedTextShadowOpatown, this.colorPalette, this.colorPalette2).open();
            }
            return;
        }

        if (!this.editMode || this.drawMode === 'none') {
            return;
        }

        if (this.drawMode === 'eraser') {
            this.handleEraser(hex, world.x, world.y);
        } else if (this.drawMode === 'fill') {
            if (isInitial) this.handleFillTool(hex);
        } else if (this.drawMode === 'pen') {
            if (this.currentToolGroup === 'border') {
                this.addBorderHex(hex);
            } else if (this.currentToolGroup === 'road' && isInitial) {
                this.addRoadWaypoint(hex);
            } else if (this.currentToolGroup === 'river' && isInitial) {
                this.addRiverWaypoint(hex);
            } else if (!['river', 'road', 'text'].includes(this.currentToolGroup)) {
                this.paintHex(hex);
            }
        }
    }

    addBorderHex(hex) {
        if (!this.data.borders) this.data.borders = [];

        let region = this.data.borders.find(r => r.id === this.borderSettings.activeRegionId);
        if (!region) {
            const maxId = this.data.borders.reduce((max, r) => Math.max(max, r.id || 0), 0);
            region = { id: maxId + 1, color: this.masterColor, dashes: this.borderSettings.dashes || DEFAULT_BORDER_DASHES, hexes: [] };
            this.data.borders.push(region);
            this.borderSettings.activeRegionId = region.id;
        }

        this.data.borders.forEach(r => {
            if (r.id !== region.id) {
                r.hexes = r.hexes.filter(b => !(b.q === hex.q && b.r === hex.r));
            }
        });
        this.data.borders = this.data.borders.filter(r => r.hexes.length > 0 || r.id === region.id);

        const exists = region.hexes.some(b => b.q === hex.q && b.r === hex.r);
        if (!exists) {
            region.hexes.push({ q: hex.q, r: hex.r });
        }

        const toolbar = this.containerEl.querySelector('.hex-toolbar');
        if (toolbar) this.updateToolbarState(toolbar);
    }

    findRoadAtHex(hex) {
        if (!this.data.roads) return null;
        for (const road of this.data.roads) {
            if (!road.waypoints || road.waypoints.length === 0) continue;
            if (road.waypoints.some(w => w.q === hex.q && w.r === hex.r)) return road;
            for (let i = 0; i < road.waypoints.length - 1; i++) {
                const segs = this.calculateHexPath(road.waypoints[i], road.waypoints[i + 1], road.width);
                for (const seg of segs) {
                    if (seg.to.q === hex.q && seg.to.r === hex.r) return road;
                    if (seg.from.q === hex.q && seg.from.r === hex.r) return road;
                }
            }
        }
        return null;
    }

    addRoadWaypoint(hex) {
        if (!this.data.roads) this.data.roads = [];

        let road = this.data.roads.find(r => r.id === this.roadSettings.activeRoadId);
        if (road) road.dashes = this.pathDashes || DEFAULT_PATH_DASHES;
        if (!road) {
            const maxId = this.data.roads.reduce((max, r) => Math.max(max, r.id || 0), 0);
            road = { id: maxId + 1, color: this.masterColor, width: this.roadSettings.width, dashes: this.pathDashes || DEFAULT_PATH_DASHES, waypoints: [] };
            this.data.roads.push(road);
            this.roadSettings.activeRoadId = road.id;
            this.roadSettings.editMode = true;
            this.roadSettings.insertAfter = null;
            if (this.pathPickerBtn) {
                setIcon(this.pathPickerBtn, 'check');
                this.pathPickerBtn.style.background = PICKER_ACTIVE_BG;
                this.pathPickerBtn.style.color = 'var(--text-on-accent)';
                this.pathPickerBtn.setAttribute('title', t('tooltip.roadFinish'));
            }
        }

        if (this.roadSettings.editMode) {
            const existingIdx = road.waypoints.findIndex(w => w.q === hex.q && w.r === hex.r);
            if (existingIdx !== -1) {
                const dragGroup = [];
                road.waypoints.forEach((wp, i) => { if (wp.q === hex.q && wp.r === hex.r) dragGroup.push(i); });
                this.roadDragIndex = { idx: existingIdx, origQ: hex.q, origR: hex.r, group: dragGroup };
                return;
            }

            for (let i = 0; i < road.waypoints.length - 1; i++) {
                const to = road.waypoints[i + 1];
                if (to.break) continue;
                const from = road.waypoints[i];
                const segs = this.calculateHexPath(from, to, road.width);
                const onSegment = segs.some(s =>
                    (s.from.q === hex.q && s.from.r === hex.r) ||
                    (s.to.q === hex.q && s.to.r === hex.r)
                );
                if (onSegment) {
                    road.waypoints.splice(i + 1, 0, { q: hex.q, r: hex.r });
                    this.roadSettings.insertAfter = i + 1;
                    return;
                }
            }
        }

        const insertIdx = this.roadSettings.insertAfter;
        if (insertIdx !== null && insertIdx < road.waypoints.length - 1) {
            const bp = road.waypoints[insertIdx];
            road.waypoints.push({ q: bp.q, r: bp.r, break: true });
            road.waypoints.push({ q: hex.q, r: hex.r });
            this.roadSettings.insertAfter = road.waypoints.length - 1;
        } else {
            road.waypoints.push({ q: hex.q, r: hex.r });
            this.roadSettings.insertAfter = road.waypoints.length - 1;
        }
    }

    findRiverAtHex(hex) {
        if (!this.data.rivers) return null;
        for (const river of this.data.rivers) {
            if (!river.waypoints || river.waypoints.length === 0) continue;
            if (river.waypoints.some(w => w.q === hex.q && w.r === hex.r)) return river;
            for (let i = 0; i < river.waypoints.length - 1; i++) {
                const segs = this.calculateHexPath(river.waypoints[i], river.waypoints[i + 1], river.width);
                for (const seg of segs) {
                    if (seg.to.q === hex.q && seg.to.r === hex.r) return river;
                    if (seg.from.q === hex.q && seg.from.r === hex.r) return river;
                }
            }
        }
        return null;
    }

    erasePathElement(paths, hex) {
        if (!paths) return;
        const onWaypoint = paths.some(p =>
            p.waypoints && p.waypoints.some(w => w.q === hex.q && w.r === hex.r)
        );
        if (onWaypoint) {
            paths.forEach(p => {
                p.waypoints = p.waypoints.filter(w => !(w.q === hex.q && w.r === hex.r));
            });
        } else {
            for (const path of paths) {
                if (!path.waypoints || path.waypoints.length < 2) continue;
                for (let i = 0; i < path.waypoints.length - 1; i++) {
                    const to = path.waypoints[i + 1];
                    if (to.break) continue;
                    const from = path.waypoints[i];
                    const segs = this.calculateHexPath(from, to, path.width);
                    const onSegment = segs.some(s =>
                        (s.from.q === hex.q && s.from.r === hex.r) ||
                        (s.to.q === hex.q && s.to.r === hex.r)
                    );
                    if (onSegment) {
                        to.break = true;
                        break;
                    }
                }
            }
        }
        paths.forEach(path => {
            let changed = true;
            while (changed) {
                changed = false;
                for (let j = path.waypoints.length - 1; j >= 0; j--) {
                    const hasLeft = j > 0 && !path.waypoints[j].break;
                    const hasRight = j < path.waypoints.length - 1 && !path.waypoints[j + 1].break;
                    if (!hasLeft && !hasRight) {
                        path.waypoints.splice(j, 1);
                        changed = true;
                    }
                }
            }
            if (path.waypoints.length > 0 && path.waypoints[0].break) {
                delete path.waypoints[0].break;
            }
        });
        for (let i = paths.length - 1; i >= 0; i--) {
            if (paths[i].waypoints.length < 2) paths.splice(i, 1);
        }
    }

    addRiverWaypoint(hex) {
        if (!this.data.rivers) this.data.rivers = [];

        let river = this.data.rivers.find(r => r.id === this.riverSettings.activeRiverId);
        if (river) river.dashes = this.pathDashes || DEFAULT_PATH_DASHES;
        if (!river) {
            const maxId = this.data.rivers.reduce((max, r) => Math.max(max, r.id || 0), 0);
            river = { id: maxId + 1, color: this.masterColor, width: this.riverSettings.width, dashes: this.pathDashes || DEFAULT_PATH_DASHES, waypoints: [] };
            this.data.rivers.push(river);
            this.riverSettings.activeRiverId = river.id;
            this.riverSettings.editMode = true;
            this.riverSettings.insertAfter = null;
            if (this.pathPickerBtn) {
                setIcon(this.pathPickerBtn, 'check');
                this.pathPickerBtn.style.background = PICKER_ACTIVE_BG;
                this.pathPickerBtn.style.color = 'var(--text-on-accent)';
                this.pathPickerBtn.setAttribute('title', t('tooltip.riverFinish'));
            }
        }

        if (this.riverSettings.editMode) {
            const existingIdx = river.waypoints.findIndex(w => w.q === hex.q && w.r === hex.r);
            if (existingIdx !== -1) {
                const dragGroup = [];
                river.waypoints.forEach((wp, i) => { if (wp.q === hex.q && wp.r === hex.r) dragGroup.push(i); });
                this.riverDragIndex = { idx: existingIdx, origQ: hex.q, origR: hex.r, group: dragGroup };
                return;
            }

            for (let i = 0; i < river.waypoints.length - 1; i++) {
                const to = river.waypoints[i + 1];
                if (to.break) continue;
                const from = river.waypoints[i];
                const segs = this.calculateHexPath(from, to, river.width);
                const onSegment = segs.some(s =>
                    (s.from.q === hex.q && s.from.r === hex.r) ||
                    (s.to.q === hex.q && s.to.r === hex.r)
                );
                if (onSegment) {
                    river.waypoints.splice(i + 1, 0, { q: hex.q, r: hex.r });
                    this.riverSettings.insertAfter = i + 1;
                    return;
                }
            }
        }

        const insertIdx = this.riverSettings.insertAfter;
        if (insertIdx !== null && insertIdx < river.waypoints.length - 1) {
            const bp = river.waypoints[insertIdx];
            river.waypoints.push({ q: bp.q, r: bp.r, break: true });
            river.waypoints.push({ q: hex.q, r: hex.r });
            this.riverSettings.insertAfter = river.waypoints.length - 1;
        } else {
            river.waypoints.push({ q: hex.q, r: hex.r });
            this.riverSettings.insertAfter = river.waypoints.length - 1;
        }
    }

    paintHex(hex) {
        const key = `${hex.q}_${hex.r}`;
        let h = this.data.hexes[key];

        if (!h) {
            h = { q: hex.q, r: hex.r };
            this.data.hexes[key] = h;
        }

        if (this.currentToolGroup === 'pattern' && this.patternData) {
            h.color = this.patternData.backgroundColor || this.patternData.color;
            h.symbol = this.patternData.symbol;
            h.symbolColor = this.patternData.symbolColor;
            return;
        }

        if (this.currentToolGroup === 'hexcolor') {
            h.color = this.masterColor;
            return;
        }

        if (this.currentToolGroup && this.toolConfigs[this.currentToolGroup]) {
            const config = this.toolConfigs[this.currentToolGroup];
            h.symbol = config.currentVariant;
            h.symbolColor = this.masterColor;
            config.symbolColor = this.masterColor;

            if (config.backgroundEnabled) {
                h.color = config.backgroundColor;
            }
        }
        else if (this.currentToolGroup === null) {
            h.color = this.colorPalette[this.activeColorSlot];
        }
    }

    handleEraser(hex, x, y) {
        const hasRecentData = this.lastErasedHex &&
            this.lastErasedHex.q === hex.q && this.lastErasedHex.r === hex.r &&
            Date.now() - this.lastErasedHex.timestamp < 1000;

        if (!hasRecentData) {
            const preKey = `${hex.q}_${hex.r}`;
            const preData = this.data.hexes[preKey];
            const tg = this.currentToolGroup;

            if (tg === 'border') {
                const region = this.data.borders.find(r => r.hexes.some(b => b.q === hex.q && b.r === hex.r));
                this.lastErasedHex = region ? { q: hex.q, r: hex.r, type: 'border', regionId: region.id, timestamp: Date.now() } : null;
            } else if (tg === 'pattern' && preData) {
                this.lastErasedHex = { q: hex.q, r: hex.r, type: 'pattern', pattern: { color: preData.color, symbol: preData.symbol, symbolColor: preData.symbolColor }, timestamp: Date.now() };
            } else if (tg && this.toolConfigs[tg] && preData && preData.symbol) {
                this.lastErasedHex = { q: hex.q, r: hex.r, type: 'symbol', symbol: preData.symbol, timestamp: Date.now() };
            } else if ((tg === 'hexcolor' || tg === null) && preData && preData.color) {
                this.lastErasedHex = { q: hex.q, r: hex.r, type: 'color', color: preData.color, toolGroup: tg, timestamp: Date.now() };
            } else if (tg === 'river' || tg === 'road') {
                const paths = tg === 'river' ? (this.data.rivers || []) : (this.data.roads || []);
                const pathIds = [];
                for (const p of paths) {
                    if (p.waypoints && p.waypoints.some(w => w.q === hex.q && w.r === hex.r)) {
                        pathIds.push(p.id);
                        continue;
                    }
                    if (p.waypoints && p.waypoints.length >= 2) {
                        let found = false;
                        for (let i = 0; i < p.waypoints.length - 1 && !found; i++) {
                            if (p.waypoints[i + 1].break) continue;
                            const segs = this.calculateHexPath(p.waypoints[i], p.waypoints[i + 1], p.width);
                            if (segs.some(s => (s.from.q === hex.q && s.from.r === hex.r) || (s.to.q === hex.q && s.to.r === hex.r))) {
                                pathIds.push(p.id);
                                found = true;
                            }
                        }
                    }
                }
                this.lastErasedHex = pathIds.length > 0 ? { q: hex.q, r: hex.r, type: tg, pathIds, toolGroup: tg, timestamp: Date.now() } : null;
            } else {
                this.lastErasedHex = null;
            }
        }

        if (this.currentToolGroup === 'text') {
            const hit = this.getTextAt(x, y);
            if (hit) this.data.texts = this.data.texts.filter(t => t !== hit);
        } else if (this.currentToolGroup === 'border') {
            this.data.borders.forEach(r => {
                r.hexes = r.hexes.filter(b => !(b.q === hex.q && b.r === hex.r));
            });
            this.data.borders = this.data.borders.filter(r => r.hexes.length > 0);
        } else if (this.currentToolGroup === 'river') {
            this.erasePathElement(this.data.rivers, hex);
        } else if (this.currentToolGroup === 'road') {
            this.erasePathElement(this.data.roads, hex);
        } else if (this.currentToolGroup === 'hexcolor') {
            const key = `${hex.q}_${hex.r}`;
            const h = this.data.hexes[key];
            if (h) {
                delete h.color;
                if (!h.symbol) delete this.data.hexes[key];
            }
        } else if (this.currentToolGroup === 'pattern') {
            const key = `${hex.q}_${hex.r}`;
            delete this.data.hexes[key];
        } else {
            const key = `${hex.q}_${hex.r}`;
            const h = this.data.hexes[key];

            if (h) {
                if (this.currentToolGroup && this.toolConfigs[this.currentToolGroup]) {
                    const config = this.toolConfigs[this.currentToolGroup];
                    if (h.symbol) {
                        delete h.symbol;
                        delete h.symbolColor;
                        if (config.backgroundEnabled) {
                            delete h.color;
                        }
                        if (!h.symbol && !h.color) {
                            delete this.data.hexes[key];
                        }
                    }
                } else if (this.currentToolGroup === null) {
                    if (h.color || h.backgroundColor) {
                        delete h.color;
                        delete h.backgroundColor;
                        if (!h.symbol) {
                            delete this.data.hexes[key];
                        }
                    }
                }
            }
        }
    }

    handleEraserFlood(hex) {
        const last = this.lastErasedHex;
        if (!last) return;
        if (Date.now() - last.timestamp > 1000) return;
        if (last.q !== hex.q || last.r !== hex.r) return;

        if (last.type === 'symbol') {
            this.floodEraseSymbol(hex, last.symbol);
        } else if (last.type === 'color') {
            this.floodEraseColor(hex, last.color);
        } else if (last.type === 'pattern') {
            this.floodErasePattern(hex, last.pattern);
        } else if (last.type === 'border') {
            this.floodEraseBorderSegment(hex, last.regionId);
        } else if (last.type === 'river' || last.type === 'road') {
            const paths = last.type === 'river' ? this.data.rivers : this.data.roads;
            this.floodEraseEntirePath(paths, last.pathIds);
        }
        this.lastErasedHex = null;
    }

    floodEraseSymbol(startHex, targetSymbol) {
        const visited = new Set();
        const queue = this.getHexNeighbors(startHex);

        while (queue.length > 0) {
            const hex = queue.shift();
            const key = `${hex.q}_${hex.r}`;
            if (visited.has(key)) continue;
            visited.add(key);

            const hexData = this.data.hexes[key];
            if (!hexData || hexData.symbol !== targetSymbol) continue;

            delete hexData.symbol;
            delete hexData.symbolColor;
            if (!hexData.color) {
                delete this.data.hexes[key];
            }

            const neighbors = this.getHexNeighbors(hex);
            neighbors.forEach(n => queue.push(n));
        }
    }

    floodEraseColor(startHex, targetColor) {
        const visited = new Set();
        const queue = this.getHexNeighbors(startHex);

        while (queue.length > 0) {
            const hex = queue.shift();
            const key = `${hex.q}_${hex.r}`;
            if (visited.has(key)) continue;
            visited.add(key);

            const hexData = this.data.hexes[key];
            const currentColor = hexData ? hexData.color : null;
            if (currentColor !== targetColor) continue;

            delete hexData.color;
            if (!hexData.symbol) {
                delete this.data.hexes[key];
            }

            const neighbors = this.getHexNeighbors(hex);
            neighbors.forEach(n => queue.push(n));
        }
    }

    floodEraseEntirePath(paths, pathIds) {
        if (!paths || !pathIds || pathIds.length === 0) return;
        for (let i = paths.length - 1; i >= 0; i--) {
            if (pathIds.includes(paths[i].id)) {
                paths.splice(i, 1);
            }
        }
    }

    floodErasePattern(startHex, targetPattern) {
        const visited = new Set();
        const queue = this.getHexNeighbors(startHex);

        while (queue.length > 0) {
            const hex = queue.shift();
            const key = `${hex.q}_${hex.r}`;
            if (visited.has(key)) continue;
            visited.add(key);

            const hexData = this.data.hexes[key];
            if (!hexData) continue;
            if (!this.hexMatchesPattern(hexData, targetPattern)) continue;

            delete this.data.hexes[key];

            const neighbors = this.getHexNeighbors(hex);
            neighbors.forEach(n => queue.push(n));
        }
    }

    floodEraseBorderSegment(startHex, regionId) {
        const region = this.data.borders.find(r => r.id === regionId);
        if (!region) return;

        const regionHexSet = new Set(region.hexes.map(h => `${h.q}_${h.r}`));
        const toRemove = new Set();
        const visited = new Set();

        const queue = [startHex, ...this.getHexNeighbors(startHex)];

        while (queue.length > 0) {
            const hex = queue.shift();
            const key = `${hex.q}_${hex.r}`;
            if (visited.has(key)) continue;
            visited.add(key);

            if (!regionHexSet.has(key)) continue;

            toRemove.add(key);
            const neighbors = this.getHexNeighbors(hex);
            neighbors.forEach(n => queue.push(n));
        }

        region.hexes = region.hexes.filter(h => !toRemove.has(`${h.q}_${h.r}`));

        if (region.hexes.length === 0) {
            this.data.borders = this.data.borders.filter(r => r.id !== regionId);
        }
    }

    hexMatchesPattern(hex, pattern) {
        const hexColor = hex.backgroundColor || hex.color;
        const patternColor = pattern.backgroundColor || pattern.color;
        return hexColor === patternColor &&
               hex.symbol === pattern.symbol &&
               hex.symbolColor === pattern.symbolColor;
    }

    handleFillTool(startHex) {
        const key = `${startHex.q}_${startHex.r}`;
        const startData = this.data.hexes[key];

        if (!startData) {
            if (!this.isEnclosedByFrame(startHex)) {
                return; // Nicht füllen, wenn kein Rahmen vorhanden
            }
            this.floodFillEmpty(startHex);
            return;
        }

        if (this.currentToolGroup === 'pattern' && this.patternData) {
            const targetColor = startData.color;
            const targetSymbol = startData.symbol;
            this.floodFillPattern(startHex, targetColor, targetSymbol);
        }
        else if (this.currentToolGroup === 'hexcolor') {
            const targetColor = startData.color;
            this.floodFillColor(startHex, targetColor, this.masterColor);
        }
        else if (this.currentToolGroup === null) {
            const targetColor = startData.color;
            const newColor = this.colorPalette[this.activeColorSlot];
            this.floodFillColor(startHex, targetColor, newColor);
        }
        else if (this.toolConfigs[this.currentToolGroup]) {
            const config = this.toolConfigs[this.currentToolGroup];
            const targetSymbol = startData ? startData.symbol : null;
            const targetColor = startData ? startData.color : null;
            this.floodFillSymbol(startHex, targetSymbol, targetColor, config.backgroundEnabled);
        }
    }

    floodFillColor(startHex, targetColor, newColor) {
        if (targetColor === newColor) return;

        const visited = new Set();
        const queue = [startHex];

        while (queue.length > 0) {
            const hex = queue.shift();
            const key = `${hex.q}_${hex.r}`;

            if (visited.has(key)) continue;
            visited.add(key);

            const hexData = this.data.hexes[key];
            const currentColor = hexData ? hexData.color : null;

            if (currentColor !== targetColor) continue;

            if (hexData) {
                hexData.color = newColor;
            } else {
                this.data.hexes[key] = { q: hex.q, r: hex.r, color: newColor };
            }

            const neighbors = this.getHexNeighbors(hex);
            neighbors.forEach(n => queue.push(n));
        }
    }

    floodFillSymbol(startHex, targetSymbol, targetColor, applyBackground) {
        const config = this.toolConfigs[this.currentToolGroup];
        const newSymbol = config.currentVariant;
        const newSymbolColor = config.symbolColor;
        const newBgColor = config.backgroundColor;

        const visited = new Set();
        const queue = [startHex];

        while (queue.length > 0) {
            const hex = queue.shift();
            const key = `${hex.q}_${hex.r}`;

            if (visited.has(key)) continue;
            visited.add(key);

            const hexData = this.data.hexes[key];
            const currentSymbol = hexData ? hexData.symbol : null;
            const currentColor = hexData ? hexData.color : null;

            if (targetSymbol) {
                if (currentSymbol !== targetSymbol) continue;
            } else {
                if (currentSymbol || currentColor !== targetColor) continue;
            }

            if (!hexData) {
                this.data.hexes[key] = {
                    q: hex.q,
                    r: hex.r,
                    symbol: newSymbol,
                    symbolColor: newSymbolColor
                };
                if (applyBackground) {
                    this.data.hexes[key].color = newBgColor;
                }
            } else {
                hexData.symbol = newSymbol;
                hexData.symbolColor = newSymbolColor;
                if (applyBackground) {
                    hexData.color = newBgColor;
                }
            }

            const neighbors = this.getHexNeighbors(hex);
            neighbors.forEach(n => queue.push(n));
        }
    }

    floodFillPattern(startHex, targetColor, targetSymbol) {
        const visited = new Set();
        const queue = [startHex];

        while (queue.length > 0) {
            const hex = queue.shift();
            const key = `${hex.q}_${hex.r}`;

            if (visited.has(key)) continue;
            visited.add(key);

            const hexData = this.data.hexes[key];
            const currentColor = hexData ? hexData.color : null;
            const currentSymbol = hexData ? hexData.symbol : null;

            if (currentColor !== targetColor || currentSymbol !== targetSymbol) continue;

            if (!hexData) {
                this.data.hexes[key] = {
                    q: hex.q,
                    r: hex.r,
                    color: this.patternData.color,
                    symbol: this.patternData.symbol,
                    symbolColor: this.patternData.symbolColor
                };
            } else {
                hexData.color = this.patternData.color;
                hexData.symbol = this.patternData.symbol;
                hexData.symbolColor = this.patternData.symbolColor;
            }

            const neighbors = this.getHexNeighbors(hex);
            neighbors.forEach(n => queue.push(n));
        }
    }

    getHexNeighbors(hex) {
        const directions = [
            {q: 1, r: 0}, {q: 1, r: -1}, {q: 0, r: -1},
            {q: -1, r: 0}, {q: -1, r: 1}, {q: 0, r: 1}
        ];
        return directions.map(d => ({ q: hex.q + d.q, r: hex.r + d.r }));
    }

    isEnclosedByFrame(startHex) {
        const visited = new Set();
        const queue = [startHex];
        const maxDistance = 50; // Maximale Distanz zum Prüfen (verhindert endlose Suche)
        let foundBoundary = false;

        while (queue.length > 0) {
            const hex = queue.shift();
            const key = `${hex.q}_${hex.r}`;

            if (visited.has(key)) continue;

            const distance = Math.abs(hex.q - startHex.q) + Math.abs(hex.r - startHex.r);
            if (distance > maxDistance) {
                return false; // Zu weit = nicht umrahmt
            }

            visited.add(key);

            const hexData = this.data.hexes[key];

            if (hexData) {
                foundBoundary = true;
                continue; // Nicht weiter in diese Richtung
            }

            const neighbors = this.getHexNeighbors(hex);
            neighbors.forEach(n => queue.push(n));
        }

        return foundBoundary && visited.size < (maxDistance * maxDistance);
    }

    floodFillEmpty(startHex) {
        const visited = new Set();
        const queue = [startHex];
        const maxDistance = 50;

        while (queue.length > 0) {
            const hex = queue.shift();
            const key = `${hex.q}_${hex.r}`;

            if (visited.has(key)) continue;

            const distance = Math.abs(hex.q - startHex.q) + Math.abs(hex.r - startHex.r);
            if (distance > maxDistance) continue;

            visited.add(key);

            const hexData = this.data.hexes[key];

            if (hexData) continue;

            if (this.currentToolGroup === 'pattern' && this.patternData) {
                this.data.hexes[key] = {
                    q: hex.q,
                    r: hex.r,
                    color: this.patternData.color,
                    symbol: this.patternData.symbol,
                    symbolColor: this.patternData.symbolColor,
                    backgroundColor: this.patternData.backgroundColor
                };
            } else if (this.currentToolGroup === 'hexcolor') {
                this.data.hexes[key] = {
                    q: hex.q,
                    r: hex.r,
                    color: this.masterColor
                };
            } else if (this.currentToolGroup === null) {
                this.data.hexes[key] = {
                    q: hex.q,
                    r: hex.r,
                    color: this.colorPalette[this.activeColorSlot]
                };
            } else if (this.toolConfigs[this.currentToolGroup]) {
                const config = this.toolConfigs[this.currentToolGroup];
                this.data.hexes[key] = {
                    q: hex.q,
                    r: hex.r,
                    symbol: config.currentVariant,
                    symbolColor: config.symbolColor
                };
                if (config.backgroundEnabled) {
                    this.data.hexes[key].color = config.backgroundColor;
                }
            }

            const neighbors = this.getHexNeighbors(hex);
            neighbors.forEach(n => queue.push(n));
        }
    }

    render() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(this.data.offX, this.data.offY);
        this.ctx.scale(this.data.zoom, this.data.zoom);

        Object.values(this.data.hexes).forEach(h => {
            this.drawHexBase(h);
        });

        // Zeichenreihenfolge (unten → oben):

        const drawSymbolLayer = (symbols) => {
            Object.values(this.data.hexes).forEach(h => {
                if (h.symbol && symbols.includes(h.symbol)) {
                    const pos = this.hexToPixel(h);
                    if (this.svgSymbols[h.symbol]) {
                        this.drawSVGOnCanvas(h.symbol, pos, h.symbolColor);
                    } else {
                        this.drawCustomSymbol(h.symbol, pos.x, pos.y, this.data.gridSize, h.symbolColor);
                    }
                }
            });
        };

        drawSymbolLayer(['swamp','grass', 'bush', 'tree', 'pine', 'palm']);

        drawSymbolLayer(['hill', 'mountain']);

        this.drawRivers();

        this.drawRoads();

        drawSymbolLayer(['question', 'exclamation', 'cross', 'dot']);

        drawSymbolLayer(['tent', 'house', 'village', 'town', 'castle', 'harbor', 'monastery', 'tower', 'ruin', 'cave', 'oasis']);

        this.drawBorders();

        this.drawPathWaypoints(); // Wegpunkte immer als letztes (ueber allen anderen Elementen)

        if (this.svgLayer) {
            while (this.svgLayer.firstChild) this.svgLayer.removeChild(this.svgLayer.firstChild);
        }


        if (this.currentToolGroup === 'pattern' && this.patternSourceHex) {
            const pos = this.hexToPixel(this.patternSourceHex);
            const s = this.data.gridSize;

            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 180) * (60 * i - 30);
                this.ctx.lineTo(pos.x + s * Math.cos(a), pos.y + s * Math.sin(a));
            }
            this.ctx.closePath();
            this.ctx.strokeStyle = '#FF0000';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }

        this.ctx.restore();

        this.renderCrosshair();
        this.renderTexts();
    }

    renderCrosshair() {
        if (!this.plugin.settings.showCrosshair) return;

        const origin = this.hexToPixel({ q: 0, r: 0 });
        const sx = origin.x * this.data.zoom + this.data.offX;
        const sy = origin.y * this.data.zoom + this.data.offY;
        const arm = 2 * this.data.gridSize * this.data.zoom;

        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(sx - arm, sy);
        this.ctx.lineTo(sx + arm, sy);
        this.ctx.moveTo(sx, sy - arm);
        this.ctx.lineTo(sx, sy + arm);
        this.ctx.stroke();
        this.ctx.restore();
    }

    renderTexts() {
        if (!this.textCtx || !this.textCanvas) return;

        this.textCtx.clearRect(0, 0, this.textCanvas.width, this.textCanvas.height);

        this.textCtx.save();
        this.textCtx.translate(this.data.offX, this.data.offY);
        this.textCtx.scale(this.data.zoom, this.data.zoom);

        if (this.data.texts) this.data.texts.forEach(t => {
            const weight = t.bold ? "bold " : "";
            this.textCtx.font = `${weight}${t.size || 16}px Verdana`;
            this.textCtx.textAlign = "center";

            if (t.shadow) {
                const distance = t.shadowDistance || 5;
                const opatown = (t.shadowOpatown || 50) / 100;
                this.textCtx.fillStyle = `rgba(0, 0, 0, ${opatown})`;
                this.textCtx.fillText(t.text, t.x + distance, t.y + distance);
            }

            this.textCtx.strokeStyle = "black";
            this.textCtx.lineWidth = 2;
            if (t.outline !== false) this.textCtx.strokeText(t.text, t.x, t.y);

            this.textCtx.fillStyle = t.color || "white";
            this.textCtx.fillText(t.text, t.x, t.y);
        });

        this.textCtx.restore();
    }

    getMapWorldSize() {
        const hexes = Object.values(this.data.hexes);
        const texts = this.data.texts || [];
        const borders = this.data.borders || [];
        const borderOnlyHexes = [];
        const hexKeySet = new Set(Object.keys(this.data.hexes));
        for (const region of borders) {
            for (const bh of region.hexes) {
                if (!hexKeySet.has(`${bh.q}_${bh.r}`)) borderOnlyHexes.push(bh);
            }
        }
        if (hexes.length === 0 && texts.length === 0 && borderOnlyHexes.length === 0) return null;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        const expandBounds = (hex) => {
            const pos = this.hexToPixel(hex);
            const s = this.data.gridSize;
            minX = Math.min(minX, pos.x - s); maxX = Math.max(maxX, pos.x + s);
            minY = Math.min(minY, pos.y - s); maxY = Math.max(maxY, pos.y + s);
        };
        hexes.forEach(expandBounds);
        borderOnlyHexes.forEach(expandBounds);
        texts.forEach(tx => {
            const textSize = tx.size || 16;
            const w = tx.text.length * textSize * 0.6;
            minX = Math.min(minX, tx.x - w / 2); maxX = Math.max(maxX, tx.x + w / 2);
            minY = Math.min(minY, tx.y - textSize); maxY = Math.max(maxY, tx.y + textSize / 2);
        });
        const padding = this.data.gridSize;
        return { w: (maxX - minX) + padding * 2, h: (maxY - minY) + padding * 2 };
    }

    renderFullMap({ targetWidth, scale: fixedScale } = {}) {
        const size = this.getMapWorldSize();
        if (!size) return null;
        const scale = targetWidth ? targetWidth / size.w : (fixedScale || 2);

        const hexes = Object.values(this.data.hexes);
        const texts = this.data.texts || [];
        const borders = this.data.borders || [];
        const borderOnlyHexes = [];
        const hexKeySet = new Set(Object.keys(this.data.hexes));
        for (const region of borders) {
            for (const bh of region.hexes) {
                if (!hexKeySet.has(`${bh.q}_${bh.r}`)) borderOnlyHexes.push(bh);
            }
        }
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        const expandBounds = (hex) => {
            const pos = this.hexToPixel(hex);
            const s = this.data.gridSize;
            minX = Math.min(minX, pos.x - s); maxX = Math.max(maxX, pos.x + s);
            minY = Math.min(minY, pos.y - s); maxY = Math.max(maxY, pos.y + s);
        };
        hexes.forEach(expandBounds);
        borderOnlyHexes.forEach(expandBounds);
        texts.forEach(tx => {
            const textSize = tx.size || 16;
            const w = tx.text.length * textSize * 0.6;
            minX = Math.min(minX, tx.x - w / 2); maxX = Math.max(maxX, tx.x + w / 2);
            minY = Math.min(minY, tx.y - textSize); maxY = Math.max(maxY, tx.y + textSize / 2);
        });

        const padding = this.data.gridSize;
        minX -= padding; minY -= padding;
        maxX += padding; maxY += padding;

        const w = maxX - minX;
        const h = maxY - minY;

        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = Math.ceil(w * scale);
        tmpCanvas.height = Math.ceil(h * scale);
        const tmpCtx = tmpCanvas.getContext('2d');
        tmpCtx.fillStyle = '#ffffff';
        tmpCtx.fillRect(0, 0, tmpCanvas.width, tmpCanvas.height);

        const origCtx = this.ctx;
        const origCanvas = this.canvas;
        const origTextCtx = this.textCtx;
        const origTextCanvas = this.textCanvas;
        const origZoom = this.data.zoom;
        const origOffX = this.data.offX;
        const origOffY = this.data.offY;

        this.ctx = tmpCtx;
        this.canvas = tmpCanvas;
        this.data.zoom = scale;
        this.data.offX = -minX * scale;
        this.data.offY = -minY * scale;

        tmpCtx.save();
        tmpCtx.translate(this.data.offX, this.data.offY);
        tmpCtx.scale(this.data.zoom, this.data.zoom);

        Object.values(this.data.hexes).forEach(hex => this.drawHexBase(hex));

        const drawSymbolLayer = (symbols) => {
            Object.values(this.data.hexes).forEach(hex => {
                if (hex.symbol && symbols.includes(hex.symbol)) {
                    const pos = this.hexToPixel(hex);
                    if (this.svgSymbols[hex.symbol]) {
                        this.drawSVGOnCanvas(hex.symbol, pos, hex.symbolColor);
                    } else {
                        this.drawCustomSymbol(hex.symbol, pos.x, pos.y, this.data.gridSize, hex.symbolColor);
                    }
                }
            });
        };

        drawSymbolLayer(['swamp','grass', 'bush', 'tree', 'pine', 'palm']);
        drawSymbolLayer(['hill', 'mountain']);
        this.drawRivers();
        this.drawRoads();
        drawSymbolLayer(['question', 'exclamation', 'cross', 'dot']);
        drawSymbolLayer(['tent', 'house', 'village', 'town', 'castle', 'harbor', 'monastery', 'tower', 'ruin', 'cave', 'oasis']);
        this.drawBorders();

        tmpCtx.restore();

        // Texte direkt auf das Print-Canvas rendern
        if (this.data.texts) this.data.texts.forEach(tx => {
            tmpCtx.save();
            tmpCtx.translate(this.data.offX, this.data.offY);
            tmpCtx.scale(this.data.zoom, this.data.zoom);
            const weight = tx.bold ? "bold " : "";
            tmpCtx.font = `${weight}${tx.size || 16}px Verdana`;
            tmpCtx.textAlign = "center";
            if (tx.shadow) {
                const distance = tx.shadowDistance || 5;
                const opatown = (tx.shadowOpatown || 50) / 100;
                tmpCtx.fillStyle = `rgba(0, 0, 0, ${opatown})`;
                tmpCtx.fillText(tx.text, tx.x + distance, tx.y + distance);
            }
            tmpCtx.strokeStyle = "black";
            tmpCtx.lineWidth = 2;
            if (tx.outline !== false) tmpCtx.strokeText(tx.text, tx.x, tx.y);
            tmpCtx.fillStyle = tx.color || "white";
            tmpCtx.fillText(tx.text, tx.x, tx.y);
            tmpCtx.restore();
        });

        this.ctx = origCtx;
        this.canvas = origCanvas;
        this.textCtx = origTextCtx;
        this.textCanvas = origTextCanvas;
        this.data.zoom = origZoom;
        this.data.offX = origOffX;
        this.data.offY = origOffY;

        return tmpCanvas;
    }

    renderSVGSymbols(symbols) {
        if (!this.svgLayer) return;

        while (this.svgLayer.firstChild) {
            this.svgLayer.removeChild(this.svgLayer.firstChild);
        }

        symbols.forEach(({ symbol, pos, color }) => {
            if (this.svgSymbols[symbol]) {
                const config = this.svgSymbolConfig[symbol] || { size: 0.30, align: 'center', marginX: 0, marginY: 0 };

                const screenX = pos.x * this.data.zoom + this.data.offX;
                const screenY = pos.y * this.data.zoom + this.data.offY;

                const baseSize = this.data.gridSize * 2.0; // Basis-Größe
                const size = baseSize * config.size * this.data.zoom;

                const hexWidth = this.data.gridSize * Math.sqrt(3) * this.data.zoom;
                const hexHeight = this.data.gridSize * 2 * this.data.zoom;

                let offsetX = 0;
                let offsetY = 0;

                const alignParts = config.align.split('-');
                alignParts.forEach(part => {
                    switch(part) {
                        case 'top':
                            offsetY = -hexHeight / 4;
                            break;
                        case 'bottom':
                            offsetY = hexHeight / 4;
                            break;
                        case 'left':
                            offsetX = -hexWidth / 4;
                            break;
                        case 'right':
                            offsetX = hexWidth / 4;
                            break;
                        case 'center':
                            break;
                    }
                });

                offsetX += (config.marginX / 100) * hexWidth;
                offsetY += (config.marginY / 100) * hexHeight;

                const svgData = this.svgSymbols[symbol];
                const viewBoxSize = svgData.viewBoxWidth;

                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                const scale = size / viewBoxSize;
                const finalX = screenX - size/2 + offsetX;
                const finalY = screenY - size/2 + offsetY;
                g.setAttribute('transform', `translate(${finalX}, ${finalY}) scale(${scale})`);

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', svgData.pathData);
                path.setAttribute('fill', color || '#228B22');
                g.appendChild(path);

                this.svgLayer.appendChild(g);
            }
        });
    }

    drawSVGOnCanvas(symbol, pos, color) {
        const svgData = this.svgSymbols[symbol];
        if (!svgData) return;

        const config = this.svgSymbolConfig[symbol] || { size: 0.30, align: 'center', marginX: 0, marginY: 0 };
        const baseSize = this.data.gridSize * 2.0;
        const size = baseSize * config.size;
        const viewBoxSize = svgData.viewBoxWidth;
        const scale = size / viewBoxSize;

        const hexWidth = this.data.gridSize * Math.sqrt(3);
        const hexHeight = this.data.gridSize * 2;
        let offsetX = 0, offsetY = 0;
        const alignParts = config.align.split('-');
        alignParts.forEach(part => {
            if (part === 'top') offsetY = -hexHeight / 4;
            else if (part === 'bottom') offsetY = hexHeight / 4;
            else if (part === 'left') offsetX = -hexWidth / 4;
            else if (part === 'right') offsetX = hexWidth / 4;
        });
        offsetX += (config.marginX / 100) * hexWidth;
        offsetY += (config.marginY / 100) * hexHeight;

        this.ctx.save();
        this.ctx.translate(pos.x - size / 2 + offsetX, pos.y - size / 2 + offsetY);
        this.ctx.scale(scale, scale);
        const path = new Path2D(svgData.pathData);
        this.ctx.fillStyle = color || '#228B22';
        this.ctx.fill(path);
        this.ctx.restore();
    }

    drawHexBase(h) {
        const pos = this.hexToPixel(h), s = this.data.gridSize;
        this.ctx.beginPath();
        for (let i=0; i<6; i++) {
            const a = (Math.PI/180) * (60*i - 30);
            this.ctx.lineTo(pos.x + s*Math.cos(a), pos.y + s*Math.sin(a));
        }
        this.ctx.closePath();

        if (h.color) {
            this.ctx.fillStyle = h.color;
            this.ctx.fill();
        }

        this.ctx.strokeStyle = 'rgba(128,128,128,0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    drawBorders() {
        if (!this.data.borders || this.data.borders.length === 0 || !this.borderSettings.visible) return;

        const s = this.data.gridSize;
        const lineWidth = 3;
        const inset = lineWidth / 2 + 1;
        const factor = (s - inset) / s;

        const neighbors = [
            { dq: 1, dr: 0 },   // Edge 0: Ost
            { dq: 0, dr: 1 },   // Edge 1: Süd-Ost
            { dq: -1, dr: 1 },  // Edge 2: Süd-West
            { dq: -1, dr: 0 },  // Edge 3: West
            { dq: 0, dr: -1 },  // Edge 4: Nord-West
            { dq: 1, dr: -1 }   // Edge 5: Nord-Ost
        ];

        this.ctx.save();
        this.ctx.lineWidth = lineWidth;
        this.ctx.lineCap = 'round';

        this.data.borders.forEach(region => {
            if (!region.hexes || region.hexes.length === 0) return;

            const regionSet = new Set(region.hexes.map(b => `${b.q}_${b.r}`));
            this.ctx.strokeStyle = region.color || '#FF0000';

            const dashes = region.dashes || 1;
            if (dashes > 1) {
                const edgeLen = s * factor;
                const unitLen = edgeLen / dashes;
                this.ctx.setLineDash([unitLen, unitLen]);
                this.ctx.lineDashOffset = (dashes % 2 === 0) ? unitLen / 2 : 0;
            }

            region.hexes.forEach(b => {
                const pos = this.hexToPixel(b);

                const corners = [];
                for (let i = 0; i < 6; i++) {
                    const a = (Math.PI / 180) * (60 * i - 30);
                    corners.push({
                        x: pos.x + s * factor * Math.cos(a),
                        y: pos.y + s * factor * Math.sin(a)
                    });
                }

                for (let i = 0; i < 6; i++) {
                    const nb = neighbors[i];
                    const neighborKey = `${b.q + nb.dq}_${b.r + nb.dr}`;

                    if (!regionSet.has(neighborKey)) {
                        const p1 = corners[i];
                        const p2 = corners[(i + 1) % 6];
                        this.ctx.beginPath();
                        this.ctx.moveTo(p1.x, p1.y);
                        this.ctx.lineTo(p2.x, p2.y);
                        this.ctx.stroke();
                    }
                }
            });

            if (dashes > 1) { this.ctx.setLineDash([]); this.ctx.lineDashOffset = 0; }
        });

        const ph = this.borderSettings.pickedHex;
        if (ph && this.currentToolGroup === 'border') {
            const activeRegion = this.data.borders.find(r => r.id === this.borderSettings.activeRegionId);
            if (activeRegion) {
                this.ctx.strokeStyle = activeRegion.color || '#FF0000';
                this.ctx.lineWidth = this.borderHighlightWidth;
                this.ctx.setLineDash([4, 4]);
                const pos = this.hexToPixel(ph);
                const hlInset = (s - this.borderHighlightWidth / 2 - 1) / s;
                this.ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = (Math.PI / 180) * (60 * i - 30);
                    const cx = pos.x + s * hlInset * Math.cos(a);
                    const cy = pos.y + s * hlInset * Math.sin(a);
                    if (i === 0) this.ctx.moveTo(cx, cy);
                    else this.ctx.lineTo(cx, cy);
                }
                this.ctx.closePath();
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }

        this.ctx.restore();
    }

    drawCustomSymbol(type, x, y, size, color) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.fillStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.lineJoin = "round";
        this.ctx.lineCap = "round";
        const s = size / 2;


        if (type === 'grass') {
            for (let i = 0; i < 3; i++) {
                const x = (i - 1) * s * 0.3;
                this.ctx.moveTo(x, s * 0.3);
                this.ctx.lineTo(x, -s * 0.3);
            }
            this.ctx.stroke();
        } else if (type === 'swamp') {
            for (let i = 0; i < 3; i++) {
                const y = (i - 1) * s * 0.25;
                this.ctx.moveTo(-s * 0.5, y);
                this.ctx.quadraticCurveTo(-s * 0.25, y - s * 0.1, 0, y);
                this.ctx.quadraticCurveTo(s * 0.25, y + s * 0.1, s * 0.5, y);
            }
            this.ctx.stroke();
        }
        else if (type === 'bush') {
            this.ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
            this.ctx.stroke();
        } else if (type === 'tree') {
            this.ctx.beginPath();
            this.ctx.arc(0, -s * 0.2, s * 0.3, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(0, s * 0.1);
            this.ctx.lineTo(0, s * 0.5);
            this.ctx.stroke();
        } else if (type === 'pine') {
            this.ctx.moveTo(-s * 0.3, 0);
            this.ctx.lineTo(0, -s * 0.5);
            this.ctx.lineTo(s * 0.3, 0);
            this.ctx.moveTo(-s * 0.35, s * 0.2);
            this.ctx.lineTo(0, -s * 0.1);
            this.ctx.lineTo(s * 0.35, s * 0.2);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(0, s * 0.2);
            this.ctx.lineTo(0, s * 0.5);
            this.ctx.stroke();
        } else if (type === 'palm') {
            this.ctx.moveTo(0, -s * 0.5);
            this.ctx.lineTo(0, s * 0.4);
            this.ctx.stroke();
            for (let i = 0; i < 4; i++) {
                const angle = (i * Math.PI / 2) - Math.PI / 4;
                this.ctx.beginPath();
                this.ctx.moveTo(0, -s * 0.5);
                this.ctx.lineTo(Math.cos(angle) * s * 0.4, -s * 0.5 + Math.sin(angle) * s * 0.4);
                this.ctx.stroke();
            }
        }
        else if (type === 'hill') {
            this.ctx.moveTo(-s * 0.6, s * 0.3);
            this.ctx.quadraticCurveTo(-s * 0.3, -s * 0.4, 0, -s * 0.3);
            this.ctx.quadraticCurveTo(s * 0.3, -s * 0.4, s * 0.6, s * 0.3);
            this.ctx.stroke();
        } else if (type === 'mountain') {
            this.ctx.beginPath();
            this.ctx.moveTo(-s * 0.8, s * 0.5);
            this.ctx.lineTo(0, -s * 0.6);
            this.ctx.lineTo(s * 0.8, s * 0.5);
            this.ctx.moveTo(-s * 0.3, s * 0.5);
            this.ctx.lineTo(s * 0.3, -s * 0.1);
            this.ctx.lineTo(s * 0.7, s * 0.5);
            this.ctx.stroke();
        }
        else if (type === 'tent') {
            this.ctx.moveTo(-s * 0.4, s * 0.3);
            this.ctx.lineTo(0, -s * 0.4);
            this.ctx.lineTo(s * 0.4, s * 0.3);
            this.ctx.closePath();
            this.ctx.stroke();
        } else if (type === 'house') {
            this.ctx.rect(-s*0.3, -s*0.1, s*0.6, s*0.5);
            this.ctx.moveTo(-s*0.4, -s*0.1);
            this.ctx.lineTo(0, -s*0.5);
            this.ctx.lineTo(s*0.4, -s*0.1);
            this.ctx.stroke();
        } else if (type === 'village') {
            for(let i=0; i<3; i++) {
                const ox = (i-1)*s*0.4, oy = (i%2)*s*0.2;
                this.ctx.moveTo(ox-s*0.2, oy+s*0.3);
                this.ctx.lineTo(ox-s*0.2, oy);
                this.ctx.lineTo(ox, oy-s*0.2);
                this.ctx.lineTo(ox+s*0.2, oy);
                this.ctx.lineTo(ox+s*0.2, oy+s*0.3);
                this.ctx.stroke();
            }
        } else if (type === 'town') {
            this.ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
            this.ctx.stroke();
            for (let i = 0; i < 4; i++) {
                const angle = i * Math.PI / 2;
                const px = Math.cos(angle) * s * 0.5;
                const py = Math.sin(angle) * s * 0.5;
                this.ctx.beginPath();
                this.ctx.rect(px - s*0.1, py - s*0.1, s*0.2, s*0.25);
                this.ctx.stroke();
            }
        } else if (type === 'castle') {
            this.ctx.moveTo(-s*0.6, s*0.5);
            this.ctx.lineTo(-s*0.6, -s*0.3);
            this.ctx.lineTo(-s*0.4, -s*0.3);
            this.ctx.lineTo(-s*0.4, -s*0.1);
            this.ctx.lineTo(-s*0.2, -s*0.1);
            this.ctx.lineTo(-s*0.2, -s*0.5);
            this.ctx.lineTo(s*0.2, -s*0.5);
            this.ctx.lineTo(s*0.2, -s*0.1);
            this.ctx.lineTo(s*0.4, -s*0.1);
            this.ctx.lineTo(s*0.4, -s*0.3);
            this.ctx.lineTo(s*0.6, -s*0.3);
            this.ctx.lineTo(s*0.6, s*0.5);
            this.ctx.closePath();
            this.ctx.stroke();
        } else if (type === 'harbor') {
            this.ctx.rect(-s*0.5, -s*0.3, s*1.0, s*0.6);
            this.ctx.stroke();
        } else if (type === 'monastery') {
            this.ctx.rect(-s*0.4, -s*0.2, s*0.8, s*0.6);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(0, -s*0.6);
            this.ctx.lineTo(0, -s*0.2);
            this.ctx.moveTo(-s*0.15, -s*0.5);
            this.ctx.lineTo(s*0.15, -s*0.5);
            this.ctx.stroke();
        } else if (type === 'tower') {
            this.ctx.rect(-s*0.2, -s*0.6, s*0.4, s*1.0);
            this.ctx.stroke();
            for (let i = 0; i < 3; i++) {
                const x = -s*0.2 + i * s*0.2;
                this.ctx.beginPath();
                this.ctx.rect(x, -s*0.7, s*0.15, s*0.1);
                this.ctx.stroke();
            }
        } else if (type === 'ruin') {
            this.ctx.moveTo(-s*0.4, s*0.3);
            this.ctx.lineTo(-s*0.4, -s*0.1);
            this.ctx.lineTo(-s*0.2, -s*0.3);
            this.ctx.moveTo(0, s*0.3);
            this.ctx.lineTo(0, 0);
            this.ctx.moveTo(s*0.3, s*0.3);
            this.ctx.lineTo(s*0.3, -s*0.2);
            this.ctx.stroke();
        } else if (type === 'cave') {
            this.ctx.arc(0, s*0.2, s*0.35, Math.PI, 0, true);
            this.ctx.lineTo(s*0.35, s*0.4);
            this.ctx.lineTo(-s*0.35, s*0.4);
            this.ctx.closePath();
            this.ctx.stroke();
        } else if (type === 'oasis') {
            this.ctx.ellipse(0, s*0.2, s*0.4, s*0.25, 0, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(s*0.3, 0);
            this.ctx.lineTo(s*0.3, -s*0.3);
            this.ctx.stroke();
            for (let i = 0; i < 3; i++) {
                const angle = (i * Math.PI / 3);
                this.ctx.beginPath();
                this.ctx.moveTo(s*0.3, -s*0.3);
                this.ctx.lineTo(s*0.3 + Math.cos(angle) * s*0.2, -s*0.3 + Math.sin(angle) * s*0.2);
                this.ctx.stroke();
            }
        }

        this.ctx.restore();
    }

    drawRivers() {
        if (!this.data.rivers) return;
        this.data.rivers.forEach(river => {
            if (!river.waypoints || river.waypoints.length === 0) return;
            if (river.waypoints.length >= 2) {
                this.drawPathChains(river, true);
            }
        });
    }

    drawRoads() {
        if (!this.data.roads) return;
        this.data.roads.forEach(road => {
            if (!road.waypoints || road.waypoints.length === 0) return;
            if (road.waypoints.length >= 2) {
                this.drawPathChains(road);
            }
        });
    }

    drawPathWaypoints() {
        if (this.riverSettings.editMode && this.data.rivers) {
            const river = this.data.rivers.find(r => r.id === this.riverSettings.activeRiverId);
            if (river && river.waypoints) {
                const activeIdx = this.riverSettings.insertAfter;
                const activeWp = activeIdx !== null ? river.waypoints[activeIdx] : null;
                river.waypoints.forEach((wp) => {
                    const isActive = activeWp && wp.q === activeWp.q && wp.r === activeWp.r;
                    const pos = this.hexToPixel(wp);
                    this.ctx.beginPath();
                    this.ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
                    this.ctx.fillStyle = isActive ? '#FF0000' : '#000000';
                    this.ctx.fill();
                });
            }
        }
        if (this.roadSettings.editMode && this.data.roads) {
            const road = this.data.roads.find(r => r.id === this.roadSettings.activeRoadId);
            if (road && road.waypoints) {
                const activeIdx = this.roadSettings.insertAfter;
                const activeWp = activeIdx !== null ? road.waypoints[activeIdx] : null;
                road.waypoints.forEach((wp) => {
                    const isActive = activeWp && wp.q === activeWp.q && wp.r === activeWp.r;
                    const pos = this.hexToPixel(wp);
                    this.ctx.beginPath();
                    this.ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
                    this.ctx.fillStyle = isActive ? '#FF0000' : '#000000';
                    this.ctx.fill();
                });
            }
        }
    }

    drawPathChains(path, taper = false) {
        const wps = path.waypoints;
        const chains = [];
        let currentChain = [];
        for (let i = 0; i < wps.length; i++) {
            if (wps[i].break) {
                currentChain = [wps[i]];
            } else {
                if (currentChain.length === 0) currentChain.push(wps[i]);
                else currentChain.push(wps[i]);
            }
            if (i === wps.length - 1 || (wps[i + 1] && wps[i + 1].break)) {
                if (currentChain.length >= 2) chains.push(currentChain);
                if (wps[i + 1] && wps[i + 1].break) currentChain = [];
            }
        }

        const segCount = {};
        chains.forEach(chain => {
            for (let i = 0; i < chain.length - 1; i++) {
                const k1 = `${chain[i].q}_${chain[i].r}`;
                const k2 = `${chain[i + 1].q}_${chain[i + 1].r}`;
                segCount[k1] = (segCount[k1] || 0) + 1;
                segCount[k2] = (segCount[k2] || 0) + 1;
            }
        });

        chains.forEach(chain => {
            const segments = [];
            const pairCount = chain.length - 1;
            const pairSegCounts = [];
            for (let i = 0; i < pairCount; i++) {
                const pathSegs = this.calculateHexPath(chain[i], chain[i + 1], path.width);
                pairSegCounts.push(pathSegs.length);
                segments.push(...pathSegs);
            }
            const startKey = `${chain[0].q}_${chain[0].r}`;
            const endKey = `${chain[chain.length - 1].q}_${chain[chain.length - 1].r}`;
            const trimStart = segCount[startKey] === 1;
            const trimEnd = segCount[endKey] === 1;

            const canTaper = taper && (trimStart || trimEnd) && !(pairCount === 1 && trimStart && trimEnd);
            if (canTaper) {
                let offset = 0;
                for (let i = 0; i < pairCount; i++) {
                    const n = pairSegCounts[i];
                    if (i === 0 && trimStart) {
                        for (let j = 0; j < n; j++) {
                            const t = n <= 1 ? 0 : j / (n - 1);
                            const e = t * t * (3 - 2 * t);
                            segments[offset + j].width = path.width * (0.01 + 0.99 * e);
                        }
                    } else if (i === pairCount - 1 && trimEnd) {
                        for (let j = 0; j < n; j++) {
                            const t = n <= 1 ? 0 : j / (n - 1);
                            const e = t * t * (3 - 2 * t);
                            segments[offset + j].width = path.width * (1.0 - 0.99 * e);
                        }
                    }
                    offset += n;
                }
            }

            const hasTaper = canTaper;
            this.drawWavyLines(segments, path.color, path.width, trimStart, trimEnd, path.dashes || 1, hasTaper);
        });
    }

    drawWavyLines(lines, color, defaultWidth, trimStart, trimEnd, dashCount, taper = false) {
        if (!lines || lines.length === 0) return;
        this.ctx.strokeStyle = color;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";
        this.ctx.lineWidth = defaultWidth;

        const computedLines = lines.map((l, idx) => {
            const fullP1 = this.hexToPixel(l.from), fullP2 = this.hexToPixel(l.to);
            let p1 = { x: fullP1.x, y: fullP1.y }, p2 = { x: fullP2.x, y: fullP2.y };
            const inset = (1 - this.pathEndInset) * 0.5;
            if (trimStart && idx === 0) p1 = { x: p1.x + (p2.x - p1.x) * inset, y: p1.y + (p2.y - p1.y) * inset };
            if (trimEnd && idx === lines.length - 1) p2 = { x: p2.x + (p1.x - p2.x) * inset, y: p2.y + (p1.y - p2.y) * inset };
            const fdx = fullP2.x - fullP1.x, fdy = fullP2.y - fullP1.y;
            const fullDist = Math.sqrt(fdx * fdx + fdy * fdy);
            return { p1, p2, from: l.from, to: l.to, fullDist, width: l.width };
        });

        const allPts = [];
        computedLines.forEach((cl, segIdx) => {
            const { p1, p2, from, to, width } = cl;
            const dx = p2.x - p1.x, dy = p2.y - p1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const curveSegs = Math.max(3, Math.floor(dist / 5));
            const nx = -dy / dist, ny = dx / dist;
            const nextWidth = segIdx < computedLines.length - 1 ? computedLines[segIdx + 1].width : (taper && trimEnd ? defaultWidth * 0.01 : width);

            if (segIdx === 0) allPts.push({ x: p1.x, y: p1.y, w: width });

            for (let i = 1; i < curveSegs; i++) {
                const t = i / curveSegs;
                const baseX = p1.x + dx * t;
                const baseY = p1.y + dy * t;
                const seedHash = Math.abs(from.q * 7 + from.r * 13 + to.q * 11 + to.r * 17 + i * 3);
                const seed = seedHash % 10;
                const sine = Math.sin(t * Math.PI * curveSegs / 2);
                const amplitude = (this.data.gridSize * 0.09) * (0.4 + seed / 15) * sine;
                allPts.push({ x: baseX + nx * amplitude, y: baseY + ny * amplitude, w: width + (nextWidth - width) * t });
            }

            allPts.push({ x: p2.x, y: p2.y, w: nextWidth });
        });

        if (allPts.length < 2) return;

        if (dashCount > 1 && computedLines.length > 0) {
            const unitLen = computedLines[0].fullDist / dashCount;
            this.ctx.setLineDash([unitLen, unitLen]);
            this.ctx.lineDashOffset = (dashCount % 2 === 0) ? unitLen / 2 : 0;
        }

        if (taper) {
            for (let i = 0; i < allPts.length - 1; i++) {
                const a = allPts[Math.max(0, i - 1)];
                const b = allPts[i];
                const c = allPts[i + 1];
                const d = allPts[Math.min(allPts.length - 1, i + 2)];
                const cp1x = b.x + (c.x - a.x) / 6;
                const cp1y = b.y + (c.y - a.y) / 6;
                const cp2x = c.x - (d.x - b.x) / 6;
                const cp2y = c.y - (d.y - b.y) / 6;
                this.ctx.lineWidth = b.w;
                this.ctx.beginPath();
                this.ctx.moveTo(b.x, b.y);
                this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, c.x, c.y);
                this.ctx.stroke();
            }
        } else {
            this.ctx.beginPath();
            this.ctx.moveTo(allPts[0].x, allPts[0].y);
            for (let i = 0; i < allPts.length - 1; i++) {
                const a = allPts[Math.max(0, i - 1)];
                const b = allPts[i];
                const c = allPts[i + 1];
                const d = allPts[Math.min(allPts.length - 1, i + 2)];
                const cp1x = b.x + (c.x - a.x) / 6;
                const cp1y = b.y + (c.y - a.y) / 6;
                const cp2x = c.x - (d.x - b.x) / 6;
                const cp2y = c.y - (d.y - b.y) / 6;
                this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, c.x, c.y);
            }
            this.ctx.stroke();
        }

        if (dashCount > 1) { this.ctx.setLineDash([]); this.ctx.lineDashOffset = 0; }
    }

    async saveData() {
        if (this.file && await this.app.vault.adapter.exists(this.file.path)) {
            this.isSaving = true;
            try {
                const toolConfigsToSave = {};
                Object.keys(this.toolConfigs).forEach(key => {
                    toolConfigsToSave[key] = {
                        currentVariant: this.toolConfigs[key].currentVariant,
                        symbolColor: this.toolConfigs[key].symbolColor,
                        backgroundColor: this.toolConfigs[key].backgroundColor,
                        backgroundEnabled: this.toolConfigs[key].backgroundEnabled
                    };
                });

                this.data.settings = {
                    colorPalette: this.colorPalette,
                    colorPalette2: this.colorPalette2,
                    activeColorSlot: this.activeColorSlot,
                    drawMode: !this.editMode && this._savedDrawMode ? this._savedDrawMode : this.drawMode,
                    currentToolGroup: !this.editMode && this._savedToolGroup !== undefined ? this._savedToolGroup : this.currentToolGroup,
                    toolConfigs: toolConfigsToSave,
                    patternData: this.patternData,
                    patternSourceHex: this.patternSourceHex,
                    borderSettings: this.borderSettings,
                    riverSettings: this.riverSettings,
                    roadSettings: this.roadSettings,
                    masterColor: this.masterColor,
                    editMode: this.editMode,
                    hexColorColor: this.hexColorColor,
                    lastUsedTextSize: this.lastUsedTextSize,
                    lastUsedTextOutline: this.lastUsedTextOutline,
                    lastUsedTextBold: this.lastUsedTextBold,
                    lastUsedTextShadow: this.lastUsedTextShadow,
                    lastUsedTextShadowDistance: this.lastUsedTextShadowDistance,
                    lastUsedTextShadowOpatown: this.lastUsedTextShadowOpatown,
                    viewportSaved: true
                };

                const now = new Date().toISOString().split('T')[0];
                const frontmatter = `---\ntype: hexcartographer\ncreated: ${now}\n---\n\n`;
                const jsonData = JSON.stringify(this.data, null, 2);
                const title = this.file.basename.replace('.hexcartographer', '');
                const content = `${frontmatter}# ${title}\n\n\`\`\`json\n${jsonData}\n\`\`\`\n`;

                await this.app.vault.modify(this.file, content);
            }
            catch (e) {
                console.error(e);
            } finally {
                setTimeout(() => { this.isSaving = false; }, 200);
            }
        }
    }

    requestSave() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.saveData(), 1000);
    }

    resizeCanvas() {
        if (!this.canvas) return;
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        if (!this._initialResizeDone) {
            this._initialResizeDone = true;
            if (!this.data.settings || !this.data.settings.viewportSaved) {
                this.data.offX = this.canvas.width / 2;
                this.data.offY = this.canvas.height / 2;
            }
        }

        if (this.textCanvas) {
            this.textCanvas.width = this.textCanvas.clientWidth;
            this.textCanvas.height = this.textCanvas.clientHeight;
        }

        this.render();
    }

    getWorldCoords(e) {
        const r = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - r.left - this.data.offX) / this.data.zoom,
            y: (e.clientY - r.top - this.data.offY) / this.data.zoom
        };
    }

    hexToPixel(h) {
        const s = this.data.gridSize;
        return {
            x: s * (Math.sqrt(3) * h.q + Math.sqrt(3)/2 * h.r),
            y: s * (3/2 * h.r)
        };
    }

    pixelToHex(x, y) {
        const s = this.data.gridSize;
        const q = (Math.sqrt(3)/3 * x - 1/3 * y) / s;
        const r = (2/3 * y) / s;

        const cubeX = q;
        const cubeZ = r;
        const cubeY = -cubeX - cubeZ;

        let rx = Math.round(cubeX);
        let ry = Math.round(cubeY);
        let rz = Math.round(cubeZ);

        const xDiff = Math.abs(rx - cubeX);
        const yDiff = Math.abs(ry - cubeY);
        const zDiff = Math.abs(rz - cubeZ);

        if (xDiff > yDiff && xDiff > zDiff) {
            rx = -ry - rz;
        } else if (yDiff > zDiff) {
            ry = -rx - rz;
        } else {
            rz = -rx - ry;
        }

        return { q: rx, r: rz };
    }

    async onClose() {
        if (this.resizeObserver) this.resizeObserver.disconnect();
        await this.saveData();
    }
}

class FileSelectorModal extends Modal {
    constructor(app, onSelect, currentLink = '') {
        super(app);
        this.onSelect = onSelect;
        this.currentLink = currentLink;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: t('modal.selectFile') });

        const filter = contentEl.createEl('input', { value: this.currentLink, placeholder: t('modal.searchFile') });
        filter.style.width = '100%';
        filter.style.marginBottom = '10px';

        const listContainer = contentEl.createDiv({
            style: 'max-height: 400px; overflow-y: auto; overflow-x: hidden; border: 1px solid var(--divider-color); background: var(--background-primary); border-radius: 4px;'
        });

        const renderList = (searchTerm = '') => {
            listContainer.empty();
            const val = searchTerm.toLowerCase();
            const files = this.app.vault.getMarkdownFiles().filter(f =>
                val === '' || f.path.toLowerCase().includes(val)
            );

            if (files.length === 0) {
                listContainer.createDiv({ text: t('modal.noFilesFound'), style: 'padding: 10px; color: var(--text-muted); text-align: center;' });
                return;
            }

            files.forEach(f => {
                const item = listContainer.createDiv({
                    text: f.path,
                    cls: 'suggestion-item',
                    style: 'padding: 8px; cursor: pointer; border-bottom: 1px solid var(--divider-color); font-size: 0.95em;'
                });
                item.onmouseover = () => item.style.background = 'var(--background-modifier-hover)';
                item.onmouseout = () => item.style.background = '';
                item.onclick = () => {
                    this.onSelect(f.path);
                    this.close();
                };
            });
        };

        filter.oninput = () => renderList(filter.value);
        renderList(this.currentLink);

        const btnRow = contentEl.createDiv({ style: 'display: flex; gap: 10px; margin-top: 15px;' });

        const clearBtn = btnRow.createEl('button', { text: t('modal.removeLink'), style: 'flex: 1;' });
        clearBtn.onclick = () => {
            this.onSelect('');
            setTimeout(() => {
                this.close();
                if (activeDocument.activeElement instanceof HTMLElement) {
                    activeDocument.activeElement.blur();
                }
            }, 50);
        };

        const cancelBtn = btnRow.createEl('button', { text: t('modal.cancel'), cls: 'mod-cta', style: 'flex: 1;' });
        cancelBtn.onclick = () => this.close();

        filter.focus();
    }
}

class TextInputModal extends Modal {
    constructor(app, onSubmit, val = '', size = DEFAULT_TEXT_SIZE, link = '', color = DEFAULT_TEXT_COLOR, outline = true, bold = false, shadow = false, shadowDistance = DEFAULT_SHADOW_DISTANCE, shadowOpatown = DEFAULT_SHADOW_OPACITY, colorPalette = null, colorPalette2 = null) {
        super(app);
        this.onSubmit = onSubmit;
        this.val = val;
        this.size = size;
        this.link = link;
        this.color = color;
        this.outline = outline;
        this.bold = bold;
        this.shadow = shadow;
        this.shadowDistance = shadowDistance;
        this.shadowOpatown = shadowOpatown;
        this.colorPalette = colorPalette;
        this.colorPalette2 = colorPalette2;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: t('modal.formatText') });

        contentEl.createEl('label', { text: t('modal.displayText'), style: 'display: block; margin-bottom: 5px; font-weight: 500;' });
        const mainInput = contentEl.createEl('input', { value: this.val, placeholder: t('modal.textPlaceholder') });
        mainInput.style.width = '100%';
        mainInput.style.marginBottom = '20px';
        mainInput.style.padding = '8px';

        contentEl.createEl('label', { text: t('modal.textSize'), style: 'display: block; margin-bottom: 5px; font-weight: 500;' });
        const sInput = contentEl.createEl('input', { type: 'number', value: this.size });
        sInput.style.width = '100%';
        sInput.style.marginBottom = '20px';
        sInput.style.padding = '8px';

        const colorSection = contentEl.createDiv({ style: 'margin-bottom: 20px;' });
        colorSection.createEl('label', { text: t('modal.textColor'), style: 'display: block; margin-bottom: 5px; font-weight: 500;' });
        const colorPicker = createColorPickerElement(colorSection, this.app, this.color, (color) => {
            this.color = color;
        });

        const paletteContainer = colorSection.createDiv({ style: 'display: flex; flex-direction: column; gap: 3px; margin-top: 10px;' });
        paletteContainer.createEl('span', { text: t('modal.palette'), attr: { style: 'font-size: 11px; margin-bottom: 3px;' } });

        [this.colorPalette, this.colorPalette2].forEach(palette => {
            if (!palette) return;
            const row = paletteContainer.createDiv({ style: 'display: flex; gap: 5px;' });
            palette.forEach(color => {
                const paletteBtn = row.createEl('button', {
                    attr: {
                        style: `width: 30px; height: 30px; background: ${color}; border: 2px solid var(--divider-color); border-radius: 3px; cursor: pointer;`
                    }
                });
                paletteBtn.onclick = () => {
                    colorPicker.setColor(color);
                    this.color = color;
                };
            });
        });

        const formatSection = contentEl.createDiv({ style: 'margin-bottom: 20px;' });
        formatSection.createEl('label', { text: t('modal.formatting'), style: 'display: block; margin-bottom: 8px; font-weight: 500;' });

        const checkboxGrid = formatSection.createDiv({ style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px;' });

        const outlineLabel = checkboxGrid.createEl('label', { style: 'display: flex; gap: 8px; align-items: center; cursor: pointer;' });
        const outlineInput = outlineLabel.createEl('input', { type: 'checkbox' });
        outlineInput.checked = this.outline;
        outlineInput.style.cursor = 'pointer';
        outlineInput.style.marginLeft = '4px';
        outlineLabel.appendText(t('modal.outline'));

        const boldLabel = checkboxGrid.createEl('label', { style: 'display: flex; gap: 8px; align-items: center; cursor: pointer;' });
        const boldInput = boldLabel.createEl('input', { type: 'checkbox' });
        boldInput.checked = this.bold;
        boldInput.style.cursor = 'pointer';
        boldInput.style.marginLeft = '4px';
        boldLabel.appendText(t('modal.bold'));

        const shadowSection = contentEl.createDiv({ style: 'margin-bottom: 20px; padding: 15px; background: var(--background-secondary); border-radius: 5px;' });
        shadowSection.createEl('label', { text: t('modal.shadowSettings'), style: 'display: block; margin-bottom: 10px; font-weight: 500;' });

        const shadowLabel = shadowSection.createEl('label', { style: 'display: flex; gap: 8px; align-items: center; cursor: pointer; margin-bottom: 12px;' });
        const shadowInput = shadowLabel.createEl('input', { type: 'checkbox' });
        shadowInput.checked = this.shadow;
        shadowInput.style.cursor = 'pointer';
        shadowInput.style.marginLeft = '4px';
        shadowLabel.appendText(t('modal.shadowEnable'));

        const shadowParams = shadowSection.createDiv({ style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px;' });

        const distanceDiv = shadowParams.createDiv();
        distanceDiv.createEl('label', { text: t('modal.shadowDistance'), style: 'display: block; margin-bottom: 5px; font-size: 12px;' });
        const shadowDistanceInput = distanceDiv.createEl('input', {
            type: 'number',
            value: this.shadowDistance.toString()
        });
        shadowDistanceInput.style.width = '100%';
        shadowDistanceInput.style.padding = '6px';

        const opatownDiv = shadowParams.createDiv();
        opatownDiv.createEl('label', { text: t('modal.shadowOpacity'), style: 'display: block; margin-bottom: 5px; font-size: 12px;' });
        const shadowOpatownInput = opatownDiv.createEl('input', {
            type: 'number',
            value: this.shadowOpatown.toString()
        });
        shadowOpatownInput.style.width = '100%';
        shadowOpatownInput.style.padding = '6px';
        shadowOpatownInput.min = '0';
        shadowOpatownInput.max = '100';

        const linkSection = contentEl.createDiv({ style: 'margin-bottom: 20px;' });
        linkSection.createEl('label', { text: t('modal.linkToFile'), style: 'display: block; margin-bottom: 5px; font-weight: 500;' });

        const linkDisplayRow = linkSection.createDiv({ style: 'display: flex; gap: 8px; align-items: stretch;' });
        const linkDisplay = linkDisplayRow.createEl('input', {
            value: this.link,
            placeholder: t('modal.noLinkSelected'),
            attr: { readonly: 'true' }
        });
        linkDisplay.style.flex = '1';
        linkDisplay.style.background = 'var(--background-secondary)';
        linkDisplay.style.cursor = 'default';
        linkDisplay.style.padding = '8px';

        const selectLinkBtn = linkDisplayRow.createEl('button', { text: t('modal.selectFileBtn') });
        selectLinkBtn.style.padding = '8px 16px';
        selectLinkBtn.style.whiteSpace = 'nowrap';
        selectLinkBtn.onclick = () => {
            const selector = new FileSelectorModal(this.app, (selectedPath) => {
                linkDisplay.value = selectedPath;
                this.link = selectedPath;

                setTimeout(() => {
                    selectLinkBtn.focus();
                }, 100);
            }, linkDisplay.value);

            selector.open();
        };

        const btnRow = contentEl.createDiv();
        btnRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr 1fr; width: 100%; margin-top: 25px; padding-top: 15px; border-top: 1px solid var(--background-modifier-border);';
        const cancelBtn = btnRow.createEl('button', { text: t('modal.cancel') });
        cancelBtn.style.justifySelf = 'start';
        cancelBtn.onclick = () => this.close();
        const deleteBtn = btnRow.createEl('button', { text: t('modal.deleteText') });
        deleteBtn.style.cssText = 'justify-self: center; color: var(--text-error);';
        deleteBtn.onclick = () => { this.onSubmit('', 0, '', '', false, false, false, 0, 0); this.close(); };
        const okBtn = btnRow.createEl('button', { text: 'OK', cls: 'mod-cta' });
        okBtn.style.justifySelf = 'end';
        okBtn.onclick = () => {
            const opatownValue = shadowOpatownInput.value === '' ? 0 : parseInt(shadowOpatownInput.value);
            const clampedOpatown = Math.max(0, Math.min(100, opatownValue));
            const shadowEnabled = clampedOpatown === 0 ? false : shadowInput.checked;

            this.onSubmit(
                mainInput.value,
                parseInt(sInput.value),
                linkDisplay.value,
                this.color,
                outlineInput.checked,
                boldInput.checked,
                shadowEnabled,
                parseInt(shadowDistanceInput.value) || DEFAULT_SHADOW_DISTANCE,
                clampedOpatown
            );
            this.close();
        };

        mainInput.focus();
    }
}


class ColorPickerModal extends Modal {
    constructor(app, initialColor, onSelect) {
        super(app);
        this.onSelect = onSelect;
        this.initialColor = initialColor || '#ff0000';
        const hsb = hexToHsb(this.initialColor);
        this.hue = hsb.h;
        this.sat = hsb.s;
        this.bri = hsb.b;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: t('modal.colorPickerTitle') });

        // Farbvorschau
        this.previewEl = contentEl.createDiv({
            attr: { style: 'width: 100%; height: 60px; border-radius: 6px; border: 1px solid var(--divider-color); margin-bottom: 12px;' }
        });
        this.previewEl.style.backgroundColor = this.initialColor;

        // SB-Quadrat
        const sbSize = 256;
        this.sbCanvas = contentEl.createEl('canvas', {
            attr: { width: sbSize, height: sbSize, style: 'width: 100%; aspect-ratio: 1; border-radius: 4px; cursor: crosshair; touch-action: none; display: block;' }
        });
        this.sbCtx = this.sbCanvas.getContext('2d');

        // Hue-Leiste
        this.hueCanvas = contentEl.createEl('canvas', {
            attr: { width: 256, height: 24, style: 'width: 100%; height: 30px; border-radius: 4px; cursor: pointer; touch-action: none; display: block; margin-top: 10px;' }
        });
        this.hueCtx = this.hueCanvas.getContext('2d');

        // Hex-Eingabe
        const hexRow = contentEl.createDiv({ attr: { style: 'display: flex; align-items: center; gap: 8px; margin-top: 12px;' } });
        hexRow.createEl('label', { text: 'Hex:',  attr: { style: 'font-weight: 500;' } });
        this.hexInput = hexRow.createEl('input', { value: this.initialColor, attr: { style: 'flex: 1; padding: 6px; font-family: monospace;' } });
        this.hexInput.addEventListener('input', () => {
            const val = this.hexInput.value.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                const hsb = hexToHsb(val);
                this.hue = hsb.h; this.sat = hsb.s; this.bri = hsb.b;
                this.renderAll();
            }
        });

        // Buttons
        const btnRow = contentEl.createDiv({ attr: { style: 'display: flex; gap: 10px; margin-top: 15px;' } });
        const okBtn = btnRow.createEl('button', { text: 'OK', cls: 'mod-cta', attr: { style: 'flex: 1;' } });
        okBtn.onclick = () => { this.onSelect(hsbToHex(this.hue, this.sat, this.bri)); this.close(); };
        const cancelBtn = btnRow.createEl('button', { text: t('modal.colorPickerCancel'), attr: { style: 'flex: 1;' } });
        cancelBtn.onclick = () => this.close();

        // Pointer Events — SB-Quadrat
        this._sbDragging = false;
        this.sbCanvas.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this.sbCanvas.setPointerCapture(e.pointerId);
            this._sbDragging = true;
            this._updateSB(e);
        });
        this.sbCanvas.addEventListener('pointermove', (e) => { if (this._sbDragging) this._updateSB(e); });
        this.sbCanvas.addEventListener('pointerup', () => { this._sbDragging = false; });

        // Pointer Events — Hue-Leiste
        this._hueDragging = false;
        this.hueCanvas.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this.hueCanvas.setPointerCapture(e.pointerId);
            this._hueDragging = true;
            this._updateHue(e);
        });
        this.hueCanvas.addEventListener('pointermove', (e) => { if (this._hueDragging) this._updateHue(e); });
        this.hueCanvas.addEventListener('pointerup', () => { this._hueDragging = false; });

        this.renderAll();
    }

    _updateSB(e) {
        const rect = this.sbCanvas.getBoundingClientRect();
        this.sat = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        this.bri = Math.max(0, Math.min(100, (1 - (e.clientY - rect.top) / rect.height) * 100));
        this.renderAll();
    }

    _updateHue(e) {
        const rect = this.hueCanvas.getBoundingClientRect();
        this.hue = Math.max(0, Math.min(360, ((e.clientX - rect.left) / rect.width) * 360));
        this.renderAll();
    }

    renderAll() {
        const hex = hsbToHex(this.hue, this.sat, this.bri);
        this.previewEl.style.backgroundColor = hex;
        this.hexInput.value = hex;
        this.renderSB();
        this.renderHue();
    }

    renderSB() {
        const ctx = this.sbCtx;
        const w = this.sbCanvas.width, h = this.sbCanvas.height;
        // Hue-Füllung
        ctx.fillStyle = hsbToHex(this.hue, 100, 100);
        ctx.fillRect(0, 0, w, h);
        // Weißer Horizontalverlauf (Sättigung)
        const whiteGrad = ctx.createLinearGradient(0, 0, w, 0);
        whiteGrad.addColorStop(0, 'rgba(255,255,255,1)');
        whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = whiteGrad;
        ctx.fillRect(0, 0, w, h);
        // Schwarzer Vertikalverlauf (Helligkeit)
        const blackGrad = ctx.createLinearGradient(0, 0, 0, h);
        blackGrad.addColorStop(0, 'rgba(0,0,0,0)');
        blackGrad.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = blackGrad;
        ctx.fillRect(0, 0, w, h);
        // Fadenkreuz-Indikator
        const cx = (this.sat / 100) * w;
        const cy = (1 - this.bri / 100) * h;
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.strokeStyle = this.bri > 50 ? '#000' : '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    renderHue() {
        const ctx = this.hueCtx;
        const w = this.hueCanvas.width, h = this.hueCanvas.height;
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        const stops = [0, 60, 120, 180, 240, 300, 360];
        stops.forEach(deg => grad.addColorStop(deg / 360, `hsl(${deg}, 100%, 50%)`));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // Indikator
        const x = (this.hue / 360) * w;
        ctx.beginPath();
        ctx.rect(x - 3, 0, 6, h);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

function createColorPickerElement(containerEl, app, initialColor, onChange) {
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    let currentColor = initialColor;
    const btn = containerEl.createEl('button', {
        attr: { style: 'width: 100%; height: 40px; border: 1px solid var(--divider-color); border-radius: 4px; cursor: pointer; padding: 0; box-sizing: border-box;' }
    });
    btn.style.backgroundColor = initialColor;
    let hiddenInput = null;
    if (isTouchDevice) {
        btn.addEventListener('click', () => {
            new ColorPickerModal(app, currentColor, (color) => {
                currentColor = color;
                btn.style.backgroundColor = color;
                onChange(color);
            }).open();
        });
    } else {
        hiddenInput = containerEl.createEl('input', {
            type: 'color',
            value: initialColor,
            attr: { style: 'position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none;' }
        });
        btn.addEventListener('click', () => hiddenInput.click());
        hiddenInput.addEventListener('input', (e) => {
            currentColor = e.target.value;
            btn.style.backgroundColor = e.target.value;
            onChange(e.target.value);
        });
    }
    return {
        setColor(color) {
            currentColor = color;
            btn.style.backgroundColor = color;
            if (hiddenInput) hiddenInput.value = color;
        },
        getColor() { return currentColor; },
        btn
    };
}

class ExportMapModal extends Modal {
    constructor(app, mapSize, defaultWidth, onExport) {
        super(app);
        this.onExport = onExport;
        this.aspect = mapSize.w / mapSize.h;
        this.format = 'png';
        this.quality = 85;
        this.imgWidth = defaultWidth || 1024;
        this.imgHeight = Math.round(this.imgWidth / this.aspect);
        this._updating = false;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: t('modal.exportTitle') });

        // Format
        const formatRow = contentEl.createDiv({ attr: { style: 'display: flex; align-items: center; gap: 8px; margin-bottom: 12px;' } });
        formatRow.createEl('span', { text: t('modal.exportFormat') + ':' });
        const pngBtn = formatRow.createEl('button', { text: 'PNG' });
        const jpegBtn = formatRow.createEl('button', { text: 'JPEG' });

        const btnStyle = (btn, active) => {
            btn.style.padding = '4px 12px';
            btn.style.borderRadius = '4px';
            btn.style.cursor = 'pointer';
            btn.style.border = '1px solid var(--divider-color)';
            btn.style.background = active ? 'var(--interactive-accent)' : 'var(--background-secondary)';
            btn.style.color = active ? 'var(--text-on-accent)' : 'var(--text-normal)';
        };

        // Bildgröße
        const sizeRow = contentEl.createDiv({ attr: { style: 'display: flex; align-items: center; gap: 8px; margin-bottom: 12px;' } });
        sizeRow.createEl('span', { text: 'px:' });
        const widthInput = sizeRow.createEl('input', { attr: { type: 'number', min: '64', max: '8192', step: '1', value: this.imgWidth, style: 'width: 80px;' } });
        sizeRow.createEl('span', { text: '\u00D7' });
        const heightInput = sizeRow.createEl('input', { attr: { type: 'number', min: '64', max: '8192', step: '1', value: this.imgHeight, style: 'width: 80px;' } });

        widthInput.oninput = () => {
            if (this._updating) return;
            this._updating = true;
            this.imgWidth = parseInt(widthInput.value) || 1024;
            this.imgHeight = Math.round(this.imgWidth / this.aspect);
            heightInput.value = this.imgHeight;
            this._updating = false;
        };
        heightInput.oninput = () => {
            if (this._updating) return;
            this._updating = true;
            this.imgHeight = parseInt(heightInput.value) || Math.round(1024 / this.aspect);
            this.imgWidth = Math.round(this.imgHeight * this.aspect);
            widthInput.value = this.imgWidth;
            this._updating = false;
        };

        // Qualität (nur JPEG)
        const qualityRow = contentEl.createDiv({ attr: { style: 'display: flex; align-items: center; gap: 8px; margin-bottom: 12px;' } });
        qualityRow.createEl('span', { text: t('modal.exportQuality') + ':' });
        const slider = qualityRow.createEl('input', { attr: { type: 'range', min: '10', max: '100', step: '5', value: this.quality, style: 'flex: 1;' } });
        const valueDisplay = qualityRow.createEl('span', { text: this.quality + '%', attr: { style: 'min-width: 40px; text-align: right;' } });
        slider.oninput = () => { this.quality = parseInt(slider.value); valueDisplay.textContent = this.quality + '%'; };

        const updateFormatUI = () => {
            btnStyle(pngBtn, this.format === 'png');
            btnStyle(jpegBtn, this.format === 'jpeg');
            qualityRow.style.display = this.format === 'jpeg' ? 'flex' : 'none';
        };

        pngBtn.onclick = () => { this.format = 'png'; updateFormatUI(); };
        jpegBtn.onclick = () => { this.format = 'jpeg'; updateFormatUI(); };

        // Buttons
        const btnRow = contentEl.createDiv({ attr: { style: 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;' } });
        const cancelBtn = btnRow.createEl('button', { text: t('modal.colorPickerCancel') });
        cancelBtn.onclick = () => this.close();
        const exportBtn = btnRow.createEl('button', { text: t('modal.exportExport'), cls: 'mod-cta' });
        exportBtn.onclick = () => { this.onExport(this.format, this.imgWidth, this.quality); this.close(); };

        updateFormatUI();
    }
}

class HexCartographerSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Hex Cartographer' });

        new Setting(containerEl)
            .setDesc(t('settings.donateText'))
            .addButton(btn => {
                btn.setButtonText(t('settings.donateButton'))
                    .setCta()
                    .onClick(() => {
                        window.open('https://ko-fi.com/christophwerner', '_blank');
                    });
            });

        new Setting(containerEl)
            .setName(t('settings.exportWidth'))
            .setDesc(t('settings.exportWidthDesc'))
            .addText(text => {
                text.inputEl.type = 'number';
                text.inputEl.min = '64';
                text.inputEl.max = '8192';
                text.inputEl.step = '1';
                text.setValue(String(this.plugin.settings.exportWidth))
                    .onChange(async (value) => {
                        const num = parseInt(value);
                        if (num >= 64 && num <= 8192) {
                            this.plugin.settings.exportWidth = num;
                            await this.plugin.saveSettings();
                        }
                    });
            });

        new Setting(containerEl)
            .setName(t('settings.showCrosshair'))
            .setDesc(t('settings.showCrosshairDesc'))
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.showCrosshair)
                    .onChange(async (value) => {
                        this.plugin.settings.showCrosshair = value;
                        await this.plugin.saveSettings();
                        this.app.workspace.iterateAllLeaves(leaf => {
                            if (leaf.view instanceof HexCartographerView) leaf.view.render();
                        });
                    });
            });

        this.buildGuide(containerEl);
    }

    buildGuide(containerEl) {
        containerEl.createEl('h3', { text: t('guide.title') });

        const guide = [
            ['basics', [
                [null, 'guide.basics.create'],
                ['wrench', 'guide.basics.editMode'],
            ]],
            ['navigation', [
                [null, 'guide.navigation.zoom'],
                [null, 'guide.navigation.pan'],
                ['maximize-2', 'guide.navigation.fit'],
            ]],
            ['hexcolor', [
                ['hexagon', 'guide.hexcolor.paint'],
                ['pipette', 'guide.hexcolor.eyedropper'],
                [null, 'guide.hexcolor.palette'],
            ]],
            ['symbols', [
                ['pine', 'guide.symbols.groups'],
                [null, 'guide.symbols.variant'],
                [null, 'guide.symbols.colors'],
            ]],
            ['drawing', [
                ['pencil', 'guide.drawing.pen'],
                ['paint-bucket', 'guide.drawing.fill'],
                ['eraser', 'guide.drawing.eraser'],
                ['mouse-pointer-2', 'guide.drawing.rightclick'],
            ]],
            ['pattern', [
                ['copy', 'guide.pattern.stamp'],
                ['pipette', 'guide.pattern.pick'],
            ]],
            ['paths', [
                ['waves', 'guide.paths.river'],
                ['route', 'guide.paths.road'],
                ['mouse-pointer', 'guide.paths.pick'],
                ['text-cursor-input', 'guide.paths.width'],
                ['text-cursor-input', 'guide.paths.dashes'],
            ]],
            ['borders', [
                ['shield', 'guide.borders.draw'],
                ['mouse-pointer', 'guide.borders.pick'],
                ['text-cursor-input', 'guide.borders.dash'],
                ['eye', 'guide.borders.visibility'],
            ]],
            ['text', [
                ['type', 'guide.text.tool'],
            ]],
            ['undoredo', [
                ['undo-2', 'guide.undoredo.undo'],
                ['redo-2', 'guide.undoredo.redo'],
            ]],
            ['print', [
                ['printer', 'guide.print.pc'],
                ['download', 'guide.print.export'],
                ['smartphone', 'guide.print.exportMobile'],
            ]],
            ['touch', [
                ['pointer', 'guide.touch.tap'],
                ['timer', 'guide.touch.longpress'],
                ['zoom-in', 'guide.touch.zoom'],
                ['move', 'guide.touch.pan'],
            ]],
        ];

        for (const [key, items] of guide) {
            const details = containerEl.createEl('details');
            details.createEl('summary', { text: t(`guide.${key}`), cls: 'hex-guide-summary' });
            const content = details.createEl('div', { cls: 'hex-guide-content' });
            for (const [icon, textKey] of items) {
                const row = content.createEl('div', { cls: 'hex-guide-row' });
                const iconEl = row.createEl('span', { cls: 'hex-guide-icon' });
                if (icon && icon.startsWith('input:')) {
                    iconEl.createEl('span', { text: icon.slice(6), cls: 'hex-guide-input-icon' });
                } else if (icon && SVG_SYMBOL_DATA[icon]) {
                    const data = SVG_SYMBOL_DATA[icon];
                    const svgEl = iconEl.createSvg('svg', { attr: { viewBox: `0 0 ${data.viewBoxWidth} ${data.viewBoxWidth}`, width: '16', height: '16' } });
                    svgEl.createSvg('path', { attr: { d: data.pathData, fill: 'currentColor' } });
                } else if (icon) {
                    setIcon(iconEl, icon);
                }
                const textEl = row.createEl('span');
                textEl.innerHTML = t(textKey);
            }
        }

        const style = containerEl.createEl('style');
        style.textContent = `
            .hex-guide-summary { cursor: pointer; font-weight: 600; padding: 6px 0; }
            .hex-guide-content { padding: 4px 0 8px 12px; }
            .hex-guide-row { display: flex; align-items: flex-start; gap: 8px; padding: 3px 0; }
            .hex-guide-icon { display: flex; align-items: center; justify-content: center; width: 20px; flex-shrink: 0; margin-top: 2px; }
            .hex-guide-icon svg { width: 16px; height: 16px; }
            .hex-guide-input-icon { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 16px; border: 1px solid var(--text-muted); border-radius: 3px; font-size: 10px; line-height: 1; color: var(--text-muted); }
        `;
    }
}

// === Eingebettete SVG-Symboldaten (pathData + viewBoxWidth) ===
const SVG_SYMBOL_DATA = {
    'question': { pathData: 'M284.61,594.99c154.07,6.75,288.53-106.54,308.17-259.13C618.48,136.05,442.5-30.93,244.2,4.87,88.94,32.89-17.75,178.81,2.46,335.87c18.38,142.85,138.08,252.81,282.15,259.13ZM282.26,549.3c-125.38-5.68-231.54-112.52-236.57-237.93-2.82-70.28,19.56-134.87,67.68-186.02,79.68-84.72,203.29-104.53,305.89-48.71,110.31,60.01,161.29,198.01,112.35,315.24-30.33,72.67-87.63,124.6-162.82,148.24-26.96,8.48-58.32,10.47-86.54,9.19ZM270.47,145.37c40.74-6.14,98.92-7.44,133.69,17.83,27.45,19.96,28.05,50.6,13,78.96l17.28,9.72.18.77c-31.76,64.12-104.43,94.76-170.02,112.33l-33.77-56.86c20.08-4.97,40.15-10.85,59.15-19.06,21.57-9.33,59.12-29.76,56.09-57.81-2.85-26.41-43.85-22.03-62.04-19.02-23.63,3.92-47.11,12.11-69.33,20.77l-27.2-66.03c27.02-9.32,54.6-17.33,82.97-21.6ZM288.26,457.23l-85.55,4.36c5.43-24.24,11.73-48.32,19.89-71.78l87.89-4.37-22.23,71.78Z', viewBoxWidth: 595.28 },
    'exclamation': { pathData: 'M284.43.3c240.79-10.45,394.24,256.82,262.3,460.1-113.56,174.96-369.25,180.79-490.72,11.14C-81.64,279.3,49.63,10.49,284.43.3ZM285.64,45.73c-129.65,5.45-235.28,111.92-240.05,241.77-1.58,42.97,5.95,80.12,24.31,118.66,59.74,125.39,209.35,180.06,335.86,119.62,125.23-59.82,179.82-209.62,119.47-336.29-44.01-92.38-137.03-148.07-239.59-143.76ZM357.53,134.07c-17.56,2.25-35.02,5.43-52.3,9.11-22.44,68.16-42.58,137.1-61.2,206.43l81.37-9.07c22.72-71.14,49.17-141,77.11-210.18-15,.21-30.09,1.81-44.98,3.72ZM233.22,383c-7.95,23.39-14.9,47.18-20.04,71.38l84.69-4.53,22.37-71.17-87.02,4.32Z', viewBoxWidth: 595.28 },
    'cross': { pathData: 'M583.95,199.28c-33.93,11.58-65.03,29.89-97.48,44.83-5.83,2.68-12.01,4.77-17.85,7.45-39.85,18.33-79.63,36.78-117.45,59.1,22.53,39.92,46.88,78.78,71.95,117.14,12.69,19.42,26.18,38.38,38.66,57.95,16.15,25.34,38.5,58.8,40.04,89.34.16,3.18.47,10.43-.02,13.25-.11.64-.24,1.13-.91,1.38-7.53-1.77-14.96-4.06-22.56-5.51-29.69-5.68-59.96-3.3-89.75-.24-11.58-33.93-29.89-65.03-44.83-97.48-8.56-18.59-16.05-37.69-24.89-56.18-12.36-25.85-26.19-50.97-39.62-76.25-.62-.18-1.12.05-1.68.28-3.32,1.38-10.79,6.93-14.35,9.23-62.89,40.75-125.42,89.7-172.54,148.32-5.26,6.55-12,17.98-17.53,23.3-1.25,1.2-6.13,4.1-7.75,4.35-1.21.19-3.75-6.25-4.53-7.64-4.64-8.15-9.92-16.1-15.38-23.72-1.98-2.76-5.25-5.62-7.05-8.48-3.25-5.17-5.43-13.49-8.23-19.37-6.09-12.82-14.49-24.68-24.63-34.58,26.29-20.95,51.33-43.41,77.34-64.67,20.59-16.83,40.56-32.46,63-46.83,29.1-18.63,59.06-36.11,89.05-53.26.19-.62-.05-1.12-.28-1.68-1.5-3.61-7.85-12.17-10.38-16.07-40.97-62.97-89.52-125.29-148.32-172.54-6.62-5.32-17.43-11.66-22.98-17.27-1.97-1.99-3.48-5.39-4.82-7.86-.13-1.35,6.33-3.85,7.79-4.68,8.16-4.65,16.11-9.88,23.72-15.38,2.77-2.01,5.6-5.2,8.49-7.04,5.16-3.28,13.45-5.42,19.37-8.23,12.82-6.09,24.68-14.49,34.58-24.63,20.94,26.29,43.41,51.33,64.67,77.34,32.59,39.87,56.89,78.55,83.28,122.58,5.62,9.39,11.33,21.65,17.45,30.27.41.58.72,1.22,1.46,1.46.95.24,1.72-.41,2.5-.77,6.9-3.23,15.42-8.87,22.21-12.86,52.32-30.73,101.08-65.02,152.04-97.51,28.47-18.15,66.85-43.92,102.04-40.04.8.09,1.55.02,1.93.94-1.77,7.53-4.06,14.96-5.51,22.56-5.68,29.68-3.29,59.97-.24,89.75ZM421.01,144.12c-47.28-42.44-114.08-59.68-176.25-44.83,11.17,13.97,20.55,29.16,30.48,44.02,37.28-3.38,74.28,6.91,104.03,29.33l41.92-26.86-.19-1.66ZM144.42,312.04c.93-1.9-.78-8.59-.89-11.19-1.31-31.62,3.93-54.67,18.12-82.55.67-1.31,3.1-4.45,3.19-5.49.23-2.51-27.55-35.07-31.4-39.33-.82-.21-.93.51-1.31.93-2.21,2.37-5.36,7.67-7.22,10.6-24.66,38.77-34.73,86.17-28.43,131.83,1.14,8.26,3.08,16.45,5.1,24.52,13.55-10.81,28.33-19.85,42.83-29.32ZM436.79,287.7c1.02,25.67-6.14,51.21-18.28,73.6-1.15,2.12-7.08,10.64-7.01,11.93l27.05,42.88c.88.22.92-.14,1.39-.61,3.5-3.51,8.21-10.48,11.14-14.73,26.91-39,38.76-86.87,33.45-134.16l-47.75,21.09ZM299.58,436.33c-21.21.89-41.61-1.84-61.44-9.28-6.7-2.51-12.87-6.04-19.52-8.65l-39.97,31.36c40.2,29.31,92.78,40.71,142.02,33.06l-21.08-46.48Z', viewBoxWidth: 595.28 },
    'grass': { pathData: 'M413.34,173.44c-24.3,53.1-42.18,108.22-62.6,162.72-4.25,11.35-8.71,21.92-11.62,33.8-4.76,19.48-6.53,31.27-14.23,49.9-4.63,11.21-3.76,16.3-12.05,27.13-16.68,21.77-41.53,38.78-68.28,22.01-29.71-18.62-14.45-56.82-4.74-82.57,14.09-37.37,35.88-78.4,56.64-112.57,31.08-51.15,61.54-97.17,105.88-138.14,6.4-5.92,15.15-15.23,24.19-15.69,4.58-.23,8.22.45,8.42,5.46.34,8.38-17.15,38.19-21.62,47.95ZM165.72,220.55c-9.56,1.22-23.09,12.95-30.5,19.42-43.92,38.3-77.71,91.64-97.56,146.46-3.15,8.69-9.98,35.9-6.1,43.54.9,1.78,14.26,11.38,16.77,12.62,9.21,4.53,29.35,3.94,39.4,1.93,8.96-1.8,28.47-9.58,32.95-17.81,1.39-2.55,7.15-20.52,7.62-23.55.63-4.06-.18-8.25.23-12.24.95-9.36,5.27-16.83,7.58-25.38,2.73-10.15,3.8-21.65,6.2-32.09,5.8-25.21,13.49-50.07,22.93-74.14,3.04-7.76,14.54-27.71,12.96-34.75-1.01-4.51-8.63-4.5-12.48-4.01ZM566.72,280.48c-.39-3.18-8.2-3.21-10.95-2.92-11.76,1.24-47.19,25.81-57.59,34.16-5.87,4.72-10.87,9.7-16.15,15.02-27.47,27.69-52,58.68-69.02,93.95-2.7,9.69,4.15,18.86,13.12,21.67,7.79,2.44,43.87,2.64,52.73,1.44,6.68-.91,25.41-13.84,27.71-20.38,3.18-9.08,2.98-18.19,5.74-27.22,2.08-6.8,6.41-12.45,8.96-18.65,10.82-26.29,17.31-47.83,31.88-73.21,2.87-5,14.14-19.16,13.56-23.87Z', viewBoxWidth: 595.28 },
    'swamp': { pathData: 'M456.45,367.51c-3.73-1.91-17.75-1.1-22.7-1.02-51.88.84-104.06,1.75-155.91.78-9.57-.18-19.19-.65-28.74-.52-18.98.26-58.47,5.03-72.78,20.06-13.87,14.57-7.2,32.08,10.14,35.74,16.79,3.54,30.9,2.47,47.62,2.39,46.45-.21,92.91-.13,139.23,0,15.27.04,35.57,3,50.33.75,11.49-1.75,26.28-20.57,31.67-31.87,2.97-6.24,9.09-22.23,1.15-26.31ZM246.91,318.17c3.01.04,5.29,1.15,8.64.73,10.41-1.32,25.15-20.9,29.22-31.59,1.86-4.89,4.52-13.41.8-17.85-2.76-3.3-6.13-1.15-9.08-1.1-9.16.15-18.27-.6-27.39-.58-37.23.06-74.47,1.43-111.82,1.3-4.9-.02-9.17-.8-13.42-.81-2.57,0-6.06,1.36-8.75,1.61-13.62,1.27-43.68,4.08-53.79,14.02-8.34,8.2-15.32,22.52.17,26.34,9.6,2.37,23.15,2.77,33.37,4.18,8.29,1.15,14.23,2.47,22.94,3.02,42.81,2.71,86.31.15,129.12.73ZM541.3,267.59c-4.76-5.95-27.45-3.72-34.95-3.91-10.43-.27-20.84-.61-31.37-.58-19.67.06-39.69.76-59.33,1.36-19.08.58-41.28-.12-59.1,9.42-17.74,9.49-14.99,39.87,4,43.49,17.44,3.32,34.14,2.02,51.74,2.37,25.59.51,51.6,1.71,77.31.85,18.73-.62,28.89-2.2,41.66-19.51,4.61-6.24,16-26.01,10.04-33.48ZM242.82,215.35c43.33-2.24,88,3.29,131.15.78,11.17-.65,27.91-2.74,34.89-14.11,6.89-11.23,6.62-26.13-5.88-31.27-8.76-3.6-37.35-1.28-48.33-1.18-27.6.24-59.98-1.78-86.95.52-15.44,1.32-29.44,10.24-35.85,27.03-5.15,13.49.37,15.63,10.97,18.23Z', viewBoxWidth: 595.28 },
    'bush': { pathData: 'M459.07,261.03c32.2.65,66.06,29.65,69.2,61.42.35,3.57-.76,17.06.21,18.69.22.37,1.89.83,2.61,1.53,10.82,10.36,14.38,17.31,23.02,28.09,5.78,7.21,22.37,13.5,24.53,18.27,4.55,10.05-.6,19.29-11.17,21.7-6.11,1.39-44.49,1.67-50.7.42-7.12-1.43-12.14-7.59-15.21-13.6-11.99,11.43-24.29,21.76-42.23,15.69-16.39-5.54-20.73-28.38-10.71-41.02,7.76-9.8,17.03-11.23,23.28-25.03,3.87-8.55,5.1-13.71.29-22.13-10.35-18.1-30.71-6.63-46.74-15.79-18.18-10.39-15.08-30.24-22.9-46.6-13.81-28.91-51.55-40.53-78.56-21.24-11.37,8.11-9.99,25.85-26.62,34.64-29.19,15.43-46.35-18.25-71.86-24.57-21.55-5.35-51.88,10.59-52.14,34.25-.2,18.84,19.5,39.43,9.53,57.48-4.91,8.89-18,15.69-28.17,15.7-4.98,0-9.65-2.24-14.73-1.71-11.44,1.17-29.11,11.47-23.69,24.66,3.09,7.51,6.38,10.06,5.17,19.83-.78,6.3-10.23,12.68-16.42,13.34-25.47,2.71-55.63-2.06-81.6.05-10.59-2.25-10.38-20.07-4.2-26.34,10.66-10.83,27.42-15.91,42.02-19.04,3.53-31.8,28.73-54.79,59.22-62.52-2.76-22.62-1.3-43.85,10.52-63.81,28.33-47.83,97.36-59.23,142.8-28.24,1.04,0,12.1-12.39,14.49-14.33,28.57-23.27,73.95-27.18,107.79-13.79,31.14,12.32,55.87,41.83,62.98,74.01Z', viewBoxWidth: 595.28 },
    'tree': { pathData: 'M125.2,189.04l4.93,55.35c0,5.63.44,15.34-6.59,16.48-5.9.96-24.56,1.45-25.5-6.38l4.07-63.56c-3.95-.55-7.62.98-11.5,1.09-9.43.27-9.47.71-18.45,2.46-29.43,5.75-59.65.25-67.6-32.49-2.7-11.1,3-19.7,2.27-27.42-.42-4.47-5.63-13.31-6.43-20.41C-3.6,78.73,22.67,41.62,61.11,51.95c3.22-24.57,11.46-45.16,37.95-50.55,38.66-7.86,73.37,18.11,69.47,58.55,19.82,7.71,40.46,23.76,42.55,46.5,3,32.6-12.11,51.55-40.62,64.33-6.7,3-14.21,4.54-20.58,7.41-8.33,3.76-14.42,11.01-24.66,10.82l-.02.03h0ZM155.09,58.96v-14.5c0-1.71-5.54-13.02-7-15-12.89-17.47-41.81-21.06-58.9-7.91-10.07,7.75-16.03,28.66-15.99,41.02.02,6.25,7.24,22.97-3.6,22.94s-5.99-18.2-11.73-20.82c-7.53-3.43-18.52-.88-25.45,3.07-15.98,9.12-25.23,38.87-15.81,55.16,2.87-5.33,22.76-25.85,25.34-11.24,1,5.66-9.68,12.86-13.35,17.24-23.98,28.64,1.77,62.15,36.55,52.55,1.55-.43,7.27-1.92,4.92-3.99-3.94-3.48-13.12-6.55-8.83-13.92,4.84-8.32,16.08,4.32,22.32,6.43,20.11,6.78,44.25.5,60.07-13.02,3.62-3.09,13.19-15.54,16.02-16.03,9.58-1.67,8.9,11.34,2.46,15.51,4.65.13,11.67-3.38,15.91-6.09,13.91-8.86,19.69-28.05,18.07-43.9-2.36-23.14-31.97-32.53-51.6-35.39-4.96-.72-17.14,1.68-18.38-5.67-2.5-14.87,26.99-4.45,29-6.45h-.02Z', viewBoxWidth: 211.46 },
    'pine': { pathData: 'M341.87,511.93c3.34.54,6.67,1.28,10.03,1.72,8.78,1.15,31.23,4.32,38.63,1.42,2.24-.88,11.66-8.63,14.04-10.68,5.74-4.95,10.69-10.43,16.59-15.37,4.21-3.53,15.51-13.15,19.76-15.21,5.4-2.62,20.01-4.84,26.94-6.82,15.74-4.49,31.37-9.69,47.03-14.47,17.52-5.35,29.49-8.81,45.63-18.28,8.73-5.12,27.01-16.16,13.87-26.77-26.93-7.67-52.21-18.72-77-31.53-15.63-8.07-33.65-17.31-47.8-27.56-4.06-2.94-7.89-6.19-11.86-9.24-.25-1.36.59-.84,1.49-.9,35.73-2.38,76.28-8.71,105.49-30.77,2.15-1.62,5.82-5.26,5.71-8.08-.31-7.53-13.07-7.86-18.78-9.57-8.5-2.54-14.78-6.93-22.56-10.6-12.53-5.9-25.45-11.21-37.61-17.86-30.59-16.76-56.21-41.98-81.37-65.75-.26-1.44.66-.75,1.52-.87,7.56-1.05,29.91-2.24,34.66-7.56,5.5-6.16.28-12.85-3.64-18.08-14.45-19.25-30.91-37.2-45.45-56.45-21.55-28.55-37.64-54.95-55.11-85.99-3.24-5.75-8.58-16.63-12.51-21.26-5.11-6.02-11.08-2.84-15.31,2.07-12.5,14.52-23.31,34.52-35.34,50.28s-27.16,34.55-40.92,49.52c-5.59,6.08-21.55,19.39-24.55,25.49s1.45,10.96,7.21,12.34c5.12,1.23,14.23.49,19.74.15,8.56-.53,17.09-2.19,25.62-2.71-9.51,10.95-19.77,21.22-30.16,31.35-17.74,17.29-36.71,32.11-55.73,47.97-9.59,7.99-18.44,17.09-28.36,24.7-16.9,12.97-35.36,24.27-51.21,38.62-5.04,4.56-8.68,11.36-.05,14.49,22.96,8.33,63.82.97,87.64-4.67,8.62-2.04,17.02-4.92,25.6-6.96.77-.18,1.15-1.17,1.03.42-31.04,32.95-68.3,59.4-105.3,85.23-15.2,10.6-31.23,22.03-48.2,29.57-5.56,2.47-11.65,4.08-17.08,6.43-4.51,1.95-8.2,3.89-7.87,9.62.13,2.22,1.46,3.26,1.8,4.88,1.38,6.68-.12,6.71,5.45,12.04,20.83,19.91,66.35,30.25,94.43,33.99,38.37,5.12,75.81,1.7,113.84-4.13,9.49,4.99,18.39,11.01,27.65,16.37,1.52.88,6.96,2.79,7,4.36-3.79,17.46-3.8,35.39-5.4,53.12-1.03,11.48-4.3,26.41-4.27,37.39.02,5.7,3.33,13.98,9.53,15.25,16.44.29,32.88.1,49.32.11,6.78,0,14.1,1.03,20.93-.12,10.11-1.69,10.53-15.07,10.12-23.1-.7-13.74-2.07-27.8-3.05-41.58-.37-5.31-1.33-10.68-1.8-15.98ZM519.1,411.83c-.12.91-.85.97-1.56,1.14-12.56,3.05-23.35,3.74-36.09,3.65-30.75-.22-62.56-1.92-92.46-9.42-7.87-1.97-23.26-8.74-30.54-8.04-3.92.38-6.22,2.68-5,6.81.36,1.22,3.9,3.72,5.1,4.54,12.06,8.22,35.58,18.98,49.41,25.35,3.71,1.7,10.09,3.28,13.06,5.02,3.26,1.91.46,6.12-1.37,8.05-5.27,5.57-13.39,11.56-19.32,16.85-2.21,1.98-10.64,10.98-12.92,11.1-59.05-13-119.21-30.62-167.61-68.09-4.04-3.13-13.01-12.39-17.53-13.23-3.29-.61-7.97,1.3-8.04,5.09s10.21,15.76,9.58,16.59c-3.07.89-5.74,2.13-8.92,2.84-10.99,2.45-25.83,3.9-37.2,5-19.69,1.91-42.38,3.84-62.06,4.25-9.89.2-16.04-.71-25.54-2.85-5.72-1.29-11.45-2.87-16.99-4.72,15.82-8.72,31.54-17.66,46.74-27.43,16.9-10.87,33.11-22.81,49.77-34.04,15.7-10.58,34.65-20.16,46.62-35.38,20.56-26.12,37.88-57.76,57.73-84.57,1.76-2.38,4.17-4.36,5.64-7.04,1.95-.48,11.37,13.51,13.23,15.69,3.96,4.6,10.49,11.02,15.06,15.08,2.61,2.33,8.18,8.01,11.51,6.05,1.97-1.16,8.56-7.39,10.54-9.35,7.3-7.21,15.02-17.14,20.72-25.71,3.49-5.25,11.86-17.78,13.64-23.14,2.15-6.49-.42-11.16-7.5-9.31-10.27,6.34-20.66,15.02-31.3,20.55-3.6,1.87-5.42,3.25-9.74,2.9-14.81-1.18-28.32-21.59-40.15-28.58-4.29-2.54-11.13-3.97-11.44,2.97-.34,7.54,6.97,9.66-.24,17.81-5.13,5.8-17.2,14.56-23.89,18.92-21.76,14.18-46.68,21.87-72.28,25.68-.12-.86.01-1.57.33-2.38,1.5-3.78,18.6-14.11,22.86-17.53,30.39-24.37,66.55-60.48,92.26-89.83,12.31-14.05,29.57-36.9,38.52-53.13,2.37-4.29,6.82-14.89-2.3-13.8-2.23.27-11.3,8.26-14.51,10.25-11.53,7.14-25.43,9.93-37.39,16.27l-.29-.89c8.97-9.84,17.09-20.55,24.36-31.72,11.82-18.17,20.64-37.98,32.61-56.03,6.3,12.05,13.85,24.03,19.9,36.17,10.15,20.35,18.69,40.27,30.33,60.12,8.44,14.39,18.3,28.08,29.64,40.3-.19.65-1.42.26-1.96.15-15.59-3.33-28.61-12.68-42.04-20.69-14.22.4-6.94,10.8-2.91,18.01,31.87,57.05,73.98,105.02,134.1,133l12.27,5.51c-31.79-.34-66,.33-96.16-10.84-6.69-2.48-15.38-6.3-21.59-9.76-2.47-1.37-3.64-4.24-7.51-3.14-7.99,2.28-1.94,13.35.6,17.89,5,8.96,12.28,16.39,18.9,23.91,8.17,9.29,1.92,12.65-5.8,17.76-6.63,4.39-14.31,9.3-21.25,13.12-2.86,1.57-13.99,7.55-16.45,7.71-1.92.13-9.61-2.39-11.68-3.3-23.66-10.32-42.33-23.15-62.41-38.88-3.39-2.66-8.17-6.79-12.5-5.91-6.27,1.28-3.71,7.29-1.75,11.11,6.96,13.52,36.53,43.76,48.99,53.51,4.93,3.86,23.23,17.18,28.56,17.25,7.55.11,21.21-8.47,28.43-11.98,12.25-5.95,24.46-11.47,35.98-18.89,3.08-1.98,18.08-13.93,19.96-13.78,1.97.16,9.98,7.43,12.12,9.05,23.23,17.54,53.05,36.57,78.46,50.57,6.71,3.69,13.51,7.06,20.69,9.76Z', viewBoxWidth: 595.28 },
    'palm': { pathData: 'M44.36,273.77c-9.29-2.36-11.19-15.63-12.73-23.76-4.79-25.35-2.01-57.45,6.1-81.99,4.2-12.69,11.83-23.72,20.51-33.73.45,2.87-.4,6.01-.77,8.91-.06.49-.75,2.66.45,1.74l29.38-39.71c.15,5.35-3.58,10.84-3.23,16.14l25.19-18.08,22.61-21.3.96.31-9.68,15.51c-.1.49.6.4.95.31,12.54-3.15,26.44-10.98,39.25-14.35l20.18-17.27.96.31c-1.2,2.54-5.05,6.66-5.8,9.06-.27.88.05,1.16.93.94,7.25-2.77,16.46-3.81,23.4-6.96,5.31-2.41,11.73-8.17,16.34-11.74-34.44,2.39-67.27,13.55-99.44,25.17l15.7-8.5c16.12-7.39,33.15-11.9,50.02-17.14,7.49-2.33,14.66-6.3,22.74-6.65l-1.78-1.11-10.48-1.46,17.22-7,6.33-3.35c-8.48,2.31-17.8,3.51-26.14,6.15-5.46,1.72-11.75,6.14-17.28,6-.8-.02-.98-.26-1.45-.86,2.25-9.3,8.42-16.59,16.2-21.88,2.59-1.77,7.43-4.84,10.26-5.88,6.29-2.31,14.06-1.82,20.67-2.9-.12-.96-2.81-1.07-3.64-1.19-3.03-.42-5.39-.05-8.29-.07-.75,0-2.43.43-2.27-.66,1.9-.39,3.46-1.57,5.3-2.13,9.25-2.78,21.25-7.84,30.61-8.78,4.99-.5,10.4.28,15.41-.09,3.7-.27,7.88-1.63,11.64-1.92,12.81-1,25.68-2.11,38.41,0-.97,1.98-3.89,1.56-5.61,2.45l-10.53,5.28c4.41-.66,8.39-2.84,12.75-3.7,8.45-1.66,12.16-1.69,19.96,1.66,5.21,2.24,10.37,5.12,13.78,9.79-12.57-.07-25.69,1.98-37.24,7l-7.96,3.98c7.3-.76,14.55-3.95,21.7-5.08,17.97-2.85,44.24-2.91,62.58-2.04,31.43,1.49,76.19,14.71,101.89,33.06.89.63,1.95,1.16,1.71,2.48-15.33-7.1-32.53-12.09-49.06-15.83-40.17-9.07-107.28-10.99-146.72,1.16-1.74.54-6.26,1.11-4.4,3.38.34.41,5.76,4.83,6.15,4.83h45.52l-5.81-10.66c-.14-.44.53-.44.95-.31,3.6,1.12,11.1,11.24,15,12.12,23.89.42,47.75,2.26,71.21,6.59-1.74-3.75-3.5-7.6-4.99-11.47-.25-.64-1.53-2.45.16-2.1,5.02,3.81,8.15,10.36,12.12,15.33,18.57,3.51,38.38,6.26,54.39,16.97.6-4.09-.85-8.41-1-12.56-.03-.87-.56-3.3.99-2.93,3.51,3.99,5.44,16.55,8.76,19.65,2.78,2.6,10.68,5.9,14.37,8.23,5.6,3.54,12.69,7.88,17.83,11.88s9.8,9.83,15.23,13.82l1.62-10.97c4.17,3.78,2.92,11.68,5.44,16.83s10.31,11.21,13.56,16.14c2.4,3.64,4.06,8.75,5.54,12.87l1.2-4.92.09-4.76c2.02,1.37,2.69,4.98,3.31,7.34,6.22,23.82-.66,54.88-9.11,77.58-.74,1.99-3.58,9.76-4.46,10.89-.72.93-5.64.75-6.17-.93l-7.31-15.94-2.74-38.91c-.93-.15-.9,1.14-1.09,1.8-1.91,6.87-2.31,14.93-4.13,21.7-.2.75-.23,1.55-1.22,1.67-5.35-9.57-11.39-19.25-20.54-25.63l-14.34-43.45c-1.11-.16-.69,1.53-.63,2.24.83,10.63,3.39,21.66,4.51,32.31l-.95,1.6c-7.67-6.15-15.47-12.22-23.63-17.69-5.7-3.82-20.02-10.88-23.86-14.88-5.98-6.22-16.07-26.6-21.57-35.26-.49-.78-.95-1.6-1.01-2.54l7.44,30.34c-7.22-3.94-14.7-7.48-22.3-10.63-10.49-4.35-22.19-6.39-30.67-13.89s-16.51-17.34-25.17-25.2l13.57,25.17c-16.28-4.86-32.97-8.23-49.58-11.76-7.98-6.32-15-14.75-22.74-21.17-.73-.6-1.04-1.57-2.26-1.29,8.48,17.19,18.79,33.53,24.54,51.97-.08,1.12-20.61-1.36-22.37-1.53-.72-.07-2.32-.59-2.17.56l29.04,11.97c7.59,18.92,14.23,38.96,12.92,59.71l-17.76-14.85-.95.95,15.84,24.85c1.84,1.88-.23,4.23.37,6.04.3.9,2.32,1.63,3.17,2.68,3.56,4.38,2.81,17.5,3.88,23.24.36,1.93,3.25,6.32,3.71,8.56.34,1.67-.09,3.39.21,4.96.39,2.05,1.61,4.89,1.72,6.69.12,1.92-2.12,4.96-1.79,5.32.49.52,4.21.66,5.03,4.34-.33,5.14,1.25,10.39,1.49,15.36.06,1.35-.8,2.7-.7,3.85s1.46,2.06,1.79,3.39c.86,3.43,3.16,16.06,3.34,19.32.12,2.26-1.29,3.29-1.3,4.39,0,.31,1.71.94,2.33,1.61,1.45,1.55,4.15,16.39,4.19,19.13.03,1.83-1.17,3.4-1.14,3.84.04.56,1.55,1.48,1.92,2.42,1.51,3.82,1.41,11.46,1.16,15.67-.09,1.52-1.25,2.74-1.17,3.74.3,3.75,3.14,5.76,2.47,12.42-.2,2.03-2.02,5.43-1.84,6.34.17.84,2.53,2.7,2.95,4.76.38,1.85.92,11.36.84,13.4-.1,2.56-2.47,5.45-3.92,7.43,6.13.63,4.93,14.28,4.54,19.07-.12,1.45-1.32,2.99-1.19,3.74.12.65,1.31,1.66,1.65,2.86,1.29,4.62,2.19,13.23,1.42,17.88-.26,1.59-1.93,3-1.81,3.79.09.55,1.87,2.98,2.32,4.8.72,2.92,1.92,15.06.96,17.43-.87,2.16-2.19,1.99-3.58,2.76-1.85,1.02,1.93,1.55,3.08,3.25,1.29,1.92,3,14.35,2.99,17.09,0,1.8-1.11,3.08-1.12,3.87s1.86,3.68,2.2,5.32c.9,4.37,1.42,11.84-.65,15.84-.5.96-2.42,2.55-2.42,2.73,0,.5,2.07,1.46,2.59,2.1,2.96,3.67,1.99,14.83,1.95,19.88,0,1.35-.77,2.74-.67,3.83.11,1.24,2.49,3.95,2.93,6.12,1.25,6.05,1.03,15.37.12,21.5-1.04,6.98-5.92,7.64-11.96,8.7-13.45,2.36-36.18,3.22-49.18-.81-3.28-1.02-8.2-2.89-8.92-6.57-1.24-6.3-1.14-16.52.14-22.81.35-1.74,2.18-4.79,2.16-5.33-.03-.96-1.07-2.42-1.16-3.99-.3-4.74-.72-14.02,2.29-17.74.7-.87,2.77-1.84,2.89-2.3.24-.97-2.47-2.83-3.13-3.95-2.43-4.12-1.68-14.3.9-18.28.49-.76,2.85-2.65,2.85-2.94,0-.23-2.34-2.45-2.83-3.6-1.45-3.44-.64-16.63,1.65-19.56,1.1-1.41,2.65-1.42,3.78-2.67-5.07-3.73-4.81-9.06-4.5-14.84.22-4.15.42-10.76,5.16-11.96-.27-1.86-1.81-2.41-2.3-4.46-.7-2.89.16-10.83,1.34-13.6.63-1.49,2.78-3.14,2.87-3.64.14-.82-1.5-1.92-1.94-3.1-1.44-3.82-2.17-12.96-.23-16.46.43-.78,2.11-1.9,2.11-2.31,0-.28-2.44-3.14-2.86-4.8-1.3-5.24-1.89-12.97,2.94-16.51-6.42-2.81-6.75-13.89-4.56-19.42.57-1.43,3.18-3.45,3.18-3.82,0-.29-1.27-1.36-1.53-2.25-1.19-4.12-1.95-11.48-.67-15.55.42-1.35,2.26-2.23,2.29-3.49.02-.78-1.9-4.38-2.29-6.12-.72-3.19-1.5-11.45-.8-14.43.3-1.29,1.81-2.33,1.82-3.37,0-1.31-2.18-2.36-2.75-3.71-.84-1.96-.8-14.28-.43-16.89.32-2.24,3.06-5.73,2.99-6.52-.08-.93-3.24-2.68-3.52-4.04l-1.45-7.25c-6.98,20.79-22.84,38.1-36.49,54.87l-5.48-26.46-5.83,30.99c-16.87-5.49-28.59-20.92-38.41-34.91-.78-1.91.71-4.33,1.5-6.21,5.76-13.8,13.63-26.87,18.83-40.89l-30.02,27.11c-7.36-15.2-15-30.35-18.89-46.93l30.19-45.39-34.55,21.29c-.72-.44-.74-.93-.94-1.63-2.8-10.03-4.2-39.74-3.28-50.36.14-1.63.39-3.26,1.03-4.78l33.85-26.52c.16-1.14-1.47-.64-2.17-.56-10.1,1.15-20.05,4.89-30.1,6.38,4.09-12.93,8.01-27.44,14.51-39.4.76-1.39,7.25-10.47,6.79-10.97-8.94,7.18-15.29,17.18-20.96,27.14l-31.67,18.05c-1.68.14-.64-.28-.48-1.13,1.29-6.77,4.55-13.98,5.84-20.65.13-.67.66-2.26-.49-2.1l-18.39,31.66-35.54,25.16c-.45-9.6.85-19.2,1.61-28.74.06-.71.47-2.41-.63-2.24l-10.69,38.71c-8.54,6.95-15.45,15.54-23.22,23.27-1.36-7.95-1.33-16.14-2.33-24.13-.1-.78-.28-3.53-1.21-3.63-.33,6.32-.67,12.74-1.3,19.04-.45,4.5-.82,13.5-2.1,17.27-2.28,6.67-12.49,16.21-15.04,23.7l-1.58.68-5.81-21.95c.06,2.68-.12,5.38,0,8.06.3,6.84,2.34,16.78,1.91,23.18-.28,4.13-5.15,12.13-5.15,16.86v18.4ZM254.21,56.81c-2.51-2.65-14.43,12.34-15.76,14.27-9.49,13.76-17.27,30.82-21.04,47.07l27.76,3.55-36.3,61.85-.18,3.69c12.2-7.17,26.92-9.82,40.17-14.75l1.38.97-25.11,82.55c.17,1.52,1.31,2.06,2.59,1.28l30.37-20.32-10.37,58.42c.1,2.23,5.98,10.23,7.74,11.68,3.42,2.83,4.71-1.25,5.97-3.81,2.24-4.54,8.95-19.73,9.52-24.06.97-7.37,1.05-18.07,1.37-25.75,1.8-43.42.47-85.41-5.94-128.42-3.4-22.81-9.32-45.31-12.17-68.22Z', viewBoxWidth: 595.28 },
    'hill': { pathData: 'M588.56,373.99c-30.63-34.23-62.18-67.81-90.92-103.65-30.37-37.88-45.98-81.24-103.44-79.37-28.01.91-52.63,12.79-76.55,26.14-62.07,34.66-115.1,81.43-169.26,126.8-12.43,10.41-28.27,21.42-39.63,32.43-11.82,11.45-3.72,30.29,12.47,28.08,5.54-.75,15.7-7.34,20.82-10.4,35.79-21.42,67.04-47.83,100.14-72.81,35.01-26.42,98.99-62.85,141.54-72.25,48.46-10.71,84.16,48.45,111.17,79.36,2.72,3.11,6.67,5.72,9.62,8.99,14.31,15.87,27.97,32.51,42.62,48.06,9.78,10.39,14.58,16.77,30.49,14.26,11.35-1.79,17.76-16.06,10.92-25.64ZM180.26,259.83c4.87,1.64,8.07,6.55,12.64,7.18,13.78,1.88,20.01-3.62,18.11-17.51-.76-5.57-3.79-8.08-8.06-11.15-13.02-9.38-32.82-16.74-48.95-15.54-23.62,1.75-41.41,16.12-58.14,31.34-25.43,23.15-53.2,50.67-74.1,77.83-3.38,4.39-16.8,21.62-17.63,25.6-1.38,6.62,4.44,13.28,10.97,13.98,14.05,1.51,15.37-5.6,24.31-13.52,7.72-6.84,16.25-13,24.04-19.8,19.2-16.76,37.62-34.56,57.03-51.06,15.09-12.82,38.38-34.55,59.78-27.34Z', viewBoxWidth: 595.28 },
    'mountain': { pathData: 'M586.39,483.08c-30.42-34-61.75-67.34-90.28-102.93-28.12-35.07-44.91-78.59-97.95-77.62-31.96.59-64.37,18.52-91.07,34.76-69.82,42.47-128.97,98.38-192.4,149.31-12.87,15.21,6.96,28.34,21.8,20.61,3.18-1.66,5.38-4.53,8.14-6.18,3.93-2.36,6.95-3.01,11.21-6.08,19.57-14.12,36.91-32.83,56.79-47.57,46.96-34.83,109.58-75.81,165.98-91.65,51.09-14.35,81.79,31.49,110.34,65.58,19.15,22.87,41.66,47.7,62.3,69.5,3.05,3.23,9.09,9.9,12.83,11.62,13.2,6.04,31.44-4.55,22.32-19.34ZM245.81,243.21c7.2-4.72,15.63-21.77,20.66-29.43,18.56-28.22,31.69-58.32,72.29-49.01,33.28,7.63,37.05,42.04,49.46,68.62,7.09,15.17,16.19,29.37,23.74,44.24,1.5,2.95,11.68,13.61,14.53,15.29,10.72,6.33,28.24.52,25.91-13.99-1.66-10.33-12.42-33.16-16.87-43.96-12.45-30.18-26.37-64.05-42.52-92.26-13.23-23.12-36.85-60.38-67.62-56.68-13.65,1.64-23.01,13.46-30.41,23.85-16.22,22.78-30.2,48.36-45.77,71.71-9.68,14.51-23.61,29.99-29.35,46.39-5.19,14.82,14.98,22.42,25.95,15.22ZM198.63,298.6c31.66-8.56,60.54,19.75,84.59,35.02,13.12,8.33,33.21-.41,25.61-17.26-3.98-8.84-30.48-32.82-39.09-39.63-7.76-6.14-23.56-16.91-32.5-20.58-3.79-1.56-7.88-1.95-11.64-3.27-10.82-3.8-12.65-5.86-25.45-4.62-35.42,3.43-57.57,45.81-77.17,71.33-19.99,26.03-37.91,53.72-57.6,80.16-10.08,13.54-20.91,26.43-31.14,39.83-5,6.55-26.33,33.55-27.53,39.26-3.26,15.49,20.09,22.35,30.45,10.18,8.31-9.75,15.97-22.4,23.91-32.74,10.79-14.06,22.08-27.65,32.67-41.87,20.14-27.04,39.32-58.01,60.61-83.71,9.73-11.75,29.43-28.08,44.24-32.09Z', viewBoxWidth: 595.28 },
    'tent': { pathData: 'M543.18,316.23c-4.72-6.33-9.27-12.99-13.63-19.58-35.27-53.18-66.54-110.13-102.06-163.04-3.51-5.23-9.16-14.44-15.73-15.19-37.04,8.48-73.17,21.44-110,31.06-39.96,10.44-85.17,10.73-126.19,17.14-7.22,1.13-9.1,1.73-12.7,8.27-3.8,6.9-6.59,15.07-10.72,21.91-35.53,50.08-66.36,104.13-103.35,153.01-2.82,3.72-11.36,13.52-11.65,17.53-.24,3.35,1.77,6.63,4.82,7.91,3.98,1.67,19.59,3.27,23.94,2.74,4.21-.52,8.78-3.38,11.33-6.74l92.73-139.44c3.72,26.69,8.58,53.33,11.66,80.11,3.44,29.97,4.28,61.85,8.75,91.46.89,5.86,3.8,10.91,10.03,12.11l58.12,14.13c3.92,7.03,2.49,14.92,11.4,17.74,4.64,1.47,22.53,5.15,26.77,4.69l249.3-108.44c17.59-7.88,4.01-18.25-2.79-27.36ZM495.21,322.54l-192.09,84.08c-6.02,2.02-9.73-1.19-12.67-6.03l-81.94-182c-.6-2.66-3.55-4.44-4.31-6.76-1.85-5.65.86-9.83,6.32-11.43,23.34-4.11,47-6.58,70.34-10.65,39.12-6.82,76.98-21.99,115.03-32.97,3.69-.76,7.39,1.22,9.36,4.32,2.54,3.98,4.76,10.12,7.43,14.71,26.83,46.19,58.26,89.96,85.41,135.99,2.4,3.78.8,8.5-2.87,10.74ZM28.96,362.59c.17,2.1,1.14,4.95,1.1,6.94-.24,9.95-13.11,12.67-17.35,3.49-2.24-4.85-8.13-28.25-8.74-33.79-.92-8.39,4.16-12.15,12.05-12.89,6.46-.61,9.49,2.89,10.55,8.93,1.44,8.26,1.69,18.77,2.4,27.32ZM365.7,442.95c-5.91,8.21-10.75,20.35-16.88,28.02-7,8.75-18.95,3.6-16.76-8.02.62-3.29,10.64-24.88,12.78-28.01,1.41-2.05,3.64-3.94,6.17-4.33,7.31-1.13,16.47,4.19,14.69,12.34ZM590.48,306.52l-11.97,31.15c-6.6,8.22-17.21,3.46-16.36-7.04.33-4.13,4.67-25.55,6.21-28.75,1.85-3.84,6-5.07,9.93-5.25,6.19-.28,12.07,3.15,12.2,9.89Z', viewBoxWidth: 595.28 },
    'house': { pathData: 'M556.9,300.1c2.59,17.14,3.6,35.11,6.66,52.12,5.44,30.31,15.48,60.87,21.04,91.29.61,4.9-1.46,9.56-2.85,14.15l-169.91,51.21c-1.11.66-1.97,4.15-3.2,5.67-2.1,2.59-3.88,2.38-6.26,3.8-10.73,6.39-21.7,12.54-32.27,19.16-7.08,4.43-22.05,16.5-28.44,18.85-4.89,1.8-8.27-.02-9.78-4.97l-3.84-41.39c-2.47.72-13.87-1.81-15.08-.07-1.11,10.1,3.51,23.74-6.56,30.68-3.93,2.71-20.73,9.11-25.89,10.77-12.96,4.17-18.32-1-30.1-4.25-53.32-11.33-105.89-26.69-159.29-37.59-15.68-3.2-37.02-4.71-51.56-9.34-4.71-1.5-8.89-7.5-10.34-12.12s.48-10.8.88-15.67c1.91-23.58,3.37-44.28,2.93-67.96-.53-28.63-1.26-57.13-2.34-85.75l-.99-1.38c-7.74-2.04-22.23.77-27.29-6.41-3.33-4.72-3.36-11.34.77-15.59,2.38-2.45,4.1-2.99,6.71-6.3,20.54-26.03,38.46-56.62,58.4-83.5,18.66-25.15,38.94-49.51,58.8-73.63l9.7-2.71,97.91,2.14c1.08-.78.41-7.06.56-8.91.51-6.38,1.05-12.55,1.2-18.9.2-8.47-1.56-32.32,1.04-38.57,1.37-3.29,8.55-9.84,11.95-11.1l96.58-15.61c4.71.37,7.46,2.34,11.2,4.77,6.7,4.34,25.96,17,30.27,22.35,5.75,7.14,4.27,19.32,4.4,28.11.04,2.65.73,5.24.64,8.28-.05,1.56-1.7,8.26-.3,8.54l84.67-23.49c4.99-.49,10-.5,14.02,2.82,38.02,58.59,70.85,120.42,103.21,182.35,3.06,8.24-.47,12.82-6.58,17.71-3.01,2.41-8.49,6.27-12.05,7.46-5.74,1.93-12.67,1.62-18.63,2.96ZM276.35,122.72c3.13.53,8.92,0,12.42,0,.25,0,.99-.93.86-1.42-.79-7.96-2.15-16.05-1.46-24.04l-28.07-12.97v31.04c0,.26.64,1.3,1.04,1.48,4.72.44,11.11,5.22,15.22,5.91ZM367.69,88.42l-53.2,10.67,2.95,27.76,48.49-9.15,1.76-29.28ZM477.54,112.19c-2.17-1.28-35.23,9.8-40.43,10.48l-1.42.97,90.11,154.61c.81.88,1.78,1.34,2.98,1.44,2.38.19,10.82-1.07,13.46-1.64.7-.15,1.95-.21,1.58-1.24-2.5-3.8-5.15-7.59-7.34-11.58-11.52-20.96-22.91-45.05-33.11-66.8-.6-1.28-1.36-2.73-1.45-4.16,19.6,26.2,39.68,52.15,56.73,80.13,2.37,2.1,6.1.09,8.89.27.82-.81-2.08-5.96-2.65-7.11-12.37-25-26.77-51.67-40.41-76.06-14.97-26.79-31.94-52.51-46.92-79.3ZM422,127.53l-14.69,3.47c3.28,7.05,6.73,14.12,9.73,21.3.64,1.54,1.84,4.04,2.19,5.51.17.73.86.66-.41,1.56l-24.36-24.75-17.31,4.65.31,1.75,90.42,142.56c1.21,1.17,5.37-2.97,7.09-3.05,11.57-2.82,23.95.75,35.79.03l-88.76-153.03ZM362.87,143.51l-41.88,7,.1,1.37,92.02,146.25,1.9,5.49,14.77-2.36-11.23-29.56,6.51,5.01c5.11,5.73,11.18,10.52,16.56,15.96,1.57,1.59,2.06,4.26,4.71,3.61,1-.24,10.04-5.38,10.04-5.96l-93.5-146.82ZM167.57,153.46c-3.26-.49-7.54.36-10.94,0l89.97,166.33c3.78,7.41,6.82,15.93,13.74,21.04,11.86-1.98,23.7-5.2,35.82-4.68l-19.51-44.34,33.71,39.92c.42.31.88.26,1.37.26,1.64,0,10.71-1.77,12.54-2.32.66-.2,1.05.39.85-.89l-105.98-173.36c-1.79-1.49-18.29-.63-22.03-.74-3.23-.09-6.86-1.17-10.32-.61l14.49,40.2c-10.16-13.26-21.5-25.67-30.76-39.59-.48-.39-2.35-1.11-2.94-1.2ZM400.8,305.4l-95.19-151.65c-5.7-.1-11.73,1.89-17.51,2.59-1.58.19-3.24-.12-4.67.07-.83.11-1.01-.32-.89.9l29.57,59.41-46.96-60.34-29.3-1.15,98.71,162.3c.61.58.72.52,1.23-.09,3.3-3.92,3.1-8.19,9.2-10.8,5.17-2.21,8.57-1.21,13.51-1.22,14.1-.03,28.2-.02,42.29-.03ZM199.79,430.15l-19.66-.74c-4.6-1.1-9.19-5.52-9.84-10.26s.68-23.47,1.99-28.05c2.93-10.22,15.51-6.43,23.66-7.08s15.06-2.45,24.24-1.76c16.05,1.21,15.84,7.07,17.44,20.99.69,5.98.92,12.07,1.44,18.07l10.11,2.23c2.04-.35.29-9.05.25-10.82-.25-10.65-.26-21.33-.59-31.93-.17-5.48.28-10.99-.09-16.47-.45-1.49-5.65-3.82-7.26-5.15-4.53-3.73-6.21-10.97-8.86-15.97-8.26-15.58-17.4-30.79-25.84-46.28-21.56-39.54-42.04-79.87-64.24-119.04-.61-1.07-2.93-5.76-3.94-5.51l-78.66,124.72c-1.42,4.65,1.82,5.68,2.12,9.76l-1.24,100.44c7.65,2.8,15.6,4.17,22.89,7.97,4.33,2.25,6.16,4.05,6.69,9.27.74,7.31-.81,15.38.85,22.8,8.99,1.6,20.11,5.68,21.05,16.19.34,3.78-.66,25.15.05,26.25l138.1,33.09,1.07-.46-.97-53.77c-4.77-.45-9.66-1.47-14.43-1.83-3.67-.28-7.49.32-11.15-.08-3.11-.34-12.14-2.6-15.41-3.51-11.15-3.11-11.04-23.89-9.79-33.07ZM529.03,304.29c-.98-.83-10.5,1.12-12.62,1.14-11.28.11-22.84-2.81-34.2-1.67-13.28,6.65-24.75,15.71-39.42,19.11-9.64,2.24-24.59,5.8-34.09,6.71-16.59,1.59-34.52-1.69-51.25-.41-8.54,9.74-6.37,19.4-20.97,22.78-17.43,4.04-36.85,5.87-54.64,9.22-1.58.3-9.2,1.46-9.68,2.14l2.7,161.44c1.52.19,2.68-.36,3.96-1.06.5-.28,4.77-3.66,4.95-3.92.59-.83,1.09-4.69,1.16-5.93.7-12.48-2.73-30.61-3.56-43.78-1.44-22.81-1.91-45.76-2.94-68.6-.77-17.12-7.21-32.35,14.05-37.33,30.99-7.27,65.39-9.7,96.77-15.6,4.92-.11,7.41,1.85,9.04,6.38l7.23,102.45c5.12-1.24,10.45-1.18,15.59-1.84,4.08-.53,8.42-2.95,12.63-1.26,6.38,2.57,4.07,16.5,5.48,22.02l74.47-20.12c.07-4.79-1.99-8.98-1.74-13.86.17-3.27,2.01-12.1,3.1-15.23s4.1-4.92,7.07-5.94c5.71-1.95,12.42-2.23,18.23-3.65,2.9-.71,5.75-1.73,8.59-2.66l.13-1.94c-3.8-18.9-9.96-38.18-13.3-57.09-2.98-16.86-3.63-34.6-6.74-51.49ZM381.15,366.4c-1.5.19-3.84,1.86-4.61,3.13-2.14,3.56-.2,12.8,0,17.17,1.06,22.33,2.74,44.53,4.14,66.81,1,15.86.79,32.08,2.38,47.88.39,3.87.49,9.05,4.88,10.49,8.02,2.63,8.29-6.9,8.15-12.28-.56-20.28-2.92-40.64-4.16-60.87-1.28-20.83-1.08-43.28-3.56-63.84-.48-3.99-2.23-9.11-7.22-8.48ZM358.68,368.18c-3.26.62-5.63,4.16-5.71,7.34-.22,8.64,2.17,19.99,2.9,28.92,3.07,37.64,6.13,75.26,9.51,112.87,1.87,8.39,12.66,7.04,12.85-1.13.19-8.58-2.12-19.56-2.84-28.39-2.62-31.96-5.21-63.87-8.28-95.78-.57-5.96-.29-12.99-1.32-18.78-.55-3.1-3.97-5.65-7.1-5.05ZM345.23,537.75c3.71-2.07,5.99,1.13,9.48-2.64,3.64-3.93.98-11.65.57-16.58-3.89-46.74-8.78-93.37-13.05-140.08-.85-4.53-5.74-7.14-9.72-4.47-3.43,2.29-2.82,6.7-2.65,10.34,1.49,31.36,6.4,64.9,9.45,96.38,1.85,19.03,2.64,38.25,5.92,57.05ZM207.34,396.02c-2.35.24-4.96,1.28-7.33,1.54-4.81.53-9.63.62-14.45.92l-1.49,16.92c.88,1.21,17.64.28,20.73.56,3.65.33,7.45,1.87,11.32,2.28,2.63.28,5.31-.2,7.92.41,1.85-1.32-1-18.51-1.47-21.64l-1.2-.57c-4.75.45-9.29-.91-14.03-.42ZM60.85,443.16c4.84,2.21,9.46,2.26,14.63,2.84l1.33-.77v-17.15c-4.45-3.33-10.42-4.93-15.96-5.62v20.69ZM552.7,429.01l-24.54,5.24c-2.92,5.19-2.36,11.59-.8,17.14l27.75-7.33c2.03-1.71-2.41-12.26-2.41-15.04ZM213.39,432.81v12.42c0,.92.88,4.23,1.79,4.72.47.25,9.4,2.49,10.38,2.62,2.81.38,5.98-.23,8.81.06,4.12.41,10.39,1.93,14.2,1.82.64-.02,1.4-.03,1.81-.61l-.92-15.71c-7.63-2.67-15.83-3.29-23.79-4.59-3.83-.63-8.56-3.28-12.28-.72ZM60.26,458.82v13.6l36.88,12.76c1.84-.38,2.11-18.23,1.25-20.14s-4.37-2.81-6.19-3.27c-7.29-1.82-16.42-1.33-23.88-2.13-1.79-.19-7.53-2.58-8.05-.81ZM425.56,480.33c-.63-2.07.14-10.54-1.49-11.08-2.72-.5-16.57,1.17-17.29,3.25l1.11,12.63,17.66-4.81ZM119.09,232.09c-3.42,9.91-3.41,23.55-3.82,34.02-.36,9.18-3.34,22.8,7.85,26.98,3.66,1.37,22.27,4.71,26.03,4.58,5.9-.21,10.73-4.13,12.07-9.86-.47-17.55,1.41-35.39-.16-52.77-2.86-8.76-17.12-12.18-25.24-11.65-6.78.44-14.21,1.39-16.73,8.69ZM510.03,316.79c4.95-.59,9.18,1.6,10.05,6.79,1.43,8.49.43,19.5.71,28.26.04,1.4.6,2.69.64,4.09.2,7.03-.73,14.29.7,21.18l17.88,15.23c3.11,5.06.21,10.29-5.01,12.09l-87.28,26.29c-3.35.19-12.6-5.07-16.44-6.5-1.97-.74-3.67-.27-5.63-1.47-2.4-1.48-3.36-4.38-3.6-7.04-1.19-13.45.19-29.93.05-43.8-.13-12.81-5.11-31.07,10.48-36.77l77.44-18.34ZM515.89,390.15c-2.42-2.72-8.09-4.91-10.47-8.2l-66.07,16.7c-11.26,5.84-.96,14.53,7.22,16.13l71.28-21.57c-1.31-.58-1.42-2.44-1.96-3.05Z', viewBoxWidth: 595.28 },
    'village': { pathData: 'M500.67,267.08c1.04-.95,1.24-3.4,3.09-3.78l79.82-24.16,1.48-6.03c-4.99-22.68-11.2-45.01-13.4-68.23.24-1.26,6.25-1.36,7.83-1.78,3.59-.97,11.56-6.33,10.86-10.45-15.49-30.22-31.52-60.2-50.01-88.71-2.29-1.57-4.9-1.73-7.6-1.24l-39.71,10.96c.1-4.94.52-11.13,0-16.03-.88-8.23-14.61-14-20.92-18.35l-45.8,7.21c-2.9,1.39-6.33,3.24-7.03,6.7-1.23,6.08.28,16.07-.12,22.77-.15,2.47-1.12,4.89-.68,7.5l-49.59-.22-2.96,1.62c-20.3,23.37-36.69,49.65-55.08,74.42-2.26,3.05-5.16,3.26-4.06,8.09,1.43,6.24,10.04,3.36,14.29,5.42.73,10,.39,20.01.59,30.07.17,8.22,1.06,16.52.71,24.86-.23,5.54-3.14,22.15-1.98,26.07.27.92,1.98,4.06,2.63,4.62,2.24,1.97,22.81,4.77,27.57,5.78,24.99,5.34,51,11.41,75.75,17.77,2.32.6,6.15,2.75,8.21,2.95,2.72.27,16.56-4.87,18.61-6.83,1.93-1.85,2.47-5.26,2.62-7.86.34-6-2.74-7.62,6.88-5.62,1.28,4.03.48,18.92,2.91,21.29.52.51,1.55.96,2.28.95l32.82-19.77ZM470.85,277.02c-.34-.29-1.23-7.48-1.37-8.76-2.2-19.57-5.08-42.71-5.88-62.14-.09-2.28-.57-7.29,2.93-7.29,2.75,0,3.23,4.03,3.52,6.07,2.66,19.01,5.12,44.24,5.96,63.38.08,1.8.36,6.13-.32,7.52s-4.09,1.86-4.84,1.23ZM499.56,239.15l-3.41-48.59-1.45-2.48c-1.51-1.07-4.02-.63-5.85-.52-10.45.64-25.89,3.93-36.51,5.99-5.6,1.09-12.97.81-13.63,7.96-1.06,11.6,2.19,24.9,1.31,36.69-.25,8.49,3.08,20.76,2.02,28.79-.31,2.36-2.27,3.94-4.61,4.22l-1.28-77.15,33.04-5.87c4.38-1.81,5.66-9.96,7.87-10.37,1.07.08,2.07.53,3.17.54,13.24.08,28.25.14,40.88-4.3,4.37-1.53,11.42-7.25,14.86-8.03,6.58-1.48,15.5,2.22,22.39-.12,2.06,17.91,5.35,35.52,9.84,52.95-3.71,1.79-12.79,1.65-15.41,4.55s-2.57,11-1.53,14.68l-34.99,10.19c-2.49-.6.9-8.74-3.15-10.61-2.36-1.1-10.35,1.69-13.56,1.48ZM475.52,197.45c5.19-2.75,5.21,2.14,5.72,6.06,2.44,18.77,4.26,41.84,5.26,60.8.13,2.5.64,5.62-2.47,6.12-3.61.58-3.74-4.07-4.09-6.75-2.34-17.96-4.66-42.18-5.23-60.18-.06-2.02-.29-4.25.8-6.05ZM426.32,269.9l-66.06-15.36c-1.9-9.12,3.03-18.98-10.42-19.99-.25-3.34.32-11.22-1.4-13.97-1.47-2.36-10.16-4.24-12.95-5.04-1.53-1.76,1.28-40.21.62-46.74-.23-2.28-1.37-3.56-1.25-5.7l37.19-60.01c.6-.4,6.06,9.63,6.64,10.68,14.09,25.3,27.26,51.15,41.19,76.54l5,4.81.77,27.68-5.59-1.27c-.21-3.49-.18-13.96-2.43-16.21-2.01-2-9.76-2.36-12.56-2.13-3.67,1.93-12.27.31-14.98,2.02s-2.98,14.64-1.86,17.42c1.88,4.68,9.26,3.26,13.24,3.44-.03,3.94-.58,12.41,3.02,14.97,4.32,3.08,20.39,2.61,21.18,3.35l.65,25.52ZM485.98,196.8c3.04-3.04,5.38.95,5.73,4.09.64,5.78.28,12.48.66,18.31.78,11.93,2.28,24.02,2.64,35.96.15,4.82.19,15.61-5.9,7.21-1.06-18.97-2.44-37.9-3.29-56.89-.1-2.17-1.71-6.8.16-8.68ZM353.08,252.24l-17.27-5.16-.38-7.92c5.55,2.72,12.61-.36,17.65,3.6v9.49ZM509.37,250.27l-8.5,1.97c-2.17-7.61,1.33-7.36,7.84-7.19l.66,5.22ZM425.66,237.85l-16.86-2.1c-.89-2.19-2.2-9.18,1.3-8.9,1.84.15,15.04,2.57,15.47,3.23l.09,7.76ZM557.91,228.19l11.25-2.74,2.27,6.79-13.66,4.3c-.98-2.81-.92-5.58.14-8.35ZM335.42,222.8c6.09-.06,8.37,2.01,7.89,8.2-.42,5.33-4.3,2.05-7.89,1.61v-9.81ZM413.24,220.84c-6.32-.88-12.55-1.74-18.97-1.31l.29-7.89c5.76-.73,11.56-2.68,17.41-1.63,1.75,3.35,1.21,7.21,1.27,10.83ZM395.58,94.59h13.41c.3,0,2.01.76,2.32,1.11l49.6,81.71c.32,1.28-.12.73-.83.98-.95.33-5,1.13-5.68.87-2.72-1.01-12.41-16.01-15.65-18.6l9.14,19.95c-.02,1.45-5.4.88-6.77,1.06-2.4.32-10.06,2.46-11.52,1.56l-48.39-88.32h6.53s14.38,17.99,14.38,17.99l-6.53-18.32ZM419.13,95.24h12.75l22.55,28.13-13.08-27.14c2.57-.47,9.49-2.75,11.46-1l44.77,70.98c-1.02,1.63-1.37.33-1.62.33h-23.54c-1.22,0-5.67,3.63-5.54,5.5l-1.34.07-46.42-76.87ZM511.33,164.57l-7.11,1.24-44.55-73.19c5.65.02,12.76-3.07,18.09-3.25.76-.03,1.36-.07,1.85.63l44.08,69.09c.39,1.23-.28.74-.75,1.07-.79.56-3.65,2.48-4.42,2.13l-12.41-11.47,5.23,13.73ZM549.91,154.76c-1.21.89-11.17-.71-13.37-.67-1.91.03-6.67,2.37-7.46,1.9l-43.25-68.59,8.68-1.87,11.58,11.68-5.22-13.73c2.18-.2,4.96-2.2,6.91-.72l42.13,72.01ZM565.6,153.45l-7.44,1.16-2-1.85-42.22-73.21,18.92-4.95,1.63,1.04c6.72,11.73,14.12,23.09,20.75,34.86,5.14,9.12,18.47,31,21.16,39.67.21.67.43,1.26.3,1.98-1.12-.03-2.39.2-3.47-.12-1.45-.44-7.52-10.95-9.07-13.16-5.75-8.18-11.79-16.31-18.18-24l19.61,38.59ZM481.25,64.83c-.04,3.92.03,7.85,0,11.77l-23.52,4.88-1.05-13.11,23.66-5.13,1.25.6c.47.48-.35.81-.35.98ZM430.24,61.23l13.15,6.18,1.07,11.18c-.5,2.87-12.51-.45-14.22-2.65v-14.72ZM461.63,345.78c.04-5.11.57-11.64,0-16.68-.41-3.59-2.04-4.94-4.63-7.14-3.3-2.81-14.51-10.96-18.48-10.8-13.46,3.81-29.89,3.62-43.07,7.34-3.97,1.12-7.21,3.7-7.72,7.97-.79,6.57.45,14.79.04,21.63-.15,2.47-1.12,4.89-.68,7.5l-48.08-.67-4.89,2.3c-20.26,23.19-36.07,49.81-54.65,74.2-1.37,1.8-3.77,2.36-4.18,5-1.6,10.35,13.81,6.1,14.39,8.57.88,9.78.4,19.55.6,29.36.17,8.44,1.07,16.95.71,25.51-.3,7.13-2.8,18.27-2,24.85.48,3.94,2.82,6.25,6.53,7.2,9.62,2.47,20.77,3.65,30.77,5.85,25.71,5.67,51.27,12.3,76.8,18.68,3.91.27,14.73-3.37,17.98-5.61,3.8-2.62,3.58-9.98,2.93-14.06l7.56-.64,1.44,19.16,3.45,3.74c4.72-2.56,8.92-5.97,13.47-8.78,7.55-4.66,16.47-8.45,22.35-14.93l79.92-24.06c.69-2.07,1.69-4.46,1.51-6.67-.99-12.37-7.66-29.92-10.02-43.02-1.47-8.14-1.88-16.45-3.41-24.58.29-1.49,6.29-1.52,7.71-1.89,3.31-.86,11.28-6.12,11.09-9.79-14.59-30.08-31.34-58.96-48.51-87.6-2.06-3.53-5.55-3.38-9.2-2.89l-39.73,10.95ZM433.02,471.54c3.28-3.32,5.99,3.17,5.72,6.06l6.35,68.16c-.29,3.14-2.78,4-5.62,3.38l-7.2-75.44c.14-.71.24-1.64.75-2.16ZM468.17,511.27l-3.41-49.25c-2.03-3.8-5.01-2.71-8.6-2.33-14.57,1.55-29.96,5.47-44.5,7.82-2.92,1.4-4.05,2.89-4.35,6.12-1.03,11.33,2.14,24.5,1.31,36.04-.22,8.77,3.11,21.1,2.02,29.44-.31,2.36-2.27,3.94-4.61,4.22l-1.24-77.12,32.44-5.81c4.05-.49,5.95-9.71,8.48-10.48,7.73.1,15.58,1.12,23.33.44,5.2-.46,16.19-2.67,21.03-4.47,4.26-1.58,10.92-7,14.51-7.73,4.62-.94,9.67.4,14.2.53,2.92.09,5.46-.58,8.25-.41,1.65,8.15,2,16.52,3.43,24.7,1.65,9.4,4.53,18.6,6.31,27.96-3.29,1.8-13.26,1.75-15.5,4.13-2.48,2.64-2.13,11.99-1.53,15.49l-34.88,9.88c-2.35-2.8.66-8.9-3.16-10.67-2.38-1.1-10.4,1.5-13.56,1.49ZM454.28,541.86c-.56.57-1.82.85-2.64.72-2.53-.62-2.77-5.2-3.08-7.43-2.49-17.91-4.54-42.07-5.27-60.15-.1-2.6-.31-6.15,3.03-6.22,3.16-.07,3.22,3.76,3.53,6.21,2.33,18.26,4.65,42.55,5.23,60.83.05,1.57.29,4.94-.8,6.04ZM394.93,542.02l-66.06-15.36c-1.25-.94.22-8.04,0-10.48-.56-6.27-4.34-9.32-10.45-9.49-.33-3.78.74-10.36-1-13.72-1.68-3.23-12.58-4.25-13.28-6.34l.59-46.38-1.27-5.03,37.2-60.01c.48-.32,1.76,1.65,2.08,2.16,16.7,26.32,29.64,58.1,45.76,85.05l5.15,4.14.62,28.34-5.22-.66c-1.84-8.26,2.29-17.82-8.84-18.95-4.26-.43-12.52.21-16.98.66-1.3.13-3.61.52-4.62,1.27-2.44,1.82-3.01,15.32-1.53,17.95,2.15,3.81,9.3,2.98,13.01,3.02-.07,3.59-.37,12.76,3.01,14.98,4.78,3.15,15.67,2.04,21.11,3.41l.73,25.44ZM459.51,468.92c1.3,1.5,1.26,18.37,1.47,21.74.76,11.92,2.29,24.03,2.64,35.96.14,4.87.39,16.47-5.9,7.86-.84-19.2-2.63-38.33-3.29-57.54-.07-2.1-1.84-7.03.65-8.53,1.02-.61,3.71-.32,4.43.51ZM321.69,524.36l-17.7-5.63.05-7.45c2.51,1.19,17.65.92,17.65,3.6v9.49ZM477.93,522.35l-8.45,2.01c-2.22-8.08,1.46-6.82,7.84-7.86l.61,5.85ZM394.27,509.97c-7.79-1.76-20.63,2.18-17.36-10.5.48-.72,1.17-.62,1.9-.59,1.44.06,14.22,2.44,14.82,2.9,1.37,1.04.32,6.3.64,8.19ZM540.1,504.73l-13.36,3.95c-1.38-.12-1.37-7.38.03-8.58l10.98-2.48,2.34,7.11ZM304.04,494.27c1.87.44,5.67,1.11,6.83,2.65,1.04,1.38,1.88,8.63.07,8.95-2.39-.81-5.12.04-6.9-2.12v-9.49ZM362.89,491.66c.29-2.07-.91-7.93,1.27-8.83.61-.25,1.88.41,2.86.26,2.65-.4,12.36-2.61,13.86-.61s.81,8.03.96,10.48c-6.2-1.51-12.62-1.36-18.96-1.3ZM364.2,366.71h14.71l50.69,82.74c.19,1.44-.24.78-.97,1-.91.28-5.03,1.15-5.62.93l-15.65-18.61,9.13,19.96c-1.28,1.78-3.25.53-5.11.76-4.27.51-8.53,1.46-12.75,2.23l-48.8-88.7c-.63-2.14,5.55-.11,6.5.05l14.4,17.96-6.53-18.32ZM387.74,367.37h13.41l21.25,26.82-12.42-25.84c-.15-1.33.06-.86.97-.98,1.31-.17,9.45-1.01,9.85-.72l45.42,72.02h-25.18c-1.81,0-5.66,3.72-5.57,5.89l-1.6-.68-46.13-76.51ZM479.94,436.7l-7.16,1.29-44.5-73.23c5.55-.31,12.08-2.9,17.43-3.24.94-.06,1.82-.26,2.51.62l44.09,69.07c.35,1.28-.28.75-.79,1.05-.84.5-3.79,2.46-4.4,2.18l-12.41-11.48,5.23,13.73ZM518.52,426.89c-1.21.9-11.52-.86-14.05-.66s-4.3,1.91-6.78,1.89l-43.25-68.59c2.4.05,5.39-1.94,7.61-1.95,3.5-.01,9.13,9.96,12.65,11.76l-5.22-13.38,6.54-2.04,42.5,72.98ZM534.21,425.58c-2.51,0-6.69,1.77-8.82,0l-42.84-73.91,20.21-5.19c7.09,13.47,15.64,26.13,23.06,39.41,4.72,8.45,16.68,28.35,19.2,36.39.21.67.43,1.26.3,1.98l-4.61-.94c-7.63-12.46-16.25-24.36-25.46-35.69l18.96,37.93ZM449.86,336.95c-.03,3.92.02,7.85,0,11.77l-23.54,4.91-1.02-13.12,24.21-5.18c1.52.84.36,1.36.35,1.63ZM398.85,333.35l13.47,5.86.75,11.5c-.52,3.03-12.42-.77-14.22-2.65v-14.72ZM189.6,186.17v-16.68c0-1.27-1.95-4.51-2.95-5.55-1.78-1.84-12.01-8.99-14.49-10.36-2.81-1.55-3.78-1.56-6.99-1.34-10.28.72-31.12,4.08-41.1,6.63-11.9,3.05-8.01,13.24-8.32,23.07-.06,1.84-.07,4.21-.17,5.86-.09,1.53-.58,8.16-1.13,8.56l-48.97-.59-2.96,1.62c-20.52,23.19-36.54,49.79-55.08,74.42-2.52,3.35-7.59,5.21-3.45,10.1,2.84,3.35,9.55,2.49,13.64,3.03l1.33,54.65-2.62,25.45c1.02,2.76,2.19,6.18,5.32,7.11,33.71,6.42,67.34,13.9,100.59,22.35,2.61.66,6.56,2.84,8.83,3,2.96.21,15.98-4.65,18.31-6.58,4.26-3.53,1.48-9.18,2.57-13.78.64-.92,7.69-1.49,7.56,1.02.4,3.81.33,18.78,2.89,20.66.62.45,1.16.75,1.95.62l31.73-19.34,3.76-4.08,79.54-23.78c1.4-.85,2.06-5.22,1.96-6.99-4.96-22.49-11.13-44.69-13.25-67.73l1.04-.96c5.83.76,18.06-4.63,17.21-11.49-7.46-14.69-14.73-29.62-22.76-44-7.04-12.62-15.94-29.08-24.04-40.71-2.94-4.23-3.92-5.84-9.58-5.12l-40.38,10.95ZM167.37,390.27c-.34-2.72-.98-5.47-1.31-8.19-2.36-19.74-5.09-43.09-5.88-62.79-.08-1.86-.5-5.8.91-6.92,2.15-1.71,4.8-.28,4.93,2.39,1.1,22.85,5.75,46.53,6.61,69.27.05,1.36.26,3.6-.61,4.67l-4.64,1.57ZM196.14,351.67l-3.31-48.04c-.69-5.37-7.24-3.38-11.32-2.9-11.25,1.34-29.1,3.83-39.79,6.64-4.49,1.18-7.01,3.74-7.05,8.65-.08,11.39,1.31,25.54,1.97,37.28.51,9.23,2.17,18.62,1.61,27.79-1.15,1.26-2.25,2.96-4.23,2.63l-1.3-77.18,33.06-5.85c3.16-.53,5.31-9.1,7.26-9.75,14.51-.13,29.78.59,43.74-3.99,4.82-1.58,12.11-7.57,15.8-8.4,6.31-1.42,15.74,2.36,22.42-.14,1.54,17.99,5.43,35.5,9.54,53.01-3.79,2.08-12.83,1.57-15.44,4.86s-2.15,10.7-1.3,14.71l-35.62,9.85c.48-14.82-5.31-10.09-16.03-9.16ZM121.59,307.51v27.8l-5.16-.72c-.88-5.99,1.68-17.07-6.34-18.19-5.52-.77-9.18.11-14.34.58-4.69.43-9.43-1.83-10.98,4.06-.77,2.92-1.41,12.22.2,14.6.44.66,3.07,2.94,3.6,2.94h9.48v9.49c0,.44,1.26,3.64,1.65,4.23,2.94,4.51,17.34,4,22.54,4.6.11,4.68-.14,9.4-.03,14.09.05,1.93,1.98,11.58-.28,11.97l-65.68-15.66c-.25-9.52,2.56-18.52-9.76-20.34-2.17-5.5,1.84-12.03-3.88-15.41-1.81-1.07-10.46-3.05-10.65-3.87.23-13.27-.2-26.56,0-39.82.06-4.05,1.52-7.33-.61-11.7l37.58-60.55c13.97,25.32,27.6,50.81,41.64,76.09,3.24,5.84,4.7,12.68,11,15.81ZM182.25,382.25c-2.84,2.86-5.86-1.04-5.66-4.16-.53-20.21-4.75-41.34-5.33-61.39-.12-4.19-.31-9.69,5.31-6.46.52,2.09.98,4.3,1.24,6.44,2.33,19,4.42,42.43,5.26,61.51.05,1.14-.03,3.26-.83,4.06ZM187.45,377.72c-2.05-.61-2.23-6.44-2.42-8.72-1.46-17.54-2.61-36.68-3.31-54.26-.33-8.39,5.62-8.59,6.5-1.26,1.51,12.72,1.33,27.49,2.04,40.47.25,4.53,1.19,9.88,1.33,14.37.1,3.32,1.01,10.93-4.14,9.4ZM49.66,364.75l-17.99-5.88-.31-6.56c5.9,1.12,13.05-.02,18.31,2.95v9.49ZM205.95,362.78l-9.16,1.97c-1.18-7.54,2.11-7.43,8.5-7.2l.66,5.23ZM122.25,350.36c-3.83-.87-14.3-.01-17.01-2.28-1.39-1.16-.32-6.23-.65-8.19.65-.64,15.15,1.6,16.62,2.68,2,1.47.7,5.49,1.04,7.79ZM267.35,345.72l-12.64,3.27c-1.75-.42-1.08-6.13-.6-7.65l11.98-3.41,1.25,7.79ZM39.2,346.43c-2.58.4-4.79-.71-7.19-1.31v-9.81l7.19,1.96v9.16ZM109.83,333.35c-6.33-.71-12.54-1.55-19-1.62l.03-8.2c6.29.42,12.05-1.95,18.32-.65l.65,10.47ZM143.82,294.1c-4.26-1.32-14.46,3.1-17.64,1.63-.52-.24-.93-.87-1.31-1.31l-47.09-87.32,6.26.6,13.69,17.05-6.22-17.65,14.7.66,1.68.93,49.59,81.23c.41,1.08-.46,1-1.23,1.22-1.04.31-5.17,1.15-5.89.7l-15.7-18.68,9.15,20.93ZM115.05,207.76h13.41l21.9,27.47-13.07-26.5,11.67-1.52,44.55,71.54c.19,1.32-.05.84-.95.96-9.6,1.25-25.08-5.68-30.09,5.89l-47.41-77.85ZM202.03,263.36l5.87,13.41-7.1,1.56-44.56-72.87,18.14-3.43,2.13,1.49,43.81,68.67c-1.13.94-4.66,3.24-5.85,2.65-2.01-1-7.66-8.09-10.15-10.18-.73-.62-1.06-1.59-2.29-1.3ZM244.86,267.28c-4.32-.59-11.04,0-15.69,0-.42,0-3.25,2.2-3.58,1.96l-43.16-68.37c-.22-1.36.18-.78.89-1.04.98-.36,6.6-1.94,7.14-1.8l12.22,11.68-5.26-13.35c.1-.57,6.15-2.53,6.91-1.05l41,70.19.51,2.42c-.25.33-.79-.63-.97-.65ZM242.57,227.38l18.88,37.71c.2,1.94-7.09,2.53-8.26,1.37l-42.64-73.45c-.26-1.41.21-.74.93-.96,6.06-1.84,12.32-3.15,18.37-5.03,15.94,25.02,30.48,50.95,43.45,77.64l-4.23.02-26.5-37.3ZM177.83,175.7v13.41c-.81,1.02-2,1.13-3.14,1.44-2.21.6-19.02,3.72-19.98,3.4-.85-.28-.94-.79-1.08-1.57-.31-1.74-.98-9.81-.57-11.04.18-.53.45-.84,1.02-.94l23.74-4.7ZM126.82,189.44v-15.7l12.78,5.86.95,12.46c-5.19.82-8.99-1.22-13.74-2.62ZM360.99,155.04c-.6-4.19.62-18.1,1.93-22.15,2.74-8.47,19.22-5.62,20.2.66.47,3.04.48,23.48-.25,25.83-1.27,4.06-6.34,3.33-9.65,3.04-5.17-.45-11.35-1.28-12.23-7.39ZM518.93,226.54c12.91-4.75,28.59-7.14,41.14-12.21,10.34-4.18-1.21-9.48-4.81-13.56.29-3.28-.65-6.58-.8-9.66-.24-4.73,2.34-19.62-4.57-19.06-11.1,4.08-27.02,4.6-37.57,8.91-2.95,1.2-4.67,3.75-4.95,6.82-.92,10.08.63,21.7.17,31.94.92,4.1,8.29,4.41,11.39,6.82ZM553.18,209.06l-33.84,9.7c-4.58-.36-8.95-5.23-3.14-7.77,8.15-3.56,21.01-4.18,29.64-7.67,1.73-.81,7.92,5.17,7.34,5.74ZM329.54,426.57c-.46-3.95.85-19.67,2.48-23.03,3.12-6.45,18.91-4.58,19.77,2.74.4,3.44.5,22.66-.31,25.23-1.18,3.75-5.22,3.31-8.35,3.04-5.93-.51-12.77-.95-13.59-7.98ZM488.11,498.58l41.89-12.78c8.12-4.03-2.84-9.7-6.14-12.89l-1.49-26.64c-.88-1.3-2.3-2.46-4-2.23l-37,8.82c-3.13,1.34-5.07,3.57-5.39,7.04-.93,10.07.63,21.7.17,31.94.79,3.61,8.87,4.9,11.95,6.74ZM521.79,481.18l-33.79,9.65c-3.51-.73-8.53-3.85-4.62-7.23l30.98-8.27c1.53-.88,8.33,5.01,7.42,5.86ZM60.95,273.32c-1.49-.69-2.97-2.98-3.29-4.56-.9-4.45.31-19.59,1.85-24.01,2.49-7.1,18.61-5.17,20.09,1.4.59,2.62.59,22.61,0,25.24-.67,3-3.69,4.34-6.52,4.24-1.89-.07-10.61-1.6-12.13-2.31ZM215.58,339.11c12.72-4.8,28.77-7.09,41.06-12.28,1.98-.84,4.26-1.74,4.24-4.21-.15-2.96-6.42-6.02-8.22-8.2-3.75-4.52.06-20.91-2.4-27.69-.89-2.47-3.76-1.88-5.89-1.62-4.68.58-34.29,7.56-37.08,9.34-1.04.67-2.04,2.04-2.96,2.92l-.2,35.5c.82,3.55,8.55,4.17,11.46,6.23ZM249.11,321.57l-33.2,9.68c-4.29-.37-8.99-4.67-3.57-7.54l30.08-7.93c1.36-.38,7.52,4.7,6.69,5.78Z', viewBoxWidth: 595.28 },
    'town': { pathData: 'M144.52,164.25c1.4,2.35,4.7,2.75,6.67,4.64,4.67,4.49,2.9,10.42,3.2,16.24l-14.07,1.88c-1.44.34-3.86,2.12-4.77,2.15-1.91.07-4.38-2.9-5.95-3.32-3.07-.81-6.06,1.99-8.86,3.05-2.18.82-12.4,3.65-12.96,5.1l.49,7.96c7.12-4.26,15.25-5.79,22.91-8.69-1.43,3.89-1.15,7.43-1.23,11.52-3.63,1.38-7.47,2.3-11.09,3.7-2.45.94-4.6,2.5-7.13,3.31-2.93.93-11.77,1.95-12.77-1.65-1.4-5.04-.54-14.77-3.52-19.05-1.38-1.97-8.47-4.36-10.47-3.77-2.97.87-7.6,4.07-10.8,5.47-2.48,1.08-15.41,5.76-16.05,7.15l5.8,5.79c3.22,4.41,3.41,16.05,2.28,21.42-.87,4.16-9.93,12.12-13.33,15.09-1.74,1.53-1.04,2.82-4.31,3.22-8.23,1-7.76-5.97-8.97-11.93l-15.89-2.01c-1.1.28-8.43,18.28-8.51,20.9,2.59-.08,5.21.14,7.8-.03,1.04-.07,1.84-1.02,2.9-1.06.85-.03,5.9.65,6.45,1.05.44.31,4.33,6.25,4.6,7,.75,2.03.55,6.53,1.15,7.55.32.54,1.71.97,2.35,1.71,3.99,4.63,8.5,12.57,13.4,15.6,1.7,1.05,4.13,1.38,5.97,2.73,2.08,1.53,2.27,3.39,3.54,4.59.6.57,1.61.53,2.32,1.3.67.73,2.56,9.7,2.81,11.53.2,1.46-.27,5.24.16,5.93,2.11,3.4,13.05-2.84,16.15-3.66,6.97-1.83,15.18,3.84,21.71,6.1,8.73,3.02,18.34,4.35,26.03,9.93,6.74,4.9,3.33,19.94,7.12,23.04,4.33,3.54,15.68,4.88,21.1,7.02-.05-1.38-.07-2.73.26-4.09,1.04-4.26,9.63-9.39,13.35-12.16,1.17-.87,2.04-2.31,3.24-3.14,5.82-4,10.51-.32,16.5.25,8.23.78,16.91-.48,25.44.66,3.17.42,20.56,3.87,22.36,4.9.29.16,4.72,4.06,4.94,4.34,3.25,4,.2,15.67,2.31,20.89.21.3,6.09,1.52,7.06,1.64,3.78.48,10.7.9,14.43.63,3.89-.28,7.32-2.13,11.31,0-.49-7.4.11-11.3,4.93-16.83,3.68-4.22,5.24-5.4,11.01-5.81,11.07-.8,23.23,1.19,34.82.02,6.91-.7,14.98-5.21,21.95-.48,2.79,1.9,9.12,12.55,9.61,15.91.24,1.59-.04,3.28.05,4.88,9.98-2.62,20.21-2.62,30.36-4.03l.41-.38c1.25-10.4-5.69-18.34,4.66-25.4,6.35-4.33,11.18-3.13,18.07-4.55,8.53-1.76,27.22-8.06,34.86-3.83,1.46.81,3.18,2.87,4.83,3.87,6.07,3.71,11.77,4.39,11.21,13.44,2.54,1.08,17.62-5.86,18.28-6.94,1.5-2.47-2.09-8.59-2.05-11.88.02-1.97,1.46-6.79,2.96-8.1,4.86-4.24,20.08-8.58,26.85-12.01,4.36-2.21,16.41-11.04,20.29-10.77,1.11.08,2.09,1.05,3.26.98,0-1.91.81-3.47,2.75-3.97,4.06.26,5.55,4.7,6.55,8.02,4.73-.32,2.4-5.37,2.53-8.31.12-2.75.76-10.58,2.7-12.27.63-.55,2.07-.74,2.21-.97.66-1.06-.56-6.79,2.83-8.32l-4.53-9.88c.9-4.75,4-13.09,3.2-17.75-.31-1.8-2.78-4.35-3.17-6.31l-1.73,1.74c-.21-1.27.58-2.5.53-3.71-.24-5.03-9.93-20.67-12.83-26.04s-5.31-11.09-8.86-16.08c-2.85-4.01-4.71-9.15-7.84-13.04-.18-.8.04-1.09.85-.85,2.22.66,5.53,3.25,8.02,4.16,2.97,1.08,6.13,1.02,8.93,2.67,8.58,5.06,7.99,15.62,8.95,24.4,3.35.75,5.38,2.09,6.66,5.34,4.36-.35,7.56-3.71,11.98-2.81s12.64,14.47,16.36,18.43c2.02,2.15,7.41,5.52,7.8,7.85-.4,7.14-.98,14.28-1.75,21.38-.55,5.09.1,5.59.09,9.91-.02,11.06-1.14,22.82-1.23,34.24-.2,25.14,1.64,52.82.6,77.69-2.13,50.86-77.19,81.57-118.31,93.96-74.41,22.43-154.49,26.32-231.7,21.17-2.43-.16-10.97-1.8-12.49-.87-.69.42-.89,2.15-2.09,3.12-.72.58-7.85,3.8-8.6,3.87-2.61.24-3.87-1.65-6.1-2.36-25.91-3.86-52.43-12.12-78.21-15.74-4.77-.67-7.33.77-11.42.39-7.31-.67-7.53-6.67-7.33-12.68-32.11-11.31-68.3-26.21-91.28-52.27-24.94-28.29-17.33-64.4-17.08-99.45.13-18.94-2.22-35.62-2.92-53.97-.35-9.09,4.13-22.46,7.83-31.01,1.7-3.92,6.5-14.4,10.68-15.42,7.39-1.79,9.06,5.82,16.28,4.39.75-5.57-1.55-12.16-.45-17.56.13-.65,3.95-7.43,4.5-8.1,5.15-6.27,24.73-12.9,32.88-16.58,7.12-3.22,9.96-7.46,18.38-4.09,3.52,1.41,7.23,4.34,9.41,7.42,7.96-3.23,16.19-5.66,23.73-9.8,1.92-5.96-1.98-15.43,5.48-18.3,8.79-3.38,20.53-2.98,29.46-6.5l27.96-5.38-8.7,13.05-35.38,6.68ZM142.61,176.02c-.25-.33-5.95-3.94-6.2-3.65-1.36,6.64,2.89,6.77,7.53,9.28.46-.63-.78-4.92-1.33-5.62ZM55.66,213.08c-.17-.3-4.07-2.87-4.8-3.07-1.31-.36-2.42-.11-3.7.13-.85,3.02-1.74,13.95,1.09,15.3,1.36.65,6.3.23,7.25-.87,1.21-1.39.9-10.18.17-11.48ZM576.03,236.16l-10.46-13.65-6.36.89,7.51,13.63,9.3-.88ZM578.94,246.6c-4.49-.88-8.63,1.67-12.76.58l-1.74,11.02c4.87-5.84,7.61-3.78,13.91-2.32l.59-9.28ZM24.75,262.84c-3.58.37-7.67-.27-11.31,0-.85,8.23,9.01,4.12,13.92,4.05l-.58-4.63c-.85-.34-1.62.54-2.03.58ZM580.58,265.84l-8.61.18-6.95,11.89c5.87.39,9.68,5.11,14.17-.61,3.04-3.87,3.93-6.95,1.39-11.46ZM49.4,293.01c-2.47-1.15-6.32-4.07-8.14-6.07-2.65-2.92-3.88-7.91-7.93-10.07-.72-.21-10.41.84-11.38,1.16-.56.18-1.33,1.66-2.1,2.05l.1,40.36,16.99,14.33c3.25-5.51-.41-4.44-1.96-7.32-1.29-2.4-1.76-12.3-1.84-15.56-.32-13.37,4.06-14.3,15.42-17.7.82-.25,1.02.36.84-1.16ZM569.07,295.32l-.56-5.53-8.13-2.01c.33.99.33,3.96.69,4.53.23.36,7.39,3.62,8.01,3.01ZM58.11,311.56c-.33-1.69.84-8.14-.95-8.66-1.13-.33-13,3.06-13.46,4.4l.49,8.32c.56.62,11.55-5.4,13.92-4.06ZM114.36,405.81v-12.76c0-.23,1.94-3.63,2.31-4.07,2.99-3.63,9.74-4.94,14.21-4.33l86.73,17.67c2.29.67,4.92,2.14,6.28,4.16.79,1.18,5.31,12.77,5.31,13.83v31.03c11.15,1.63,25.86-5.58,28.19,10.48,8.8.5,17.87.03,26.64.52,1.95.11,6.13.44,7.82.88,7.12,1.82,3.38,15.85,5.29,17.04,39.51.1,79.42-2.96,118.34-9.96,8.3-1.49,16.57-3.19,24.78-5.09.93-5.69-1.9-17,2.14-21.35,1.21-1.3,6.16-4.04,7.95-4.81,6.29-2.69,20.35-7.92,26.79-8,2.81-.03,8.02,1.09,9.49,3.84.31.58,1.81,6.41,1.81,6.89v8.41c20.04-6.77,39.42-16.48,56.54-28.96-.63-4.32-.06-8.73-.29-13.08-.11-2.02-1.04-4.39-1.14-6.4-.31-6.09,2.8-18.06,6.71-22.85,1.78-2.18,5.84-4.54,6.5-7.42,2.31-10.14-3.73-22.02,4.5-31.46,1.62-1.85,3.27-3.7,4.9-5.54,1.32-1.5,8.7-8.16,8.7-9.28v-9.57c-3.06,4.8-8.22,6.73-12.19,10.14-1.92,1.65-3.67,5.03-6.11,5.49-1.07.2-3.03-.27-3.66.11-.17.1-.61,2-1.52,2.83-2.78,2.55-7.49,1.28-8.62-2.43-1.82-5.94,1.4-18.86-1.3-23.64-.91-1.61-3.43-2.37-3.15-4.69-4.34.15-7.07,3.29-10.23,5.13-8.37,4.86-17.08,9.27-26.3,12.28,1.4,2.44,4.78,2.46,6.68,4.04,4.89,4.04,2.29,11.13,2.57,16.57.32,6.23,4.23,14.59-3.32,18.1-7.59,3.52-16.62,5.56-24.49,7.99-5.83,1.8-11.08,5.51-17.16,6.63-2.67.49-5.86-.38-6.51-3.28-.49-2.18.44-3.61.33-5.09-.23-3.3-1.4-6.56-1.64-9.84-.34-4.58.4-9.51-.1-14.11-3.18-.69-7.5-5.28-9.76-6.18-6.01-2.41-21.25,2.54-27.66,4.19l-12.91,1.3c-1.34,1.27,8.16,10.39,7.49,13.1-.72,7.74,1.36,16.17.65,23.75-.4,4.28-2.2,6-6.26,7.08-7.28,1.95-17.01,2.34-24.85,3.57-6.81,1.07-13.22.99-19.68,1.78-1.72.21-2.82,1.3-4.61,1.22-3.91-.17-5.16-3.3-5.52-6.72-.75-7.2.93-19.7-1.86-25.98-.4-.91-4.05-6.84-4.53-7.07-3.64-1.77-11.77,2.2-15.96,2.61-10.82,1.05-22.27-.82-33-.52-3.64.1-5.6,2.52-7.29,5.47-1.58,9.4,2.42,23.6.44,32.34-.45,1.98-4.33,5.65-6.53,5.65-2.42,0-6.16-.99-8.72-1.17-13.78-.97-28.74-1.26-42.33-2.91-3.42-.42-8.92-2.04-9.55-6.11-1.51-9.85-1.07-21.27-2.36-31.28.22-4.24,4.42-6.23,6.97-8.99-7.19-1.43-14.35-3.12-21.73-3.51-8.05-.42-16.18,1.12-23.98-1.61l-1.24.17-12.1,9.99c-.16,2.46-.24,4.98-.14,7.44.21,5.6,4.22,21.12-3.88,22.75-11.23,2.26-34.69-9.56-46.52-12.95-2.12-.61-4.58-.2-6.83-1.29-5.17-2.5-3.27-8.61-3.65-13.17-.55-6.46-2.36-13.95-1.76-20.33.37-3.91,3.15-6.41,5.83-8.96-5.89.24-22.56-9.61-26.73-8.98-.73.11-5.72,2.2-6.57,2.67-.55.31-.71,1.15-1.13,1.46-1.18.87-2.85.58-3.26,2.83.44,5.65-1.65,13.06-.58,18.53.52,2.68,5.39,2.04,6.25,5.93.8,3.64,1.07,12.39.73,16.15-.23,2.5-.89,3.96-3.5,4.65-1.24.33-6.49-1.33-7.96-1.94-2.67-1.12-4.98-3.14-7.7-4.18-.53,6.86,1.24,21.62-10.05,16.14l-34.03-20.77c-.07,3.57.26,7.17.58,10.72,1.37,14.92,3.63,25.8,13.62,37.42,10.95,12.74,25.79,22.48,40.6,30.16,1.29.15.71-.16.85-.88,2.3-11.49-1.63-21.09,15.68-14.21-.57-4.22-.21-10.42.72-14.65.66-3.02,3.23-5.29,6.47-5.05,3.67.27,10.91,3.94,14.84,4.95l1.18-.62ZM552.84,320.26c5.01-4.92,11.6-7.1,15.07-13.63,0-.47-7.02-2.7-7.7-2.53-.76.19-1.63,1.59-2.51,2.16s-4.85,2.38-4.85,3.85v10.15ZM65.64,323.74c-1.39.18-2.61-1.69-3.67-1.63-.88.05-2.69,1.48-4.24,1.61s-2.7-.59-3.86-.45c-.49.06-3.01.94-2.74,1.91.09.32,4.71,2.71,5.75,3.53,2.76,2.18,4.76,5.67,8.75,6.04v-11.02ZM500.64,332.44l-3.48-1.16c.49,3.81-1.98,9.12,3.48,9.28v-8.12ZM126.54,331.86l-7.54,3.89,1.75,17.57c.38.39,7.1-6.89,7.42-7.96l-1.63-13.5ZM19.82,334.18v10.73l2.36,2.28,30.42,18.88c1.29.19.68-.19.85-.87.65-2.66.63-5.42.64-8.14l-.14-.75c-4.99-1.92-8.83-6.54-14.42-6.75l-19.71-15.38ZM47.67,335.34v5.5s22.88,13.68,22.88,13.68c2.74,1.87,2.17-2.99.91-3.81-.78-.51-2.45-.21-3.72-.92s-1.59-2.22-2.69-3.11c-2.23-1.8-6.83-3.11-9.56-4.94s-4.77-4.74-7.81-6.39ZM567.34,350.13c.14,3.28-.1,6.58,0,9.86,1.46,2.15,6.24,1.8,7.15-.43,1.69-4.12-.92-13.74-.2-18.42l-7.26,6.4c-.9.99.28,2.12.3,2.59ZM498.89,351.01c-3.15.44-8.27-4.45-10.59-3.99-1.31.26-5.91,3.42-7.98,4.26-3.35,1.35-7.46,2.36-11.03,2.89-1.36.86.98,5.64.61,7.28.55.53,7.96-3.18,9.4-3.65,3.61-1.18,7.49-1.45,11.05-2.87l8.55-3.91ZM161.26,363.84l-25.79-8.77c-2.85-.37-4.09,3.8-6.02,5.51l31.63,11.28c1.15.14.74.02.85-.85.29-2.25-.93-4.81-.67-7.17ZM236.15,374.77c.15-1.93,2.58-3.3,2.89-4.94.78-4.03-1.49-10.35-.57-14.78l-4.54,3.31c.73,4.53.49,9.19,1.14,13.73.09.64.21,2.71,1.08,2.67ZM555.74,411.32c12.78-10.43,18.78-26.62,18.55-42.92l-5.2,6.68c-3.38,3.26-7.81,6.66-10.99,9.89-5.09,5.16-1.5,19.65-2.36,26.35ZM401.46,375.94c-2-8.23-5.41-5.06-11.31-4.64-4.05.29-8.64-.01-12.69.65s-7.71,2.89-11.95,2.26v5.81c2.53-.17,5.3.26,7.78-.05,5.13-.65,11.65-2.73,16.93-3.37,3.58-.43,7.56.2,11.25-.64ZM281.87,377.2c-5.72-1.77-11.6-.5-17.61-.66-3.34-.09-7.48-.44-10.93-.67-3.73-.24-4.48-2.4-7.58,2.42-2.49,3.86,1.4,5.29,4.69,5.69,9.18,1.12,19.09.99,28.36,1.83,4.97-.37,4.11-4.98,3.07-8.61ZM139.3,403.2c-4.57-1.34-7.39-.37-8.12,4.63.39.39,8.86-3.9,8.12-4.63ZM131.18,414.8v8.7l27.85-15.37c0-.65-9.36-2.66-10.6-1.9l-17.24,8.57ZM168.88,410.16l-37.7,21.17v10.15l37.7-22.04v-9.28ZM212.38,442.06v-8.41c0-1.88-27.94-18.01-31.33-20.87l-5.52-.91.3,9.02,36.55,21.16ZM114.36,428.72v-9.57c-3.88-2.61-7.73-4.82-12.44-5.52-2.04,3.49.25,6.92-.65,10.49l13.09,4.61ZM212.38,425.24c1.26-7.38-7.66-7.2-12.75-8.11l12.75,8.11ZM168.88,439.16v-12.76l-37.7,22.04v9.28l37.7-18.56ZM175.26,428.14v10.73l36.27,18.84c1.17.16.75-.04.85-.85.2-1.49.28-6.6-.57-7.56l-36.55-21.16ZM114.36,453.08v-12.47l-27.51-10.12c-.64.31-.8.76-.91,1.42-.23,1.38-.77,8.79-.29,9.58,9.2,4.63,18.88,8.5,28.71,11.59ZM450.76,451.05v11.31l27.5-8.05-.24-12.83c-6.04-.22-10.4,2.63-15.49,4.52-2.16.81-11.19,3.03-11.77,5.05ZM168.88,446.12l-37.13,18.26c-1.53,5.54-1.34,12.9,5.4,6.56l31.73-13.8v-11.02ZM175.26,446.7v11.6l36.32,13.86c1.1.26.71-.01.8-.8.15-1.31.22-5.06-.29-6.1l-36.83-18.56ZM229.2,461.78v15.08l16.82,1.74c-.82-5.95,1.93-11.59.57-17.39l-17.39.57ZM168.88,464.1l-24.36,10.45c.1.9.86.89,1.5,1.1,1.33.42,13.07,2.55,13.76,2.42.48-.1.76-1.48,1.56-2.06,1.88-1.37,5.3-2.93,7.54-3.78v-8.12ZM212.38,487.3l-.57-8.42-36.55-13.62.12,7.42c5.05,2.22,9.96,8.33,14.64,10.58,3.2,1.54,14.73,3.36,18.75,3.87,1.21.15,2.4.25,3.61.16ZM286.04,472.79l-29.59-.58v6.97s29.59,1.16,29.59,1.16v-7.55ZM251.82,99.57c.42-2.35,3.41-4.77,5.65-5.37,6.95-1.87,17.19-2.59,24.63-3.79,2.23-.36,4.32-1.12,6.52-1.57,2.8,1.49,15.4,9.16,15.4,11.89v12.47c2.22-.06,4.38-.77,6.51-1.32,6.35-1.64,15.66-5.4,21.67-6.16,3.26-.42,4.31-.21,6.29,2.31,5.11,6.5,12.33,20.29,16.67,27.99,6.03,10.72,11.34,21.9,17.2,32.73.84,4.84-8.71,8.83-12.66,8.27.33,10.09,2.51,19.91,4.54,29.73-3.39,3.13-6.46,10.99-9.51,13.73-1.53,1.38-4.61.87-5.23,1.73l-.25,6.42-4.63-.58c.04-2.27-.21-7.18,1.11-9.03,1.6-2.22,10.97-2.58,11.1-3.49l-7.26-37.22c-4.52,1.74-10.73-.9-14.98,0-2.54.53-7.25,4.43-10.11,5.54-3.03,1.18-10.55,2.64-13.87,2.95-5.79.53-11.97-.34-17.79.19-1.82.55-2.68,4.9-4.2,6.24-2.8,2.47-20.01,3.64-24.62,4.67l1.46,54.52,2.3-1.75c.14-15.69-1.82-31.51-2.03-47.27.28-2.38,1.16-3.33,3.32-4.22,5.37-2.19,22.97-4.44,29.54-5.26,2.68-.33,7.08-1.68,7.74,1.96l2.33,33.92,9.46-1.09c5.73,6.44-5.26,3.81-8.48,5.71-.38.22-2.65,5.01-4.46,5.24l-2.39-37.94-.59-2c-4.58-1.29-3.54,3.99-3.43,7.19.26,7.5,1.28,15.11,1.76,22.6.36,5.67.15,11.47.84,17.15l2.67,2.07c-.03,1.34.3,2.83-.56,4.02-.36.5-9.76,6.15-10.46,6.36-2.42.73-5.8.11-8.36.18l-.85-.89-1.19-10.88-4.33-.25-.85,1.22c.9,2.08.42,6.84-1,8.53-.66.79-8.31,3.94-9.66,4.26-8.89,2.11-8.23-3.92-12.07-9.76l2.32.29v-17.69l-.96-.78c-2.73-.65-9.84-.08-11.77-1.57-1.54-1.18-5.53-9.01-4.67-11.28-3.03.77-3.08-2.46-4.64-4.35,4.32-1.24,8.5.76,12.78.62.75-.5-.04-6.66-.57-7.03l-12.16.39-1.21,4.58-3.39-6.77c-.06-.68.53-1.29,1.02-1.67,1.09-.86,8.14-1.39,10.17-1.44,2.34-.06,8.19-.48,9.55,1.53,1.55,2.28,1.37,11.41,1.79,11.85h3.48v-19.43c0-.51-3.03-1.73-3.49-2.47l-33.06-61.62-1.64.96-25.5,40.65c1.44,3.21.46,5.11.44,7.96-.02,3.97.08,7.95.02,11.91l-3.46-4.36c-1.23-1.14-5.56-3.42-6.1-4.34-.72-1.22.23-3.67-.83-4.39-3.51-.89-9.78.37-9.94-4.62-.09-2.73,1.83-3.08,3.19-4.96,12.95-17.9,24.86-36.67,39.79-53.01,9.14-.32,18.41-.6,27.56-.32,2.58.08,6.14,1.78,8.39-.27.76-6.06-1.02-14.57,0-20.3ZM259.94,105.08v10.15c2.92,1.93,6.36,2.99,9.86,2.61l-.66-9.2-9.2-3.56ZM295.9,106.24c-4.7,1.28-12.1,1.4-16.42,3.01-1.32.49-1,1.86-1.01,3.08-.03,2.33.79,4.36.62,6.67,5.43-1.2,12.02-1.16,16.82-3.77v-8.99ZM341.72,142.78c4.56,5.8,8.98,11.77,13.23,17.8,1.81,2.57,4.92,10.58,8.21,7.44l-29.85-53.08c-1.93-1.75-11.17,2.26-13.96,2.88l29.58,51.69c.94.93,6.06.85,6.12-.33-5.33-8.25-9.1-17.52-13.32-26.39ZM344.04,170.62l-29.85-51.1-4.94,1.51,4.04,8.99-7.65-8-6.27,1.05,30.15,48.47c4.84-2.66,9.32-.43,14.51-.92ZM294.63,124.93c-.76-.45-11.37,1.21-12.91,1.64-.63.18-1.07.17-1.46.84l31.6,50.17c1.34,1.35,3.22-.23,4.92,0l-3.47-9.86c3.9,1.94,8.25,12.26,12.12,5.6l-30.8-48.4ZM245.73,128.28h-10.15l4.05,12.18-9.52-11.64-4.39-1.12.27,1.75c11.42,18.19,19.91,40.6,31.51,58.39.5.77,1.86,2.71,2.7,2.84,2.76.42,8.63-2.38,11.92-1.5l-6.37-14.5c2.56,1.73,9.1,12.27,11.03,13.07.73.3,4.82-.19,4.56-1.67l-35.6-57.79ZM289.81,178.74c3.91-.69,11.81,0,16.24,0,.05,0,1.38,1.4.86-.28-.19-.61-1.09-1.88-1.49-2.57-9.25-15.98-20.33-31-29.57-47.01l-1.09-.95c-2.09.71-4.33.63-6.4.95s-.06,1.63.59,2.87c2.78,5.32,5.23,10.84,7.81,16.26l-14.74-18.6c-1.34-.88-6.49-.63-8.58-.71-.6-.02-.81-.78-1.59.46l32.47,53.65c2.32-.61,2.58-3.54,5.5-4.06ZM292.21,200.27c-1.48.49-.99,4.64-.94,6.02.47,12.11,1.94,27.94,3.48,40.02.21,1.64.51,5.54,2.6,5.53,2.47,0,2.11-3.92,2.05-5.55-.47-12.58-2.1-27.93-3.51-40.57-.29-2.6-.18-6.62-3.69-5.45ZM288.41,256.4c1.26.26,3.11.15,3.73-1.1l-4.39-50.72c-.21-1.22-1.05-3.07-2.49-3.11-1.66.27-2.08,1.5-2.13,3.07l5.28,51.86ZM256.46,228.62l-.55-5.55c-4.9.28-13.35-5.78-11.64,2.94.57,2.91,9.63,2.69,12.19,2.6ZM425.82,163.37c.42-2.35,3.41-4.77,5.65-5.37,6.95-1.87,17.19-2.59,24.63-3.79,2.23-.36,4.32-1.12,6.52-1.57,2.8,1.49,15.4,9.16,15.4,11.89v12.47c2.22-.06,4.38-.77,6.51-1.32,6.4-1.66,15.04-5.15,21.18-6.07,3.8-.57,4.77-.4,7.01,2.57,5.28,7,11.94,19.63,16.44,27.64,6.11,10.85,11.63,22.11,17.29,33.2-1.19,5.73-7.82,7.36-12.78,8.11.62,14.95,4.86,29.28,8.14,43.75-3.13-1.1-6.32,2.84-8.4,2.93-1.91.08.06-2.85-1.84-3.46l-7.77,1.38c-1.69,1.75.54,5.72-.54,6.96-.71.81-9.31,5.72-10.91,6.53-7.7,3.9-21.17,7.31-27.55,11.74-.77.53-1,1.85-2.19,2.6-6.72,4.27-13.83,7.99-20.46,12.4l-4.35-3.19c-.71-2.05-.23-11.48-1.64-11.81l-4.59.58-.31,7.49-16.18.64c1.22-4.27,1.27-6.28-.3-10.43-.78-2.05-3.06-4.87-3.5-6.36-.5-1.7.09-3.67-.33-4.89-.45-1.29-2.33-.59-3.13-1.51-.63-.72-.62-3.05-2.02-3.78l4.64-.28-.25-5.26c-4.45-1.32-8.98-.35-10.2-6.04l2.3-1.24-.8-6.06c-4.33-1-7.26.5-8.45-5.18h9.57c4.43,0,3.87,10.25,4.35,13.34h3.48v-19.43c0-.51-3.03-1.73-3.49-2.47l-33.06-61.62c-.88-.21-.93.13-1.41.61-1.46,1.46-4.91,7.62-6.36,9.88-5.31,8.22-10.55,16.59-15.66,24.94-1.42,2.31-3.28,4.9-3.82,7.49-3.16-4.44-8.43-6.31-12.11-10.23,10.9-16.25,22.38-32.24,35.33-46.89,9.14-.32,18.41-.6,27.56-.32,2.58.08,6.14,1.78,8.39-.27.76-6.06-1.02-14.57,0-20.3ZM433.94,168.88v10.15c2.92,1.93,6.36,2.99,9.86,2.61l-.66-9.2-9.2-3.56ZM469.9,170.04c-4.7,1.28-12.1,1.4-16.42,3.01-1.32.49-1,1.86-1.01,3.08-.03,2.33.79,4.36.62,6.67,5.43-1.2,12.02-1.16,16.82-3.77v-8.99ZM515.72,206.58c4.56,5.8,8.98,11.77,13.23,17.8,1.81,2.57,4.92,10.58,8.21,7.44l-29.85-53.08c-1.93-1.75-11.17,2.26-13.96,2.88l29.58,51.69c.94.93,6.06.85,6.12-.33-5.37-8.24-9.11-17.51-13.32-26.39ZM518.04,234.42l-29.85-51.1-4.94,1.51,4.04,8.99-7.65-8-6.27,1.05,30.15,48.47c4.84-2.66,9.32-.43,14.51-.92ZM468.62,188.73c-.76-.45-11.37,1.21-12.91,1.64-.63.18-1.07.17-1.46.84l31.6,50.17c1.34,1.35,3.22-.23,4.92,0l-3.47-9.86c3.9,1.94,8.25,12.26,12.12,5.6l-30.8-48.4ZM419.73,192.08h-10.15l4.05,12.18-9.52-11.64-4.39-1.12.27,1.75c11.42,18.19,19.91,40.6,31.51,58.39.5.77,1.86,2.71,2.7,2.84,2.76.42,8.63-2.38,11.92-1.5l-6.37-14.5c2.56,1.73,9.1,12.27,11.03,13.07.73.3,4.82-.19,4.56-1.67l-35.6-57.79ZM480.92,242.54l-32.16-50.82c-2.09.71-4.33.63-6.4.95s-.06,1.63.59,2.87c2.78,5.32,5.23,10.84,7.81,16.26l-14.74-18.6c-1.34-.88-6.49-.63-8.58-.71-.6-.02-.81-.78-1.59.46l32.47,53.65c1,.73,3.17-4.06,5.5-4.06h17.11ZM530.78,279.64l-7.21-37.53c-4.63,1.72-10.54-.94-14.97,0-2.54.54-7.25,4.43-10.11,5.54s-10.26,2.64-13.29,2.95c-4.78.48-14.7-.92-18.38.18-1.81.55-2.63,4.8-4.06,6.09-3.01,2.7-19.97,3.75-24.76,4.82l.68,53.56,1.34.96,2.03-2.62-2.34-45.83c-.06-2.56,1.09-3.87,3.34-4.78,5.38-2.19,22.96-4.44,29.54-5.26,2.68-.33,7.08-1.68,7.74,1.96l2.33,33.92c7.31-.59,12.26-4.15,11.02,6.38l25.45-7.29c-2.67-10.77,2.57-11.9,11.65-13.03ZM476.2,263.5l-3.15.46c-.97,3.37.18,7.01.32,10.19.5,11.04.31,24.64,1.8,35.34.24,1.75.76,2.41,2.58,2.63,1.66-.07,2.07-2.44,2.03-3.73-.2-7.1-1.29-14.39-1.76-21.5-.2-3.1-.53-22.6-1.82-23.4ZM466.2,264.07c-1.48.49-.99,4.64-.94,6.02.47,12.11,1.94,27.94,3.48,40.02.21,1.64.51,5.54,2.6,5.53,2.47,0,2.11-3.92,2.05-5.55-.47-12.58-2.1-27.93-3.51-40.57-.29-2.6-.18-6.62-3.69-5.45ZM462.41,320.2c1.26.26,3.11.15,3.73-1.1l-4.39-50.72c-.21-1.22-1.05-3.07-2.49-3.11-1.66.27-2.08,1.5-2.13,3.07l5.28,51.86ZM489.03,297.65l-5.73.63-.06,4.58,6.13-1.7-.34-3.51ZM135.82,198.17c.42-2.35,3.41-4.77,5.65-5.37,6.95-1.87,17.19-2.59,24.63-3.79,2.23-.36,4.32-1.12,6.52-1.57,2.8,1.49,15.4,9.16,15.4,11.89v12.47c2.22-.06,4.38-.77,6.51-1.32,5.18-1.34,20.43-6.78,24.55-6.25,1.92.25,2.56,1.32,3.64,2.75,5.23,6.93,11.97,19.69,16.44,27.64,5.89,10.46,10.99,21.4,16.86,31.88,1.86,5.63-7.74,9.46-12.31,9.12l1.74,15.9-6.4,10.19c-1.38.18-.92.02-1.21-.8-2.44-6.85-2.26-15.96-3.5-23.18l-.76-.81c-4.52,1.74-10.73-.9-14.98,0-2.54.53-7.25,4.43-10.11,5.54-3.03,1.18-10.55,2.64-13.87,2.95-5.79.53-11.97-.34-17.79.19-1.82.55-2.68,4.9-4.2,6.24-2.8,2.47-20.01,3.64-24.62,4.67l.58,46.4c-6.73-.2-5.05-7.12-5.96-11.73-1.51-7.67-2.98-12.04-10.57-15.5l-.54-7.03c-.57-.84-4.09-.62-5.29-.57-2.45.11-7.24.09-8.06,2.27l-3.83-1.43c-.22-2.1.17-3.82,2.19-4.75,3.86.28,15.88-2.26,18.43.46,1.79,1.9,1.57,9.4,2.03,12.18h3.48v-19.43c0-.62-3.07-1.4-3.4-2.4l-33.15-61.68-1.64.96-25.5,40.65c1.44,3.2.46,5.12.44,7.96-.04,6.88.3,13.78-.24,20.64l-2.63,1.13-1.88-11.18c-1.39-4.81-6.09-5.91-5.34-11.48-.75-1.07-10-.16-10.25-4.89-.14-2.66,1.88-3.14,3.2-4.98,12.94-17.9,24.86-36.67,39.79-53.01,9.14-.32,18.41-.6,27.56-.32,2.58.08,6.14,1.78,8.39-.27.76-6.06-1.02-14.57,0-20.3ZM143.94,203.68v10.15c2.92,1.93,6.36,2.99,9.86,2.61l-.66-9.2-9.2-3.56ZM179.9,204.84c-4.7,1.28-12.1,1.4-16.42,3.01-1.32.49-1,1.86-1.01,3.08-.03,2.33.79,4.36.62,6.67,5.43-1.2,12.02-1.16,16.82-3.77v-8.99ZM225.73,241.38c4.56,5.8,8.98,11.77,13.23,17.8,1.81,2.57,4.92,10.58,8.21,7.44l-29.85-53.08c-1.93-1.75-11.17,2.26-13.96,2.88l29.58,51.69c.94.93,6.06.85,6.12-.33-5.33-8.25-9.1-17.52-13.32-26.39ZM228.04,269.21l-29.85-51.1-4.94,1.51,4.04,8.99-7.65-8-6.27,1.05,30.15,48.47c4.84-2.66,9.32-.43,14.51-.92ZM178.63,223.52c-.76-.45-11.37,1.21-12.91,1.64-.63.18-1.07.17-1.46.84l31.6,50.17c1.34,1.35,3.22-.23,4.92,0l-3.47-9.86c3.9,1.94,8.25,12.26,12.12,5.6l-30.8-48.4ZM129.73,226.88h-10.15l4.05,12.18-9.52-11.64-4.39-1.12.27,1.75c11.42,18.19,19.91,40.6,31.51,58.39.5.77,1.86,2.71,2.7,2.84,2.76.42,8.63-2.38,11.92-1.5l-6.37-14.5c2.56,1.73,9.1,12.27,11.03,13.07.73.3,4.82-.19,4.56-1.67l-35.6-57.79ZM173.81,277.34c3.91-.69,11.81,0,16.24,0,.05,0,1.38,1.4.86-.28-.19-.61-1.09-1.88-1.49-2.57-9.25-15.98-20.33-31-29.57-47.01l-1.09-.95c-2.09.71-4.33.63-6.4.95s-.06,1.63.59,2.87c2.78,5.32,5.23,10.84,7.81,16.26l-14.74-18.6c-1.34-.88-6.49-.63-8.58-.71-.6-.02-.81-.78-1.59.46l32.47,53.65c2.32-.61,2.58-3.54,5.5-4.06ZM309.82,244.57c.42-2.35,3.41-4.77,5.65-5.37,6.95-1.87,17.19-2.59,24.63-3.79,2.23-.36,4.32-1.12,6.52-1.57,2.8,1.49,15.4,9.16,15.4,11.89v12.47c2.22-.06,4.38-.77,6.51-1.32,5.18-1.34,20.43-6.78,24.55-6.25,1.92.25,2.56,1.32,3.64,2.75,5.23,6.93,11.97,19.69,16.44,27.64,5.89,10.46,10.99,21.4,16.86,31.88,1.86,5.63-7.75,9.46-12.31,9.12v2.32s-8.97,1.17-8.97,1.17l-1.15-2.19c-4.46,1.7-10.32-.74-14.49-.1-2.72.42-7.36,4.33-10.18,5.47-3.23,1.31-11.24,2.88-14.8,3.18-4.98.41-12.34-.84-16.8.02-2.43.47-2.15,3.48-3.58,3.96s-4.33-.09-6.22.16c-8.13,1.09-14.6,2.59-23.24,2.86-1.89.06-7.66.36-8.74-.6l-31.61-58.58-1.64.96-25.5,40.65c1.72,5.84-.13,12.01.47,18.13-2.05-.75-2.87-2.75-4.43-3.97-1.38-1.08-5.19-2.24-5.35-2.48-.55-.87.6-4.08-.62-4.89-2.67-.76-8.58.07-9.64-3.12-1.27-3.82,1.18-4.11,2.88-6.46,12.87-17.8,24.74-36.36,39.46-52.76.49-.49,1.1-.49,1.74-.58,6.46-.86,18.62-.19,25.58,0,1.4.04,8.96,1.6,8.96-.26.76-6.06-1.02-14.57,0-20.3ZM317.94,250.08v10.15c2.92,1.93,6.36,2.99,9.86,2.61l-.66-9.2-9.2-3.56ZM353.9,251.24c-4.7,1.28-12.1,1.4-16.42,3.01-1.32.49-1,1.86-1.01,3.08-.03,2.33.79,4.36.62,6.67,5.43-1.2,12.02-1.16,16.82-3.77v-8.99ZM399.72,287.78c4.56,5.8,8.98,11.77,13.23,17.8,1.81,2.57,4.92,10.58,8.21,7.44l-29.85-53.08c-1.93-1.75-11.17,2.26-13.96,2.88l29.58,51.69c.94.93,6.06.85,6.12-.33-5.33-8.25-9.1-17.52-13.32-26.39ZM402.04,315.61l-29.85-51.1-4.94,1.51,4.04,8.99-7.65-8-6.27,1.05,30.15,48.47c4.84-2.66,9.32-.43,14.51-.92ZM352.62,269.92c-.76-.45-11.37,1.21-12.91,1.64-.63.18-1.07.17-1.46.84l31.6,50.17c1.34,1.35,3.22-.23,4.92,0l-3.47-9.86c3.9,1.94,8.25,12.26,12.12,5.6l-30.8-48.4ZM303.73,273.28h-10.15l4.05,12.18-9.52-11.64-4.39-1.12.27,1.75c11.42,18.19,19.91,40.6,31.51,58.39.5.77,1.86,2.71,2.7,2.84,2.76.42,8.63-2.38,11.92-1.5l-6.37-14.5c2.56,1.73,9.1,12.27,11.03,13.07.73.3,4.82-.19,4.56-1.67l-35.6-57.79ZM347.81,323.74c3.91-.69,11.81,0,16.24,0,.05,0,1.38,1.4.86-.28-.19-.61-1.09-1.88-1.49-2.57-9.25-15.98-20.33-31-29.57-47.01l-1.09-.95c-2.09.71-4.33.63-6.4.95s-.06,1.63.59,2.87c2.78,5.32,5.23,10.84,7.81,16.26l-14.74-18.6c-1.34-.88-6.49-.63-8.58-.71-.6-.02-.81-.78-1.59.46l32.47,53.65c2.32-.61,2.58-3.54,5.5-4.06ZM190.33,294.46c-.66-3.64-5.06-2.29-7.74-1.96-7.87.98-20.34,2.66-27.75,4.73-7.93,2.22-4.76,8.22-4.5,14.59.18,4.38.55,30.98,2.29,32.51.57.5,2.77,1.07,3.49.62,2.87-5.87,9.6-8.21,13.82-12.93l-2.42-30.76,2.51-1.04,1.63,2.47,2.44,25.69,3.29-1.99-2.05-26.64c.46-1.41,3.39-1.44,3.88.02l2.46,25.67,2.28.04c.62-3.66-2.37-25.81-.62-27.01.41-.28,1.01-.26,1.5-.3.46-.03.93-.06,1.36.12,1.41.87,1.64,24.82,2.43,28.31l4.02.61-2.33-32.76ZM342.74,182.94c1.51-.18,3.54-.48,4.08,1.43.3,1.06.63,4.86.72,6.24.26,4-.33,8.1.07,12.11,1.86,2.35,8.24,4.78,6,8.52-.85,1.42-27.23,8.06-30.85,9.7-.42.01-7.45-2.74-7.74-3.03-1.09-1.07-.5-12.01-.54-14.54-.09-5.29-2.91-11.94,3.89-14.62,4.42-1.74,19.51-5.22,24.37-5.81ZM341.54,204.37c-3.21,1.67-21.7,4.79-22.75,6.84-1.14,2.99,1.99,4.3,4.59,4.04,1.82-.18,20.49-5.65,22-6.46.39-.21.71-.39.96-.77l-4.8-3.66ZM226.75,281.54c1.51-.18,3.54-.48,4.08,1.43.3,1.06.63,4.86.72,6.24.26,4-.33,8.1.07,12.11l4.45,4.15c-1.77,1.93-3.32,5.93-5.69,6.97s-21.83,7.04-23.6,7.1c-.42.01-7.45-2.74-7.74-3.03-1.09-1.07-.5-12.01-.54-14.54-.09-5.29-2.91-11.94,3.89-14.62,4.42-1.74,19.51-5.22,24.37-5.81ZM225.55,302.97c-3.21,1.67-21.7,4.79-22.75,6.84-1.14,2.99,1.99,4.3,4.59,4.04,1.82-.18,20.49-5.65,22-6.46.39-.21.71-.39.96-.77l-4.8-3.66ZM396.24,166.56c2.98.31,4.7-2.22,7.15-3.58,1.85-1.02,6.8-3.84,8.49-4.27,3.02-.78,6.92.36,9.47-.39,1.03-.3,2.98-2.94,4.27-3.85,4.41-3.09,9.7-2.43,14.7-3.86-8.89-.61-21.15-4.61-29.84-3.16-2.29.38-3.83,2.52-5.72,3.56-5.95,3.29-12.48,5.47-18.23,9.03l-12.33-1.02c1.72,3.55,3.67,6.91,4.13,10.94l7.47.65v6.38c-1.94-.2-3.63-1.44-5.56-1.68-5.37-.69-4.72,1.41-8.17,3.91-1.84,1.33-3.66,2.1-5.73,2.97-1.45,2.07,1.67,2.48,3.1,2.77,3.56.7,7.25.52,10.8,1.23,3.69-5.39,8.97-10.15,16-8.02v-11.6ZM376.38,333.75c-8.38,3.29-2.46,16.28-3.92,23.05l16.82-4.64c-1.37-5.71-1.93-12.68,1.74-17.68,1.6-2.19,4.31-3.24,5.8-5.51-6.18,2-14.58,2.48-20.44,4.78ZM107.09,275c2.27-.14,3.57-2.23,3.81-4.31.28-2.42.28-16.02-.44-17.57-1.52-3.27-11.41-4.48-13.43-.95-1.42,2.48-2.18,14.3-1.76,17.3.1.71.81,2.59,1.29,3.07.93.93,9.08,2.55,10.54,2.46ZM280.55,321.31c2.63-.06,4.06-1.74,4.35-4.23s.28-16.02-.44-17.57c-1.52-3.27-11.41-4.48-13.43-.95-1.42,2.48-2.18,14.3-1.76,17.3.1.71.81,2.59,1.29,3.07.96.97,8.45,2.41,10,2.38ZM396.55,240.12c2.63-.06,4.06-1.74,4.35-4.23s.28-16.02-.44-17.57c-1.52-3.27-11.41-4.48-13.43-.95-1.42,2.48-2.18,14.3-1.76,17.3.1.71.81,2.59,1.29,3.07.96.97,8.45,2.41,10,2.38ZM222.55,176.32c2.63-.06,4.06-1.74,4.35-4.23s.28-16.02-.44-17.57c-1.52-3.27-11.41-4.48-13.43-.95-1.42,2.48-2.18,14.3-1.76,17.3.1.71.81,2.59,1.29,3.07.96.97,8.45,2.41,10,2.38ZM358.54,338.83l6.37,8.11c-1.07-4.75.72-10.32-6.37-8.11ZM382.78,409.17c7.55-.52,12.14-.59,12.9,8.22.24,2.81.36,12.99-.68,15.03-.64,1.26-2.49,2.64-3.82,3.14-3.4,1.3-12.85,4.18-16.27,4.61-4.19.52-12.57,1.26-14.89-2.79-1.6-2.8-1.91-14.33-1.51-17.66.17-1.38.68-2.62,1.5-3.72,2.99-4.02,17.69-6.47,22.76-6.82ZM385.8,419.43c-.9-.9-15.52,1.89-16.84,3.18-1.45,1.41.7,5.72.01,7.85,5.91,0,11.16-2.75,16.76-4.12l.06-6.91ZM516.74,246.74c1.51-.18,3.54-.48,4.08,1.43.3,1.06.63,4.86.72,6.24.26,4-.33,8.1.07,12.11,1.86,2.35,8.24,4.78,6,8.52-.85,1.42-27.23,8.06-30.85,9.7-.42.01-7.45-2.74-7.74-3.03-1.09-1.07-.5-12.01-.54-14.54-.09-5.29-2.91-11.94,3.89-14.62,4.42-1.74,19.51-5.22,24.37-5.81ZM515.54,268.17c-3.21,1.67-21.7,4.79-22.75,6.84-1.14,2.99,1.99,4.3,4.59,4.04,1.82-.18,20.49-5.65,22-6.46.39-.21.71-.39.96-.77l-4.8-3.66Z', viewBoxWidth: 595.28 },
    'castle': { pathData: 'M539.67,152.8c.59-3.71-1.81-6.07-4.71-7.85-9.62-5.9-21.52-10.16-31.34-15.97-2.14-.14-4.63-.39-6.74,0-3.49.65-17.9,7.19-21.85,9.11-6.53,3.17-8.08,5.28-8.37,12.95-4.03-2.22-8.16-3.85-12.86-2.65-2.77.71-17.98,9.29-21.4,11.31-4.21,2.49-8.11,4.82-8.36,10.33l-2.9,37.28-1.77.98c1.01-5.8-.12-9.03-5.09-12.15-6.94-4.36-20.94-11.35-28.58-14.63s-10.91-.56-17.72,2.84c1.69-9.18-5.66-10.74-11.59-14.95l.77-19.53c5.12-3.42,15.33-5.68,16.51-12.69.46-2.74-.02-5.81.15-8.62.57-9.77.86-19.42,1.14-29.24.2-7.09,3.04-12.53-4.24-17.32-4.24-2.8-23.54-11.86-28.31-13.15s-7.45-.45-11.79,1.58c-.44-3.64-2.04-6.1-5.23-7.92-3.95-2.25-19.46-8.02-24.08-9.21-2.81-.72-6.44-.84-9.25-.11-4.43,1.15-19.34,7.11-23.38,9.32-2.62,1.43-5.05,4.23-5.23,7.33-3.7-2.4-7.19-3-11.57-1.94-3.6.87-24.03,10.18-27.38,12.34-2.61,1.68-4.49,3.67-4.85,6.83-.7,6.15.51,12.6.61,18.67.13,8.1.08,15.93.55,23.98.16,2.66-.42,6.21.13,8.63,1.03,4.56,11.84,8.83,15.65,11.21l1.18,20.36c-5.46,2.86-13,5.66-11.71,13.24-6.12-1.83-8.75-4.58-15.34-2.2-4.71,1.7-29.9,13.07-32.21,15.68l-2.66,5.22-1.83-30.01c-.44-3.38-1.27-6.05-4-8.26-8.82-3.1-20.77-12.33-29.32-14.48-4.01-1.01-6.67.32-10.4,1.35.08-3.8-1.04-6.77-4.13-9.02-2.96-2.15-24.59-12.27-27.7-12.6-2.08-.22-3.87-.01-5.87.55-6.06,1.72-26.08,10.25-31.52,13.45-4.18,2.46-5.59,7.15-4.37,11.7-7.3-2.42-11.97-5.32-19.98-3.34-4.01.99-31.86,12.85-34.05,15.01-2.85,2.79-2.88,5.81-2.53,9.59,1.36,14.82,3.89,33.81,6.41,48.49,1.76,10.27,15.65,11.71,20.84,19.46l14.78,119.57c.56,2.93,1.97,5.49,4.34,7.34l45.24,34.19c2.98,1.26,4.57.69,7.47-.13,9.36-2.66,18.94-8.51,28.46-11.24l26.52,16.99c-3.75,9.99-8.61,19.62-13.97,28.84-9.19,8.89-26.31,15.97-34.77,24.81-2.64,2.76-3.15,6.19.11,8.7,11.17,4.86,22.43,11.5,33.68,15.97,4.94,1.96,5.56,2.14,10.28-.45,17.14-9.39,35.62-24.29,52.42-35.18,1.5-.97,7.99-5.4,8.95-5.14l18,12.43.67,33.21c.23,2.73,3.08,5,5.08,6.6,14.71,11.81,37.5,25.65,53.84,36.1,5.03,3.22,10.41,8.12,16.63,5.38l62.6-44.29c1.2-1.47,2.28-3.11,2.56-5.04,1.09-7.7.19-18.24.61-26.26.14-2.58.96-5.3.72-8.04l16.05-10.8,1.55.55c9.31,7.44,20.01,13.57,29.28,20.97,6.65,5.31,17.92,17.65,25.26,20.3,4,1.44,6.5,1.09,10.51-.32l39.25-24.41c3.84-4.24,2.48-6.95-1.64-9.97-11.34-8.32-26.52-14.25-38.04-22.7l-11.96-19.02-.03-1.73,27.55-17.96c1.12-.13,10.24,4.32,12.1,5.2,5.72,2.7,13.75,8.88,20.07,6.47,4.51-1.72,15.52-9.82,20.32-12.97,8.61-5.64,18.66-12.02,26.74-18.23,2.77-2.12,4.96-3.76,6.11-7.33l14.29-124.16c.19-.9.42-1.74,1.06-2.45,2.54-2.8,11.43-6.54,15.1-9.43,1.31-1.03,3.86-3.41,4.44-4.9l5.53-48.8c-.1-6.57,1.62-9.73-4.65-13.45-4.76-2.83-29.54-13.62-34.44-14.62-7.01-1.43-10.17,2.83-16.38,4.41ZM296.74,510.32v14.02l-7.59-4.97v-10.81c2.57.7,4.75,2.25,7.59,1.75ZM304.91,524.34v-14.02l12.84-7.01c.14,2.52,2.7,9.55,1.16,11.38-2.43,2.9-10.76,6.9-14,9.65ZM296.74,386.18v117.13c-4.49-.03-5.67-6.83-10.65-2.93-3.85,3.01-3.1,9.71-4.25,14.03l-18.09-11.69c-.65-1.07-.39-19.56-.32-22.52.08-3.73,2.44-7.48-1.9-9.72-2.68-1.39-5.75-.57-7.98-2.51,3.03-1.71,1.43-18.59.43-19.44-4.18-.53-7.85-3.02-12.12-2.47l-1.76-91.42,2.18.16,54.48,31.38ZM304.91,502.72v-116.54l54.6-33c.41,3.72.43,7.66.32,11.42-.88,27.95-2.24,56.12-2.97,84.07-.2,7.56.28,15.15-.07,22.71-.53,1.54-7.56,3.51-9.45,5.15-5.51,4.78-3.74,14.6-4.18,20.95l-12.86,9.33c-1.27.19-.69-.19-.88-.84-.92-3.02-1.24-14.58-4.97-14.94-2.76-.26-16.13,10.07-19.54,11.7ZM243.01,472.93c2.34.86,3.81,2.94,6.2,4.01s4.82.99,6.94,2.4l-.31,18.12-11.97-8.17-.87-16.36ZM356.3,478.19v9.64c0,.4-4.71,4.43-5.25,3.79l-.23-11.16,5.48-2.28ZM192.71,426.28c.94,1.6-11.1,23.8-12.76,27.09l-34.07,24.97c-2.41.94-5.72-3.34-7.79-4.73-4.52-3.03-10.28-6.6-15.38-8.28l.37-1.21,54.92-38.4,8.62-3.03,6.09,3.6ZM480.68,459.5l-28.78,18.23-2.33.36-39.2-28.01c-2.28-2.51-9.74-19.04-9.02-21.72l10.45-7.78c1.28.68,2.54,1.45,3.9,1.97,18.41,6.91,45.14,25.58,63.04,36.25.6.36,1.23.67,1.94.69ZM249.43,464.17l-6.16-1.73c-.07-3.04-.61-6.09-.86-9.08-.1-1.21-.17-.85.6-.6,2.1.67,4.14,1.74,6.42,1.47v9.93ZM200.84,431.57c.49.86.15,6.94,1.01,8.68l-13.15,7.56,8.48-17.52c.35-1.02,3.56,1.1,3.66,1.28ZM144.32,370.99c.47-3.89-.35-8.58,0-12.56,9.01,2.5,10.52.72,11.67-7.89.52-3.89,1.69-14.04,1.14-17.49-.31-1.99-1.52-2.9-3.07-3.94-4.58-3.09-16.65-8.92-22.01-11.28-1.3-.57-2.64-.89-4.06-.9l-1.2-27.43c8.67,1.18,5.32-8.8,5.26-14.01l16.62,8.2c2.13,4.62-.28,16.28,3.21,19.57,5.33,5.05,17.06,8.73,22.97,13.83,9.3,2.04,4.89-8.22,5.68-13.56.31-.35,3.97,1.65,4.68,2.03,1.98,1.04,12.67,6.72,13.41,7.61,1.95,2.35.77,13.29,1.89,17.39,1.15,4.2,9.16,5.8,12.74,7.7,2.4,1.27,19.36,10.72,19.73,11.81l1.29,58.88c-1.65,11.1,1.95,26.4.56,36.84-.11.81.32,1.01-.87.86l-16.52-11.22c-1.17-13.41.68-28.82-2.89-41.81-2.66-9.67-13.38-27.23-23.95-29.2-7.25-1.35-13.93.8-19.86,4.68-2.52,9.9-6.48,19.31-10.95,28.47l-27.62-18.21-.12-3.39c5.91,2.55,11.32,2.71,12.26-4.97ZM419.77,365.62c-2.7-2.51-11.15-1.49-14.44.09-12.76,6.13-21.18,22.76-22.69,36.3-1.1,9.89.77,21.32-.16,31.39l-18,11.48c1.03-13.9.75-27.85,1.14-41.79s1.36-29.22,1.8-43.76c.11-3.48.13-7.03-.55-10.45,5.15-3.5,10.57-6.61,15.89-9.84,4.87-2.95,14.02-6.15,14.95-12.5.41-2.78.37-14.13,1.6-15.49l16.55-8.71c2.12,4.71-2.51,13.75,4.76,14.31l25.92-12.55c1.04-.88,1.78-1.86,2-3.25.76-4.8.09-11.42.62-16.33.08-.77.18-1.53.54-2.23l15.22-7.98c-.18,5.63-3.93,16.81,5.44,15.06.97-.18,2.87-2.21,2.77-.16l-8.33,89.23-30.49,20.28c-1.09-.24-9.04-17.58-9.86-19.96-.72-2.09-.85-4.6-1.7-7.06-.41-1.19-2.23-5.41-2.96-6.09ZM168.26,420.34l-19.27,12.86,10.21-19.26c.86.86,9.54,5.68,9.06,6.4ZM442.73,424.44l-10.14-6.37-.37-1.21,4.08-1.76c1.46,3.54,4.01,6.46,6.43,9.34ZM209.72,419.77c-.8.83-6.08-2.92-6.93-3.85l5.47-16,1.45,19.86ZM390.17,418.6v-11.68l2.1,9.66-2.1,2.02ZM198.63,412.76l-11.6-6.21c.6-10.7-6.62-25.72,2.67-34.02,3.8-.95,12.53,11.1,14.08,14.39-.31,8.93-3.12,17.26-5.16,25.84ZM408.85,372.45c.5,1.96,1.53,3.44,1.76,5.55.92,8.32-.62,18.29-.08,26.8-.39,1.12-2.43.97-3.63,1.63-1.45.79-8.85,7.11-9.72,6.34-.43-6.33-5.05-16.92-3.83-22.82.94-4.55,7.3-11.22,10.83-14.28.63-.55,4.2-3.56,4.67-3.2ZM173.51,380.05l1.75,27.45c-1.81-1.73-9.73-5.12-9.94-7.32l8.19-20.13ZM424.04,405.17v-12.27l4.62,9.58-4.62,2.69ZM124.46,379.44l-24.52,9.37-4.57-54.49c2.68-4.04,7.95-6.7,11.58-10.05,4.42-4.08,9.78-9.71,6.86-16.23-.22-.5-3.83-6.42-4.11-6.7-3.05-3.09-9.28-2.02-12.66.17-.75.49-3.6,4.13-4.43,2.61l-3.79-42.96,54.32-24.82.9,18.72c-4.17,2.75-15.21,6.46-18.16,9.87-3.14,3.63-.33,13.55-.84,14.06-3.25-.35-6.31.27-6.99,3.85l6.4,96.61ZM500.54,319.29l-6.42,69.52-20.73-10.51c-.44-.83-.34-1.71-.31-2.61.97-28.68,6.99-58.9,8.19-87.66.31-7.39,0-10.99-8.75-9.05-.95-4.36,1.68-11.22.14-15.04s-15.19-6.99-19.16-8.88l.92-21.06,52.46,22.87-2.91,32.83-1.27.88c-6.83-5.17-10.72-3.84-13.42,4.29-.95,2.86-4.5,19.26-2.95,20.97,1.71,1.89,11.52,4.32,14.22,3.45ZM84.17,302.94c-6.16-1.26-11.08,4.56-11.68,10.22-.23,2.18.54,13.5,1.3,15.06,1.93,3.95,13.43,6.69,13.8,7.81l4.16,51.04-21.3-16.36c-.99-4.87.95-19.04-2.6-22.52-1.58-1.55-12.75-4.01-13.67-6.23l-12.64-98.9,2.15.18,37.01,19.19,3.46,40.51ZM554.84,240.43l-9.27,78.64c-.13.69-.52.93-1.05,1.29-3.14,2.14-10.36,3.42-13.82,5.45-7.63,4.47-4.32,13.92-5.14,21.15-8.03,5.09-13.39,7.67-13.36,18.23,0,1.38.65,2.64.62,4.03-.05,3.36-2.03,7.74-1.3,11.6l-9.23,6.24,12.28-126.74c.96,0,1.83-.1,2.73-.47,12.61-5.19,24.94-13.9,37.54-19.41ZM378.37,333.19l-75.96,45.82-2.32.36-79.12-45.04c-1.34-1.39-.59-8.86-.71-11.27-.07-1.38-.58-2.66-.63-4.04-.41-11.05-.34-22.17-.58-33.22,2.56-1.32,5.14-2.85,7.78-4.02,1.27-.56,2.71-.47,4.15-1.11,4.44-1.97,8.66-5.77,13.16-7.83l5.88,2.65-13.77,8.12c-1.29,1.31-1.13,4.07-.19,5.54,1.43,2.24,12.31,5.68,14.84,7.94,1.31,4.57-.12,12.93,1.13,16.98,1.15,3.75,11.04,7.24,14.04,9.9.81,4.28-1.59,15.35,6.18,13.19,4.16-1.16,1.56-15.54,2.28-19.21,2.73-1.4,5.53-5.06,8.6-4.07,3.99,1.3,9.3,6.24,13.48,7.86.53,11.16-.32,22.65,2.4,33.53.52,2.23-1.47,10.27,2.63,6.02,2.54-2.63,1.16-5.78,1.52-8.99.45-3.99,1.53-8.2,1.77-12.25.38-6.51-.5-13.02-.51-19.5,3.29-.8,13.78-8.55,16.26-8.03.49.1,5.34,2.6,5.82,2.99,3.68,3.04-2.38,18.88,5,19,6.62.11,3.2-8.76,4.64-11.14.77-1.26,9.18-4.2,11.02-5.34,6.66-4.11.88-14.5,3.01-20.94,3.62-3.56,21.51-9.12,13.43-15.78-2.03-1.68-11.91-5.99-12.56-7.3-.54-1.1,3.92-2.12,4.71-2.35l24.97,13.55-2.37,47.98ZM542.58,345.58l-2.04,15.77-17.81,11.68c2.33-4.49-.06-10.73.27-15.75l7.15-6.46,12.43-5.23ZM55.56,351.42c8.54.82,7.54,7.21,8.17,14.02l-7.16-5.39-1.01-8.63ZM133.81,365.44l-2.27-.07-1.25-11.31,3.55.59.4.56c.02.24-.43.45-.43.59v9.64ZM146.07,347.33l-16.25-5.35-.67-13.93,17.23,8.75-.3,10.52ZM533.83,340.91v-9.05l10.24-6.12c.96-.15.94-.05.87.86-.24,3.28-1.19,6.89-1.46,10.23-3.11,1.54-5.93,4.21-9.65,4.08ZM184.62,296.5l8.95-5.73,18.21,9.23.86,29.22-4.69-2.15c-.48-4.69.11-11.16-.6-15.64-.44-2.75-3.29-4.32-5.42-5.68-5.23-3.36-11.77-6.33-17.32-9.25ZM412.94,294.75c-5.64,2.85-12.02,5.89-17.32,9.25-2.82,1.79-4.3,2.61-4.81,6.28s.07,13.75-2.07,16.04c-.38.41-2.32,1.5-2.65,1.14l1.86-29.09,15.99-8.87c1.16-.06,9.55,4.53,9.01,5.25ZM102.13,310.09c.32.31,3.68,6.65,3.58,7.03l-11.03,8.59-.89-15.2c1.91-1.81,6.47-2.23,8.33-.43ZM86.5,322.79l-4.38-2.33-.86-8.75,4.07-.6,1.17,11.68ZM333.93,310.71c-1.86-2.06-11.9-6.89-14.71-6.63l-19.81,9.98c-4.38-1.4-13.48-9.34-17.55-9.39-2.9-.03-13.09,6.91-14.9,9.7l-.77.18c-.36-.03-5.21-2.78-5.63-3.17-3.13-2.89.83-14.94-2.67-19.53-1.39-1.82-10.46-5.04-10.2-5.56l4.31-2.6c1.27.23,1.01,3.85,6.36,2.76,1.26-.26,14.17-6.58,15.16-7.46,3.61-3.23.13-15.6,2.5-20.45l23.66-10.29,22.48,10.27c1.74,5.91-1.42,15.65,3.82,19.54,1.38,1.02,14.87,8.11,16.15,8.37,3.57.75,5.82-.11,6.01-3.96l5.83,2.35c-2.43,3.26-10.84,5.54-12,9.31s1.13,16.02.23,17.46l-6.91,3.01c-.09-1.19-.56-3.04-1.35-3.91ZM501.71,310.53l-8.74-2.38,2.3-10.78c2.63-1.12,4.88-.76,7.57-.25l-1.14,13.41ZM173.52,306.44l-15.03-8.33c-1.89-4.61.12-16.1-2.81-19.68-1.99-2.43-14.65-7.53-18.38-9.68-.6-.34-1.47.03-1.16-1.15.13-.48,7.82-4.48,8.93-4.3l17.65,11.01c2.74,2.65,2.77,11.25,3.97,15.31,1.96,6.66,9.51,3.05,6.84-3.04l6.42,2.92c.52.69-6.42,4.01-6.42,6.13v10.81ZM423.46,305.86v-9.64c0-.47-.93-4-1.24-4.6-.63-1.25-2.29-2.37-3.66-2.66l-.36-1.2,7-4.1c.31,2.21-.57,5.59.31,7.58,1.23,2.79,6.1,2.32,6.69-.88.55-3.01.21-14.69,1.17-15.77l19.71-11.29,8.9,3.12-18.94,10.83c-3.46,4.22-.61,18.21-2.96,20.99-.86,1.01-15.99,8.28-16.62,7.61ZM211.47,291.25c-.62.69-14.71-7.64-16.78-8.05-3.68-.73-4.64,1.76-7.01,2.12s-12.44-7.62-15.79-8.21c-.36-5.5-2.35-7.4-6.55-10.38l128.47-59.01.47,32.89c-.27.95-1.11,1.21-1.82,1.68-5.39,3.64-14.91,5.95-20.97,9.4-2.7,1.54-3.58,2.03-3.96,5.38-.35,3.08.69,14.47-.29,16.07l-7.3,3.5c.02-1.26-.17-2.52-.72-3.67-1.51-3.16-13.49-9.38-16.95-8.46-2.26.6-9.98,6.01-12.89,7.55-8.7,4.61-20.4,6.61-17.91,19.17ZM433.97,266.12c-1.83.62-5.42,2.25-6.73,3.5-1.76,1.68-1.11,4.1-2.64,5.54l-13.44,8.8c-1.7.6-4.5-3.09-7.7-2.54-3.81.65-10.75,6.58-14.75,8.08-.82-3.3.77-7.41-2.32-9.94-7.89-4.49-16.06-8.46-24.05-12.74-1.57-.84-5.36-3.89-6.46-4.1-1.96-.39-11.31,5.07-13.02,6.61-2.48,2.23-2.16,4.28-2.6,7.32l-8.75-4.68c-1.98-4.65.51-15.55-2.84-19.06l-26.37-12.46-.28-32.14,131.97,57.82ZM275.13,184.35v10.22c0,5.32,6.39,7.12,7.47,2.21.76-3.47.04-15.74-.5-19.7-.1-.74-.55-1.87-.95-2.5-.93-1.49-13.72-6.96-15.73-7.15-4.37-.41-9.36,3.25-13.65,3.48l-.58-23.37,41.19,17.5,1.39,32.49-.8,1.45-135.07,62.98-6-3.25-1.8-24.42c.04-1.09.16-1.32.99-1.98,3.55-2.77,15.38-5.57,17.31-8.98.34-.61.41-1.48.44-2.18l4.66,1.78c-.17,1.09-.63,1.89-.54,3.09.17,2.34,2.55,15.51,3.63,16.58,2.41,2.4,5.89.6,6.25-2.52.21-1.82-1.59-7.66-1.1-8.34,3.76-.95,8.21-5.57,9.02-9.38,1.21-5.72-1.26-11.33.25-16.69l23.21-10.68c2.7-.54,6.04,1.1,8.32,2.51-.02,1.41-22.86,11.07-24.21,14.32-.64,1.54-.38,5.43-.3,7.28.1,2.48.59,8.18,1.32,10.36,1.09,3.26,4.28,4.6,6.6,1.66,2.48-3.14-.7-11.67.34-15.72l18.89-10.02c2.07,4.09-1.96,19.09,5.71,16.82,3.97-1.18,1.41-11.31,2.25-14.7,1.56-1.43,2.96-1.23,4.59-3.01,5.08-5.56,1.77-13.08,2.63-19.56,3.82-2.77,21.18-10.49,24.97-9.83,1.34.23,2.8,1.94,4.53,1.66.29,1.37-.19.94-.75,1.3-3.93,2.55-17.28,6.76-18.97,10.22-.43.89-.61,1.81-.72,2.79-.33,2.95-.91,12.48-.53,15.14.78,5.49,6.69,5.95,7.87.97,1.08-4.54-.55-10.4.93-15.13l17.42-7.69ZM422.87,231.08l23.09,9.91c.99,4.39-.16,8.9-.37,13.17-.19,3.72,2.18,5.06-3.65,6.62l-140.43-61.34-.15-34.13,41.51-18.93-.58,23.95c-4.58-.65-8.84-3.77-13.59-2.78-1.5.31-11.91,5.86-13.46,6.98-.69.5-1.38.91-1.81,1.69-1.17,2.14-1.44,18.04-.66,20.44,1.34,4.13,7.33,2.11,7.33-2.08v-10.22l16.2,8.32c2.58,2.67-2.3,16.43,4.63,16.65.62.02,2.58-.76,2.96-1.17,2.63-2.83.3-14.92.29-18.98-1.5-3.69-14.32-8.09-18.08-10.53-.56-.37-1.05.06-.75-1.3,1.82-.1,3.52-1.93,5.11-2.24s11.16,2.7,13.13,3.55c3.29,1.41,6.8,4.4,10.25,5.81-.15,10.53-3.42,19.21,9.2,23.22.82,3.42-.76,6.66-.33,10.26.74,6.13,7.6,5.38,7.6,2.32v-13.44l1.4-.83,16.61,8.81c1.04,4.11-1.63,13.75.99,16.83,2.3,2.71,6.19.41,6.67-2.65.37-2.37.32-16.52-.41-18.22-.36-.83-.99-1.31-1.69-1.81-5.56-4.02-14.04-6.67-19.89-10.46-.56-.37-1.05.06-.75-1.3,2.54-.39,4.45-2.91,7.15-2.24l24.93,12.21c-.2,4.37-1.7,9.94-1.08,14.21.8,5.54,6.73,6.48,10.95,8.62.73,4.05-2.18,15.31,4.92,13.83.95-.2,2.77-1.68,2.77-2.53v-10.22ZM161.74,219.31l-76.59,34.66-3.32.81c-20.25-11.1-41.69-20.2-60.77-33.29l-6.25-44.96c.14-.78.9-1.03,1.48-1.38,3.14-1.88,20.09-9.02,23.49-9.79,2.13-.48,3.78-.42,5.84.3l-13.4,6.74c-5.51,7.43,7.55,9.08,10.17,12.56,1.84,2.45,2.27,12.4,3.95,15.91,1.28,2.67,4.76,3.44,5.66,4.86,1.21,1.9.44,8.47,4.91,8.27,6.23-.28,2.87-10.2,2.73-13.87,2.63.06,4.5-1.53,7.26-1.15.77.11,10.47,4.48,10.86,4.93l4.37,25.42c1.2-1.05,1.86-1.53,2.08-3.18.87-6.49-.42-15.16-1.17-21.7l.55-1.11c.6-.47,13.57-4.6,14.55-4.68,1.11-.1,4.74,2.01,5.19,3.06,1.62,3.85.17,16.32,6.22,15.93,5.6-.36,2.82-8.15,3.31-8.71,3.46-1.67,13.07-4.01,15.39-6.51,3.04-3.26.71-13.57,1.59-17.98,3.83-2.77,17.38-4.97,15.42-11.22-1-3.18-10.17-5.4-13.17-6.99-.27-1.51.21-.9.83-1.21,1.06-.54,3.9-1.68,5.02-1.44l22.09,11.23,2.48,31.45-.73,13.05ZM580.46,173.92l-4.55,45.23c-18.77,12.76-39.51,22.13-59.46,32.86l-4.22-.78-74.78-32.8c-.36-15.18-1.57-30.56,1.14-45.51l19.02-10.14c.45,0,8.04,3.26,8.32,3.62,1.1,1.37.25,4.79,3.68,5.96,11.76,3.99,8.7-14.54,11.39-20.68l18.35-7.97,25.65,12.11c-.13,7.17-5.43,14.17,3.42,17.9,9.92,4.18,19.81,5.9,18.94-8.53l6.03-2.39,27.07,11.14ZM446.81,232.25l-22.76-10.22,5.82-3.21c-.51,7.53,11.03,8.29,16.22,11.52,1.06.66.79.59.72,1.91ZM121.45,197.11l-10.41,3.6c1.7-4.43-9.03-10.36-12.02-10.49-4.23-.18-14.15,5.54-18.74,5.63-3.11.06-9.15-4.68-12.73-5.09-4.88-.55-10.2,2.49-14.9,3.52-.79-3.78-1.64-12.64-4.37-15.2-1.3-1.22-4.02-1.68-4.98-3.48l7.27-2.95c3.14,9.92,12.55,4.63,18.11,0,6.08-5.05,2.02-11.36,2.31-18.09l26.18-11,19.02,8.76c1.15,6.01-.41,12.97,3.11,18.21,3.92,5.82,6.61,2.93,12.17,3.9-2.57,2.47-7.52,2.76-9.21,6.26-1.92,3.97.03,11.88-.82,16.42ZM360.89,92.72l-1.37,37.32-61.47,28.5-2.5-.16-60.64-26.39-.59-41.04,20.36-8.6c2.27-.36,4.73,1.63,6.73,2.69l.87,7.6c-.78.75-12.02-7.64-14.29-2.32-2.62,6.16,6.85,7.49,10.71,9.42.83,3.89-1.7,9.76-.2,13.34,1.32,3.15,11.26,5.4,11.85,7.43s-.69,3.85,2.24,5.36c1.54.79,3.09.66,4.46-.48.86-.71,1.57-5.95,1.6-7.36.05-1.99-1.57-4.65-.03-6.41.39-.45,5.38-2.49,6.03-2.47.56.02,8.83,2.71,9.17,3.05l1.74,27.18c5.05-.21,3.15-6.73,3.51-10.21.57-5.56,1.73-10.82,1.24-16.58,4.38-.69,11.82-4.74,15.33-1.18,2.61,2.65-.9,10.36,2.36,13.41,6.38,2.55,5.1-2.77,6.72-5.05s9.16-4.78,11.15-7.54c2.48-3.44-.36-9.02.64-13.09,3.52-1.49,10.37-1.77,9.91-6.79-.59-6.37-10.18-1.33-13.47-.28,1.56-4.55-.22-9.71,6.42-9.1l21.53,9.77ZM270.45,110.74c-8.08-1.15-1.42-10.4-4.08-15.77,11.89-.96,10.56-10.69,10.79-19.87l18.96-7.92,19.81,6.83c.57,4.65-1.01,11.13,1.32,15.33,1.46,2.63,8.01,6.08,11.01,5.04.09,2.63-.1,5.28-.02,7.91.14,4.39,2.21,5.25-3.19,7.86-.88-4.08-9.57-9.02-13.26-8.63-4.05.42-10.49,3.37-14.2,3.28-3.23-.07-10.15-4.11-13.36-3.96-2.9.13-15.89,5.09-13.78,9.9ZM545.51,182.31c0-1.25,1.56-4.08,2.62-4.97,1.23-1.03,11.08-6.36,12.55-6.74,3.18-.83,5.44.74,5.31,4.1-.18,4.52-8.98,5.86-12.02,8.48-1.13,1.85-.24,12.34-1.13,15.23-.75,2.45-5.09,4.68-7.21,5.93-.49,3.77.73,12.13-5.03,11.56-6.13-.61-2-13.93-2.76-18.02-1.75-.26-3.73-1.87-5.41-1.81-.9.03-10.42,3.84-10.87,4.35-1.17,1.33-.4,12.59-.74,15.62-.52,4.64-2.94,13.77-4.33,18.45-.35,1.17-.92,3.22-2.52,3.03l2.34-36.21c-5.24-.51-11.83-4.67-16.79-5.14-.88-.08-3.15.55-3.84,1.01-2.92,1.94.39,25.41-9.94,17.43l-.46-5.63c-.52-.81-15.29-5.19-17.45-7.96-3.02-3.86.5-12.41-.65-17.16-3.33-1.57-15.07-4.93-15.06-9.13.69-2.62,2.03-4.04,4.86-3.77,1.8.17,14.93,6.29,16.43,7.56,4.61,3.92.1,12.37,1.72,17.56l11.07,4.67c1.67-2.68.47-6.65,2.66-9.09,1.05-1.17,8.66-3.7,10.3-3.73,4.76-.1,13.37,5.39,18.02,5.24,3.54-.11,9.12-3.98,12.68-4.88,6.23-1.58,10.28,2.7,15.66,4.86v-10.81ZM498.21,174.72c-.25-3.02-.91-9.02-.53-11.64.73-5.04,5.69-7.93,5.83-.06.05,2.57-1.11,13.89-4.43,13.72-.92-.6-.79-1.1-.87-2.02ZM457.33,339.15c-1.92-5.93-1.39-19.86-10.92-15.88-7.79,3.25-15.99,9.41-23.84,12.95-2.07,1.59-2.26,7.18-1.99,9.6.17,1.5,2.57,8.1,3.34,9.52,3.74,6.9,9.6.42,14.13-1.58,1.29,4.49,1.48,16.49,7.8,16.19,3.56-1.49,19.2-7.61,20.12-10.76.68-2.33-.64-15.53-1.5-18.12-1.15-3.47-4.33-3.87-7.14-1.91ZM457.23,355.42l-9.24,4.18-2.3-11.04,10.47-5.32,1.07,12.17ZM447.4,333.31c.09,1.86,1.36,3.16-.26,4.71-1.72,1.64-11.85,7.41-14.53,8.83-.7.37-1.78,1.45-2.42.5-.63-1.48-2.15-3.52-.88-4.96.6-.68,14.42-8.07,15.93-8.61.72-.26,1.36-.62,2.17-.46ZM325.49,401.23c-.54-3-.59-14.9-.1-17.94.75-4.74,7.24-6.25,9.81-2.29,1.7,2.61,1.65,15.09,1.25,18.61-.16,1.39-.93,3.86-1.93,4.78-3.16,2.92-8.24,1.17-9.03-3.17ZM263.02,399.46c-1.2-3.48-1.22-16.62.13-20.01,1.76-4.45,9.31-3.95,10.2.91.54,2.94.42,14.89.04,18.09s-3.23,5.58-6.6,4.84c-1.81-.4-3.2-2.17-3.77-3.84ZM296.74,263.51c1.2-1.5,4.09-3.69,4.66-.59.97,5.29-.62,13.78-1.16,19.28-.28,2.81,1.17,7.01-1.75,8.46-.69-7.26-6.86-20.81-1.75-27.16ZM66.02,262.39c.54,2.7,1.54,14.45,1.18,16.85-.71,4.76-6.49,6.71-9.71,3.07s-2.1-17.29-2.5-22.3c1.25-3.87,6.4-4.53,9.13-1.86.94.92,1.64,2.93,1.9,4.23ZM529.72,271.66c.09-2.41.38-6.93.75-9.18,1.15-6.98,10.01-7.72,10.92-1.86.45,2.92-.42,16.27-1.28,19.1-.97,3.2-4.41,4.77-7.62,3.82-3.77-1.12-2.89-8.57-2.77-11.88ZM93.52,174.13c-.31,2.27,1.04,5.81-2.34,6.13-.41-7.49-6.17-17.43,1.45-23.19l1.33.56c1.81,5.27.29,11.16-.44,16.51ZM296.71,77.72c4.05-3.02,3.1,4.25,2.78,6.87s-1.41,4.85-2.03,7.31c-.58,2.27.57,6.07-3.06,6.58.58-6.1-3.33-16.55,2.31-20.76Z', viewBoxWidth: 595.28 },
    'dot': { pathData: 'M296.13,28.23c167.87-1.52,324.28,134.56,294.11,311.07-25.91,151.62-179.76,240.78-326.45,226.2C109.95,550.21-21.51,419.55,4.6,258.36,27.23,118.63,159.77,29.46,296.13,28.23ZM293.79,77.36c-147.82-1.64-275,147.65-200.19,290.49,83.26,158.99,339.6,152.2,411.53-13.07,61.68-141.71-62.85-278.27-205.06-277.62l-6.29.2ZM176.06,379.55c90.64,82.01,260.45,45,286.6-80.12,22.81-109.18-77.27-187.37-179.39-181.73-135.29,7.48-215.52,163.85-107.21,261.84Z', viewBoxWidth: 595.28 },
    'monastery': { pathData: 'M129.82,56.97c-3.67-2.41-6.64,1.15-10.94-1.66-4.11-2.68-3-7.1-1.57-10.84,2.14-5.6,8.48-17.69,11.63-23.01s7.79-6.89,12.55-2.62c2.6,2.33,10.4,17.05,12.36,21.02,5.79,11.72.8,14.17-10.78,14.94l.11,14.63,59.38,121.37c2.37-1.5,4.87-2.77,7.43-3.89,33.84-14.89,68.13-28.99,102.19-43.29,3.35-.55,6.1.7,8.45,2.96l37.3,53.2c1.03,8.91-1.23,18.02-2.03,26.91,3.44-.67,5.94-1.81,9.61-1.11,4.41.84,22.73,8.32,27.15,10.64,5.22,2.73,6.04,5.49,6.7,11.26,6.02-1.6,10.4-6.46,17.02-4.74,2.58.67,20.16,10.41,22.32,12.31,2.98,2.62,3.59,5.51,3.48,9.43.23.27,5.55-2.19,6.76-2.37,7.47-1.07,19.43,8.44,26.93,10.3l64.11-31.35c7.74-2.75,9.89.7,14.17,6.22,12.19,15.7,26.48,36.67,37.16,53.53,2.75,4.34,5.83,7.68,2.53,13-1.53,2.46-5.06,4.02-5.53,7.07l-4.45,69.24c-.33,3.11-1.48,6.01-3.82,8.14l-207.52,148.92c-2.28,1.06-5.26,1.01-7.63.2l-40.54-24.41-80.36,54.38c-2.83,1.97-6.71,1.82-9.79.59l-97.14-69.12c-2.94-3.03-2.89-6.11-2.5-10.06l-23.04-19.19c-3.99-2.52-10.88.84-15.04-3.23-24.58-19.5-54.69-35.67-78.72-55.42-1.65-1.35-3.65-3.11-4.29-5.15l-5.81-75.95c-5.75-.85-8.81-4.58-7.28-10.5,12.53-18.63,24.51-37.93,37.6-56.23,4.24-5.93,9.06-14.75,17.87-11.8,1.73.58,4.49,3.35,5.96,2.95l17.3-13c.62-1.37.54-10.31.27-12.21-.68-4.8-4.79-4.34-3.43-11.74l53.87-157.09v-13.22ZM146.83,256.29l57.29-26.76-60.13-123.13,2.84,149.89ZM136.74,256.29l-3.46-148.63c-11.39,34.13-24,67.95-35.12,102.17-2.49,7.67-6,14.64-2.99,22.85l41.57,23.6ZM209.8,266.99l131.98-62.31-29.61-43.53-103,42.25c-1.02,1.08,8.45,17.86,9.31,20.61,3.01,9.71-3.31,11.52-10.61,15.07l1.94,27.92ZM341.42,215.99l-127.83,60.21-3.15-.39,1.89,27.7,125.93-63.31,1.27-1.88,1.9-22.34ZM376.69,246.22c-3.55-.07-10.75-4.99-13.54-5-1.71,0-4.03,2.43-5.98,2.48-.29,1.63.23.97.89,1.31,1.91.97,11.14,4.71,12.81,4.88,1.37.14,6.25-3.1,5.81-3.67ZM198.46,243.7l-52.17,24.34.53,137.5c1.58-1.49,2.86-3.84,4.03-5.72,9.43-15.1,19.63-35.65,30.08-49.27.82-1.08,1.72-2.04,2.69-2.98,3.96-4.3,21.98,11.23,23.02,10.11l-8.19-113.98ZM136.74,408.69l.04-133.85-.76-6.79-40.83-23.72,1.99,140.01,39.56,24.35ZM345.83,253.14v-4.41s-4.4,1.9-4.4,1.9l4.4,2.51ZM384.87,253.77l-7.88,4.4-.32,7.12,12.6,7.37c-.51-2.06,1.06-4.61.53-6.47-.32-1.1-2.95-2.85-3.82-5.04s-1.12-5.05-1.13-7.38ZM336.38,260.07v23.3l74.54,35.36,5.22,3.59,39.28-22.89c.15-1.03-.8-1.25-1.46-1.69-.96-.63-11.34-6.03-11.77-5.54-.2,5.27.22,13.36-7.09,12.48l-24.35-12.84c-4.4-4.47.27-11.01-1.62-14.13l-9.46-5.02c-2.18,5.87,1.39,14.81-8.68,13.08l-22.5-14.02c-3.13-3.65-1.08-12.07-2.26-12.99l-10.94-3.71c.07,3.99,1.1,11.15-4.71,11.27-2.64.05-13.44-7-14.18-6.23ZM326.31,283.68c-.53-8.53.39-17.56,0-26.14l-7.48,4.17c-.1.56.55,1.01.55,1.18v26.14l7.55-3.81c.25-.64-.61-1.26-.63-1.54ZM424.55,265.1c.36-.53-9.84-6.16-11.08-6.29-2.63-.26-7.9,3.3-10.33,4.72l12.91,6.37,8.5-4.81ZM572.99,316.56l4.34-8.67-33.46-48.46-1.73-.54-207.58,124.83,41.07,65.2,197.35-132.37ZM85.74,266.36l-12.55,8.55-1.32,1.83,13.86,7.88v-18.26ZM300.49,270.77l-7.56,3.15v28.97l7.56-4.09v-28.02ZM426.43,275.81c-3.62,1.72-9.22,3.99-7.45,9.03.47,1.35,11.08,5.7,12.81,7.33,2.01-1.9.09-5.17,1.57-7.52-4.26-.84-7.31-4.42-6.93-8.83ZM87.62,379.09c-1.27-12.58-.44-25.43-.6-38.12-.02-1.49-.66-2.87-.68-4.36-.21-13.38.8-26.94-.74-40.2-3.33-2.55-30.43-18.57-32.21-18.04l-35.67,52.85c4.12.37,4,4.33,6.06,6.86l63.84,41.01ZM473.04,287.78c-2.22-.36-4.68-1.47-6.72-2.41-3.24-1.5-11.81-6.39-14.53-6.92-3.09-.6-4.84,1.9-7.71,2.41-.32,1.47.2,1.01.81,1.4,6.03,3.91,14.37,6.2,20.43,10.46,1.22.2,5.76-2.58,6.94-3.5.52-.4,1.15.01.79-1.44ZM266.48,316.75l7.56-4.09v-28.65l-7.56,4.09v28.65ZM406.91,328.7c.48-.72-10.06-5.69-11.11-6.2-20.35-9.98-41.17-19.01-61.31-29.42l-1.43-.17c-37.89,19.39-75.01,40.44-113.03,59.57-1.99,1-3.72.11-3.99,2.99-.24,2.58,1.72,5.4.04,8.14l59.43,36.16,53.11-24.35,78.3-46.72ZM240.03,330.6l7.56-4.09v-29.28l-7.89,4.4c-.2.5.33.82.33.95v28.02ZM221.14,311.08l-7.17,3.08-.44.98,1.94,28.05,5.66-2.83v-29.28ZM572.54,329.34l-9.39,5.98c2.7,2.56,1.57,7.01,4.05,9.77.25.06,3.9-1.99,4.07-2.37,1.54-3.34-.15-9.6,1.26-13.38ZM546.1,359.57l14.82-9.46-2.24-11.95-14.18,9.46,1.6,11.96ZM47.95,374.68v-9.13l-23.62-15.43.31,9.76.64,1.25,22.67,13.55ZM570.65,350.75l-10.38,7.56c-.93,1.22.03,6.67,1.27,6.93,7.23-3.57,10.57-5.55,9.11-14.49ZM538.53,352.01l-163.74,109.25-1.25,28.03c7.75-3.48,21.12-17.37,23.94-1.26,3.81-.83,5.1-4.97,9.69-4.39,4.14.52,7.2,10.24,8.24,13.84l152.12-109.23,1.21-1.93,1.28-17.93-3.58,1.14-24.33,15.4c-3.39,1.22-5.06-3.51-6.21-6.05-4.01-8.79-2.63-9.97,5.1-15.29l-2.48-11.58ZM188.12,358.32l-38.03,61.4,82.57,53.78,42.62-61.97-87.16-53.2ZM554.28,362.72c-1.1-1.13-12.25,8.02-13.92,9.11l1.34,5.37c.59.43,12.2-6.6,12.63-7.19,1.53-2.1-.12-4.97-.05-7.29ZM34.1,373.42l-8.51-5.03.63,10.71,7.88,4.4v-10.08ZM54.25,369.65v10.39c0,.28-.96,2.19-1.27,2.5-3.26,3.18-9.33-3.55-12.58-4.71-.32.45-.38,9.48-.65,11.01-1.18,6.52-12.62-2.85-13.21-2.19l1.85,22.86,68.05,47.67v-16.06c0-4.96,5.04-14.8,9.13-17.95,3.71-2.85,12.71-7.66,16.71-4.12,2.68,2.37,12.32,18.54,14.57,22.59,8,14.43,10,22.1,8.06,38.5-.64,5.41,1.39,10.72.06,16.02l38.7,27.13c1.28.16.82-.05.93-.93.46-3.42-2.28-11.51,2.35-12.19,2.86-.42,14.12,10.04,14.65,9.34.56-3.52-1.01-13.02,3.47-13.28l27.39,13.91-2.03-35.75-176.18-114.76ZM360.31,444.59l-35.01-56.63-38.66,16.97c.34.95,2.4,1.56,3.35,1.99,8.97,4.09,29.81,10.78,36.54,15.73,1.86,1.37,1.81,2.91,3.33,4.22l30.45,17.72ZM249.48,467.26l63.59-39.36-28.95-11.99-34.63,51.35ZM119.74,466v-33.06c0-.27-2.42-4.18-3.36-4.03-6.79,4.31-6.65,9.43-6.75,16.65-.03,2.39-.09,5.82-.01,8.16.1,3.07,1.03,6.03.67,9.13,3.67-.51,6.52,1.37,9.45,3.15ZM364.09,491.82l.33-33.39-39.37-22.66,4.71,71.8,22.36,13.84c-.08-2.52,1.91-9.91,1.64-11.68-.17-1.14-3.44-2.49-3.55-6.29-.03-1.09,1.49-9.73,1.87-10.73,2.41-6.31,11.5-.33,12.01-.9ZM309.3,442.38v12.28c1.64-1.63,6.91-5.86,6.96-7.84.05-2.29-1.36-5.83-.67-8.53l-6.29,4.09ZM135.49,479.22v-12.91c0-2.89-3.62-12.13-5.03-15.12l-4.42-7.23v27.39l9.45,7.87ZM303,446.48l-62.03,37.79,1.58,34.63c3.48-.49,10.95-5.83,14.06-3.82,1.97,1.27,2.38,10.09,2.95,12.64,3.88-.99,12.36-9.59,15.79-4.77,1.34,1.88.31,10.68,1.52,13.58l43.04-29.38-3.05-50.59c-3.09,2.48-7.43,7.27-11.81,5.2-.63-.3-2.04-1.86-2.04-2.37v-12.91ZM373.54,507.56c3-1.4,18.95-14.77,18.78-16.57-.08-.87-1.4-2.91-1.76-3.95-1.13-.91-9.58,5.02-10.94,6.14-2.22,1.83-3.49,3.94-5.77,5.57l-.32,8.81ZM406.28,490.56c-.81-.61-14.35,9.02-15.41,11.35-1.47,3.24.67,9.04.31,12.58l17.96-12.59c1.35-2.7-2.09-8.57-2.86-11.34ZM362.5,499.09c-1.48-1.78-2.48-2.14-4.7-2.86-2.14,7.31-1.45,8.7,5.65,11.34-.36-3.06,1-6.11-.96-8.47ZM384.87,507.57l-9.37,6.68-1.61,2.16-.97,11.3,12.46-8.31-.5-11.84ZM363.46,513.86l-4.11-.65c-.64,1.93-.11,3.95-.37,5.93-.8,6.17-2.69,6.02,4.48,9.21v-14.48ZM233.1,527.09l-25.19-12.6v9.45l25.19,13.85v-10.71ZM214.2,544.72c-.64-2.8,1.52-5.87-.35-8.15l-22.94-16.41-.59,8.1,23.88,16.46ZM252.62,522.04l-9.77,3.77.33,11.98,10.4-6.31c.86-1.39-1.17-7.36-.97-9.44ZM269.62,529.61l-25.49,15.12.31,13.22,26.31-17.13-1.13-11.21ZM220.51,538.42v11.02l13.54,9.76c1.08-4.58-.51-9.15-.42-13.75l-13.12-7.03ZM480.45,403.77c7.27-.83,6.41,9.24,5.83,14.07-.72,5.96-10.46,11.18-15.08,14.52-3.44,2.49-4.61,6.12-10.07,3.04-3.57-2.01-4.29-12.29-2.88-15.36.56-1.21,4.76-5.53,6.02-6.57,2.05-1.7,14.25-9.48,16.17-9.7ZM464.23,429.47l15.15-10.98.59-7.28c-3.9,2.01-15.19,7.86-15.77,12.25-.25,1.84.23,4.1.04,6.01ZM167.76,264.31c-.41,2.46.25,10.23.64,12.91,1.23,8.47,10.66,9.61,13.54,1.91-.41-6.94,1.91-23.42-9.48-20.82-2.53.58-4.3,3.61-4.7,6ZM108.39,284.33c.94,7.81,10.89,8.57,12.94,1.58,1.87-6.37,3.21-22.82-7.43-20.66-6.51,1.32-6.14,13.89-5.51,19.08Z', viewBoxWidth: 595.28 }
};

module.exports = HexCartographerPlugin;
