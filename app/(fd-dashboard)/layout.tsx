import FDBottomNav from '@/components/FDBottomNav';
import FDSidebar from '@/components/FDSidebar';

export default function FDDashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen overflow-x-hidden">
            <FDSidebar />
            <main className="flex-1 relative overflow-x-hidden">
                <div className="page-container overflow-x-hidden">
                    {children}
                </div>
                <FDBottomNav />
            </main>
        </div>
    );
}
