'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    LockClosedIcon,
} from '@heroicons/react/24/outline';

export default function HomePage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await axios.get('/api/user');
                setUser(res.data.user);
            } catch {
                router.push('/login');
            }
        };
        fetchUser();
    }, [router]);

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.18 } },
    };
    const item = {
        hidden: { opacity: 0, y: 30 },
        show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' as const } },
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col items-center min-h-[85vh] px-4 pt-8 pb-24"
        >
            {/* Logo */}
            <motion.div variants={item} className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 rounded-3xl bg-neon-green/10 border-2 border-neon-green/20 flex items-center justify-center mb-5 shadow-[0_0_60px_rgba(0,255,136,0.12)]">
                    <Image src="/img/logo.png" alt="GrowViax" width={60} height={60} className="rounded-xl" />
                </div>
                <h1 className="text-3xl font-black tracking-tight text-center">
                    Grow<span className="text-neon-green">Viax</span>
                </h1>
                <p className="text-sm text-text-muted mt-2 text-center">Choose your investment path</p>
            </motion.div>

            {/* Welcome */}
            {user && (
                <motion.p variants={item} className="text-text-secondary text-sm mb-8">
                    Welcome, <span className="text-text-primary font-semibold">{user.name}</span>
                </motion.p>
            )}

            {/* Cards */}
            <motion.div variants={item} className="w-full max-w-md flex flex-col gap-6 mt-4">
                <Link href="/trading">
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="relative overflow-hidden rounded-3xl border-2 border-neon-green/20 cursor-pointer group"
                        style={{ minHeight: '200px' }}
                    >
                        {/* Background Image */}
                        <div className="absolute inset-0">
                            <Image
                                src="/img/trading_bg.png"
                                alt=""
                                fill
                                className="object-cover opacity-50 group-hover:opacity-60 transition-opacity duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
                        </div>

                        {/* Content - Centered */}
                        <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-10">
                            <div className="w-16 h-16 rounded-2xl bg-neon-green/15 border border-neon-green/20 flex items-center justify-center mb-4 group-hover:shadow-[0_0_30px_rgba(0,255,136,0.2)] transition-all">
                                <svg className="w-8 h-8 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 20h20M5 17l4-7 4 3 6-9" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-extrabold text-white mb-2 group-hover:text-neon-green transition-colors">Trading</h2>
                            <p className="text-sm text-text-muted leading-relaxed">
                                Crypto, Forex & More
                            </p>
                        </div>
                    </motion.div>
                </Link>

                {/* ── Fixed Deposit Card (Disabled) ── */}
                <div
                    className="relative overflow-hidden rounded-3xl border-2 border-warning/15 opacity-65 cursor-not-allowed"
                    style={{ minHeight: '200px' }}
                >
                    {/* Background Image */}
                    <div className="absolute inset-0">
                        <Image
                            src="/img/fd_bg.png"
                            alt=""
                            fill
                            className="object-cover opacity-35"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/40" />
                    </div>

                    {/* Content - Centered */}
                    <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-10">
                        <div className="w-16 h-16 rounded-2xl bg-warning/10 border border-warning/15 flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-warning/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-2m0-14V3m-7 9H3m18 0h-2M5.636 5.636l1.414 1.414m11.314 11.314l-1.414-1.414M5.636 18.364l1.414-1.414M18.364 5.636l-1.414 1.414" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-extrabold text-text-muted mb-2">Fixed Deposit</h2>
                        <p className="text-sm text-text-muted leading-relaxed mb-3">
                            Secure, low-risk returns
                        </p>
                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider"
                            style={{ background: 'rgba(255,170,0,0.15)', color: '#ffaa00', border: '1px solid rgba(255,170,0,0.25)' }}>
                            <LockClosedIcon className="w-3.5 h-3.5" />
                            Coming Soon
                        </span>
                    </div>
                </div>
            </motion.div>

            {/* Go to Dashboard link */}
            <motion.div variants={item} className="mt-8">
                <Link href="/dashboard" className="text-xs text-text-muted hover:text-neon-green transition-colors underline underline-offset-4">
                    Go to Dashboard →
                </Link>
            </motion.div>
        </motion.div>
    );
}
