import { PATH_OVERLAP_SPACING } from '../constants';
import { hexToPixel, calculateHexPath } from '../utils/hexMath';

/**
 * Handles the full render pipeline for a HexCartographerView:
 * per-frame canvas drawing, full-map export, and all hex/path/border/text/symbol primitives.
 */
export class RenderManager {
    private readonly view: any;
    private overlapMap: Record<string, any> = {};

    constructor(view: any) {
        this.view = view;
    }

    render() {
        const v = this.view;
        if (!v.ctx) return;
        v.ctx.clearRect(0, 0, v.canvas.width, v.canvas.height);
        v.ctx.save();
        v.ctx.translate(v.data.offX, v.data.offY);
        v.ctx.scale(v.data.zoom, v.data.zoom);

        Object.values(v.data.hexes).forEach(h => {
            this.drawHexBase(h);
        });

        // Draw order (bottom → top):

        const drawSymbolLayer = (symbols) => {
            Object.values(v.data.hexes).forEach((h: any) => {
                if (h.symbol && symbols.includes(h.symbol)) {
                    const pos = hexToPixel(h, v.data.gridSize, v.hexOrientation);
                    if (v.svgSymbols[h.symbol]) {
                        this.drawSVGOnCanvas(h.symbol, pos, h.symbolColor);
                    } else {
                        this.drawCustomSymbol(h.symbol, pos.x, pos.y, v.data.gridSize, h.symbolColor);
                    }
                }
            });
        };

        drawSymbolLayer(['swamp','grass', 'bush', 'tree', 'pine', 'palm']);

        drawSymbolLayer(['hill', 'mountain']);

        this.buildOverlapMap();
        this.drawRivers();

        this.drawRoads();

        drawSymbolLayer(['question', 'exclamation', 'cross', 'dot', 'shield', 'pirateskull']);

        drawSymbolLayer(['tent', 'house', 'village', 'town', 'castle', 'harbor', 'monastery', 'tower', 'ruins', 'cave', 'oasis']);

        this.drawBorders();

        this.drawPathWaypoints(); // Waypoints always last (above all other elements)

        if (v.svgLayer) {
            while (v.svgLayer.firstChild) v.svgLayer.removeChild(v.svgLayer.firstChild);
        }


        if (v.currentToolGroup === 'pattern' && v.patternSourceHex) {
            const pos = hexToPixel(v.patternSourceHex, v.data.gridSize, v.hexOrientation);
            const s = v.data.gridSize;

            v.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 180) * (60 * i + (v.hexOrientation ? 0 : -30));
                v.ctx.lineTo(pos.x + s * Math.cos(a), pos.y + s * Math.sin(a));
            }
            v.ctx.closePath();
            v.ctx.strokeStyle = '#FF0000';
            v.ctx.lineWidth = 3;
            v.ctx.stroke();
        }

        v.ctx.restore();

        this.renderCrosshair();
        this.renderTexts();
        this.renderHexNumbering();
    }

    renderCrosshair() {
        const v = this.view;
        if (!v.plugin.settings.showCrosshair) return;

        const origin = hexToPixel({ q: 0, r: 0 }, v.data.gridSize, v.hexOrientation);
        const sx = origin.x * v.data.zoom + v.data.offX;
        const sy = origin.y * v.data.zoom + v.data.offY;
        const arm = 2 * v.data.gridSize * v.data.zoom;

        v.ctx.save();
        v.ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)';
        v.ctx.lineWidth = 2;
        v.ctx.beginPath();
        v.ctx.moveTo(sx - arm, sy);
        v.ctx.lineTo(sx + arm, sy);
        v.ctx.moveTo(sx, sy - arm);
        v.ctx.lineTo(sx, sy + arm);
        v.ctx.stroke();
        v.ctx.restore();
    }

    renderTexts() {
        const v = this.view;
        if (!v.textCtx || !v.textCanvas) return;

        v.textCtx.clearRect(0, 0, v.textCanvas.width, v.textCanvas.height);

        v.textCtx.save();
        v.textCtx.translate(v.data.offX, v.data.offY);
        v.textCtx.scale(v.data.zoom, v.data.zoom);

        if (v.data.texts) v.data.texts.forEach(t => {
            const weight = t.bold ? "bold " : "";
            v.textCtx.font = `${weight}${t.size || 16}px Verdana`;
            v.textCtx.textAlign = "center";

            if (t.shadow) {
                const distance = t.shadowDistance || 5;
                const opatown = (t.shadowOpatown || 50) / 100;
                v.textCtx.fillStyle = `rgba(0, 0, 0, ${opatown})`;
                v.textCtx.fillText(t.text, t.x + distance, t.y + distance);
            }

            v.textCtx.strokeStyle = "black";
            v.textCtx.lineWidth = 2;
            if (t.outline !== false) v.textCtx.strokeText(t.text, t.x, t.y);

            v.textCtx.fillStyle = t.color || "white";
            v.textCtx.fillText(t.text, t.x, t.y);
        });

        v.textCtx.restore();
    }

    // Computes a label for each hex based on the settings
    _buildHexNumberLabels() {
        const v = this.view;
        const settings = v.plugin.settings;
        const hexes = Object.values(v.data.hexes);
        if (hexes.length === 0) return [];

        const horizontal = settings.hexNumberingDirection !== 'vertical';
        const tol = v.data.gridSize * 0.6;

        // Compute pixel position of each hex
        const withPos = (hexes as any[]).map(hex => {
            const pos = hexToPixel(hex, v.data.gridSize, v.hexOrientation);
            return { hex, px: pos.x, py: pos.y };
        });

        // Letter from index: 0→A, 1→B … 25→Z, 26→AA, 27→AB …
        const toAlpha = (n) => {
            let s = '';
            n += 1;
            while (n > 0) {
                n--;
                s = String.fromCharCode(65 + (n % 26)) + s;
                n = Math.floor(n / 26);
            }
            return s;
        };

        // Build groups from pixel values (sorted, with tolerance)
        const buildGroups = (values: number[]) => {
            const rounded: number[] = values.map(v => Math.round(v));
            const sorted: number[] = Array.from(new Set(rounded)).sort((a, b) => a - b);
            const groups = [];
            for (const v of sorted) {
                if (groups.length === 0 || Math.abs(v - groups[groups.length - 1]) > tol) {
                    groups.push(v);
                }
            }
            return groups;
        };

        const colGroups = buildGroups(withPos.map(e => e.px)); // columns (left→right)
        const rowGroups = buildGroups(withPos.map(e => e.py)); // rows (top→bottom)

        const colIndex = (px) => colGroups.findIndex(g => Math.abs(px - g) <= tol);
        const rowIndex = (py) => rowGroups.findIndex(g => Math.abs(py - g) <= tol);

        // ── Alpha-chess coordinate mode ───────────────────────────
        // Horizontal: letter = row index (A=1st row, B=2nd row …)
        //             number = running position within the row (1, 2, 3 …)
        // Vertical:   letter = column index (A=leftmost column, B=second …)
        //             number = running position within the column (1, 2, 3 …)
        if (settings.hexNumberingAlphaChess) {
            if (horizontal) {
                // Sort: row (py) first, then column (px)
                withPos.sort((a, b) => {
                    if (Math.abs(a.py - b.py) > tol) return a.py - b.py;
                    return a.px - b.px;
                });
                let currentRowPy = null;
                let rowIdx = -1;
                let posInRow = 0;
                return withPos.map(({ hex, py }) => {
                    if (currentRowPy === null || Math.abs(py - currentRowPy) > tol) {
                        currentRowPy = py;
                        rowIdx++;
                        posInRow = 1;
                    } else {
                        posInRow++;
                    }
                    return { hex, label: `${toAlpha(rowIdx)}-${posInRow}` };
                });
            } else {
                // Sort: column (px) first, then row (py)
                withPos.sort((a, b) => {
                    if (Math.abs(a.px - b.px) > tol) return a.px - b.px;
                    return a.py - b.py;
                });
                let currentColPx = null;
                let colIdx = -1;
                let posInCol = 0;
                return withPos.map(({ hex, px }) => {
                    if (currentColPx === null || Math.abs(px - currentColPx) > tol) {
                        currentColPx = px;
                        colIdx++;
                        posInCol = 1;
                    } else {
                        posInCol++;
                    }
                    return { hex, label: `${toAlpha(colIdx)}-${posInCol}` };
                });
            }
        }

        // ── Coordinate mode ───────────────────────────────────────
        // Horizontal: first number = row index, second number = position in row
        // Vertical:   first number = column index, second number = position in column
        if (settings.hexNumberingAlpha) {
            if (horizontal) {
                withPos.sort((a, b) => {
                    if (Math.abs(a.py - b.py) > tol) return a.py - b.py;
                    return a.px - b.px;
                });
                let currentRowPy = null;
                let rowIdx = -1;
                let posInRow = 0;
                return withPos.map(({ hex, py }) => {
                    if (currentRowPy === null || Math.abs(py - currentRowPy) > tol) {
                        currentRowPy = py;
                        rowIdx++;
                        posInRow = 1;
                    } else {
                        posInRow++;
                    }
                    return { hex, label: `${rowIdx + 1}-${posInRow}` };
                });
            } else {
                withPos.sort((a, b) => {
                    if (Math.abs(a.px - b.px) > tol) return a.px - b.px;
                    return a.py - b.py;
                });
                let currentColPx = null;
                let colIdx = -1;
                let posInCol = 0;
                return withPos.map(({ hex, px }) => {
                    if (currentColPx === null || Math.abs(px - currentColPx) > tol) {
                        currentColPx = px;
                        colIdx++;
                        posInCol = 1;
                    } else {
                        posInCol++;
                    }
                    return { hex, label: `${colIdx + 1}-${posInCol}` };
                });
            }
        }

        // ── Simple sequential numbering ───────────────────────────
        // Horizontal: row-by-row (py), then column-by-column (px)
        // Vertical:   column-by-column (px), then row-by-row (py)
        if (horizontal) {
            withPos.sort((a, b) => {
                if (Math.abs(a.py - b.py) > tol) return a.py - b.py;
                return a.px - b.px;
            });
        } else {
            withPos.sort((a, b) => {
                if (Math.abs(a.px - b.px) > tol) return a.px - b.px;
                return a.py - b.py;
            });
        }

        return withPos.map(({ hex }, i) => ({ hex, label: String(i + 1) }));
    }

    // Draws numbering onto an arbitrary 2D context
    _renderHexNumberingToCtx(ctx, zoom, offX, offY) {
        const v = this.view;
        const settings = v.plugin.settings;
        const labels = this._buildHexNumberLabels();
        if (labels.length === 0) return;

        const s = v.data.gridSize;
        const fontSize = Math.max(1, (v.plugin.settings.hexNumberingFontSize || 10) * zoom);
        const flatTop = v.hexOrientation; // true = flat-top

        ctx.save();
        ctx.font = `bold ${fontSize}px Verdana`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const { hex, label } of labels) {
            const pos = hexToPixel(hex as any, v.data.gridSize, v.hexOrientation);

            // Y-offset based on position (top/bottom) and orientation
            // With pointy-top (flatTop=false) the widest point is in the center.
            // We place the text in the upper or lower third of the hex.
            let yOffset;
            if (flatTop) {
                // Flat-top: full height = s * sin(60°) * 2 ≈ s * 1.732
                // Upper/lower inner third
                const halfH = s * Math.sin(Math.PI / 3); // ≈ 0.866 * s
                yOffset = settings.hexNumberingPosition === 'top'
                    ? -halfH * 0.55
                    :  halfH * 0.55;
            } else {
                // Pointy-top: tip at top/bottom, wide in the center
                // Center to tip = s; we place the text at ~60% of that
                yOffset = settings.hexNumberingPosition === 'top'
                    ? -s * 0.52
                    :  s * 0.52;
            }

            const px = pos.x * zoom + offX;
            const py = (pos.y + yOffset) * zoom + offY;

            ctx.save();
            if (settings.hexNumberingOutline) {
                ctx.strokeStyle = 'rgba(0,0,0,0.85)';
                ctx.lineWidth = Math.max(2, fontSize * 0.25);
                ctx.lineJoin = 'round';
                ctx.strokeText(label, px, py);
            }
            ctx.fillStyle = settings.hexNumberingColor || '#ffffff';
            ctx.fillText(label, px, py);
            ctx.restore();
        }

        ctx.restore();
    }

    // Draw numbering onto the live canvas (no zoom/translate needed — directly in pixels)
    renderHexNumbering() {
        const v = this.view;
        if (!v.plugin.settings.hexNumberingEnabled) return;
        if (!v.ctx) return;
        this._renderHexNumberingToCtx(v.ctx, v.data.zoom, v.data.offX, v.data.offY);
    }

    getMapWorldSize() {
        const v = this.view;
        const hexes = Object.values(v.data.hexes);
        const texts = v.data.texts || [];
        const borders = v.data.borders || [];
        const borderOnlyHexes = [];
        const hexKeySet = new Set(Object.keys(v.data.hexes));
        for (const region of borders) {
            for (const bh of region.hexes) {
                if (!hexKeySet.has(`${bh.q}_${bh.r}`)) borderOnlyHexes.push(bh);
            }
        }
        if (hexes.length === 0 && texts.length === 0 && borderOnlyHexes.length === 0) return null;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        const angleOffset = v.hexOrientation ? 0 : -30;
        const expandBounds = (hex) => {
            const pos = hexToPixel(hex, v.data.gridSize, v.hexOrientation);
            const s = v.data.gridSize;
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 180) * (60 * i + angleOffset);
                const cx = pos.x + s * Math.cos(a);
                const cy = pos.y + s * Math.sin(a);
                if (cx < minX) minX = cx;
                if (cx > maxX) maxX = cx;
                if (cy < minY) minY = cy;
                if (cy > maxY) maxY = cy;
            }
        };
        hexes.forEach(expandBounds);
        borderOnlyHexes.forEach(expandBounds);
        texts.forEach(tx => {
            const textSize = tx.size || 16;
            const w = tx.text.length * textSize * 0.6;
            minX = Math.min(minX, tx.x - w / 2); maxX = Math.max(maxX, tx.x + w / 2);
            minY = Math.min(minY, tx.y - textSize); maxY = Math.max(maxY, tx.y + textSize / 2);
        });
        const padding = v.data.gridSize;
        return { w: (maxX - minX) + padding * 2, h: (maxY - minY) + padding * 2 };
    }

    renderFullMap({ targetWidth, scale: fixedScale, cropless }: any = {}) {
        const v = this.view;
        if (!this.getMapWorldSize()) return null;
        // Scale is set after the bounds calculation (see below),
        // so that targetWidth matches the actual export width including the crop option.

        const hexes = Object.values(v.data.hexes);
        const texts = v.data.texts || [];
        const borders = v.data.borders || [];
        const borderOnlyHexes = [];
        const hexKeySet = new Set(Object.keys(v.data.hexes));
        for (const region of borders) {
            for (const bh of region.hexes) {
                if (!hexKeySet.has(`${bh.q}_${bh.r}`)) borderOnlyHexes.push(bh);
            }
        }
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        const angleOffset = v.hexOrientation ? 0 : -30;
        const expandBounds = (hex) => {
            const pos = hexToPixel(hex, v.data.gridSize, v.hexOrientation);
            const s = v.data.gridSize;
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 180) * (60 * i + angleOffset);
                const cx = pos.x + s * Math.cos(a);
                const cy = pos.y + s * Math.sin(a);
                if (cx < minX) minX = cx;
                if (cx > maxX) maxX = cx;
                if (cy < minY) minY = cy;
                if (cy > maxY) maxY = cy;
            }
        };
        hexes.forEach(expandBounds);
        borderOnlyHexes.forEach(expandBounds);
        texts.forEach(tx => {
            const textSize = tx.size || 16;
            const w = tx.text.length * textSize * 0.6;
            minX = Math.min(minX, tx.x - w / 2); maxX = Math.max(maxX, tx.x + w / 2);
            minY = Math.min(minY, tx.y - textSize); maxY = Math.max(maxY, tx.y + textSize / 2);
        });

        const padding = cropless ? 0 : v.data.gridSize;
        minX -= padding; minY -= padding;
        maxX += padding; maxY += padding;

        const w = maxX - minX;
        const h = maxY - minY;

        // Compute scale based on actual export width (after padding adjustment),
        // so that targetWidth is met exactly regardless of the crop option.
        const scale = targetWidth ? targetWidth / w : (fixedScale || 2);

        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = Math.ceil(w * scale);
        tmpCanvas.height = Math.ceil(h * scale);
        const tmpCtx = tmpCanvas.getContext('2d');
        tmpCtx.fillStyle = '#ffffff';
        tmpCtx.fillRect(0, 0, tmpCanvas.width, tmpCanvas.height);

        const origCtx = v.ctx;
        const origCanvas = v.canvas;
        const origTextCtx = v.textCtx;
        const origTextCanvas = v.textCanvas;
        const origZoom = v.data.zoom;
        const origOffX = v.data.offX;
        const origOffY = v.data.offY;

        v.ctx = tmpCtx;
        v.canvas = tmpCanvas;
        v.data.zoom = scale;
        v.data.offX = -minX * scale;
        v.data.offY = -minY * scale;

        tmpCtx.save();
        tmpCtx.translate(v.data.offX, v.data.offY);
        tmpCtx.scale(v.data.zoom, v.data.zoom);

        Object.values(v.data.hexes).forEach(hex => this.drawHexBase(hex));

        const drawSymbolLayer = (symbols) => {
            Object.values(v.data.hexes).forEach((hex: any) => {
                if (hex.symbol && symbols.includes(hex.symbol)) {
                    const pos = hexToPixel(hex, v.data.gridSize, v.hexOrientation);
                    if (v.svgSymbols[hex.symbol]) {
                        this.drawSVGOnCanvas(hex.symbol, pos, hex.symbolColor);
                    } else {
                        this.drawCustomSymbol(hex.symbol, pos.x, pos.y, v.data.gridSize, hex.symbolColor);
                    }
                }
            });
        };

        drawSymbolLayer(['swamp','grass', 'bush', 'tree', 'pine', 'palm']);
        drawSymbolLayer(['hill', 'mountain']);
        this.buildOverlapMap();
        this.drawRivers();
        this.drawRoads();
        drawSymbolLayer(['question', 'exclamation', 'cross', 'dot', 'shield', 'pirateskull']);
        drawSymbolLayer(['tent', 'house', 'village', 'town', 'castle', 'harbor', 'monastery', 'tower', 'ruins', 'cave', 'oasis']);
        this.drawBorders();

        tmpCtx.restore();

        // Render texts directly onto the print canvas
        if (v.data.texts) v.data.texts.forEach(tx => {
            tmpCtx.save();
            tmpCtx.translate(v.data.offX, v.data.offY);
            tmpCtx.scale(v.data.zoom, v.data.zoom);
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

        v.ctx = origCtx;
        v.canvas = origCanvas;
        v.textCtx = origTextCtx;
        v.textCanvas = origTextCanvas;
        v.data.zoom = origZoom;
        v.data.offX = origOffX;
        v.data.offY = origOffY;

        // Render numbering onto the print canvas (using a temporary ctx)
        if (v.plugin.settings.hexNumberingEnabled) {
            const printCtx = tmpCtx;
            const printZoom = scale;
            const printOffX = -minX * scale;
            const printOffY = -minY * scale;
            this._renderHexNumberingToCtx(printCtx, printZoom, printOffX, printOffY);
        }

        return tmpCanvas;
    }

    renderSVGSymbols(symbols) {
        const v = this.view;
        if (!v.svgLayer) return;

        while (v.svgLayer.firstChild) {
            v.svgLayer.removeChild(v.svgLayer.firstChild);
        }

        symbols.forEach(({ symbol, pos, color }) => {
            if (v.svgSymbols[symbol]) {
                const config = v.svgSymbolConfig[symbol] || { size: 0.30, align: 'center', marginX: 0, marginY: 0 };

                const screenX = pos.x * v.data.zoom + v.data.offX;
                const screenY = pos.y * v.data.zoom + v.data.offY;

                const baseSize = v.data.gridSize * 2.0; // base size
                const size = baseSize * config.size * v.data.zoom;

                const hexWidth = v.data.gridSize * Math.sqrt(3) * v.data.zoom;
                const hexHeight = v.data.gridSize * 2 * v.data.zoom;

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

                const svgData = v.svgSymbols[symbol];
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

                v.svgLayer.appendChild(g);
            }
        });
    }

    drawSVGOnCanvas(symbol, pos, color) {
        const v = this.view;
        const svgData = v.svgSymbols[symbol];
        if (!svgData) return;

        const config = v.svgSymbolConfig[symbol] || { size: 0.30, align: 'center', marginX: 0, marginY: 0 };
        const baseSize = v.data.gridSize * 2.0;
        const size = baseSize * config.size;
        const viewBoxSize = svgData.viewBoxWidth;
        const scale = size / viewBoxSize;

        const hexWidth = v.data.gridSize * Math.sqrt(3);
        const hexHeight = v.data.gridSize * 2;
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

        v.ctx.save();
        v.ctx.translate(pos.x - size / 2 + offsetX, pos.y - size / 2 + offsetY);
        v.ctx.scale(scale, scale);
        const path = new Path2D(svgData.pathData);
        v.ctx.fillStyle = color || '#228B22';
        v.ctx.fill(path);
        v.ctx.restore();
    }

    drawHexBase(h) {
        const v = this.view;
        const pos = hexToPixel(h, v.data.gridSize, v.hexOrientation);
        const s = v.data.gridSize;
        const angleOffset = v.hexOrientation ? 0 : -30;

        if (h.color) {
            const sf = s + 0.5; // slight overshoot to avoid gaps between adjacent hexes
            v.ctx.beginPath();
            for (let i=0; i<6; i++) {
                const a = (Math.PI/180) * (60*i + angleOffset);
                v.ctx.lineTo(pos.x + sf*Math.cos(a), pos.y + sf*Math.sin(a));
            }
            v.ctx.closePath();
            v.ctx.fillStyle = h.color;
            v.ctx.fill();
        }

        if (!v.plugin.settings.hideHexBorders) {
            v.ctx.beginPath();
            for (let i=0; i<6; i++) {
                const a = (Math.PI/180) * (60*i + angleOffset);
                v.ctx.lineTo(pos.x + s*Math.cos(a), pos.y + s*Math.sin(a));
            }
            v.ctx.closePath();
            v.ctx.strokeStyle = 'rgba(128,128,128,0.3)';
            v.ctx.lineWidth = 1;
            v.ctx.stroke();
        }
    }

    drawBorders() {
        const v = this.view;
        if (!v.data.borders || v.data.borders.length === 0 || !v.borderSettings.visible) return;

        const s = v.data.gridSize;
        const sf = s + 0.5;
        const lineWidth = 3;
        const inset = lineWidth / 2 + 0.575; // 1px gap from hex edge + half the line width
        const factor = (sf - inset) / sf;

        const neighbors = [
            { dq: 1, dr: 0 },   // Edge 0: East
            { dq: 0, dr: 1 },   // Edge 1: South-East
            { dq: -1, dr: 1 },  // Edge 2: South-West
            { dq: -1, dr: 0 },  // Edge 3: West
            { dq: 0, dr: -1 },  // Edge 4: North-West
            { dq: 1, dr: -1 }   // Edge 5: North-East
        ];

        v.ctx.save();
        v.ctx.lineWidth = lineWidth;
        v.ctx.lineCap = 'round';

        v.data.borders.forEach(region => {
            if (!region.hexes || region.hexes.length === 0) return;

            const regionSet = new Set(region.hexes.map(b => `${b.q}_${b.r}`));
            v.ctx.strokeStyle = region.color || '#FF0000';

            const dashes = region.dashes || 1;
            if (dashes > 1) {
                const edgeLen = sf * factor;
                const unitLen = edgeLen / dashes;
                v.ctx.setLineDash([unitLen, unitLen]);
                v.ctx.lineDashOffset = (dashes % 2 === 0) ? unitLen / 2 : 0;
            }

            region.hexes.forEach(b => {
                const pos = hexToPixel(b, v.data.gridSize, v.hexOrientation);

                const corners = [];
                for (let i = 0; i < 6; i++) {
                    const a = (Math.PI / 180) * (60 * i + (v.hexOrientation ? 0 : -30));
                    corners.push({
                        x: pos.x + sf * factor * Math.cos(a),
                        y: pos.y + sf * factor * Math.sin(a)
                    });
                }

                for (let i = 0; i < 6; i++) {
                    const nb = neighbors[i];
                    const neighborKey = `${b.q + nb.dq}_${b.r + nb.dr}`;

                    if (!regionSet.has(neighborKey)) {
                        const p1 = corners[i];
                        const p2 = corners[(i + 1) % 6];
                        v.ctx.beginPath();
                        v.ctx.moveTo(p1.x, p1.y);
                        v.ctx.lineTo(p2.x, p2.y);
                        v.ctx.stroke();
                    }
                }
            });

            if (dashes > 1) { v.ctx.setLineDash([]); v.ctx.lineDashOffset = 0; }
        });

        const ph = v.borderSettings.pickedHex;
        if (ph && v.currentToolGroup === 'border') {
            const activeRegion = v.data.borders.find(r => r.id === v.borderSettings.activeRegionId);
            if (activeRegion) {
                v.ctx.strokeStyle = activeRegion.color || '#FF0000';
                v.ctx.lineWidth = v.borderHighlightWidth;
                v.ctx.setLineDash([4, 4]);
                const pos = hexToPixel(ph, v.data.gridSize, v.hexOrientation);
                const hlInset = (sf - v.borderHighlightWidth / 2 - 1) / sf;
                v.ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = (Math.PI / 180) * (60 * i + (v.hexOrientation ? 0 : -30));
                    const cx = pos.x + sf * hlInset * Math.cos(a);
                    const cy = pos.y + sf * hlInset * Math.sin(a);
                    if (i === 0) v.ctx.moveTo(cx, cy);
                    else v.ctx.lineTo(cx, cy);
                }
                v.ctx.closePath();
                v.ctx.stroke();
                v.ctx.setLineDash([]);
            }
        }

        v.ctx.restore();
    }

    drawCustomSymbol(type, x, y, size, color) {
        const v = this.view;
        v.ctx.save();
        v.ctx.translate(x, y);
        v.ctx.beginPath();
        v.ctx.strokeStyle = color;
        v.ctx.fillStyle = color;
        v.ctx.lineWidth = 2;
        v.ctx.lineJoin = "round";
        v.ctx.lineCap = "round";
        const s = size / 2;


        if (type === 'grass') {
            for (let i = 0; i < 3; i++) {
                const x = (i - 1) * s * 0.3;
                v.ctx.moveTo(x, s * 0.3);
                v.ctx.lineTo(x, -s * 0.3);
            }
            v.ctx.stroke();
        } else if (type === 'swamp') {
            for (let i = 0; i < 3; i++) {
                const y = (i - 1) * s * 0.25;
                v.ctx.moveTo(-s * 0.5, y);
                v.ctx.quadraticCurveTo(-s * 0.25, y - s * 0.1, 0, y);
                v.ctx.quadraticCurveTo(s * 0.25, y + s * 0.1, s * 0.5, y);
            }
            v.ctx.stroke();
        }
        else if (type === 'bush') {
            v.ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
            v.ctx.stroke();
        } else if (type === 'tree') {
            v.ctx.beginPath();
            v.ctx.arc(0, -s * 0.2, s * 0.3, 0, Math.PI * 2);
            v.ctx.stroke();
            v.ctx.beginPath();
            v.ctx.moveTo(0, s * 0.1);
            v.ctx.lineTo(0, s * 0.5);
            v.ctx.stroke();
        } else if (type === 'pine') {
            v.ctx.moveTo(-s * 0.3, 0);
            v.ctx.lineTo(0, -s * 0.5);
            v.ctx.lineTo(s * 0.3, 0);
            v.ctx.moveTo(-s * 0.35, s * 0.2);
            v.ctx.lineTo(0, -s * 0.1);
            v.ctx.lineTo(s * 0.35, s * 0.2);
            v.ctx.stroke();
            v.ctx.beginPath();
            v.ctx.moveTo(0, s * 0.2);
            v.ctx.lineTo(0, s * 0.5);
            v.ctx.stroke();
        } else if (type === 'palm') {
            v.ctx.moveTo(0, -s * 0.5);
            v.ctx.lineTo(0, s * 0.4);
            v.ctx.stroke();
            for (let i = 0; i < 4; i++) {
                const angle = (i * Math.PI / 2) - Math.PI / 4;
                v.ctx.beginPath();
                v.ctx.moveTo(0, -s * 0.5);
                v.ctx.lineTo(Math.cos(angle) * s * 0.4, -s * 0.5 + Math.sin(angle) * s * 0.4);
                v.ctx.stroke();
            }
        }
        else if (type === 'hill') {
            v.ctx.moveTo(-s * 0.6, s * 0.3);
            v.ctx.quadraticCurveTo(-s * 0.3, -s * 0.4, 0, -s * 0.3);
            v.ctx.quadraticCurveTo(s * 0.3, -s * 0.4, s * 0.6, s * 0.3);
            v.ctx.stroke();
        } else if (type === 'mountain') {
            v.ctx.beginPath();
            v.ctx.moveTo(-s * 0.8, s * 0.5);
            v.ctx.lineTo(0, -s * 0.6);
            v.ctx.lineTo(s * 0.8, s * 0.5);
            v.ctx.moveTo(-s * 0.3, s * 0.5);
            v.ctx.lineTo(s * 0.3, -s * 0.1);
            v.ctx.lineTo(s * 0.7, s * 0.5);
            v.ctx.stroke();
        }
        else if (type === 'tent') {
            v.ctx.moveTo(-s * 0.4, s * 0.3);
            v.ctx.lineTo(0, -s * 0.4);
            v.ctx.lineTo(s * 0.4, s * 0.3);
            v.ctx.closePath();
            v.ctx.stroke();
        } else if (type === 'house') {
            v.ctx.rect(-s*0.3, -s*0.1, s*0.6, s*0.5);
            v.ctx.moveTo(-s*0.4, -s*0.1);
            v.ctx.lineTo(0, -s*0.5);
            v.ctx.lineTo(s*0.4, -s*0.1);
            v.ctx.stroke();
        } else if (type === 'village') {
            for(let i=0; i<3; i++) {
                const ox = (i-1)*s*0.4, oy = (i%2)*s*0.2;
                v.ctx.moveTo(ox-s*0.2, oy+s*0.3);
                v.ctx.lineTo(ox-s*0.2, oy);
                v.ctx.lineTo(ox, oy-s*0.2);
                v.ctx.lineTo(ox+s*0.2, oy);
                v.ctx.lineTo(ox+s*0.2, oy+s*0.3);
                v.ctx.stroke();
            }
        } else if (type === 'town') {
            v.ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
            v.ctx.stroke();
            for (let i = 0; i < 4; i++) {
                const angle = i * Math.PI / 2;
                const px = Math.cos(angle) * s * 0.5;
                const py = Math.sin(angle) * s * 0.5;
                v.ctx.beginPath();
                v.ctx.rect(px - s*0.1, py - s*0.1, s*0.2, s*0.25);
                v.ctx.stroke();
            }
        } else if (type === 'castle') {
            v.ctx.moveTo(-s*0.6, s*0.5);
            v.ctx.lineTo(-s*0.6, -s*0.3);
            v.ctx.lineTo(-s*0.4, -s*0.3);
            v.ctx.lineTo(-s*0.4, -s*0.1);
            v.ctx.lineTo(-s*0.2, -s*0.1);
            v.ctx.lineTo(-s*0.2, -s*0.5);
            v.ctx.lineTo(s*0.2, -s*0.5);
            v.ctx.lineTo(s*0.2, -s*0.1);
            v.ctx.lineTo(s*0.4, -s*0.1);
            v.ctx.lineTo(s*0.4, -s*0.3);
            v.ctx.lineTo(s*0.6, -s*0.3);
            v.ctx.lineTo(s*0.6, s*0.5);
            v.ctx.closePath();
            v.ctx.stroke();
        } else if (type === 'harbor') {
            v.ctx.rect(-s*0.5, -s*0.3, s*1.0, s*0.6);
            v.ctx.stroke();
        } else if (type === 'monastery') {
            v.ctx.rect(-s*0.4, -s*0.2, s*0.8, s*0.6);
            v.ctx.stroke();
            v.ctx.beginPath();
            v.ctx.moveTo(0, -s*0.6);
            v.ctx.lineTo(0, -s*0.2);
            v.ctx.moveTo(-s*0.15, -s*0.5);
            v.ctx.lineTo(s*0.15, -s*0.5);
            v.ctx.stroke();
        } else if (type === 'tower') {
            v.ctx.rect(-s*0.2, -s*0.6, s*0.4, s*1.0);
            v.ctx.stroke();
            for (let i = 0; i < 3; i++) {
                const x = -s*0.2 + i * s*0.2;
                v.ctx.beginPath();
                v.ctx.rect(x, -s*0.7, s*0.15, s*0.1);
                v.ctx.stroke();
            }
        } else if (type === 'ruins') {
            v.ctx.moveTo(-s*0.4, s*0.3);
            v.ctx.lineTo(-s*0.4, -s*0.1);
            v.ctx.lineTo(-s*0.2, -s*0.3);
            v.ctx.moveTo(0, s*0.3);
            v.ctx.lineTo(0, 0);
            v.ctx.moveTo(s*0.3, s*0.3);
            v.ctx.lineTo(s*0.3, -s*0.2);
            v.ctx.stroke();
        } else if (type === 'cave') {
            v.ctx.arc(0, s*0.2, s*0.35, Math.PI, 0, true);
            v.ctx.lineTo(s*0.35, s*0.4);
            v.ctx.lineTo(-s*0.35, s*0.4);
            v.ctx.closePath();
            v.ctx.stroke();
        } else if (type === 'oasis') {
            v.ctx.ellipse(0, s*0.2, s*0.4, s*0.25, 0, 0, Math.PI * 2);
            v.ctx.stroke();
            v.ctx.beginPath();
            v.ctx.moveTo(s*0.3, 0);
            v.ctx.lineTo(s*0.3, -s*0.3);
            v.ctx.stroke();
            for (let i = 0; i < 3; i++) {
                const angle = (i * Math.PI / 3);
                v.ctx.beginPath();
                v.ctx.moveTo(s*0.3, -s*0.3);
                v.ctx.lineTo(s*0.3 + Math.cos(angle) * s*0.2, -s*0.3 + Math.sin(angle) * s*0.2);
                v.ctx.stroke();
            }
        }

        v.ctx.restore();
    }

    _segKey(from, to) {
        if (from.q < to.q || (from.q === to.q && from.r < to.r))
            return `${from.q},${from.r}|${to.q},${to.r}`;
        return `${to.q},${to.r}|${from.q},${from.r}`;
    }

    buildOverlapMap() {
        const v = this.view;
        this.overlapMap = {};
        const addSegments = (pathObj, type) => {
            if (!pathObj.waypoints || pathObj.waypoints.length < 2) return;
            const wps = pathObj.waypoints;
            const chains = [];
            let currentChain = [];
            for (let i = 0; i < wps.length; i++) {
                if (wps[i].break) {
                    currentChain = [wps[i]];
                } else {
                    currentChain.push(wps[i]);
                }
                if (i === wps.length - 1 || (wps[i + 1] && wps[i + 1].break)) {
                    if (currentChain.length >= 2) chains.push(currentChain);
                    if (wps[i + 1] && wps[i + 1].break) currentChain = [];
                }
            }
            chains.forEach(chain => {
                for (let i = 0; i < chain.length - 1; i++) {
                    const pathSegs = calculateHexPath(chain[i], chain[i + 1], pathObj.width);
                    pathSegs.forEach(seg => {
                        const key = this._segKey(seg.from, seg.to);
                        if (!this.overlapMap[key]) this.overlapMap[key] = { hasRiver: false, hasRoad: false, maxRiverWidth: 0, maxRoadWidth: 0 };
                        if (type === 'river') {
                            this.overlapMap[key].hasRiver = true;
                            this.overlapMap[key].maxRiverWidth = Math.max(this.overlapMap[key].maxRiverWidth, pathObj.width);
                        } else {
                            this.overlapMap[key].hasRoad = true;
                            this.overlapMap[key].maxRoadWidth = Math.max(this.overlapMap[key].maxRoadWidth, pathObj.width);
                        }
                    });
                }
            });
        };
        if (v.data.rivers) v.data.rivers.forEach(r => addSegments(r, 'river'));
        if (v.data.roads) v.data.roads.forEach(r => addSegments(r, 'road'));
    }

    drawRivers() {
        const v = this.view;
        if (!v.data.rivers) return;
        v.data.rivers.forEach(river => {
            if (!river.waypoints || river.waypoints.length === 0) return;
            if (river.waypoints.length >= 2) {
                this.drawPathChains(river, true, 'river');
            }
        });
    }

    drawRoads() {
        const v = this.view;
        if (!v.data.roads) return;
        v.data.roads.forEach(road => {
            if (!road.waypoints || road.waypoints.length === 0) return;
            if (road.waypoints.length >= 2) {
                this.drawPathChains(road, false, 'road');
            }
        });
    }

    drawPathWaypoints() {
        const v = this.view;
        if (v.riverSettings.editMode && v.data.rivers) {
            const river = v.data.rivers.find(r => r.id === v.riverSettings.activeRiverId);
            if (river && river.waypoints) {
                const activeIdx = v.riverSettings.insertAfter;
                const activeWp = activeIdx !== null ? river.waypoints[activeIdx] : null;
                river.waypoints.forEach((wp) => {
                    const isActive = activeWp && wp.q === activeWp.q && wp.r === activeWp.r;
                    const pos = hexToPixel(wp, v.data.gridSize, v.hexOrientation);
                    v.ctx.beginPath();
                    v.ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
                    v.ctx.fillStyle = isActive ? '#FF0000' : '#000000';
                    v.ctx.fill();
                });
            }
        }
        if (v.roadSettings.editMode && v.data.roads) {
            const road = v.data.roads.find(r => r.id === v.roadSettings.activeRoadId);
            if (road && road.waypoints) {
                const activeIdx = v.roadSettings.insertAfter;
                const activeWp = activeIdx !== null ? road.waypoints[activeIdx] : null;
                road.waypoints.forEach((wp) => {
                    const isActive = activeWp && wp.q === activeWp.q && wp.r === activeWp.r;
                    const pos = hexToPixel(wp, v.data.gridSize, v.hexOrientation);
                    v.ctx.beginPath();
                    v.ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
                    v.ctx.fillStyle = isActive ? '#FF0000' : '#000000';
                    v.ctx.fill();
                });
            }
        }
    }

    drawPathChains(path, taper = false, pathType = null) {
        const v = this.view;
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
                const pathSegs = calculateHexPath(chain[i], chain[i + 1], path.width);
                pairSegCounts.push(pathSegs.length);
                segments.push(...pathSegs);
            }
            if (pathType && this.overlapMap) {
                segments.forEach(seg => {
                    const key = this._segKey(seg.from, seg.to);
                    const info = this.overlapMap[key];
                    if (info && info.hasRiver && info.hasRoad) {
                        const isCanonical = seg.from.q < seg.to.q || (seg.from.q === seg.to.q && seg.from.r < seg.to.r);
                        const typeSign = pathType === 'river' ? 1 : -1;
                        const dirSign = isCanonical ? 1 : -1;
                        seg.lateralOffset = ((info.maxRiverWidth + info.maxRoadWidth) / 4) * PATH_OVERLAP_SPACING * typeSign * dirSign;
                    }
                });
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
        const v = this.view;
        if (!lines || lines.length === 0) return;
        v.ctx.strokeStyle = color;
        v.ctx.lineCap = "round";
        v.ctx.lineJoin = "round";
        v.ctx.lineWidth = defaultWidth;

        const computedLines = lines.map((l, idx) => {
            const fullP1 = hexToPixel(l.from, v.data.gridSize, v.hexOrientation);
            const fullP2 = hexToPixel(l.to, v.data.gridSize, v.hexOrientation);
            let p1 = { x: fullP1.x, y: fullP1.y }, p2 = { x: fullP2.x, y: fullP2.y };
            const inset = (1 - v.pathEndInset) * 0.5;
            if (trimStart && idx === 0) p1 = { x: p1.x + (p2.x - p1.x) * inset, y: p1.y + (p2.y - p1.y) * inset };
            if (trimEnd && idx === lines.length - 1) p2 = { x: p2.x + (p1.x - p2.x) * inset, y: p2.y + (p1.y - p2.y) * inset };
            const fdx = fullP2.x - fullP1.x, fdy = fullP2.y - fullP1.y;
            const fullDist = Math.sqrt(fdx * fdx + fdy * fdy);
            if (l.lateralOffset && fullDist > 0) {
                const onx = -fdy / fullDist, ony = fdx / fullDist;
                p1 = { x: p1.x + onx * l.lateralOffset, y: p1.y + ony * l.lateralOffset };
                p2 = { x: p2.x + onx * l.lateralOffset, y: p2.y + ony * l.lateralOffset };
            }
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
                const sf = (from.q < to.q || (from.q === to.q && from.r < to.r)) ? from : to;
                const st = sf === from ? to : from;
                const seedHash = Math.abs(sf.q * 7 + sf.r * 13 + st.q * 11 + st.r * 17 + i * 3);
                const seed = seedHash % 10;
                const sine = Math.sin(t * Math.PI * curveSegs / 2);
                const amplitude = (v.data.gridSize * 0.09) * (0.4 + seed / 15) * sine;
                allPts.push({ x: baseX + nx * amplitude, y: baseY + ny * amplitude, w: width + (nextWidth - width) * t });
            }

            allPts.push({ x: p2.x, y: p2.y, w: nextWidth });
        });

        if (allPts.length < 2) return;

        if (dashCount > 1 && computedLines.length > 0) {
            const unitLen = computedLines[0].fullDist / dashCount;
            v.ctx.setLineDash([unitLen, unitLen]);
            v.ctx.lineDashOffset = (dashCount % 2 === 0) ? unitLen / 2 : 0;
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
                v.ctx.lineWidth = b.w;
                v.ctx.beginPath();
                v.ctx.moveTo(b.x, b.y);
                v.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, c.x, c.y);
                v.ctx.stroke();
            }
        } else {
            v.ctx.beginPath();
            v.ctx.moveTo(allPts[0].x, allPts[0].y);
            for (let i = 0; i < allPts.length - 1; i++) {
                const a = allPts[Math.max(0, i - 1)];
                const b = allPts[i];
                const c = allPts[i + 1];
                const d = allPts[Math.min(allPts.length - 1, i + 2)];
                const cp1x = b.x + (c.x - a.x) / 6;
                const cp1y = b.y + (c.y - a.y) / 6;
                const cp2x = c.x - (d.x - b.x) / 6;
                const cp2y = c.y - (d.y - b.y) / 6;
                v.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, c.x, c.y);
            }
            v.ctx.stroke();
        }

        if (dashCount > 1) { v.ctx.setLineDash([]); v.ctx.lineDashOffset = 0; }
    }
}
