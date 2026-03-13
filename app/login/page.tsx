'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) { toast.error('Please fill all fields'); return; }

        setLoading(true);
        try {
            const res = await axios.post('/api/auth/login', { email, password });
            toast.success(res.data.message);
            router.push('/dashboard');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Login failed');
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-5 py-8 relative">
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-[420px]"
            >
                <div className="glass-card p-8 sm:p-10">
                    {/* Logo */}
                    <div className="flex justify-center mb-10">
                        <Image src="/img/logo.png" alt="GrowViax" width={180} height={54} priority className="h-14 w-auto" />
                    </div>

                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-extrabold tracking-tight mb-2">Welcome Back</h1>
                        <p className="text-text-secondary text-sm ">Sign in to continue trading</p>
                    </div>

                    <form onSubmit={handleLogin}>
                        {/* Email */}
                        <div className="mb-6">
                            <label className="form-label">Email Address</label>
                            <div className="relative">
                                <EnvelopeIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                                <input
                                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com" className="glass-input pl-12" autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="mb-6">
                            <label className="form-label">Password</label>
                            <div className="relative">
                                <LockClosedIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password} onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password" className="glass-input pl-12 pr-12" autoComplete="current-password"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors">
                                    {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end mb-6">
                            <Link href="/signup?forgot=true" className="text-sm text-neon-green hover:text-neon-green-dim transition-colors font-medium">
                                Forgot Password?
                            </Link>
                        </div>

                        <button type="submit" disabled={loading} className="btn-glow w-full text-base">
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" /></svg>
                                    Signing In...
                                </span>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    <div className="divider" />

                    <p className="text-center text-sm text-text-secondary">
                        Don&apos;t have an account?{' '}
                        <Link href="/signup" className="text-neon-green hover:text-neon-green-dim font-semibold transition-colors">
                            Create Account
                        </Link>
                    </p>
                </div>

                <p className="text-center text-xs text-text-muted mt-6">
                    Protected by 256-bit encryption
                </p>
            </motion.div>
        </div>
    );
}
