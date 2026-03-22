export function getHierarchyKey(type, id) {
  return `${type}:${id}`;
}

export function getGroupSelectionKeys(groupId, editorState) {
  if (!groupId) {
    return [];
  }

  const waypointKeys = (editorState?.waypoints ?? [])
    .filter((waypoint) => waypoint.groupId === groupId)
    .map((waypoint) => getHierarchyKey("waypoint", waypoint.id));
  const edgeKeys = (editorState?.edges ?? [])
    .filter((edge) => edge.groupId === groupId)
    .map((edge) => getHierarchyKey("edge", edge.id));

  return [getHierarchyKey("group", groupId), ...waypointKeys, ...edgeKeys];
}

export function applyPrimarySelection(type, id, setters) {
  const {
    setSelectedAreaId,
    setActiveWaypointGroupId,
    setSelectedWaypointId,
    setSelectedEdgeId
  } = setters;

  if (type === "group") {
    setSelectedAreaId("");
    setActiveWaypointGroupId(id);
    setSelectedWaypointId("");
    setSelectedEdgeId("");
    return;
  }

  if (type === "waypoint") {
    setSelectedAreaId("");
    setSelectedWaypointId(id);
    setSelectedEdgeId("");
    return;
  }

  if (type === "edge") {
    setSelectedAreaId("");
    setSelectedEdgeId(id);
    setSelectedWaypointId("");
    return;
  }

  if (type === "area") {
    setSelectedAreaId(id);
    setSelectedWaypointId("");
    setSelectedEdgeId("");
    setActiveWaypointGroupId("");
  }
}

export function resolveHierarchySelectionChange({
  type,
  id,
  hierarchySelectionKeys = [],
  hierarchyAnchorKey = "",
  orderedKeys = [],
  isToggle = false,
  isRange = false
}) {
  const key = getHierarchyKey(type, id);
  const currentKeys = hierarchySelectionKeys;
  let nextSelectionKeys = [];

  if (isRange) {
    const fromIndex = orderedKeys.indexOf(hierarchyAnchorKey);
    const toIndex = orderedKeys.indexOf(key);

    if (fromIndex !== -1 && toIndex !== -1) {
      const [start, end] = fromIndex <= toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex];
      const rangeKeys = orderedKeys.slice(start, end + 1);
      nextSelectionKeys = isToggle ? Array.from(new Set([...currentKeys, ...rangeKeys])) : rangeKeys;
    } else {
      nextSelectionKeys = [key];
    }
  } else if (isToggle) {
    nextSelectionKeys = currentKeys.includes(key)
      ? currentKeys.filter((item) => item !== key)
      : [...currentKeys, key];
  } else {
    nextSelectionKeys = [key];
  }

  return {
    key,
    nextSelectionKeys,
    nextAnchorKey: key
  };
}
