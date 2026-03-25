'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import {
    BanknotesIcon, ChartBarSquareIcon, SparklesIcon, CheckCircleIcon,
    ClockIcon, ArrowTrendingUpIcon, CalendarDaysIcon,
} from '@heroicons/react/24/outline';

export default function FDDashboardPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/fd/dashboard')
            .then(res => setData(res.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="space-y-4">
            <div className="skeleton h-12 w-40" />
            <div className="skeleton h-40 w-full" />
            <div className="skeleton h-60 w-full" />
        </div>
    );

    const s = data?.summary || {};
    const fdDeposits = data?.fdDeposits || [];
    const profitShares = data?.profitShares || [];

    const phaseLabel = (phase: string) => {
        switch (phase) {
            case 'phase1_active': return { text: 'Phase 1 – Active', color: 'text-neon-green', bg: 'bg-neon-green/10' };
            case 'phase1_completed': return { text: 'Phase 1 – Completed', color: 'text-neon-cyan', bg: 'bg-neon-cyan/10' };
            case 'phase2_sharing': return { text: 'Phase 2 – Sharing', color: 'text-neon-purple', bg: 'bg-neon-purple/10' };
            case 'expired': return { text: 'Expired', color: 'text-text-muted', bg: 'bg-glass' };
            default: return { text: phase, color: 'text-text-muted', bg: 'bg-glass' };
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight">FD Dashboard</h1>
                <p className="text-xs text-text-muted mt-1">Track your investments & earnings</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-neon-cyan/10 flex items-center justify-center">
                            <BanknotesIcon className="w-4 h-4 text-neon-cyan" />
                        </div>
                    </div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Total Invested</p>
                    <p className="text-lg font-extrabold neon-text-cyan">₹{Number(s.totalInvested || 0).toLocaleString()}</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center">
                            <ArrowTrendingUpIcon className="w-4 h-4 text-neon-green" />
                        </div>
                    </div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Total Earned</p>
                    <p className="text-lg font-extrabold neon-text">₹{Number(s.totalEarned || 0).toLocaleString()}</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-neon-purple/10 flex items-center justify-center">
                            <SparklesIcon className="w-4 h-4 text-neon-purple" />
                        </div>
                    </div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Profit Sharing</p>
                    <p className="text-lg font-extrabold neon-text-purple">₹{Number(s.totalProfitShareEarned || 0).toLocaleString()}</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                            <CalendarDaysIcon className="w-4 h-4 text-warning" />
                        </div>
                    </div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Last Month Profit</p>
                    <p className="text-lg font-extrabold text-warning">₹{Number(s.lastMonthProfit || 0).toLocaleString()}</p>
                </motion.div>
            </div>

            {/* Balance */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="glass-card flex items-center justify-between">
                <div>
                    <p className="text-text-muted text-xs mb-1">Wallet Balance</p>
                    <p className="text-xl font-extrabold neon-text">₹{Number(data?.wallet_balance || 0).toFixed(2)}</p>
                </div>
                <div className="text-right">
                    <p className="text-text-muted text-xs mb-1">Active FDs</p>
                    <p className="text-xl font-extrabold text-neon-cyan">{s.activeFDCount || 0}</p>
                </div>
            </motion.div>

            {/* FD Deposits List */}
            <div>
                <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                    <ChartBarSquareIcon className="w-5 h-5 text-neon-cyan" />
                    Your FD Investments
                </h2>

                {fdDeposits.length === 0 ? (
                    <div className="glass-card text-center py-10">
                        <BanknotesIcon className="w-10 h-10 mx-auto text-text-muted mb-3" />
                        <p className="text-sm text-text-muted">No FD investments yet</p>
                        <p className="text-xs text-text-muted mt-1">Start investing to see your FDs here</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {fdDeposits.map((fd: any, i: number) => {
                            const pl = phaseLabel(fd.phase);
                            const daysLeft = fd.phase === 'phase1_active' ? Math.max(0, dayjs(fd.end_date).diff(dayjs(), 'day')) : 0;
                            const progress = fd.phase === 'phase1_active' ? Math.min(100, ((fd.duration_days - daysLeft) / fd.duration_days) * 100) : 100;

                            return (
                                <motion.div key={fd.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.05 * i }} className="glass-card">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${pl.bg} ${pl.color}`}>
                                            {pl.text}
                                        </span>
                                        <span className="text-[10px] text-text-muted">
                                            {dayjs(fd.created_at).format('DD MMM YYYY')}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <p className="text-xs text-text-muted">Invested Amount</p>
                                            <p className="text-lg font-extrabold text-neon-cyan">₹{Number(fd.amount).toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-text-muted">Earned</p>
                                            <p className="text-lg font-extrabold text-neon-green">₹{Number(fd.total_earned).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {fd.phase === 'phase1_active' && (
                                        <div className="mb-3">
                                            <div className="flex justify-between text-[10px] text-text-muted mb-1">
                                                <span>{daysLeft} days remaining</span>
                                                <span>{progress.toFixed(0)}%</span>
                                            </div>
                                            <div className="h-1.5 bg-glass rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #00d4ff, #00ff88)' }} />
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="inner-card py-2">
                                            <p className="text-[10px] text-text-muted">Rate</p>
                                            <p className="text-xs font-bold text-neon-green">{fd.monthly_rate}%/mo</p>
                                        </div>
                                        <div className="inner-card py-2">
                                            <p className="text-[10px] text-text-muted">End Date</p>
                                            <p className="text-xs font-bold">{dayjs(fd.end_date).format('DD MMM')}</p>
                                        </div>
                                        <div className="inner-card py-2">
                                            <p className="text-[10px] text-text-muted">Sharing Till</p>
                                            <p className="text-xs font-bold text-neon-purple">
                                                {fd.profit_sharing_expiry ? dayjs(fd.profit_sharing_expiry).format('MMM YY') : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Profit Sharing History */}
            {profitShares.length > 0 && (
                <div>
                    <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-neon-purple" />
                        Profit Sharing History
                    </h2>
                    <div className="space-y-2">
                        {profitShares.map((ps: any) => (
                            <div key={ps.id} className="glass-card-flat flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-neon-purple">+₹{Number(ps.amount).toFixed(2)}</p>
                                    <p className="text-[10px] text-text-muted">{ps.distribution_month} • Share: {Number(ps.share_percentage).toFixed(2)}%</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-text-muted">{dayjs(ps.created_at).format('DD MMM YY')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
