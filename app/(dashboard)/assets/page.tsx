'use client';

import { useEffect, useState, useCallback, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ClipboardDocumentIcon, ArrowDownTrayIcon, ArrowUpTrayIcon,
    WalletIcon, BanknotesIcon, CheckCircleIcon, ClockIcon, XCircleIcon,
    ExclamationTriangleIcon, PhotoIcon, ArrowPathIcon,
    ChevronLeftIcon, ChevronRightIcon, BoltIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import dayjs from 'dayjs';

const WALLETS = [
    { qr: '/img/qr1.jpeg', address: '0xEE6edC5cb5C07D7A1Eb2ec5EB953d640fE046152' },
    { qr: '/img/qr2.jpeg', address: '0x3cC8B270a33997a95AdB4511A701dD159734D433' },
    { qr: '/img/qr3.jpeg', address: '0xEb22c11a8f4A9028f7103CC303b43C4B0e35D476' },
    { qr: '/img/qr4.jpeg', address: '0x1a7d0e91aaCe0256Baf375C18c333165a49851a8' },
    { qr: '/img/qr5.jpeg', address: '0xED7D925FAab46C08fbbaba6AFbC382C6533c403a' },
];
const MIN_AMOUNT = 1000; // ₹1,000 minimum
const ITEMS_PER_PAGE = 10;

type WalletInfo = {
    wallet_balance: number | string;
    total_deposited?: number;
    total_traded?: number;
};

type WalletTransaction = {
    id: number;
    type: string;
    status: string;
    amount: number | string;
    wallet_address?: string | null;
    tx_hash?: string | null;
    notes?: string | null;
    created_at: string;
};

type DepositRequest = {
    id: number;
    wallet_address: string;
    qr?: string;
    status: 'pending' | 'completed' | 'expired';
    matched_tx_hash?: string | null;
    created_at?: string;
    expires_at?: string | null;
};

const getApiErrorMessage = (error: unknown, fallback: string) => (
    axios.isAxiosError(error) ? error.response?.data?.error || fallback : fallback
);

function AssetsContent() {
    const searchParams = useSearchParams();
    const initialTab = searchParams.get('tab') || 'deposit';

    const [tab, setTab] = useState(initialTab);
    const [user, setUser] = useState<WalletInfo | null>(null);
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    /* Withdraw state */
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawAddress, setWithdrawAddress] = useState('');
    const [withdrawQrFile, setWithdrawQrFile] = useState<File | null>(null);
    const [withdrawQrPreview, setWithdrawQrPreview] = useState<string | null>(null);
    const [withdrawing, setWithdrawing] = useState(false);
    const [withdrawSuccess, setWithdrawSuccess] = useState(false);
    const qrInputRef = useRef<HTMLInputElement>(null);

    /* Deposit generate state */
    const [depositGenerated, setDepositGenerated] = useState(false);
    const [selectedWallet, setSelectedWallet] = useState(WALLETS[0]);
    const [depositGenerating, setDepositGenerating] = useState(false);
    const [depositRequest, setDepositRequest] = useState<DepositRequest | null>(null);
    const completedDepositRef = useRef<string | null>(null);

    /* History state */
    const [historyTab, setHistoryTab] = useState<'deposit' | 'withdrawal'>('deposit');
    const [historyPage, setHistoryPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const fetchData = useCallback(async () => {
        try {
            const [userRes, txRes] = await Promise.all([
                axios.get('/api/user'),
                axios.get('/api/wallet/transactions', {
                    params: { page: 1, limit: 100 },
                }),
            ]);
            setUser(userRes.data.user);
            setTransactions(txRes.data.transactions || []);
        } catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const syncDepositStatus = useCallback(async () => {
        try {
            const res = await axios.get('/api/wallet/deposit/status');
            const request = res.data.depositRequest;
            const latestDeposit = res.data.latestDeposit;

            setDepositRequest(request || null);

            if (request?.wallet_address) {
                const matched = WALLETS.find((w) => w.address.toLowerCase() === request.wallet_address.toLowerCase());
                setSelectedWallet(matched || { address: request.wallet_address, qr: request.qr || '/img/qr1.jpeg' });
                setDepositGenerated(request.status === 'pending' || request.status === 'completed');
            } else {
                setDepositGenerated(false);
            }

            const matchedHash = request?.matched_tx_hash || latestDeposit?.tx_hash || null;
            if (request?.status === 'completed' && matchedHash && completedDepositRef.current !== matchedHash) {
                completedDepositRef.current = matchedHash;
                toast.success('Deposit verified and wallet credited automatically');
                fetchData();
            }
        } catch {}
    }, [fetchData]);

    useEffect(() => {
        syncDepositStatus();
    }, [syncDepositStatus]);

    useEffect(() => {
        if (tab !== 'deposit' || depositRequest?.status !== 'pending') {
            return;
        }

        const interval = window.setInterval(() => {
            syncDepositStatus();
        }, 20000);

        return () => window.clearInterval(interval);
    }, [tab, depositRequest?.status, syncDepositStatus]);

    /* ── Copy deposit address ──────────────────────── */
    const copyAddress = () => {
        navigator.clipboard.writeText(selectedWallet.address);
        toast.success('Address copied successfully');
    };

    /* ── Generate Deposit Info (server-side) ───────── */
    const handleGenerateDeposit = async () => {
        setDepositGenerating(true);
        try {
            const res = await axios.post('/api/wallet/deposit');
            const { wallet_address, qr, request_id } = res.data;
            // Find matching local wallet or build one
            const matched = WALLETS.find((w) => w.address.toLowerCase() === wallet_address.toLowerCase());
            setSelectedWallet(matched || { address: wallet_address, qr: qr || '/img/qr1.jpeg' });
            setDepositGenerated(true);
            setDepositRequest({
                id: request_id,
                wallet_address,
                qr: qr || '/img/qr1.jpeg',
                status: 'pending',
            });
            syncDepositStatus();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Failed to generate deposit info'));
        } finally {
            setDepositGenerating(false);
        }
    };


    const handleQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Please upload a valid image file');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image must be under 5MB');
                return;
            }
            setWithdrawQrFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setWithdrawQrPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    /* ── Handle Withdrawal ─────────────────────────── */
    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(withdrawAmount);
        if (!amt || amt <= 0) return toast.error('Enter a valid amount');
        if (amt < MIN_AMOUNT) return toast.error(`Minimum withdrawal is ₹${MIN_AMOUNT.toLocaleString()}`);
        if (amt > Number(user?.wallet_balance || 0)) return toast.error('Insufficient balance');
        if (!withdrawAddress.trim()) return toast.error('Wallet address is required');
        if (!/^0x[a-fA-F0-9]{40}$/.test(withdrawAddress.trim())) return toast.error('Invalid wallet address format (must be 0x...)');
        if (!withdrawQrFile) return toast.error('Please upload your wallet QR code');

        setWithdrawing(true);
        try {
            // Convert QR to base64
            const reader = new FileReader();
            const qrBase64 = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(withdrawQrFile);
            });

            await axios.post('/api/wallet/withdraw', {
                amount: amt,
                walletAddress: withdrawAddress.trim(),
                qrImage: qrBase64,
            });

            setWithdrawSuccess(true);
            setWithdrawAmount('');
            setWithdrawAddress('');
            setWithdrawQrFile(null);
            setWithdrawQrPreview(null);
            fetchData();

            // Reset success after 5 seconds
            setTimeout(() => setWithdrawSuccess(false), 5000);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Withdrawal failed'));
        } finally { setWithdrawing(false); }
    };

    /* ── History filtering ─────────────────────────── */
    const filteredTransactions = transactions.filter((t) => {
        const typeMatch = historyTab === 'deposit'
            ? ['deposit', 'bid_win', 'referral_bonus'].includes(t.type)
            : ['withdrawal', 'bid_loss'].includes(t.type);
        const statusMatch = statusFilter === 'all' || t.status === statusFilter;
        return typeMatch && statusMatch;
    });

    const totalHistoryPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
    const paginatedTx = filteredTransactions.slice(
        (historyPage - 1) * ITEMS_PER_PAGE,
        historyPage * ITEMS_PER_PAGE
    );

    const statusIcon = (status: string) => {
        if (status === 'completed') return <CheckCircleIcon className="w-4 h-4 text-neon-green" />;
        if (status === 'pending') return <ClockIcon className="w-4 h-4 text-warning" />;
        return <XCircleIcon className="w-4 h-4 text-neon-red" />;
    };

    const statusBadge = (status: string) => {
        if (status === 'completed') return <span className="badge-success">Approved</span>;
        if (status === 'pending') return <span className="badge-warning">Pending</span>;
        return <span className="badge-danger">Rejected</span>;
    };

    if (loading) return (
        <div className="space-y-4">
            <div className="skeleton h-12 w-32" />
            <div className="skeleton h-44 w-full" />
            <div className="skeleton h-12 w-full" />
            <div className="skeleton h-64 w-full" />
        </div>
    );

    const tabs = ['deposit', 'withdraw', 'history'] as const;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight">Assets</h1>
                    <p className="text-xs text-text-muted mt-1">Manage your wallet</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-neon-cyan/10 flex items-center justify-center">
                    <WalletIcon className="w-5 h-5 text-neon-cyan" />
                </div>
            </div>

            {/* Balance Card */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl border border-glass-border"
                style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.06) 0%, rgba(0,255,136,0.04) 50%, rgba(168,85,247,0.03) 100%)' }}
            >
                <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-neon-cyan/8 blur-3xl" />
                <div className="relative p-6">
                    <p className="text-text-secondary text-sm font-medium mb-2">Available Balance</p>
                    <p className="stat-value neon-text mb-1">₹{Number(user?.wallet_balance || 0).toFixed(2)}</p>
                    <span className="badge-info mt-1">INR</span>
                </div>
            </motion.div>

            {/* Tabs */}
            <div className="flex gap-1.5 p-1.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                {tabs.map((t) => (
                    <button key={t} onClick={() => setTab(t)}
                        className={clsx(
                            'flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-300 capitalize',
                            tab === t ? 'bg-neon-green/12 text-neon-green shadow-sm' : 'text-text-muted hover:text-text-secondary'
                        )}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* ═══════════ DEPOSIT TAB ═══════════ */}
            {tab === 'deposit' && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                    <div className="glass-card flex flex-col items-center">
                        {/* Title */}
                        <div className="flex items-center gap-2 mb-5">
                            <ArrowDownTrayIcon className="w-5 h-5 text-neon-cyan" />
                            <p className="text-sm text-text-secondary font-semibold">Deposit USDT (BEP20)</p>
                        </div>

                        <AnimatePresence mode="wait">
                            {!depositGenerated ? (
                                <motion.div
                                    key="generate"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="w-full flex flex-col items-center py-8"
                                >
                                    {depositGenerating ? (
                                        /* Generating animation */
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="relative w-24 h-24">
                                                <div className="absolute inset-0 rounded-2xl border-4 border-neon-cyan/20 animate-pulse" />
                                                <div className="absolute inset-2 rounded-xl border-2 border-dashed border-neon-cyan/40 animate-spin" style={{ animationDuration: '3s' }} />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <ArrowPathIcon className="w-8 h-8 text-neon-cyan animate-spin" />
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-semibold text-text-primary">Generating Deposit Info...</p>
                                                <p className="text-[11px] text-text-muted mt-1">Preparing your QR code and wallet address</p>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {[0, 1, 2].map((i) => (
                                                    <motion.div
                                                        key={i}
                                                        className="w-2 h-2 rounded-full bg-neon-cyan"
                                                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                                                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        /* Generate button */
                                        <div className="flex flex-col items-center gap-5">
                                            <div className="w-28 h-28 rounded-3xl bg-glass border-2 border-dashed border-glass-border flex items-center justify-center">
                                                <ArrowDownTrayIcon className="w-12 h-12 text-text-muted" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-semibold text-text-primary mb-1">Ready to Deposit?</p>
                                                <p className="text-[11px] text-text-muted">Click below to generate your unique deposit QR code and wallet address</p>
                                            </div>
                                            <button
                                                onClick={handleGenerateDeposit}
                                                disabled={depositGenerating}
                                                className="btn-glow px-10 py-3.5 text-sm font-bold flex items-center gap-2"
                                            >
                                                <BoltIcon className="w-4 h-4" />
                                                Generate Deposit Info
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="info"
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className="w-full flex flex-col items-center overflow-hidden"
                                >
                                    {/* QR Code Card */}
                                    <div className="relative p-5 bg-white rounded-2xl mb-5 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
                                        <Image
                                            src={selectedWallet.qr}
                                            alt="Deposit QR Code – USDT BEP20"
                                            width={200}
                                            height={200}
                                            className="rounded-xl"
                                            priority
                                        />
                                    </div>

                                    {/* Network Badge */}
                                    <div className="flex items-center gap-2 mb-5">
                                        <span className="badge-info">Network: BEP20 (BSC)</span>
                                    </div>

                                    {/* Wallet Address */}
                                    <div className="w-full glass-card-flat">
                                        <p className="text-[11px] text-text-muted uppercase tracking-wider font-medium mb-2">Wallet Address</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 inner-card px-3 py-2.5 overflow-hidden">
                                                <code className="text-xs font-mono text-text-secondary block truncate select-all">
                                                    {selectedWallet.address}
                                                </code>
                                            </div>
                                            <button
                                                onClick={copyAddress}
                                                className="btn-ghost p-3 shrink-0 hover:bg-neon-green/10 hover:text-neon-green transition-all"
                                                title="Copy address"
                                            >
                                                <ClipboardDocumentIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Warning */}
                                    <div className="w-full mt-4 p-4 rounded-2xl border border-neon-orange/20 bg-neon-orange/5">
                                        <div className="flex items-start gap-3">
                                            <ExclamationTriangleIcon className="w-5 h-5 text-neon-orange shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-bold text-neon-orange mb-1">Important Warning</p>
                                                <p className="text-[11px] text-text-secondary leading-relaxed">
                                                    Send only <span className="text-neon-orange font-semibold">USDT (BEP20)</span> to this address.
                                                    Sending any other asset may result in <span className="text-neon-red font-semibold">permanent loss</span>.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Deposit Instructions */}
                                    <div className="w-full mt-5 p-4 rounded-2xl border border-warning/20 bg-warning/5">
                                        <h3 className="text-sm font-bold text-warning mb-3">Deposit Instructions</h3>
                                        <ul className="space-y-2 text-[12px] text-text-secondary">
                                            <li className="flex items-start gap-2"><span className="text-warning">•</span> Deposit timing is <span className="text-warning font-semibold">24/7</span>.</li>
                                            <li className="flex items-start gap-2"><span className="text-warning">•</span> The minimum deposit amount is <span className="text-warning font-semibold">₹1,000</span> (≈$10 USDT).</li>
                                            <li className="flex items-start gap-2"><span className="text-warning">•</span> Send only <span className="text-neon-orange font-semibold">USDT (BEP20)</span> to the address above.</li>
                                            <li className="flex items-start gap-2"><span className="text-warning">•</span> Deposits are credited after <span className="text-warning font-semibold">network confirmation</span>.</li>
                                            <li className="flex items-start gap-2"><span className="text-warning">•</span> If you have any issues, please contact our <span className="text-warning font-semibold">support team</span>.</li>
                                        </ul>
                                    </div>

                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}

            {/* ═══════════ WITHDRAW TAB ═══════════ */}
            {tab === 'withdraw' && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <AnimatePresence mode="wait">
                        {withdrawSuccess ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="glass-card text-center py-12"
                            >
                                <div className="w-16 h-16 rounded-full bg-neon-green/15 flex items-center justify-center mx-auto mb-5">
                                    <CheckCircleIcon className="w-9 h-9 text-neon-green" />
                                </div>
                                <h3 className="text-lg font-bold text-neon-green mb-2">Withdrawal Submitted</h3>
                                <p className="text-sm text-text-secondary max-w-sm mx-auto">
                                    Your withdrawal will be transferred within <span className="text-text-primary font-semibold">3 working days</span>.
                                    Admin approval is required before processing.
                                </p>
                                <button
                                    onClick={() => setWithdrawSuccess(false)}
                                    className="btn-ghost mt-6 text-sm"
                                >
                                    Submit Another
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <form onSubmit={handleWithdraw} className="glass-card space-y-5">
                                    <div className="flex items-center gap-2 mb-1">
                                        <ArrowUpTrayIcon className="w-5 h-5 text-neon-cyan" />
                                        <p className="text-sm font-semibold text-text-secondary">Withdraw USDT</p>
                                    </div>

                                    {/* Amount */}
                                    <div>
                                        <label className="form-label flex items-center gap-2">
                                            <BanknotesIcon className="w-4 h-4 text-text-muted" /> Amount (USDT)
                                        </label>
                                        <input
                                            type="number"
                                            value={withdrawAmount}
                                            onChange={(e) => setWithdrawAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="glass-input text-lg font-semibold"
                                            step="0.01"
                                            min="0"
                                        />
                                        <div className="flex items-center justify-between mt-2">
                                            <p className="text-xs text-text-muted flex items-center gap-1">
                                                Available: <span className="text-neon-green font-medium">₹{Number(user?.wallet_balance || 0).toFixed(2)}</span>
                                            </p>
                                            <p className="text-xs text-text-muted">Fee: <span className="text-neon-green font-medium">₹0.00</span></p>
                                        </div>
                                        {/* Quick amount buttons */}
                                        <div className="flex gap-1.5 mt-2.5">
                                            {[25, 50, 75, 100].map((pct) => {
                                                const bal = Number(user?.wallet_balance || 0);
                                                const val = (bal * pct / 100).toFixed(2);
                                                return (
                                                    <button
                                                        key={pct}
                                                        type="button"
                                                        onClick={() => setWithdrawAmount(val)}
                                                        className={clsx(
                                                            'flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 border',
                                                            withdrawAmount === val
                                                                ? 'bg-neon-green/12 text-neon-green border-neon-green/20'
                                                                : 'bg-glass text-text-muted border-transparent hover:text-text-secondary hover:border-glass-border'
                                                        )}
                                                    >
                                                        {pct}%
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Wallet Address */}
                                    <div>
                                        <label className="form-label flex items-center gap-2">
                                            <WalletIcon className="w-4 h-4 text-text-muted" /> Wallet Address (BSC) <span className="text-neon-red">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={withdrawAddress}
                                            onChange={(e) => setWithdrawAddress(e.target.value)}
                                            placeholder="0x..."
                                            className="glass-input font-mono text-sm"
                                            required
                                        />
                                    </div>

                                    {/* QR Code Upload */}
                                    <div>
                                        <label className="form-label flex items-center gap-2">
                                            <PhotoIcon className="w-4 h-4 text-text-muted" /> Upload Wallet QR Code <span className="text-neon-red">*</span>
                                        </label>
                                        <input
                                            ref={qrInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleQrChange}
                                            className="hidden"
                                        />
                                        {withdrawQrPreview ? (
                                            <div className="relative w-full rounded-2xl border border-glass-border overflow-hidden bg-glass">
                                                <div className="flex items-center justify-center p-4">
                                                    <Image
                                                        src={withdrawQrPreview}
                                                        alt="Wallet QR"
                                                        width={160}
                                                        height={160}
                                                        className="rounded-xl object-contain"
                                                    />
                                                </div>
                                                <div className="border-t border-glass-border flex">
                                                    <button
                                                        type="button"
                                                        onClick={() => qrInputRef.current?.click()}
                                                        className="flex-1 py-2.5 text-xs font-semibold text-neon-cyan hover:bg-neon-cyan/5 transition-colors flex items-center justify-center gap-1.5"
                                                    >
                                                        <ArrowPathIcon className="w-3.5 h-3.5" /> Change
                                                    </button>
                                                    <div className="w-px bg-glass-border" />
                                                    <button
                                                        type="button"
                                                        onClick={() => { setWithdrawQrFile(null); setWithdrawQrPreview(null); }}
                                                        className="flex-1 py-2.5 text-xs font-semibold text-neon-red hover:bg-neon-red/5 transition-colors flex items-center justify-center gap-1.5"
                                                    >
                                                        <XCircleIcon className="w-3.5 h-3.5" /> Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => qrInputRef.current?.click()}
                                                className="w-full py-8 rounded-2xl border-2 border-dashed border-glass-border hover:border-neon-cyan/30 hover:bg-neon-cyan/3 transition-all flex flex-col items-center gap-2"
                                            >
                                                <PhotoIcon className="w-8 h-8 text-text-muted" />
                                                <p className="text-sm text-text-muted font-medium">Click to upload QR code</p>
                                                <p className="text-[11px] text-text-muted">PNG, JPG up to 5MB</p>
                                            </button>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={withdrawing}
                                        className="btn-glow w-full flex items-center justify-center gap-2"
                                    >
                                        {withdrawing ? (
                                            <>
                                                <ArrowPathIcon className="w-4 h-4 animate-spin" /> Processing...
                                            </>
                                        ) : (
                                            'Confirm Withdrawal'
                                        )}
                                    </button>

                                    {/* Info note */}
                                    <p className="text-[11px] text-text-muted text-center leading-relaxed">
                                        Withdrawals require admin approval and will be processed within 24 hrs. No withdrawal fee.
                                    </p>
                                </form>

                                {/* Withdrawal Instructions */}
                                <div className="mt-5 p-4 rounded-2xl border border-warning/20 bg-warning/5">
                                    <h3 className="text-sm font-bold text-warning mb-3">Withdrawal Instructions</h3>
                                    <ul className="space-y-2 text-[12px] text-text-secondary">
                                        <li className="flex items-start gap-2"><span className="text-warning">•</span> Need to trade <span className="text-warning font-semibold">₹{Math.max(0, Math.ceil((user?.total_deposited || 0) - (user?.total_traded || 0))).toLocaleString()}</span> more to unlock withdrawal (Deposit: ₹{Math.floor(user?.total_deposited || 0).toLocaleString()}, Traded: ₹{Math.floor(user?.total_traded || 0).toLocaleString()}).</li>
                                        <li className="flex items-start gap-2"><span className="text-warning">•</span> Get withdrawal within <span className="text-warning font-semibold">24 hrs</span>.</li>
                                        <li className="flex items-start gap-2"><span className="text-warning">•</span> The minimum withdrawal amount is <span className="text-warning font-semibold">₹1,000.00</span> INR.</li>
                                        <li className="flex items-start gap-2"><span className="text-warning">•</span> The maximum withdrawal amount is <span className="text-warning font-semibold">₹10,000,000.00</span> INR.</li>
                                        <li className="flex items-start gap-2"><span className="text-warning">•</span> You can withdraw <span className="text-warning font-semibold">4 times</span> a day.</li>
                                        <li className="flex items-start gap-2"><span className="text-warning">•</span> Please ensure that the account details are correct before submitting.</li>
                                        <li className="flex items-start gap-2"><span className="text-warning">•</span> If you have any issues, please contact our <span className="text-warning font-semibold">support team</span>.</li>
                                    </ul>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* ═══════════ HISTORY TAB ═══════════ */}
            {tab === 'history' && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    {/* History Sub-tabs */}
                    <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        {(['deposit', 'withdrawal'] as const).map((ht) => (
                            <button
                                key={ht}
                                onClick={() => { setHistoryTab(ht); setHistoryPage(1); setStatusFilter('all'); }}
                                className={clsx(
                                    'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 capitalize',
                                    historyTab === ht ? 'bg-neon-green/12 text-neon-green' : 'text-text-muted hover:text-text-secondary'
                                )}
                            >
                                {ht === 'deposit' ? <ArrowDownTrayIcon className="w-4 h-4" /> : <ArrowUpTrayIcon className="w-4 h-4" />}
                                {ht} History
                            </button>
                        ))}
                    </div>

                    {/* Status Filters */}
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {['all', 'pending', 'completed', 'rejected'].map((s) => (
                            <button
                                key={s}
                                onClick={() => { setStatusFilter(s); setHistoryPage(1); }}
                                className={clsx(
                                    'px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 capitalize border',
                                    statusFilter === s
                                        ? 'bg-neon-green/12 text-neon-green border-neon-green/20'
                                        : 'bg-glass text-text-secondary border-transparent hover:text-text-primary'
                                )}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    {/* Transaction List */}
                    <div className="space-y-2.5">
                        {paginatedTx.length > 0 ? paginatedTx.map((tx, i) => (
                            <motion.div
                                key={tx.id || i}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className="inner-card"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        {statusIcon(tx.status)}
                                        <div>
                                            <p className="text-sm font-semibold capitalize">{tx.type.replace(/_/g, ' ')}</p>
                                            <p className="text-[11px] text-text-muted">
                                                {dayjs(tx.created_at).format('MMM D, YYYY • HH:mm')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={clsx(
                                            'text-sm font-bold',
                                            historyTab === 'deposit' ? 'text-neon-green' : 'text-neon-red'
                                        )}>
                                            {historyTab === 'deposit' ? '+' : '-'}₹{Number(tx.amount).toFixed(2)}
                                        </p>
                                        {statusBadge(tx.status)}
                                    </div>
                                </div>
                                {/* Details Row */}
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-glass-border">
                                    <div className="flex items-center gap-3 text-[11px] text-text-muted">
                                        <span>Network: <span className="text-text-secondary font-medium">BEP20</span></span>
                                        {tx.tx_hash && (
                                            <span className="truncate max-w-[120px]">TxID: <span className="text-text-secondary font-mono">{tx.tx_hash}</span></span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )) : (
                            <div className="glass-card text-center py-12">
                                <div className="w-12 h-12 rounded-full bg-glass flex items-center justify-center mx-auto mb-3">
                                    {historyTab === 'deposit' ? (
                                        <ArrowDownTrayIcon className="w-6 h-6 text-text-muted" />
                                    ) : (
                                        <ArrowUpTrayIcon className="w-6 h-6 text-text-muted" />
                                    )}
                                </div>
                                <p className="text-sm font-semibold text-text-secondary mb-1">No {historyTab} records</p>
                                <p className="text-xs text-text-muted">Transactions will appear here</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalHistoryPages > 1 && (
                        <div className="flex items-center justify-center gap-3 pt-2">
                            <button
                                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                                disabled={historyPage === 1}
                                className="btn-ghost disabled:opacity-30 p-2"
                            >
                                <ChevronLeftIcon className="w-4 h-4" />
                            </button>
                            <span className="text-xs text-text-muted font-medium">
                                Page {historyPage} of {totalHistoryPages}
                            </span>
                            <button
                                onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                                disabled={historyPage >= totalHistoryPages}
                                className="btn-ghost disabled:opacity-30 p-2"
                            >
                                <ChevronRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
}

export default function AssetsPage() {
    return (
        <Suspense fallback={<div className="space-y-4"><div className="skeleton h-12 w-32" /><div className="skeleton h-44 w-full" /><div className="skeleton h-64 w-full" /></div>}>
            <AssetsContent />
        </Suspense>
    );
}
