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
    originalName: { type: String, required: true },  // "meeting.mp3"
    filename: { type: String, required: true },        // "uuid-123.mp3"
    mimetype: { type: String, required: true },        // "audio/mpeg"
    size: { type: Number, required: true },            // bytes
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

    // Storage path (original upload)
    filePath: { type: String, required: true },

    // Results (filled by AI service)
    transcription: { type: String, default: '' },
    summary: { type: String, default: '' },

    // PDF report path (filled after PDF generation)
    pdfPath: { type: String, default: '' },
    pdfGeneratedAt: { type: Date, default: null },

}, { timestamps: true }); // createdAt + updatedAt automatic

module.exports = mongoose.model('Analysis', analysisSchema);