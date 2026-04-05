"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Draggable, { type DraggableData, type DraggableEvent } from "react-draggable";
import {
  LAYOUT_LOGO_TOP,
  LAYOUT_MARGIN,
  LAYOUT_PHONE_REGION_H,
  LAYOUT_PHONE_REGION_LEFT,
  LAYOUT_PHONE_REGION_TOP,
  LAYOUT_PHONE_REGION_W,
  LAYOUT_PRIMARY_LOGO_BOX,
  LAYOUT_SECONDARY_LOGO_BOX,
  LAYOUT_SECONDARY_LOGO_LEFT,
  LAYOUT_SECONDARY_LOGO_TOP,
  LAYOUT_TEXT_BLOCK_HEIGHT,
  LAYOUT_TEXT_BLOCK_LEFT,
  LAYOUT_TEXT_BLOCK_TOP,
  LAYOUT_TEXT_BLOCK_WIDTH
} from "@/lib/bannerLayoutConstants";
import type { LayoutDragGroup } from "@/lib/nudgeLayoutOverlay";
import type { BannerFormValues, LayoutElementRect, LayoutOverlayPayload } from "@/types/banner";
import { BANNER_WIDTH } from "@/types/banner";

const clampDelta = (value: number): number => Math.max(-400, Math.min(400, value));

const handleClass =
  "pointer-events-auto absolute z-10 box-border cursor-grab rounded-lg border border-dashed border-sky-400/80 bg-sky-500/20 shadow-sm active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-sky-400";

const rectToStyle = (rect: LayoutElementRect, scale: number) => ({
  left: rect.left * scale,
  top: rect.top * scale,
  width: rect.width * scale,
  height: rect.height * scale
});

interface BannerLayoutEditorProps {
  values: BannerFormValues;
  layoutOverlay: LayoutOverlayPayload | null;
  onLayoutDeltaChange: (patch: Partial<BannerFormValues>) => void;
  onLayoutDragNudge: (group: LayoutDragGroup, dxBanner: number, dyBanner: number) => void;
  hasPrimaryLogo: boolean;
  hasSecondaryLogo: boolean;
}

