import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const name = formData.get('name') as string || 'Unknown Employee';
        const email = formData.get('email') as string || 'unknown@example.com';
        const latitude = formData.get('latitude') as string || 'Unknown';
        const longitude = formData.get('longitude') as string || 'Unknown';

        if (!file) {
            return NextResponse.json({ error: 'No video/audio file provided' }, { status: 400 });
        }

        // Convert the File object to a Buffer for Nodemailer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Configure Nodemailer Transport
        let transporter;
        let isTestAccount = false;

        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            // Use real SMTP credentials if provided in .env.local (e.g., Gmail App Password)
            transporter = nodemailer.createTransport({
                service: 'gmail', // Standard configuration for Gmail
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
        } else {
            // Fallback: Create a fake Ethereal account for testing so the app doesn't crash
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: "smtp.ethereal.email",
                port: 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
            isTestAccount = true;
            console.log('\n[MAIL] ⚠️ No SMTP credentials found in .env.local. Using Ethereal Test Account.');
        }

        const mapLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const timestamp = new Date().toLocaleString();

        // Send Email
        const info = await transporter.sendMail({
            from: `"HearHer Safety System" <${process.env.SMTP_USER || 'noreply@hearher.com'}>`,
            to: "hr@acmecorp.in", // Replace with intended HR email, or keep dummy for test
            subject: `🚨 URGENT: SOS Audio/Video Evidence from ${name}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #ef4444; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
                        <h2 style="margin: 0; font-size: 24px;">🚨 URGENT: SOS PANIC RECORDING</h2>
                    </div>
                    <div style="padding: 20px; background-color: #fef2f2;">
                        <p style="font-size: 16px; margin-bottom: 20px;">
                            <strong>${name}</strong> (${email}) has just resolved a panic alert. 
                            The system successfully captured audio and video during the incident.
                        </p>
                        
                        <div style="background-color: white; padding: 15px; border-radius: 6px; border: 1px solid #fee2e2; margin-bottom: 20px;">
                            <h3 style="margin-top: 0; color: #b91c1c; font-size: 14px; text-transform: uppercase;">Incident Details</h3>
                            <ul style="list-style: none; padding: 0; margin: 0;">
                                <li style="margin-bottom: 8px;"><strong>Time captured:</strong> ${timestamp}</li>
                                <li style="margin-bottom: 8px;"><strong>Location:</strong> ${latitude}, ${longitude}</li>
                            </ul>
                            
                            <a href="${mapLink}" style="display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 10px 16px; border-radius: 6px; font-weight: bold; margin-top: 10px;">
                                📍 View Location on Google Maps
                            </a>
                        </div>
                        
                        <p style="font-size: 14px; color: #4b5563;">
                            <strong>Note:</strong> The recorded audio/video evidence is attached to this email as <code>${file.name}</code>. Please download and review it immediately.
                        </p>
                    </div>
                </div>
            `,
            attachments: [
                {
                    filename: file.name || 'panic-evidence.webm',
                    content: buffer,
                    contentType: file.type || 'video/webm',
                },
            ],
        });

        console.log(`[MAIL] ✅ SOS Evidence Email sent. Message ID: ${info.messageId}`);

        let previewUrl = null;
        if (isTestAccount) {
            previewUrl = nodemailer.getTestMessageUrl(info);
            console.log(`[MAIL] 📬 Ethereal Preview URL: ${previewUrl}`);
        }

        return NextResponse.json({
            success: true,
            messageId: info.messageId,
            previewUrl
        });

    } catch (error: any) {
        console.error('[MAIL] ❌ Failed to send SOS evidence email:', error);
        return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
    }
}
