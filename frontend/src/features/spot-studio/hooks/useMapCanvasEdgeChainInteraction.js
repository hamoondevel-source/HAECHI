import { useEffect, useRef, useState } from "react";

export default function useMapCanvasEdgeChainInteraction({
  interactive,
  editable,
  edgeCreateMode,
  edgeLinkMode,
  edgeAnchorWaypointId,
  getMapPointFromClient,
  onEdgeChainStart,
  onEdgeChainEnd
}) {
  const edgeChainRef = useRef({ active: false, waypointIds: [], cursor: null });
  const suppressContextMenuRef = useRef(false);
  const [edgeChainPreview, setEdgeChainPreview] = useState({
    active: false,
    waypointIds: [],
    cursor: null
  });

  useEffect(() => {
    if (edgeCreateMode && edgeLinkMode === "hold") {
      return;
    }

    edgeChainRef.current = { active: false, waypointIds: [], cursor: null };
    setEdgeChainPreview({ active: false, waypointIds: [], cursor: null });
  }, [edgeCreateMode, edgeLinkMode]);

  function handlePointerMove(event) {
    if (!interactive || !edgeChainRef.current.active) {
      return false;
    }

    const point = getMapPointFromClient(event.clientX, event.clientY);
    edgeChainRef.current.cursor = point;
    setEdgeChainPreview((current) =>
      current.active
        ? {
            ...current,
            cursor: point
          }
        : current
    );
    return true;
  }

  function handlePointerEnd() {
    if (!edgeChainRef.current.active) {
      return false;
    }

    const chainPath = [...(edgeChainRef.current.waypointIds ?? [])];
    edgeChainRef.current = { active: false, waypointIds: [], cursor: null };
    setEdgeChainPreview({ active: false, waypointIds: [], cursor: null });
    suppressContextMenuRef.current = true;
    onEdgeChainEnd?.(chainPath);
    return true;
  }

  function handleWaypointPointerDown(event, waypointId) {
    if (!interactive || !editable || !edgeCreateMode || edgeLinkMode !== "hold" || event.button !== 2) {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();
    const initialPath = [waypointId];
    edgeChainRef.current = { active: true, waypointIds: initialPath, cursor: null };
    setEdgeChainPreview({ active: true, waypointIds: initialPath, cursor: null });
    suppressContextMenuRef.current = true;
    onEdgeChainStart?.(waypointId);
    return true;
  }

  function handleWaypointPointerEnter(event, waypointId) {
    if (!interactive || !editable || !edgeCreateMode || edgeLinkMode !== "hold") {
      return;
    }

    const chainState = edgeChainRef.current;

    if (!chainState.active || (event.buttons & 2) !== 2) {
      return;
    }

    const path = chainState.waypointIds ?? [];
    const lastWaypointId = path[path.length - 1];

    if (!lastWaypointId || lastWaypointId === waypointId) {
      return;
    }

    const nextPath = [...path, waypointId];
    chainState.waypointIds = nextPath;
    setEdgeChainPreview((current) => ({
      ...current,
      active: true,
      waypointIds: nextPath
    }));
  }

  function consumeSuppressedContextMenu() {
    if (!suppressContextMenuRef.current) {
      return false;
    }

    suppressContextMenuRef.current = false;
    return true;
  }

  const activeEdgeAnchorId =
    edgeChainPreview.active && edgeChainPreview.waypointIds.length
      ? edgeChainPreview.waypointIds[edgeChainPreview.waypointIds.length - 1]
      : edgeAnchorWaypointId;

  return {
    edgeChainPreview,
    activeEdgeAnchorId,
    handlePointerMove,
    handlePointerEnd,
    handleWaypointPointerDown,
    handleWaypointPointerEnter,
    consumeSuppressedContextMenu
  };
}
