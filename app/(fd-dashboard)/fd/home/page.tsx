'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    BanknotesIcon, ShieldCheckIcon, SparklesIcon, ArrowTrendingUpIcon,
    ChevronRightIcon, ClockIcon,
} from '@heroicons/react/24/outline';

export default function FDHomePage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        axios.get('/api/fd/user').then(res => setUser(res.data.user)).catch(() => { });
    }, []);

    const features = [
        { icon: BanknotesIcon, title: '5% Monthly Returns', desc: 'Guaranteed 5% per month for 2 months on your investment', color: '#00ff88' },
        { icon: ShieldCheckIcon, title: 'Capital Safe', desc: 'Withdraw your full capital after 60 days completion', color: '#00d4ff' },
        { icon: SparklesIcon, title: '1 Year Profit Sharing', desc: 'Even after withdrawal, earn from company profit sharing', color: '#a855f7' },
        { icon: ArrowTrendingUpIcon, title: 'Dynamic Returns', desc: 'Profit sharing is based on actual company performance', color: '#fbbf24' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight">
                    Welcome{user ? `, ${user.name}` : ''} 👋
                </h1>
                <p className="text-xs text-text-muted mt-1">GrowViax FD Investment Platform</p>
            </div>

            {/* Hero Card */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl border border-glass-border"
                style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.08) 0%, rgba(168,85,247,0.06) 50%, rgba(0,255,136,0.04) 100%)' }}
            >
                <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-neon-cyan/10 blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-neon-purple/10 blur-3xl" />
                <div className="relative p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold"
                            style={{ background: 'rgba(0,212,255,0.15)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.2)' }}>
                            FD + Profit Sharing
                        </span>
                    </div>
                    <h2 className="text-xl font-extrabold mb-2">Fixed Deposit + 1 Year Profit Sharing</h2>
                    <p className="text-text-secondary text-sm mb-5 leading-relaxed">
                        Invest ₹1,000 - ₹50,000 and earn <span className="text-neon-green font-bold">5% monthly</span> for 2 months.
                        After completion, enjoy <span className="text-neon-purple font-bold">1 year of profit sharing</span>.
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="inner-card text-center py-3">
                            <p className="text-xs text-text-muted mb-1">Monthly</p>
                            <p className="text-lg font-extrabold text-neon-green">5%</p>
                        </div>
                        <div className="inner-card text-center py-3">
                            <p className="text-xs text-text-muted mb-1">Total</p>
                            <p className="text-lg font-extrabold text-neon-cyan">10%</p>
                        </div>
                        <div className="inner-card text-center py-3">
                            <p className="text-xs text-text-muted mb-1">Duration</p>
                            <p className="text-lg font-extrabold text-neon-purple">60d</p>
                        </div>
                    </div>

                    <Link href="/fd/invest" className="btn-glow w-full text-center block text-sm">
                        Start Investing Now →
                    </Link>
                </div>
            </motion.div>

            {/* Wallet Balance */}
            {user && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="glass-card flex items-center justify-between">
                    <div>
                        <p className="text-text-muted text-xs mb-1">Your Wallet Balance</p>
                        <p className="text-xl font-extrabold neon-text">₹{Number(user.wallet_balance || 0).toFixed(2)}</p>
                    </div>
                    <Link href="/fd/assets" className="btn-outline text-xs py-2 px-4">
                        Deposit / Withdraw
                    </Link>
                </motion.div>
            )}

            {/* Features */}
            <div className="space-y-3">
                <h3 className="text-base font-bold text-text-secondary">Plan Highlights</h3>
                {features.map(({ icon: Icon, title, desc, color }, i) => (
                    <motion.div key={title} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }}
                        className="glass-card flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                            <Icon className="w-5 h-5" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold mb-0.5">{title}</p>
                            <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Important Notes */}
            <div className="rounded-2xl border border-warning/20 bg-warning/5 p-5">
                <h3 className="text-sm font-bold text-warning mb-3 flex items-center gap-2">
                    <ClockIcon className="w-4 h-4" /> Important Notes
                </h3>
                <ul className="space-y-2 text-xs text-text-secondary">
                    <li className="flex items-start gap-2"><span className="text-warning">•</span> Investment range: ₹1,000 to ₹50,000</li>
                    <li className="flex items-start gap-2"><span className="text-warning">•</span> Principal is locked for 60 days during Phase 1</li>
                    <li className="flex items-start gap-2"><span className="text-warning">•</span> After completion, you can withdraw full capital</li>
                    <li className="flex items-start gap-2"><span className="text-warning">•</span> Profit sharing is variable, depends on company performance</li>
                    <li className="flex items-start gap-2"><span className="text-warning">•</span> Wallet must remain ACTIVE for profit sharing eligibility</li>
                </ul>
            </div>
        </div>
    );
}
