'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
    UserCircleIcon, EnvelopeIcon, PhoneIcon, LockClosedIcon, EyeIcon, EyeSlashIcon,
    ClipboardDocumentIcon, ArrowRightStartOnRectangleIcon, ShieldCheckIcon, PencilSquareIcon,
    ChatBubbleOvalLeftEllipsisIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Edit mode
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [saving, setSaving] = useState(false);

    // Password
    const [showPwSection, setShowPwSection] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [changingPw, setChangingPw] = useState(false);

    const fetchUser = useCallback(async () => {
        try {
            const res = await axios.get('/api/user');
            setUser(res.data.user);
            setName(res.data.user.name);
            setPhone(res.data.user.phone || '');
        } catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchUser(); }, [fetchUser]);

    const handleSave = async () => {
        if (!name.trim()) return toast.error('Name is required');
        setSaving(true);
        try {
            await axios.put('/api/user', { name, phone });
            toast.success('Profile updated');
            setEditing(false);
            fetchUser();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Update failed');
        } finally { setSaving(false); }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentPassword || !newPassword) return toast.error('Fill all password fields');
        if (newPassword.length < 6) return toast.error('New password must be at least 6 characters');
        if (newPassword !== confirmPassword) return toast.error('Passwords do not match');

        setChangingPw(true);
        try {
            await axios.put('/api/user', { currentPassword, newPassword, changePassword: true });
            toast.success('Password changed');
            setShowPwSection(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Password change failed');
        } finally { setChangingPw(false); }
    };

    const handleLogout = async () => {
        try {
            await axios.post('/api/auth/logout');
            router.push('/login');
        } catch { router.push('/login'); }
    };

    const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copied!'); };

    if (loading) return (
        <div className="space-y-4">
            <div className="skeleton h-12 w-32" />
            <div className="skeleton h-32 w-full" />
            <div className="skeleton h-48 w-full" />
        </div>
    );

    return (
        <div className="space-y-5 overflow-x-hidden">
            <h1 className="text-2xl font-extrabold tracking-tight">Profile</h1>

            {/* Avatar + Name */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card flex items-center gap-4 overflow-hidden">
                <div className="w-16 h-16 rounded-2xl bg-neon-green/12 flex items-center justify-center border border-neon-green/15 shrink-0">
                    <span className="text-neon-green text-2xl font-extrabold">{user?.name?.charAt(0) || 'U'}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold truncate">{user?.name}</p>
                    <p className="text-sm text-text-muted truncate">{user?.email}</p>
                    <span className="badge-success mt-1">Verified</span>
                </div>
                <button onClick={() => setEditing(!editing)} className="btn-ghost p-2.5 shrink-0">
                    <PencilSquareIcon className="w-5 h-5" />
                </button>
            </motion.div>

            {/* Edit Form */}
            {editing && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass-card space-y-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                        <PencilSquareIcon className="w-4 h-4 text-neon-cyan" /> Edit Details
                    </h3>
                    <div>
                        <label className="form-label">Full Name</label>
                        <div className="relative">
                            <UserCircleIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="glass-input pl-12" />
                        </div>
                    </div>
                    <div>
                        <label className="form-label">Phone Number</label>
                        <div className="relative">
                            <PhoneIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="glass-input pl-12" />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleSave} disabled={saving} className="btn-glow flex-1 text-sm">{saving ? 'Saving...' : 'Save Changes'}</button>
                        <button onClick={() => setEditing(false)} className="btn-ghost flex-1 text-sm">Cancel</button>
                    </div>
                </motion.div>
            )}

            {/* Info Rows */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card space-y-0 p-0 overflow-hidden min-w-0">
                <div className="flex items-center justify-between px-5 py-4 border-b border-glass-border min-w-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <EnvelopeIcon className="w-5 h-5 text-text-muted shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[11px] text-text-muted uppercase tracking-wider">Email</p>
                            <p className="text-sm font-medium truncate">{user?.email}</p>
                        </div>
                    </div>
                    <ShieldCheckIcon className="w-5 h-5 text-neon-green shrink-0" />
                </div>
                <div className="flex items-center justify-between px-5 py-4 border-b border-glass-border min-w-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <PhoneIcon className="w-5 h-5 text-text-muted shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[11px] text-text-muted uppercase tracking-wider">Phone</p>
                            <p className="text-sm font-medium truncate">{user?.phone || 'Not set'}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between px-5 py-4 min-w-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <ClipboardDocumentIcon className="w-5 h-5 text-text-muted shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[11px] text-text-muted uppercase tracking-wider">Referral Code</p>
                            <p className="text-sm font-mono font-bold truncate">{user?.referral_code}</p>
                        </div>
                    </div>
                    <button onClick={() => copy(user?.referral_code)} className="btn-ghost px-3 py-1.5 text-xs shrink-0">Copy</button>
                </div>
            </motion.div>

            {/* Security Section */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                        <LockClosedIcon className="w-4 h-4 text-neon-purple" /> Security
                    </h3>
                    <button onClick={() => setShowPwSection(!showPwSection)} className="btn-ghost text-xs px-3 py-1.5">
                        {showPwSection ? 'Cancel' : 'Change Password'}
                    </button>
                </div>

                {showPwSection && (
                    <form onSubmit={handleChangePassword} className="space-y-3 pt-2">
                        <div className="relative">
                            <input type={showPw ? 'text' : 'password'} value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Current password" className="glass-input pr-12" />
                            <button type="button" onClick={() => setShowPw(!showPw)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted">
                                {showPw ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                            </button>
                        </div>
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New password (min 6 chars)" className="glass-input" />
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password" className="glass-input" />
                        <button type="submit" disabled={changingPw} className="btn-glow w-full text-sm">
                            {changingPw ? 'Changing...' : 'Update Password'}
                        </button>
                    </form>
                )}
            </motion.div>

            {/* Support */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Link href="/support" className="btn-ghost w-full flex items-center justify-center gap-2 mb-3">
                    <ChatBubbleOvalLeftEllipsisIcon className="w-5 h-5" /> Support
                </Link>
            </motion.div>

            {/* Logout */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <button onClick={handleLogout} className="btn-danger w-full flex items-center justify-center gap-2">
                    <ArrowRightStartOnRectangleIcon className="w-5 h-5" /> Logout
                </button>
            </motion.div>
        </div>
    );
}
