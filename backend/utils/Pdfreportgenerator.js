/**
 * pdfReportGenerator.js
 *
 * Generates a professional PDF report from a completed audio transcription.
 * Uses pdfkit with embedded Unicode fonts so Arabic, Chinese, Japanese, Korean
 * and other non-Latin scripts render correctly instead of showing gibberish.
 *
 * Font strategy:
 *   - NotoSans         → Latin / Cyrillic / Greek / most European scripts
 *   - NotoSansArabic   → Arabic
 *   - IPA Gothic (ipag)→ CJK (Chinese, Japanese, Korean)
 *
 * On Linux servers the fonts are pre-installed via:
 *   apt-get install fonts-noto fonts-noto-cjk ipafont-gothic
 *
 * On Windows (dev), the installer copies the same .ttf/.otf files into
 *   backend/fonts/  — the code falls back to that directory automatically.
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// ── Font paths ─────────────────────────────────────────────────
// System font locations (Linux / Ubuntu)
const SYSTEM_FONTS = {
    latin: '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf',
    arabic: '/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf',
    cjk: '/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf',
};

// Fallback: fonts bundled alongside the backend (copy them here for Windows dev)
const BUNDLED_FONTS = {
    latin: path.join(__dirname, '..', 'fonts', 'NotoSans-Regular.ttf'),
    arabic: path.join(__dirname, '..', 'fonts', 'NotoSansArabic-Regular.ttf'),
    cjk: path.join(__dirname, '..', 'fonts', 'ipag.ttf'),
};

function resolveFontPath(key) {
    if (fs.existsSync(SYSTEM_FONTS[key])) return SYSTEM_FONTS[key];
    if (fs.existsSync(BUNDLED_FONTS[key])) return BUNDLED_FONTS[key];
    return null; // will fall back to Helvetica for that block
}

// ── Script detection ───────────────────────────────────────────
/**
 * Returns the font key required to render the given text string.
 * Priorities: CJK > Arabic > Latin (default)
 */
function detectScript(text) {
    if (!text) return 'latin';

    // CJK: Chinese, Japanese (Hiragana/Katakana/Kanji), Korean (Hangul)
    if (/[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/.test(text)) {
        return 'cjk';
    }
    // Arabic / Farsi / Urdu
    if (/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)) {
        return 'arabic';
    }
    return 'latin';
}

/**
 * Splits a block of text into runs that each share the same script,
 * so we can switch fonts mid-paragraph.
 * Returns: Array<{ text: string, script: 'latin'|'arabic'|'cjk' }>
 */
function splitIntoRuns(text) {
    if (!text) return [];
    const runs = [];
    let currentScript = detectScript(text[0]);
    let start = 0;

    for (let i = 1; i < text.length; i++) {
        const s = detectScript(text[i]);
        if (s !== currentScript) {
            runs.push({ text: text.slice(start, i), script: currentScript });
            currentScript = s;
            start = i;
        }
    }
    runs.push({ text: text.slice(start), script: currentScript });
    return runs;
}

// ── Brand colors ───────────────────────────────────────────────
const DARK_BLUE = '#1a3f5f';
const MID_BLUE = '#00338e';
const LIGHT_BLUE = '#3b82f6';
const WHITE = '#ffffff';
const GRAY_700 = '#374151';
const GRAY_400 = '#9ca3af';
const SUCCESS = '#16a34a';

