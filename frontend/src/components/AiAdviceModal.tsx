"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { aiAdviceApi } from "@/lib/api";
import { buildAiText, formatDate } from "@/lib/workoutUtils";
import type { Workout } from "@/lib/types";

const ACCENT = "#5b5bf2";

interface Props {
  workout: Workout;
  onClose: () => void;
}

export default function AiAdviceModal({ workout, onClose }: Props) {
  const [advice, setAdvice] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 2000);
  };

  // Check for existing advice
  useEffect(() => {
    aiAdviceApi
      .get(workout.id)
      .then((data) => setAdvice(data.content))
      .catch(() => {})
      .finally(() => setChecking(false));
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

  const isResultState = !!advice && !generating;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end"
      style={{ background: "rgba(15,18,40,0.4)", animation: "fadeIn 0.2s ease" }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full rounded-t-3xl flex flex-col"
        style={{
          maxHeight: "92%",
          animation: "slideUp 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: `${ACCENT}12` }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.2l1.4 3.8L12.2 6.4 8.4 7.8 7 11.7 5.6 7.8 1.8 6.4l3.8-1.4L7 1.2z" fill={ACCENT}/>
              </svg>
            </div>
            <span className="text-[16px] font-bold text-gray-900">AIアドバイス</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Content (scrollable) */}
        <div className="flex-1 overflow-y-auto px-5 min-h-[240px]">
          {/* Checking for existing advice */}
          {checking && (
            <div className="flex flex-col items-center text-center py-8">
              <div className="flex justify-center mb-6">
                <div className="animate-spin h-8 w-8 border-4 border-[#5b5bf2] border-t-transparent rounded-full" />
              </div>
              <div className="text-sm font-semibold text-gray-500">確認中...</div>
            </div>
          )}

          {/* Empty / default state */}
          {!isResultState && !generating && !checking && (
            <div className="flex flex-col items-center text-center py-8">
              <div
                className="w-[72px] h-[72px] rounded-3xl flex items-center justify-center mb-5"
                style={{
                  background: "linear-gradient(135deg, oklch(0.85 0.08 270), oklch(0.78 0.12 280))",
                }}
              >
                <svg width="32" height="32" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1.2l1.4 3.8L12.2 6.4 8.4 7.8 7 11.7 5.6 7.8 1.8 6.4l3.8-1.4L7 1.2z" fill="white"/>
                </svg>
              </div>
              <div className="text-[17px] font-bold text-gray-900 mb-1.5">AIにアドバイスを聞く</div>
              <div className="text-xs font-medium text-gray-500">
                今日のトレーニング内容から、評価と提案を行います
              </div>
            </div>
          )}

          {/* Generating state */}
          {generating && (
            <div className="flex flex-col items-center text-center py-8">
              <div className="flex justify-center mb-6">
                <div className="animate-spin h-8 w-8 border-4 border-[#5b5bf2] border-t-transparent rounded-full" />
              </div>
              <div className="text-sm font-semibold text-gray-500 mb-6">分析中...</div>
              {/* Shimmer skeleton */}
              <div className="w-full space-y-2.5">
                <div className="h-3 bg-[#F3F3F6] rounded-md animate-pulse w-full" />
                <div className="h-3 bg-[#F3F3F6] rounded-md animate-pulse w-[85%]" />
                <div className="h-3 bg-[#F3F3F6] rounded-md animate-pulse w-[92%]" />
                <div className="h-3 bg-[#F3F3F6] rounded-md animate-pulse w-[70%]" />
                <div className="h-3 bg-[#F3F3F6] rounded-md animate-pulse w-[88%]" />
              </div>
            </div>
          )}

          {/* Result state */}
          {isResultState && (
            <div className="pb-4">
              {/* Meta row */}
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-[11px] font-semibold text-gray-400">
                  {formatDate(workout.date)} トレーニング
                </span>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-[0.04em]"
                  style={{ background: `${ACCENT}12`, color: ACCENT }}
                >
                  <svg width="8" height="8" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1.2l1.4 3.8L12.2 6.4 8.4 7.8 7 11.7 5.6 7.8 1.8 6.4l3.8-1.4L7 1.2z" fill={ACCENT}/>
                  </svg>
                  AI ANALYSIS
                </span>
              </div>

              {/* Markdown content */}
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
            </div>
          )}
        </div>

        {/* Sticky actions */}
        <div className="flex-shrink-0 border-t border-black/[0.08] px-5 py-4 bg-white">
          {!isResultState && !generating && !checking && (
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleGenerate}
                className="w-full h-[50px] rounded-xl text-white text-sm font-bold tracking-tight
                  flex items-center justify-center gap-2"
                style={{
                  background: ACCENT,
                  boxShadow: `0 4px 12px ${ACCENT}4d, 0 1px 2px ${ACCENT}26`,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1.2l1.4 3.8L12.2 6.4 8.4 7.8 7 11.7 5.6 7.8 1.8 6.4l3.8-1.4L7 1.2z" fill="white"/>
                </svg>
                アドバイスを取得
              </button>
              <button
                onClick={handleCopyAiText}
                className="w-full h-11 rounded-xl text-sm font-semibold text-gray-500
                  flex items-center justify-center gap-2
                  border border-black/[0.08] bg-white"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="4.5" y="4.5" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M9.5 4.5V3.3a1.2 1.2 0 0 0-1.2-1.2H3.2A1.2 1.2 0 0 0 2 3.3v5.1a1.2 1.2 0 0 0 1.2 1.2H4.5" stroke="currentColor" strokeWidth="1.3"/>
                </svg>
                トレーニングデータをコピー
              </button>
            </div>
          )}

          {generating && (
            <button
              disabled
              className="w-full h-[50px] rounded-xl text-white text-sm font-bold tracking-tight
                flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
              style={{ background: ACCENT }}
            >
              分析中...
            </button>
          )}

          {isResultState && (
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full h-[50px] rounded-xl text-white text-sm font-bold tracking-tight
                  flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: ACCENT }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6a3.5 3.5 0 1 0 1.1-2.5M2.5 2v2h2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                再取得
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyAdvice}
                  className="flex-1 h-11 rounded-xl text-xs font-semibold text-gray-500
                    flex items-center justify-center gap-1.5
                    border border-black/[0.08] bg-white"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M8 4V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h1" stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                  アドバイスをコピー
                </button>
                <button
                  onClick={handleCopyAiText}
                  className="flex-1 h-11 rounded-xl text-xs font-semibold text-gray-500
                    flex items-center justify-center gap-1.5
                    border border-black/[0.08] bg-white"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M8 4V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h1" stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                  データをコピー
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] px-5 py-2.5 rounded-xl shadow-lg text-sm text-white bg-green-500">
          {toast}
        </div>
      )}
    </div>
  );
}
