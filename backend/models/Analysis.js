const mongoose = require('mongoose');

// ── Extracted Entities Sub-Schema ─────────────────────────────
const extractedEntitiesSchema = new mongoose.Schema({
    location: { type: String, default: null },
    phones: { type: [String], default: [] },
    people_count: { type: Number, default: null },
    incident_type: { type: String, default: null },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: null,
    },
    victim_names: { type: [String], default: [] },
    caller_name: { type: String, default: null },
    date_mentioned: { type: String, default: null },
    time_mentioned: { type: String, default: null },
    additional_details: { type: String, default: null },
    confidence: { type: Number, default: null },
    extraction_method: {
        type: String,
        enum: ['llm_anthropic', 'llm_openai', 'rule_based', 'spacy+hf_local'],
        default: null,
    },
}, { _id: false });

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
    language: { type: String, default: 'auto' },
    duration: { type: Number, default: 0 },

    // ── Translation ──────────────────────────────────────────────
    translationLang: { type: String, default: '' },
    translatedText: { type: String, default: '' },

    // ── Video analysis data ──────────────────────────────────────
    videoAnalysisData: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
    },
    videoFramesDir: { type: String, default: '' },

    // ── Key Entity Extraction (NEW) ──────────────────────────────
    extractedEntities: {
        type: extractedEntitiesSchema,
        default: null,
    },

    // PDF report
    pdfPath: { type: String, default: '' },
    pdfGeneratedAt: { type: Date, default: null },

}, { timestamps: true });

// ── Indexes for common queries ─────────────────────────────────
analysisSchema.index({ userId: 1, createdAt: -1 });
analysisSchema.index({ tenantId: 1, createdAt: -1 });
analysisSchema.index({ status: 1 });
analysisSchema.index({ 'extractedEntities.severity': 1 });
analysisSchema.index({ 'extractedEntities.incident_type': 1 });

module.exports = mongoose.model('Analysis', analysisSchema);