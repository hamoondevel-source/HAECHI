function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function createDesktopStudioGroupAppearanceCommands({
  effectiveSpot,
  activeWaypointGroupId,
  updateSpotEditor,
  setActiveWaypointGroupId,
  setMessage,
  setError
}) {
  function handleRenameGroup(groupId, name) {
    if (!effectiveSpot || !groupId || !name?.trim()) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      waypointGroups: editorState.waypointGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              name: name.trim()
            }
          : group
      )
    }));
    setError("");
  }

  function handleDeleteGroup(groupId) {
    if (!effectiveSpot || !groupId) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => {
      const remainingGroups = editorState.waypointGroups.filter((group) => group.id !== groupId);

      return {
        ...editorState,
        waypointGroups: remainingGroups,
        waypoints: editorState.waypoints.map((waypoint) =>
          waypoint.groupId === groupId
            ? {
                ...waypoint,
                groupId: null
              }
            : waypoint
        ),
        edges: editorState.edges.map((edge) =>
          edge.groupId === groupId
            ? {
                ...edge,
                groupId: null
              }
            : edge
        )
      };
    });

    if (activeWaypointGroupId === groupId) {
      setActiveWaypointGroupId("");
    }

    setMessage("그룹을 삭제했습니다.");
    setError("");
  }

  function handleUpdateGroupColor(groupId, color) {
    if (!effectiveSpot || !groupId || !color) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      waypointGroups: editorState.waypointGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              color
            }
          : group
      ),
      waypoints: editorState.waypoints.map((waypoint) =>
        waypoint.groupId === groupId
          ? {
              ...waypoint,
              color
            }
          : waypoint
      ),
      edges: editorState.edges.map((edge) =>
        edge.groupId === groupId
          ? {
              ...edge,
              color
            }
          : edge
      )
    }));
    setMessage("그룹 색상을 멤버 전체에 적용했습니다.");
    setError("");
  }

  function handleUpdateGroupTagOpacity(groupId, tagOpacity) {
    if (!effectiveSpot || !groupId || tagOpacity === undefined) {
      return;
    }

    updateSpotEditor(effectiveSpot.id, (editorState) => ({
      ...editorState,
      waypointGroups: editorState.waypointGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              tagOpacity: clamp(Number(tagOpacity ?? 0.24), 0.08, 0.85)
            }
          : group
      )
    }));
    setError("");
  }

  return {
    handleRenameGroup,
    handleDeleteGroup,
    handleUpdateGroupColor,
    handleUpdateGroupTagOpacity
  };
}

export default createDesktopStudioGroupAppearanceCommands;
