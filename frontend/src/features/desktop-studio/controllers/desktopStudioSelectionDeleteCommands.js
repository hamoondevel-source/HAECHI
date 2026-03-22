import { getHierarchyKey } from "./desktopStudioSelectionHelpers";

export default function createDesktopStudioSelectionDeleteCommands({
  effectiveSpot,
  effectiveSpotEditor,
  activeWaypointGroupId,
  hierarchySelectionKeys,
  selectedAreaId,
  selectedWaypointId,
  selectedEdgeId,
  edgeAnchorWaypointId,
  updateSpotEditor,
  setSelectedAreaId,
  setActiveWaypointGroupId,
  setSelectedWaypointId,
  setSelectedEdgeId,
  setEdgeAnchorWaypointId,
  setHierarchySelectionKeys,
  setHierarchyAnchorKey,
  setMessage,
  setError
}) {
  function handleDeleteHierarchySelection() {
    if (!effectiveSpot) {
      return;
    }

    const fallbackKeys = selectedAreaId
      ? [getHierarchyKey("area", selectedAreaId)]
      : selectedWaypointId
        ? [getHierarchyKey("waypoint", selectedWaypointId)]
        : selectedEdgeId
          ? [getHierarchyKey("edge", selectedEdgeId)]
          : [];
    const targetKeys = hierarchySelectionKeys.length ? hierarchySelectionKeys : fallbackKeys;

    if (!targetKeys.length) {
      return;
    }

    const deleteGroupIds = new Set();
    const deleteWaypointIds = new Set();
    const deleteEdgeIds = new Set();
    const deleteAreaIds = new Set();

    targetKeys.forEach((key) => {
      const [type, id] = key.split(":");

      if (!id) {
        return;
      }

      if (type === "group") {
        deleteGroupIds.add(id);
      } else if (type === "waypoint") {
        deleteWaypointIds.add(id);
      } else if (type === "edge") {
        deleteEdgeIds.add(id);
      } else if (type === "area") {
        deleteAreaIds.add(id);
      }
    });

    if (deleteGroupIds.size) {
      effectiveSpotEditor.waypoints.forEach((waypoint) => {
        if (deleteGroupIds.has(waypoint.groupId)) {
          deleteWaypointIds.delete(waypoint.id);
        }
      });

      effectiveSpotEditor.edges.forEach((edge) => {
        if (deleteGroupIds.has(edge.groupId)) {
          deleteEdgeIds.delete(edge.id);
        }
      });
    }

    if (!deleteGroupIds.size && !deleteWaypointIds.size && !deleteEdgeIds.size && !deleteAreaIds.size) {
      return;
    }

    let removedGroups = 0;
    let removedWaypoints = 0;
    let removedEdges = 0;
    let removedAreas = 0;

    updateSpotEditor(effectiveSpot.id, (editorState) => {
      const remainingGroups = editorState.waypointGroups.filter((group) => !deleteGroupIds.has(group.id));
      const remainingWaypoints = editorState.waypoints
        .filter((waypoint) => !deleteWaypointIds.has(waypoint.id))
        .map((waypoint) =>
          deleteGroupIds.has(waypoint.groupId)
            ? {
                ...waypoint,
                groupId: null
              }
            : waypoint
        );
      const remainingWaypointIdSet = new Set(remainingWaypoints.map((waypoint) => waypoint.id));
      const remainingEdges = editorState.edges
        .filter((edge) => {
          if (deleteEdgeIds.has(edge.id)) {
            return false;
          }

          if (!remainingWaypointIdSet.has(edge.from) || !remainingWaypointIdSet.has(edge.to)) {
            return false;
          }

          return true;
        })
        .map((edge) =>
          deleteGroupIds.has(edge.groupId)
            ? {
                ...edge,
                groupId: null
              }
            : edge
        );

      removedGroups = editorState.waypointGroups.length - remainingGroups.length;
      removedWaypoints = editorState.waypoints.length - remainingWaypoints.length;
      removedEdges = editorState.edges.length - remainingEdges.length;
      removedAreas = editorState.zones.filter((area) => deleteAreaIds.has(area.id)).length;

      return {
        ...editorState,
        waypointGroups: remainingGroups,
        waypoints: remainingWaypoints,
        zones: editorState.zones.filter((area) => !deleteAreaIds.has(area.id)),
        edges: remainingEdges
      };
    });

    if (selectedAreaId && deleteAreaIds.has(selectedAreaId)) {
      setSelectedAreaId("");
    }

    if (selectedWaypointId && deleteWaypointIds.has(selectedWaypointId)) {
      setSelectedWaypointId("");
    }

    if (selectedEdgeId && deleteEdgeIds.has(selectedEdgeId)) {
      setSelectedEdgeId("");
    }

    if (edgeAnchorWaypointId && deleteWaypointIds.has(edgeAnchorWaypointId)) {
      setEdgeAnchorWaypointId("");
    }

    if (activeWaypointGroupId && deleteGroupIds.has(activeWaypointGroupId)) {
      setActiveWaypointGroupId("");
    }

    setHierarchySelectionKeys([]);
    setHierarchyAnchorKey("");

    const removedParts = [];

    if (removedGroups > 0) {
      removedParts.push(`그룹 ${removedGroups}`);
    }

    if (removedWaypoints > 0) {
      removedParts.push(`웨이포인트 ${removedWaypoints}`);
    }

    if (removedEdges > 0) {
      removedParts.push(`간선 ${removedEdges}`);
    }

    if (removedAreas > 0) {
      removedParts.push(`구역 ${removedAreas}`);
    }

    if (removedParts.length) {
      setMessage(`${removedParts.join(", ")}개를 삭제했습니다.`);
      setError("");
    }
  }

  return {
    handleDeleteHierarchySelection
  };
}
