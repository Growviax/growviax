import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen overflow-x-hidden">
            <Sidebar />
            <main className="flex-1 relative overflow-x-hidden">
                <div className="page-container overflow-x-hidden">
                    {children}
                </div>
                <BottomNav />
            </main>
        </div>
    );
}
