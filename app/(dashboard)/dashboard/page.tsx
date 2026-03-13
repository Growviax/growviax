'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import {
    ArrowUpIcon, ArrowDownIcon, ClipboardDocumentIcon,
    UserGroupIcon, ArrowTrendingUpIcon, MagnifyingGlassIcon,
    BoltIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface DashboardData { user: any; referralStats: { totalReferred: number; totalEarnings: number }; recentTrades: any[]; openTickets: number; }
interface Coin { id: string; symbol: string; name: string; image: string; current_price: number; price_change_percentage_24h: number; }

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [coins, setCoins] = useState<Coin[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [dashRes, coinsRes] = await Promise.all([
                axios.get('/api/dashboard'),
                axios.get('/api/market/coins?per_page=8'),
            ]);
            setData(dashRes.data);
            setCoins(coinsRes.data.coins || []);
        } catch (error) { console.error('Dashboard fetch error:', error); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const copy = (text: string, label: string) => { navigator.clipboard.writeText(text); toast.success(`${label} copied!`); };

    const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
    const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } } };

    if (loading) return (
        <div className="space-y-5">
            <div className="skeleton h-12 w-40" />
            <div className="skeleton h-44 w-full" />
            <div className="grid grid-cols-2 gap-4"><div className="skeleton h-28" /><div className="skeleton h-28" /></div>
            <div className="skeleton h-64 w-full" />
        </div>
    );

    const user = data?.user;
    const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?invite=${user?.referral_code}`;

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 pb-6">
            {/* Greeting */}
            <motion.div variants={item} className="flex items-center justify-between">
                <div>
                    <p className="text-text-muted text-xs uppercase tracking-widest font-medium mb-1">Welcome back</p>
                    <h1 className="text-2xl font-extrabold tracking-tight">{user?.name || 'User'}</h1>
                </div>
                <Link href="/profile">
                    <div className="w-11 h-11 rounded-2xl bg-neon-green/12 flex items-center justify-center border border-neon-green/15 hover:bg-neon-green/20 transition-all">
                        <span className="text-neon-green font-bold text-sm">{user?.name?.charAt(0) || 'U'}</span>
                    </div>
                </Link>
            </motion.div>

            {/* Wallet Card */}
            <motion.div variants={item}
                className="relative overflow-hidden rounded-3xl border border-glass-border"
                style={{
                    background: 'linear-gradient(135deg, rgba(0,255,136,0.08) 0%, rgba(0,212,255,0.04) 50%, rgba(168,85,247,0.04) 100%)',
                }}
            >
                <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-neon-green/8 blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-neon-cyan/6 blur-3xl" />
                <div className="relative p-6 sm:p-7">
                    <div className="flex items-center justify-between mb-5">
                        <p className="text-text-secondary text-sm font-medium">Total Balance</p>
                        <span className="badge-success">INR</span>
                    </div>
                    <p className="stat-value neon-text mb-1">
                        ₹{parseFloat(user?.wallet_balance || 0).toFixed(2)}
                    </p>
                    <div className="flex gap-3">
                        <Link href="/assets" className="btn-glow flex-1 text-center text-sm py-3">Deposit</Link>
                        <Link href="/assets?tab=withdraw" className="btn-outline flex-1 text-center text-sm py-3">Withdraw</Link>
                    </div>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div variants={item} className="grid grid-cols-2 gap-4">
                <div className="glass-card p-5 text-center">
                    <div className="w-10 h-10 mx-auto mb-3 rounded-2xl bg-neon-cyan/10 flex items-center justify-center">
                        <UserGroupIcon className="w-5 h-5 text-neon-cyan" />
                    </div>
                    <p className="stat-value text-xl neon-text-cyan">{data?.referralStats.totalReferred || 0}</p>
                    <p className="text-[11px] text-text-muted mt-1 uppercase tracking-wider">Referrals</p>
                </div>
                <div className="glass-card p-5 text-center">
                    <div className="w-10 h-10 mx-auto mb-3 rounded-2xl bg-neon-green/10 flex items-center justify-center">
                        <BoltIcon className="w-5 h-5 text-neon-green" />
                    </div>
                    <p className="stat-value text-xl neon-text">₹{parseFloat(String(data?.referralStats.totalEarnings || 0)).toFixed(2)}</p>
                    <p className="text-[11px] text-text-muted mt-1 uppercase tracking-wider">Commission</p>
                </div>
            </motion.div>

            {/* Referral Card */}
            <motion.div variants={item} className="glass-card">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-sm">Refer & Earn</h2>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider">3% Commission</span>
                </div>
                <div className="inner-card flex items-center justify-between mb-3">
                    <div>
                        <p className="text-[10px] text-text-muted uppercase tracking-wider">Your Code</p>
                        <p className="text-base font-mono font-bold mt-0.5">{user?.referral_code}</p>
                    </div>
                    <button onClick={() => copy(user?.referral_code || '', 'Code')} className="btn-ghost px-3 py-2">
                        <ClipboardDocumentIcon className="w-4 h-4" />
                    </button>
                </div>
                <button onClick={() => copy(referralLink, 'Link')} className="btn-outline w-full text-sm py-3">
                    Copy Referral Link
                </button>
            </motion.div>

            {/* Recent Trades */}
            <motion.div variants={item} className="glass-card">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-bold text-sm flex items-center gap-2">
                        <ArrowTrendingUpIcon className="w-4 h-4 text-neon-green" /> Recent Trades
                    </h2>
                    <Link href="/market" className="text-[11px] text-neon-green hover:text-neon-green-dim font-medium flex items-center gap-1 transition-colors">
                        View All <ChevronRightIcon className="w-3 h-3" />
                    </Link>
                </div>
                {data?.recentTrades && data.recentTrades.length > 0 ? (
                    <div className="space-y-2.5">
                        {data.recentTrades.map((trade: any, i: number) => (
                            <div key={i} className="inner-card flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center', trade.direction === 'up' ? 'bg-up' : 'bg-down')}>
                                        {trade.direction === 'up' ? <ArrowUpIcon className="w-4 h-4 text-neon-green" /> : <ArrowDownIcon className="w-4 h-4 text-neon-red" />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase">{trade.coin_id}</p>
                                        <p className="text-[11px] text-text-muted">
                                            <span className={clsx('font-semibold mr-1', trade.direction === 'up' ? 'text-neon-green' : 'text-neon-red')}>
                                                {trade.direction === 'up' ? '↑ UP' : '↓ DOWN'}
                                            </span>
                                            {dayjs(trade.created_at).format('MMM D, HH:mm')}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold">₹{parseFloat(trade.amount).toFixed(2)}</p>
                                    <span className={clsx('text-[11px] font-medium', trade.status === 'won' ? 'text-neon-green' : trade.status === 'lost' ? 'text-neon-red' : 'text-warning')}>
                                        {trade.status === 'won' ? `+₹${parseFloat(trade.payout).toFixed(2)}` : trade.status === 'lost' ? 'Lost' : 'Pending'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <ArrowTrendingUpIcon className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-40" />
                        <p className="text-sm text-text-muted">No trades yet</p>
                        <Link href="/market" className="text-xs text-neon-green hover:underline mt-1 inline-block">Start Trading →</Link>
                    </div>
                )}
            </motion.div>

            {/* Trending Coins */}
            <motion.div variants={item} className="glass-card">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-bold text-sm flex items-center gap-2">
                        <BoltIcon className="w-4 h-4 text-warning" /> Trending
                    </h2>
                    <Link href="/market" className="text-[11px] text-neon-green hover:text-neon-green-dim font-medium flex items-center gap-1 transition-colors">
                        See All <ChevronRightIcon className="w-3 h-3" />
                    </Link>
                </div>
                <div className="space-y-1">
                    {coins.slice(0, 6).map((coin) => (
                        <Link key={coin.id} href={`/trade/${coin.id}`}>
                            <div className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-glass-hover transition-all duration-200 group">
                                <div className="flex items-center gap-3">
                                    {coin.image ? (
                                        <Image src={coin.image} alt={coin.name} width={32} height={32} className="rounded-full" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-glass flex items-center justify-center text-xs font-bold uppercase">{coin.symbol?.charAt(0)}</div>
                                    )}
                                    <div>
                                        <p className="text-sm font-semibold group-hover:text-neon-green transition-colors">{coin.name}</p>
                                        <p className="text-[11px] text-text-muted uppercase">{coin.symbol}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold">${coin.current_price?.toLocaleString() || '—'}</p>
                                    {coin.price_change_percentage_24h !== null && (
                                        <p className={clsx('text-[11px] font-medium', coin.price_change_percentage_24h >= 0 ? 'text-neon-green' : 'text-neon-red')}>
                                            {coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h?.toFixed(2)}%
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
}
