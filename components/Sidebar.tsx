'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import axios from 'axios';
import {
    HomeIcon, ChartBarIcon, WalletIcon, UserIcon, TicketIcon,
    Cog6ToothIcon, ShieldCheckIcon, MegaphoneIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const sidebarLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Market', href: '/market', icon: ChartBarIcon },
    { name: 'Assets', href: '/assets', icon: WalletIcon },
    { name: 'Support', href: '/support', icon: TicketIcon },
    { name: 'Profile', href: '/profile', icon: UserIcon },
    { name: 'Promotion', href: '/promotion', icon: MegaphoneIcon },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const res = await axios.get('/api/user');
                if (res.data.user?.role === 'admin') {
                    setIsAdmin(true);
                }
            } catch { }
        };
        checkAdmin();
    }, []);

    const allLinks = isAdmin
        ? [...sidebarLinks, { name: 'Admin', href: '/admin', icon: ShieldCheckIcon }]
        : sidebarLinks;

    return (
        <aside className="hidden md:flex md:flex-col md:w-[260px] md:min-h-screen border-r border-glass-border bg-dark-surface/60 backdrop-blur-2xl">
            {/* Logo */}
            <div className="px-7 py-7 border-b border-glass-border">
                <Link href="/dashboard" className="block">
                    <Image src="/img/logo.png" alt="GrowViax" width={150} height={44} className="h-10 w-auto" />
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-5 px-4 space-y-1">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest px-4 mb-3">Menu</p>
                {allLinks.map((link) => {
                    const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={clsx(
                                'group flex items-center gap-3.5 px-4 py-3 rounded-xl text-[14px] font-medium transition-all duration-300 relative',
                                isActive
                                    ? link.name === 'Admin' ? 'bg-neon-purple/10 text-neon-purple' : 'bg-neon-green/10 text-neon-green'
                                    : 'text-text-secondary hover:text-text-primary hover:bg-glass-hover'
                            )}
                        >
                            {isActive && (
                                <div className={clsx(
                                    'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full',
                                    link.name === 'Admin' ? 'bg-neon-purple' : 'bg-neon-green'
                                )} />
                            )}
                            <link.icon className={clsx('w-5 h-5 transition-colors', isActive ? (link.name === 'Admin' ? 'text-neon-purple' : 'text-neon-green') : 'text-text-muted group-hover:text-text-secondary')} />
                            <span>{link.name}</span>
                            {isActive && (
                                <div className={clsx(
                                    'ml-auto w-1.5 h-1.5 rounded-full shadow-[0_0_6px_rgba(0,255,136,0.5)]',
                                    link.name === 'Admin' ? 'bg-neon-purple' : 'bg-neon-green'
                                )} />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-glass-border">
                <div className="glass-card-flat flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-neon-green/15 flex items-center justify-center">
                        <Cog6ToothIcon className="w-4 h-4 text-neon-green" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-text-primary">GrowViax</p>
                        <p className="text-[10px] text-text-muted">v1.0 • Premium</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
