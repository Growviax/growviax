import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { hashPassword, generateWalletAddress, generateReferralCode } from '@/lib/auth';

// Run this to add platform_settings table, is_blocked column, and update ENUM
export async function GET() {
    try {
        // Update transactions type ENUM
        await query(
            `ALTER TABLE transactions MODIFY COLUMN type ENUM('deposit', 'withdrawal', 'bid_win', 'bid_loss', 'referral_bonus', 'trading_fee', 'commission') NOT NULL`
        );

        // Add is_blocked to users
        try {
            await query(`ALTER TABLE users ADD COLUMN is_blocked TINYINT(1) DEFAULT 0`);
        } catch (e: any) {
            if (!e.message?.includes('Duplicate column')) throw e;
        }

        // Add network column to transactions (for withdrawal)
        try {
            await query(`ALTER TABLE transactions ADD COLUMN network VARCHAR(50) DEFAULT 'BEP20'`);
        } catch (e: any) {
            if (!e.message?.includes('Duplicate column')) throw e;
        }

        // Create platform_settings table
        await query(`
            CREATE TABLE IF NOT EXISTS platform_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(100) UNIQUE NOT NULL,
                setting_value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Insert default settings (ignore if already exist)
        const defaults = [
            ['trade_mode', 'auto'],
            ['manual_winner', ''],
            ['consecutive_up_wins', '0'],
            ['consecutive_down_wins', '0'],
        ];

        for (const [key, value] of defaults) {
            try {
                await query(
                    `INSERT INTO platform_settings (setting_key, setting_value) VALUES (?, ?)`,
                    [key, value]
                );
            } catch (e: any) {
                // Ignore duplicates
                if (!e.message?.includes('Duplicate entry')) throw e;
            }
        }

        // Create commission_history table if not exists
        await query(`
            CREATE TABLE IF NOT EXISTS commission_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                from_user_id INT NOT NULL,
                level INT NOT NULL,
                trade_amount DECIMAL(18, 8) NOT NULL,
                commission_rate DECIMAL(10, 8) NOT NULL,
                commission_amount DECIMAL(18, 8) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user (user_id)
            )
        `);

        // Ensure admin account exists (growviax60@gmail.com)
        const adminEmail = 'growviax60@gmail.com';
        const existingAdmin = await queryOne<any>('SELECT id FROM users WHERE email = ?', [adminEmail]);
        if (!existingAdmin) {
            const adminPasswordHash = await hashPassword('12345678');
            const adminWallet = generateWalletAddress();
            const adminReferral = generateReferralCode();
            await query(
                'INSERT INTO users (name, email, phone, password_hash, wallet_address, referral_code, role, is_verified) VALUES (?, ?, ?, ?, ?, ?, "admin", 1)',
                ['Admin', adminEmail, '0000000000', adminPasswordHash, adminWallet, adminReferral]
            );
        } else {
            // Ensure existing account has admin role
            await query('UPDATE users SET role = "admin" WHERE email = ?', [adminEmail]);
        }

        return NextResponse.json({ message: 'Migration successful: platform_settings created, is_blocked added, commission_history ensured, admin account ensured' });
    } catch (error: any) {
        console.error('Migration error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
