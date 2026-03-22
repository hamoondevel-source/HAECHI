export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export const AREA_MIN_SIZE = 48;
export const EDITOR_MAX_ZOOM = 20;
export const EDITOR_ZOOM_IN_STEP = 1.12;
export const EDITOR_ZOOM_OUT_STEP = 0.9;
export const CANVAS_MIN_SCALE = 0.35;
export const CANVAS_MAX_SCALE = 6.4;
export const CANVAS_ZOOM_IN_STEP = 1.12;
export const CANVAS_ZOOM_OUT_STEP = 0.9;

export function getMapDimensionScale(
  width,
  height,
  { referenceWidth = 1600, referenceHeight = 900, exponent = 0.18, min = 0.88, max = 1.18 } = {}
) {
  const referenceDiagonal = Math.hypot(referenceWidth, referenceHeight);
  const imageDiagonal = Math.hypot(Number(width) || referenceWidth, Number(height) || referenceHeight);
  return clamp(Math.pow(imageDiagonal / referenceDiagonal, exponent), min, max);
}

export function getMapDimensionMaxZoom(
  width,
  height,
  { baseZoom = 7.2, referenceWidth = 1600, referenceHeight = 900, exponent = 0.24, min = 6.4, max = 10.4 } = {}
) {
  const referenceDiagonal = Math.hypot(referenceWidth, referenceHeight);
  const imageDiagonal = Math.hypot(Number(width) || referenceWidth, Number(height) || referenceHeight);
  return clamp(baseZoom * Math.pow(referenceDiagonal / imageDiagonal, exponent), min, max);
}

export function getResolutionScale(
  resolution,
  { reference = 0.12, exponent = 0.08, min = 0.92, max = 1.12 } = {}
) {
  const normalizedResolution = clamp(Number(resolution) || reference, 0.01, 2);
  return clamp(Math.pow(reference / normalizedResolution, exponent), min, max);
}

export function getAdaptiveOverlayScale({
  baseUnitSize,
  targetPx,
  canvasScale,
  zoomExponent = 0.12,
  mapScale = 1,
  resolutionScale = 1,
  min = 0.22,
  max = 2.4
}) {
  const safeBaseUnitSize = Math.max(1, Number(baseUnitSize) || 1);
  const safeCanvasScale = Math.max(0.0001, Number(canvasScale) || 1);
  const zoomScale = clamp(Math.pow(1 / safeCanvasScale, zoomExponent), 0.88, 1.18);
  const desiredPx = targetPx * mapScale * resolutionScale * zoomScale;
  return clamp(desiredPx / (safeBaseUnitSize * safeCanvasScale), min, max);
}

export function getSpotById(deck, spotId) {
  if (!deck?.spots?.length) {
    return null;
  }

  return deck.spots.find((spot) => spot.id === spotId) ?? null;
}

export function getSpotCalibration(deck, selectedNode) {
  const selectedSpot =
    selectedNode?.type === "spot" ? getSpotById(deck, selectedNode.id) : null;
  const fallbackSpot = deck?.spots?.length === 1 ? deck.spots[0] : null;
  const scopeSpot = selectedSpot ?? fallbackSpot;

  return {
    spot: scopeSpot,
    calibration: scopeSpot?.calibration ?? deck?.calibration ?? null
  };
}

export function deckMeterToPixel(mapPose, deck) {
  const spot = getSpotById(deck, mapPose?.spotId);
  const calibration = spot?.calibration ?? deck?.calibration;

  if (!mapPose || !calibration) {
    return null;
  }

  const resolution = Number(calibration.resolution) || 0.05;
  const rotationDeg = Number(calibration.rotation) || 0;
  const origin = calibration.origin ?? { x: 0, y: 0 };
  const theta = (rotationDeg * Math.PI) / 180;
  const deltaX = mapPose.x / resolution;
  const deltaY = mapPose.y / resolution;
  const rotatedX = deltaX * Math.cos(theta) - deltaY * Math.sin(theta);
  const rotatedY = deltaX * Math.sin(theta) + deltaY * Math.cos(theta);

  return {
    x: origin.x + rotatedX,
    y: origin.y - rotatedY
  };
}

export function toPercent(value, total) {
  if (!total) {
    return "0%";
  }

  return `${(value / total) * 100}%`;
}

export function resolveMapImageSrc(image) {
  const candidate = image?.previewSrc ?? image?.serverSrc ?? image?.src ?? null;

  if (!candidate) {
    return null;
  }

  const normalized = String(candidate).trim();

  if (!normalized) {
    return null;
  }

  if (/^file:\/\//i.test(normalized) || /^[a-zA-Z]:[\\/]/.test(normalized) || normalized.startsWith("\\\\")) {
    return null;
  }

  return normalized;
}

export function getFitViewport(rect, imageWidth, imageHeight) {
  const width = Math.max(1, rect.width || 0);
  const height = Math.max(1, rect.height || 0);
  const nextScale = clamp(Number(Math.min(width / imageWidth, height / imageHeight).toFixed(4)), 0.05, 8);
  return {
    scale: nextScale,
    x: (width - imageWidth * nextScale) / 2,
    y: (height - imageHeight * nextScale) / 2
  };
}

export function getFitEditorViewBox(rect, imageWidth, imageHeight) {
  const width = Math.max(1, rect.width || 0);
  const height = Math.max(1, rect.height || 0);
  const canvasAspect = width / height;
  const imageAspect = imageWidth / imageHeight;

  if (canvasAspect >= imageAspect) {
    const fitHeight = imageHeight;
    const fitWidth = fitHeight * canvasAspect;
    return {
      x: (imageWidth - fitWidth) / 2,
      y: 0,
      width: fitWidth,
      height: fitHeight
    };
  }

  const fitWidth = imageWidth;
  const fitHeight = fitWidth / canvasAspect;
  return {
    x: 0,
    y: (imageHeight - fitHeight) / 2,
    width: fitWidth,
    height: fitHeight
  };
}

export function clampEditorViewport(nextViewport, { fitViewportRect, imageWidth, imageHeight, editorMaxZoom }) {
  const next = { ...nextViewport };

  if (next.width >= imageWidth) {
    next.x = (imageWidth - next.width) / 2;
  } else {
    next.x = clamp(next.x, 0, imageWidth - next.width);
  }

  if (next.height >= imageHeight) {
    next.y = (imageHeight - next.height) / 2;
  } else {
    next.y = clamp(next.y, 0, imageHeight - next.height);
  }

  next.width = clamp(next.width, fitViewportRect.width / editorMaxZoom, fitViewportRect.width);
  next.height = clamp(next.height, fitViewportRect.height / editorMaxZoom, fitViewportRect.height);
  return next;
}
