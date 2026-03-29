/**
 * pdfReportGenerator.js
 *
 * Generates a professional PDF report from a completed audio transcription.
 * Uses pdfkit — pure Node.js, no Python dependency.
 *
 * Install: npm install pdfkit
 *
 * Returns: absolute path to the generated PDF file.
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * @param {Object} opts
 * @param {string} opts.analysisId      - MongoDB _id
 * @param {string} opts.originalName    - Original uploaded filename
 * @param {string} opts.transcription   - Full transcription text
 * @param {string} opts.summary         - Summary line (duration, language, word count)
 * @param {string} opts.userName        - Name of the user who uploaded
 * @param {string} opts.userEmail       - Email of the user
 * @param {Date}   opts.createdAt       - When the analysis was created
 * @param {string} opts.outputDir       - Where to save the PDF
 * @returns {Promise<string>}           - Absolute path to the PDF
 */
async function generateTranscriptionPDF(opts) {
    const {
        analysisId,
        originalName,
        transcription,
        summary,
        userName = 'Unknown',
        userEmail = '',
        createdAt = new Date(),
        outputDir,
    } = opts;

    // ── Ensure output directory exists ────────────────────────
    fs.mkdirSync(outputDir, { recursive: true });

    const safeName = originalName
        .replace(/\.[^/.]+$/, '')          // remove extension
        .replace(/[^a-zA-Z0-9_-]/g, '_')  // sanitize
        .substring(0, 40);

    const pdfPath = path.join(outputDir, `report_${safeName}_${analysisId}.pdf`);

    // ── Parse summary metadata ─────────────────────────────────
    // Summary format: "Duration: Xm Ys  |  Language: French  |  ~N words\n\nPreview:\n..."
    const durationMatch = summary?.match(/Duration:\s*([^\|]+)/i);
    const languageMatch = summary?.match(/Language:\s*(\w+)/i);
    const wordsMatch = summary?.match(/~([\d,]+)\s*words/i);
    const previewMatch = summary?.match(/Preview:\n([\s\S]+)/i);

    const duration = durationMatch?.[1]?.trim() || '—';
    const language = languageMatch?.[1]?.trim() || '—';
    const wordCount = wordsMatch?.[1]?.trim() || '—';
    const preview = previewMatch?.[1]?.trim() || '';

    // ── Brand colors ───────────────────────────────────────────
    const DARK_BLUE = '#1a3f5f';
    const MID_BLUE = '#00338e';
    const LIGHT_BLUE = '#3b82f6';
    const PALE_BLUE = '#dff5ff';
    const WHITE = '#ffffff';
    const GRAY_700 = '#374151';
    const GRAY_400 = '#9ca3af';
    const SUCCESS = '#16a34a';

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

        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        const W = doc.page.width;   // 595
        const H = doc.page.height;  // 842

        // ══════════════════════════════════════════════════════
        // HEADER BAND
        // ══════════════════════════════════════════════════════
        doc.rect(0, 0, W, 120).fill(MID_BLUE);
        // Decorative accent stripe
        doc.rect(0, 110, W, 10).fill(LIGHT_BLUE);

        // Platform name
        doc
            .font('Helvetica-Bold')
            .fontSize(22)
            .fillColor(WHITE)
            .text('PERCEPTA', 40, 28, { continued: false });

        // Subtitle
        doc
            .font('Helvetica')
            .fontSize(10)
            .fillColor('#93c5fd')
            .text('Intelligence & Transcription Platform', 40, 54);

        // Report type badge (right side)
        doc
            .rect(W - 180, 30, 140, 32)
            .fill('rgba(255,255,255,0.15)');

        doc
            .font('Helvetica-Bold')
            .fontSize(11)
            .fillColor(WHITE)
            .text('TRANSCRIPTION REPORT', W - 175, 40, { width: 130, align: 'center' });

        // ══════════════════════════════════════════════════════
        // META SECTION — pale blue band
        // ══════════════════════════════════════════════════════
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
            doc
                .font('Helvetica')
                .fontSize(8)
                .fillColor(GRAY_400)
                .text(item.label, x, metaY, { width: colW - 10 });
            doc
                .font('Helvetica-Bold')
                .fontSize(12)
                .fillColor(DARK_BLUE)
                .text(item.value, x, metaY + 14, { width: colW - 10 });
        });

        // Second row: user + date
        const userY = metaY + 42;
        doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor(GRAY_400)
            .text('PREPARED BY', 40, userY)
            .text('DATE', 40 + colW, userY)
            .text('REPORT ID', 40 + colW * 2, userY);

        doc
            .font('Helvetica-Bold')
            .fontSize(10)
            .fillColor(DARK_BLUE)
            .text(userName, 40, userY + 12, { width: colW - 10 })
            .text(createdAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }), 40 + colW, userY + 12)
            .text(String(analysisId).substring(0, 12) + '…', 40 + colW * 2, userY + 12);

        // ══════════════════════════════════════════════════════
        // CONTENT AREA
        // ══════════════════════════════════════════════════════
        const contentStartY = 228;
        const contentX = 40;
        const contentW = W - 80;

        let cursorY = contentStartY;

        // ── Section: Summary ──────────────────────────────────
        // Section heading line
        doc
            .rect(contentX, cursorY, 4, 18)
            .fill(LIGHT_BLUE);

        doc
            .font('Helvetica-Bold')
            .fontSize(13)
            .fillColor(DARK_BLUE)
            .text('Summary', contentX + 12, cursorY + 2);

        cursorY += 28;

        if (preview) {
            doc
                .rect(contentX, cursorY, contentW, 1)
                .fill('#e0eaf4');

            cursorY += 10;

            doc
                .font('Helvetica-Oblique')
                .fontSize(11)
                .fillColor(GRAY_700)
                .text(preview, contentX, cursorY, {
                    width: contentW,
                    lineGap: 4,
                });

            cursorY = doc.y + 18;
        }

        // Stats row
        const statItems = [
            { icon: '⏱', label: 'Duration', value: duration },
            { icon: '🌐', label: 'Language', value: language },
            { icon: '📝', label: 'Words', value: wordCount },
            { icon: '✅', label: 'Status', value: 'Completed' },
        ];

        const statW = contentW / 4;

        statItems.forEach((s, i) => {
            const sx = contentX + i * statW;
            doc
                .rect(sx, cursorY, statW - 8, 50)
                .fill('#f0f7ff');

            doc
                .font('Helvetica-Bold')
                .fontSize(10)
                .fillColor(i === 3 ? SUCCESS : LIGHT_BLUE)
                .text(s.value, sx + 8, cursorY + 8, { width: statW - 20 });

            doc
                .font('Helvetica')
                .fontSize(8)
                .fillColor(GRAY_400)
                .text(s.label.toUpperCase(), sx + 8, cursorY + 26, { width: statW - 20 });
        });

        cursorY += 66;

        // ── Section: Full Transcription ────────────────────────
        doc
            .rect(contentX, cursorY, 4, 18)
            .fill(LIGHT_BLUE);

        doc
            .font('Helvetica-Bold')
            .fontSize(13)
            .fillColor(DARK_BLUE)
            .text('Full Transcription', contentX + 12, cursorY + 2);

        cursorY += 28;

        doc
            .rect(contentX, cursorY, contentW, 1)
            .fill('#e0eaf4');

        cursorY += 12;

        // Chunk the transcription into paragraphs for readability
        const paragraphs = chunkText(transcription, 600);

        paragraphs.forEach((para, pi) => {
            if (pi > 0) {
                // Add paragraph spacing
                cursorY = doc.y + 8;
            }

            // Check if we need a new page
            if (doc.y > H - 100) {
                doc.addPage();
                cursorY = 40;
                // Repeat thin header on continuation pages
                doc
                    .rect(0, 0, W, 8)
                    .fill(MID_BLUE);
                doc
                    .rect(0, 8, W, 3)
                    .fill(LIGHT_BLUE);
                cursorY = 24;
            }

            doc
                .font('Helvetica')
                .fontSize(10.5)
                .fillColor(GRAY_700)
                .text(para, contentX, cursorY, {
                    width: contentW,
                    lineGap: 3,
                    paragraphGap: 6,
                    align: 'justify',
                });

            cursorY = doc.y;
        });

        // ══════════════════════════════════════════════════════
        // FOOTER on all pages
        // ══════════════════════════════════════════════════════
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
            doc.switchToPage(range.start + i);

            // Footer bar
            doc
                .rect(0, H - 36, W, 36)
                .fill('#f8fbff');

            doc
                .rect(0, H - 37, W, 1)
                .fill('#d0e4f0');

            doc
                .font('Helvetica')
                .fontSize(8)
                .fillColor(GRAY_400)
                .text('© 2026 IFBW Percepta Platform — Confidential', 40, H - 24)
                .text(`Page ${i + 1} of ${range.count}`, W - 80, H - 24, { width: 60, align: 'right' });
        }

        doc.end();

        stream.on('finish', () => resolve(pdfPath));
        stream.on('error', reject);
    });
}

/**
 * Split long text into paragraph-sized chunks (by sentence boundaries).
 */
function chunkText(text, maxCharsPerChunk = 600) {
    if (!text || text.length <= maxCharsPerChunk) return [text || ''];

    const sentences = text.match(/[^.!?؟]+[.!?؟]*/g) || [text];
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