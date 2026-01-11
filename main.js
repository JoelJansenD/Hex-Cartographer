const { Plugin, TFile, Notice, Modal, ItemView, setIcon } = require('obsidian');

class HexWorldEditorPlugin extends Plugin {
    async onload() {
        this.registerView('hexworld-editor', (leaf) => new HexWorldEditorView(leaf, this));

        // Registriere .hexworld.md Extension
        this.registerExtensions(['hexworld.md'], 'hexworld-editor');

        // KRITISCH: Stelle sicher, dass .hexworld.md Dateien mit dem Editor geöffnet werden
        // Methode 1: Direktes Monkey-Patching der openFile Methode
        const originalOpenFile = this.app.workspace.openLinkText.bind(this.app.workspace);
        this.app.workspace.openLinkText = async (linktext, sourcePath, newLeaf, openViewState) => {
            // Prüfe ob es eine .hexworld.md Datei ist
            if (linktext.endsWith('.hexworld.md') || linktext.includes('.hexworld.md')) {
                const file = this.app.metadataCache.getFirstLinkpathDest(linktext, sourcePath);
                if (file && file instanceof TFile) {
                    const leaf = this.app.workspace.getLeaf(newLeaf);
                    await leaf.openFile(file, {
                        ...openViewState,
                        state: { ...openViewState?.state, file: file.path }
                    });
                    // Erzwinge View-Typ nach dem Öffnen
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

        // Methode 2: file-open Event als Fallback
        this.registerEvent(
            this.app.workspace.on('file-open', async (file) => {
                if (!file || !file.path) return;

                if (file.path.endsWith('.hexworld.md')) {
                    // Kleines Timeout, damit die View geladen ist
                    await new Promise(resolve => setTimeout(resolve, 10));

                    const leaf = this.app.workspace.activeLeaf;
                    if (!leaf) return;

                    // Wenn es die Markdown-Ansicht ist, wechsle zum Hex World Editor
                    if (leaf.view.getViewType() === 'markdown') {
                        await leaf.setViewState({
                            type: 'hexworld-editor',
                            state: { file: file.path }
                        });
                    }
                }
            })
        );

        // Verstecke ".hexworld" im File Explorer (wie Excalidraw)
        // Verzögere leicht, damit beim ersten Start alles geladen ist
        setTimeout(() => {
            this.hideHexworldExtensionInExplorer();
        }, 500);

        // Fange Umbenennungen ab und stelle sicher, dass .hexworld.md erhalten bleibt
        this.registerEvent(this.app.vault.on('rename', async (file, oldPath) => {
            if (oldPath.endsWith('.hexworld.md') && !file.path.endsWith('.hexworld.md')) {
                // User hat .hexworld entfernt - füge es wieder hinzu
                const newName = file.name.replace(/\.md$/, '') + '.hexworld.md';
                const newPath = file.parent ? `${file.parent.path}/${newName}` : newName;

                // new Notice('Hex World Dateien müssen die .hexworld.md Endung behalten');

                // Benenne zurück
                await this.app.fileManager.renameFile(file, newPath);
            } else if (file.path.endsWith('.hexworld.md')) {
                // Normale Umbenennung - aktualisiere die Anzeige
                this.hideHexworldExtensionInExplorer();
            }
        }));

        this.addRibbonIcon('map', 'Create Hex World', async () => {
            await this.createNewHexWorld();
        });

        // Rechtsklick-Menü für Ordner
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                menu.addItem((item) => {
                    item
                        .setTitle('Neue Hex World erstellen')
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
                    // Tab-Header aktualisieren, um den neuen Namen anzuzeigen
                    leaf.updateHeader();

                    // Zusätzlich: Direkte DOM-Aktualisierung für sofortige Anzeige
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

        // Wenn User auf bereits geöffnete Datei klickt, reload
        this.registerEvent(this.app.workspace.on('file-open', (file) => {
            if (!file || file.extension !== 'hexworld') return;

            const leaves = this.app.workspace.getLeavesOfType('hexworld-editor');
            leaves.forEach((leaf) => {
                const view = leaf.view;
                if (view instanceof HexWorldEditorView && view.file && view.file.path === file.path) {
                    // Datei ist bereits geöffnet, lade sie neu
                    view.reloadFile();
                }
            });
        }));
    }

    async createNewHexWorld(targetFile = null) {
        const fileName = `HexWorld_${Date.now()}.hexworld.md`;

        // Bestimme den Zielordner
        let folderPath = '';
        if (targetFile) {
            // Wenn targetFile ein Ordner ist, verwende seinen Pfad
            if (targetFile.children) {
                folderPath = targetFile.path;
            }
            // Wenn targetFile eine Datei ist, verwende den Eltern-Ordner
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
            gridSize: 30,
            zoom: 1,
            offX: 400,
            offY: 300,
            // Werkzeug-Einstellungen
            settings: {
                colorPalette: ['#3295D2', '#6CC261', '#DDC88D', '#808080', '#CD6155', '#FFD700', '#000000', '#FFFFFF'],
                activeColorSlot: 1,
                drawMode: 'pointer',
                currentToolGroup: null,
                // toolConfigs absichtlich NICHT gesetzt - wird beim ersten Laden automatisch
                // mit den ersten verfügbaren SVG-Symbolen initialisiert
                patternData: null,
                patternSourceHex: null
            }
        };

        try {
            // Erstelle MD-Format mit Frontmatter und JSON-Codeblock
            // Durch .hexworld.md Endung wird die Datei automatisch von Obsidian Sync synchronisiert
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
            new Notice("Fehler beim Erstellen der Datei: " + err);
        }
    }

    hideHexworldExtensionInExplorer() {
        // Verstecke ".hexworld" im Dateinamen im File Explorer
        // Dies läuft periodisch, um neue Dateien zu erfassen
        const hideExtension = () => {
            const fileElements = document.querySelectorAll('.nav-file-title[data-path$=".hexworld.md"]');
            fileElements.forEach(el => {
                const titleEl = el.querySelector('.nav-file-title-content');
                if (titleEl && titleEl.textContent.includes('.hexworld')) {
                    // Entferne ".hexworld" aus dem angezeigten Namen
                    titleEl.textContent = titleEl.textContent.replace('.hexworld', '');
                }

                // Füge CSS-Klasse hinzu, damit Badge korrekt positioniert wird
                if (!el.classList.contains('hexworld-file')) {
                    el.classList.add('hexworld-file');
                }
            });
        };

        // Initiale Ausführung mit Verzögerung
        hideExtension();

        // Beobachte DOM-Änderungen im File Explorer
        const observer = new MutationObserver((mutations) => {
            // Nur ausführen, wenn relevante Änderungen
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

            // Cleanup beim Plugin-Unload
            this.register(() => observer.disconnect());
        }

        // Zusätzlich: Verstecke beim Workspace-Layout-Change
        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                setTimeout(hideExtension, 100);
            })
        );

        // Wiederhole periodisch für robuste Darstellung
        const intervalId = setInterval(hideExtension, 2000);
        this.register(() => clearInterval(intervalId));
    }
}

class HexWorldEditorView extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
        this.file = null;
        this.data = { hexes: {}, rivers: [], roads: [], texts: [], gridSize: 30, zoom: 1, offX: 400, offY: 300 };

        this.history = [];
        this.redoStack = [];
        this.maxHistory = 50;

        this.saveTimeout = null;
        this.isMouseDown = false;
        this.isDraggingMap = false;
        this.lastHex = null;
        this.isReloading = false;
        this.isSaving = false;
        this.draggedText = null;

        this.startHex = null;
        this.pathPreview = [];
        this.pathWidths = { river: 5, road: 3 };

        // Farbpalette mit 8 Slots
        this.colorPalette = ['#3295D2', '#6CC261', '#DDC88D', '#808080', '#CD6155', '#FFD700', '#000000', '#FFFFFF'];
        this.activeColorSlot = 1; // Standardfarbe: Grün

        // Werkzeug-Konfigurationen
        this.toolConfigs = {
            grass: {
                name: 'Vegetation',
                variants: [
                    { id: 'grass', label: 'Gras', icon: 'sprout' },
                    { id: 'swamp', label: 'Sumpf', icon: 'waves' }
                ],
                currentVariant: 'grass',
                symbolColor: '#228B22',
                backgroundColor: '#6CC261',
                backgroundEnabled: false
            },
            tree: {
                name: 'Baum',
                variants: [
                    { id: 'bush', label: 'Strauch', icon: 'leaf' },
                    { id: 'tree', label: 'Laubbaum', icon: 'trees' },
                    { id: 'pine', label: 'Nadelbaum', icon: 'triangle' },
                    { id: 'palm', label: 'Palme', icon: 'palmtree' }
                ],
                currentVariant: 'tree',
                symbolColor: '#228B22',
                backgroundColor: '#6CC261',
                backgroundEnabled: false
            },
            mountain: {
                name: 'Berg',
                variants: [
                    { id: 'hill', label: 'Hügel', icon: 'chevron-up' },
                    { id: 'mountain', label: 'Berg', icon: 'mountain' }
                ],
                currentVariant: 'mountain',
                symbolColor: '#5D4037',
                backgroundColor: '#808080',
                backgroundEnabled: false
            },
            building: {
                name: 'Gebäude',
                variants: [
                    { id: 'tent', label: 'Zelt', icon: 'tent' },
                    { id: 'house', label: 'Haus', icon: 'home' },
                    { id: 'village', label: 'Dorf', icon: 'school' },
                    { id: 'city', label: 'Stadt', icon: 'castle' },
                    { id: 'castle', label: 'Burg', icon: 'shield' },
                    { id: 'monastery', label: 'Kloster', icon: 'church' },
                    { id: 'tower', label: 'Turm', icon: 'tower' },
                    { id: 'ruin', label: 'Ruine', icon: 'archive' },
                    { id: 'cave', label: 'Höhle', icon: 'circle' },
                    { id: 'oasis', label: 'Oase', icon: 'droplet' }
                ],
                currentVariant: 'house',
                symbolColor: '#CD6155',
                backgroundColor: '#DDC88D',
                backgroundEnabled: false
            }
        };

        // Zeichenmodi
        this.drawMode = 'pointer'; // pointer, pen, fill, eraser
        this.currentToolGroup = null; // grass, tree, mountain, building, oder null für Farbpalette

        // Musterwerkzeug
        this.patternData = null;
        this.patternPickMode = false;
        this.patternSourceHex = null; // Speichert q/r der Musterwabe

        // SVG-Symbol Cache
        this.svgSymbols = {};
        this.svgSymbolsLoaded = false;
        this.svgLoadPromise = this.loadSVGSymbols();

        // SVG-Symbol Konfigurations-Tabelle
        // Hier können Sie für jedes Symbol individuell Größe und Position anpassen
        // size: Größenmultiplikator (0.30 = 30% der Hex-Größe)
        // align: Position in der Wabe ('center', 'top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right')
        // marginX: Horizontale Verschiebung in % der Hex-Breite (-100 bis +100)
        // marginY: Vertikale Verschiebung in % der Hex-Höhe (-100 bis +100)
        this.svgSymbolConfig = {
            // Vegetation
            'grass': { size: 0.30, align: 'center', marginX: 0, marginY: 0 },
            'swamp': { size: 0.35, align: 'center', marginX: 0, marginY: 0 },

            // Bäume
            'bush': { size: 0.35, align: 'center', marginX: 0, marginY: 0 },
            'tree': { size: 0.35, align: 'center', marginX: 0, marginY: -6 },
            'pine': { size: 0.30, align: 'center', marginX: 0, marginY: 0 },
            'palm': { size: 0.30, align: 'center', marginX: 0, marginY: 0 },

            // Berge
            'hill': { size: 0.50, align: 'center', marginX: 0, marginY: 0 },
            'mountain': { size: 0.60, align: 'center', marginX: 0, marginY: 0 },

            // Gebäude
            'tent': { size: 0.30, align: 'center', marginX: 0, marginY: 0 },
            'house': { size: 0.30, align: 'center', marginX: 0, marginY: 0 },
            'village': { size: 0.30, align: 'center', marginX: 0, marginY: 0 },
            'city': { size: 0.30, align: 'center', marginX: 0, marginY: 0 },
            'castle': { size: 0.30, align: 'center', marginX: 0, marginY: 0 },
            'monastery': { size: 0.30, align: 'center', marginX: 0, marginY: 0 },
            'tower': { size: 0.30, align: 'center', marginX: 0, marginY: 0 },
            'ruin': { size: 0.30, align: 'center', marginX: 0, marginY: 0 },
            'cave': { size: 0.30, align: 'center', marginX: 0, marginY: 0 },
            'oasis': { size: 0.30, align: 'center', marginX: 0, marginY: 0 }
        };

        // Text-Einstellungen
        this.lastUsedTextSize = 16;
        this.lastUsedTextColor = '#ffffff';
        this.lastUsedTextOutline = true;
        this.lastUsedTextBold = false;
        this.lastUsedTextShadow = false;
        this.lastUsedTextShadowDistance = 5;
        this.lastUsedTextShadowOpacity = 50;
    }

    getViewType() { return 'hexworld-editor'; }
    getDisplayText() {
        if (!this.file) return 'Hex World Editor';
        // Entferne ".hexworld" aus dem Tab-Namen (wie im File Explorer)
        return this.file.basename.replace('.hexworld', '');
    }
    getState() { return { file: this.file ? this.file.path : null }; }

    // Wichtig: Icon für den Tab anzeigen
    getIcon() { return 'map'; }

    // Zeigt "HEXWORLD" statt ".hexworld.md" im File Explorer (wie EXCALIDRAW)
    onPaneMenu(menu, source) {
        if (source === 'more-options') {
            menu.addItem((item) => {
                item.setTitle('Im Hex World Editor öffnen')
                    .setIcon('map')
                    .onClick(async () => {
                        // Bereits im Editor geöffnet, nichts zu tun
                    });
            });
        }
        super.onPaneMenu(menu, source);
    }

    async loadSVGSymbols() {
        // Lade SVG-Dateien aus dem symbols-Ordner
        // HINWEIS: Alle Symbole verwenden aktuell die gleiche SVG-Datei (tree-001.svg)
        // Diese können später durch eigene SVG-Dateien ersetzt werden
        const symbolMap = {
            // Vegetation
            'grass': 'grass-001.svg',
            'swamp': 'swamp-001.svg',
            // Bäume
            'bush': 'bush-001.svg',
            'tree': 'tree-001.svg',
            'pine': 'tree-001.svg',
            'palm': 'tree-001.svg',
            // Berge
            'hill': 'hill-001.svg',
            'mountain': 'mountain-001.svg',
            // Gebäude
            'tent': 'tree-001.svg',
            'house': 'tree-001.svg',
            'village': 'tree-001.svg',
            'city': 'tree-001.svg',
            'castle': 'tree-001.svg',
            'monastery': 'tree-001.svg',
            'tower': 'tree-001.svg',
            'ruin': 'tree-001.svg',
            'cave': 'tree-001.svg',
            'oasis': 'tree-001.svg'
        };

        for (const [key, filename] of Object.entries(symbolMap)) {
            try {
                // Verwende relativen Pfad vom Vault-Root
                const svgPath = '.obsidian/plugins/hexworld-editor/symbols/' + filename;
                console.log(`Attempting to load SVG from: ${svgPath}`);

                const svgContent = await this.app.vault.adapter.read(svgPath);
                console.log(`SVG content loaded, length: ${svgContent.length}`);

                // Parse SVG um Path-Daten und ViewBox zu extrahieren
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
                const svgElement = svgDoc.querySelector('svg');
                const pathElement = svgDoc.querySelector('path');

                if (pathElement && svgElement) {
                    const pathData = pathElement.getAttribute('d');
                    const viewBox = svgElement.getAttribute('viewBox');

                    let viewBoxWidth = 100;
                    if (viewBox) {
                        const viewBoxParts = viewBox.split(' ');
                        viewBoxWidth = parseFloat(viewBoxParts[2]);
                    }

                    this.svgSymbols[key] = {
                        pathData: pathData,
                        viewBoxWidth: viewBoxWidth
                    };

                    console.log(`✓ SVG loaded successfully: ${key}, viewBox width: ${viewBoxWidth}`);
                } else {
                    console.error(`✗ No path element found in SVG ${filename}`);
                }
            } catch (e) {
                console.error(`✗ Could not load SVG symbol file: ${filename}`, e);
            }
        }

        // SVGs sind nun geladen - markiere als bereit
        this.svgSymbolsLoaded = true;
    }

    updateToolConfigsWithAvailableSVGs() {
        // Für jede Tool-Gruppe: Finde die erste Variante, die ein SVG hat
        ['grass', 'tree', 'mountain', 'building'].forEach(groupId => {
            const config = this.toolConfigs[groupId];
            if (config && config.variants) {
                // Suche die erste Variante mit verfügbarem SVG
                const firstAvailableSVG = config.variants.find(v => this.svgSymbols[v.id]);
                if (firstAvailableSVG) {
                    // Setze nur, wenn noch der ursprüngliche Standardwert aktiv ist
                    // (wird später beim Laden einer Datei durch gespeicherte Werte überschrieben)
                    config.currentVariant = firstAvailableSVG.id;
                    console.log(`✓ Set default variant for ${groupId}: ${firstAvailableSVG.id}`);
                }
            }
        });
    }

    updateToolGroupButtonIcons() {
        // Aktualisiere die Button-Icons basierend auf den aktuellen Varianten
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

            // Prüfe ob ein eigenes SVG vorhanden ist
            if (this.svgSymbols[currentVariant.id]) {
                const symbolInfo = this.svgSymbols[currentVariant.id];
                // Erstelle inline SVG im Button
                btn.innerHTML = `<svg viewBox="0 0 ${symbolInfo.viewBoxWidth} ${symbolInfo.viewBoxWidth}"
                                      width="16" height="16" style="vertical-align: middle;">
                    <path d="${symbolInfo.pathData}" fill="currentColor"/>
                </svg>`;
                console.log(`✓ Updated button icon for ${groupId} to ${currentVariant.id}`);
            } else {
                // Fallback auf Obsidian Icon
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
            // Warte auf SVG-Symbole, falls sie noch nicht geladen sind
            if (this.svgLoadPromise && !this.svgSymbolsLoaded) {
                await this.svgLoadPromise;
            }

            const content = await this.app.vault.read(this.file);

            // Extrahiere JSON aus MD-Format oder verwende direktes JSON
            let jsonContent = content;

            // Prüfe auf MD-Format mit JSON-Codeblock
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

            // Migration von altem Format (Array) zu neuem Format (Objekt mit Keys)
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

            // Stelle Werkzeug-Einstellungen wieder her
            if (newData.settings) {
                if (newData.settings.colorPalette) {
                    this.colorPalette = newData.settings.colorPalette;
                }
                if (newData.settings.activeColorSlot !== undefined) {
                    this.activeColorSlot = newData.settings.activeColorSlot;
                }
                if (newData.settings.drawMode) {
                    this.drawMode = newData.settings.drawMode;
                }
                if (newData.settings.currentToolGroup !== undefined) {
                    this.currentToolGroup = newData.settings.currentToolGroup;
                }
                if (newData.settings.toolConfigs) {
                    // Werkzeug-Konfigurationen wiederherstellen
                    // WICHTIG: Explizit jeden Key einzeln laden, um sicherzustellen,
                    // dass keine Referenzen überschrieben werden
                    ['grass', 'tree', 'mountain', 'building'].forEach(key => {
                        if (newData.settings.toolConfigs[key] && this.toolConfigs[key]) {
                            const saved = newData.settings.toolConfigs[key];

                            // Nur aktualisieren, wenn der gespeicherte Wert vorhanden ist
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
                    // Aktualisiere die Button-Icons nach dem Wiederherstellen der gespeicherten Varianten
                    this.updateToolGroupButtonIcons();
                } else {
                    // Keine toolConfigs gespeichert - verwende SVG-basierte Defaults für neue Dateien
                    this.updateToolConfigsWithAvailableSVGs();
                    // Aktualisiere die Button-Icons in der Toolbar
                    this.updateToolGroupButtonIcons();
                }
                if (newData.settings.patternData) {
                    this.patternData = newData.settings.patternData;
                }
                if (newData.settings.patternSourceHex) {
                    this.patternSourceHex = newData.settings.patternSourceHex;
                }
            } else {
                // Keine Settings vorhanden - verwende SVG-basierte Defaults für neue Dateien
                this.updateToolConfigsWithAvailableSVGs();
                // Aktualisiere die Button-Icons in der Toolbar
                this.updateToolGroupButtonIcons();
            }

            if (JSON.stringify(this.data) !== JSON.stringify(newData)) {
                this.data = Object.assign({}, newData);

                // Automatisch "Ganze Karte zeigen" beim ersten Laden ausführen
                // Ignoriere gespeicherte zoom/offX/offY, da verschiedene Geräte verschiedene Bildschirmgrößen haben
                if (this.canvas && Object.keys(this.data.hexes).length > 0) {
                    // Warte kurz, damit Canvas richtig initialisiert ist
                    setTimeout(() => {
                        this.fitMapToView();
                    }, 100);
                } else if (this.canvas) {
                    this.render();
                }
            }

            // Aktualisiere Toolbar nach dem Laden
            if (this.containerEl) {
                const toolbar = this.containerEl.querySelector('.hex-toolbar');
                if (toolbar) {
                    this.updateToolbarState(toolbar);
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
            gridSize: this.data.gridSize
        };
        this.history.push(JSON.stringify(dataToSave));
        if (this.history.length > this.maxHistory) this.history.shift();
        this.redoStack = [];
    }

    undo() {
        if (this.history.length > 0) {
            const dataToSave = {
                hexes: this.data.hexes,
                rivers: this.data.rivers,
                roads: this.data.roads,
                texts: this.data.texts,
                gridSize: this.data.gridSize
            };
            this.redoStack.push(JSON.stringify(dataToSave));
            const previousState = this.history.pop();
            const restored = JSON.parse(previousState);
            this.data.hexes = restored.hexes;
            this.data.rivers = restored.rivers;
            this.data.roads = restored.roads;
            this.data.texts = restored.texts;
            this.data.gridSize = restored.gridSize;
            this.render();
            this.requestSave();
        } else {
            new Notice("Nichts zum Rückgängigmachen");
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const dataToSave = {
                hexes: this.data.hexes,
                rivers: this.data.rivers,
                roads: this.data.roads,
                texts: this.data.texts,
                gridSize: this.data.gridSize
            };
            this.history.push(JSON.stringify(dataToSave));
            const nextState = this.redoStack.pop();
            const restored = JSON.parse(nextState);
            this.data.hexes = restored.hexes;
            this.data.rivers = restored.rivers;
            this.data.roads = restored.roads;
            this.data.texts = restored.texts;
            this.data.gridSize = restored.gridSize;
            this.render();
            this.requestSave();
        } else {
            new Notice("Nichts zum Wiederholen");
        }
    }

    fitMapToView() {
        const hexes = Object.values(this.data.hexes);
        const texts = this.data.texts || [];

        if (hexes.length === 0 && texts.length === 0) {
            new Notice("Keine Waben oder Texte zum Anzeigen");
            return;
        }

        // Berechne die Bounds aller Waben
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        hexes.forEach(hex => {
            const pos = this.hexToPixel(hex);
            const s = this.data.gridSize;

            // Berücksichtige die Größe der Hexagone
            minX = Math.min(minX, pos.x - s);
            maxX = Math.max(maxX, pos.x + s);
            minY = Math.min(minY, pos.y - s);
            maxY = Math.max(maxY, pos.y + s);
        });

        // Berücksichtige auch Texte
        texts.forEach(t => {
            const textSize = t.size || 16;
            const estimatedWidth = t.text.length * textSize * 0.6; // Geschätzte Textbreite
            const estimatedHeight = textSize;

            minX = Math.min(minX, t.x - estimatedWidth / 2);
            maxX = Math.max(maxX, t.x + estimatedWidth / 2);
            minY = Math.min(minY, t.y - estimatedHeight / 2);
            maxY = Math.max(maxY, t.y + estimatedHeight / 2);
        });

        // Berechne Zentrum und Größe
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const width = maxX - minX;
        const height = maxY - minY;

        // Berechne erforderlichen Zoom mit etwas Padding (90% der Canvas-Größe)
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const zoomX = (canvasWidth * 0.9) / width;
        const zoomY = (canvasHeight * 0.9) / height;
        const newZoom = Math.min(zoomX, zoomY, 2); // Maximal 2x Zoom

        // Setze Zoom und zentriere die Karte
        this.data.zoom = newZoom;
        this.data.offX = canvasWidth / 2 - centerX * newZoom;
        this.data.offY = canvasHeight / 2 - centerY * newZoom;

        this.render();
        // Speichere Zoom/Pan NICHT mehr, da verschiedene Geräte verschiedene Bildschirmgrößen haben
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.height = '100%';

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

        // Verhindere, dass Mausrad-Scrollen im Toolbar den Canvas zoomt
        toolbar.addEventListener('wheel', (e) => {
            e.stopPropagation();
        }, { passive: true });

        this.createToolbar(toolbar);

        // Toolbar initial aktualisieren, um Farben korrekt anzuzeigen
        this.updateToolbarState(toolbar);

        // Canvas-Container mit relativem Positioning
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

        // SVG-Layer über dem Canvas für Vektorsymbole
        this.svgLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svgLayer.style.position = 'absolute';
        this.svgLayer.style.top = '0';
        this.svgLayer.style.left = '0';
        this.svgLayer.style.width = '100%';
        this.svgLayer.style.height = '100%';
        this.svgLayer.style.pointerEvents = 'none'; // Lässt Maus-Events durch
        canvasContainer.appendChild(this.svgLayer);

        // Text-Layer über dem SVG-Layer für Texte
        this.textCanvas = canvasContainer.createEl('canvas', { cls: 'hex-text-canvas' });
        this.textCtx = this.textCanvas.getContext('2d');

        this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
        this.resizeObserver.observe(canvasContainer);

        this.setupEventListeners();
        this.render();
    }

    createToolbar(toolbar) {
        // Zeichenmodus-Werkzeuge
        this.createDrawModeButton(toolbar, 'pointer', 'mouse-pointer', 'Pfeil (Navigation)');
        this.createDrawModeButton(toolbar, 'pen', 'pen-tool', 'Stift (Zeichnen)');
        this.createDrawModeButton(toolbar, 'fill', 'paint-bucket', 'Fülleimer');

        // Text-Werkzeug (neben Fülleimer)
        const textBtn = toolbar.createEl('button', { cls: 'hex-tool-btn', attr: { title: 'Text' } });
        textBtn.dataset.toolGroup = 'text';
        setIcon(textBtn, 'type');
        textBtn.onclick = () => {
            const wasPatternActive = this.currentToolGroup === 'pattern';
            this.currentToolGroup = 'text';
            // Textmodus schaltet auf 'none' - kein Zeichenmodus aktiv
            this.drawMode = 'none';
            this.updateToolbarState(toolbar);

            // Render neu, wenn Muster-Werkzeug verlassen wurde (um roten Rahmen zu entfernen)
            if (wasPatternActive) {
                this.render();
            }
        };

        this.createDrawModeButton(toolbar, 'eraser', 'eraser', 'Radierer');

        // Mülleimer (neben Radierer)
        const clearBtn = toolbar.createEl('button', { cls: 'hex-tool-btn', attr: { title: 'Löschen' } });
        setIcon(clearBtn, 'trash-2');
        clearBtn.style.color = 'var(--text-error)';
        clearBtn.onclick = () => this.handleClearButton();

        toolbar.createSpan({ style: 'width: 1px; background: var(--divider-color); margin: 0 4px; height: 24px;' });

        // Werkzeug-Gruppen mit Varianten
        this.createToolGroupButton(toolbar, 'grass');
        this.createToolGroupButton(toolbar, 'tree');
        this.createToolGroupButton(toolbar, 'mountain');
        this.createToolGroupButton(toolbar, 'building');

        // Musterwerkzeug (neben Gebäude)
        this.createPatternTool(toolbar);

        toolbar.createSpan({ style: 'width: 1px; background: var(--divider-color); margin: 0 4px; height: 24px;' });

        // Farbpalette
        this.createColorPalette(toolbar);

        toolbar.createSpan({ style: 'flex-grow: 1' });

        // Fluss/Weg-Werkzeuge
        this.createPathButton(toolbar, 'river', 'waves', 'Fluss');
        this.createPathButton(toolbar, 'road', 'route', 'Weg');

        toolbar.createSpan({ style: 'flex-grow: 1' });

        // Ganze Karte zeigen Button
        const fitBtn = toolbar.createEl('button', { cls: 'hex-tool-btn', attr: { title: 'Ganze Karte zeigen' } });
        setIcon(fitBtn, 'maximize-2');
        fitBtn.onclick = () => this.fitMapToView();

        const undoBtn = toolbar.createEl('button', { cls: 'hex-tool-btn', attr: { title: 'Rückgängig (Strg+Z)' } });
        setIcon(undoBtn, 'undo-2');
        undoBtn.onclick = () => this.undo();

        const redoBtn = toolbar.createEl('button', { cls: 'hex-tool-btn', attr: { title: 'Wiederholen (Strg+Y)' } });
        setIcon(redoBtn, 'redo-2');
        redoBtn.onclick = () => this.redo();

        this.updateToolbarState(toolbar);
    }

    createDrawModeButton(toolbar, mode, icon, title) {
        const btn = toolbar.createEl('button', { cls: 'hex-tool-btn', attr: { title } });
        btn.dataset.drawMode = mode;
        setIcon(btn, icon);
        btn.onclick = () => {
            const wasPatternActive = this.currentToolGroup === 'pattern';
            this.drawMode = mode;

            // Pfeil deaktiviert alle anderen Modi
            if (mode === 'pointer') {
                this.currentToolGroup = null;
            }
            // Andere Zeichenmodi deaktivieren Textmodus
            else if (this.currentToolGroup === 'text') {
                this.currentToolGroup = null;
            }

            this.updateToolbarState(toolbar);

            // Render neu, wenn Muster-Werkzeug verlassen wurde (um roten Rahmen zu entfernen)
            if (wasPatternActive && this.currentToolGroup !== 'pattern') {
                this.render();
            }
        };
    }

    createToolGroupButton(toolbar, groupId) {
        const config = this.toolConfigs[groupId];
        const wrapper = toolbar.createDiv({
            cls: 'tool-group-wrapper',
            style: 'display: inline-flex; flex-direction: column; align-items: center; gap: 2px;'
        });
        wrapper.dataset.toolGroupWrapper = groupId;

        // Symbol-Button mit Dropdown
        const btnWrapper = wrapper.createDiv({ style: 'position: relative; display: inline-block;' });
        const btn = btnWrapper.createEl('button', {
            cls: 'hex-tool-btn',
            attr: {
                title: `${config.name}\nKlick: Werkzeug aktivieren\nRechtsklick: Variante wählen`,
                style: `position: relative; background: ${config.backgroundEnabled ? config.backgroundColor : '#ffffff'};`
            }
        });
        btn.dataset.toolGroup = groupId;

        const currentVariant = config.variants.find(v => v.id === config.currentVariant);

        // Prüfe ob ein eigenes SVG vorhanden ist
        if (this.svgSymbols[currentVariant.id]) {
            const symbolInfo = this.svgSymbols[currentVariant.id];
            // Erstelle inline SVG im Button
            btn.innerHTML = `<svg viewBox="0 0 ${symbolInfo.viewBoxWidth} ${symbolInfo.viewBoxWidth}"
                                  width="16" height="16" style="vertical-align: middle;">
                <path d="${symbolInfo.pathData}" fill="currentColor"/>
            </svg>`;
        } else {
            // Fallback auf Obsidian Icon
            setIcon(btn, currentVariant.icon);
        }

        // Färbe Icon mit Symbolfarbe ein
        if (config.symbolColor) {
            btn.style.color = config.symbolColor;
        }

        // Dropdown-Icon
        btnWrapper.createEl('span', {
            text: '▼',
            attr: {
                style: 'position: absolute; right: 2px; bottom: 2px; font-size: 8px; pointer-events: none; color: var(--text-muted);'
            }
        });

        btn.onclick = () => {
            const wasPatternActive = this.currentToolGroup === 'pattern';
            this.currentToolGroup = groupId;

            // Aktiviere automatisch den Stift-Modus, AUSSER:
            // - wenn Füllmodus aktiv ist (bleibt im Füllmodus)
            // - wenn Radierer aktiv ist (bleibt im Radierer-Modus)
            // Aber IMMER aktivieren, wenn Pfeilmodus aktiv ist
            if (this.drawMode === 'pointer' || (this.drawMode !== 'fill' && this.drawMode !== 'eraser')) {
                this.drawMode = 'pen';
            }

            this.updateToolbarState(toolbar);

            // Render neu, wenn Muster-Werkzeug verlassen wurde (um roten Rahmen zu entfernen)
            if (wasPatternActive) {
                this.render();
            }
        };

        // Rechtsklick für Varianten
        btn.oncontextmenu = (e) => {
            e.preventDefault();
            this.showVariantMenu(groupId, wrapper);
        };

        // Farbindikator-Leiste unter dem Button
        const colorBar = wrapper.createDiv({
            attr: {
                title: 'Klick: Hintergrund ein/aus | Rechtsklick: Hintergrundfarbe',
                style: `display: flex; height: 20px; width: 100%; border-radius: 3px; overflow: hidden; cursor: pointer; border: 1px solid var(--divider-color);`
            }
        });

        // Linke Hälfte: Symbolfarbe
        colorBar.createDiv({
            cls: 'symbol-color-indicator',
            attr: {
                style: `flex: 1; background: ${config.symbolColor}; border-right: 1px solid rgba(0,0,0,0.2);`
            }
        });

        // Rechte Hälfte: Hintergrundfarbe
        colorBar.createDiv({
            cls: 'bg-color-indicator',
            attr: {
                style: `flex: 1; background: ${config.backgroundColor}; opacity: ${config.backgroundEnabled ? '1' : '0.3'};`
            }
        });

        // Klick auf Farbbalken = Toggle Hintergrund
        colorBar.onclick = () => {
            // WICHTIG: Hole die Config jedes Mal neu, um sicherzustellen, dass wir die richtige verwenden
            const currentConfig = this.toolConfigs[groupId];
            currentConfig.backgroundEnabled = !currentConfig.backgroundEnabled;
            const bgIndicator = colorBar.querySelector('.bg-color-indicator');
            if (bgIndicator) {
                bgIndicator.style.opacity = currentConfig.backgroundEnabled ? '1' : '0.3';
            }
            btn.style.background = currentConfig.backgroundEnabled ? currentConfig.backgroundColor : '#ffffff';
            this.requestSave();
        };

        // Rechtsklick auf Farbbalken = Farbauswahl-Modal öffnen
        colorBar.oncontextmenu = (e) => {
            e.preventDefault();
            this.openColorPickerModal(groupId, wrapper);
        };
    }

    createPatternTool(toolbar) {
        const wrapper = toolbar.createDiv({ style: 'display: flex; align-items: center; gap: 4px;' });

        // Muster-Button
        const patternBtn = wrapper.createEl('button', {
            cls: 'hex-tool-btn',
            attr: { title: 'Muster' }
        });
        patternBtn.dataset.toolGroup = 'pattern';
        setIcon(patternBtn, 'copy');

        patternBtn.onclick = () => {
            if (!this.patternData) {
                new Notice('Kein Muster ausgewählt. Nutze den Picker-Button, um ein Muster aufzunehmen.');
                return;
            }
            this.currentToolGroup = 'pattern';
            this.drawMode = 'pen'; // Automatisch in Zeichenmodus wechseln
            this.updateToolbarState(toolbar);
            this.render(); // Sofort rendern, um Muster-Wabe anzuzeigen
        };

        // Picker-Button
        const pickerBtn = wrapper.createEl('button', {
            cls: 'hex-tool-btn',
            attr: { title: 'Muster aufnehmen', style: 'width: 24px; padding: 2px;' }
        });
        setIcon(pickerBtn, 'pipette');

        pickerBtn.onclick = () => {
            this.patternPickMode = !this.patternPickMode;
            pickerBtn.style.background = this.patternPickMode ? 'var(--interactive-accent)' : '';
            if (this.patternPickMode) {
                new Notice('Klicke auf eine Wabe, um das Muster aufzunehmen');
            }
        };

        // Speichere Referenz für spätere Updates
        this.patternPickerBtn = pickerBtn;
    }

    showVariantMenu(groupId, wrapper) {
        const config = this.toolConfigs[groupId];
        const btn = wrapper.querySelector('.hex-tool-btn');

        // Entferne altes Menu falls vorhanden
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

                // Prüfe ob ein eigenes SVG vorhanden ist
                if (this.svgSymbols[variant.id]) {
                    const symbolInfo = this.svgSymbols[variant.id];
                    // Erstelle inline SVG im Button
                    btn.innerHTML = `<svg viewBox="0 0 ${symbolInfo.viewBoxWidth} ${symbolInfo.viewBoxWidth}"
                                          width="16" height="16" style="vertical-align: middle;">
                        <path d="${symbolInfo.pathData}" fill="currentColor"/>
                    </svg>`;
                } else {
                    // Fallback auf Obsidian Icon
                    setIcon(btn, variant.icon);
                }

                menu.remove();
                this.updateToolbarState(this.containerEl.querySelector('.hex-toolbar'));
                this.requestSave(); // Speichere Variantenwahl
            };
        });

        // Schließe Menu bei Klick außerhalb
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
        const symbolIndicator = wrapper.querySelector('.symbol-color-indicator');
        const bgIndicator = wrapper.querySelector('.bg-color-indicator');

        const modal = new Modal(this.app);
        modal.contentEl.createEl('h3', { text: `${config.name} - Farbauswahl` });

        // Symbolfarbe
        const symbolSection = modal.contentEl.createDiv({ style: 'margin: 15px 0;' });
        symbolSection.createEl('h4', { text: 'Symbolfarbe', attr: { style: 'margin-bottom: 10px;' } });

        const symbolRow = symbolSection.createDiv({ style: 'display: flex; gap: 10px; align-items: center; margin-bottom: 10px;' });
        symbolRow.createEl('label', { text: 'Farbe:' });
        const symbolPicker = symbolRow.createEl('input', { type: 'color', value: config.symbolColor || '#000000' });

        // Palette für Symbolfarbe
        const symbolPaletteRow = symbolSection.createDiv({ style: 'display: flex; gap: 5px; flex-wrap: wrap;' });
        symbolPaletteRow.createEl('span', { text: 'Palette:', attr: { style: 'width: 100%; font-size: 11px; margin-bottom: 5px;' } });
        this.colorPalette.forEach(color => {
            const paletteBtn = symbolPaletteRow.createEl('button', {
                attr: {
                    style: `width: 30px; height: 30px; background: ${color}; border: 2px solid var(--divider-color); border-radius: 3px; cursor: pointer;`
                }
            });
            paletteBtn.onclick = () => {
                symbolPicker.value = color;
            };
        });

        // Hintergrundfarbe
        const bgSection = modal.contentEl.createDiv({ style: 'margin: 15px 0;' });
        bgSection.createEl('h4', { text: 'Hintergrundfarbe', attr: { style: 'margin-bottom: 10px;' } });

        const bgRow = bgSection.createDiv({ style: 'display: flex; gap: 10px; align-items: center; margin-bottom: 10px;' });
        bgRow.createEl('label', { text: 'Farbe:' });
        const bgPicker = bgRow.createEl('input', { type: 'color', value: config.backgroundColor || '#ffffff' });

        // Palette für Hintergrundfarbe
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

        // Buttons
        const btnRow = modal.contentEl.createDiv({ style: 'display: flex; gap: 10px; margin-top: 20px;' });

        const okBtn = btnRow.createEl('button', { text: 'OK', cls: 'mod-cta' });
        okBtn.onclick = () => {
            config.symbolColor = symbolPicker.value;
            config.backgroundColor = bgPicker.value;

            btn.style.color = config.symbolColor;
            if (symbolIndicator) {
                symbolIndicator.style.background = config.symbolColor;
            }
            if (bgIndicator) {
                bgIndicator.style.background = config.backgroundColor;
            }
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
        const wrapper = toolbar.createDiv({ style: 'display: flex; align-items: center; gap: 3px;' });
        wrapper.createEl('span', { text: 'Palette:', attr: { style: 'font-size: 11px; margin-right: 2px;' } });

        this.colorPalette.forEach((color, index) => {
            const colorBtn = wrapper.createEl('button', {
                cls: 'hex-color-slot hex-tool-btn',
                attr: {
                    style: `width: 24px; height: 24px; min-width: 24px; border: 2px solid ${index === this.activeColorSlot ? '#3295D2' : 'transparent'}; border-radius: 3px; background: ${color}; cursor: pointer; padding: 0;`
                }
            });

            colorBtn.dataset.colorIndex = index;

            colorBtn.onclick = () => {
                const wasPatternActive = this.currentToolGroup === 'pattern';
                this.activeColorSlot = index;
                this.currentToolGroup = null; // Farbpalette aktiviert

                // Aktiviere automatisch den Stift-Modus, AUSSER:
                // - wenn Füllmodus aktiv ist (bleibt im Füllmodus)
                // - wenn Radierer aktiv ist (bleibt im Radierer-Modus)
                // Aber IMMER aktivieren, wenn Pfeilmodus aktiv ist
                if (this.drawMode === 'pointer' || (this.drawMode !== 'fill' && this.drawMode !== 'eraser')) {
                    this.drawMode = 'pen';
                }

                this.updateToolbarState(toolbar);

                // Render neu, wenn Muster-Werkzeug verlassen wurde (um roten Rahmen zu entfernen)
                if (wasPatternActive) {
                    this.render();
                }
            };

            colorBtn.oncontextmenu = (e) => {
                e.preventDefault();

                // Erstelle versteckten Color Picker an der Mausposition
                const picker = document.createElement('input');
                picker.type = 'color';
                picker.value = color;
                picker.style.position = 'fixed';
                picker.style.left = e.clientX + 'px';
                picker.style.top = e.clientY + 'px';
                picker.style.opacity = '0';
                picker.style.pointerEvents = 'none';

                document.body.appendChild(picker);

                picker.onchange = () => {
                    this.colorPalette[index] = picker.value;
                    colorBtn.style.background = picker.value;
                    this.requestSave(); // Speichere Änderung
                    document.body.removeChild(picker);
                };

                picker.onblur = () => {
                    setTimeout(() => {
                        if (document.body.contains(picker)) {
                            document.body.removeChild(picker);
                        }
                    }, 100);
                };

                // Trigger click to open color picker
                picker.click();
                picker.focus();
            };
        });
    }

    createPathButton(toolbar, type, icon, title) {
        const wrapper = toolbar.createDiv({
            style: 'display: inline-flex; flex-direction: column; align-items: flex-start; gap: 2px;'
        });

        // Button-Wrapper (wie bei Tool-Group-Buttons)
        const btnWrapper = wrapper.createDiv({ style: 'position: relative; display: inline-block;' });
        const btn = btnWrapper.createEl('button', { cls: 'hex-tool-btn', attr: { title } });
        btn.dataset.toolGroup = type;
        setIcon(btn, icon);

        btn.onclick = () => {
            const wasPatternActive = this.currentToolGroup === 'pattern';
            this.currentToolGroup = type;
            this.drawMode = 'pen'; // Automatisch in Zeichenmodus wechseln
            this.updateToolbarState(toolbar);

            // Render neu, wenn Muster-Werkzeug verlassen wurde (um roten Rahmen zu entfernen)
            if (wasPatternActive) {
                this.render();
            }
        };

        // Eingabefeld unter dem Button - Breite wird an Button-Breite angepasst
        const widthInput = wrapper.createEl('input', {
            type: 'number',
            value: this.pathWidths[type].toString(),
            attr: { title: 'Breite', style: 'height: 20px; font-size: 11px; padding: 2px; box-sizing: border-box;' }
        });

        // Setze Eingabefeld-Breite auf Button-Breite
        setTimeout(() => {
            widthInput.style.width = `${btn.offsetWidth}px`;
        }, 0);
        // Aktualisiere Breite bei Änderung
        widthInput.onchange = (e) => {
            this.pathWidths[type] = parseInt(e.target.value) || 1;
        };
    }

    updateToolbarState(toolbar) {
        // Zeichenmodus-Buttons
        toolbar.querySelectorAll('[data-draw-mode]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.drawMode === this.drawMode);
        });

        // Werkzeug-Gruppen - aktualisiere auch Hintergrundfarben
        // Nur Werkzeug-Buttons mit gültigen toolConfigs aktualisieren
        ['grass', 'tree', 'mountain', 'building'].forEach(groupId => {
            const config = this.toolConfigs[groupId];
            const wrapper = toolbar.querySelector(`[data-tool-group-wrapper="${groupId}"]`);
            const btn = toolbar.querySelector(`[data-tool-group="${groupId}"]`);

            if (!btn || !config || !wrapper) return;

            const isActive = this.currentToolGroup === groupId;
            btn.classList.toggle('active', isActive);

            // Aktualisiere Tooltip mit aktueller Variante
            const currentVariant = config.variants.find(v => v.id === config.currentVariant);
            if (currentVariant) {
                btn.setAttribute('title', `${currentVariant.label}\nKlick: Werkzeug aktivieren\nRechtsklick: Variante wählen`);
            }

            // Aktualisiere Button-Hintergrund (weiß wenn Hintergrund nicht aktiv)
            btn.style.background = config.backgroundEnabled ? config.backgroundColor : '#ffffff';
            btn.style.color = config.symbolColor;

            // Dicker Rahmen wenn aktiv (blaue Farbe)
            btn.style.border = isActive ? '3px solid #4A9EFF' : '';
            btn.style.boxShadow = isActive ? '0 0 8px rgba(74, 158, 255, 0.4)' : '';

            // Aktualisiere Farb-Indikatoren
            const symbolIndicator = wrapper.querySelector('.symbol-color-indicator');
            const bgIndicator = wrapper.querySelector('.bg-color-indicator');

            if (symbolIndicator) {
                symbolIndicator.style.background = config.symbolColor;
            }
            if (bgIndicator) {
                bgIndicator.style.background = config.backgroundColor;
                bgIndicator.style.opacity = config.backgroundEnabled ? '1' : '0.3';
            }
        });

        // Andere Tool-Group-Buttons (pattern, river, road, text) - nur Active-Status
        toolbar.querySelectorAll('[data-tool-group]').forEach(btn => {
            const groupId = btn.dataset.toolGroup;
            if (!['grass', 'tree', 'mountain', 'building'].includes(groupId)) {
                const isActive = btn.dataset.toolGroup === this.currentToolGroup;
                btn.classList.toggle('active', isActive);
            }
        });

        // Farbpalette - aktualisiere sowohl Zustand als auch Farben
        toolbar.querySelectorAll('.hex-color-slot').forEach((btn, index) => {
            const isActive = index === this.activeColorSlot && this.currentToolGroup === null;
            btn.style.border = isActive ? '3px solid #3295D2' : '3px solid transparent';
            btn.style.boxShadow = isActive ? '0 0 4px rgba(255,255,255,0.8)' : 'none';
            // Aktualisiere die Hintergrundfarbe aus der Palette
            btn.style.background = this.colorPalette[index];
        });
    }

    handleClearButton() {
        if (this.drawMode === 'eraser') {
            this.pushHistory();

            if (this.currentToolGroup === 'river') {
                this.data.rivers = [];
            } else if (this.currentToolGroup === 'road') {
                this.data.roads = [];
            } else if (this.currentToolGroup === 'text') {
                this.data.texts = [];
            } else if (this.currentToolGroup) {
                // Lösche alle Symbole dieses Typs
                const config = this.toolConfigs[this.currentToolGroup];
                if (config) {
                    const variantIds = config.variants.map(v => v.id);
                    Object.values(this.data.hexes).forEach(h => {
                        if (variantIds.includes(h.symbol)) {
                            delete h.symbol;
                            delete h.symbolColor;
                            // Farbe nur löschen wenn backgroundEnabled aktiv ist
                            if (config.backgroundEnabled) {
                                delete h.color;
                            }
                        }
                    });
                }
            } else {
                // Lösche alle Waben mit der aktiven Farbe
                const targetColor = this.colorPalette[this.activeColorSlot];
                Object.keys(this.data.hexes).forEach(key => {
                    if (this.data.hexes[key].color === targetColor) {
                        delete this.data.hexes[key];
                    }
                });
            }

            this.render();
            this.requestSave();
        } else {
            if (confirm("Gesamte Karte löschen?")) {
                this.pushHistory();
                this.data.hexes = {};
                this.data.rivers = [];
                this.data.roads = [];
                this.data.texts = [];
                this.render();
                this.requestSave();
            }
        }
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

            this.pushHistory();
            this.isMouseDown = true;
            this.mouseDownPos = { x: world.x, y: world.y };
            this.startHex = this.pixelToHex(world.x, world.y);
            this.lastHex = this.startHex;

            // Muster aufnehmen
            if (this.patternPickMode) {
                const key = `${this.startHex.q}_${this.startHex.r}`;
                const hexData = this.data.hexes[key];
                if (hexData) {
                    this.patternData = JSON.parse(JSON.stringify(hexData));
                    this.patternSourceHex = { q: this.startHex.q, r: this.startHex.r };
                    new Notice('Muster aufgenommen!');
                    // Aktiviere Musterwerkzeug automatisch, damit Rahmen sofort erscheint
                    this.currentToolGroup = 'pattern';
                    this.drawMode = 'pen';
                } else {
                    this.patternData = null;
                    this.patternSourceHex = null;
                    new Notice('Keine Wabe an dieser Position');
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

            let hitText = this.getTextAt(world.x, world.y);
            if (hitText && this.currentToolGroup === 'text' && this.drawMode === 'none') {
                this.draggedText = hitText;
            } else {
                this.processInput(e, true);
            }
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
                if (['river', 'road'].includes(this.currentToolGroup) && this.drawMode === 'pen') {
                    const currentHex = this.pixelToHex(world.x, world.y);
                    this.pathPreview = this.calculateHexPath(this.startHex, currentHex, this.pathWidths[this.currentToolGroup]);
                    this.render();
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
                if (this.pathPreview.length > 0) {
                    const type = this.currentToolGroup === 'river' ? 'rivers' : 'roads';
                    if (!this.data[type]) this.data[type] = [];
                    this.data[type].push(...this.pathPreview);
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
                                    hitText.shadow = sh; hitText.shadowDistance = shd; hitText.shadowOpacity = sho;
                                }
                                else { this.data.texts = this.data.texts.filter(t => t !== hitText); }
                                this.render(); this.requestSave();
                            }, hitText.text, hitText.size, hitText.link, hitText.color, hitText.outline, hitText.bold, hitText.shadow, hitText.shadowDistance, hitText.shadowOpacity, this.colorPalette).open();
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
            this.lastHex = null;
            this.startHex = null;
            this.pathPreview = [];
            this.render();
        };
        this.containerEl.addEventListener('mouseup', stop);
        this.containerEl.addEventListener('mouseleave', stop);

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();

            // Zoom-Faktor berechnen
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const oldZoom = this.data.zoom;
            const newZoom = oldZoom * zoomFactor;

            // Mausposition relativ zum Canvas
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Welt-Koordinaten unter dem Mauszeiger (vor dem Zoom)
            const worldX = (mouseX - this.data.offX) / oldZoom;
            const worldY = (mouseY - this.data.offY) / oldZoom;

            // Neue Offset-Position berechnen, sodass der Punkt unter dem Mauszeiger stabil bleibt
            this.data.offX = mouseX - worldX * newZoom;
            this.data.offY = mouseY - worldY * newZoom;
            this.data.zoom = newZoom;

            this.render();
            // Zoom/Pan nicht speichern - wird beim Öffnen automatisch neu berechnet
        }, { passive: false });

        // Touch-Event-Handler für mobile Geräte
        this.touchState = {
            touches: [],
            initialDistance: 0,
            initialZoom: 1,
            initialPanX: 0,
            initialPanY: 0,
            isTwoFingerGesture: false,
            touchStartTimeout: null,
            pendingTouchStart: null,
            hasMovedSinceStart: false
        };

        this.canvas.addEventListener('touchstart', (e) => {
            this.canvas.focus();
            this.touchState.touches = Array.from(e.touches);

            // Wenn bereits ein Timeout läuft, abbrechen (zweiter Finger erkannt)
            if (this.touchState.touchStartTimeout) {
                clearTimeout(this.touchState.touchStartTimeout);
                this.touchState.touchStartTimeout = null;
                this.touchState.pendingTouchStart = null;
            }

            if (e.touches.length === 2) {
                // Zwei-Finger-Geste: Pan/Zoom aktivieren
                e.preventDefault();
                this.touchState.isTwoFingerGesture = true;
                this.touchState.hasMovedSinceStart = false;

                // Falls durch Ein-Finger bereits etwas gestartet wurde, rückgängig machen
                if (this.isMouseDown && !this.touchState.hasMovedSinceStart) {
                    this.isMouseDown = false;
                    this.draggedText = null;
                    // History nur rückgängig machen, wenn noch nichts gezeichnet wurde
                    if (this.history.length > 0 && !this.touchState.hasMovedSinceStart) {
                        this.history.pop(); // Entferne den History-Eintrag vom Touch-Start
                    }
                }

                const touch1 = e.touches[0];
                const touch2 = e.touches[1];

                // Initiale Distanz für Zoom berechnen
                const dx = touch2.clientX - touch1.clientX;
                const dy = touch2.clientY - touch1.clientY;
                this.touchState.initialDistance = Math.sqrt(dx * dx + dy * dy);
                this.touchState.initialZoom = this.data.zoom;

                // Initiale Position für Pan speichern
                this.touchState.initialPanX = this.data.offX;
                this.touchState.initialPanY = this.data.offY;
                this.touchState.centerX = (touch1.clientX + touch2.clientX) / 2;
                this.touchState.centerY = (touch1.clientY + touch2.clientY) / 2;

                // Speichere die Canvas-Position relativ zum Mittelpunkt
                const rect = this.canvas.getBoundingClientRect();
                this.touchState.pivotX = this.touchState.centerX - rect.left;
                this.touchState.pivotY = this.touchState.centerY - rect.top;
            } else if (e.touches.length === 1) {
                // Ein-Finger-Geste: Warte kurz, ob ein zweiter Finger kommt
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

                // Speichere die Touch-Informationen
                this.touchState.pendingTouchStart = {
                    touch: touch,
                    mouseEvent: mouseEvent,
                    timestamp: Date.now()
                };

                // Warte 150ms, ob ein zweiter Finger kommt
                this.touchState.touchStartTimeout = setTimeout(() => {
                    // Nur ausführen, wenn immer noch ein Finger und kein zweiter hinzugekommen ist
                    if (this.touchState.pendingTouchStart && !this.touchState.isTwoFingerGesture) {
                        const world = this.getWorldCoords(this.touchState.pendingTouchStart.mouseEvent);
                        this.pushHistory();
                        this.isMouseDown = true;
                        this.mouseDownPos = { x: world.x, y: world.y };
                        this.startHex = this.pixelToHex(world.x, world.y);
                        this.lastHex = this.startHex;

                        // Muster aufnehmen
                        if (this.patternPickMode) {
                            const key = `${this.startHex.q}_${this.startHex.r}`;
                            const hexData = this.data.hexes[key];
                            if (hexData) {
                                this.patternData = JSON.parse(JSON.stringify(hexData));
                                this.patternSourceHex = { q: this.startHex.q, r: this.startHex.r };
                                new Notice('Muster aufgenommen!');
                                this.currentToolGroup = 'pattern';
                                this.drawMode = 'pen';
                            } else {
                                this.patternData = null;
                                this.patternSourceHex = null;
                                new Notice('Keine Wabe an dieser Position');
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

                        let hitText = this.getTextAt(world.x, world.y);
                        if (hitText && this.currentToolGroup === 'text' && this.drawMode === 'none') {
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
                // Zwei-Finger-Geste: Pan und Zoom
                e.preventDefault();

                const touch1 = e.touches[0];
                const touch2 = e.touches[1];

                // Zoom berechnen
                const dx = touch2.clientX - touch1.clientX;
                const dy = touch2.clientY - touch1.clientY;
                const currentDistance = Math.sqrt(dx * dx + dy * dy);
                const zoomFactor = currentDistance / this.touchState.initialDistance;
                const newZoom = this.touchState.initialZoom * zoomFactor;

                // Berechne Zoom-Mittelpunkt (Pivot-Point)
                // Der Punkt unter den Fingern soll an derselben Stelle bleiben
                const pivotWorldX = (this.touchState.pivotX - this.touchState.initialPanX) / this.touchState.initialZoom;
                const pivotWorldY = (this.touchState.pivotY - this.touchState.initialPanY) / this.touchState.initialZoom;

                // Neue Offset-Position berechnen, sodass der Pivot-Punkt stabil bleibt
                const newOffX = this.touchState.pivotX - pivotWorldX * newZoom;
                const newOffY = this.touchState.pivotY - pivotWorldY * newZoom;

                // Pan berechnen (Mittelpunkt der beiden Finger)
                const currentCenterX = (touch1.clientX + touch2.clientX) / 2;
                const currentCenterY = (touch1.clientY + touch2.clientY) / 2;
                const deltaX = currentCenterX - this.touchState.centerX;
                const deltaY = currentCenterY - this.touchState.centerY;

                // Kombiniere Zoom-Offset mit Pan-Bewegung
                this.data.zoom = newZoom;
                this.data.offX = newOffX + deltaX;
                this.data.offY = newOffY + deltaY;

                this.render();
            } else if (e.touches.length === 1 && !this.touchState.isTwoFingerGesture) {
                // Ein-Finger-Geste: kontinuierliches Zeichnen/Löschen
                // Nur wenn das Timeout abgelaufen ist (isMouseDown === true)
                if (!this.isMouseDown && this.touchState.pendingTouchStart) {
                    // Noch im Wartemodus - nicht zeichnen
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
                    if (['river', 'road'].includes(this.currentToolGroup) && this.drawMode === 'pen') {
                        const currentHex = this.pixelToHex(world.x, world.y);
                        this.pathPreview = this.calculateHexPath(this.startHex, currentHex, this.pathWidths[this.currentToolGroup]);
                        this.render();
                    } else {
                        this.processInput(mouseEvent, false);
                        this.render();
                    }
                }
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            // Timeout abbrechen, falls noch vorhanden
            if (this.touchState.touchStartTimeout) {
                clearTimeout(this.touchState.touchStartTimeout);
                this.touchState.touchStartTimeout = null;
            }

            if (this.touchState.isTwoFingerGesture && e.touches.length < 2) {
                // Zwei-Finger-Geste beendet
                e.preventDefault();
                this.touchState.isTwoFingerGesture = false;
                // Zoom/Pan nicht speichern - wird beim Öffnen automatisch neu berechnet
            } else if (e.touches.length === 0 && !this.touchState.isTwoFingerGesture) {
                // Ein-Finger-Geste beendet
                e.preventDefault();

                // Falls das Timeout noch nicht abgelaufen war und kein Zeichnen stattfand
                if (this.touchState.pendingTouchStart && !this.isMouseDown) {
                    // Schneller Tap ohne Bewegung - führe die Aktion sofort aus
                    const world = this.getWorldCoords(this.touchState.pendingTouchStart.mouseEvent);
                    this.pushHistory();
                    this.isMouseDown = true;
                    this.mouseDownPos = { x: world.x, y: world.y };
                    this.startHex = this.pixelToHex(world.x, world.y);
                    this.lastHex = this.startHex;

                    // Muster aufnehmen
                    if (this.patternPickMode) {
                        const key = `${this.startHex.q}_${this.startHex.r}`;
                        const hexData = this.data.hexes[key];
                        if (hexData) {
                            this.patternData = JSON.parse(JSON.stringify(hexData));
                            this.patternSourceHex = { q: this.startHex.q, r: this.startHex.r };
                            new Notice('Muster aufgenommen!');
                            this.currentToolGroup = 'pattern';
                            this.drawMode = 'pen';
                        } else {
                            this.patternData = null;
                            this.patternSourceHex = null;
                            new Notice('Keine Wabe an dieser Position');
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

                    let hitText = this.getTextAt(world.x, world.y);
                    if (hitText && this.currentToolGroup === 'text' && this.drawMode === 'none') {
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
                    if (this.pathPreview.length > 0) {
                        const type = this.currentToolGroup === 'river' ? 'rivers' : 'roads';
                        if (!this.data[type]) this.data[type] = [];
                        this.data[type].push(...this.pathPreview);
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
                                        hitText.shadow = sh; hitText.shadowDistance = shd; hitText.shadowOpacity = sho;
                                    }
                                    else { this.data.texts = this.data.texts.filter(t => t !== hitText); }
                                    this.render(); this.requestSave();
                                }, hitText.text, hitText.size, hitText.link, hitText.color, hitText.outline, hitText.bold, hitText.shadow, hitText.shadowDistance, hitText.shadowOpacity, this.colorPalette).open();
                            } else if (hitText.link) {
                                this.app.workspace.openLinkText(hitText.link, this.file.path, true);
                            }
                        }
                    }
                }
                if (this.isMouseDown || this.draggedText) this.requestSave();
                this.isMouseDown = false;
                this.draggedText = null;
                this.lastHex = null;
                this.startHex = null;
                this.pathPreview = [];
                this.touchState.pendingTouchStart = null;
                this.render();
            }

            this.touchState.touches = Array.from(e.touches);
        }, { passive: false });

        this.canvas.addEventListener('touchcancel', (e) => {
            // Touch wurde unterbrochen (z.B. durch System-Geste)
            e.preventDefault();

            // Timeout abbrechen
            if (this.touchState.touchStartTimeout) {
                clearTimeout(this.touchState.touchStartTimeout);
                this.touchState.touchStartTimeout = null;
            }

            this.touchState.isTwoFingerGesture = false;
            this.touchState.pendingTouchStart = null;
            this.isMouseDown = false;
            this.draggedText = null;
            this.lastHex = null;
            this.startHex = null;
            this.pathPreview = [];
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
        const world = this.getWorldCoords(e);
        const hex = this.pixelToHex(world.x, world.y);

        // Text-Modus: Funktioniert im 'none'-Modus (kein Zeichenmodus aktiv)
        if (this.currentToolGroup === 'text' && this.drawMode === 'none' && isInitial) {
            const existingText = this.getTextAt(world.x, world.y);
            if (!existingText) {
                new TextInputModal(this.app, (v, s, l, c, o, b, sh, shd, sho) => {
                    if(v) {
                        this.data.texts.push({text: v, x: world.x, y: world.y, size: s, link: l, color: c, outline: o, bold: b, shadow: sh, shadowDistance: shd, shadowOpacity: sho});
                        this.lastUsedTextSize = s; this.lastUsedTextColor = c; this.lastUsedTextOutline = o; this.lastUsedTextBold = b;
                        this.lastUsedTextShadow = sh; this.lastUsedTextShadowDistance = shd; this.lastUsedTextShadowOpacity = sho;
                        this.render(); this.requestSave();
                    }
                }, '', this.lastUsedTextSize, '', this.lastUsedTextColor, this.lastUsedTextOutline, this.lastUsedTextBold, this.lastUsedTextShadow, this.lastUsedTextShadowDistance, this.lastUsedTextShadowOpacity, this.colorPalette).open();
            }
            return;
        }

        // Pointer-Modus oder 'none'-Modus ohne Text: Navigation only
        if (this.drawMode === 'pointer' || this.drawMode === 'none') {
            return;
        }

        if (this.drawMode === 'eraser') {
            this.handleEraser(hex, world.x, world.y);
        } else if (this.drawMode === 'fill') {
            if (isInitial) this.handleFillTool(hex);
        } else if (this.drawMode === 'pen') {
            if (!['river', 'road', 'text'].includes(this.currentToolGroup)) {
                this.paintHex(hex);
            }
        }
    }

    paintHex(hex) {
        const key = `${hex.q}_${hex.r}`;
        let h = this.data.hexes[key];

        if (!h) {
            h = { q: hex.q, r: hex.r };
            this.data.hexes[key] = h;
        }

        // Muster anwenden
        if (this.currentToolGroup === 'pattern' && this.patternData) {
            h.color = this.patternData.color;
            h.symbol = this.patternData.symbol;
            h.symbolColor = this.patternData.symbolColor;
            h.backgroundColor = this.patternData.backgroundColor;
            return;
        }

        // Werkzeug-Gruppen
        if (this.currentToolGroup && this.toolConfigs[this.currentToolGroup]) {
            const config = this.toolConfigs[this.currentToolGroup];
            h.symbol = config.currentVariant;
            h.symbolColor = config.symbolColor;

            // Hintergrundfarbe nur setzen, wenn der Toggle aktiv ist
            if (config.backgroundEnabled) {
                h.color = config.backgroundColor;
            }
            // Wenn Toggle nicht aktiv ist, Hintergrundfarbe nicht ändern
        }
        // Farbpalette - NUR Farbe ändern, Symbole bleiben erhalten
        else if (this.currentToolGroup === null) {
            h.color = this.colorPalette[this.activeColorSlot];
            // Symbole NICHT löschen
        }
    }

    handleEraser(hex, x, y) {
        if (this.currentToolGroup === 'text') {
            const hit = this.getTextAt(x, y);
            if (hit) this.data.texts = this.data.texts.filter(t => t !== hit);
        } else if (this.currentToolGroup === 'river' || this.currentToolGroup === 'road') {
            const type = this.currentToolGroup === 'river' ? 'rivers' : 'roads';
            this.data[type] = this.data[type].filter(p => !(p.to.q === hex.q && p.to.r === hex.r));
        } else {
            const key = `${hex.q}_${hex.r}`;
            const h = this.data.hexes[key];

            if (h) {
                if (this.currentToolGroup && this.toolConfigs[this.currentToolGroup]) {
                    // Lösche nur Symbol dieses Typs
                    const config = this.toolConfigs[this.currentToolGroup];
                    const variantIds = config.variants.map(v => v.id);
                    if (variantIds.includes(h.symbol)) {
                        delete h.symbol;
                        delete h.symbolColor;
                        // Farbe nur löschen, wenn backgroundEnabled aktiv war
                        if (config.backgroundEnabled) {
                            delete h.color;
                        }
                        // Wenn die Hex jetzt leer ist, lösche sie komplett
                        if (!h.symbol && !h.color) {
                            delete this.data.hexes[key];
                        }
                    }
                } else if (this.currentToolGroup === null) {
                    // Lösche alle Hintergrundfarben (nicht nur die aktive Farbe)
                    if (h.color) {
                        delete h.color;
                        // Wenn keine Symbole mehr vorhanden, lösche die Hex komplett
                        if (!h.symbol) {
                            delete this.data.hexes[key];
                        }
                    }
                }
                // Kein else-Block mehr - leere Hexes werden NICHT gelöscht, wenn ein Werkzeug aktiv ist
            }
        }
    }

    handleFillTool(startHex) {
        const key = `${startHex.q}_${startHex.r}`;
        const startData = this.data.hexes[key];

        // Wenn die Wabe leer ist, prüfe ob sie von einem Rahmen umgeben ist
        if (!startData) {
            if (!this.isEnclosedByFrame(startHex)) {
                return; // Nicht füllen, wenn kein Rahmen vorhanden
            }
            // Wenn umrahmt, fülle mit aktueller Farbe/Werkzeug
            this.floodFillEmpty(startHex);
            return;
        }

        // Füllen mit Muster
        if (this.currentToolGroup === 'pattern' && this.patternData) {
            const targetColor = startData.color;
            const targetSymbol = startData.symbol;
            this.floodFillPattern(startHex, targetColor, targetSymbol);
        }
        // Füllen mit Farbe
        else if (this.currentToolGroup === null) {
            const targetColor = startData.color;
            const newColor = this.colorPalette[this.activeColorSlot];
            this.floodFillColor(startHex, targetColor, newColor);
        }
        // Füllen mit Symbol
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

            // Nur weitermachen, wenn die Farbe übereinstimmt
            if (currentColor !== targetColor) continue;

            // Setze neue Farbe
            if (hexData) {
                hexData.color = newColor;
            } else {
                this.data.hexes[key] = { q: hex.q, r: hex.r, color: newColor };
            }

            // Füge nur Nachbarn hinzu, nachdem bestätigt wurde, dass diese Hex gefüllt wurde
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

            // Prüfe ob Symbol UND Hintergrundfarbe übereinstimmen (beide Bedingungen müssen erfüllt sein)
            if (currentSymbol !== targetSymbol || currentColor !== targetColor) continue;

            // Setze neues Symbol
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

            // Füge Nachbarn hinzu
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

            // Prüfe ob Wabe zur Zielgruppe gehört (Farbe UND Symbol müssen übereinstimmen)
            if (currentColor !== targetColor || currentSymbol !== targetSymbol) continue;

            // Wende Muster an
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

            // Füge Nachbarn hinzu
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
        // Prüfe ob der leere Bereich von Hexen umgeben ist (Floodfill mit Grenze)
        const visited = new Set();
        const queue = [startHex];
        const maxDistance = 50; // Maximale Distanz zum Prüfen (verhindert endlose Suche)
        let foundBoundary = false;

        while (queue.length > 0) {
            const hex = queue.shift();
            const key = `${hex.q}_${hex.r}`;

            if (visited.has(key)) continue;

            // Wenn zu weit entfernt, ist es wahrscheinlich nicht umrahmt
            const distance = Math.abs(hex.q - startHex.q) + Math.abs(hex.r - startHex.r);
            if (distance > maxDistance) {
                return false; // Zu weit = nicht umrahmt
            }

            visited.add(key);

            const hexData = this.data.hexes[key];

            // Wenn eine Hex mit Daten gefunden wird, ist das eine Grenze
            if (hexData) {
                foundBoundary = true;
                continue; // Nicht weiter in diese Richtung
            }

            // Füge leere Nachbarn hinzu
            const neighbors = this.getHexNeighbors(hex);
            neighbors.forEach(n => queue.push(n));
        }

        // Wenn wir eine Grenze gefunden haben und nicht zu weit gekommen sind, ist es umrahmt
        return foundBoundary && visited.size < (maxDistance * maxDistance);
    }

    floodFillEmpty(startHex) {
        // Fülle leeren Bereich nur innerhalb des Rahmens
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

            // Stoppe an gefüllten Hexen (Rahmen)
            if (hexData) continue;

            // Erstelle neue Hex mit aktuellem Werkzeug/Farbe
            if (this.currentToolGroup === 'pattern' && this.patternData) {
                this.data.hexes[key] = {
                    q: hex.q,
                    r: hex.r,
                    color: this.patternData.color,
                    symbol: this.patternData.symbol,
                    symbolColor: this.patternData.symbolColor,
                    backgroundColor: this.patternData.backgroundColor
                };
            } else if (this.currentToolGroup === null) {
                // Farbpalette
                this.data.hexes[key] = {
                    q: hex.q,
                    r: hex.r,
                    color: this.colorPalette[this.activeColorSlot]
                };
            } else if (this.toolConfigs[this.currentToolGroup]) {
                // Werkzeug-Gruppe
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

            // Füge Nachbarn hinzu
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

        // Zeichne Waben
        Object.values(this.data.hexes).forEach(h => {
            this.drawHexBase(h);
        });

        // Flüsse
        this.drawWavyLines(this.data.rivers, '#3295D2', 5);

        // Wege
        this.drawWavyLines(this.data.roads, '#f5deb3', 3);

        // Symbole in Schichten
        const symbolLayers = [
            ['hill', 'mountain'],
            ['grass', 'swamp'],
            ['bush', 'tree', 'pine', 'palm'],
            ['tent', 'house', 'village', 'city', 'castle', 'monastery', 'tower', 'ruin', 'cave', 'oasis']
        ];

        // SVG-Symbole sammeln für DOM-Rendering (Vektoren)
        const svgSymbols = [];

        symbolLayers.forEach(layer => {
            Object.values(this.data.hexes).forEach(h => {
                if (h.symbol && layer.includes(h.symbol)) {
                    const pos = this.hexToPixel(h);
                    // Prüfe ob Symbol als SVG verfügbar ist
                    if (this.svgSymbols[h.symbol]) {
                        // Rendere als Vektor im SVG-Layer
                        svgSymbols.push({ symbol: h.symbol, pos: pos, color: h.symbolColor, hex: h });
                    } else {
                        // Fallback: Canvas-Rendering für Symbole ohne SVG
                        this.drawCustomSymbol(h.symbol, pos.x, pos.y, this.data.gridSize, h.symbolColor);
                    }
                }
            });
        });

        // Render SVG-Symbole im DOM als Vektoren
        this.renderSVGSymbols(svgSymbols);

        // Path-Preview (vor Texten, damit Texte darüber erscheinen)
        if (this.pathPreview.length > 0) {
            this.ctx.globalAlpha = 0.5;
            const color = this.currentToolGroup === 'river' ? '#3295D2' : '#f5deb3';
            this.drawWavyLines(this.pathPreview, color, this.pathWidths[this.currentToolGroup]);
            this.ctx.globalAlpha = 1.0;
        }

        // Roter Rahmen um Musterwabe (nur wenn Musterwerkzeug aktiv)
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

        // Texte auf separatem Layer zeichnen (über SVG-Symbolen)
        this.renderTexts();
    }

    renderTexts() {
        if (!this.textCtx || !this.textCanvas) return;

        // Leere den Text-Canvas
        this.textCtx.clearRect(0, 0, this.textCanvas.width, this.textCanvas.height);

        // Wende dieselbe Transformation wie im Haupt-Canvas an
        this.textCtx.save();
        this.textCtx.translate(this.data.offX, this.data.offY);
        this.textCtx.scale(this.data.zoom, this.data.zoom);

        // Zeichne alle Texte
        if (this.data.texts) this.data.texts.forEach(t => {
            const weight = t.bold ? "bold " : "";
            this.textCtx.font = `${weight}${t.size || 16}px Verdana`;
            this.textCtx.textAlign = "center";

            if (t.shadow) {
                const distance = t.shadowDistance || 5;
                const opacity = (t.shadowOpacity || 50) / 100;
                this.textCtx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
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

        // Leere den SVG-Layer
        while (this.svgLayer.firstChild) {
            this.svgLayer.removeChild(this.svgLayer.firstChild);
        }

        // Erstelle SVG-Elemente für jedes Symbol
        symbols.forEach(({ symbol, pos, color }) => {
            if (this.svgSymbols[symbol]) {
                // Hole Symbol-Konfiguration aus der Tabelle
                const config = this.svgSymbolConfig[symbol] || { size: 0.30, align: 'center', marginX: 0, marginY: 0 };

                // Transformiere Koordinaten von Canvas zu Bildschirm
                const screenX = pos.x * this.data.zoom + this.data.offX;
                const screenY = pos.y * this.data.zoom + this.data.offY;

                // Berechne Größe mit konfigurierbarem Multiplikator
                const baseSize = this.data.gridSize * 2.0; // Basis-Größe
                const size = baseSize * config.size * this.data.zoom;

                // Berechne Hex-Dimensionen für Alignment
                const hexWidth = this.data.gridSize * Math.sqrt(3) * this.data.zoom;
                const hexHeight = this.data.gridSize * 2 * this.data.zoom;

                // Berechne Alignment-Offsets basierend auf align-Wert
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
                            // center ist default (0, 0)
                            break;
                    }
                });

                // Addiere prozentuale Margins aus Konfiguration
                offsetX += (config.marginX / 100) * hexWidth;
                offsetY += (config.marginY / 100) * hexHeight;

                // Hole Path-Daten und ViewBox aus geladenem SVG
                const svgData = this.svgSymbols[symbol];
                const viewBoxSize = svgData.viewBoxWidth;

                // Erstelle Gruppe mit Transformation inkl. Alignment
                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                const scale = size / viewBoxSize;
                const finalX = screenX - size/2 + offsetX;
                const finalY = screenY - size/2 + offsetY;
                g.setAttribute('transform', `translate(${finalX}, ${finalY}) scale(${scale})`);

                // Erstelle Path-Element mit geladenen Path-Daten
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', svgData.pathData);
                path.setAttribute('fill', color || '#228B22');
                g.appendChild(path);

                this.svgLayer.appendChild(g);
            }
        });
    }

    drawHexBase(h) {
        const pos = this.hexToPixel(h), s = this.data.gridSize;
        this.ctx.beginPath();
        for (let i=0; i<6; i++) {
            const a = (Math.PI/180) * (60*i - 30);
            this.ctx.lineTo(pos.x + s*Math.cos(a), pos.y + s*Math.sin(a));
        }
        this.ctx.closePath();

        // Wabenfarbe (kann Hintergrund von Symbol oder normale Farbe sein)
        if (h.color) {
            this.ctx.fillStyle = h.color;
            this.ctx.fill();
        }

        // Rahmen
        this.ctx.strokeStyle = 'rgba(128,128,128,0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
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

        // Alle SVG-Symbole werden über den SVG-Layer als Vektoren gerendert
        // Diese Funktion wird nur noch für Fallback-Rendering verwendet

        // Vegetation
        if (type === 'grass') {
            // Drei vertikale Striche
            for (let i = 0; i < 3; i++) {
                const x = (i - 1) * s * 0.3;
                this.ctx.moveTo(x, s * 0.3);
                this.ctx.lineTo(x, -s * 0.3);
            }
            this.ctx.stroke();
        } else if (type === 'swamp') {
            // Horizontale Wellenlinien
            for (let i = 0; i < 3; i++) {
                const y = (i - 1) * s * 0.25;
                this.ctx.moveTo(-s * 0.5, y);
                this.ctx.quadraticCurveTo(-s * 0.25, y - s * 0.1, 0, y);
                this.ctx.quadraticCurveTo(s * 0.25, y + s * 0.1, s * 0.5, y);
            }
            this.ctx.stroke();
        }
        // Bäume
        else if (type === 'bush') {
            // Kleiner runder Busch
            this.ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
            this.ctx.stroke();
        } else if (type === 'tree') {
            // Laubbaum - Fallback falls SVG nicht geladen wurde
            this.ctx.beginPath();
            this.ctx.arc(0, -s * 0.2, s * 0.3, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(0, s * 0.1);
            this.ctx.lineTo(0, s * 0.5);
            this.ctx.stroke();
        } else if (type === 'pine') {
            // Nadelbaum (mehrere übereinander liegende Dreiecke)
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
            // Palme (Stamm + Wedel)
            this.ctx.moveTo(0, -s * 0.5);
            this.ctx.lineTo(0, s * 0.4);
            this.ctx.stroke();
            // Wedel
            for (let i = 0; i < 4; i++) {
                const angle = (i * Math.PI / 2) - Math.PI / 4;
                this.ctx.beginPath();
                this.ctx.moveTo(0, -s * 0.5);
                this.ctx.lineTo(Math.cos(angle) * s * 0.4, -s * 0.5 + Math.sin(angle) * s * 0.4);
                this.ctx.stroke();
            }
        }
        // Berge
        else if (type === 'hill') {
            // Einzelner Hügel (gerundete Erhebung)
            this.ctx.moveTo(-s * 0.6, s * 0.3);
            this.ctx.quadraticCurveTo(-s * 0.3, -s * 0.4, 0, -s * 0.3);
            this.ctx.quadraticCurveTo(s * 0.3, -s * 0.4, s * 0.6, s * 0.3);
            this.ctx.stroke();
        } else if (type === 'mountain') {
            // Berg mit zwei Gipfeln
            this.ctx.beginPath();
            this.ctx.moveTo(-s * 0.8, s * 0.5);
            this.ctx.lineTo(0, -s * 0.6);
            this.ctx.lineTo(s * 0.8, s * 0.5);
            this.ctx.moveTo(-s * 0.3, s * 0.5);
            this.ctx.lineTo(s * 0.3, -s * 0.1);
            this.ctx.lineTo(s * 0.7, s * 0.5);
            this.ctx.stroke();
        }
        // Gebäude
        else if (type === 'tent') {
            // Zelt (Dreieck)
            this.ctx.moveTo(-s * 0.4, s * 0.3);
            this.ctx.lineTo(0, -s * 0.4);
            this.ctx.lineTo(s * 0.4, s * 0.3);
            this.ctx.closePath();
            this.ctx.stroke();
        } else if (type === 'house') {
            // Haus
            this.ctx.rect(-s*0.3, -s*0.1, s*0.6, s*0.5);
            this.ctx.moveTo(-s*0.4, -s*0.1);
            this.ctx.lineTo(0, -s*0.5);
            this.ctx.lineTo(s*0.4, -s*0.1);
            this.ctx.stroke();
        } else if (type === 'village') {
            // Dorf (3 Häuser)
            for(let i=0; i<3; i++) {
                const ox = (i-1)*s*0.4, oy = (i%2)*s*0.2;
                this.ctx.moveTo(ox-s*0.2, oy+s*0.3);
                this.ctx.lineTo(ox-s*0.2, oy);
                this.ctx.lineTo(ox, oy-s*0.2);
                this.ctx.lineTo(ox+s*0.2, oy);
                this.ctx.lineTo(ox+s*0.2, oy+s*0.3);
                this.ctx.stroke();
            }
        } else if (type === 'city') {
            // Stadt mit Brunnen (Häuser um Kreis)
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
            // Burg mit Türmen
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
        } else if (type === 'monastery') {
            // Kloster (Haus mit Kreuz)
            this.ctx.rect(-s*0.4, -s*0.2, s*0.8, s*0.6);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(0, -s*0.6);
            this.ctx.lineTo(0, -s*0.2);
            this.ctx.moveTo(-s*0.15, -s*0.5);
            this.ctx.lineTo(s*0.15, -s*0.5);
            this.ctx.stroke();
        } else if (type === 'tower') {
            // Turm (schlankes Rechteck)
            this.ctx.rect(-s*0.2, -s*0.6, s*0.4, s*1.0);
            this.ctx.stroke();
            // Zinnen
            for (let i = 0; i < 3; i++) {
                const x = -s*0.2 + i * s*0.2;
                this.ctx.beginPath();
                this.ctx.rect(x, -s*0.7, s*0.15, s*0.1);
                this.ctx.stroke();
            }
        } else if (type === 'ruin') {
            // Ruine (unvollständiges Gebäude)
            this.ctx.moveTo(-s*0.4, s*0.3);
            this.ctx.lineTo(-s*0.4, -s*0.1);
            this.ctx.lineTo(-s*0.2, -s*0.3);
            this.ctx.moveTo(0, s*0.3);
            this.ctx.lineTo(0, 0);
            this.ctx.moveTo(s*0.3, s*0.3);
            this.ctx.lineTo(s*0.3, -s*0.2);
            this.ctx.stroke();
        } else if (type === 'cave') {
            // Höhle (Halbkreis-Eingang)
            this.ctx.arc(0, s*0.2, s*0.35, Math.PI, 0, true);
            this.ctx.lineTo(s*0.35, s*0.4);
            this.ctx.lineTo(-s*0.35, s*0.4);
            this.ctx.closePath();
            this.ctx.stroke();
        } else if (type === 'oasis') {
            // Oase (Teich + Palme)
            this.ctx.ellipse(0, s*0.2, s*0.4, s*0.25, 0, 0, Math.PI * 2);
            this.ctx.stroke();
            // Mini-Palme
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

    drawWavyLines(lines, color, defaultWidth) {
        if (!lines) return;
        this.ctx.strokeStyle = color;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";

        lines.forEach(l => {
            const p1 = this.hexToPixel(l.from), p2 = this.hexToPixel(l.to);
            this.ctx.lineWidth = l.width || defaultWidth;

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
                // Speichere Werkzeug-Einstellungen
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
                    activeColorSlot: this.activeColorSlot,
                    drawMode: this.drawMode,
                    currentToolGroup: this.currentToolGroup,
                    toolConfigs: toolConfigsToSave,
                    patternData: this.patternData,
                    patternSourceHex: this.patternSourceHex
                };

                // Erstelle MD-Format mit Frontmatter und JSON-Codeblock
                // Durch .hexworld.md Endung wird die Datei automatisch von Obsidian Sync synchronisiert
                const now = new Date().toISOString().split('T')[0];
                const frontmatter = `---\ntype: hexworld\ncreated: ${now}\n---\n\n`;
                const jsonData = JSON.stringify(this.data, null, 2);
                // Entferne .hexworld.md für den Titel, behalte nur den Namen
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

        // Resize auch den Text-Canvas
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
        // Konvertiere Pixel zu Axial-Koordinaten (fractional)
        const q = (Math.sqrt(3)/3 * x - 1/3 * y) / s;
        const r = (2/3 * y) / s;

        // Konvertiere zu kubischen Koordinaten für korrektes Runden
        const cubeX = q;
        const cubeZ = r;
        const cubeY = -cubeX - cubeZ;

        // Runde kubische Koordinaten
        let rx = Math.round(cubeX);
        let ry = Math.round(cubeY);
        let rz = Math.round(cubeZ);

        // Korrektur: Stelle sicher, dass x + y + z = 0 bleibt
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

        // Konvertiere zurück zu Axial-Koordinaten
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
        contentEl.createEl('h2', { text: 'MD Datei auswählen' });

        const filter = contentEl.createEl('input', { value: this.currentLink, placeholder: 'Dateiname suchen...' });
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
                listContainer.createDiv({ text: 'Keine Dateien gefunden', style: 'padding: 10px; color: var(--text-muted); text-align: center;' });
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

        const clearBtn = btnRow.createEl('button', { text: 'Link entfernen', style: 'flex: 1;' });
        clearBtn.onclick = () => {
            this.onSelect('');
            setTimeout(() => {
                this.close();
                if (activeDocument.activeElement instanceof HTMLElement) {
                    activeDocument.activeElement.blur();
                }
            }, 50);
        };

        const cancelBtn = btnRow.createEl('button', { text: 'Abbrechen', cls: 'mod-cta', style: 'flex: 1;' });
        cancelBtn.onclick = () => this.close();

        filter.focus();
    }
}

class TextInputModal extends Modal {
    constructor(app, onSubmit, val = '', size = 16, link = '', color = '#ffffff', outline = true, bold = false, shadow = false, shadowDistance = 5, shadowOpacity = 50, colorPalette = null) {
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
        this.shadowOpacity = shadowOpacity;
        this.colorPalette = colorPalette || ['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Text formatieren' });

        // Anzeigetext
        contentEl.createEl('label', { text: 'Anzeigetext:', style: 'display: block; margin-bottom: 5px; font-weight: 500;' });
        const mainInput = contentEl.createEl('input', { value: this.val, placeholder: 'Text eingeben...' });
        mainInput.style.width = '100%';
        mainInput.style.marginBottom = '20px';
        mainInput.style.padding = '8px';

        // Textgröße
        contentEl.createEl('label', { text: 'Textgröße:', style: 'display: block; margin-bottom: 5px; font-weight: 500;' });
        const sInput = contentEl.createEl('input', { type: 'number', value: this.size });
        sInput.style.width = '100%';
        sInput.style.marginBottom = '20px';
        sInput.style.padding = '8px';

        // Farbe
        const colorSection = contentEl.createDiv({ style: 'margin-bottom: 20px;' });
        colorSection.createEl('label', { text: 'Textfarbe:', style: 'display: block; margin-bottom: 5px; font-weight: 500;' });
        const colorInput = colorSection.createEl('input', { type: 'color', value: this.color });
        colorInput.style.width = '100%';
        colorInput.style.height = '40px';
        colorInput.style.cursor = 'pointer';

        // Farbpalette unter dem Color Picker
        const paletteRow = colorSection.createDiv({ style: 'display: flex; gap: 5px; flex-wrap: wrap; margin-top: 10px;' });
        paletteRow.createEl('span', { text: 'Palette:', attr: { style: 'width: 100%; font-size: 11px; margin-bottom: 5px;' } });

        this.colorPalette.forEach(color => {
            const paletteBtn = paletteRow.createEl('button', {
                attr: {
                    style: `width: 30px; height: 30px; background: ${color}; border: 2px solid var(--divider-color); border-radius: 3px; cursor: pointer;`
                }
            });
            paletteBtn.onclick = () => {
                colorInput.value = color;
                this.color = color;
            };
        });

        // Formatierungsoptionen (Checkboxen in Grid)
        const formatSection = contentEl.createDiv({ style: 'margin-bottom: 20px;' });
        formatSection.createEl('label', { text: 'Formatierung:', style: 'display: block; margin-bottom: 8px; font-weight: 500;' });

        const checkboxGrid = formatSection.createDiv({ style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px;' });

        const outlineLabel = checkboxGrid.createEl('label', { style: 'display: flex; gap: 8px; align-items: center; cursor: pointer;' });
        const outlineInput = outlineLabel.createEl('input', { type: 'checkbox' });
        outlineInput.checked = this.outline;
        outlineInput.style.cursor = 'pointer';
        outlineInput.style.marginLeft = '4px';
        outlineLabel.appendText('Outline');

        const boldLabel = checkboxGrid.createEl('label', { style: 'display: flex; gap: 8px; align-items: center; cursor: pointer;' });
        const boldInput = boldLabel.createEl('input', { type: 'checkbox' });
        boldInput.checked = this.bold;
        boldInput.style.cursor = 'pointer';
        boldInput.style.marginLeft = '4px';
        boldLabel.appendText('Fett');

        // Schatten-Einstellungen
        const shadowSection = contentEl.createDiv({ style: 'margin-bottom: 20px; padding: 15px; background: var(--background-secondary); border-radius: 5px;' });
        shadowSection.createEl('label', { text: 'Schatten-Einstellungen:', style: 'display: block; margin-bottom: 10px; font-weight: 500;' });

        const shadowLabel = shadowSection.createEl('label', { style: 'display: flex; gap: 8px; align-items: center; cursor: pointer; margin-bottom: 12px;' });
        const shadowInput = shadowLabel.createEl('input', { type: 'checkbox' });
        shadowInput.checked = this.shadow;
        shadowInput.style.cursor = 'pointer';
        shadowInput.style.marginLeft = '4px';
        shadowLabel.appendText('Schatten aktivieren');

        const shadowParams = shadowSection.createDiv({ style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px;' });

        const distanceDiv = shadowParams.createDiv();
        distanceDiv.createEl('label', { text: 'Abstand (px):', style: 'display: block; margin-bottom: 5px; font-size: 12px;' });
        const shadowDistanceInput = distanceDiv.createEl('input', {
            type: 'number',
            value: this.shadowDistance.toString()
        });
        shadowDistanceInput.style.width = '100%';
        shadowDistanceInput.style.padding = '6px';

        const opacityDiv = shadowParams.createDiv();
        opacityDiv.createEl('label', { text: 'Transparenz (%):', style: 'display: block; margin-bottom: 5px; font-size: 12px;' });
        const shadowOpacityInput = opacityDiv.createEl('input', {
            type: 'number',
            value: this.shadowOpacity.toString()
        });
        shadowOpacityInput.style.width = '100%';
        shadowOpacityInput.style.padding = '6px';
        shadowOpacityInput.min = '0';
        shadowOpacityInput.max = '100';

        // Link-Sektion
        const linkSection = contentEl.createDiv({ style: 'margin-bottom: 20px;' });
        linkSection.createEl('label', { text: 'Link zu MD-Datei:', style: 'display: block; margin-bottom: 5px; font-weight: 500;' });

        const linkDisplayRow = linkSection.createDiv({ style: 'display: flex; gap: 8px; align-items: stretch;' });
        const linkDisplay = linkDisplayRow.createEl('input', {
            value: this.link,
            placeholder: 'Kein Link ausgewählt',
            attr: { readonly: 'true' }
        });
        linkDisplay.style.flex = '1';
        linkDisplay.style.background = 'var(--background-secondary)';
        linkDisplay.style.cursor = 'default';
        linkDisplay.style.padding = '8px';

        const selectLinkBtn = linkDisplayRow.createEl('button', { text: 'Datei wählen...' });
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

        // Button-Reihe
        const btnRow = contentEl.createDiv({ style: 'display: flex; gap: 10px; margin-top: 25px; padding-top: 15px; border-top: 1px solid var(--background-modifier-border);' });
        const okBtn = btnRow.createEl('button', { text: 'OK', cls: 'mod-cta', style: 'flex: 1;' });
        okBtn.onclick = () => {
            const opacityValue = shadowOpacityInput.value === '' ? 0 : parseInt(shadowOpacityInput.value);
            const clampedOpacity = Math.max(0, Math.min(100, opacityValue));
            const shadowEnabled = clampedOpacity === 0 ? false : shadowInput.checked;

            this.onSubmit(
                mainInput.value,
                parseInt(sInput.value),
                linkDisplay.value,
                colorInput.value,
                outlineInput.checked,
                boldInput.checked,
                shadowEnabled,
                parseInt(shadowDistanceInput.value) || 5,
                clampedOpacity
            );
            this.close();
        };

        const deleteBtn = btnRow.createEl('button', { text: 'Text löschen', style: 'flex: 1; color: var(--text-error);' });
        deleteBtn.onclick = () => {
            if (confirm('Text wirklich löschen?')) {
                this.onSubmit('', 0, '', '', false, false, false, 0, 0);
                this.close();
            }
        };

        mainInput.focus();
    }
}

module.exports = HexWorldEditorPlugin;
