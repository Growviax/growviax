'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import axios from 'axios';
import {
    HomeIcon, ChartBarIcon, WalletIcon, UserIcon, MegaphoneIcon, ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import {
    HomeIcon as HomeIconSolid, ChartBarIcon as ChartBarIconSolid,
    WalletIcon as WalletIconSolid, UserIcon as UserIconSolid,
    MegaphoneIcon as MegaphoneIconSolid, ShieldCheckIcon as ShieldCheckIconSolid,
} from '@heroicons/react/24/solid';
import clsx from 'clsx';

const baseTabs = [
    { name: 'Home', href: '/dashboard', icon: HomeIcon, activeIcon: HomeIconSolid },
    { name: 'Market', href: '/market', icon: ChartBarIcon, activeIcon: ChartBarIconSolid },
    { name: 'Promo', href: '/promotion', icon: MegaphoneIcon, activeIcon: MegaphoneIconSolid, isPromo: true },
    { name: 'Assets', href: '/assets', icon: WalletIcon, activeIcon: WalletIconSolid },
    { name: 'Profile', href: '/profile', icon: UserIcon, activeIcon: UserIconSolid },
];

export default function BottomNav() {
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

    const tabs = isAdmin
        ? [...baseTabs, { name: 'Admin', href: '/admin', icon: ShieldCheckIcon, activeIcon: ShieldCheckIconSolid, isPromo: false }]
        : baseTabs;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
            <div className="mx-auto max-w-lg px-3 pb-[env(safe-area-inset-bottom)]">
                <div
                    className="flex items-center justify-between gap-1 py-2 px-2 rounded-t-2xl overflow-x-auto no-scrollbar"
                    style={{
                        background: 'linear-gradient(180deg, rgba(12,12,36,0.92) 0%, rgba(6,6,18,0.98) 100%)',
                        backdropFilter: 'blur(24px) saturate(150%)',
                        WebkitBackdropFilter: 'blur(24px) saturate(150%)',
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
                    }}
                >
                    {tabs.map((tab) => {
                        const isActive = pathname === tab.href || (tab.href !== '/dashboard' && pathname.startsWith(tab.href));
                        const Icon = isActive ? tab.activeIcon : tab.icon;
                        const isAdminTab = tab.name === 'Admin';
                        const isPromo = (tab as any).isPromo;

                        // If it's the admin layout (6 tabs), hide text on very small screens to fit
                        const textVisibilityClass = tabs.length > 5 ? 'hidden xs:block text-[9px] font-semibold mt-0.5' : 'text-[9px] font-semibold mt-0.5';

                        return (
                            <Link
                                key={tab.name}
                                href={tab.href}
                                className={clsx(
                                    'flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-2xl transition-all duration-300 flex-1 min-w-[40px]',
                                    isPromo
                                        ? isActive ? 'text-neon-green' : 'text-neon-green/70'
                                        : isActive
                                            ? isAdminTab ? 'text-neon-purple' : 'text-neon-green'
                                            : 'text-text-muted'
                                )}
                            >
                                <div className="relative">
                                    <Icon className={clsx(
                                        'w-[20px] h-[20px] transition-all duration-300',
                                        isPromo && 'drop-shadow-[0_0_8px_rgba(0,255,136,0.5)]',
                                        isActive && !isPromo && (isAdminTab
                                            ? 'drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                                            : 'drop-shadow-[0_0_8px_rgba(0,255,136,0.4)]')
                                    )} />
                                    {/* Promo always-on glow dot */}
                                    {isPromo && (
                                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-neon-green animate-pulse"
                                            style={{ boxShadow: '0 0 8px rgba(0,255,136,0.6)' }} />
                                    )}
                                </div>
                                <span className={clsx(
                                    textVisibilityClass,
                                    isPromo
                                        ? 'text-neon-green/80'
                                        : isActive
                                            ? isAdminTab ? 'text-neon-purple' : 'text-neon-green'
                                            : 'text-text-muted'
                                )}>
                                    {tab.name}
                                </span>
                                {isActive && (
                                    <div className={clsx(
                                        'w-4 h-[2px] rounded-full mt-0.5',
                                        isAdminTab ? 'bg-neon-purple' : 'bg-neon-green'
                                    )}
                                        style={{ boxShadow: isAdminTab ? '0 0 8px rgba(168,85,247,0.5)' : '0 0 8px rgba(0,255,136,0.5)' }} />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
