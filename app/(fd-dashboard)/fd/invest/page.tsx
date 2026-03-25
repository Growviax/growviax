'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
    BanknotesIcon, ShieldCheckIcon, CheckCircleIcon,
    ExclamationTriangleIcon, ArrowPathIcon,
} from '@heroicons/react/24/outline';

export default function FDInvestPage() {
    const [user, setUser] = useState<any>(null);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [fdResult, setFdResult] = useState<any>(null);

    useEffect(() => {
        axios.get('/api/fd/user').then(res => setUser(res.data.user)).catch(() => { });
    }, []);

    const handleInvest = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(amount);
        if (!amt || amt < 1000) return toast.error('Minimum investment is ₹1,000');
        if (amt > 50000) return toast.error('Maximum investment is ₹50,000');

        setLoading(true);
        try {
            const res = await axios.post('/api/fd/invest', { amount: amt });
            toast.success(res.data.message);
            setFdResult(res.data.fd);
            setSuccess(true);
            // Refresh user data
            const userRes = await axios.get('/api/fd/user');
            setUser(userRes.data.user);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Investment failed');
        } finally { setLoading(false); }
    };

    const quickAmounts = [1000, 5000, 10000, 25000, 50000];
    const amt = parseFloat(amount) || 0;
    const monthlyReturn = amt * 0.05;
    const totalReturn = amt * 0.10;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight">Create FD Investment</h1>
                <p className="text-xs text-text-muted mt-1">Lock your funds and earn guaranteed returns</p>
            </div>

            {success && fdResult ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="glass-card text-center py-10">
                    <div className="w-16 h-16 rounded-full bg-neon-green/15 flex items-center justify-center mx-auto mb-5">
                        <CheckCircleIcon className="w-9 h-9 text-neon-green" />
                    </div>
                    <h3 className="text-lg font-bold text-neon-green mb-2">Investment Created!</h3>
                    <p className="text-sm text-text-secondary mb-4">
                        ₹{Number(fdResult.amount).toLocaleString()} locked for {fdResult.durationDays} days
                    </p>
                    <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto mb-6">
                        <div className="inner-card text-center py-3">
                            <p className="text-[10px] text-text-muted">Monthly Return</p>
                            <p className="text-sm font-bold text-neon-green">{fdResult.monthlyRate}%</p>
                        </div>
                        <div className="inner-card text-center py-3">
                            <p className="text-[10px] text-text-muted">End Date</p>
                            <p className="text-sm font-bold">{fdResult.endDate}</p>
                        </div>
                    </div>
                    <button onClick={() => { setSuccess(false); setAmount(''); setFdResult(null); }}
                        className="btn-outline text-sm px-8">
                        Make Another Investment
                    </button>
                </motion.div>
            ) : (
                <>
                    {/* Balance Card */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="glass-card flex items-center justify-between">
                        <div>
                            <p className="text-text-muted text-xs mb-1">Available Balance</p>
                            <p className="text-xl font-extrabold neon-text">₹{Number(user?.wallet_balance || 0).toFixed(2)}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-neon-green/10 flex items-center justify-center">
                            <BanknotesIcon className="w-5 h-5 text-neon-green" />
                        </div>
                    </motion.div>

                    {/* Investment Form */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <form onSubmit={handleInvest} className="glass-card space-y-5">
                            <div className="flex items-center gap-2 mb-1">
                                <ShieldCheckIcon className="w-5 h-5 text-neon-cyan" />
                                <p className="text-sm font-semibold text-text-secondary">Investment Amount</p>
                            </div>

                            <div>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-green font-bold text-lg">₹</span>
                                    <input
                                        type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                                        placeholder="Enter amount" className="glass-input text-xl font-bold pl-8"
                                        min="1000" max="50000" step="100"
                                    />
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <p className="text-[10px] text-text-muted">
                                        Min: <span className="text-neon-green font-medium">₹1,000</span>
                                    </p>
                                    <p className="text-[10px] text-text-muted">
                                        Max: <span className="text-neon-green font-medium">₹50,000</span>
                                    </p>
                                </div>
                            </div>

                            {/* Quick Amount Buttons */}
                            <div className="flex gap-1.5">
                                {quickAmounts.map((qa) => (
                                    <button key={qa} type="button" onClick={() => setAmount(String(qa))}
                                        className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all border ${amount === String(qa)
                                            ? 'bg-neon-cyan/12 text-neon-cyan border-neon-cyan/20'
                                            : 'bg-glass text-text-muted border-transparent hover:text-text-secondary hover:border-glass-border'}`}>
                                        ₹{qa >= 1000 ? `${qa / 1000}K` : qa}
                                    </button>
                                ))}
                            </div>

                            {/* Returns Preview */}
                            {amt >= 1000 && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                    className="rounded-xl border border-neon-cyan/15 bg-neon-cyan/5 p-4 space-y-2">
                                    <p className="text-xs font-bold text-neon-cyan mb-2">📊 Estimated Returns</p>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-text-muted">Monthly Return (5%)</span>
                                        <span className="text-neon-green font-bold">₹{monthlyReturn.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-text-muted">Total Phase 1 (10%)</span>
                                        <span className="text-neon-green font-bold">₹{totalReturn.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-text-muted">After 60 days you get</span>
                                        <span className="text-neon-cyan font-bold">₹{(amt + totalReturn).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs border-t border-glass-border pt-2 mt-2">
                                        <span className="text-text-muted">+ Profit Sharing</span>
                                        <span className="text-neon-purple font-bold">12 months</span>
                                    </div>
                                </motion.div>
                            )}

                            <button type="submit" disabled={loading || amt < 1000 || amt > 50000}
                                className="btn-glow w-full text-sm flex items-center justify-center gap-2">
                                {loading ? (
                                    <><ArrowPathIcon className="w-4 h-4 animate-spin" /> Processing...</>
                                ) : (
                                    `Invest ₹${amt >= 1000 ? amt.toLocaleString() : '...'}`
                                )}
                            </button>
                        </form>
                    </motion.div>

                    {/* Warning */}
                    <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4">
                        <div className="flex items-start gap-2">
                            <ExclamationTriangleIcon className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                            <div className="text-[11px] text-text-secondary space-y-1">
                                <p>Your principal will be <span className="text-warning font-bold">locked for 60 days</span>.</p>
                                <p>5% profit is credited monthly to your wallet.</p>
                                <p>After completion, you'll be eligible for <span className="text-neon-purple font-bold">1 year profit sharing</span>.</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
