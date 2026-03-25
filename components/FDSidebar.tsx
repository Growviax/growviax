'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import axios from 'axios';
import toast from 'react-hot-toast';
import { HomeIcon, ChartBarSquareIcon, BanknotesIcon, WalletIcon, UserCircleIcon, LifebuoyIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

const navItems = [
    { label: 'Home', href: '/fd/home', Icon: HomeIcon },
    { label: 'Dashboard', href: '/fd/dashboard', Icon: ChartBarSquareIcon },
    { label: 'Invest', href: '/fd/invest', Icon: BanknotesIcon },
    { label: 'Assets', href: '/fd/assets', Icon: WalletIcon },
    { label: 'Support', href: '/fd/support', Icon: LifebuoyIcon },
    { label: 'Profile', href: '/fd/profile', Icon: UserCircleIcon },
];

export default function FDSidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await axios.post('/api/fd/auth/logout');
            toast.success('Logged out');
            router.push('/fd/login');
        } catch { toast.error('Logout failed'); }
    };

    return (
        <aside className="hidden md:flex flex-col w-64 min-h-screen border-r border-glass-border" style={{ background: 'rgba(12,12,36,0.6)' }}>
            <div className="p-6 border-b border-glass-border">
                <Link href="/fd/home" className="flex items-center gap-3">
                    <Image src="/img/logo.png" alt="GrowViax" width={140} height={42} className="h-10 w-auto" />
                </Link>
                <span className="inline-flex items-center mt-3 px-3 py-1 rounded-full text-[11px] font-bold"
                    style={{ background: 'rgba(0,212,255,0.12)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.2)' }}>
                    FD Platform
                </span>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {navItems.map(({ label, href, Icon }) => {
                    const active = pathname === href || pathname.startsWith(href + '/');
                    return (
                        <Link key={href} href={href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active
                                ? 'bg-neon-cyan/10 text-neon-cyan'
                                : 'text-text-muted hover:text-text-secondary hover:bg-glass-hover'}`}>
                            <Icon className="w-5 h-5" />
                            {label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-glass-border">
                <button onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-text-muted hover:text-neon-red hover:bg-neon-red/5 transition-all w-full">
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    Logout
                </button>
            </div>
        </aside>
    );
}
