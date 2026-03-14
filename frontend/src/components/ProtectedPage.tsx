"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearTokens, getTokens } from "@/lib/api";
import BottomNav from "./BottomNav";

export default function ProtectedPage({
  title,
  children,
  headerRight,
}: {
  title: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!getTokens()) {
      router.replace("/login");
    } else {
      setReady(true);
      const msg = sessionStorage.getItem("flash");
      if (msg) {
        sessionStorage.removeItem("flash");
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
      }
    }
  }, [router]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleLogout = () => {
    clearTokens();
    sessionStorage.setItem("flash", "ログアウトしました");
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl shadow-lg text-sm text-white bg-green-500">
          {toast}
        </div>
      )}
      <header className="fixed top-0 left-0 right-0 bg-indigo-600 text-white z-10 shadow-md">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="font-bold text-base">{title}</h1>
          {headerRight ?? (
            <button
              onClick={handleLogout}
              className="text-xs text-indigo-200 hover:text-white px-2 py-1 rounded"
            >
              ログアウト
            </button>
          )}
        </div>
      </header>
      <main className="pt-14">{children}</main>
      <BottomNav />
    </div>
  );
}
