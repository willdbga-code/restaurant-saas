import { AuthProvider } from "@/context/AuthContext";
import { AdminGuard } from "@/components/admin/AdminGuard";

// KDS usa layout full-screen (sem Sidebar) — otimizado para tablets na cozinha
export default function KDSLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminGuard>
        <div className="h-screen overflow-hidden bg-zinc-950">
          {children}
        </div>
      </AdminGuard>
    </AuthProvider>
  );
}
