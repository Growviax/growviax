import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || '',
    },
});

const brandedTemplate = (title: string, content: string) => `
<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a1a; color: #fff; padding: 40px; border-radius: 16px;">
  <h2 style="color: #00ff88; text-align: center; margin-bottom: 30px;">GrowViax</h2>
  <h3 style="text-align: center; color: #f0f4f8; margin-bottom: 10px;">${title}</h3>
  ${content}
  <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 30px 0;" />
  <p style="text-align: center; color: #4a5568; font-size: 12px;">This is an automated message from GrowViax. Do not reply.</p>
</div>
`;

export async function sendOTPEmail(email: string, otp: string): Promise<boolean> {
    try {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[DEV] OTP for ${email}: ${otp}`);
        }
        await transporter.sendMail({
            from: `"GrowViax" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your GrowViax Verification Code',
            html: brandedTemplate('Verification Code', `
                <p style="text-align: center; color: #94a3b8;">Your verification code is:</p>
                <div style="text-align: center; font-size: 32px; letter-spacing: 8px; color: #00ff88; padding: 20px; background: rgba(0,255,136,0.1); border-radius: 12px; margin: 20px 0;">
                    ${otp}
                </div>
                <p style="text-align: center; color: #64748b; font-size: 14px;">This code expires in 10 minutes. Do not share it with anyone.</p>
            `),
        });
        return true;
    } catch (error) {
        console.error('Failed to send OTP email:', error);
        return false;
    }
}

