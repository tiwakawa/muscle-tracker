"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi, getTokens } from "@/lib/api";

const ACCENT = "#5b5bf2";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConf, setPasswordConf] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConf, setShowPasswordConf] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (getTokens()) router.replace("/");
    const msg = sessionStorage.getItem("flash");
    if (msg) {
      sessionStorage.removeItem("flash");
      setToast(msg);
      setTimeout(() => setToast(null), 3000);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await authApi.signIn(email, password);
      } else {
        if (password !== passwordConf) {
          setError("パスワードが一致しません");
          setLoading(false);
          return;
        }
        await authApi.signUp(email, password, passwordConf);
      }
      sessionStorage.setItem("flash", "ログインしました");
      router.replace("/");
    } catch {
      setError(
        mode === "login"
          ? "メールアドレスまたはパスワードが間違っています"
          : "登録に失敗しました。入力内容を確認してください"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-6 py-16">
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] px-5 py-2.5 rounded-xl shadow-lg text-sm text-white bg-green-500">
          {toast}
        </div>
      )}

      {/* Brand area */}
      <div className="flex flex-col items-center mb-9">
        <img
          src="/icons/icon-192.png"
          alt="Muscle Tracker"
          className="w-[72px] h-[72px] rounded-[18px] shadow-[0_4px_12px_rgba(15,18,40,0.06)]"
        />
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight mt-4">
          Muscle Tracker
        </h1>
        <p className="text-xs font-medium text-gray-500 mt-1">筋トレ記録アプリ</p>
      </div>

      <div className="w-full max-w-sm">
        {/* Tab (segmented control) */}
        <div className="flex p-[3px] bg-[#F3F3F6] rounded-[10px] mb-6">
          {(["login", "signup"] as Mode[]).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-2 rounded-lg text-[13px] transition-all ${
                  active
                    ? "bg-white font-bold shadow-[0_1px_2px_rgba(15,18,40,0.08)]"
                    : "text-gray-500 font-medium"
                }`}
                style={{ color: active ? ACCENT : undefined }}
              >
                {m === "login" ? "ログイン" : "新規登録"}
              </button>
            );
          })}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Email */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 tracking-wide mb-1.5">
              メールアドレス
            </label>
            <div className="flex items-center h-11 px-3 bg-white border border-black/[0.08] rounded-xl
              focus-within:border-[#5b5bf2] focus-within:ring-2 focus-within:ring-[#5b5bf2]/10 transition-all">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400 flex-shrink-0 mr-2.5">
                <rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M2 5l6 4 6-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                className="flex-1 border-none outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 tracking-wide mb-1.5">
              パスワード
            </label>
            <div className="flex items-center h-11 px-3 bg-white border border-black/[0.08] rounded-xl
              focus-within:border-[#5b5bf2] focus-within:ring-2 focus-within:ring-[#5b5bf2]/10 transition-all">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400 flex-shrink-0 mr-2.5">
                <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "6文字以上" : "パスワード"}
                required
                minLength={mode === "signup" ? 6 : undefined}
                className="flex-1 border-none outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 flex-shrink-0 ml-2 p-0.5"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.4"/>
                    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.4"/>
                    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M3 13L13 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Password confirmation (signup only) */}
          {mode === "signup" && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 tracking-wide mb-1.5">
                パスワード（確認）
              </label>
              <div className="flex items-center h-11 px-3 bg-white border border-black/[0.08] rounded-xl
                focus-within:border-[#5b5bf2] focus-within:ring-2 focus-within:ring-[#5b5bf2]/10 transition-all">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400 flex-shrink-0 mr-2.5">
                  <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <input
                  type={showPasswordConf ? "text" : "password"}
                  value={passwordConf}
                  onChange={(e) => setPasswordConf(e.target.value)}
                  placeholder="もう一度入力"
                  required
                  minLength={6}
                  className="flex-1 border-none outline-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConf(!showPasswordConf)}
                  className="text-gray-400 flex-shrink-0 ml-2 p-0.5"
                  tabIndex={-1}
                >
                  {showPasswordConf ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.4"/>
                      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.4"/>
                      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M3 13L13 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-[10px] font-semibold px-1" style={{ color: "oklch(0.5 0.14 25)" }}>
              {error}
            </p>
          )}

          {/* CTA */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-[50px] rounded-xl text-white text-sm font-bold tracking-tight mt-3
              disabled:cursor-not-allowed transition-all"
            style={{
              background: loading ? "oklch(0.85 0.04 270)" : ACCENT,
              boxShadow: loading ? "none" : "0 4px 12px rgba(91,91,242,0.3), 0 1px 2px rgba(91,91,242,0.15)",
            }}
          >
            {loading
              ? "処理中..."
              : mode === "login"
                ? "ログイン"
                : "アカウント作成"}
          </button>
        </form>
      </div>
    </div>
  );
}
