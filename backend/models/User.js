const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    role: {
        type: String,
        enum: ['Client', 'Admin', 'SuperAdmin'],
        default: 'Client',
    },
    // tenantId: for Clients, this is the Admin's _id who manages them
    // for Admins, this is null (they are root-level under SuperAdmin)
    // for SuperAdmin, null
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    department: { type: String, default: '' },
    phone: { type: String, default: '' },
    adminLevel: { type: String, default: 'Administrator' },
    photoUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);