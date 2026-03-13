/**
 * Blockchain Monitor for BSC USDT (BEP20) deposits
 * Uses Etherscan API V2 (multichain) to monitor incoming transactions
 * BSCScan was deprecated and replaced by Etherscan V2 with chainid=56 for BSC
 */
import { query, queryOne } from '@/lib/db';
import { sendDepositEmail } from '@/lib/email';

const DEPOSIT_WALLET = '0xED7D925FAab46C08fbbabA6AFbC382C6533c403a';
const USDT_CONTRACT_BSC = '0x55d398326f99059fF775485246999027B3197955'; // USDT BEP20 contract
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';

interface BlockchainTransaction {
    hash: string;
    from: string;
    to: string;
    value: string;
    tokenDecimal: string;
    confirmations: string;
    timeStamp: string;
}

/**
 * Fetch recent USDT BEP20 token transfers to the deposit wallet
 * Uses Etherscan API V2 with chainid=56 (BSC)
 */
async function fetchRecentTransfers(): Promise<BlockchainTransaction[]> {
    const url = `https://api.etherscan.io/v2/api?chainid=56&module=account&action=tokentx&contractaddress=${USDT_CONTRACT_BSC}&address=${DEPOSIT_WALLET}&page=1&offset=50&sort=desc&apikey=${ETHERSCAN_API_KEY}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.status === '1' && data.result) {
            // Filter only incoming transfers (to our wallet)
            return data.result.filter(
                (tx: any) => tx.to.toLowerCase() === DEPOSIT_WALLET.toLowerCase()
            );
        }
        return [];
    } catch (error) {
        console.error('Etherscan API fetch error:', error);
        return [];
    }
}

/**
 * Convert USDT amount to INR using CoinGecko API
 */
async function getUSDTtoINR(): Promise<number> {
    try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=inr');
        const data = await res.json();
        return data?.tether?.inr || 83; // Default 83 INR/USD
    } catch {
        return 83;
    }
}

/**
 * Process new deposits
 * Should be called periodically via cron
 */
export async function processDeposits(): Promise<{ processed: number; skipped: number }> {
    let processed = 0;
    let skipped = 0;

    try {
        const transfers = await fetchRecentTransfers();
        const inrRate = await getUSDTtoINR();

        for (const tx of transfers) {
            // Check minimum confirmations (6 for BSC)
            if (parseInt(tx.confirmations) < 6) {
                skipped++;
                continue;
            }

            // Check if already processed (prevent duplicate credit)
            let alreadyProcessed = false;
            try {
                const existing = await queryOne<any>(
                    'SELECT id FROM processed_deposits WHERE tx_hash = ?',
                    [tx.hash]
                );
                if (existing) {
                    alreadyProcessed = true;
                }
            } catch {
                // Table might not exist, check transactions table
                const existingTx = await queryOne<any>(
                    'SELECT id FROM transactions WHERE tx_hash = ?',
                    [tx.hash]
                );
                if (existingTx) {
                    alreadyProcessed = true;
                }
            }

            if (alreadyProcessed) {
                skipped++;
                continue;
            }

            // Calculate amount (USDT has 18 decimals on BSC)
            const decimals = parseInt(tx.tokenDecimal) || 18;
            const amount = parseFloat(tx.value) / Math.pow(10, decimals);

            if (amount <= 0) {
                skipped++;
                continue;
            }

            const inrAmount = Math.round(amount * inrRate * 100) / 100;

            // Try to find user by matching sender address
            // (Users might have registered with their wallet address)
            let matchedUser = await queryOne<any>(
                'SELECT id, email, wallet_balance FROM users WHERE LOWER(wallet_address) = LOWER(?)',
                [tx.from]
            );

            // Record the deposit
            if (matchedUser) {
                // Update user wallet balance
                await query(
                    'UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?',
                    [amount, matchedUser.id]
                );

                // Create transaction record
                await query(
                    'INSERT INTO transactions (user_id, type, amount, wallet_address, status, tx_hash, notes, network) VALUES (?, "deposit", ?, ?, "completed", ?, ?, "BEP20")',
                    [matchedUser.id, amount, tx.from, tx.hash, `Auto-detected USDT deposit. INR: ₹${inrAmount}`]
                );

                // Send email
                await sendDepositEmail(matchedUser.email, amount.toFixed(2), tx.hash);
            } else {
                // Record as unmatched deposit for admin review
                await query(
                    'INSERT INTO transactions (user_id, type, amount, wallet_address, status, tx_hash, notes, network) VALUES (0, "deposit", ?, ?, "pending", ?, ?, "BEP20")',
                    [amount, tx.from, tx.hash, `Unmatched deposit from ${tx.from}. INR: ₹${inrAmount}`]
                );
            }

            // Mark as processed
            try {
                await query(
                    'INSERT INTO processed_deposits (tx_hash, from_address, amount, user_id) VALUES (?, ?, ?, ?)',
                    [tx.hash, tx.from, amount, matchedUser?.id || null]
                );
            } catch {
                // Table might not exist, that's OK since we check transactions table too
            }

            processed++;
        }
    } catch (error) {
        console.error('Deposit processing error:', error);
    }

    return { processed, skipped };
}
