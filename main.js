const { Plugin, PluginSettingTab, Setting, TFile, Notice, Modal, ItemView, setIcon } = require('obsidian');

// === Farbpaletten ===
const DEFAULT_PALETTE  = ['#3295D2', '#6CC261', '#DDC88D', '#9c9090', '#CD6155', '#FFD700', '#000000', '#FFFFFF'];
const DEFAULT_PALETTE2 = ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#8000ff', '#ff00ff'];

// === Toolbar Schriftgröße & Höhe ===
const TOOLBAR_INPUT_FONT_SIZE = '13px';
const TOOLBAR_INPUT_HEIGHT = '24px';

// === Farben (Standardwerte) ===
const DEFAULT_MASTER_COLOR = '#000000';
const DEFAULT_HEX_COLOR = '#6CC261';
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
const DEFAULT_BORDER_PERCENT = 100;
const DEFAULT_BORDER_REPEATS = 1;
const PATH_END_INSET = 0.1;
const MAX_HISTORY = 50;
const MAX_ZOOM = 2;
const VIEWPORT_PADDING = 0.9;

// === Text-Defaults ===
const DEFAULT_TEXT_SIZE = 16;
const DEFAULT_SHADOW_DISTANCE = 5;
const DEFAULT_SHADOW_OPACITY = 50;

// === UI-Styling ===
const ACTIVE_BOX_SHADOW = '0 0 8px rgba(74, 158, 255, 0.4)';

// === Symbol-Konfiguration (Größe/Position pro Symbol) ===
const SVG_SYMBOL_CONFIG = {
    'question':    { size: 0.5,   align: 'center', marginX: 0, marginY: 0 },
    'exclamation': { size: 0.5,   align: 'center', marginX: 0, marginY: 0 },
    'cross':       { size: 0.5,   align: 'center', marginX: 0, marginY: 0 },
    'grass':       { size: 0.30,  align: 'center', marginX: 0, marginY: 0 },
    'swamp':       { size: 0.30,  align: 'center', marginX: 0, marginY: 0 },
    'bush':        { size: 0.35,  align: 'center', marginX: 0, marginY: 0 },
    'tree':        { size: 0.35,  align: 'center', marginX: 0, marginY: -6 },
    'pine':        { size: 0.45,  align: 'center', marginX: 0, marginY: 0 },
    'palm':        { size: 0.425, align: 'center', marginX: 0, marginY: 0 },
    'hill':        { size: 0.50,  align: 'center', marginX: 0, marginY: 0 },
    'mountain':    { size: 0.60,  align: 'center', marginX: 0, marginY: 0 },
    'tent':        { size: 0.35,  align: 'center', marginX: 0, marginY: 0 },
    'house':       { size: 0.325, align: 'center', marginX: 0, marginY: -2 },
    'village':     { size: 0.55,  align: 'center', marginX: 0, marginY: 0 },
    'town':        { size: 0.70,  align: 'center', marginX: 0, marginY: -3 },
    'castle':      { size: 0.30,  align: 'center', marginX: 0, marginY: 0 },
    'harbor':      { size: 0.30,  align: 'center', marginX: 0, marginY: 0 },
    'monastery':   { size: 0.30,  align: 'center', marginX: 0, marginY: 0 },
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
        'tooltip.colorPicker': 'Werkzeugfarbe\nKlick: Farbwähler öffnen',
        'tooltip.hexColor': 'Waben-Farbwerkzeug\nKlick: Waben einfärben',
        'tooltip.fill': 'Fülleimer\nKlick: Zusammenhängende Fläche füllen\nErneut klicken: Fülleimer ausschalten',
        'tooltip.text': 'Text-Werkzeug\nKlick auf Karte: Neuen Text erstellen\nKlick auf Text: Text bearbeiten/verschieben',
        'tooltip.eraser': 'Radierer\nKlick: Wabeninhalt löschen\nDoppelklick: Zusammenhängendes löschen',
        'tooltip.undo': 'Rückgängig\nStrg+Z: Letzte Aktion rückgängig machen',
        'tooltip.redo': 'Wiederholen\nStrg+Y: Rückgängig gemachte Aktion wiederholen',
        'tooltip.fit': 'Karte einpassen\nKlick: Fenster mit gesamter Karte ausfüllen',
        'tooltip.palette': 'Farbpalette\nKlick: Farbe als Werkzeugfarbe übernehmen\nRechtsklick: Palettenfarbe ändern',
        'tooltip.toolGroup': '{name}\nKlick: Zeichnen\nRechtsklick: Variante wählen',
        'tooltip.toolGroupVariant': '{label}\nKlick: Zeichnen\nRechtsklick: Variante wählen',

        // Tooltips — Musterwerkzeug
        'tooltip.pattern': 'Muster-Werkzeug\nKlick: Mit aufgenommenem Muster zeichnen\nDoppelklick Radierer: Zusammenhängendes Muster löschen',
        'tooltip.patternPicker': 'Muster aufnehmen\nKlick: Wabe als Muster übernehmen',

        // Tooltips — Fluss/Weg
        'tooltip.river': 'Fluss-Werkzeug\nKlick: Wegpunkte setzen/verschieben\nKlick Radierer: Teilstück löschen\nDoppelklick Radierer: Ganzen Fluss löschen',
        'tooltip.road': 'Weg-Werkzeug\nKlick: Wegpunkte setzen/verschieben\nKlick Radierer: Teilstück löschen\nDoppelklick Radierer: Ganzen Weg löschen',
        'tooltip.pathPicker': 'Fluss/Weg aufnehmen\nKlick: Vorhandenen Fluss/Weg auswählen',
        'tooltip.pathFinish': 'Abschließen\nKlick: Aktuellen Fluss/Weg fertigstellen',
        'tooltip.roadFinish': 'Weg abschließen',
        'tooltip.riverFinish': 'Fluss abschließen',
        'input.riverWidth': 'Flussbreite',
        'input.roadWidth': 'Wegbreite',

        // Tooltips — Grenzen
        'tooltip.border': 'Grenz-Werkzeug\nKlick: Grenzwaben zeichnen\nDoppelklick Radierer: Zusammenhängende Grenze löschen',
        'tooltip.borderPicker': 'Grenzfarbe aufnehmen\nKlick: Vorhandene Grenze zum bearbeiten auswählen',
        'tooltip.borderFinish': 'Abschließen\nKlick: Aktuelle Grenze fertigstellen',
        'tooltip.borderVisibility': 'Grenzen-Sichtbarkeit\nKlick: Grenzen ein-/ausblenden',
        'input.borderPercent': 'Linienlänge %',
        'input.borderRepeats': 'Wiederholungen',

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
        'settings.donateText': 'Spendiere mir einen Kaffee. Ich freue mich darüber, Euch den Hexworld Editor kostenlos zur Verfügung zu stellen. Allerdings bedurfte die Entwicklung lange Zeit. Wenn mir etwas neues einfällt, wird es für Euch Updates geben. Ihr würdet mir eine große Freude bereiten, wenn ihr mir für diese Arbeit eine kleine Spende hinterlasst.',
        'settings.donateButton': 'Spende einen Kaffee',

        // Anleitung
        'guide.title': 'Kurzanleitung',
        'guide.basics': 'Grundlagen',
        'guide.basics.create': 'Rechtsklick auf einen Ordner in der Dateiübersicht → „Neue Hex World erstellen."',
        'guide.basics.editMode': 'Bearbeitungsmodus ein-/ausschalten.',
        'guide.navigation': 'Navigation',
        'guide.navigation.zoom': 'Mausrad = Zoom.',
        'guide.navigation.pan': 'Mittlere Maustaste oder Shift+Ziehen = Karte verschieben.',
        'guide.navigation.fit': 'Ganze Karte zeigen.',
        'guide.hexcolor': 'Wabenfarbe',
        'guide.hexcolor.paint': 'Farbe wählen und auf Waben klicken zum Einfärben.',
        'guide.hexcolor.palette': 'Rechtsklick auf Palettenplatz = Farbe speichern.',
        'guide.symbols': 'Symbole',
        'guide.symbols.groups': 'Werkzeuggruppe wählen (Extras, Vegetation, Berg, Gebäude).',
        'guide.symbols.variant': 'Rechtsklick = Auswahl der Symbolvariante.',
        'guide.symbols.colors': 'Die aktuelle Master-Farbe bestimmt die Symbolfarbe.',
        'guide.drawing': 'Zeichenmodi',
        'guide.drawing.pen': 'Zum Zeichnen klicken oder ziehen.',
        'guide.drawing.fill': 'Fläche mit aktiver Farbe oder Symbol füllen.',
        'guide.drawing.eraser': 'Feld, Symbol oder Weg-/Fluss-Abschnitt durch Klicken löschen (Doppelklick = zusammenhängende Elemente löschen).',
        'guide.pattern': 'Musterwerkzeug',
        'guide.pattern.stamp': 'Muster auf Waben setzen. Ziehen um mit Muster zu zeichnen.',
        'guide.pattern.pick': 'Vorhandenes Muster aufnehmen, um damit zu zeichnen.',
        'guide.paths': 'Flüsse & Wege',
        'guide.paths.river': 'Wegpunkte setzen für Flüsse.',
        'guide.paths.road': 'Wegpunkte setzen für Wege.',
        'guide.paths.pick': 'Bestehenden Fluss/Weg auswählen und bearbeiten.',
        'guide.paths.width': 'Breite der Flüsse/Wege über die Eingabefelder mit einem Wert anpassen.',
        'guide.borders': 'Grenzen',
        'guide.borders.draw': 'Grenzregion zeichnen durch Klicken oder Ziehen auf Waben.',
        'guide.borders.pick': 'Bestehende Grenze zum Bearbeiten auswählen.',
        'guide.borders.dash': 'Der erste Eingabewert steht für Linienlänge in % und bestimmt, ob eine Wabenkante durchgehend gezeichnet wird. Um eine gestrichelte Linie zu erzeugen, im ersten Wert unter 100% eingeben und den zweiten Wert auf einen Wert größer als 1 setzen, um die Anzahl der Wiederholungen anzugeben.',
        'guide.borders.visibility': 'Grenzen auf der Karte ein-/ausblenden.',
        'guide.text': 'Text',
        'guide.text.tool': 'Auf Karte klicken um Textinhalt, Größe, Farbe und Format einzustellen.<br>Erneut auf Text klicken, um ihn zu bearbeiten.<br>Zum Verschieben ziehen.',
        'guide.undoredo': 'Rückgängig / Wiederholen',
        'guide.undoredo.undo': 'Strg+Z = Rückgängig',
        'guide.undoredo.redo': 'Strg+Y = Wiederholen',
        'guide.touch': 'Infos für Benutzer mit Touch Screen',
        'guide.touch.tap': 'Tippen = Setzen, Platzieren, Auswählen.<br>Mit einem Finger streichen = Zeichnen.',
        'guide.touch.longpress': 'Langes Halten auf Werkzeug-Buttons = z.B. Symbolvariante wählen oder Palettenfarbe ändern.',
        'guide.touch.zoom': 'Zwei-Finger-Pinch = Zoom.',
        'guide.touch.pan': 'Zwei-Finger-Ziehen = Karte verschieben.',

        // Menü-Einträge
        'menu.createNew': 'Neue Hex World erstellen',
        'menu.openInEditor': 'Im Hex World Editor öffnen',
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
        'tooltip.colorPicker': 'Tool Color\nClick: Open color picker',
        'tooltip.hexColor': 'Hex Color Tool\nClick: Color hexes',
        'tooltip.fill': 'Fill Bucket\nClick: Fill connected area\nClick again: Turn off fill',
        'tooltip.text': 'Text Tool\nClick on map: Create new text\nClick on text: Edit/move text',
        'tooltip.eraser': 'Eraser\nClick: Delete hex content\nDouble-click: Delete connected area',
        'tooltip.undo': 'Undo\nCtrl+Z: Undo last action',
        'tooltip.redo': 'Redo\nCtrl+Y: Redo undone action',
        'tooltip.fit': 'Fit Map\nClick: Fit entire map to window',
        'tooltip.palette': 'Color Palette\nClick: Use color as tool color\nRight-click: Change palette color',
        'tooltip.toolGroup': '{name}\nClick: Draw\nRight-click: Choose variant',
        'tooltip.toolGroupVariant': '{label}\nClick: Draw\nRight-click: Choose variant',

        // Tooltips — Pattern tool
        'tooltip.pattern': 'Pattern Tool\nClick: Draw with picked pattern\nDouble-click Eraser: Delete connected pattern',
        'tooltip.patternPicker': 'Pick Pattern\nClick: Pick hex as pattern',

        // Tooltips — River/Road
        'tooltip.river': 'River Tool\nClick: Place/move waypoints\nClick Eraser: Delete segment\nDouble-click Eraser: Delete entire river',
        'tooltip.road': 'Road Tool\nClick: Place/move waypoints\nClick Eraser: Delete segment\nDouble-click Eraser: Delete entire road',
        'tooltip.pathPicker': 'Pick River/Road\nClick: Select existing river/road',
        'tooltip.pathFinish': 'Finish\nClick: Complete current river/road',
        'tooltip.roadFinish': 'Finish road',
        'tooltip.riverFinish': 'Finish river',
        'input.riverWidth': 'River width',
        'input.roadWidth': 'Road width',

        // Tooltips — Borders
        'tooltip.border': 'Border Tool\nClick: Draw border hexes\nDouble-click Eraser: Delete connected border',
        'tooltip.borderPicker': 'Pick Border Color\nClick: Select existing border to edit',
        'tooltip.borderFinish': 'Finish\nClick: Complete current border',
        'tooltip.borderVisibility': 'Border Visibility\nClick: Show/hide borders',
        'input.borderPercent': 'Line length %',
        'input.borderRepeats': 'Repetitions',

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
        'settings.donateText': 'Buy me a coffee. I am happy to provide the Hexworld Editor to you for free. However, the development took a long time. When I come up with something new, there will be updates. It would make me very happy if you leave a small donation for this work.',
        'settings.donateButton': 'Buy me a coffee',

        // Guide
        'guide.title': 'Quick Guide',
        'guide.basics': 'Basics',
        'guide.basics.create': 'Right-click a folder in the file explorer → "Create new Hex World."',
        'guide.basics.editMode': 'Toggle edit mode on/off.',
        'guide.navigation': 'Navigation',
        'guide.navigation.zoom': 'Mouse wheel = Zoom.',
        'guide.navigation.pan': 'Middle mouse button or Shift+Drag = Pan map.',
        'guide.navigation.fit': 'Fit entire map to view.',
        'guide.hexcolor': 'Hex Color',
        'guide.hexcolor.paint': 'Choose a color and click hexes to paint them.',
        'guide.hexcolor.palette': 'Right-click a palette slot = Save color.',
        'guide.symbols': 'Symbols',
        'guide.symbols.groups': 'Choose a tool group (Extras, Vegetation, Mountain, Building).',
        'guide.symbols.variant': 'Right-click = Select symbol variant.',
        'guide.symbols.colors': 'The current master color determines the symbol color.',
        'guide.drawing': 'Drawing Modes',
        'guide.drawing.pen': 'Click or drag to draw.',
        'guide.drawing.fill': 'Fill area with active color or symbol.',
        'guide.drawing.eraser': 'Delete hex or symbol (double-click = delete connected color area or symbols).',
        'guide.pattern': 'Pattern Tool',
        'guide.pattern.stamp': 'Place pattern on hexes. Drag to draw with pattern.',
        'guide.pattern.pick': 'Pick up an existing pattern to draw with.',
        'guide.paths': 'Rivers & Roads',
        'guide.paths.river': 'Place waypoints for rivers.',
        'guide.paths.road': 'Place waypoints for roads.',
        'guide.paths.pick': 'Select an existing river/road to edit.',
        'guide.paths.width': 'Adjust river/road width via the input fields.',
        'guide.borders': 'Borders',
        'guide.borders.draw': 'Draw border region by clicking or dragging on hexes.',
        'guide.borders.pick': 'Select an existing border to edit.',
        'guide.borders.dash': 'The first input value represents the line length in % and determines whether a hex edge is drawn continuously. To create a dashed line, enter a value below 100% in the first field and set the second value to greater than 1 to specify the number of repetitions.',
        'guide.borders.visibility': 'Show/hide borders on the map.',
        'guide.text': 'Text',
        'guide.text.tool': 'Click on map to set text content, size, color and format.<br>Click text again to edit.<br>Drag to move.',
        'guide.undoredo': 'Undo / Redo',
        'guide.undoredo.undo': 'Ctrl+Z = Undo',
        'guide.undoredo.redo': 'Ctrl+Y = Redo',
        'guide.touch': 'Touch Screen Users',
        'guide.touch.tap': 'Tap = Left click (draw, place, select).',
        'guide.touch.longpress': 'Long press on tool buttons = Right click (e.g. choose symbol variant or change palette color).',
        'guide.touch.zoom': 'Two-finger pinch = Zoom.',
        'guide.touch.pan': 'Two-finger drag = Pan map.',

        // Menu entries
        'menu.createNew': 'Create new Hex World',
        'menu.openInEditor': 'Open in Hex World Editor',
    }
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

