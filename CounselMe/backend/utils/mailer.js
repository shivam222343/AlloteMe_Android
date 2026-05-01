const axios = require('axios');
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    const { email, subject, message, html } = options;

    // 1. Try SMTP (Gmail) first
    try {
        console.log(`[Mailer] SMTP Attempt: ${email} via smtp.gmail.com:587`);
        
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            throw new Error('SMTP credentials missing');
        }

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            tls: {
                rejectUnauthorized: false
            },
            connectionTimeout: 15000,
            greetingTimeout: 15000,
            socketTimeout: 20000,
        });

        const info = await transporter.sendMail({
            from: `"${process.env.EMAIL_FROM_NAME || 'AlloteMe'}" <${process.env.EMAIL_FROM_EMAIL || process.env.EMAIL_USER}>`,
            to: email,
            subject: subject,
            text: message,
            html: html,
        });

        console.log('[Mailer] SMTP Success:', info.messageId);
        return { success: true, method: 'smtp', messageId: info.messageId };
    } catch (smtpError) {
        console.error('[Mailer] SMTP Failed:', smtpError.message);

        // 2. Fallback to EmailJS (REST API) if keys are provided
        if (process.env.EMAILJS_SERVICE_ID && process.env.EMAILJS_TEMPLATE_ID && process.env.EMAILJS_PUBLIC_KEY) {
            try {
                console.log(`[Mailer] EmailJS Fallback Attempt: ${email}`);
                
                const istTime = new Date(Date.now() + 330 * 60000);
                const timeString = istTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

                const data = {
                    service_id: process.env.EMAILJS_SERVICE_ID,
                    template_id: process.env.EMAILJS_TEMPLATE_ID,
                    user_id: process.env.EMAILJS_PUBLIC_KEY,
                    accessToken: process.env.EMAILJS_PRIVATE_KEY,
                    template_params: {
                        email: email, // Matches {{email}}
                        passcode: options.otp || '', // Matches {{passcode}}
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
            }
        }

        // 3. Last Resort: Log to Database for Admin retrieval
        console.warn(`[Mailer] ALL CHANNELS FAILED for ${email}. Check Render logs or DB otps collection.`);
        
        // We throw the error so the controller can handle the 500
        throw new Error(`Email delivery failed across all channels. Last error: ${smtpError.message}`);
    }
};

module.exports = sendEmail;
