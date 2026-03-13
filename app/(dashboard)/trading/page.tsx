'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
    LockClosedIcon,
} from '@heroicons/react/24/outline';

const categories = [
    {
        name: 'Crypto',
        description: 'Digital currencies and blockchain assets',
        href: '/trade/bitcoin',
        enabled: true,
        bgImage: '/img/crypto_bg.png',
        borderColor: 'rgba(0,255,136,0.25)',
        hoverBorder: 'rgba(0,255,136,0.45)',
    },
    {
        name: 'Forex',
        description: 'Foreign exchange currency pairs',
        href: '#',
        enabled: false,
        bgImage: '/img/forex_bg.png',
        borderColor: 'rgba(0,212,255,0.15)',
        hoverBorder: 'rgba(0,212,255,0.3)',
    },
    {
        name: 'Stocks',
        description: 'Equity markets and securities',
        href: '#',
        enabled: false,
        bgImage: '/img/stocks_bg.png',
        borderColor: 'rgba(168,85,247,0.15)',
        hoverBorder: 'rgba(168,85,247,0.3)',
    },
];

export default function TradingPage() {
    const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15 } } };
    const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } } };

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="px-2 pt-6 pb-6 space-y-6">
            {/* Header */}
            <motion.div variants={item} className="text-center mb-2">
                <h1 className="text-2xl font-extrabold tracking-tight">Choose your trading universe</h1>
                <p className="text-xs text-text-muted mt-2">Select a market to start trading</p>
            </motion.div>

            {/* Category Cards */}
            <div className="space-y-5">
                {categories.map((cat) => {
                    const Wrapper = cat.enabled ? Link : 'div' as any;
                    const wrapperProps = cat.enabled ? { href: cat.href } : {};

                    return (
                        <motion.div key={cat.name} variants={item}>
                            <Wrapper {...wrapperProps}>
                                <motion.div
                                    whileHover={cat.enabled ? { scale: 1.02 } : undefined}
                                    whileTap={cat.enabled ? { scale: 0.98 } : undefined}
                                    className={`relative overflow-hidden rounded-3xl border-2 ${cat.enabled ? 'cursor-pointer group' : 'opacity-55 cursor-not-allowed'}`}
                                    style={{
                                        minHeight: '180px',
                                        borderColor: cat.borderColor,
                                    }}
                                >
                                    {/* Background Image */}
                                    <div className="absolute inset-0">
                                        <Image
                                            src={cat.bgImage}
                                            alt=""
                                            fill
                                            className={`object-cover ${cat.enabled ? 'opacity-50 group-hover:opacity-65' : 'opacity-30'} transition-opacity duration-500`}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" />
                                    </div>

                                    {/* Coming Soon badge */}
                                    {!cat.enabled && (
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                                            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider"
                                                style={{ background: 'rgba(255,170,0,0.2)', color: '#ffaa00', border: '1px solid rgba(255,170,0,0.3)' }}>
                                                <LockClosedIcon className="w-3.5 h-3.5" />
                                                Coming Soon
                                            </span>
                                        </div>
                                    )}

                                    {/* Content - Centered */}
                                    <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-10">
                                        <h2 className={`text-2xl font-extrabold mb-2 ${cat.enabled ? 'text-white group-hover:text-neon-green' : 'text-text-muted'} transition-colors`}>
                                            {cat.name}
                                        </h2>
                                        <p className="text-sm text-text-muted leading-relaxed">
                                            {cat.description}
                                        </p>
                                    </div>
                                </motion.div>
                            </Wrapper>
                        </motion.div>
                    );
                })}
            </div>

            {/* Back to home link */}
            <motion.div variants={item} className="text-center pt-2">
                <Link href="/home" className="text-xs text-text-muted hover:text-neon-green transition-colors underline underline-offset-4">
                    ← Back to Home
                </Link>
            </motion.div>
        </motion.div>
    );
}
