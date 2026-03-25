'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, ChartBarSquareIcon, BanknotesIcon, WalletIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { HomeIcon as HomeIconSolid, ChartBarSquareIcon as ChartBarSquareIconSolid, BanknotesIcon as BanknotesIconSolid, WalletIcon as WalletIconSolid, UserCircleIcon as UserCircleIconSolid } from '@heroicons/react/24/solid';

const navItems = [
    { label: 'Home', href: '/fd/home', Icon: HomeIcon, ActiveIcon: HomeIconSolid },
    { label: 'Dashboard', href: '/fd/dashboard', Icon: ChartBarSquareIcon, ActiveIcon: ChartBarSquareIconSolid },
    { label: 'Invest', href: '/fd/invest', Icon: BanknotesIcon, ActiveIcon: BanknotesIconSolid },
    { label: 'Assets', href: '/fd/assets', Icon: WalletIcon, ActiveIcon: WalletIconSolid },
    { label: 'Profile', href: '/fd/profile', Icon: UserCircleIcon, ActiveIcon: UserCircleIconSolid },
];

export default function FDBottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" style={{ background: 'rgba(6,6,18,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-around max-w-lg mx-auto py-2 px-1">
                {navItems.map(({ label, href, Icon, ActiveIcon }) => {
                    const active = pathname === href || pathname.startsWith(href + '/');
                    const Ic = active ? ActiveIcon : Icon;
                    return (
                        <Link key={href} href={href} className="flex flex-col items-center gap-0.5 py-1.5 px-2 relative">
                            {active && (
                                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full" style={{ background: '#00d4ff', boxShadow: '0 0 8px rgba(0,212,255,0.6)' }} />
                            )}
                            <Ic className={`w-5 h-5 transition-colors ${active ? 'text-neon-cyan' : 'text-text-muted'}`} />
                            <span className={`text-[10px] font-medium transition-colors ${active ? 'text-neon-cyan' : 'text-text-muted'}`}>{label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
