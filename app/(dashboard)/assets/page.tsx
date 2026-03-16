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

const MIN_WITHDRAW_UPI =500; // ₹1,000 minimum for UPI
const MIN_WITHDRAW_USDT = 5; // $10 minimum for USDT (≈ ₹980)
const ITEMS_PER_PAGE = 10;
const USD_TO_INR = 98; // Conversion rate

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
    const [withdrawing, setWithdrawing] = useState(false);
    const [withdrawSuccess, setWithdrawSuccess] = useState(false);
    const [withdrawMethod, setWithdrawMethod] = useState<'usdt' | 'upi'>('usdt');
    const [withdrawUpiId, setWithdrawUpiId] = useState('');

    /* Deposit state — new manual verification system */
    const [depositMethod, setDepositMethod] = useState<'usdt' | 'upi'>('usdt');
    const [depositStep, setDepositStep] = useState<'choose' | 'amount' | 'usdt_qr' | 'usdt_hash' | 'upi_pay' | 'upi_utr' | 'submitted'>('choose');
    const [preDepositAmount, setPreDepositAmount] = useState('');
    const [selectedWallet, setSelectedWallet] = useState<{ qr: string; address: string } | null>(null);
    const [walletsList, setWalletsList] = useState<{ qr: string; address: string }[]>([]);
    const [depositLoading, setDepositLoading] = useState(false);
    const [txHashInput, setTxHashInput] = useState('');
    const [depositAmountInput, setDepositAmountInput] = useState('');
    const [assignedUpi, setAssignedUpi] = useState<{ upiId: string; displayName: string } | null>(null);
    const [utrInput, setUtrInput] = useState('');
    const [upiAmountInput, setUpiAmountInput] = useState('');

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

    /* ── Copy text to clipboard ──────────────────────── */
    const copyText = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied`);
    };

    /* ── USDT: Load wallet info ───────────────────── */
    const handleStartUSDT = async () => {
        setDepositLoading(true);
        try {
            const res = await axios.get('/api/wallet/deposit');
            const { wallet, wallets } = res.data;
            setSelectedWallet(wallet);
            setWalletsList(wallets || []);
            setDepositStep('usdt_qr');
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Failed to load wallet info'));
        } finally { setDepositLoading(false); }
    };

    /* ── USDT: Submit transaction hash ────────────── */
    const handleSubmitUSDTHash = async () => {
        if (!txHashInput.trim()) return toast.error('Enter the transaction hash');
        if (!depositAmountInput || parseFloat(depositAmountInput) <= 0) return toast.error('Enter the deposit amount');
        if (!selectedWallet) return toast.error('No wallet selected');

        setDepositLoading(true);
        try {
            await axios.post('/api/wallet/deposit/submit', {
                txHash: txHashInput.trim(),
                walletAddress: selectedWallet.address,
                amount: parseFloat(depositAmountInput),
            });
            setDepositStep('submitted');
            toast.success('Deposit request submitted!');
            fetchData();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Failed to submit deposit'));
        } finally { setDepositLoading(false); }
    };

    /* ── UPI: Get random UPI ID ───────────────────── */
    const handleStartUPI = async () => {
        setDepositLoading(true);
        try {
            const res = await axios.get('/api/wallet/deposit/get-upi');
            setAssignedUpi({ upiId: res.data.upiId, displayName: res.data.displayName });
            setDepositStep('upi_pay');
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No active UPI accounts. Try USDT.'));
        } finally { setDepositLoading(false); }
    };

    /* ── UPI: Submit UTR ──────────────────────────── */
    const handleSubmitUPIUTR = async () => {
        if (!utrInput.trim()) return toast.error('Enter the UTR number');
        if (!upiAmountInput || parseFloat(upiAmountInput) < 500) return toast.error('Minimum UPI deposit is ₹500');
        if (!assignedUpi) return toast.error('No UPI assigned');

        setDepositLoading(true);
        try {
            await axios.post('/api/wallet/deposit/submit-upi', {
                utrNumber: utrInput.trim(),
                upiId: assignedUpi.upiId,
                amount: parseFloat(upiAmountInput),
            });
            setDepositStep('submitted');
            toast.success('UPI deposit request submitted!');
            fetchData();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Failed to submit UPI deposit'));
        } finally { setDepositLoading(false); }
    };

    /* ── Validate amount and proceed to payment step ── */
    const handleAmountContinue = async () => {
        const amt = parseFloat(preDepositAmount);
        if (depositMethod === 'usdt') {
            if (!amt || amt < 5) return toast.error('Minimum USDT deposit is $5');
            setDepositAmountInput(preDepositAmount);
            await handleStartUSDT();
        } else {
            if (!amt || amt < 500) return toast.error('Minimum UPI deposit is ₹500');
            setUpiAmountInput(preDepositAmount);
            await handleStartUPI();
        }
    };

    /* ── Reset deposit flow ───────────────────────── */
    const resetDeposit = () => {
        setDepositStep('choose');
        setSelectedWallet(null);
        setTxHashInput('');
        setDepositAmountInput('');
        setAssignedUpi(null);
        setUtrInput('');
        setUpiAmountInput('');
        setPreDepositAmount('');
    };


    /* ── Handle Withdrawal ─────────────────────────── */
    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(withdrawAmount);
        if (!amt || amt <= 0) return toast.error('Enter a valid amount');
        
        // Check minimum based on method
        const minAmount = withdrawMethod === 'usdt' ? MIN_WITHDRAW_USDT : MIN_WITHDRAW_UPI;
        const currencySymbol = withdrawMethod === 'usdt' ? '$' : '₹';
        if (amt < minAmount) return toast.error(`Minimum withdrawal is ${currencySymbol}${minAmount.toLocaleString()}`);
        
        if (withdrawMethod === 'usdt') {
            if (!withdrawAddress.trim()) return toast.error('Wallet address is required');
            if (!/^0x[a-fA-F0-9]{40}$/.test(withdrawAddress.trim())) return toast.error('Invalid wallet address format (must be 0x...)');
        } else {
            if (!withdrawUpiId.trim()) return toast.error('UPI ID is required');
            if (!withdrawUpiId.includes('@')) return toast.error('Invalid UPI ID format (must contain @)');
        }

        setWithdrawing(true);
        try {
            await axios.post('/api/wallet/withdraw', {
                amount: amt,
                withdrawMethod,
                walletAddress: withdrawMethod === 'usdt' ? withdrawAddress.trim() : null,
                upiId: withdrawMethod === 'upi' ? withdrawUpiId.trim() : null,
            });

            setWithdrawSuccess(true);
            setWithdrawAmount('');
            setWithdrawAddress('');
            setWithdrawUpiId('');
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
            ? ['deposit', 'referral_bonus', 'commission'].includes(t.type)
            : ['withdrawal'].includes(t.type);
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
                    <AnimatePresence mode="wait">
                        {/* ── Step: Choose Method ── */}
                        {depositStep === 'choose' && (
                            <motion.div key="choose" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                                <div className="glass-card text-center">
                                    <ArrowDownTrayIcon className="w-10 h-10 text-neon-cyan mx-auto mb-3" />
                                    <h3 className="text-base font-bold mb-1">Deposit Funds</h3>
                                    <p className="text-xs text-text-muted">Choose your deposit method</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => { setDepositMethod('usdt'); setPreDepositAmount(''); setDepositStep('amount'); }} disabled={depositLoading}
                                        className="glass-card flex flex-col items-center gap-3 py-6 hover:border-neon-cyan/30 transition-all">
                                        <div className="w-14 h-14 rounded-2xl bg-neon-cyan/10 flex items-center justify-center">
                                            <WalletIcon className="w-7 h-7 text-neon-cyan" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold">USDT</p>
                                            <p className="text-[10px] text-text-muted">BEP20 (BSC)</p>
                                        </div>
                                    </button>
                                    <button onClick={() => { setDepositMethod('upi'); setPreDepositAmount(''); setDepositStep('amount'); }} disabled={depositLoading}
                                        className="glass-card flex flex-col items-center gap-3 py-6 hover:border-neon-green/30 transition-all">
                                        <div className="w-14 h-14 rounded-2xl bg-neon-green/10 flex items-center justify-center">
                                            <BanknotesIcon className="w-7 h-7 text-neon-green" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold">UPI</p>
                                            <p className="text-[10px] text-text-muted">INR Transfer</p>
                                        </div>
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ── Step: Enter Amount First ── */}
                        {depositStep === 'amount' && (
                            <motion.div key="amount" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                                <div className="glass-card">
                                    <div className="flex items-center gap-2 mb-5">
                                        <button onClick={resetDeposit} className="btn-ghost p-2 text-xs">Back</button>
                                        <p className="text-sm font-bold flex-1 text-center">
                                            {depositMethod === 'usdt' ? 'USDT Deposit' : 'UPI Deposit'}
                                        </p>
                                        <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full', depositMethod === 'usdt' ? 'bg-neon-cyan/15 text-neon-cyan' : 'bg-neon-green/15 text-neon-green')}>
                                            {depositMethod === 'usdt' ? 'BEP20' : 'INR'}
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="form-label flex items-center gap-2">
                                                {depositMethod === 'usdt' ? (
                                                    <><WalletIcon className="w-4 h-4 text-text-muted" /> Deposit Amount (USD)</>
                                                ) : (
                                                    <><BanknotesIcon className="w-4 h-4 text-text-muted" /> Deposit Amount (INR)</>
                                                )}
                                            </label>
                                            <div className="relative">
                                                {depositMethod === 'usdt' && (
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-green font-bold">$</span>
                                                )}
                                                {depositMethod === 'upi' && (
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-green font-bold">₹</span>
                                                )}
                                                <input
                                                    type="number"
                                                    value={preDepositAmount}
                                                    onChange={(e) => setPreDepositAmount(e.target.value)}
                                                    placeholder={depositMethod === 'usdt' ? 'e.g. 50' : 'e.g. 5000'}
                                                    className="glass-input text-lg font-semibold pl-7"
                                                    min={depositMethod === 'usdt' ? 5 : 500}
                                                    step="0.01"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <p className="text-[10px] text-text-muted">
                                                    Min: <span className="text-neon-green font-medium">{depositMethod === 'usdt' ? '$5' : '₹500'}</span>
                                                </p>
                                                {depositMethod === 'usdt' && preDepositAmount && parseFloat(preDepositAmount) > 0 && (
                                                    <p className="text-[10px] text-neon-cyan">
                                                        ≈ ₹{(parseFloat(preDepositAmount) * USD_TO_INR).toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Quick amount buttons */}
                                        <div className="flex gap-1.5">
                                            {(depositMethod === 'usdt'
                                                ? [5, 10, 25, 50, 100]
                                                : [500, 1000, 2000, 5000, 10000]
                                            ).map((amt) => (
                                                <button
                                                    key={amt}
                                                    type="button"
                                                    onClick={() => setPreDepositAmount(String(amt))}
                                                    className={clsx(
                                                        'flex-1 py-2 text-xs font-semibold rounded-xl transition-all duration-200 border',
                                                        preDepositAmount === String(amt)
                                                            ? 'bg-neon-green/12 text-neon-green border-neon-green/20'
                                                            : 'bg-glass text-text-muted border-transparent hover:text-text-secondary hover:border-glass-border'
                                                    )}
                                                >
                                                    {depositMethod === 'usdt' ? `$${amt}` : `₹${amt.toLocaleString()}`}
                                                </button>
                                            ))}
                                        </div>

                                        <button
                                            onClick={handleAmountContinue}
                                            disabled={depositLoading}
                                            className="btn-glow w-full text-sm flex items-center justify-center gap-2"
                                        >
                                            {depositLoading ? (
                                                <><ArrowPathIcon className="w-4 h-4 animate-spin" /> Loading...</>
                                            ) : (
                                                <>Continue to Payment</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ── Step: USDT QR + Address ── */}
                        {depositStep === 'usdt_qr' && selectedWallet && (
                            <motion.div key="usdt_qr" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                                <div className="glass-card flex flex-col items-center overflow-hidden">
                                    <div className="flex items-center gap-2 mb-4 w-full">
                                        <button onClick={resetDeposit} className="btn-ghost p-2 text-xs">Back</button>
                                        <p className="text-sm font-bold flex-1 text-center">Deposit USDT (BEP20)</p>
                                        <span className="badge-info text-[10px]">BEP20</span>
                                    </div>

                                    {/* QR Code */}
                                    <div className="relative p-4 bg-white rounded-2xl mb-4 shadow-[0_8px_40px_rgba(0,0,0,0.5)] max-w-[220px] mx-auto">
                                        <Image src={selectedWallet.qr} alt="USDT QR" width={180} height={180} className="rounded-xl w-full h-auto" priority />
                                    </div>

                                    {/* Address */}
                                    <div className="w-full glass-card-flat">
                                        <p className="text-[11px] text-text-muted uppercase tracking-wider font-medium mb-2">Wallet Address</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 inner-card px-3 py-2.5 overflow-hidden min-w-0">
                                                <code className="text-[11px] font-mono text-text-secondary block truncate select-all">{selectedWallet.address}</code>
                                            </div>
                                            <button onClick={() => copyText(selectedWallet.address, 'Address')} className="btn-ghost p-2.5 shrink-0 hover:bg-neon-green/10 hover:text-neon-green">
                                                <ClipboardDocumentIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Warning */}
                                    <div className="w-full mt-4 p-3 rounded-xl border border-neon-orange/20 bg-neon-orange/5">
                                        <div className="flex items-start gap-2">
                                            <ExclamationTriangleIcon className="w-4 h-4 text-neon-orange shrink-0 mt-0.5" />
                                            <p className="text-[11px] text-text-secondary leading-relaxed">
                                                Send only <span className="text-neon-orange font-semibold">USDT (BEP20)</span> to this address. Other assets will be <span className="text-neon-red font-semibold">permanently lost</span>.
                                            </p>
                                        </div>
                                    </div>

                                    <button onClick={() => setDepositStep('usdt_hash')} className="btn-glow w-full mt-5 text-sm flex items-center justify-center gap-2">
                                        <BoltIcon className="w-4 h-4" /> I&apos;ve Sent USDT — Submit Hash
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ── Step: USDT Hash Submission ── */}
                        {depositStep === 'usdt_hash' && selectedWallet && (
                            <motion.div key="usdt_hash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                                <div className="glass-card">
                                    <div className="flex items-center gap-2 mb-5">
                                        <button onClick={() => setDepositStep('usdt_qr')} className="btn-ghost p-2 text-xs">Back</button>
                                        <p className="text-sm font-bold flex-1 text-center">Submit Transaction Hash</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="form-label">Deposit Amount (USD)</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-green font-bold">$</span>
                                                <input type="number" value={depositAmountInput} onChange={(e) => setDepositAmountInput(e.target.value)}
                                                    placeholder="e.g. 50" className="glass-input text-sm pl-7" min="1" step="0.01" />
                                            </div>
                                            <p className="text-[10px] text-text-muted mt-1">
                                                Enter USDT amount sent. Will be converted at <span className="text-neon-green">₹{USD_TO_INR}/USD</span>
                                                {depositAmountInput && parseFloat(depositAmountInput) > 0 && (
                                                    <span className="text-neon-cyan ml-1">≈ ₹{(parseFloat(depositAmountInput) * USD_TO_INR).toLocaleString()}</span>
                                                )}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="form-label">Transaction Hash (BSCScan)</label>
                                            <input type="text" value={txHashInput} onChange={(e) => setTxHashInput(e.target.value)}
                                                placeholder="0x..." className="glass-input text-sm font-mono" />
                                            <p className="text-[10px] text-text-muted mt-1">Find this on BSCScan after your transaction confirms</p>
                                        </div>
                                        <div className="inner-card">
                                            <p className="text-[11px] text-text-muted mb-1">Sent to wallet:</p>
                                            <code className="text-[10px] font-mono text-text-secondary block truncate">{selectedWallet.address}</code>
                                        </div>
                                        <button onClick={handleSubmitUSDTHash} disabled={depositLoading}
                                            className="btn-glow w-full text-sm flex items-center justify-center gap-2">
                                            {depositLoading ? <><ArrowPathIcon className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Deposit Request'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ── Step: UPI Payment Info ── */}
                        {depositStep === 'upi_pay' && assignedUpi && (
                            <motion.div key="upi_pay" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                                <div className="glass-card">
                                    <div className="flex items-center gap-2 mb-5">
                                        <button onClick={resetDeposit} className="btn-ghost p-2 text-xs">Back</button>
                                        <p className="text-sm font-bold flex-1 text-center">UPI Deposit</p>
                                        <span className="badge-success text-[10px]">UPI</span>
                                    </div>

                                    <div className="inner-card mb-4 text-center">
                                        <p className="text-[11px] text-text-muted mb-2">Send payment to this UPI ID</p>
                                        <p className="text-lg font-bold text-neon-green font-mono">{assignedUpi.upiId}</p>
                                        <p className="text-[11px] text-text-muted mt-1">{assignedUpi.displayName}</p>
                                        <button onClick={() => copyText(assignedUpi.upiId, 'UPI ID')}
                                            className="btn-ghost mt-3 text-xs flex items-center gap-1.5 mx-auto">
                                            <ClipboardDocumentIcon className="w-3.5 h-3.5" /> Copy UPI ID
                                        </button>
                                    </div>

                                    <div className="p-3 rounded-xl border border-warning/20 bg-warning/5 mb-4">
                                        <ul className="space-y-1.5 text-[11px] text-text-secondary">
                                            <li className="flex items-start gap-2"><span className="text-warning">1.</span> Open any UPI app (GPay, PhonePe, Paytm)</li>
                                            <li className="flex items-start gap-2"><span className="text-warning">2.</span> Send payment to the UPI ID above</li>
                                            <li className="flex items-start gap-2"><span className="text-warning">3.</span> Note down the <span className="text-warning font-semibold">12-digit UTR number</span></li>
                                            <li className="flex items-start gap-2"><span className="text-warning">4.</span> Click below to submit your UTR</li>
                                        </ul>
                                    </div>

                                    <button onClick={() => setDepositStep('upi_utr')} className="btn-glow w-full text-sm flex items-center justify-center gap-2">
                                        <BoltIcon className="w-4 h-4" /> I&apos;ve Paid — Submit UTR
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ── Step: UPI UTR Submission ── */}
                        {depositStep === 'upi_utr' && assignedUpi && (
                            <motion.div key="upi_utr" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                                <div className="glass-card">
                                    <div className="flex items-center gap-2 mb-5">
                                        <button onClick={() => setDepositStep('upi_pay')} className="btn-ghost p-2 text-xs">Back</button>
                                        <p className="text-sm font-bold flex-1 text-center">Submit UTR Number</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="form-label">Amount Paid (INR)</label>
                                            <input type="number" value={upiAmountInput} onChange={(e) => setUpiAmountInput(e.target.value)}
                                                placeholder="e.g. 5000" className="glass-input text-sm" min="500" />
                                            <p className="text-[10px] text-text-muted mt-1">Minimum ₹500</p>
                                        </div>
                                        <div>
                                            <label className="form-label">UTR Number (12 digits)</label>
                                            <input type="text" value={utrInput} onChange={(e) => setUtrInput(e.target.value.replace(/\D/g, '').slice(0, 12))}
                                                placeholder="123456789012" className="glass-input text-sm font-mono" maxLength={12} />
                                            <p className="text-[10px] text-text-muted mt-1">Find this in your UPI app transaction details</p>
                                        </div>
                                        <div className="inner-card">
                                            <p className="text-[11px] text-text-muted mb-1">Paid to UPI:</p>
                                            <code className="text-xs font-mono text-neon-green">{assignedUpi.upiId}</code>
                                        </div>
                                        <button onClick={handleSubmitUPIUTR} disabled={depositLoading}
                                            className="btn-glow w-full text-sm flex items-center justify-center gap-2">
                                            {depositLoading ? <><ArrowPathIcon className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit UPI Deposit'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ── Step: Submitted Success ── */}
                        {depositStep === 'submitted' && (
                            <motion.div key="submitted" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                className="glass-card text-center py-10">
                                <div className="w-16 h-16 rounded-full bg-neon-green/15 flex items-center justify-center mx-auto mb-5">
                                    <CheckCircleIcon className="w-9 h-9 text-neon-green" />
                                </div>
                                <h3 className="text-lg font-bold text-neon-green mb-2">Request Submitted!</h3>
                                <p className="text-sm text-text-secondary max-w-xs mx-auto mb-1">
                                    Your deposit request is being reviewed by our team.
                                </p>
                                <p className="text-xs text-text-muted mb-6">You will be credited once approved.</p>
                                <button onClick={resetDeposit} className="btn-outline text-sm px-8">
                                    Make Another Deposit
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
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
                                        <p className="text-sm font-semibold text-text-secondary">Withdraw Funds</p>
                                    </div>

                                    {/* Withdraw Method Toggle */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={() => setWithdrawMethod('usdt')}
                                            className={clsx('py-3 rounded-xl text-sm font-semibold transition-all border-2 flex items-center justify-center gap-2',
                                                withdrawMethod === 'usdt' ? 'bg-neon-cyan/12 text-neon-cyan border-neon-cyan/30' : 'bg-glass text-text-muted border-transparent hover:border-glass-border'
                                            )}>
                                            <WalletIcon className="w-4 h-4" /> USDT (BSC)
                                        </button>
                                        <button type="button" onClick={() => setWithdrawMethod('upi')}
                                            className={clsx('py-3 rounded-xl text-sm font-semibold transition-all border-2 flex items-center justify-center gap-2',
                                                withdrawMethod === 'upi' ? 'bg-neon-green/12 text-neon-green border-neon-green/30' : 'bg-glass text-text-muted border-transparent hover:border-glass-border'
                                            )}>
                                            <BanknotesIcon className="w-4 h-4" /> UPI (INR)
                                        </button>
                                    </div>

                                    {/* Amount */}
                                    <div>
                                        <label className="form-label flex items-center gap-2">
                                            {withdrawMethod === 'usdt' ? (
                                                <><WalletIcon className="w-4 h-4 text-text-muted" /> Amount ($)</>
                                            ) : (
                                                <><BanknotesIcon className="w-4 h-4 text-text-muted" /> Amount (₹)</>
                                            )}
                                        </label>
                                        <div className="relative">
                                            {withdrawMethod === 'usdt' && (
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-cyan font-bold">$</span>
                                            )}
                                            <input
                                                type="number"
                                                value={withdrawAmount}
                                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                                placeholder={withdrawMethod === 'usdt' ? "10.00" : "1000.00"}
                                                className={clsx('glass-input text-lg font-semibold', withdrawMethod === 'usdt' && 'pl-7')}
                                                step="0.01"
                                                min={withdrawMethod === 'usdt' ? MIN_WITHDRAW_USDT : MIN_WITHDRAW_UPI}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <p className="text-xs text-text-muted flex items-center gap-1">
                                                Available: <span className="text-neon-green font-medium">₹{Number(user?.wallet_balance || 0).toFixed(2)}</span>
                                            </p>
                                            <p className="text-xs text-text-muted">
                                                Min: <span className="text-neon-green font-medium">{withdrawMethod === 'usdt' ? `$${MIN_WITHDRAW_USDT}` : `₹${MIN_WITHDRAW_UPI}`}</span>
                                            </p>
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

                                    {/* USDT: Wallet Address */}
                                    {withdrawMethod === 'usdt' && (
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
                                            />
                                            <p className="text-[10px] text-text-muted mt-1">Enter your BEP20 (BSC) wallet address to receive USDT</p>
                                        </div>
                                    )}

                                    {/* UPI: UPI ID */}
                                    {withdrawMethod === 'upi' && (
                                        <div>
                                            <label className="form-label flex items-center gap-2">
                                                <BanknotesIcon className="w-4 h-4 text-text-muted" /> UPI ID <span className="text-neon-red">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={withdrawUpiId}
                                                onChange={(e) => setWithdrawUpiId(e.target.value)}
                                                placeholder="yourname@upi"
                                                className="glass-input text-sm"
                                            />
                                            <p className="text-[10px] text-text-muted mt-1">Enter your UPI ID (e.g., name@paytm, name@ybl)</p>
                                        </div>
                                    )}

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
                                            `Withdraw via ${withdrawMethod === 'usdt' ? 'USDT' : 'UPI'}`
                                        )}
                                    </button>

                                    {/* Info note */}
                                    <p className="text-[11px] text-text-muted text-center leading-relaxed">
                                        Withdrawals require admin approval and will be processed within 24 hrs. No withdrawal fee.
                                    </p>
                                </form>

                                {/* Withdrawal Instructions */}
                                <div className="mt-5 rounded-2xl border border-warning/20 bg-warning/5 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-warning/10 bg-warning/5">
                                        <h3 className="text-sm font-bold text-warning flex items-center gap-2">
                                            <ExclamationTriangleIcon className="w-4 h-4" /> Withdrawal Instructions
                                        </h3>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        {/* Trade Requirement */}
                                        <div className="inner-card !bg-dark-surface/50">
                                            <p className="text-[11px] text-text-muted mb-1">Trade Requirement</p>
                                            <p className="text-sm text-text-secondary">
                                                Trade <span className="text-warning font-bold">₹{Math.max(0, Math.ceil((user?.total_deposited || 0) - (user?.total_traded || 0))).toLocaleString()}</span> more to unlock
                                            </p>
                                            <div className="flex gap-4 mt-2 text-[11px] text-text-muted">
                                                <span>Deposited: ₹{Math.floor(user?.total_deposited || 0).toLocaleString()}</span>
                                                <span>Traded: ₹{Math.floor(user?.total_traded || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        {/* Rules Grid */}
                                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                                            <div className="inner-card !bg-dark-surface/50 text-center">
                                                <p className="text-warning font-bold text-sm">24 hrs</p>
                                                <p className="text-text-muted">Processing Time</p>
                                            </div>
                                            <div className="inner-card !bg-dark-surface/50 text-center">
                                                <p className="text-warning font-bold text-sm">
                                                    {withdrawMethod === 'usdt' ? '$10' : '₹1,000'}
                                                </p>
                                                <p className="text-text-muted">Minimum</p>
                                            </div>
                                            <div className="inner-card !bg-dark-surface/50 text-center">
                                                <p className="text-warning font-bold text-sm">₹1 Cr</p>
                                                <p className="text-text-muted">Maximum</p>
                                            </div>
                                            <div className="inner-card !bg-dark-surface/50 text-center">
                                                <p className="text-warning font-bold text-sm">4/day</p>
                                                <p className="text-text-muted">Daily Limit</p>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-text-muted text-center">
                                            Ensure account details are correct. Contact <span className="text-warning">support</span> for issues.
                                        </p>
                                    </div>
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
                                        {tx.notes?.includes('USDT deposit') && (
                                            <p className="text-[10px] text-text-muted">{tx.notes.match(/\$[\d.]+/)?.[0] || ''}</p>
                                        )}
                                        {statusBadge(tx.status)}
                                    </div>
                                </div>
                                {/* Details Row */}
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-glass-border">
                                    <div className="flex items-center gap-3 text-[11px] text-text-muted">
                                        <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-semibold',
                                            (tx.notes?.includes('UPI') || tx.wallet_address?.includes('@')) ? 'bg-neon-green/15 text-neon-green' : 'bg-neon-cyan/15 text-neon-cyan'
                                        )}>
                                            {(tx.notes?.includes('UPI') || tx.wallet_address?.includes('@')) ? 'UPI' : 'USDT'}
                                        </span>
                                        {tx.tx_hash && (
                                            <span className="truncate max-w-[100px]">Hash: <span className="text-text-secondary font-mono">{tx.tx_hash.slice(0, 10)}...</span></span>
                                        )}
                                        {tx.wallet_address && !tx.tx_hash && (
                                            <span className="truncate max-w-[100px]">To: <span className="text-text-secondary font-mono">{tx.wallet_address.slice(0, 12)}...</span></span>
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
