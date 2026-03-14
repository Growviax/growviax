/**
 * Blockchain Monitor for BSC USDT (BEP20) deposits
 * Uses free BSC RPC endpoint + ethers.js to monitor Transfer events
 * Replaces the old Etherscan API V2 approach (which required a paid plan for BSC)
 */
import { ethers } from 'ethers';
import { query, queryOne } from '@/lib/db';
import { sendDepositEmail } from '@/lib/email';

// ─── Configuration ──────────────────────────────────────────────
const BSC_RPC_URLS = [
    process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/',
    'https://rpc.ankr.com/bsc',
    'https://bsc-dataseed1.defibit.io/',
    'https://bsc-dataseed2.ninicoin.io/',
];

const USDT_CONTRACT = '0x55d398326f99059fF775485246999027B3197955'; // USDT BEP20
const USDT_DECIMALS = 18;

// All deposit wallets the system uses
const DEPOSIT_WALLETS = [
    '0xEE6edC5cb5C07D7A1Eb2ec5EB953d640fE046152',
    '0x3cC8B270a33997a95AdB4511A701dD159734D433',
    '0xEb22c11a8f4A9028f7103CC303b43C4B0e35D476',
    '0x1a7d0e91aaCe0256Baf375C18c333165a49851a8',
    '0xED7D925FAab46C08fbbaba6AFbC382C6533c403a',
].map((a) => a.toLowerCase());

const MIN_CONFIRMATIONS = 15;
const BLOCKS_TO_SCAN = 500; // ~25 minutes on BSC (3s blocks)
const LOG_CHUNK_SIZE = 125;
const MONITOR_COOLDOWN_MS = 20_000;
const MONITOR_FAILURE_COOLDOWN_MS = 120_000;

let activeMonitorRun: Promise<{ processed: number; skipped: number; errors: number }> | null = null;
let lastMonitorRunAt = 0;
let lastMonitorFailureAt = 0;
let lastMonitorFailureMessage: string | null = null;

type ProcessedDepositRow = {
    id: number;
};

type TransactionHashRow = {
    id: number;
};

type DepositRequestMatchRow = {
    request_id: number;
    user_id: number;
    email: string;
};

type UserByWalletRow = {
    id: number;
    email: string;
};

// ERC-20 Transfer event signature
const TRANSFER_EVENT_TOPIC = ethers.id('Transfer(address,address,uint256)');

type RpcLog = {
    transactionHash: string;
    blockNumber: string;
    data: string;
    topics: string[];
};

type RpcErrorShape = {
    code?: number;
    message?: string;
};

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

function isRateLimitError(error: unknown): boolean {
    const message = getErrorMessage(error).toLowerCase();
    return message.includes('rate limit') || message.includes('-32005');
}

