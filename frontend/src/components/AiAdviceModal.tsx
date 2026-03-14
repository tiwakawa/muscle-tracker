"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 2000);
  };

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
    showToast("トレーニングデータをコピーしました");
  };

  const handleCopyAdvice = async () => {
    if (!advice) return;
    await navigator.clipboard.writeText(advice);
    showToast("アドバイスをコピーしました");
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
            <div className="text-sm text-gray-700 leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children }) => <div className="overflow-x-auto mb-2"><table className="min-w-full text-xs border-collapse">{children}</table></div>,
                  thead: ({ children }) => <thead className="bg-gray-100">{children}</thead>,
                  th: ({ children }) => <th className="border border-gray-300 px-2 py-1 text-left font-semibold">{children}</th>,
                  td: ({ children }) => <td className="border border-gray-300 px-2 py-1">{children}</td>,
                  h1: ({ children }) => <h1 className="text-base font-bold mt-4 mb-1">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-bold mt-4 mb-1">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-bold mt-3 mb-1">{children}</h3>,
                  p: ({ children }) => <p className="mb-2">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
                  li: ({ children }) => <li className="ml-2">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  hr: () => <hr className="my-3 border-gray-200" />,
                }}
              >
                {advice}
              </ReactMarkdown>
            </div>
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
          {advice && (
            <button
              onClick={handleCopyAdvice}
              className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm"
            >
              アドバイスをコピー
            </button>
          )}
          <button
            onClick={handleCopyAiText}
            className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm"
          >
            トレーニングデータをコピー
          </button>
        </div>

        {toast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl shadow-lg text-sm text-white bg-green-500">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
