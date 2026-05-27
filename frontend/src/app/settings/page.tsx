"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getTokens, userSettingsApi, exportApi, clearTokens } from "@/lib/api";
import BottomNav from "@/components/BottomNav";

export default function SettingsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [defaultPrompt, setDefaultPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportState, setExportState] = useState<"idle" | "exporting" | "done">("idle");
  const [exportUrl, setExportUrl] = useState("");
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
      setSystemPrompt(data.system_prompt ?? data.default_system_prompt);
      setLoading(false);
    });
  }, [ready]);

  const handleReset = () => {
    if (!confirm("デフォルトのプロンプトに戻しますか？\n（保存はされません）")) return;
    setSystemPrompt(defaultPrompt);
  };

  const handleExport = async () => {
    setExportState("exporting");
    try {
      const { url } = await exportApi.exportAll();
      setExportUrl(url);
      setExportState("done");
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
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl shadow-lg text-sm text-white transition-all ${
            toast.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Top app bar */}
      <div className="sticky top-0 z-50 bg-[#FAFAFA] flex items-center px-5 h-[60px]">
        <span className="text-xl font-bold text-gray-900 tracking-tight">設定</span>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            AIアドバイス システムプロンプト
          </label>
        </div>

        {loading ? (
          <div className="h-48 bg-gray-100 rounded animate-pulse" />
        ) : (
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#5b5bf2]/40 resize-none"
            rows={10}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
          />
        )}

        <p className="mt-1 text-xs text-gray-500">
          必要に応じて年齢・体重・目的・通院情報などを追記してください
        </p>

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            デフォルトに戻す
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="px-6 py-2 text-sm bg-[#5b5bf2] text-white rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-3">Google Sheets 連携</p>
          <button
            onClick={handleExport}
            disabled={exportState === "exporting"}
            className="px-6 py-2 text-sm bg-[#5b5bf2] text-white rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
          >
            {exportState === "exporting" ? "同期中..." : "データを同期"}
          </button>
          {exportState === "done" && (
            <a
              href={exportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-2 text-sm text-[#5b5bf2] underline"
            >
              Google Sheetsで確認する →
            </a>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ログアウト
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
