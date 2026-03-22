export default function createDesktopStudioCanvasSelectionCommands({
  effectiveSpotEditor,
  isSpotStudio,
  spotToolMode,
  edgeLinkMode,
  edgeDirectionMode,
  activeWaypointGroupId,
  edgeAnchorWaypointId,
  handleAddEdge,
  setSelectedAreaId,
  setActiveWaypointGroupId,
  setSelectedWaypointId,
  setSelectedEdgeId,
  setEdgeAnchorWaypointId,
  setHierarchySelectionKeys,
  setHierarchyAnchorKey,
  setSpotCanvasMenu,
  setMessage,
  setError
}) {
  function handleSelectArea(areaId) {
    if (!areaId) {
      return;
    }

    setSelectedAreaId(areaId);
    setSelectedWaypointId("");
    setSelectedEdgeId("");
    setActiveWaypointGroupId("");
    setEdgeAnchorWaypointId("");
    setHierarchySelectionKeys([]);
    setHierarchyAnchorKey("");
    setError("");
  }

  function handleSelectEdge(edgeId) {
    if (!edgeId) {
      return;
    }

    const targetEdge = effectiveSpotEditor.edges.find((edge) => edge.id === edgeId) ?? null;
    const shouldPreserveGroupSelection =
      Boolean(activeWaypointGroupId) && targetEdge?.groupId === activeWaypointGroupId;

    setSelectedAreaId("");
    setSelectedEdgeId(edgeId);
    setSelectedWaypointId("");

    if (!shouldPreserveGroupSelection) {
      setActiveWaypointGroupId("");
    }

    setEdgeAnchorWaypointId("");
    setHierarchySelectionKeys([`edge:${edgeId}`]);
    setHierarchyAnchorKey(`edge:${edgeId}`);
    setError("");
  }

  function handleWaypointSelection(waypointId) {
    if (!waypointId) {
      return;
    }

    if (isSpotStudio && spotToolMode === "edge" && edgeLinkMode === "single") {
      if (!edgeAnchorWaypointId) {
        setSelectedAreaId("");
        setSelectedWaypointId(waypointId);
        setSelectedEdgeId("");
        setEdgeAnchorWaypointId(waypointId);
        setMessage("간선 시작점을 선택했습니다. 연결할 웨이포인트를 클릭하세요.");
        setError("");
        return;
      }

      if (edgeAnchorWaypointId === waypointId) {
        setMessage("시작점이 선택된 상태입니다. 다른 웨이포인트를 클릭해 연결하세요.");
        setError("");
        return;
      }

      const result = handleAddEdge(edgeAnchorWaypointId, waypointId, edgeDirectionMode, {
        silent: false,
        selectCreatedEdge: true
      });

      if (result.status === "added") {
        setSelectedAreaId("");
        setEdgeAnchorWaypointId("");
        setSelectedWaypointId(waypointId);
        setSelectedEdgeId(result.edgeId || "");
        setHierarchySelectionKeys([`waypoint:${waypointId}`]);
        setHierarchyAnchorKey(`waypoint:${waypointId}`);
      }

      return;
    }

    const targetWaypoint =
      effectiveSpotEditor.waypoints.find((waypoint) => waypoint.id === waypointId) ?? null;
    const shouldPreserveGroupSelection =
      Boolean(activeWaypointGroupId) && targetWaypoint?.groupId === activeWaypointGroupId;

    setSelectedAreaId("");
    setSelectedWaypointId(waypointId);
    setSelectedEdgeId("");

    if (!shouldPreserveGroupSelection) {
      setActiveWaypointGroupId("");
    }

    setHierarchySelectionKeys([`waypoint:${waypointId}`]);
    setHierarchyAnchorKey(`waypoint:${waypointId}`);
  }

  function handleFocusWaypoint(waypointId) {
    if (!waypointId || spotToolMode === "edge") {
      return;
    }

    setSelectedAreaId("");
    setActiveWaypointGroupId("");
    setSelectedWaypointId(waypointId);
    setSelectedEdgeId("");
    setHierarchySelectionKeys([`waypoint:${waypointId}`]);
    setHierarchyAnchorKey(`waypoint:${waypointId}`);
    setMessage("웨이포인트 단독 포커스로 전환했습니다.");
    setError("");
  }

  function handleCanvasMarqueeSelect({ waypointIds = [], edgeIds = [] } = {}) {
    const waypointKeys = waypointIds.map((id) => `waypoint:${id}`);
    const edgeKeys = edgeIds.map((id) => `edge:${id}`);
    const mergedKeys = [...waypointKeys, ...edgeKeys];

    setSelectedAreaId("");
    setActiveWaypointGroupId("");
    setHierarchySelectionKeys(mergedKeys);
    setHierarchyAnchorKey(mergedKeys[0] ?? "");

    if (waypointIds.length > 0) {
      setSelectedWaypointId(waypointIds[0]);
      setSelectedEdgeId(edgeIds.length ? edgeIds[0] : "");
    } else if (edgeIds.length > 0) {
      setSelectedWaypointId("");
      setSelectedEdgeId(edgeIds[0]);
    } else {
      setSelectedWaypointId("");
      setSelectedEdgeId("");
    }

    setMessage(
      mergedKeys.length
        ? `선택: 웨이포인트 ${waypointIds.length}개, 간선 ${edgeIds.length}개`
        : "선택된 항목이 없습니다."
    );
    setError("");
  }

  function handleClearCanvasSelection() {
    if (spotToolMode === "edge") {
      return;
    }

    setHierarchySelectionKeys([]);
    setHierarchyAnchorKey("");
    setActiveWaypointGroupId("");
    setSelectedAreaId("");
    setSelectedWaypointId("");
    setSelectedEdgeId("");
    setEdgeAnchorWaypointId("");
    setSpotCanvasMenu(null);
  }

  return {
    handleSelectArea,
    handleSelectEdge,
    handleWaypointSelection,
    handleFocusWaypoint,
    handleCanvasMarqueeSelect,
    handleClearCanvasSelection
  };
}
