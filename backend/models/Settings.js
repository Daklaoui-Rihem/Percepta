const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  smtpHost:   { type: String, default: '' },
  smtpPort:   { type: Number, default: 587 },
  smtpUser:   { type: String, default: '' },
  smtpPass:   { type: String, default: '' },
  smtpFrom:   { type: String, default: '' },
  smtpSecure: { type: String, default: 'STARTTLS' }, // or 'SSL'
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);