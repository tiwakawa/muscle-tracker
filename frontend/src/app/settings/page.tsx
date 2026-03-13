"use client";

import { useState, useEffect, useCallback } from "react";
import ProtectedPage from "@/components/ProtectedPage";
import { userSettingsApi } from "@/lib/api";

export default function SettingsPage() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [defaultPrompt, setDefaultPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = useCallback((type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    userSettingsApi.get().then((data) => {
      setDefaultPrompt(data.default_system_prompt);
      setSystemPrompt(data.system_prompt ?? data.default_system_prompt);
      setLoading(false);
    });
  }, []);

  const handleReset = () => {
    if (!confirm("デフォルトのプロンプトに戻しますか？\n（保存はされません）")) return;
    setSystemPrompt(defaultPrompt);
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

  return (
    <ProtectedPage title="設定">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl shadow-lg text-sm text-white transition-all ${
            toast.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {toast.text}
        </div>
      )}

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
            className="w-full border border-gray-300 rounded-lg p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
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
            className="px-6 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </ProtectedPage>
  );
}
