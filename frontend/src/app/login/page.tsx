"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi, getTokens } from "@/lib/api";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConf, setPasswordConf] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getTokens()) router.replace("/");
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
          return;
        }
        await authApi.signUp(email, password, passwordConf);
      }
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
    <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-indigo-800 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">💪</div>
          <h1 className="text-2xl font-bold text-white">Muscle Tracker</h1>
          <p className="text-indigo-200 text-sm mt-1">筋トレ・ボディ記録アプリ</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {/* Tab */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-5">
            {(["login", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                {m === "login" ? "ログイン" : "新規登録"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6文字以上"
                required
                minLength={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 text-base"
              />
            </div>

            {mode === "signup" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  パスワード（確認）
                </label>
                <input
                  type="password"
                  value={passwordConf}
                  onChange={(e) => setPasswordConf(e.target.value)}
                  placeholder="もう一度入力"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 text-base"
                />
              </div>
            )}

            {error && (
              <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium text-base hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition-colors"
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
    </div>
  );
}