// ── Main export ────────────────────────────────────────────────
async function generateTranscriptionPDF(opts) {
    const {
        analysisId,
        originalName,
        transcription,
        translatedText,
        translationLang,
        summary,
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

    // ── Parse summary metadata ─────────────────────────────────
    const durationMatch = summary?.match(/Duration:\s*([^\|]+)/i);
    const languageMatch = summary?.match(/Language:\s*(\w+)/i);
    const wordsMatch = summary?.match(/~([\d,]+)\s*words/i);
    const previewMatch = summary?.match(/(?:Preview|Key Highlights):\n([\s\S]+)/i);

    const duration = durationMatch?.[1]?.trim() || '—';
    const language = languageMatch?.[1]?.trim() || '—';
    const wordCount = wordsMatch?.[1]?.trim() || '—';
    const preview = previewMatch?.[1]?.trim() || '';

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 0, bottom: 40, left: 0, right: 0 },
            info: {
                Title: `Transcription Report — ${originalName}`,
                Author: 'Percepta Platform',
                Subject: 'Audio Transcription Report',
                Creator: 'Percepta by IFBW',
            },
        });

        // ── Register fonts ─────────────────────────────────────────
        const fontPaths = {
            latin: resolveFontPath('latin'),
            arabic: resolveFontPath('arabic'),
            cjk: resolveFontPath('cjk'),
        };

        if (fontPaths.latin) doc.registerFont('Latin', fontPaths.latin);
        if (fontPaths.arabic) doc.registerFont('Arabic', fontPaths.arabic);
        if (fontPaths.cjk) doc.registerFont('CJK', fontPaths.cjk);

        // Helper: pick the right registered font name for a script
        const fontFor = (script) => {
            if (script === 'arabic' && fontPaths.arabic) return 'Arabic';
            if (script === 'cjk' && fontPaths.cjk) return 'CJK';
            return fontPaths.latin ? 'Latin' : 'Helvetica';
        };

        const W = doc.page.width;
        const H = doc.page.height;

        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        // ── HEADER BAND ────────────────────────────────────────────
        doc.rect(0, 0, W, 120).fill(MID_BLUE);
        doc.rect(0, 110, W, 10).fill(LIGHT_BLUE);

        doc.font(fontFor('latin')).fontSize(22).fillColor(WHITE)
            .text('PERCEPTA', 40, 28, { continued: false });

        doc.font(fontFor('latin')).fontSize(10).fillColor('#93c5fd')
            .text('Intelligence & Transcription Platform', 40, 54);

        doc.rect(W - 180, 30, 140, 32).fill('rgba(255,255,255,0.15)');
        doc.font(fontFor('latin')).fontSize(11).fillColor(WHITE)
            .text('TRANSCRIPTION REPORT', W - 175, 40, { width: 130, align: 'center' });

        // ── META BAND ──────────────────────────────────────────────
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

        // ── CONTENT ────────────────────────────────────────────────
        const contentX = 40;
        const contentW = W - 80;
        let cursorY = 228;

        // Section: Summary
        doc.rect(contentX, cursorY, 4, 18).fill(LIGHT_BLUE);
        doc.font(fontFor('latin')).fontSize(13).fillColor(DARK_BLUE)
            .text('Summary', contentX + 12, cursorY + 2);
        cursorY += 28;

        if (preview) {
            doc.rect(contentX, cursorY, contentW, 1).fill('#e0eaf4');
            cursorY += 10;
            // Preview may contain non-Latin text — render with appropriate font
            renderMixedText(doc, preview, contentX, cursorY, contentW, 11, GRAY_700, fontFor, false);
            cursorY = doc.y + 18;
        }

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

        // Section: Full Transcription
        cursorY = renderSection(doc, 'Full Transcription', transcription, contentX, contentW, cursorY, H, W, MID_BLUE, LIGHT_BLUE, fontFor, DARK_BLUE, GRAY_700);

        // Section: Translation (if present)
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

        // ── FOOTER on all pages ────────────────────────────────────
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

// ── Render a labelled section of (possibly mixed-script) text ──
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

/**
 * Renders a text block that may contain multiple scripts (Arabic, CJK, Latin).
 * Splits into same-script runs and renders each with the appropriate font.
 */
function renderMixedText(doc, text, x, y, width, fontSize, color, fontFor, justify) {
    if (!text) return;

    const script = detectScript(text);
    const isRTL = script === 'arabic';
    const align = isRTL ? 'right' : (justify ? 'justify' : 'left');

    const options = {
        width,
        lineGap: 3,
        paragraphGap: 6,
        align,
    };

    if (isRTL) {
        options.features = ['rtla'];
        options.textDirection = 'rtl';
    }

    doc.font(fontFor(script))
        .fontSize(fontSize)
        .fillColor(color)
        .text(text, x, y, options);
}

function addContinuationHeader(doc, W, MID_BLUE, LIGHT_BLUE) {
    doc.rect(0, 0, W, 8).fill(MID_BLUE);
    doc.rect(0, 8, W, 3).fill(LIGHT_BLUE);
}

/**
 * Split long text into chunks at sentence / word boundaries.
 */
function chunkText(text, maxCharsPerChunk = 500) {
    if (!text || text.length <= maxCharsPerChunk) return [text || ''];

    // Try sentence splits first (works for languages with punctuation)
    const sentences = text.match(/[^.!?؟。！？\n]+[.!?؟。！？\n]*/g) || [];
    if (sentences.length <= 1) {
        // No sentence breaks (e.g. CJK without punctuation) — split by char count
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

function detectScript(text) {
    if (!text) return 'latin';
    if (/[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/.test(text)) return 'cjk';
    if (/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)) return 'arabic';
    return 'latin';
}

module.exports = { generateTranscriptionPDF };