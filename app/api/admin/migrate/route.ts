import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

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

        return NextResponse.json({ message: 'Migration successful: platform_settings created, is_blocked added, commission_history ensured' });
    } catch (error: any) {
        console.error('Migration error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
