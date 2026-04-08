const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
    // Who uploaded it
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },

    // File info
    originalName: { type: String, required: true },
    filename: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    type: {
        type: String,
        enum: ['audio', 'video', 'groupActivity'],
        required: true,
    },

    // Status management
    status: {
        type: String,
        enum: ['pending', 'processing', 'done', 'error'],
        default: 'pending',
    },
    errorMessage: { type: String, default: '' },

    // Storage path
    filePath: { type: String, required: true },

    // Results
    transcription: { type: String, default: '' },
    summary: { type: String, default: '' },

    // ── Translation (NEW) ──────────────────────────────────────
    translationLang: { type: String, default: '' },   // e.g. 'fr', 'en', 'ar'
    translatedText:  { type: String, default: '' },   // translated transcription

    // PDF report
    pdfPath: { type: String, default: '' },
    pdfGeneratedAt: { type: Date, default: null },

}, { timestamps: true });

module.exports = mongoose.model('Analysis', analysisSchema);