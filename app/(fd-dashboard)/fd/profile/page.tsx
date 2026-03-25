'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { UserCircleIcon, EnvelopeIcon, PhoneIcon, CalendarDaysIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';

export default function FDProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/fd/user')
            .then(res => setUser(res.data.user))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const handleLogout = async () => {
        try {
            await axios.post('/api/fd/auth/logout');
            toast.success('Logged out');
            router.push('/fd/login');
        } catch { toast.error('Logout failed'); }
    };

    if (loading) return (
        <div className="space-y-4">
            <div className="skeleton h-12 w-40" />
            <div className="skeleton h-60 w-full" />
        </div>
    );

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-extrabold tracking-tight">Profile</h1>

            {/* Avatar + Name */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card flex flex-col items-center py-8">
                <div className="w-20 h-20 rounded-full bg-neon-cyan/10 flex items-center justify-center mb-4 border-2 border-neon-cyan/20">
                    <UserCircleIcon className="w-12 h-12 text-neon-cyan" />
                </div>
                <h2 className="text-xl font-extrabold">{user?.name || 'User'}</h2>
                <span className="badge-info mt-2">FD Investor</span>
            </motion.div>

            {/* Details */}
            <div className="space-y-3">
                <div className="glass-card-flat flex items-center gap-4">
                    <EnvelopeIcon className="w-5 h-5 text-neon-cyan" />
                    <div>
                        <p className="text-[10px] text-text-muted uppercase">Email</p>
                        <p className="text-sm font-medium">{user?.email}</p>
                    </div>
                </div>
                <div className="glass-card-flat flex items-center gap-4">
                    <PhoneIcon className="w-5 h-5 text-neon-green" />
                    <div>
                        <p className="text-[10px] text-text-muted uppercase">Phone</p>
                        <p className="text-sm font-medium">{user?.phone}</p>
                    </div>
                </div>
                <div className="glass-card-flat flex items-center gap-4">
                    <CalendarDaysIcon className="w-5 h-5 text-neon-purple" />
                    <div>
                        <p className="text-[10px] text-text-muted uppercase">Member Since</p>
                        <p className="text-sm font-medium">{dayjs(user?.created_at).format('DD MMM YYYY')}</p>
                    </div>
                </div>
                <div className="glass-card-flat flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-neon-green text-lg">🎟️</span>
                        <div>
                            <p className="text-[10px] text-text-muted uppercase">Referral Code</p>
                            <p className="text-sm font-bold text-neon-green font-mono">{user?.referral_code}</p>
                        </div>
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(user?.referral_code || ''); toast.success('Referral code copied!'); }}
                        className="btn-ghost text-xs">Copy</button>
                </div>
            </div>

            {/* Wallet Info */}
            <div className="glass-card">
                <p className="text-xs text-text-muted mb-2">FD Wallet Balance</p>
                <p className="text-2xl font-extrabold neon-text">₹{Number(user?.wallet_balance || 0).toFixed(2)}</p>
            </div>

            {/* Logout */}
            <button onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-neon-red/20 text-neon-red font-semibold text-sm hover:bg-neon-red/5 transition-all">
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                Logout
            </button>
        </div>
    );
}
