"use client";

import { AuthProvider } from "@/context/AuthContext";
import { SuperSidebar } from "@/components/super/SuperSidebar";
import { SuperGuard } from "@/components/super/SuperGuard";
import { ThemeInjector } from "@/components/menu/ThemeInjector";

export default function SuperLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SuperGuard>
        <div className="flex h-screen overflow-hidden bg-zinc-950 font-outfit text-white">
          <ThemeInjector color="#f97316" /> {/* Orange default for Super Admin */}
          <SuperSidebar />
          <main className="flex-1 overflow-y-auto bg-zinc-950">
            <div className="mx-auto max-w-7xl px-8 py-10">
              {children}
            </div>
          </main>
        </div>
      </SuperGuard>
    </AuthProvider>
  );
}
