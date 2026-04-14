const PDFDocument = require('pdfkit');
const fs   = require('fs');
const path = require('path');

const DARK_BLUE  = '#1a3f5f';
const MID_BLUE   = '#00338e';
const LIGHT_BLUE = '#3b82f6';
const WHITE      = '#ffffff';
const GRAY_700   = '#374151';
const GRAY_400   = '#9ca3af';

const SEVERITY_COLORS = {
    critical: { bg: '#fff1f2', text: '#dc2626', label: 'CRITICAL' },
    high:     { bg: '#fff7ed', text: '#c2410c', label: 'HIGH'     },
    medium:   { bg: '#fefce8', text: '#ca8a04', label: 'MEDIUM'   },
    low:      { bg: '#f0fdf4', text: '#16a34a', label: 'LOW'      },
};

const INCIDENT_LABELS = {
    assault:    '⚠ Assault / Aggression',
    fire:       '🔥 Fire / Smoke',
    crowd:      '👥 Abnormal Crowd',
    suspicious: '👁 Suspicious Behaviour',
    fall:       '🩺 Person Fall',
};

async function generateVideoReportPDF(opts) {
    const {
        analysisId,
        originalName,
        videoResult,     // parsed JSON from python script
        userName  = 'Unknown',
        userEmail = '',
        createdAt = new Date(),
        outputDir,
    } = opts;

    fs.mkdirSync(outputDir, { recursive: true });

    const safeName = originalName
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 40);

    const pdfPath = path.join(outputDir, `video_report_${safeName}_${analysisId}.pdf`);

    const incidents  = videoResult.incidents  || [];
    const keyframes  = videoResult.keyframes  || [];
    const summary    = videoResult.summary    || '';
    const duration   = videoResult.duration   || 0;
    const resolution = videoResult.resolution || '—';
    const model      = videoResult.detection_model || '—';

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 0, bottom: 40, left: 0, right: 0 },
        });

        const W = doc.page.width;
        const H = doc.page.height;

        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        // ── Header ─────────────────────────────────────────────
        doc.rect(0, 0, W, 120).fill(MID_BLUE);
        doc.rect(0, 110, W, 10).fill(LIGHT_BLUE);

        doc.font('Helvetica-Bold').fontSize(22).fillColor(WHITE)
            .text('PERCEPTA', 40, 28);
        doc.font('Helvetica').fontSize(10).fillColor('#93c5fd')
            .text('Video Incident Analysis Report', 40, 54);

        doc.rect(W - 180, 30, 140, 32).fill('rgba(255,255,255,0.1)');
        doc.font('Helvetica-Bold').fontSize(11).fillColor(WHITE)
            .text('VIDEO ANALYSIS REPORT', W - 175, 40, { width: 130, align: 'center' });

        // ── Meta band ─────────────────────────────────────────
        doc.rect(0, 120, W, 90).fill('#f0f7ff');

        const metaY = 134;
        const colW  = W / 4;

        [
            { label: 'FILE',       value: originalName.length > 22 ? originalName.substring(0, 22) + '…' : originalName },
            { label: 'DURATION',   value: secondsToHMS(duration) },
            { label: 'RESOLUTION', value: resolution },
            { label: 'MODEL',      value: model },
        ].forEach((item, i) => {
            const x = 40 + i * colW;
            doc.font('Helvetica').fontSize(8).fillColor(GRAY_400).text(item.label, x, metaY, { width: colW - 10 });
            doc.font('Helvetica-Bold').fontSize(12).fillColor(DARK_BLUE).text(item.value, x, metaY + 14, { width: colW - 10 });
        });

        const userY = metaY + 42;
        doc.font('Helvetica').fontSize(8).fillColor(GRAY_400)
            .text('ANALYST', 40, userY)
            .text('DATE', 40 + colW, userY)
            .text('REPORT ID', 40 + colW * 2, userY);
        doc.font('Helvetica').fontSize(10).fillColor(DARK_BLUE)
            .text(userName, 40, userY + 12, { width: colW - 10 })
            .text(createdAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }), 40 + colW, userY + 12)
            .text(String(analysisId).substring(0, 12) + '…', 40 + colW * 2, userY + 12);

        let cursorY = 228;
        const cX = 40;
        const cW = W - 80;

        // ── Incident count banner ────────────────────────────
        const bannerColor = incidents.length === 0 ? '#f0fdf4' : (
            incidents.some(i => i.severity === 'critical') ? '#fff1f2' : '#fff7ed'
        );
        const bannerText  = incidents.length === 0 ? 'NO INCIDENTS DETECTED' :
            `${incidents.length} INCIDENT${incidents.length > 1 ? 'S' : ''} DETECTED`;
        const bannerTColor = incidents.length === 0 ? '#16a34a' :
            (incidents.some(i => i.severity === 'critical') ? '#dc2626' : '#c2410c');

        doc.rect(cX, cursorY, cW, 44).fill(bannerColor);
        doc.font('Helvetica-Bold').fontSize(18).fillColor(bannerTColor)
            .text(bannerText, cX, cursorY + 12, { width: cW, align: 'center' });
        cursorY += 58;

        // ── Summary ──────────────────────────────────────────
        sectionHeader(doc, 'Analysis Summary', cX, cursorY, LIGHT_BLUE, DARK_BLUE);
        cursorY += 28;

        doc.font('Helvetica').fontSize(11).fillColor(GRAY_700)
            .text(summary, cX, cursorY, { width: cW, lineGap: 3 });
        cursorY = doc.y + 20;

        // Stats row
        const stats = [
            { label: 'Total Incidents', value: String(incidents.length) },
            { label: 'Keyframes',       value: String(keyframes.length) },
            { label: 'Duration',        value: secondsToHMS(duration) },
            { label: 'Avg People',      value: String(videoResult.avg_people || 0) },
        ];
        const sw = cW / 4;
        stats.forEach((s, i) => {
            const sx = cX + i * sw;
            doc.rect(sx, cursorY, sw - 8, 50).fill('#f0f7ff');
            doc.font('Helvetica-Bold').fontSize(14).fillColor(LIGHT_BLUE).text(s.value, sx + 8, cursorY + 8);
            doc.font('Helvetica').fontSize(8).fillColor(GRAY_400).text(s.label.toUpperCase(), sx + 8, cursorY + 28);
        });
        cursorY += 66;

        // ── Incidents list ──────────────────────────────────
        if (incidents.length > 0) {
            checkPageBreak(doc, cursorY, H, W, MID_BLUE, LIGHT_BLUE);
            if (doc.y < cursorY) cursorY = doc.y;

            sectionHeader(doc, 'Detected Incidents', cX, cursorY, '#dc2626', DARK_BLUE);
            cursorY += 28;

            for (const incident of incidents) {
                checkPageBreak(doc, cursorY, H, W, MID_BLUE, LIGHT_BLUE);
                cursorY = Math.max(cursorY, doc.y);

                const sev = SEVERITY_COLORS[incident.severity] || SEVERITY_COLORS.medium;
                const incLabel = INCIDENT_LABELS[incident.type] || incident.type;

                doc.rect(cX, cursorY, 4, 48).fill(sev.text);
                doc.rect(cX + 4, cursorY, cW - 4, 48).fill(sev.bg);

                doc.font('Helvetica-Bold').fontSize(13).fillColor(sev.text)
                    .text(incLabel, cX + 14, cursorY + 8);
                doc.font('Helvetica').fontSize(10).fillColor(GRAY_700)
                    .text(`Time: ${incident.timestamp_str || secondsToHMS(incident.timestamp || 0)}   ·   Severity: ${sev.label}`, cX + 14, cursorY + 26);

                cursorY += 58;
            }
            cursorY += 10;
        }

        // ── Keyframes section ────────────────────────────────
        const incidentFrames = keyframes.filter(f => f.is_incident);
        const regularFrames  = keyframes.filter(f => !f.is_incident).slice(0, 6);
        const framesToShow   = [...incidentFrames, ...regularFrames].slice(0, 12);

        if (framesToShow.length > 0) {
            checkPageBreak(doc, cursorY, H, W, MID_BLUE, LIGHT_BLUE);
            cursorY = Math.max(cursorY, doc.y);

            sectionHeader(doc, 'Keyframes', cX, cursorY, LIGHT_BLUE, DARK_BLUE);
            cursorY += 28;

            const imgW = (cW - 16) / 2;
            const imgH = imgW * 9 / 16;   // 16:9

            for (let i = 0; i < framesToShow.length; i++) {
                const frame = framesToShow[i];
                const col   = i % 2;
                const imgX  = cX + col * (imgW + 16);

                if (col === 0) {
                    checkPageBreak(doc, cursorY + imgH + 40, H, W, MID_BLUE, LIGHT_BLUE);
                    cursorY = Math.max(cursorY, doc.y);
                }

                // Frame image
                if (frame.path && fs.existsSync(frame.path)) {
                    try {
                        doc.image(frame.path, imgX, cursorY, { width: imgW, height: imgH });
                    } catch (_) {
                        doc.rect(imgX, cursorY, imgW, imgH).fill('#e5e7eb');
                        doc.font('Helvetica').fontSize(10).fillColor('#888')
                            .text('Image unavailable', imgX, cursorY + imgH / 2 - 5, { width: imgW, align: 'center' });
                    }
                } else {
                    doc.rect(imgX, cursorY, imgW, imgH).fill('#e5e7eb');
                }

                // Caption
                if (frame.is_incident) {
                    doc.rect(imgX, cursorY, imgW, 18).fill('rgba(220,38,38,0.85)');
                    doc.font('Helvetica-Bold').fontSize(9).fillColor(WHITE)
                        .text('⚠ INCIDENT', imgX + 4, cursorY + 4);
                }

                const captionY = cursorY + imgH + 4;
                doc.font('Helvetica').fontSize(9).fillColor(GRAY_700)
                    .text(`${frame.timestamp_str || secondsToHMS(frame.timestamp || 0)}  ·  People: ${frame.people_count || 0}`, imgX, captionY, { width: imgW });

                if (col === 1 || i === framesToShow.length - 1) {
                    cursorY += imgH + 30;
                }
            }
        }

        // ── Footer on all pages ──────────────────────────────
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
            doc.switchToPage(range.start + i);
            doc.rect(0, H - 36, W, 36).fill('#f8fbff');
            doc.rect(0, H - 37, W, 1).fill('#d0e4f0');
            doc.font('Helvetica').fontSize(8).fillColor(GRAY_400)
                .text('© 2026 IFBW Percepta Platform — Confidential', 40, H - 24)
                .text(`Page ${i + 1} of ${range.count}`, W - 80, H - 24, { width: 60, align: 'right' });
        }

        doc.end();
        stream.on('finish', () => resolve(pdfPath));
        stream.on('error', reject);
    });
}

function sectionHeader(doc, title, x, y, accentColor, titleColor) {
    doc.rect(x, y, 4, 18).fill(accentColor);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(titleColor).text(title, x + 12, y + 2);
}

function checkPageBreak(doc, y, H, W, midBlue, lightBlue) {
    if (y > H - 120) {
        doc.addPage();
        doc.rect(0, 0, W, 8).fill(midBlue);
        doc.rect(0, 8, W, 3).fill(lightBlue);
    }
}

function secondsToHMS(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

module.exports = { generateVideoReportPDF };