"use client";

import { useState, useEffect } from "react";
import { aiAdviceApi } from "@/lib/api";
import { buildAiText } from "@/lib/workoutUtils";
import type { Workout } from "@/lib/types";

interface Props {
  workout: Workout;
  onClose: () => void;
}

export default function AiAdviceModal({ workout, onClose }: Props) {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copyToast, setCopyToast] = useState(false);

  useEffect(() => {
    aiAdviceApi
      .get(workout.id)
      .then((data) => setAdvice(data.content))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [workout.id]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await aiAdviceApi.create(workout.id);
      setAdvice(data.content);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyAiText = async () => {
    await navigator.clipboard.writeText(buildAiText(workout));
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl w-full max-w-lg p-5 pb-8 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="font-bold text-gray-800">AIアドバイス</h2>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 mb-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-4 border-purple-500 border-t-transparent rounded-full" />
            </div>
          ) : advice ? (
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{advice}</p>
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">まだアドバイスはありません</p>
          )}
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={handleGenerate}
            disabled={generating || loading}
            className="w-full py-2.5 bg-purple-600 text-white rounded-xl font-medium disabled:opacity-50 transition-opacity"
          >
            {generating ? "取得中..." : advice ? "再取得" : "アドバイスを取得"}
          </button>
          <button
            onClick={handleCopyAiText}
            className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm"
          >
            AI用テキストをコピー
          </button>
        </div>

        {copyToast && (
          <p className="mt-2 text-center text-xs text-gray-500">コピーしました</p>
        )}
      </div>
    </div>
  );
}
