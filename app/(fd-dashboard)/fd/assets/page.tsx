'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ClipboardDocumentIcon,
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    WalletIcon,
    CheckCircleIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    BoltIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import dayjs from 'dayjs';

const MIN_WITHDRAW_USDT = 10;
const MIN_DEPOSIT_USDT = 10;
const USDT_RATE = 98;

const positiveTypes = new Set(['deposit', 'fd_return', 'fd_profit', 'referral_bonus', 'liquidity_bonus', 'admin_adjustment']);

function getTransactionLabel(type: string) {
    if (type === 'fd_profit') return 'Monthly Return';
    if (type === 'fd_return') return 'Principal Return';
    if (type === 'referral_bonus') return 'Referral Bonus';
    if (type === 'liquidity_bonus') return 'Liquidity Bonus';
    if (type === 'fd_invest') return 'Package Activation';
    return type.replace(/_/g, ' ');
}

export default function FDAssetsPage() {
    const [tab, setTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit');
    const [user, setUser] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [depositStep, setDepositStep] = useState<'amount' | 'usdt_qr' | 'usdt_hash' | 'submitted'>('amount');
    const [depositAmount, setDepositAmount] = useState('');
    const [selectedWallet, setSelectedWallet] = useState<{ qr: string; address: string } | null>(null);
    const [depositLoading, setDepositLoading] = useState(false);
    const [txHashInput, setTxHashInput] = useState('');

    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawAddress, setWithdrawAddress] = useState('');
    const [withdrawing, setWithdrawing] = useState(false);
    const [withdrawSuccess, setWithdrawSuccess] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [userRes, txRes] = await Promise.all([
                axios.get('/api/fd/user'),
                axios.get('/api/fd/wallet/transactions'),
            ]);
            setUser(userRes.data.user);
            setTransactions(txRes.data.transactions || []);
        } catch {
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const copyText = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied`);
    };

    const resetDeposit = () => {
        setDepositStep('amount');
        setDepositAmount('');
        setSelectedWallet(null);
        setTxHashInput('');
    };

    const handleLoadWallet = async () => {
        const amount = parseFloat(depositAmount);
        if (!amount || amount < MIN_DEPOSIT_USDT) {
            return toast.error(`Minimum deposit is ${MIN_DEPOSIT_USDT} USDT`);
        }

        setDepositLoading(true);
        try {
            const res = await axios.get('/api/fd/wallet/deposit');
            setSelectedWallet(res.data.wallet);
            setDepositStep('usdt_qr');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to load deposit wallet');
        } finally {
            setDepositLoading(false);
        }
    };

    const handleSubmitDeposit = async () => {
        const amount = parseFloat(depositAmount);
        if (!amount || amount < MIN_DEPOSIT_USDT) {
            return toast.error(`Minimum deposit is ${MIN_DEPOSIT_USDT} USDT`);
        }
        if (!txHashInput.trim()) {
            return toast.error('Enter the transaction hash');
        }

        setDepositLoading(true);
        try {
            await axios.post('/api/fd/wallet/deposit/submit', {
                txHash: txHashInput.trim(),
                walletAddress: selectedWallet?.address,
                amount,
            });
            setDepositStep('submitted');
            toast.success('Deposit submitted successfully');
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to submit deposit');
        } finally {
            setDepositLoading(false);
        }
    };

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();

        const amount = parseFloat(withdrawAmount);
        if (!amount || amount < MIN_WITHDRAW_USDT) {
            return toast.error(`Minimum withdrawal is ${MIN_WITHDRAW_USDT} USDT`);
        }
        if (!withdrawAddress.trim() || !/^0x[a-fA-F0-9]{40}$/.test(withdrawAddress.trim())) {
            return toast.error('Enter a valid BSC wallet address');
        }

        setWithdrawing(true);
        try {
            await axios.post('/api/fd/wallet/withdraw', {
                amountUsdt: amount,
                walletAddress: withdrawAddress.trim(),
            });
            setWithdrawSuccess(true);
            setWithdrawAmount('');
            setWithdrawAddress('');
            fetchData();
            setTimeout(() => setWithdrawSuccess(false), 5000);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Withdrawal failed');
        } finally {
            setWithdrawing(false);
        }
    };

    const statusBadge = (status: string) => {
        if (status === 'completed') return <span className="badge-success">Completed</span>;
        if (status === 'pending') return <span className="badge-warning">Pending</span>;
        return <span className="badge-danger">Rejected</span>;
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="skeleton h-12 w-32" />
                <div className="skeleton h-44 w-full" />
                <div className="skeleton h-64 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight">Assets</h1>
                    <p className="text-xs text-text-muted mt-1">USDT (BEP20) deposit and withdrawal only</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-neon-cyan/10 flex items-center justify-center">
                    <WalletIcon className="w-5 h-5 text-neon-cyan" />
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl border border-glass-border"
                style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.06), rgba(0,255,136,0.05))' }}
            >
                <div className="relative p-6">
                    <p className="text-text-secondary text-sm font-medium mb-2">Stacking Wallet Balance</p>
                    <p className="stat-value neon-text mb-1">₹{Number(user?.wallet_balance || 0).toFixed(2)}</p>
                    <p className="text-[11px] text-text-muted">≈ {Number(user?.wallet_balance_usdt || 0).toFixed(2)} USDT</p>
                    <span className="badge-info mt-3">Fixed rate: ₹{USDT_RATE} / USDT</span>
                </div>
            </motion.div>

            <div className="flex gap-1.5 p-1.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                {(['deposit', 'withdraw', 'history'] as const).map((item) => (
                    <button
                        key={item}
                        onClick={() => setTab(item)}
                        className={clsx(
                            'flex-1 py-3 text-sm font-semibold rounded-xl transition-all capitalize',
                            tab === item ? 'bg-neon-cyan/12 text-neon-cyan shadow-sm' : 'text-text-muted hover:text-text-secondary'
                        )}
                    >
                        {item}
                    </button>
                ))}
            </div>

            {tab === 'deposit' && (
                <AnimatePresence mode="wait">
                    {depositStep === 'amount' && (
                        <motion.div key="amount" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="glass-card space-y-4">
                                <div className="text-center">
                                    <ArrowDownTrayIcon className="w-10 h-10 text-neon-cyan mx-auto mb-3" />
                                    <h3 className="text-base font-bold mb-1">Deposit USDT</h3>
                                    <p className="text-xs text-text-muted">Send only USDT on BEP20 network</p>
                                </div>

                                <div>
                                    <label className="form-label">Deposit Amount (USDT)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-green font-bold">$</span>
                                        <input
                                            type="number"
                                            value={depositAmount}
                                            onChange={(e) => setDepositAmount(e.target.value)}
                                            placeholder="e.g. 50"
                                            className="glass-input text-lg font-semibold pl-7"
                                            min={MIN_DEPOSIT_USDT}
                                        />
                                    </div>
                                    <p className="text-[11px] text-text-muted mt-1">
                                        Credit value: ₹{((parseFloat(depositAmount) || 0) * USDT_RATE).toFixed(2)}
                                    </p>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    {[10, 25, 50, 100, 250, 500].map((quickAmount) => (
                                        <button
                                            key={quickAmount}
                                            type="button"
                                            onClick={() => setDepositAmount(String(quickAmount))}
                                            className={`py-2 text-xs font-semibold rounded-xl border transition-all ${depositAmount === String(quickAmount)
                                                ? 'bg-neon-green/12 text-neon-green border-neon-green/20'
                                                : 'bg-glass text-text-muted border-transparent'
                                                }`}
                                        >
                                            ${quickAmount}
                                        </button>
                                    ))}
                                </div>

                                <button onClick={handleLoadWallet} disabled={depositLoading} className="btn-glow w-full text-sm">
                                    {depositLoading ? 'Loading...' : 'Continue to Deposit Wallet'}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {depositStep === 'usdt_qr' && selectedWallet && (
                        <motion.div key="usdt_qr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="glass-card flex flex-col items-center">
                                <div className="flex items-center gap-2 mb-4 w-full">
                                    <button onClick={resetDeposit} className="btn-ghost p-2 text-xs">Back</button>
                                    <p className="text-sm font-bold flex-1 text-center">Deposit USDT (BEP20)</p>
                                </div>

                                <div className="p-4 bg-white rounded-2xl mb-4 shadow-[0_8px_40px_rgba(0,0,0,0.5)] max-w-[220px]">
                                    <Image src={selectedWallet.qr} alt="QR" width={180} height={180} className="rounded-xl w-full h-auto" priority />
                                </div>

                                <div className="w-full glass-card-flat">
                                    <p className="text-[11px] text-text-muted uppercase mb-2">Wallet Address</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 inner-card px-3 py-2.5 overflow-hidden min-w-0">
                                            <code className="text-[11px] font-mono text-text-secondary block truncate">{selectedWallet.address}</code>
                                        </div>
                                        <button onClick={() => copyText(selectedWallet.address, 'Address')} className="btn-ghost p-2.5 shrink-0">
                                            <ClipboardDocumentIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="w-full mt-4 p-3 rounded-xl border border-neon-orange/20 bg-neon-orange/5">
                                    <div className="flex items-start gap-2">
                                        <ExclamationTriangleIcon className="w-4 h-4 text-neon-orange shrink-0 mt-0.5" />
                                        <p className="text-[11px] text-text-secondary">
                                            Send exactly <span className="text-neon-orange font-semibold">{depositAmount || '0'} USDT</span> on BEP20 only.
                                        </p>
                                    </div>
                                </div>

                                <button onClick={() => setDepositStep('usdt_hash')} className="btn-glow w-full mt-5 text-sm flex items-center justify-center gap-2">
                                    <BoltIcon className="w-4 h-4" /> I&apos;ve Sent It
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {depositStep === 'usdt_hash' && selectedWallet && (
                        <motion.div key="usdt_hash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="glass-card space-y-4">
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setDepositStep('usdt_qr')} className="btn-ghost p-2 text-xs">Back</button>
                                    <p className="text-sm font-bold flex-1 text-center">Submit Transaction Hash</p>
                                </div>

                                <div className="inner-card">
                                    <p className="text-[11px] text-text-muted">Deposit Amount</p>
                                    <p className="text-sm font-bold text-neon-green">{parseFloat(depositAmount || '0').toFixed(2)} USDT</p>
                                    <p className="text-[10px] text-text-muted mt-1">Expected credit: ₹{((parseFloat(depositAmount) || 0) * USDT_RATE).toFixed(2)}</p>
                                </div>

                                <div>
                                    <label className="form-label">Transaction Hash</label>
                                    <input
                                        type="text"
                                        value={txHashInput}
                                        onChange={(e) => setTxHashInput(e.target.value)}
                                        placeholder="0x..."
                                        className="glass-input text-sm font-mono"
                                    />
                                </div>

                                <button onClick={handleSubmitDeposit} disabled={depositLoading} className="btn-glow w-full text-sm">
                                    {depositLoading ? 'Submitting...' : 'Submit Deposit Request'}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {depositStep === 'submitted' && (
                        <motion.div key="submitted" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card text-center py-10">
                            <div className="w-16 h-16 rounded-full bg-neon-green/15 flex items-center justify-center mx-auto mb-5">
                                <CheckCircleIcon className="w-9 h-9 text-neon-green" />
                            </div>
                            <h3 className="text-lg font-bold text-neon-green mb-2">Deposit Submitted</h3>
                            <p className="text-sm text-text-secondary">Your USDT deposit is pending review.</p>
                            <button onClick={resetDeposit} className="btn-outline text-sm px-8 mt-6">Make Another Deposit</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}

            {tab === 'withdraw' && (
                <AnimatePresence mode="wait">
                    {withdrawSuccess ? (
                        <motion.div key="withdraw_success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card text-center py-12">
                            <div className="w-16 h-16 rounded-full bg-neon-green/15 flex items-center justify-center mx-auto mb-5">
                                <CheckCircleIcon className="w-9 h-9 text-neon-green" />
                            </div>
                            <h3 className="text-lg font-bold text-neon-green mb-2">Withdrawal Submitted</h3>
                            <p className="text-sm text-text-secondary">Your withdrawal is reserved and awaiting admin approval.</p>
                        </motion.div>
                    ) : (
                        <motion.div key="withdraw_form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <form onSubmit={handleWithdraw} className="glass-card space-y-5">
                                <div className="flex items-center gap-2 mb-1">
                                    <ArrowUpTrayIcon className="w-5 h-5 text-neon-cyan" />
                                    <p className="text-sm font-semibold text-text-secondary">Withdraw USDT (BEP20)</p>
                                </div>

                                <div>
                                    <label className="form-label">Withdrawal Amount (USDT)</label>
                                    <input
                                        type="number"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        placeholder="10.00"
                                        className="glass-input text-lg font-semibold"
                                        step="0.01"
                                        min={MIN_WITHDRAW_USDT}
                                    />
                                    <p className="text-xs text-text-muted mt-1">
                                        Reserved value: ₹{((parseFloat(withdrawAmount) || 0) * USDT_RATE).toFixed(2)}
                                    </p>
                                </div>

                                <div>
                                    <label className="form-label">BSC Wallet Address</label>
                                    <input
                                        type="text"
                                        value={withdrawAddress}
                                        onChange={(e) => setWithdrawAddress(e.target.value)}
                                        placeholder="0x..."
                                        className="glass-input font-mono text-sm"
                                    />
                                </div>

                                <div className="rounded-xl border border-neon-cyan/15 bg-neon-cyan/5 p-3 text-[11px] text-text-secondary">
                                    Referral income, liquidity bonus, monthly returns, and principal can all be withdrawn in USDT (BEP20).
                                </div>

                                <button type="submit" disabled={withdrawing} className="btn-glow w-full">
                                    {withdrawing ? 'Processing...' : 'Submit Withdrawal'}
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}

            {tab === 'history' && (
                <div className="space-y-3">
                    {transactions.length === 0 ? (
                        <div className="glass-card text-center py-10">
                            <ClockIcon className="w-10 h-10 mx-auto text-text-muted mb-3" />
                            <p className="text-sm text-text-muted">No transactions yet</p>
                        </div>
                    ) : (
                        transactions.map((tx: any) => {
                            const isPositive = positiveTypes.has(tx.type);
                            return (
                                <div key={tx.id} className="glass-card-flat flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', isPositive ? 'bg-neon-green/10' : 'bg-neon-red/10')}>
                                            {isPositive ? <ArrowDownTrayIcon className="w-4 h-4 text-neon-green" /> : <ArrowUpTrayIcon className="w-4 h-4 text-neon-red" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">{getTransactionLabel(tx.type)}</p>
                                            <p className="text-[10px] text-text-muted">{dayjs(tx.created_at).format('DD MMM YY, HH:mm')}</p>
                                            {tx.notes && <p className="text-[10px] text-text-muted mt-0.5">{tx.notes}</p>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={clsx('text-sm font-bold', isPositive ? 'text-neon-green' : 'text-neon-red')}>
                                            {isPositive ? '+' : '-'}₹{Number(tx.amount).toFixed(2)}
                                        </p>
                                        {statusBadge(tx.status)}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
