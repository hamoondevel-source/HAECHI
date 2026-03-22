import createDesktopStudioCanvasSelectionCommands from "./desktopStudioCanvasSelectionCommands";
import createDesktopStudioHierarchySelectionCommands from "./desktopStudioHierarchySelectionCommands";
import createDesktopStudioSelectionDeleteCommands from "./desktopStudioSelectionDeleteCommands";
import { getGroupSelectionKeys, getHierarchyKey } from "./desktopStudioSelectionHelpers";

export function createDesktopStudioSelectionController({
  effectiveSpot,
  effectiveSpotEditor,
  isSpotStudio,
  spotToolMode,
  edgeLinkMode,
  edgeDirectionMode,
  activeWaypointGroupId,
  hierarchySelectionKeys,
  hierarchyAnchorKey,
  selectedAreaId,
  selectedWaypointId,
  selectedEdgeId,
  edgeAnchorWaypointId,
  updateSpotEditor,
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
  const setters = {
    setSelectedAreaId,
    setActiveWaypointGroupId,
    setSelectedWaypointId,
    setSelectedEdgeId
  };

  const hierarchySelectionCommands = createDesktopStudioHierarchySelectionCommands({
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
  });

  const selectionDeleteCommands = createDesktopStudioSelectionDeleteCommands({
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
  });

  const canvasSelectionCommands = createDesktopStudioCanvasSelectionCommands({
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
  });

  return {
    getHierarchyKey,
    getGroupSelectionKeys: (groupId, editorState = effectiveSpotEditor) =>
      getGroupSelectionKeys(groupId, editorState),
    ...hierarchySelectionCommands,
    ...selectionDeleteCommands,
    ...canvasSelectionCommands
  };
}

export default createDesktopStudioSelectionController;
