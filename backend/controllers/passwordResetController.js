const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Settings = require('../models/Settings');

// ── Dynamic transporter from DB settings ──────────────────────
async function getTransporter() {
    const settings = await Settings.findOne();
    return nodemailer.createTransport({
        host: settings?.smtpHost || process.env.SMTP_HOST,
        port: settings?.smtpPort || 587,
        secure: false,
        auth: {
            user: settings?.smtpUser || process.env.SMTP_USER,
            pass: settings?.smtpPass || process.env.SMTP_PASS,
        },
        tls: {
            rejectUnauthorized: false,
        },
    });
}

// ── Generate a 6-digit code ────────────────────────────────────
function generateCode() {
    return Math.floor(100000 + crypto.randomInt(900000)).toString();
}

// ──────────────────────────────────────────────────────────────
// STEP 1: Request password reset
// POST /api/auth/forgot-password
// Body: { email }
// ──────────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.json({
                message: 'If this email exists, a reset code has been sent.'
            });
        }

        const code = generateCode();
        const expiry = new Date(Date.now() + 15 * 60 * 1000);

        user.resetCode = code;
        user.resetCodeExpiry = expiry;
        user.resetCodeUsed = false;
        await user.save();

        // ── Get transporter from DB settings ──
        const transporter = await getTransporter();

        await transporter.sendMail({
            from: `"Percepta Platform" <${(await Settings.findOne())?.smtpFrom || process.env.SMTP_USER || 'superadmin@ifbw.net'}>`,
            to: user.email,
            subject: 'Votre code de réinitialisation de mot de passe',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f0f4f8; padding: 32px; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #1a3f5f 0%, #00338e 100%); padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
            <h1 style="color: white; margin: 0; font-size: 22px; letter-spacing: 1px;">PERCEPTA</h1>
            <p style="color: #c6eaff; margin: 4px 0 0; font-size: 13px;">Réinitialisation de mot de passe</p>
          </div>

          <div style="background: white; padding: 28px; border-radius: 8px; border: 1px solid #e0eaf4;">
            <p style="color: #1a3f5f; font-size: 15px; margin: 0 0 16px;">Bonjour <strong>${user.name}</strong>,</p>
            <p style="color: #555; font-size: 14px; margin: 0 0 24px;">
              Vous avez demandé la réinitialisation de votre mot de passe. Utilisez le code ci-dessous pour continuer.
            </p>

            <div style="background: #f0f4f8; border: 2px dashed #60a5fa; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <p style="color: #888; font-size: 13px; margin: 0 0 8px;">Votre code de vérification</p>
              <p style="color: #1a3a6b; font-size: 42px; font-weight: 800; letter-spacing: 10px; margin: 0;">${code}</p>
              <p style="color: #f97316; font-size: 12px; margin: 8px 0 0;">⏱ Expire dans 15 minutes</p>
            </div>

            <p style="color: #888; font-size: 13px; margin: 0;">
              Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe restera inchangé.
            </p>
          </div>

          <p style="text-align: center; color: #aaa; font-size: 12px; margin-top: 16px;">
            © 2026 IFBW Platform — Ne répondez pas à cet email.
          </p>
        </div>
      `,
        });

        console.log(`✅ Reset code sent to: ${user.email}`);

        res.json({
            message: 'If this email exists, a reset code has been sent.'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
};

// ──────────────────────────────────────────────────────────────
// STEP 2: Verify the 6-digit code
// POST /api/auth/verify-reset-code
// Body: { email, code }
// ──────────────────────────────────────────────────────────────
exports.verifyResetCode = async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ message: 'Email and code are required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user || !user.resetCode) {
            return res.status(400).json({ message: 'Invalid or expired code' });
        }

        if (user.resetCodeUsed) {
            return res.status(400).json({ message: 'This code has already been used' });
        }

        if (new Date() > user.resetCodeExpiry) {
            return res.status(400).json({ message: 'Code has expired. Please request a new one.' });
        }

        if (user.resetCode !== code.trim()) {
            return res.status(400).json({ message: 'Incorrect code. Please try again.' });
        }

        res.json({ message: 'Code verified successfully', valid: true });

    } catch (error) {
        console.error('Verify code error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ──────────────────────────────────────────────────────────────
// STEP 3: Reset the password
// POST /api/auth/reset-password
// Body: { email, code, newPassword }
// ──────────────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            return res.status(400).json({ message: 'Email, code and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user || !user.resetCode) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        if (user.resetCodeUsed) {
            return res.status(400).json({ message: 'This reset link has already been used' });
        }

        if (new Date() > user.resetCodeExpiry) {
            return res.status(400).json({ message: 'Code has expired. Please request a new one.' });
        }

        if (user.resetCode !== code.trim()) {
            return res.status(400).json({ message: 'Invalid code' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetCodeUsed = true;
        user.resetCode = undefined;
        user.resetCodeExpiry = undefined;
        await user.save();

        console.log(`✅ Password reset for: ${user.email}`);

        res.json({ message: 'Password has been reset successfully' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};