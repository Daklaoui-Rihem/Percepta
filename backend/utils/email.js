const nodemailer = require('nodemailer');
const Settings = require('../models/Settings');

/**
 * Send an email notification for job completion.
 * @param {string} to - Recipient email address
 * @param {string} userName - User's name
 * @param {string} fileName - Name of the file analyzed
 * @param {string} status - 'success' or 'error'
 * @param {string} [errorMessage] - Required if status is 'error'
 */
async function sendNotificationEmail(to, userName, fileName, status, errorMessage = '') {
    if (!to) return; // Skip if no email is provided
    
    try {
        // Fetch SMTP configuration from database
        const settings = await Settings.findOne();
        
        if (!settings || !settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
            console.warn('⚠️ [Email] SMTP settings are incomplete or missing in the database. Cannot send email.');
            return;
        }

        const transporter = nodemailer.createTransport({
            host: settings.smtpHost,
            port: settings.smtpPort || 587,
            secure: settings.smtpSecure === 'SSL', // usually port 465 is SSL, 587 is STARTTLS
            auth: {
                user: settings.smtpUser,
                pass: settings.smtpPass
            }
        });

        const isSuccess = status === 'success';
        const subject = isSuccess 
            ? `[Percepta] Analysis Completed: ${fileName}` 
            : `[Percepta] Analysis Failed: ${fileName}`;
        
        let html = `<h3>Hello ${userName},</h3>`;
        
        if (isSuccess) {
            html += `<p>Great news! Your file <b>${fileName}</b> has been successfully processed.</p>
                     <p>You can now view the transcription, analysis, and download the report from your dashboard.</p>`;
        } else {
            html += `<p>Unfortunately, we encountered an error while processing your file <b>${fileName}</b>.</p>
                     <p><b>Error Details:</b> ${errorMessage}</p>
                     <p>Please try uploading the file again or contact support if the issue persists.</p>`;
        }
        
        html += `<br><p>Best regards,<br>The Percepta Team</p>`;

        const fromEmail = settings.smtpFrom || '"Percepta Notifications" <no-reply@percepta.com>';

        const info = await transporter.sendMail({
            from: fromEmail,
            to,
            subject,
            html,
        });

        console.log(`📧 [Email] Notification sent to ${to} for file ${fileName} (${status}) | MessageId: ${info.messageId}`);
    } catch (err) {
        console.error('❌ [Email] Failed to send notification email:', err.message);
    }
}

module.exports = { sendNotificationEmail };
