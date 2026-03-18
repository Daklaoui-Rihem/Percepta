const nodemailer = require('nodemailer');
const Settings = require('../models/Settings');

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

exports.sendWelcomeEmail = async (user, rawPassword) => {
    try {
        const settings = await Settings.findOne();
        const transporter = await getTransporter();
        const platformUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        await transporter.sendMail({
            from: `"Percepta Platform" <${settings?.smtpFrom || process.env.SMTP_USER || 'no-reply@ifbw.net'}>`,
            to: user.email,
            subject: 'Bienvenue sur Percepta - Vos identifiants de connexion',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #f0f4f8; padding: 32px; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #1a3f5f 0%, #00338e 100%); padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
            <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: 1px;">PERCEPTA</h1>
            <p style="color: #c6eaff; margin: 4px 0 0; font-size: 13px;">Activation de votre compte</p>
          </div>

          <div style="background: white; padding: 28px; border-radius: 8px; border: 1px solid #e0eaf4;">
            <p style="color: #1a3f5f; font-size: 16px; margin: 0 0 16px;">Bonjour <strong>${user.name}</strong>,</p>
            <p style="color: #555; font-size: 14px; margin: 0 0 20px;">
              Votre compte a été créé avec succès sur la plateforme Percepta. Voici vos identifiants temporaires :
            </p>

            <div style="background: #f8fbff; border: 1px solid #d0e4f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <p style="margin: 0 0 10px; color: #666; font-size: 13px;">Email : <strong style="color: #1a3a6b;">${user.email}</strong></p>
              <p style="margin: 0; color: #666; font-size: 13px;">Mot de passe : <strong style="color: #1a3a6b;">${rawPassword}</strong></p>
            </div>

            <p style="color: #dc2626; font-size: 13px; font-weight: 700; background: #fee2e2; padding: 12px; border-radius: 6px; margin-bottom: 24px;">
              ⚠️ IMPORTANT : Vous devez vous connecter sous 24 heures pour activer votre compte. Passé ce délai, le compte sera automatiquement supprimé par mesure de sécurité.
            </p>

            <div style="text-align: center;">
              <a href="${platformUrl}/login" style="display: inline-block; background: #1a3a6b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(26, 58, 107, 0.2);">
                Se connecter maintenant
              </a>
            </div>
          </div>

          <p style="text-align: center; color: #aaa; font-size: 12px; margin-top: 20px;">
            © 2026 IFBW Platform — Sécurité & Intelligence.
          </p>
        </div>
      `,
        });
        console.log(`✅ Welcome email sent to: ${user.email}`);
    } catch (error) {
        console.error('Email sending error:', error);
    }
};
