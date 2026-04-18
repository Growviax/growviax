'use client';

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
    UsersIcon,
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    BanknotesIcon,
    AdjustmentsHorizontalIcon,
    MagnifyingGlassIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    WalletIcon,
    TrashIcon,
    PlusIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import dayjs from 'dayjs';

type FDTab = 'fd_users' | 'fd_deposits' | 'fd_withdrawals' | 'fd_plans' | 'fd_settings' | 'fd_wallets';

const SETTINGS_LABELS: Record<string, string> = {
    usd_to_inr_rate: 'USDT to INR Rate',
    fd_lock_months: 'Lock Months',
    fd_referral_bonus_rate: 'Referral Bonus Rate (%)',
    fd_liquidity_bonus_rate: 'Liquidity Bonus Rate (%)',
    fd_starter_min_usdt: 'Starter Min USDT',
    fd_starter_max_usdt: 'Starter Max USDT',
    fd_starter_monthly_rate: 'Starter Monthly Rate (%)',
    fd_elite_min_usdt: 'Elite Min USDT',
    fd_elite_monthly_rate: 'Elite Monthly Rate (%)',
};

const SETTINGS_ORDER = Object.keys(SETTINGS_LABELS);

export default function FDAdminPanel() {
    const [tab, setTab] = useState<FDTab>('fd_users');
    const [processing, setProcessing] = useState(false);

    const [fdUsers, setFdUsers] = useState<any[]>([]);
    const [fdUserSearch, setFdUserSearch] = useState('');
    const [fdUserPage, setFdUserPage] = useState(1);
    const [fdUserTotal, setFdUserTotal] = useState(0);

    const [fdDeposits, setFdDeposits] = useState<any[]>([]);
    const [fdDepositStatus, setFdDepositStatus] = useState('pending');

    const [fdWithdrawals, setFdWithdrawals] = useState<any[]>([]);
    const [fdWithdrawStatus, setFdWithdrawStatus] = useState('pending');

    const [fdPlans, setFdPlans] = useState<any[]>([]);
    const [fdSettings, setFdSettings] = useState<Record<string, string>>({});

    const [fdWallets, setFdWallets] = useState<any[]>([]);
    const [newWalletAddr, setNewWalletAddr] = useState('');
    const [newWalletQr, setNewWalletQr] = useState('');
    const [newWalletName, setNewWalletName] = useState('');

    const [showAdjust, setShowAdjust] = useState(false);
    const [adjustUserId, setAdjustUserId] = useState(0);
    const [adjustAmount, setAdjustAmount] = useState('');

    const fetchFdUsers = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/fd/users', { params: { page: fdUserPage, search: fdUserSearch } });
            setFdUsers(res.data.users || []);
            setFdUserTotal(res.data.total || 0);
        } catch { }
    }, [fdUserPage, fdUserSearch]);

    const fetchFdDeposits = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/fd/deposits', { params: { status: fdDepositStatus } });
            setFdDeposits(res.data.deposits || []);
        } catch { }
    }, [fdDepositStatus]);

    const fetchFdWithdrawals = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/fd/transactions', { params: { status: fdWithdrawStatus } });
            setFdWithdrawals(res.data.transactions || []);
        } catch { }
    }, [fdWithdrawStatus]);

    const fetchFdPlans = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/fd/plans');
            setFdPlans(res.data.plans || []);
        } catch { }
    }, []);

    const fetchSettings = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/fd/settings');
            setFdSettings(res.data.settings || {});
        } catch { }
    }, []);

    const fetchFdWallets = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/fd/wallets');
            setFdWallets(res.data.wallets || []);
        } catch { }
    }, []);

    useEffect(() => {
        if (tab === 'fd_users') fetchFdUsers();
        else if (tab === 'fd_deposits') fetchFdDeposits();
        else if (tab === 'fd_withdrawals') fetchFdWithdrawals();
        else if (tab === 'fd_plans') fetchFdPlans();
        else if (tab === 'fd_settings') fetchSettings();
        else if (tab === 'fd_wallets') fetchFdWallets();
    }, [tab, fetchFdUsers, fetchFdDeposits, fetchFdWithdrawals, fetchFdPlans, fetchSettings, fetchFdWallets]);

    const handleUserAction = async (userId: number, action: string, value: any) => {
        setProcessing(true);
        try {
            await axios.patch('/api/admin/fd/users', { userId, action, value });
            toast.success('Updated');
            fetchFdUsers();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleDepositAction = async (requestId: number, action: string) => {
        setProcessing(true);
        try {
            await axios.patch('/api/admin/fd/deposits', { requestId, action });
            toast.success(action === 'approve' ? 'Deposit approved' : 'Deposit rejected');
            fetchFdDeposits();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleWithdrawAction = async (transactionId: number, action: string) => {
        setProcessing(true);
        try {
            await axios.patch('/api/admin/fd/transactions', { transactionId, action });
            toast.success(action === 'approve' ? 'Withdrawal approved' : 'Withdrawal rejected');
            fetchFdWithdrawals();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleSaveSetting = async (key: string, value: string) => {
        try {
            await axios.patch('/api/admin/fd/settings', { settings: { [key]: value } });
            toast.success('Setting saved');
            fetchSettings();
        } catch {
            toast.error('Failed');
        }
    };

    const handleBalanceAdjust = async () => {
        if (!adjustAmount) {
            return toast.error('Enter amount');
        }
        await handleUserAction(adjustUserId, 'adjust_balance', adjustAmount);
        setShowAdjust(false);
        setAdjustAmount('');
    };

    const tabs: { key: FDTab; label: string; icon: any }[] = [
        { key: 'fd_users', label: 'Users', icon: UsersIcon },
        { key: 'fd_deposits', label: 'Deposits', icon: ArrowDownTrayIcon },
        { key: 'fd_withdrawals', label: 'Withdrawals', icon: ArrowUpTrayIcon },
        { key: 'fd_plans', label: 'Packages', icon: BanknotesIcon },
        { key: 'fd_settings', label: 'Settings', icon: AdjustmentsHorizontalIcon },
        { key: 'fd_wallets', label: 'USDT Wallets', icon: WalletIcon },
    ];

    const orderedSettings = SETTINGS_ORDER
        .filter((key) => key in fdSettings)
        .map((key) => [key, fdSettings[key]] as const);

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl sm:flex sm:gap-1 sm:overflow-x-auto sm:no-scrollbar" style={{ background: 'rgba(0,212,255,0.03)' }}>
                {tabs.map((item) => (
                    <button
                        key={item.key}
                        onClick={() => setTab(item.key)}
                        className={clsx(
                            'flex min-w-0 items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap',
                            tab === item.key ? 'bg-neon-cyan/12 text-neon-cyan' : 'text-text-muted hover:text-text-secondary'
                        )}
                    >
                        <item.icon className="w-4 h-4" /> {item.label}
                    </button>
                ))}
            </div>

            {tab === 'fd_users' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                            type="text"
                            value={fdUserSearch}
                            onChange={(e) => {
                                setFdUserSearch(e.target.value);
                                setFdUserPage(1);
                            }}
                            placeholder="Search stacking users..."
                            className="glass-input pl-11 text-sm py-2.5"
                        />
                    </div>

                    <div className="space-y-2">
                        {fdUsers.map((user) => (
                            <div key={user.id} className="inner-card">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold truncate">{user.name}</p>
                                        <p className="text-[11px] text-text-muted truncate">{user.email} • #{user.id}</p>
                                        <p className="text-[10px] text-text-muted mt-1">Referral code: {user.referral_code}</p>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <p className="text-sm font-bold text-neon-green">₹{Number(user.wallet_balance).toFixed(2)}</p>
                                        <p className="text-[10px] text-text-muted">Deposited: ₹{Number(user.total_deposited).toFixed(0)}</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-1.5 text-[10px]">
                                    <span className="text-text-muted">Joined: {dayjs(user.created_at).format('MMM D, YY')}</span>
                                    {user.is_blocked ? <span className="text-neon-red">• Blocked</span> : <span className="text-neon-green">• Active</span>}
                                </div>

                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={() => handleUserAction(user.id, 'block', !user.is_blocked)}
                                        disabled={processing}
                                        className={clsx(
                                            'flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
                                            user.is_blocked ? 'bg-neon-green/10 text-neon-green' : 'bg-neon-red/10 text-neon-red'
                                        )}
                                    >
                                        {user.is_blocked ? 'Unblock' : 'Block'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setAdjustUserId(user.id);
                                            setShowAdjust(true);
                                        }}
                                        className="py-1.5 px-3 rounded-lg text-[11px] font-semibold bg-neon-cyan/10 text-neon-cyan"
                                    >
                                        ₹ Adjust
                                    </button>
                                </div>
                            </div>
                        ))}

                        {fdUsers.length === 0 && <p className="text-sm text-text-muted text-center py-8">No stacking users found</p>}
                    </div>

                    {fdUserTotal > 20 && (
                        <div className="flex items-center justify-center gap-3">
                            <button onClick={() => setFdUserPage((value) => Math.max(1, value - 1))} disabled={fdUserPage === 1} className="btn-ghost p-2 disabled:opacity-30">
                                <ChevronLeftIcon className="w-4 h-4" />
                            </button>
                            <span className="text-xs text-text-muted">Page {fdUserPage}</span>
                            <button onClick={() => setFdUserPage((value) => value + 1)} disabled={fdUserPage * 20 >= fdUserTotal} className="btn-ghost p-2 disabled:opacity-30">
                                <ChevronRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </motion.div>
            )}

            {tab === 'fd_deposits' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="flex gap-1">
                        {['pending', 'approved', 'rejected'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFdDepositStatus(status)}
                                className={clsx(
                                    'px-4 py-2 rounded-xl text-xs font-semibold capitalize',
                                    fdDepositStatus === status ? 'bg-neon-cyan/12 text-neon-cyan' : 'bg-glass text-text-muted'
                                )}
                            >
                                {status}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-2">
                        {fdDeposits.map((deposit) => (
                            <div key={deposit.id} className="inner-card">
                                <div className="flex justify-between mb-2">
                                    <div>
                                        <p className="text-sm font-bold">{deposit.name}</p>
                                        <p className="text-[10px] text-text-muted">{deposit.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-neon-green">₹{Number(deposit.amount).toFixed(2)}</p>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neon-cyan/15 text-neon-cyan">
                                            USDT
                                        </span>
                                    </div>
                                </div>

                                {deposit.tx_hash && <p className="text-[10px] text-text-muted font-mono truncate">Hash: {deposit.tx_hash}</p>}
                                <p className="text-[10px] text-text-muted">{dayjs(deposit.created_at).format('MMM D, YYYY HH:mm')}</p>

                                {deposit.status === 'pending' && (
                                    <div className="flex gap-2 mt-3">
                                        <button onClick={() => handleDepositAction(deposit.id, 'approve')} disabled={processing} className="flex-1 py-2 rounded-xl text-xs font-bold bg-neon-green/15 text-neon-green hover:bg-neon-green/25">
                                            Approve & Credit
                                        </button>
                                        <button onClick={() => handleDepositAction(deposit.id, 'reject')} disabled={processing} className="flex-1 py-2 rounded-xl text-xs font-bold bg-neon-red/15 text-neon-red hover:bg-neon-red/25">
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

            {tab === 'fd_withdrawals' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="flex gap-1">
                        {['pending', 'completed', 'rejected'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFdWithdrawStatus(status)}
                                className={clsx(
                                    'px-4 py-2 rounded-xl text-xs font-semibold capitalize',
                                    fdWithdrawStatus === status ? 'bg-neon-cyan/12 text-neon-cyan' : 'bg-glass text-text-muted'
                                )}
                            >
                                {status}
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
                                {tx.notes && <p className="text-[10px] text-text-muted mt-1">{tx.notes}</p>}
                                <p className="text-[10px] text-text-muted">{dayjs(tx.created_at).format('MMM D, YYYY HH:mm')}</p>

                                {tx.status === 'pending' && (
                                    <div className="flex gap-2 mt-3">
                                        <button onClick={() => handleWithdrawAction(tx.id, 'approve')} disabled={processing} className="flex-1 py-2 rounded-xl text-xs font-bold bg-neon-green/15 text-neon-green hover:bg-neon-green/25">
                                            Approve
                                        </button>
                                        <button onClick={() => handleWithdrawAction(tx.id, 'reject')} disabled={processing} className="flex-1 py-2 rounded-xl text-xs font-bold bg-neon-red/15 text-neon-red hover:bg-neon-red/25">
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
                                    <span className={clsx(
                                        'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                                        fd.status === 'active' ? 'bg-neon-green/15 text-neon-green' : 'bg-neon-cyan/15 text-neon-cyan'
                                    )}>
                                        {fd.status}
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
                    {fdPlans.length === 0 && <p className="text-sm text-text-muted text-center py-8">No stacking packages</p>}
                </motion.div>
            )}

            {tab === 'fd_settings' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    {orderedSettings.map(([key, value]) => (
                        <div key={key} className="inner-card flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold">{SETTINGS_LABELS[key] || key}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <input
                                    type="text"
                                    defaultValue={value}
                                    className="glass-input text-sm w-32 py-2"
                                    onBlur={(e) => {
                                        if (e.target.value !== value) handleSaveSetting(key, e.target.value);
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </motion.div>
            )}

            {tab === 'fd_wallets' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="glass-card space-y-3">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                            <PlusIcon className="w-4 h-4 text-neon-cyan" /> Add FD USDT Wallet
                        </h3>
                        <input type="text" value={newWalletAddr} onChange={(e) => setNewWalletAddr(e.target.value)} placeholder="Wallet Address (0x...)" className="glass-input text-sm font-mono" />
                        <input type="text" value={newWalletQr} onChange={(e) => setNewWalletQr(e.target.value)} placeholder="QR Image Path (e.g. /img/qr1.jpeg)" className="glass-input text-sm" />
                        <input type="text" value={newWalletName} onChange={(e) => setNewWalletName(e.target.value)} placeholder="Display Name" className="glass-input text-sm" />
                        <button
                            onClick={async () => {
                                if (!newWalletAddr.startsWith('0x') || newWalletAddr.length !== 42) return toast.error('Invalid wallet address');
                                try {
                                    await axios.post('/api/admin/fd/wallets', { walletAddress: newWalletAddr, qrImage: newWalletQr, displayName: newWalletName });
                                    toast.success('FD wallet added');
                                    setNewWalletAddr('');
                                    setNewWalletQr('');
                                    setNewWalletName('');
                                    fetchFdWallets();
                                } catch (error: any) {
                                    toast.error(error.response?.data?.error || 'Failed');
                                }
                            }}
                            className="btn-glow w-full text-sm"
                        >
                            Add Wallet
                        </button>
                    </div>

                    <div className="space-y-2">
                        {fdWallets.map((wallet) => (
                            <div key={wallet.id} className="inner-card">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold truncate">{wallet.display_name || 'Wallet'}</p>
                                        <p className="text-[10px] text-text-muted font-mono truncate">{wallet.wallet_address}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await axios.patch('/api/admin/fd/wallets', { id: wallet.id, isActive: !wallet.is_active });
                                                    toast.success(wallet.is_active ? 'Deactivated' : 'Activated');
                                                    fetchFdWallets();
                                                } catch {
                                                    toast.error('Failed');
                                                }
                                            }}
                                            className={clsx(
                                                'px-3 py-1.5 rounded-lg text-[11px] font-semibold',
                                                wallet.is_active ? 'bg-neon-red/10 text-neon-red' : 'bg-neon-green/10 text-neon-green'
                                            )}
                                        >
                                            {wallet.is_active ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (!confirm('Delete this wallet?')) return;
                                                try {
                                                    await axios.delete(`/api/admin/fd/wallets?id=${wallet.id}`);
                                                    toast.success('Deleted');
                                                    fetchFdWallets();
                                                } catch {
                                                    toast.error('Failed');
                                                }
                                            }}
                                            className="p-1.5 rounded-lg bg-neon-red/10 text-neon-red"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                {wallet.qr_image && <p className="text-[10px] text-text-muted">QR: {wallet.qr_image}</p>}
                            </div>
                        ))}
                        {fdWallets.length === 0 && <p className="text-sm text-text-muted text-center py-8">No FD wallets. Add one above.</p>}
                    </div>
                </motion.div>
            )}

            {showAdjust && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
                    <div className="glass-card w-full max-w-sm">
                        <h3 className="text-sm font-bold mb-4">Adjust Balance (User #{adjustUserId})</h3>
                        <input type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="Enter amount (+ or -)" className="glass-input text-sm mb-4" />
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
