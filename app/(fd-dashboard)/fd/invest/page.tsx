'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
    BanknotesIcon,
    ShieldCheckIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/outline';

const DEFAULT_SETTINGS = {
    usdtRate: 98,
    lockMonths: 6,
    starterMinUsdt: 50,
    eliteMinUsdt: 1000,
    starterMonthlyRate: 5,
    eliteMonthlyRate: 6,
};

export default function FDInvestPage() {
    const [user, setUser] = useState<any>(null);
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [amountUsdt, setAmountUsdt] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [fdResult, setFdResult] = useState<any>(null);

    useEffect(() => {
        axios.get('/api/fd/user')
            .then((res) => {
                setUser(res.data.user);
                setSettings((prev) => ({ ...prev, ...(res.data.settings || {}) }));
            })
            .catch(() => { });
    }, []);

    const amount = parseFloat(amountUsdt) || 0;
    const isElite = amount >= settings.eliteMinUsdt;
    const isStarter = amount >= settings.starterMinUsdt && amount < settings.eliteMinUsdt;
    const selectedPackage = isElite
        ? { name: 'Elite Stacking Pool', rate: settings.eliteMonthlyRate }
        : isStarter
            ? { name: 'Starter Stacking Pool', rate: settings.starterMonthlyRate }
            : null;
    const amountInr = amount * settings.usdtRate;
    const monthlyReturnUsdt = selectedPackage ? amount * (selectedPackage.rate / 100) : 0;
    const monthlyReturnInr = monthlyReturnUsdt * settings.usdtRate;
    const totalReturnUsdt = monthlyReturnUsdt * settings.lockMonths;
    const totalReturnInr = totalReturnUsdt * settings.usdtRate;

    const handleInvest = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedPackage) {
            return toast.error(`Minimum investment is ${settings.starterMinUsdt} USDT`);
        }

        setLoading(true);
        try {
            const res = await axios.post('/api/fd/invest', { amountUsdt: amount });
            toast.success(res.data.message);
            setFdResult(res.data.fd);
            setSuccess(true);

            const userRes = await axios.get('/api/fd/user');
            setUser(userRes.data.user);
            setSettings((prev) => ({ ...prev, ...(userRes.data.settings || {}) }));
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Investment failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight">Create Stacking Package</h1>
                <p className="text-xs text-text-muted mt-1">Choose a USDT package and lock it for {settings.lockMonths} months</p>
            </div>

            {success && fdResult ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card text-center py-10">
                    <div className="w-16 h-16 rounded-full bg-neon-green/15 flex items-center justify-center mx-auto mb-5">
                        <CheckCircleIcon className="w-9 h-9 text-neon-green" />
                    </div>
                    <h3 className="text-lg font-bold text-neon-green mb-2">Package Activated</h3>
                    <p className="text-sm text-text-secondary mb-4">
                        {fdResult.packageName} with {Number(fdResult.amountUsdt).toFixed(2)} USDT
                    </p>
                    <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mb-6">
                        <div className="inner-card text-center py-3">
                            <p className="text-[10px] text-text-muted">Monthly Return</p>
                            <p className="text-sm font-bold text-neon-green">{fdResult.monthlyRate}%</p>
                        </div>
                        <div className="inner-card text-center py-3">
                            <p className="text-[10px] text-text-muted">Unlock Date</p>
                            <p className="text-sm font-bold">{fdResult.endDate}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setSuccess(false);
                            setAmountUsdt('');
                            setFdResult(null);
                        }}
                        className="btn-outline text-sm px-8"
                    >
                        Create Another Package
                    </button>
                </motion.div>
            ) : (
                <>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card flex items-center justify-between">
                        <div>
                            <p className="text-text-muted text-xs mb-1">Available Balance</p>
                            <p className="text-xl font-extrabold neon-text">₹{Number(user?.wallet_balance || 0).toFixed(2)}</p>
                            <p className="text-[11px] text-text-muted mt-1">≈ {Number(user?.wallet_balance_usdt || 0).toFixed(2)} USDT</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-neon-green/10 flex items-center justify-center">
                            <BanknotesIcon className="w-5 h-5 text-neon-green" />
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <form onSubmit={handleInvest} className="glass-card space-y-5">
                            <div className="flex items-center gap-2 mb-1">
                                <ShieldCheckIcon className="w-5 h-5 text-neon-cyan" />
                                <p className="text-sm font-semibold text-text-secondary">USDT Package Amount</p>
                            </div>

                            <div>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-green font-bold text-lg">$</span>
                                    <input
                                        type="number"
                                        value={amountUsdt}
                                        onChange={(e) => setAmountUsdt(e.target.value)}
                                        placeholder="Enter USDT amount"
                                        className="glass-input text-xl font-bold pl-8"
                                        min={settings.starterMinUsdt}
                                        step="1"
                                    />
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <p className="text-[10px] text-text-muted">
                                        Starter: <span className="text-neon-green font-medium">{settings.starterMinUsdt} to below {settings.eliteMinUsdt} USDT</span>
                                    </p>
                                    <p className="text-[10px] text-text-muted">
                                        Elite: <span className="text-neon-cyan font-medium">{settings.eliteMinUsdt}+ USDT</span>
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {[50, 100, 250, 500, 1000, 2500].map((quickAmount) => (
                                    <button
                                        key={quickAmount}
                                        type="button"
                                        onClick={() => setAmountUsdt(String(quickAmount))}
                                        className={`py-2 text-xs font-semibold rounded-xl transition-all border ${amountUsdt === String(quickAmount)
                                            ? 'bg-neon-cyan/12 text-neon-cyan border-neon-cyan/20'
                                            : 'bg-glass text-text-muted border-transparent hover:text-text-secondary hover:border-glass-border'
                                            }`}
                                    >
                                        ${quickAmount}
                                    </button>
                                ))}
                            </div>

                            {selectedPackage && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="rounded-xl border border-neon-cyan/15 bg-neon-cyan/5 p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold text-neon-cyan">{selectedPackage.name}</p>
                                        <span className="text-[11px] font-semibold text-warning">{settings.lockMonths} months lock</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-text-muted">Investment Value</span>
                                        <span className="text-neon-green font-bold">
                                            {amount.toFixed(2)} USDT / ₹{amountInr.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-text-muted">Monthly Return ({selectedPackage.rate}%)</span>
                                        <span className="text-neon-green font-bold">
                                            {monthlyReturnUsdt.toFixed(2)} USDT / ₹{monthlyReturnInr.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-text-muted">Total {settings.lockMonths} Month Return</span>
                                        <span className="text-neon-cyan font-bold">
                                            {totalReturnUsdt.toFixed(2)} USDT / ₹{totalReturnInr.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs border-t border-glass-border pt-2 mt-2">
                                        <span className="text-text-muted">Principal Returned on Maturity</span>
                                        <span className="text-warning font-bold">{amount.toFixed(2)} USDT</span>
                                    </div>
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !selectedPackage}
                                className="btn-glow w-full text-sm flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <ArrowPathIcon className="w-4 h-4 animate-spin" /> Processing...
                                    </>
                                ) : (
                                    `Activate ${selectedPackage?.name || 'Package'}`
                                )}
                            </button>
                        </form>
                    </motion.div>

                    <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4">
                        <div className="flex items-start gap-2">
                            <ExclamationTriangleIcon className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                            <div className="text-[11px] text-text-secondary space-y-1">
                                <p>All stacking packages are funded and withdrawn only in <span className="text-warning font-bold">USDT (BEP20)</span>.</p>
                                <p>FD conversion rate is fixed at <span className="text-neon-cyan font-bold">₹{settings.usdtRate} per USDT</span>.</p>
                                <p>Direct sponsor gets <span className="text-neon-green font-bold">5% one-time referral income</span>.</p>
                                <p>Referrer also receives <span className="text-neon-cyan font-bold">1% monthly liquidity bonus</span> from the active referee package.</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
