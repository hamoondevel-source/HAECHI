import {
  applyPrimarySelection,
  getGroupSelectionKeys,
  getHierarchyKey,
  resolveHierarchySelectionChange
} from "./desktopStudioSelectionHelpers";

export default function createDesktopStudioHierarchySelectionCommands({
  effectiveSpotEditor,
  activeWaypointGroupId,
  hierarchySelectionKeys,
  hierarchyAnchorKey,
  selectedAreaId,
  selectedWaypointId,
  selectedEdgeId,
  setters,
  setHierarchySelectionKeys,
  setHierarchyAnchorKey,
  setSelectedWaypointId
}) {
  function isHierarchyItemSelected(type, id) {
    const key = getHierarchyKey(type, id);
    const hierarchySelectedKeySet = new Set(hierarchySelectionKeys);

    if (hierarchySelectedKeySet.size) {
      return hierarchySelectedKeySet.has(key);
    }

    if (type === "group") {
      return activeWaypointGroupId === id;
    }

    if (type === "waypoint") {
      return selectedWaypointId === id;
    }

    if (type === "edge") {
      return selectedEdgeId === id;
    }

    if (type === "area") {
      return selectedAreaId === id;
    }

    return false;
  }

  function handleHierarchyItemClick(event, type, id, orderedKeys) {
    if (type === "group" && !event.shiftKey) {
      const groupSelectionKeys = getGroupSelectionKeys(id, effectiveSpotEditor);
      const groupWaypointKeys = groupSelectionKeys.filter((selectionKey) => selectionKey.startsWith("waypoint:"));
      const isToggle = event.ctrlKey || event.metaKey;
      const nextSelectionKeys = isToggle
        ? hierarchySelectionKeys.includes(getHierarchyKey("group", id))
          ? hierarchySelectionKeys.filter(
              (selectionKey) => !groupSelectionKeys.includes(selectionKey)
            )
          : Array.from(new Set([...hierarchySelectionKeys, ...groupSelectionKeys]))
        : groupSelectionKeys;

      setHierarchySelectionKeys(nextSelectionKeys);
      setHierarchyAnchorKey(getHierarchyKey("group", id));

      if (!isToggle || nextSelectionKeys.includes(getHierarchyKey("group", id))) {
        applyPrimarySelection(type, id, setters);
        setSelectedWaypointId(groupWaypointKeys[0]?.slice("waypoint:".length) ?? "");
      }

      return;
    }

    const isToggle = event.ctrlKey || event.metaKey;
    const isRange =
      event.shiftKey &&
      hierarchyAnchorKey &&
      hierarchyAnchorKey.startsWith(`${type}:`) &&
      Array.isArray(orderedKeys);
    const { key, nextSelectionKeys, nextAnchorKey } = resolveHierarchySelectionChange({
      type,
      id,
      hierarchySelectionKeys,
      hierarchyAnchorKey,
      orderedKeys,
      isToggle,
      isRange
    });

    setHierarchySelectionKeys(nextSelectionKeys);
    setHierarchyAnchorKey(nextAnchorKey);

    if (!isToggle || nextSelectionKeys.includes(key)) {
      applyPrimarySelection(type, id, setters);
    }
  }

  function handleSelectGroup(groupId) {
    if (!groupId) {
      return;
    }

    const groupWaypoints = effectiveSpotEditor.waypoints.filter((waypoint) => waypoint.groupId === groupId);
    const groupEdges = effectiveSpotEditor.edges.filter((edge) => edge.groupId === groupId);

    setters.setSelectedAreaId("");
    setters.setActiveWaypointGroupId(groupId);
    setters.setSelectedWaypointId(groupWaypoints[0]?.id ?? "");
    setters.setSelectedEdgeId(groupEdges[0]?.id ?? "");
    setHierarchySelectionKeys(getGroupSelectionKeys(groupId, effectiveSpotEditor));
    setHierarchyAnchorKey(`group:${groupId}`);
  }

  return {
    isHierarchyItemSelected,
    handleHierarchyItemClick,
    handleSelectGroup
  };
}