// === Hauptklasse des Plugins ===
class HexWorldEditorPlugin extends Plugin {
    async onload() {
        currentLanguage = getObsidianLanguage();
        this.addSettingTab(new HexWorldEditorSettingTab(this.app, this));

        this.registerView('hexworld-editor', (leaf) => new HexWorldEditorView(leaf, this));

        this.registerExtensions(['hexworld.md'], 'hexworld-editor');

        // KRITISCH: Stelle sicher, dass .hexworld.md Dateien mit dem Editor geöffnet werden
        const originalOpenFile = this.app.workspace.openLinkText.bind(this.app.workspace);
        this.app.workspace.openLinkText = async (linktext, sourcePath, newLeaf, openViewState) => {
            if (linktext.endsWith('.hexworld.md') || linktext.includes('.hexworld.md')) {
                const file = this.app.metadataCache.getFirstLinkpathDest(linktext, sourcePath);
                if (file && file instanceof TFile) {
                    const leaf = this.app.workspace.getLeaf(newLeaf);
                    await leaf.openFile(file, {
                        ...openViewState,
                        state: { ...openViewState?.state, file: file.path }
                    });
                    if (leaf.view.getViewType() !== 'hexworld-editor') {
                        await leaf.setViewState({
                            type: 'hexworld-editor',
                            state: { file: file.path }
                        });
                    }
                    return;
                }
            }
            return originalOpenFile(linktext, sourcePath, newLeaf, openViewState);
        };

        this.registerEvent(
            this.app.workspace.on('file-open', async (file) => {
                if (!file || !file.path) return;

                if (file.path.endsWith('.hexworld.md')) {
                    await new Promise(resolve => setTimeout(resolve, 10));

                    const leaf = this.app.workspace.activeLeaf;
                    if (!leaf) return;

                    if (leaf.view.getViewType() === 'markdown') {
                        await leaf.setViewState({
                            type: 'hexworld-editor',
                            state: { file: file.path }
                        });
                    }
                }
            })
        );

        setTimeout(() => {
            this.hideHexworldExtensionInExplorer();
        }, 500);

        this.registerEvent(this.app.vault.on('rename', async (file, oldPath) => {
            if (oldPath.endsWith('.hexworld.md') && !file.path.endsWith('.hexworld.md')) {
                const newName = file.name.replace(/\.md$/, '') + '.hexworld.md';
                const newPath = file.parent ? `${file.parent.path}/${newName}` : newName;


                await this.app.fileManager.renameFile(file, newPath);
            } else if (file.path.endsWith('.hexworld.md')) {
                this.hideHexworldExtensionInExplorer();
            }
        }));

        this.addRibbonIcon('map', 'Create Hex World', async () => {
            await this.createNewHexWorld();
        });

        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                menu.addItem((item) => {
                    item
                        .setTitle(t('menu.createNew'))
                        .setIcon('map')
                        .setSection('create')
                        .onClick(async () => {
                            await this.createNewHexWorld(file);
                        });
                });
            })
        );

        this.registerEvent(this.app.vault.on('delete', (file) => {
            const leaves = this.app.workspace.getLeavesOfType('hexworld-editor');
            leaves.forEach(leaf => {
                if (leaf.view instanceof HexWorldEditorView && leaf.view.file && leaf.view.file.path === file.path) {
                    if (leaf.view.saveTimeout) clearTimeout(leaf.view.saveTimeout);
                    leaf.detach();
                }
            });
        }));

        this.registerEvent(this.app.vault.on('modify', (file) => {
            const leaves = this.app.workspace.getLeavesOfType('hexworld-editor');
            leaves.forEach(leaf => {
                const view = leaf.view;
                if (view instanceof HexWorldEditorView && view.file && view.file.path === file.path) {
                    if (!view.isSaving) {
                        view.reloadFile();
                    }
                }
            });
        }));

        this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
            const leaves = this.app.workspace.getLeavesOfType('hexworld-editor');
            leaves.forEach((leaf) => {
                const view = leaf.view;
                if (view instanceof HexWorldEditorView && view.file && view.file.path === oldPath) {
                    view.file = file;
                    leaf.updateHeader();

                    setTimeout(() => {
                        const activeLeaf = this.app.workspace.activeLeaf;
                        if (activeLeaf === leaf) {
                            const tabHeaderEl = document.querySelector('.workspace-tabs.mod-active .workspace-tab-header.is-active .workspace-tab-header-inner-title');
                            if (tabHeaderEl) {
                                tabHeaderEl.innerText = file.basename;
                            }
                        }
                    }, 10);
                }
            });
        }));

        this.registerEvent(this.app.workspace.on('file-open', (file) => {
            if (!file || file.extension !== 'hexworld') return;

            const leaves = this.app.workspace.getLeavesOfType('hexworld-editor');
            leaves.forEach((leaf) => {
                const view = leaf.view;
                if (view instanceof HexWorldEditorView && view.file && view.file.path === file.path) {
                    view.reloadFile();
                }
            });
        }));
    }

    async createNewHexWorld(targetFile = null) {
        const fileName = `HexWorld_${Date.now()}.hexworld.md`;

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
                activeColorSlot: 1,
                drawMode: 'pen',
                currentToolGroup: null,
                patternData: null,
                patternSourceHex: null
            }
        };

        try {
            const now = new Date().toISOString().split('T')[0];
            const frontmatter = `---\ntype: hexworld\ncreated: ${now}\n---\n\n`;
            const jsonData = JSON.stringify(initialData, null, 2);
            const content = `${frontmatter}# ${fileName.replace('.hexworld.md', '')}\n\n\`\`\`json\n${jsonData}\n\`\`\`\n`;

            const file = await this.app.vault.create(filePath, content);
            const leaf = this.app.workspace.getLeaf('tab');
            await leaf.setViewState({
                type: 'hexworld-editor',
                active: true,
                state: { file: file.path }
            });
        } catch (err) {
            new Notice(t('notice.fileCreateError', { error: err }));
        }
    }

    hideHexworldExtensionInExplorer() {
        const hideExtension = () => {
            const fileElements = document.querySelectorAll('.nav-file-title[data-path$=".hexworld.md"]');
            fileElements.forEach(el => {
                const titleEl = el.querySelector('.nav-file-title-content');
                if (titleEl && titleEl.textContent.includes('.hexworld')) {
                    titleEl.textContent = titleEl.textContent.replace('.hexworld', '');
                }

                if (!el.classList.contains('hexworld-file')) {
                    el.classList.add('hexworld-file');
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

}

// === View-Klasse für den Hex World Editor ===
class HexWorldEditorView extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
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
        this.borderSettings = { percent: DEFAULT_BORDER_PERCENT, repeats: DEFAULT_BORDER_REPEATS, activeRegionId: null, pickedHex: null, visible: true };
        this.borderHighlightWidth = DEFAULT_BORDER_HIGHLIGHT_WIDTH;
        this.borderPickMode = false;
        this.riverSettings = { width: DEFAULT_RIVER_WIDTH, activeRiverId: null, editMode: false, insertAfter: null };
        this.roadSettings = { width: DEFAULT_ROAD_WIDTH, activeRoadId: null, editMode: false, insertAfter: null };
        this.pathPickMode = false;
        this.lastToolGroup = null;
        // Wie weit Pfad-Endpunkte ins Hex reichen: 0 = Hex-Rand, 1 = Hex-Zentrum
        this.pathEndInset = PATH_END_INSET;
        this.riverDragIndex = null;
        this.roadDragIndex = null;
        this.lastWaypointClick = null;
        this.pendingHistory = false;

        this.masterColor = DEFAULT_MASTER_COLOR;
        this.hexColorColor = DEFAULT_HEX_COLOR;

        this.colorPalette = [...DEFAULT_PALETTE];
        this.colorPalette2 = [...DEFAULT_PALETTE2];
        this.activeColorSlot = 1; // Standardfarbe: Grün

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
                    { id: 'cross', label: t('variant.cross'), icon: 'x' }
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

    getViewType() { return 'hexworld-editor'; }
    getDisplayText() {
        if (!this.file) return 'Hex World Editor';
        return this.file.basename.replace('.hexworld', '');
    }
    getState() { return { file: this.file ? this.file.path : null }; }

    getIcon() { return 'map'; }

    onPaneMenu(menu, source) {
        if (source === 'more-options') {
            menu.addItem((item) => {
                item.setTitle(t('menu.openInEditor'))
                    .setIcon('map')
                    .onClick(async () => {
                    });
            });
        }
        super.onPaneMenu(menu, source);
    }

    async loadSVGSymbols() {
        for (const [key, data] of Object.entries(SVG_SYMBOL_DATA)) {
            this.svgSymbols[key] = { pathData: data.pathData, viewBoxWidth: data.viewBoxWidth };
        }

        const symbolsDir = '.obsidian/plugins/hexworld-editor/symbols';
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

                const existingLeaves = this.app.workspace.getLeavesOfType('hexworld-editor');
                const existingLeaf = existingLeaves.find(leaf => {
                    const view = leaf.view;
                    return view !== this && view instanceof HexWorldEditorView &&
                           view.file && view.file.path === file.path;
                });

                if (existingLeaf) {
                    const existingParent = existingLeaf.parent;
                    const newParent = this.leaf.parent;

                    if (existingParent === newParent) {
                        await super.setState(state, result);
                        setTimeout(() => {
                            this.app.workspace.setActiveLeaf(existingLeaf, { focus: true });
                            this.leaf.detach();
                        }, 10);
                        return;
                    }
                }
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

                if (this.canvas && Object.keys(this.data.hexes).length > 0) {
                    setTimeout(() => {
                        this.fitMapToView();
                    }, 100);
                } else if (this.canvas) {
                    this.render();
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
            console.error("HexWorld Sync Fehler:", e);
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

        if (hexes.length === 0 && texts.length === 0) {
            new Notice(t('notice.noHexesToShow'));
            return;
        }

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        hexes.forEach(hex => {
            const pos = this.hexToPixel(hex);
            const s = this.data.gridSize;

            minX = Math.min(minX, pos.x - s);
            maxX = Math.max(maxX, pos.x + s);
            minY = Math.min(minY, pos.y - s);
            maxY = Math.max(maxY, pos.y + s);
        });

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
        const newZoom = Math.min(zoomX, zoomY, MAX_ZOOM);

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
        const editModeBtn = toolbar.createEl('button', { cls: 'hex-tool-btn', attr: { title: t('tooltip.editMode') } });
        setIcon(editModeBtn, 'wrench');
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

        masterColorBtn.onclick = () => masterColorInput.click();
        this.makeInputInteractive(masterColorBtn);
        masterColorInput.oninput = (e) => {
            this.masterColor = e.target.value;
            masterColorBtn.style.backgroundColor = this.masterColor;
            this.updateActivePathColor();
        };
        masterColorInput.addEventListener('change', () => {
            this.requestSave();
        });

        editContent.createEl('span', { cls: 'hex-toolbar-sep', text: '\u200B' });

        this.createColorPalette(editContent);
        
        editContent.createEl('span', { cls: 'hex-toolbar-sep', text: '\u200B' });

        const hexColorBtn = editContent.createEl('button', { cls: 'hex-tool-btn', attr: { title: t('tooltip.hexColor') } });
        hexColorBtn.dataset.toolGroup = 'hexcolor';
        setIcon(hexColorBtn, 'hexagon');
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

        const textBtn = editContent.createEl('button', { cls: 'hex-tool-btn', attr: { title: t('tooltip.text') } });
        textBtn.dataset.toolGroup = 'text';
        setIcon(textBtn, 'type');
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

        const undoBtn = editContent.createEl('button', { cls: 'hex-tool-btn', attr: { title: t('tooltip.undo') } });
        setIcon(undoBtn, 'undo-2');
        undoBtn.onclick = () => this.undo();

        const redoBtn = editContent.createEl('button', { cls: 'hex-tool-btn', attr: { title: t('tooltip.redo') } });
        setIcon(redoBtn, 'redo-2');
        redoBtn.onclick = () => this.redo();

        const fitBtn = toolbar.createEl('button', { cls: 'hex-tool-btn', attr: { title: t('tooltip.fit') } });
        setIcon(fitBtn, 'maximize-2');
        fitBtn.onclick = () => this.fitMapToView();

        this.updateToolbarState(toolbar);
    }

    createDrawModeButton(toolbar, mode, icon, title) {
        const btn = toolbar.createEl('button', { cls: 'hex-tool-btn', attr: { title } });
        btn.dataset.drawMode = mode;
        setIcon(btn, icon);
        btn.onclick = () => {
            if (mode === 'eraser' && (this.patternPickMode || this.pathPickMode || this.borderPickMode)) return;
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
        const btn = btnWrapper.createEl('button', {
            cls: 'hex-tool-btn',
            attr: {
                title: t('tooltip.toolGroup', { name: config.name }),
                style: `position: relative; background: ${config.backgroundEnabled ? config.backgroundColor : '#ffffff'};`
            }
        });
        btn.dataset.toolGroup = groupId;

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

        const patternBtn = wrapper.createEl('button', {
            cls: 'hex-tool-btn',
            attr: { title: t('tooltip.pattern') }
        });
        patternBtn.dataset.toolGroup = 'pattern';
        setIcon(patternBtn, 'copy');

        patternBtn.onclick = () => {
            if (!this.patternData) {
                new Notice(t('notice.noPattern'));
                return;
            }
            this.exitPathEditMode();
            this.currentToolGroup = 'pattern';
            this.drawMode = 'pen'; // Automatisch in Zeichenmodus wechseln
            this.updateToolbarState(toolbar);
            this.render(); // Sofort rendern, um Muster-Wabe anzuzeigen
            this.requestSave();
        };

        const pickerBtn = wrapper.createEl('button', {
            cls: 'hex-tool-btn',
            attr: { title: t('tooltip.patternPicker'), style: 'width: 24px; padding: 2px;' }
        });
        setIcon(pickerBtn, 'pipette');

        pickerBtn.onclick = () => {
            const wasActive = this.patternPickMode;
            this.exitPathEditMode();
            this.patternPickMode = !wasActive;
            pickerBtn.style.background = this.patternPickMode ? 'var(--interactive-accent)' : '';
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
        const bgPicker = bgRow.createEl('input', { type: 'color', value: config.backgroundColor || '#ffffff' });

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
                if (this.currentToolGroup === 'pattern' || this.patternPickMode || this.pathPickMode || this.borderPickMode) {
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

            btn.oncontextmenu = (e) => {
                e.preventDefault();
                hiddenInput.click();
            };

            let longPressTimer = null;
            btn.addEventListener('touchstart', (e) => {
                longPressTimer = setTimeout(() => {
                    e.preventDefault();
                    hiddenInput.click();
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

        const riverBtn = topRow.createEl('button', { cls: 'hex-tool-btn', attr: { title: t('tooltip.river') } });
        this.riverBtn = riverBtn;
        riverBtn.dataset.toolGroup = 'river';
        setIcon(riverBtn, 'waves');
        riverBtn.onclick = () => {
            const needsRender = this.currentToolGroup === 'pattern' || this.borderSettings.pickedHex;
            this.exitPathEditMode();
            this.currentToolGroup = 'river';
            this.drawMode = 'pen';
            this.updateToolbarState(toolbar);
            if (needsRender) this.render();
            this.requestSave();
        };

        const roadBtn = topRow.createEl('button', { cls: 'hex-tool-btn', attr: { title: t('tooltip.road') } });
        this.roadBtn = roadBtn;
        roadBtn.dataset.toolGroup = 'road';
        setIcon(roadBtn, 'route');
        roadBtn.onclick = () => {
            const needsRender = this.currentToolGroup === 'pattern' || this.borderSettings.pickedHex;
            this.exitPathEditMode();
            this.currentToolGroup = 'road';
            this.drawMode = 'pen';
            this.updateToolbarState(toolbar);
            if (needsRender) this.render();
            this.requestSave();
        };

        const pickerBtn = topRow.createEl('button', { cls: 'hex-tool-btn', attr: { title: t('tooltip.pathPicker') } });
        setIcon(pickerBtn, 'mouse-pointer');
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
                if (this.patternPickerBtn) { this.patternPickerBtn.style.background = ''; }
                this.borderPickMode = false;
                if (this.borderPickerBtn) { this.borderPickerBtn.style.background = ''; this.borderPickerBtn.style.color = ''; }
            }
            this.drawMode = 'pen';
            pickerBtn.style.background = this.pathPickMode ? 'var(--interactive-accent)' : '';
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

        setTimeout(() => {
            riverWidthInput.style.width = `${riverBtn.offsetWidth}px`;
            roadWidthInput.style.width = `${roadBtn.offsetWidth}px`;
        }, 0);
    }

    handleWaypointClick(path, settings, clickedIdx) {
        const now = Date.now();
        const isDouble = this.lastWaypointClick &&
                         this.lastWaypointClick.pathId === path.id &&
                         this.lastWaypointClick.idx === clickedIdx &&
                         (now - this.lastWaypointClick.time) < 400;
        if (isDouble) {
            const wp = path.waypoints[clickedIdx];
            path.waypoints.push({ q: wp.q, r: wp.r });
            settings.insertAfter = path.waypoints.length - 1;
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
            this.pathPickerBtn.style.background = '';
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
            this.pathPickerBtn.style.background = '';
            this.pathPickerBtn.style.color = '';
            this.pathPickerBtn.setAttribute('title', t('tooltip.pathPicker'));
        }
        this.pathPickMode = false;
        this.patternPickMode = false;
        if (this.patternPickerBtn) {
            this.patternPickerBtn.style.background = '';
        }
        this.borderPickMode = false;
        if (this.borderPickerBtn) {
            this.borderPickerBtn.style.background = '';
            this.borderPickerBtn.style.color = '';
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

        const btn = topRow.createEl('button', { cls: 'hex-tool-btn', attr: { title: t('tooltip.border') } });
        this.borderBtn = btn;
        btn.dataset.toolGroup = 'border';
        setIcon(btn, 'shield');

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

        const pickerBtn = topRow.createEl('button', { cls: 'hex-tool-btn', attr: { title: t('tooltip.borderPicker') } });
        setIcon(pickerBtn, 'mouse-pointer');
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
            pickerBtn.style.background = this.borderPickMode ? 'var(--interactive-accent)' : '';
            pickerBtn.style.color = this.borderPickMode ? 'var(--text-on-accent)' : '';
            this.updateToolbarState(toolbar);
        };

        const visBtn = topRow.createEl('button', { cls: 'hex-tool-btn', attr: { title: t('tooltip.borderVisibility') } });
        setIcon(visBtn, this.borderSettings.visible ? 'eye' : 'eye-off');
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

        const percentInput = inputRow.createEl('input', {
            type: 'number',
            value: this.borderSettings.percent.toString(),
            attr: { title: t('input.borderPercent'), min: '0', max: '100', style: `height: ${TOOLBAR_INPUT_HEIGHT}; font-size: ${TOOLBAR_INPUT_FONT_SIZE}; padding: 2px; box-sizing: border-box;` }
        });
        this.makeInputInteractive(percentInput);
        this.borderPercentInput = percentInput;
        percentInput.oninput = (e) => {
            if (e.target.value.length > 3) e.target.value = e.target.value.slice(0, 3);
            const val = parseInt(e.target.value);
            this.borderSettings.percent = Math.max(0, Math.min(100, isNaN(val) ? 100 : val));
            e.target.value = this.borderSettings.percent;
            const region = this.data.borders && this.data.borders.find(r => r.id === this.borderSettings.activeRegionId);
            if (region) region.percent = this.borderSettings.percent;
            this.render();
        };

        const repeatsInput = inputRow.createEl('input', {
            type: 'number',
            value: this.borderSettings.repeats.toString(),
            attr: { title: t('input.borderRepeats'), min: '1', max: '999', style: `height: ${TOOLBAR_INPUT_HEIGHT}; font-size: ${TOOLBAR_INPUT_FONT_SIZE}; padding: 2px; box-sizing: border-box;` }
        });
        this.makeInputInteractive(repeatsInput);
        this.borderRepeatsInput = repeatsInput;
        repeatsInput.oninput = (e) => {
            if (e.target.value.length > 3) e.target.value = e.target.value.slice(0, 3);
            this.borderSettings.repeats = Math.min(999, Math.max(1, parseInt(e.target.value) || 1));
            e.target.value = this.borderSettings.repeats;
            const region = this.data.borders && this.data.borders.find(r => r.id === this.borderSettings.activeRegionId);
            if (region) region.repeats = this.borderSettings.repeats;
            this.render();
        };

        setTimeout(() => {
            percentInput.style.width = `${btn.offsetWidth}px`;
            repeatsInput.style.width = `${pickerBtn.offsetWidth}px`;
        }, 0);
    }

    makeInputInteractive(input) {
        input.addEventListener('mousedown', (e) => e.stopPropagation());
        input.addEventListener('keydown', (e) => e.stopPropagation());
        input.addEventListener('pointerdown', (e) => e.stopPropagation());
    }

    recalcToolbarWidths() {
        if (this.riverBtn && this.roadBtn && this.riverWidthInput && this.roadWidthInput) {
            this.riverWidthInput.style.width = `${this.riverBtn.offsetWidth}px`;
            this.roadWidthInput.style.width = `${this.roadBtn.offsetWidth}px`;
        }
        if (this.borderBtn && this.borderPickerBtn && this.borderPercentInput && this.borderRepeatsInput) {
            this.borderPercentInput.style.width = `${this.borderBtn.offsetWidth}px`;
            this.borderRepeatsInput.style.width = `${this.borderPickerBtn.offsetWidth}px`;
        }
    }

    updateToolbarState(toolbar) {
        if (this.editModeBtn) this.editModeBtn.classList.toggle('active', this.editMode);
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
                this.pathPickerBtn.style.background = 'var(--interactive-accent)';
                this.pathPickerBtn.style.color = 'var(--text-on-accent)';
                this.pathPickerBtn.setAttribute('title', t('tooltip.pathFinish'));
            } else if (!this.pathPickMode) {
                setIcon(this.pathPickerBtn, 'mouse-pointer');
                this.pathPickerBtn.style.background = '';
                this.pathPickerBtn.style.color = '';
                this.pathPickerBtn.setAttribute('title', t('tooltip.pathPicker'));
            }
        }

        if (this.borderPickerBtn) {
            if (this.borderSettings.activeRegionId !== null) {
                setIcon(this.borderPickerBtn, 'check');
                this.borderPickerBtn.style.background = 'var(--interactive-accent)';
                this.borderPickerBtn.style.color = 'var(--text-on-accent)';
                this.borderPickerBtn.setAttribute('title', t('tooltip.borderFinish'));
            } else if (!this.borderPickMode) {
                setIcon(this.borderPickerBtn, 'mouse-pointer');
                this.borderPickerBtn.style.background = '';
                this.borderPickerBtn.style.color = '';
                this.borderPickerBtn.setAttribute('title', t('tooltip.borderPicker'));
            }
        }

        if (this.borderPercentInput) this.borderPercentInput.value = this.borderSettings.percent.toString();
        if (this.borderRepeatsInput) this.borderRepeatsInput.value = this.borderSettings.repeats.toString();

        toolbar.querySelectorAll('[data-draw-mode]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.drawMode === this.drawMode);
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

            btn.style.background = config.backgroundEnabled ? config.backgroundColor : '#ffffff';
            btn.style.color = config.symbolColor;

            btn.style.border = isActive ? '3px solid #4A9EFF' : '';
            btn.style.boxShadow = isActive ? ACTIVE_BOX_SHADOW : '';
        });

        toolbar.querySelectorAll('[data-tool-group]').forEach(btn => {
            const groupId = btn.dataset.toolGroup;
            if (!['grass', 'tree', 'mountain', 'building'].includes(groupId)) {
                const isActive = btn.dataset.toolGroup === this.currentToolGroup;
                btn.classList.toggle('active', isActive);
                if (groupId === 'hexcolor') {
                    btn.style.background = '#ffffff';
                    btn.style.border = isActive ? '3px solid #4A9EFF' : '';
                    btn.style.boxShadow = isActive ? ACTIVE_BOX_SHADOW : '';
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

            this.pendingHistory = true;
            this.isMouseDown = true;
            this.mouseDownPos = { x: world.x, y: world.y };
            this.startHex = this.pixelToHex(world.x, world.y);
            this.lastHex = this.startHex;

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
                    this.patternPickerBtn.style.background = '';
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
                    this.borderSettings.percent = foundRegion.percent !== undefined ? foundRegion.percent : 100;
                    this.borderSettings.repeats = foundRegion.repeats !== undefined ? foundRegion.repeats : 1;
                    this.masterColor = foundRegion.color;
                    if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                    if (this.borderPercentInput) {
                        this.borderPercentInput.value = this.borderSettings.percent.toString();
                    }
                    if (this.borderRepeatsInput) {
                        this.borderRepeatsInput.value = this.borderSettings.repeats.toString();
                    }
                    new Notice(t('notice.borderSelected', { id: foundRegion.id }));
                } else {
                    new Notice(t('notice.noBorderAtPosition'));
                }
                this.borderPickMode = false;
                if (this.borderPickerBtn) {
                    this.borderPickerBtn.style.background = '';
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

        this.canvas.addEventListener('dblclick', (e) => {
            if (!this.editMode || this.drawMode !== 'eraser') return;
            const world = this.getWorldCoords(e);
            const hex = this.pixelToHex(world.x, world.y);
            if (this.history.length > 0) this.history.pop();
            this.handleEraserFlood(hex);
            this.render();
            this.requestSave();
        });

        this.containerEl.addEventListener('mousemove', (e) => {
            const world = this.getWorldCoords(e);
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
                            new TextInputModal(this.app, (v, s, l, c, o, b, sh, shd, sho) => {
                                if (v) {
                                    hitText.text = v; hitText.size = s; hitText.link = l;
                                    hitText.color = c; hitText.outline = o; hitText.bold = b;
                                    hitText.shadow = sh; hitText.shadowDistance = shd; hitText.shadowOpatown = sho;
                                }
                                else { this.data.texts = this.data.texts.filter(t => t !== hitText); }
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
            const newZoom = oldZoom * zoomFactor;

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
                                this.patternPickerBtn.style.background = '';
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
                                this.borderSettings.percent = foundRegion.percent !== undefined ? foundRegion.percent : 100;
                                this.borderSettings.repeats = foundRegion.repeats !== undefined ? foundRegion.repeats : 1;
                                this.masterColor = foundRegion.color;
                                if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                                if (this.borderPercentInput) this.borderPercentInput.value = this.borderSettings.percent.toString();
                                if (this.borderRepeatsInput) this.borderRepeatsInput.value = this.borderSettings.repeats.toString();
                                new Notice(t('notice.borderSelected', { id: foundRegion.id }));
                            } else {
                                new Notice(t('notice.noBorderAtPosition'));
                            }
                            this.borderPickMode = false;
                            if (this.borderPickerBtn) { this.borderPickerBtn.style.background = ''; this.borderPickerBtn.style.color = ''; }
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
                const newZoom = this.touchState.initialZoom * zoomFactor;

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
                            this.patternPickerBtn.style.background = '';
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
                            this.borderSettings.percent = foundRegion.percent !== undefined ? foundRegion.percent : 100;
                            this.borderSettings.repeats = foundRegion.repeats !== undefined ? foundRegion.repeats : 1;
                            this.masterColor = foundRegion.color;
                            if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                            if (this.borderPercentInput) this.borderPercentInput.value = this.borderSettings.percent.toString();
                            if (this.borderRepeatsInput) this.borderRepeatsInput.value = this.borderSettings.repeats.toString();
                            new Notice(t('notice.borderSelected', { id: foundRegion.id }));
                        } else {
                            new Notice(t('notice.noBorderAtPosition'));
                        }
                        this.borderPickMode = false;
                        if (this.borderPickerBtn) { this.borderPickerBtn.style.background = ''; this.borderPickerBtn.style.color = ''; }
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
                                new TextInputModal(this.app, (v, s, l, c, o, b, sh, shd, sho) => {
                                    if (v) {
                                        hitText.text = v; hitText.size = s; hitText.link = l;
                                        hitText.color = c; hitText.outline = o; hitText.bold = b;
                                        hitText.shadow = sh; hitText.shadowDistance = shd; hitText.shadowOpatown = sho;
                                    }
                                    else { this.data.texts = this.data.texts.filter(t => t !== hitText); }
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
                }, '', this.lastUsedTextSize, '', this.lastUsedTextColor, this.lastUsedTextOutline, this.lastUsedTextBold, this.lastUsedTextShadow, this.lastUsedTextShadowDistance, this.lastUsedTextShadowOpatown, this.colorPalette, this.colorPalette2).open();
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
            region = { id: maxId + 1, color: this.masterColor, percent: this.borderSettings.percent, repeats: this.borderSettings.repeats, hexes: [] };
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
        if (!road) {
            const maxId = this.data.roads.reduce((max, r) => Math.max(max, r.id || 0), 0);
            road = { id: maxId + 1, color: this.masterColor, width: this.roadSettings.width, waypoints: [] };
            this.data.roads.push(road);
            this.roadSettings.activeRoadId = road.id;
            this.roadSettings.editMode = true;
            this.roadSettings.insertAfter = null;
            if (this.pathPickerBtn) {
                setIcon(this.pathPickerBtn, 'check');
                this.pathPickerBtn.style.background = 'var(--interactive-accent)';
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
        if (!river) {
            const maxId = this.data.rivers.reduce((max, r) => Math.max(max, r.id || 0), 0);
            river = { id: maxId + 1, color: this.masterColor, width: this.riverSettings.width, waypoints: [] };
            this.data.rivers.push(river);
            this.riverSettings.activeRiverId = river.id;
            this.riverSettings.editMode = true;
            this.riverSettings.insertAfter = null;
            if (this.pathPickerBtn) {
                setIcon(this.pathPickerBtn, 'check');
                this.pathPickerBtn.style.background = 'var(--interactive-accent)';
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

        this.drawRivers();

        drawSymbolLayer(['question', 'exclamation', 'cross']);

        this.drawRoads();

        drawSymbolLayer(['swamp','grass', 'bush', 'tree', 'pine', 'palm']);

        drawSymbolLayer(['hill', 'mountain']);

        drawSymbolLayer(['tent', 'house', 'village', 'town', 'castle', 'harbor', 'monastery', 'tower', 'ruin', 'cave', 'oasis']);

        this.drawBorders();

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

        this.renderTexts();
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

            const percent = region.percent !== undefined ? region.percent : 100;
            const repeats = region.repeats !== undefined ? region.repeats : 1;

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

                        if (percent >= 100 && repeats <= 1) {
                            this.ctx.beginPath();
                            this.ctx.moveTo(p1.x, p1.y);
                            this.ctx.lineTo(p2.x, p2.y);
                            this.ctx.stroke();
                        } else {
                            const dx = p2.x - p1.x;
                            const dy = p2.y - p1.y;
                            const segLen = 1.0 / repeats;
                            const drawFrac = (percent / 100) * segLen;

                            for (let r = 0; r < repeats; r++) {
                                const startFrac = r * segLen;
                                const endFrac = startFrac + drawFrac;

                                this.ctx.beginPath();
                                this.ctx.moveTo(p1.x + dx * startFrac, p1.y + dy * startFrac);
                                this.ctx.lineTo(p1.x + dx * endFrac, p1.y + dy * endFrac);
                                this.ctx.stroke();
                            }
                        }
                    }
                }
            });
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
                this.drawPathChains(river);
            }

            if (this.riverSettings.editMode && river.id === this.riverSettings.activeRiverId) {
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
        });
    }

    drawRoads() {
        if (!this.data.roads) return;
        this.data.roads.forEach(road => {
            if (!road.waypoints || road.waypoints.length === 0) return;

            if (road.waypoints.length >= 2) {
                this.drawPathChains(road);
            }

            if (this.roadSettings.editMode && road.id === this.roadSettings.activeRoadId) {
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
        });
    }

    drawPathChains(path) {
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
            for (let i = 0; i < chain.length - 1; i++) {
                const pathSegs = this.calculateHexPath(chain[i], chain[i + 1], path.width);
                segments.push(...pathSegs);
            }
            const startKey = `${chain[0].q}_${chain[0].r}`;
            const endKey = `${chain[chain.length - 1].q}_${chain[chain.length - 1].r}`;
            const trimStart = segCount[startKey] === 1;
            const trimEnd = segCount[endKey] === 1;
            this.drawWavyLines(segments, path.color, path.width, trimStart, trimEnd);
        });
    }

    drawWavyLines(lines, color, defaultWidth, trimStart, trimEnd) {
        if (!lines || lines.length === 0) return;
        this.ctx.strokeStyle = color;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";

        lines.forEach((l, idx) => {
            let p1 = this.hexToPixel(l.from), p2 = this.hexToPixel(l.to);
            this.ctx.lineWidth = l.width || defaultWidth;

            const inset = (1 - this.pathEndInset) * 0.5;
            if (trimStart && idx === 0) {
                p1 = { x: p1.x + (p2.x - p1.x) * inset, y: p1.y + (p2.y - p1.y) * inset };
            }
            if (trimEnd && idx === lines.length - 1) {
                p2 = { x: p2.x + (p1.x - p2.x) * inset, y: p2.y + (p1.y - p2.y) * inset };
            }

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            const segments = Math.max(3, Math.floor(dist / 8));
            const nx = -dy / dist;
            const ny = dx / dist;

            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);

            for (let i = 1; i <= segments; i++) {
                const t = i / segments;
                const px = p1.x + dx * t;
                const py = p1.y + dy * t;

                const seedHash = Math.abs(l.from.q * 7 + l.from.r * 13 + l.to.q * 11 + l.to.r * 17 + i * 3);
                const seed = seedHash % 10;
                const direction = (i % 2 === 0 ? 1 : -1);
                const amplitude = (this.data.gridSize * 0.15) * ((seed - 5) / 5) * direction;

                if (i === segments) {
                    this.ctx.lineTo(p2.x, p2.y);
                } else {
                    const cpx = px + nx * amplitude;
                    const cpy = py + ny * amplitude;
                    const nextT = (i + 0.5) / segments;
                    const nextX = p1.x + dx * nextT;
                    const nextY = p1.y + dy * nextT;

                    this.ctx.quadraticCurveTo(cpx, cpy, nextX, nextY);
                }
            }

            this.ctx.stroke();
        });
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
                    hexColorColor: this.hexColorColor
                };

                const now = new Date().toISOString().split('T')[0];
                const frontmatter = `---\ntype: hexworld\ncreated: ${now}\n---\n\n`;
                const jsonData = JSON.stringify(this.data, null, 2);
                const title = this.file.basename.replace('.hexworld', '');
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
        const colorInput = colorSection.createEl('input', { type: 'color', value: this.color });
        colorInput.style.width = '100%';
        colorInput.style.height = '40px';
        colorInput.style.cursor = 'pointer';

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
                    colorInput.value = color;
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

        const btnRow = contentEl.createDiv({ style: 'display: flex; gap: 10px; margin-top: 25px; padding-top: 15px; border-top: 1px solid var(--background-modifier-border);' });
        const okBtn = btnRow.createEl('button', { text: 'OK', cls: 'mod-cta', style: 'flex: 1;' });
        okBtn.onclick = () => {
            const opatownValue = shadowOpatownInput.value === '' ? 0 : parseInt(shadowOpatownInput.value);
            const clampedOpatown = Math.max(0, Math.min(100, opatownValue));
            const shadowEnabled = clampedOpatown === 0 ? false : shadowInput.checked;

            this.onSubmit(
                mainInput.value,
                parseInt(sInput.value),
                linkDisplay.value,
                colorInput.value,
                outlineInput.checked,
                boldInput.checked,
                shadowEnabled,
                parseInt(shadowDistanceInput.value) || DEFAULT_SHADOW_DISTANCE,
                clampedOpatown
            );
            this.close();
        };

        const deleteBtn = btnRow.createEl('button', { text: t('modal.deleteText'), style: 'flex: 1; color: var(--text-error);' });
        deleteBtn.onclick = () => {
            if (confirm(t('modal.confirmDeleteText'))) {
                this.onSubmit('', 0, '', '', false, false, false, 0, 0);
                this.close();
            }
        };

        mainInput.focus();
    }
}


class HexWorldEditorSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Hexworld Editor' });

        new Setting(containerEl)
            .setDesc(t('settings.donateText'))
            .addButton(btn => {
                btn.setButtonText(t('settings.donateButton'))
                    .setCta()
                    .onClick(() => {
                        window.open('https://ko-fi.com/christophwerner', '_blank');
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
    'town': { pathData: 'M144.52,164.25c1.4,2.35,4.7,2.75,6.67,4.64,4.67,4.49,2.9,10.42,3.2,16.24l-14.07,1.88c-1.44.34-3.86,2.12-4.77,2.15-1.91.07-4.38-2.9-5.95-3.32-3.07-.81-6.06,1.99-8.86,3.05-2.18.82-12.4,3.65-12.96,5.1l.49,7.96c7.12-4.26,15.25-5.79,22.91-8.69-1.43,3.89-1.15,7.43-1.23,11.52-3.63,1.38-7.47,2.3-11.09,3.7-2.45.94-4.6,2.5-7.13,3.31-2.93.93-11.77,1.95-12.77-1.65-1.4-5.04-.54-14.77-3.52-19.05-1.38-1.97-8.47-4.36-10.47-3.77-2.97.87-7.6,4.07-10.8,5.47-2.48,1.08-15.41,5.76-16.05,7.15l5.8,5.79c3.22,4.41,3.41,16.05,2.28,21.42-.87,4.16-9.93,12.12-13.33,15.09-1.74,1.53-1.04,2.82-4.31,3.22-8.23,1-7.76-5.97-8.97-11.93l-15.89-2.01c-1.1.28-8.43,18.28-8.51,20.9,2.59-.08,5.21.14,7.8-.03,1.04-.07,1.84-1.02,2.9-1.06.85-.03,5.9.65,6.45,1.05.44.31,4.33,6.25,4.6,7,.75,2.03.55,6.53,1.15,7.55.32.54,1.71.97,2.35,1.71,3.99,4.63,8.5,12.57,13.4,15.6,1.7,1.05,4.13,1.38,5.97,2.73,2.08,1.53,2.27,3.39,3.54,4.59.6.57,1.61.53,2.32,1.3.67.73,2.56,9.7,2.81,11.53.2,1.46-.27,5.24.16,5.93,2.11,3.4,13.05-2.84,16.15-3.66,6.97-1.83,15.18,3.84,21.71,6.1,8.73,3.02,18.34,4.35,26.03,9.93,6.74,4.9,3.33,19.94,7.12,23.04,4.33,3.54,15.68,4.88,21.1,7.02-.05-1.38-.07-2.73.26-4.09,1.04-4.26,9.63-9.39,13.35-12.16,1.17-.87,2.04-2.31,3.24-3.14,5.82-4,10.51-.32,16.5.25,8.23.78,16.91-.48,25.44.66,3.17.42,20.56,3.87,22.36,4.9.29.16,4.72,4.06,4.94,4.34,3.25,4,.2,15.67,2.31,20.89.21.3,6.09,1.52,7.06,1.64,3.78.48,10.7.9,14.43.63,3.89-.28,7.32-2.13,11.31,0-.49-7.4.11-11.3,4.93-16.83,3.68-4.22,5.24-5.4,11.01-5.81,11.07-.8,23.23,1.19,34.82.02,6.91-.7,14.98-5.21,21.95-.48,2.79,1.9,9.12,12.55,9.61,15.91.24,1.59-.04,3.28.05,4.88,9.98-2.62,20.21-2.62,30.36-4.03l.41-.38c1.25-10.4-5.69-18.34,4.66-25.4,6.35-4.33,11.18-3.13,18.07-4.55,8.53-1.76,27.22-8.06,34.86-3.83,1.46.81,3.18,2.87,4.83,3.87,6.07,3.71,11.77,4.39,11.21,13.44,2.54,1.08,17.62-5.86,18.28-6.94,1.5-2.47-2.09-8.59-2.05-11.88.02-1.97,1.46-6.79,2.96-8.1,4.86-4.24,20.08-8.58,26.85-12.01,4.36-2.21,16.41-11.04,20.29-10.77,1.11.08,2.09,1.05,3.26.98,0-1.91.81-3.47,2.75-3.97,4.06.26,5.55,4.7,6.55,8.02,4.73-.32,2.4-5.37,2.53-8.31.12-2.75.76-10.58,2.7-12.27.63-.55,2.07-.74,2.21-.97.66-1.06-.56-6.79,2.83-8.32l-4.53-9.88c.9-4.75,4-13.09,3.2-17.75-.31-1.8-2.78-4.35-3.17-6.31l-1.73,1.74c-.21-1.27.58-2.5.53-3.71-.24-5.03-9.93-20.67-12.83-26.04s-5.31-11.09-8.86-16.08c-2.85-4.01-4.71-9.15-7.84-13.04-.18-.8.04-1.09.85-.85,2.22.66,5.53,3.25,8.02,4.16,2.97,1.08,6.13,1.02,8.93,2.67,8.58,5.06,7.99,15.62,8.95,24.4,3.35.75,5.38,2.09,6.66,5.34,4.36-.35,7.56-3.71,11.98-2.81s12.64,14.47,16.36,18.43c2.02,2.15,7.41,5.52,7.8,7.85-.4,7.14-.98,14.28-1.75,21.38-.55,5.09.1,5.59.09,9.91-.02,11.06-1.14,22.82-1.23,34.24-.2,25.14,1.64,52.82.6,77.69-2.13,50.86-77.19,81.57-118.31,93.96-74.41,22.43-154.49,26.32-231.7,21.17-2.43-.16-10.97-1.8-12.49-.87-.69.42-.89,2.15-2.09,3.12-.72.58-7.85,3.8-8.6,3.87-2.61.24-3.87-1.65-6.1-2.36-25.91-3.86-52.43-12.12-78.21-15.74-4.77-.67-7.33.77-11.42.39-7.31-.67-7.53-6.67-7.33-12.68-32.11-11.31-68.3-26.21-91.28-52.27-24.94-28.29-17.33-64.4-17.08-99.45.13-18.94-2.22-35.62-2.92-53.97-.35-9.09,4.13-22.46,7.83-31.01,1.7-3.92,6.5-14.4,10.68-15.42,7.39-1.79,9.06,5.82,16.28,4.39.75-5.57-1.55-12.16-.45-17.56.13-.65,3.95-7.43,4.5-8.1,5.15-6.27,24.73-12.9,32.88-16.58,7.12-3.22,9.96-7.46,18.38-4.09,3.52,1.41,7.23,4.34,9.41,7.42,7.96-3.23,16.19-5.66,23.73-9.8,1.92-5.96-1.98-15.43,5.48-18.3,8.79-3.38,20.53-2.98,29.46-6.5l27.96-5.38-8.7,13.05-35.38,6.68ZM142.61,176.02c-.25-.33-5.95-3.94-6.2-3.65-1.36,6.64,2.89,6.77,7.53,9.28.46-.63-.78-4.92-1.33-5.62ZM55.66,213.08c-.17-.3-4.07-2.87-4.8-3.07-1.31-.36-2.42-.11-3.7.13-.85,3.02-1.74,13.95,1.09,15.3,1.36.65,6.3.23,7.25-.87,1.21-1.39.9-10.18.17-11.48ZM576.03,236.16l-10.46-13.65-6.36.89,7.51,13.63,9.3-.88ZM578.94,246.6c-4.49-.88-8.63,1.67-12.76.58l-1.74,11.02c4.87-5.84,7.61-3.78,13.91-2.32l.59-9.28ZM24.75,262.84c-3.58.37-7.67-.27-11.31,0-.85,8.23,9.01,4.12,13.92,4.05l-.58-4.63c-.85-.34-1.62.54-2.03.58ZM580.58,265.84l-8.61.18-6.95,11.89c5.87.39,9.68,5.11,14.17-.61,3.04-3.87,3.93-6.95,1.39-11.46ZM49.4,293.01c-2.47-1.15-6.32-4.07-8.14-6.07-2.65-2.92-3.88-7.91-7.93-10.07-.72-.21-10.41.84-11.38,1.16-.56.18-1.33,1.66-2.1,2.05l.1,40.36,16.99,14.33c3.25-5.51-.41-4.44-1.96-7.32-1.29-2.4-1.76-12.3-1.84-15.56-.32-13.37,4.06-14.3,15.42-17.7.82-.25,1.02.36.84-1.16ZM569.07,295.32l-.56-5.53-8.13-2.01c.33.99.33,3.96.69,4.53.23.36,7.39,3.62,8.01,3.01ZM58.11,311.56c-.33-1.69.84-8.14-.95-8.66-1.13-.33-13,3.06-13.46,4.4l.49,8.32c.56.62,11.55-5.4,13.92-4.06ZM114.36,405.81v-12.76c0-.23,1.94-3.63,2.31-4.07,2.99-3.63,9.74-4.94,14.21-4.33l86.73,17.67c2.29.67,4.92,2.14,6.28,4.16.79,1.18,5.31,12.77,5.31,13.83v31.03c11.15,1.63,25.86-5.58,28.19,10.48,8.8.5,17.87.03,26.64.52,1.95.11,6.13.44,7.82.88,7.12,1.82,3.38,15.85,5.29,17.04,39.51.1,79.42-2.96,118.34-9.96,8.3-1.49,16.57-3.19,24.78-5.09.93-5.69-1.9-17,2.14-21.35,1.21-1.3,6.16-4.04,7.95-4.81,6.29-2.69,20.35-7.92,26.79-8,2.81-.03,8.02,1.09,9.49,3.84.31.58,1.81,6.41,1.81,6.89v8.41c20.04-6.77,39.42-16.48,56.54-28.96-.63-4.32-.06-8.73-.29-13.08-.11-2.02-1.04-4.39-1.14-6.4-.31-6.09,2.8-18.06,6.71-22.85,1.78-2.18,5.84-4.54,6.5-7.42,2.31-10.14-3.73-22.02,4.5-31.46,1.62-1.85,3.27-3.7,4.9-5.54,1.32-1.5,8.7-8.16,8.7-9.28v-9.57c-3.06,4.8-8.22,6.73-12.19,10.14-1.92,1.65-3.67,5.03-6.11,5.49-1.07.2-3.03-.27-3.66.11-.17.1-.61,2-1.52,2.83-2.78,2.55-7.49,1.28-8.62-2.43-1.82-5.94,1.4-18.86-1.3-23.64-.91-1.61-3.43-2.37-3.15-4.69-4.34.15-7.07,3.29-10.23,5.13-8.37,4.86-17.08,9.27-26.3,12.28,1.4,2.44,4.78,2.46,6.68,4.04,4.89,4.04,2.29,11.13,2.57,16.57.32,6.23,4.23,14.59-3.32,18.1-7.59,3.52-16.62,5.56-24.49,7.99-5.83,1.8-11.08,5.51-17.16,6.63-2.67.49-5.86-.38-6.51-3.28-.49-2.18.44-3.61.33-5.09-.23-3.3-1.4-6.56-1.64-9.84-.34-4.58.4-9.51-.1-14.11-3.18-.69-7.5-5.28-9.76-6.18-6.01-2.41-21.25,2.54-27.66,4.19l-12.91,1.3c-1.34,1.27,8.16,10.39,7.49,13.1-.72,7.74,1.36,16.17.65,23.75-.4,4.28-2.2,6-6.26,7.08-7.28,1.95-17.01,2.34-24.85,3.57-6.81,1.07-13.22.99-19.68,1.78-1.72.21-2.82,1.3-4.61,1.22-3.91-.17-5.16-3.3-5.52-6.72-.75-7.2.93-19.7-1.86-25.98-.4-.91-4.05-6.84-4.53-7.07-3.64-1.77-11.77,2.2-15.96,2.61-10.82,1.05-22.27-.82-33-.52-3.64.1-5.6,2.52-7.29,5.47-1.58,9.4,2.42,23.6.44,32.34-.45,1.98-4.33,5.65-6.53,5.65-2.42,0-6.16-.99-8.72-1.17-13.78-.97-28.74-1.26-42.33-2.91-3.42-.42-8.92-2.04-9.55-6.11-1.51-9.85-1.07-21.27-2.36-31.28.22-4.24,4.42-6.23,6.97-8.99-7.19-1.43-14.35-3.12-21.73-3.51-8.05-.42-16.18,1.12-23.98-1.61l-1.24.17-12.1,9.99c-.16,2.46-.24,4.98-.14,7.44.21,5.6,4.22,21.12-3.88,22.75-11.23,2.26-34.69-9.56-46.52-12.95-2.12-.61-4.58-.2-6.83-1.29-5.17-2.5-3.27-8.61-3.65-13.17-.55-6.46-2.36-13.95-1.76-20.33.37-3.91,3.15-6.41,5.83-8.96-5.89.24-22.56-9.61-26.73-8.98-.73.11-5.72,2.2-6.57,2.67-.55.31-.71,1.15-1.13,1.46-1.18.87-2.85.58-3.26,2.83.44,5.65-1.65,13.06-.58,18.53.52,2.68,5.39,2.04,6.25,5.93.8,3.64,1.07,12.39.73,16.15-.23,2.5-.89,3.96-3.5,4.65-1.24.33-6.49-1.33-7.96-1.94-2.67-1.12-4.98-3.14-7.7-4.18-.53,6.86,1.24,21.62-10.05,16.14l-34.03-20.77c-.07,3.57.26,7.17.58,10.72,1.37,14.92,3.63,25.8,13.62,37.42,10.95,12.74,25.79,22.48,40.6,30.16,1.29.15.71-.16.85-.88,2.3-11.49-1.63-21.09,15.68-14.21-.57-4.22-.21-10.42.72-14.65.66-3.02,3.23-5.29,6.47-5.05,3.67.27,10.91,3.94,14.84,4.95l1.18-.62ZM552.84,320.26c5.01-4.92,11.6-7.1,15.07-13.63,0-.47-7.02-2.7-7.7-2.53-.76.19-1.63,1.59-2.51,2.16s-4.85,2.38-4.85,3.85v10.15ZM65.64,323.74c-1.39.18-2.61-1.69-3.67-1.63-.88.05-2.69,1.48-4.24,1.61s-2.7-.59-3.86-.45c-.49.06-3.01.94-2.74,1.91.09.32,4.71,2.71,5.75,3.53,2.76,2.18,4.76,5.67,8.75,6.04v-11.02ZM500.64,332.44l-3.48-1.16c.49,3.81-1.98,9.12,3.48,9.28v-8.12ZM126.54,331.86l-7.54,3.89,1.75,17.57c.38.39,7.1-6.89,7.42-7.96l-1.63-13.5ZM19.82,334.18v10.73l2.36,2.28,30.42,18.88c1.29.19.68-.19.85-.87.65-2.66.63-5.42.64-8.14l-.14-.75c-4.99-1.92-8.83-6.54-14.42-6.75l-19.71-15.38ZM47.67,335.34v5.5s22.88,13.68,22.88,13.68c2.74,1.87,2.17-2.99.91-3.81-.78-.51-2.45-.21-3.72-.92s-1.59-2.22-2.69-3.11c-2.23-1.8-6.83-3.11-9.56-4.94s-4.77-4.74-7.81-6.39ZM567.34,350.13c.14,3.28-.1,6.58,0,9.86,1.46,2.15,6.24,1.8,7.15-.43,1.69-4.12-.92-13.74-.2-18.42l-7.26,6.4c-.9.99.28,2.12.3,2.59ZM498.89,351.01c-3.15.44-8.27-4.45-10.59-3.99-1.31.26-5.91,3.42-7.98,4.26-3.35,1.35-7.46,2.36-11.03,2.89-1.36.86.98,5.64.61,7.28.55.53,7.96-3.18,9.4-3.65,3.61-1.18,7.49-1.45,11.05-2.87l8.55-3.91ZM161.26,363.84l-25.79-8.77c-2.85-.37-4.09,3.8-6.02,5.51l31.63,11.28c1.15.14.74.02.85-.85.29-2.25-.93-4.81-.67-7.17ZM236.15,374.77c.15-1.93,2.58-3.3,2.89-4.94.78-4.03-1.49-10.35-.57-14.78l-4.54,3.31c.73,4.53.49,9.19,1.14,13.73.09.64.21,2.71,1.08,2.67ZM555.74,411.32c12.78-10.43,18.78-26.62,18.55-42.92l-5.2,6.68c-3.38,3.26-7.81,6.66-10.99,9.89-5.09,5.16-1.5,19.65-2.36,26.35ZM401.46,375.94c-2-8.23-5.41-5.06-11.31-4.64-4.05.29-8.64-.01-12.69.65s-7.71,2.89-11.95,2.26v5.81c2.53-.17,5.3.26,7.78-.05,5.13-.65,11.65-2.73,16.93-3.37,3.58-.43,7.56.2,11.25-.64ZM281.87,377.2c-5.72-1.77-11.6-.5-17.61-.66-3.34-.09-7.48-.44-10.93-.67-3.73-.24-4.48-2.4-7.58,2.42-2.49,3.86,1.4,5.29,4.69,5.69,9.18,1.12,19.09.99,28.36,1.83,4.97-.37,4.11-4.98,3.07-8.61ZM139.3,403.2c-4.57-1.34-7.39-.37-8.12,4.63.39.39,8.86-3.9,8.12-4.63ZM131.18,414.8v8.7l27.85-15.37c0-.65-9.36-2.66-10.6-1.9l-17.24,8.57ZM168.88,410.16l-37.7,21.17v10.15l37.7-22.04v-9.28ZM212.38,442.06v-8.41c0-1.88-27.94-18.01-31.33-20.87l-5.52-.91.3,9.02,36.55,21.16ZM114.36,428.72v-9.57c-3.88-2.61-7.73-4.82-12.44-5.52-2.04,3.49.25,6.92-.65,10.49l13.09,4.61ZM212.38,425.24c1.26-7.38-7.66-7.2-12.75-8.11l12.75,8.11ZM168.88,439.16v-12.76l-37.7,22.04v9.28l37.7-18.56ZM175.26,428.14v10.73l36.27,18.84c1.17.16.75-.04.85-.85.2-1.49.28-6.6-.57-7.56l-36.55-21.16ZM114.36,453.08v-12.47l-27.51-10.12c-.64.31-.8.76-.91,1.42-.23,1.38-.77,8.79-.29,9.58,9.2,4.63,18.88,8.5,28.71,11.59ZM450.76,451.05v11.31l27.5-8.05-.24-12.83c-6.04-.22-10.4,2.63-15.49,4.52-2.16.81-11.19,3.03-11.77,5.05ZM168.88,446.12l-37.13,18.26c-1.53,5.54-1.34,12.9,5.4,6.56l31.73-13.8v-11.02ZM175.26,446.7v11.6l36.32,13.86c1.1.26.71-.01.8-.8.15-1.31.22-5.06-.29-6.1l-36.83-18.56ZM229.2,461.78v15.08l16.82,1.74c-.82-5.95,1.93-11.59.57-17.39l-17.39.57ZM168.88,464.1l-24.36,10.45c.1.9.86.89,1.5,1.1,1.33.42,13.07,2.55,13.76,2.42.48-.1.76-1.48,1.56-2.06,1.88-1.37,5.3-2.93,7.54-3.78v-8.12ZM212.38,487.3l-.57-8.42-36.55-13.62.12,7.42c5.05,2.22,9.96,8.33,14.64,10.58,3.2,1.54,14.73,3.36,18.75,3.87,1.21.15,2.4.25,3.61.16ZM286.04,472.79l-29.59-.58v6.97s29.59,1.16,29.59,1.16v-7.55ZM251.82,99.57c.42-2.35,3.41-4.77,5.65-5.37,6.95-1.87,17.19-2.59,24.63-3.79,2.23-.36,4.32-1.12,6.52-1.57,2.8,1.49,15.4,9.16,15.4,11.89v12.47c2.22-.06,4.38-.77,6.51-1.32,6.35-1.64,15.66-5.4,21.67-6.16,3.26-.42,4.31-.21,6.29,2.31,5.11,6.5,12.33,20.29,16.67,27.99,6.03,10.72,11.34,21.9,17.2,32.73.84,4.84-8.71,8.83-12.66,8.27.33,10.09,2.51,19.91,4.54,29.73-3.39,3.13-6.46,10.99-9.51,13.73-1.53,1.38-4.61.87-5.23,1.73l-.25,6.42-4.63-.58c.04-2.27-.21-7.18,1.11-9.03,1.6-2.22,10.97-2.58,11.1-3.49l-7.26-37.22c-4.52,1.74-10.73-.9-14.98,0-2.54.53-7.25,4.43-10.11,5.54-3.03,1.18-10.55,2.64-13.87,2.95-5.79.53-11.97-.34-17.79.19-1.82.55-2.68,4.9-4.2,6.24-2.8,2.47-20.01,3.64-24.62,4.67l1.46,54.52,2.3-1.75c.14-15.69-1.82-31.51-2.03-47.27.28-2.38,1.16-3.33,3.32-4.22,5.37-2.19,22.97-4.44,29.54-5.26,2.68-.33,7.08-1.68,7.74,1.96l2.33,33.92,9.46-1.09c5.73,6.44-5.26,3.81-8.48,5.71-.38.22-2.65,5.01-4.46,5.24l-2.39-37.94-.59-2c-4.58-1.29-3.54,3.99-3.43,7.19.26,7.5,1.28,15.11,1.76,22.6.36,5.67.15,11.47.84,17.15l2.67,2.07c-.03,1.34.3,2.83-.56,4.02-.36.5-9.76,6.15-10.46,6.36-2.42.73-5.8.11-8.36.18l-.85-.89-1.19-10.88-4.33-.25-.85,1.22c.9,2.08.42,6.84-1,8.53-.66.79-8.31,3.94-9.66,4.26-8.89,2.11-8.23-3.92-12.07-9.76l2.32.29v-17.69l-.96-.78c-2.73-.65-9.84-.08-11.77-1.57-1.54-1.18-5.53-9.01-4.67-11.28-3.03.77-3.08-2.46-4.64-4.35,4.32-1.24,8.5.76,12.78.62.75-.5-.04-6.66-.57-7.03l-12.16.39-1.21,4.58-3.39-6.77c-.06-.68.53-1.29,1.02-1.67,1.09-.86,8.14-1.39,10.17-1.44,2.34-.06,8.19-.48,9.55,1.53,1.55,2.28,1.37,11.41,1.79,11.85h3.48v-19.43c0-.51-3.03-1.73-3.49-2.47l-33.06-61.62-1.64.96-25.5,40.65c1.44,3.21.46,5.11.44,7.96-.02,3.97.08,7.95.02,11.91l-3.46-4.36c-1.23-1.14-5.56-3.42-6.1-4.34-.72-1.22.23-3.67-.83-4.39-3.51-.89-9.78.37-9.94-4.62-.09-2.73,1.83-3.08,3.19-4.96,12.95-17.9,24.86-36.67,39.79-53.01,9.14-.32,18.41-.6,27.56-.32,2.58.08,6.14,1.78,8.39-.27.76-6.06-1.02-14.57,0-20.3ZM259.94,105.08v10.15c2.92,1.93,6.36,2.99,9.86,2.61l-.66-9.2-9.2-3.56ZM295.9,106.24c-4.7,1.28-12.1,1.4-16.42,3.01-1.32.49-1,1.86-1.01,3.08-.03,2.33.79,4.36.62,6.67,5.43-1.2,12.02-1.16,16.82-3.77v-8.99ZM341.72,142.78c4.56,5.8,8.98,11.77,13.23,17.8,1.81,2.57,4.92,10.58,8.21,7.44l-29.85-53.08c-1.93-1.75-11.17,2.26-13.96,2.88l29.58,51.69c.94.93,6.06.85,6.12-.33-5.33-8.25-9.1-17.52-13.32-26.39ZM344.04,170.62l-29.85-51.1-4.94,1.51,4.04,8.99-7.65-8-6.27,1.05,30.15,48.47c4.84-2.66,9.32-.43,14.51-.92ZM294.63,124.93c-.76-.45-11.37,1.21-12.91,1.64-.63.18-1.07.17-1.46.84l31.6,50.17c1.34,1.35,3.22-.23,4.92,0l-3.47-9.86c3.9,1.94,8.25,12.26,12.12,5.6l-30.8-48.4ZM245.73,128.28h-10.15l4.05,12.18-9.52-11.64-4.39-1.12.27,1.75c11.42,18.19,19.91,40.6,31.51,58.39.5.77,1.86,2.71,2.7,2.84,2.76.42,8.63-2.38,11.92-1.5l-6.37-14.5c2.56,1.73,9.1,12.27,11.03,13.07.73.3,4.82-.19,4.56-1.67l-35.6-57.79ZM289.81,178.74c3.91-.69,11.81,0,16.24,0,.05,0,1.38,1.4.86-.28-.19-.61-1.09-1.88-1.49-2.57-9.25-15.98-20.33-31-29.57-47.01l-1.09-.95c-2.09.71-4.33.63-6.4.95s-.06,1.63.59,2.87c2.78,5.32,5.23,10.84,7.81,16.26l-14.74-18.6c-1.34-.88-6.49-.63-8.58-.71-.6-.02-.81-.78-1.59.46l32.47,53.65c2.32-.61,2.58-3.54,5.5-4.06ZM292.21,200.27c-1.48.49-.99,4.64-.94,6.02.47,12.11,1.94,27.94,3.48,40.02.21,1.64.51,5.54,2.6,5.53,2.47,0,2.11-3.92,2.05-5.55-.47-12.58-2.1-27.93-3.51-40.57-.29-2.6-.18-6.62-3.69-5.45ZM288.41,256.4c1.26.26,3.11.15,3.73-1.1l-4.39-50.72c-.21-1.22-1.05-3.07-2.49-3.11-1.66.27-2.08,1.5-2.13,3.07l5.28,51.86ZM256.46,228.62l-.55-5.55c-4.9.28-13.35-5.78-11.64,2.94.57,2.91,9.63,2.69,12.19,2.6ZM425.82,163.37c.42-2.35,3.41-4.77,5.65-5.37,6.95-1.87,17.19-2.59,24.63-3.79,2.23-.36,4.32-1.12,6.52-1.57,2.8,1.49,15.4,9.16,15.4,11.89v12.47c2.22-.06,4.38-.77,6.51-1.32,6.4-1.66,15.04-5.15,21.18-6.07,3.8-.57,4.77-.4,7.01,2.57,5.28,7,11.94,19.63,16.44,27.64,6.11,10.85,11.63,22.11,17.29,33.2-1.19,5.73-7.82,7.36-12.78,8.11.62,14.95,4.86,29.28,8.14,43.75-3.13-1.1-6.32,2.84-8.4,2.93-1.91.08.06-2.85-1.84-3.46l-7.77,1.38c-1.69,1.75.54,5.72-.54,6.96-.71.81-9.31,5.72-10.91,6.53-7.7,3.9-21.17,7.31-27.55,11.74-.77.53-1,1.85-2.19,2.6-6.72,4.27-13.83,7.99-20.46,12.4l-4.35-3.19c-.71-2.05-.23-11.48-1.64-11.81l-4.59.58-.31,7.49-16.18.64c1.22-4.27,1.27-6.28-.3-10.43-.78-2.05-3.06-4.87-3.5-6.36-.5-1.7.09-3.67-.33-4.89-.45-1.29-2.33-.59-3.13-1.51-.63-.72-.62-3.05-2.02-3.78l4.64-.28-.25-5.26c-4.45-1.32-8.98-.35-10.2-6.04l2.3-1.24-.8-6.06c-4.33-1-7.26.5-8.45-5.18h9.57c4.43,0,3.87,10.25,4.35,13.34h3.48v-19.43c0-.51-3.03-1.73-3.49-2.47l-33.06-61.62c-.88-.21-.93.13-1.41.61-1.46,1.46-4.91,7.62-6.36,9.88-5.31,8.22-10.55,16.59-15.66,24.94-1.42,2.31-3.28,4.9-3.82,7.49-3.16-4.44-8.43-6.31-12.11-10.23,10.9-16.25,22.38-32.24,35.33-46.89,9.14-.32,18.41-.6,27.56-.32,2.58.08,6.14,1.78,8.39-.27.76-6.06-1.02-14.57,0-20.3ZM433.94,168.88v10.15c2.92,1.93,6.36,2.99,9.86,2.61l-.66-9.2-9.2-3.56ZM469.9,170.04c-4.7,1.28-12.1,1.4-16.42,3.01-1.32.49-1,1.86-1.01,3.08-.03,2.33.79,4.36.62,6.67,5.43-1.2,12.02-1.16,16.82-3.77v-8.99ZM515.72,206.58c4.56,5.8,8.98,11.77,13.23,17.8,1.81,2.57,4.92,10.58,8.21,7.44l-29.85-53.08c-1.93-1.75-11.17,2.26-13.96,2.88l29.58,51.69c.94.93,6.06.85,6.12-.33-5.37-8.24-9.11-17.51-13.32-26.39ZM518.04,234.42l-29.85-51.1-4.94,1.51,4.04,8.99-7.65-8-6.27,1.05,30.15,48.47c4.84-2.66,9.32-.43,14.51-.92ZM468.62,188.73c-.76-.45-11.37,1.21-12.91,1.64-.63.18-1.07.17-1.46.84l31.6,50.17c1.34,1.35,3.22-.23,4.92,0l-3.47-9.86c3.9,1.94,8.25,12.26,12.12,5.6l-30.8-48.4ZM419.73,192.08h-10.15l4.05,12.18-9.52-11.64-4.39-1.12.27,1.75c11.42,18.19,19.91,40.6,31.51,58.39.5.77,1.86,2.71,2.7,2.84,2.76.42,8.63-2.38,11.92-1.5l-6.37-14.5c2.56,1.73,9.1,12.27,11.03,13.07.73.3,4.82-.19,4.56-1.67l-35.6-57.79ZM480.92,242.54l-32.16-50.82c-2.09.71-4.33.63-6.4.95s-.06,1.63.59,2.87c2.78,5.32,5.23,10.84,7.81,16.26l-14.74-18.6c-1.34-.88-6.49-.63-8.58-.71-.6-.02-.81-.78-1.59.46l32.47,53.65c1,.73,3.17-4.06,5.5-4.06h17.11ZM530.78,279.64l-7.21-37.53c-4.63,1.72-10.54-.94-14.97,0-2.54.54-7.25,4.43-10.11,5.54s-10.26,2.64-13.29,2.95c-4.78.48-14.7-.92-18.38.18-1.81.55-2.63,4.8-4.06,6.09-3.01,2.7-19.97,3.75-24.76,4.82l.68,53.56,1.34.96,2.03-2.62-2.34-45.83c-.06-2.56,1.09-3.87,3.34-4.78,5.38-2.19,22.96-4.44,29.54-5.26,2.68-.33,7.08-1.68,7.74,1.96l2.33,33.92c7.31-.59,12.26-4.15,11.02,6.38l25.45-7.29c-2.67-10.77,2.57-11.9,11.65-13.03ZM476.2,263.5l-3.15.46c-.97,3.37.18,7.01.32,10.19.5,11.04.31,24.64,1.8,35.34.24,1.75.76,2.41,2.58,2.63,1.66-.07,2.07-2.44,2.03-3.73-.2-7.1-1.29-14.39-1.76-21.5-.2-3.1-.53-22.6-1.82-23.4ZM466.2,264.07c-1.48.49-.99,4.64-.94,6.02.47,12.11,1.94,27.94,3.48,40.02.21,1.64.51,5.54,2.6,5.53,2.47,0,2.11-3.92,2.05-5.55-.47-12.58-2.1-27.93-3.51-40.57-.29-2.6-.18-6.62-3.69-5.45ZM462.41,320.2c1.26.26,3.11.15,3.73-1.1l-4.39-50.72c-.21-1.22-1.05-3.07-2.49-3.11-1.66.27-2.08,1.5-2.13,3.07l5.28,51.86ZM489.03,297.65l-5.73.63-.06,4.58,6.13-1.7-.34-3.51ZM135.82,198.17c.42-2.35,3.41-4.77,5.65-5.37,6.95-1.87,17.19-2.59,24.63-3.79,2.23-.36,4.32-1.12,6.52-1.57,2.8,1.49,15.4,9.16,15.4,11.89v12.47c2.22-.06,4.38-.77,6.51-1.32,5.18-1.34,20.43-6.78,24.55-6.25,1.92.25,2.56,1.32,3.64,2.75,5.23,6.93,11.97,19.69,16.44,27.64,5.89,10.46,10.99,21.4,16.86,31.88,1.86,5.63-7.74,9.46-12.31,9.12l1.74,15.9-6.4,10.19c-1.38.18-.92.02-1.21-.8-2.44-6.85-2.26-15.96-3.5-23.18l-.76-.81c-4.52,1.74-10.73-.9-14.98,0-2.54.53-7.25,4.43-10.11,5.54-3.03,1.18-10.55,2.64-13.87,2.95-5.79.53-11.97-.34-17.79.19-1.82.55-2.68,4.9-4.2,6.24-2.8,2.47-20.01,3.64-24.62,4.67l.58,46.4c-6.73-.2-5.05-7.12-5.96-11.73-1.51-7.67-2.98-12.04-10.57-15.5l-.54-7.03c-.57-.84-4.09-.62-5.29-.57-2.45.11-7.24.09-8.06,2.27l-3.83-1.43c-.22-2.1.17-3.82,2.19-4.75,3.86.28,15.88-2.26,18.43.46,1.79,1.9,1.57,9.4,2.03,12.18h3.48v-19.43c0-.62-3.07-1.4-3.4-2.4l-33.15-61.68-1.64.96-25.5,40.65c1.44,3.2.46,5.12.44,7.96-.04,6.88.3,13.78-.24,20.64l-2.63,1.13-1.88-11.18c-1.39-4.81-6.09-5.91-5.34-11.48-.75-1.07-10-.16-10.25-4.89-.14-2.66,1.88-3.14,3.2-4.98,12.94-17.9,24.86-36.67,39.79-53.01,9.14-.32,18.41-.6,27.56-.32,2.58.08,6.14,1.78,8.39-.27.76-6.06-1.02-14.57,0-20.3ZM143.94,203.68v10.15c2.92,1.93,6.36,2.99,9.86,2.61l-.66-9.2-9.2-3.56ZM179.9,204.84c-4.7,1.28-12.1,1.4-16.42,3.01-1.32.49-1,1.86-1.01,3.08-.03,2.33.79,4.36.62,6.67,5.43-1.2,12.02-1.16,16.82-3.77v-8.99ZM225.73,241.38c4.56,5.8,8.98,11.77,13.23,17.8,1.81,2.57,4.92,10.58,8.21,7.44l-29.85-53.08c-1.93-1.75-11.17,2.26-13.96,2.88l29.58,51.69c.94.93,6.06.85,6.12-.33-5.33-8.25-9.1-17.52-13.32-26.39ZM228.04,269.21l-29.85-51.1-4.94,1.51,4.04,8.99-7.65-8-6.27,1.05,30.15,48.47c4.84-2.66,9.32-.43,14.51-.92ZM178.63,223.52c-.76-.45-11.37,1.21-12.91,1.64-.63.18-1.07.17-1.46.84l31.6,50.17c1.34,1.35,3.22-.23,4.92,0l-3.47-9.86c3.9,1.94,8.25,12.26,12.12,5.6l-30.8-48.4ZM129.73,226.88h-10.15l4.05,12.18-9.52-11.64-4.39-1.12.27,1.75c11.42,18.19,19.91,40.6,31.51,58.39.5.77,1.86,2.71,2.7,2.84,2.76.42,8.63-2.38,11.92-1.5l-6.37-14.5c2.56,1.73,9.1,12.27,11.03,13.07.73.3,4.82-.19,4.56-1.67l-35.6-57.79ZM173.81,277.34c3.91-.69,11.81,0,16.24,0,.05,0,1.38,1.4.86-.28-.19-.61-1.09-1.88-1.49-2.57-9.25-15.98-20.33-31-29.57-47.01l-1.09-.95c-2.09.71-4.33.63-6.4.95s-.06,1.63.59,2.87c2.78,5.32,5.23,10.84,7.81,16.26l-14.74-18.6c-1.34-.88-6.49-.63-8.58-.71-.6-.02-.81-.78-1.59.46l32.47,53.65c2.32-.61,2.58-3.54,5.5-4.06ZM309.82,244.57c.42-2.35,3.41-4.77,5.65-5.37,6.95-1.87,17.19-2.59,24.63-3.79,2.23-.36,4.32-1.12,6.52-1.57,2.8,1.49,15.4,9.16,15.4,11.89v12.47c2.22-.06,4.38-.77,6.51-1.32,5.18-1.34,20.43-6.78,24.55-6.25,1.92.25,2.56,1.32,3.64,2.75,5.23,6.93,11.97,19.69,16.44,27.64,5.89,10.46,10.99,21.4,16.86,31.88,1.86,5.63-7.75,9.46-12.31,9.12v2.32s-8.97,1.17-8.97,1.17l-1.15-2.19c-4.46,1.7-10.32-.74-14.49-.1-2.72.42-7.36,4.33-10.18,5.47-3.23,1.31-11.24,2.88-14.8,3.18-4.98.41-12.34-.84-16.8.02-2.43.47-2.15,3.48-3.58,3.96s-4.33-.09-6.22.16c-8.13,1.09-14.6,2.59-23.24,2.86-1.89.06-7.66.36-8.74-.6l-31.61-58.58-1.64.96-25.5,40.65c1.72,5.84-.13,12.01.47,18.13-2.05-.75-2.87-2.75-4.43-3.97-1.38-1.08-5.19-2.24-5.35-2.48-.55-.87.6-4.08-.62-4.89-2.67-.76-8.58.07-9.64-3.12-1.27-3.82,1.18-4.11,2.88-6.46,12.87-17.8,24.74-36.36,39.46-52.76.49-.49,1.1-.49,1.74-.58,6.46-.86,18.62-.19,25.58,0,1.4.04,8.96,1.6,8.96-.26.76-6.06-1.02-14.57,0-20.3ZM317.94,250.08v10.15c2.92,1.93,6.36,2.99,9.86,2.61l-.66-9.2-9.2-3.56ZM353.9,251.24c-4.7,1.28-12.1,1.4-16.42,3.01-1.32.49-1,1.86-1.01,3.08-.03,2.33.79,4.36.62,6.67,5.43-1.2,12.02-1.16,16.82-3.77v-8.99ZM399.72,287.78c4.56,5.8,8.98,11.77,13.23,17.8,1.81,2.57,4.92,10.58,8.21,7.44l-29.85-53.08c-1.93-1.75-11.17,2.26-13.96,2.88l29.58,51.69c.94.93,6.06.85,6.12-.33-5.33-8.25-9.1-17.52-13.32-26.39ZM402.04,315.61l-29.85-51.1-4.94,1.51,4.04,8.99-7.65-8-6.27,1.05,30.15,48.47c4.84-2.66,9.32-.43,14.51-.92ZM352.62,269.92c-.76-.45-11.37,1.21-12.91,1.64-.63.18-1.07.17-1.46.84l31.6,50.17c1.34,1.35,3.22-.23,4.92,0l-3.47-9.86c3.9,1.94,8.25,12.26,12.12,5.6l-30.8-48.4ZM303.73,273.28h-10.15l4.05,12.18-9.52-11.64-4.39-1.12.27,1.75c11.42,18.19,19.91,40.6,31.51,58.39.5.77,1.86,2.71,2.7,2.84,2.76.42,8.63-2.38,11.92-1.5l-6.37-14.5c2.56,1.73,9.1,12.27,11.03,13.07.73.3,4.82-.19,4.56-1.67l-35.6-57.79ZM347.81,323.74c3.91-.69,11.81,0,16.24,0,.05,0,1.38,1.4.86-.28-.19-.61-1.09-1.88-1.49-2.57-9.25-15.98-20.33-31-29.57-47.01l-1.09-.95c-2.09.71-4.33.63-6.4.95s-.06,1.63.59,2.87c2.78,5.32,5.23,10.84,7.81,16.26l-14.74-18.6c-1.34-.88-6.49-.63-8.58-.71-.6-.02-.81-.78-1.59.46l32.47,53.65c2.32-.61,2.58-3.54,5.5-4.06ZM190.33,294.46c-.66-3.64-5.06-2.29-7.74-1.96-7.87.98-20.34,2.66-27.75,4.73-7.93,2.22-4.76,8.22-4.5,14.59.18,4.38.55,30.98,2.29,32.51.57.5,2.77,1.07,3.49.62,2.87-5.87,9.6-8.21,13.82-12.93l-2.42-30.76,2.51-1.04,1.63,2.47,2.44,25.69,3.29-1.99-2.05-26.64c.46-1.41,3.39-1.44,3.88.02l2.46,25.67,2.28.04c.62-3.66-2.37-25.81-.62-27.01.41-.28,1.01-.26,1.5-.3.46-.03.93-.06,1.36.12,1.41.87,1.64,24.82,2.43,28.31l4.02.61-2.33-32.76ZM342.74,182.94c1.51-.18,3.54-.48,4.08,1.43.3,1.06.63,4.86.72,6.24.26,4-.33,8.1.07,12.11,1.86,2.35,8.24,4.78,6,8.52-.85,1.42-27.23,8.06-30.85,9.7-.42.01-7.45-2.74-7.74-3.03-1.09-1.07-.5-12.01-.54-14.54-.09-5.29-2.91-11.94,3.89-14.62,4.42-1.74,19.51-5.22,24.37-5.81ZM341.54,204.37c-3.21,1.67-21.7,4.79-22.75,6.84-1.14,2.99,1.99,4.3,4.59,4.04,1.82-.18,20.49-5.65,22-6.46.39-.21.71-.39.96-.77l-4.8-3.66ZM226.75,281.54c1.51-.18,3.54-.48,4.08,1.43.3,1.06.63,4.86.72,6.24.26,4-.33,8.1.07,12.11l4.45,4.15c-1.77,1.93-3.32,5.93-5.69,6.97s-21.83,7.04-23.6,7.1c-.42.01-7.45-2.74-7.74-3.03-1.09-1.07-.5-12.01-.54-14.54-.09-5.29-2.91-11.94,3.89-14.62,4.42-1.74,19.51-5.22,24.37-5.81ZM225.55,302.97c-3.21,1.67-21.7,4.79-22.75,6.84-1.14,2.99,1.99,4.3,4.59,4.04,1.82-.18,20.49-5.65,22-6.46.39-.21.71-.39.96-.77l-4.8-3.66ZM396.24,166.56c2.98.31,4.7-2.22,7.15-3.58,1.85-1.02,6.8-3.84,8.49-4.27,3.02-.78,6.92.36,9.47-.39,1.03-.3,2.98-2.94,4.27-3.85,4.41-3.09,9.7-2.43,14.7-3.86-8.89-.61-21.15-4.61-29.84-3.16-2.29.38-3.83,2.52-5.72,3.56-5.95,3.29-12.48,5.47-18.23,9.03l-12.33-1.02c1.72,3.55,3.67,6.91,4.13,10.94l7.47.65v6.38c-1.94-.2-3.63-1.44-5.56-1.68-5.37-.69-4.72,1.41-8.17,3.91-1.84,1.33-3.66,2.1-5.73,2.97-1.45,2.07,1.67,2.48,3.1,2.77,3.56.7,7.25.52,10.8,1.23,3.69-5.39,8.97-10.15,16-8.02v-11.6ZM376.38,333.75c-8.38,3.29-2.46,16.28-3.92,23.05l16.82-4.64c-1.37-5.71-1.93-12.68,1.74-17.68,1.6-2.19,4.31-3.24,5.8-5.51-6.18,2-14.58,2.48-20.44,4.78ZM107.09,275c2.27-.14,3.57-2.23,3.81-4.31.28-2.42.28-16.02-.44-17.57-1.52-3.27-11.41-4.48-13.43-.95-1.42,2.48-2.18,14.3-1.76,17.3.1.71.81,2.59,1.29,3.07.93.93,9.08,2.55,10.54,2.46ZM280.55,321.31c2.63-.06,4.06-1.74,4.35-4.23s.28-16.02-.44-17.57c-1.52-3.27-11.41-4.48-13.43-.95-1.42,2.48-2.18,14.3-1.76,17.3.1.71.81,2.59,1.29,3.07.96.97,8.45,2.41,10,2.38ZM396.55,240.12c2.63-.06,4.06-1.74,4.35-4.23s.28-16.02-.44-17.57c-1.52-3.27-11.41-4.48-13.43-.95-1.42,2.48-2.18,14.3-1.76,17.3.1.71.81,2.59,1.29,3.07.96.97,8.45,2.41,10,2.38ZM222.55,176.32c2.63-.06,4.06-1.74,4.35-4.23s.28-16.02-.44-17.57c-1.52-3.27-11.41-4.48-13.43-.95-1.42,2.48-2.18,14.3-1.76,17.3.1.71.81,2.59,1.29,3.07.96.97,8.45,2.41,10,2.38ZM358.54,338.83l6.37,8.11c-1.07-4.75.72-10.32-6.37-8.11ZM382.78,409.17c7.55-.52,12.14-.59,12.9,8.22.24,2.81.36,12.99-.68,15.03-.64,1.26-2.49,2.64-3.82,3.14-3.4,1.3-12.85,4.18-16.27,4.61-4.19.52-12.57,1.26-14.89-2.79-1.6-2.8-1.91-14.33-1.51-17.66.17-1.38.68-2.62,1.5-3.72,2.99-4.02,17.69-6.47,22.76-6.82ZM385.8,419.43c-.9-.9-15.52,1.89-16.84,3.18-1.45,1.41.7,5.72.01,7.85,5.91,0,11.16-2.75,16.76-4.12l.06-6.91ZM516.74,246.74c1.51-.18,3.54-.48,4.08,1.43.3,1.06.63,4.86.72,6.24.26,4-.33,8.1.07,12.11,1.86,2.35,8.24,4.78,6,8.52-.85,1.42-27.23,8.06-30.85,9.7-.42.01-7.45-2.74-7.74-3.03-1.09-1.07-.5-12.01-.54-14.54-.09-5.29-2.91-11.94,3.89-14.62,4.42-1.74,19.51-5.22,24.37-5.81ZM515.54,268.17c-3.21,1.67-21.7,4.79-22.75,6.84-1.14,2.99,1.99,4.3,4.59,4.04,1.82-.18,20.49-5.65,22-6.46.39-.21.71-.39.96-.77l-4.8-3.66Z', viewBoxWidth: 595.28 }
};

module.exports = HexWorldEditorPlugin;
