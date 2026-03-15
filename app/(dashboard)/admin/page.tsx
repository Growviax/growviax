'use client';

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UsersIcon, BanknotesIcon, ArrowDownTrayIcon, ArrowUpTrayIcon,
    TicketIcon, ShieldCheckIcon, MagnifyingGlassIcon,
    CheckCircleIcon, XCircleIcon, ClockIcon, CurrencyDollarIcon,
    ArrowPathIcon, DocumentArrowDownIcon, AdjustmentsHorizontalIcon,
    ChevronLeftIcon, ChevronRightIcon, BoltIcon, ChartBarIcon,
    ArrowUpIcon, ArrowDownIcon, NoSymbolIcon, PlayIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import dayjs from 'dayjs';

type AdminTab = 'users' | 'deposits' | 'withdrawals' | 'support' | 'trading' | 'settings' | 'upi';

export default function AdminPage() {
    const [tab, setTab] = useState<AdminTab>('users');
    const [loading, setLoading] = useState(true);

    /* ── Users state ──────────────────── */
    const [users, setUsers] = useState<any[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [userPage, setUserPage] = useState(1);
    const [userTotal, setUserTotal] = useState(0);

    /* ── Transactions state ───────────── */
    const [transactions, setTransactions] = useState<any[]>([]);
    const [txPage, setTxPage] = useState(1);
    const [txTotal, setTxTotal] = useState(0);
    const [txStatusFilter, setTxStatusFilter] = useState('');

    /* ── Support state ────────────────── */
    const [tickets, setTickets] = useState<any[]>([]);

    /* ── Balance adjust modal ─────────── */
    const [showBalanceModal, setShowBalanceModal] = useState(false);
    const [balanceUserId, setBalanceUserId] = useState('');
    const [balanceAmount, setBalanceAmount] = useState('');
    const [balanceReason, setBalanceReason] = useState('');

    /* ── Withdrawal action modal ──────── */
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [selectedTx, setSelectedTx] = useState<any>(null);
    const [withdrawAction, setWithdrawAction] = useState<'approve' | 'reject'>('approve');
    const [rejectReason, setRejectReason] = useState('');
    const [txHash, setTxHash] = useState('');
    const [processing, setProcessing] = useState(false);

    /* ── Trading control state ────────── */
    const [tradeData, setTradeData] = useState<any>(null);
    const [tradeDuration, setTradeDuration] = useState('7d');
    const [updating, setUpdating] = useState(false);

    /* ── Deposit requests state ─────── */
    const [depositRequests, setDepositRequests] = useState<any[]>([]);
    const [depositStats, setDepositStats] = useState<any>(null);
    const [depositTypeFilter, setDepositTypeFilter] = useState('all');
    const [depositStatusFilter, setDepositStatusFilter] = useState('pending');
    const [depositPage, setDepositPage] = useState(1);
    const [depositTotalPages, setDepositTotalPages] = useState(1);
    const [depositActionNote, setDepositActionNote] = useState('');

    /* ── UPI management state ──────── */
    const [upiAccounts, setUpiAccounts] = useState<any[]>([]);
    const [newUpiId, setNewUpiId] = useState('');
    const [newUpiName, setNewUpiName] = useState('');

    /* ── Data fetching ────────────────── */
    const fetchUsers = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/users', {
                params: { page: userPage, limit: 15, search: userSearch },
            });
            setUsers(res.data.users || []);
            setUserTotal(res.data.total || 0);
        } catch { } finally { setLoading(false); }
    }, [userPage, userSearch]);

    const fetchTransactions = useCallback(async (type: string) => {
        try {
            const res = await axios.get('/api/admin/transactions', {
                params: { type, status: txStatusFilter, page: txPage, limit: 15 },
            });
            setTransactions(res.data.transactions || []);
            setTxTotal(res.data.total || 0);
        } catch { }
    }, [txPage, txStatusFilter]);

    const fetchTickets = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/support');
            setTickets(res.data.tickets || []);
        } catch { }
    }, []);

    const fetchTradeControl = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/trade-control', { params: { duration: tradeDuration } });
            setTradeData(res.data);
        } catch { } finally { setLoading(false); }
    }, [tradeDuration]);

    const fetchDepositRequests = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/deposits', {
                params: { status: depositStatusFilter, type: depositTypeFilter, page: depositPage },
            });
            setDepositRequests(res.data.deposits || []);
            setDepositStats(res.data.stats || null);
            setDepositTotalPages(res.data.totalPages || 1);
        } catch { } finally { setLoading(false); }
    }, [depositStatusFilter, depositTypeFilter, depositPage]);

    const fetchUpiAccounts = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/upi');
            setUpiAccounts(res.data.accounts || []);
        } catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => {
        if (tab === 'users') fetchUsers();
        else if (tab === 'deposits') fetchDepositRequests();
        else if (tab === 'withdrawals') fetchTransactions('withdrawal');
        else if (tab === 'support') fetchTickets();
        else if (tab === 'trading') fetchTradeControl();
        else if (tab === 'upi') fetchUpiAccounts();
        else setLoading(false);
    }, [tab, fetchUsers, fetchTransactions, fetchTickets, fetchTradeControl, fetchDepositRequests, fetchUpiAccounts]);

    /* ── Actions ──────────────────────── */
    const handleBalanceAdjust = async () => {
        if (!balanceUserId || !balanceAmount) return toast.error('Fill all fields');
        setProcessing(true);
        try {
            await axios.post('/api/admin/balance', {
                userId: parseInt(balanceUserId),
                amount: parseFloat(balanceAmount),
                reason: balanceReason,
            });
            toast.success('Balance updated');
            setShowBalanceModal(false);
            setBalanceUserId(''); setBalanceAmount(''); setBalanceReason('');
            fetchUsers();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed');
        } finally { setProcessing(false); }
    };

    const handleWithdrawAction = async () => {
        if (!selectedTx) return;
        setProcessing(true);
        try {
            await axios.patch('/api/admin/transactions', {
                transactionId: selectedTx.id,
                action: withdrawAction,
                reason: rejectReason,
                txHash: txHash,
            });
            toast.success(withdrawAction === 'approve' ? 'Withdrawal approved' : 'Withdrawal rejected');
            setShowWithdrawModal(false);
            setSelectedTx(null);
            setRejectReason(''); setTxHash('');
            fetchTransactions('withdrawal');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed');
        } finally { setProcessing(false); }
    };

    const handleResolveTicket = async (ticketId: number, status: string) => {
        try {
            await axios.patch('/api/admin/support', { ticketId, status });
            toast.success('Ticket updated');
            fetchTickets();
        } catch { toast.error('Failed'); }
    };

    const updateSetting = async (settings: Record<string, any>) => {
        setUpdating(true);
        try {
            await axios.patch('/api/admin/trade-control', settings);
            toast.success('Setting updated');
            fetchTradeControl();
        } catch { toast.error('Failed to update'); }
        finally { setUpdating(false); }
    };

    const handleBlockUser = async (userId: number, currentlyBlocked: boolean) => {
        try {
            await axios.patch('/api/admin/users', { userId, action: currentlyBlocked ? 'unblock' : 'block' });
            toast.success(currentlyBlocked ? 'User unblocked' : 'User blocked');
            fetchUsers();
        } catch { toast.error('Failed'); }
    };

    const handleExport = async (type: string) => {
        try {
            const url = `/api/admin/export?type=${type}`;
            window.open(url, '_blank');
            toast.success('Download started');
        } catch { toast.error('Export failed'); }
    };

    const handleRunSalary = async () => {
        try {
            const res = await axios.post('/api/salary/check');
            toast.success(res.data.message);
        } catch { toast.error('Failed to run salary check'); }
    };

    const handleDepositAction = async (requestId: number, action: 'approve' | 'reject') => {
        setProcessing(true);
        try {
            await axios.patch('/api/admin/deposits', { requestId, action, adminNote: depositActionNote });
            toast.success(action === 'approve' ? 'Deposit approved & credited' : 'Deposit rejected');
            setDepositActionNote('');
            fetchDepositRequests();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed');
        } finally { setProcessing(false); }
    };

    const handleAddUpi = async () => {
        if (!newUpiId || !newUpiId.includes('@')) return toast.error('Enter a valid UPI ID');
        try {
            await axios.post('/api/admin/upi', { upiId: newUpiId, displayName: newUpiName || newUpiId });
            toast.success('UPI account added');
            setNewUpiId(''); setNewUpiName('');
            fetchUpiAccounts();
        } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
    };

    const handleToggleUpi = async (id: number, currentActive: boolean) => {
        try {
            await axios.patch('/api/admin/upi', { id, isActive: !currentActive });
            toast.success(currentActive ? 'UPI deactivated' : 'UPI activated');
            fetchUpiAccounts();
        } catch { toast.error('Failed'); }
    };

    const handleDeleteUpi = async (id: number) => {
        try {
            await axios.delete(`/api/admin/upi?id=${id}`);
            toast.success('UPI account deleted');
            fetchUpiAccounts();
        } catch { toast.error('Failed'); }
    };

    /* ── Tab config ───────────────────── */
    const tabs: { key: AdminTab; label: string; icon: any }[] = [
        { key: 'users', label: 'Users', icon: UsersIcon },
        { key: 'deposits', label: 'Deposits', icon: ArrowDownTrayIcon },
        { key: 'withdrawals', label: 'Withdrawals', icon: ArrowUpTrayIcon },
        { key: 'trading', label: 'Trading', icon: ChartBarIcon },
        { key: 'upi', label: 'UPI', icon: BanknotesIcon },
        { key: 'support', label: 'Support', icon: TicketIcon },
        { key: 'settings', label: 'Settings', icon: AdjustmentsHorizontalIcon },
    ];

    const statusIcon = (status: string) => {
        if (status === 'completed') return <CheckCircleIcon className="w-4 h-4 text-neon-green" />;
        if (status === 'pending') return <ClockIcon className="w-4 h-4 text-warning" />;
        return <XCircleIcon className="w-4 h-4 text-neon-red" />;
    };

    return (
        <div className="space-y-5 overflow-x-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neon-purple/15 flex items-center justify-center shrink-0">
                        <ShieldCheckIcon className="w-5 h-5 text-neon-purple" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Admin Panel</h1>
                        <p className="text-xs text-text-muted mt-0.5">Manage platform</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleExport('users')} className="btn-ghost text-xs flex items-center gap-1.5">
                        <DocumentArrowDownIcon className="w-3.5 h-3.5" /> CSV
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div
                className="grid grid-cols-2 gap-1 p-1 rounded-2xl sm:flex sm:gap-1 sm:overflow-x-auto sm:no-scrollbar"
                style={{ background: 'rgba(255,255,255,0.03)' }}
            >
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => { setTab(t.key); setTxPage(1); setLoading(true); }}
                        className={clsx(
                            'flex min-w-0 items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap text-center sm:px-4',
                            tab === t.key ? 'bg-neon-purple/12 text-neon-purple' : 'text-text-muted hover:text-text-secondary'
                        )}
                    >
                        <t.icon className="w-4 h-4" /> {t.label}
                    </button>
                ))}
            </div>

            {/* ═══════════ USERS TAB ═══════════ */}
            {tab === 'users' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative w-full">
                            <MagnifyingGlassIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                            <input
                                type="text" value={userSearch}
                                onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                                placeholder="Search users..." className="glass-input pl-11 text-sm py-2.5"
                            />
                        </div>
                        <button onClick={() => setShowBalanceModal(true)} className="btn-ghost text-xs whitespace-nowrap flex items-center gap-1.5">
                            <CurrencyDollarIcon className="w-4 h-4" /> Adjust Balance
                        </button>
                    </div>

                    <div className="space-y-2">
                        {users.map((u) => (
                            <div key={u.id} className="inner-card">
                                <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold truncate">{u.name}</p>
                                        <p className="text-[11px] text-text-muted truncate">{u.email}</p>
                                        <p className="text-[11px] text-text-muted">#{u.id}</p>
                                    </div>
                                    <div className="text-left sm:shrink-0 sm:text-right">
                                        <p className="text-sm font-bold text-neon-green">₹{parseFloat(u.wallet_balance || 0).toFixed(2)}</p>
                                        <span className={clsx('text-[10px] font-semibold', u.role === 'admin' ? 'text-neon-purple' : 'text-text-muted')}>
                                            {u.role.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-text-muted">
                                    <span>Referral: {u.referral_code}</span>
                                    <span>Joined: {dayjs(u.created_at).format('MMM D, YYYY')}</span>
                                </div>
                                {u.role !== 'admin' && (
                                    <button
                                        onClick={() => handleBlockUser(u.id, !!u.is_blocked)}
                                        className={clsx('mt-2 w-full py-1.5 rounded-lg text-[11px] font-semibold transition-all',
                                            u.is_blocked ? 'bg-neon-green/10 text-neon-green hover:bg-neon-green/20' : 'bg-neon-red/10 text-neon-red hover:bg-neon-red/20'
                                        )}
                                    >
                                        {u.is_blocked ? '✓ Unblock' : '✕ Block Account'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {userTotal > 15 && (
                        <div className="flex items-center justify-center gap-3">
                            <button onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage === 1} className="btn-ghost p-2 disabled:opacity-30">
                                <ChevronLeftIcon className="w-4 h-4" />
                            </button>
                            <span className="text-xs text-text-muted">Page {userPage}</span>
                            <button onClick={() => setUserPage(p => p + 1)} disabled={userPage * 15 >= userTotal} className="btn-ghost p-2 disabled:opacity-30">
                                <ChevronRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </motion.div>
            )}

            {/* ═══════════ DEPOSITS TAB ═══════════ */}
            {tab === 'deposits' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    {/* Stats Row */}
                    {depositStats && (
                        <div className="grid grid-cols-3 gap-2">
                            <div className="inner-card text-center">
                                <p className="text-lg font-extrabold text-warning">{depositStats.pending}</p>
                                <p className="text-[10px] text-text-muted">Pending</p>
                            </div>
                            <div className="inner-card text-center">
                                <p className="text-lg font-extrabold text-neon-green">{depositStats.approved}</p>
                                <p className="text-[10px] text-text-muted">Approved</p>
                            </div>
                            <div className="inner-card text-center">
                                <p className="text-lg font-extrabold text-neon-red">{depositStats.rejected}</p>
                                <p className="text-[10px] text-text-muted">Rejected</p>
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="flex flex-wrap gap-2">
                        <div className="flex gap-1">
                            {['pending', 'approved', 'rejected', 'all'].map((s) => (
                                <button key={s} onClick={() => { setDepositStatusFilter(s); setDepositPage(1); }}
                                    className={clsx('px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap border transition-all capitalize',
                                        depositStatusFilter === s ? 'bg-neon-green/12 text-neon-green border-neon-green/20' : 'bg-glass text-text-secondary border-transparent'
                                    )}>{s}</button>
                            ))}
                        </div>
                        <div className="flex gap-1">
                            {['all', 'usdt', 'upi'].map((t) => (
                                <button key={t} onClick={() => { setDepositTypeFilter(t); setDepositPage(1); }}
                                    className={clsx('px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap border transition-all uppercase',
                                        depositTypeFilter === t ? 'bg-neon-cyan/12 text-neon-cyan border-neon-cyan/20' : 'bg-glass text-text-secondary border-transparent'
                                    )}>{t}</button>
                            ))}
                        </div>
                    </div>

                    {/* Deposit Request Cards */}
                    <div className="space-y-2">
                        {depositRequests.map((dr) => (
                            <div key={dr.id} className="inner-card">
                                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex min-w-0 items-center gap-2">
                                        {dr.status === 'approved' ? <CheckCircleIcon className="w-4 h-4 text-neon-green shrink-0" /> :
                                         dr.status === 'pending' ? <ClockIcon className="w-4 h-4 text-warning shrink-0" /> :
                                         <XCircleIcon className="w-4 h-4 text-neon-red shrink-0" />}
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold">{dr.user_name || 'Unknown'}</p>
                                            <p className="truncate text-[11px] text-text-muted">{dr.user_email}</p>
                                        </div>
                                    </div>
                                    <div className="text-left sm:text-right sm:shrink-0">
                                        <p className="text-sm font-bold text-neon-green">₹{parseFloat(dr.amount).toFixed(2)}</p>
                                        <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full',
                                            dr.deposit_type === 'usdt' ? 'bg-neon-cyan/15 text-neon-cyan' : 'bg-neon-green/15 text-neon-green'
                                        )}>{dr.deposit_type?.toUpperCase()}</span>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="space-y-1 mb-2 overflow-hidden">
                                    {dr.tx_hash && (
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-[10px] text-text-muted shrink-0">Hash:</span>
                                            <a href={`https://bscscan.com/tx/${dr.tx_hash}`} target="_blank" rel="noopener noreferrer"
                                                className="text-[10px] font-mono text-neon-cyan truncate hover:underline flex-1 min-w-0">{dr.tx_hash}</a>
                                        </div>
                                    )}
                                    {dr.utr_number && (
                                        <p className="text-[10px] text-text-muted truncate">UTR: <span className="font-mono text-text-secondary">{dr.utr_number}</span></p>
                                    )}
                                    {dr.upi_id && (
                                        <p className="text-[10px] text-text-muted truncate">UPI: <span className="font-mono text-text-secondary">{dr.upi_id}</span></p>
                                    )}
                                    {dr.wallet_address && (
                                        <p className="text-[10px] text-text-muted font-mono truncate break-all">Wallet: {dr.wallet_address}</p>
                                    )}
                                    <p className="text-[10px] text-text-muted">{dayjs(dr.created_at).format('MMM D, YYYY HH:mm')}</p>
                                </div>

                                {/* Approve/Reject for pending */}
                                {dr.status === 'pending' && (
                                    <div className="space-y-2 pt-2 border-t border-glass-border">
                                        <input type="text" placeholder="Admin note (optional)" value={depositActionNote}
                                            onChange={(e) => setDepositActionNote(e.target.value)}
                                            className="glass-input text-xs py-2" />
                                        <div className="flex gap-2">
                                            <button onClick={() => handleDepositAction(dr.id, 'approve')} disabled={processing}
                                                className="flex-1 py-2 rounded-xl text-xs font-bold bg-neon-green/15 text-neon-green hover:bg-neon-green/25 transition-all">
                                                {processing ? 'Processing...' : 'Approve & Credit'}
                                            </button>
                                            <button onClick={() => handleDepositAction(dr.id, 'reject')} disabled={processing}
                                                className="flex-1 py-2 rounded-xl text-xs font-bold bg-neon-red/15 text-neon-red hover:bg-neon-red/25 transition-all">
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Show review info for processed */}
                                {dr.status !== 'pending' && dr.admin_name && (
                                    <p className="text-[10px] text-text-muted mt-1">
                                        {dr.status === 'approved' ? '✓' : '✕'} by {dr.admin_name}
                                        {dr.admin_note && <span> — {dr.admin_note}</span>}
                                    </p>
                                )}
                            </div>
                        ))}
                        {depositRequests.length === 0 && <p className="text-sm text-text-muted text-center py-8">No deposit requests found</p>}
                    </div>

                    {/* Pagination */}
                    {depositTotalPages > 1 && (
                        <div className="flex items-center justify-center gap-3">
                            <button onClick={() => setDepositPage(p => Math.max(1, p - 1))} disabled={depositPage === 1} className="btn-ghost p-2 disabled:opacity-30">
                                <ChevronLeftIcon className="w-4 h-4" />
                            </button>
                            <span className="text-xs text-text-muted">Page {depositPage} / {depositTotalPages}</span>
                            <button onClick={() => setDepositPage(p => Math.min(depositTotalPages, p + 1))} disabled={depositPage >= depositTotalPages} className="btn-ghost p-2 disabled:opacity-30">
                                <ChevronRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </motion.div>
            )}

            {/* ═══════════ WITHDRAWALS TAB ═══════════ */}
            {tab === 'withdrawals' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {['', 'pending', 'completed', 'rejected'].map((s) => (
                            <button key={s} onClick={() => { setTxStatusFilter(s); setTxPage(1); fetchTransactions('withdrawal'); }}
                                className={clsx(
                                    'px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all capitalize',
                                    txStatusFilter === s ? 'bg-neon-green/12 text-neon-green border-neon-green/20' : 'bg-glass text-text-secondary border-transparent'
                                )}
                            >
                                {s || 'All'}
                            </button>
                        ))}
                    </div>
                    <div className="space-y-2">
                        {transactions.map((tx) => (
                            <div key={tx.id} className="inner-card">
                                <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex min-w-0 items-center gap-2">
                                        {statusIcon(tx.status)}
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold">{tx.user_name || 'Unknown'}</p>
                                            <p className="truncate text-[11px] text-text-muted">{tx.user_email}</p>
                                        </div>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <p className="text-sm font-bold text-neon-red">-₹{parseFloat(tx.amount).toFixed(2)}</p>
                                        <p className="text-[10px] text-text-muted">{dayjs(tx.created_at).format('MMM D, HH:mm')}</p>
                                    </div>
                                </div>
                                {tx.wallet_address && (
                                    <p className="text-[10px] text-text-muted font-mono truncate mt-1">To: {tx.wallet_address}</p>
                                )}
                                {tx.status === 'pending' && (
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={() => { setSelectedTx(tx); setWithdrawAction('approve'); setShowWithdrawModal(true); }}
                                            className="flex-1 py-2 rounded-xl text-xs font-bold bg-neon-green/15 text-neon-green hover:bg-neon-green/25 transition-all"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => { setSelectedTx(tx); setWithdrawAction('reject'); setShowWithdrawModal(true); }}
                                            className="flex-1 py-2 rounded-xl text-xs font-bold bg-neon-red/15 text-neon-red hover:bg-neon-red/25 transition-all"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {transactions.length === 0 && <p className="text-sm text-text-muted text-center py-8">No withdrawals found</p>}
                    </div>
                </motion.div>
            )}

            {/* ═══════════ SUPPORT TAB ═══════════ */}
            {tab === 'support' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                    {tickets.map((ticket) => (
                        <div key={ticket.id} className="inner-card">
                            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold">{ticket.subject}</p>
                                    <p className="truncate text-[11px] text-text-muted">{ticket.user_name} • {ticket.user_email}</p>
                                </div>
                                <span className={clsx('w-fit text-[10px] font-semibold px-2 py-0.5 rounded-full',
                                    ticket.status === 'open' ? 'bg-warning/15 text-warning' :
                                        ticket.status === 'closed' ? 'bg-neon-red/15 text-neon-red' :
                                            'bg-neon-green/15 text-neon-green'
                                )}>
                                    {ticket.status}
                                </span>
                            </div>
                            <p className="text-xs text-text-secondary mb-3 line-clamp-2">{ticket.description}</p>

                            {/* Admin Reply Input */}
                            <div className="mt-3 mb-3">
                                <textarea
                                    id={`reply-${ticket.id}`}
                                    placeholder="Type admin reply..."
                                    className="glass-input text-sm mb-2"
                                    rows={2}
                                />
                                <button
                                    onClick={async () => {
                                        const textarea = document.getElementById(`reply-${ticket.id}`) as HTMLTextAreaElement;
                                        const reply = textarea?.value?.trim();
                                        if (!reply) return toast.error('Enter a reply');
                                        try {
                                            await axios.patch('/api/admin/support', { ticketId: ticket.id, reply, status: 'in_progress' });
                                            toast.success('Reply sent');
                                            textarea.value = '';
                                            fetchTickets();
                                        } catch { toast.error('Failed to send reply'); }
                                    }}
                                    className="w-full py-2 rounded-xl text-[11px] font-bold bg-neon-purple/12 text-neon-purple hover:bg-neon-purple/20 transition-all"
                                >
                                    Send Reply
                                </button>
                            </div>

                            {ticket.status === 'open' && (
                                <div className="flex gap-2">
                                    <button onClick={() => handleResolveTicket(ticket.id, 'in_progress')}
                                        className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 transition-all">
                                        In Progress
                                    </button>
                                    <button onClick={() => handleResolveTicket(ticket.id, 'closed')}
                                        className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold bg-neon-green/10 text-neon-green hover:bg-neon-green/20 transition-all">
                                        Close
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {tickets.length === 0 && <p className="text-sm text-text-muted text-center py-8">No support tickets</p>}
                </motion.div>
            )}

            {/* ═══════════ TRADING TAB ═══════════ */}
            {tab === 'trading' && tradeData && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    {/* Mode Toggle */}
                    <div className="glass-card">
                        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                            <BoltIcon className="w-4 h-4 text-neon-cyan" /> Trade Mode
                        </h3>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <button
                                onClick={() => updateSetting({ trade_mode: 'auto' })}
                                disabled={updating}
                                className={clsx('py-3 rounded-2xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2',
                                    tradeData.settings.trade_mode === 'auto'
                                        ? 'bg-neon-green/15 text-neon-green border-neon-green/30'
                                        : 'bg-glass text-text-secondary border-transparent hover:border-glass-border'
                                )}
                            >
                                <PlayIcon className="w-4 h-4" /> Auto
                            </button>
                            <button
                                onClick={() => updateSetting({ trade_mode: 'manual' })}
                                disabled={updating}
                                className={clsx('py-3 rounded-2xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2',
                                    tradeData.settings.trade_mode === 'manual'
                                        ? 'bg-neon-purple/15 text-neon-purple border-neon-purple/30'
                                        : 'bg-glass text-text-secondary border-transparent hover:border-glass-border'
                                )}
                            >
                                <AdjustmentsHorizontalIcon className="w-4 h-4" /> Manual
                            </button>
                        </div>
                        <p className="text-[11px] text-text-muted">
                            {tradeData.settings.trade_mode === 'auto'
                                ? 'System determines winners automatically (minority side wins).'
                                : 'You control which side wins next. Set below.'}
                        </p>
                    </div>

                    {/* Manual Controls */}
                    {tradeData.settings.trade_mode === 'manual' && (
                        <div className="glass-card">
                            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                                <AdjustmentsHorizontalIcon className="w-4 h-4 text-neon-purple" /> Manual Controls
                            </h3>
                            {/* Force Next Winner */}
                            <p className="text-[11px] text-text-muted uppercase tracking-wider font-medium mb-2">Force Next Round Winner</p>
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <button
                                    onClick={() => updateSetting({ manual_winner: 'up' })}
                                    disabled={updating}
                                    className={clsx('py-3 rounded-2xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2',
                                        tradeData.settings.manual_winner === 'up'
                                            ? 'bg-neon-green/15 text-neon-green border-neon-green/30'
                                            : 'bg-glass text-text-secondary border-transparent hover:border-glass-border'
                                    )}
                                >
                                    <ArrowUpIcon className="w-4 h-4" /> UP Wins
                                </button>
                                <button
                                    onClick={() => updateSetting({ manual_winner: 'down' })}
                                    disabled={updating}
                                    className={clsx('py-3 rounded-2xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2',
                                        tradeData.settings.manual_winner === 'down'
                                            ? 'bg-neon-red/15 text-neon-red border-neon-red/30'
                                            : 'bg-glass text-text-secondary border-transparent hover:border-glass-border'
                                    )}
                                >
                                    <ArrowDownIcon className="w-4 h-4" /> DOWN Wins
                                </button>
                            </div>
                            {tradeData.settings.manual_winner && (
                                <button onClick={() => updateSetting({ manual_winner: '' })}
                                    className="w-full mb-4 py-2 rounded-xl text-[11px] font-semibold bg-glass text-text-muted hover:text-text-secondary transition-all">
                                    Clear Manual Winner
                                </button>
                            )}

                            {/* Consecutive Controls */}
                            <p className="text-[11px] text-text-muted uppercase tracking-wider font-medium mb-2">Consecutive Wins</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-text-muted block mb-1">UP wins in a row</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number" min="0" max="100"
                                            defaultValue={tradeData.settings.consecutive_up_wins}
                                            id="consec-up"
                                            className="glass-input text-sm text-center flex-1"
                                        />
                                        <button
                                            onClick={() => {
                                                const val = (document.getElementById('consec-up') as HTMLInputElement)?.value;
                                                updateSetting({ consecutive_up_wins: parseInt(val) || 0 });
                                            }}
                                            className="px-3 py-2.5 rounded-xl text-[10px] font-bold bg-neon-green/12 text-neon-green"
                                        >Set</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-text-muted block mb-1">DOWN wins in a row</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number" min="0" max="100"
                                            defaultValue={tradeData.settings.consecutive_down_wins}
                                            id="consec-down"
                                            className="glass-input text-sm text-center flex-1"
                                        />
                                        <button
                                            onClick={() => {
                                                const val = (document.getElementById('consec-down') as HTMLInputElement)?.value;
                                                updateSetting({ consecutive_down_wins: parseInt(val) || 0 });
                                            }}
                                            className="px-3 py-2.5 rounded-xl text-[10px] font-bold bg-neon-red/12 text-neon-red"
                                        >Set</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Live Stats */}
                    <div className="glass-card">
                        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                            <BoltIcon className="w-4 h-4 text-warning" /> Live Trading
                            <button onClick={fetchTradeControl} className="ml-auto text-text-muted hover:text-neon-green transition-colors">
                                <ArrowPathIcon className="w-4 h-4" />
                            </button>
                        </h3>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="inner-card text-center">
                                <p className="text-lg font-extrabold text-neon-cyan">{tradeData.live.activePlayers}</p>
                                <p className="text-[10px] text-text-muted">Active Players</p>
                            </div>
                            <div className="inner-card text-center">
                                <p className="text-lg font-extrabold text-neon-green">₹{tradeData.live.upAmount.toFixed(0)}</p>
                                <p className="text-[10px] text-text-muted">UP ({tradeData.live.upUsers})</p>
                            </div>
                            <div className="inner-card text-center">
                                <p className="text-lg font-extrabold text-neon-red">₹{tradeData.live.downAmount.toFixed(0)}</p>
                                <p className="text-[10px] text-text-muted">DOWN ({tradeData.live.downUsers})</p>
                            </div>
                        </div>
                        <div className="inner-card flex items-center justify-between">
                            <span className="text-xs text-text-muted">Open Rounds</span>
                            <span className="text-sm font-bold text-neon-cyan">{tradeData.live.activeRounds}</span>
                        </div>
                    </div>

                    {/* P&L */}
                    <div className="glass-card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <CurrencyDollarIcon className="w-4 h-4 text-neon-green" /> Profit & Loss
                            </h3>
                            <div className="flex gap-1">
                                {['today', '7d', '30d', 'all'].map(d => (
                                    <button key={d} onClick={() => setTradeDuration(d)}
                                        className={clsx('px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all',
                                            tradeDuration === d ? 'bg-neon-green/12 text-neon-green' : 'text-text-muted hover:text-text-secondary'
                                        )}>{d === 'all' ? 'All' : d}</button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="inner-card">
                                <p className="text-[10px] text-text-muted mb-1">Total Bids</p>
                                <p className="text-sm font-bold">₹{tradeData.pnl.totalBids.toFixed(2)}</p>
                            </div>
                            <div className="inner-card">
                                <p className="text-[10px] text-text-muted mb-1">Total Payouts</p>
                                <p className="text-sm font-bold text-neon-red">₹{tradeData.pnl.totalPayouts.toFixed(2)}</p>
                            </div>
                            <div className="inner-card">
                                <p className="text-[10px] text-text-muted mb-1">Trading Fees</p>
                                <p className="text-sm font-bold text-neon-cyan">₹{tradeData.pnl.totalFees.toFixed(2)}</p>
                            </div>
                            <div className="inner-card">
                                <p className="text-[10px] text-text-muted mb-1">Commissions Paid</p>
                                <p className="text-sm font-bold text-warning">₹{tradeData.pnl.totalCommissions.toFixed(2)}</p>
                            </div>
                        </div>
                        <div className={clsx('inner-card text-center', tradeData.pnl.netProfit >= 0 ? 'border-neon-green/20' : 'border-neon-red/20')}>
                            <p className="text-[10px] text-text-muted mb-1">Net Profit</p>
                            <p className={clsx('text-xl font-extrabold', tradeData.pnl.netProfit >= 0 ? 'text-neon-green' : 'text-neon-red')}>
                                {tradeData.pnl.netProfit >= 0 ? '+' : ''}₹{tradeData.pnl.netProfit.toFixed(2)}
                            </p>
                        </div>

                        {/* Simple P&L Chart (bar chart) */}
                        {tradeData.pnl.chartData.length > 0 && (
                            <div className="mt-4">
                                <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium mb-2">Daily P&L</p>
                                <div className="flex items-end gap-1 h-24">
                                    {tradeData.pnl.chartData.map((d: any, i: number) => {
                                        const maxVal = Math.max(...tradeData.pnl.chartData.map((x: any) => Math.abs(x.profit)));
                                        const height = maxVal > 0 ? (Math.abs(d.profit) / maxVal) * 100 : 0;
                                        return (
                                            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full" title={`${d.date}: ₹${d.profit.toFixed(0)}`}>
                                                <div
                                                    className={clsx('w-full rounded-t-md min-h-[2px] transition-all',
                                                        d.profit >= 0 ? 'bg-neon-green/60' : 'bg-neon-red/60'
                                                    )}
                                                    style={{ height: `${Math.max(height, 3)}%` }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between text-[8px] text-text-muted mt-1">
                                    <span>{tradeData.pnl.chartData[0]?.date?.slice(5)}</span>
                                    <span>{tradeData.pnl.chartData[tradeData.pnl.chartData.length - 1]?.date?.slice(5)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
            {tab === 'trading' && !tradeData && (
                <div className="space-y-3">
                    <div className="skeleton h-32 w-full" />
                    <div className="skeleton h-32 w-full" />
                    <div className="skeleton h-32 w-full" />
                </div>
            )}

            {/* ═══════════ UPI MANAGEMENT TAB ═══════════ */}
            {tab === 'upi' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    {/* Add UPI */}
                    <div className="glass-card">
                        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                            <BanknotesIcon className="w-4 h-4 text-neon-green" /> Add UPI Account
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="form-label">UPI ID</label>
                                <input type="text" value={newUpiId} onChange={(e) => setNewUpiId(e.target.value)}
                                    placeholder="example@upi" className="glass-input text-sm" />
                            </div>
                            <div>
                                <label className="form-label">Display Name (optional)</label>
                                <input type="text" value={newUpiName} onChange={(e) => setNewUpiName(e.target.value)}
                                    placeholder="Primary UPI" className="glass-input text-sm" />
                            </div>
                            <button onClick={handleAddUpi} className="btn-glow w-full text-sm">Add UPI Account</button>
                        </div>
                    </div>

                    {/* UPI List */}
                    <div className="glass-card">
                        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                            <BanknotesIcon className="w-4 h-4 text-neon-cyan" /> Active UPI Accounts
                            <button onClick={fetchUpiAccounts} className="ml-auto text-text-muted hover:text-neon-green transition-colors">
                                <ArrowPathIcon className="w-4 h-4" />
                            </button>
                        </h3>
                        <div className="space-y-2">
                            {upiAccounts.map((acc) => (
                                <div key={acc.id} className="inner-card flex flex-col sm:flex-row sm:items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold font-mono truncate">{acc.upi_id}</p>
                                        <p className="text-[11px] text-text-muted">{acc.display_name}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full',
                                            acc.is_active ? 'bg-neon-green/15 text-neon-green' : 'bg-neon-red/15 text-neon-red'
                                        )}>{acc.is_active ? 'Active' : 'Inactive'}</span>
                                        <button onClick={() => handleToggleUpi(acc.id, !!acc.is_active)}
                                            className={clsx('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
                                                acc.is_active ? 'bg-neon-red/10 text-neon-red hover:bg-neon-red/20' : 'bg-neon-green/10 text-neon-green hover:bg-neon-green/20'
                                            )}>
                                            {acc.is_active ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button onClick={() => handleDeleteUpi(acc.id)}
                                            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-neon-red/10 text-neon-red hover:bg-neon-red/20 transition-all">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {upiAccounts.length === 0 && <p className="text-sm text-text-muted text-center py-6">No UPI accounts configured</p>}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ═══════════ SETTINGS TAB ═══════════ */}
            {tab === 'settings' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="glass-card">
                        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                            <BoltIcon className="w-4 h-4 text-neon-cyan" /> System Actions
                        </h3>
                        <div className="space-y-3">
                            <button onClick={handleRunSalary} className="w-full inner-card flex items-center justify-between hover:bg-glass-hover transition-all group">
                                <div className="flex items-center gap-3">
                                    <CurrencyDollarIcon className="w-5 h-5 text-neon-green" />
                                    <div>
                                        <p className="text-sm font-semibold">Process Daily Salaries</p>
                                        <p className="text-[11px] text-text-muted">Run IB salary qualification check</p>
                                    </div>
                                </div>
                                <span className="text-xs text-text-muted group-hover:text-neon-green">Run →</span>
                            </button>
                            <button onClick={() => handleExport('transactions')} className="w-full inner-card flex items-center justify-between hover:bg-glass-hover transition-all group">
                                <div className="flex items-center gap-3">
                                    <DocumentArrowDownIcon className="w-5 h-5 text-neon-purple" />
                                    <div>
                                        <p className="text-sm font-semibold">Export Transactions CSV</p>
                                        <p className="text-[11px] text-text-muted">Download all transactions</p>
                                    </div>
                                </div>
                                <span className="text-xs text-text-muted group-hover:text-neon-purple">Export →</span>
                            </button>
                            <button onClick={() => handleExport('users')} className="w-full inner-card flex items-center justify-between hover:bg-glass-hover transition-all group">
                                <div className="flex items-center gap-3">
                                    <UsersIcon className="w-5 h-5 text-warning" />
                                    <div>
                                        <p className="text-sm font-semibold">Export Users CSV</p>
                                        <p className="text-[11px] text-text-muted">Download all user data</p>
                                    </div>
                                </div>
                                <span className="text-xs text-text-muted group-hover:text-warning">Export →</span>
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ═══════════ BALANCE MODAL ═══════════ */}
            <AnimatePresence>
                {showBalanceModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ background: 'rgba(0,0,0,0.7)' }}
                        onClick={() => setShowBalanceModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            className="glass-card w-full max-w-md"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-base font-bold mb-4">Adjust Wallet Balance</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="form-label">User ID</label>
                                    <input type="number" value={balanceUserId} onChange={(e) => setBalanceUserId(e.target.value)}
                                        placeholder="Enter user ID" className="glass-input text-sm" />
                                </div>
                                <div>
                                    <label className="form-label">Amount (+ to add, - to deduct)</label>
                                    <input type="number" value={balanceAmount} onChange={(e) => setBalanceAmount(e.target.value)}
                                        placeholder="e.g. 100 or -50" className="glass-input text-sm" step="0.01" />
                                </div>
                                <div>
                                    <label className="form-label">Reason</label>
                                    <input type="text" value={balanceReason} onChange={(e) => setBalanceReason(e.target.value)}
                                        placeholder="Reason for adjustment" className="glass-input text-sm" />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button onClick={() => setShowBalanceModal(false)} className="flex-1 btn-ghost">Cancel</button>
                                    <button onClick={handleBalanceAdjust} disabled={processing} className="flex-1 btn-glow text-sm">
                                        {processing ? 'Processing...' : 'Confirm'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════════ WITHDRAWAL ACTION MODAL ═══════════ */}
            <AnimatePresence>
                {showWithdrawModal && selectedTx && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ background: 'rgba(0,0,0,0.7)' }}
                        onClick={() => setShowWithdrawModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            className="glass-card w-full max-w-md"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-base font-bold mb-2">
                                {withdrawAction === 'approve' ? '✅ Approve Withdrawal' : '❌ Reject Withdrawal'}
                            </h3>
                            <div className="inner-card mb-4">
                                <p className="text-sm text-text-muted">User: <span className="text-text-primary font-medium">{selectedTx.user_name}</span></p>
                                <p className="text-sm text-text-muted">Amount: <span className="text-neon-red font-bold">₹{parseFloat(selectedTx.amount).toFixed(2)}</span></p>
                                <p className="text-[11px] text-text-muted font-mono mt-1 truncate">To: {selectedTx.wallet_address}</p>
                            </div>
                            <div className="space-y-3">
                                {withdrawAction === 'approve' ? (
                                    <div>
                                        <label className="form-label">Transaction Hash (optional)</label>
                                        <input type="text" value={txHash} onChange={(e) => setTxHash(e.target.value)}
                                            placeholder="0x..." className="glass-input text-sm font-mono" />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="form-label">Rejection Reason</label>
                                        <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                                            placeholder="Why is this being rejected?" className="glass-input text-sm" rows={3} />
                                    </div>
                                )}
                                <div className="flex gap-2 pt-2">
                                    <button onClick={() => setShowWithdrawModal(false)} className="flex-1 btn-ghost">Cancel</button>
                                    <button
                                        onClick={handleWithdrawAction}
                                        disabled={processing}
                                        className={clsx('flex-1 text-sm font-bold py-3 rounded-xl transition-all',
                                            withdrawAction === 'approve' ? 'btn-glow' : 'btn-danger'
                                        )}
                                    >
                                        {processing ? 'Processing...' : withdrawAction === 'approve' ? 'Approve' : 'Reject'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
