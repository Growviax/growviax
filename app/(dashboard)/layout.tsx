import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 relative">
                <div className="page-container">
                    {children}
                </div>
                <BottomNav />
            </main>
        </div>
    );
}
