'use client';

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TicketIcon, PlusIcon, ChatBubbleOvalLeftEllipsisIcon,
    ClockIcon, CheckCircleIcon, XCircleIcon,
    PaperAirplaneIcon, ArrowLeftIcon, ShieldCheckIcon,
    UserCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import dayjs from 'dayjs';

interface Ticket { id: number; subject: string; description: string; status: string; created_at: string; }
interface Reply { id: number; ticket_id: number; user_id: number; message: string; created_at: string; sender_name: string; sender_role: string; }

export default function SupportPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');

    /* ── Ticket detail state ─────────── */
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [replies, setReplies] = useState<Reply[]>([]);
    const [replyMessage, setReplyMessage] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const [loadingReplies, setLoadingReplies] = useState(false);

    const fetchTickets = useCallback(async () => {
        try {
            const res = await axios.get('/api/support/tickets');
            setTickets(res.data.tickets || []);
        } catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchTickets(); }, [fetchTickets]);

    const fetchReplies = useCallback(async (ticketId: number) => {
        setLoadingReplies(true);
        try {
            const res = await axios.get(`/api/support/tickets?ticketId=${ticketId}`);
            setReplies(res.data.replies || []);
        } catch { } finally { setLoadingReplies(false); }
    }, []);

    const openTicket = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        fetchReplies(ticket.id);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim()) return toast.error('Subject is required');
        if (!description.trim()) return toast.error('Please describe your issue');

        setCreating(true);
        try {
            await axios.post('/api/support/tickets', { subject, description });
            toast.success('Ticket created');
            setSubject('');
            setDescription('');
            setShowForm(false);
            fetchTickets();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to create ticket');
        } finally { setCreating(false); }
    };

    const handleSendReply = async () => {
        if (!replyMessage.trim() || !selectedTicket) return toast.error('Enter a message');
        setSendingReply(true);
        try {
            await axios.post('/api/support/tickets', {
                ticketId: selectedTicket.id,
                message: replyMessage.trim(),
            });
            toast.success('Reply sent');
            setReplyMessage('');
            fetchReplies(selectedTicket.id);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to send reply');
        } finally { setSendingReply(false); }
    };

    const statusBadge = (status: string) => {
        if (status === 'open') return <span className="badge-warning">Open</span>;
        if (status === 'resolved' || status === 'in_progress') return <span className="badge-success">{status === 'in_progress' ? 'In Progress' : 'Resolved'}</span>;
        if (status === 'closed') return <span className="badge-danger">Closed</span>;
        return <span className="badge-info">{status}</span>;
    };

    const statusIcon = (status: string) => {
        if (status === 'resolved') return <CheckCircleIcon className="w-5 h-5 text-neon-green" />;
        if (status === 'closed') return <XCircleIcon className="w-5 h-5 text-neon-red" />;
        return <ClockIcon className="w-5 h-5 text-warning" />;
    };

    if (loading) return (
        <div className="space-y-4">
            <div className="skeleton h-12 w-32" />
            <div className="skeleton h-14 w-full" />
            <div className="skeleton h-48 w-full" />
        </div>
    );

    /* ═══════════ TICKET DETAIL VIEW ═══════════ */
    if (selectedTicket) {
        return (
            <div className="space-y-5">
                {/* Back button + header */}
                <div className="flex items-center gap-3">
                    <button onClick={() => { setSelectedTicket(null); setReplies([]); }}
                        className="w-9 h-9 rounded-xl bg-glass flex items-center justify-center hover:bg-glass-hover transition-colors shrink-0">
                        <ArrowLeftIcon className="w-4 h-4 text-text-secondary" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-extrabold tracking-tight truncate">{selectedTicket.subject}</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-text-muted">#{selectedTicket.id}</span>
                            {statusBadge(selectedTicket.status)}
                        </div>
                    </div>
                </div>

                {/* Original message */}
                <div className="glass-card">
                    <div className="flex items-start gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-neon-cyan/12 flex items-center justify-center shrink-0">
                            <UserCircleIcon className="w-4 h-4 text-neon-cyan" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-text-primary">You</p>
                            <p className="text-[10px] text-text-muted">{dayjs(selectedTicket.created_at).format('MMM D, YYYY • HH:mm')}</p>
                        </div>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed ml-11">{selectedTicket.description}</p>
                </div>

                {/* Replies */}
                <div className="space-y-3">
                    {loadingReplies ? (
                        <div className="space-y-3">
                            <div className="skeleton h-20 w-full" />
                            <div className="skeleton h-20 w-full" />
                        </div>
                    ) : replies.length > 0 ? (
                        replies.map((reply) => (
                            <motion.div key={reply.id}
                                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                className={clsx('glass-card', reply.sender_role === 'admin' ? 'border-l-2 border-l-neon-purple/40' : '')}
                            >
                                <div className="flex items-start gap-3 mb-2">
                                    <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                                        reply.sender_role === 'admin' ? 'bg-neon-purple/12' : 'bg-neon-cyan/12'
                                    )}>
                                        {reply.sender_role === 'admin' ? (
                                            <ShieldCheckIcon className="w-4 h-4 text-neon-purple" />
                                        ) : (
                                            <UserCircleIcon className="w-4 h-4 text-neon-cyan" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-text-primary flex items-center gap-2">
                                            {reply.sender_name || 'Unknown'}
                                            {reply.sender_role === 'admin' && (
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-neon-purple/15 text-neon-purple">ADMIN</span>
                                            )}
                                        </p>
                                        <p className="text-[10px] text-text-muted">{dayjs(reply.created_at).format('MMM D, YYYY • HH:mm')}</p>
                                    </div>
                                </div>
                                <p className="text-sm text-text-secondary leading-relaxed ml-11">{reply.message}</p>
                            </motion.div>
                        ))
                    ) : (
                        <div className="text-center py-6">
                            <ChatBubbleOvalLeftEllipsisIcon className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
                            <p className="text-xs text-text-muted">No replies yet</p>
                        </div>
                    )}
                </div>

                {/* Reply input */}
                {selectedTicket.status !== 'closed' && (
                    <div className="glass-card">
                        <p className="text-[11px] text-text-muted uppercase tracking-wider font-medium mb-3">Send a Reply</p>
                        <textarea
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="glass-input mb-3"
                            rows={3}
                        />
                        <button
                            onClick={handleSendReply}
                            disabled={sendingReply || !replyMessage.trim()}
                            className="btn-glow w-full flex items-center justify-center gap-2 text-sm"
                        >
                            <PaperAirplaneIcon className="w-4 h-4" />
                            {sendingReply ? 'Sending...' : 'Send Reply'}
                        </button>
                    </div>
                )}
            </div>
        );
    }

    /* ═══════════ TICKETS LIST VIEW ═══════════ */
    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight">Support</h1>
                    <p className="text-xs text-text-muted mt-1">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => setShowForm(!showForm)}
                    className={clsx('flex items-center gap-2 text-sm font-semibold py-2.5 px-4 rounded-xl transition-all', showForm ? 'btn-ghost' : 'btn-glow')}>
                    {showForm ? 'Cancel' : <><PlusIcon className="w-4 h-4" /> New Ticket</>}
                </button>
            </div>

            {/* Create Form */}
            {showForm && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                    <form onSubmit={handleCreate} className="glass-card space-y-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4 text-neon-cyan" /> Create Ticket
                        </h3>
                        <div>
                            <label className="form-label">Subject</label>
                            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                                placeholder="Brief summary of your issue" className="glass-input" />
                        </div>
                        <div>
                            <label className="form-label">Description</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe your issue in detail..." className="glass-input" rows={4} />
                        </div>
                        <button type="submit" disabled={creating} className="btn-glow w-full flex items-center justify-center gap-2">
                            <PaperAirplaneIcon className="w-4 h-4" /> {creating ? 'Submitting...' : 'Submit Ticket'}
                        </button>
                    </form>
                </motion.div>
            )}

            {/* Tickets List */}
            {tickets.length > 0 ? (
                <div className="space-y-3">
                    {tickets.map((ticket, i) => (
                        <motion.div key={ticket.id}
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04, duration: 0.4 }}
                            className="glass-card cursor-pointer hover:border-neon-green/20 transition-all"
                            onClick={() => openTicket(ticket)}
                        >
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                    {statusIcon(ticket.status)}
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold truncate">{ticket.subject}</p>
                                        <p className="text-[11px] text-text-muted mt-0.5">
                                            #{ticket.id} • {dayjs(ticket.created_at).format('MMM D, YYYY')}
                                        </p>
                                    </div>
                                </div>
                                {statusBadge(ticket.status)}
                            </div>
                            <p className="text-sm text-text-secondary line-clamp-2 ml-8">{ticket.description}</p>
                            <p className="text-[10px] text-neon-cyan mt-2 ml-8">Tap to view & reply →</p>
                        </motion.div>
                    ))}
                </div>
            ) : !showForm && (
                <div className="glass-card text-center py-14">
                    <TicketIcon className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-40" />
                    <p className="text-base font-semibold text-text-secondary mb-1">No Tickets</p>
                    <p className="text-sm text-text-muted mb-5">Need help? Create your first ticket.</p>
                    <button onClick={() => setShowForm(true)} className="btn-glow text-sm px-6 py-2.5 mx-auto">
                        <span className="flex items-center gap-2"><PlusIcon className="w-4 h-4" /> Create Ticket</span>
                    </button>
                </div>
            )}
        </div>
    );
}
