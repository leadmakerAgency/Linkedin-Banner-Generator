"use client";

import { type CSSProperties, type PointerEvent, useState } from "react";
import { getBannerLayoutConstants } from "@/lib/bannerLayoutConstants";
import {
  clampRectWithinBanner,
  clampUniformScalePct,
  computeUniformResizeFromCorner,
  getPreviewScale,
  toBannerDelta,
  type ResizeCorner
} from "@/lib/layoutDragMath";
import type { LayoutDragGroup } from "@/lib/nudgeLayoutOverlay";
import type { BannerFormValues, LayoutElementRect, LayoutOverlayPayload } from "@/types/banner";
import { getBannerDimensions } from "@/types/banner";

const MIN_LOGO_SCALE_PCT = 25;
const MAX_LOGO_SCALE_PCT = 400;

const applyDelta = (rect: LayoutElementRect, dx: number, dy: number): LayoutElementRect => {
  return {
    left: rect.left + dx,
    top: rect.top + dy,
    width: rect.width,
    height: rect.height
  };
};

const clampLayoutDelta = (value: number): number => Math.max(-2000, Math.min(2000, value));

const handleClass =
  "pointer-events-auto absolute z-10 box-border touch-none cursor-grab rounded-lg border border-dashed border-sky-400/80 bg-sky-500/20 shadow-sm active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-sky-400";

const resizeHandleClass =
  "pointer-events-auto absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 touch-none rounded-sm border border-sky-200 bg-sky-500 shadow";

const rectToStyle = (
  rect: LayoutElementRect,
  scale: number,
  offsetX: number,
  offsetY: number
): CSSProperties => ({
  left: offsetX + rect.left * scale,
  top: offsetY + rect.top * scale,
  width: rect.width * scale,
  height: rect.height * scale
});

type LiveDelta = { dx: number; dy: number };
type LiveOffsets = Record<LayoutDragGroup, LiveDelta>;
type LogoGroup = "primary" | "secondary";
type LiveLogoResize = { rect: LayoutElementRect; scalePct: number };
type ActiveInteractionState =
  | {
      kind: "drag";
      group: LayoutDragGroup;
      pointerId: number;
      startClientX: number;
      startClientY: number;
    }
  | {
      kind: "resize";
      group: LogoGroup;
      corner: ResizeCorner;
      pointerId: number;
      startClientX: number;
      startClientY: number;
      startRect: LayoutElementRect;
      startScalePct: number;
    };

export type PreviewViewport = {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
};

const EMPTY_LIVE_OFFSETS: LiveOffsets = {
  primary: { dx: 0, dy: 0 },
  secondary: { dx: 0, dy: 0 },
  text: { dx: 0, dy: 0 },
  phone: { dx: 0, dy: 0 }
};

interface BannerLayoutEditorProps {
  values: BannerFormValues;
  layoutOverlay: LayoutOverlayPayload | null;
  onLayoutDeltaChange: (patch: Partial<BannerFormValues>) => void;
  onLayoutDragNudge: (group: LayoutDragGroup, dxBanner: number, dyBanner: number) => void;
  onLayoutResizeNudge: (group: LogoGroup, rect: LayoutElementRect) => void;
  hasPrimaryLogo: boolean;
  hasSecondaryLogo: boolean;
  previewViewport: PreviewViewport;
}

