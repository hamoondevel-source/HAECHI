import { useRef } from "react";
import {
  buildDraggedWaypointUpdates,
  buildMovedAreaPosition,
  buildResizedAreaBounds
} from "../utils/mapCanvasInteractionMath";

export default function useMapCanvasObjectDragInteraction({
  interactive,
  editable,
  imageWidth,
  imageHeight,
  getMapPointFromClient,
  waypointById,
  selectedWaypointIdSet,
  activeWaypointGroup,
  selectedGroupWaypoints,
  setIsMapActive,
  onMoveWaypoint,
  onMoveWaypoints,
  onMoveWaypointGroup,
  onMoveArea,
  onResizeArea,
  onSelectArea,
  onSelectWaypoint,
  suppressClickRef
}) {
  const draggingWaypointRef = useRef(null);
  const draggingGroupRef = useRef(null);
  const draggingAreaRef = useRef(null);
  const resizingAreaRef = useRef(null);

  function handlePointerMove(event) {
    if (interactive && draggingWaypointRef.current) {
      const point = getMapPointFromClient(event.clientX, event.clientY);
      if (draggingWaypointRef.current.mode === "multi") {
        const deltaX = point.x - draggingWaypointRef.current.startPoint.x;
        const deltaY = point.y - draggingWaypointRef.current.startPoint.y;
        const updates = buildDraggedWaypointUpdates({
          waypointIds: draggingWaypointRef.current.waypointIds,
          startPositions: draggingWaypointRef.current.startPositions,
          deltaX,
          deltaY,
          imageWidth,
          imageHeight
        });
        onMoveWaypoints?.(updates);
      } else {
        onMoveWaypoint?.(draggingWaypointRef.current.waypointId, point);
      }
      suppressClickRef.current = true;
      return true;
    }

    if (interactive && draggingGroupRef.current) {
      const point = getMapPointFromClient(event.clientX, event.clientY);
      const deltaX = point.x - draggingGroupRef.current.startPoint.x;
      const deltaY = point.y - draggingGroupRef.current.startPoint.y;
      const updates = buildDraggedWaypointUpdates({
        waypointIds: draggingGroupRef.current.waypointIds,
        startPositions: draggingGroupRef.current.startPositions,
        deltaX,
        deltaY,
        imageWidth,
        imageHeight
      });
      onMoveWaypointGroup?.(draggingGroupRef.current.groupId, updates);
      suppressClickRef.current = true;
      return true;
    }

    if (interactive && resizingAreaRef.current) {
      const point = getMapPointFromClient(event.clientX, event.clientY);
      const { areaId, handle, startPoint, originArea } = resizingAreaRef.current;
      const { nextBounds } = buildResizedAreaBounds({
        areaId,
        handle,
        startPoint,
        originArea,
        point,
        imageWidth,
        imageHeight
      });

      onResizeArea?.(areaId, nextBounds);
      suppressClickRef.current = true;
      return true;
    }

    if (interactive && draggingAreaRef.current) {
      const point = getMapPointFromClient(event.clientX, event.clientY);
      const { nextPosition } = buildMovedAreaPosition({
        areaId: draggingAreaRef.current.areaId,
        offsetX: draggingAreaRef.current.offsetX,
        offsetY: draggingAreaRef.current.offsetY,
        width: draggingAreaRef.current.width ?? 0,
        height: draggingAreaRef.current.height ?? 0,
        point,
        imageWidth,
        imageHeight
      });
      onMoveArea?.(draggingAreaRef.current.areaId, nextPosition);
      suppressClickRef.current = true;
      return true;
    }

    return false;
  }

  function handlePointerEnd() {
    if (draggingWaypointRef.current) {
      draggingWaypointRef.current = null;
      return true;
    }

    if (draggingGroupRef.current) {
      draggingGroupRef.current = null;
      return true;
    }

    if (draggingAreaRef.current) {
      draggingAreaRef.current = null;
      return true;
    }

    if (resizingAreaRef.current) {
      resizingAreaRef.current = null;
      return true;
    }

    return false;
  }

  function handleWaypointPointerDown(event, waypointId) {
    if (!interactive) {
      return;
    }

    if (event.button !== 0 || !editable) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setIsMapActive(true);
    const shouldMoveMulti = selectedWaypointIdSet.has(waypointId) && selectedWaypointIdSet.size > 1;
    if (shouldMoveMulti) {
      const startPoint = getMapPointFromClient(event.clientX, event.clientY);
      const waypointIds = Array.from(selectedWaypointIdSet).filter((id) => waypointById.has(id));
      const startPositions = new Map(
        waypointIds.map((id) => {
          const waypoint = waypointById.get(id);
          return [id, { x: waypoint?.x ?? 0, y: waypoint?.y ?? 0 }];
        })
      );
      draggingWaypointRef.current = {
        mode: "multi",
        waypointIds,
        startPoint,
        startPositions
      };
      return;
    }

    draggingWaypointRef.current = { mode: "single", waypointId };
  }

  function handleWaypointClick(event, waypointId) {
    event.stopPropagation();
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    onSelectWaypoint?.(waypointId);
  }

  function handleGroupPointerDown(event) {
    if (!interactive || !editable || !activeWaypointGroup || !selectedGroupWaypoints.length || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setIsMapActive(true);
    const startPoint = getMapPointFromClient(event.clientX, event.clientY);
    const startPositions = new Map(
      selectedGroupWaypoints.map((waypoint) => [waypoint.id, { x: waypoint.x, y: waypoint.y }])
    );

    draggingGroupRef.current = {
      groupId: activeWaypointGroup.id,
      waypointIds: selectedGroupWaypoints.map((waypoint) => waypoint.id),
      startPoint,
      startPositions
    };
  }

  function handleAreaPointerDown(event, area) {
    if (!interactive || !editable || !area || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setIsMapActive(true);
    onSelectArea?.(area.id);
    const startPoint = getMapPointFromClient(event.clientX, event.clientY);
    draggingAreaRef.current = {
      areaId: area.id,
      offsetX: startPoint.x - area.x,
      offsetY: startPoint.y - area.y,
      width: area.width,
      height: area.height
    };
  }

  function handleAreaResizePointerDown(event, area, handle) {
    if (!interactive || !editable || !area || !handle || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setIsMapActive(true);
    onSelectArea?.(area.id);
    resizingAreaRef.current = {
      areaId: area.id,
      handle,
      startPoint: getMapPointFromClient(event.clientX, event.clientY),
      originArea: {
        x: area.x,
        y: area.y,
        width: area.width,
        height: area.height
      }
    };
  }

  return {
    handlePointerMove,
    handlePointerEnd,
    handleWaypointPointerDown,
    handleWaypointClick,
    handleGroupPointerDown,
    handleAreaPointerDown,
    handleAreaResizePointerDown
  };
}
