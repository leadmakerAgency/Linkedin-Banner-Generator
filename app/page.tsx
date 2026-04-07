"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { BannerFiles, BannerForm } from "@/components/BannerForm";
import { BannerPreview } from "@/components/BannerPreview";
import { nudgeLayoutOverlay, nudgeLayoutOverlayResize, type LayoutDragGroup } from "@/lib/nudgeLayoutOverlay";
import type { LayoutOverlayPayload } from "@/types/banner";
import {
  BannerFormValues,
  BannerType,
  DEFAULT_TYPOGRAPHY_FOR_BANNER_TYPE,
  getBannerDimensions
} from "@/types/banner";

const INITIAL_VALUES: BannerFormValues = {
  bannerType: "personal",
  companyName: "",
  companyDescription: "",
  companyNameFontStyle: "inter",
  companyDescriptionFontStyle: "inter",
  companyNameFontSize: 74,
  companyDescriptionFontSize: 24,
  companyNameFontWeight: "700",
  companyDescriptionFontWeight: "500",
  companyNameColorMode: "auto",
  companyNameTextColor: "#FFFFFF",
  companyDescriptionColorMode: "auto",
  companyDescriptionTextColor: "#E2E8F0",
  companyPageType: "company",
  primaryBrandColor: "#1D4ED8",
  secondaryBrandColor: "#0F172A",
  phoneNumber: "",
  phoneIconOffsetX: 0,
  phoneIconOffsetY: 0,
  layoutPrimaryLogoDeltaX: 0,
  layoutPrimaryLogoDeltaY: 0,
  layoutPrimaryLogoScalePct: 100,
  layoutSecondaryLogoDeltaX: 0,
  layoutSecondaryLogoDeltaY: 0,
  layoutSecondaryLogoScalePct: 100,
  layoutTextBlockDeltaX: 0,
  layoutTextBlockDeltaY: 0,
  layoutPhoneGroupDeltaX: 0,
  layoutPhoneGroupDeltaY: 0,
  stylePreset: "corporate",
  imageModel: "gpt-image-1"
};

const INITIAL_FILES: BannerFiles = {
  primaryLogo: null,
  secondaryLogo: null
};

const stripQuery = (url: string): string => {
  return url.split("?")[0] ?? url;
};

const withDefaultLayout = (base: BannerFormValues): BannerFormValues => ({
  ...base,
  phoneIconOffsetX: 0,
  phoneIconOffsetY: 0,
  layoutPrimaryLogoDeltaX: 0,
  layoutPrimaryLogoDeltaY: 0,
  layoutPrimaryLogoScalePct: 100,
  layoutSecondaryLogoDeltaX: 0,
  layoutSecondaryLogoDeltaY: 0,
  layoutSecondaryLogoScalePct: 100,
  layoutTextBlockDeltaX: 0,
  layoutTextBlockDeltaY: 0,
  layoutPhoneGroupDeltaX: 0,
  layoutPhoneGroupDeltaY: 0
});

const clampLayoutDelta = (value: number): number => Math.max(-2000, Math.min(2000, value));
const clampLogoScalePct = (value: number): number => Math.max(25, Math.min(400, value));

const withClampedLayout = (base: BannerFormValues): BannerFormValues => ({
  ...base,
  layoutPrimaryLogoDeltaX: clampLayoutDelta(base.layoutPrimaryLogoDeltaX),
  layoutPrimaryLogoDeltaY: clampLayoutDelta(base.layoutPrimaryLogoDeltaY),
  layoutPrimaryLogoScalePct: clampLogoScalePct(base.layoutPrimaryLogoScalePct),
  layoutSecondaryLogoDeltaX: clampLayoutDelta(base.layoutSecondaryLogoDeltaX),
  layoutSecondaryLogoDeltaY: clampLayoutDelta(base.layoutSecondaryLogoDeltaY),
  layoutSecondaryLogoScalePct: clampLogoScalePct(base.layoutSecondaryLogoScalePct),
  layoutTextBlockDeltaX: clampLayoutDelta(base.layoutTextBlockDeltaX),
  layoutTextBlockDeltaY: clampLayoutDelta(base.layoutTextBlockDeltaY),
  layoutPhoneGroupDeltaX: clampLayoutDelta(base.layoutPhoneGroupDeltaX),
  layoutPhoneGroupDeltaY: clampLayoutDelta(base.layoutPhoneGroupDeltaY)
});