async function rpcRequest<T>(url: string, method: string, params: unknown[]): Promise<T> {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            id: Date.now(),
            jsonrpc: '2.0',
            method,
            params,
        }),
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error(`RPC ${method} failed on ${url}: HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (payload?.error) {
        const rpcError = payload.error as RpcErrorShape;
        throw new Error(rpcError.message || `RPC ${method} failed on ${url}`);
    }

    return payload.result as T;
}

// ─── Helper: Get a working RPC block number ─────────────────────
async function getCurrentBlockNumber(): Promise<number> {
    for (const url of BSC_RPC_URLS) {
        try {
            const blockHex = await rpcRequest<string>(url, 'eth_blockNumber', []);
            return parseInt(blockHex, 16);
        } catch (error) {
            console.warn(`[Monitor] Block number failed on ${url}:`, getErrorMessage(error));
        }
    }
    throw new Error('All BSC RPC endpoints failed');
}

async function getTransferLogs(fromBlock: number, toBlock: number): Promise<RpcLog[]> {
    const collectedLogs: RpcLog[] = [];

    for (let chunkStart = fromBlock; chunkStart <= toBlock; chunkStart += LOG_CHUNK_SIZE) {
        const chunkEnd = Math.min(chunkStart + LOG_CHUNK_SIZE - 1, toBlock);
        let chunkLogs: RpcLog[] | null = null;
        let lastError: unknown = null;

        for (const url of BSC_RPC_URLS) {
            try {
                chunkLogs = await rpcRequest<RpcLog[]>(url, 'eth_getLogs', [{
                    address: USDT_CONTRACT,
                    fromBlock: ethers.toBeHex(chunkStart),
                    toBlock: ethers.toBeHex(chunkEnd),
                    topics: [TRANSFER_EVENT_TOPIC],
                }]);

                break;
            } catch (error) {
                lastError = error;
                const label = isRateLimitError(error) ? 'rate-limited' : 'failed';
                console.warn(`[Monitor] Log scan ${label} on ${url} for blocks ${chunkStart}-${chunkEnd}:`, getErrorMessage(error));
            }
        }

        if (!chunkLogs) {
            throw lastError instanceof Error ? lastError : new Error('Failed to fetch transfer logs');
        }

        collectedLogs.push(...chunkLogs);
    }

    return collectedLogs;
}

// ─── Helper: USDT → INR rate ────────────────────────────────────
async function getUSDTtoINR(): Promise<number> {
    try {
        const res = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=inr',
            { next: { revalidate: 300 } } // cache for 5 min
        );
        const data = await res.json();
        return data?.tether?.inr || 83;
    } catch {
        return 83; // fallback
    }
}

// ─── Helper: Check if tx already processed ──────────────────────
async function isAlreadyProcessed(txHash: string): Promise<boolean> {
    try {
        const existing = await queryOne<ProcessedDepositRow>(
            'SELECT id FROM processed_deposits WHERE tx_hash = ?',
            [txHash]
        );
        if (existing) return true;
    } catch {
        // Table might not exist
    }

    const existingTx = await queryOne<TransactionHashRow>(
        'SELECT id FROM transactions WHERE tx_hash = ?',
        [txHash]
    );
    return !!existingTx;
}

// ─── Helper: Match deposit to a user via deposit_requests ───────
async function findUserForDeposit(
    walletAddress: string
): Promise<{ userId: number; email: string; requestId: number } | null> {
    // Find the most recent pending deposit_request for this wallet
    const request = await queryOne<DepositRequestMatchRow>(
        `SELECT dr.id as request_id, dr.user_id, u.email
         FROM deposit_requests dr
         JOIN users u ON u.id = dr.user_id
         WHERE LOWER(dr.wallet_address) = LOWER(?)
           AND dr.status = 'pending'
           AND (dr.expires_at IS NULL OR dr.expires_at > NOW())
         ORDER BY dr.created_at DESC
         LIMIT 1`,
        [walletAddress]
    );

    if (request) {
        return {
            userId: request.user_id,
            email: request.email,
            requestId: request.request_id,
        };
    }

    // Fallback: check if any user has this as their wallet_address in the users table
    const userByWallet = await queryOne<UserByWalletRow>(
        'SELECT id, email FROM users WHERE LOWER(wallet_address) = LOWER(?)',
        [walletAddress]
    );
    if (userByWallet) {
        return { userId: userByWallet.id, email: userByWallet.email, requestId: 0 };
    }

    return null;
}

// ─── Main: Process deposits from BSC RPC ────────────────────────
export async function processDeposits(): Promise<{ processed: number; skipped: number; errors: number }> {
    let processed = 0;
    let skipped = 0;
    let errors = 0;

    try {
        const currentBlock = await getCurrentBlockNumber();
        const fromBlock = currentBlock - BLOCKS_TO_SCAN;
        const inrRate = await getUSDTtoINR();

        console.log(`[Monitor] Scanning blocks ${fromBlock} → ${currentBlock} (${BLOCKS_TO_SCAN} blocks)`);

        // Query Transfer event logs from the USDT contract
        // Filter: topic[0] = Transfer event, topic[2] = any of our deposit wallets
        // We query once for ALL wallets to minimize RPC calls
        const logs = await getTransferLogs(fromBlock, currentBlock);

        console.log(`[Monitor] Found ${logs.length} total USDT Transfer events`);

        // Filter logs where the recipient (topic[2]) is one of our wallets
        const depositLogs = logs.filter((log) => {
            if (!log.topics[2]) return false;
            const toAddress = '0x' + log.topics[2].slice(26); // extract address from 32-byte topic
            return DEPOSIT_WALLETS.includes(toAddress.toLowerCase());
        });

        console.log(`[Monitor] ${depositLogs.length} transfers to our deposit wallets`);

        for (const log of depositLogs) {
            try {
                const txHash = log.transactionHash;

                // 1. Check duplicate
                if (await isAlreadyProcessed(txHash)) {
                    skipped++;
                    continue;
                }

                // 2. Check confirmations
                const logBlockNumber = parseInt(log.blockNumber, 16);
                const confirmations = currentBlock - logBlockNumber;
                if (confirmations < MIN_CONFIRMATIONS) {
                    console.log(`[Monitor] TX ${txHash.slice(0, 16)}... only ${confirmations} confirmations, need ${MIN_CONFIRMATIONS}`);
                    skipped++;
                    continue;
                }

                // 3. Parse amount from log data
                const amount = parseFloat(ethers.formatUnits(log.data, USDT_DECIMALS));
                if (amount <= 0) {
                    skipped++;
                    continue;
                }

                // 4. Extract addresses
                const fromAddress = '0x' + log.topics[1]!.slice(26);
                const toAddress = '0x' + log.topics[2]!.slice(26);
                const inrAmount = Math.round(amount * inrRate * 100) / 100;

                console.log(`[Monitor] Processing: ${amount} USDT from ${fromAddress.slice(0, 10)}... to ${toAddress.slice(0, 10)}... (TX: ${txHash.slice(0, 16)}...)`);

                // 5. Find matching user
                const match = await findUserForDeposit(toAddress);

                if (match) {
                    // Credit user balance (store as INR amount for the system)
                    await query(
                        'UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?',
                        [inrAmount, match.userId]
                    );

                    // Create completed transaction record
                    await query(
                        'INSERT INTO transactions (user_id, type, amount, wallet_address, status, tx_hash, notes, network) VALUES (?, "deposit", ?, ?, "completed", ?, ?, "BEP20")',
                        [match.userId, inrAmount, fromAddress, txHash, `Auto-detected USDT deposit: ${amount.toFixed(4)} USDT ≈ ₹${inrAmount}`]
                    );

                    // Mark deposit_request as completed
                    if (match.requestId > 0) {
                        await query(
                            'UPDATE deposit_requests SET status = "completed", matched_tx_hash = ? WHERE id = ?',
                            [txHash, match.requestId]
                        );
                    }

                    // Send email notification
                    try {
                        await sendDepositEmail(match.email, amount.toFixed(2), txHash);
                    } catch (emailErr) {
                        console.error('[Monitor] Email send failed:', emailErr);
                    }

                    console.log(`[Monitor] ✅ Credited ₹${inrAmount} (${amount} USDT) to user ${match.userId}`);
                } else {
                    // Unmatched deposit — record for admin review
                    await query(
                        'INSERT INTO transactions (user_id, type, amount, wallet_address, status, tx_hash, notes, network) VALUES (0, "deposit", ?, ?, "pending", ?, ?, "BEP20")',
                        [inrAmount, fromAddress, txHash, `Unmatched deposit: ${amount.toFixed(4)} USDT ≈ ₹${inrAmount} from ${fromAddress} to ${toAddress}`]
                    );
                    console.log(`[Monitor] ⚠️ Unmatched deposit ${amount} USDT to ${toAddress.slice(0, 10)}...`);
                }

                // Mark as processed
                try {
                    await query(
                        'INSERT INTO processed_deposits (tx_hash, from_address, amount, user_id) VALUES (?, ?, ?, ?)',
                        [txHash, fromAddress, amount, match?.userId || null]
                    );
                } catch {
                    // Table might not exist, OK since we also check transactions
                }

                processed++;
            } catch (txError) {
                console.error(`[Monitor] Error processing log:`, txError);
                errors++;
            }
        }

        // Expire old deposit requests (older than 24 hours)
        try {
            await query(
                'UPDATE deposit_requests SET status = "expired" WHERE status = "pending" AND expires_at < NOW()',
                []
            );
        } catch {
            // Table might not exist yet
        }
    } catch (error) {
        console.error('[Monitor] Fatal error:', error);
        throw error;
    }

    console.log(`[Monitor] Done: processed=${processed}, skipped=${skipped}, errors=${errors}`);
    return { processed, skipped, errors };
}

export async function triggerDepositMonitor(options?: { force?: boolean }) {
    const force = options?.force ?? false;
    const now = Date.now();

    if (activeMonitorRun) {
        const result = await activeMonitorRun;
        return { ran: true, reusedActiveRun: true, result };
    }

    if (!force && now - lastMonitorRunAt < MONITOR_COOLDOWN_MS) {
        return {
            ran: false,
            reusedActiveRun: false,
            cooldownMsRemaining: Math.max(0, MONITOR_COOLDOWN_MS - (now - lastMonitorRunAt)),
        };
    }

    if (!force && lastMonitorFailureAt > 0 && now - lastMonitorFailureAt < MONITOR_FAILURE_COOLDOWN_MS) {
        return {
            ran: false,
            reusedActiveRun: false,
            cooldownMsRemaining: Math.max(0, MONITOR_FAILURE_COOLDOWN_MS - (now - lastMonitorFailureAt)),
            error: lastMonitorFailureMessage,
        };
    }

    lastMonitorRunAt = now;
    activeMonitorRun = processDeposits()
        .then((result) => {
            lastMonitorFailureAt = 0;
            lastMonitorFailureMessage = null;
            return result;
        })
        .catch((error) => {
            lastMonitorFailureAt = Date.now();
            lastMonitorFailureMessage = getErrorMessage(error);
            throw error;
        })
        .finally(() => {
            activeMonitorRun = null;
            lastMonitorRunAt = Date.now();
        });

    const result = await activeMonitorRun;
    return { ran: true, reusedActiveRun: false, result };
}
