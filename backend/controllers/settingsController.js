const nodemailer = require('nodemailer');
const Settings = require('../models/Settings');

// GET /api/settings/smtp
exports.getSmtp = async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) settings = await Settings.create({});
        const safe = settings.toObject();
        safe.smtpPass = safe.smtpPass ? '••••••••' : ''; // never expose password
        res.json(safe);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// PUT /api/settings/smtp
exports.saveSmtp = async (req, res) => {
    try {
        const { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, smtpSecure } = req.body;
        let settings = await Settings.findOne();
        if (!settings) settings = new Settings();

        settings.smtpHost = smtpHost || settings.smtpHost;
        settings.smtpPort = smtpPort || settings.smtpPort;
        settings.smtpUser = smtpUser || settings.smtpUser;
        settings.smtpFrom = smtpFrom || settings.smtpFrom;
        settings.smtpSecure = smtpSecure || settings.smtpSecure;
        // Only update password if a new one was provided (not the masked placeholder)
        if (smtpPass && smtpPass !== '••••••••') {
            settings.smtpPass = smtpPass;
        }

        await settings.save();
        res.json({ message: 'SMTP settings saved successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /api/settings/smtp/test
exports.testSmtp = async (req, res) => {
    try {
        const { testEmail } = req.body;
        const settings = await Settings.findOne();
        if (!settings?.smtpHost) {
            return res.status(400).json({ message: 'SMTP not configured yet' });
        }

        const transporter = nodemailer.createTransport({
            host: settings.smtpHost,
            port: settings.smtpPort,
            secure: false,
            auth: { user: settings.smtpUser, pass: settings.smtpPass },
            tls: { rejectUnauthorized: false },
        });

        await transporter.sendMail({
            from: `"Percepta Platform" <${settings.smtpFrom || settings.smtpUser}>`,
            to: testEmail,
            subject: 'Test SMTP — Percepta Platform',
            html: `<p>✅ Your SMTP configuration is working correctly.</p>`,
        });

        res.json({ message: 'Test email sent successfully!' });
    } catch (err) {
        console.error('SMTP test error:', err);
        res.status(500).json({ message: `SMTP error: ${err.message}` });
    }
};