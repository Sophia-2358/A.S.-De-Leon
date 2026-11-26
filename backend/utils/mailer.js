import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

export async function sendOtpEmail(toEmail, otpCode) {
    await transporter.sendMail({
        from:    `"A.S. De Leon System" <${process.env.EMAIL_USER}>`,
        to:      toEmail,
        subject: 'Your verification code — A.S. De Leon',
        text:    `Your verification code is: ${otpCode}\n\nThis code expires in 10 minutes.`,
        html:    `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 32px; background: #f3f4f8;">
                <div style="background: #fff; border-radius: 8px; padding: 28px 32px; box-shadow: 0 4px 12px rgba(20,30,70,0.10);">
                    <h2 style="color: #162033; font-size: 20px; margin: 0 0 8px;">Verify your email</h2>
                    <p style="color: #44506b; font-size: 13px; margin: 0 0 24px;">
                        Enter this code to complete your registration at A.S. De Leon.
                    </p>
                    <div style="background: #eff2fc; border-radius: 6px; padding: 18px; text-align: center; margin-bottom: 24px;">
                        <span style="font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #2530c0;">${otpCode}</span>
                    </div>
                    <p style="color: #66718c; font-size: 11px; margin: 0;">
                        This code expires in <strong>10 minutes</strong>. If you did not sign up, you can ignore this email.
                    </p>
                </div>
            </div>
        `
    });
}
