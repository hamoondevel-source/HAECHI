import { SPOT_STUDIO_AREA_COLOR } from "./spotStudioColors";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function withAlpha(color, alpha = 1) {
  const normalized = String(color ?? "").trim();

  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized)) {
    let hex = normalized.slice(1);

    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((token) => `${token}${token}`)
        .join("");
    }

    const red = parseInt(hex.slice(0, 2), 16);
    const green = parseInt(hex.slice(2, 4), 16);
    const blue = parseInt(hex.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  return normalized || `rgba(138, 146, 157, ${alpha})`;
}

export function softenColor(color, { alpha = 1, desaturate = 0.2, whiteMix = 0.14 } = {}) {
  const normalized = String(color ?? "").trim();

  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized)) {
    return withAlpha(normalized, alpha);
  }

  let hex = normalized.slice(1);

  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((token) => `${token}${token}`)
      .join("");
  }

  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
  const tonedRed = red + (luminance - red) * desaturate;
  const tonedGreen = green + (luminance - green) * desaturate;
  const tonedBlue = blue + (luminance - blue) * desaturate;
  const softenedRed = tonedRed + (255 - tonedRed) * whiteMix;
  const softenedGreen = tonedGreen + (255 - tonedGreen) * whiteMix;
  const softenedBlue = tonedBlue + (255 - tonedBlue) * whiteMix;

  return `rgba(${Math.round(softenedRed)}, ${Math.round(softenedGreen)}, ${Math.round(softenedBlue)}, ${alpha})`;
}

export function getEdgeArrowIcons(from, to, direction = "unidirectional") {
  const dx = Number(to?.x ?? 0) - Number(from?.x ?? 0);
  const dy = Number(to?.y ?? 0) - Number(from?.y ?? 0);
  const length = Math.hypot(dx, dy);

  if (length < 20) {
    return [];
  }

  const unitX = dx / length;
  const unitY = dy / length;
  const size = clamp(length * 0.042, 10.2, 12.8);
  const centerX = (Number(from?.x ?? 0) + Number(to?.x ?? 0)) / 2;
  const centerY = (Number(from?.y ?? 0) + Number(to?.y ?? 0)) / 2;
  const centerOffset = direction === "bidirectional" ? clamp(length * 0.11, 11, 20) : 0;
  const rotation = (Math.atan2(dy, dx) * 180) / Math.PI;

  if (direction === "bidirectional") {
    return [
      {
        x: centerX - unitX * centerOffset,
        y: centerY - unitY * centerOffset,
        size,
        rotation: rotation + 180
      },
      {
        x: centerX + unitX * centerOffset,
        y: centerY + unitY * centerOffset,
        size,
        rotation
      }
    ];
  }

  return [
    {
      x: centerX + unitX * centerOffset,
      y: centerY + unitY * centerOffset,
      size,
      rotation
    }
  ];
}

const AREA_STYLE_PRESETS = {
  custom: { shortLabel: "AREA", color: SPOT_STUDIO_AREA_COLOR, opacity: 0.14 }
};

export function getAreaStylePreset(kind = "custom") {
  return AREA_STYLE_PRESETS.custom;
}

export function getAreaLabelWidth(name) {
  return Math.max(68, String(name ?? "AREA").length * 7 + 18);
}

export function buildAreaCornerPath(x, y, width, height, size = 12) {
  const arm = Math.min(size, width / 3, height / 3);

  return [
    `M ${x} ${y + arm} L ${x} ${y} L ${x + arm} ${y}`,
    `M ${x + width - arm} ${y} L ${x + width} ${y} L ${x + width} ${y + arm}`,
    `M ${x} ${y + height - arm} L ${x} ${y + height} L ${x + arm} ${y + height}`,
    `M ${x + width - arm} ${y + height} L ${x + width} ${y + height} L ${x + width} ${y + height - arm}`
  ].join(" ");
}

export function getAreaResizeHandles(area) {
  return [
    { id: "nw", x: area.x, y: area.y, cursor: "nwse-resize" },
    { id: "ne", x: area.x + area.width, y: area.y, cursor: "nesw-resize" },
    { id: "se", x: area.x + area.width, y: area.y + area.height, cursor: "nwse-resize" },
    { id: "sw", x: area.x, y: area.y + area.height, cursor: "nesw-resize" }
  ];
}
