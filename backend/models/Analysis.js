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
    // ── Emotion / distress ────────────────────────────────────
    sentiment: { type: String, default: null },
    dominant_emotion: { type: String, default: null },
    emotion_scores: { type: mongoose.Schema.Types.Mixed, default: null },
    emotional_markers: { type: [String], default: [] },
    narrative_coherence: { type: String, default: null },
    caller_speaking_freely: { type: Boolean, default: null },
    anomalies: { type: [String], default: [] },
    worst_case_scenario: { type: String, default: null },
    worst_case_likelihood: { type: String, default: null },
    hidden_distress: { type: mongoose.Schema.Types.Mixed, default: null },
    // ── Smart Suggestions (NEW) ───────────────────────────────
    smart_suggestions: {
        type: new mongoose.Schema({
            priority_actions:          { type: [String], default: [] },
            dispatcher_notes:          { type: [String], default: [] },
            resources_to_dispatch:     { type: [String], default: [] },
            estimated_response_level:  { type: String, default: 'standard' },
            follow_up_checklist:       { type: [String], default: [] },
        }, { _id: false }),
        default: null,
    },
}, { _id: false });

const analysisSchema = new mongoose.Schema({
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
    originalName: { type: String, required: true },
    filename: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    type: {
        type: String,
        enum: ['audio', 'video', 'groupActivity'],
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'done', 'error'],
        default: 'pending',
    },
    errorMessage: { type: String, default: '' },
    filePath: { type: String, required: true },
    transcription: { type: String, default: '' },
    language: { type: String, default: 'auto' },
    duration: { type: Number, default: 0 },
    translationLang: { type: String, default: '' },
    translatedText: { type: String, default: '' },
    videoAnalysisData: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
    },
    videoFramesDir: { type: String, default: '' },
    extractedEntities: {
        type: extractedEntitiesSchema,
        default: null,
    },
    translatedExtractedEntities: {
        type: extractedEntitiesSchema,
        default: null,
    },
    pdfPath: { type: String, default: '' },
    pdfGeneratedAt: { type: Date, default: null },
}, { timestamps: true });

analysisSchema.index({ userId: 1, createdAt: -1 });
analysisSchema.index({ tenantId: 1, createdAt: -1 });
analysisSchema.index({ status: 1 });
analysisSchema.index({ 'extractedEntities.severity': 1 });
analysisSchema.index({ 'extractedEntities.incident_type': 1 });
analysisSchema.index({ 'extractedEntities.smart_suggestions.estimated_response_level': 1 });

module.exports = mongoose.model('Analysis', analysisSchema);