'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { LifebuoyIcon, PlusIcon, CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import clsx from 'clsx';

export default function FDSupportPage() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchTickets = () => {
        axios.get('/api/fd/support')
            .then(res => setTickets(res.data.tickets || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchTickets(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !description.trim()) return toast.error('Fill all fields');

        setSubmitting(true);
        try {
            await axios.post('/api/fd/support', { subject, description });
            toast.success('Ticket created!');
            setShowForm(false);
            setSubject('');
            setDescription('');
            fetchTickets();
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Failed');
        } finally { setSubmitting(false); }
    };

    const statusIcon = (status: string) => {
        if (status === 'closed') return <CheckCircleIcon className="w-4 h-4 text-neon-green" />;
        if (status === 'in_progress') return <ClockIcon className="w-4 h-4 text-warning" />;
        return <ClockIcon className="w-4 h-4 text-neon-cyan" />;
    };

    if (loading) return (
        <div className="space-y-4">
            <div className="skeleton h-12 w-40" />
            <div className="skeleton h-60 w-full" />
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight">Support</h1>
                    <p className="text-xs text-text-muted mt-1">Need help? Create a ticket</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="btn-glow text-xs py-2 px-4 flex items-center gap-1">
                    <PlusIcon className="w-4 h-4" /> New Ticket
                </button>
            </div>

            {showForm && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <form onSubmit={handleSubmit} className="glass-card space-y-4">
                        <div>
                            <label className="form-label">Subject</label>
                            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                                placeholder="Brief description of your issue" className="glass-input text-sm" />
                        </div>
                        <div>
                            <label className="form-label">Description</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe your issue in detail..." className="glass-input text-sm" rows={4} />
                        </div>
                        <button type="submit" disabled={submitting} className="btn-glow w-full text-sm">
                            {submitting ? 'Submitting...' : 'Submit Ticket'}
                        </button>
                    </form>
                </motion.div>
            )}

            {tickets.length === 0 ? (
                <div className="glass-card text-center py-10">
                    <LifebuoyIcon className="w-10 h-10 mx-auto text-text-muted mb-3" />
                    <p className="text-sm text-text-muted">No support tickets</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {tickets.map((ticket: any) => (
                        <div key={ticket.id} className="glass-card-flat flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {statusIcon(ticket.status)}
                                <div>
                                    <p className="text-sm font-semibold">{ticket.subject}</p>
                                    <p className="text-[10px] text-text-muted">{dayjs(ticket.created_at).format('DD MMM YY')}</p>
                                </div>
                            </div>
                            <span className={clsx('text-[10px] font-bold px-2 py-1 rounded-full uppercase',
                                ticket.status === 'open' ? 'bg-neon-cyan/10 text-neon-cyan' :
                                    ticket.status === 'in_progress' ? 'bg-warning/10 text-warning' : 'bg-neon-green/10 text-neon-green')}>
                                {ticket.status.replace('_', ' ')}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
