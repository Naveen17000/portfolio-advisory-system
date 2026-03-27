"use client";

import AuthGuard from "@/components/layout/AuthGuard";
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import Sidebar from "@/components/layout/Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <ErrorBoundary>
          <main className="flex-1 min-w-0 flex flex-col" role="main">
            {children}
          </main>
        </ErrorBoundary>
      </div>
    </AuthGuard>
  );
}
