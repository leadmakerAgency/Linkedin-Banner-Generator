"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { BannerFiles, BannerForm } from "@/components/BannerForm";
import { BannerPreview } from "@/components/BannerPreview";
import { nudgeLayoutOverlay, type LayoutDragGroup } from "@/lib/nudgeLayoutOverlay";
import type { LayoutOverlayPayload } from "@/types/banner";
import {
  BannerFormValues,
  BannerType,
  DEFAULT_TYPOGRAPHY_FOR_BANNER_TYPE,
  RevisionAction,
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
  layoutSecondaryLogoDeltaX: 0,
  layoutSecondaryLogoDeltaY: 0,
  layoutTextBlockDeltaX: 0,
  layoutTextBlockDeltaY: 0,
  layoutPhoneGroupDeltaX: 0,
  layoutPhoneGroupDeltaY: 0,
  stylePreset: "corporate",
  imageModel: "gpt-image-1"
};

const DEFAULT_GENERATION_VALUES: Pick<
  BannerFormValues,
  | "companyName"
  | "companyDescription"
  | "phoneNumber"
  | "companyNameFontStyle"
  | "companyDescriptionFontStyle"
  | "companyNameFontSize"
  | "companyDescriptionFontSize"
  | "companyNameFontWeight"
  | "companyDescriptionFontWeight"
  | "companyNameColorMode"
  | "companyNameTextColor"
  | "companyDescriptionColorMode"
  | "companyDescriptionTextColor"
  | "imageModel"
> = {
  companyName: "Your Company",
  companyDescription: "Lead generation through strategic marketing, virtual assistants, and call center support.",
  phoneNumber: "+1 555 010 234",
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
  layoutSecondaryLogoDeltaX: 0,
  layoutSecondaryLogoDeltaY: 0,
  layoutTextBlockDeltaX: 0,
  layoutTextBlockDeltaY: 0,
  layoutPhoneGroupDeltaX: 0,
  layoutPhoneGroupDeltaY: 0
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
    `Company name: ${values.companyName.trim() || DEFAULT_GENERATION_VALUES.companyName}.`,
    `Company description: ${values.companyDescription.trim() || DEFAULT_GENERATION_VALUES.companyDescription}.`,
    `Company name font: ${values.companyNameFontStyle || DEFAULT_GENERATION_VALUES.companyNameFontStyle}.`,
    `Description font: ${values.companyDescriptionFontStyle || DEFAULT_GENERATION_VALUES.companyDescriptionFontStyle}.`,
    `Company name font size: ${values.companyNameFontSize || DEFAULT_GENERATION_VALUES.companyNameFontSize}px.`,
    `Description font size: ${values.companyDescriptionFontSize || DEFAULT_GENERATION_VALUES.companyDescriptionFontSize}px.`,
    `Company name font weight: ${values.companyNameFontWeight || DEFAULT_GENERATION_VALUES.companyNameFontWeight}.`,
    `Description font weight: ${values.companyDescriptionFontWeight || DEFAULT_GENERATION_VALUES.companyDescriptionFontWeight}.`,
    values.companyNameColorMode === "auto"
      ? "Company name text color: Auto (AI chooses the best fitting contrast color based on the generated design)."
      : `Company name text color (manual): ${values.companyNameTextColor || DEFAULT_GENERATION_VALUES.companyNameTextColor}.`,
    values.companyDescriptionColorMode === "auto"
      ? "Company description text color: Auto (AI chooses the best fitting contrast color based on the generated design)."
      : `Company description text color (manual): ${
          values.companyDescriptionTextColor || DEFAULT_GENERATION_VALUES.companyDescriptionTextColor
        }.`,
    "Phone number text color: Auto (AI chooses the best fitting contrast color based on the generated design).",
    `Company type: ${values.companyPageType}.`,
    `Primary brand color: ${values.primaryBrandColor}.`,
    `Secondary brand color: ${values.secondaryBrandColor}.`,
    `Phone number: ${values.phoneNumber.trim() || DEFAULT_GENERATION_VALUES.phoneNumber}.`,
    `Phone icon-only offset X: ${values.phoneIconOffsetX}px (positive = right, clamped so the icon stays left of the digits), Y: ${values.phoneIconOffsetY}px (positive = down); phone number position unchanged.`,
    `Style preset: ${values.stylePreset}.`,
    `Image model: ${values.imageModel}.`,
    `Make it professional, clean, and suitable for ${chatExportDims.width}×${chatExportDims.height}px LinkedIn cover dimensions.`
  ].join(" ");

  const handleBuildFormData = useCallback(
    (revisionAction?: RevisionAction, forceFresh?: boolean, sourceValues?: BannerFormValues): FormData => {
      const v = sourceValues ?? values;
      const companyName = v.companyName.trim() || DEFAULT_GENERATION_VALUES.companyName;
      const companyDescription = v.companyDescription.trim() || DEFAULT_GENERATION_VALUES.companyDescription;
      const phoneNumber = v.phoneNumber.trim() || DEFAULT_GENERATION_VALUES.phoneNumber;

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
      formData.set("phoneIconOffsetX", String(v.phoneIconOffsetX));
      formData.set("phoneIconOffsetY", String(v.phoneIconOffsetY));
      formData.set("layoutPrimaryLogoDeltaX", String(v.layoutPrimaryLogoDeltaX));
      formData.set("layoutPrimaryLogoDeltaY", String(v.layoutPrimaryLogoDeltaY));
      formData.set("layoutSecondaryLogoDeltaX", String(v.layoutSecondaryLogoDeltaX));
      formData.set("layoutSecondaryLogoDeltaY", String(v.layoutSecondaryLogoDeltaY));
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
      if (revisionAction) {
        formData.set("revisionAction", revisionAction);
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
    revisionAction?: RevisionAction,
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
        body: handleBuildFormData(revisionAction, forceFresh, sourceValues)
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
    void handleBackgroundRequest("/api/generate-background", undefined, true, resetValues);
  };

  const handleRegenerateBackground = () => {
    const resetValues = withDefaultLayout(values);
    setValues(resetValues);
    setLayoutOverlay(null);
    void handleBackgroundRequest("/api/generate-background", undefined, true, resetValues);
  };

  const handleRevisionBackground = (action: RevisionAction) => {
    void handleBackgroundRequest("/api/revise", action, false);
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
      layoutSecondaryLogoDeltaX: 0,
      layoutSecondaryLogoDeltaY: 0,
      layoutTextBlockDeltaX: 0,
      layoutTextBlockDeltaY: 0,
      layoutPhoneGroupDeltaX: 0,
      layoutPhoneGroupDeltaY: 0
    }));
  }, []);

  const handleLayoutDragNudge = useCallback((group: LayoutDragGroup, dx: number, dy: number) => {
    setLayoutOverlay((previous) => nudgeLayoutOverlay(previous, group, dx, dy));
  }, []);

  useEffect(() => {
    setPromptSnapshot(generatedPrompt);
  }, [generatedPrompt]);

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
      layoutSecondaryLogoDeltaX: 0,
      layoutSecondaryLogoDeltaY: 0,
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
            onRevisionBackground={handleRevisionBackground}
            downloadUrl={previewUrl}
            layoutValues={values}
            onLayoutDeltaChange={handlePatchValues}
            onResetLayout={handleResetLayout}
            layoutOverlayActive={Boolean(previewUrl && hasBackground)}
            layoutOverlay={layoutOverlay}
            onLayoutDragNudge={handleLayoutDragNudge}
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