export const BannerLayoutEditor = ({
  values,
  layoutOverlay,
  onLayoutDeltaChange,
  onLayoutDragNudge,
  onLayoutResizeNudge,
  hasPrimaryLogo,
  hasSecondaryLogo,
  previewViewport
}: BannerLayoutEditorProps) => {
  const [activeInteraction, setActiveInteraction] = useState<ActiveInteractionState | null>(null);
  const [liveOffsets, setLiveOffsets] = useState<LiveOffsets>(EMPTY_LIVE_OFFSETS);
  const [liveLogoResizeByGroup, setLiveLogoResizeByGroup] = useState<Partial<Record<LogoGroup, LiveLogoResize>>>({});

  const { width: bannerPixelWidth, height: bannerPixelHeight } = getBannerDimensions(values.bannerType);
  const L = getBannerLayoutConstants(values.bannerType);
  const previewScale = getPreviewScale(previewViewport.width, bannerPixelWidth);
  const primaryFallbackBox = Math.max(1, Math.round((L.LAYOUT_PRIMARY_LOGO_BOX * values.layoutPrimaryLogoScalePct) / 100));
  const secondaryFallbackBox = Math.max(1, Math.round((L.LAYOUT_SECONDARY_LOGO_BOX * values.layoutSecondaryLogoScalePct) / 100));

  const setLiveOffset = (group: LayoutDragGroup, next: LiveDelta) => {
    setLiveOffsets((previous) => ({
      ...previous,
      [group]: next
    }));
  };

  const clearLiveOffset = (group: LayoutDragGroup) => {
    setLiveOffset(group, { dx: 0, dy: 0 });
  };

  const clearLiveLogoResize = (group: LogoGroup) => {
    setLiveLogoResizeByGroup((previous) => {
      const next = { ...previous };
      delete next[group];
      return next;
    });
  };

  const primaryRect: LayoutElementRect | null = !hasPrimaryLogo
    ? null
    : (layoutOverlay?.primaryLogo ?? {
        left: L.LAYOUT_MARGIN + values.layoutPrimaryLogoDeltaX,
        top: L.LAYOUT_LOGO_TOP + values.layoutPrimaryLogoDeltaY,
        width: primaryFallbackBox,
        height: primaryFallbackBox
      });

  const secondaryRect: LayoutElementRect | null = !hasSecondaryLogo
    ? null
    : (layoutOverlay?.secondaryLogo ?? {
        left: L.LAYOUT_SECONDARY_LOGO_LEFT + values.layoutSecondaryLogoDeltaX,
        top: L.LAYOUT_SECONDARY_LOGO_TOP + values.layoutSecondaryLogoDeltaY,
        width: secondaryFallbackBox,
        height: secondaryFallbackBox
      });

  const textRect: LayoutElementRect = layoutOverlay?.textBlock ?? {
    left: L.LAYOUT_TEXT_BLOCK_LEFT + values.layoutTextBlockDeltaX,
    top: L.LAYOUT_TEXT_BLOCK_TOP + values.layoutTextBlockDeltaY,
    width: L.LAYOUT_TEXT_BLOCK_WIDTH,
    height: L.LAYOUT_TEXT_BLOCK_HEIGHT
  };

  const phoneRect: LayoutElementRect = layoutOverlay?.phoneGroup ?? {
    left: L.LAYOUT_PHONE_REGION_LEFT + values.layoutPhoneGroupDeltaX,
    top: L.LAYOUT_PHONE_REGION_TOP + values.layoutPhoneGroupDeltaY,
    width: L.LAYOUT_PHONE_REGION_W,
    height: L.LAYOUT_PHONE_REGION_H
  };
  const showPhoneHandle = values.phoneNumber.trim().length > 0;
  const expectedPhoneLeft = L.LAYOUT_PHONE_REGION_LEFT + values.layoutPhoneGroupDeltaX;
  const expectedPhoneTop = L.LAYOUT_PHONE_REGION_TOP + values.layoutPhoneGroupDeltaY;
  const hasSuspiciousServerPhoneRect = Boolean(
    layoutOverlay?.phoneGroup &&
      layoutOverlay.phoneGroup.left <= 4 &&
      layoutOverlay.phoneGroup.top <= 4 &&
      (expectedPhoneLeft > bannerPixelWidth * 0.25 || expectedPhoneTop > bannerPixelHeight * 0.25)
  );
  const effectivePhoneRect: LayoutElementRect = hasSuspiciousServerPhoneRect
    ? {
        left: expectedPhoneLeft,
        top: expectedPhoneTop,
        width: L.LAYOUT_PHONE_REGION_W,
        height: L.LAYOUT_PHONE_REGION_H
      }
    : phoneRect;

  const commitGroupDelta = (group: LayoutDragGroup, dx: number, dy: number) => {
    switch (group) {
      case "primary":
        onLayoutDeltaChange({
          layoutPrimaryLogoDeltaX: clampLayoutDelta(values.layoutPrimaryLogoDeltaX + dx),
          layoutPrimaryLogoDeltaY: clampLayoutDelta(values.layoutPrimaryLogoDeltaY + dy)
        });
        break;
      case "secondary":
        onLayoutDeltaChange({
          layoutSecondaryLogoDeltaX: clampLayoutDelta(values.layoutSecondaryLogoDeltaX + dx),
          layoutSecondaryLogoDeltaY: clampLayoutDelta(values.layoutSecondaryLogoDeltaY + dy)
        });
        break;
      case "text":
        onLayoutDeltaChange({
          layoutTextBlockDeltaX: clampLayoutDelta(values.layoutTextBlockDeltaX + dx),
          layoutTextBlockDeltaY: clampLayoutDelta(values.layoutTextBlockDeltaY + dy)
        });
        break;
      case "phone":
        onLayoutDeltaChange({
          layoutPhoneGroupDeltaX: clampLayoutDelta(values.layoutPhoneGroupDeltaX + dx),
          layoutPhoneGroupDeltaY: clampLayoutDelta(values.layoutPhoneGroupDeltaY + dy)
        });
        break;
      default:
        return;
    }
    onLayoutDragNudge(group, dx, dy);
  };

  const commitLogoResize = (
    group: LogoGroup,
    startRect: LayoutElementRect,
    nextRect: LayoutElementRect,
    nextScalePct: number
  ) => {
    const dx = nextRect.left - startRect.left;
    const dy = nextRect.top - startRect.top;
    if (group === "primary") {
      onLayoutDeltaChange({
        layoutPrimaryLogoScalePct: clampUniformScalePct(nextScalePct, MIN_LOGO_SCALE_PCT, MAX_LOGO_SCALE_PCT),
        layoutPrimaryLogoDeltaX: clampLayoutDelta(values.layoutPrimaryLogoDeltaX + dx),
        layoutPrimaryLogoDeltaY: clampLayoutDelta(values.layoutPrimaryLogoDeltaY + dy)
      });
      onLayoutResizeNudge("primary", nextRect);
      return;
    }

    onLayoutDeltaChange({
      layoutSecondaryLogoScalePct: clampUniformScalePct(nextScalePct, MIN_LOGO_SCALE_PCT, MAX_LOGO_SCALE_PCT),
      layoutSecondaryLogoDeltaX: clampLayoutDelta(values.layoutSecondaryLogoDeltaX + dx),
      layoutSecondaryLogoDeltaY: clampLayoutDelta(values.layoutSecondaryLogoDeltaY + dy)
    });
    onLayoutResizeNudge("secondary", nextRect);
  };

  const startDrag = (event: PointerEvent<HTMLDivElement>, group: LayoutDragGroup) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setActiveInteraction({
      kind: "drag",
      group,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY
    });
    setLiveOffset(group, { dx: 0, dy: 0 });
  };

  const startResize = (
    event: PointerEvent<HTMLDivElement>,
    group: LogoGroup,
    corner: ResizeCorner,
    rect: LayoutElementRect,
    startScalePct: number
  ) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setActiveInteraction({
      kind: "resize",
      group,
      corner,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startRect: rect,
      startScalePct
    });
    setLiveLogoResizeByGroup((previous) => ({
      ...previous,
      [group]: { rect, scalePct: startScalePct }
    }));
  };

  const updateDrag = (event: PointerEvent<HTMLDivElement>, group: LayoutDragGroup, rect: LayoutElementRect) => {
    if (
      !activeInteraction ||
      activeInteraction.kind !== "drag" ||
      activeInteraction.group !== group ||
      activeInteraction.pointerId !== event.pointerId
    ) {
      return;
    }

    const { dxBanner, dyBanner } = toBannerDelta(
      event.clientX - activeInteraction.startClientX,
      event.clientY - activeInteraction.startClientY,
      previewScale
    );
    const clamped = clampRectWithinBanner(rect, dxBanner, dyBanner, bannerPixelWidth, bannerPixelHeight);
    setLiveOffset(group, { dx: clamped.dxBanner, dy: clamped.dyBanner });
  };

  const updateResize = (event: PointerEvent<HTMLDivElement>) => {
    if (!activeInteraction || activeInteraction.kind !== "resize" || activeInteraction.pointerId !== event.pointerId) {
      return;
    }

    const { dxBanner, dyBanner } = toBannerDelta(
      event.clientX - activeInteraction.startClientX,
      event.clientY - activeInteraction.startClientY,
      previewScale
    );
    const { nextRect, nextScalePct } = computeUniformResizeFromCorner(
      activeInteraction.startRect,
      activeInteraction.corner,
      dxBanner,
      dyBanner,
      activeInteraction.startScalePct,
      MIN_LOGO_SCALE_PCT,
      MAX_LOGO_SCALE_PCT,
      bannerPixelWidth,
      bannerPixelHeight
    );
    setLiveLogoResizeByGroup((previous) => ({
      ...previous,
      [activeInteraction.group]: { rect: nextRect, scalePct: nextScalePct }
    }));
  };

  const stopDrag = (event: PointerEvent<HTMLDivElement>, group: LayoutDragGroup) => {
    if (
      !activeInteraction ||
      activeInteraction.kind !== "drag" ||
      activeInteraction.group !== group ||
      activeInteraction.pointerId !== event.pointerId
    ) {
      return;
    }
    const offset = liveOffsets[group];
    if (offset.dx !== 0 || offset.dy !== 0) {
      commitGroupDelta(group, offset.dx, offset.dy);
    }
    clearLiveOffset(group);
    setActiveInteraction(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const stopResize = (event: PointerEvent<HTMLDivElement>, group: LogoGroup) => {
    if (
      !activeInteraction ||
      activeInteraction.kind !== "resize" ||
      activeInteraction.group !== group ||
      activeInteraction.pointerId !== event.pointerId
    ) {
      return;
    }

    const liveResize = liveLogoResizeByGroup[group];
    const nextRect = liveResize?.rect ?? activeInteraction.startRect;
    const nextScalePct = liveResize?.scalePct ?? activeInteraction.startScalePct;
    if (
      nextScalePct !== activeInteraction.startScalePct ||
      nextRect.left !== activeInteraction.startRect.left ||
      nextRect.top !== activeInteraction.startRect.top ||
      nextRect.width !== activeInteraction.startRect.width ||
      nextRect.height !== activeInteraction.startRect.height
    ) {
      commitLogoResize(group, activeInteraction.startRect, nextRect, nextScalePct);
    }

    clearLiveLogoResize(group);
    setActiveInteraction(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const cancelDrag = (event: PointerEvent<HTMLDivElement>, group: LayoutDragGroup) => {
    if (
      !activeInteraction ||
      activeInteraction.kind !== "drag" ||
      activeInteraction.group !== group ||
      activeInteraction.pointerId !== event.pointerId
    ) {
      return;
    }
    clearLiveOffset(group);
    setActiveInteraction(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const cancelResize = (event: PointerEvent<HTMLDivElement>, group: LogoGroup) => {
    if (
      !activeInteraction ||
      activeInteraction.kind !== "resize" ||
      activeInteraction.group !== group ||
      activeInteraction.pointerId !== event.pointerId
    ) {
      return;
    }
    clearLiveLogoResize(group);
    setActiveInteraction(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const renderedPrimaryRect =
    liveLogoResizeByGroup.primary?.rect ??
    (primaryRect ? applyDelta(primaryRect, liveOffsets.primary.dx, liveOffsets.primary.dy) : null);
  const renderedSecondaryRect =
    liveLogoResizeByGroup.secondary?.rect ??
    (secondaryRect ? applyDelta(secondaryRect, liveOffsets.secondary.dx, liveOffsets.secondary.dy) : null);
  const renderedTextRect = applyDelta(textRect, liveOffsets.text.dx, liveOffsets.text.dy);
  const renderedPhoneRect = showPhoneHandle ? applyDelta(effectivePhoneRect, liveOffsets.phone.dx, liveOffsets.phone.dy) : null;

  const renderResizeHandles = (
    group: LogoGroup,
    rect: LayoutElementRect,
    scalePct: number,
    labelPrefix: "primary logo" | "secondary logo"
  ) => {
    const handles: Array<{ corner: ResizeCorner; left: string; top: string; label: string }> = [
      { corner: "nw", left: "0%", top: "0%", label: `Resize ${labelPrefix} top-left` },
      { corner: "ne", left: "100%", top: "0%", label: `Resize ${labelPrefix} top-right` },
      { corner: "sw", left: "0%", top: "100%", label: `Resize ${labelPrefix} bottom-left` },
      { corner: "se", left: "100%", top: "100%", label: `Resize ${labelPrefix} bottom-right` }
    ];

    return handles.map((handle) => (
      <div
        key={`${group}-${handle.corner}`}
        role="button"
        tabIndex={0}
        aria-label={handle.label}
        className={resizeHandleClass}
        style={{ left: handle.left, top: handle.top }}
        onPointerDown={(event) => startResize(event, group, handle.corner, rect, scalePct)}
        onPointerMove={updateResize}
        onPointerUp={(event) => stopResize(event, group)}
        onPointerCancel={(event) => cancelResize(event, group)}
      />
    ));
  };

  return (
    <div className="pointer-events-none absolute inset-0">
      {renderedPrimaryRect ? (
        <div
          className={handleClass}
          role="button"
          tabIndex={0}
          aria-label="Drag primary logo"
          style={rectToStyle(renderedPrimaryRect, previewScale, previewViewport.offsetX, previewViewport.offsetY)}
          onPointerDown={(event) => startDrag(event, "primary")}
          onPointerMove={(event) => updateDrag(event, "primary", primaryRect ?? renderedPrimaryRect)}
          onPointerUp={(event) => stopDrag(event, "primary")}
          onPointerCancel={(event) => cancelDrag(event, "primary")}
        >
          {renderResizeHandles(
            "primary",
            renderedPrimaryRect,
            liveLogoResizeByGroup.primary?.scalePct ?? values.layoutPrimaryLogoScalePct,
            "primary logo"
          )}
        </div>
      ) : null}

      {renderedSecondaryRect ? (
        <div
          className={handleClass}
          role="button"
          tabIndex={0}
          aria-label="Drag secondary logo"
          style={rectToStyle(renderedSecondaryRect, previewScale, previewViewport.offsetX, previewViewport.offsetY)}
          onPointerDown={(event) => startDrag(event, "secondary")}
          onPointerMove={(event) => updateDrag(event, "secondary", secondaryRect ?? renderedSecondaryRect)}
          onPointerUp={(event) => stopDrag(event, "secondary")}
          onPointerCancel={(event) => cancelDrag(event, "secondary")}
        >
          {renderResizeHandles(
            "secondary",
            renderedSecondaryRect,
            liveLogoResizeByGroup.secondary?.scalePct ?? values.layoutSecondaryLogoScalePct,
            "secondary logo"
          )}
        </div>
      ) : null}

      <div
        className={handleClass}
        role="button"
        tabIndex={0}
        aria-label="Drag title and description text block"
        style={rectToStyle(renderedTextRect, previewScale, previewViewport.offsetX, previewViewport.offsetY)}
        onPointerDown={(event) => startDrag(event, "text")}
        onPointerMove={(event) => updateDrag(event, "text", textRect)}
        onPointerUp={(event) => stopDrag(event, "text")}
        onPointerCancel={(event) => cancelDrag(event, "text")}
      />

      {renderedPhoneRect ? (
        <div
          className={handleClass}
          role="button"
          tabIndex={0}
          aria-label="Drag phone number and icon"
          style={rectToStyle(renderedPhoneRect, previewScale, previewViewport.offsetX, previewViewport.offsetY)}
          onPointerDown={(event) => startDrag(event, "phone")}
          onPointerMove={(event) => updateDrag(event, "phone", effectivePhoneRect)}
          onPointerUp={(event) => stopDrag(event, "phone")}
          onPointerCancel={(event) => cancelDrag(event, "phone")}
        />
      ) : null}
    </div>
  );
};
