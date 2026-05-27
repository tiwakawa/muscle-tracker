"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getTokens, userSettingsApi, exportApi, clearTokens } from "@/lib/api";
import BottomNav from "@/components/BottomNav";

const ACCENT = "#5b5bf2";

export default function SettingsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [savedPrompt, setSavedPrompt] = useState("");
  const [defaultPrompt, setDefaultPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportState, setExportState] = useState<"idle" | "exporting" | "done">("idle");
  const [exportUrl, setExportUrl] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = useCallback((type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    if (!getTokens()) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    userSettingsApi.get().then((data) => {
      setDefaultPrompt(data.default_system_prompt);
      const prompt = data.system_prompt ?? data.default_system_prompt;
      setSystemPrompt(prompt);
      setSavedPrompt(prompt);
      setLoading(false);
    });
  }, [ready]);

  const isDirty = systemPrompt !== savedPrompt;

  const handleReset = () => {
    setSystemPrompt(defaultPrompt);
  };

  const handleExport = async () => {
    setExportState("exporting");
    try {
      const { url } = await exportApi.exportAll();
      setExportUrl(url);
      setExportState("done");
      const now = new Date();
      setLastSyncTime(`${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
      showToast("success", "同期しました");
    } catch {
      setExportState("idle");
      showToast("error", "同期に失敗しました");
    }
  };

  const handleLogout = () => {
    clearTokens();
    sessionStorage.setItem("flash", "ログアウトしました");
    router.replace("/login");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const isDefault = systemPrompt.trim() === defaultPrompt.trim();
      await userSettingsApi.update(isDefault ? null : systemPrompt);
      setSavedPrompt(systemPrompt);
      showToast("success", "保存しました");
    } catch {
      showToast("error", "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA]">
        <div className="animate-spin h-8 w-8 border-4 border-[#5b5bf2] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      {/* Top app bar */}
      <div className="sticky top-0 z-50 bg-[#FAFAFA] flex items-center px-5 h-[60px]">
        <span className="text-xl font-bold text-gray-900 tracking-tight">設定</span>
      </div>

      <div className="px-4 pb-6 flex flex-col gap-3">
        {/* Card 1: AI ADVICE */}
        <div className="bg-white rounded-2xl border border-black/[0.08] shadow-[0_1px_2px_rgba(15,18,40,0.06),0_6px_16px_rgba(15,18,40,0.06)] px-4 py-3.5">
          <div className="text-[10px] font-semibold text-gray-400 tracking-[0.12em] mb-1">AI ADVICE</div>
          <div className="text-[15px] font-bold text-gray-900 tracking-tight mb-1">システムプロンプト</div>
          <div className="text-[11px] font-medium text-gray-500 leading-relaxed mb-3">
            AIアドバイスを取得する際に送信される指示文です。
            <br />
            必要に応じて年齢・体重・目的・通院情報などを追記してください。
          </div>

          {loading ? (
            <div className="h-48 bg-[#F3F3F6] rounded-[10px] animate-pulse" />
          ) : (
            <>
              {/* Textarea container */}
              <div className="bg-[#F3F3F6] rounded-[10px] border border-black/[0.08] px-3 py-2.5">
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full border-none bg-transparent outline-none resize-y text-xs leading-relaxed text-gray-900"
                  style={{ minHeight: 180 }}
                />
                <div className="flex justify-end mt-1.5 pt-1.5 border-t border-black/[0.05]">
                  <span className="font-mono text-[10px] font-medium text-gray-400">
                    {systemPrompt.length} 文字
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end mt-3">
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-[10px] bg-white border border-black/[0.08]
                    text-xs font-semibold text-gray-500"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6a3.5 3.5 0 1 0 1.1-2.5M2.5 2v2h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  デフォルトに戻す
                </button>
                <button
                  onClick={handleSave}
                  disabled={!isDirty || saving}
                  className="px-4 py-2 rounded-[10px] text-white text-xs font-bold tracking-tight
                    disabled:cursor-not-allowed transition-all"
                  style={{
                    background: isDirty ? ACCENT : "oklch(0.85 0.04 270)",
                  }}
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Card 2: EXPORT */}
        <div className="bg-white rounded-2xl border border-black/[0.08] shadow-[0_1px_2px_rgba(15,18,40,0.06),0_6px_16px_rgba(15,18,40,0.06)] px-4 py-3.5">
          <div className="text-[10px] font-semibold text-gray-400 tracking-[0.12em] mb-1">EXPORT</div>
          <div className="text-[15px] font-bold text-gray-900 tracking-tight mb-1">Google Sheets 連携</div>
          <div className="text-[11px] font-medium text-gray-500 leading-relaxed mb-3">
            記録データを Google スプレッドシートに同期します。
          </div>

          {/* Last sync info */}
          {(lastSyncTime || exportState === "done") && (
            <div className="flex items-center justify-between bg-[#F3F3F6] rounded-[10px] px-3 py-2.5 mb-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-gray-400 tracking-[0.08em]">最終同期</span>
                <span className="font-mono text-xs font-semibold text-gray-900">
                  {lastSyncTime ?? "—"}
                </span>
              </div>
              {exportUrl && (
                <a
                  href={exportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-transparent border border-black/[0.08]
                    text-[11px] font-semibold text-gray-500"
                >
                  シートを開く
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M4 2h6v6M10 2L5 7M5.5 3.5H3a1 1 0 0 0-1 1V9a1 1 0 0 0 1 1h4.5a1 1 0 0 0 1-1V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              )}
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={exportState === "exporting"}
            className="w-full py-2.5 rounded-xl text-white text-[13px] font-bold tracking-tight
              disabled:opacity-50 transition-all"
            style={{ background: ACCENT }}
          >
            {exportState === "exporting" ? "同期中..." : "データを同期"}
          </button>
        </div>

        {/* Card 3: App Info */}
        <div className="bg-white rounded-2xl border border-black/[0.08] shadow-[0_1px_2px_rgba(15,18,40,0.06),0_6px_16px_rgba(15,18,40,0.06)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-[13px] font-medium text-gray-900">バージョン</span>
            <span className="font-mono text-xs font-medium text-gray-400">
              {process.env.APP_VERSION ?? "—"}
            </span>
          </div>
        </div>

        {/* Card 4: Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-1.5 py-3.5 px-4 rounded-[14px]
            bg-white border border-black/[0.08] text-[13px] font-semibold"
          style={{ color: "oklch(0.5 0.16 25)" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5.5 3.5V2.2C5.5 1.6 5.9 1.2 6.5 1.2h4.3c.6 0 1 .4 1 1v9.6c0 .6-.4 1-1 1H6.5c-.6 0-1-.4-1-1V9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M2 7h7M7 4.5L9.5 7 7 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          ログアウト
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-16 left-1/2 -translate-x-1/2 z-[200] px-5 py-2.5 rounded-xl shadow-lg text-sm text-white ${
            toast.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {toast.text}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
