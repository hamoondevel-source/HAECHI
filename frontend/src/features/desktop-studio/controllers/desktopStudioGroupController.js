import { SPOT_STUDIO_GROUP_COLOR } from "../../spot-studio/constants/spotStudioColors";
import { createClientId } from "../../spot-studio/model/spotEditorModel";

function getSelectedIds(hierarchySelectionKeys = [], prefix) {
  return hierarchySelectionKeys
    .filter((key) => key.startsWith(`${prefix}:`))
    .map((key) => key.slice(`${prefix}:`.length));
}

export function createDesktopStudioGroupController({
  effectiveSpot,
  effectiveSpotEditor,
  hierarchySelectionKeys,
  updateSpotEditor,
  setSelectedAreaId,
  setActiveWaypointGroupId,
  setSelectedWaypointId,
  setSelectedEdgeId,
  setHierarchySelectionKeys,
  setHierarchyAnchorKey,
  setMessage,
  setError
}) {
  function handleAssignWaypointGroup(waypointId, groupId) {
    if (!effectiveSpot || !waypointId) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      waypoints: editorState.waypoints.map((waypoint) =>
        waypoint.id === waypointId
          ? {
              ...waypoint,
              groupId: groupId || null
            }
          : waypoint
      )
    }));
    setMessage("웨이포인트 그룹을 변경했습니다.");
    setError("");
  }

  function handleBulkUngroup() {
    if (!effectiveSpot) {
      return;
    }

    const waypointIds = getSelectedIds(hierarchySelectionKeys, "waypoint");
    const edgeIds = getSelectedIds(hierarchySelectionKeys, "edge");

    if (!waypointIds.length && !edgeIds.length) {
      setError("그룹 해제할 항목을 먼저 선택하세요.");
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      waypoints: editorState.waypoints.map((waypoint) =>
        waypointIds.includes(waypoint.id)
          ? {
              ...waypoint,
              groupId: null
            }
          : waypoint
      ),
      edges: editorState.edges.map((edge) =>
        edgeIds.includes(edge.id)
          ? {
              ...edge,
              groupId: null
            }
          : edge
      )
    }));
    setMessage(`그룹을 해제했습니다. (WP ${waypointIds.length}, EDGE ${edgeIds.length})`);
    setError("");
  }

  function handleBulkAssignGroup(groupId) {
    if (!effectiveSpot) {
      return;
    }

    const waypointIds = getSelectedIds(hierarchySelectionKeys, "waypoint");
    const edgeIds = getSelectedIds(hierarchySelectionKeys, "edge");

    if (!waypointIds.length && !edgeIds.length) {
      setError("그룹 지정할 항목을 먼저 선택하세요.");
      return;
    }

    const targetGroupId = groupId || effectiveSpotEditor.waypointGroups[0]?.id || null;

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      waypoints: editorState.waypoints.map((waypoint) =>
        waypointIds.includes(waypoint.id)
          ? {
              ...waypoint,
              groupId: targetGroupId
            }
          : waypoint
      ),
      edges: editorState.edges.map((edge) =>
        edgeIds.includes(edge.id)
          ? {
              ...edge,
              groupId: targetGroupId
            }
          : edge
      )
    }));

    if (targetGroupId) {
      setSelectedAreaId("");
      setActiveWaypointGroupId(targetGroupId);
      setSelectedWaypointId(waypointIds[0] ?? "");
      setSelectedEdgeId(edgeIds[0] ?? "");
      setHierarchySelectionKeys([
        `group:${targetGroupId}`,
        ...waypointIds.map((id) => `waypoint:${id}`),
        ...edgeIds.map((id) => `edge:${id}`)
      ]);
      setHierarchyAnchorKey(`group:${targetGroupId}`);
    }

    setMessage(`그룹을 지정했습니다. (WP ${waypointIds.length}, EDGE ${edgeIds.length})`);
    setError("");
  }

  function handleBulkCreateGroupAndAssign() {
    if (!effectiveSpot) {
      return;
    }

    const waypointIds = getSelectedIds(hierarchySelectionKeys, "waypoint");
    const edgeIds = getSelectedIds(hierarchySelectionKeys, "edge");

    if (!waypointIds.length && !edgeIds.length) {
      setError("그룹에 넣을 항목을 먼저 선택하세요.");
      return;
    }

    let nextGroupId = "";
    updateSpotEditor(effectiveSpot.id, (editorState) => {
      const nextIndex = editorState.waypointGroups.length + 1;
      nextGroupId = createClientId("group");

      return {
        ...editorState,
        waypointGroups: [
          ...editorState.waypointGroups,
          {
            id: nextGroupId,
            name: `Group ${nextIndex}`,
            color: SPOT_STUDIO_GROUP_COLOR,
            tagOpacity: 0.24
          }
        ],
        waypoints: editorState.waypoints.map((waypoint) =>
          waypointIds.includes(waypoint.id)
            ? {
                ...waypoint,
                groupId: nextGroupId
              }
            : waypoint
        ),
        edges: editorState.edges.map((edge) =>
          edgeIds.includes(edge.id)
            ? {
                ...edge,
                groupId: nextGroupId
              }
            : edge
        )
      };
    });

    if (nextGroupId) {
      setSelectedAreaId("");
      setActiveWaypointGroupId(nextGroupId);
      setSelectedWaypointId(waypointIds[0] ?? "");
      setSelectedEdgeId(edgeIds[0] ?? "");
      setHierarchySelectionKeys([
        `group:${nextGroupId}`,
        ...waypointIds.map((id) => `waypoint:${id}`),
        ...edgeIds.map((id) => `edge:${id}`)
      ]);
      setHierarchyAnchorKey(`group:${nextGroupId}`);
      setMessage(`새 그룹을 만들고 항목을 배정했습니다. (WP ${waypointIds.length}, EDGE ${edgeIds.length})`);
      setError("");
    }
  }

  return {
    handleAssignWaypointGroup,
    handleBulkUngroup,
    handleBulkAssignGroup,
    handleBulkCreateGroupAndAssign
  };
}

export default createDesktopStudioGroupController;