const HomePage = () => {
  const [values, setValues] = useState<BannerFormValues>(INITIAL_VALUES);
  const [files, setFiles] = useState<BannerFiles>(INITIAL_FILES);
  const [promptSnapshot, setPromptSnapshot] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingBackground, setIsLoadingBackground] = useState(false);
  const [isLoadingOverlay, setIsLoadingOverlay] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [layoutOverlay, setLayoutOverlay] = useState<LayoutOverlayPayload | null>(null);
  const overlayRequestId = useRef(0);
  const previousBannerType = useRef<BannerType | null>(null);

  const generateNonce = (): string => {
    if (typeof window !== "undefined" && window.crypto && "randomUUID" in window.crypto) {
      return window.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  };

  const chatExportDims = getBannerDimensions(values.bannerType);
  const generatedPrompt = [
    `Create a ${values.bannerType} LinkedIn banner.`,
    `Company name: ${values.companyName.trim() || "(not provided)"}.`,
    `Company description: ${values.companyDescription.trim() || "(not provided)"}.`,
    `Company name font: ${values.companyNameFontStyle}.`,
    `Description font: ${values.companyDescriptionFontStyle}.`,
    `Company name font size: ${values.companyNameFontSize}px.`,
    `Description font size: ${values.companyDescriptionFontSize}px.`,
    `Company name font weight: ${values.companyNameFontWeight}.`,
    `Description font weight: ${values.companyDescriptionFontWeight}.`,
    values.companyNameColorMode === "auto"
      ? "Company name text color: Auto (AI chooses the best fitting contrast color based on the generated design)."
      : `Company name text color (manual): ${values.companyNameTextColor}.`,
    values.companyDescriptionColorMode === "auto"
      ? "Company description text color: Auto (AI chooses the best fitting contrast color based on the generated design)."
      : `Company description text color (manual): ${values.companyDescriptionTextColor}.`,
    "Phone number text color: Auto (AI chooses the best fitting contrast color based on the generated design).",
    `Company type: ${values.companyPageType}.`,
    `Primary brand color: ${values.primaryBrandColor}.`,
    `Secondary brand color: ${values.secondaryBrandColor}.`,
    `Phone number: ${values.phoneNumber.trim() || "(not provided)"}.`,
    `Phone icon-only offset X: ${values.phoneIconOffsetX}px (positive = right, clamped so the icon stays left of the digits), Y: ${values.phoneIconOffsetY}px (positive = down); phone number position unchanged.`,
    `Style preset: ${values.stylePreset}.`,
    `Image model: ${values.imageModel}.`,
    `Make it professional, clean, and suitable for ${chatExportDims.width}×${chatExportDims.height}px LinkedIn cover dimensions.`
  ].join(" ");

  const handleBuildFormData = useCallback(
    (forceFresh?: boolean, sourceValues?: BannerFormValues): FormData => {
      const v = withClampedLayout(sourceValues ?? values);
      const companyName = v.companyName.trim();
      const companyDescription = v.companyDescription.trim();
      const phoneNumber = v.phoneNumber.trim();

      const formData = new FormData();
      formData.set("bannerType", v.bannerType);
      formData.set("companyName", companyName);
      formData.set("companyDescription", companyDescription);
      formData.set("companyNameFontStyle", v.companyNameFontStyle);
      formData.set("companyDescriptionFontStyle", v.companyDescriptionFontStyle);
      formData.set("companyNameFontSize", String(v.companyNameFontSize));
      formData.set("companyDescriptionFontSize", String(v.companyDescriptionFontSize));
      formData.set("companyNameFontWeight", v.companyNameFontWeight);
      formData.set("companyDescriptionFontWeight", v.companyDescriptionFontWeight);
      formData.set("companyNameColorMode", v.companyNameColorMode);
      formData.set("companyNameTextColor", v.companyNameTextColor);
      formData.set("companyDescriptionColorMode", v.companyDescriptionColorMode);
      formData.set("companyDescriptionTextColor", v.companyDescriptionTextColor);
      formData.set("companyPageType", v.companyPageType);
      formData.set("primaryBrandColor", v.primaryBrandColor);
      formData.set("secondaryBrandColor", v.secondaryBrandColor);
      formData.set("phoneNumber", phoneNumber);
      // Keep phone row perfectly horizontal and stable as one group.
      formData.set("phoneIconOffsetX", "0");
      formData.set("phoneIconOffsetY", "0");
      formData.set("layoutPrimaryLogoDeltaX", String(v.layoutPrimaryLogoDeltaX));
      formData.set("layoutPrimaryLogoDeltaY", String(v.layoutPrimaryLogoDeltaY));
      formData.set("layoutPrimaryLogoScalePct", String(v.layoutPrimaryLogoScalePct));
      formData.set("layoutSecondaryLogoDeltaX", String(v.layoutSecondaryLogoDeltaX));
      formData.set("layoutSecondaryLogoDeltaY", String(v.layoutSecondaryLogoDeltaY));
      formData.set("layoutSecondaryLogoScalePct", String(v.layoutSecondaryLogoScalePct));
      formData.set("layoutTextBlockDeltaX", String(v.layoutTextBlockDeltaX));
      formData.set("layoutTextBlockDeltaY", String(v.layoutTextBlockDeltaY));
      formData.set("layoutPhoneGroupDeltaX", String(v.layoutPhoneGroupDeltaX));
      formData.set("layoutPhoneGroupDeltaY", String(v.layoutPhoneGroupDeltaY));
      formData.set("stylePreset", v.stylePreset);
      formData.set("imageModel", v.imageModel);
      formData.set("promptSnapshot", generatedPrompt);
      if (files.primaryLogo) {
        formData.set("primaryLogo", files.primaryLogo);
      }
      if (files.secondaryLogo) {
        formData.set("secondaryLogo", files.secondaryLogo);
      }
      if (forceFresh) {
        formData.set("regenerateNonce", generateNonce());
      }

      return formData;
    },
    [values, files, generatedPrompt]
  );

  const handleBackgroundRequest = async (
    endpoint: "/api/generate-background" | "/api/revise",
    forceFresh?: boolean,
    sourceValues?: BannerFormValues
  ) => {
    setIsLoadingBackground(true);
    setLoadingProgress(8);
    setErrorMessage(null);
    const progressTimer = window.setInterval(() => {
      setLoadingProgress((previous) => {
        if (previous >= 90) {
          return previous;
        }
        const next = previous + Math.floor(Math.random() * 12) + 4;
        return Math.min(next, 90);
      });
    }, 350);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: handleBuildFormData(forceFresh, sourceValues)
      });
      const data = (await response.json()) as { backgroundUrl?: string; imageUrl?: string; error?: string };

      if (!response.ok || (!data.backgroundUrl && !data.imageUrl)) {
        setErrorMessage(data.error ?? "Background generation failed.");
        return;
      }

      const nextBackground = stripQuery(data.backgroundUrl ?? data.imageUrl ?? "");
      setBackgroundUrl(nextBackground);
      setPreviewUrl(null);
      setLayoutOverlay(null);
      setIsLoadingOverlay(true);
      setLoadingProgress(100);
    } catch {
      setErrorMessage("Unable to reach generator API. Please retry.");
    } finally {
      window.clearInterval(progressTimer);
      setLoadingProgress(100);
      window.setTimeout(() => setLoadingProgress(0), 450);
      setIsLoadingBackground(false);
    }
  };

  const handleGenerateBackground = () => {
    const resetValues = withDefaultLayout(values);
    setValues(resetValues);
    setLayoutOverlay(null);
    void handleBackgroundRequest("/api/generate-background", true, resetValues);
  };

  const handleRegenerateBackground = () => {
    const resetValues = withDefaultLayout(values);
    setValues(resetValues);
    setLayoutOverlay(null);
    void handleBackgroundRequest("/api/generate-background", true, resetValues);
  };

  const handlePatchValues = (patch: Partial<BannerFormValues>) => {
    setValues((previous) => ({
      ...previous,
      ...patch
    }));
  };

  const handleResetLayout = useCallback(() => {
    setLayoutOverlay(null);
    setValues((previous) => ({
      ...previous,
      layoutPrimaryLogoDeltaX: 0,
      layoutPrimaryLogoDeltaY: 0,
      layoutPrimaryLogoScalePct: 100,
      layoutSecondaryLogoDeltaX: 0,
      layoutSecondaryLogoDeltaY: 0,
      layoutSecondaryLogoScalePct: 100,
      layoutTextBlockDeltaX: 0,
      layoutTextBlockDeltaY: 0,
      layoutPhoneGroupDeltaX: 0,
      layoutPhoneGroupDeltaY: 0
    }));
  }, []);

  const handleLayoutDragNudge = useCallback((group: LayoutDragGroup, dx: number, dy: number) => {
    setLayoutOverlay((previous) => nudgeLayoutOverlay(previous, group, dx, dy));
  }, []);

  const handleLayoutResizeNudge = useCallback(
    (group: "primary" | "secondary", rect: { left: number; top: number; width: number; height: number }) => {
      setLayoutOverlay((previous) => nudgeLayoutOverlayResize(previous, group, rect));
    },
    []
  );

  useEffect(() => {
    setPromptSnapshot(generatedPrompt);
  }, [generatedPrompt]);

  useEffect(() => {
    setValues((previous) => {
      const clamped = withClampedLayout(previous);
      const unchanged =
        clamped.layoutPrimaryLogoDeltaX === previous.layoutPrimaryLogoDeltaX &&
        clamped.layoutPrimaryLogoDeltaY === previous.layoutPrimaryLogoDeltaY &&
        clamped.layoutPrimaryLogoScalePct === previous.layoutPrimaryLogoScalePct &&
        clamped.layoutSecondaryLogoDeltaX === previous.layoutSecondaryLogoDeltaX &&
        clamped.layoutSecondaryLogoDeltaY === previous.layoutSecondaryLogoDeltaY &&
        clamped.layoutSecondaryLogoScalePct === previous.layoutSecondaryLogoScalePct &&
        clamped.layoutTextBlockDeltaX === previous.layoutTextBlockDeltaX &&
        clamped.layoutTextBlockDeltaY === previous.layoutTextBlockDeltaY &&
        clamped.layoutPhoneGroupDeltaX === previous.layoutPhoneGroupDeltaX &&
        clamped.layoutPhoneGroupDeltaY === previous.layoutPhoneGroupDeltaY;
      return unchanged ? previous : clamped;
    });
  }, []);

  useEffect(() => {
    if (previousBannerType.current === null) {
      previousBannerType.current = values.bannerType;
      return;
    }
    if (previousBannerType.current === values.bannerType) {
      return;
    }
    previousBannerType.current = values.bannerType;
    setBackgroundUrl(null);
    setPreviewUrl(null);
    setLayoutOverlay(null);
    setErrorMessage(null);
    setValues((previous) => ({
      ...previous,
      ...DEFAULT_TYPOGRAPHY_FOR_BANNER_TYPE[values.bannerType],
      layoutPrimaryLogoDeltaX: 0,
      layoutPrimaryLogoDeltaY: 0,
      layoutPrimaryLogoScalePct: 100,
      layoutSecondaryLogoDeltaX: 0,
      layoutSecondaryLogoDeltaY: 0,
      layoutSecondaryLogoScalePct: 100,
      layoutTextBlockDeltaX: 0,
      layoutTextBlockDeltaY: 0,
      layoutPhoneGroupDeltaX: 0,
      layoutPhoneGroupDeltaY: 0
    }));
  }, [values.bannerType]);

  useEffect(() => {
    if (!backgroundUrl) {
      setIsLoadingOverlay(false);
      return;
    }

    const timer = window.setTimeout(() => {
      const requestId = overlayRequestId.current + 1;
      overlayRequestId.current = requestId;
      setIsLoadingOverlay(true);
      setErrorMessage(null);

      const formData = handleBuildFormData();
      formData.set("backgroundUrl", stripQuery(backgroundUrl));

      void (async () => {
        try {
          const response = await fetch("/api/render-overlay", {
            method: "POST",
            body: formData
          });
          const data = (await response.json()) as {
            imageUrl?: string;
            error?: string;
            layoutOverlay?: LayoutOverlayPayload;
          };

          if (overlayRequestId.current !== requestId) {
            return;
          }

          if (!response.ok || !data.imageUrl) {
            setErrorMessage(data.error ?? "Failed to apply text and logos.");
            return;
          }
          setPreviewUrl(data.imageUrl);
          setLayoutOverlay(data.layoutOverlay ?? null);
        } catch {
          if (overlayRequestId.current === requestId) {
            setErrorMessage("Unable to render overlay. Please retry.");
          }
        } finally {
          if (overlayRequestId.current === requestId) {
            setIsLoadingOverlay(false);
          }
        }
      })();
    }, 400);

    return () => window.clearTimeout(timer);
  }, [backgroundUrl, values, files, handleBuildFormData]);

  const displayUrl = previewUrl ?? backgroundUrl;
  const hasBackground = Boolean(backgroundUrl);

  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto mb-6 w-full max-w-[1460px] rounded-3xl border border-slate-800/90 bg-slate-900/75 p-5 shadow-[0_22px_60px_-30px_rgba(2,6,23,0.95)] backdrop-blur-xl md:p-7">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-2 shadow-inner shadow-blue-500/10">
            <Image src="/app-logo.svg" alt="App logo" width={44} height={44} priority />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-100 md:text-3xl">LinkedIn Banner Generator</h1>
            <p className="mt-2 text-sm text-slate-300 md:text-base">
              Build high-quality LinkedIn banners with guided settings, AI assistance, and deterministic brand overlays.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1460px] gap-6 xl:grid-cols-[1fr,1.15fr]">
        <section>
          <div className="rounded-3xl border border-slate-800/90 bg-slate-900/75 p-6 shadow-[0_24px_60px_-32px_rgba(2,6,23,0.98)] backdrop-blur-xl">
            <BannerForm
              values={values}
              files={files}
              embedded
              onValuesChange={setValues}
              onFilesChange={setFiles}
            />

            <div className="mt-6 border-t border-slate-800 pt-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold tracking-tight text-slate-200">Live Prompt Snapshot</h3>
                <button
                  type="button"
                  onClick={handleGenerateBackground}
                  disabled={isLoadingBackground}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700"
                >
                  {isLoadingBackground ? "Generating..." : hasBackground ? "Regenerate background" : "Generate background"}
                </button>
              </div>
              <p className="mb-2 text-xs text-slate-400">
                Prompt updates automatically from your form values and is persisted locally with layout positions.
              </p>
              <textarea
                readOnly
                value={promptSnapshot}
                className="h-36 w-full resize-none rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-xs text-slate-300 outline-none"
                aria-label="Generated prompt snapshot"
              />
            </div>
          </div>
        </section>

        <section>
          <BannerPreview
            displayUrl={displayUrl}
            hasBackground={hasBackground}
            isLoadingBackground={isLoadingBackground}
            isLoadingOverlay={isLoadingOverlay}
            loadingProgress={loadingProgress}
            onRegenerateBackground={handleRegenerateBackground}
            downloadUrl={previewUrl}
            layoutValues={values}
            onLayoutDeltaChange={handlePatchValues}
            onResetLayout={handleResetLayout}
            layoutOverlayActive={Boolean(previewUrl && hasBackground)}
            layoutOverlay={layoutOverlay}
            onLayoutDragNudge={handleLayoutDragNudge}
            onLayoutResizeNudge={handleLayoutResizeNudge}
            hasPrimaryLogo={Boolean(files.primaryLogo)}
            hasSecondaryLogo={Boolean(files.secondaryLogo)}
          />

          {errorMessage ? (
            <p className="mt-3 rounded-xl border border-rose-500/50 bg-rose-950/70 px-4 py-2.5 text-sm font-medium text-rose-200 shadow-sm" aria-live="polite">
              {errorMessage}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
};

export default HomePage;
