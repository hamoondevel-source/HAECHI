import { createClientId } from "../../spot-studio/model/spotEditorModel";

export function createDesktopStudioWaypointCommands({
  effectiveSpot,
  effectiveCalibration,
  updateSpotEditor,
  updateSpot,
  setSelectedAreaId,
  setSelectedWaypointId,
  setEdgeAnchorWaypointId,
  setMessage,
  setError
}) {
  function handleAddWaypoint(position = null) {
    if (!effectiveSpot) {
      setError("Spot을 먼저 선택하세요.");
      return;
    }

    let nextWaypointId = "";
    updateSpotEditor(effectiveSpot.id, (editorState) => {
      const origin = position ?? effectiveCalibration?.origin ?? {
        x: effectiveSpot.x + effectiveSpot.width / 2,
        y: effectiveSpot.y + effectiveSpot.height / 2
      };
      const nextIndex = editorState.waypoints.length + 1;
      nextWaypointId = createClientId("wp");

      return {
        ...editorState,
        waypoints: [
          ...editorState.waypoints,
          {
            id: nextWaypointId,
            name: `WP-${nextIndex}`,
            x: Math.round(origin.x),
            y: Math.round(origin.y),
            groupId: null
          }
        ]
      };
    });

    if (nextWaypointId) {
      setSelectedAreaId("");
      setSelectedWaypointId(nextWaypointId);
    }

    setMessage("웨이포인트를 무소속으로 추가했습니다.");
    setError("");
  }

  function handleMoveWaypointGroup(groupId, updates = []) {
    if (!effectiveSpot || !groupId || !Array.isArray(updates) || !updates.length) {
      return;
    }

    const nextById = new Map(updates.map((item) => [item.id, item]));
    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      waypoints: editorState.waypoints.map((waypoint) =>
        nextById.has(waypoint.id)
          ? {
              ...waypoint,
              ...nextById.get(waypoint.id)
            }
          : waypoint
      )
    }));
  }

  function handleRenameWaypoint(waypointId, name) {
    if (!effectiveSpot || !waypointId || !name?.trim()) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      waypoints: editorState.waypoints.map((waypoint) =>
        waypoint.id === waypointId
          ? {
              ...waypoint,
              name: name.trim()
            }
          : waypoint
      )
    }));
    setError("");
  }

  function handleRenameSpot(name) {
    if (!effectiveSpot || !name?.trim()) {
      return;
    }

    updateSpot(effectiveSpot.id, {
      name: name.trim()
    });
    setError("");
  }

  function handleUpdateWaypointColor(waypointId, color) {
    if (!effectiveSpot || !waypointId || !color) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      waypoints: editorState.waypoints.map((waypoint) =>
        waypoint.id === waypointId
          ? {
              ...waypoint,
              color
            }
          : waypoint
      )
    }));
  }

  function handleDeleteWaypoint(waypointId) {
    if (!effectiveSpot || !waypointId) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      waypoints: editorState.waypoints.filter((waypoint) => waypoint.id !== waypointId),
      edges: editorState.edges.filter((edge) => edge.from !== waypointId && edge.to !== waypointId)
    }));

    if (setSelectedWaypointId) {
      setSelectedWaypointId((current) => (current === waypointId ? "" : current));
    }

    if (setEdgeAnchorWaypointId) {
      setEdgeAnchorWaypointId((current) => (current === waypointId ? "" : current));
    }

    setMessage("웨이포인트를 삭제했습니다.");
    setError("");
  }

  function handleMoveWaypoint(waypointId, point) {
    if (!effectiveSpot || !waypointId || !point) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      waypoints: editorState.waypoints.map((waypoint) =>
        waypoint.id === waypointId
          ? {
              ...waypoint,
              x: Math.round(point.x),
              y: Math.round(point.y)
            }
          : waypoint
      )
    }));
  }

  function handleMoveWaypoints(updates = []) {
    if (!effectiveSpot || !Array.isArray(updates) || !updates.length) {
      return;
    }

    const nextById = new Map(
      updates
        .filter(
          (item) =>
            item &&
            typeof item.id === "string" &&
            Number.isFinite(item.x) &&
            Number.isFinite(item.y)
        )
        .map((item) => [item.id, { x: Math.round(item.x), y: Math.round(item.y) }])
    );

    if (!nextById.size) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      waypoints: editorState.waypoints.map((waypoint) =>
        nextById.has(waypoint.id)
          ? {
              ...waypoint,
              ...nextById.get(waypoint.id)
            }
          : waypoint
      )
    }));
  }

  return {
    handleAddWaypoint,
    handleMoveWaypointGroup,
    handleRenameWaypoint,
    handleRenameSpot,
    handleUpdateWaypointColor,
    handleDeleteWaypoint,
    handleMoveWaypoint,
    handleMoveWaypoints
  };
}

export default createDesktopStudioWaypointCommands;
