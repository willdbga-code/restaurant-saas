import { AuthProvider } from "@/context/AuthContext";
import { Sidebar } from "@/components/admin/Sidebar";
import { MobileNav } from "@/components/admin/MobileNav";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { NotificationInitializer } from "@/components/admin/NotificationInitializer";
import { SupportWidget } from "@/components/admin/SupportWidget";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminGuard>
        <div className="flex flex-col min-h-screen bg-zinc-950">
          <NotificationInitializer />
          <ImpersonationBanner />
          <div className="flex flex-col flex-1 md:flex-row overflow-hidden bg-zinc-900 relative">
            <Sidebar />
            <MobileNav />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
            <SupportWidget />
          </div>
        </div>
      </AdminGuard>
    </AuthProvider>
  );
}

