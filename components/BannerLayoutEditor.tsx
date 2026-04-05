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
import type { BannerFormValues } from "@/types/banner";
import { BANNER_WIDTH } from "@/types/banner";

const clampDelta = (value: number): number => Math.max(-400, Math.min(400, value));

const handleClass =
  "pointer-events-auto absolute z-10 box-border cursor-grab rounded-lg border border-dashed border-sky-400/80 bg-sky-500/20 shadow-sm active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-sky-400";

interface BannerLayoutEditorProps {
  values: BannerFormValues;
  onLayoutDeltaChange: (patch: Partial<BannerFormValues>) => void;
}

export const BannerLayoutEditor = ({ values, onLayoutDeltaChange }: BannerLayoutEditorProps) => {
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

  const handlePrimaryStop = useCallback(
    (_e: DraggableEvent, data: DraggableData) => {
      onLayoutDeltaChange({
        layoutPrimaryLogoDeltaX: clampDelta(values.layoutPrimaryLogoDeltaX + Math.round(data.x / scale)),
        layoutPrimaryLogoDeltaY: clampDelta(values.layoutPrimaryLogoDeltaY + Math.round(data.y / scale))
      });
    },
    [onLayoutDeltaChange, scale, values.layoutPrimaryLogoDeltaX, values.layoutPrimaryLogoDeltaY]
  );

  const handleSecondaryStop = useCallback(
    (_e: DraggableEvent, data: DraggableData) => {
      onLayoutDeltaChange({
        layoutSecondaryLogoDeltaX: clampDelta(values.layoutSecondaryLogoDeltaX + Math.round(data.x / scale)),
        layoutSecondaryLogoDeltaY: clampDelta(values.layoutSecondaryLogoDeltaY + Math.round(data.y / scale))
      });
    },
    [onLayoutDeltaChange, scale, values.layoutSecondaryLogoDeltaX, values.layoutSecondaryLogoDeltaY]
  );

  const handleTextStop = useCallback(
    (_e: DraggableEvent, data: DraggableData) => {
      onLayoutDeltaChange({
        layoutTextBlockDeltaX: clampDelta(values.layoutTextBlockDeltaX + Math.round(data.x / scale)),
        layoutTextBlockDeltaY: clampDelta(values.layoutTextBlockDeltaY + Math.round(data.y / scale))
      });
    },
    [onLayoutDeltaChange, scale, values.layoutTextBlockDeltaX, values.layoutTextBlockDeltaY]
  );

  const handlePhoneStop = useCallback(
    (_e: DraggableEvent, data: DraggableData) => {
      onLayoutDeltaChange({
        layoutPhoneGroupDeltaX: clampDelta(values.layoutPhoneGroupDeltaX + Math.round(data.x / scale)),
        layoutPhoneGroupDeltaY: clampDelta(values.layoutPhoneGroupDeltaY + Math.round(data.y / scale))
      });
    },
    [onLayoutDeltaChange, scale, values.layoutPhoneGroupDeltaX, values.layoutPhoneGroupDeltaY]
  );

  const s = scale;

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0">
      <Draggable
        key={`p-${values.layoutPrimaryLogoDeltaX}-${values.layoutPrimaryLogoDeltaY}`}
        nodeRef={primaryRef}
        bounds="parent"
        defaultPosition={{ x: 0, y: 0 }}
        onStop={handlePrimaryStop}
      >
        <div
          ref={primaryRef}
          role="button"
          tabIndex={0}
          aria-label="Drag primary logo"
          className={handleClass}
          style={{
            left: (LAYOUT_MARGIN + values.layoutPrimaryLogoDeltaX) * s,
            top: (LAYOUT_LOGO_TOP + values.layoutPrimaryLogoDeltaY) * s,
            width: LAYOUT_PRIMARY_LOGO_BOX * s,
            height: LAYOUT_PRIMARY_LOGO_BOX * s
          }}
        />
      </Draggable>

      <Draggable
        key={`s-${values.layoutSecondaryLogoDeltaX}-${values.layoutSecondaryLogoDeltaY}`}
        nodeRef={secondaryRef}
        bounds="parent"
        defaultPosition={{ x: 0, y: 0 }}
        onStop={handleSecondaryStop}
      >
        <div
          ref={secondaryRef}
          role="button"
          tabIndex={0}
          aria-label="Drag secondary logo"
          className={handleClass}
          style={{
            left: (LAYOUT_SECONDARY_LOGO_LEFT + values.layoutSecondaryLogoDeltaX) * s,
            top: (LAYOUT_SECONDARY_LOGO_TOP + values.layoutSecondaryLogoDeltaY) * s,
            width: LAYOUT_SECONDARY_LOGO_BOX * s,
            height: LAYOUT_SECONDARY_LOGO_BOX * s
          }}
        />
      </Draggable>

      <Draggable
        key={`t-${values.layoutTextBlockDeltaX}-${values.layoutTextBlockDeltaY}`}
        nodeRef={textRef}
        bounds="parent"
        defaultPosition={{ x: 0, y: 0 }}
        onStop={handleTextStop}
      >
        <div
          ref={textRef}
          role="button"
          tabIndex={0}
          aria-label="Drag title and description text block"
          className={handleClass}
          style={{
            left: (LAYOUT_TEXT_BLOCK_LEFT + values.layoutTextBlockDeltaX) * s,
            top: (LAYOUT_TEXT_BLOCK_TOP + values.layoutTextBlockDeltaY) * s,
            width: LAYOUT_TEXT_BLOCK_WIDTH * s,
            height: LAYOUT_TEXT_BLOCK_HEIGHT * s
          }}
        />
      </Draggable>

      <Draggable
        key={`ph-${values.layoutPhoneGroupDeltaX}-${values.layoutPhoneGroupDeltaY}`}
        nodeRef={phoneRef}
        bounds="parent"
        defaultPosition={{ x: 0, y: 0 }}
        onStop={handlePhoneStop}
      >
        <div
          ref={phoneRef}
          role="button"
          tabIndex={0}
          aria-label="Drag phone number and icon"
          className={handleClass}
          style={{
            left: (LAYOUT_PHONE_REGION_LEFT + values.layoutPhoneGroupDeltaX) * s,
            top: (LAYOUT_PHONE_REGION_TOP + values.layoutPhoneGroupDeltaY) * s,
            width: LAYOUT_PHONE_REGION_W * s,
            height: LAYOUT_PHONE_REGION_H * s
          }}
        />
      </Draggable>
    </div>
  );
};
