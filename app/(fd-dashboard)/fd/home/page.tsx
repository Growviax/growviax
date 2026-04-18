'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    BanknotesIcon,
    ShieldCheckIcon,
    SparklesIcon,
    ArrowTrendingUpIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';

export default function FDHomePage() {
    const [user, setUser] = useState<any>(null);
    const [settings, setSettings] = useState<any>({ usdtRate: 98, lockMonths: 6 });

    useEffect(() => {
        axios.get('/api/fd/user')
            .then((res) => {
                setUser(res.data.user);
                setSettings(res.data.settings || { usdtRate: 98, lockMonths: 6 });
            })
            .catch(() => { });
    }, []);

    const features = [
        {
            icon: BanknotesIcon,
            title: 'Starter Stacking Pool',
            desc: 'Invest 50 to below 1000 USDT and earn 5% monthly.',
            color: '#00ff88',
        },
        {
            icon: ShieldCheckIcon,
            title: 'Elite Stacking Pool',
            desc: 'Invest 1000 USDT or more and earn 6% monthly.',
            color: '#00d4ff',
        },
        {
            icon: SparklesIcon,
            title: '5% Referral Income',
            desc: 'Direct sponsor gets one-time 5% income on the first stacking package.',
            color: '#fbbf24',
        },
        {
            icon: ArrowTrendingUpIcon,
            title: '1% Liquidity Bonus',
            desc: 'Referrer gets 1% monthly from the referee active stacking package.',
            color: '#38bdf8',
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight">
                    Welcome{user ? `, ${user.name}` : ''}
                </h1>
                <p className="text-xs text-text-muted mt-1">Growviax Stacking Profit</p>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl border border-glass-border"
                style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.08) 0%, rgba(0,255,136,0.06) 50%, rgba(251,191,36,0.05) 100%)' }}
            >
                <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-neon-cyan/10 blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-neon-green/10 blur-3xl" />
                <div className="relative p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <span
                            className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold"
                            style={{ background: 'rgba(0,212,255,0.15)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.2)' }}
                        >
                            Growviax Stacking Profit
                        </span>
                    </div>

                    <h2 className="text-xl font-extrabold mb-2">USDT stacking with fixed monthly returns</h2>
                    <p className="text-text-secondary text-sm mb-5 leading-relaxed">
                        Build your package with <span className="text-neon-green font-bold">USDT (BEP20)</span>,
                        earn <span className="text-neon-cyan font-bold">5% to 6% monthly</span>,
                        and unlock principal after <span className="text-warning font-bold">{settings.lockMonths} months</span>.
                    </p>

                    <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="inner-card text-center py-3">
                            <p className="text-xs text-text-muted mb-1">Starter</p>
                            <p className="text-lg font-extrabold text-neon-green">5%</p>
                        </div>
                        <div className="inner-card text-center py-3">
                            <p className="text-xs text-text-muted mb-1">Elite</p>
                            <p className="text-lg font-extrabold text-neon-cyan">6%</p>
                        </div>
                        <div className="inner-card text-center py-3">
                            <p className="text-xs text-text-muted mb-1">Lock</p>
                            <p className="text-lg font-extrabold text-warning">{settings.lockMonths}M</p>
                        </div>
                    </div>

                    <Link href="/fd/invest" className="btn-glow w-full text-center block text-sm">
                        Start Stacking Now
                    </Link>
                </div>
            </motion.div>

            {user && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card flex items-center justify-between"
                >
                    <div>
                        <p className="text-text-muted text-xs mb-1">Available Wallet Balance</p>
                        <p className="text-xl font-extrabold neon-text">₹{Number(user.wallet_balance || 0).toFixed(2)}</p>
                        <p className="text-[11px] text-text-muted mt-1">≈ {Number(user.wallet_balance_usdt || 0).toFixed(2)} USDT</p>
                    </div>
                    <Link href="/fd/assets" className="btn-outline text-xs py-2 px-4">
                        Deposit / Withdraw
                    </Link>
                </motion.div>
            )}

            <div className="space-y-3">
                <h3 className="text-base font-bold text-text-secondary">Plan Highlights</h3>
                {features.map(({ icon: Icon, title, desc, color }, index) => (
                    <motion.div
                        key={title}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + index * 0.08 }}
                        className="glass-card flex items-start gap-4"
                    >
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: `${color}15`, border: `1px solid ${color}25` }}
                        >
                            <Icon className="w-5 h-5" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold mb-0.5">{title}</p>
                            <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="rounded-2xl border border-warning/20 bg-warning/5 p-5">
                <h3 className="text-sm font-bold text-warning mb-3 flex items-center gap-2">
                    <ClockIcon className="w-4 h-4" /> Important Notes
                </h3>
                <ul className="space-y-2 text-xs text-text-secondary">
                    <li className="flex items-start gap-2"><span className="text-warning">•</span> Deposit and withdrawal are only available in USDT (BEP20).</li>
                    <li className="flex items-start gap-2"><span className="text-warning">•</span> Fixed FD rate for conversion is ₹{settings.usdtRate} per USDT.</li>
                    <li className="flex items-start gap-2"><span className="text-warning">•</span> Principal remains locked for {settings.lockMonths} months and returns to wallet on maturity.</li>
                    <li className="flex items-start gap-2"><span className="text-warning">•</span> Referral income is one-time 5%, while liquidity bonus is 1% monthly.</li>
                    <li className="flex items-start gap-2"><span className="text-warning">•</span> There is no 1-year profit sharing in this section anymore.</li>
                </ul>
            </div>
        </div>
    );
}
