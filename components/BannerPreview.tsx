"use client";
import { RevisionAction } from "@/types/banner";

interface BannerPreviewProps {
  imageUrl: string | null;
  isLoading: boolean;
  loadingProgress: number;
  onRegenerate: () => void;
  onRevision: (action: RevisionAction) => void;
}

const revisionActions: Array<{ value: RevisionAction; label: string }> = [
  { value: "move-left", label: "Move Left" },
  { value: "more-premium", label: "More Premium" },
  { value: "reduce-clutter", label: "Reduce Clutter" },
  { value: "make-logo-bigger", label: "Make Logo Bigger" },
  { value: "change-phone-placement", label: "Change Phone Placement" }
];

export const BannerPreview = ({ imageUrl, isLoading, loadingProgress, onRegenerate, onRevision }: BannerPreviewProps) => {
  return (
    <section className="rounded-2xl border border-slate-800/90 bg-slate-900/75 p-6 shadow-[0_20px_45px_-30px_rgba(2,6,23,0.95)] backdrop-blur-xl" aria-live="polite">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-100">Preview</h2>
          <p className="text-sm text-slate-400">Output resolution is fixed at 1584x396 px.</p>
        </div>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={isLoading || !imageUrl}
          className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Working..." : "Regenerate"}
        </button>
      </div>

      <div className="relative mb-5 overflow-hidden rounded-xl border border-slate-700 bg-slate-950/80 shadow-inner">
        {imageUrl ? (
          <img
            key={imageUrl}
            src={imageUrl}
            alt="Generated LinkedIn banner preview"
            className="h-auto w-full"
          />
        ) : (
          <div className="flex aspect-[4/1] items-center justify-center text-sm text-slate-400">
            Generated banner preview will appear here.
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="mb-5 rounded-xl border border-blue-500/40 bg-blue-950/40 p-3">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-blue-100">
            <span>Sending settings to ChatGPT and generating image...</span>
            <span>{Math.round(loadingProgress)}%</span>
          </div>
          <progress
            value={Math.max(6, Math.min(100, loadingProgress))}
            max={100}
            className="h-2 w-full overflow-hidden rounded-full"
            aria-label="Generation progress"
          />
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {revisionActions.map((action) => (
          <button
            key={action.value}
            type="button"
            onClick={() => onRevision(action.value)}
            disabled={isLoading || !imageUrl}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {action.label}
          </button>
        ))}
      </div>

      {imageUrl ? (
        <a
          href={imageUrl}
          download="linkedin-banner.png"
          className="inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          Download PNG
        </a>
      ) : null}
    </section>
  );
};
