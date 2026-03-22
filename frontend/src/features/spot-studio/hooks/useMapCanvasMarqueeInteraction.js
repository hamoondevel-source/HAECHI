import { useRef, useState } from "react";
import { MAP_CANVAS_INTERACTIVE_TARGET_SELECTOR } from "../utils/mapCanvasInteractionShared";

export default function useMapCanvasMarqueeInteraction({
  interactive,
  showSpotEditorLayer,
  originPlacementMode,
  edgeCreateMode,
  isSpacePressed,
  spotEditor,
  getMapPointFromClient,
  onMarqueeSelect,
  suppressClickRef
}) {
  const marqueeRef = useRef(null);
  const [marqueeRect, setMarqueeRect] = useState(null);

  function maybeStartMarquee(event) {
    if (!interactive) {
      return false;
    }

    const isMarqueeGesture =
      event.button === 0 &&
      !isSpacePressed &&
      !originPlacementMode &&
      !edgeCreateMode &&
      showSpotEditorLayer;

    const interactiveTarget = event.target.closest(MAP_CANVAS_INTERACTIVE_TARGET_SELECTOR);

    if (!isMarqueeGesture || interactiveTarget) {
      return false;
    }

    event.preventDefault();
    const startPoint = getMapPointFromClient(event.clientX, event.clientY);
    marqueeRef.current = {
      start: startPoint,
      current: startPoint
    };
    setMarqueeRect({
      x: startPoint.x,
      y: startPoint.y,
      width: 0,
      height: 0
    });
    return true;
  }

  function handlePointerMove(event) {
    if (!marqueeRef.current) {
      return false;
    }

    const currentPoint = getMapPointFromClient(event.clientX, event.clientY);
    marqueeRef.current.current = currentPoint;
    const startPoint = marqueeRef.current.start;
    const x = Math.min(startPoint.x, currentPoint.x);
    const y = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);
    setMarqueeRect({ x, y, width, height });
    return true;
  }

  function handlePointerEnd() {
    if (!marqueeRef.current) {
      return false;
    }

    const { start, current } = marqueeRef.current;
    marqueeRef.current = null;
    setMarqueeRect(null);

    const minX = Math.min(start.x, current.x);
    const minY = Math.min(start.y, current.y);
    const maxX = Math.max(start.x, current.x);
    const maxY = Math.max(start.y, current.y);
    const boxWidth = Math.abs(maxX - minX);
    const boxHeight = Math.abs(maxY - minY);

    if (boxWidth > 2 || boxHeight > 2) {
      const isPointInside = (point) =>
        point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
      const waypointIds = (spotEditor?.waypoints ?? [])
        .filter((waypoint) => isPointInside({ x: waypoint.x, y: waypoint.y }))
        .map((waypoint) => waypoint.id);
      const waypointSet = new Set(waypointIds);
      const edgeIds = (spotEditor?.edges ?? [])
        .filter((edge) => waypointSet.has(edge.from) && waypointSet.has(edge.to))
        .map((edge) => edge.id);

      onMarqueeSelect?.({
        waypointIds,
        edgeIds
      });
      suppressClickRef.current = true;
    }

    return true;
  }

  return {
    marqueeRect,
    maybeStartMarquee,
    handlePointerMove,
    handlePointerEnd
  };
}
