'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import {
    BanknotesIcon,
    ChartBarSquareIcon,
    UserGroupIcon,
    CheckCircleIcon,
    ArrowTrendingUpIcon,
    CalendarDaysIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';

export default function FDDashboardPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/fd/dashboard')
            .then((res) => setData(res.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="skeleton h-12 w-40" />
                <div className="skeleton h-40 w-full" />
                <div className="skeleton h-60 w-full" />
            </div>
        );
    }

    const summary = data?.summary || {};
    const fdDeposits = data?.fdDeposits || [];
    const profitLogs = data?.profitLogs || [];
    const referralEarnings = data?.referralEarnings || [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight">Stacking Dashboard</h1>
                <p className="text-xs text-text-muted mt-1">Track your packages, returns, and referral income</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card">
                    <div className="w-8 h-8 rounded-lg bg-neon-cyan/10 flex items-center justify-center mb-2">
                        <BanknotesIcon className="w-4 h-4 text-neon-cyan" />
                    </div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Total Invested</p>
                    <p className="text-lg font-extrabold neon-text-cyan">₹{Number(summary.totalInvested || 0).toLocaleString()}</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card">
                    <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center mb-2">
                        <ArrowTrendingUpIcon className="w-4 h-4 text-neon-green" />
                    </div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Monthly Returns</p>
                    <p className="text-lg font-extrabold neon-text">₹{Number(summary.totalMonthlyEarned || 0).toLocaleString()}</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card">
                    <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center mb-2">
                        <SparklesIcon className="w-4 h-4 text-warning" />
                    </div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Referral Bonus</p>
                    <p className="text-lg font-extrabold text-warning">₹{Number(summary.totalReferralBonus || 0).toLocaleString()}</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card">
                    <div className="w-8 h-8 rounded-lg bg-neon-purple/10 flex items-center justify-center mb-2">
                        <UserGroupIcon className="w-4 h-4 text-neon-purple" />
                    </div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Liquidity Bonus</p>
                    <p className="text-lg font-extrabold neon-text-purple">₹{Number(summary.totalLiquidityBonus || 0).toLocaleString()}</p>
                </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card flex items-center justify-between">
                <div>
                    <p className="text-text-muted text-xs mb-1">Wallet Balance</p>
                    <p className="text-xl font-extrabold neon-text">₹{Number(data?.wallet_balance || 0).toFixed(2)}</p>
                    <p className="text-[11px] text-text-muted mt-1">≈ {Number(data?.wallet_balance_usdt || 0).toFixed(2)} USDT</p>
                </div>
                <div className="text-right space-y-1">
                    <p className="text-text-muted text-xs">Active Packages</p>
                    <p className="text-xl font-extrabold text-neon-cyan">{summary.activeFDCount || 0}</p>
                    <p className="text-[11px] text-text-muted">Direct referrals: {summary.directReferralCount || 0}</p>
                </div>
            </motion.div>

            <div>
                <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                    <ChartBarSquareIcon className="w-5 h-5 text-neon-cyan" />
                    Your Stacking Packages
                </h2>

                {fdDeposits.length === 0 ? (
                    <div className="glass-card text-center py-10">
                        <BanknotesIcon className="w-10 h-10 mx-auto text-text-muted mb-3" />
                        <p className="text-sm text-text-muted">No stacking packages yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {fdDeposits.map((fd: any, index: number) => {
                            const endDate = dayjs(fd.end_date);
                            const totalDays = Number(fd.duration_days || 1);
                            const termMonths = Math.max(1, Math.round(endDate.diff(dayjs(fd.start_date), 'month', true)));
                            const daysLeft = fd.status === 'active' ? Math.max(0, endDate.diff(dayjs(), 'day')) : 0;
                            const progress = fd.status === 'active'
                                ? Math.min(100, ((totalDays - daysLeft) / totalDays) * 100)
                                : 100;

                            return (
                                <motion.div
                                    key={fd.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.05 * index }}
                                    className="glass-card"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <p className="text-sm font-bold">{fd.package_name}</p>
                                            <p className="text-[10px] text-text-muted">Created {dayjs(fd.created_at).format('DD MMM YYYY')}</p>
                                        </div>
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${fd.status === 'active' ? 'bg-neon-green/10 text-neon-green' : 'bg-neon-cyan/10 text-neon-cyan'}`}>
                                            {fd.status === 'active' ? 'Active' : 'Completed'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div className="inner-card py-3 text-center">
                                            <p className="text-[10px] text-text-muted">Package Value</p>
                                            <p className="text-sm font-bold text-neon-cyan">{Number(fd.amount_usdt || 0).toFixed(2)} USDT</p>
                                            <p className="text-[10px] text-text-muted mt-1">₹{Number(fd.amount || 0).toFixed(2)}</p>
                                        </div>
                                        <div className="inner-card py-3 text-center">
                                            <p className="text-[10px] text-text-muted">Earned</p>
                                            <p className="text-sm font-bold text-neon-green">₹{Number(fd.total_earned || 0).toFixed(2)}</p>
                                            <p className="text-[10px] text-text-muted mt-1">{Number(fd.monthly_rate || 0)}% monthly</p>
                                        </div>
                                    </div>

                                    {fd.status === 'active' && (
                                        <div className="mb-3">
                                            <div className="flex justify-between text-[10px] text-text-muted mb-1">
                                                <span>{daysLeft} days remaining</span>
                                                <span>{progress.toFixed(0)}%</span>
                                            </div>
                                            <div className="h-1.5 bg-glass rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #00d4ff, #00ff88)' }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="inner-card py-2">
                                            <p className="text-[10px] text-text-muted">Unlock Date</p>
                                            <p className="text-xs font-bold">{endDate.format('DD MMM')}</p>
                                        </div>
                                        <div className="inner-card py-2">
                                            <p className="text-[10px] text-text-muted">Term</p>
                                            <p className="text-xs font-bold text-warning">{termMonths} months</p>
                                        </div>
                                        <div className="inner-card py-2">
                                            <p className="text-[10px] text-text-muted">Status</p>
                                            <p className="text-xs font-bold text-neon-cyan">{fd.status}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {profitLogs.length > 0 && (
                <div>
                    <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                        <CalendarDaysIcon className="w-5 h-5 text-neon-green" />
                        Monthly Return History
                    </h2>
                    <div className="space-y-2">
                        {profitLogs.slice(0, 12).map((log: any) => (
                            <div key={log.id} className="glass-card-flat flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-neon-green">+₹{Number(log.amount).toFixed(2)}</p>
                                    <p className="text-[10px] text-text-muted">Month {log.month_number} return</p>
                                </div>
                                <p className="text-[10px] text-text-muted">{dayjs(log.credited_at).format('DD MMM YY')}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {referralEarnings.length > 0 && (
                <div>
                    <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-warning" />
                        Referral Income History
                    </h2>
                    <div className="space-y-2">
                        {referralEarnings.slice(0, 12).map((earning: any) => (
                            <div key={earning.id} className="glass-card-flat flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-warning">+₹{Number(earning.amount).toFixed(2)}</p>
                                    <p className="text-[10px] text-text-muted">
                                        {earning.type === 'referral_bonus' ? 'One-time referral income' : `Liquidity bonus • Month ${earning.month_number || '-'}`}
                                        {earning.from_user_name ? ` • ${earning.from_user_name}` : ''}
                                    </p>
                                </div>
                                <p className="text-[10px] text-text-muted">{dayjs(earning.created_at).format('DD MMM YY')}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
