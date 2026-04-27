/**
 * pdfReportGenerator.js — Updated with Extracted Entities section
 *
 * New section added between Summary and Full Transcription:
 *   "Key Information Extracted" — shows location, phones, people count,
 *   incident type, severity, names, time/date, etc.
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// ── Font paths ─────────────────────────────────────────────────
const SYSTEM_FONTS = {
    latin: '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf',
    arabic: '/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf',
    cjk: '/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf',
};

const BUNDLED_FONTS = {
    latin: path.join(__dirname, '..', 'fonts', 'NotoSans-Regular.ttf'),
    arabic: path.join(__dirname, '..', 'fonts', 'NotoSansArabic-Regular.ttf'),
    cjk: path.join(__dirname, '..', 'fonts', 'ipag.ttf'),
};

function resolveFontPath(key) {
    if (fs.existsSync(SYSTEM_FONTS[key])) return SYSTEM_FONTS[key];
    if (fs.existsSync(BUNDLED_FONTS[key])) return BUNDLED_FONTS[key];
    return null;
}

// ── Script detection ───────────────────────────────────────────
function detectScript(text) {
    if (!text) return 'latin';
    if (/[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/.test(text)) return 'cjk';
    if (/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)) return 'arabic';
    return 'latin';
}

// ── Brand colors ───────────────────────────────────────────────
const DARK_BLUE = '#1a3f5f';
const MID_BLUE = '#00338e';
const LIGHT_BLUE = '#3b82f6';
const WHITE = '#ffffff';
const GRAY_700 = '#374151';
const GRAY_400 = '#9ca3af';
const SUCCESS = '#16a34a';

// ── Severity colors ────────────────────────────────────────────
const SEVERITY_COLORS = {
    low:      { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', label: 'LOW' },
    medium:   { bg: '#fefce8', text: '#ca8a04', border: '#fde68a', label: 'MEDIUM' },
    high:     { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', label: 'HIGH' },
    critical: { bg: '#fff1f2', text: '#dc2626', border: '#fecaca', label: 'CRITICAL' },
};

// ── Main export ────────────────────────────────────────────────
async function generateTranscriptionPDF(opts) {
    const {
        analysisId,
        originalName,
        transcription,
        translatedText,
        translationLang,
        extractedEntities,   // ← entity data
        userName = 'Unknown',
        userEmail = '',
        createdAt = new Date(),
        outputDir,
    } = opts;

    fs.mkdirSync(outputDir, { recursive: true });

    const safeName = originalName
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 40);

    const pdfPath = path.join(outputDir, `report_${safeName}_${analysisId}.pdf`);

    // Derive metadata from transcription directly (no more summary string)
    const wordCount = transcription ? String(transcription.split(/\s+/).filter(Boolean).length.toLocaleString()) : '—';
    const language  = '—'; // Available via extractedEntities if needed
    const duration  = '—'; // Not tracked after summary removal
    const preview   = '';   // No preview section

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 0, bottom: 40, left: 0, right: 0 },
            bufferPages: true,
            info: {
                Title: `Transcription Report — ${originalName}`,
                Author: 'Percepta Platform',
                Subject: 'Audio Transcription Report',
                Creator: 'Percepta by IFBW',
            },
        });

        // ── Register fonts ─────────────────────────────────────
        const fontPaths = {
            latin: resolveFontPath('latin'),
            arabic: resolveFontPath('arabic'),
            cjk: resolveFontPath('cjk'),
        };

        if (fontPaths.latin) doc.registerFont('Latin', fontPaths.latin);
        if (fontPaths.arabic) doc.registerFont('Arabic', fontPaths.arabic);
        if (fontPaths.cjk) doc.registerFont('CJK', fontPaths.cjk);

        const fontFor = (script) => {
            if (script === 'arabic' && fontPaths.arabic) return 'Arabic';
            if (script === 'cjk' && fontPaths.cjk) return 'CJK';
            return fontPaths.latin ? 'Latin' : 'Helvetica';
        };

        const W = doc.page.width;
        const H = doc.page.height;

        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        // ── HEADER BAND ────────────────────────────────────────
        doc.rect(0, 0, W, 120).fill(MID_BLUE);
        doc.rect(0, 110, W, 10).fill(LIGHT_BLUE);

        doc.font(fontFor('latin')).fontSize(22).fillColor(WHITE)
            .text('PERCEPTA', 40, 28, { continued: false });

        doc.font(fontFor('latin')).fontSize(10).fillColor('#93c5fd')
            .text('Intelligence & Transcription Platform', 40, 54);

        doc.rect(W - 180, 30, 140, 32).fill('rgba(255,255,255,0.15)');
        doc.font(fontFor('latin')).fontSize(11).fillColor(WHITE)
            .text('TRANSCRIPTION REPORT', W - 175, 40, { width: 130, align: 'center' });

        // ── META BAND ──────────────────────────────────────────
        doc.rect(0, 120, W, 90).fill('#f0f7ff');

        const metaY = 134;
        const colW = W / 4;
        const metaItems = [
            { label: 'FILE', value: originalName.length > 22 ? originalName.substring(0, 22) + '…' : originalName },
            { label: 'LANGUAGE', value: language },
            { label: 'DURATION', value: duration },
            { label: 'WORDS', value: wordCount },
        ];

        metaItems.forEach((item, i) => {
            const x = 40 + i * colW;
            doc.font(fontFor('latin')).fontSize(8).fillColor(GRAY_400)
                .text(item.label, x, metaY, { width: colW - 10 });
            doc.font(fontFor('latin')).fontSize(12).fillColor(DARK_BLUE)
                .text(item.value, x, metaY + 14, { width: colW - 10 });
        });

        const userY = metaY + 42;
        doc.font(fontFor('latin')).fontSize(8).fillColor(GRAY_400)
            .text('PREPARED BY', 40, userY)
            .text('DATE', 40 + colW, userY)
            .text('REPORT ID', 40 + colW * 2, userY);

        doc.font(fontFor('latin')).fontSize(10).fillColor(DARK_BLUE)
            .text(userName, 40, userY + 12, { width: colW - 10 })
            .text(createdAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }), 40 + colW, userY + 12)
            .text(String(analysisId).substring(0, 12) + '…', 40 + colW * 2, userY + 12);

        // ── CONTENT ────────────────────────────────────────────
        const contentX = 40;
        const contentW = W - 80;
        let cursorY = 228;

        // ── SECTION: Key Information Extracted (NEW) ───────────
        if (extractedEntities && Object.keys(extractedEntities).length > 0) {
            cursorY = renderEntitiesSection(doc, extractedEntities, contentX, contentW, cursorY, H, W, fontFor, DARK_BLUE, GRAY_700, LIGHT_BLUE, MID_BLUE);
            cursorY += 20;
        }

        // ── SECTION: Full Transcription (summary section removed) ───────

        // Stats row
        const statItems = [
            { label: 'Duration', value: duration },
            { label: 'Language', value: language },
            { label: 'Words', value: wordCount },
            { label: 'Status', value: 'Completed' },
        ];
        const statW = contentW / 4;

        statItems.forEach((s, i) => {
            const sx = contentX + i * statW;
            doc.rect(sx, cursorY, statW - 8, 50).fill('#f0f7ff');
            doc.font(fontFor('latin')).fontSize(10).fillColor(i === 3 ? SUCCESS : LIGHT_BLUE)
                .text(s.value, sx + 8, cursorY + 8, { width: statW - 20 });
            doc.font(fontFor('latin')).fontSize(8).fillColor(GRAY_400)
                .text(s.label.toUpperCase(), sx + 8, cursorY + 26, { width: statW - 20 });
        });
        cursorY += 66;

        // ── SECTION: Full Transcription ────────────────────────
        cursorY = renderSection(doc, 'Full Transcription', transcription, contentX, contentW, cursorY, H, W, MID_BLUE, LIGHT_BLUE, fontFor, DARK_BLUE, GRAY_700);

        // ── SECTION: Translation ───────────────────────────────
        if (translatedText && translationLang) {
            const langNames = { fr: 'French', en: 'English', ar: 'Arabic', zh: 'Chinese', ja: 'Japanese', ko: 'Korean' };
            const friendlyLang = langNames[translationLang] || translationLang.toUpperCase();

            cursorY += 30;
            if (doc.y > H - 100) {
                doc.addPage();
                addContinuationHeader(doc, W, MID_BLUE, LIGHT_BLUE);
                cursorY = 40;
            }

            cursorY = renderSection(doc, `Translation (${friendlyLang})`, translatedText, contentX, contentW, cursorY, H, W, MID_BLUE, LIGHT_BLUE, fontFor, DARK_BLUE, GRAY_700);
        }

        // ── FOOTER on all pages ────────────────────────────────
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
            doc.switchToPage(range.start + i);
            doc.rect(0, H - 36, W, 36).fill('#f8fbff');
            doc.rect(0, H - 37, W, 1).fill('#d0e4f0');
            doc.font(fontFor('latin')).fontSize(8).fillColor(GRAY_400)
                .text('© 2026 IFBW Percepta Platform — Confidential', 40, H - 24)
                .text(`Page ${i + 1} of ${range.count}`, W - 80, H - 24, { width: 60, align: 'right' });
        }

        doc.end();
        stream.on('finish', () => resolve(pdfPath));
        stream.on('error', reject);
    });
}

// ── Render Extracted Entities Section ─────────────────────────
function renderEntitiesSection(doc, entities, contentX, contentW, cursorY, H, W, fontFor, DARK_BLUE, GRAY_700, LIGHT_BLUE, MID_BLUE) {
    // Section header
    doc.rect(contentX, cursorY, 4, 18).fill('#dc2626');
    doc.font(fontFor('latin')).fontSize(13).fillColor(DARK_BLUE)
        .text('Key Information Extracted', contentX + 12, cursorY + 2);
    cursorY += 28;
    doc.rect(contentX, cursorY, contentW, 1).fill('#e0eaf4');
    cursorY += 12;

    // ── Severity badge (prominent, full-width) ─────────────────
    if (entities.severity) {
        const sev = SEVERITY_COLORS[entities.severity] || SEVERITY_COLORS.medium;
        const sevY = cursorY;

        doc.rect(contentX, sevY, contentW, 36).fill(sev.bg);
        doc.rect(contentX, sevY, 4, 36).fill(sev.text);

        doc.font(fontFor('latin')).fontSize(10).fillColor(sev.text)
            .text('SEVERITY LEVEL', contentX + 12, sevY + 6);
        doc.font(fontFor('latin')).fontSize(14).fillColor(sev.text)
            .text(`● ${sev.label}`, contentX + 12, sevY + 18);

        // Extraction method badge (right side)
        if (entities.extraction_method) {
            const methodLabel = entities.extraction_method === 'rule_based' ? 'Rule-based' :
                                entities.extraction_method === 'llm_anthropic' ? 'AI (Claude)' :
                                entities.extraction_method === 'llm_openai' ? 'AI (GPT)' : entities.extraction_method;
            doc.font(fontFor('latin')).fontSize(9).fillColor('#64748b')
                .text(`Extracted via: ${methodLabel}`, contentX + contentW - 150, sevY + 13, { width: 140, align: 'right' });
        }

        cursorY = sevY + 44;
    }

    // ── Entity grid (2 columns) ────────────────────────────────
    const entityItems = [];

    if (entities.incident_type) {
        entityItems.push({ label: 'Incident Type', value: entities.incident_type, icon: '[!]' });
    }
    if (entities.location) {
        entityItems.push({ label: 'Location', value: entities.location, icon: '[@]' });
    }
    if (entities.people_count !== null && entities.people_count !== undefined) {
        entityItems.push({ label: 'People Involved', value: String(entities.people_count), icon: '[P]' });
    }
    if (entities.phones && entities.phones.length > 0) {
        entityItems.push({ label: 'Phone Numbers', value: entities.phones.join(', '), icon: '[#]' });
    }
    if (entities.caller_name) {
        entityItems.push({ label: 'Caller Name', value: entities.caller_name, icon: '[N]' });
    }
    if (entities.victim_names && entities.victim_names.length > 0) {
        entityItems.push({ label: 'Victim Names', value: entities.victim_names.join(', '), icon: '[V]' });
    }
    if (entities.time_mentioned) {
        entityItems.push({ label: 'Time Mentioned', value: entities.time_mentioned, icon: '[T]' });
    }
    if (entities.date_mentioned) {
        entityItems.push({ label: 'Date Mentioned', value: entities.date_mentioned, icon: '[D]' });
    }
    if (entities.additional_details) {
        entityItems.push({ label: 'Additional Details', value: entities.additional_details, icon: '[i]', fullWidth: true });
    }

    if (entityItems.length === 0) {
        doc.font(fontFor('latin')).fontSize(11).fillColor('#94a3b8')
            .text('No specific entities detected in this transcription.', contentX, cursorY);
        cursorY = doc.y + 12;
        return cursorY;
    }

    const halfW = (contentW - 12) / 2;
    let col = 0;
    let rowY = cursorY;
    let maxRowHeight = 0;

    entityItems.forEach((item, idx) => {
        // Check for page break
        if (rowY > H - 120) {
            doc.addPage();
            addContinuationHeader(doc, W, MID_BLUE, LIGHT_BLUE);
            rowY = 40;
            col = 0;
            maxRowHeight = 0;
        }

        const isFullWidth = item.fullWidth;
        const boxW = isFullWidth ? contentW : halfW;
        const boxX = isFullWidth ? contentX : contentX + col * (halfW + 12);

        // Box background
        doc.rect(boxX, rowY, boxW, 52).fill('#f8fbff');
        doc.rect(boxX, rowY, boxW, 52).stroke('#e0eaf4');

        // Label
        doc.font(fontFor('latin')).fontSize(8).fillColor('#94a3b8')
            .text(`${item.icon}  ${item.label.toUpperCase()}`, boxX + 10, rowY + 8, { width: boxW - 20 });

        // Value
        const valueScript = detectScript(item.value);
        doc.font(fontFor(valueScript)).fontSize(11).fillColor(DARK_BLUE)
            .text(item.value, boxX + 10, rowY + 22, {
                width: boxW - 20,
                lineBreak: true,
                height: 24,
            });

        maxRowHeight = Math.max(maxRowHeight, 52);

        if (isFullWidth) {
            rowY += maxRowHeight + 8;
            maxRowHeight = 0;
            col = 0;
        } else {
            col++;
            if (col === 2) {
                rowY += maxRowHeight + 8;
                maxRowHeight = 0;
                col = 0;
            }
        }
    });

    // If last row had only 1 item
    if (col === 1) {
        rowY += maxRowHeight + 8;
    }

    return rowY + 8;
}

// ── Render a labelled section ──────────────────────────────────
function renderSection(doc, title, text, contentX, contentW, cursorY, H, W, MID_BLUE, LIGHT_BLUE, fontFor, DARK_BLUE, GRAY_700) {
    doc.rect(contentX, cursorY, 4, 18).fill(LIGHT_BLUE);
    doc.font(fontFor('latin')).fontSize(13).fillColor(DARK_BLUE)
        .text(title, contentX + 12, cursorY + 2);
    cursorY += 28;
    doc.rect(contentX, cursorY, contentW, 1).fill('#e0eaf4');
    cursorY += 12;

    const paragraphs = chunkText(text, 500);
    let isFirstPara = true;

    for (const para of paragraphs) {
        if (!isFirstPara) cursorY = doc.y + 8;
        isFirstPara = false;

        if (doc.y > H - 100) {
            doc.addPage();
            addContinuationHeader(doc, W, MID_BLUE, LIGHT_BLUE);
            cursorY = 40;
        }

        renderMixedText(doc, para, contentX, cursorY, contentW, 10.5, GRAY_700, fontFor, true);
        cursorY = doc.y;
    }

    return cursorY;
}

function renderMixedText(doc, text, x, y, width, fontSize, color, fontFor, justify) {
    if (!text) return;

    const script = detectScript(text);
    const isRTL = script === 'arabic';
    const align = isRTL ? 'right' : (justify ? 'justify' : 'left');

    const options = { width, lineGap: 3, paragraphGap: 6, align };
    if (isRTL) {
        options.features = ['rtla'];
        options.textDirection = 'rtl';
    }

    doc.font(fontFor(script)).fontSize(fontSize).fillColor(color).text(text, x, y, options);
}

function addContinuationHeader(doc, W, MID_BLUE, LIGHT_BLUE) {
    doc.rect(0, 0, W, 8).fill(MID_BLUE);
    doc.rect(0, 8, W, 3).fill(LIGHT_BLUE);
}

function chunkText(text, maxCharsPerChunk = 500) {
    if (!text || text.length <= maxCharsPerChunk) return [text || ''];

    const sentences = text.match(/[^.!?؟。！？\n]+[.!?؟。！？\n]*/g) || [];
    if (sentences.length <= 1) {
        const chunks = [];
        for (let i = 0; i < text.length; i += maxCharsPerChunk) {
            chunks.push(text.slice(i, i + maxCharsPerChunk));
        }
        return chunks;
    }

    const chunks = [];
    let current = '';
    for (const s of sentences) {
        if ((current + s).length > maxCharsPerChunk && current.length > 0) {
            chunks.push(current.trim());
            current = s;
        } else {
            current += ' ' + s;
        }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
}

module.exports = { generateTranscriptionPDF };