export const BannerLayoutEditor = ({
  values,
  layoutOverlay,
  onLayoutDeltaChange,
  onLayoutDragNudge,
  hasPrimaryLogo,
  hasSecondaryLogo
}: BannerLayoutEditorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLDivElement>(null);
  const secondaryRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }
    const update = () => {
      const width = element.getBoundingClientRect().width;
      if (width > 0) {
        setScale(width / BANNER_WIDTH);
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const s = scale;

  const primaryRect: LayoutElementRect | null = !hasPrimaryLogo
    ? null
    : layoutOverlay
      ? layoutOverlay.primaryLogo
      : {
          left: LAYOUT_MARGIN + values.layoutPrimaryLogoDeltaX,
          top: LAYOUT_LOGO_TOP + values.layoutPrimaryLogoDeltaY,
          width: LAYOUT_PRIMARY_LOGO_BOX,
          height: LAYOUT_PRIMARY_LOGO_BOX
        };

  const secondaryRect: LayoutElementRect | null = !hasSecondaryLogo
    ? null
    : layoutOverlay
      ? layoutOverlay.secondaryLogo
      : {
          left: LAYOUT_SECONDARY_LOGO_LEFT + values.layoutSecondaryLogoDeltaX,
          top: LAYOUT_SECONDARY_LOGO_TOP + values.layoutSecondaryLogoDeltaY,
          width: LAYOUT_SECONDARY_LOGO_BOX,
          height: LAYOUT_SECONDARY_LOGO_BOX
        };

  const textRect: LayoutElementRect = layoutOverlay?.textBlock ?? {
    left: LAYOUT_TEXT_BLOCK_LEFT + values.layoutTextBlockDeltaX,
    top: LAYOUT_TEXT_BLOCK_TOP + values.layoutTextBlockDeltaY,
    width: LAYOUT_TEXT_BLOCK_WIDTH,
    height: LAYOUT_TEXT_BLOCK_HEIGHT
  };

  const phoneRect: LayoutElementRect | null = layoutOverlay
    ? layoutOverlay.phoneGroup
    : {
        left: LAYOUT_PHONE_REGION_LEFT + values.layoutPhoneGroupDeltaX,
        top: LAYOUT_PHONE_REGION_TOP + values.layoutPhoneGroupDeltaY,
        width: LAYOUT_PHONE_REGION_W,
        height: LAYOUT_PHONE_REGION_H
      };

  const commitPrimaryStop = useCallback(
    (_e: DraggableEvent, data: DraggableData) => {
      const dx = Math.round(data.x / s);
      const dy = Math.round(data.y / s);
      onLayoutDeltaChange({
        layoutPrimaryLogoDeltaX: clampDelta(values.layoutPrimaryLogoDeltaX + dx),
        layoutPrimaryLogoDeltaY: clampDelta(values.layoutPrimaryLogoDeltaY + dy)
      });
      onLayoutDragNudge("primary", dx, dy);
    },
    [onLayoutDeltaChange, onLayoutDragNudge, s, values.layoutPrimaryLogoDeltaX, values.layoutPrimaryLogoDeltaY]
  );

  const commitSecondaryStop = useCallback(
    (_e: DraggableEvent, data: DraggableData) => {
      const dx = Math.round(data.x / s);
      const dy = Math.round(data.y / s);
      onLayoutDeltaChange({
        layoutSecondaryLogoDeltaX: clampDelta(values.layoutSecondaryLogoDeltaX + dx),
        layoutSecondaryLogoDeltaY: clampDelta(values.layoutSecondaryLogoDeltaY + dy)
      });
      onLayoutDragNudge("secondary", dx, dy);
    },
    [onLayoutDeltaChange, onLayoutDragNudge, s, values.layoutSecondaryLogoDeltaX, values.layoutSecondaryLogoDeltaY]
  );

  const commitTextStop = useCallback(
    (_e: DraggableEvent, data: DraggableData) => {
      const dx = Math.round(data.x / s);
      const dy = Math.round(data.y / s);
      onLayoutDeltaChange({
        layoutTextBlockDeltaX: clampDelta(values.layoutTextBlockDeltaX + dx),
        layoutTextBlockDeltaY: clampDelta(values.layoutTextBlockDeltaY + dy)
      });
      onLayoutDragNudge("text", dx, dy);
    },
    [onLayoutDeltaChange, onLayoutDragNudge, s, values.layoutTextBlockDeltaX, values.layoutTextBlockDeltaY]
  );

  const commitPhoneStop = useCallback(
    (_e: DraggableEvent, data: DraggableData) => {
      const dx = Math.round(data.x / s);
      const dy = Math.round(data.y / s);
      onLayoutDeltaChange({
        layoutPhoneGroupDeltaX: clampDelta(values.layoutPhoneGroupDeltaX + dx),
        layoutPhoneGroupDeltaY: clampDelta(values.layoutPhoneGroupDeltaY + dy)
      });
      onLayoutDragNudge("phone", dx, dy);
    },
    [onLayoutDeltaChange, onLayoutDragNudge, s, values.layoutPhoneGroupDeltaX, values.layoutPhoneGroupDeltaY]
  );

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0">
      {primaryRect ? (
        <Draggable
          key={`p-${values.layoutPrimaryLogoDeltaX}-${values.layoutPrimaryLogoDeltaY}`}
          nodeRef={primaryRef}
          bounds="parent"
          defaultPosition={{ x: 0, y: 0 }}
          onStop={commitPrimaryStop}
        >
          <div
            ref={primaryRef}
            role="button"
            tabIndex={0}
            aria-label="Drag primary logo"
            className={handleClass}
            style={rectToStyle(primaryRect, s)}
          />
        </Draggable>
      ) : null}

      {secondaryRect ? (
        <Draggable
          key={`s-${values.layoutSecondaryLogoDeltaX}-${values.layoutSecondaryLogoDeltaY}`}
          nodeRef={secondaryRef}
          bounds="parent"
          defaultPosition={{ x: 0, y: 0 }}
          onStop={commitSecondaryStop}
        >
          <div
            ref={secondaryRef}
            role="button"
            tabIndex={0}
            aria-label="Drag secondary logo"
            className={handleClass}
            style={rectToStyle(secondaryRect, s)}
          />
        </Draggable>
      ) : null}

      <Draggable
        key={`t-${values.layoutTextBlockDeltaX}-${values.layoutTextBlockDeltaY}`}
        nodeRef={textRef}
        bounds="parent"
        defaultPosition={{ x: 0, y: 0 }}
        onStop={commitTextStop}
      >
        <div
          ref={textRef}
          role="button"
          tabIndex={0}
          aria-label="Drag title and description text block"
          className={handleClass}
          style={rectToStyle(textRect, s)}
        />
      </Draggable>

      {phoneRect ? (
        <Draggable
          key={`ph-${values.layoutPhoneGroupDeltaX}-${values.layoutPhoneGroupDeltaY}`}
          nodeRef={phoneRef}
          bounds="parent"
          defaultPosition={{ x: 0, y: 0 }}
          onStop={commitPhoneStop}
        >
          <div
            ref={phoneRef}
            role="button"
            tabIndex={0}
            aria-label="Drag phone number and icon"
            className={handleClass}
            style={rectToStyle(phoneRect, s)}
          />
        </Draggable>
      ) : null}
    </div>
  );
};
