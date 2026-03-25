'use client';

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
    UsersIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, BanknotesIcon,
    SparklesIcon, AdjustmentsHorizontalIcon, LifebuoyIcon,
    MagnifyingGlassIcon, CheckCircleIcon, XCircleIcon, ClockIcon,
    ChevronLeftIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import dayjs from 'dayjs';

type FDTab = 'fd_users' | 'fd_deposits' | 'fd_withdrawals' | 'fd_plans' | 'fd_profit' | 'fd_settings';

export default function FDAdminPanel() {
    const [tab, setTab] = useState<FDTab>('fd_users');
    const [loading, setLoading] = useState(false);

    /* Users */
    const [fdUsers, setFdUsers] = useState<any[]>([]);
    const [fdUserSearch, setFdUserSearch] = useState('');
    const [fdUserPage, setFdUserPage] = useState(1);
    const [fdUserTotal, setFdUserTotal] = useState(0);

    /* Deposits */
    const [fdDeposits, setFdDeposits] = useState<any[]>([]);
    const [fdDepositStatus, setFdDepositStatus] = useState('pending');

    /* Withdrawals */
    const [fdWithdrawals, setFdWithdrawals] = useState<any[]>([]);
    const [fdWithdrawStatus, setFdWithdrawStatus] = useState('pending');

    /* Plans */
    const [fdPlans, setFdPlans] = useState<any[]>([]);

    /* Profit */
    const [profitData, setProfitData] = useState<any>(null);
    const [companyProfit, setCompanyProfit] = useState('');
    const [distPercent, setDistPercent] = useState('');
    const [adminNotes, setAdminNotes] = useState('');
    const [distributing, setDistributing] = useState(false);

    /* Settings */
    const [fdSettings, setFdSettings] = useState<Record<string, string>>({});

    const [processing, setProcessing] = useState(false);

    /* Adjust modal */
    const [showAdjust, setShowAdjust] = useState(false);
    const [adjustUserId, setAdjustUserId] = useState(0);
    const [adjustAmount, setAdjustAmount] = useState('');

    const fetchFdUsers = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/fd/users', { params: { page: fdUserPage, search: fdUserSearch } });
            setFdUsers(res.data.users || []);
            setFdUserTotal(res.data.total || 0);
        } catch { } finally { setLoading(false); }
    }, [fdUserPage, fdUserSearch]);

    const fetchFdDeposits = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/fd/deposits', { params: { status: fdDepositStatus } });
            setFdDeposits(res.data.deposits || []);
        } catch { } finally { setLoading(false); }
    }, [fdDepositStatus]);

    const fetchFdWithdrawals = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/fd/transactions', { params: { status: fdWithdrawStatus } });
            setFdWithdrawals(res.data.transactions || []);
        } catch { } finally { setLoading(false); }
    }, [fdWithdrawStatus]);

    const fetchFdPlans = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/fd/plans');
            setFdPlans(res.data.plans || []);
        } catch { } finally { setLoading(false); }
    }, []);

    const fetchProfit = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/fd/profit');
            setProfitData(res.data);
        } catch { } finally { setLoading(false); }
    }, []);

    const fetchSettings = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/fd/settings');
            setFdSettings(res.data.settings || {});
        } catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => {
        setLoading(true);
        if (tab === 'fd_users') fetchFdUsers();
        else if (tab === 'fd_deposits') fetchFdDeposits();
        else if (tab === 'fd_withdrawals') fetchFdWithdrawals();
        else if (tab === 'fd_plans') fetchFdPlans();
        else if (tab === 'fd_profit') fetchProfit();
        else if (tab === 'fd_settings') fetchSettings();
    }, [tab, fetchFdUsers, fetchFdDeposits, fetchFdWithdrawals, fetchFdPlans, fetchProfit, fetchSettings]);

    const handleUserAction = async (userId: number, action: string, value: any) => {
        setProcessing(true);
        try {
            await axios.patch('/api/admin/fd/users', { userId, action, value });
            toast.success('Updated');
            fetchFdUsers();
        } catch (e: any) { toast.error(e.response?.data?.error || 'Failed'); }
        finally { setProcessing(false); }
    };

    const handleDepositAction = async (requestId: number, action: string) => {
        setProcessing(true);
        try {
            await axios.patch('/api/admin/fd/deposits', { requestId, action });
            toast.success(action === 'approve' ? 'Deposit approved & credited' : 'Deposit rejected');
            fetchFdDeposits();
        } catch (e: any) { toast.error(e.response?.data?.error || 'Failed'); }
        finally { setProcessing(false); }
    };

    const handleWithdrawAction = async (transactionId: number, action: string) => {
        setProcessing(true);
        try {
            await axios.patch('/api/admin/fd/transactions', { transactionId, action });
            toast.success('Updated');
            fetchFdWithdrawals();
        } catch (e: any) { toast.error(e.response?.data?.error || 'Failed'); }
        finally { setProcessing(false); }
    };

    const handleDistribute = async () => {
        if (!companyProfit || !distPercent) return toast.error('Fill all fields');
        setDistributing(true);
        try {
            const res = await axios.post('/api/admin/fd/profit', {
                companyProfit: parseFloat(companyProfit),
                distributionPercentage: parseFloat(distPercent),
                adminNotes,
            });
            toast.success(res.data.message);
            setCompanyProfit(''); setDistPercent(''); setAdminNotes('');
            fetchProfit();
        } catch (e: any) { toast.error(e.response?.data?.error || 'Failed'); }
        finally { setDistributing(false); }
    };

    const handleSaveSetting = async (key: string, val: string) => {
        try {
            await axios.patch('/api/admin/fd/settings', { settings: { [key]: val } });
            toast.success('Setting saved');
            fetchSettings();
        } catch { toast.error('Failed'); }
    };

    const handleBalanceAdjust = async () => {
        if (!adjustAmount) return toast.error('Enter amount');
        await handleUserAction(adjustUserId, 'adjust_balance', adjustAmount);
        setShowAdjust(false); setAdjustAmount('');
    };

    const tabs: { key: FDTab; label: string; icon: any }[] = [
        { key: 'fd_users', label: 'FD Users', icon: UsersIcon },
        { key: 'fd_deposits', label: 'Deposits', icon: ArrowDownTrayIcon },
        { key: 'fd_withdrawals', label: 'Withdrawals', icon: ArrowUpTrayIcon },
        { key: 'fd_plans', label: 'FD Plans', icon: BanknotesIcon },
        { key: 'fd_profit', label: 'Profit Sharing', icon: SparklesIcon },
        { key: 'fd_settings', label: 'Settings', icon: AdjustmentsHorizontalIcon },
    ];

    return (
        <div className="space-y-5">
            {/* FD Sub-tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl sm:flex sm:gap-1 sm:overflow-x-auto sm:no-scrollbar"
                style={{ background: 'rgba(0,212,255,0.03)' }}>
                {tabs.map((t) => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={clsx('flex min-w-0 items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap',
                            tab === t.key ? 'bg-neon-cyan/12 text-neon-cyan' : 'text-text-muted hover:text-text-secondary')}>
                        <t.icon className="w-4 h-4" /> {t.label}
                    </button>
                ))}
            </div>

            {/* ═══ FD USERS ═══ */}
            {tab === 'fd_users' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input type="text" value={fdUserSearch}
                            onChange={(e) => { setFdUserSearch(e.target.value); setFdUserPage(1); }}
                            placeholder="Search FD users..." className="glass-input pl-11 text-sm py-2.5" />
                    </div>
                    <div className="space-y-2">
                        {fdUsers.map((u) => (
                            <div key={u.id} className="inner-card">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold truncate">{u.name}</p>
                                        <p className="text-[11px] text-text-muted truncate">{u.email} • #{u.id}</p>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <p className="text-sm font-bold text-neon-green">₹{Number(u.wallet_balance).toFixed(2)}</p>
                                        <p className="text-[10px] text-text-muted">Deposited: ₹{Number(u.total_deposited).toFixed(0)}</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5 text-[10px]">
                                    <span className="text-text-muted">Referral: {u.referral_code}</span>
                                    <span className="text-text-muted">• Joined: {dayjs(u.created_at).format('MMM D, YY')}</span>
                                    {u.profit_sharing_enabled ? <span className="text-neon-purple">• Profit Sharing ✓</span> : <span className="text-neon-red">• Sharing Disabled</span>}
                                </div>
                                <div className="flex gap-2 mt-3">
                                    <button onClick={() => handleUserAction(u.id, 'block', !u.is_blocked)} disabled={processing}
                                        className={clsx('flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
                                            u.is_blocked ? 'bg-neon-green/10 text-neon-green' : 'bg-neon-red/10 text-neon-red')}>
                                        {u.is_blocked ? 'Unblock' : 'Block'}
                                    </button>
                                    <button onClick={() => handleUserAction(u.id, 'profit_sharing', !u.profit_sharing_enabled)} disabled={processing}
                                        className={clsx('flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
                                            u.profit_sharing_enabled ? 'bg-neon-red/10 text-neon-red' : 'bg-neon-purple/10 text-neon-purple')}>
                                        {u.profit_sharing_enabled ? 'Disable Sharing' : 'Enable Sharing'}
                                    </button>
                                    <button onClick={() => { setAdjustUserId(u.id); setShowAdjust(true); }}
                                        className="py-1.5 px-3 rounded-lg text-[11px] font-semibold bg-neon-cyan/10 text-neon-cyan">
                                        ₹ Adjust
                                    </button>
                                </div>
                            </div>
                        ))}
                        {fdUsers.length === 0 && <p className="text-sm text-text-muted text-center py-8">No FD users found</p>}
                    </div>
                    {fdUserTotal > 20 && (
                        <div className="flex items-center justify-center gap-3">
                            <button onClick={() => setFdUserPage(p => Math.max(1, p - 1))} disabled={fdUserPage === 1} className="btn-ghost p-2 disabled:opacity-30">
                                <ChevronLeftIcon className="w-4 h-4" />
                            </button>
                            <span className="text-xs text-text-muted">Page {fdUserPage}</span>
                            <button onClick={() => setFdUserPage(p => p + 1)} disabled={fdUserPage * 20 >= fdUserTotal} className="btn-ghost p-2 disabled:opacity-30">
                                <ChevronRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </motion.div>
            )}

            {/* ═══ FD DEPOSITS ═══ */}
            {tab === 'fd_deposits' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="flex gap-1">
                        {['pending', 'approved', 'rejected'].map((s) => (
                            <button key={s} onClick={() => setFdDepositStatus(s)}
                                className={clsx('px-4 py-2 rounded-xl text-xs font-semibold capitalize',
                                    fdDepositStatus === s ? 'bg-neon-cyan/12 text-neon-cyan' : 'bg-glass text-text-muted')}>
                                {s}
                            </button>
                        ))}
                    </div>
                    <div className="space-y-2">
                        {fdDeposits.map((d) => (
                            <div key={d.id} className="inner-card">
                                <div className="flex justify-between mb-2">
                                    <div>
                                        <p className="text-sm font-bold">{d.name}</p>
                                        <p className="text-[10px] text-text-muted">{d.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-neon-green">₹{Number(d.amount).toFixed(2)}</p>
                                        <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full',
                                            d.deposit_type === 'usdt' ? 'bg-neon-cyan/15 text-neon-cyan' : 'bg-neon-green/15 text-neon-green')}>
                                            {d.deposit_type?.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                {d.tx_hash && <p className="text-[10px] text-text-muted font-mono truncate">Hash: {d.tx_hash}</p>}
                                {d.utr_number && <p className="text-[10px] text-text-muted font-mono">UTR: {d.utr_number}</p>}
                                <p className="text-[10px] text-text-muted">{dayjs(d.created_at).format('MMM D, YYYY HH:mm')}</p>

                                {d.status === 'pending' && (
                                    <div className="flex gap-2 mt-3">
                                        <button onClick={() => handleDepositAction(d.id, 'approve')} disabled={processing}
                                            className="flex-1 py-2 rounded-xl text-xs font-bold bg-neon-green/15 text-neon-green hover:bg-neon-green/25">
                                            Approve & Credit
                                        </button>
                                        <button onClick={() => handleDepositAction(d.id, 'reject')} disabled={processing}
                                            className="flex-1 py-2 rounded-xl text-xs font-bold bg-neon-red/15 text-neon-red hover:bg-neon-red/25">
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {fdDeposits.length === 0 && <p className="text-sm text-text-muted text-center py-8">No deposit requests</p>}
                    </div>
                </motion.div>
            )}

            {/* ═══ FD WITHDRAWALS ═══ */}
            {tab === 'fd_withdrawals' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="flex gap-1">
                        {['pending', 'completed', 'rejected'].map((s) => (
                            <button key={s} onClick={() => setFdWithdrawStatus(s)}
                                className={clsx('px-4 py-2 rounded-xl text-xs font-semibold capitalize',
                                    fdWithdrawStatus === s ? 'bg-neon-cyan/12 text-neon-cyan' : 'bg-glass text-text-muted')}>
                                {s}
                            </button>
                        ))}
                    </div>
                    <div className="space-y-2">
                        {fdWithdrawals.map((tx) => (
                            <div key={tx.id} className="inner-card">
                                <div className="flex justify-between mb-2">
                                    <div>
                                        <p className="text-sm font-bold">{tx.name}</p>
                                        <p className="text-[10px] text-text-muted">{tx.email}</p>
                                    </div>
                                    <p className="text-sm font-bold text-neon-red">-₹{Number(tx.amount).toFixed(2)}</p>
                                </div>
                                {tx.wallet_address && <p className="text-[10px] text-text-muted font-mono truncate">To: {tx.wallet_address}</p>}
                                <p className="text-[10px] text-text-muted">{dayjs(tx.created_at).format('MMM D, YYYY HH:mm')}</p>

                                {tx.status === 'pending' && (
                                    <div className="flex gap-2 mt-3">
                                        <button onClick={() => handleWithdrawAction(tx.id, 'approve')} disabled={processing}
                                            className="flex-1 py-2 rounded-xl text-xs font-bold bg-neon-green/15 text-neon-green hover:bg-neon-green/25">
                                            Approve
                                        </button>
                                        <button onClick={() => handleWithdrawAction(tx.id, 'reject')} disabled={processing}
                                            className="flex-1 py-2 rounded-xl text-xs font-bold bg-neon-red/15 text-neon-red hover:bg-neon-red/25">
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {fdWithdrawals.length === 0 && <p className="text-sm text-text-muted text-center py-8">No withdrawals</p>}
                    </div>
                </motion.div>
            )}

            {/* ═══ FD PLANS ═══ */}
            {tab === 'fd_plans' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    {fdPlans.map((fd) => (
                        <div key={fd.id} className="inner-card">
                            <div className="flex justify-between mb-2">
                                <div>
                                    <p className="text-sm font-bold">{fd.name}</p>
                                    <p className="text-[10px] text-text-muted">{fd.email}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-neon-cyan">₹{Number(fd.amount).toLocaleString()}</p>
                                    <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full',
                                        fd.phase === 'phase1_active' ? 'bg-neon-green/15 text-neon-green' :
                                        fd.phase === 'phase2_sharing' ? 'bg-neon-purple/15 text-neon-purple' : 'bg-glass text-text-muted')}>
                                        {fd.phase.replace(/_/g, ' ')}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 text-[10px] text-text-muted">
                                <span>Rate: {fd.monthly_rate}%/mo</span>
                                <span>• Start: {dayjs(fd.start_date).format('MMM D')}</span>
                                <span>• End: {dayjs(fd.end_date).format('MMM D')}</span>
                                <span>• Earned: ₹{Number(fd.total_earned).toFixed(2)}</span>
                            </div>
                        </div>
                    ))}
                    {fdPlans.length === 0 && <p className="text-sm text-text-muted text-center py-8">No FD plans</p>}
                </motion.div>
            )}

            {/* ═══ PROFIT SHARING ═══ */}
            {tab === 'fd_profit' && profitData && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="inner-card text-center">
                            <p className="text-lg font-extrabold text-neon-purple">₹{Number(profitData.totalDistributed).toLocaleString()}</p>
                            <p className="text-[10px] text-text-muted">Total Distributed</p>
                        </div>
                        <div className="inner-card text-center">
                            <p className="text-lg font-extrabold text-neon-cyan">{profitData.eligibleCount || 0}</p>
                            <p className="text-[10px] text-text-muted">Eligible Users</p>
                        </div>
                        <div className="inner-card text-center">
                            <p className="text-lg font-extrabold text-neon-green">{profitData.distributions?.length || 0}</p>
                            <p className="text-[10px] text-text-muted">Distributions</p>
                        </div>
                    </div>

                    {/* Distribute Form */}
                    <div className="glass-card space-y-4">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                            <SparklesIcon className="w-4 h-4 text-neon-purple" /> New Distribution
                        </h3>
                        <div>
                            <label className="form-label">Company Profit (₹)</label>
                            <input type="number" value={companyProfit} onChange={(e) => setCompanyProfit(e.target.value)}
                                placeholder="e.g. 100000" className="glass-input text-sm" min="1" />
                        </div>
                        <div>
                            <label className="form-label">Distribution Percentage (%)</label>
                            <input type="number" value={distPercent} onChange={(e) => setDistPercent(e.target.value)}
                                placeholder="e.g. 30" className="glass-input text-sm" min="1" max="100" />
                        </div>
                        {companyProfit && distPercent && (
                            <div className="inner-card text-center">
                                <p className="text-xs text-text-muted">Pool Amount</p>
                                <p className="text-xl font-extrabold text-neon-purple">
                                    ₹{((parseFloat(companyProfit) || 0) * (parseFloat(distPercent) || 0) / 100).toLocaleString()}
                                </p>
                                <p className="text-[10px] text-text-muted">Will be distributed proportionally to {profitData.eligibleCount} users</p>
                            </div>
                        )}
                        <div>
                            <label className="form-label">Admin Notes (optional)</label>
                            <input type="text" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)}
                                placeholder="Optional notes" className="glass-input text-sm" />
                        </div>
                        <button onClick={handleDistribute} disabled={distributing || !companyProfit || !distPercent}
                            className="btn-glow w-full text-sm">
                            {distributing ? 'Distributing...' : `Distribute to ${profitData.eligibleCount} Users`}
                        </button>
                    </div>

                    {/* Past Distributions */}
                    {profitData.distributions?.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold mb-3">Past Distributions</h3>
                            <div className="space-y-2">
                                {profitData.distributions.map((d: any) => (
                                    <div key={d.id} className="inner-card">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm font-bold text-neon-purple">{d.distribution_month}</span>
                                            <span className="text-sm font-bold text-neon-green">₹{Number(d.pool_amount).toLocaleString()}</span>
                                        </div>
                                        <p className="text-[10px] text-text-muted">
                                            Profit: ₹{Number(d.company_profit).toLocaleString()} × {d.distribution_percentage}% → {d.eligible_users_count} users
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Eligible Users */}
                    {profitData.eligibleUsers?.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold mb-3">Eligible Users</h3>
                            <div className="space-y-2">
                                {profitData.eligibleUsers.map((u: any) => (
                                    <div key={u.fd_id} className="inner-card flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-semibold">{u.name}</p>
                                            <p className="text-[10px] text-text-muted">{u.email}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-neon-cyan">₹{Number(u.fd_amount).toLocaleString()}</p>
                                            <p className="text-[10px] text-text-muted">FD #{u.fd_id}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* ═══ SETTINGS ═══ */}
            {tab === 'fd_settings' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    {Object.entries(fdSettings).map(([key, value]) => (
                        <div key={key} className="inner-card flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold">{key.replace(/_/g, ' ')}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <input type="text" defaultValue={value} className="glass-input text-sm w-32 py-2"
                                    onBlur={(e) => { if (e.target.value !== value) handleSaveSetting(key, e.target.value); }} />
                            </div>
                        </div>
                    ))}
                </motion.div>
            )}

            {/* Balance Adjust Modal */}
            {showAdjust && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
                    <div className="glass-card w-full max-w-sm">
                        <h3 className="text-sm font-bold mb-4">Adjust Balance (User #{adjustUserId})</h3>
                        <input type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)}
                            placeholder="Enter amount (+ or -)" className="glass-input text-sm mb-4" />
                        <div className="flex gap-2">
                            <button onClick={() => setShowAdjust(false)} className="flex-1 btn-ghost">Cancel</button>
                            <button onClick={handleBalanceAdjust} className="flex-1 btn-glow text-sm">Adjust</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
