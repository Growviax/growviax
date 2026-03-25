'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ClipboardDocumentIcon, ArrowDownTrayIcon, ArrowUpTrayIcon,
    WalletIcon, BanknotesIcon, CheckCircleIcon, ClockIcon, XCircleIcon,
    ExclamationTriangleIcon, ArrowPathIcon, BoltIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import dayjs from 'dayjs';

const MIN_WITHDRAW_UPI = 500;
const MIN_WITHDRAW_USDT = 10;
const USD_TO_INR = 98;

export default function FDAssetsPage() {
    const [tab, setTab] = useState('deposit');
    const [user, setUser] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    /* Withdraw state */
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawAddress, setWithdrawAddress] = useState('');
    const [withdrawing, setWithdrawing] = useState(false);
    const [withdrawSuccess, setWithdrawSuccess] = useState(false);
    const [withdrawMethod, setWithdrawMethod] = useState<'usdt' | 'upi'>('usdt');
    const [withdrawUpiId, setWithdrawUpiId] = useState('');

    /* Deposit state */
    const [depositMethod, setDepositMethod] = useState<'usdt' | 'upi'>('usdt');
    const [depositStep, setDepositStep] = useState<'choose' | 'amount' | 'usdt_qr' | 'usdt_hash' | 'upi_pay' | 'upi_utr' | 'submitted'>('choose');
    const [preDepositAmount, setPreDepositAmount] = useState('');
    const [selectedWallet, setSelectedWallet] = useState<{ qr: string; address: string } | null>(null);
    const [depositLoading, setDepositLoading] = useState(false);
    const [txHashInput, setTxHashInput] = useState('');
    const [depositAmountInput, setDepositAmountInput] = useState('');
    const [assignedUpi, setAssignedUpi] = useState<{ upiId: string; displayName: string } | null>(null);
    const [utrInput, setUtrInput] = useState('');
    const [upiAmountInput, setUpiAmountInput] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const [userRes, txRes] = await Promise.all([
                axios.get('/api/fd/user'),
                axios.get('/api/fd/wallet/transactions'),
            ]);
            setUser(userRes.data.user);
            setTransactions(txRes.data.transactions || []);
        } catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const copyText = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied`);
    };

    const handleStartUSDT = async () => {
        setDepositLoading(true);
        try {
            const res = await axios.get('/api/fd/wallet/deposit');
            setSelectedWallet(res.data.wallet);
            setDepositStep('usdt_qr');
        } catch (e: any) { toast.error(e.response?.data?.error || 'Failed'); }
        finally { setDepositLoading(false); }
    };

    const handleSubmitUSDTHash = async () => {
        if (!txHashInput.trim()) return toast.error('Enter the transaction hash');
        if (!depositAmountInput || parseFloat(depositAmountInput) <= 0) return toast.error('Enter the deposit amount');

        setDepositLoading(true);
        try {
            await axios.post('/api/fd/wallet/deposit/submit', {
                txHash: txHashInput.trim(), walletAddress: selectedWallet?.address, amount: parseFloat(depositAmountInput),
            });
            setDepositStep('submitted');
            toast.success('Deposit submitted!');
            fetchData();
        } catch (e: any) { toast.error(e.response?.data?.error || 'Failed'); }
        finally { setDepositLoading(false); }
    };

    const handleStartUPI = async () => {
        setDepositLoading(true);
        try {
            const res = await axios.get('/api/fd/wallet/deposit/get-upi');
            setAssignedUpi({ upiId: res.data.upiId, displayName: res.data.displayName });
            setDepositStep('upi_pay');
        } catch (e: any) { toast.error(e.response?.data?.error || 'No active UPI.'); }
        finally { setDepositLoading(false); }
    };

    const handleSubmitUPIUTR = async () => {
        if (!utrInput.trim()) return toast.error('Enter UTR');
        if (!upiAmountInput || parseFloat(upiAmountInput) < 500) return toast.error('Min ₹500');

        setDepositLoading(true);
        try {
            await axios.post('/api/fd/wallet/deposit/submit-upi', {
                utrNumber: utrInput.trim(), upiId: assignedUpi?.upiId, amount: parseFloat(upiAmountInput),
            });
            setDepositStep('submitted');
            toast.success('UPI deposit submitted!');
            fetchData();
        } catch (e: any) { toast.error(e.response?.data?.error || 'Failed'); }
        finally { setDepositLoading(false); }
    };

    const handleAmountContinue = async () => {
        const amt = parseFloat(preDepositAmount);
        if (depositMethod === 'usdt') {
            if (!amt || amt < 5) return toast.error('Min $5');
            setDepositAmountInput(preDepositAmount);
            await handleStartUSDT();
        } else {
            if (!amt || amt < 500) return toast.error('Min ₹500');
            setUpiAmountInput(preDepositAmount);
            await handleStartUPI();
        }
    };

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

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(withdrawAmount);
        if (!amt || amt <= 0) return toast.error('Enter a valid amount');
        const minAmt = withdrawMethod === 'usdt' ? MIN_WITHDRAW_USDT : MIN_WITHDRAW_UPI;
        if (amt < minAmt) return toast.error(`Min ${withdrawMethod === 'usdt' ? '$' : '₹'}${minAmt}`);

        if (withdrawMethod === 'usdt' && (!withdrawAddress.trim() || !/^0x[a-fA-F0-9]{40}$/.test(withdrawAddress.trim()))) return toast.error('Invalid wallet address');
        if (withdrawMethod === 'upi' && (!withdrawUpiId.trim() || !withdrawUpiId.includes('@'))) return toast.error('Invalid UPI ID');

        setWithdrawing(true);
        try {
            await axios.post('/api/fd/wallet/withdraw', {
                amount: amt, withdrawMethod,
                walletAddress: withdrawMethod === 'usdt' ? withdrawAddress.trim() : null,
                upiId: withdrawMethod === 'upi' ? withdrawUpiId.trim() : null,
            });
            setWithdrawSuccess(true);
            setWithdrawAmount('');
            setWithdrawAddress('');
            setWithdrawUpiId('');
            fetchData();
            setTimeout(() => setWithdrawSuccess(false), 5000);
        } catch (e: any) { toast.error(e.response?.data?.error || 'Failed'); }
        finally { setWithdrawing(false); }
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
            <div className="skeleton h-64 w-full" />
        </div>
    );

    const tabs = ['deposit', 'withdraw', 'history'] as const;

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight">Assets</h1>
                    <p className="text-xs text-text-muted mt-1">FD Wallet Management</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-neon-cyan/10 flex items-center justify-center">
                    <WalletIcon className="w-5 h-5 text-neon-cyan" />
                </div>
            </div>

            {/* Balance */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl border border-glass-border"
                style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.06), rgba(168,85,247,0.04))' }}>
                <div className="relative p-6">
                    <p className="text-text-secondary text-sm font-medium mb-2">FD Wallet Balance</p>
                    <p className="stat-value neon-text mb-1">₹{Number(user?.wallet_balance || 0).toFixed(2)}</p>
                    <span className="badge-info mt-1">INR</span>
                </div>
            </motion.div>

            {/* Tabs */}
            <div className="flex gap-1.5 p-1.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                {tabs.map((t) => (
                    <button key={t} onClick={() => setTab(t)}
                        className={clsx('flex-1 py-3 text-sm font-semibold rounded-xl transition-all capitalize',
                            tab === t ? 'bg-neon-cyan/12 text-neon-cyan shadow-sm' : 'text-text-muted hover:text-text-secondary')}>
                        {t}
                    </button>
                ))}
            </div>

            {/* DEPOSIT TAB */}
            {tab === 'deposit' && (
                <AnimatePresence mode="wait">
                    {depositStep === 'choose' && (
                        <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                            <div className="glass-card text-center">
                                <ArrowDownTrayIcon className="w-10 h-10 text-neon-cyan mx-auto mb-3" />
                                <h3 className="text-base font-bold mb-1">Deposit Funds</h3>
                                <p className="text-xs text-text-muted">Choose your deposit method</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => { setDepositMethod('usdt'); setPreDepositAmount(''); setDepositStep('amount'); }}
                                    className="glass-card flex flex-col items-center gap-3 py-6 hover:border-neon-cyan/30 transition-all">
                                    <div className="w-14 h-14 rounded-2xl bg-neon-cyan/10 flex items-center justify-center">
                                        <WalletIcon className="w-7 h-7 text-neon-cyan" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold">USDT</p>
                                        <p className="text-[10px] text-text-muted">BEP20 (BSC)</p>
                                    </div>
                                </button>
                                <button onClick={() => { setDepositMethod('upi'); setPreDepositAmount(''); setDepositStep('amount'); }}
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

                    {depositStep === 'amount' && (
                        <motion.div key="amount" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="glass-card space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <button onClick={resetDeposit} className="btn-ghost p-2 text-xs">Back</button>
                                    <p className="text-sm font-bold flex-1 text-center">{depositMethod === 'usdt' ? 'USDT' : 'UPI'} Deposit</p>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-green font-bold">{depositMethod === 'usdt' ? '$' : '₹'}</span>
                                    <input type="number" value={preDepositAmount} onChange={(e) => setPreDepositAmount(e.target.value)}
                                        placeholder={depositMethod === 'usdt' ? 'e.g. 50' : 'e.g. 5000'}
                                        className="glass-input text-lg font-semibold pl-7" min={depositMethod === 'usdt' ? 5 : 500} autoFocus />
                                </div>
                                <div className="flex gap-1.5">
                                    {(depositMethod === 'usdt' ? [5, 10, 25, 50, 100] : [500, 1000, 2000, 5000, 10000]).map((amt) => (
                                        <button key={amt} type="button" onClick={() => setPreDepositAmount(String(amt))}
                                            className={clsx('flex-1 py-2 text-xs font-semibold rounded-xl border transition-all',
                                                preDepositAmount === String(amt) ? 'bg-neon-green/12 text-neon-green border-neon-green/20' : 'bg-glass text-text-muted border-transparent')}>
                                            {depositMethod === 'usdt' ? `$${amt}` : `₹${amt.toLocaleString()}`}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={handleAmountContinue} disabled={depositLoading} className="btn-glow w-full text-sm">
                                    {depositLoading ? 'Loading...' : 'Continue to Payment'}
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
                                        <p className="text-[11px] text-text-secondary">Send only <span className="text-neon-orange font-semibold">USDT (BEP20)</span> to this address.</p>
                                    </div>
                                </div>
                                <button onClick={() => setDepositStep('usdt_hash')} className="btn-glow w-full mt-5 text-sm flex items-center justify-center gap-2">
                                    <BoltIcon className="w-4 h-4" /> I&apos;ve Sent — Submit Hash
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
                                <div>
                                    <label className="form-label">Deposit Amount (USD)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-green font-bold">$</span>
                                        <input type="number" value={depositAmountInput} onChange={(e) => setDepositAmountInput(e.target.value)}
                                            placeholder="e.g. 50" className="glass-input text-sm pl-7" min="1" />
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label">Transaction Hash</label>
                                    <input type="text" value={txHashInput} onChange={(e) => setTxHashInput(e.target.value)}
                                        placeholder="0x..." className="glass-input text-sm font-mono" />
                                </div>
                                <button onClick={handleSubmitUSDTHash} disabled={depositLoading} className="btn-glow w-full text-sm">
                                    {depositLoading ? 'Submitting...' : 'Submit Deposit Request'}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {depositStep === 'upi_pay' && assignedUpi && (
                        <motion.div key="upi_pay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="glass-card">
                                <div className="flex items-center gap-2 mb-5">
                                    <button onClick={resetDeposit} className="btn-ghost p-2 text-xs">Back</button>
                                    <p className="text-sm font-bold flex-1 text-center">UPI Deposit</p>
                                </div>
                                <div className="inner-card mb-4 text-center">
                                    <p className="text-[11px] text-text-muted mb-2">Send payment to this UPI ID</p>
                                    <p className="text-lg font-bold text-neon-green font-mono">{assignedUpi.upiId}</p>
                                    <p className="text-[11px] text-text-muted mt-1">{assignedUpi.displayName}</p>
                                    <button onClick={() => copyText(assignedUpi.upiId, 'UPI ID')} className="btn-ghost mt-3 text-xs flex items-center gap-1.5 mx-auto">
                                        <ClipboardDocumentIcon className="w-3.5 h-3.5" /> Copy UPI ID
                                    </button>
                                </div>
                                <button onClick={() => setDepositStep('upi_utr')} className="btn-glow w-full text-sm flex items-center justify-center gap-2">
                                    <BoltIcon className="w-4 h-4" /> I&apos;ve Paid — Submit UTR
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {depositStep === 'upi_utr' && assignedUpi && (
                        <motion.div key="upi_utr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="glass-card space-y-4">
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setDepositStep('upi_pay')} className="btn-ghost p-2 text-xs">Back</button>
                                    <p className="text-sm font-bold flex-1 text-center">Submit UTR Number</p>
                                </div>
                                <div>
                                    <label className="form-label">Amount Paid (INR)</label>
                                    <input type="number" value={upiAmountInput} onChange={(e) => setUpiAmountInput(e.target.value)}
                                        placeholder="e.g. 5000" className="glass-input text-sm" min="500" />
                                </div>
                                <div>
                                    <label className="form-label">UTR Number (12 digits)</label>
                                    <input type="text" value={utrInput} onChange={(e) => setUtrInput(e.target.value.replace(/\D/g, '').slice(0, 12))}
                                        placeholder="123456789012" className="glass-input text-sm font-mono" maxLength={12} />
                                </div>
                                <button onClick={handleSubmitUPIUTR} disabled={depositLoading} className="btn-glow w-full text-sm">
                                    {depositLoading ? 'Submitting...' : 'Submit UPI Deposit'}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {depositStep === 'submitted' && (
                        <motion.div key="submitted" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            className="glass-card text-center py-10">
                            <div className="w-16 h-16 rounded-full bg-neon-green/15 flex items-center justify-center mx-auto mb-5">
                                <CheckCircleIcon className="w-9 h-9 text-neon-green" />
                            </div>
                            <h3 className="text-lg font-bold text-neon-green mb-2">Request Submitted!</h3>
                            <p className="text-sm text-text-secondary">Your deposit is being reviewed.</p>
                            <button onClick={resetDeposit} className="btn-outline text-sm px-8 mt-6">Make Another Deposit</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}

            {/* WITHDRAW TAB */}
            {tab === 'withdraw' && (
                <AnimatePresence mode="wait">
                    {withdrawSuccess ? (
                        <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card text-center py-12">
                            <div className="w-16 h-16 rounded-full bg-neon-green/15 flex items-center justify-center mx-auto mb-5">
                                <CheckCircleIcon className="w-9 h-9 text-neon-green" />
                            </div>
                            <h3 className="text-lg font-bold text-neon-green mb-2">Withdrawal Submitted</h3>
                            <p className="text-sm text-text-secondary">Will be processed within 24 hours.</p>
                        </motion.div>
                    ) : (
                        <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <form onSubmit={handleWithdraw} className="glass-card space-y-5">
                                <div className="flex items-center gap-2 mb-1">
                                    <ArrowUpTrayIcon className="w-5 h-5 text-neon-cyan" />
                                    <p className="text-sm font-semibold text-text-secondary">Withdraw Funds</p>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => setWithdrawMethod('usdt')}
                                        className={clsx('py-3 rounded-xl text-sm font-semibold border-2 flex items-center justify-center gap-2',
                                            withdrawMethod === 'usdt' ? 'bg-neon-cyan/12 text-neon-cyan border-neon-cyan/30' : 'bg-glass text-text-muted border-transparent')}>
                                        <WalletIcon className="w-4 h-4" /> USDT
                                    </button>
                                    <button type="button" onClick={() => setWithdrawMethod('upi')}
                                        className={clsx('py-3 rounded-xl text-sm font-semibold border-2 flex items-center justify-center gap-2',
                                            withdrawMethod === 'upi' ? 'bg-neon-green/12 text-neon-green border-neon-green/30' : 'bg-glass text-text-muted border-transparent')}>
                                        <BanknotesIcon className="w-4 h-4" /> UPI
                                    </button>
                                </div>

                                <div>
                                    <label className="form-label">{withdrawMethod === 'usdt' ? 'Amount ($)' : 'Amount (₹)'}</label>
                                    <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)}
                                        placeholder={withdrawMethod === 'usdt' ? '10.00' : '1000.00'}
                                        className="glass-input text-lg font-semibold" step="0.01"
                                        min={withdrawMethod === 'usdt' ? MIN_WITHDRAW_USDT : MIN_WITHDRAW_UPI} />
                                    <p className="text-xs text-text-muted mt-1">
                                        Available: <span className="text-neon-green font-medium">₹{Number(user?.wallet_balance || 0).toFixed(2)}</span>
                                    </p>
                                </div>

                                {withdrawMethod === 'usdt' && (
                                    <div>
                                        <label className="form-label">Wallet Address (BSC)</label>
                                        <input type="text" value={withdrawAddress} onChange={(e) => setWithdrawAddress(e.target.value)}
                                            placeholder="0x..." className="glass-input font-mono text-sm" />
                                    </div>
                                )}

                                {withdrawMethod === 'upi' && (
                                    <div>
                                        <label className="form-label">UPI ID</label>
                                        <input type="text" value={withdrawUpiId} onChange={(e) => setWithdrawUpiId(e.target.value)}
                                            placeholder="yourname@upi" className="glass-input text-sm" />
                                    </div>
                                )}

                                <button type="submit" disabled={withdrawing} className="btn-glow w-full">
                                    {withdrawing ? 'Processing...' : `Withdraw via ${withdrawMethod === 'usdt' ? 'USDT' : 'UPI'}`}
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}

            {/* HISTORY TAB */}
            {tab === 'history' && (
                <div className="space-y-3">
                    {transactions.length === 0 ? (
                        <div className="glass-card text-center py-10">
                            <ClockIcon className="w-10 h-10 mx-auto text-text-muted mb-3" />
                            <p className="text-sm text-text-muted">No transactions yet</p>
                        </div>
                    ) : (
                        transactions.map((tx: any) => (
                            <div key={tx.id} className="glass-card-flat flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center',
                                        tx.type === 'deposit' || tx.type === 'fd_return' || tx.type === 'fd_profit' || tx.type === 'profit_share' ? 'bg-neon-green/10' : 'bg-neon-red/10')}>
                                        {tx.type === 'withdrawal' ? <ArrowUpTrayIcon className="w-4 h-4 text-neon-red" /> : <ArrowDownTrayIcon className="w-4 h-4 text-neon-green" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold capitalize">{tx.type.replace(/_/g, ' ')}</p>
                                        <p className="text-[10px] text-text-muted">{dayjs(tx.created_at).format('DD MMM YY, HH:mm')}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={clsx('text-sm font-bold',
                                        tx.type === 'withdrawal' || tx.type === 'fd_invest' ? 'text-neon-red' : 'text-neon-green')}>
                                        {tx.type === 'withdrawal' || tx.type === 'fd_invest' ? '-' : '+'}₹{Number(tx.amount).toFixed(2)}
                                    </p>
                                    {statusBadge(tx.status)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
