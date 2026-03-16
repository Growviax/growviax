'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
    UserGroupIcon, CurrencyDollarIcon, ArrowTrendingUpIcon,
    ClipboardDocumentIcon, GiftIcon, ChartBarIcon,
    ChevronRightIcon, BoltIcon, BanknotesIcon, StarIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import dayjs from 'dayjs';

export default function PromotionPage() {
    const [user, setUser] = useState<any>(null);
    const [referrals, setReferrals] = useState<any[]>([]);
    const [earnings, setEarnings] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [incomeFilter, setIncomeFilter] = useState('all');

    const fetchData = useCallback(async () => {
        try {
            const [userRes, dashRes, earningsRes] = await Promise.all([
                axios.get('/api/user'),
                axios.get('/api/dashboard'),
                axios.get('/api/referral/earnings?limit=50'),
            ]);
            setUser(userRes.data.user);
            setStats(dashRes.data.referralStats);
            setReferrals(dashRes.data.recentTrades || []);
            setEarnings(earningsRes.data.earnings || []);
        } catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const copy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied!`);
    };

    const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?invite=${user?.referral_code}`;

    const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
    const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

    // Calculate income breakdowns from earnings
    const referralBonus = earnings.filter(e => e.type === 'referral_bonus').reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const tradingCommission = earnings.filter(e => e.type === 'commission').reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const ibBonus = earnings.filter(e => e.type === 'ib_bonus' || e.type === 'salary').reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const totalIncome = referralBonus + tradingCommission + ibBonus;

    const filteredEarnings = incomeFilter === 'all'
        ? earnings
        : incomeFilter === 'ib_bonus'
            ? earnings.filter(e => e.type === 'ib_bonus' || e.type === 'salary')
            : earnings.filter(e => e.type === incomeFilter);

    if (loading) return (
        <div className="space-y-4">
            <div className="skeleton h-12 w-40" />
            <div className="skeleton h-32 w-full" />
            <div className="grid grid-cols-2 gap-3"><div className="skeleton h-24" /><div className="skeleton h-24" /></div>
            <div className="skeleton h-44 w-full" />
        </div>
    );

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 pb-6">
            {/* Header */}
            <motion.div variants={item} className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight">Promotion</h1>
                    <p className="text-xs text-text-muted mt-1">Refer & Earn rewards</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-neon-purple/12 flex items-center justify-center">
                    <GiftIcon className="w-5 h-5 text-neon-purple" />
                </div>
            </motion.div>

            {/* Total Income Card */}
            <motion.div variants={item}
                className="relative overflow-hidden rounded-3xl border border-glass-border"
                style={{
                    background: 'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(0,255,136,0.04) 50%, rgba(0,212,255,0.04) 100%)',
                }}
            >
                <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-neon-purple/8 blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-neon-green/6 blur-3xl" />
                <div className="relative p-6">
                    <p className="text-text-secondary text-sm font-medium mb-2">Total Income</p>
                    <p className="stat-value neon-text text-3xl mb-1">₹{totalIncome.toFixed(2)}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="badge-success">Active Partner</span>
                    </div>
                </div>
            </motion.div>

            {/* Income Stats Grid */}
            <motion.div variants={item} className="grid grid-cols-2 gap-3">
                {[
                    { label: 'Referral Bonus', value: referralBonus, icon: GiftIcon, color: 'neon-green' },
                    { label: 'Trading Commission', value: tradingCommission, icon: ChartBarIcon, color: 'neon-cyan' },
                    { label: 'Daily IB Bonus', value: ibBonus, icon: BoltIcon, color: 'warning' },
                    { label: 'Direct Team', value: stats?.totalReferred || 0, icon: UserGroupIcon, color: 'neon-purple', isMember: true },
                ].map((stat) => (
                    <div key={stat.label} className="glass-card p-4 text-center">
                        <div className={`w-9 h-9 mx-auto mb-2.5 rounded-xl bg-${stat.color}/10 flex items-center justify-center`}>
                            <stat.icon className={`w-4.5 h-4.5 text-${stat.color}`} />
                        </div>
                        <p className={`text-lg font-extrabold text-${stat.color}`}>
                            {stat.isMember ? stat.value : `₹${stat.value.toFixed(2)}`}
                        </p>
                        <p className="text-[10px] text-text-muted mt-0.5 uppercase tracking-wider">{stat.label}</p>
                    </div>
                ))}
            </motion.div>

            {/* Referral Link Card */}
            <motion.div variants={item} className="glass-card">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-sm flex items-center gap-2">
                        <StarIcon className="w-4 h-4 text-warning" /> Refer & Earn
                    </h2>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider">3% Commission</span>
                </div>
                <div className="inner-card flex items-center justify-between mb-3">
                    <div>
                        <p className="text-[10px] text-text-muted uppercase tracking-wider">Your Referral Code</p>
                        <p className="text-lg font-mono font-extrabold mt-0.5 text-neon-green">{user?.referral_code}</p>
                    </div>
                    <button onClick={() => copy(user?.referral_code || '', 'Code')} className="btn-ghost px-3 py-2">
                        <ClipboardDocumentIcon className="w-5 h-5" />
                    </button>
                </div>
                <button onClick={() => copy(referralLink, 'Referral link')} className="btn-glow w-full text-sm py-3">
                    Copy Referral Link
                </button>
            </motion.div>

            {/* Income Details */}
            <motion.div variants={item} className="glass-card">
                <h2 className="font-bold text-sm flex items-center gap-2 mb-4">
                    <BanknotesIcon className="w-4 h-4 text-neon-cyan" /> Income Details
                </h2>
                <div className="space-y-2.5">
                    {[
                        { label: 'Referral Bonus', value: referralBonus, desc: '3% of referred users trade amount', color: 'neon-green' },
                        { label: 'Trading Commission', value: tradingCommission, desc: '6-level deep commission structure', color: 'neon-cyan' },
                        { label: 'Daily IB Bonus', value: ibBonus, desc: 'Introducing broker daily bonus', color: 'warning' },
                    ].map((inc) => (
                        <div key={inc.label} className="inner-card flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold">{inc.label}</p>
                                <p className="text-[11px] text-text-muted mt-0.5">{inc.desc}</p>
                            </div>
                            <p className={`text-sm font-bold text-${inc.color}`}>₹{inc.value.toFixed(2)}</p>
                        </div>
                    ))}
                    <div className="inner-card flex items-center justify-between border-neon-green/15 bg-neon-green/5">
                        <div>
                            <p className="text-sm font-bold text-neon-green">Total Income</p>
                        </div>
                        <p className="text-base font-extrabold text-neon-green">₹{totalIncome.toFixed(2)}</p>
                    </div>
                </div>
            </motion.div>

            {/* IB Income Detailed History */}
            <motion.div variants={item} className="glass-card">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-sm flex items-center gap-2">
                        <ArrowTrendingUpIcon className="w-4 h-4 text-neon-cyan" /> Income History
                    </h2>
                    <span className="text-[11px] text-text-muted">{earnings.length} records</span>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-1.5 mb-4 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {[
                        { key: 'all', label: 'All' },
                        { key: 'referral_bonus', label: 'Referral' },
                        { key: 'commission', label: 'Commission' },
                        { key: 'ib_bonus', label: 'IB Bonus' },
                    ].map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setIncomeFilter(f.key)}
                            className={clsx(
                                'flex-1 py-2 text-[11px] font-semibold rounded-lg transition-all capitalize',
                                incomeFilter === f.key ? 'bg-neon-green/12 text-neon-green' : 'text-text-muted hover:text-text-secondary'
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {filteredEarnings.length > 0 ? (
                    <div className="space-y-2">
                        {filteredEarnings.map((e: any, i: number) => {
                            const isReferral = e.type === 'referral_bonus';
                            const isCommission = e.type === 'commission';
                            const isIB = e.type === 'ib_bonus' || e.type === 'salary';
                            const color = isReferral ? 'neon-green' : isCommission ? 'neon-cyan' : 'warning';
                            const label = isReferral ? 'Referral Bonus' : isCommission ? `L${e.level || '?'} Commission` : 'Daily IB Bonus';

                            return (
                                <div key={i} className="inner-card">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-8 h-8 rounded-xl bg-${color}/10 flex items-center justify-center`}>
                                                <span className={`text-xs font-bold text-${color}`}>
                                                    {e.from_user_name?.charAt(0) || (isIB ? '★' : '?')}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold">{label}</p>
                                                <p className="text-[10px] text-text-muted">
                                                    {e.from_user_name ? `From: ${e.from_user_name}` : 'System'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-bold text-${color}`}>+₹{parseFloat(e.amount).toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-1.5 border-t border-glass-border">
                                        <p className="text-[10px] text-text-muted">
                                            {dayjs(e.created_at).format('MMM D, YYYY • HH:mm:ss')}
                                        </p>
                                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-${color}/10 text-${color}`}>
                                            {isReferral ? 'REFERRAL' : isCommission ? 'COMMISSION' : 'IB BONUS'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <BanknotesIcon className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-40" />
                        <p className="text-sm text-text-muted">No income records yet</p>
                        <p className="text-xs text-text-muted mt-1">Earnings will appear here when your referrals are active</p>
                    </div>
                )}
            </motion.div>

            {/* Direct Team Members */}
            <motion.div variants={item} className="glass-card">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-sm flex items-center gap-2">
                        <UserGroupIcon className="w-4 h-4 text-neon-purple" /> Direct Team
                    </h2>
                    <span className="text-[11px] text-text-muted">{stats?.totalReferred || 0} members</span>
                </div>
                {earnings.filter(e => e.type === 'referral_bonus').length > 0 ? (
                    <div className="space-y-2">
                        {earnings.filter(e => e.type === 'referral_bonus').slice(0, 10).map((e: any, i: number) => (
                            <div key={i} className="inner-card flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-neon-purple/10 flex items-center justify-center">
                                        <span className="text-xs font-bold text-neon-purple">
                                            {e.from_user_name?.charAt(0) || '?'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold">{e.from_user_name || 'User'}</p>
                                        <p className="text-[11px] text-text-muted">{dayjs(e.created_at).format('MMM D, HH:mm')}</p>
                                    </div>
                                </div>
                                <p className="text-sm font-bold text-neon-green">+₹{parseFloat(e.amount).toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <UserGroupIcon className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-40" />
                        <p className="text-sm text-text-muted">No team members yet</p>
                        <p className="text-xs text-text-muted mt-1">Share your referral link to build your team</p>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
