const axios = require('axios');
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    const { email, subject, message, html, otp } = options;

    // 1. Try EmailJS (REST API) first - Most reliable on Render/Cloud
    console.log('[Mailer] Checking EmailJS Config...');
    console.log(`[Mailer] SERVICE_ID: ${process.env.EMAILJS_SERVICE_ID ? 'Found' : 'Missing'}`);
    console.log(`[Mailer] TEMPLATE_ID: ${process.env.EMAILJS_TEMPLATE_ID ? 'Found' : 'Missing'}`);
    console.log(`[Mailer] PUBLIC_KEY: ${process.env.EMAILJS_PUBLIC_KEY ? 'Found' : 'Missing'}`);
    console.log(`[Mailer] PRIVATE_KEY: ${process.env.EMAILJS_PRIVATE_KEY ? 'Found' : 'Missing'}`);

    if (process.env.EMAILJS_SERVICE_ID && process.env.EMAILJS_TEMPLATE_ID && process.env.EMAILJS_PUBLIC_KEY) {
        try {
            console.log(`[Mailer] EmailJS Attempt: ${email}`);
            
            const istTime = new Date(Date.now() + 330 * 60000);
            const timeString = istTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

            console.log(`[Mailer] Template Variables: email=${email}, passcode=${otp}, time=${timeString}`);
            
            const data = {
                service_id: process.env.EMAILJS_SERVICE_ID,
                template_id: process.env.EMAILJS_TEMPLATE_ID,
                user_id: process.env.EMAILJS_PUBLIC_KEY,
                accessToken: process.env.EMAILJS_PRIVATE_KEY,
                template_params: {
                    email: email, // Matches {{email}}
                    passcode: otp || '', // Matches {{passcode}}
                    time: timeString, // Matches {{time}}
                    subject: subject,
                    message: message
                }
            };

            const response = await axios.post('https://api.emailjs.com/api/v1.0/email/send', data);
            console.log('[Mailer] EmailJS Success:', response.data);
            return { success: true, method: 'emailjs' };
        } catch (emailjsError) {
            console.error('[Mailer] EmailJS Failed:', emailjsError.response?.data || emailjsError.message);
            // If EmailJS fails, we continue to Nodemailer fallback
        }
    } else {
        console.warn('[Mailer] EmailJS keys missing, skipping to Nodemailer fallback');
    }

    // 2. Fallback to SMTP (Nodemailer/Gmail)
    try {
        console.log(`[Mailer] Nodemailer Fallback Attempt: ${email}`);
        
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            throw new Error('SMTP credentials missing');
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            pool: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        const info = await transporter.sendMail({
            from: `"${process.env.EMAIL_FROM_NAME || 'AlloteMe'}" <${process.env.EMAIL_FROM_EMAIL || process.env.EMAIL_USER}>`,
            to: email,
            subject: subject,
            text: message,
            html: html,
        });

        console.log('[Mailer] Nodemailer Success:', info.messageId);
        return { success: true, method: 'nodemailer', messageId: info.messageId };
    } catch (smtpError) {
        console.error('[Mailer] Nodemailer Failed:', smtpError.message);
        
        // Last Resort: Final Error
        throw new Error(`Email delivery failed across all channels. EmailJS and Nodemailer both failed. Last SMTP error: ${smtpError.message}`);
    }
};

module.exports = sendEmail;
