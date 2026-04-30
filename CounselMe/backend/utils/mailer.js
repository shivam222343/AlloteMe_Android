const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    console.log(`[Mailer] Attempting to send email to ${options.email} using ${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT}`);
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('[Mailer] Missing EMAIL_USER or EMAIL_PASS environment variables');
        throw new Error('Email configuration missing on server');
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        timeout: 10000,
    });

    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'AlloteMe'}" <${process.env.EMAIL_FROM_EMAIL || process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
    };

    try {
        console.log('[Mailer] Calling transporter.sendMail...');
        const info = await transporter.sendMail(mailOptions);
        console.log('[Mailer] Email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('[Mailer] Error sending email:', error);
        throw error;
    }
};

module.exports = sendEmail;
