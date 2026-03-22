import { AREA_MIN_SIZE, clamp } from "./mapCanvasViewport.js";

export function buildDraggedWaypointUpdates({
  waypointIds = [],
  startPositions = new Map(),
  deltaX = 0,
  deltaY = 0,
  imageWidth,
  imageHeight
}) {
  return waypointIds.map((waypointId) => {
    const origin = startPositions.get(waypointId) ?? { x: 0, y: 0 };
    return {
      id: waypointId,
      x: clamp(origin.x + deltaX, 0, imageWidth),
      y: clamp(origin.y + deltaY, 0, imageHeight)
    };
  });
}

export function buildMovedAreaPosition({
  areaId,
  offsetX,
  offsetY,
  width = 0,
  height = 0,
  point,
  imageWidth,
  imageHeight
}) {
  return {
    areaId,
    nextPosition: {
      x: clamp(point.x - offsetX, 0, Math.max(0, imageWidth - width)),
      y: clamp(point.y - offsetY, 0, Math.max(0, imageHeight - height))
    }
  };
}

export function buildResizedAreaBounds({
  areaId,
  handle,
  startPoint,
  originArea,
  point,
  imageWidth,
  imageHeight
}) {
  const deltaX = point.x - startPoint.x;
  const deltaY = point.y - startPoint.y;
  const originLeft = originArea.x;
  const originTop = originArea.y;
  const originRight = originArea.x + originArea.width;
  const originBottom = originArea.y + originArea.height;
  const nextLeft = handle.includes("w")
    ? clamp(originLeft + deltaX, 0, originRight - AREA_MIN_SIZE)
    : originLeft;
  const nextRight = handle.includes("e")
    ? clamp(originRight + deltaX, originLeft + AREA_MIN_SIZE, imageWidth)
    : originRight;
  const nextTop = handle.includes("n")
    ? clamp(originTop + deltaY, 0, originBottom - AREA_MIN_SIZE)
    : originTop;
  const nextBottom = handle.includes("s")
    ? clamp(originBottom + deltaY, originTop + AREA_MIN_SIZE, imageHeight)
    : originBottom;

  return {
    areaId,
    nextBounds: {
      x: nextLeft,
      y: nextTop,
      width: nextRight - nextLeft,
      height: nextBottom - nextTop
    }
  };
}
