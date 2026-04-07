"use client";
import { type PreviewViewport, BannerLayoutEditor } from "@/components/BannerLayoutEditor";
import type { LayoutDragGroup } from "@/lib/nudgeLayoutOverlay";
import { getBannerDimensions, type BannerFormValues, type LayoutElementRect, type LayoutOverlayPayload } from "@/types/banner";
import { useLayoutEffect, useRef, useState } from "react";

interface BannerPreviewProps {
  /** Merged preview when overlay has rendered; may be background-only until first overlay completes. */
  displayUrl: string | null;
  hasBackground: boolean;
  isLoadingBackground: boolean;
  isLoadingOverlay: boolean;
  loadingProgress: number;
  onRegenerateBackground: () => void;
  /** Raw generated/imported background PNG URL (without overlays). */
  backgroundDownloadUrl: string | null;
  /** Final merged PNG for download; disabled until overlay render exists. */
  downloadUrl: string | null;
  layoutValues: BannerFormValues;
  onLayoutDeltaChange: (patch: Partial<BannerFormValues>) => void;
  onResetLayout: () => void;
  layoutOverlayActive: boolean;
  layoutOverlay: LayoutOverlayPayload | null;
  onLayoutDragNudge: (group: LayoutDragGroup, dxBanner: number, dyBanner: number) => void;
  onLayoutResizeNudge: (group: "primary" | "secondary", rect: LayoutElementRect) => void;
  hasPrimaryLogo: boolean;
  hasSecondaryLogo: boolean;
}

export const BannerPreview = ({
  displayUrl,
  hasBackground,
  isLoadingBackground,
  isLoadingOverlay,
  loadingProgress,
  onRegenerateBackground,
  backgroundDownloadUrl,
  downloadUrl,
  layoutValues,
  onLayoutDeltaChange,
  onResetLayout,
  layoutOverlayActive,
  layoutOverlay,
  onLayoutDragNudge,
  onLayoutResizeNudge,
  hasPrimaryLogo,
  hasSecondaryLogo
}: BannerPreviewProps) => {
  const { width: exportW, height: exportH } = getBannerDimensions(layoutValues.bannerType);
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const [previewViewport, setPreviewViewport] = useState<PreviewViewport>({
    width: exportW,
    height: exportH,
    offsetX: 0,
    offsetY: 0
  });

  useLayoutEffect(() => {
    const frame = previewFrameRef.current;
    if (!frame) {
      return;
    }
    const bannerAspect = exportW / exportH;
    const updateViewport = () => {
      const bounds = frame.getBoundingClientRect();
      const frameWidth = bounds.width;
      const frameHeight = bounds.height;
      if (frameWidth <= 0 || frameHeight <= 0) {
        return;
      }
      const frameAspect = frameWidth / frameHeight;
      if (frameAspect > bannerAspect) {
        const fittedWidth = frameHeight * bannerAspect;
        setPreviewViewport({
          width: fittedWidth,
          height: frameHeight,
          offsetX: (frameWidth - fittedWidth) / 2,
          offsetY: 0
        });
        return;
      }
      const fittedHeight = frameWidth / bannerAspect;
      setPreviewViewport({
        width: frameWidth,
        height: fittedHeight,
        offsetX: 0,
        offsetY: (frameHeight - fittedHeight) / 2
      });
    };
    updateViewport();
    const observer = new ResizeObserver(updateViewport);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [exportH, exportW]);

  return (
    <section className="rounded-2xl border border-slate-800/90 bg-slate-900/75 p-6 shadow-[0_20px_45px_-30px_rgba(2,6,23,0.95)] backdrop-blur-xl" aria-live="polite">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-100">Preview</h2>
          <p className="text-sm text-slate-400">
            Output resolution matches banner type: {exportW}×{exportH}px.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {hasBackground
              ? "Background is fixed until you regenerate. Drag dashed regions to move logos, text, or phone; server saves layout in the exported PNG."
              : "Generate a GPT background first, then edit overlays in the form."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onResetLayout}
            disabled={!layoutOverlayActive || isLoadingOverlay}
            className="rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset layout
          </button>
          <button
            type="button"
            onClick={onRegenerateBackground}
            disabled={isLoadingBackground || !hasBackground}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingBackground ? "Working..." : "Regenerate background"}
          </button>
        </div>
      </div>

      <div
        ref={previewFrameRef}
        className="relative mb-5 overflow-hidden rounded-xl border border-slate-700 bg-slate-950/80 shadow-inner"
        style={{ aspectRatio: `${exportW} / ${exportH}` }}
      >
        {displayUrl ? (
          <>
            <img
              key={displayUrl}
              src={displayUrl}
              alt="LinkedIn banner preview"
              className="pointer-events-none h-full w-full object-contain"
            />
            {layoutOverlayActive ? (
              <BannerLayoutEditor
                values={layoutValues}
                layoutOverlay={layoutOverlay}
                onLayoutDeltaChange={onLayoutDeltaChange}
                onLayoutDragNudge={onLayoutDragNudge}
                onLayoutResizeNudge={onLayoutResizeNudge}
                hasPrimaryLogo={hasPrimaryLogo}
                hasSecondaryLogo={hasSecondaryLogo}
                previewViewport={previewViewport}
              />
            ) : null}
          </>
        ) : (
          <div className="flex h-full min-h-[120px] items-center justify-center text-sm text-slate-400">
            Generate a background to preview your banner.
          </div>
        )}
        {isLoadingOverlay && hasBackground ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/35">
            <span className="rounded-2xl border border-slate-700/80 bg-slate-900/90 px-4 py-2 text-xs font-medium text-slate-200 shadow-lg">
              Updating text & logos…
            </span>
          </div>
        ) : null}
      </div>

      {isLoadingBackground ? (
        <div className="mb-5 rounded-xl border border-blue-500/40 bg-blue-950/40 p-3">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-blue-100">
            <span>Generating GPT background…</span>
            <span>{Math.round(loadingProgress)}%</span>
          </div>
          <progress
            value={Math.max(6, Math.min(100, loadingProgress))}
            max={100}
            className="h-2 w-full overflow-hidden rounded-full"
            aria-label="Background generation progress"
          />
        </div>
      ) : null}

      {backgroundDownloadUrl || downloadUrl ? (
        <div className="flex flex-wrap items-center gap-2">
          {backgroundDownloadUrl ? (
            <a
              href={backgroundDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
            >
              Download only background
            </a>
          ) : null}
          {downloadUrl ? (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Download banner
            </a>
          ) : null}
        </div>
      ) : hasBackground ? (
        <p className="text-xs text-slate-500">Applying overlay… final PNG download appears when ready.</p>
      ) : null}
    </section>
  );
};