export async function sendDepositEmail(email: string, amount: string, txHash: string): Promise<boolean> {
    try {
        await transporter.sendMail({
            from: `"GrowViax" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Deposit Successful – Wallet Updated',
            html: brandedTemplate('Deposit Successful', `
                <div style="background: rgba(0,255,136,0.1); border-radius: 12px; padding: 20px; margin: 20px 0;">
                    <p style="color: #94a3b8; font-size: 14px; margin-bottom: 8px;">Amount Deposited</p>
                    <p style="color: #00ff88; font-size: 28px; font-weight: bold; margin: 0;">$${amount} USDT</p>
                </div>
                <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin: 16px 0;">
                    <p style="color: #64748b; font-size: 12px; margin-bottom: 4px;">Transaction Hash</p>
                    <p style="color: #94a3b8; font-size: 13px; word-break: break-all; font-family: monospace; margin: 0;">${txHash}</p>
                </div>
                <p style="color: #94a3b8; font-size: 14px; text-align: center;">Your wallet balance has been updated automatically.</p>
            `),
        });
        return true;
    } catch (error) {
        console.error('Failed to send deposit email:', error);
        return false;
    }
}

// ─── Deposit Request Notification (to admin) ─────────────────────
type DepositRequestEmailData = {
    username: string;
    email: string;
    amount: string;
    depositType: 'usdt' | 'upi';
    walletAddress?: string;
    txHash?: string;
    upiId?: string;
    utrNumber?: string;
    time: string;
};

const ADMIN_EMAIL = 'growviax60@gmail.com';
// const ADMIN_EMAIL = 'abhishek@piana.in';

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function sendDepositRequestEmail(data: DepositRequestEmailData): Promise<boolean> {
    try {
        const isUsdt = data.depositType === 'usdt';
        const verifyUrl = isUsdt && data.txHash
            ? `https://bscscan.com/tx/${data.txHash}`
            : null;
        const adminUrl = `${APP_BASE_URL}/admin`;

        const detailsHtml = isUsdt
            ? `
                <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin: 16px 0;">
                    <p style="color: #64748b; font-size: 12px; margin-bottom: 4px;">Wallet Address</p>
                    <p style="color: #94a3b8; font-size: 13px; font-family: monospace; margin: 0; word-break: break-all;">${data.walletAddress || 'N/A'}</p>
                </div>
                <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin: 16px 0;">
                    <p style="color: #64748b; font-size: 12px; margin-bottom: 4px;">Transaction Hash</p>
                    <p style="color: #94a3b8; font-size: 13px; font-family: monospace; margin: 0; word-break: break-all;">${data.txHash || 'N/A'}</p>
                </div>
            `
            : `
                <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin: 16px 0;">
                    <p style="color: #64748b; font-size: 12px; margin-bottom: 4px;">UPI ID Used</p>
                    <p style="color: #94a3b8; font-size: 13px; font-family: monospace; margin: 0;">${data.upiId || 'N/A'}</p>
                </div>
                <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin: 16px 0;">
                    <p style="color: #64748b; font-size: 12px; margin-bottom: 4px;">UTR Number</p>
                    <p style="color: #94a3b8; font-size: 13px; font-family: monospace; margin: 0;">${data.utrNumber || 'N/A'}</p>
                </div>
            `;

        const buttonsHtml = `
            <div style="text-align: center; margin: 24px 0;">
                <a href="${adminUrl}" style="display: inline-block; background: linear-gradient(135deg, #00ff88, #00cc6a); color: #060612; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; margin: 4px;">
                    Open Admin Panel
                </a>
                ${verifyUrl ? `
                <a href="${verifyUrl}" style="display: inline-block; background: rgba(0,212,255,0.15); color: #00d4ff; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; margin: 4px; border: 1px solid rgba(0,212,255,0.3);">
                    Verify Transaction
                </a>` : ''}
            </div>
        `;

        await transporter.sendMail({
            from: `"GrowViax" <${process.env.EMAIL_USER}>`,
            to: ADMIN_EMAIL,
            subject: `New ${isUsdt ? 'USDT' : 'UPI'} Deposit Request - ${data.username}`,
            html: brandedTemplate(`New ${isUsdt ? 'USDT' : 'UPI'} Deposit Request`, `
                <div style="background: rgba(0,255,136,0.1); border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                    <p style="color: #94a3b8; font-size: 14px; margin-bottom: 8px;">Amount</p>
                    <p style="color: #00ff88; font-size: 28px; font-weight: bold; margin: 0;">${isUsdt ? '$' : '₹'}${data.amount}</p>
                </div>
                <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin: 16px 0;">
                    <p style="color: #64748b; font-size: 12px; margin-bottom: 4px;">Username</p>
                    <p style="color: #f0f4f8; font-size: 14px; font-weight: 600; margin: 0;">${data.username}</p>
                </div>
                <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin: 16px 0;">
                    <p style="color: #64748b; font-size: 12px; margin-bottom: 4px;">Email</p>
                    <p style="color: #94a3b8; font-size: 13px; margin: 0;">${data.email}</p>
                </div>
                ${detailsHtml}
                <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin: 16px 0;">
                    <p style="color: #64748b; font-size: 12px; margin-bottom: 4px;">Time</p>
                    <p style="color: #94a3b8; font-size: 13px; margin: 0;">${new Date(data.time).toLocaleString()}</p>
                </div>
                ${buttonsHtml}
            `),
        });
        return true;
    } catch (error) {
        console.error('Failed to send deposit request email:', error);
        return false;
    }
}

export async function sendWithdrawalApprovedEmail(email: string, amount: string): Promise<boolean> {
    try {
        await transporter.sendMail({
            from: `"GrowViax" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Withdrawal Approved – GrowViax',
            html: brandedTemplate('Withdrawal Approved ✅', `
                <div style="background: rgba(0,255,136,0.1); border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                    <p style="color: #94a3b8; font-size: 14px; margin-bottom: 8px;">Approved Amount</p>
                    <p style="color: #00ff88; font-size: 28px; font-weight: bold; margin: 0;">$${amount} USDT</p>
                </div>
                <p style="color: #94a3b8; font-size: 14px; text-align: center;">Your withdrawal has been approved and the transfer is being processed. You will receive the funds shortly.</p>
            `),
        });
        return true;
    } catch (error) {
        console.error('Failed to send withdrawal approved email:', error);
        return false;
    }
}

export async function sendWithdrawalRejectedEmail(email: string, amount: string, reason: string): Promise<boolean> {
    try {
        await transporter.sendMail({
            from: `"GrowViax" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Withdrawal Rejected – GrowViax',
            html: brandedTemplate('Withdrawal Rejected ❌', `
                <div style="background: rgba(255,68,102,0.1); border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                    <p style="color: #94a3b8; font-size: 14px; margin-bottom: 8px;">Rejected Amount</p>
                    <p style="color: #ff4466; font-size: 28px; font-weight: bold; margin: 0;">$${amount} USDT</p>
                </div>
                <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin: 16px 0;">
                    <p style="color: #64748b; font-size: 12px; margin-bottom: 4px;">Reason</p>
                    <p style="color: #ff4466; font-size: 14px; margin: 0;">${reason || 'No reason provided'}</p>
                </div>
                <p style="color: #94a3b8; font-size: 14px; text-align: center;">The amount has been refunded to your wallet. If you have questions, please contact support.</p>
            `),
        });
        return true;
    } catch (error) {
        console.error('Failed to send withdrawal rejected email:', error);
        return false;
    }
}
